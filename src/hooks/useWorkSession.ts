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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      const { data: sessions, error: sErr } = await supabase
        .from('work_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('check_in_time', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (sErr) throw sErr

      const activeSession = sessions?.[0] ?? null
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

  const startWork = async () => {
    if (session) return
    setError(null)
    const now = new Date().toISOString()
    const { data, error: err } = await supabase
      .from('work_sessions')
      .insert({ user_id: userId, check_in_time: now })
      .select()
      .single()

    if (err || !data) { setError(err?.message ?? 'Failed to start work'); return }
    setSession(data)
    setBreaks([])
    setActiveBreak(null)
    setStatus('working')
    startTicker()
  }

  const endWork = async () => {
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

    const { data, error: err } = await supabase
      .from('work_sessions')
      .update({
        check_out_time: now,
        total_time: toHMS(totalSeconds),
        net_time: toHMS(netWorkSeconds),
        overtime: toHMS(overtimeSeconds),
      })
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
    startWork,
    endWork,
    startBreak,
    endBreak,
    reload: loadSession,
  }), [
    session,
    breaks,
    activeBreak,
    status,
    elapsedWork,
    elapsedBreak,
    loading,
    error,
    loadSession
  ])
}
