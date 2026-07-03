import { useAuth } from '../../hooks/useAuth'

const Navbar = () => {
  const { currentUser } = useAuth()
  const roleLabel = currentUser?.role === 'employee' ? 'Employee' : 'Admin'

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Office Management</h1>
          <p className="text-sm text-slate-500">Attendance and operations dashboard</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{roleLabel}</div>
      </div>
    </header>
  )
}

export default Navbar
