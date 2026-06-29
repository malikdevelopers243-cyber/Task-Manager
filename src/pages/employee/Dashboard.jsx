import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../../components/shared/Navbar'
import Sidebar from '../../components/shared/Sidebar'
import { useAuth } from '../../hooks/useAuth'
import { getAttendanceByEmployee, saveAttendance, updateAttendance, saveEODReport } from '../../firebase/firestore'

const formatTime = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const todaysDate = () => {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

const calculateBreakMinutes = (breaks) => {
  return breaks.reduce((sum, item) => {
    if (item.start && item.end) {
      return sum + Math.max(0, item.end.toMillis() - item.start.toMillis())
    }
    return sum
  }, 0)
}

const formatDuration = (ms) => {
  const minutes = Math.round(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

const Dashboard = () => {
  const { currentUser } = useAuth()
  const [now, setNow] = useState(new Date())
  const [attendance, setAttendance] = useState(null)
  const [attendanceId, setAttendanceId] = useState(null)
  const [checkedInAt, setCheckedInAt] = useState(null)
  const [checkedOutAt, setCheckedOutAt] = useState(null)
  const [breaks, setBreaks] = useState([])
  const [activeBreakStart, setActiveBreakStart] = useState(null)
  const [scrum, setScrum] = useState({ completed: '', tomorrow: '', blockers: '' })
  const [scrumSubmitted, setScrumSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

      try {
        const records = await getAttendanceByEmployee(currentUser.uid)
        const today = todaysDate()
        const todayRecord = records.find((record) => record.date === today)

        if (todayRecord) {
          setAttendance(todayRecord)
          setAttendanceId(todayRecord.id)
          setCheckedInAt(todayRecord.checkIn ? new Date(todayRecord.checkIn.seconds * 1000) : null)
          setCheckedOutAt(todayRecord.checkOut ? new Date(todayRecord.checkOut.seconds * 1000) : null)
          setBreaks(
            Array.isArray(todayRecord.breaks)
              ? todayRecord.breaks.map((item) => ({
                  start: item.start ? new Date(item.start.seconds * 1000) : null,
                  end: item.end ? new Date(item.end.seconds * 1000) : null,
                }))
              : [],
          )
          setScrumSubmitted(Boolean(todayRecord.scrumSubmitted))
        }
      } catch (error) {
        toast.error('Unable to load attendance data.')
      } finally {
        setLoading(false)
      }
    }

    loadAttendance()
  }, [currentUser])

  const employeeName = useMemo(() => {
    if (currentUser?.name) return currentUser.name
    if (currentUser?.displayName) return currentUser.displayName
    return currentUser?.email || 'Employee'
  }, [currentUser])

  const hasCheckedIn = Boolean(checkedInAt) && !checkedOutAt
  const hasCheckedOut = Boolean(checkedOutAt)
  const canTakeBreak = hasCheckedIn && !hasCheckedOut
  const canSubmitScrum = hasCheckedIn && !hasCheckedOut
  const canCheckout = scrumSubmitted && hasCheckedIn && !hasCheckedOut

  const handleCheckIn = async () => {
    if (!currentUser) return
    setSaving(true)
    const timestamp = new Date()

    try {
      const result = await saveAttendance({
        employeeId: currentUser.uid,
        employeeName,
        date: todaysDate(),
        checkIn: timestamp,
        status: 'present',
        breaks: [],
        totalHours: 0,
      })

      setAttendanceId(result.id)
      setCheckedInAt(timestamp)
      setBreaks([])
      toast.success(`Checked in at ${formatTime(timestamp)}`)
    } catch (error) {
      toast.error('Check-in failed. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleStartBreak = () => {
    if (!canTakeBreak) return
    setActiveBreakStart(new Date())
    toast.success('Break started.')
  }

  const handleEndBreak = async () => {
    if (!activeBreakStart || !attendanceId) return
    setSaving(true)
    const breakEnd = new Date()
    const newBreak = { start: activeBreakStart, end: breakEnd }
    const updatedBreaks = [...breaks, newBreak]

    try {
      await updateAttendance(attendanceId, {
        breaks: updatedBreaks.map((item) => ({
          start: item.start,
          end: item.end,
        })),
      })
      setBreaks(updatedBreaks)
      setActiveBreakStart(null)
      toast.success(`Break ended (${formatDuration(breakEnd - activeBreakStart)})`)
    } catch (error) {
      toast.error('Unable to end break.')
    } finally {
      setSaving(false)
    }
  }

  const handleScrumSubmit = async (event) => {
    event.preventDefault()
    if (!currentUser || !attendanceId) return

    if (!scrum.completed.trim() || !scrum.tomorrow.trim()) {
      toast.error('Please fill in both required scrum fields.')
      return
    }

    setSaving(true)

    try {
      await saveEODReport({
        employeeId: currentUser.uid,
        employeeName,
        date: todaysDate(),
        completed: scrum.completed,
        tomorrow: scrum.tomorrow,
        blockers: scrum.blockers,
      })
      setScrumSubmitted(true)
      toast.success('Scrum report submitted.')
    } catch (error) {
      toast.error('Unable to submit scrum report.')
    } finally {
      setSaving(false)
    }
  }

  const handleCheckout = async () => {
    if (!attendanceId || !checkedInAt) return
    setSaving(true)
    const checkOutTime = new Date()
    const totalDuration = checkOutTime - checkedInAt
    const breakDurationMs = calculateBreakMinutes(
      breaks.map((item) => ({
        start: { toMillis: () => item.start?.getTime() || 0 },
        end: { toMillis: () => item.end?.getTime() || 0 },
      })),
    )
    const totalHours = Number(((totalDuration - breakDurationMs) / 3600000).toFixed(2))

    try {
      await updateAttendance(attendanceId, {
        checkOut: checkOutTime,
        totalHours,
      })
      setCheckedOutAt(checkOutTime)
      toast.success(`Checked out at ${formatTime(checkOutTime)}`)
    } catch (error) {
      toast.error('Checkout failed.')
    } finally {
      setSaving(false)
    }
  }

  const checkedInText = checkedInAt ? `Checked in at ${formatTime(checkedInAt)}` : 'Not checked in yet'
  const checkedOutText = checkedOutAt ? `Checked out at ${formatTime(checkedOutAt)}` : ''

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <Sidebar role="employee" />

        <main className="flex-1 p-6">
          <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-600">Employee dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">{formatDate(now)}</h1>
              <p className="mt-1 text-lg text-slate-600">Current time: {formatTime(now)}</p>
            </div>
            <div className="rounded-3xl bg-sky-50 px-5 py-4 text-right">
              <p className="text-sm text-slate-500">Hello</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">{employeeName}</p>
              <p className="mt-1 text-sm text-slate-500">{checkedInText}</p>
              {checkedOutAt && <p className="mt-1 text-sm text-slate-500">{checkedOutText}</p>}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Check-In</h2>
              <p className="mt-2 text-sm text-slate-500">Start your workday attendance.</p>
              <button
                onClick={handleCheckIn}
                disabled={Boolean(checkedInAt) || saving}
                className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkedInAt ? 'Checked In' : 'Check In'}
              </button>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Break</h2>
              <p className="mt-2 text-sm text-slate-500">Track your break time while you work.</p>
              <button
                onClick={activeBreakStart ? handleEndBreak : handleStartBreak}
                disabled={!canTakeBreak || saving}
                className="mt-6 w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeBreakStart ? 'End Break' : 'Start Break'}
              </button>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {activeBreakStart && <p>Break started at {formatTime(activeBreakStart)}</p>}
                {breaks.length > 0 && (
                  <div>
                    <p className="font-semibold text-slate-900">Break history</p>
                    <ul className="mt-2 space-y-1">
                      {breaks.map((item, index) => (
                        <li key={index} className="rounded-2xl bg-slate-50 px-3 py-2">
                          <span>Break {index + 1}: </span>
                          <span>{formatTime(item.start)} - {formatTime(item.end)}</span>
                          <span className="text-slate-500"> ({formatDuration(item.end - item.start)})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Checkout</h2>
              <p className="mt-2 text-sm text-slate-500">Submit your scrum report before you finish the day.</p>
              <button
                onClick={handleCheckout}
                disabled={!canCheckout || saving}
                className="mt-6 w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasCheckedOut ? 'Checked Out' : 'Check Out'}
              </button>
            </section>
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Daily Scrum Report</h2>
            <p className="mt-2 text-sm text-slate-500">This is required before checkout.</p>
            <form className="mt-6 space-y-5" onSubmit={handleScrumSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">What did you complete today?</label>
                <textarea
                  value={scrum.completed}
                  onChange={(e) => setScrum({ ...scrum, completed: e.target.value })}
                  rows={4}
                  required
                  disabled={!canSubmitScrum || hasCheckedOut}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">What will you do tomorrow?</label>
                <textarea
                  value={scrum.tomorrow}
                  onChange={(e) => setScrum({ ...scrum, tomorrow: e.target.value })}
                  rows={4}
                  required
                  disabled={!canSubmitScrum || hasCheckedOut}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Any blockers?</label>
                <textarea
                  value={scrum.blockers}
                  onChange={(e) => setScrum({ ...scrum, blockers: e.target.value })}
                  rows={3}
                  disabled={!canSubmitScrum || hasCheckedOut}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={!canSubmitScrum || hasCheckedOut || saving}
                className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scrumSubmitted ? 'Scrum Submitted' : 'Submit Scrum Report'}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
