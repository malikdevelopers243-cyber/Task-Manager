import { useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const MobileSidebar = ({ role = 'admin' }) => {
  const [open, setOpen] = useState(false)
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
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mb-4 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
      >
        {open ? 'Close menu' : 'Menu'}
      </button>
      {open && (
        <div className="space-y-4 rounded-3xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-slate-950/20">
          <div className="flex items-center gap-3 rounded-3xl bg-slate-900 p-4">
            <div className="relative">
              <button
                type="button"
                onClick={handleProfileSelect}
                className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-lg font-semibold text-white transition hover:border-sky-400"
                aria-label="Upload profile picture"
              >
                {currentUser?.profilePicture ? (
                  <img
                    src={currentUser.profilePicture}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-sky-600 text-xl font-semibold text-white">
                    {currentUser?.email
                      ? currentUser.email
                          .split('@')[0]
                          .split(/[._-]/)
                          .map((segment) => segment[0]?.toUpperCase())
                          .join('')
                          .slice(0, 2)
                      : 'EM'}
                  </span>
                )}
                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
              <p className="font-semibold text-white">{currentUser?.name || currentUser?.displayName || currentUser?.email || 'User'}</p>
            </div>
          </div>
          <nav className="space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                onClick={() => setOpen(false)}
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
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default MobileSidebar
