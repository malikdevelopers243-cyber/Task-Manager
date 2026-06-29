const ProtectedRoute = ({ children, role, allowedRole = 'admin' }) => {
  if (role !== allowedRole) {
    return <p className="text-sm text-amber-600">You do not have access to this section.</p>
  }

  return children
}

export default ProtectedRoute
