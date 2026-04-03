import { useEffect, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import * as settingsApi from '../api/settings'
import type { SettingsResponse } from '../api/settings'

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null)
  const [geminiKey, setGeminiKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [deepgramKey, setDeepgramKey] = useState('')
  const [language, setLanguage] = useState('Python')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    settingsApi.getSettings().then(s => {
      setSettings(s)
      setLanguage(s.language)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: Record<string, string | undefined> = { language }
      if (geminiKey) data.geminiKey = geminiKey
      if (openaiKey) data.openaiKey = openaiKey
      if (groqKey) data.groqKey = groqKey
      if (deepgramKey) data.deepgramKey = deepgramKey

      const updated = await settingsApi.updateSettings(data)
      setSettings(updated)
      setGeminiKey('')
      setOpenaiKey('')
      setGroqKey('')
      setDeepgramKey('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-2 text-white">Settings</h1>
        <p className="text-neutral-500 mb-8">Configure your LLM and transcription providers</p>

        <div className="space-y-6">
          <section className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-white">LLM Providers</h2>
            <p className="text-sm text-neutral-500 mb-4">
              At least one LLM key is required. Provider fallback: Gemini &rarr; OpenAI &rarr; Groq
            </p>

            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-neutral-400 mb-1">
                  <span>Gemini API Key</span>
                  {settings?.hasGeminiKey && <span className="text-white text-xs">Configured</span>}
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  placeholder={settings?.hasGeminiKey ? 'Key saved (enter new to replace)' : 'Enter Gemini API key'}
                  className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-600 text-sm"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-neutral-400 mb-1">
                  <span>OpenAI API Key</span>
                  {settings?.hasOpenaiKey && <span className="text-white text-xs">Configured</span>}
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={e => setOpenaiKey(e.target.value)}
                  placeholder={settings?.hasOpenaiKey ? 'Key saved (enter new to replace)' : 'Enter OpenAI API key'}
                  className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-600 text-sm"
                />
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-neutral-400 mb-1">
                  <span>Groq API Key</span>
                  {settings?.hasGroqKey && <span className="text-white text-xs">Configured</span>}
                </label>
                <input
                  type="password"
                  value={groqKey}
                  onChange={e => setGroqKey(e.target.value)}
                  placeholder={settings?.hasGroqKey ? 'Key saved (enter new to replace)' : 'Enter Groq API key'}
                  className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-600 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-white">Transcription</h2>
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-neutral-400 mb-1">
                <span>Deepgram API Key</span>
                {settings?.hasDeepgramKey && <span className="text-white text-xs">Configured</span>}
              </label>
              <input
                type="password"
                value={deepgramKey}
                onChange={e => setDeepgramKey(e.target.value)}
                placeholder={settings?.hasDeepgramKey ? 'Key saved (enter new to replace)' : 'Enter Deepgram API key'}
                className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-600 text-sm"
              />
            </div>
          </section>

          <section className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
            <h2 className="font-semibold mb-4 text-white">Preferences</h2>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Preferred Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full px-4 py-2.5 bg-black border border-neutral-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option>Python</option>
                <option>JavaScript</option>
                <option>TypeScript</option>
                <option>Java</option>
                <option>C++</option>
                <option>Go</option>
                <option>Rust</option>
              </select>
            </div>
          </section>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
