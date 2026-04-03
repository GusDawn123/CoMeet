import { useEffect, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import * as adminApi from '../api/admin'

type Tab = 'users' | 'logs'

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [logs, setLogs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [tab])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const s = await adminApi.getStats()
      setStats(s)

      if (tab === 'users') {
        const u = await adminApi.getUsers()
        setUsers(u)
      } else {
        const l = await adminApi.getLogs()
        setLogs(l)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(id: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return
    try {
      await adminApi.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user')
    }
  }

  if (error) {
    return (
      <AppShell>
        <div className="p-8">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <h1 className="text-2xl font-bold mb-2 text-white">Admin Panel</h1>
        <p className="text-neutral-500 mb-8">System overview and user management</p>

        {stats && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            {[
              ['Users', stats.users],
              ['Meetings', stats.meetings],
              ['Active', stats.activeMeetings],
              ['Transcripts', stats.transcriptSegments],
              ['AI Responses', stats.aiResponses]
            ].map(([label, value]) => (
              <div key={label as string} className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4">
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-neutral-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {(['users', 'logs'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? 'bg-white text-black'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 text-neutral-400 hover:text-white transition-colors ml-auto"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-neutral-600 text-sm py-12 text-center">Loading...</div>
        ) : tab === 'users' ? (
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 text-left">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Meetings</th>
                  <th className="px-5 py-3 font-medium">API Keys</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-neutral-800/50 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <div className="text-white font-medium">{user.name}</div>
                      <div className="text-neutral-500 text-xs">{user.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.isAdmin ? 'bg-white/10 text-white' : 'bg-neutral-800 text-neutral-500'
                      }`}>
                        {user.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-neutral-400">{user._count.meetings}</td>
                    <td className="px-5 py-3 text-neutral-400">{user._count.apiKeys}</td>
                    <td className="px-5 py-3 text-neutral-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      {!user.isAdmin && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-neutral-600 hover:text-red-400 transition-colors text-xs"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : logs ? (
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-medium text-neutral-400 mb-3">Recent Meetings</h3>
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500 text-left">
                      <th className="px-5 py-3 font-medium">Title</th>
                      <th className="px-5 py-3 font-medium">User</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.recentMeetings.map((m: any) => (
                      <tr key={m.id} className="border-b border-neutral-800/50">
                        <td className="px-5 py-3 text-white">{m.title}</td>
                        <td className="px-5 py-3 text-neutral-400">{m.user.email}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            m.status === 'active' ? 'bg-white/10 text-white' : 'bg-neutral-800 text-neutral-500'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-neutral-500">{new Date(m.startedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium text-neutral-400 mb-3">Recent AI Responses</h3>
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500 text-left">
                      <th className="px-5 py-3 font-medium">Mode</th>
                      <th className="px-5 py-3 font-medium">Intent</th>
                      <th className="px-5 py-3 font-medium">Provider</th>
                      <th className="px-5 py-3 font-medium">Latency</th>
                      <th className="px-5 py-3 font-medium">User</th>
                      <th className="px-5 py-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.recentResponses.map((r: any) => (
                      <tr key={r.id} className="border-b border-neutral-800/50">
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 bg-white/10 text-white rounded text-xs">
                            {r.mode.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-neutral-400">{r.intent || '-'}</td>
                        <td className="px-5 py-3 text-neutral-400">{r.provider || '-'}</td>
                        <td className="px-5 py-3 text-neutral-400">{r.latencyMs ? `${r.latencyMs}ms` : '-'}</td>
                        <td className="px-5 py-3 text-neutral-500">{r.meeting?.user?.email}</td>
                        <td className="px-5 py-3 text-neutral-500">{new Date(r.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </AppShell>
  )
}
