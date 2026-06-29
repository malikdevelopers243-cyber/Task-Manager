import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getAllUsers, getEODReports, markReportReviewed } from '../../firebase/firestore'
import Navbar from '../../components/shared/Navbar'
import AdminSidebar from '../../components/shared/AdminSidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'
import EmptyState from '../../components/shared/EmptyState'
import SkeletonRow from '../../components/shared/SkeletonRow'

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const EODReports = () => {
  const [employees, setEmployees] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ employeeId: '', from: '', to: '' })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [allUsers, allReports] = await Promise.all([getAllUsers(), getEODReports(filters.employeeId, filters.from, filters.to)])
        setEmployees(allUsers.filter((user) => user.role === 'employee'))
        setReports(allReports)
      } catch (error) {
        toast.error('Unable to load EOD reports.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [filters])

  const handleReviewed = async (reportId) => {
    try {
      await markReportReviewed(reportId)
      setReports((prev) => prev.map((report) => (report.id === reportId ? { ...report, reviewed: true } : report)))
      toast.success('Report marked as reviewed.')
    } catch (error) {
      toast.error('Unable to update report status.')
    }
  }

  const totalReports = reports.length
  const reviewedCount = reports.filter((report) => report.reviewed).length

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <MobileSidebar role="admin" />
        </div>
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-0">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">EOD Reports</h2>
              <p className="mt-2 text-sm text-slate-500">Review employee end-of-day summaries and approve reports.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm text-slate-700">
                Employee
                <select
                  value={filters.employeeId}
                  onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                >
                  <option value="">All employees</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.name || employee.email}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-700">
                From
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                />
              </label>
              <label className="block text-sm text-slate-700">
                To
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                />
              </label>
            </div>
          </div>

          <div className="mb-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Total reports</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{totalReports}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Reviewed</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{reviewedCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Pending review</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{totalReports - reviewedCount}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-lg font-semibold text-slate-900">Reports</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Employee</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Date</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Completed</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Tomorrow</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <>
                      <SkeletonRow columns={6} />
                      <SkeletonRow columns={6} />
                      <SkeletonRow columns={6} />
                    </>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8">
                        <EmptyState message="No reports found." />
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report.id}>
                        <td className="px-6 py-4 text-slate-700">{report.employeeName}</td>
                        <td className="px-6 py-4 text-slate-700">{formatDate(report.date)}</td>
                        <td className="px-6 py-4 text-slate-700 max-w-[240px] truncate">{report.completed || '—'}</td>
                        <td className="px-6 py-4 text-slate-700 max-w-[240px] truncate">{report.tomorrow || '—'}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              report.reviewed
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {report.reviewed ? 'Reviewed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => handleReviewed(report.id)}
                            disabled={report.reviewed}
                            className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                          >
                            Mark reviewed
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default EODReports
