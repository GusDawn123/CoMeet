import { describe, it, expect } from 'vitest'
import { buildTemporalContext, formatTemporalContextForPrompt } from '../TemporalContextBuilder'
import type { ContextItem, AssistantResponse } from '../TemporalContextBuilder'

describe('TemporalContextBuilder', () => {
  const now = Date.now()

  describe('buildTemporalContext', () => {
    it('filters items within the time window', () => {
      const items: ContextItem[] = [
        { role: 'interviewer', text: 'Old question', timestamp: now - 300_000 },
        { role: 'interviewer', text: 'Recent question', timestamp: now - 10_000 }
      ]
      const result = buildTemporalContext(items, [], 180)
      expect(result.recentTranscript).toContain('Recent question')
      expect(result.recentTranscript).not.toContain('Old question')
    })

    it('formats transcript with correct labels', () => {
      const items: ContextItem[] = [
        { role: 'interviewer', text: 'What is React?', timestamp: now },
        { role: 'user', text: 'A library', timestamp: now },
        { role: 'assistant', text: 'Previous answer', timestamp: now }
      ]
      const result = buildTemporalContext(items, [], 180)
      expect(result.recentTranscript).toContain('[INTERVIEWER')
      expect(result.recentTranscript).toContain('[ME]')
      expect(result.recentTranscript).toContain('[ASSISTANT')
    })

    it('truncates previous responses to 200 chars', () => {
      const longText = 'a'.repeat(300)
      const history: AssistantResponse[] = [
        { text: longText, timestamp: now, questionContext: '' }
      ]
      const result = buildTemporalContext([], history, 180)
      expect(result.previousResponses[0].length).toBeLessThanOrEqual(203) // 200 + '...'
    })

    it('limits to last 3 responses', () => {
      const history: AssistantResponse[] = Array.from({ length: 5 }, (_, i) => ({
        text: `Response ${i}`, timestamp: now, questionContext: ''
      }))
      const result = buildTemporalContext([], history, 180)
      expect(result.previousResponses).toHaveLength(3)
    })

    it('detects responding_to_interviewer role context', () => {
      const items: ContextItem[] = [
        { role: 'interviewer', text: 'Tell me about yourself', timestamp: now }
      ]
      const result = buildTemporalContext(items, [], 180)
      expect(result.roleContext).toBe('responding_to_interviewer')
    })

    it('detects technical tone signals', () => {
      const history: AssistantResponse[] = [
        { text: 'I would implement the API using async await patterns with a database module', timestamp: now, questionContext: '' }
      ]
      const result = buildTemporalContext([], history, 180)
      expect(result.toneSignals.some(s => s.type === 'technical')).toBe(true)
    })
  })

  describe('formatTemporalContextForPrompt', () => {
    it('includes previous responses block', () => {
      const ctx = buildTemporalContext([], [
        { text: 'Previous answer', timestamp: now, questionContext: '' }
      ], 180)
      const formatted = formatTemporalContextForPrompt(ctx)
      expect(formatted).toContain('<previous_responses_to_avoid_repeating>')
      expect(formatted).toContain('Previous answer')
    })

    it('includes tone guidance', () => {
      const ctx = buildTemporalContext([], [
        { text: 'I implement the architecture using async API with database algorithm and function component module', timestamp: now, questionContext: '' }
      ], 180)
      const formatted = formatTemporalContextForPrompt(ctx)
      expect(formatted).toContain('<tone_guidance>')
    })

    it('includes role context', () => {
      const items: ContextItem[] = [
        { role: 'interviewer', text: 'Question', timestamp: now }
      ]
      const ctx = buildTemporalContext(items, [], 180)
      const formatted = formatTemporalContextForPrompt(ctx)
      expect(formatted).toContain('<role_context>')
    })

    it('returns empty string when no context', () => {
      const ctx = buildTemporalContext([], [], 180)
      const formatted = formatTemporalContextForPrompt(ctx)
      expect(formatted).toBe('')
    })
  })
})
