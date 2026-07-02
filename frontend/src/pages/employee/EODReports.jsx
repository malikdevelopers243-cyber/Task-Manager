import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../../components/shared/Navbar'
import Sidebar from '../../components/shared/Sidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'
import { useAuth } from '../../hooks/useAuth'
import { getEODReportsByEmployee } from '../../firebase/firestore'

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const EODReports = () => {
  const { currentUser } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  useEffect(() => {
    const loadReports = async () => {
      if (!currentUser) return
      setLoading(true)
      try {
        const data = await getEODReportsByEmployee(currentUser.uid)
        setReports(data)
      } catch (error) {
        toast.error('Unable to load EOD reports.')
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [currentUser])

  const filteredReports = useMemo(() => {
    return reports
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((report) => {
        if (!dateRange.from && !dateRange.to) return true
        const reportDate = new Date(report.date)
        const from = dateRange.from ? new Date(dateRange.from) : null
        const to = dateRange.to ? new Date(dateRange.to) : null
        if (from && reportDate < from) return false
        if (to && reportDate > to) return false
        return true
      })
  }, [reports, dateRange])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <MobileSidebar role="employee" />
        </div>

        <Sidebar role="employee" />

        <main className="flex-1 p-6 md:p-0">
          <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/20 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">My EOD Reports</h2>
              <p className="mt-2 text-sm text-slate-400">Browse your daily reports and filter by date.</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="flex flex-col text-sm text-slate-300">
                From
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="mt-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="flex flex-col text-sm text-slate-300">
                To
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="mt-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
                />
              </label>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center text-slate-400 shadow-2xl shadow-slate-950/20">Loading reports...</div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center text-slate-400 shadow-2xl shadow-slate-950/20">No reports found for the selected range.</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {filteredReports.map((report) => (
                <div key={report.id} className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/20">
                  <p className="text-sm text-slate-400">Date: {formatDate(report.date)}</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-100">
                    <div>
                      <p className="text-sm font-semibold text-white">Completed</p>
                      <p className="mt-1 text-slate-300">{report.completed || 'No details provided.'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Tomorrow</p>
                      <p className="mt-1 text-slate-300">{report.tomorrow || 'No details provided.'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Blockers</p>
                      <p className="mt-1 text-slate-300">{report.blockers || 'None'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default EODReports
