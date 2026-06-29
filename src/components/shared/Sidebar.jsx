const Sidebar = ({ role = 'admin' }) => {
  const links = role === 'admin'
    ? [
        { label: 'Dashboard', href: '#' },
        { label: 'Employees', href: '#' },
        { label: 'Attendance', href: '#' },
        { label: 'EOD Reports', href: '#' },
      ]
    : [
        { label: 'Dashboard', href: '#' },
        { label: 'My Attendance', href: '#' },
        { label: 'EOD Report', href: '#' },
      ]

  return (
    <aside className="hidden min-h-screen w-64 border-r border-slate-200 bg-slate-900 p-5 text-slate-100 md:block">
      <div className="mb-8">
        <h2 className="text-lg font-semibold">Menu</h2>
      </div>
      <nav className="space-y-2">
        {links.map((link) => (
          <a key={link.label} href={link.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800">
            {link.label}
          </a>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
