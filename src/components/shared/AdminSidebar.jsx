import { LogOut, LayoutDashboard, Users, ClipboardList, FileText } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const links = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Employees', to: '/admin/employees', icon: Users },
  { label: 'Attendance', to: '/admin/attendance', icon: ClipboardList },
  { label: 'EOD Reports', to: '/admin/eod-reports', icon: FileText },
]

const AdminSidebar = () => {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const initials = currentUser?.email
    ? currentUser.email
        .split('@')[0]
        .split(/[._-]/)
        .map((segment) => segment[0]?.toUpperCase())
        .join('')
        .slice(0, 2)
    : 'AD'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="hidden min-h-screen w-72 flex-col gap-8 bg-[#1e3a5f] p-6 text-white md:flex">
      <div className="flex items-center gap-3 rounded-3xl bg-white/10 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg font-semibold text-[#1e3a5f]">
          {initials}
        </div>
        <div>
          <p className="text-sm text-slate-200">Admin</p>
          <p className="font-semibold text-white">{currentUser?.email || 'Admin'}</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-slate-100 text-[#1e3a5f]' : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-auto flex items-center gap-3 rounded-3xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        <LogOut className="h-5 w-5" />
        Logout
      </button>
    </aside>
  )
}

export default AdminSidebar
