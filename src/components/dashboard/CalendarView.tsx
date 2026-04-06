'use client'

import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  isBefore,
  startOfDay,
  isSaturday,
  isSunday
} from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Coffee, Home, Palmtree, AlertTriangle } from 'lucide-react'
import type { WorkSession, LeaveRequest, CompanyHoliday } from '@/types'

interface CalendarViewProps {
  currentDate: Date
  sessions: WorkSession[]
  leaves: LeaveRequest[]
  holidays: CompanyHoliday[]
  onDateClick?: (date: Date) => void
  onMonthChange: (date: Date) => void
}

export default function CalendarView({ 
  currentDate, 
  sessions, 
  leaves, 
  holidays, 
  onDateClick,
  onMonthChange
}: CalendarViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const startOfToday = startOfDay(new Date())

  const prevMonth = () => onMonthChange(subMonths(currentDate, 1))
  const nextMonth = () => onMonthChange(addMonths(currentDate, 1))

  return (
    <div className="card overflow-hidden">
      {/* Calendar Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <span>{format(currentDate, 'MMMM yyyy')}</span>
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="btn-ghost btn-sm p-1.5 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="btn-ghost btn-sm p-1.5 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-2 sm:p-4">
        {/* Day names */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-[10px] uppercase tracking-tighter text-text-muted font-bold py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day, idx) => {
            const isSelectedMonth = isSameMonth(day, monthStart)
            const isDayToday = isToday(day)
            const daySession = sessions.find(s => isSameDay(new Date(s.check_in_time), day))
            const dayLeave = leaves.find(l => isSameDay(new Date(l.leave_date), day))
            const dayHoliday = holidays.find(h => isSameDay(new Date(h.date), day))
            
            const isPast = isBefore(day, startOfToday)
            const isWeekend = isSaturday(day) || isSunday(day)
            const isUninformed = isPast && !isWeekend && !daySession && !dayLeave && !dayHoliday

            let bgColor = 'bg-bg-surface/50'
            let textColor = isSelectedMonth ? 'text-white' : 'text-text-muted/40'
            let borderColor = 'border-transparent'

            if (daySession) {
              bgColor = 'bg-accent-green/10'
              borderColor = 'border-accent-green/30'
            } else if (dayLeave) {
              bgColor = 'bg-accent-red/10'
              borderColor = 'border-accent-red/30'
            } else if (dayHoliday) {
              bgColor = 'bg-accent-blue/10'
              borderColor = 'border-accent-blue/30'
            } else if (isUninformed) {
              bgColor = 'bg-accent-yellow/10'
              borderColor = 'border-accent-yellow/30'
            }

            if (isDayToday) {
              borderColor = 'border-white/40'
            }

            return (
              <div 
                key={day.toString()}
                onClick={() => onDateClick?.(day)}
                className={`
                  relative aspect-square sm:aspect-auto sm:min-h-[80px] p-1 sm:p-2 rounded-xl border transition-all duration-300
                  ${bgColor} ${borderColor} ${textColor}
                  ${isSelectedMonth ? 'hover:bg-bg-elevated cursor-pointer' : 'opacity-30'}
                `}
              >
                <span className={`text-xs sm:text-sm font-semibold ${isDayToday ? 'text-accent-blue' : ''}`}>
                  {format(day, 'd')}
                </span>

                {/* Desktop detail indicators */}
                <div className="hidden sm:block mt-1 space-y-1">
                  {daySession && (
                    <div className="flex items-center gap-1 text-[9px] text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded-full">
                      <Clock className="w-2.5 h-2.5" />
                      <span>Worked</span>
                    </div>
                  )}
                  {dayLeave && (
                    <div className="flex items-center gap-1 text-[9px] text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded-full">
                      <Palmtree className="w-2.5 h-2.5" />
                      <span>Leave</span>
                    </div>
                  )}
                  {dayHoliday && (
                    <div className="flex items-center gap-1 text-[9px] text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded-full">
                      <Home className="w-2.5 h-2.5" />
                      <span>Holiday</span>
                    </div>
                  )}
                  {isUninformed && (
                    <div className="flex items-center gap-1 text-[9px] text-accent-yellow bg-accent-yellow/10 px-1.5 py-0.5 rounded-full">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>Uninformed</span>
                    </div>
                  )}
                </div>

                {/* Mobile indicators */}
                <div className="sm:hidden absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {daySession && <div className="w-1 h-1 rounded-full bg-accent-green" />}
                  {dayLeave && <div className="w-1 h-1 rounded-full bg-accent-red" />}
                  {dayHoliday && <div className="w-1 h-1 rounded-full bg-accent-blue" />}
                  {isUninformed && <div className="w-1 h-1 rounded-full bg-accent-yellow scale-110" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 bg-bg-surface/50 border-t border-border flex flex-wrap gap-x-4 gap-y-2">
        {[
          { label: 'Work', color: 'bg-accent-green' },
          { label: 'Leave', color: 'bg-accent-red' },
          { label: 'Holiday', color: 'bg-accent-blue' },
          { label: 'Uninformed', color: 'bg-accent-yellow' },
          { label: 'Today', color: 'border-white/40 border' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${item.color}`} />
            <span className="text-[10px] text-text-muted uppercase tracking-widest">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
