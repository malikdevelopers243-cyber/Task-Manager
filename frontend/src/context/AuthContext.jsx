import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase/config.js'

const LOCAL_STORAGE_KEY = 'office-management-current-user'
const LOCAL_STORAGE_USERS_KEY = 'office-management-users'
const EMPLOYEES_STORAGE_KEY = 'employees'
const PROFILE_PICTURES_KEY = 'office-management-profile-pictures'
const TOKEN_STORAGE_KEY = 'office-management-token'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const loadStoredUsers = () => {
  const raw = localStorage.getItem(LOCAL_STORAGE_USERS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(LOCAL_STORAGE_USERS_KEY)
    return []
  }
}

const saveStoredUsers = (users) => {
  localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users))
}

const loadProfilePictures = () => {
  const raw = localStorage.getItem(PROFILE_PICTURES_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(PROFILE_PICTURES_KEY)
    return {}
  }
}

const saveProfilePictures = (pictures) => {
  localStorage.setItem(PROFILE_PICTURES_KEY, JSON.stringify(pictures))
}

const loadEmployeeUsers = () => {
  const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
  if (!raw) return []

  try {
    const employees = JSON.parse(raw)
    if (!Array.isArray(employees)) return []

    return employees
      .filter((employee) => employee.email && employee.role === 'employee')
      .map((employee) => ({
        id: employee.id,
        username: employee.email.split('@')[0],
        name: employee.name,
        email: employee.email,
        password: employee.password,
        role: employee.role || 'employee',
        department: employee.department || '',
        contact: employee.contact || '',
        profilePicture: employee.profilePicture || null,
        isActive: employee.isActive !== false,
      }))
  } catch {
    localStorage.removeItem(EMPLOYEES_STORAGE_KEY)
    return []
  }
}

const getInitialCurrentUser = () => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!stored) return null

  try {
    const user = JSON.parse(stored)
    if (user && !user.uid && user.id) {
      user.uid = user.id
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user))
    }
    return user
  } catch {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    return null
  }
}

const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY)

const apiRequest = async (path, options = {}) => {
  const token = getStoredToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }
  return data
}

