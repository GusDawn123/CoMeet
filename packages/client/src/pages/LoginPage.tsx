import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-xl text-black mx-auto mb-4">
            CM
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-neutral-500 mt-1">Sign in to CoMeet</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0a0a0a] border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-600"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-white hover:text-neutral-300 underline underline-offset-4">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
