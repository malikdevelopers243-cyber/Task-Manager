import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getAllUsers, getEODReports, markReportReviewed, deleteEODReport } from '../../firebase/firestore'
import Navbar from '../../components/shared/Navbar'
import AdminSidebar from '../../components/shared/AdminSidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'
import EmptyState from '../../components/shared/EmptyState'
import SkeletonRow from '../../components/shared/SkeletonRow'
import EODViewer from '../../components/admin/EODViewer'

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

  const handleRemove = async (reportId) => {
    const toRemove = reports.find((r) => r.id === reportId)
    if (!toRemove) return
    setConfirmRemoveReport(toRemove)
    setConfirmRemoveOpen(true)
  }

  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)
  const [confirmRemoveReport, setConfirmRemoveReport] = useState(null)

  const confirmRemove = async () => {
    if (!confirmRemoveReport) return
    const id = confirmRemoveReport.id
    try {
      await deleteEODReport(id)
      setReports((prev) => prev.filter((r) => r.id !== id))
      toast.success('Report removed.')
    } catch (error) {
      // Still remove from UI to reflect admin action, but inform user
      setReports((prev) => prev.filter((r) => r.id !== id))
      toast.success('Report removed (local).')
      toast.error('Failed to remove report from server.')
    } finally {
      setConfirmRemoveOpen(false)
      setConfirmRemoveReport(null)
    }
  }

  const cancelRemove = () => {
    setConfirmRemoveOpen(false)
    setConfirmRemoveReport(null)
  }

  const [selectedReport, setSelectedReport] = useState(null)

  const openReport = (report) => {
    setSelectedReport(report)
  }

  const closeReport = () => setSelectedReport(null)

  const totalReports = reports.length
  const reviewedCount = reports.filter((report) => report.reviewed).length

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <MobileSidebar role="admin" />
        </div>
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-0">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-100">EOD Reports</h2>
              <p className="mt-2 text-sm font-medium text-slate-200">Review employee end-of-day summaries and approve reports.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm text-slate-300">
                Employee
                <select
                  value={filters.employeeId}
                  onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-500"
                >
                  <option value="">All employees</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.name || employee.email}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                From
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-500"
                />
              </label>
              <label className="block text-sm text-slate-300">
                To
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-500"
                />
              </label>
            </div>
          </div>

          <div className="mb-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 shadow-2xl shadow-slate-950/20 ring-1 ring-slate-700">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Total reports</p>
              <p className="mt-4 text-3xl font-semibold text-white">{totalReports}</p>
            </div>
            <div className="rounded-3xl border border-emerald-700 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 p-6 shadow-2xl shadow-emerald-900/20 ring-1 ring-emerald-700">
              <p className="text-sm uppercase tracking-[0.18em] text-emerald-200">Reviewed</p>
              <p className="mt-4 text-3xl font-semibold text-emerald-50">{reviewedCount}</p>
            </div>
            <div className="rounded-3xl border border-amber-700 bg-gradient-to-br from-orange-950 via-amber-950 to-slate-950 p-6 shadow-2xl shadow-orange-900/20 ring-1 ring-amber-700">
              <p className="text-sm uppercase tracking-[0.18em] text-amber-200">Pending review</p>
              <p className="mt-4 text-3xl font-semibold text-amber-50">{totalReports - reviewedCount}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-slate-950/20">
            <div className="border-b border-slate-700 px-6 py-5">
              <h3 className="text-lg font-semibold text-slate-100">Reports</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700 text-sm text-slate-100">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Employee</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Date</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Completed</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Tomorrow</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-950">
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
                      <tr
                        key={report.id}
                        onClick={() => openReport(report)}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer hover:bg-slate-900"
                      >
                        <td className="px-6 py-4 text-slate-200">{report.employeeName}</td>
                        <td className="px-6 py-4 text-slate-200">{formatDate(report.date)}</td>
                        <td className="px-6 py-4 text-slate-200 max-w-[240px] truncate">{report.completed || '—'}</td>
                        <td className="px-6 py-4 text-slate-200 max-w-[240px] truncate">{report.tomorrow || '—'}</td>
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
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReviewed(report.id)
                              }}
                              disabled={report.reviewed}
                              className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-50"
                            >
                              Mark reviewed
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemove(report.id)
                              }}
                              className="inline-flex items-center rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-500"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {selectedReport && (
            <EODViewer report={selectedReport} onClose={closeReport} onMarkReviewed={(id) => { handleReviewed(id); closeReport(); }} />
          )}
          {confirmRemoveOpen && confirmRemoveReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={cancelRemove} />
              <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-100 shadow-2xl">
                <h3 className="text-lg font-semibold">Remove Report</h3>
                <p className="mt-2 text-sm text-slate-300">Are you sure you want to remove this report? This action cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={cancelRemove} className="rounded-2xl bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600">No</button>
                  <button onClick={confirmRemove} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500">Yes, remove</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default EODReports
