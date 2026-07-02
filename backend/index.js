import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const usersFile = path.join(dataDir, 'users.json')
const attendanceFile = path.join(dataDir, 'attendance.json')
const reportsFile = path.join(dataDir, 'reports.json')

const ensureFile = (filePath, defaultValue) => {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2))
  }
}

ensureFile(usersFile, [])
ensureFile(attendanceFile, [])
ensureFile(reportsFile, [])

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return []
  }
}

const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

const app = express()
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'office-management-dev-secret'

app.use(cors())
app.use(morgan('dev'))
app.use(express.json())

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token.' })
  }
}

const getUsers = () => readJson(usersFile)
const setUsers = (users) => writeJson(usersFile, users)
const getAttendance = () => readJson(attendanceFile)
const setAttendance = (attendance) => writeJson(attendanceFile, attendance)
const getReports = () => readJson(reportsFile)
const setReports = (reports) => writeJson(reportsFile, reports)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.post('/api/auth/register', async (req, res) => {
  const { username, name, email, password, role = 'employee', department = '', contact = '' } = req.body

  if (!username || !name || !email || !password) {
    return res.status(400).json({ message: 'Please provide username, name, email, and password.' })
  }

  const users = getUsers()
  const exists = users.some((user) => user.email.toLowerCase() === email.toLowerCase() || user.username.toLowerCase() === username.toLowerCase())
  if (exists) {
    return res.status(409).json({ message: 'An account with that email or username already exists.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const newUser = {
    id: Date.now().toString(),
    username: username.trim().toLowerCase(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: passwordHash,
    role,
    department,
    contact,
    profilePicture: null,
    isActive: true,
    joiningDate: new Date().toISOString().split('T')[0],
  }

  users.push(newUser)
  setUsers(users)

  const token = jwt.sign({ id: newUser.id, role: newUser.role, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' })

  res.status(201).json({
    message: 'User registered successfully.',
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      contact: newUser.contact,
      profilePicture: newUser.profilePicture,
      isActive: newUser.isActive,
      joiningDate: newUser.joiningDate,
    },
  })
})

app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Identifier and password are required.' })
  }

  const users = getUsers()
  const normalizedIdentifier = identifier.trim().toLowerCase()
  const user = users.find((candidate) => {
    const emailMatch = candidate.email.toLowerCase() === normalizedIdentifier
    const usernameMatch = candidate.username.toLowerCase() === normalizedIdentifier
    return emailMatch || usernameMatch
  })

  if (!user) {
    return res.status(401).json({ message: 'Invalid username/email or password.' })
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid username/email or password.' })
  }

  if (user.isActive === false) {
    return res.status(403).json({ message: 'This account has been deactivated.' })
  }

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' })

  res.json({
    message: 'Login successful.',
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      contact: user.contact,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
      joiningDate: user.joiningDate,
    },
  })
})

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const users = getUsers()
  const user = users.find((candidate) => candidate.id === req.user.id)
  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  res.json({ user: { ...user, password: undefined } })
})

app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Admin access required.' })
  }

  const users = getUsers().map((user) => ({ ...user, password: undefined }))
  res.json({ users })
})

