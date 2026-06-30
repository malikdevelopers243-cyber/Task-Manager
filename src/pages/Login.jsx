import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import logoImage from '../assets/images/main photo.png'
import Spinner from '../components/shared/Spinner'

const Login = () => {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    if (!identifier || !password) {
      toast.error('Username or email and password are required.')
      setLoading(false)
      return
    }

    try {
      const user = await login(identifier, password)

      if (!user || !user.role) {
        toast.error('Role not found for this user.')
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/employee/dashboard')
      }
    } catch (error) {
      toast.error(error.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-6 py-10">
      <Toaster position="top-center" />
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <img
            src={logoImage}
            alt="Office Management logo"
            className="mx-auto mb-4 h-20 w-20 rounded-full object-cover"
          />
          <h1 className="text-3xl font-bold text-slate-900">Office Management</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in with your company credentials.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Username or Email</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
            />
          </div>

          {/* Login accepts username/email + password. Role is determined from account. */}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4" color="border-white" /> Signing in...
              </span>
            ) : (
              'Log in'
            )}
          </button>

          <button
            type="button"
            onClick={async () => {
              setLoading(true)
              try {
                const user = await loginWithGoogle()
                if (user.role === 'admin') {
                  navigate('/admin/dashboard')
                } else {
                  navigate('/employee/dashboard')
                }
              } catch (error) {
                toast.error(error.message || 'Google sign-in failed.')
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Google
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-sky-600 hover:text-sky-700">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Login
