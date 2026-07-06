import './App.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AdminDashboard from './pages/admin/Dashboard'
import AdminEmployees from './pages/admin/Employees'
import AdminAttendance from './pages/admin/Attendance'
import AdminDetails from './pages/admin/Details'
import AdminEODReports from './pages/admin/EODReports'
import EmployeeDashboard from './pages/employee/Dashboard'
import EmployeeAttendance from './pages/employee/Attendance'
import EmployeeEODReports from './pages/employee/EODReports'
import ProtectedRoute from './components/shared/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminEmployees />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/details"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/eod-reports"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminEODReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute allowedRole="employee">
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/attendance"
            element={
              <ProtectedRoute allowedRole="employee">
                <EmployeeAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/eod-reports"
            element={
              <ProtectedRoute allowedRole="employee">
                <EmployeeEODReports />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
