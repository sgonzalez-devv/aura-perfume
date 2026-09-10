'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard, Package, Users, TrendingUp, Truck, ShoppingCart, ClipboardList, StickyNote,
  Menu, X, LogOut, ChevronRight, Sparkles
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/inventory', label: 'Inventario', icon: Package },
  { href: '/dashboard/clients', label: 'Clientes', icon: Users },
  { href: '/dashboard/finances', label: 'Finanzas', icon: TrendingUp },
  { href: '/dashboard/suppliers', label: 'Proveedores', icon: Truck },
  { href: '/dashboard/orders', label: 'Órdenes de Compra', icon: ShoppingCart },
  { href: '/dashboard/shopping-list', label: 'Lista de Compras', icon: ClipboardList },
  { href: '/dashboard/notes', label: 'Notas', icon: StickyNote },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a0835' }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'rgba(201,168,76,0.15)' }}>
            <svg className="w-8 h-8 animate-spin" style={{ color: '#c9a84c' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-lg tracking-widest" style={{ fontFamily: 'Montserrat, sans-serif', color: '#c9a84c' }}>AURA</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-7 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: 'rgba(201,168,76,0.15)' }}>
          <Sparkles className="w-5 h-5" style={{ color: '#c9a84c' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-[0.2em]" style={{ fontFamily: 'Montserrat, sans-serif', color: '#c9a84c' }}>
            AURA
          </h1>
          <p className="text-xs tracking-widest" style={{ color: 'rgba(201,168,76,0.45)', fontSize: '9px' }}>PERFUME STUDIO</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative"
              style={{
                background: isActive ? 'rgba(201,168,76,0.15)' : 'transparent',
                color: isActive ? '#c9a84c' : 'rgba(255,255,255,0.55)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'
                }
              }}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: '#c9a84c' }} />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{label}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: 'linear-gradient(135deg, #c9a84c, #7c3aed)', color: 'white' }}>
            {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {profile?.full_name || 'Usuario'}
            </p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {user.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
          style={{ color: 'rgba(255,100,100,0.7)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'
            ;(e.currentTarget as HTMLElement).style.color = '#f87171'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,100,100,0.7)'
          }}
        >
          <LogOut className="w-4 h-4" />
          <span>{signingOut ? 'Cerrando...' : 'Cerrar Sesión'}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f5f3ff' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #1a0835 0%, #2d0f5e 100%)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="relative w-72 flex flex-col z-10"
            style={{ background: 'linear-gradient(180deg, #1a0835 0%, #2d0f5e 100%)' }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.07)' }}
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header
          className="md:hidden flex items-center gap-4 px-4 py-3 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1a0835, #2d0f5e)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg"
            style={{ color: '#c9a84c', background: 'rgba(201,168,76,0.1)' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold tracking-widest" style={{ fontFamily: 'Montserrat, sans-serif', color: '#c9a84c' }}>
            AURA
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
