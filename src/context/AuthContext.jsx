import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../firebase/config.js'

const LOCAL_STORAGE_KEY = 'office-management-current-user'
const LOCAL_STORAGE_USERS_KEY = 'office-management-users'
const PROFILE_PICTURES_KEY = 'office-management-profile-pictures'

const MOCK_USERS = [
  {
    id: 1,
    username: 'admin',
    name: 'Admin User',
    email: 'admin@office.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: 2,
    username: 'john',
    name: 'John Employee',
    email: 'john@office.com',
    password: 'emp123',
    role: 'employee',
  },
]

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

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [storedUsers, setStoredUsers] = useState([])
  const [profilePictures, setProfilePictures] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      try {
        const user = JSON.parse(stored)
        if (user && !user.uid && user.id) {
          user.uid = user.id
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user))
        }
        setCurrentUser(user)
        setUserRole(user?.role || null)
      } catch (error) {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      }
    }

    setStoredUsers(loadStoredUsers())
    setProfilePictures(loadProfilePictures())
    setLoading(false)
  }, [])

  const allUsers = useMemo(() => [...MOCK_USERS, ...storedUsers], [storedUsers])

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
    const normalizedId = identifier.trim().toLowerCase()
    const matchedUser = allUsers.find((user) => {
      const emailMatch = user.email.toLowerCase() === normalizedId
      const usernameMatch = user.username?.toLowerCase() === normalizedId
      return (emailMatch || usernameMatch) && user.password === password
    })

    if (!matchedUser) {
      throw new Error('Invalid username/email or password.')
    }

    const authUser = {
      id: matchedUser.id,
      uid: matchedUser.id,
      username: matchedUser.username,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      profilePicture: profilePictures[matchedUser.email.toLowerCase()] || matchedUser.profilePicture || null,
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(authUser))
    setCurrentUser(authUser)
    setUserRole(authUser.role)
    return authUser
  }

  const register = async ({ username, name, email, password, role = 'employee', department = '' }) => {
    const lowerEmail = email.toLowerCase()
    const lowerUsername = username.trim().toLowerCase()
    const existingEmailUser = allUsers.find((user) => user.email.toLowerCase() === lowerEmail)
    const existingUsernameUser = allUsers.find((user) => user.username?.toLowerCase() === lowerUsername)

    if (existingEmailUser) {
      throw new Error('An account with this email already exists.')
    }

    if (existingUsernameUser) {
      throw new Error('An account with this username already exists.')
    }

    const newUser = {
      id: Date.now(),
      username: lowerUsername,
      name,
      email: lowerEmail,
      password,
      role,
      department,
      profilePicture: null,
    }

    const nextUsers = [...storedUsers, newUser]
    setStoredUsers(nextUsers)
    saveStoredUsers(nextUsers)
    // Also add to the admin-visible employees list (local storage key 'employees')
    try {
      const EMPLOYEES_KEY = 'employees'
      const raw = localStorage.getItem(EMPLOYEES_KEY)
      const existing = raw ? JSON.parse(raw) : []
      const newEmployee = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        department: newUser.department || '',
        role: newUser.role || 'employee',
        isActive: true,
        joiningDate: new Date().toISOString().split('T')[0],
      }
      const nextEmployees = [...existing, newEmployee]
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(nextEmployees))
    } catch (err) {
      // ignore local storage errors
    }
    return newUser
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
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    setCurrentUser(null)
    setUserRole(null)
  }

  const value = useMemo(
    () => ({ currentUser, userRole, login, loginWithGoogle, logout, register, updateProfilePicture, loading }),
    [currentUser, userRole, loading, storedUsers, profilePictures],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
