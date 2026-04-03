const FILLER_PHRASES = [
  'I hope this helps', 'Let me know if you', 'Feel free to',
  'Does that make sense', 'Is there anything else', 'Hope that answers',
  'Let me know if you have', "I'd be happy to"
]

const PREFIXES = [
  'Refined (rephrase):', 'Refined (expand):', 'Refined answer:',
  'Refined:', 'Answer:', 'Response:', 'Suggestion:',
  'Here is the answer:', 'Here is the refined answer:'
]

export function clampResponse(text: string, maxSentences: number = 3, maxWords: number = 60): string {
  if (!text || typeof text !== 'string') return ''

  let result = text.trim()
  result = stripMarkdown(result)
  result = stripPrefixes(result)
  result = stripFillerPhrases(result)

  const hasCodeBlocks = /```/.test(result)
  if (!hasCodeBlocks) {
    result = limitSentences(result, maxSentences)
    result = limitWords(result, maxWords)
  }

  return result.trim()
}

function stripMarkdown(text: string): string {
  const codeBlocks: string[] = []
  let result = text

  result = result.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })

  result = result.replace(/^#{1,6}\s+/gm, '')
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1')
  result = result.replace(/__([^_]+)__/g, '$1')
  result = result.replace(/\*([^*]+)\*/g, '$1')
  result = result.replace(/_([^_]+)_/g, '$1')
  result = result.replace(/`([^`]+)`/g, '$1')
  result = result.replace(/^[\s]*[-*•]\s+/gm, '')
  result = result.replace(/^[\s]*\d+\.\s+/gm, '')
  result = result.replace(/^>\s+/gm, '')
  result = result.replace(/^[-*_]{3,}$/gm, '')
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  result = result.replace(/\n+/g, ' ')
  result = result.replace(/\s+/g, ' ')

  codeBlocks.forEach((block, index) => {
    result = result.replace(`__CODE_BLOCK_${index}__`, `\n${block}\n`)
  })

  return result.trim()
}

function stripFillerPhrases(text: string): string {
  let result = text
  for (const phrase of FILLER_PHRASES) {
    const regex = new RegExp(`[.!?]?\\s*${phrase}[^.!?]*[.!?]?\\s*$`, 'i')
    result = result.replace(regex, '.')
  }
  result = result.replace(/\.+$/, '.')
  result = result.replace(/\s+\.$/, '.')
  return result.trim()
}

function limitSentences(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  if (sentences.length <= maxSentences) return text
  return sentences.slice(0, maxSentences).join(' ').trim()
}

function limitWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/)
  if (words.length <= maxWords) return text
  let result = words.slice(0, maxWords).join(' ')
  const lastPunctuation = result.search(/[.!?][^.!?]*$/)
  if (lastPunctuation > result.length * 0.6) {
    result = result.substring(0, lastPunctuation + 1)
  } else {
    result = result.replace(/[,;:]?\s*$/, '...')
  }
  return result.trim()
}

function stripPrefixes(text: string): string {
  let result = text
  for (const prefix of PREFIXES) {
    if (result.toLowerCase().startsWith(prefix.toLowerCase())) {
      result = result.substring(prefix.length).trim()
    }
  }
  result = result.replace(/^Refined \([^)]+\):\s*/i, '')
  return result.trim()
}

export function validateResponse(text: string, maxSentences = 3, maxWords = 60) {
  const issues: string[] = []
  if (/[#*_`]/.test(text)) issues.push('Contains markdown')
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  if (sentences.length > maxSentences) issues.push(`Too many sentences (${sentences.length}/${maxSentences})`)
  const words = text.split(/\s+/)
  if (words.length > maxWords) issues.push(`Too many words (${words.length}/${maxWords})`)
  return { valid: issues.length === 0, issues }
}
