export type WorkStatus = 'idle' | 'working' | 'on_break' | 'completed'

export interface Profile {
  id: string
  name: string
  employee_id: string | null
  hr_whatsapp: string
  is_admin: boolean
  created_at: string
}

export interface WorkSession {
  id: string
  user_id: string
  check_in_time: string
  check_out_time: string | null
  total_time: string | null
  net_time: string | null
  overtime: string | null
  overtime_message: string | null
  off_day_message: string | null
  created_at: string
}

export interface BreakSession {
  id: string
  work_session_id: string
  break_start: string
  break_end: string | null
  duration: string | null
  created_at: string
}

export interface LeaveRequest {
  id: string
  user_id: string
  leave_date: string
  leave_days: number
  reason: string
  created_at: string
}

export interface CompanyHoliday {
  id: string
  title: string
  date: string
  description: string | null
  created_at: string
}

export interface DailyReport {
  session: WorkSession
  breaks: BreakSession[]
  checkInTime: Date
  checkOutTime: Date | null
  totalTimeSeconds: number
  totalBreakSeconds: number
  netWorkSeconds: number
  overtimeSeconds: number
}
