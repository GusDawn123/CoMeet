import { api } from './client'
import type { Meeting, MeetingWithDetails } from '@comeet/shared'

export async function createMeeting(title?: string): Promise<Meeting> {
  const res = await api.post('/meetings', { title })
  return res.data.meeting
}

export async function listMeetings(): Promise<Meeting[]> {
  const res = await api.get('/meetings')
  return res.data.meetings
}

export async function getMeeting(id: string): Promise<MeetingWithDetails> {
  const res = await api.get(`/meetings/${id}`)
  return res.data.meeting
}

export async function updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting> {
  const res = await api.patch(`/meetings/${id}`, data)
  return res.data.meeting
}

export async function deleteMeeting(id: string): Promise<void> {
  await api.delete(`/meetings/${id}`)
}
