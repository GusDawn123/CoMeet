export interface Meeting {
  id: string
  userId: string
  title: string
  status: 'active' | 'ended'
  startedAt: string
  endedAt: string | null
  summary: string | null
}

export interface TranscriptSegment {
  id: string
  meetingId: string
  speaker: 'interviewer' | 'user'
  text: string
  timestamp: string
  confidence: number | null
  isFinal: boolean
}

export interface AIResponse {
  id: string
  meetingId: string
  mode: string
  intent: string | null
  response: string
  latencyMs: number | null
  provider: string | null
  createdAt: string
}

export interface MeetingWithDetails extends Meeting {
  segments: TranscriptSegment[]
  aiResponses: AIResponse[]
}
