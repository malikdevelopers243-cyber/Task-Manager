import Navbar from '../../components/shared/Navbar'
import Sidebar from '../../components/shared/Sidebar'

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <Sidebar role="admin" />
        <main className="flex-1 p-6">
          <h2 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h2>
          <p className="mt-2 text-sm text-slate-500">Welcome to your office operations workspace.</p>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
