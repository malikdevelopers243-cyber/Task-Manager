import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { getAttendanceByEmployee } from '../../firebase/firestore'

const months = [
  'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
]

const formatTime = (date) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
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

  useEffect(() => {
    const loadAttendance = async () => {
      if (!currentUser) return
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
      const date = new Date(record.date)
      return date.getMonth() === monthFilter
    })
  }, [attendance, monthFilter])

  const summary = useMemo(() => {
    const presentDays = filteredAttendance.filter((record) => record.status === 'present').length
    const totalHours = filteredAttendance.reduce((sum, record) => sum + (record.totalHours || 0), 0)
    return { presentDays, totalHours: totalHours.toFixed(2) }
  }, [filteredAttendance])

  return (
    <div className="p-6">
      <div className="mb-6 grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Present days</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{summary.presentDays}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total hours this month</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{summary.totalHours}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Selected month</p>
          <p className="mt-4 text-2xl font-semibold text-slate-900">{months[monthFilter]}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold text-slate-900">My Attendance</h2>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(Number(e.target.value))}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
        >
          {months.map((month, index) => (
            <option key={month} value={index}>{month}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Date</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Check-In</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Check-Out</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Break Time</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Total Hours</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading attendance...</td>
              </tr>
            ) : filteredAttendance.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No attendance records found for this month.</td>
              </tr>
            ) : (
              filteredAttendance.map((record) => {
                const checkIn = record.checkIn ? new Date(record.checkIn.seconds * 1000) : null
                const checkOut = record.checkOut ? new Date(record.checkOut.seconds * 1000) : null
                const breakTime = Array.isArray(record.breaks)
                  ? record.breaks.reduce((sum, item) => {
                      if (item.start && item.end) {
                        return sum + (item.end.seconds - item.start.seconds)
                      }
                      return sum
                    }, 0)
                  : 0
                const breakMinutes = Math.floor(breakTime / 60)
                return (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">{formatDate(record.date)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">{checkIn ? formatTime(checkIn) : '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">{checkOut ? formatTime(checkOut) : '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">{breakMinutes ? `${breakMinutes}m` : '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700">{record.totalHours ?? '-'}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyles(record.status)}`}>
                        {record.status || 'absent'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Attendance
