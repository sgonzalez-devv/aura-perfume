'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas. Por favor verifica tu email y contraseña.')
      setLoading(false)
    } else {
      router.replace('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1a0835 0%, #2d0f5e 50%, #1a0835 100%)' }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full opacity-10" style={{ background: '#c9a84c', filter: 'blur(60px)' }} />
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full opacity-10" style={{ background: '#7c3aed', filter: 'blur(40px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-5" style={{ background: '#c9a84c', filter: 'blur(80px)' }} />

        {/* Perfume bottle SVG */}
        <div className="relative z-10 mb-10">
          <svg width="140" height="200" viewBox="0 0 140 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Bottle cap */}
            <rect x="52" y="8" width="36" height="12" rx="4" fill="#c9a84c" opacity="0.9" />
            {/* Bottle neck */}
            <rect x="58" y="20" width="24" height="20" rx="3" fill="#e8d5a3" opacity="0.8" />
            {/* Bottle shoulder */}
            <path d="M40 50 Q40 40 58 40 L82 40 Q100 40 100 50 L108 75 L32 75 Z" fill="url(#bottleGrad)" opacity="0.95" />
            {/* Bottle body */}
            <rect x="30" y="75" width="80" height="105" rx="8" fill="url(#bottleGrad)" opacity="0.95" />
            {/* Bottle highlight */}
            <rect x="38" y="85" width="12" height="80" rx="6" fill="white" opacity="0.15" />
            {/* Label area */}
            <rect x="38" y="100" width="64" height="55" rx="4" fill="white" opacity="0.12" />
            {/* Label text lines */}
            <rect x="46" y="113" width="48" height="3" rx="1.5" fill="#c9a84c" opacity="0.8" />
            <rect x="52" y="121" width="36" height="2" rx="1" fill="#c9a84c" opacity="0.5" />
            <rect x="48" y="129" width="44" height="2" rx="1" fill="#c9a84c" opacity="0.4" />
            <rect x="54" y="138" width="32" height="2" rx="1" fill="#c9a84c" opacity="0.3" />
            {/* Bottle bottom */}
            <rect x="30" y="176" width="80" height="8" rx="4" fill="#c9a84c" opacity="0.4" />
            {/* Fragrance wisps */}
            <path d="M60 5 Q55 -2 65 -8 Q70 -14 60 -18" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
            <path d="M72 3 Q78 -5 70 -11 Q65 -17 74 -22" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
            <path d="M83 6 Q88 -1 80 -7 Q75 -12 83 -17" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.3" />
            <defs>
              <linearGradient id="bottleGrad" x1="30" y1="40" x2="110" y2="185" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.5" />
                <stop offset="40%" stopColor="#7c3aed" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#1a0835" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Brand text */}
        <h1 className="text-6xl font-bold mb-4 tracking-widest" style={{ fontFamily: 'Playfair Display, serif', color: '#c9a84c', textShadow: '0 0 40px rgba(201,168,76,0.3)' }}>
          AURA
        </h1>
        <p className="text-lg tracking-[0.3em] uppercase mb-8 text-center" style={{ color: 'rgba(201,168,76,0.7)', fontSize: '0.75rem' }}>
          The Scent of Smart Business
        </p>
        <div className="w-24 h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }} />
        <p className="text-center max-w-xs leading-relaxed text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Gestión elegante para tu tienda de perfumería de lujo. Control total de inventario, clientes y finanzas.
        </p>

        {/* Decorative dots */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === 2 ? '#c9a84c' : 'rgba(201,168,76,0.3)' }} />
          ))}
        </div>
      </div>

      {/* Right: Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="text-5xl font-bold tracking-widest mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#c9a84c' }}>
              AURA
            </h1>
            <p className="text-xs tracking-widest uppercase" style={{ color: 'rgba(201,168,76,0.6)' }}>
              The Scent of Smart Business
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl p-8 lg:p-10" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(201,168,76,0.15)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2" style={{ color: 'white', fontFamily: 'Playfair Display, serif' }}>
                Bienvenido
              </h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#f87171' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-medium mb-2 tracking-wider uppercase" style={{ color: 'rgba(201,168,76,0.8)' }}>
                  Email
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(201,168,76,0.5)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="usuario@aura.com"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      color: 'white',
                      caretColor: '#c9a84c',
                    }}
                    onFocus={e => { e.target.style.border = '1px solid rgba(201,168,76,0.6)'; e.target.style.background = 'rgba(255,255,255,0.1)' }}
                    onBlur={e => { e.target.style.border = '1px solid rgba(201,168,76,0.2)'; e.target.style.background = 'rgba(255,255,255,0.07)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2 tracking-wider uppercase" style={{ color: 'rgba(201,168,76,0.8)' }}>
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'rgba(201,168,76,0.5)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      color: 'white',
                      caretColor: '#c9a84c',
                    }}
                    onFocus={e => { e.target.style.border = '1px solid rgba(201,168,76,0.6)'; e.target.style.background = 'rgba(255,255,255,0.1)' }}
                    onBlur={e => { e.target.style.border = '1px solid rgba(201,168,76,0.2)'; e.target.style.background = 'rgba(255,255,255,0.07)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(201,168,76,0.5)' }}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-sm tracking-wider transition-all mt-2 relative overflow-hidden"
                style={{
                  background: loading ? 'rgba(201,168,76,0.5)' : 'linear-gradient(135deg, #c9a84c 0%, #a07c2a 100%)',
                  color: '#1a0835',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(201,168,76,0.4)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Ingresando...
                  </span>
                ) : (
                  'Ingresar al Sistema'
                )}
              </button>
            </form>

            <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                © 2025 Aura · Luxury Perfume Management
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
