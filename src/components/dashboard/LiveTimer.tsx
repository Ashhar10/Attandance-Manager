'use client'

import { formatDuration } from '@/lib/calculations'
import type { WorkStatus } from '@/types'

interface LiveTimerProps {
  elapsedSeconds: number
  status: WorkStatus
}

export default function LiveTimer({ elapsedSeconds, status }: LiveTimerProps) {
  const time = formatDuration(elapsedSeconds)
  const [hh, mm, ss] = time.split(':')

  const colorMap = {
    working: 'text-white',
    on_break: 'text-accent-yellow',
    idle: 'text-text-muted',
    completed: 'text-accent-blue',
  }

  const glowMap = {
    working: 'drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]',
    on_break: 'drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]',
    idle: '',
    completed: 'drop-shadow-[0_0_20px_rgba(59,130,246,0.2)]',
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full overflow-hidden">
      <div className={`timer-display flex items-center justify-center gap-1 sm:gap-2 text-3xl sm:text-7xl md:text-8xl font-bold tracking-tight sm:tracking-widest transition-all duration-500 whitespace-nowrap flex-nowrap ${colorMap[status]} ${glowMap[status]}`}>
        <span>{hh}</span>
        <span className={`text-xl sm:text-5xl md:text-6xl pb-1 sm:pb-2 opacity-40 ${status === 'working' || status === 'on_break' ? 'animate-blink' : ''}`}>:</span>
        <span>{mm}</span>
        <span className={`text-xl sm:text-5xl md:text-6xl pb-1 sm:pb-2 opacity-40 ${status === 'working' || status === 'on_break' ? 'animate-blink' : ''}`}>:</span>
        <span>{ss}</span>
      </div>
      <div className="flex justify-between w-full max-w-[240px] sm:max-w-md px-1 text-[9px] sm:text-xs text-text-muted tracking-widest uppercase font-medium">
        <span className="flex-1 text-center">Hours</span>
        <span className="flex-1 text-center">Minutes</span>
        <span className="flex-1 text-center">Seconds</span>
      </div>
    </div>
  )
}
