'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, BarChart2, FileText, Calendar,
  Settings, LogOut, Menu, X, Building2
} from 'lucide-react'
import { useState } from 'react'
import type { Profile } from '@/types'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, id: 'nav-dashboard' },
  { href: '/reports', label: 'Reports', icon: BarChart2, id: 'nav-reports' },
  { href: '/leave', label: 'Leave Request', icon: FileText, id: 'nav-leave' },
  { href: '/holidays', label: 'Holidays', icon: Calendar, id: 'nav-holidays' },
  { href: '/settings', label: 'Settings', icon: Settings, id: 'nav-settings' },
]

interface SidebarProps {
  profile: Profile
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      {/* Mobile toggle */}
      <button
        id="sidebar-mobile-toggle"
        className="fixed top-4 left-4 z-50 md:hidden btn-ghost btn-sm p-2 rounded-xl"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-64 bg-bg-surface border-r border-border z-40
          flex flex-col transition-transform duration-300
          md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-black" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-wide">HR Portal</p>
            <p className="text-xs text-text-muted">Work Manager</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon, id }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                id={id}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-white text-black'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.name}</p>
              {profile.employee_id && (
                <p className="text-xs text-text-muted truncate">ID: {profile.employee_id}</p>
              )}
            </div>
          </div>
          <button
            id="btn-sign-out"
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-accent-red hover:bg-accent-red/5 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}
