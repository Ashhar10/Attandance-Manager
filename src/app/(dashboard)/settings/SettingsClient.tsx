'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/ui/Header'
import type { Profile } from '@/types'
import { User, Phone, Shield, Save, CheckCircle, AlertCircle } from 'lucide-react'

interface SettingsClientProps {
  profile: Profile
  userEmail: string
}

export default function SettingsClient({ profile, userEmail }: SettingsClientProps) {
  const supabase = createClient()
  const [name, setName] = useState(profile.name)
  const [employeeId, setEmployeeId] = useState(profile.employee_id ?? '')
  const [hrWhatsapp, setHrWhatsapp] = useState(profile.hr_whatsapp ?? '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    const { error: err } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        employee_id: employeeId.trim() || null,
        hr_whatsapp: hrWhatsapp.trim(),
      })
      .eq('id', profile.id)

    if (err) { setError(err.message); setSaving(false); return }
    // Save to localStorage for client-side usage
    if (typeof window !== 'undefined') {
      localStorage.setItem('hr_whatsapp', hrWhatsapp.trim())
    }
    setSuccess(true)
    setSaving(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header status="idle" title="Settings" />
      <div className="flex-1 p-4 sm:p-6 space-y-6 animate-fade-in max-w-2xl">

        {success && (
          <div className="card border-accent-green/30 bg-accent-green/5 p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-accent-green shrink-0" />
            <p className="text-sm text-accent-green">Settings saved successfully!</p>
          </div>
        )}
        {error && (
          <div className="card border-accent-red/30 bg-accent-red/5 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-accent-red shrink-0" />
            <p className="text-sm text-accent-red">{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} id="settings-form" className="space-y-6">
          {/* Profile Section */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-text-secondary" />
              <h3 className="font-semibold">Profile Information</h3>
            </div>

            <div>
              <label className="label" htmlFor="settings-email">Email Address</label>
              <input id="settings-email" type="email" value={userEmail} disabled className="input opacity-50 cursor-not-allowed" />
            </div>
            <div>
              <label className="label" htmlFor="settings-name">Full Name</label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input"
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="settings-empid">Employee ID <span className="text-text-muted font-normal">(optional)</span></label>
              <input
                id="settings-empid"
                type="text"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="input"
                placeholder="e.g. EMP-001"
              />
            </div>
          </div>

          {/* WhatsApp Section */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-text-secondary" />
              <h3 className="font-semibold">WhatsApp Integration</h3>
            </div>
            <div>
              <label className="label" htmlFor="settings-whatsapp">
                HR / Manager WhatsApp Number
              </label>
              <input
                id="settings-whatsapp"
                type="tel"
                value={hrWhatsapp}
                onChange={e => setHrWhatsapp(e.target.value)}
                className="input"
                placeholder="+966501234567"
              />
              <p className="text-xs text-text-muted mt-2">Include country code. Used when submitting leave requests via WhatsApp.</p>
            </div>
          </div>

          {/* Role info */}
          <div className="card p-5 flex items-center gap-3 border-border/50">
            <Shield className="w-4 h-4 text-text-muted" />
            <div>
              <p className="text-sm font-medium">Role: <span className="text-text-secondary">{profile.is_admin ? 'Administrator' : 'Employee'}</span></p>
              <p className="text-xs text-text-muted mt-0.5">
                {profile.is_admin ? 'You can add and manage company holidays.' : 'Contact admin to update your role.'}
              </p>
            </div>
          </div>

          <button
            id="btn-save-settings"
            type="submit"
            disabled={saving}
            className="btn-lg btn-primary"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
