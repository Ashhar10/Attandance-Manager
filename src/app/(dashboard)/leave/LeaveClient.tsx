'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppUrl, buildLeaveMessage } from '@/lib/whatsapp'
import Header from '@/components/ui/Header'
import type { LeaveRequest, Profile } from '@/types'
import { format, isValid, parseISO } from 'date-fns'
import { Send, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react'

// Helper: safely parse a yyyy-MM-dd string — returns null if invalid
function parseDate(str: string): Date | null {
  if (!str || str.length < 10) return null
  const d = parseISO(str)
  return isValid(d) ? d : null
}

function safeFormat(str: string, fmt: string, fallback = '—'): string {
  const d = parseDate(str)
  return d ? format(d, fmt) : fallback
}

interface LeaveClientProps {
  userId: string
  profile: Profile
  leaveHistory: LeaveRequest[]
}

export default function LeaveClient({ userId, profile, leaveHistory }: LeaveClientProps) {
  const supabase = createClient()
  // Compute tomorrow once at render-time on the client (no hydration issue since this is 'use client')
  const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd')
  const [leaveType, setLeaveType] = useState<'single' | 'range'>('single')
  const [leaveDate, setLeaveDate] = useState<string>(tomorrow)
  const [leaveEndDate, setLeaveEndDate] = useState<string>(tomorrow)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<LeaveRequest[]>(leaveHistory)

  // Calculate leaveDays — guard against partial/invalid date strings while typing
  const startDate = parseDate(leaveDate)
  const endDate = parseDate(leaveEndDate)
  const leaveDays = leaveType === 'single' || !startDate || !endDate
    ? 1
    : Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1)

  const leaveDateDisplay = leaveType === 'single'
    ? safeFormat(leaveDate, 'PPP', leaveDate)
    : `${safeFormat(leaveDate, 'PPP', leaveDate)} to ${safeFormat(leaveEndDate, 'PPP', leaveEndDate)}`

  // Get HR WhatsApp from profile or localStorage
  const hrNumber = profile.hr_whatsapp || (typeof window !== 'undefined' ? localStorage.getItem('hr_whatsapp') ?? '' : '')

  const preview = buildLeaveMessage({
    employeeName: profile.name,
    employeeId: profile.employee_id ?? undefined,
    leaveDate: leaveDateDisplay,
    leaveDays,
    reason: reason || '[Reason]',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!reason.trim()) { setError('Please provide a reason for leave.'); return }
    if (!leaveDate) { setError('Please select a date.'); return }
    if (leaveType === 'range' && new Date(leaveEndDate) < new Date(leaveDate)) {
      setError('End date cannot be before start date.'); return
    }

    setSubmitting(true)

    // Check for duplicates
    const { data: existing, error: checkErr } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('leave_date', leaveDate)
      .maybeSingle()

    if (checkErr) { setError(checkErr.message); setSubmitting(false); return }
    if (existing) { setError('You have already applied for leave starting on this date.'); setSubmitting(false); return }

    const { data, error: err } = await supabase
      .from('leave_requests')
      .insert({ 
        user_id: userId, 
        leave_date: leaveDate,
        leave_days: leaveDays, 
        reason: reason.trim() 
      })
      .select()
      .single()

    if (err) {
      if (err.code === '42703') {
        setError('Database error: The "leave_date" column is missing. Please run the SQL migration in your Supabase SQL Editor.')
      } else if (err.code === '23505') {
        setError('You have already applied for leave on this date.')
      } else {
        setError(err.message)
      }
      setSubmitting(false)
      return
    }

    if (data) setHistory(prev => [data, ...prev])

    // Open WhatsApp
    const finalMsg = buildLeaveMessage({
      employeeName: profile.name,
      employeeId: profile.employee_id ?? undefined,
      leaveDate: leaveDateDisplay,
      leaveDays,
      reason: reason.trim(),
    })
    const url = buildWhatsAppUrl(hrNumber || '0000000000', finalMsg)
    window.open(url, '_blank')

    setSubmitted(true)
    setReason('')
    setSubmitting(false)
    setTimeout(() => setSubmitted(false), 4000)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header status="idle" title="Leave Request" />
      <div className="flex-1 p-4 sm:p-6 space-y-6 animate-fade-in">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="card p-6 space-y-5">
            <div className="mb-2">
              <h2 className="font-semibold text-lg">New Leave Request</h2>
              <p className="text-sm text-text-muted">Submit your leave request via WhatsApp</p>
            </div>

            {submitted && (
              <div className="card border-accent-green/30 bg-accent-green/5 p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent-green shrink-0" />
                <p className="text-sm text-accent-green">Request submitted! WhatsApp opened with your message.</p>
              </div>
            )}

            {error && (
              <div className="card border-accent-red/30 bg-accent-red/5 p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-accent-red shrink-0" />
                <p className="text-sm text-accent-red">{error}</p>
              </div>
            )}

            {!hrNumber && (
              <div className="card border-accent-yellow/30 bg-accent-yellow/5 p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-accent-yellow shrink-0" />
                <p className="text-sm text-accent-yellow">
                  Set the HR WhatsApp number in <a href="/settings" className="underline font-semibold">Settings</a> first.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} id="leave-form" className="space-y-4">

              {/* Leave Type Toggle */}
              <div>
                <label className="label">Leave Duration</label>
                <div className="flex bg-bg-surface p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => { setLeaveType('single'); setLeaveEndDate(leaveDate) }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      leaveType === 'single' ? 'bg-bg-elevated text-white shadow-sm' : 'text-text-muted hover:text-white'
                    }`}
                  >
                    Single Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveType('range')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                      leaveType === 'range' ? 'bg-bg-elevated text-white shadow-sm' : 'text-text-muted hover:text-white'
                    }`}
                  >
                    Multiple Days
                  </button>
                </div>
              </div>

              {/* Date Fields */}
              {leaveType === 'single' ? (
                <div>
                  <label className="label" htmlFor="leave-date">Date</label>
                  <input
                    id="leave-date"
                    type="date"
                    value={leaveDate}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={e => setLeaveDate(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="leave-date-from">From</label>
                    <input
                      id="leave-date-from"
                      type="date"
                      value={leaveDate}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={e => {
                        setLeaveDate(e.target.value)
                        if (e.target.value > leaveEndDate) setLeaveEndDate(e.target.value)
                      }}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="leave-date-to">To</label>
                    <input
                      id="leave-date-to"
                      type="date"
                      value={leaveEndDate}
                      min={leaveDate}
                      onChange={e => setLeaveEndDate(e.target.value)}
                      className="input"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-text-muted bg-bg-surface border border-border rounded-xl px-3 py-2">
                      📅 <span className="font-semibold text-white">{leaveDays} day{leaveDays !== 1 ? 's' : ''}</span> of leave selected
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="label" htmlFor="leave-reason">Reason for Leave</label>
                <textarea
                  id="leave-reason"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="input resize-none"
                  rows={4}
                  placeholder="Please describe your reason for leave..."
                  required
                />
              </div>
              <button
                id="btn-submit-leave"
                type="submit"
                disabled={submitting}
                className="btn-md btn-primary w-full"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit & Open WhatsApp'}
                <ExternalLink className="w-3.5 h-3.5 opacity-50" />
              </button>
            </form>
          </div>

          {/* Preview + History */}
          <div className="space-y-6">
            {/* Message Preview */}
            <div className="card p-6">
              <h3 className="font-semibold mb-3 text-sm text-text-secondary uppercase tracking-widest">Message Preview</h3>
              <pre id="leave-preview" className="text-sm text-text-secondary whitespace-pre-wrap font-sans leading-relaxed bg-bg-surface rounded-xl p-4 border border-border">
                {preview}
              </pre>
            </div>

            {/* Leave History */}
            {history.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-semibold">Leave History</h3>
                </div>
                <div className="divide-y divide-border">
                  {history.map(l => (
                    <div key={l.id} className="px-5 py-3 flex items-start gap-3">
                      <Clock className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{l.leave_days} day{l.leave_days !== 1 ? 's' : ''}</p>
                          <p className="text-xs text-text-muted shrink-0">{format(new Date(l.created_at), 'MMM d, yyyy')}</p>
                        </div>
                        <p className="text-xs text-text-muted truncate mt-0.5">{l.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
