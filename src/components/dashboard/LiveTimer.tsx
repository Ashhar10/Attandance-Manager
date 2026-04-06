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
    <div className="flex flex-col items-center gap-2">
      <div className={`timer-display text-6xl sm:text-7xl md:text-8xl font-bold tracking-widest transition-colors duration-500 ${colorMap[status]} ${glowMap[status]}`}>
        <span>{hh}</span>
        <span className={status === 'working' || status === 'on_break' ? 'animate-blink' : ''}> : </span>
        <span>{mm}</span>
        <span className={status === 'working' || status === 'on_break' ? 'animate-blink' : ''}> : </span>
        <span>{ss}</span>
      </div>
      <div className="flex gap-3 text-xs text-text-muted tracking-widest uppercase font-medium">
        <span className="w-16 text-center">Hours</span>
        <span className="w-4 text-center"></span>
        <span className="w-16 text-center">Minutes</span>
        <span className="w-4 text-center"></span>
        <span className="w-16 text-center">Seconds</span>
      </div>
    </div>
  )
}
