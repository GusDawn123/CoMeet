import { create } from 'zustand'
import type { AIMode } from '@comeet/shared'

interface TranscriptEntry {
  speaker: 'interviewer' | 'user'
  text: string
  timestamp: number
}

interface AIResponseEntry {
  mode: AIMode
  intent: string | null
  content: string
  latencyMs: number
  provider: string | null
  isStreaming: boolean
}

type ConnectionStatus = 'connecting' | 'connected' | 'ready' | 'disconnected'

interface MeetingState {
  meetingId: string | null
  isActive: boolean
  isRecording: boolean
  connectionStatus: ConnectionStatus
  transcript: TranscriptEntry[]
  currentResponse: AIResponseEntry | null
  responses: AIResponseEntry[]
  activeMode: AIMode | null

  setMeeting: (id: string) => void
  setActive: (active: boolean) => void
  setRecording: (recording: boolean) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  addTranscript: (entry: TranscriptEntry) => void
  startResponse: (mode: AIMode) => void
  appendToken: (token: string) => void
  finishResponse: (intent: string | null, latencyMs: number) => void
  setError: (message: string) => void
  reset: () => void
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetingId: null,
  isActive: false,
  isRecording: false,
  connectionStatus: 'disconnected' as ConnectionStatus,
  transcript: [],
  currentResponse: null,
  responses: [],
  activeMode: null,

  setMeeting: (id) => set({ meetingId: id }),
  setActive: (active) => set({ isActive: active }),
  setRecording: (recording) => set({ isRecording: recording }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  addTranscript: (entry) =>
    set(state => ({ transcript: [...state.transcript, entry] })),

  startResponse: (mode) =>
    set({
      activeMode: mode,
      currentResponse: { mode, intent: null, content: '', latencyMs: 0, provider: null, isStreaming: true }
    }),

  appendToken: (token) =>
    set(state => {
      if (!state.currentResponse) return state
      return {
        currentResponse: {
          ...state.currentResponse,
          content: state.currentResponse.content + token
        }
      }
    }),

  finishResponse: (intent, latencyMs) =>
    set(state => {
      if (!state.currentResponse) return state
      const finished = { ...state.currentResponse, intent, latencyMs, isStreaming: false }
      return {
        currentResponse: null,
        activeMode: null,
        responses: [...state.responses, finished]
      }
    }),

  setError: (message) =>
    set(state => ({
      currentResponse: null,
      activeMode: null,
      responses: [...state.responses, {
        mode: state.activeMode || 'what_to_say',
        intent: null,
        content: `Error: ${message}`,
        latencyMs: 0,
        provider: null,
        isStreaming: false
      }]
    })),

  reset: () =>
    set({
      meetingId: null,
      isActive: false,
      isRecording: false,
      connectionStatus: 'disconnected' as ConnectionStatus,
      transcript: [],
      currentResponse: null,
      responses: [],
      activeMode: null
    })
}))
