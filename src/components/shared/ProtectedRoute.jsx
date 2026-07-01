import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const getStoredUser = () => {
  const raw = localStorage.getItem('office-management-current-user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem('office-management-current-user')
    return null
  }
}

const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser, userRole, loading } = useAuth()
  const storedUser = getStoredUser()
  const activeUser = currentUser || storedUser
  const activeRole = userRole || storedUser?.role

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700">
        Loading...
      </div>
    )
  }

  const canAccessEmployeeRoutes = allowedRole === 'employee' && activeRole && activeRole !== 'admin'
  const hasAccess = allowedRole === 'employee' ? canAccessEmployeeRoutes : activeRole === allowedRole

  if (!activeUser || !hasAccess) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
