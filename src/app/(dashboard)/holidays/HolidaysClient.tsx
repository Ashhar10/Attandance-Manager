'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, isFuture, isToday, isPast, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import Header from '@/components/ui/Header'
import type { CompanyHoliday, Profile } from '@/types'
import { Calendar, Plus, Trash2, AlertCircle, ChevronLeft, ChevronRight, Home, X } from 'lucide-react'

interface HolidaysClientProps {
  profile: Profile
  initialHolidays: CompanyHoliday[]
}

export default function HolidaysClient({ profile, initialHolidays }: HolidaysClientProps) {
  const supabase = createClient()
  const [holidays, setHolidays] = useState<CompanyHoliday[]>(initialHolidays)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())

  const isAdmin = profile?.is_admin ?? false

  const upcoming = holidays.filter(h => isFuture(new Date(h.date)) || isToday(new Date(h.date)))
  const past = holidays.filter(h => isPast(new Date(h.date)) && !isToday(new Date(h.date)))

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim() || !date) { setError('Title and date are required.'); return }
    setSaving(true)
    const { data, error: err } = await supabase
      .from('company_holidays')
      .insert({ title: title.trim(), date, description: description.trim() || null })
      .select()
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    if (data) setHolidays(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
    setTitle(''); setDate(''); setDescription(''); setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday?')) return
    await supabase.from('company_holidays').delete().eq('id', id)
    setHolidays(prev => prev.filter(h => h.id !== id))
  }

  const HolidayCard = ({ h }: { h: CompanyHoliday }) => {
    const d = new Date(h.date)
    const today = isToday(d)
    const future = isFuture(d)
    return (
      <div
        id={`holiday-${h.id}`}
        className={`card p-4 flex items-start gap-4 group transition-all ${today ? 'border-accent-green/30 bg-accent-green/5' : future ? '' : 'opacity-60'}`}
      >
        <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl shrink-0 font-bold
          ${today ? 'bg-accent-green text-black' : future ? 'bg-bg-elevated text-white' : 'bg-bg-surface text-text-muted'}`}
        >
          <span className="text-xs uppercase">{format(d, 'MMM')}</span>
          <span className="text-xl leading-tight">{format(d, 'd')}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{h.title}</p>
              <p className="text-xs text-text-muted mt-0.5">{format(d, 'EEEE, MMMM d, yyyy')}</p>
              {h.description && <p className="text-xs text-text-secondary mt-1">{h.description}</p>}
            </div>
            {isAdmin && (
              <button
                onClick={() => handleDelete(h.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost btn-sm p-1.5 rounded-lg text-accent-red hover:bg-accent-red/10"
                aria-label="Delete holiday"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {today && <span className="badge badge-working mt-2 text-xs">Today</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header status="idle" title="Company Holidays" />
      <div className="flex-1 p-4 sm:p-6 space-y-6 animate-fade-in">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Company Holidays</h2>
            <p className="text-sm text-text-muted">{upcoming.length} upcoming holiday{upcoming.length !== 1 ? 's' : ''}</p>
          </div>
          {isAdmin && (
            <button
              id="btn-add-holiday"
              onClick={() => setShowForm(!showForm)}
              className="btn-md btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
          )}
        </div>

        {/* Add Holiday Modal */}
        {showForm && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-sm">
            <div id="add-holiday-form" className="card w-full max-w-md p-6 flex flex-col animate-slide-up relative">
              <button 
                type="button"
                onClick={() => setShowForm(false)} 
                className="absolute top-4 right-4 p-2 text-text-muted hover:text-white transition-colors bg-bg-surface rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-semibold mb-4 text-lg">Add New Holiday</h3>
            {error && (
              <div className="card border-accent-red/30 bg-accent-red/5 p-3 flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-accent-red" />
                <p className="text-sm text-accent-red">{error}</p>
              </div>
            )}
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="holiday-title">Holiday Name</label>
                  <input id="holiday-title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="e.g. National Day" required />
                </div>
                <div>
                  <label className="label" htmlFor="holiday-date">Date</label>
                  <input id="holiday-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="input" required />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="holiday-desc">Description (optional)</label>
                <input id="holiday-desc" type="text" value={description} onChange={e => setDescription(e.target.value)} className="input" placeholder="Brief description..." />
              </div>
              <div className="flex gap-3">
                <button type="submit" id="btn-save-holiday" disabled={saving} className="btn-md btn-primary">
                  {saving ? 'Saving...' : 'Save Holiday'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-md btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        </div>
        )}

        {/* Calendar View */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">{format(currentDate, 'MMMM yyyy')}</h3>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="btn-ghost btn-sm p-1.5 rounded-lg">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={nextMonth} className="btn-ghost btn-sm p-1.5 rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-2 sm:p-4">
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] uppercase tracking-tighter text-text-muted font-bold py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((day) => {
                const isSelectedMonth = isSameMonth(day, monthStart)
                const isDayToday = isToday(day)
                const dayHoliday = holidays.find(h => isSameDay(new Date(h.date), day))
                
                return (
                  <div 
                    key={day.toString()}
                    onClick={() => {
                      if (!isAdmin) return;
                      setDate(format(day, 'yyyy-MM-dd'))
                      setShowForm(true)
                      setTimeout(() => {
                        document.getElementById('holiday-title')?.focus()
                      }, 100)
                    }}
                    className={`
                      relative min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 rounded-xl border transition-all duration-300
                      ${isSelectedMonth ? 'bg-bg-surface/50 hover:bg-bg-elevated cursor-pointer text-text-primary' : 'bg-transparent text-text-muted/40 border-transparent opacity-50'}
                      ${dayHoliday ? 'border-accent-blue/30 bg-accent-blue/10' : 'border-border/50'}
                      ${isDayToday ? 'border-white/40' : ''}
                      ${!isAdmin ? 'cursor-default' : ''}
                    `}
                  >
                    <span className={`text-xs sm:text-sm font-semibold ${isDayToday ? 'text-accent-blue' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {dayHoliday && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] sm:text-[10px] text-accent-blue bg-accent-blue/10 px-1 sm:px-1.5 py-0.5 rounded-full overflow-hidden">
                        <Home className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate hidden sm:inline">{dayHoliday.title}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming */}
          <div>
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Upcoming
          </h3>
          {upcoming.length === 0 ? (
            <div className="card p-6 text-center text-text-muted text-sm">No upcoming holidays.</div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(h => <HolidayCard key={h.id} h={h} />)}
            </div>
          )}
        </div>

        {/* Past */}
        {past.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Past Holidays
            </h3>
            <div className="space-y-3">
              {past.map(h => <HolidayCard key={h.id} h={h} />)}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