app.post('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Admin access required.' })
  }

  const { username, name, email, password, role = 'employee', department = '', contact = '' } = req.body
  if (!username || !name || !email || !password) {
    return res.status(400).json({ message: 'Please provide username, name, email, and password.' })
  }

  const users = getUsers()
  const exists = users.some((user) => user.email.toLowerCase() === email.toLowerCase() || user.username.toLowerCase() === username.toLowerCase())
  if (exists) {
    return res.status(409).json({ message: 'An account with that email or username already exists.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const newUser = {
    id: Date.now().toString(),
    username: username.trim().toLowerCase(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: passwordHash,
    role,
    department,
    contact,
    profilePicture: null,
    isActive: true,
    joiningDate: new Date().toISOString().split('T')[0],
  }

  users.push(newUser)
  setUsers(users)
  res.status(201).json({ user: { ...newUser, password: undefined } })
})

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Admin access required.' })
  }

  const users = getUsers()
  const targetIndex = users.findIndex((user) => user.id === req.params.id)
  if (targetIndex === -1) {
    return res.status(404).json({ message: 'User not found.' })
  }

  const updates = { ...req.body }
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, 10)
  }

  users[targetIndex] = { ...users[targetIndex], ...updates }
  setUsers(users)
  res.json({ user: { ...users[targetIndex], password: undefined } })
})

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' })
  }

  const users = getUsers()
  const nextUsers = users.filter((user) => user.id !== req.params.id)
  if (nextUsers.length === users.length) {
    return res.status(404).json({ message: 'User not found.' })
  }

  setUsers(nextUsers)
  res.json({ message: 'User deleted.' })
})

app.get('/api/attendance', authenticateToken, (req, res) => {
  const allAttendance = getAttendance()
  const { date, employeeId } = req.query

  let attendance = allAttendance
  if (date) {
    attendance = attendance.filter((entry) => String(entry.date) === String(date))
  }
  if (employeeId) {
    attendance = attendance.filter((entry) => String(entry.employeeId) === String(employeeId))
  }

  if (req.user.role === 'admin' || req.user.role === 'superadmin') {
    return res.json({ attendance })
  }

  res.json({ attendance: attendance.filter((entry) => entry.employeeId === req.user.id) })
})

app.post('/api/attendance', authenticateToken, (req, res) => {
  const attendance = getAttendance()
  const entry = {
    id: Date.now().toString(),
    ...req.body,
    employeeId: req.user.id,
    employeeName: req.user.name || req.body.employeeName,
  }
  attendance.push(entry)
  setAttendance(attendance)
  res.status(201).json({ attendance: entry })
})

app.put('/api/attendance/:id', authenticateToken, (req, res) => {
  const attendance = getAttendance()
  const targetIndex = attendance.findIndex((entry) => entry.id === req.params.id)
  if (targetIndex === -1) {
    return res.status(404).json({ message: 'Attendance entry not found.' })
  }

  attendance[targetIndex] = { ...attendance[targetIndex], ...req.body }
  setAttendance(attendance)
  res.json({ attendance: attendance[targetIndex] })
})

app.get('/api/eod-reports', authenticateToken, (req, res) => {
  const allReports = getReports()
  const { employeeId, from, to } = req.query

  let reports = allReports
  if (employeeId) {
    reports = reports.filter((report) => String(report.employeeId) === String(employeeId))
  }
  if (from) {
    reports = reports.filter((report) => (report.date || '') >= from)
  }
  if (to) {
    reports = reports.filter((report) => (report.date || '') <= to)
  }

  if (req.user.role === 'admin' || req.user.role === 'superadmin') {
    return res.json({ reports })
  }

  res.json({ reports: reports.filter((report) => report.employeeId === req.user.id) })
})

app.post('/api/eod-reports', authenticateToken, (req, res) => {
  const reports = getReports()
  const report = {
    id: Date.now().toString(),
    ...req.body,
    employeeId: req.user.id,
    employeeName: req.user.name || req.body.employeeName,
    reviewed: false,
  }
  reports.push(report)
  setReports(reports)
  res.status(201).json({ report })
})

app.put('/api/eod-reports/:id/review', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Admin access required.' })
  }

  const reports = getReports()
  const targetIndex = reports.findIndex((report) => report.id === req.params.id)
  if (targetIndex === -1) {
    return res.status(404).json({ message: 'Report not found.' })
  }

  reports[targetIndex] = { ...reports[targetIndex], reviewed: true }
  setReports(reports)
  res.json({ report: reports[targetIndex] })
})

export const createApp = () => app

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename

if (process.env.NODE_ENV !== 'test' && isMainModule) {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
  })
}

export default app
