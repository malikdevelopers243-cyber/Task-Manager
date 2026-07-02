import { collection, doc, addDoc, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { db } from './config.js'

const usersCollection = collection(db, 'users')
const attendanceCollection = collection(db, 'attendance')
const eodCollection = collection(db, 'eod_reports')

const ATTENDANCE_STORAGE_KEY = 'attendance'

const padTwo = (value) => String(value).padStart(2, '0')

const isIsoDateString = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)

const withTimeout = (promise, ms = 1500) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), ms)),
  ])
}

const normalizeDateValue = (value) => {
  if (!value) return null
  if (isIsoDateString(value)) return value

  let date = null
  if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value)
  } else if (value instanceof Date) {
    date = value
  } else if (typeof value?.seconds === 'number') {
    date = new Date(value.seconds * 1000)
  } else if (typeof value?.toDate === 'function') {
    date = value.toDate()
  } else {
    date = new Date(value)
  }

  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`
}

const normalizeEmployeeId = (employeeId) => String(employeeId ?? '')

const deduplicateAttendance = (records) => {
  const byEmployee = new Map()
  for (const record of records) {
    const empId = normalizeEmployeeId(record.employeeId) || record.id
    if (!byEmployee.has(empId)) {
      byEmployee.set(empId, record)
    } else {
      const existing = byEmployee.get(empId)
      if (record.checkIn && !existing.checkIn) {
        byEmployee.set(empId, record)
      }
    }
  }
  return Array.from(byEmployee.values())
}

const loadLocalAttendance = () => {
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    localStorage.removeItem(ATTENDANCE_STORAGE_KEY)
    return []
  }
}

const mergeAttendanceRecords = (remote, local) => {
  const byKey = new Map()
  const getKey = (entry) => `${normalizeEmployeeId(entry.employeeId)}|${normalizeDateValue(entry.date) || entry.id}`

  for (const item of remote) {
    byKey.set(getKey(item), item)
  }
  for (const item of local) {
    const key = getKey(item)
    if (!byKey.has(key)) {
      byKey.set(key, item)
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const aDate = normalizeDateValue(a.date) || ''
    const bDate = normalizeDateValue(b.date) || ''
    return aDate < bDate ? 1 : aDate > bDate ? -1 : 0
  })
}

export const createUser = async (uid, userData) => {
  const userRef = doc(usersCollection, uid)
  await setDoc(userRef, {
    ...userData,
    joiningDate: userData.joiningDate || null,
    isActive: userData.isActive ?? true,
  })
  return { id: uid, ...userData }
}

export const getAllUsers = async () => {
  try {
    const snapshot = await withTimeout(getDocs(usersCollection), 1500)
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
  } catch (err) {
    console.error("Failed to get all users:", err)
    return []
  }
}

export const onUsersSnapshot = (callback) => {
  return onSnapshot(usersCollection, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
  })
}

export const updateUserStatus = async (uid, isActive) => {
  const userRef = doc(usersCollection, uid)
  await setDoc(userRef, { isActive }, { merge: true })
  return { id: uid, isActive }
}

export const getAttendanceByDate = async (date) => {
  const q = query(attendanceCollection, where('date', '==', date))
  try {
    const snapshot = await withTimeout(getDocs(q), 1500)
    const remote = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    remote.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''))

    // Merge local cache entries for this date that are not yet in Firestore
    try {
      const raw = localStorage.getItem('attendance')
      const existing = raw ? JSON.parse(raw) : []
      const local = existing.filter((item) => normalizeDateValue(item.date) === date)
      const byEmployee = new Map()
      for (const r of remote) {
        byEmployee.set(String(r.employeeId) || r.id, r)
      }
      for (const l of local) {
        const key = String(l.employeeId) || l.id
        if (!byEmployee.has(key)) byEmployee.set(key, l)
      }
      const merged = Array.from(byEmployee.values())
      merged.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''))
      return merged
    } catch (e) {
      return remote
    }
  } catch (err) {
    // Firestore failed — fallback to local cache
    try {
      const raw = localStorage.getItem('attendance')
      const existing = raw ? JSON.parse(raw) : []
      const list = existing.filter((item) => normalizeDateValue(item.date) === date)
      const deduped = deduplicateAttendance(list)
      deduped.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''))
      return deduped
    } catch (e) {
      return []
    }
  }
}

export const onAttendanceByDate = (date, callback) => {
  const q = query(attendanceCollection, where('date', '==', date))
  let fired = false
  const fallbackTimeout = setTimeout(() => {
    if (!fired) {
      fired = true
      try {
        const raw = localStorage.getItem('attendance')
        const existing = raw ? JSON.parse(raw) : []
        const list = existing.filter((item) => normalizeDateValue(item.date) === date)
        const deduped = deduplicateAttendance(list)
        deduped.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''))
        callback(deduped)
      } catch (e) {
        callback([])
      }
    }
  }, 1500)

  try {
    // Subscribe to Firestore; merge results with local cache so admin sees recent local check-ins
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        clearTimeout(fallbackTimeout)
        if (fired) return
        fired = true
        const remote = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        remote.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''))
        try {
          const raw = localStorage.getItem('attendance')
          const existing = raw ? JSON.parse(raw) : []
          const local = existing.filter((item) => normalizeDateValue(item.date) === date)

          const byEmployee = new Map()
          for (const r of remote) {
            byEmployee.set(String(r.employeeId) || r.id, r)
          }
          for (const l of local) {
            const key = String(l.employeeId) || l.id
            if (!byEmployee.has(key)) byEmployee.set(key, l)
          }

          const merged = Array.from(byEmployee.values())
          merged.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''))
          callback(merged)
        } catch (e) {
          // If local read fails, just return remote
          callback(remote)
        }
      },
      (error) => {
        clearTimeout(fallbackTimeout)
        if (fired) return
        fired = true
        // On subscription error, fallback to localStorage cache
        try {
          const raw = localStorage.getItem('attendance')
          const existing = raw ? JSON.parse(raw) : []
          const list = existing.filter((item) => normalizeDateValue(item.date) === date)
          const deduped = deduplicateAttendance(list)
          deduped.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''))
          callback(deduped)
        } catch (e) {
          callback([])
        }
      },
    )

    return unsub
  } catch (err) {
    clearTimeout(fallbackTimeout)
    if (fired) return
    fired = true
    // If query/subscription failed, immediately fallback to local cache
    try {
      const raw = localStorage.getItem('attendance')
      const existing = raw ? JSON.parse(raw) : []
      const list = existing.filter((item) => normalizeDateValue(item.date) === date)
      const deduped = deduplicateAttendance(list)
      deduped.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''))
      setTimeout(() => callback(deduped), 0)
    } catch (e) {
      setTimeout(() => callback([]), 0)
    }

    return () => {}
  }
}

export const getEODReports = async (employeeId = '', fromDate = '', toDate = '') => {
  try {
    const q = query(eodCollection)
    const snapshot = await withTimeout(getDocs(q), 1500)
    const reports = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    
    reports.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    return reports.filter((report) => {
      if (!report.date) return false
      const reportDate = new Date(report.date)
      if (employeeId && report.employeeId !== employeeId) return false
      if (fromDate && reportDate < new Date(fromDate)) return false
      if (toDate && reportDate > new Date(toDate)) return false
      return true
    })
  } catch (err) {
    console.error("Failed to get EOD reports:", err)
    return []
  }
}

export const markReportReviewed = async (reportId) => {
  const reportRef = doc(eodCollection, reportId)
  await setDoc(reportRef, { reviewed: true, reviewedAt: serverTimestamp() }, { merge: true })
  return { id: reportId, reviewed: true }
}

export const getUser = async (uid) => {
  const userRef = doc(usersCollection, uid)
  const snapshot = await getDoc(userRef)
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export const saveAttendance = async (attendanceData) => {
  const normalizedEmployeeId = normalizeEmployeeId(attendanceData.employeeId)
  const normalizedDate = normalizeDateValue(attendanceData.date) || attendanceData.date

  // Write a local copy first so UI and admin can read attendance immediately
  const key = 'attendance'
  const localId = `local-${Date.now()}`
  const localEntry = {
    id: localId,
    ...attendanceData,
    employeeId: normalizedEmployeeId,
    date: normalizedDate,
  }
  try {
    const raw = localStorage.getItem(key)
    const existing = raw ? JSON.parse(raw) : []
    const next = [...existing, localEntry]
    localStorage.setItem(key, JSON.stringify(next))
  } catch (err) {
    // ignore local storage errors
  }

  // Try to persist to Firestore and, if successful, replace the local id
  try {
    const attendanceRef = await addDoc(attendanceCollection, {
      employeeId: normalizedEmployeeId,
      employeeName: attendanceData.employeeName,
      date: normalizedDate,
      checkIn: attendanceData.checkIn || null,
      checkOut: attendanceData.checkOut || null,
      breaks: attendanceData.breaks || [],
      totalHours: attendanceData.totalHours || 0,
      createdAt: serverTimestamp(),
    })

    try {
      const raw = localStorage.getItem(key)
      const existing = raw ? JSON.parse(raw) : []
      const updated = existing.map((item) =>
        item.id === localId ? { id: attendanceRef.id, ...attendanceData, employeeId: normalizedEmployeeId, date: normalizedDate } : item,
      )
      localStorage.setItem(key, JSON.stringify(updated))
    } catch (err) {
      // ignore local storage sync errors
    }

    return { id: attendanceRef.id, ...attendanceData }
  } catch (err) {
    // If Firestore write failed, return the local entry so UI stays consistent
    return { id: localId, ...attendanceData }
  }
}

export const updateAttendance = async (attendanceId, updates) => {
  const attendanceRef = doc(attendanceCollection, attendanceId)
  try {
    await setDoc(attendanceRef, updates, { merge: true })
  } catch (err) {
    // Firestore update failed — continue to update local cache so UI remains correct
  }

  // Update localStorage copy used by admin UI (either synced id or local id)
  try {
    const key = 'attendance'
    const raw = localStorage.getItem(key)
    const existing = raw ? JSON.parse(raw) : []
    const next = existing.map((item) => (item.id === attendanceId ? { ...item, ...updates } : item))
    localStorage.setItem(key, JSON.stringify(next))
  } catch (err) {
    // ignore
  }

  return { id: attendanceId, ...updates }
}

export const getAttendanceByEmployee = async (employeeId) => {
  const normalizedEmployeeId = normalizeEmployeeId(employeeId)
  try {
    const q = query(attendanceCollection, where('employeeId', '==', normalizedEmployeeId))
    const snapshot = await withTimeout(getDocs(q), 1500)
    const remote = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))

    const local = loadLocalAttendance().filter((item) => normalizeEmployeeId(item.employeeId) === normalizedEmployeeId)
    return mergeAttendanceRecords(remote, local)
  } catch (err) {
    const local = loadLocalAttendance().filter((item) => normalizeEmployeeId(item.employeeId) === normalizedEmployeeId)
    return local.sort((a, b) => {
      const aDate = normalizeDateValue(a.date) || ''
      const bDate = normalizeDateValue(b.date) || ''
      return aDate < bDate ? 1 : aDate > bDate ? -1 : 0
    })
  }
}

export const saveEODReport = async (reportData) => {
  const reportRef = await addDoc(eodCollection, {
    employeeId: reportData.employeeId,
    employeeName: reportData.employeeName,
    date: reportData.date,
    submittedAt: serverTimestamp(),
    completed: reportData.completed || '',
    tomorrow: reportData.tomorrow || '',
    blockers: reportData.blockers || '',
    reviewed: false,
  })

  return { id: reportRef.id, ...reportData, reviewed: false }
}

export const getEODReportsByEmployee = async (employeeId) => {
  try {
    const q = query(eodCollection, where('employeeId', '==', employeeId))
    const snapshot = await withTimeout(getDocs(q), 1500)
    const reports = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    reports.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    return reports
  } catch (err) {
    console.error("Failed to get EOD reports by employee:", err)
    return []
  }
}
