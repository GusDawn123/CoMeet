import { describe, it, expect } from 'vitest'
import {
  cleanTranscript,
  sparsifyTranscript,
  formatTranscriptForLLM,
  prepareTranscriptForWhatToAnswer
} from '../TranscriptCleaner'
import type { TranscriptTurn } from '../TranscriptCleaner'

describe('TranscriptCleaner', () => {
  describe('cleanTranscript', () => {
    it('removes filler words', () => {
      const turns: TranscriptTurn[] = [
        { role: 'interviewer', text: 'Um so like tell me about your experience', timestamp: 1000 }
      ]
      const cleaned = cleanTranscript(turns)
      expect(cleaned[0].text).not.toContain('um')
      expect(cleaned[0].text).not.toContain('like')
    })

    it('removes acknowledgements', () => {
      const turns: TranscriptTurn[] = [
        { role: 'user', text: 'okay yeah sure I worked on a distributed system for three years', timestamp: 1000 }
      ]
      const cleaned = cleanTranscript(turns)
      expect(cleaned[0].text).not.toMatch(/^okay/)
      expect(cleaned[0].text).not.toMatch(/^yeah/)
    })

    it('removes duplicate words', () => {
      const turns: TranscriptTurn[] = [
        { role: 'interviewer', text: 'tell tell me about about your project', timestamp: 1000 }
      ]
      const cleaned = cleanTranscript(turns)
      expect(cleaned[0].text).not.toContain('tell tell')
    })

    it('filters out non-meaningful short turns', () => {
      const turns: TranscriptTurn[] = [
        { role: 'user', text: 'ok', timestamp: 1000 },
        { role: 'interviewer', text: 'What is React?', timestamp: 2000 }
      ]
      const cleaned = cleanTranscript(turns)
      expect(cleaned).toHaveLength(1)
      expect(cleaned[0].role).toBe('interviewer')
    })

    it('keeps short interviewer turns (>= 5 chars)', () => {
      const turns: TranscriptTurn[] = [
        { role: 'interviewer', text: 'Go on.', timestamp: 1000 }
      ]
      const cleaned = cleanTranscript(turns)
      expect(cleaned).toHaveLength(1)
    })
  })

  describe('sparsifyTranscript', () => {
    it('returns all turns when under max', () => {
      const turns: TranscriptTurn[] = Array.from({ length: 5 }, (_, i) => ({
        role: 'interviewer' as const,
        text: `Question ${i}`,
        timestamp: i * 1000
      }))
      const result = sparsifyTranscript(turns, 12)
      expect(result).toHaveLength(5)
    })

    it('prioritizes recent interviewer turns', () => {
      const turns: TranscriptTurn[] = []
      for (let i = 0; i < 20; i++) {
        turns.push({
          role: i % 2 === 0 ? 'interviewer' : 'user',
          text: `Turn ${i}`,
          timestamp: i * 1000
        })
      }
      const result = sparsifyTranscript(turns, 12)
      expect(result.length).toBeLessThanOrEqual(12)
      // Should contain recent interviewer turns
      const interviewerTurns = result.filter(t => t.role === 'interviewer')
      expect(interviewerTurns.length).toBeGreaterThan(0)
    })

    it('maintains chronological order', () => {
      const turns: TranscriptTurn[] = Array.from({ length: 20 }, (_, i) => ({
        role: (i % 2 === 0 ? 'interviewer' : 'user') as 'interviewer' | 'user',
        text: `Turn ${i}`,
        timestamp: i * 1000
      }))
      const result = sparsifyTranscript(turns, 8)
      for (let i = 1; i < result.length; i++) {
        expect(result[i].timestamp).toBeGreaterThanOrEqual(result[i - 1].timestamp)
      }
    })
  })

  describe('formatTranscriptForLLM', () => {
    it('formats turns with correct labels', () => {
      const turns: TranscriptTurn[] = [
        { role: 'interviewer', text: 'What is React?', timestamp: 1000 },
        { role: 'user', text: 'React is a JavaScript library', timestamp: 2000 },
        { role: 'assistant', text: 'Generated answer', timestamp: 3000 }
      ]
      const formatted = formatTranscriptForLLM(turns)
      expect(formatted).toContain('[INTERVIEWER]: What is React?')
      expect(formatted).toContain('[ME]: React is a JavaScript library')
      expect(formatted).toContain('[ASSISTANT]: Generated answer')
    })
  })

  describe('prepareTranscriptForWhatToAnswer', () => {
    it('cleans, sparsifies, and formats in one call', () => {
      const turns: TranscriptTurn[] = [
        { role: 'interviewer', text: 'Um so like what is a hash map?', timestamp: 1000 },
        { role: 'user', text: 'ok yeah', timestamp: 2000 }
      ]
      const result = prepareTranscriptForWhatToAnswer(turns)
      expect(result).toContain('[INTERVIEWER]')
      expect(result).not.toContain('um')
    })
  })
})
