import { useEffect, useMemo, useState } from 'react'
import Navbar from '../../components/shared/Navbar'
import AdminSidebar from '../../components/shared/AdminSidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'
import EmptyState from '../../components/shared/EmptyState'
import SkeletonRow from '../../components/shared/SkeletonRow'

const EMPLOYEES_STORAGE_KEY = 'employees'
const ATTENDANCE_STORAGE_KEY = 'attendance'

const formatTime = (time) => {
  if (!time) return 'No check-in recorded'
  const date = new Date(time)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
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
  return 'bg-slate-100 text-slate-700'
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
    const todayEmployees = loadEmployees()
    const storedAttendance = loadAttendance()
    setEmployees(todayEmployees)
    setAttendance(storedAttendance)
    setLoading(false)
  }, [])

  const attendanceForDate = useMemo(() => {
    const raw = attendance.filter((record) => record.date === date)
    if (raw.length > 0) return raw

    return employees.map((employee) => ({
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
    }))
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
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <MobileSidebar role="admin" />
        </div>
        <AdminSidebar />
        <main className="flex-1">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Attendance Overview</h2>
              <p className="mt-2 text-sm text-slate-500">Track daily attendance for your team.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                />
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-700">
                Dept
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === 'all' ? 'All Departments' : dept}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mb-6 grid gap-6 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Total Employees</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Present Today</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{summary.present}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Absent</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{summary.absent}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">On Break</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{summary.onBreak}</p>
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Attendance records</h3>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Employee Name</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Department</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Check-In</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Check-Out</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Break Time</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Total Hours</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
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
                      <tr key={record.id}>
                        <td className="px-6 py-4 text-slate-700">{record.employeeName}</td>
                        <td className="px-6 py-4 text-slate-700">{record.department}</td>
                        <td className="px-6 py-4 text-slate-700">{record.checkIn ? formatTime(record.checkIn) : 'No check-in recorded'}</td>
                        <td className="px-6 py-4 text-slate-700">{record.checkOut ? formatTime(record.checkOut) : '-'}</td>
                        <td className="px-6 py-4 text-slate-700">{record.breakTime ?? 0}</td>
                        <td className="px-6 py-4 text-slate-700">{record.totalHours ?? '-'}</td>
                        <td className="px-6 py-4">
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
