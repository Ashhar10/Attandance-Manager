'use client'

import type { WorkStatus } from '@/types'

const statusConfig = {
  idle: {
    dot: 'bg-text-muted',
    text: 'Idle',
    className: 'badge-idle',
  },
  working: {
    dot: 'bg-accent-green animate-pulse',
    text: 'Working',
    className: 'badge-working',
  },
  on_break: {
    dot: 'bg-accent-yellow animate-pulse',
    text: 'On Break',
    className: 'badge-break',
  },
  completed: {
    dot: 'bg-accent-blue',
    text: 'Day Completed',
    className: 'badge-completed',
  },
}

export default function StatusBadge({ status }: { status: WorkStatus }) {
  const cfg = statusConfig[status]
  return (
    <span className={`badge ${cfg.className} transition-all duration-300`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.text}
    </span>
  )
}
