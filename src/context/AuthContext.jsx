import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const LOCAL_STORAGE_KEY = 'office-management-current-user'
const LOCAL_STORAGE_USERS_KEY = 'office-management-users'
const PROFILE_PICTURES_KEY = 'office-management-profile-pictures'

const MOCK_USERS = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@office.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: 2,
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

  const login = async (email, password) => {
    const matchedUser = allUsers.find(
      (user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password,
    )

    if (!matchedUser) {
      throw new Error('Invalid email or password.')
    }

    const authUser = {
      id: matchedUser.id,
      uid: matchedUser.id,
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

  const register = async ({ name, email, password, role = 'employee', department = '' }) => {
    const lowerEmail = email.toLowerCase()
    const existingUser = allUsers.find((user) => user.email.toLowerCase() === lowerEmail)

    if (existingUser) {
      throw new Error('An account with this email already exists.')
    }

    const newUser = {
      id: Date.now(),
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
    return newUser
  }

  const logout = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    setCurrentUser(null)
    setUserRole(null)
  }

  const value = useMemo(
    () => ({ currentUser, userRole, login, logout, register, updateProfilePicture, loading }),
    [currentUser, userRole, loading, storedUsers, profilePictures],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
