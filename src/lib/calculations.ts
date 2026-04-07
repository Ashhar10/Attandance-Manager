const STANDARD_HOURS = 8 * 3600 // 8 hours in seconds

/**
 * Parse a PostgreSQL interval string like "01:30:00" or "00:00:30" to seconds
 */
export function intervalToSeconds(interval: string | null): number {
  if (!interval) return 0
  // Handle "HH:MM:SS" format
  const parts = interval.split(':')
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])
  }
  return 0
}

/**
 * Format seconds as HH:MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Format seconds as human readable "Xh Ym"
 */
export function formatDurationHuman(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Calculate elapsed seconds from a timestamp to now
 */
export function elapsedSeconds(fromTime: string | Date): number {
  const from = typeof fromTime === 'string' ? new Date(fromTime) : fromTime
  return Math.floor((Date.now() - from.getTime()) / 1000)
}

/**
 * Calculate total break seconds from multiple break sessions
 */
export function calcTotalBreakSeconds(
  breaks: Array<{ break_start: string; break_end: string | null }>
): number {
  return breaks.reduce((acc, brk) => {
    if (!brk.break_end) {
      // Active break — count up to now
      return acc + elapsedSeconds(brk.break_start)
    }
    const start = new Date(brk.break_start).getTime()
    const end = new Date(brk.break_end).getTime()
    return acc + Math.floor((end - start) / 1000)
  }, 0)
}

/**
 * Calculate net work seconds and overtime
 */
export function calcWorkMetrics(
  checkIn: string,
  checkOut: string | null,
  totalBreakSeconds: number
) {
  const totalSeconds = checkOut
    ? Math.floor((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 1000)
    : elapsedSeconds(checkIn)

  const netWorkSeconds = Math.max(0, totalSeconds - totalBreakSeconds)
  const overtimeSeconds = Math.max(0, netWorkSeconds - STANDARD_HOURS)

  return { totalSeconds, netWorkSeconds, overtimeSeconds }
}

/**
 * Build seconds-interval string for Supabase (HH:MM:SS)
 */
export function secondsToInterval(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const STANDARD_WORK_SECONDS = STANDARD_HOURS
