import { collection, doc, addDoc, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { db } from './config.js'

const usersCollection = collection(db, 'users')
const attendanceCollection = collection(db, 'attendance')
const eodCollection = collection(db, 'eod_reports')

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
  const snapshot = await getDocs(usersCollection)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
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
  const q = query(attendanceCollection, where('date', '==', date), orderBy('employeeName', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}

export const onAttendanceByDate = (date, callback) => {
  const q = query(attendanceCollection, where('date', '==', date), orderBy('employeeName', 'asc'))
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
  })
}

export const getEODReports = async (employeeId = '', fromDate = '', toDate = '') => {
  const q = query(eodCollection, orderBy('date', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((report) => {
      const reportDate = new Date(report.date)
      if (employeeId && report.employeeId !== employeeId) return false
      if (fromDate && reportDate < new Date(fromDate)) return false
      if (toDate && reportDate > new Date(toDate)) return false
      return true
    })
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
  const attendanceRef = await addDoc(attendanceCollection, {
    employeeId: attendanceData.employeeId,
    employeeName: attendanceData.employeeName,
    date: attendanceData.date,
    checkIn: attendanceData.checkIn || null,
    checkOut: attendanceData.checkOut || null,
    breaks: attendanceData.breaks || [],
    totalHours: attendanceData.totalHours || 0,
    createdAt: serverTimestamp(),
  })
  // Also persist a local copy for admin UI that reads localStorage
  try {
    const key = 'attendance'
    const raw = localStorage.getItem(key)
    const existing = raw ? JSON.parse(raw) : []
    const entry = { id: attendanceRef.id, ...attendanceData }
    const next = [...existing, entry]
    localStorage.setItem(key, JSON.stringify(next))
  } catch (err) {
    // ignore local storage errors
  }

  return { id: attendanceRef.id, ...attendanceData }
}

export const updateAttendance = async (attendanceId, updates) => {
  const attendanceRef = doc(attendanceCollection, attendanceId)
  await setDoc(attendanceRef, updates, { merge: true })
  // Also update localStorage copy used by admin UI
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
  const q = query(attendanceCollection, where('employeeId', '==', employeeId), orderBy('date', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
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
  const q = query(eodCollection, where('employeeId', '==', employeeId), orderBy('date', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}
