import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../../components/shared/Navbar'
import Sidebar from '../../components/shared/Sidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'
import { useAuth } from '../../hooks/useAuth'
import { getAttendanceByEmployee, saveAttendance, updateAttendance, saveEODReport } from '../../firebase/firestore'

const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const padTwo = (value) => String(value).padStart(2, '0')

const todaysDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`
}

const getLocalDateString = (value) => {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (typeof value?.seconds === 'number') {
    const date = new Date(value.seconds * 1000)
    return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`
  }
  if (value instanceof Date) {
    return `${value.getFullYear()}-${padTwo(value.getMonth() + 1)}-${padTwo(value.getDate())}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`
}

const calculateBreakMilliseconds = (breaks, now = new Date()) => {
  return breaks.reduce((sum, item) => {
    const start = parseFirestoreDate(item.start)
    const end = item.end ? parseFirestoreDate(item.end) : now
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return sum + Math.max(0, end.getTime() - start.getTime())
    }
    return sum
  }, 0)
}

const parseFirestoreDate = (value) => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value.toDate === 'function') return value.toDate()
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000)
  const result = new Date(value)
  return Number.isNaN(result.getTime()) ? null : result
}

const formatTime = (date) => {
  const parsed = parseFirestoreDate(date)
  if (!parsed) return '-'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed)
}

const formatDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = []
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  if (seconds || parts.length === 0) parts.push(`${seconds}s`)
  return parts.join(' ')
}

