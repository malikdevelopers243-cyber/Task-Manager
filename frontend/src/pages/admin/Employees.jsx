import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import Navbar from '../../components/shared/Navbar'
import AdminSidebar from '../../components/shared/AdminSidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'
import EmptyState from '../../components/shared/EmptyState'
import SkeletonRow from '../../components/shared/SkeletonRow'
import { useAuth } from '../../hooks/useAuth'

const EMPLOYEES_STORAGE_KEY = 'employees'

const initialForm = {
  name: '',
  email: '',
  password: '',
  department: 'Engineering',
  role: 'employee',
  contact: '',
}

const saveEmployees = (employees) => {
  localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees))
}

const readEmployees = () => {
  const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    // Filter to only include employees (not admins/managers)
    return Array.isArray(data) ? data.filter(emp => emp.role === 'employee') : []
  } catch {
    localStorage.removeItem(EMPLOYEES_STORAGE_KEY)
    return []
  }
}

const Employees = () => {
  const { register, updateUser, removeUser } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [employeeToRemove, setEmployeeToRemove] = useState(null)
  const [employeeToEdit, setEmployeeToEdit] = useState(null)
  const [activeActionEmployee, setActiveActionEmployee] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    const stored = readEmployees()
    setEmployees(stored)
    setLoading(false)
  }, [])

  const departments = useMemo(
    () => ['Engineering', 'Marketing', 'HR', 'Sales', 'Other'],
    [],
  )

  const roleOptions = useMemo(() => [
    { label: 'Super Admin', value: 'superadmin' },
    { label: 'Manager', value: 'manager' },
    { label: 'Employee', value: 'employee' },
  ], [])

  const handleSaveEmployee = async (event) => {
    event.preventDefault()
    const trimmedName = form.name.trim()
    const trimmedEmail = form.email.trim().toLowerCase()

    if (!trimmedName || !trimmedEmail || (!employeeToEdit && !form.password)) {
      toast.error('Please complete name, email, and password.')
      return
    }

    const emailExists = employees.some(
      (employee) =>
        employee.email.toLowerCase() === trimmedEmail &&
        employee.id !== employeeToEdit?.id,
    )

    if (emailExists) {
      toast.error('This email is already registered.')
      return
    }

    setSaving(true)
    try {
      if (employeeToEdit) {
        const updates = {
          name: trimmedName,
          email: trimmedEmail,
          username: trimmedEmail.split('@')[0],
          role: form.role,
          department: form.department,
          contact: form.contact || '',
          ...(form.password ? { password: form.password } : {}),
        }

        await updateUser(employeeToEdit.id, updates)

        const nextEmployees = employees.map((employee) =>
          employee.id === employeeToEdit.id ? { ...employee, ...updates } : employee,
        )
        saveEmployees(nextEmployees)
        setEmployees(nextEmployees)
        toast.success('Employee updated successfully.')
      } else {
        const newUser = await register({
          username: trimmedEmail.split('@')[0],
          name: trimmedName,
          email: trimmedEmail,
          password: form.password,
          role: form.role,
          department: form.department,
          contact: form.contact,
        })

        const newEmployee = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          department: newUser.department,
          role: newUser.role,
          contact: newUser.contact || '',
          isActive: true,
          joiningDate: new Date().toISOString().split('T')[0],
        }

        const nextEmployees = [...employees, newEmployee]
        saveEmployees(nextEmployees)
        setEmployees(nextEmployees)
        toast.success('Employee added successfully.')
      }

      setForm(initialForm)
      setEmployeeToEdit(null)
      setModalOpen(false)
    } catch (error) {
      console.error('Save employee failed', error)
      toast.error(error.message || 'Unable to save employee.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (employee) => {
    const nextStatus = !employee.isActive
    const updates = { isActive: nextStatus }

    try {
      await updateUser(employee.id, updates)
    } catch (error) {
      console.error('Update status failed', error)
      toast.error('Unable to update employee status.')
      return
    }

    const nextEmployees = employees.map((item) =>
      item.id === employee.id ? { ...item, ...updates } : item,
    )
    saveEmployees(nextEmployees)
    setEmployees(nextEmployees)
    toast.success('Employee status updated.')
  }

  const toggleActionMenu = (employeeId) => {
    setActiveActionEmployee((prev) => (prev === employeeId ? null : employeeId))
  }

  const removeEmployee = (employee) => {
    setActiveActionEmployee(null)
    setEmployeeToRemove(employee)
    setDeleteConfirmOpen(true)
  }

  const confirmRemoveEmployee = async () => {
    if (!employeeToRemove) return

    try {
      await removeUser(employeeToRemove.id)
    } catch (error) {
      // If user doesn't exist on backend, we can still remove from frontend
      if (error.message && error.message.includes('not found')) {
        console.warn('User not found on backend, removing from frontend only', error)
      } else {
        console.error('Remove user failed', error)
        toast.error('Unable to remove employee login.')
        return
      }
    }

    const nextEmployees = employees.filter((item) => item.id !== employeeToRemove.id)
    saveEmployees(nextEmployees)
    setEmployees(nextEmployees)
    setEmployeeToRemove(null)
    setDeleteConfirmOpen(false)
    toast.success('Employee removed.')
  }

  const cancelRemoveEmployee = () => {
    setEmployeeToRemove(null)
    setDeleteConfirmOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <Toaster position="top-center" />
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <MobileSidebar role="admin" />
        </div>
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-0">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Employee Management</h2>
              <p className="mt-2 text-sm text-slate-400">Add new employees and manage account status.</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Add Employee
            </button>
          </div>

          <div className="overflow-visible rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-slate-950/30">
            <div className="overflow-visible rounded-3xl">
              <div className="overflow-x-auto overflow-y-visible">
                <table className="min-w-full divide-y divide-slate-700 text-sm text-slate-100">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Name</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Email</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Contact</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Department</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Role</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Joined</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-950">
                  {loading ? (
                    <>
                      <SkeletonRow columns={8} />
                      <SkeletonRow columns={8} />
                      <SkeletonRow columns={8} />
                    </>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8">
                        <EmptyState message="No employees found." />
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="px-6 py-4 text-slate-100">{employee.name}</td>
                        <td className="px-6 py-4 text-slate-100">{employee.email}</td>
                        <td className="px-6 py-4 text-slate-100">{employee.contact || '-'}</td>
                        <td className="px-6 py-4 text-slate-100">{employee.department}</td>
                        <td className="px-6 py-4 text-slate-100 capitalize">{employee.role}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              employee.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {employee.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-100">{employee.joiningDate}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                              onClick={() => toggleActionMenu(employee.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-100 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                              aria-label="Open employee actions"
                            >
                              <span className="text-lg leading-none">⋮</span>
                            </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

          {activeActionEmployee && (
            <div className="fixed right-20 top-72 z-40 w-50 overflow-hidden rounded-2xl border border-slate-200 bg-orange-600 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.75)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between border-b border-slate-700 pb-3 text-sm font-semibold uppercase tracking-[0.15em] text-slate-300">
                <span>Actions</span>
                <button
                  type="button"
                  onClick={() => setActiveActionEmployee(null)}
                  className="text-slate-400 transition hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const selectedEmployee = employees.find((item) => item.id === activeActionEmployee)
                    setActiveActionEmployee(null)
                    if (selectedEmployee) toggleStatus(selectedEmployee)
                  }}
                  className="flex w-full items-center justify-between rounded-3xl bg-slate-900 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <span>{employees.find((item) => item.id === activeActionEmployee)?.isActive ? 'Deactivate' : 'Activate'}</span>
                  <span className="text-xs text-slate-400">{employees.find((item) => item.id === activeActionEmployee)?.isActive ? 'Off' : 'On'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const selectedEmployee = employees.find((item) => item.id === activeActionEmployee)
                    setActiveActionEmployee(null)
                    if (selectedEmployee) {
                      setEmployeeToEdit(selectedEmployee)
                      setForm({
                        name: selectedEmployee.name,
                        email: selectedEmployee.email,
                        password: '',
                        department: selectedEmployee.department || 'Engineering',
                        role: selectedEmployee.role,
                        contact: selectedEmployee.contact || '',
                      })
                      setModalOpen(true)
                    }
                  }}
                  className="flex w-full items-center justify-between rounded-3xl bg-slate-900 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <span>Edit</span>
                  <span className="text-xs text-slate-400">Update</span>
                </button>
                <Link
                  to={`/admin/attendance?employee=${encodeURIComponent(employees.find((item) => item.id === activeActionEmployee)?.name || '')}`}
                  onClick={() => setActiveActionEmployee(null)}
                  className="flex w-full items-center justify-between rounded-3xl bg-slate-900 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <span>Attendance</span>
                  <span className="text-xs text-slate-400">Open</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const selectedEmployee = employees.find((item) => item.id === activeActionEmployee)
                    setActiveActionEmployee(null)
                    if (selectedEmployee) removeEmployee(selectedEmployee)
                  }}
                  className="flex w-full items-center justify-between rounded-3xl bg-slate-700 px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-rose-500"
                >
                  <span>Remove</span>
                  <span className="text-xs text-green-200">Delete</span>
                </button>
              </div>
            </div>
          )}

          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-8 shadow-2xl shadow-slate-950/40">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {employeeToEdit ? 'Edit Employee' : 'Add Employee'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {employeeToEdit
                        ? 'Update employee details and credentials.'
                        : 'Fill in the information and save the new employee.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(false)
                      setEmployeeToEdit(null)
                      setForm(initialForm)
                    }}
                    className="text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <form className="grid gap-5" onSubmit={handleSaveEmployee}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block text-sm text-slate-300">
                      Full Name
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                      />
                    </label>
                    <label className="block text-sm text-slate-300">
                      Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block text-sm text-slate-300">
                      Password
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                      />
                    </label>
                    <label className="block text-sm text-slate-300">
                      Department
                      <select
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                      >
                        {departments.map((department) => (
                          <option key={department} value={department} className="bg-slate-950 text-slate-100">
                            {department}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block text-sm text-slate-300">
                      Role
                      <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                      >
                        {roleOptions.map((r) => (
                          <option key={r.value} value={r.value} className="bg-slate-950 text-slate-100">{r.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm text-slate-300">
                      Contact Number
                      <input
                        type="tel"
                        value={form.contact}
                        onChange={(e) => setForm({ ...form, contact: e.target.value })}
                        className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (employeeToEdit ? 'Saving changes...' : 'Adding employee...') : employeeToEdit ? 'Save Changes' : 'Add Employee'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {deleteConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-8 shadow-2xl shadow-slate-950/40">
                <h3 className="text-xl font-semibold text-white">Remove Employee</h3>
                <p className="mt-3 text-sm text-slate-300">
                  Are you sure you want to remove{' '}
                  <span className="font-semibold text-white">{employeeToRemove?.name}</span>?
                </p>
                <p className="mt-1 text-sm text-slate-400">This action cannot be undone.</p>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelRemoveEmployee}
                    className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={confirmRemoveEmployee}
                    className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Employees
