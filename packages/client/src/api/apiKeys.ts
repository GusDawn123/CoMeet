import { api } from './client'
import type { ApiKey } from '@comeet/shared'

export async function createApiKey(name: string, expiresInDays?: number): Promise<ApiKey & { key: string }> {
  const res = await api.post('/api-keys', { name, expiresInDays })
  return res.data
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const res = await api.get('/api-keys')
  return res.data.keys
}

export async function revokeApiKey(id: string): Promise<void> {
  await api.delete(`/api-keys/${id}`)
}
