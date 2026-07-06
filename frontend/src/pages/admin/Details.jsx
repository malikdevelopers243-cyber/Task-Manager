import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Navbar from '../../components/shared/Navbar'
import AdminSidebar from '../../components/shared/AdminSidebar'
import MobileSidebar from '../../components/shared/MobileSidebar'
import EmptyState from '../../components/shared/EmptyState'
import { useAuth } from '../../hooks/useAuth'

const Mask = ({ value }) => {
  if (!value) return '—'
  return '•'.repeat(8)
}

const Details = () => {
  const { employeeUsers, updateUser } = useAuth()
  const [employees, setEmployees] = useState([])
  const [selected, setSelected] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    setEmployees(Array.isArray(employeeUsers) ? employeeUsers : [])
  }, [employeeUsers])

  const open = (emp) => setSelected(emp)
  const close = () => {
    setSelected(null)
    setNewPassword('')
  }

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Enter a password of at least 6 characters.')
      return
    }

    try {
      await updateUser(selected.id, { password: newPassword })
      toast.success('Password updated (stored securely).')
      close()
    } catch (err) {
      toast.error('Unable to update password.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <MobileSidebar role="admin" />
        </div>
        <AdminSidebar />
        <main className="flex-1 p-6 md:p-0">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Employee Details</h2>
              <p className="mt-2 text-sm text-slate-400">View employee information and manage credentials securely.</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl shadow-slate-950/20">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700 text-sm text-slate-100">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Name</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Email</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Contact</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Department</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Role</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Joined</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-950">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8">
                        <EmptyState message="No employees found." />
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-900/40">
                        <td className="px-6 py-4 text-slate-100">{emp.name}</td>
                        <td className="px-6 py-4 text-slate-100">{emp.email}</td>
                        <td className="px-6 py-4 text-slate-100">{emp.contact || '-'}</td>
                        <td className="px-6 py-4 text-slate-100">{emp.department || '-'}</td>
                        <td className="px-6 py-4 text-slate-100">{emp.role}</td>
                        <td className="px-6 py-4 text-slate-100">{emp.joiningDate || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => open(emp)} className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">View Details</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selected && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={close} />
              <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-100 shadow-2xl">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{selected.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{selected.email}</p>
                  </div>
                  <button onClick={close} className="text-slate-300 hover:text-white">Close</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">Contact</h4>
                    <p className="mt-1 text-slate-200">{selected.contact || '-'}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">Department</h4>
                    <p className="mt-1 text-slate-200">{selected.department || '-'}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">Role</h4>
                    <p className="mt-1 text-slate-200">{selected.role}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">Joined</h4>
                    <p className="mt-1 text-slate-200">{selected.joiningDate || '-'}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">Password</h4>
                    <p className="mt-1 text-slate-200"><Mask value={selected.password} /></p>
                    <p className="mt-1 text-xs text-slate-400">For security, existing passwords are not displayed. Use the button below to set a new temporary password.</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">Set Temporary Password</h4>
                    <div className="mt-2 flex gap-2">
                      <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="New password" className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 outline-none" />
                      <button onClick={handleSetPassword} className="rounded-2xl bg-emerald-600 px-4 py-2 text-white">Set</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Details
