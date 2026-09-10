'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Search, X, AlertTriangle, CheckCircle, Package, ShoppingBag,
  ChevronLeft, ChevronRight, Edit2, Plus, Lightbulb, RefreshCw,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import QuickCreateSupplier from '@/components/QuickCreateSupplier'

interface Product {
  id: string
  name: string
  brand: string
  sku: string
  category: string
  concentration: string
  size_ml: number
  gender: string
  fragrance_family: string
  top_notes: string
  heart_notes: string
  base_notes: string
  supplier_id: string
  purchase_price: number
  supplier_shipping_cost: number
  client_shipping_cost: number
  competitor_price: number
  selling_price: number
  stock_quantity: number
  min_stock_alert: number
  is_active: boolean
}

interface Supplier { id: string; name: string }

function formatDOP(amount: number) {
  return `DOP $${(amount || 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function suggestedPrice(purchase: number, supplierShipping: number, clientShipping: number, competitor: number) {
  if (purchase <= 0) return 0
  const trueCost = purchase + supplierShipping + clientShipping
  if (competitor > 0) return Math.round(Math.max(competitor * 0.9, trueCost * 1.3))
  return Math.round(trueCost * 2)
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

const emptyForm: Omit<Product, 'id'> = {
  name: '', brand: '', sku: '', category: '', concentration: '', size_ml: 0,
  gender: '', fragrance_family: '', top_notes: '', heart_notes: '', base_notes: '',
  supplier_id: '', purchase_price: 0, supplier_shipping_cost: 0, client_shipping_cost: 0,
  competitor_price: 0, selling_price: 0, stock_quantity: 0, min_stock_alert: 5, is_active: true,
}

const InputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
const LabelClass = "block text-xs font-medium text-gray-600 mb-1.5"
const PAGE_SIZE = 12

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productSuppliers, setProductSuppliers] = useState<Record<string, Array<{ supplier_id: string; name: string; is_primary: boolean }>>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Edit modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Omit<Product, 'id'>>(emptyForm)
  const [formSuppliers, setFormSuppliers] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [showQuickSupplier, setShowQuickSupplier] = useState(false)

  const router = useRouter()
  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })
  const suggested = suggestedPrice(form.purchase_price, form.supplier_shipping_cost, form.client_shipping_cost, form.competitor_price)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, { data: supps }, { data: prodSupps }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('suppliers').select('id, name').order('name'),
      supabase.from('product_suppliers').select('product_id, supplier_id, is_primary, suppliers(name)'),
    ])
    setProducts(prods || [])
    setSuppliers(supps || [])

    const map: Record<string, Array<{ supplier_id: string; name: string; is_primary: boolean }>> = {}
    for (const row of (prodSupps || []) as unknown as Array<{ product_id: string; supplier_id: string; is_primary: boolean; suppliers: { name: string } | null }>) {
      if (!map[row.product_id]) map[row.product_id] = []
      map[row.product_id].push({ supplier_id: row.supplier_id, name: row.suppliers?.name || '', is_primary: row.is_primary })
    }
    setProductSuppliers(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function openEdit(p: Product) {
    setEditing(p)
    const { id, ...rest } = p
    setForm(rest)
    const existing = productSuppliers[p.id] || []
    const sorted = [...existing].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    setFormSuppliers(sorted.map(s => s.supplier_id))
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(emptyForm)
    setFormSuppliers([])
  }

  async function handleSave() {
    if (!form.name || !form.brand) { showToast('Nombre y marca son requeridos', 'error'); return }
    setSaving(true)

    const primarySupplierId = formSuppliers[0] || null
    const payload = {
      ...form,
      sku: form.sku || null,
      supplier_id: primarySupplierId,
      size_ml: Number(form.size_ml) || null,
      purchase_price: Number(form.purchase_price),
      competitor_price: Number(form.competitor_price) || 0,
      supplier_shipping_cost: Number(form.supplier_shipping_cost) || 0,
      client_shipping_cost: Number(form.client_shipping_cost) || 0,
      selling_price: Number(form.selling_price) || suggested,
      stock_quantity: Number(form.stock_quantity),
      min_stock_alert: Number(form.min_stock_alert),
    }

    const { error } = await supabase.from('products').update(payload).eq('id', editing!.id)
    if (error) { showToast('Error al actualizar producto', 'error'); setSaving(false); return }

    // Sync product_suppliers
    await supabase.from('product_suppliers').delete().eq('product_id', editing!.id)
    if (formSuppliers.length > 0) {
      await supabase.from('product_suppliers').insert(
        formSuppliers.map((sid, idx) => ({ product_id: editing!.id, supplier_id: sid, is_primary: idx === 0 }))
      )
    }

    showToast('Producto actualizado correctamente', 'success')
    closeModal()
    fetchData()
    setSaving(false)
  }

  const filtered = products.filter(p => {
    const q = searchQuery.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    const matchG = !filterGender || p.gender === filterGender
    const matchC = !filterCategory || p.category === filterCategory
    return matchQ && matchG && matchC
  })

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)))
  const genders = Array.from(new Set(products.map(p => p.gender).filter(Boolean)))

  const inStock = filtered.filter(p => p.is_active && p.stock_quantity > 0)
  const outOfStock = filtered.filter(p => !p.is_active || p.stock_quantity === 0)
  const totalPages = Math.ceil(inStock.length / PAGE_SIZE)
  const pagedInStock = inStock.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function ProductCard({ p }: { p: Product }) {
    const stock = p.stock_quantity
    const min = p.min_stock_alert || 0
    const stockColor = stock === 0 ? 'text-red-600 bg-red-50 border-red-200'
      : stock <= min ? 'text-red-600 bg-red-50 border-red-200'
      : stock <= min * 2 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
      : 'text-green-600 bg-green-50 border-green-200'
    const cardSuppliers = productSuppliers[p.id] || []
    const primarySupplier = cardSuppliers.find(s => s.is_primary) || cardSuppliers[0]
    const altCount = cardSuppliers.length - 1
    const margin = p.selling_price && p.purchase_price
      ? (((p.selling_price - p.purchase_price) / p.selling_price) * 100).toFixed(1)
      : null

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${stockColor}`}>
            {stock <= min && stock > 0 && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {stock === 0 ? 'Sin stock' : `${stock} uds.`}
          </span>
          {p.category && <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-100">{p.category}</span>}
          {p.gender && <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{p.gender}</span>}
        </div>

        <div>
          <h3 className="font-bold text-gray-800 text-base leading-tight">{p.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {p.brand}{p.size_ml ? ` · ${p.size_ml}ml` : ''}{p.concentration ? ` · ${p.concentration}` : ''}
          </p>
          {p.sku && <p className="text-xs text-gray-400 mt-1">SKU: {p.sku}</p>}
        </div>

        {cardSuppliers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {primarySupplier && <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-blue-50 text-blue-700 border border-blue-100">{primarySupplier.name}</span>}
            {altCount > 0 && <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-gray-100 text-gray-500">+{altCount} alt.</span>}
          </div>
        )}

        {(p.purchase_price > 0 || p.selling_price > 0) && (
          <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
            <div><span className="text-gray-400">Costo </span><span className="font-semibold text-gray-700">{formatDOP(p.purchase_price)}</span></div>
            <div className="w-px h-4 bg-gray-200" />
            <div><span className="text-gray-400">Venta </span><span className="font-semibold text-gray-700">{formatDOP(p.selling_price)}</span></div>
            {margin && <><div className="w-px h-4 bg-gray-200" /><span className="font-semibold" style={{ color: '#059669' }}>{margin}%</span></>}
          </div>
        )}

        {min > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Stock</span><span>Mín. {min}</span></div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${stock === 0 ? 'bg-red-400' : stock <= min ? 'bg-red-400' : stock <= min * 2 ? 'bg-yellow-400' : 'bg-green-400'}`}
                style={{ width: `${Math.min(100, (stock / Math.max(stock, min * 3)) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
          <button onClick={() => router.push('/dashboard/finances')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <ShoppingBag className="w-3.5 h-3.5" /> Registrar venta
          </button>
          <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors" title="Editar">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>Inventario</h1>
        <p className="text-gray-500 mt-1 text-sm">{products.length} productos registrados</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: products.length, color: '#7c3aed' },
          { label: 'Con stock', value: products.filter(p => p.is_active && p.stock_quantity > 0).length, color: '#059669' },
          { label: 'Stock bajo', value: products.filter(p => p.is_active && p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert).length, color: '#d97706' },
          { label: 'Sin stock', value: products.filter(p => !p.is_active || p.stock_quantity === 0).length, color: '#dc2626' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-card">
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Buscar por nombre, marca o SKU..." value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100" />
          </div>
          <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setCurrentPage(1) }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 bg-white text-gray-700">
            <option value="">Todos los géneros</option>
            {genders.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1) }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 bg-white text-gray-700">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(searchQuery || filterGender || filterCategory) && (
            <button onClick={() => { setSearchQuery(''); setFilterGender(''); setFilterCategory(''); setCurrentPage(1) }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
              <X className="w-4 h-4" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="w-8 h-8 animate-spin" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-bold text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Con Stock</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">{inStock.length}</span>
            </div>
            {inStock.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-400 text-sm">No hay productos con stock disponible</p>
                <p className="mt-1 text-xs text-gray-400">Agrega productos desde <strong>Lista de Compras</strong></p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pagedInStock.map(p => <ProductCard key={p.id} p={p} />)}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button onClick={() => setCurrentPage(pg => Math.max(1, pg - 1))} disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(pg => Math.min(totalPages, pg + 1))} disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </>
            )}
          </div>

          {outOfStock.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-bold text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>Sin Stock / Inactivos</h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{outOfStock.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-75">
                {outOfStock.map(p => <ProductCard key={p.id} p={p} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>Editar Producto</h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LabelClass}>Nombre *</label>
                  <input className={InputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={LabelClass}>Marca *</label>
                  <input className={InputClass} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                </div>
                <div>
                  <label className={LabelClass}>SKU</label>
                  <div className="flex gap-1.5">
                    <input className={InputClass} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Ej. TF-BO-100" />
                    <button type="button" title="Regenerar SKU"
                      onClick={() => {
                        const b = form.brand.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 3)
                        const n = form.name.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 3)
                        setForm(f => ({ ...f, sku: `${b}-${n}-${f.size_ml || 0}` }))
                      }}
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Suppliers */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={LabelClass} style={{ margin: 0 }}>Proveedores</label>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setShowQuickSupplier(true)}
                        className="text-xs px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Nuevo proveedor
                      </button>
                      {formSuppliers.length < suppliers.length && (
                        <button type="button" onClick={() => setFormSuppliers(f => [...f, ''])}
                          className="text-xs px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Agregar proveedor
                        </button>
                      )}
                    </div>
                  </div>
                  {formSuppliers.length === 0 ? (
                    <div onClick={() => setFormSuppliers([''])}
                      className="rounded-lg border-2 border-dashed border-gray-200 py-3 px-4 text-xs text-gray-400 text-center cursor-pointer hover:border-purple-300 hover:text-purple-400 transition-colors">
                      Sin proveedores — click para agregar
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formSuppliers.map((sid, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md"
                            style={{ background: idx === 0 ? '#dbeafe' : '#f3f4f6', color: idx === 0 ? '#1d4ed8' : '#6b7280' }}>
                            {idx === 0 ? 'Principal' : `Alt. ${idx}`}
                          </span>
                          <select className={InputClass} value={sid}
                            onChange={e => setFormSuppliers(f => f.map((v, i) => i === idx ? e.target.value : v))}>
                            <option value="">Seleccionar proveedor</option>
                            {suppliers.filter(s => s.id === sid || !formSuppliers.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <button type="button" onClick={() => setFormSuppliers(f => f.filter((_, i) => i !== idx))}
                            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {formSuppliers.length > 0 && <p className="text-xs text-gray-400 mt-1.5">El primero de la lista es el proveedor principal</p>}
                </div>
              </div>

              {/* Fragrance details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={LabelClass}>Categoría</label>
                  <input className={InputClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ej. Eau de Parfum" />
                </div>
                <div>
                  <label className={LabelClass}>Concentración</label>
                  <select className={InputClass} value={form.concentration} onChange={e => setForm(f => ({ ...f, concentration: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    <option>Parfum</option><option>Eau de Parfum</option><option>Eau de Toilette</option>
                    <option>Eau de Cologne</option><option>Body Mist</option>
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Tamaño (ml)</label>
                  <input type="number" className={InputClass} value={form.size_ml || ''} onChange={e => setForm(f => ({ ...f, size_ml: parseFloat(e.target.value) || 0 }))} placeholder="100" />
                </div>
                <div>
                  <label className={LabelClass}>Género</label>
                  <select className={InputClass} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Seleccionar</option><option>Masculino</option><option>Femenino</option><option>Unisex</option>
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Familia Olfativa</label>
                  <input className={InputClass} value={form.fragrance_family} onChange={e => setForm(f => ({ ...f, fragrance_family: e.target.value }))} placeholder="Ej. Oriental, Floral" />
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={LabelClass}>Notas de Salida</label>
                  <input className={InputClass} value={form.top_notes} onChange={e => setForm(f => ({ ...f, top_notes: e.target.value }))} placeholder="Ej. Bergamota, Limón" />
                </div>
                <div>
                  <label className={LabelClass}>Notas de Corazón</label>
                  <input className={InputClass} value={form.heart_notes} onChange={e => setForm(f => ({ ...f, heart_notes: e.target.value }))} placeholder="Ej. Rosa, Jazmín" />
                </div>
                <div>
                  <label className={LabelClass}>Notas de Fondo</label>
                  <input className={InputClass} value={form.base_notes} onChange={e => setForm(f => ({ ...f, base_notes: e.target.value }))} placeholder="Ej. Ámbar, Madera" />
                </div>
              </div>

              {/* Pricing */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Precios y Stock</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={LabelClass}>Precio de Compra al Suplidor (DOP)</label>
                    <input type="number" className={InputClass} value={form.purchase_price || ''} onChange={e => setForm(f => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} placeholder="Ej. 2500" />
                  </div>
                  <div>
                    <label className={LabelClass}>Precio de la Competencia (DOP)</label>
                    <input type="number" className={InputClass} value={form.competitor_price || ''} onChange={e => setForm(f => ({ ...f, competitor_price: parseFloat(e.target.value) || 0 }))} placeholder="Ej. 5500" />
                  </div>
                  <div>
                    <label className={LabelClass}>Envío suplidor → mi empresa (DOP)</label>
                    <input type="number" className={InputClass} value={form.supplier_shipping_cost || ''} onChange={e => setForm(f => ({ ...f, supplier_shipping_cost: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                  </div>
                  <div>
                    <label className={LabelClass}>Envío empresa → cliente (DOP)</label>
                    <input type="number" className={InputClass} value={form.client_shipping_cost || ''} onChange={e => setForm(f => ({ ...f, client_shipping_cost: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                  </div>
                </div>

                {suggested > 0 && (
                  <div className="rounded-xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #c4b5fd' }}>
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-purple-800 mb-0.5">Precio sugerido de venta</p>
                        <p className="text-2xl font-bold text-purple-700">{formatDOP(suggested)}</p>
                        <p className="text-xs text-purple-500 mt-1">
                          {(() => {
                            const trueCost = form.purchase_price + form.supplier_shipping_cost + form.client_shipping_cost
                            return form.competitor_price > 0
                              ? `10% bajo competencia (${formatDOP(form.competitor_price)}) · Costo real: ${formatDOP(trueCost)}`
                              : `2× costo real (compra + envíos = ${formatDOP(trueCost)})`
                          })()}
                        </p>
                        <button type="button" onClick={() => setForm(f => ({ ...f, selling_price: suggested }))}
                          className="mt-2 text-xs font-semibold text-purple-600 underline underline-offset-2 hover:text-purple-800">
                          Usar este precio →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className={LabelClass}>Precio de Venta Final (DOP)</label>
                  <input type="number" className={InputClass} value={form.selling_price || ''} onChange={e => setForm(f => ({ ...f, selling_price: parseFloat(e.target.value) || 0 }))} placeholder={suggested > 0 ? `Sugerido: ${suggested}` : 'Ej. 5000'} />
                  {form.selling_price > 0 && form.purchase_price > 0 && (
                    <p className="text-xs mt-1" style={{ color: form.selling_price > form.purchase_price ? '#059669' : '#dc2626' }}>
                      Ganancia: {formatDOP(form.selling_price - form.purchase_price)} · Margen: {(((form.selling_price - form.purchase_price) / form.selling_price) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LabelClass}>Stock Actual</label>
                    <input type="number" className={InputClass} value={form.stock_quantity || ''} onChange={e => setForm(f => ({ ...f, stock_quantity: parseInt(e.target.value) || 0 }))} placeholder="0" />
                  </div>
                  <div>
                    <label className={LabelClass}>Alerta Mín. Stock</label>
                    <input type="number" className={InputClass} value={form.min_stock_alert || ''} onChange={e => setForm(f => ({ ...f, min_stock_alert: parseInt(e.target.value) || 0 }))} placeholder="5" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-purple-600" />
                <label htmlFor="is_active" className="text-sm text-gray-700 font-medium">Producto activo</label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuickSupplier && (
        <QuickCreateSupplier
          onCreated={(id, name) => {
            setSuppliers(prev => [...prev, { id, name }])
            setFormSuppliers(prev => [...prev, id])
            setShowQuickSupplier(false)
          }}
          onClose={() => setShowQuickSupplier(false)}
        />
      )}
    </div>
  )
}
