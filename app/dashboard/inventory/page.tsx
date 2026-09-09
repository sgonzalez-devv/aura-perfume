'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle, Package } from 'lucide-react'

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
  supplier_id: '', purchase_price: 0, selling_price: 0, stock_quantity: 0,
  min_stock_alert: 5, is_active: true,
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

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: prods }, { data: supps }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('suppliers').select('id, name').order('name'),
    ])
    setProducts(prods || [])
    setSuppliers(supps || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function openAdd() {
    setEditing(null)
    setForm(emptyProduct)
    setShowModal(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    const { id, ...rest } = p
    setForm(rest)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(emptyProduct)
  }

  async function handleSave() {
    if (!form.name || !form.brand) {
      showToast('Nombre y marca son requeridos', 'error')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      size_ml: Number(form.size_ml),
      purchase_price: Number(form.purchase_price),
      selling_price: Number(form.selling_price),
      stock_quantity: Number(form.stock_quantity),
      min_stock_alert: Number(form.min_stock_alert),
    }
    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id)
      if (error) showToast('Error al actualizar producto', 'error')
      else { showToast('Producto actualizado correctamente', 'success'); closeModal(); fetchData() }
    } else {
      const { error } = await supabase.from('products').insert([payload])
      if (error) showToast('Error al crear producto', 'error')
      else { showToast('Producto creado correctamente', 'success'); closeModal(); fetchData() }
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

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const genders = [...new Set(products.map(p => p.gender).filter(Boolean))]

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

  return (
    <div className="p-6 lg:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
            Inventario
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{products.length} productos · {filtered.length} mostrando</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
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
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
            />
          </div>
          <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 bg-white text-gray-700">
            <option value="">Todos los géneros</option>
            {genders.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 bg-white text-gray-700">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(searchQuery || filterGender || filterCategory) && (
            <button onClick={() => { setSearchQuery(''); setFilterGender(''); setFilterCategory('') }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
              <X className="w-4 h-4" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400">No se encontraron productos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#faf9ff' }}>
                  {['Producto', 'SKU', 'Categoría', 'Género', 'P. Compra', 'P. Venta', 'Margen', 'Stock', 'Estado', ''].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => (
                  <tr key={p.id} className="table-row-hover transition-colors" onClick={() => openEdit(p)}>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.brand} · {p.size_ml}ml · {p.concentration}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{p.sku || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium">{p.category || '—'}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{p.gender || '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{formatDOP(p.purchase_price)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-800">{formatDOP(p.selling_price)}</td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-emerald-600">{margin(p)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${stockColor(p)}`}>
                        {p.stock_quantity} uds.
                        {p.stock_quantity <= p.min_stock_alert && <AlertTriangle className="w-3 h-3 inline ml-1" />}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
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
                  <label className={LabelClass}>SKU</label>
                  <input className={InputClass} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Ej. TF-BO-100" />
                </div>
                <div>
                  <label className={LabelClass}>Proveedor</label>
                  <select className={InputClass} value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <option value="">Sin proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className={LabelClass}>Precio Compra (DOP)</label>
                  <input type="number" className={InputClass} value={form.purchase_price || ''} onChange={e => setForm(f => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                </div>
                <div>
                  <label className={LabelClass}>Precio Venta (DOP)</label>
                  <input type="number" className={InputClass} value={form.selling_price || ''} onChange={e => setForm(f => ({ ...f, selling_price: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                </div>
                <div>
                  <label className={LabelClass}>Stock Actual</label>
                  <input type="number" className={InputClass} value={form.stock_quantity || ''} onChange={e => setForm(f => ({ ...f, stock_quantity: parseInt(e.target.value) || 0 }))} placeholder="0" />
                </div>
                <div>
                  <label className={LabelClass}>Alerta Mín. Stock</label>
                  <input type="number" className={InputClass} value={form.min_stock_alert || ''} onChange={e => setForm(f => ({ ...f, min_stock_alert: parseInt(e.target.value) || 0 }))} placeholder="5" />
                </div>
              </div>

              {/* Margin preview */}
              {form.purchase_price > 0 && form.selling_price > 0 && (
                <div className="rounded-xl p-4" style={{ background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">Ganancia: </span>
                      <span className="font-bold text-emerald-600">{formatDOP(form.selling_price - form.purchase_price)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Margen: </span>
                      <span className="font-bold text-purple-600">
                        {(((form.selling_price - form.purchase_price) / form.selling_price) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
    </div>
  )
}