const normalizeUser = (user) => ({
  ...user,
  id: user.id || user.uid,
  uid: user.id || user.uid,
  username: user.username || user.email?.split('@')[0] || '',
})

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const initialUser = getInitialCurrentUser()
  const [currentUser, setCurrentUser] = useState(initialUser)
  const [userRole, setUserRole] = useState(initialUser?.role || null)
  const [storedUsers, setStoredUsers] = useState(loadStoredUsers)
  const [employeeUsers, setEmployeeUsers] = useState(loadEmployeeUsers)
  const [profilePictures, setProfilePictures] = useState(loadProfilePictures)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      const token = getStoredToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const data = await apiRequest('/api/auth/me')
        const user = normalizeUser(data.user)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user))
        setCurrentUser(user)
        setUserRole(user.role)
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        localStorage.removeItem(LOCAL_STORAGE_KEY)
        setCurrentUser(null)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }

    bootstrap()
  }, [])

  // Clean up employees storage to only contain employees (not admins/managers)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
      if (raw) {
        const employees = JSON.parse(raw)
        if (Array.isArray(employees)) {
          const cleanedEmployees = employees.filter((emp) => emp.role === 'employee')
          if (cleanedEmployees.length !== employees.length) {
            localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(cleanedEmployees))
            setEmployeeUsers(loadEmployeeUsers())
          }
        }
      }
    } catch {
      // ignore cleanup errors
    }
  }, [])

  const allUsers = useMemo(() => {
    const seen = new Set()
    const unique = []
    for (const u of [...storedUsers, ...employeeUsers]) {
      const emailLower = u.email?.toLowerCase()
      if (emailLower && !seen.has(emailLower)) {
        seen.add(emailLower)
        unique.push(u)
      }
    }
    return unique
  }, [storedUsers, employeeUsers])

  const updateProfilePicture = async (imageUrl) => {
    if (!currentUser) return

    const nextPictures = {
      ...profilePictures,
      [currentUser.email.toLowerCase()]: imageUrl,
    }

    setProfilePictures(nextPictures)
    saveProfilePictures(nextPictures)

    const updatedUser = {
      ...currentUser,
      profilePicture: imageUrl,
    }

    setCurrentUser(updatedUser)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedUser))
  }

  const login = async (identifier, password) => {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })

    const authUser = normalizeUser(response.user)
    localStorage.setItem(TOKEN_STORAGE_KEY, response.token)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(authUser))
    setCurrentUser(authUser)
    setUserRole(authUser.role)
    return authUser
  }

  const register = async ({ username, name, email, password, role = 'employee', department = '', contact = '' }) => {
    const endpoint = currentUser?.role === 'admin' ? '/api/users' : '/api/auth/register'
    const response = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ username, name, email, password, role, department, contact }),
    })

    const newUser = normalizeUser(response.user)

    const nextUsers = [...storedUsers, newUser]
    setStoredUsers(nextUsers)
    saveStoredUsers(nextUsers)

    try {
      const EMPLOYEES_KEY = 'employees'
      const raw = localStorage.getItem(EMPLOYEES_KEY)
      const existing = raw ? JSON.parse(raw) : []
      // Only store employees with role='employee', not admins/managers
      if (newUser.role === 'employee') {
        const newEmployee = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          password: '********',
          department: newUser.department || '',
          role: newUser.role || 'employee',
          contact: newUser.contact || '',
          isActive: true,
          joiningDate: new Date().toISOString().split('T')[0],
        }
        const nextEmployees = [...existing, newEmployee]
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(nextEmployees))
      }
      setEmployeeUsers(loadEmployeeUsers())
    } catch {
      // ignore local storage errors
    }

    return newUser
  }

  const updateUser = async (uid, updates) => {
    const response = await apiRequest(`/api/users/${uid}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })

    const nextUser = normalizeUser(response.user)

    const nextUsers = storedUsers.map((user) => (user.id === uid ? nextUser : user))
    setStoredUsers(nextUsers)
    saveStoredUsers(nextUsers)

    setEmployeeUsers((prev) =>
      prev.map((item) => (item.id === uid ? { ...item, ...nextUser } : item)),
    )

    try {
      const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
      const existing = raw ? JSON.parse(raw) : []
      // Only keep employees with role='employee'
      const nextEmployees = existing
        .filter((item) => item.id !== uid || nextUser.role === 'employee')
        .map((item) => (item.id === uid ? { ...item, ...nextUser } : item))
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(nextEmployees))
      setEmployeeUsers(loadEmployeeUsers())
    } catch {
      // ignore local storage write errors
    }

    return nextUser
  }

  const removeUser = async (uid) => {
    await apiRequest(`/api/users/${uid}`, { method: 'DELETE' })

    const nextUsers = storedUsers.filter((user) => user.id !== uid)
    setStoredUsers(nextUsers)
    saveStoredUsers(nextUsers)

    setEmployeeUsers((prev) => prev.filter((item) => item.id !== uid))

    try {
      const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
      const existing = raw ? JSON.parse(raw) : []
      const nextEmployees = existing.filter((item) => item.id !== uid)
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(nextEmployees))
    } catch {
      // ignore local storage write errors
    }

    return nextUsers
  }

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const user = result.user

    if (!user?.email) {
      throw new Error('Google sign-in failed.')
    }

    const existingUser = allUsers.find((storedUser) => storedUser.email.toLowerCase() === user.email.toLowerCase())
    const role = existingUser?.role || 'employee'
    const authUser = {
      id: user.uid,
      uid: user.uid,
      username: existingUser?.username,
      name: user.displayName || existingUser?.name || user.email.split('@')[0],
      email: user.email,
      role,
      profilePicture:
        user.photoURL || profilePictures[user.email.toLowerCase()] || existingUser?.profilePicture || null,
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(authUser))
    setCurrentUser(authUser)
    setUserRole(role)
    return authUser
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    setCurrentUser(null)
    setUserRole(null)
  }

  const value = useMemo(
    () => ({ currentUser, userRole, login, loginWithGoogle, logout, register, updateProfilePicture, updateUser, removeUser, loading }),
    [currentUser, userRole, loading, storedUsers, employeeUsers, profilePictures],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }
  return context
}
