import { describe, it, expect } from 'vitest'
import { classifyIntent, getAnswerShapeGuidance } from '../IntentClassifier'

describe('IntentClassifier', () => {
  describe('Tier 1: Regex fast-path', () => {
    it('detects coding intent from algorithm keywords', async () => {
      const result = await classifyIntent('implement a binary search algorithm', '', 0)
      expect(result.intent).toBe('coding')
      expect(result.confidence).toBeGreaterThanOrEqual(0.85)
    })

    it('detects coding intent from LeetCode keywords', async () => {
      const result = await classifyIntent('solve the two sum problem using a hash map', '', 0)
      expect(result.intent).toBe('coding')
    })

    it('detects coding intent from system design keywords', async () => {
      const result = await classifyIntent('design a distributed load balancer', '', 0)
      expect(result.intent).toBe('coding')
    })

    it('detects behavioral intent', async () => {
      const result = await classifyIntent('tell me about a time you faced a difficult teammate', '', 0)
      expect(result.intent).toBe('behavioral')
      expect(result.confidence).toBe(0.9)
    })

    it('detects clarification intent', async () => {
      const result = await classifyIntent('can you explain what you mean by that?', '', 0)
      expect(result.intent).toBe('clarification')
    })

    it('detects follow-up intent', async () => {
      const result = await classifyIntent('what happened after that?', '', 0)
      expect(result.intent).toBe('follow_up')
    })

    it('detects deep dive intent', async () => {
      const result = await classifyIntent('tell me more about how that works', '', 0)
      expect(result.intent).toBe('deep_dive')
    })

    it('detects example request intent', async () => {
      const result = await classifyIntent('can you give me a concrete example?', '', 0)
      expect(result.intent).toBe('example_request')
    })

    it('detects summary probe intent', async () => {
      const result = await classifyIntent("so to summarize, you're saying the cache is stale?", '', 0)
      expect(result.intent).toBe('summary_probe')
    })

    it('detects conceptual questions as deep_dive', async () => {
      const result = await classifyIntent('what is the difference between TCP and UDP?', '', 0)
      expect(result.intent).toBe('deep_dive')
    })
  })

  describe('Tier 3: Context heuristic fallback', () => {
    it('returns follow_up for short interviewer turns when multiple assistant messages exist', async () => {
      const transcript = '[INTERVIEWER]: Interesting.\n[ASSISTANT]: Previous answer.'
      const result = await classifyIntent(null, transcript, 3)
      expect(result.intent).toBe('follow_up')
      expect(result.confidence).toBe(0.7)
    })

    it('returns general for unknown patterns', async () => {
      const result = await classifyIntent('blah blah random', '', 0)
      expect(result.intent).toBe('general')
    })
  })

  describe('Performance', () => {
    it('classifies in under 5ms (regex path)', async () => {
      const start = performance.now()
      for (let i = 0; i < 100; i++) {
        await classifyIntent('implement a binary search tree', '', 0)
      }
      const elapsed = performance.now() - start
      const perCall = elapsed / 100
      expect(perCall).toBeLessThan(5) // <5ms per call
    })
  })

  describe('getAnswerShapeGuidance', () => {
    it('returns guidance for coding intent', () => {
      const guidance = getAnswerShapeGuidance('coding')
      expect(guidance).toContain('code')
    })

    it('returns guidance for behavioral intent', () => {
      const guidance = getAnswerShapeGuidance('behavioral')
      expect(guidance).toContain('STAR')
    })
  })
})
