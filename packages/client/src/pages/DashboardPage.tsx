import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import * as meetingsApi from '../api/meetings'

export function DashboardPage() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    meetingsApi.listMeetings().then(m => {
      setMeetings(m)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const startMeeting = async () => {
    const meeting = await meetingsApi.createMeeting()
    navigate(`/meeting/${meeting.id}`)
  }

  const handleDelete = async (id: string) => {
    await meetingsApi.deleteMeeting(id)
    setMeetings(prev => prev.filter(m => m.id !== id))
  }

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-neutral-500 mt-1">Your meeting history</p>
          </div>
          <button
            onClick={startMeeting}
            className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span> New Meeting
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5">
            <div className="text-2xl font-bold text-white">{meetings.length}</div>
            <div className="text-sm text-neutral-500 mt-1">Total Meetings</div>
          </div>
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5">
            <div className="text-2xl font-bold text-white">{meetings.filter(m => m.status === 'active').length}</div>
            <div className="text-sm text-neutral-500 mt-1">Active</div>
          </div>
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5">
            <div className="text-2xl font-bold text-white">
              {meetings.reduce((sum: number, m: any) => sum + (m._count?.aiResponses || 0), 0)}
            </div>
            <div className="text-sm text-neutral-500 mt-1">AI Responses</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-neutral-600 py-12">Loading...</div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-16 bg-[#0a0a0a] border border-neutral-800 rounded-xl">
            <div className="text-neutral-600 mb-4">No meetings yet</div>
            <button
              onClick={startMeeting}
              className="px-4 py-2 bg-white hover:bg-neutral-200 text-black rounded-lg text-sm font-medium transition-colors"
            >
              Start your first meeting
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.map((meeting: any) => (
              <div
                key={meeting.id}
                className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 flex items-center justify-between hover:border-neutral-600 transition-colors cursor-pointer"
                onClick={() => navigate(`/meeting/${meeting.id}`)}
              >
                <div>
                  <h3 className="font-medium text-white">{meeting.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500">
                    <span>{new Date(meeting.startedAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      meeting.status === 'active'
                        ? 'bg-white/10 text-white'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}>
                      {meeting.status}
                    </span>
                    {meeting._count && (
                      <>
                        <span>{meeting._count.segments} segments</span>
                        <span>{meeting._count.aiResponses} AI responses</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(meeting.id) }}
                  className="text-neutral-700 hover:text-red-400 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
