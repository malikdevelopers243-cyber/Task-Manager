import Navbar from '../../components/shared/Navbar'
import Sidebar from '../../components/shared/Sidebar'

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <Sidebar role="employee" />
        <main className="flex-1 p-6">
          <h2 className="text-2xl font-semibold text-slate-900">Employee Dashboard</h2>
          <p className="mt-2 text-sm text-slate-500">Your attendance and task updates will appear here.</p>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