const formatTimeSpan = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${padTwo(hours)}:${padTwo(minutes)}:${padTwo(seconds)}`
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
  const [savingBreak, setSavingBreak] = useState(false)
  const [savingScrum, setSavingScrum] = useState(false)
  const [savingCheckout, setSavingCheckout] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadLocalAttendance = () => {
    try {
      const raw = localStorage.getItem('attendance')
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  useEffect(() => {
    const loadAttendance = async () => {
      if (!currentUser) {
        setLoading(false)
        return
      }

      try {
        const records = await getAttendanceByEmployee(currentUser.uid)
        const today = todaysDate()
        let todayRecord = records.find((record) => getLocalDateString(record.date) === today)

        if (!todayRecord) {
          const localRecords = loadLocalAttendance().filter((record) => String(record.employeeId) === String(currentUser.uid))
          todayRecord = localRecords.find((record) => getLocalDateString(record.date) === today)
        }

        if (todayRecord) {
          const normalizedBreaks = Array.isArray(todayRecord.breaks)
            ? todayRecord.breaks.map((item) => ({
                start: parseFirestoreDate(item.start),
                end: parseFirestoreDate(item.end),
              }))
            : []

          const ongoingBreak = normalizedBreaks.find((item) => item.start && !item.end)

          setAttendance(todayRecord)
          setAttendanceId(todayRecord.id)
          setCheckedInAt(parseFirestoreDate(todayRecord.checkIn))
          setCheckedOutAt(parseFirestoreDate(todayRecord.checkOut))
          setBreaks(normalizedBreaks)
          setActiveBreakStart(ongoingBreak ? ongoingBreak.start : null)
          setScrumSubmitted(Boolean(todayRecord.scrumSubmitted))
        } else {
          setAttendance(null)
          setAttendanceId(null)
          setCheckedInAt(null)
          setCheckedOutAt(null)
          setBreaks([])
          setScrumSubmitted(false)
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
  const canCheckout = hasCheckedIn && !hasCheckedOut

  const handleCheckIn = async () => {
    if (!currentUser) return
    const timestamp = new Date()
    setCheckedInAt(timestamp)
    setAttendanceId('pending')
    setCheckingIn(true)
    toast.success(`Checked in at ${formatTime(timestamp)}`)

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
      setBreaks([])
    } catch (error) {
      setCheckedInAt(null)
      setAttendanceId(null)
      toast.error('Check-in failed. Try again.')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleStartBreak = async () => {
    if (!canTakeBreak || !attendanceId || attendanceId === 'pending') return
    const breakStart = new Date()
    const nextBreaks = [...breaks, { start: breakStart, end: null }]

    setBreaks(nextBreaks)
    setActiveBreakStart(breakStart)
    toast.success('Break started.')

    try {
      await updateAttendance(attendanceId, {
        breaks: nextBreaks.map((item) => ({ start: item.start, end: item.end })),
      })
    } catch (error) {
      setBreaks(breaks)
      setActiveBreakStart(null)
      toast.error('Unable to start break.')
    }
  }

  const handleEndBreak = async () => {
    if (!attendanceId) return
    const breakEnd = new Date()
    const updatedBreaks = [...breaks]
    const lastIndex = updatedBreaks.findIndex((item) => item.start && !item.end)
    if (lastIndex === -1) return

    const breakStart = updatedBreaks[lastIndex].start
    updatedBreaks[lastIndex] = {
      ...updatedBreaks[lastIndex],
      end: breakEnd,
    }

    setBreaks(updatedBreaks)
    setActiveBreakStart(null)
    setSavingBreak(true)
    toast.success(`Break ended (${formatDuration(breakEnd - breakStart)})`)

    try {
      await updateAttendance(attendanceId, {
        breaks: updatedBreaks.map((item) => ({ start: item.start, end: item.end })),
      })
    } catch (error) {
      setBreaks(breaks)
      toast.error('Unable to end break.')
    } finally {
      setSavingBreak(false)
    }
  }

  const handleScrumSubmit = async (event) => {
    event.preventDefault()
    if (!currentUser || !attendanceId) return

    if (!scrum.completed.trim() || !scrum.tomorrow.trim()) {
      toast.error('Please fill in both required scrum fields.')
      return
    }

    setScrumSubmitted(true)
    setSavingScrum(true)
    toast.success('Scrum report submitted.')

    try {
      await saveEODReport({
        employeeId: currentUser.uid,
        employeeName,
        date: todaysDate(),
        completed: scrum.completed,
        tomorrow: scrum.tomorrow,
        blockers: scrum.blockers,
      })

      if (attendanceId) {
        await updateAttendance(attendanceId, { scrumSubmitted: true })
      }
    } catch (error) {
      setScrumSubmitted(false)
      toast.error('Unable to submit scrum report.')
    } finally {
      setSavingScrum(false)
    }
  }

  const handleCheckout = async () => {
    if (!attendanceId || !checkedInAt) return
    const checkOutTime = new Date()
    const completedBreaks = breaks.map((item) =>
      item.start && !item.end ? { ...item, end: checkOutTime } : item,
    )
    const totalDuration = checkOutTime - checkedInAt
    const breakDurationMs = calculateBreakMilliseconds(completedBreaks, checkOutTime)
    const totalHours = Number(((totalDuration - breakDurationMs) / 3600000).toFixed(2))

    setCheckedOutAt(checkOutTime)
    setBreaks(completedBreaks)
    setActiveBreakStart(null)
    setSavingCheckout(true)
    toast.success(`Checked out at ${formatTime(checkOutTime)}`)

    try {
      await updateAttendance(attendanceId, {
        checkOut: checkOutTime,
        totalHours,
        breaks: completedBreaks.map((item) => ({ start: item.start, end: item.end })),
      })
    } catch (error) {
      setCheckedOutAt(null)
      toast.error('Checkout failed.')
    } finally {
      setSavingCheckout(false)
    }
  }

  const totalDutyMs = checkedInAt ? (checkedOutAt ? checkedOutAt - checkedInAt : now - checkedInAt) : 0
  const totalBreakMs = calculateBreakMilliseconds(breaks, now)
  const netWorkMs = Math.max(0, totalDutyMs - totalBreakMs)
  const totalDutyLabel = checkedInAt ? formatTimeSpan(netWorkMs) : '00:00:00'
  const totalBreakLabel = formatDuration(totalBreakMs)
  const checkedInText = checkedInAt ? `Checked in at ${formatTime(checkedInAt)}` : 'Not checked in yet'
  const checkedOutText = checkedOutAt ? `Checked out at ${formatTime(checkedOutAt)}` : ''

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="md:hidden">
          <MobileSidebar role="employee" />
        </div>

        <Sidebar role="employee" />

        <main className="flex-1 min-w-0 p-4 md:p-6">
          <div className="mb-6 grid gap-6 rounded-3xl border border-slate-700 bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-800 p-6 shadow-2xl lg:grid-cols-[minmax(220px,1fr)_220px_minmax(220px,1fr)] lg:items-center">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 text-slate-100">
              <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-100"></p>
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-slate-400">{formatDate(now).split(',')[0]}</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{formatDate(now).replace(`${formatDate(now).split(',')[0]}, `, '')}</h1>
              <p className="mt-2 text-sm text-slate-400">Current time: {formatTime(now)}</p>
            </div>

            <div className="mx-auto flex w-full min-w-[220px] max-w-[220px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-950 px-5 py-4 text-center shadow-2xl shadow-slate-950/30 ring-1 ring-white/10">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Work time</p>
                <p className="mt-4 text-3xl font-semibold text-white font-mono leading-tight">{totalDutyLabel}</p>
                <p className="mt-1 text-sm text-slate-400">Breaks: {totalBreakLabel}</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-yellow-300 via-sky-500 to-orange-400 p-4 text-slate-950 shadow-lg shadow-orange-500/20 ring-1 ring-white/10 lg:max-w-[260px]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-950">Hello</p>
              <p className="mt-2 text-xl font-black text-slate-950">{employeeName}</p>
              <p className="mt-1 text-xs font-semibold text-slate-950">{checkedInText}</p>
              {checkedOutAt && <p className="mt-1 text-xs font-semibold text-slate-950">{checkedOutText}</p>}
            </div>
          </div>

          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/20">
              <h2 className="text-xl font-semibold text-white">Check-In</h2>
              <p className="mt-2 text-sm text-slate-400">Start your workday attendance.</p>
              <button
                onClick={handleCheckIn}
                disabled={Boolean(checkedInAt) || checkingIn}
                className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkedInAt ? 'Checked In' : checkingIn ? 'Checking in...' : 'Check In'}
              </button>
            </section>

            <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/30">
              <h2 className="text-xl font-semibold text-white">Break</h2>
              <p className="mt-2 text-sm text-slate-400">Track your break time while you work.</p>
              <button
                onClick={activeBreakStart ? handleEndBreak : handleStartBreak}
                disabled={!canTakeBreak || savingBreak || checkingIn}
                className="mt-6 w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {activeBreakStart ? (savingBreak ? 'Ending break...' : 'End Break') : checkingIn ? 'Preparing...' : 'Start Break'}
              </button>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                {activeBreakStart && (
                  <p>
                    Break started at {formatTime(activeBreakStart)} · running for {formatDuration(now - activeBreakStart)}
                  </p>
                )}
                {breaks.length > 0 && (
                  <div>
                    <p className="font-semibold text-white">Break history</p>
                    <div className="mt-3 rounded-3xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-slate-400">
                      Total break time: {formatDuration(calculateBreakMilliseconds(breaks))}
                    </div>
                    <ul className="mt-3 space-y-1">
                      {breaks.map((item, index) => {
                        const breakStart = item.start
                        const breakEnd = item.end || now
                        const duration = breakStart ? Math.max(0, breakEnd.getTime() - breakStart.getTime()) : 0
                        return (
                          <li key={index} className="rounded-2xl bg-slate-800 px-3 py-2 text-slate-100">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Break {index + 1}</div>
                            <div className="mt-1 text-sm">
                              <span>{breakStart ? formatTime(breakStart) : '-'}</span> - <span>{item.end ? formatTime(breakEnd) : 'Ongoing'}</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-400">Duration {formatDuration(duration)}</div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/30">
              <h2 className="text-xl font-semibold text-white">Checkout</h2>
              <p className="mt-2 text-sm text-slate-400">Submit your scrum report before you finish the day.</p>
              <button
                onClick={handleCheckout}
                disabled={!canCheckout || savingCheckout}
                className="mt-6 w-full rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingCheckout ? 'Checking out...' : hasCheckedOut ? 'Checked Out' : 'Check Out'}
              </button>
              {!scrumSubmitted && hasCheckedIn && !hasCheckedOut && (
                <p className="mt-3 text-sm text-amber-300">Scrum report is recommended before checkout.</p>
              )}
            </section>

          </div>

          <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/30">
            <h2 className="text-xl font-semibold text-white">Daily Scrum Report</h2>
            <p className="mt-2 text-sm text-slate-400">This is required before checkout.</p>
            <form className="mt-6 space-y-5" onSubmit={handleScrumSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">What did you complete today?</label>
                <textarea
                  value={scrum.completed}
                  onChange={(e) => setScrum({ ...scrum, completed: e.target.value })}
                  rows={4}
                  required
                  disabled={!canSubmitScrum || hasCheckedOut}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:bg-slate-900"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">What will you do tomorrow?</label>
                <textarea
                  value={scrum.tomorrow}
                  onChange={(e) => setScrum({ ...scrum, tomorrow: e.target.value })}
                  rows={4}
                  required
                  disabled={!canSubmitScrum || hasCheckedOut}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:bg-slate-900"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Any Issues</label>
                <textarea
                  value={scrum.blockers}
                  onChange={(e) => setScrum({ ...scrum, blockers: e.target.value })}
                  rows={3}
                  disabled={!canSubmitScrum || hasCheckedOut}
                  className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:bg-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={!canSubmitScrum || hasCheckedOut || scrumSubmitted}
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
