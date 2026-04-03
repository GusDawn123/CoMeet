export interface TranscriptTurn {
  role: 'interviewer' | 'user' | 'assistant'
  text: string
  timestamp: number
}

const FILLER_WORDS = new Set([
  'uh', 'um', 'ah', 'hmm', 'hm', 'er', 'erm',
  'like', 'you know', 'i mean', 'basically', 'actually',
  'so', 'well', 'anyway', 'anyways'
])

const ACKNOWLEDGEMENTS = new Set([
  'okay', 'ok', 'yeah', 'yes', 'right', 'sure', 'got it',
  'gotcha', 'uh-huh', 'uh huh', 'mm-hmm', 'mm hmm', 'mhm',
  'cool', 'great', 'nice', 'perfect', 'alright', 'all right'
])

function cleanText(text: string): string {
  let result = text.toLowerCase().trim()
  result = result.replace(/\b(\w+)(\s+\1)+\b/gi, '$1')
  const words = result.split(/\s+/)
  const cleaned = words.filter(word => {
    const normalized = word.replace(/[.,!?;:]/g, '')
    return !FILLER_WORDS.has(normalized) && !ACKNOWLEDGEMENTS.has(normalized)
  })
  result = cleaned.join(' ').trim()
  result = result.replace(/\s+([.,!?;:])/g, '$1')
  result = result.replace(/([.,!?;:])+/g, '$1')
  result = result.replace(/\s+/g, ' ')
  return result
}

function isMeaningfulTurn(turn: TranscriptTurn, cleanedText: string): boolean {
  if (turn.role === 'interviewer' && cleanedText.length >= 5) return true
  const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length
  if (wordCount < 3) return false
  if (cleanedText.length < 10) return false
  return true
}

export function cleanTranscript(turns: TranscriptTurn[]): TranscriptTurn[] {
  const cleaned: TranscriptTurn[] = []
  for (const turn of turns) {
    const cleanedText = cleanText(turn.text)
    if (isMeaningfulTurn(turn, cleanedText)) {
      cleaned.push({ role: turn.role, text: cleanedText, timestamp: turn.timestamp })
    }
  }
  return cleaned
}

export function sparsifyTranscript(turns: TranscriptTurn[], maxTurns: number = 12): TranscriptTurn[] {
  if (turns.length <= maxTurns) return turns
  const interviewerTurns = turns.filter(t => t.role === 'interviewer')
  const otherTurns = turns.filter(t => t.role !== 'interviewer')
  const recentInterviewer = interviewerTurns.slice(-6)
  const remainingSlots = maxTurns - recentInterviewer.length
  const recentOther = otherTurns.slice(-remainingSlots)
  const result = [...recentInterviewer, ...recentOther]
  result.sort((a, b) => a.timestamp - b.timestamp)
  return result
}

export function formatTranscriptForLLM(turns: TranscriptTurn[]): string {
  return turns.map(turn => {
    const label = turn.role === 'interviewer' ? 'INTERVIEWER'
      : turn.role === 'user' ? 'ME' : 'ASSISTANT'
    return `[${label}]: ${turn.text}`
  }).join('\n')
}

export function prepareTranscriptForWhatToAnswer(turns: TranscriptTurn[], maxTurns: number = 12): string {
  const cleaned = cleanTranscript(turns)
  const sparsified = sparsifyTranscript(cleaned, maxTurns)
  return formatTranscriptForLLM(sparsified)
}
