'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, getMonth, getYear } from 'date-fns'
import { formatDuration, intervalToSeconds, calcTotalBreakSeconds } from '@/lib/calculations'
import Header from '@/components/ui/Header'
import type { WorkSession, BreakSession, LeaveRequest, Profile, CompanyHoliday } from '@/types'
import { Download, Clock, Coffee, TrendingUp, Award } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import CalendarView from '@/components/dashboard/CalendarView'

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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [sessions, setSessions] = useState<SessionWithBreaks[]>([])
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([])
  const [loading, setLoading] = useState(true)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthLabel = format(currentDate, 'MMMM yyyy')

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [{ data: sData, error: sErr }, { data: lData, error: lErr }, { data: hData, error: hErr }] = await Promise.all([
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
          .gte('leave_date', format(monthStart, 'yyyy-MM-dd'))
          .lte('leave_date', format(monthEnd, 'yyyy-MM-dd')),
        supabase
          .from('company_holidays')
          .select('*')
          .gte('date', format(monthStart, 'yyyy-MM-dd'))
          .lte('date', format(monthEnd, 'yyyy-MM-dd')),
      ])

      if (sErr) throw sErr
      if (lErr) throw lErr
      if (hErr) throw hErr

      setSessions((sData as SessionWithBreaks[]) ?? [])
      setLeaves(lData ?? [])
      setHolidays(hData ?? [])
    } catch (err: any) {
      console.error('Error loading reports:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, monthStart.toISOString(), monthEnd.toISOString()])

  useEffect(() => { load() }, [load])

  const handleMonthChange = (date: Date) => setCurrentDate(date)

  // Aggregate stats
  const totalNetSec = sessions.reduce((acc, s) => acc + intervalToSeconds(s.net_time), 0)
  const totalBreakSec = sessions.reduce((acc, s) => acc + calcTotalBreakSeconds(s.break_sessions), 0)
  const totalOTSec = sessions.reduce((acc, s) => acc + intervalToSeconds(s.overtime), 0)
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
        ['Leave Records', String(leaves.length)],
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
        head: [['Date', 'Reason']],
        body: leaves.map(l => [
          format(new Date(l.leave_date), 'MMM d, yyyy'),
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

        {/* Month Navigator & Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold min-w-[160px]">{monthLabel}</h2>
            <div className="flex bg-bg-surface p-1 rounded-xl border border-border">
              <button 
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-bg-elevated text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
              >
                Calendar
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${viewMode === 'list' ? 'bg-bg-elevated text-white shadow-sm' : 'text-text-muted hover:text-white'}`}
              >
                Table
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              id="btn-download-report"
              onClick={downloadPDF}
              className="btn-md btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center"
              disabled={sessions.length === 0}
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { id: 'rpt-days', icon: Clock, label: 'Work Days', value: String(workDays), color: 'text-white' },
            { id: 'rpt-net', icon: TrendingUp, label: 'Net Work', value: formatDuration(totalNetSec), color: 'text-accent-blue' },
            { id: 'rpt-break', icon: Coffee, label: 'Total Break', value: formatDuration(totalBreakSec), color: 'text-accent-yellow' },
            { id: 'rpt-ot', icon: Award, label: 'Overtime', value: formatDuration(totalOTSec), color: totalOTSec > 0 ? 'text-accent-green' : 'text-text-muted' },
          ].map(({ id, icon: Icon, label, value, color }) => (
            <div key={id} id={id} className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="stat-label text-[10px] sm:text-xs">{label}</span>
              </div>
              <span className={`stat-value text-lg sm:text-2xl ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Main Content: Calendar or List */}
        {loading ? (
          <div className="card p-20 text-center animate-pulse flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted text-sm">Loading attendance data...</p>
          </div>
        ) : viewMode === 'calendar' ? (
          <div className="animate-slide-up">
            <CalendarView 
              currentDate={currentDate} 
              sessions={sessions} 
              leaves={leaves}
              holidays={holidays}
              onMonthChange={handleMonthChange}
            />
          </div>
        ) : (
          <div className="card overflow-hidden animate-slide-up">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm uppercase tracking-widest text-text-secondary">Monthly Breakdown</h3>
            </div>
            {sessions.length === 0 ? (
              <div className="p-12 text-center text-text-muted text-sm">No sessions found for {monthLabel}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Date', 'Check In', 'Check Out', 'Net Work', 'Break', 'Overtime'].map(h => (
                        <th key={h} className="text-left px-5 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => {
                      const breakSec = calcTotalBreakSeconds(s.break_sessions)
                      const otSec = intervalToSeconds(s.overtime)
                      return (
                        <tr key={s.id} className={`border-b border-border/50 transition-colors hover:bg-bg-elevated ${i % 2 === 0 ? '' : 'bg-bg-surface/30'}`}>
                          <td className="px-5 py-4 font-medium whitespace-nowrap">{format(new Date(s.check_in_time), 'EEE, MMM d')}</td>
                          <td className="px-5 py-4 font-mono text-accent-green">{format(new Date(s.check_in_time), 'hh:mm a')}</td>
                          <td className="px-5 py-4 font-mono text-accent-red">{s.check_out_time ? format(new Date(s.check_out_time), 'hh:mm a') : <span className="text-text-muted">—</span>}</td>
                          <td className="px-5 py-4 font-mono">{formatDuration(intervalToSeconds(s.net_time))}</td>
                          <td className="px-5 py-4 font-mono text-accent-yellow">{formatDuration(breakSec)}</td>
                          <td className={`px-5 py-4 font-mono ${otSec > 0 ? 'text-accent-green' : 'text-text-muted'}`}>
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
        )}
      </div>
    </div>
  )
}
