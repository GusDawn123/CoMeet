import { useEffect, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import * as apiKeysApi from '../api/apiKeys'
import type { ApiKey } from '@comeet/shared'

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    apiKeysApi.listApiKeys().then(setKeys)
  }, [])

  const handleCreate = async () => {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const result = await apiKeysApi.createApiKey(newKeyName)
      setNewKeyValue(result.key)
      setNewKeyName('')
      const updated = await apiKeysApi.listApiKeys()
      setKeys(updated)
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    await apiKeysApi.revokeApiKey(id)
    const updated = await apiKeysApi.listApiKeys()
    setKeys(updated)
  }

  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <h1 className="text-2xl font-bold mb-2 text-white">API Keys</h1>
        <p className="text-neutral-500 mb-8">
          Generate API keys for programmatic access. Keys use <code className="text-white">cm_</code> prefix.
        </p>

        <section className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4 text-white">Create New Key</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. 'Development')"
              className="flex-1 px-4 py-2.5 bg-black border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-600 text-sm"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black disabled:opacity-50 rounded-lg font-medium text-sm transition-colors"
            >
              {creating ? 'Creating...' : 'Generate'}
            </button>
          </div>

          {newKeyValue && (
            <div className="mt-4 bg-white/5 border border-neutral-700 rounded-lg p-4">
              <p className="text-sm text-neutral-300 mb-2 font-medium">
                Copy this key now — it won't be shown again.
              </p>
              <code className="block text-xs bg-black p-3 rounded font-mono text-neutral-300 break-all select-all">
                {newKeyValue}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(newKeyValue)
                  setNewKeyValue(null)
                }}
                className="mt-3 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-medium transition-colors"
              >
                Copy & Dismiss
              </button>
            </div>
          )}
        </section>

        <section className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4 text-white">Your Keys</h2>
          {keys.length === 0 ? (
            <p className="text-neutral-600 text-sm">No API keys yet.</p>
          ) : (
            <div className="space-y-3">
              {keys.map(key => (
                <div
                  key={key.id}
                  className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-0"
                >
                  <div>
                    <div className="font-medium text-sm text-white">{key.name}</div>
                    <div className="flex items-center gap-3 text-xs text-neutral-600 mt-0.5">
                      <code>{key.keyPrefix}...{'*'.repeat(8)}</code>
                      <span>Created {new Date(key.createdAt).toLocaleDateString()}</span>
                      {key.lastUsedAt && (
                        <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                      )}
                      {key.revokedAt && (
                        <span className="text-red-400">Revoked</span>
                      )}
                    </div>
                  </div>
                  {!key.revokedAt && (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="text-xs text-neutral-600 hover:text-red-400 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
