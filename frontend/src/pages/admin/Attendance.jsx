import { useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/shared/Navbar'
import AdminSidebar from '../../components/shared/AdminSidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'
import EmptyState from '../../components/shared/EmptyState'
import SkeletonRow from '../../components/shared/SkeletonRow'
import { getAttendanceByDate } from '../../firebase/firestore'

const EMPLOYEES_STORAGE_KEY = 'employees'
const ATTENDANCE_STORAGE_KEY = 'attendance'

const parseDateValue = (value) => {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  if (value?.seconds) return new Date(value.seconds * 1000)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatTime = (time) => {
  const date = parseDateValue(time)
  if (!date) return 'No check-in recorded'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

const getBreakSeconds = (breaks) => {
  if (!Array.isArray(breaks)) return 0
  return breaks.reduce((sum, item) => {
    const start = parseDateValue(item.start)
    const end = parseDateValue(item.end)
    if (start && end) {
      return sum + Math.max(0, Math.round((end - start) / 1000))
    }
    return sum
  }, 0)
}

const formatBreakDuration = (seconds) => {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`
}

const getRecordDate = (record) => {
  if (!record?.date) return null
  return parseDateValue(record.date)
}

const getRecordDateString = (record) => {
  const date = getRecordDate(record)
  return date ? date.toISOString().split('T')[0] : null
}

const formatStatus = (status) => {
  if (status === 'present') return 'Present'
  if (status === 'on-break') return 'On Break'
  if (status === 'absent') return 'Absent'
  return 'Pending'
}

const getStatusBadge = (status) => {
  if (status === 'present') return 'bg-emerald-100 text-emerald-700'
  if (status === 'on-break') return 'bg-amber-100 text-amber-700'
  if (status === 'absent') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-700 text-slate-100'
}

const loadEmployees = () => {
  const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(EMPLOYEES_STORAGE_KEY)
    return []
  }
}

const loadAttendance = () => {
  const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(ATTENDANCE_STORAGE_KEY)
    return []
  }
}

const Attendance = () => {
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const location = window.location
    try {
      const params = new URLSearchParams(location.search)
      const employeeParam = params.get('employee')
      if (employeeParam) setSearch(employeeParam)
    } catch (e) {}
    const todayEmployees = loadEmployees()
    setEmployees(todayEmployees)
  }, [])

  useEffect(() => {
    const loadAttendanceData = async () => {
      setLoading(true)
      try {
        const records = await getAttendanceByDate(date)
        setAttendance(records)
      } catch (error) {
        setAttendance(loadAttendance())
      } finally {
        setLoading(false)
      }
    }

    loadAttendanceData()
  }, [date])

  const attendanceForDate = useMemo(() => {
    const raw = attendance.filter((record) => getRecordDateString(record) === date)
    const attendanceMap = new Map()
    for (const record of raw) {
      attendanceMap.set(String(record.employeeId), record)
    }

    return employees.map((employee) => {
      const empIdStr = String(employee.id)
      if (attendanceMap.has(empIdStr)) {
        return attendanceMap.get(empIdStr)
      }
      return {
        id: `${employee.id}-${date}`,
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        checkIn: null,
        checkOut: null,
        breakTime: 0,
        totalHours: 0,
        status: 'absent',
        date,
      }
    })
  }, [attendance, date, employees])

  const departments = useMemo(() => {
    return ['all', ...new Set(employees.map((employee) => employee.department).filter(Boolean))]
  }, [employees])

  const filteredAttendance = useMemo(() => {
    return attendanceForDate.filter((record) => {
      const matchesDepartment = departmentFilter === 'all' || record.department === departmentFilter
      const matchesSearch = record.employeeName.toLowerCase().includes(search.toLowerCase())
      return matchesDepartment && matchesSearch
    })
  }, [attendanceForDate, departmentFilter, search])

  const summary = useMemo(() => {
    const total = employees.length
    const present = attendanceForDate.filter((record) => record.status === 'present').length
    const onBreak = attendanceForDate.filter((record) => record.status === 'on-break').length
    const absent = attendanceForDate.filter((record) => record.status === 'absent').length
    return { total, present, onBreak, absent }
  }, [attendanceForDate, employees.length])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <MobileSidebar role="admin" />
        </div>
        <AdminSidebar />
        <main className="flex-1">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Attendance Overview</h2>
              <p className="mt-2 text-sm text-slate-400">Track daily attendance for your team.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-3 text-sm text-slate-300">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
                />
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                Dept
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept} className="bg-slate-950 text-slate-100">
                      {dept === 'all' ? 'All Departments' : dept}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mb-6 grid gap-6 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-700">
              <p className="text-sm uppercase tracking-[0.18em] text-emerald-300">Total Employees</p>
              <p className="mt-4 text-3xl font-semibold text-white">{summary.total}</p>
            </div>
            <div className="rounded-3xl border border-emerald-700 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 p-6 shadow-2xl shadow-emerald-900/20 ring-1 ring-emerald-700">
              <p className="text-sm uppercase tracking-[0.18em] text-emerald-100">Present Today</p>
              <p className="mt-4 text-3xl font-semibold text-emerald-50">{summary.present}</p>
            </div>
            <div className="rounded-3xl border border-amber-700 bg-gradient-to-br from-orange-950 via-amber-950 to-slate-950 p-6 shadow-2xl shadow-orange-900/20 ring-1 ring-amber-700">
              <p className="text-sm uppercase tracking-[0.18em] text-amber-200">Absent</p>
              <p className="mt-4 text-3xl font-semibold text-amber-50">{summary.absent}</p>
            </div>
            <div className="rounded-3xl border border-sky-700 bg-gradient-to-br from-sky-950 via-slate-950 to-blue-950 p-6 shadow-2xl shadow-sky-900/20 ring-1 ring-sky-700">
              <p className="text-sm uppercase tracking-[0.18em] text-sky-200">On Break</p>
              <p className="mt-4 text-3xl font-semibold text-sky-50">{summary.onBreak}</p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-white">Attendance records</h3>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee"
              className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-slate-950/20">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700 text-sm text-slate-100">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-[0.03em] text-slate-100">Employee Name</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-[0.03em] text-slate-100">Department</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-[0.03em] text-slate-100">Check-In</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-[0.03em] text-slate-100">Check-Out</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-[0.03em] text-slate-100">Break Time</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-[0.03em] text-slate-100">Total Hours</th>
                    <th className="px-6 py-4 text-left font-semibold uppercase tracking-[0.03em] text-slate-100">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-950 text-slate-100">
                  {loading ? (
                    <>
                      <SkeletonRow columns={7} />
                      <SkeletonRow columns={7} />
                      <SkeletonRow columns={7} />
                    </>
                  ) : filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                        <EmptyState message="No attendance records match your filters." />
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-900/70">
                        <td className="px-6 py-4 text-slate-100 font-medium">{record.employeeName}</td>
                        <td className="px-6 py-4 text-slate-100 font-medium">{record.department}</td>
                        <td className="px-6 py-4 text-slate-100 font-medium">{record.checkIn ? formatTime(record.checkIn) : 'No check-in recorded'}</td>
                        <td className="px-6 py-4 text-slate-100 font-medium">{record.checkOut ? formatTime(record.checkOut) : '-'}</td>
                        <td className="px-6 py-4 text-slate-100 font-medium">{formatBreakDuration(record.breakTime ?? getBreakSeconds(record.breaks))}</td>
                        <td className="px-6 py-4 text-slate-100 font-medium">{record.totalHours ?? '-'}</td>
                        <td className="px-6 py-4 text-slate-100">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(record.status)}`}>
                            {formatStatus(record.status)}
                          </span>
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

export default Attendance
