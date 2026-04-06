'use client'

import { formatDuration, formatDurationHuman, calcWorkMetrics, calcTotalBreakSeconds, STANDARD_WORK_SECONDS } from '@/lib/calculations'
import type { WorkSession, BreakSession } from '@/types'
import { format } from 'date-fns'
import { Clock, Coffee, TrendingUp, Award, LogIn, LogOut } from 'lucide-react'

interface SummaryCardsProps {
  session: WorkSession | null
  breaks: BreakSession[]
  elapsedWork: number
  elapsedBreak: number
}

export default function SummaryCards({ session, breaks, elapsedWork, elapsedBreak }: SummaryCardsProps) {
  if (!session) return null

  const totalBreakSec = calcTotalBreakSeconds(breaks)
  const { netWorkSeconds, overtimeSeconds } = calcWorkMetrics(
    session.check_in_time,
    session.check_out_time,
    totalBreakSec
  )

  const netPct = Math.min(100, (netWorkSeconds / STANDARD_WORK_SECONDS) * 100)

  const cards = [
    {
      id: 'card-checkin',
      icon: LogIn,
      label: 'Check In',
      value: format(new Date(session.check_in_time), 'hh:mm a'),
      color: 'text-accent-green',
    },
    {
      id: 'card-checkout',
      icon: LogOut,
      label: 'Check Out',
      value: session.check_out_time ? format(new Date(session.check_out_time), 'hh:mm a') : '—',
      color: 'text-accent-red',
    },
    {
      id: 'card-total',
      icon: Clock,
      label: 'Total Time',
      value: formatDuration(elapsedWork),
      color: 'text-white',
    },
    {
      id: 'card-break',
      icon: Coffee,
      label: 'Break Time',
      value: formatDuration(elapsedBreak),
      color: 'text-accent-yellow',
    },
    {
      id: 'card-net',
      icon: TrendingUp,
      label: 'Net Work',
      value: formatDuration(netWorkSeconds),
      color: 'text-accent-blue',
      extra: (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>{Math.round(netPct)}% of 9h</span>
            <span>{formatDurationHuman(STANDARD_WORK_SECONDS - netWorkSeconds > 0 ? STANDARD_WORK_SECONDS - netWorkSeconds : 0)} left</span>
          </div>
          <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-blue rounded-full transition-all duration-1000"
              style={{ width: `${netPct}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'card-overtime',
      icon: Award,
      label: 'Overtime',
      value: formatDuration(overtimeSeconds),
      color: overtimeSeconds > 0 ? 'text-accent-green' : 'text-text-muted',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map(({ id, icon: Icon, label, value, color, extra }) => (
        <div key={id} id={id} className="stat-card animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="stat-label">{label}</span>
          </div>
          <span className={`stat-value ${color}`}>{value}</span>
          {extra}
        </div>
      ))}
    </div>
  )
}
