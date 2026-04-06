'use client'

import { format } from 'date-fns'
import StatusBadge from '@/components/dashboard/StatusBadge'
import type { WorkStatus } from '@/types'
import { Bell } from 'lucide-react'

interface HeaderProps {
  status: WorkStatus
  title: string
}

export default function Header({ status, title }: HeaderProps) {
  const now = new Date()
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border bg-bg-surface/80 backdrop-blur-md sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        <p className="text-xs text-text-muted mt-0.5">
          {format(now, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={status} />
        <button
          id="btn-notifications"
          className="btn-ghost btn-sm p-2 rounded-xl"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
