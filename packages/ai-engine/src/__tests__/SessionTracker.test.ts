import { describe, it, expect, beforeEach } from 'vitest'
import { SessionTracker } from '../SessionTracker'

describe('SessionTracker', () => {
  let tracker: SessionTracker

  beforeEach(() => {
    tracker = new SessionTracker()
  })

  describe('handleTranscript', () => {
    it('adds final transcript segments to context', () => {
      const result = tracker.handleTranscript({
        role: 'interviewer',
        text: 'What is your experience with React?',
        timestamp: Date.now(),
        isFinal: true
      })
      expect(result).not.toBeNull()
      expect(result!.role).toBe('interviewer')
    })

    it('skips interim interviewer segments', () => {
      const result = tracker.handleTranscript({
        role: 'interviewer',
        text: 'What is...',
        timestamp: Date.now(),
        isFinal: false
      })
      expect(result).toBeNull()
    })

    it('deduplicates identical text within 1 second', () => {
      const now = Date.now()
      tracker.handleTranscript({
        role: 'interviewer',
        text: 'Hello world',
        timestamp: now,
        isFinal: true
      })
      const result = tracker.handleTranscript({
        role: 'interviewer',
        text: 'Hello world',
        timestamp: now + 500,
        isFinal: true
      })
      expect(result).toBeNull()
    })

    it('allows same text after 1 second gap', () => {
      const now = Date.now()
      tracker.handleTranscript({
        role: 'interviewer',
        text: 'Hello world',
        timestamp: now,
        isFinal: true
      })
      const result = tracker.handleTranscript({
        role: 'interviewer',
        text: 'Hello world',
        timestamp: now + 2000,
        isFinal: true
      })
      expect(result).not.toBeNull()
    })

    it('skips very short non-interviewer segments', () => {
      const result = tracker.handleTranscript({
        role: 'user',
        text: 'ok',
        timestamp: Date.now(),
        isFinal: true
      })
      expect(result).toBeNull()
    })

    it('auto-detects coding questions from interviewer', () => {
      tracker.handleTranscript({
        role: 'interviewer',
        text: 'Can you implement a binary search algorithm for me?',
        timestamp: Date.now(),
        isFinal: true
      })
      const detected = tracker.getDetectedCodingQuestion()
      expect(detected.question).toContain('binary search')
      expect(detected.source).toBe('transcript')
    })
  })

  describe('assistant response tracking', () => {
    it('stores and retrieves assistant messages', () => {
      tracker.addAssistantMessage('This is my response about React hooks.')
      expect(tracker.getLastAssistantMessage()).toBe('This is my response about React hooks.')
    })

    it('limits history to 10 entries', () => {
      for (let i = 0; i < 15; i++) {
        tracker.addAssistantMessage(`Response ${i}`)
      }
      expect(tracker.getAssistantResponseHistory()).toHaveLength(10)
    })
  })

  describe('context retrieval', () => {
    it('returns formatted context with correct labels', () => {
      tracker.handleTranscript({
        role: 'interviewer',
        text: 'What is Docker?',
        timestamp: Date.now(),
        isFinal: true
      })
      const context = tracker.getFormattedContext()
      expect(context).toContain('[INTERVIEWER]: What is Docker?')
    })

    it('returns empty string when no context', () => {
      expect(tracker.getFormattedContext()).toBe('')
    })

    it('filters by time window', () => {
      tracker.handleTranscript({
        role: 'interviewer',
        text: 'Old question',
        timestamp: Date.now() - 300_000, // 5 min ago
        isFinal: true
      })
      tracker.handleTranscript({
        role: 'interviewer',
        text: 'Recent question',
        timestamp: Date.now(),
        isFinal: true
      })
      const context = tracker.getContext(120) // last 2 min
      expect(context).toHaveLength(1)
      expect(context[0].text).toBe('Recent question')
    })
  })

  describe('getLastInterviewerTurn', () => {
    it('returns the most recent interviewer turn', () => {
      tracker.handleTranscript({
        role: 'interviewer', text: 'First question', timestamp: Date.now(), isFinal: true
      })
      tracker.handleTranscript({
        role: 'user', text: 'My answer is detailed enough', timestamp: Date.now(), isFinal: true
      })
      tracker.handleTranscript({
        role: 'interviewer', text: 'Second question', timestamp: Date.now(), isFinal: true
      })
      expect(tracker.getLastInterviewerTurn()).toBe('Second question')
    })

    it('returns null when no interviewer turns', () => {
      expect(tracker.getLastInterviewerTurn()).toBeNull()
    })
  })

  describe('reset', () => {
    it('clears all state', () => {
      tracker.handleTranscript({
        role: 'interviewer', text: 'Question', timestamp: Date.now(), isFinal: true
      })
      tracker.addAssistantMessage('Answer')
      tracker.reset()
      expect(tracker.getFormattedContext()).toBe('')
      expect(tracker.getLastAssistantMessage()).toBeNull()
      expect(tracker.getDetectedCodingQuestion().question).toBeNull()
    })
  })
})
