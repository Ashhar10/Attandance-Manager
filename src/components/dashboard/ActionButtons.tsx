'use client'

import type { WorkStatus } from '@/types'
import { Play, Square, Coffee, StopCircle } from 'lucide-react'

interface ActionButtonsProps {
  status: WorkStatus
  loading?: boolean
  elapsedWork: number
  hasActiveUnfinishedSession: boolean
  lastSessionCheckIn: string | null
  onStartWork: () => void
  onEndWork: () => void
  onStartBreak: () => void
  onEndBreak: () => void
}

export default function ActionButtons({
  status, loading, elapsedWork,
  hasActiveUnfinishedSession, lastSessionCheckIn,
  onStartWork, onEndWork, onStartBreak, onEndBreak,
}: ActionButtonsProps) {
  
  const canStartWork = !hasActiveUnfinishedSession && (!lastSessionCheckIn || (Date.now() - new Date(lastSessionCheckIn).getTime()) >= 9 * 3600 * 1000)

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {/* Start Work */}
      <button
        id="btn-start-work"
        className="btn-lg btn-success"
        onClick={onStartWork}
        disabled={loading || !canStartWork}
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
