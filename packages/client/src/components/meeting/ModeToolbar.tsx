import { useMeetingStore } from '../../store/meetingStore'
import type { AIMode } from '@comeet/shared'

const MODES: { mode: AIMode; label: string; shortcut: string }[] = [
  { mode: 'what_to_say', label: 'Solve', shortcut: 'S' },
  { mode: 'clarify', label: 'Clarify', shortcut: 'C' },
  { mode: 'code_hint', label: 'Hint', shortcut: 'H' },
  { mode: 'brainstorm', label: 'Brainstorm', shortcut: 'B' },
  { mode: 'recap', label: 'Recap', shortcut: 'R' },
  { mode: 'follow_up', label: 'Follow Up', shortcut: 'F' },
  { mode: 'follow_up_questions', label: 'Questions', shortcut: 'Q' }
]

interface ModeToolbarProps {
  onTrigger: (mode: AIMode) => void
  onCancel: () => void
}

export function ModeToolbar({ onTrigger, onCancel }: ModeToolbarProps) {
  const activeMode = useMeetingStore(s => s.activeMode)

  return (
    <div className="h-12 border-b border-neutral-800 flex items-center gap-2 px-6 shrink-0 overflow-x-auto">
      {MODES.map(({ mode, label, shortcut }) => (
        <button
          key={mode}
          onClick={() => onTrigger(mode)}
          disabled={!!activeMode}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeMode === mode
              ? 'bg-white text-black'
              : activeMode
                ? 'bg-neutral-900 text-neutral-700 cursor-not-allowed'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
          }`}
        >
          {label}
          <span className="ml-1.5 text-neutral-600 text-[10px]">{shortcut}</span>
        </button>
      ))}

      {activeMode && (
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-colors ml-auto"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
