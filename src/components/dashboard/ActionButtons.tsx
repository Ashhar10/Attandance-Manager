'use client'

import type { WorkStatus } from '@/types'
import { Play, Square, Coffee, StopCircle } from 'lucide-react'

interface ActionButtonsProps {
  status: WorkStatus
  loading?: boolean
  elapsedWork: number
  onStartWork: () => void
  onEndWork: () => void
  onStartBreak: () => void
  onEndBreak: () => void
}

export default function ActionButtons({
  status, loading, elapsedWork,
  onStartWork, onEndWork, onStartBreak, onEndBreak,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {/* Start Work */}
      <button
        id="btn-start-work"
        className="btn-lg btn-success"
        onClick={onStartWork}
        disabled={loading || (status !== 'idle' && !(status === 'completed' && elapsedWork >= 9 * 3600))}
        aria-label="Start Work"
      >
        <Play className="w-5 h-5" />
        Start Work
      </button>

      {/* Start Break */}
      <button
        id="btn-start-break"
        className="btn-lg btn-warning"
        onClick={onStartBreak}
        disabled={loading || status !== 'working'}
        aria-label="Start Break"
      >
        <Coffee className="w-5 h-5" />
        Start Break
      </button>

      {/* End Break */}
      <button
        id="btn-end-break"
        className="btn-lg btn-ghost"
        onClick={onEndBreak}
        disabled={loading || status !== 'on_break'}
        aria-label="End Break"
      >
        <StopCircle className="w-5 h-5 text-accent-yellow" />
        End Break
      </button>

      {/* End Work */}
      <button
        id="btn-end-work"
        className="btn-lg btn-danger"
        onClick={onEndWork}
        disabled={loading || (status !== 'working' && status !== 'on_break')}
        aria-label="End Work"
      >
        <Square className="w-5 h-5" />
        End Work
      </button>
    </div>
  )
}
