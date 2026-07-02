import { useRef } from 'react'
import { LogOut, LayoutDashboard, Users, ClipboardList, FileText, Plus } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const links = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Employees', to: '/admin/employees', icon: Users },
  { label: 'Attendance', to: '/admin/attendance', icon: ClipboardList },
  { label: 'EOD Reports', to: '/admin/eod-reports', icon: FileText },
]

const AdminSidebar = () => {
  const { currentUser, logout, updateProfilePicture } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((segment) => segment[0]?.toUpperCase())
        .join('')
        .slice(0, 2)
    : currentUser?.email
    ? currentUser.email
        .split('@')[0]
        .split(/[._-]/)
        .map((segment) => segment[0]?.toUpperCase())
        .join('')
        .slice(0, 2)
    : 'AD'

  const profileName = currentUser?.name || currentUser?.displayName || 'Admin'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleProfileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleProfileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (loadEvent) => {
      const imageUrl = loadEvent.target?.result
      if (typeof imageUrl === 'string') {
        await updateProfilePicture(imageUrl)
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return (
    <aside className="hidden min-h-screen w-72 flex-col gap-8 bg-[#1e3a5f] p-6 text-white md:flex">
      <div className="mb-6 flex items-center gap-3 rounded-3xl bg-white/10 p-4 shadow-sm">
        <div className="relative">
          <button
            type="button"
            onClick={handleProfileSelect}
            className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-2xl font-semibold text-[#1e3a5f] transition hover:border-sky-400"
            aria-label="Upload profile picture"
          >
            {currentUser?.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt="Admin"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-slate-100 text-2xl font-semibold text-[#1e3a5f]">
                {initials}
              </span>
            )}
            <span className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg">
              <Plus className="h-4 w-4" />
            </span>
          </button>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleProfileChange}
          />
        </div>
        <div>
          <p className="text-sm text-slate-200">Admin</p>
          <p className="text-base font-semibold text-white">{profileName}</p>
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
