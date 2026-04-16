'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calcTotalBreakSeconds, calcWorkMetrics } from '@/lib/calculations'
import type { WorkSession, BreakSession, WorkStatus } from '@/types'

export function useWorkSession(userId: string) {
  const supabase = createClient()

  const [session, setSession] = useState<WorkSession | null>(null)
  const [breaks, setBreaks] = useState<BreakSession[]>([])
  const [activeBreak, setActiveBreak] = useState<BreakSession | null>(null)
  const [status, setStatus] = useState<WorkStatus>('idle')
  const [elapsedWork, setElapsedWork] = useState(0)   // seconds
  const [elapsedBreak, setElapsedBreak] = useState(0) // seconds
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [lastSessionCheckIn, setLastSessionCheckIn] = useState<string | null>(null)
  const [hasActiveUnfinishedSession, setHasActiveUnfinishedSession] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Derive status from session + activeBreak
  const computeStatus = useCallback((s: WorkSession | null, ab: BreakSession | null): WorkStatus => {
    if (!s) return 'idle'
    if (s.check_out_time) return 'completed'
    if (ab) return 'on_break'
    return 'working'
  }, [])

  // Tick timer every second
  const startTicker = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSession(prev => prev ? { ...prev } : prev) // force re-derive
    }, 1000)
  }, [])

  // Load today's active session
  const loadSession = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    try {
      const { data: sessions, error: sErr } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (sErr) throw sErr

      const lastSession = sessions?.[0] ?? null
      let activeSession = null
      
      if (lastSession) {
        setLastSessionCheckIn(lastSession.check_in_time)
        setHasActiveUnfinishedSession(!lastSession.check_out_time)
      } else {
        setLastSessionCheckIn(null)
        setHasActiveUnfinishedSession(false)
      }

      if (lastSession) {
        if (!lastSession.check_out_time) {
          // Keep the session active even if it crosses midnight
          activeSession = lastSession
        } else {
          // Only show it as today's session if it STARTED today.
          // Sessions ending on the next day count for the previous day.
          const checkIn = new Date(lastSession.check_in_time)
          const today = new Date()
          
          if (
            checkIn.toDateString() === today.toDateString()
          ) {
            activeSession = lastSession
          }
        }
      }

      setSession(activeSession)

      if (activeSession) {
        const { data: bData } = await supabase
          .from('break_sessions')
          .select('*')
          .eq('work_session_id', activeSession.id)
          .order('created_at', { ascending: true })

        const allBreaks = bData ?? []
        const openBreak = allBreaks.find((b: BreakSession) => !b.break_end) ?? null
        setBreaks(allBreaks)
        setActiveBreak(openBreak)
        setStatus(computeStatus(activeSession, openBreak))
        if (!activeSession.check_out_time) startTicker()
      } else {
        setStatus('idle')
      }
    } catch (err: any) {
      console.error('Error loading session:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase, computeStatus, startTicker])

  useEffect(() => {
    loadSession()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [loadSession])

  // Recompute elapsed every second
  useEffect(() => {
    if (!session) { setElapsedWork(0); setElapsedBreak(0); return }
    const totalBreakSec = calcTotalBreakSeconds(breaks)
    const { totalSeconds } = calcWorkMetrics(session.check_in_time, session.check_out_time, totalBreakSec)
    setElapsedWork(totalSeconds)
    setElapsedBreak(totalBreakSec)
  }, [session, breaks])

  // ---- Actions ----

  const startWork = async (off_day_message?: string) => {
    if (session && !session.check_out_time) return
    setError(null)
    const now = new Date().toISOString()
    const payload: any = { user_id: userId, check_in_time: now }
    if (off_day_message) payload.off_day_message = off_day_message

    const { data, error: err } = await supabase
      .from('work_sessions')
      .insert(payload)
      .select()
      .single()

    if (err || !data) { setError(err?.message ?? 'Failed to start work'); return }
    setSession(data)
    setBreaks([])
    setActiveBreak(null)
    setStatus('working')
    startTicker()
  }

  const endWork = async (overtime_message?: string) => {
    if (!session || session.check_out_time) return
    if (activeBreak) { setError('Please end your break before ending work.'); return }
    setError(null)

    const now = new Date().toISOString()
    const totalBreakSec = calcTotalBreakSeconds(breaks)
    const { totalSeconds, netWorkSeconds, overtimeSeconds } = calcWorkMetrics(
      session.check_in_time, now, totalBreakSec
    )

    const toHMS = (s: number) => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    }

    const updatePayload: any = {
      check_out_time: now,
      total_time: toHMS(totalSeconds),
      net_time: toHMS(netWorkSeconds),
      overtime: toHMS(overtimeSeconds),
    }

    if (overtime_message) {
      updatePayload.overtime_message = overtime_message
    }

    const { data, error: err } = await supabase
      .from('work_sessions')
      .update(updatePayload)
      .eq('id', session.id)
      .select()
      .single()

    if (err || !data) { setError(err?.message ?? 'Failed to end work'); return }
    setSession(data)
    setStatus('completed')
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const startBreak = async () => {
    if (!session || session.check_out_time || activeBreak) return
    setError(null)
    const now = new Date().toISOString()
    const { data, error: err } = await supabase
      .from('break_sessions')
      .insert({ work_session_id: session.id, break_start: now })
      .select()
      .single()

    if (err || !data) { setError(err?.message ?? 'Failed to start break'); return }
    setActiveBreak(data)
    setBreaks(prev => [...prev, data])
    setStatus('on_break')
  }

  const endBreak = async () => {
    if (!activeBreak) return
    setError(null)
    const now = new Date().toISOString()
    const durationMs = new Date(now).getTime() - new Date(activeBreak.break_start).getTime()
    const durationSec = Math.floor(durationMs / 1000)
    const h = Math.floor(durationSec / 3600), m = Math.floor((durationSec % 3600) / 60), s = durationSec % 60
    const duration = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

    const { data, error: err } = await supabase
      .from('break_sessions')
      .update({ break_end: now, duration })
      .eq('id', activeBreak.id)
      .select()
      .single()

    if (err || !data) { setError(err?.message ?? 'Failed to end break'); return }
    setBreaks(prev => prev.map(b => b.id === data.id ? data : b))
    setActiveBreak(null)
    setStatus('working')
  }

  return useMemo(() => ({
    session,
    breaks,
    activeBreak,
    status,
    elapsedWork,
    elapsedBreak,
    loading,
    error,
    lastSessionCheckIn,
    hasActiveUnfinishedSession,
    startWork,
    endWork,
    startBreak,
    endBreak,
    reload: loadSession,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    session,
    breaks,
    activeBreak,
    status,
    elapsedWork,
    elapsedBreak,
    loading,
    error,
    lastSessionCheckIn,
    hasActiveUnfinishedSession,
    loadSession
  ])
}
