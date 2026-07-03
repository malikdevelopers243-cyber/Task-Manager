import { useEffect, useMemo, useState } from 'react'
import { onAttendanceByDate } from '../../firebase/firestore'
import { useAuth } from '../../hooks/useAuth'
import Navbar from '../../components/shared/Navbar'
import AdminSidebar from '../../components/shared/AdminSidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'
import SkeletonRow from '../../components/shared/SkeletonRow'
import EmptyState from '../../components/shared/EmptyState'

const formatTime = (time) => {
  if (!time) return '-'
  let date = null
  if (time instanceof Date) {
    date = time
  } else if (typeof time?.toDate === 'function') {
    date = time.toDate()
  } else if (typeof time?.seconds === 'number') {
    date = new Date(time.seconds * 1000)
  } else {
    date = new Date(time)
  }

  if (!date || Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
}

const getBreakSeconds = (breaks, now = new Date()) => {
  if (!Array.isArray(breaks)) return 0
  return breaks.reduce((sum, item) => {
    if (!item) return sum
    const start = item.start instanceof Date ? item.start : typeof item?.toDate === 'function' ? item.toDate() : item.start ? new Date(item.start) : null
    const end = item.end instanceof Date
      ? item.end
      : typeof item?.toDate === 'function'
      ? item.toDate()
      : item.end
      ? new Date(item.end)
      : now
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return sum + Math.max(0, Math.round((end - start) / 1000))
    }
    return sum
  }, 0)
}

const getDurationSeconds = (record, now) => {
  if (!record?.checkIn) return 0
  const checkIn = record.checkIn instanceof Date ? record.checkIn : typeof record?.checkIn?.toDate === 'function' ? record.checkIn.toDate() : new Date(record.checkIn)
  const end = record.checkOut
    ? record.checkOut instanceof Date
      ? record.checkOut
      : typeof record?.checkOut?.toDate === 'function'
      ? record.checkOut.toDate()
      : new Date(record.checkOut)
    : now

  if (!checkIn || Number.isNaN(checkIn.getTime()) || !end || Number.isNaN(end.getTime())) return 0

  const breakSeconds = getBreakSeconds(record.breaks)
  return Math.max(0, Math.round((end - checkIn) / 1000) - breakSeconds)
}

const formatDurationHHMMSS = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const formatBreakDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '-'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`
}

const getStatusCount = (attendance) => {
  const latestByEmployee = new Map()
  attendance.forEach((item) => {
    const employeeId = item?.employeeId ?? item?.id
    if (!employeeId) return
    latestByEmployee.set(String(employeeId), item)
  })

  const records = Array.from(latestByEmployee.values())
  const present = records.filter((item) => item.status === 'present' && item.checkIn).length
  const onBreak = records.filter((item) => item.breaks?.some((b) => b.start && !b.end)).length
  const checkedOut = records.filter((item) => item.checkOut).length
  return { present, onBreak, checkedOut }
}

const readEmployees = () => {
  const raw = localStorage.getItem('employees')
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    // Filter to only include employees (not admins/managers)
    return Array.isArray(data) ? data.filter(emp => emp.role === 'employee') : []
  } catch {
    localStorage.removeItem('employees')
    return []
  }
}

const Dashboard = () => {
  const { currentUser } = useAuth()
  const [todayAttendance, setTodayAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [now, setNow] = useState(new Date())
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setTotalEmployees(readEmployees().length)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!currentUser) return
    setLoading(true)
    const unsubscribe = onAttendanceByDate(today, (data) => {
      setTodayAttendance(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [currentUser, today])

  const counts = useMemo(() => getStatusCount(todayAttendance), [todayAttendance])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <MobileSidebar role="admin" />
        </div>
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-0">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">Admin Dashboard</h2>
            <p className="mt-2 text-sm text-slate-400">Live attendance overview for today.</p>
          </div>

          <div className="grid gap-6 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 shadow-2xl shadow-slate-950/30 ring-1 ring-slate-700">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Total Employees</p>
              <p className="mt-4 text-3xl font-semibold text-white">{totalEmployees}</p>
            </div>
            <div className="rounded-3xl border border-emerald-700 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 p-6 shadow-2xl shadow-emerald-900/30 ring-1 ring-emerald-700">
              <p className="text-sm uppercase tracking-[0.18em] text-emerald-200">Present Today</p>
              <p className="mt-4 text-3xl font-semibold text-emerald-50">{counts.present}</p>
            </div>
            <div className="rounded-3xl border border-amber-700 bg-gradient-to-br from-orange-950 via-amber-950 to-slate-950 p-6 shadow-2xl shadow-orange-900/30 ring-1 ring-amber-700">
              <p className="text-sm uppercase tracking-[0.18em] text-amber-200">On Break</p>
              <p className="mt-4 text-3xl font-semibold text-amber-50">{counts.onBreak}</p>
            </div>
            <div className="rounded-3xl border border-sky-700 bg-gradient-to-br from-sky-950 via-slate-950 to-blue-950 p-6 shadow-2xl shadow-sky-900/30 ring-1 ring-sky-700">
              <p className="text-sm uppercase tracking-[0.18em] text-sky-200">Checked Out</p>
              <p className="mt-4 text-3xl font-semibold text-sky-50">{counts.checkedOut}</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-slate-950/30">
            <div className="border-b border-slate-700 px-6 py-5">
              <h3 className="text-lg font-semibold text-white">Recent Attendance (Today)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700 text-sm text-slate-100">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Employee</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Check-In</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Check-Out</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Breaks</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Total Hours</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-950">
                  {loading ? (
                    <>
                      <SkeletonRow columns={6} />
                      <SkeletonRow columns={6} />
                      <SkeletonRow columns={6} />
                    </>
                  ) : todayAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8">
                        <EmptyState message="No attendance found today." />
                      </td>
                    </tr>
                  ) : (
                    todayAttendance.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 text-slate-100">{record.employeeName}</td>
                        <td className="px-6 py-4 text-slate-100">{formatTime(record.checkIn)}</td>
                        <td className="px-6 py-4 text-slate-100">{formatTime(record.checkOut)}</td>
                        <td className="px-6 py-4 text-slate-100">
                          {Array.isArray(record.breaks) && record.breaks.length > 0 ? (
                            <div className="space-y-3">
                              {record.breaks.map((item, index) => (
                                <div key={index} className="rounded-2xl bg-slate-900 px-3 py-2 text-slate-100">
                                  <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Break {index + 1}</div>
                                  <div className="mt-1 text-sm">
                                    <span>{formatTime(item.start)}</span> - <span>{item.end ? formatTime(item.end) : 'Ongoing'}</span>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-400">Total {formatBreakDuration(getBreakSeconds([item]))}</div>
                                </div>
                              ))}
                              <div className="rounded-2xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-400">
                                Total break time: {formatBreakDuration(getBreakSeconds(record.breaks, now))}
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-100">{formatDurationHHMMSS(getDurationSeconds(record, now))}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              record.status === 'present'
                                ? 'bg-emerald-100 text-emerald-700'
                                : record.status === 'half-day'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-700 text-slate-100'
                            }`}>{record.status || 'pending'}</span>
                            {record?.id && String(record.id).startsWith('local-') ? (
                              <span className="inline-flex rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-semibold">pending</span>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold">synced</span>
                            )}
                          </div>
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

export default Dashboard
