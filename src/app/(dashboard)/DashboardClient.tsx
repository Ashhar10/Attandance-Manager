'use client'

import { useWorkSession } from '@/hooks/useWorkSession'
import LiveTimer from '@/components/dashboard/LiveTimer'
import StatusBadge from '@/components/dashboard/StatusBadge'
import ActionButtons from '@/components/dashboard/ActionButtons'
import SummaryCards from '@/components/dashboard/SummaryCards'
import Header from '@/components/ui/Header'
import { formatDuration, calcTotalBreakSeconds } from '@/lib/calculations'
import { format } from 'date-fns'
import type { Profile } from '@/types'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface DashboardClientProps {
  userId: string
  profile: Profile
}

export default function DashboardClient({ userId, profile }: DashboardClientProps) {
  const {
    session, breaks, activeBreak, status,
    elapsedWork, elapsedBreak,
    loading, error,
    startWork, endWork, startBreak, endBreak,
    reload,
  } = useWorkSession(userId)

  const totalBreakText = formatDuration(calcTotalBreakSeconds(breaks))

  return (
    <div className="flex flex-col min-h-screen">
      <Header status={status} title="Dashboard" />

      <div className="flex-1 p-4 sm:p-6 space-y-6 animate-fade-in">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 suppressHydrationWarning className="text-lg sm:text-xl font-semibold whitespace-nowrap truncate max-w-[200px] sm:max-w-none">Good {getGreeting()}, {profile.name.split(' ')[0]} 👋</h2>
            <p suppressHydrationWarning className="text-[10px] sm:text-sm text-text-muted mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <button
            id="btn-refresh"
            onClick={reload}
            className="btn-ghost btn-sm p-2 rounded-xl"
            aria-label="Refresh session"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div id="error-banner" className="card border-accent-red/30 bg-accent-red/5 p-4 flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-accent-red shrink-0" />
            <p className="text-sm text-accent-red">{error}</p>
          </div>
        )}

        {/* Timer Hero Card */}
        <div
          className={`card p-8 flex flex-col items-center gap-6 transition-all duration-500
            ${status === 'working' ? 'border-accent-green/20' : ''}
            ${status === 'on_break' ? 'border-accent-yellow/20' : ''}
          `}
        >
          {/* Status badge */}
          <StatusBadge status={status} />

          {/* Big Timer */}
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="timer-display text-6xl sm:text-8xl font-bold text-text-muted animate-pulse tracking-widest">
                --:--:--
              </div>
            </div>
          ) : (
            <LiveTimer
              elapsedSeconds={status === 'on_break' ? elapsedBreak : elapsedWork}
              status={status}
            />
          )}

          {/* Break sub-timer */}
          {(status === 'on_break' || (breaks.length > 0)) && (
            <div className="text-center">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-1">
                {status === 'on_break' ? 'Current Break' : 'Total Break Time'}
              </p>
              <p className="font-mono text-accent-yellow text-lg font-semibold">
                {totalBreakText}
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="w-full border-t border-border" />

          {/* Action Buttons */}
          <ActionButtons
            status={status}
            loading={loading}
            onStartWork={startWork}
            onEndWork={endWork}
            onStartBreak={startBreak}
            onEndBreak={endBreak}
          />
        </div>

        {/* Summary Cards */}
        {session && (
          <div className="animate-slide-up">
            <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-widest">Today&apos;s Summary</h3>
            <SummaryCards
              session={session}
              breaks={breaks}
              elapsedWork={elapsedWork}
              elapsedBreak={elapsedBreak}
            />
          </div>
        )}

        {/* Idle Hint */}
        {status === 'idle' && !loading && (
          <div className="card p-6 text-center animate-fade-in">
            <p className="text-text-muted text-sm">No active session for today.</p>
            <p className="text-text-muted text-xs mt-1">Click <strong className="text-white">Start Work</strong> to begin tracking.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
