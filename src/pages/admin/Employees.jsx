import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../../components/shared/Navbar'
import AdminSidebar from '../../components/shared/AdminSidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'
import EmptyState from '../../components/shared/EmptyState'
import SkeletonRow from '../../components/shared/SkeletonRow'

const EMPLOYEES_STORAGE_KEY = 'employees'

const DEFAULT_EMPLOYEES = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@office.com',
    password: 'admin123',
    department: 'Engineering',
    role: 'admin',
    isActive: true,
    joiningDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 2,
    name: 'John Employee',
    email: 'john@office.com',
    password: 'emp123',
    department: 'Engineering',
    role: 'employee',
    isActive: true,
    joiningDate: new Date().toISOString().split('T')[0],
  },
]

const initialForm = {
  name: '',
  email: '',
  password: '',
  department: 'Engineering',
  role: 'employee',
}

const saveEmployees = (employees) => {
  localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees))
}

const readEmployees = () => {
  const raw = localStorage.getItem(EMPLOYEES_STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(EMPLOYEES_STORAGE_KEY)
    return []
  }
}

const Employees = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    const stored = readEmployees()
    if (stored.length === 0) {
      saveEmployees(DEFAULT_EMPLOYEES)
      setEmployees(DEFAULT_EMPLOYEES)
    } else {
      setEmployees(stored)
    }
    setLoading(false)
  }, [])

  const departments = useMemo(
    () => ['Engineering', 'Marketing', 'HR', 'Sales', 'Other'],
    [],
  )

  const handleCreateEmployee = (event) => {
    event.preventDefault()
    if (!form.name || !form.email || !form.password) {
      toast.error('Please complete name, email, and password.')
      return
    }

    const emailExists = employees.some(
      (employee) => employee.email.toLowerCase() === form.email.toLowerCase(),
    )

    if (emailExists) {
      toast.error('This email is already registered.')
      return
    }

    setSaving(true)
    const newEmployee = {
      id: Date.now(),
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      department: form.department,
      role: form.role,
      isActive: true,
      joiningDate: new Date().toISOString().split('T')[0],
    }

    const nextEmployees = [...employees, newEmployee]
    saveEmployees(nextEmployees)
    setEmployees(nextEmployees)
    setForm(initialForm)
    setSaving(false)
    setModalOpen(false)
    toast.success('Employee Added Successfully')
  }

  const toggleStatus = (employee) => {
    const nextEmployees = employees.map((item) =>
      item.id === employee.id ? { ...item, isActive: !item.isActive } : item,
    )
    saveEmployees(nextEmployees)
    setEmployees(nextEmployees)
    toast.success('Employee status updated.')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <MobileSidebar role="admin" />
        </div>
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-0">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Employee Management</h2>
              <p className="mt-2 text-sm text-slate-500">Add new employees and manage account status.</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Add Employee
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Name</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Email</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Department</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Role</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Joined</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    <>
                      <SkeletonRow columns={7} />
                      <SkeletonRow columns={7} />
                      <SkeletonRow columns={7} />
                    </>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8">
                        <EmptyState message="No employees found." />
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id}>
                        <td className="px-6 py-4 text-slate-700">{employee.name}</td>
                        <td className="px-6 py-4 text-slate-700">{employee.email}</td>
                        <td className="px-6 py-4 text-slate-700">{employee.department}</td>
                        <td className="px-6 py-4 text-slate-700 capitalize">{employee.role}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              employee.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {employee.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{employee.joiningDate}</td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => toggleStatus(employee)}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                          >
                            {employee.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Add Employee</h3>
                    <p className="mt-1 text-sm text-slate-500">Fill in the information and save the new employee.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="text-slate-500 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
                <form className="grid gap-5" onSubmit={handleCreateEmployee}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block text-sm text-slate-700">
                      Full Name
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                      />
                    </label>
                    <label className="block text-sm text-slate-700">
                      Email
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block text-sm text-slate-700">
                      Password
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                      />
                    </label>
                    <label className="block text-sm text-slate-700">
                      Department
                      <select
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                        required
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                      >
                        {departments.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block text-sm text-slate-700">
                    Role
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Adding employee...' : 'Add Employee'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Employees
