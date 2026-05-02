'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, getMonth, getYear, eachDayOfInterval, isBefore, startOfDay, isSaturday, isSunday, isSameDay } from 'date-fns'
import { formatDuration, intervalToSeconds, calcTotalBreakSeconds, isOffDay } from '@/lib/calculations'
import Header from '@/components/ui/Header'
import type { WorkSession, BreakSession, LeaveRequest, Profile, CompanyHoliday } from '@/types'
import { Download, Clock, Coffee, TrendingUp, Award, AlertTriangle, X, Palmtree, Home, MessageSquare } from 'lucide-react'
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [firstEntryDate, setFirstEntryDate] = useState<Date | null>(null)

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

      // Fetch absolute first session ever to determine when "No Data" ends
      const { data: firstS } = await supabase
        .from('work_sessions')
        .select('check_in_time')
        .eq('user_id', userId)
        .order('check_in_time', { ascending: true })
        .limit(1)
      
      if (firstS?.[0]) {
        setFirstEntryDate(new Date(firstS[0].check_in_time))
      }
    } catch (err: any) {
      console.error('Error loading reports:', err)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, monthStart.toISOString(), monthEnd.toISOString()])

  useEffect(() => { load() }, [load])

  const handleMonthChange = (date: Date) => setCurrentDate(date)

  // Aggregate stats
  const totalNetSec = sessions.reduce((acc, s) => acc + intervalToSeconds(s.net_time), 0)
  const totalBreakSec = sessions.reduce((acc, s) => acc + calcTotalBreakSeconds(s.break_sessions), 0)
  const totalOTSec = sessions.reduce((acc, s) => acc + intervalToSeconds(s.overtime), 0)
  const workDays = sessions.filter(s => s.check_out_time).length
  const totalLeaveDays = leaves.reduce((acc, l) => acc + (l.leave_days || 1), 0)

  // Calculate Uninformed Leaves
  const startOfToday = startOfDay(new Date())
  const rangeStart = monthStart
  const rangeEnd = isBefore(monthEnd, startOfToday) ? monthEnd : startOfToday
  
  const daysInRange = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  const uninformedLeaves = daysInRange.filter(day => {
    const isPast = isBefore(day, startOfToday)
    if (!isPast) return false
    
    // Special Cases for April 2nd and 4th as requested
    const dayDate = day.getDate()
    const dayMonth = day.getMonth() // 0-indexed, so 3 is April
    const isApril2Or4 = dayMonth === 3 && (dayDate === 2 || dayDate === 4)

    // Check if it has an entry
    const hasSession = sessions.some(s => isSameDay(new Date(s.check_in_time), day))
    if (hasSession) return false

    // If it's April 2 or 4, it's always uninformed if missing
    if (isApril2Or4) return true

    // Only count as uninformed if it's AFTER the user started using the app (firstEntryDate)
    if (!firstEntryDate || isBefore(day, startOfDay(firstEntryDate))) return false

    // Use the custom isOffDay logic (includes 2nd/4th Saturday rule)
    if (isOffDay(day)) return false
    
    const hasLeave = leaves.some(l => isSameDay(new Date(l.leave_date), day))
    const hasHoliday = holidays.some(h => isSameDay(new Date(h.date), day))
    
    return !hasLeave && !hasHoliday
  }).length

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
        ['Uninformed Leaves', String(uninformedLeaves)],
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

        {/* Summary Stats — Top row: 4 cards */}
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

        {/* Combined Leave Card: Uninformed | Applied | Total */}
        <div id="rpt-leave-summary" className="stat-card col-span-full">
          <div className="flex items-center gap-2 mb-4">
            <Palmtree className="w-4 h-4 text-accent-red" />
            <span className="stat-label text-[10px] sm:text-xs uppercase tracking-widest">Leave Summary</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border">
            {/* Uninformed */}
            <div className="flex flex-col items-center gap-1 px-2 sm:px-4">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-accent-yellow" />
                <span className="text-[10px] text-text-muted uppercase tracking-widest">Uninformed</span>
              </div>
              <span className={`text-2xl sm:text-3xl font-bold font-mono ${uninformedLeaves > 0 ? 'text-accent-yellow' : 'text-text-muted'}`}>
                {uninformedLeaves}
              </span>
              <span className="text-[10px] text-text-muted">day{uninformedLeaves !== 1 ? 's' : ''}</span>
            </div>
            {/* Applied */}
            <div className="flex flex-col items-center gap-1 px-2 sm:px-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Palmtree className="w-3.5 h-3.5 text-accent-red" />
                <span className="text-[10px] text-text-muted uppercase tracking-widest">Applied</span>
              </div>
              <span className={`text-2xl sm:text-3xl font-bold font-mono ${leaves.length > 0 ? 'text-accent-red' : 'text-text-muted'}`}>
                {totalLeaveDays}
              </span>
              <span className="text-[10px] text-text-muted">{leaves.length} request{leaves.length !== 1 ? 's' : ''}</span>
            </div>
            {/* Total */}
            <div className="flex flex-col items-center gap-1 px-2 sm:px-4">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-white/50" />
                <span className="text-[10px] text-text-muted uppercase tracking-widest">Total</span>
              </div>
              <span className={`text-2xl sm:text-3xl font-bold font-mono ${(uninformedLeaves + totalLeaveDays) > 0 ? 'text-white' : 'text-text-muted'}`}>
                {uninformedLeaves + totalLeaveDays}
              </span>
              <span className="text-[10px] text-text-muted">days this month</span>
            </div>
          </div>
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
              firstEntryDate={firstEntryDate}
              onMonthChange={handleMonthChange}
              onDateClick={(date) => setSelectedDate(date)}
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

      {/* Date Details Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="card w-full max-w-md p-6 flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-xl font-bold flex flex-col">
                <span className="text-white">{format(selectedDate, 'EEEE')}</span>
                <span className="text-sm text-text-muted">{format(selectedDate, 'MMMM d, yyyy')}</span>
              </h3>
              <button onClick={() => setSelectedDate(null)} className="p-2 -mr-2 text-text-muted hover:text-white transition-colors bg-bg-surface rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-6 overflow-y-auto pr-1">
              {(() => {
                const daySessions = sessions.filter(s => isSameDay(new Date(s.check_in_time), selectedDate))
                const hasSession = daySessions.length > 0
                
                const isOffWork = isOffDay(selectedDate)
                const isPast = isBefore(selectedDate, startOfDay(new Date()))

                // Logic for "Uninformed" vs "No Data" matches uninformedLeaves calc
                const dayDate = selectedDate.getDate()
                const dayMonth = selectedDate.getMonth()
                const isApril2Or4 = dayMonth === 3 && (dayDate === 2 || dayDate === 4)
                
                const isUninformed = !hasSession && (isApril2Or4 || (firstEntryDate && !isBefore(selectedDate, startOfToday) && !isOffWork))
                
                const dayLeave = leaves.find(l => isSameDay(new Date(l.leave_date), selectedDate))
                const dayHoliday = holidays.find(h => isSameDay(new Date(h.date), selectedDate))
                const isEmpty = !hasSession && !dayLeave && !dayHoliday

                return (
                  <>
                    {daySessions.map((session, idx) => {
                      const breakSec = calcTotalBreakSeconds(session.break_sessions)
                      const otSec = intervalToSeconds(session.overtime)
                      
                      return (
                        <div key={session.id} className="bg-bg-surface p-4 rounded-xl border border-border/50 space-y-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-text-muted font-medium tracking-widest uppercase text-xs">Work Session {daySessions.length > 1 ? `#${idx + 1}` : ''}</span>
                            {session.check_out_time ? (
                              <span className="px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green text-[10px] font-bold">COMPLETED</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue text-[10px] font-bold">ACTIVE</span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] text-text-muted uppercase mb-1">Check In</p>
                              <p className="font-mono text-sm text-white">{format(new Date(session.check_in_time), 'hh:mm a')}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-text-muted uppercase mb-1">Check Out</p>
                              <p className="font-mono text-sm text-white">{session.check_out_time ? format(new Date(session.check_out_time), 'hh:mm a') : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-text-muted uppercase mb-1">Net Work</p>
                              <p className="font-mono text-sm text-white">{formatDuration(intervalToSeconds(session.net_time))}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-text-muted uppercase mb-1">Break Time</p>
                              <p className="font-mono text-sm text-accent-yellow">{formatDuration(breakSec)}</p>
                            </div>
                          </div>

                          {otSec > 0 && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <div className="flex justify-between items-center mb-2">
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-green">
                                  <Award className="w-3.5 h-3.5" />
                                  Overtime
                                </span>
                                <span className="font-mono text-xs text-accent-green bg-accent-green/10 px-2 py-0.5 rounded">{formatDuration(otSec)}</span>
                              </div>
                              {session.overtime_message && (
                                <div className="bg-bg-elevated p-3 rounded-lg border border-border mt-2 relative">
                                  <MessageSquare className="w-4 h-4 text-text-muted absolute top-3 right-3 opacity-30" />
                                  <p className="text-xs text-text-muted uppercase mb-1">Reason</p>
                                  <p className="text-sm text-white italic">&quot;{session.overtime_message}&quot;</p>
                                </div>
                              )}
                            </div>
                          )}

                          {session.off_day_message && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-accent-yellow mb-2">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Off-Day Work
                              </div>
                              <div className="bg-bg-elevated p-3 rounded-lg border border-border mt-2 relative">
                                <MessageSquare className="w-4 h-4 text-text-muted absolute top-3 right-3 opacity-30" />
                                <p className="text-xs text-text-muted uppercase mb-1">Reason</p>
                                <p className="text-sm text-white italic">&quot;{session.off_day_message}&quot;</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {dayLeave && (
                      <div className="bg-accent-red/5 border border-accent-red/20 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-accent-red font-semibold mb-2">
                          <Palmtree className="w-5 h-5" /> Leave Request
                        </div>
                        <p className="text-xs text-text-muted uppercase">Reason</p>
                        <p className="text-sm text-white leading-relaxed">{dayLeave.reason}</p>
                      </div>
                    )}

                    {dayHoliday && (
                      <div className="bg-accent-blue/5 border border-accent-blue/20 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-accent-blue font-semibold mb-2">
                          <Home className="w-5 h-5" /> Company Holiday
                        </div>
                        <p className="text-white font-medium">{dayHoliday.title}</p>
                        {dayHoliday.description && <p className="text-sm text-text-muted leading-relaxed">{dayHoliday.description}</p>}
                      </div>
                    )}

                    {isEmpty && (
                      <div className="text-center p-8 space-y-3">
                        <div className="inline-flex w-12 h-12 bg-bg-surface rounded-full items-center justify-center border border-border">
                          {isUninformed ? <AlertTriangle className="w-5 h-5 text-accent-yellow" /> : isOffWork ? <Home className="w-5 h-5 text-text-muted" /> : <Clock className="w-5 h-5 text-text-muted" />}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{isUninformed ? 'Uninformed' : isOffWork ? 'Off-Day' : 'No Data'}</p>
                          <p className="text-sm text-text-muted mt-1">
                            {isUninformed ? 'There are no attendance records for this work day.' : isOffWork ? 'Enjoy your day off!' : 'No session data is available for this date.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
