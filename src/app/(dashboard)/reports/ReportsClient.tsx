'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, getDaysInMonth, getMonth, getYear } from 'date-fns'
import { formatDuration, intervalToSeconds, calcTotalBreakSeconds } from '@/lib/calculations'
import Header from '@/components/ui/Header'
import type { WorkSession, BreakSession, LeaveRequest, Profile } from '@/types'
import { Download, ChevronLeft, ChevronRight, Clock, Coffee, TrendingUp, Award, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReportsClientProps {
  userId: string
  profile: Profile
}

interface SessionWithBreaks extends WorkSession {
  break_sessions: BreakSession[]
}

export default function ReportsClient({ userId, profile }: ReportsClientProps) {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sessions, setSessions] = useState<SessionWithBreaks[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthLabel = format(currentDate, 'MMMM yyyy')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: sData }, { data: lData }] = await Promise.all([
      supabase
        .from('work_sessions')
        .select('*, break_sessions(*)')
        .eq('user_id', userId)
        .gte('check_in_time', monthStart.toISOString())
        .lte('check_in_time', monthEnd.toISOString())
        .order('check_in_time', { ascending: false }),
      supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString()),
    ])
    setSessions((sData as SessionWithBreaks[]) ?? [])
    setLeaves(lData ?? [])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, monthStart.toISOString(), monthEnd.toISOString()])

  useEffect(() => { load() }, [load])

  const prevMonth = () => setCurrentDate(d => new Date(getYear(d), getMonth(d) - 1, 1))
  const nextMonth = () => setCurrentDate(d => new Date(getYear(d), getMonth(d) + 1, 1))

  // Aggregate stats
  const totalNetSec = sessions.reduce((acc, s) => acc + intervalToSeconds(s.net_time), 0)
  const totalBreakSec = sessions.reduce((acc, s) => acc + calcTotalBreakSeconds(s.break_sessions), 0)
  const totalOTSec = sessions.reduce((acc, s) => acc + intervalToSeconds(s.overtime), 0)
  const totalLeave = leaves.reduce((acc, l) => acc + l.leave_days, 0)
  const workDays = sessions.filter(s => s.check_out_time).length

  // PDF Export
  const downloadPDF = () => {
    const doc = new jsPDF()
    doc.setFont('helvetica')
    doc.setFontSize(18)
    doc.text(`Work Report — ${monthLabel}`, 14, 20)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Employee: ${profile.name}${profile.employee_id ? ` (${profile.employee_id})` : ''}`, 14, 30)
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 14, 37)

    // Summary
    doc.setFontSize(13)
    doc.setTextColor(0)
    doc.text('Monthly Summary', 14, 50)

    autoTable(doc, {
      startY: 55,
      head: [['Metric', 'Value']],
      body: [
        ['Working Days', String(workDays)],
        ['Total Net Work', formatDuration(totalNetSec)],
        ['Total Break', formatDuration(totalBreakSec)],
        ['Total Overtime', formatDuration(totalOTSec)],
        ['Leave Days', String(totalLeave)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [20, 20, 20], textColor: 255 },
      styles: { fontSize: 10 },
    })

    const afterSummary = (doc as any).lastAutoTable.finalY + 10

    // Daily breakdown
    doc.setFontSize(13)
    doc.text('Daily Breakdown', 14, afterSummary)

    const rows = sessions.map(s => {
      const breakSec = calcTotalBreakSeconds(s.break_sessions)
      return [
        format(new Date(s.check_in_time), 'EEE, MMM d'),
        format(new Date(s.check_in_time), 'hh:mm a'),
        s.check_out_time ? format(new Date(s.check_out_time), 'hh:mm a') : '—',
        formatDuration(intervalToSeconds(s.net_time)),
        formatDuration(breakSec),
        intervalToSeconds(s.overtime) > 0 ? formatDuration(intervalToSeconds(s.overtime)) : '—',
      ]
    })

    autoTable(doc, {
      startY: afterSummary + 5,
      head: [['Date', 'Check In', 'Check Out', 'Net Work', 'Break', 'Overtime']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [20, 20, 20], textColor: 255 },
      styles: { fontSize: 9 },
    })

    // Leave section
    if (leaves.length > 0) {
      const afterDaily = (doc as any).lastAutoTable.finalY + 10
      doc.setFontSize(13)
      doc.text('Leave Requests', 14, afterDaily)
      autoTable(doc, {
        startY: afterDaily + 5,
        head: [['Date', 'Days', 'Reason']],
        body: leaves.map(l => [
          format(new Date(l.created_at), 'MMM d, yyyy'),
          String(l.leave_days),
          l.reason,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [20, 20, 20], textColor: 255 },
        styles: { fontSize: 9 },
      })
    }

    doc.save(`work-report-${format(currentDate, 'yyyy-MM')}.pdf`)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header status="idle" title="Reports" />
      <div className="flex-1 p-4 sm:p-6 space-y-6 animate-fade-in">

        {/* Month Navigator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button id="btn-prev-month" onClick={prevMonth} className="btn-ghost btn-sm p-2 rounded-xl">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-bold min-w-[160px] text-center">{monthLabel}</h2>
            <button id="btn-next-month" onClick={nextMonth} className="btn-ghost btn-sm p-2 rounded-xl">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            id="btn-download-report"
            onClick={downloadPDF}
            className="btn-md btn-primary flex items-center gap-2"
            disabled={sessions.length === 0}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'rpt-days', icon: Clock, label: 'Work Days', value: String(workDays), color: 'text-white' },
            { id: 'rpt-net', icon: TrendingUp, label: 'Net Work', value: formatDuration(totalNetSec), color: 'text-accent-blue' },
            { id: 'rpt-break', icon: Coffee, label: 'Total Break', value: formatDuration(totalBreakSec), color: 'text-accent-yellow' },
            { id: 'rpt-ot', icon: Award, label: 'Overtime', value: formatDuration(totalOTSec), color: totalOTSec > 0 ? 'text-accent-green' : 'text-text-muted' },
          ].map(({ id, icon: Icon, label, value, color }) => (
            <div key={id} id={id} className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="stat-label">{label}</span>
              </div>
              <span className={`stat-value ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Leave summary */}
        {totalLeave > 0 && (
          <div className="card p-4 flex items-center gap-4 border-accent-yellow/20">
            <FileText className="w-5 h-5 text-accent-yellow shrink-0" />
            <div>
              <p className="text-sm font-semibold">{totalLeave} leave day{totalLeave !== 1 ? 's' : ''} this month</p>
              <p className="text-xs text-text-muted">{leaves.length} request{leaves.length !== 1 ? 's' : ''} submitted</p>
            </div>
          </div>
        )}

        {/* Daily Table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-semibold">Daily Breakdown</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-text-muted text-sm animate-pulse">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">No sessions found for {monthLabel}.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Date', 'Check In', 'Check Out', 'Net Work', 'Break', 'Overtime'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => {
                    const breakSec = calcTotalBreakSeconds(s.break_sessions)
                    const otSec = intervalToSeconds(s.overtime)
                    return (
                      <tr key={s.id} className={`border-b border-border/50 transition-colors hover:bg-bg-elevated ${i % 2 === 0 ? '' : 'bg-bg-surface/30'}`}>
                        <td className="px-4 py-3 font-medium">{format(new Date(s.check_in_time), 'EEE, MMM d')}</td>
                        <td className="px-4 py-3 font-mono text-accent-green">{format(new Date(s.check_in_time), 'hh:mm a')}</td>
                        <td className="px-4 py-3 font-mono text-accent-red">{s.check_out_time ? format(new Date(s.check_out_time), 'hh:mm a') : <span className="text-text-muted">—</span>}</td>
                        <td className="px-4 py-3 font-mono">{formatDuration(intervalToSeconds(s.net_time))}</td>
                        <td className="px-4 py-3 font-mono text-accent-yellow">{formatDuration(breakSec)}</td>
                        <td className={`px-4 py-3 font-mono ${otSec > 0 ? 'text-accent-green' : 'text-text-muted'}`}>
                          {otSec > 0 ? formatDuration(otSec) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
