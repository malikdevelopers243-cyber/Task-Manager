const Navbar = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 shadow-2xl shadow-slate-950/20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Office Management</h1>
          <p className="text-sm text-slate-400">Attendance and operations dashboard</p>
        </div>
        <div className="rounded-full bg-sky-600 px-3 py-1 text-sm font-semibold text-white">Admin / Employee</div>
      </div>
    </header>
  )
}

export default Navbar
