import { describe, it, expect } from 'vitest'
import { clampResponse, validateResponse } from '../PostProcessor'

describe('PostProcessor', () => {
  describe('clampResponse', () => {
    it('returns empty string for empty input', () => {
      expect(clampResponse('')).toBe('')
    })

    it('strips markdown headers', () => {
      const result = clampResponse('## Header\nSome text here.')
      expect(result).not.toContain('##')
    })

    it('strips bold/italic markdown', () => {
      const result = clampResponse('This is **bold** and *italic* text.')
      expect(result).toContain('bold')
      expect(result).not.toContain('**')
    })

    it('removes filler phrases from the end', () => {
      const result = clampResponse('Here is the answer. I hope this helps!')
      expect(result).not.toContain('I hope this helps')
    })

    it('removes prefix labels', () => {
      const result = clampResponse('Answer: The sky is blue.')
      expect(result).not.toStartWith('Answer:')
    })

    it('limits sentences for non-code responses', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.'
      const result = clampResponse(text, 3, 100)
      const sentences = result.match(/[^.!?]+[.!?]+/g) || []
      expect(sentences.length).toBeLessThanOrEqual(3)
    })

    it('does NOT clamp responses with code blocks', () => {
      const text = 'Intro. ```\nconst x = 1;\n``` After code. More text. Even more text. Still going.'
      const result = clampResponse(text)
      expect(result).toContain('```')
    })

    it('limits word count', () => {
      const words = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ')
      const result = clampResponse(words + '.', 10, 60)
      const wordCount = result.split(/\s+/).length
      expect(wordCount).toBeLessThanOrEqual(65) // slight buffer for ellipsis
    })
  })

  describe('validateResponse', () => {
    it('passes for clean short text', () => {
      const result = validateResponse('This is a clean response.', 3, 60)
      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('flags markdown content', () => {
      const result = validateResponse('This has **bold** text.', 3, 60)
      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Contains markdown')
    })

    it('flags too many sentences', () => {
      const text = 'One. Two. Three. Four. Five.'
      const result = validateResponse(text, 3, 100)
      expect(result.valid).toBe(false)
      expect(result.issues[0]).toContain('Too many sentences')
    })

    it('flags too many words', () => {
      const text = Array.from({ length: 80 }, () => 'word').join(' ')
      const result = validateResponse(text, 10, 60)
      expect(result.valid).toBe(false)
      expect(result.issues[0]).toContain('Too many words')
    })
  })
})
