'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle, Package, ShoppingBag, ChevronLeft, ChevronRight, RefreshCw, Lightbulb } from 'lucide-react'
import QuickCreateSupplier from '@/components/QuickCreateSupplier'
import { useRouter, useSearchParams } from 'next/navigation'

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
  competitor_price: number
  selling_price: number
  stock_quantity: number
  min_stock_alert: number
  is_active: boolean
}

interface Supplier {
  id: string
  name: string
}

function formatDOP(amount: number) {
  return `DOP $${(amount || 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg text-white text-sm font-medium"
      style={{ background: type === 'success' ? '#059669' : '#dc2626', minWidth: 280, animation: 'slideInRight 0.3s ease-out' }}>
      {type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  )
}

const emptyProduct: Omit<Product, 'id'> = {
  name: '', brand: '', sku: '', category: '', concentration: '', size_ml: 0,
  gender: '', fragrance_family: '', top_notes: '', heart_notes: '', base_notes: '',
  supplier_id: '', purchase_price: 0, competitor_price: 0, selling_price: 0,
  stock_quantity: 0, min_stock_alert: 5, is_active: true,
}

function generateSKU(brand: string, name: string, size_ml: number): string {
  const b = brand.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 3)
  const n = name.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 3)
  const s = size_ml || Math.floor(Math.random() * 9 + 1) * 10
  return `${b}-${n}-${s}`
}

function suggestedPrice(purchase: number, competitor: number): number {
  if (purchase <= 0) return 0
  if (competitor > 0) return Math.round(competitor * 0.9)  // 10% below competitor
  return Math.round(purchase * 2)  // fallback: 100% markup
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Omit<Product, 'id'>>(emptyProduct)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showQuickSupplier, setShowQuickSupplier] = useState(false)

  // Multi-supplier state
  const [formSuppliers, setFormSuppliers] = useState<string[]>([])
  const [productSuppliers, setProductSuppliers] = useState<Record<string, Array<{ supplier_id: string; name: string; is_primary: boolean }>>>({})

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })
  const router = useRouter()
  const searchParams = useSearchParams()

  // Open add modal pre-filled from shopping list query params
  useEffect(() => {
    const brand = searchParams.get('brand')
    const name = searchParams.get('name')
    if (brand || name) {
      setEditing(null)
      setForm({ ...emptyProduct, brand: brand || '', name: name || '' })
      setFormSuppliers([])
      setShowModal(true)
      router.replace('/dashboard/inventory')
    }
  }, [searchParams, router])

  // Auto-generate SKU for new products when brand/name/size change
  useEffect(() => {
    if (!editing && (form.brand || form.name)) {
      setForm(f => ({ ...f, sku: generateSKU(f.brand, f.name, f.size_ml) }))
    }
  }, [form.brand, form.name, form.size_ml, editing])

  const suggested = suggestedPrice(form.purchase_price, form.competitor_price)

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

  function openAdd() {
    setEditing(null)
    setForm(emptyProduct)
    setFormSuppliers([])
    setShowModal(true)
  }

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
    setForm(emptyProduct)
    setFormSuppliers([])
  }

  async function handleSave() {
    if (!form.name || !form.brand) {
      showToast('Nombre y marca son requeridos', 'error')
      return
    }
    setSaving(true)
    const primarySupplierId = formSuppliers[0] || null
    const payload = {
      ...form,
      sku: form.sku || null,
      supplier_id: primarySupplierId,
      size_ml: Number(form.size_ml) || null,
      purchase_price: Number(form.purchase_price),
      competitor_price: Number(form.competitor_price) || 0,
      selling_price: Number(form.selling_price) || suggested,
      stock_quantity: Number(form.stock_quantity),
      min_stock_alert: Number(form.min_stock_alert),
    }

    async function syncProductSuppliers(productId: string) {
      await supabase.from('product_suppliers').delete().eq('product_id', productId)
      if (formSuppliers.length > 0) {
        await supabase.from('product_suppliers').insert(
          formSuppliers.map((sid, idx) => ({
            product_id: productId,
            supplier_id: sid,
            is_primary: idx === 0,
          }))
        )
      }
    }

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
      if (error) { showToast('Error al actualizar producto', 'error'); setSaving(false); return }
      await syncProductSuppliers(editing.id)

      const stockAdded = Number(form.stock_quantity) - (editing.stock_quantity || 0)
      if (stockAdded > 0 && Number(form.purchase_price) > 0) {
        const restockCost = stockAdded * Number(form.purchase_price)
        await supabase.from('expenses').insert([{
          category: 'Compras',
          description: `Reposición: ${form.name} - ${form.brand} (+${stockAdded} uds.)`,
          amount: restockCost,
          payment_method: 'Efectivo',
          expense_date: new Date().toISOString().slice(0, 10),
        }])
        showToast(`Actualizado · Reposición ${formatDOP(restockCost)} registrada en Finanzas`, 'success')
      } else {
        showToast('Producto actualizado correctamente', 'success')
      }
      closeModal(); fetchData()
    } else {
      const { data: newProd, error } = await supabase.from('products').insert([payload]).select().single()
      if (error || !newProd) { showToast('Error al crear producto', 'error'); setSaving(false); return }
      await syncProductSuppliers(newProd.id)

      const totalCost = Number(form.purchase_price) * Number(form.stock_quantity)
      if (totalCost > 0) {
        await supabase.from('expenses').insert([{
          category: 'Compras',
          description: `Compra de inventario: ${form.name} - ${form.brand} (${form.stock_quantity} uds.)`,
          amount: totalCost,
          payment_method: 'Efectivo',
          expense_date: new Date().toISOString().slice(0, 10),
        }])
        showToast(`Producto creado · ${formatDOP(totalCost)} registrado en Finanzas como salida`, 'success')
      } else {
        showToast('Producto creado correctamente', 'success')
      }
      closeModal(); fetchData()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) showToast('Error al eliminar producto', 'error')
    else { showToast('Producto eliminado', 'success'); fetchData() }
    setDeleteConfirm(null)
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

  function stockColor(p: Product) {
    if (p.stock_quantity <= p.min_stock_alert) return 'text-red-600 bg-red-50'
    if (p.stock_quantity <= p.min_stock_alert * 2) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  function margin(p: Product) {
    if (!p.selling_price || !p.purchase_price) return '—'
    const m = ((p.selling_price - p.purchase_price) / p.selling_price) * 100
    return `${m.toFixed(1)}%`
  }

  const InputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
  const LabelClass = "block text-xs font-medium text-gray-600 mb-1.5"

  const PAGE_SIZE = 12
  const [currentPage, setCurrentPage] = useState(1)

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
    const stockLabel = stock === 0 ? 'Sin stock' : `${stock} uds.`
    const cardSuppliers = productSuppliers[p.id] || []
    const primarySupplier = cardSuppliers.find(s => s.is_primary) || cardSuppliers[0]
    const altCount = cardSuppliers.length - 1

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
        {/* Top row: status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${stockColor}`}>
            {stock <= min && stock > 0 && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {stockLabel}
          </span>
          {p.category && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-100">
              {p.category}
            </span>
          )}
          {p.gender && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
              {p.gender}
            </span>
          )}
        </div>

        {/* Product name */}
        <div>
          <h3 className="font-bold text-gray-800 text-base leading-tight">{p.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {p.brand}
            {p.size_ml ? ` · ${p.size_ml}ml` : ''}
            {p.concentration ? ` · ${p.concentration}` : ''}
          </p>
          {p.sku && <p className="text-xs text-gray-400 mt-1">SKU: {p.sku}</p>}
        </div>

        {/* Suppliers */}
        {cardSuppliers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {primarySupplier && (
              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-blue-50 text-blue-700 border border-blue-100">
                {primarySupplier.name}
              </span>
            )}
            {altCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-gray-100 text-gray-500">
                +{altCount} alt.
              </span>
            )}
          </div>
        )}

        {/* Stock bar */}
        {min > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Stock</span>
              <span>Mín. {min}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${stock === 0 ? 'bg-red-400' : stock <= min ? 'bg-red-400' : stock <= min * 2 ? 'bg-yellow-400' : 'bg-green-400'}`}
                style={{ width: `${Math.min(100, (stock / Math.max(stock, min * 3)) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
          <button
            onClick={() => router.push('/dashboard/finances')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#f5f3ff', color: '#7c3aed' }}
            title="Registrar venta con este producto en Finanzas"
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Vender
          </button>
          <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors" title="Editar">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => setDeleteConfirm(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Inventario
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{products.length} productos en catálogo</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: products.length, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Con stock', value: products.filter(p => p.is_active && p.stock_quantity > 0).length, color: '#059669', bg: '#ecfdf5' },
          { label: 'Stock bajo', value: products.filter(p => p.is_active && p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert).length, color: '#d97706', bg: '#fffbeb' },
          { label: 'Sin stock', value: products.filter(p => !p.is_active || p.stock_quantity === 0).length, color: '#dc2626', bg: '#fef2f2' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-card">
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, marca o SKU..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
            />
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
          {/* IN STOCK section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-bold text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Con Stock
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                {inStock.length}
              </span>
            </div>
            {inStock.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border-2 border-dashed border-gray-200">
                <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-400 text-sm">No hay productos con stock disponible</p>
                <button onClick={openAdd} className="mt-3 text-sm font-medium" style={{ color: '#7c3aed' }}>
                  + Agregar producto
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pagedInStock.map(p => <ProductCard key={p.id} p={p} />)}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      onClick={() => setCurrentPage(pg => Math.max(1, pg - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(pg => Math.min(totalPages, pg + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* OUT OF STOCK / INACTIVE section */}
          {outOfStock.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-bold text-gray-700" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Sin Stock / Inactivos
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                  {outOfStock.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-75">
                {outOfStock.map(p => <ProductCard key={p.id} p={p} />)}
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">¿Eliminar producto?</h3>
            <p className="text-sm text-gray-500 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {editing ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LabelClass}>Nombre *</label>
                  <input className={InputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Black Orchid" />
                </div>
                <div>
                  <label className={LabelClass}>Marca *</label>
                  <input className={InputClass} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Ej. Tom Ford" />
                </div>
                <div>
                  <label className={LabelClass}>
                    SKU
                    {!editing && <span className="ml-1.5 text-purple-500 text-xs font-normal">(auto-generado)</span>}
                  </label>
                  <div className="flex gap-1.5">
                    <input className={InputClass} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Ej. TF-BO-100" />
                    {!editing && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, sku: generateSKU(f.brand, f.name, f.size_ml) }))}
                        title="Regenerar SKU" className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={LabelClass} style={{ margin: 0 }}>Proveedores</label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowQuickSupplier(true)}
                        className="text-xs px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Nuevo proveedor
                      </button>
                      {formSuppliers.length < suppliers.length && (
                        <button
                          type="button"
                          onClick={() => setFormSuppliers(f => [...f, ''])}
                          className="text-xs px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Agregar proveedor
                        </button>
                      )}
                    </div>
                  </div>
                  {formSuppliers.length === 0 ? (
                    <div
                      className="rounded-lg border-2 border-dashed border-gray-200 py-3 px-4 text-xs text-gray-400 text-center cursor-pointer hover:border-purple-300 hover:text-purple-400 transition-colors"
                      onClick={() => setFormSuppliers([''])}
                    >
                      Sin proveedores — click para agregar
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formSuppliers.map((sid, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">Principal</span>
                          )}
                          {idx > 0 && (
                            <span className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">Alt. {idx}</span>
                          )}
                          <select
                            className={InputClass}
                            value={sid}
                            onChange={e => setFormSuppliers(f => f.map((v, i) => i === idx ? e.target.value : v))}
                          >
                            <option value="">Seleccionar proveedor</option>
                            {suppliers
                              .filter(s => s.id === sid || !formSuppliers.includes(s.id))
                              .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => setFormSuppliers(f => f.filter((_, i) => i !== idx))}
                            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {formSuppliers.length > 0 && <p className="text-xs text-gray-400 mt-1.5">El primero de la lista es el proveedor principal</p>}
                </div>
              </div>

              {/* Fragrance Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={LabelClass}>Categoría</label>
                  <input className={InputClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ej. Eau de Parfum" />
                </div>
                <div>
                  <label className={LabelClass}>Concentración</label>
                  <select className={InputClass} value={form.concentration} onChange={e => setForm(f => ({ ...f, concentration: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    <option>Parfum</option>
                    <option>Eau de Parfum</option>
                    <option>Eau de Toilette</option>
                    <option>Eau de Cologne</option>
                    <option>Body Mist</option>
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Tamaño (ml)</label>
                  <input type="number" className={InputClass} value={form.size_ml || ''} onChange={e => setForm(f => ({ ...f, size_ml: parseFloat(e.target.value) || 0 }))} placeholder="100" />
                </div>
                <div>
                  <label className={LabelClass}>Género</label>
                  <select className={InputClass} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    <option>Masculino</option>
                    <option>Femenino</option>
                    <option>Unisex</option>
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

              {/* Pricing & Stock */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Precios y Stock</p>

                {/* Cost + Competitor inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={LabelClass}>Precio de Compra al Suplidor (DOP) *</label>
                    <input type="number" className={InputClass} value={form.purchase_price || ''} onChange={e => setForm(f => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} placeholder="Ej. 2500" />
                    <p className="text-xs text-gray-400 mt-1">Lo que te costó comprarlo</p>
                  </div>
                  <div>
                    <label className={LabelClass}>Precio de la Competencia (DOP)</label>
                    <input type="number" className={InputClass} value={form.competitor_price || ''} onChange={e => setForm(f => ({ ...f, competitor_price: parseFloat(e.target.value) || 0 }))} placeholder="Ej. 5500" />
                    <p className="text-xs text-gray-400 mt-1">Precio de mercado / referencia</p>
                  </div>
                </div>

                {/* Suggested price box */}
                {suggested > 0 && (
                  <div className="rounded-xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #c4b5fd' }}>
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-purple-800 mb-0.5">Precio sugerido de venta</p>
                        <p className="text-2xl font-bold text-purple-700">{formatDOP(suggested)}</p>
                        <p className="text-xs text-purple-500 mt-1">
                          {form.competitor_price > 0
                            ? `10% por debajo de la competencia (${formatDOP(form.competitor_price)})`
                            : '100% de margen sobre precio de compra (sin referencia de competencia)'}
                        </p>
                        {form.purchase_price > 0 && (
                          <p className="text-xs text-purple-400 mt-0.5">
                            Ganancia sugerida: {formatDOP(suggested - form.purchase_price)} · Margen: {(((suggested - form.purchase_price) / suggested) * 100).toFixed(1)}%
                          </p>
                        )}
                        <button type="button" onClick={() => setForm(f => ({ ...f, selling_price: suggested }))}
                          className="mt-2 text-xs font-semibold text-purple-600 underline underline-offset-2 hover:text-purple-800">
                          Usar este precio →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selling price (manual) */}
                <div className="mb-4">
                  <label className={LabelClass}>Precio de Venta Final (DOP)</label>
                  <input type="number" className={InputClass} value={form.selling_price || ''} onChange={e => setForm(f => ({ ...f, selling_price: parseFloat(e.target.value) || 0 }))} placeholder={suggested > 0 ? `Sugerido: ${suggested}` : 'Ej. 5000'} />
                  {form.selling_price > 0 && form.purchase_price > 0 && (
                    <p className="text-xs mt-1" style={{ color: form.selling_price > form.purchase_price ? '#059669' : '#dc2626' }}>
                      Ganancia: {formatDOP(form.selling_price - form.purchase_price)} · Margen: {(((form.selling_price - form.purchase_price) / form.selling_price) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>

                {/* Stock */}
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
              <button onClick={closeModal} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Producto'}
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
