'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { DollarSign, TrendingUp, Package, AlertTriangle, Cake } from 'lucide-react'

interface StatCard {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  color: string
  lightColor: string
}

interface SaleChartData {
  date: string
  ventas: number
  ganancia: number
}

interface TopProduct {
  product_name: string
  product_brand: string
  total_sold: number
  total_revenue: number
}

interface RecentSale {
  id: string
  sale_number: string
  client_name: string
  total: number
  payment_method: string
  payment_status: string
  created_at: string
}

interface Birthday {
  id: string
  first_name: string
  last_name: string
  birthday: string
  phone: string
}

function formatDOP(amount: number) {
  return `DOP $${amount.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function paymentBadge(method: string) {
  const colors: Record<string, string> = {
    'efectivo': 'bg-green-100 text-green-700',
    'tarjeta': 'bg-blue-100 text-blue-700',
    'transferencia': 'bg-purple-100 text-purple-700',
    'paypal': 'bg-yellow-100 text-yellow-700',
  }
  return colors[method?.toLowerCase()] || 'bg-gray-100 text-gray-600'
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ revenue: 0, profit: 0, inventoryValue: 0, lowStock: 0 })
  const [chartData, setChartData] = useState<SaleChartData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [birthdays, setBirthdays] = useState<Birthday[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    await Promise.all([
      fetchStats(),
      fetchChartData(),
      fetchTopProducts(),
      fetchRecentSales(),
      fetchBirthdays(),
    ])
    setLoading(false)
  }

  async function fetchStats() {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [salesResult, productsResult] = await Promise.all([
      supabase.from('sales').select('total').gte('created_at', startOfMonth).eq('payment_status', 'pagado'),
      supabase.from('products').select('purchase_price, selling_price, stock_quantity, min_stock_alert, is_active').eq('is_active', true),
    ])

    const salesData = salesResult.data || []
    const revenue = salesData.reduce((s, x) => s + (x.total || 0), 0)

    // Get profit from sale items this month
    const { data: itemsData } = await supabase
      .from('sale_items')
      .select('profit, sale_id')

    const { data: monthSales } = await supabase
      .from('sales')
      .select('id')
      .gte('created_at', startOfMonth)
      .eq('payment_status', 'pagado')

    const monthSaleIds = new Set((monthSales || []).map(s => s.id))
    const profit = (itemsData || [])
      .filter(i => monthSaleIds.has(i.sale_id))
      .reduce((s, x) => s + (x.profit || 0), 0)

    const products = productsResult.data || []
    const inventoryValue = products.reduce((s, p) => s + (p.selling_price || 0) * (p.stock_quantity || 0), 0)
    const lowStock = products.filter(p => (p.stock_quantity || 0) <= (p.min_stock_alert || 0)).length

    setStats({ revenue, profit, inventoryValue, lowStock })
  }

  async function fetchChartData() {
    const days = 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: sales } = await supabase
      .from('sales')
      .select('total, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('payment_status', 'pagado')

    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('profit, sale_id')

    const { data: allSales } = await supabase
      .from('sales')
      .select('id, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('payment_status', 'pagado')

    const saleMap: Record<string, string> = {}
    ;(allSales || []).forEach(s => { saleMap[s.id] = s.created_at })

    const profitByDay: Record<string, number> = {}
    ;(saleItems || []).forEach(item => {
      if (saleMap[item.sale_id]) {
        const day = saleMap[item.sale_id].slice(0, 10)
        profitByDay[day] = (profitByDay[day] || 0) + (item.profit || 0)
      }
    })

    const revenueByDay: Record<string, number> = {}
    ;(sales || []).forEach(s => {
      const day = s.created_at.slice(0, 10)
      revenueByDay[day] = (revenueByDay[day] || 0) + (s.total || 0)
    })

    const data: SaleChartData[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = `${d.getDate()}/${d.getMonth() + 1}`
      data.push({
        date: label,
        ventas: Math.round(revenueByDay[key] || 0),
        ganancia: Math.round(profitByDay[key] || 0),
      })
    }

    // Group into weeks for cleaner display
    const weeklyData: SaleChartData[] = []
    for (let i = 0; i < data.length; i += 5) {
      const chunk = data.slice(i, i + 5)
      weeklyData.push({
        date: chunk[0].date,
        ventas: chunk.reduce((s, x) => s + x.ventas, 0),
        ganancia: chunk.reduce((s, x) => s + x.ganancia, 0),
      })
    }

    setChartData(weeklyData)
  }

  async function fetchTopProducts() {
    const { data } = await supabase
      .from('sale_items')
      .select('product_name, product_brand, quantity, subtotal')

    if (!data) return

    const productMap: Record<string, { product_name: string; product_brand: string; total_sold: number; total_revenue: number }> = {}
    data.forEach(item => {
      const key = item.product_name
      if (!productMap[key]) {
        productMap[key] = { product_name: item.product_name, product_brand: item.product_brand, total_sold: 0, total_revenue: 0 }
      }
      productMap[key].total_sold += item.quantity || 0
      productMap[key].total_revenue += item.subtotal || 0
    })

    const sorted = Object.values(productMap)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5)

    setTopProducts(sorted)
  }

  async function fetchRecentSales() {
    const { data: sales } = await supabase
      .from('sales')
      .select('id, sale_number, client_id, total, payment_method, payment_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (!sales) return

    const clientIds = sales.map(s => s.client_id).filter(Boolean)
    let clientMap: Record<string, string> = {}
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .in('id', clientIds)
      ;(clients || []).forEach(c => { clientMap[c.id] = `${c.first_name} ${c.last_name}` })
    }

    setRecentSales(sales.map(s => ({
      ...s,
      client_name: clientMap[s.client_id] || 'Cliente Anónimo',
    })))
  }

  async function fetchBirthdays() {
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name, birthday, phone')
      .not('birthday', 'is', null)

    if (!data) return

    const currentMonth = new Date().getMonth() + 1
    const upcoming = data
      .filter(c => {
        if (!c.birthday) return false
        const month = parseInt(c.birthday.split('-')[1])
        return month === currentMonth
      })
      .slice(0, 5)

    setBirthdays(upcoming)
  }

  const statCards: StatCard[] = [
    {
      label: 'Ingresos del Mes',
      value: formatDOP(stats.revenue),
      sub: 'Ventas pagadas',
      icon: <DollarSign className="w-6 h-6" />,
      color: '#7c3aed',
      lightColor: '#f5f3ff',
    },
    {
      label: 'Ganancia del Mes',
      value: formatDOP(stats.profit),
      sub: 'Después del costo',
      icon: <TrendingUp className="w-6 h-6" />,
      color: '#059669',
      lightColor: '#ecfdf5',
    },
    {
      label: 'Valor del Inventario',
      value: formatDOP(stats.inventoryValue),
      sub: 'Al precio de venta',
      icon: <Package className="w-6 h-6" />,
      color: '#c9a84c',
      lightColor: '#fffbeb',
    },
    {
      label: 'Stock Bajo',
      value: stats.lowStock.toString(),
      sub: 'Productos a reponer',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: '#dc2626',
      lightColor: '#fef2f2',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Dashboard
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Resumen de tu negocio · {new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8" style={{ background: card.lightColor }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: card.lightColor, color: card.color }}>
                  {card.icon}
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-1">{card.label}</p>
              <p className="text-2xl font-bold mb-1" style={{ color: card.color, fontFamily: 'Montserrat, sans-serif' }}>
                {card.value}
              </p>
              <p className="text-xs text-gray-400">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Top Products */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Sales chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Ventas — Últimos 30 días
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Ingresos y ganancia por período</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value: number, name: string) => [formatDOP(value), name === 'ventas' ? 'Ventas' : 'Ganancia']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
              <Legend formatter={v => v === 'ventas' ? 'Ventas' : 'Ganancia'} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="ventas" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ganancia" fill="#c9a84c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Top 5 Productos
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin datos de ventas</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: i === 0 ? '#fef9c3' : '#f5f3ff', color: i === 0 ? '#a07c2a' : '#7c3aed' }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                    <p className="text-xs text-gray-400">{p.product_brand} · {p.total_sold} uds.</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 flex-shrink-0">{formatDOP(p.total_revenue)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sales + Birthdays */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent transactions */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Transacciones Recientes
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSales.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin ventas registradas</p>
            ) : (
              recentSales.map(sale => (
                <div key={sale.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f5f3ff' }}>
                    <DollarSign className="w-5 h-5" style={{ color: '#7c3aed' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{sale.client_name}</p>
                    <p className="text-xs text-gray-400">#{sale.sale_number} · {new Date(sale.created_at).toLocaleDateString('es-DO')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentBadge(sale.payment_method)}`}>
                      {sale.payment_method}
                    </span>
                    <p className="text-sm font-bold text-gray-800">{formatDOP(sale.total)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Birthdays */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-2">
            <Cake className="w-5 h-5" style={{ color: '#c9a84c' }} />
            <h2 className="text-lg font-semibold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Cumpleaños del Mes
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {birthdays.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin cumpleaños este mes</p>
            ) : (
              birthdays.map(b => (
                <div key={b.id} className="px-6 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #c9a84c20, #c9a84c40)', color: '#a07c2a' }}>
                    {b.first_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{b.first_name} {b.last_name} 🎂</p>
                    <p className="text-xs text-gray-400">{b.birthday ? new Date(b.birthday + 'T00:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long' }) : ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
