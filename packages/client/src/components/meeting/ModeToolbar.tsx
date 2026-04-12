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
    <div className="h-11 border-b border-neutral-800/50 flex items-center gap-1.5 px-5 shrink-0 overflow-x-auto bg-neutral-950/50">
      {MODES.map(({ mode, label, shortcut }) => (
        <button
          key={mode}
          onClick={() => onTrigger(mode)}
          disabled={!!activeMode}
          className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
            activeMode === mode
              ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30'
              : activeMode
                ? 'bg-transparent text-neutral-700 cursor-not-allowed'
                : 'bg-neutral-800/40 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
          }`}
        >
          {label}
          <span className="ml-1 text-neutral-600 text-[9px] font-mono">{shortcut}</span>
        </button>
      ))}

      {activeMode && (
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md text-[11px] font-medium transition-colors ml-auto"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
