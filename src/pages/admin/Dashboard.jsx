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
  const date = new Date(time.seconds * 1000)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
}

const getStatusCount = (attendance) => {
  const present = attendance.filter((item) => item.status === 'present').length
  const onBreak = attendance.filter((item) => item.breaks?.some((b) => b.start && !b.end)).length
  const checkedOut = attendance.filter((item) => item.checkOut).length
  return { present, onBreak, checkedOut }
}

const Dashboard = () => {
  const { currentUser } = useAuth()
  const [todayAttendance, setTodayAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

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
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <MobileSidebar role="admin" />
        </div>
        <AdminSidebar />
        <main className="flex-1">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h2>
            <p className="mt-2 text-sm text-slate-500">Live attendance overview for today.</p>
          </div>

          <div className="grid gap-6 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Total Employees</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{todayAttendance.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Present Today</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{counts.present}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">On Break</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{counts.onBreak}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Checked Out</p>
              <p className="mt-4 text-3xl font-semibold text-slate-900">{counts.checkedOut}</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h3 className="text-lg font-semibold text-slate-900">Recent Attendance (Today)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Employee</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Check-In</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Check-Out</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Breaks</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Total Hours</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
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
                        <td className="px-6 py-4 text-slate-700">{record.employeeName}</td>
                        <td className="px-6 py-4 text-slate-700">{formatTime(record.checkIn)}</td>
                        <td className="px-6 py-4 text-slate-700">{formatTime(record.checkOut)}</td>
                        <td className="px-6 py-4 text-slate-700">{record.breaks?.length ?? 0}</td>
                        <td className="px-6 py-4 text-slate-700">{record.totalHours ?? '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            record.status === 'present'
                              ? 'bg-emerald-100 text-emerald-700'
                              : record.status === 'half-day'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>{record.status || 'pending'}</span>
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
