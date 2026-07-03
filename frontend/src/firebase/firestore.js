const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const getToken = () => localStorage.getItem('office-management-token')

const apiRequest = async (path, options = {}) => {
  const token = getToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || 'Request failed.')
  }
  return data
}

const normalizeDateValue = (value) => {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  if (typeof value?.seconds === 'number') {
    const date = new Date(value.seconds * 1000)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  return null
}

export const createUser = async () => ({})

export const getAllUsers = async () => {
  const data = await apiRequest('/api/users')
  return data.users || []
}

export const onUsersSnapshot = () => () => {}

export const updateUserStatus = async () => ({})

export const getAttendanceByDate = async (date) => {
  const data = await apiRequest(`/api/attendance?date=${encodeURIComponent(date)}`)
  return data.attendance || []
}

export const onAttendanceByDate = (date, callback) => {
  let cancelled = false
  const load = async () => {
    try {
      const records = await getAttendanceByDate(date)
      if (!cancelled) {
        callback(records)
      }
    } catch (error) {
      if (!cancelled) {
        callback([])
      }
    }
  }

  load()
  const interval = setInterval(load, 5000)
  return () => {
    cancelled = true
    clearInterval(interval)
  }
}

export const getEODReports = async (employeeId = '', fromDate = '', toDate = '') => {
  const query = new URLSearchParams()
  if (employeeId) query.set('employeeId', employeeId)
  if (fromDate) query.set('from', fromDate)
  if (toDate) query.set('to', toDate)
  const data = await apiRequest(`/api/eod-reports${query.toString() ? `?${query.toString()}` : ''}`)
  return data.reports || []
}

export const markReportReviewed = async (reportId) => {
  const data = await apiRequest(`/api/eod-reports/${reportId}/review`, { method: 'PUT' })
  return data.report
}

export const getUser = async () => null

export const saveAttendance = async (attendanceData) => {
  const data = await apiRequest('/api/attendance', {
    method: 'POST',
    body: JSON.stringify(attendanceData),
  })
  return data.attendance
}

export const updateAttendance = async (attendanceId, updates) => {
  const data = await apiRequest(`/api/attendance/${attendanceId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  return data.attendance
}

export const getAttendanceByEmployee = async (employeeId) => {
  const data = await apiRequest(`/api/attendance?employeeId=${encodeURIComponent(employeeId)}`)
  return data.attendance || []
}

export const saveEODReport = async (reportData) => {
  const data = await apiRequest('/api/eod-reports', {
    method: 'POST',
    body: JSON.stringify(reportData),
  })
  return data.report
}

export const getEODReportsByEmployee = async (employeeId) => {
  const data = await apiRequest(`/api/eod-reports?employeeId=${encodeURIComponent(employeeId)}`)
  return data.reports || []
}
