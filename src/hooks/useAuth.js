import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

const defaultAuth = {
  currentUser: null,
  userRole: null,
  login: async () => {
    throw new Error('AuthProvider is not mounted.')
  },
  logout: async () => {},
  register: async () => {},
  updateProfilePicture: async () => {},
  loading: false,
}

export const useAuth = () => {
  return useContext(AuthContext) || defaultAuth
}
