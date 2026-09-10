'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Plus, X, CheckCircle, AlertTriangle, ShoppingBag, Check,
  Trash2, RotateCcw, Lightbulb, RefreshCw,
} from 'lucide-react'

// ── helpers ────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg text-white text-sm font-medium"
      style={{ background: type === 'success' ? '#059669' : '#dc2626', minWidth: 280 }}>
      {type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  )
}

function formatDOP(n: number) {
  return `DOP $${(n || 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function generateSKU(brand: string, name: string, size_ml: number) {
  const b = brand.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 3)
  const n = name.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 3)
  const s = size_ml || Math.floor(Math.random() * 9 + 1) * 10
  return `${b}-${n}-${s}`
}

function suggestedPrice(purchase: number, supplierShip: number, clientShip: number, competitor: number) {
  if (purchase <= 0) return 0
  const trueCost = purchase + supplierShip + clientShip
  if (competitor > 0) return Math.round(Math.max(competitor * 0.9, trueCost * 1.3))
  return Math.round(trueCost * 2)
}

// ── types ──────────────────────────────────────────────────────────────────

interface ShoppingItem {
  id: string
  brand: string
  name: string
  notes: string
  supplier_id: string | null
  supplier_name: string
  is_purchased: boolean
  purchased_at: string | null
  created_at: string
}

interface Supplier { id: string; name: string }

const emptyPurchaseForm = {
  sku: '',
  size_ml: 0,
  concentration: '',
  category: '',
  gender: '',
  purchase_price: 0,
  competitor_price: 0,
  supplier_shipping_cost: 0,
  client_shipping_cost: 0,
  selling_price: 0,
  stock_quantity: 1,
  min_stock_alert: 5,
}

const InputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
const LabelClass = "block text-xs font-medium text-gray-600 mb-1.5"

// ── page ───────────────────────────────────────────────────────────────────

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'purchased'>('pending')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Add-to-list form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ brand: '', name: '', supplier_id: '', notes: '' })
  const [saving, setSaving] = useState(false)

  // Purchase modal — opened when marking a list item as bought
  const [purchaseItem, setPurchaseItem] = useState<ShoppingItem | null>(null)
  const [pForm, setPForm] = useState(emptyPurchaseForm)
  const [pSuppliers, setPSuppliers] = useState<string[]>([])
  const [savingPurchase, setSavingPurchase] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error') => setToast({ message: msg, type })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('shopping_list').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [])

  const fetchSuppliers = useCallback(async () => {
    const { data } = await supabase.from('suppliers').select('id, name').order('name')
    setSuppliers(data || [])
  }, [])

  useEffect(() => { fetchItems(); fetchSuppliers() }, [fetchItems, fetchSuppliers])

  // ── auto-SKU in purchase form ──────────────────────────────────────────
  useEffect(() => {
    if (purchaseItem) {
      setPForm(f => ({ ...f, sku: generateSKU(purchaseItem.brand, purchaseItem.name, f.size_ml) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseItem, pForm.size_ml])

  const suggested = suggestedPrice(pForm.purchase_price, pForm.supplier_shipping_cost, pForm.client_shipping_cost, pForm.competitor_price)

  // ── add to list ────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!form.brand.trim() || !form.name.trim()) { showToast('Marca y nombre son requeridos', 'error'); return }
    setSaving(true)
    const supplier = suppliers.find(s => s.id === form.supplier_id)
    const { error } = await supabase.from('shopping_list').insert([{
      brand: form.brand.trim(),
      name: form.name.trim(),
      notes: form.notes.trim(),
      supplier_id: form.supplier_id || null,
      supplier_name: supplier?.name || '',
    }])
    if (error) showToast('Error al agregar', 'error')
    else { showToast('Agregado a la lista', 'success'); setForm({ brand: '', name: '', supplier_id: '', notes: '' }); setShowForm(false); fetchItems() }
    setSaving(false)
  }

  // ── open purchase confirmation modal ──────────────────────────────────
  function openPurchaseModal(item: ShoppingItem) {
    setPurchaseItem(item)
    setPForm({ ...emptyPurchaseForm, sku: generateSKU(item.brand, item.name, 0) })
    setPSuppliers(item.supplier_id ? [item.supplier_id] : [])
  }

  function closeProductModal() {
    setPurchaseItem(null)
    setPForm(emptyPurchaseForm)
    setPSuppliers([])
  }

  // ── confirm purchase → add to inventory ───────────────────────────────
  async function handleConfirmPurchase() {
    if (!purchaseItem) return
    if (!pForm.purchase_price) { showToast('El precio de compra es requerido', 'error'); return }
    if (!pForm.stock_quantity || pForm.stock_quantity < 1) { showToast('La cantidad debe ser al menos 1', 'error'); return }
    setSavingPurchase(true)

    const { brand, name } = purchaseItem
    const primarySupplierId = pSuppliers[0] || purchaseItem.supplier_id || null

    // Insert product
    const { data: prod, error } = await supabase.from('products').insert([{
      name,
      brand,
      sku: pForm.sku || null,
      size_ml: pForm.size_ml || null,
      concentration: pForm.concentration || '',
      category: pForm.category || '',
      gender: pForm.gender || '',
      fragrance_family: '',
      top_notes: '', heart_notes: '', base_notes: '',
      supplier_id: primarySupplierId,
      purchase_price: pForm.purchase_price,
      competitor_price: pForm.competitor_price || 0,
      supplier_shipping_cost: pForm.supplier_shipping_cost || 0,
      client_shipping_cost: pForm.client_shipping_cost || 0,
      selling_price: pForm.selling_price || suggested || 0,
      stock_quantity: pForm.stock_quantity,
      min_stock_alert: pForm.min_stock_alert,
      is_active: true,
    }]).select().single()

    if (error || !prod) { showToast('Error al agregar al inventario', 'error'); setSavingPurchase(false); return }

    // Insert product_suppliers
    if (pSuppliers.length > 0) {
      await supabase.from('product_suppliers').insert(
        pSuppliers.map((sid, idx) => ({ product_id: prod.id, supplier_id: sid, is_primary: idx === 0 }))
      )
    }

    // Record expense
    const totalCost = pForm.purchase_price * pForm.stock_quantity
    if (totalCost > 0) {
      await supabase.from('expenses').insert([{
        category: 'Compras',
        description: `Compra de inventario: ${name} - ${brand} (${pForm.stock_quantity} uds.)`,
        amount: totalCost,
        payment_method: 'Efectivo',
        expense_date: new Date().toISOString().slice(0, 10),
      }])
    }

    // Mark shopping list item as purchased
    await supabase.from('shopping_list').update({
      is_purchased: true,
      purchased_at: new Date().toISOString(),
    }).eq('id', purchaseItem.id)

    showToast(`✓ ${name} agregado al inventario`, 'success')
    closeProductModal()
    fetchItems()
    setSavingPurchase(false)
  }

  async function handleUndo(id: string) {
    await supabase.from('shopping_list').update({ is_purchased: false, purchased_at: null }).eq('id', id)
    fetchItems()
  }

  async function handleDelete(id: string) {
    await supabase.from('shopping_list').delete().eq('id', id)
    showToast('Eliminado', 'success')
    fetchItems()
  }

  const pending = items.filter(i => !i.is_purchased)
  const purchased = items.filter(i => i.is_purchased)
  const shown = tab === 'pending' ? pending : purchased

  return (
    <div className="p-6 lg:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>Lista de Compras</h1>
          <p className="text-gray-500 mt-1 text-sm">Los perfumes comprados se agregan automáticamente al inventario</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Nuevo item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={LabelClass}>Marca *</label>
              <input className={InputClass} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Ej. Dior, Chanel..." autoFocus />
            </div>
            <div>
              <label className={LabelClass}>Nombre del perfume *</label>
              <input className={InputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Sauvage, N°5..." />
            </div>
            <div>
              <label className={LabelClass}>Suplidor</label>
              <select className={InputClass} value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                <option value="">Sin suplidor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={LabelClass}>Notas (opcional)</label>
              <input className={InputClass} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej. 100ml, urgente..." onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => { setShowForm(false); setForm({ brand: '', name: '', supplier_id: '', notes: '' }) }} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleAdd} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Agregar a la lista'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([['pending', 'Pendientes', pending.length, '#7c3aed', '#ede9fe'], ['purchased', 'Comprados', purchased.length, '#059669', '#d1fae5']] as const).map(([key, label, count, activeColor, badgeBg]) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: tab === key ? (key === 'pending' ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#059669') : 'white',
              color: tab === key ? 'white' : '#6b7280',
              boxShadow: tab === key ? `0 4px 12px ${activeColor}40` : '0 1px 3px rgba(0,0,0,0.08)',
            }}>
            {key === 'pending' ? <ShoppingBag className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {label}
            {count > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-xs font-bold"
                style={{ background: tab === key ? 'rgba(255,255,255,0.25)' : badgeBg, color: tab === key ? 'white' : activeColor }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-8 h-8 animate-spin" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#f5f3ff' }}>
              <ShoppingBag className="w-8 h-8" style={{ color: '#7c3aed' }} />
            </div>
            <p className="text-gray-700 font-semibold text-base mb-1">{tab === 'pending' ? 'Lista vacía' : 'Sin compras registradas'}</p>
            <p className="text-gray-400 text-sm max-w-xs">
              {tab === 'pending'
                ? 'Agrega los perfumes que necesitas comprar. Al marcarlos como comprados, completas la info y se agregan solos al inventario.'
                : 'Los perfumes que hayas comprado aparecerán aquí.'}
            </p>
            {tab === 'pending' && (
              <button onClick={() => setShowForm(true)} className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                <Plus className="w-4 h-4" /> Agregar perfume
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {shown.map(item => (
              <li key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                {/* Status circle */}
                {tab === 'pending' ? (
                  <button onClick={() => openPurchaseModal(item)} title="Marcar como comprado"
                    className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center group/check">
                    <Check className="w-3.5 h-3.5 text-transparent group-hover/check:text-green-500 transition-colors" />
                  </button>
                ) : (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: '#ede9fe', color: '#7c3aed' }}>{item.brand}</span>
                    <span className={`text-sm font-medium ${item.is_purchased ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {item.supplier_name && <p className="text-xs text-blue-600 font-medium">{item.supplier_name}</p>}
                    {item.notes && <p className="text-xs text-gray-400">{item.notes}</p>}
                    {item.is_purchased && item.purchased_at && (
                      <p className="text-xs text-green-500">
                        Comprado el {new Date(item.purchased_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {tab === 'pending' && (
                    <button onClick={() => openPurchaseModal(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-green-50 text-green-600 border border-green-200">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Comprado</span>
                    </button>
                  )}
                  {tab === 'purchased' && (
                    <button onClick={() => handleUndo(item.id)} title="Mover a pendientes"
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(item.id)} title="Eliminar"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {tab === 'pending' && pending.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          Haz clic en el círculo o en "Comprado" para registrar la compra y agregar el producto al inventario automáticamente.
        </p>
      )}

      {/* ── Purchase confirmation modal ───────────────────────────────── */}
      {purchaseItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  Confirmar compra
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  <span className="font-semibold text-purple-600">{purchaseItem.brand} — {purchaseItem.name}</span>{' '}se agregará al inventario
                </p>
              </div>
              <button onClick={closeProductModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic info row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={LabelClass}>SKU</label>
                  <div className="flex gap-1.5">
                    <input className={InputClass} value={pForm.sku} onChange={e => setPForm(f => ({ ...f, sku: e.target.value }))} placeholder="Auto-generado" />
                    <button type="button" onClick={() => setPForm(f => ({ ...f, sku: generateSKU(purchaseItem.brand, purchaseItem.name, f.size_ml) }))}
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={LabelClass}>Tamaño (ml)</label>
                  <input type="number" className={InputClass} value={pForm.size_ml || ''} onChange={e => setPForm(f => ({ ...f, size_ml: parseFloat(e.target.value) || 0 }))} placeholder="100" />
                </div>
                <div>
                  <label className={LabelClass}>Concentración</label>
                  <select className={InputClass} value={pForm.concentration} onChange={e => setPForm(f => ({ ...f, concentration: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    <option>Parfum</option>
                    <option>Eau de Parfum</option>
                    <option>Eau de Toilette</option>
                    <option>Eau de Cologne</option>
                    <option>Body Mist</option>
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Categoría</label>
                  <input className={InputClass} value={pForm.category} onChange={e => setPForm(f => ({ ...f, category: e.target.value }))} placeholder="Ej. Eau de Parfum" />
                </div>
                <div>
                  <label className={LabelClass}>Género</label>
                  <select className={InputClass} value={pForm.gender} onChange={e => setPForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    <option>Masculino</option>
                    <option>Femenino</option>
                    <option>Unisex</option>
                  </select>
                </div>
              </div>

              {/* Suppliers */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={LabelClass} style={{ margin: 0 }}>Proveedores</label>
                  {pSuppliers.length < suppliers.length && (
                    <button type="button" onClick={() => setPSuppliers(s => [...s, ''])}
                      className="text-xs px-2 py-1 rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Agregar
                    </button>
                  )}
                </div>
                {pSuppliers.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed border-gray-200 py-3 px-4 text-xs text-gray-400 text-center cursor-pointer hover:border-purple-300 hover:text-purple-400"
                    onClick={() => setPSuppliers(purchaseItem.supplier_id ? [purchaseItem.supplier_id] : [''])}>
                    Sin proveedor — click para agregar
                  </div>
                ) : pSuppliers.map((sid, idx) => (
                  <div key={idx} className="flex items-center gap-2 mb-2">
                    <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: idx === 0 ? '#dbeafe' : '#f3f4f6', color: idx === 0 ? '#1d4ed8' : '#6b7280' }}>
                      {idx === 0 ? 'Principal' : `Alt. ${idx}`}
                    </span>
                    <select className={InputClass} value={sid} onChange={e => setPSuppliers(s => s.map((v, i) => i === idx ? e.target.value : v))}>
                      <option value="">Seleccionar proveedor</option>
                      {suppliers.filter(s => s.id === sid || !pSuppliers.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setPSuppliers(s => s.filter((_, i) => i !== idx))} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Precios y costos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LabelClass}>Precio de compra al suplidor (DOP) *</label>
                    <input type="number" className={InputClass} value={pForm.purchase_price || ''} onChange={e => setPForm(f => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} placeholder="Ej. 2500" />
                  </div>
                  <div>
                    <label className={LabelClass}>Precio de la competencia (DOP)</label>
                    <input type="number" className={InputClass} value={pForm.competitor_price || ''} onChange={e => setPForm(f => ({ ...f, competitor_price: parseFloat(e.target.value) || 0 }))} placeholder="Ej. 5500" />
                  </div>
                  <div>
                    <label className={LabelClass}>Envío suplidor → mi empresa (DOP)</label>
                    <input type="number" className={InputClass} value={pForm.supplier_shipping_cost || ''} onChange={e => setPForm(f => ({ ...f, supplier_shipping_cost: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                  </div>
                  <div>
                    <label className={LabelClass}>Envío empresa → cliente (DOP)</label>
                    <input type="number" className={InputClass} value={pForm.client_shipping_cost || ''} onChange={e => setPForm(f => ({ ...f, client_shipping_cost: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                  </div>
                </div>

                {/* Suggested price */}
                {suggested > 0 && (
                  <div className="rounded-xl p-4 mt-4" style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #c4b5fd' }}>
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-purple-800 mb-0.5">Precio sugerido de venta</p>
                        <p className="text-2xl font-bold text-purple-700">{formatDOP(suggested)}</p>
                        <p className="text-xs text-purple-500 mt-1">
                          {(() => {
                            const trueCost = pForm.purchase_price + pForm.supplier_shipping_cost + pForm.client_shipping_cost
                            return pForm.competitor_price > 0
                              ? `10% bajo competencia · Costo real: ${formatDOP(trueCost)}`
                              : `2× costo real (${formatDOP(trueCost)})`
                          })()}
                        </p>
                        {pForm.purchase_price > 0 && (
                          <p className="text-xs text-purple-400 mt-0.5">
                            {(() => {
                              const trueCost = pForm.purchase_price + pForm.supplier_shipping_cost + pForm.client_shipping_cost
                              return `Ganancia neta: ${formatDOP(suggested - trueCost)} · Margen: ${(((suggested - trueCost) / suggested) * 100).toFixed(1)}%`
                            })()}
                          </p>
                        )}
                        <button type="button" onClick={() => setPForm(f => ({ ...f, selling_price: suggested }))}
                          className="mt-2 text-xs font-semibold text-purple-600 underline underline-offset-2 hover:text-purple-800">
                          Usar este precio →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual selling price */}
                <div className="mt-4">
                  <label className={LabelClass}>Precio de venta final (DOP)</label>
                  <input type="number" className={InputClass} value={pForm.selling_price || ''} onChange={e => setPForm(f => ({ ...f, selling_price: parseFloat(e.target.value) || 0 }))} placeholder={suggested > 0 ? `Sugerido: ${suggested}` : 'Ej. 5000'} />
                  {pForm.selling_price > 0 && pForm.purchase_price > 0 && (
                    <p className="text-xs mt-1" style={{ color: pForm.selling_price > pForm.purchase_price ? '#059669' : '#dc2626' }}>
                      {(() => {
                        const trueCost = pForm.purchase_price + pForm.supplier_shipping_cost + pForm.client_shipping_cost
                        return `Ganancia: ${formatDOP(pForm.selling_price - trueCost)} · Margen: ${(((pForm.selling_price - trueCost) / pForm.selling_price) * 100).toFixed(1)}%`
                      })()}
                    </p>
                  )}
                </div>
              </div>

              {/* Stock */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Stock</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LabelClass}>Cantidad comprada *</label>
                    <input type="number" min={1} className={InputClass} value={pForm.stock_quantity || ''} onChange={e => setPForm(f => ({ ...f, stock_quantity: parseInt(e.target.value) || 1 }))} placeholder="1" />
                  </div>
                  <div>
                    <label className={LabelClass}>Alerta mínimo de stock</label>
                    <input type="number" min={0} className={InputClass} value={pForm.min_stock_alert || ''} onChange={e => setPForm(f => ({ ...f, min_stock_alert: parseInt(e.target.value) || 0 }))} placeholder="5" />
                  </div>
                </div>
              </div>

              {/* Cost summary */}
              {pForm.purchase_price > 0 && pForm.stock_quantity > 0 && (
                <div className="rounded-xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <p className="text-xs font-semibold text-green-700 mb-1">Resumen de la compra</p>
                  <p className="text-sm text-green-700">
                    {pForm.stock_quantity} unidad{pForm.stock_quantity > 1 ? 'es' : ''} × {formatDOP(pForm.purchase_price)} = <span className="font-bold">{formatDOP(pForm.purchase_price * pForm.stock_quantity)}</span>
                  </p>
                  <p className="text-xs text-green-500 mt-0.5">Este monto se registrará automáticamente como gasto en Finanzas</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeProductModal} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleConfirmPurchase} disabled={savingPurchase}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)', opacity: savingPurchase ? 0.7 : 1 }}>
                {savingPurchase ? 'Agregando...' : '✓ Confirmar compra y agregar al inventario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
