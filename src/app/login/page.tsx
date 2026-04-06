'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Building2, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg-base">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-radial from-white/[0.03] to-transparent pointer-events-none" />

      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/10">
            <Building2 className="w-7 h-7 text-black" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">HR Portal</h1>
            <p className="text-sm text-text-muted mt-1">Sign in to your account</p>
          </div>
        </div>

        <div className="card p-6 space-y-5">
          {error && (
            <div className="card border-accent-red/30 bg-accent-red/5 p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-accent-red shrink-0" />
              <p className="text-sm text-accent-red">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} id="login-form" className="space-y-4">
            <div>
              <label className="label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="btn-lg btn-primary w-full"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-white font-semibold hover:text-gray-200 transition-colors">
              Register
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          HR Work Management System
        </p>
      </div>
    </div>
  )
}
