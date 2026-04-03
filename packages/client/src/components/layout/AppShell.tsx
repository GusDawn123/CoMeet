import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/settings', label: 'Settings' },
    { path: '/api-keys', label: 'API Keys' },
    ...(user?.isAdmin ? [{ path: '/admin', label: 'Admin' }] : [])
  ]

  return (
    <div className="min-h-screen flex bg-black">
      <aside className="w-64 bg-[#0a0a0a] border-r border-neutral-800 flex flex-col">
        <div className="p-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-sm text-black">
              CM
            </div>
            <span className="text-lg font-semibold text-white">CoMeet</span>
          </Link>
        </div>

        <nav className="flex-1 px-3">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <div className="text-sm text-neutral-500 mb-2 truncate">{user?.email}</div>
          <button
            onClick={logout}
            className="text-sm text-neutral-600 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
