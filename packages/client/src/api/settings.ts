import { api } from './client'

export interface SettingsResponse {
  id: string
  hasGeminiKey: boolean
  hasOpenaiKey: boolean
  hasGroqKey: boolean
  hasDeepgramKey: boolean
  language: string
  theme: string
}

export async function getSettings(): Promise<SettingsResponse> {
  const res = await api.get('/settings')
  return res.data.settings
}

export async function updateSettings(data: Record<string, string | undefined>): Promise<SettingsResponse> {
  const res = await api.patch('/settings', data)
  return res.data.settings
}
