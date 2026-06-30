import { useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const Sidebar = ({ role = 'admin' }) => {
  const { currentUser, logout, updateProfilePicture } = useAuth()
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const links = role === 'admin'
    ? [
        { label: 'Dashboard', to: '/admin/dashboard' },
        { label: 'Employees', to: '/admin/employees' },
        { label: 'Attendance', to: '/admin/attendance' },
        { label: 'EOD Reports', to: '/admin/eod-reports' },
      ]
    : [
        { label: 'Dashboard', to: '/employee/dashboard' },
        { label: 'My Attendance', to: '/employee/attendance' },
        { label: 'My EOD Reports', to: '/employee/eod-reports' },
      ]

  const initials = currentUser?.email
    ? currentUser.email
        .split('@')[0]
        .split(/[._-]/)
        .map((segment) => segment[0]?.toUpperCase())
        .join('')
        .slice(0, 2)
    : 'EM'

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
    <aside className="hidden min-h-screen w-72 border-r border-slate-200 bg-slate-950 p-6 text-slate-100 md:flex md:flex-col md:sticky md:top-0 md:h-screen">
      <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-slate-900 p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative">
          <button
            type="button"
            onClick={handleProfileSelect}
            className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-100 text-2xl font-bold text-slate-900 transition hover:border-sky-400"
            aria-label="Upload profile picture"
          >
            {currentUser?.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-sky-600 text-2xl font-semibold text-white">
                {initials}
              </span>
            )}
            <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white shadow-md">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
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
          <p className="text-sm text-slate-400">{role === 'employee' ? 'Employee' : 'Admin'}</p>
          <p className="text-base font-semibold text-white">{currentUser?.name || currentUser?.displayName || currentUser?.email || 'User'}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.label}
            to={link.to}
            className={({ isActive }) =>
              `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Logout
      </button>
    </aside>
  )
}

export default Sidebar
