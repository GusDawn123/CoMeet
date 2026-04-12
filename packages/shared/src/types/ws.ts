// Client → Server messages
export type ClientMessage =
  | { type: 'audio_chunk'; data: string }  // base64 audio
  | { type: 'trigger_mode'; mode: AIMode }
  | { type: 'cancel' }
  | { type: 'end_meeting' }

// Server → Client messages
export type ServerMessage =
  | { type: 'transcript'; speaker: 'interviewer' | 'user'; text: string; timestamp: number }
  | { type: 'ai_start'; mode: AIMode }
  | { type: 'ai_token'; token: string }
  | { type: 'ai_done'; mode: AIMode; intent: string | null; latencyMs: number }
  | { type: 'ai_error'; message: string }
  | { type: 'meeting_ended'; summary: string | null }
  | { type: 'ready' }
  | { type: 'error'; message: string }

export type AIMode =
  | 'what_to_say'
  | 'clarify'
  | 'code_hint'
  | 'brainstorm'
  | 'follow_up'
  | 'recap'
  | 'follow_up_questions'
