import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { getAttendanceByEmployee, updateAttendance } from '../../firebase/firestore'
import Navbar from '../../components/shared/Navbar'
import Sidebar from '../../components/shared/Sidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'

const months = [
  'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
]

const parseDateValue = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`)
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000)
  if (typeof value?.toDate === 'function') return value.toDate()
  return null
}

const formatTime = (date) => {
  const parsedDate = parseDateValue(date)
  if (!parsedDate) return '-'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsedDate)
}

const formatDate = (dateValue) => {
  const date = parseDateValue(dateValue)
  if (!date) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatBreakDuration = (seconds) => {
  if (seconds <= 0) return '0s'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`
}

const getDurationSeconds = (record, now) => {
  const checkIn = parseDateValue(record.checkIn)
  if (!checkIn) return 0
  const end = record.checkOut ? parseDateValue(record.checkOut) : now
  if (!end) return 0

  const breakSeconds = Array.isArray(record.breaks)
    ? record.breaks.reduce((sum, item) => {
        const breakStart = parseDateValue(item.start)
        const breakEnd = parseDateValue(item.end)
        if (breakStart && breakEnd) {
          return sum + Math.max(0, Math.round((breakEnd - breakStart) / 1000))
        }
        return sum
      }, 0)
    : 0

  return Math.max(0, Math.round((end - checkIn) / 1000) - breakSeconds)
}

const formatDurationHHMMSS = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const getRecordDate = (record) => {
  return parseDateValue(record?.date)
}

const getStatusStyles = (status) => {
  if (status === 'present') return 'bg-emerald-100 text-emerald-700'
  if (status === 'half-day') return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

const Attendance = () => {
  const { currentUser } = useAuth()
  const [attendance, setAttendance] = useState([])
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth())
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const loadAttendance = async () => {
      if (!currentUser) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const records = await getAttendanceByEmployee(currentUser.uid)
        setAttendance(records)
      } catch (error) {
        toast.error('Unable to load attendance records.')
      } finally {
        setLoading(false)
      }
    }

    loadAttendance()
  }, [currentUser])

  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      const date = getRecordDate(record)
      return date?.getMonth() === monthFilter
    })
  }, [attendance, monthFilter])

  const [checkingOutId, setCheckingOutId] = useState(null)

  const summary = useMemo(() => {
    const presentDays = filteredAttendance.filter((record) => record.status === 'present').length
    const totalHoursSeconds = filteredAttendance.reduce((sum, record) => sum + getDurationSeconds(record, now), 0)
    const totalHoursDecimal = (totalHoursSeconds / 3600).toFixed(2)
    return { presentDays, totalHours: totalHoursDecimal }
  }, [filteredAttendance, now])

  const handleLiveCheckout = async (record) => {
    if (!record?.id) return
    setCheckingOutId(record.id)
    try {
      const checkOutTime = new Date()
      await updateAttendance(record.id, { checkOut: checkOutTime })
      const updatedRecords = attendance.map((item) =>
        item.id === record.id ? { ...item, checkOut: checkOutTime } : item
      )
      setAttendance(updatedRecords)
      toast.success(`Checked out ${formatDate(record.date)} at ${formatTime(checkOutTime)}`)
    } catch (error) {
      toast.error('Unable to complete live checkout.')
    } finally {
      setCheckingOutId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="md:hidden">
          <MobileSidebar role="employee" />
        </div>

        <Sidebar role="employee" />

        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/20">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Present days</p>
              <p className="mt-4 text-3xl font-semibold text-white">{summary.presentDays}</p>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/20">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Total hours this month</p>
              <p className="mt-4 text-3xl font-semibold text-white">{summary.totalHours}</p>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/20">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Selected month</p>
              <p className="mt-4 text-2xl font-semibold text-white">{months[monthFilter]}</p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-white">My Attendance</h2>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(Number(e.target.value))}
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
            >
              {months.map((month, index) => (
                <option key={month} value={index} className="bg-slate-950 text-slate-100">{month}</option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-slate-950/20">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700 text-sm text-slate-100">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Check-In</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Check-Out</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Break Time</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Total Hours</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-950">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading attendance...</td>
                    </tr>
                  ) : filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No attendance records found for this month.</td>
                    </tr>
                  ) : (
                    filteredAttendance.map((record) => {
                      const checkIn = parseDateValue(record.checkIn)
                      const checkOut = parseDateValue(record.checkOut)
                      const breakTime = Array.isArray(record.breaks)
                        ? record.breaks.reduce((sum, item) => {
                            const breakStart = parseDateValue(item.start)
                            const breakEnd = parseDateValue(item.end)
                            if (breakStart && breakEnd) {
                              return sum + Math.round((breakEnd - breakStart) / 1000)
                            }
                            return sum
                          }, 0)
                        : 0
                      const formattedBreakTime = formatBreakDuration(breakTime)
                      const isLive = !checkOut && checkIn
                      return (
                        <tr key={record.id} className="hover:bg-slate-900/70">
                          <td className="px-6 py-4 text-slate-100">{formatDate(record.date)}</td>
                          <td className="px-6 py-4 text-slate-100">{checkIn ? formatTime(checkIn) : '-'}</td>
                          <td className="px-6 py-4 text-slate-100">{checkOut ? formatTime(checkOut) : '-'}</td>
                          <td className="px-6 py-4 text-slate-100">{formattedBreakTime}</td>
                          <td className="px-6 py-4 text-slate-100">
                            {formatDurationHHMMSS(getDurationSeconds(record, now))}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(record.status)}`}>
                                {record.status || 'absent'}
                              </span>
                              {isLive && (
                                <button
                                  type="button"
                                  disabled={checkingOutId === record.id}
                                  onClick={() => handleLiveCheckout(record)}
                                  className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {checkingOutId === record.id ? 'Checking out...' : 'Live Checkout'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
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

export default Attendance
