'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, DollarSign, Trash2, ChevronDown, ChevronRight, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import QuickCreateClient from '@/components/QuickCreateClient'
import QuickCreateProduct from '@/components/QuickCreateProduct'

function formatDOP(n: number) {
  return `DOP $${(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg text-white text-sm font-medium"
      style={{ background: type === 'success' ? '#059669' : '#dc2626', minWidth: 280 }}>
      {type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  )
}

interface Sale {
  id: string
  sale_number: number
  client_id: string
  client_name?: string
  subtotal: number
  discount_amount: number
  total: number
  payment_method: string
  payment_status: string
  notes: string
  created_at: string
}

interface SaleItem {
  product_id: string
  product_name: string
  product_brand: string
  quantity: number
  unit_price: number
  purchase_price: number
  subtotal: number
  profit: number
}

interface Product {
  id: string
  name: string
  brand: string
  selling_price: number
  purchase_price: number
  supplier_shipping_cost: number
  client_shipping_cost: number
  competitor_price: number
  stock_quantity: number
}

interface Client {
  id: string
  first_name: string
  last_name: string
}

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  payment_method: string
  expense_date: string
  created_at: string
}

interface ExpenseItem {
  product_id: string
  quantity: number
  unit_cost: number
}

const InputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
const LabelClass = "block text-xs font-medium text-gray-600 mb-1.5"

const PAYMENT_METHODS = ['Efectivo', 'Tarjeta', 'Transferencia', 'PayPal', 'Azul']
const EXPENSE_CATEGORIES = ['Compras', 'Alquiler', 'Servicios', 'Marketing', 'Suministros', 'Transporte', 'Nómina', 'Mantenimiento', 'Otro']

function paymentBadgeClass(method: string) {
  const map: Record<string, string> = {
    'efectivo': 'bg-green-50 text-green-700', 'Efectivo': 'bg-green-50 text-green-700',
    'tarjeta': 'bg-blue-50 text-blue-700', 'Tarjeta': 'bg-blue-50 text-blue-700',
    'transferencia': 'bg-purple-50 text-purple-700', 'Transferencia': 'bg-purple-50 text-purple-700',
    'paypal': 'bg-yellow-50 text-yellow-700', 'PayPal': 'bg-yellow-50 text-yellow-700',
    'azul': 'bg-cyan-50 text-cyan-700', 'Azul': 'bg-cyan-50 text-cyan-700',
  }
  return map[method] || 'bg-gray-100 text-gray-600'
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    'pagado': 'bg-green-50 text-green-700',
    'pendiente': 'bg-yellow-50 text-yellow-700',
    'cancelado': 'bg-red-50 text-red-700',
  }
  return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600'
}

function categoryBadge(cat: string) {
  const colors: Record<string, string> = {
    'Alquiler': 'bg-red-50 text-red-700',
    'Servicios': 'bg-blue-50 text-blue-700',
    'Marketing': 'bg-pink-50 text-pink-700',
    'Suministros': 'bg-orange-50 text-orange-700',
    'Transporte': 'bg-cyan-50 text-cyan-700',
    'Nómina': 'bg-indigo-50 text-indigo-700',
    'Mantenimiento': 'bg-yellow-50 text-yellow-700',
    'Otro': 'bg-gray-100 text-gray-600',
  }
  return colors[cat] || 'bg-gray-100 text-gray-600'
}

export default function FinancesPage() {
  const [tab, setTab] = useState<'sales' | 'expenses' | 'pl'>('sales')
  const [sales, setSales] = useState<Sale[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Sale detail expansion
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null)
  const [saleItemsCache, setSaleItemsCache] = useState<Record<string, Array<{ product_name: string; product_brand: string; quantity: number; unit_price: number; purchase_price: number; subtotal: number; profit: number }>>>({})

  async function loadSaleItems(saleId: string) {
    if (saleItemsCache[saleId]) return
    const { data } = await supabase.from('sale_items').select('product_name, product_brand, quantity, unit_price, purchase_price, subtotal, profit').eq('sale_id', saleId)
    setSaleItemsCache(prev => ({ ...prev, [saleId]: data || [] }))
  }

  function toggleSaleExpand(saleId: string) {
    if (expandedSaleId === saleId) {
      setExpandedSaleId(null)
    } else {
      setExpandedSaleId(saleId)
      loadSaleItems(saleId)
    }
  }

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterPayment, setFilterPayment] = useState('')

  // Quick-create modals
  const [showQuickClient, setShowQuickClient] = useState(false)
  const [showQuickProduct, setShowQuickProduct] = useState(false)
  const [quickProductIdx, setQuickProductIdx] = useState<number | null>(null)

  // Sale modal
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [saleClient, setSaleClient] = useState('')
  const [salePayment, setSalePayment] = useState('Efectivo')
  const [saleStatus, setSaleStatus] = useState('pagado')
  const [saleDiscount, setSaleDiscount] = useState(0)
  const [saleNotes, setSaleNotes] = useState('')
  const [saleItems, setSaleItems] = useState<Array<{ product_id: string; quantity: number; unit_price: number; purchase_price: number }>>([])
  const [savingSale, setSavingSale] = useState(false)

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [expForm, setExpForm] = useState({ category: '', description: '', amount: 0, payment_method: 'Efectivo', expense_date: new Date().toISOString().slice(0, 10) })
  const [expItems, setExpItems] = useState<ExpenseItem[]>([])
  const [savingExp, setSavingExp] = useState(false)

  // Expense item expansion
  const [expandedExpId, setExpandedExpId] = useState<string | null>(null)
  const [expItemsCache, setExpItemsCache] = useState<Record<string, Array<{ product_name: string; product_brand: string; quantity: number; unit_cost: number; subtotal: number }>>>({})

  // P&L data
  const [plData, setPlData] = useState({ revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0 })
  const [plChart, setPlChart] = useState<Array<{ month: string; ventas: number; gastos: number }>>([])

  // Cash flow overview
  const [cashFlow, setCashFlow] = useState<Array<{ fecha: string; entradas: number; salidas: number }>>([])
  const [cashSummary, setCashSummary] = useState({ entradas: 0, salidas: 0, neto: 0 })

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  async function fetchCashFlow() {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 29)
    const startStr = startDate.toISOString().slice(0, 10)

    const [{ data: salesData }, { data: expData }] = await Promise.all([
      supabase.from('sales').select('total, created_at').gte('created_at', startDate.toISOString()).eq('payment_status', 'pagado'),
      supabase.from('expenses').select('amount, expense_date').gte('expense_date', startStr),
    ])

    const byDay: Record<string, { entradas: number; salidas: number }> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      byDay[d.toISOString().slice(0, 10)] = { entradas: 0, salidas: 0 }
    }
    ;(salesData || []).forEach(s => { const k = s.created_at.slice(0, 10); if (byDay[k]) byDay[k].entradas += s.total || 0 })
    ;(expData || []).forEach(e => { if (byDay[e.expense_date]) byDay[e.expense_date].salidas += e.amount || 0 })

    const sorted = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
    const weekly: Array<{ fecha: string; entradas: number; salidas: number }> = []
    for (let i = 0; i < sorted.length; i += 5) {
      const chunk = sorted.slice(i, i + 5)
      const d = new Date(chunk[0][0])
      weekly.push({
        fecha: `${d.getDate()}/${d.getMonth() + 1}`,
        entradas: Math.round(chunk.reduce((s, [, v]) => s + v.entradas, 0)),
        salidas: Math.round(chunk.reduce((s, [, v]) => s + v.salidas, 0)),
      })
    }
    const totalEntradas = (salesData || []).reduce((s, x) => s + (x.total || 0), 0)
    const totalSalidas = (expData || []).reduce((s, x) => s + (x.amount || 0), 0)
    setCashFlow(weekly)
    setCashSummary({ entradas: totalEntradas, salidas: totalSalidas, neto: totalEntradas - totalSalidas })
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchSales(), fetchExpenses(), fetchProducts(), fetchClients(), fetchCashFlow()])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => { if (tab === 'pl') fetchPL() }, [tab])

  async function fetchSales() {
    const { data: salesData } = await supabase.from('sales').select('*').order('created_at', { ascending: false })
    if (!salesData) { setSales([]); return }
    const clientIds = salesData.map(s => s.client_id).filter(Boolean)
    let clientMap: Record<string, string> = {}
    if (clientIds.length > 0) {
      const { data: cls } = await supabase.from('clients').select('id, first_name, last_name').in('id', clientIds)
      ;(cls || []).forEach(c => { clientMap[c.id] = `${c.first_name} ${c.last_name}` })
    }
    setSales(salesData.map(s => ({ ...s, client_name: clientMap[s.client_id] || 'Anónimo' })))
  }

  async function fetchExpenses() {
    const { data } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false })
    setExpenses(data || [])
  }

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('id, name, brand, selling_price, purchase_price, supplier_shipping_cost, client_shipping_cost, competitor_price, stock_quantity').eq('is_active', true).order('name')
    setProducts(data || [])
  }

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('id, first_name, last_name').order('first_name')
    setClients(data || [])
  }

  async function fetchPL() {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [{ data: monthSales }, { data: monthItems }, { data: monthExpenses }] = await Promise.all([
      supabase.from('sales').select('total').gte('created_at', startOfMonth).eq('payment_status', 'pagado'),
      supabase.from('sale_items').select('profit, purchase_price, quantity, sale_id'),
      supabase.from('expenses').select('amount').gte('expense_date', startOfMonth.slice(0, 10)),
    ])

    const { data: monthSaleIds } = await supabase.from('sales').select('id').gte('created_at', startOfMonth).eq('payment_status', 'pagado')
    const saleIdSet = new Set((monthSaleIds || []).map(s => s.id))

    const revenue = (monthSales || []).reduce((s, x) => s + (x.total || 0), 0)
    const filteredItems = (monthItems || []).filter(i => saleIdSet.has(i.sale_id))
    const cogs = filteredItems.reduce((s, i) => s + ((i.purchase_price || 0) * (i.quantity || 0)), 0)
    const grossProfit = filteredItems.reduce((s, i) => s + (i.profit || 0), 0)
    const totalExpenses = (monthExpenses || []).reduce((s, x) => s + (x.amount || 0), 0)
    const netProfit = grossProfit - totalExpenses

    setPlData({ revenue, cogs, grossProfit, expenses: totalExpenses, netProfit })

    // Last 6 months chart
    const chartData = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
      const [{ data: mSales }, { data: mExps }] = await Promise.all([
        supabase.from('sales').select('total').gte('created_at', start).lte('created_at', end).eq('payment_status', 'pagado'),
        supabase.from('expenses').select('amount').gte('expense_date', start.slice(0, 10)).lte('expense_date', end.slice(0, 10)),
      ])
      chartData.push({
        month: d.toLocaleDateString('es-DO', { month: 'short' }),
        ventas: (mSales || []).reduce((s, x) => s + (x.total || 0), 0),
        gastos: (mExps || []).reduce((s, x) => s + (x.amount || 0), 0),
      })
    }
    setPlChart(chartData)
  }

  async function handleCreateSale() {
    if (saleItems.length === 0) { showToast('Agrega al menos un producto', 'error'); return }
    setSavingSale(true)
    const subtotal = saleItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)
    const total = Math.max(0, subtotal - saleDiscount)
    const { data: saleData, error } = await supabase.from('sales').insert([{
      client_id: saleClient || null,
      subtotal, discount_amount: saleDiscount, total,
      payment_method: salePayment, payment_status: saleStatus, notes: saleNotes,
    }]).select().single()

    if (error || !saleData) { showToast('Error al crear venta', 'error'); setSavingSale(false); return }

    const items = saleItems.map(i => {
      const prod = products.find(p => p.id === i.product_id)
      return {
        sale_id: saleData.id,
        product_id: i.product_id,
        product_name: prod?.name || '',
        product_brand: prod?.brand || '',
        quantity: i.quantity,
        unit_price: i.unit_price,
        purchase_price: i.purchase_price,
        subtotal: i.unit_price * i.quantity,
        // profit is a GENERATED ALWAYS column — do not insert it
      }
    })
    await supabase.from('sale_items').insert(items)

    // Update stock
    for (const item of saleItems) {
      const prod = products.find(p => p.id === item.product_id)
      if (prod) {
        await supabase.from('products').update({ stock_quantity: Math.max(0, prod.stock_quantity - item.quantity) }).eq('id', item.product_id)
      }
    }

    // Update client totals + loyalty points
    if (saleClient) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('total_purchases, purchase_count, loyalty_points, first_name, last_name')
        .eq('id', saleClient)
        .single()
      if (clientData) {
        const pointsEarned = Math.floor(total / 10)  // 1 point per DOP $10 spent
        const oldPoints = clientData.loyalty_points || 0
        const newPoints = oldPoints + pointsEarned

        await supabase.from('clients').update({
          total_purchases: (clientData.total_purchases || 0) + total,
          purchase_count: (clientData.purchase_count || 0) + 1,
          loyalty_points: newPoints,
        }).eq('id', saleClient)

        // Check if client crossed any loyalty tier threshold
        const TIERS = [
          { points: 250,  reward: '5% descuento en su próxima compra' },
          { points: 500,  reward: '10% descuento en su próxima compra' },
          { points: 1000, reward: 'Muestra gratis de perfume + 15% de descuento' },
          { points: 2500, reward: 'Perfume de regalo valorado hasta DOP $2,000' },
          { points: 5000, reward: 'Status VIP + perfume premium de regalo (hasta DOP $5,000)' },
        ]
        const clientName = `${clientData.first_name} ${clientData.last_name}`
        for (const tier of TIERS) {
          if (oldPoints < tier.points && newPoints >= tier.points) {
            await supabase.from('loyalty_notifications').insert([{
              client_id: saleClient,
              client_name: clientName,
              points_reached: tier.points,
              reward_label: tier.reward,
            }])
          }
        }
      }
    }

    showToast('Venta registrada correctamente', 'success')
    setShowSaleModal(false)
    setSaleItems([])
    setSaleClient('')
    setSaleDiscount(0)
    setSaleNotes('')
    await Promise.all([fetchSales(), fetchCashFlow()])
    setSavingSale(false)
  }

  function addExpItem() {
    setExpItems(items => [...items, { product_id: '', quantity: 1, unit_cost: 0 }])
  }

  function updateExpItem(idx: number, field: string, value: string | number) {
    setExpItems(items => items.map((item, i) => {
      if (i !== idx) return item
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value)
        return { ...item, product_id: value as string, unit_cost: prod?.purchase_price || 0 }
      }
      return { ...item, [field]: value }
    }))
  }

  function removeExpItem(idx: number) {
    setExpItems(items => items.filter((_, i) => i !== idx))
  }

  const expItemsTotal = expItems.reduce((s, i) => s + (i.quantity * i.unit_cost), 0)

  async function loadExpItems(expenseId: string) {
    if (expItemsCache[expenseId]) return
    const { data } = await supabase
      .from('expense_items')
      .select('product_name, product_brand, quantity, unit_cost, subtotal')
      .eq('expense_id', expenseId)
    setExpItemsCache(prev => ({ ...prev, [expenseId]: data || [] }))
  }

  function toggleExpExpand(expenseId: string) {
    if (expandedExpId === expenseId) {
      setExpandedExpId(null)
    } else {
      setExpandedExpId(expenseId)
      loadExpItems(expenseId)
    }
  }

  async function handleCreateExpense() {
    if (!expForm.category) { showToast('La categoría es requerida', 'error'); return }
    const isCompra = expForm.category === 'Compras'
    const amount = isCompra ? expItemsTotal : Number(expForm.amount)
    if (!amount) { showToast('El monto no puede ser cero', 'error'); return }
    if (isCompra && expItems.some(i => !i.product_id)) { showToast('Selecciona un producto en cada fila', 'error'); return }

    setSavingExp(true)
    const { data: expData, error } = await supabase
      .from('expenses')
      .insert([{ ...expForm, amount }])
      .select()
      .single()

    if (error || !expData) { showToast('Error al crear gasto', 'error'); setSavingExp(false); return }

    if (isCompra && expItems.length > 0) {
      const rows = expItems.map(i => {
        const prod = products.find(p => p.id === i.product_id)
        return {
          expense_id: expData.id,
          product_id: i.product_id,
          product_name: prod?.name || '',
          product_brand: prod?.brand || '',
          quantity: i.quantity,
          unit_cost: i.unit_cost,
        }
      })
      await supabase.from('expense_items').insert(rows)

      // Update stock for each product
      for (const item of expItems) {
        const prod = products.find(p => p.id === item.product_id)
        if (prod && item.quantity > 0) {
          await supabase
            .from('products')
            .update({ stock_quantity: prod.stock_quantity + item.quantity })
            .eq('id', item.product_id)
        }
      }
    }

    showToast('Gasto registrado', 'success')
    setShowExpenseForm(false)
    setExpForm({ category: '', description: '', amount: 0, payment_method: 'Efectivo', expense_date: new Date().toISOString().slice(0, 10) })
    setExpItems([])
    fetchExpenses()
    fetchCashFlow()
    setSavingExp(false)
  }

  async function handleDeleteExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id)
    showToast('Gasto eliminado', 'success')
    fetchExpenses()
  }

  function addSaleItem() {
    setSaleItems(items => [...items, { product_id: '', quantity: 1, unit_price: 0, purchase_price: 0 }])
  }

  function updateSaleItem(idx: number, field: string, value: string | number) {
    setSaleItems(items => items.map((item, i) => {
      if (i !== idx) return item
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value)
        return { ...item, product_id: value as string, unit_price: prod?.selling_price || 0, purchase_price: prod?.purchase_price || 0 }
      }
      return { ...item, [field]: value }
    }))
  }

  const filteredSales = sales.filter(s => {
    const matchPayment = !filterPayment || s.payment_method?.toLowerCase() === filterPayment.toLowerCase()
    const matchFrom = !dateFrom || s.created_at.slice(0, 10) >= dateFrom
    const matchTo = !dateTo || s.created_at.slice(0, 10) <= dateTo
    return matchPayment && matchFrom && matchTo
  })

  const saleTotal = saleItems.reduce((s, i) => s + (i.unit_price * i.quantity), 0)
  const saleFinal = Math.max(0, saleTotal - saleDiscount)

  function suggestedSalePrice(productId: string): number {
    const prod = products.find(p => p.id === productId)
    if (!prod) return 0
    const trueCost = prod.purchase_price + (prod.supplier_shipping_cost || 0) + (prod.client_shipping_cost || 0)
    if (prod.competitor_price > 0) return Math.round(Math.max(prod.competitor_price * 0.9, trueCost * 1.3))
    return Math.round(trueCost * 2)
  }

  const tabs = [
    { key: 'sales', label: 'Ventas' },
    { key: 'expenses', label: 'Gastos' },
    { key: 'pl', label: 'P&L' },
  ]

  return (
    <div className="p-6 lg:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Finanzas
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Gestión de ventas, gastos y rentabilidad</p>
      </div>

      {/* Cash Flow Overview */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-6">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Flujo de Caja — Últimos 30 días</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary cards */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#f0fdf4' }}>
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Entradas</p>
                <p className="text-lg font-bold text-green-600">{formatDOP(cashSummary.entradas)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#fef2f2' }}>
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <ArrowDownCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Salidas</p>
                <p className="text-lg font-bold text-red-500">{formatDOP(cashSummary.salidas)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: cashSummary.neto >= 0 ? '#f5f3ff' : '#fef2f2' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: cashSummary.neto >= 0 ? '#e9d5ff' : '#fee2e2' }}>
                <DollarSign className={`w-5 h-5 ${cashSummary.neto >= 0 ? 'text-purple-600' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Resultado neto</p>
                <p className={`text-lg font-bold ${cashSummary.neto >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                  {cashSummary.neto >= 0 ? '+' : ''}{formatDOP(cashSummary.neto)}
                </p>
              </div>
            </div>
          </div>

          {/* Area chart */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={cashFlow} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSalidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatDOP(value), name === 'entradas' ? 'Entradas' : 'Salidas']}
                  contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Area type="monotone" dataKey="entradas" stroke="#059669" strokeWidth={2} fill="url(#gradEntradas)" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="salidas" stroke="#dc2626" strokeWidth={2} fill="url(#gradSalidas)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 justify-end mt-1">
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded bg-green-500" /><span className="text-xs text-gray-400">Entradas</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded bg-red-500" /><span className="text-xs text-gray-400">Salidas</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white shadow-card border border-gray-100 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : 'transparent',
              color: tab === t.key ? 'white' : '#6b7280',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* SALES TAB */}
      {tab === 'sales' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className={LabelClass}>Desde</label>
                <input type="date" className={InputClass + ' w-auto'} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className={LabelClass}>Hasta</label>
                <input type="date" className={InputClass + ' w-auto'} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <div>
                <label className={LabelClass}>Método de pago</label>
                <select className={InputClass + ' w-auto'} value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
                  <option value="">Todos</option>
                  {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              {(dateFrom || dateTo || filterPayment) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); setFilterPayment('') }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-1.5">
                  <X className="w-4 h-4" /> Limpiar
                </button>
              )}
              <button onClick={() => setShowSaleModal(true)}
                className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                <Plus className="w-4 h-4" /> Nueva Venta
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <svg className="w-8 h-8 animate-spin" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: '#faf9ff' }}>
                      <th className="px-3 py-4 w-8"></th>
                      {['#Venta', 'Cliente', 'Total', 'Descuento', 'Método', 'Estado', 'Fecha'].map(h => (
                        <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-16">
                          <DollarSign className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                          <p className="text-gray-400 text-sm font-medium">Sin ventas registradas</p>
                          <p className="text-gray-400 text-xs mt-1">Presiona <strong>Nueva Venta</strong> para registrar una venta con los productos del inventario</p>
                        </td>
                      </tr>
                    ) : filteredSales.map(s => (
                      <>
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleSaleExpand(s.id)}>
                          <td className="px-3 py-4 text-gray-400">
                            {expandedSaleId === s.id
                              ? <ChevronDown className="w-4 h-4" />
                              : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold" style={{ color: '#7c3aed' }}>#{s.sale_number}</td>
                          <td className="px-5 py-4 text-sm text-gray-700">{s.client_name}</td>
                          <td className="px-5 py-4 text-sm font-bold text-gray-800">{formatDOP(s.total)}</td>
                          <td className="px-5 py-4 text-sm text-gray-500">{s.discount_amount > 0 ? formatDOP(s.discount_amount) : '—'}</td>
                          <td className="px-5 py-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentBadgeClass(s.payment_method)}`}>{s.payment_method}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusBadge(s.payment_status)}`}>{s.payment_status}</span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">{new Date(s.created_at).toLocaleDateString('es-DO')}</td>
                        </tr>
                        {expandedSaleId === s.id && (
                          <tr key={`${s.id}-detail`}>
                            <td colSpan={8} className="px-0 py-0">
                              <div className="mx-6 mb-4 rounded-xl overflow-hidden border border-purple-100" style={{ background: '#faf9ff' }}>
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-purple-100">
                                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Producto</th>
                                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Cant.</th>
                                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">P. Compra</th>
                                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">P. Venta</th>
                                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Subtotal</th>
                                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">Ganancia</th>
                                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-purple-600">Margen</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(saleItemsCache[s.id] || []).map((item, i) => {
                                      const margin = item.unit_price > 0 ? ((item.profit / (item.unit_price * item.quantity)) * 100).toFixed(1) : '0'
                                      return (
                                        <tr key={i} className="border-b border-purple-50 last:border-0">
                                          <td className="px-4 py-2.5">
                                            <p className="font-medium text-gray-800">{item.product_name}</p>
                                            <p className="text-xs text-gray-400">{item.product_brand}</p>
                                          </td>
                                          <td className="px-4 py-2.5 text-right text-gray-600">{item.quantity}</td>
                                          <td className="px-4 py-2.5 text-right text-gray-500">{formatDOP(item.purchase_price)}</td>
                                          <td className="px-4 py-2.5 text-right text-gray-700">{formatDOP(item.unit_price)}</td>
                                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">{formatDOP(item.subtotal)}</td>
                                          <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{formatDOP(item.profit)}</td>
                                          <td className="px-4 py-2.5 text-right">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{margin}%</span>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                    {!saleItemsCache[s.id] && (
                                      <tr><td colSpan={7} className="px-4 py-3 text-center text-gray-400 text-xs">Cargando...</td></tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {tab === 'expenses' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button onClick={() => setShowExpenseForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
              <Plus className="w-4 h-4" /> Nuevo Gasto
            </button>
          </div>

          {showExpenseForm && (
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Registrar Gasto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={LabelClass}>Categoría *</label>
                  <select className={InputClass} value={expForm.category} onChange={e => {
                    setExpForm(f => ({ ...f, category: e.target.value }))
                    if (e.target.value !== 'Compras') setExpItems([])
                  }}>
                    <option value="">Seleccionar</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Descripción</label>
                  <input className={InputClass} value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción del gasto" />
                </div>
                {expForm.category !== 'Compras' && (
                  <div>
                    <label className={LabelClass}>Monto (DOP) *</label>
                    <input type="number" className={InputClass} value={expForm.amount || ''} onChange={e => setExpForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                  </div>
                )}
                <div>
                  <label className={LabelClass}>Método de pago</label>
                  <select className={InputClass} value={expForm.payment_method} onChange={e => setExpForm(f => ({ ...f, payment_method: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Fecha</label>
                  <input type="date" className={InputClass} value={expForm.expense_date} onChange={e => setExpForm(f => ({ ...f, expense_date: e.target.value }))} />
                </div>
              </div>

              {/* Products section for Compras */}
              {expForm.category === 'Compras' && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Productos comprados</p>
                    <button onClick={addExpItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                      <Plus className="w-3.5 h-3.5" /> Agregar producto
                    </button>
                  </div>

                  {expItems.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center text-gray-400 text-sm">
                      Agrega los productos que compraste — el monto total se calculará automáticamente
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background: '#faf9ff' }}>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Producto</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-24">Cant.</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-36">Costo unit. (DOP)</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 w-32">Subtotal</th>
                            <th className="px-4 py-2.5 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {expItems.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2">
                                <select className={InputClass} value={item.product_id} onChange={e => updateExpItem(idx, 'product_id', e.target.value)}>
                                  <option value="">Seleccionar producto</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.brand} — {p.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <input type="number" min={1} className={InputClass + ' text-right'} value={item.quantity} onChange={e => updateExpItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                              </td>
                              <td className="px-4 py-2">
                                <input type="number" min={0} className={InputClass + ' text-right'} value={item.unit_cost || ''} onChange={e => updateExpItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)} placeholder="0" />
                              </td>
                              <td className="px-4 py-2 text-right font-semibold text-gray-700">
                                {formatDOP(item.quantity * item.unit_cost)}
                              </td>
                              <td className="px-4 py-2">
                                <button onClick={() => removeExpItem(idx)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#faf9ff' }}>
                            <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Total compra:</td>
                            <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: '#7c3aed' }}>{formatDOP(expItemsTotal)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">El stock de cada producto se actualizará automáticamente al guardar</p>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button onClick={() => { setShowExpenseForm(false); setExpItems([]) }} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button onClick={handleCreateExpense} disabled={savingExp}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', opacity: savingExp ? 0.7 : 1 }}>
                  {savingExp ? 'Guardando...' : `Registrar Gasto${expForm.category === 'Compras' && expItemsTotal > 0 ? ` — ${formatDOP(expItemsTotal)}` : ''}`}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#faf9ff' }}>
                    <th className="px-3 py-4 w-8"></th>
                    {['Categoría', 'Descripción', 'Monto', 'Método', 'Fecha', ''].map(h => (
                      <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {expenses.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">Sin gastos registrados</td></tr>
                  ) : expenses.map(e => (
                    <>
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-4 text-gray-400">
                          {e.category === 'Compras' ? (
                            <button onClick={() => toggleExpExpand(e.id)}>
                              {expandedExpId === e.id
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRight className="w-4 h-4" />}
                            </button>
                          ) : <span className="w-4 h-4 block" />}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryBadge(e.category)}`}>{e.category}</span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700">{e.description || '—'}</td>
                        <td className="px-5 py-4 text-sm font-bold text-red-600">{formatDOP(e.amount)}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentBadgeClass(e.payment_method)}`}>{e.payment_method}</span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{e.expense_date}</td>
                        <td className="px-5 py-4">
                          <button onClick={() => handleDeleteExpense(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {expandedExpId === e.id && (
                        <tr key={`${e.id}-detail`}>
                          <td colSpan={7} className="px-0 py-0">
                            <div className="mx-6 mb-4 rounded-xl overflow-hidden border border-orange-100" style={{ background: '#fffbeb' }}>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-orange-100">
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Producto</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Cant.</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Costo unit.</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {expItemsCache[e.id] === undefined ? (
                                    <tr><td colSpan={4} className="px-4 py-3 text-center text-gray-400 text-xs">Cargando...</td></tr>
                                  ) : expItemsCache[e.id].length === 0 ? (
                                    <tr><td colSpan={4} className="px-4 py-3 text-center text-gray-400 text-xs">Sin productos vinculados</td></tr>
                                  ) : expItemsCache[e.id].map((item, i) => (
                                    <tr key={i} className="border-b border-orange-50 last:border-0">
                                      <td className="px-4 py-2.5">
                                        <p className="font-medium text-gray-800">{item.product_name}</p>
                                        <p className="text-xs text-gray-400">{item.product_brand}</p>
                                      </td>
                                      <td className="px-4 py-2.5 text-right text-gray-600">{item.quantity}</td>
                                      <td className="px-4 py-2.5 text-right text-gray-600">{formatDOP(item.unit_cost)}</td>
                                      <td className="px-4 py-2.5 text-right font-semibold text-gray-800">{formatDOP(item.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* P&L TAB */}
      {tab === 'pl' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Ingresos', value: plData.revenue, color: '#7c3aed', icon: <DollarSign className="w-5 h-5" />, bg: '#f5f3ff' },
              { label: 'Costo de Ventas', value: plData.cogs, color: '#dc2626', icon: <TrendingDown className="w-5 h-5" />, bg: '#fef2f2' },
              { label: 'Ganancia Bruta', value: plData.grossProfit, color: '#059669', icon: <TrendingUp className="w-5 h-5" />, bg: '#f0fdf4' },
              { label: 'Gastos Operativos', value: plData.expenses, color: '#d97706', icon: <TrendingDown className="w-5 h-5" />, bg: '#fffbeb' },
              { label: 'Utilidad Neta', value: plData.netProfit, color: plData.netProfit >= 0 ? '#059669' : '#dc2626', icon: <DollarSign className="w-5 h-5" />, bg: plData.netProfit >= 0 ? '#f0fdf4' : '#fef2f2' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-card border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.bg, color: card.color }}>{card.icon}</div>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
                <p className="text-xl font-bold" style={{ color: card.color, fontFamily: 'Montserrat, sans-serif' }}>{formatDOP(card.value)}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Ventas vs Gastos — Últimos 6 meses
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={plChart} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(v: number, n: string) => [formatDOP(v), n === 'ventas' ? 'Ventas' : 'Gastos']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
                <Legend formatter={v => v === 'ventas' ? 'Ventas' : 'Gastos'} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="ventas" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Resumen del Mes
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Ingresos totales', value: plData.revenue, positive: true },
                { label: 'Menos: Costo de ventas', value: -plData.cogs, positive: false },
                { label: 'Ganancia bruta', value: plData.grossProfit, positive: plData.grossProfit >= 0, bold: true },
                { label: 'Menos: Gastos operativos', value: -plData.expenses, positive: false },
                { label: 'Utilidad neta', value: plData.netProfit, positive: plData.netProfit >= 0, bold: true, large: true },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between items-center py-2.5 ${i === 4 ? 'border-t-2 border-gray-200 mt-2 pt-4' : 'border-b border-gray-50'}`}>
                  <span className={`text-sm ${row.bold ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{row.label}</span>
                  <span className={`font-bold ${row.large ? 'text-lg' : 'text-sm'}`}
                    style={{ color: row.positive ? (row.value >= 0 ? '#059669' : '#dc2626') : '#dc2626' }}>
                    {row.value < 0 ? `-${formatDOP(Math.abs(row.value))}` : formatDOP(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>Nueva Venta</h2>
              <button onClick={() => { setShowSaleModal(false); setSaleItems([]) }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LabelClass}>Cliente</label>
                  <div className="flex gap-1.5">
                    <select className={InputClass} value={saleClient} onChange={e => setSaleClient(e.target.value)}>
                      <option value="">Cliente anónimo</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowQuickClient(true)}
                      title="Crear nuevo cliente"
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={LabelClass}>Método de pago</label>
                  <select className={InputClass} value={salePayment} onChange={e => setSalePayment(e.target.value)}>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Estado</label>
                  <select className={InputClass} value={saleStatus} onChange={e => setSaleStatus(e.target.value)}>
                    <option value="pagado">Pagado</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Descuento (DOP)</label>
                  <input type="number" className={InputClass} value={saleDiscount || ''} onChange={e => setSaleDiscount(parseFloat(e.target.value) || 0)} placeholder="0" />
                </div>
              </div>

              {/* Products */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">Productos</label>
                  <button onClick={addSaleItem} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
                <div className="space-y-3">
                  {saleItems.map((item, idx) => {
                    const suggested = item.product_id ? suggestedSalePrice(item.product_id) : 0
                    return (
                      <div key={idx} className="p-3 rounded-xl space-y-2" style={{ background: '#faf9ff', border: '1px solid #e9d5ff' }}>
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5 flex gap-1">
                            <select className={InputClass} value={item.product_id} onChange={e => updateSaleItem(idx, 'product_id', e.target.value)}>
                              <option value="">Seleccionar producto</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name} — {p.brand}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => { setQuickProductIdx(idx); setShowQuickProduct(true) }}
                              title="Crear nuevo producto"
                              className="flex-shrink-0 w-8 h-9 flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="col-span-2">
                            <input type="number" className={InputClass} value={item.quantity} min={1} onChange={e => updateSaleItem(idx, 'quantity', parseInt(e.target.value) || 1)} placeholder="Cant." />
                          </div>
                          <div className="col-span-3">
                            <input type="number" className={InputClass} value={item.unit_price || ''} onChange={e => updateSaleItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} placeholder="Precio" />
                          </div>
                          <div className="col-span-1 text-xs text-gray-500 text-center">{formatDOP(item.unit_price * item.quantity)}</div>
                          <div className="col-span-1">
                            <button onClick={() => setSaleItems(items => items.filter((_, i) => i !== idx))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {item.product_id && suggested > 0 && (
                          <div className="flex items-center gap-2 pl-1">
                            <span className="text-xs text-gray-400">Precio sugerido:</span>
                            <button
                              onClick={() => updateSaleItem(idx, 'unit_price', suggested)}
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
                              style={{ background: '#ede9fe', color: '#7c3aed' }}
                              title="Aplicar precio sugerido"
                            >
                              {formatDOP(suggested)} — aplicar ↑
                            </button>
                            {(() => {
                              const prod = products.find(p => p.id === item.product_id)
                              const trueCost = (prod?.purchase_price || 0) + (prod?.supplier_shipping_cost || 0) + (prod?.client_shipping_cost || 0)
                              const margin = suggested > 0 ? Math.round(((suggested - trueCost) / suggested) * 100) : 0
                              return <span className="text-xs text-gray-400">Margen estimado: {margin}%</span>
                            })()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {saleItems.length === 0 && (
                    <div className="text-center py-6 rounded-xl text-gray-400 text-sm" style={{ border: '2px dashed #e9d5ff' }}>
                      Agrega productos a la venta
                    </div>
                  )}
                </div>
              </div>

              {saleItems.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatDOP(saleTotal)}</span>
                  </div>
                  {saleDiscount > 0 && (
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Descuento</span>
                      <span className="text-red-500">-{formatDOP(saleDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t border-purple-200 pt-2 mt-2">
                    <span style={{ color: '#7c3aed' }}>Total</span>
                    <span style={{ color: '#7c3aed' }}>{formatDOP(saleFinal)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className={LabelClass}>Notas</label>
                <textarea className={InputClass + ' min-h-[60px] resize-none'} value={saleNotes} onChange={e => setSaleNotes(e.target.value)} placeholder="Observaciones de la venta..." />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => { setShowSaleModal(false); setSaleItems([]) }} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600">Cancelar</button>
              <button onClick={handleCreateSale} disabled={savingSale}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', opacity: savingSale ? 0.7 : 1 }}>
                {savingSale ? 'Registrando...' : 'Registrar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuickClient && (
        <QuickCreateClient
          onCreated={(id, label) => {
            const parts = label.split(' ')
            setClients(prev => [...prev, { id, first_name: parts[0], last_name: parts.slice(1).join(' ') }])
            setSaleClient(id)
            setShowQuickClient(false)
          }}
          onClose={() => setShowQuickClient(false)}
        />
      )}

      {showQuickProduct && quickProductIdx !== null && (
        <QuickCreateProduct
          onCreated={(id, label, sellingPrice, purchasePrice) => {
            const [name, brand] = label.split(' — ')
            setProducts(prev => [...prev, { id, name, brand: brand || '', selling_price: sellingPrice, purchase_price: purchasePrice, supplier_shipping_cost: 0, client_shipping_cost: 0, competitor_price: 0, stock_quantity: 0 }])
            updateSaleItem(quickProductIdx, 'product_id', id)
            setShowQuickProduct(false)
            setQuickProductIdx(null)
          }}
          onClose={() => { setShowQuickProduct(false); setQuickProductIdx(null) }}
        />
      )}
    </div>
  )
}
