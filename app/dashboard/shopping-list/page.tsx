'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { sendPushNotification } from '@/lib/push'
import {
  Plus, X, CheckCircle, AlertTriangle, ShoppingBag, Check,
  Trash2, RotateCcw, Lightbulb, RefreshCw, Pencil, Search, PackagePlus,
} from 'lucide-react'

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

const OWNERS = ['Alfonso', 'Samuel', 'Ambos']
const OWNER_COLORS: Record<string, { bg: string; text: string }> = {
  Alfonso: { bg: '#dbeafe', text: '#1d4ed8' },
  Samuel:  { bg: '#fce7f3', text: '#be185d' },
  Ambos:   { bg: '#e0f2fe', text: '#0369a1' },
}

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
  sku: string | null
  size_ml: number | null
  concentration: string
  category: string
  gender: string
  purchase_price: number
  competitor_price: number
  supplier_shipping_cost: number
  client_shipping_cost: number
  selling_price: number
  stock_quantity: number
  min_stock_alert: number
  owned_by: string
  existing_product_id: string | null
}

interface Supplier { id: string; name: string }
interface InventoryProduct {
  id: string; name: string; brand: string; sku: string | null
  size_ml: number | null; concentration: string; category: string; gender: string
  purchase_price: number; selling_price: number; competitor_price: number
  supplier_shipping_cost: number; client_shipping_cost: number
  min_stock_alert: number; supplier_id: string | null
}

const emptyForm = {
  brand: '', name: '', sku: '', size_ml: 0, concentration: '', category: '', gender: '',
  supplier_id: '', notes: '', purchase_price: 0, competitor_price: 0,
  supplier_shipping_cost: 0, client_shipping_cost: 0, selling_price: 0,
  stock_quantity: 1, min_stock_alert: 5, owned_by: '',
  existing_product_id: null as string | null,
}

const InputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
const LabelClass = "block text-xs font-medium text-gray-600 mb-1.5"

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'purchased'>('pending')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form modal — used for both "new" and "edit"
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Existing-product search inside the form
  const [productSearch, setProductSearch] = useState('')

  // Confirm-purchase modal
  const [confirmItem, setConfirmItem] = useState<ShoppingItem | null>(null)
  const [confirmShipping, setConfirmShipping] = useState(0)
  const [confirmingPurchase, setConfirmingPurchase] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error') => setToast({ message: msg, type })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('shopping_list').select('*').order('created_at', { ascending: false })
    setItems((data || []) as ShoppingItem[])
    setLoading(false)
  }, [])

  const fetchMeta = useCallback(async () => {
    const [{ data: sup }, { data: prods }] = await Promise.all([
      supabase.from('suppliers').select('id, name').order('name'),
      supabase.from('products').select(
        'id, name, brand, sku, size_ml, concentration, category, gender, purchase_price, selling_price, competitor_price, supplier_shipping_cost, client_shipping_cost, min_stock_alert, supplier_id'
      ).eq('is_active', true).order('brand'),
    ])
    setSuppliers(sup || [])
    setInventoryProducts((prods || []) as InventoryProduct[])
  }, [])

  useEffect(() => { fetchItems(); fetchMeta() }, [fetchItems, fetchMeta])

  // Auto-SKU when brand/name/size change (only for new products)
  useEffect(() => {
    if (showForm && !editingId && !form.existing_product_id && (form.brand || form.name)) {
      setForm(f => ({ ...f, sku: generateSKU(f.brand, f.name, f.size_ml) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.brand, form.name, form.size_ml])

  const suggested = suggestedPrice(form.purchase_price, form.supplier_shipping_cost, form.client_shipping_cost, form.competitor_price)

  function openNew() {
    setEditingId(null)
    setForm(emptyForm)
    setProductSearch('')
    setShowForm(true)
  }

  function openEdit(item: ShoppingItem) {
    setEditingId(item.id)
    setForm({
      brand: item.brand, name: item.name, sku: item.sku || '',
      size_ml: item.size_ml || 0, concentration: item.concentration,
      category: item.category, gender: item.gender,
      supplier_id: item.supplier_id || '', notes: item.notes,
      purchase_price: item.purchase_price, competitor_price: item.competitor_price,
      supplier_shipping_cost: item.supplier_shipping_cost,
      client_shipping_cost: item.client_shipping_cost,
      selling_price: item.selling_price, stock_quantity: item.stock_quantity,
      min_stock_alert: item.min_stock_alert, owned_by: item.owned_by || '',
      existing_product_id: item.existing_product_id,
    })
    setProductSearch('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setProductSearch('')
  }

  function selectExistingProduct(prod: InventoryProduct) {
    setForm(f => ({
      ...f,
      existing_product_id: prod.id,
      brand: prod.brand, name: prod.name, sku: prod.sku || '',
      size_ml: prod.size_ml || 0, concentration: prod.concentration,
      category: prod.category, gender: prod.gender,
      purchase_price: prod.purchase_price, selling_price: prod.selling_price,
      competitor_price: prod.competitor_price,
      supplier_shipping_cost: prod.supplier_shipping_cost,
      client_shipping_cost: prod.client_shipping_cost,
      min_stock_alert: prod.min_stock_alert,
      supplier_id: prod.supplier_id || '',
    }))
    setProductSearch('')
  }

  function clearExistingProduct() {
    setForm(f => ({ ...f, existing_product_id: null, brand: '', name: '', sku: '' }))
  }

  async function handleSave() {
    if (!form.brand.trim() || !form.name.trim()) { showToast('Marca y nombre son requeridos', 'error'); return }
    setSaving(true)
    const supplier = suppliers.find(s => s.id === form.supplier_id)
    const payload = {
      brand: form.brand.trim(), name: form.name.trim(), notes: form.notes.trim(),
      supplier_id: form.supplier_id || null, supplier_name: supplier?.name || '',
      sku: form.sku || null, size_ml: form.size_ml || null,
      concentration: form.concentration, category: form.category, gender: form.gender,
      purchase_price: form.purchase_price, competitor_price: form.competitor_price,
      supplier_shipping_cost: form.supplier_shipping_cost,
      client_shipping_cost: form.client_shipping_cost,
      selling_price: form.selling_price || suggested || 0,
      stock_quantity: form.stock_quantity || 1, min_stock_alert: form.min_stock_alert,
      owned_by: form.owned_by || '',
      existing_product_id: form.existing_product_id || null,
    }

    let error
    if (editingId) {
      ({ error } = await supabase.from('shopping_list').update(payload).eq('id', editingId))
    } else {
      ({ error } = await supabase.from('shopping_list').insert([payload]))
    }

    if (error) showToast('Error al guardar', 'error')
    else { showToast(editingId ? 'Actualizado' : 'Agregado a la lista', 'success'); closeForm(); fetchItems() }
    setSaving(false)
  }

  function openConfirm(item: ShoppingItem) {
    setConfirmItem(item)
    setConfirmShipping(item.supplier_shipping_cost || 0)
  }

  // Confirm purchase: if existing product → update stock; if new → create product. Always record expense.
  async function handleConfirmPurchase() {
    if (!confirmItem) return
    setConfirmingPurchase(true)

    const qty = confirmItem.stock_quantity || 1
    const unitCost = confirmItem.purchase_price || 0
    const shipping = confirmShipping
    const totalCost = unitCost * qty + shipping

    if (confirmItem.existing_product_id) {
      // Restock: update stock quantity and prices on existing product
      const { data: currentProd } = await supabase
        .from('products').select('stock_quantity').eq('id', confirmItem.existing_product_id).single()
      await supabase.from('products').update({
        stock_quantity: (currentProd?.stock_quantity || 0) + qty,
        purchase_price: confirmItem.purchase_price,
        selling_price: confirmItem.selling_price,
        supplier_shipping_cost: confirmItem.supplier_shipping_cost,
        client_shipping_cost: confirmItem.client_shipping_cost,
      }).eq('id', confirmItem.existing_product_id)
    } else {
      // New product
      const { data: prod, error } = await supabase.from('products').insert([{
        name: confirmItem.name, brand: confirmItem.brand,
        sku: confirmItem.sku || null, size_ml: confirmItem.size_ml || null,
        concentration: confirmItem.concentration || '', category: confirmItem.category || '',
        gender: confirmItem.gender || '', fragrance_family: '',
        top_notes: '', heart_notes: '', base_notes: '',
        supplier_id: confirmItem.supplier_id || null,
        purchase_price: confirmItem.purchase_price,
        competitor_price: confirmItem.competitor_price || 0,
        supplier_shipping_cost: confirmItem.supplier_shipping_cost || 0,
        client_shipping_cost: confirmItem.client_shipping_cost || 0,
        selling_price: confirmItem.selling_price || 0,
        stock_quantity: qty, min_stock_alert: confirmItem.min_stock_alert || 5,
        is_active: true,
      }]).select().single()

      if (error || !prod) { showToast('Error al agregar al inventario', 'error'); setConfirmingPurchase(false); return }

      if (confirmItem.supplier_id) {
        await supabase.from('product_suppliers').insert([{ product_id: prod.id, supplier_id: confirmItem.supplier_id, is_primary: true }])
      }
    }

    // Record expense
    if (totalCost > 0) {
      const ownedLabel = confirmItem.owned_by ? ` [${confirmItem.owned_by}]` : ''
      await supabase.from('expenses').insert([{
        category: 'Compras',
        description: `Compra: ${confirmItem.brand} ${confirmItem.name} (${qty} uds.)${ownedLabel}`,
        amount: totalCost,
        payment_method: 'Efectivo',
        expense_date: new Date().toISOString().slice(0, 10),
      }])
    }

    await supabase.from('shopping_list').update({
      is_purchased: true, purchased_at: new Date().toISOString(),
    }).eq('id', confirmItem.id)

    sendPushNotification(
      '📦 Producto agregado al inventario',
      `${confirmItem.brand} ${confirmItem.name} — ${qty} und.`,
      '/dashboard/inventory'
    )

    showToast(`✓ ${confirmItem.name} agregado al inventario`, 'success')
    setConfirmItem(null)
    setConfirmingPurchase(false)
    fetchItems()
    fetchMeta() // refresh inventory product list
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

  const filteredInventory = inventoryProducts.filter(p => {
    const q = productSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
  })

  const isRestock = !!form.existing_product_id
  const selectedInventoryProduct = form.existing_product_id
    ? inventoryProducts.find(p => p.id === form.existing_product_id)
    : null

  return (
    <div className="p-6 lg:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>Lista de Compras</h1>
          <p className="text-gray-500 mt-1 text-sm">Planifica tus compras. Al marcar como comprado, el producto entra al inventario.</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

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
                ? 'Agrega los productos que planeas comprar. Cuando los compres, márcalos y entran al inventario automáticamente.'
                : 'Los productos marcados como comprados aparecerán aquí.'}
            </p>
            {tab === 'pending' && (
              <button onClick={openNew} className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                <Plus className="w-4 h-4" /> Nuevo Producto
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {shown.map(item => (
              <li key={item.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                {/* Status circle */}
                {tab === 'pending' ? (
                  <button onClick={() => openConfirm(item)} title="Marcar como comprado"
                    className="flex-shrink-0 mt-1 w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center group/check">
                    <Check className="w-3.5 h-3.5 text-transparent group-hover/check:text-green-500 transition-colors" />
                  </button>
                ) : (
                  <div className="flex-shrink-0 mt-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: '#ede9fe', color: '#7c3aed' }}>{item.brand}</span>
                    <span className={`text-sm font-medium ${item.is_purchased ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.name}</span>
                    {item.size_ml && <span className="text-xs text-gray-400">{item.size_ml}ml</span>}
                    {item.concentration && <span className="text-xs text-gray-400">{item.concentration}</span>}
                    {item.existing_product_id && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: '#ecfdf5', color: '#059669' }}>
                        Restock
                      </span>
                    )}
                    {item.owned_by && OWNER_COLORS[item.owned_by] && (
                      <span className="text-xs px-2 py-0.5 rounded-md font-semibold"
                        style={{ background: OWNER_COLORS[item.owned_by].bg, color: OWNER_COLORS[item.owned_by].text }}>
                        {item.owned_by}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {item.supplier_name && <span className="text-xs text-blue-600 font-medium">{item.supplier_name}</span>}
                    {item.purchase_price > 0 && <span className="text-xs text-gray-500">Costo: <span className="font-semibold">{formatDOP(item.purchase_price)}</span></span>}
                    {item.selling_price > 0 && <span className="text-xs text-gray-500">Venta: <span className="font-semibold">{formatDOP(item.selling_price)}</span></span>}
                    {item.stock_quantity > 0 && <span className="text-xs text-gray-400">{item.stock_quantity} uds.</span>}
                    {item.supplier_shipping_cost > 0 && <span className="text-xs text-gray-400">Envío: {formatDOP(item.supplier_shipping_cost)}</span>}
                    {item.notes && <span className="text-xs text-gray-400 italic">{item.notes}</span>}
                    {item.is_purchased && item.purchased_at && (
                      <span className="text-xs text-green-500">
                        Comprado el {new Date(item.purchased_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {tab === 'pending' && (
                    <>
                      <button onClick={() => openEdit(item)} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => openConfirm(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-green-50 text-green-600 border border-green-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Comprado</span>
                      </button>
                    </>
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
          Haz clic en el círculo o en "Comprado" para registrar la compra y agregar el producto al inventario.
        </p>
      )}

      {/* ── Add / Edit modal ────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {editingId ? 'Editar producto' : isRestock ? '📦 Restock de inventario' : 'Nuevo Producto'}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {editingId ? 'Modifica los detalles de este item' : 'Se guardará como pendiente — sin costo ni inventario hasta que lo compres'}
                </p>
              </div>
              <button onClick={closeForm} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">

              {/* ── Restock: search existing product ── */}
              {!editingId && (
                <div>
                  {isRestock && selectedInventoryProduct ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-green-200" style={{ background: '#f0fdf4' }}>
                      <PackagePlus className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-green-800">{selectedInventoryProduct.brand} — {selectedInventoryProduct.name}</p>
                        <p className="text-xs text-green-600">Restock de inventario · Edita precios y suplidor abajo</p>
                      </div>
                      <button onClick={clearExistingProduct} className="text-green-400 hover:text-green-600 flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className={LabelClass}>¿Ya existe en inventario? (opcional)</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
                          placeholder="Buscar en inventario para hacer restock..."
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                        />
                      </div>
                      {productSearch.length > 1 && (
                        <div className="mt-1 border border-gray-100 rounded-xl overflow-hidden shadow-sm max-h-40 overflow-y-auto">
                          {filteredInventory.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-gray-400">Sin resultados en inventario</div>
                          ) : filteredInventory.map(p => (
                            <button key={p.id} onClick={() => selectExistingProduct(p)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 text-left transition-colors border-b border-gray-50 last:border-0">
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: '#ede9fe', color: '#7c3aed' }}>{p.brand}</span>
                              <span className="text-sm text-gray-700">{p.name}</span>
                              {p.size_ml && <span className="text-xs text-gray-400">{p.size_ml}ml</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Brand + Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LabelClass}>Marca *</label>
                  <input className={InputClass} value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    placeholder="Ej. Dior, Tom Ford..." autoFocus={!isRestock} readOnly={isRestock} style={isRestock ? { background: '#f9fafb' } : {}} />
                </div>
                <div>
                  <label className={LabelClass}>Nombre *</label>
                  <input className={InputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ej. Sauvage, Black Orchid..." readOnly={isRestock} style={isRestock ? { background: '#f9fafb' } : {}} />
                </div>
              </div>

              {/* SKU + Size + Concentration (hide for restock) */}
              {!isRestock && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LabelClass}>SKU</label>
                    <div className="flex gap-1.5">
                      <input className={InputClass} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Auto-generado" />
                      <button type="button" onClick={() => setForm(f => ({ ...f, sku: generateSKU(f.brand, f.name, f.size_ml) }))}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={LabelClass}>Tamaño (ml)</label>
                    <input type="number" className={InputClass} value={form.size_ml || ''} onChange={e => setForm(f => ({ ...f, size_ml: parseFloat(e.target.value) || 0 }))} placeholder="100" />
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
                    <label className={LabelClass}>Categoría</label>
                    <input className={InputClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ej. Nicho, Designer..." />
                  </div>
                  <div>
                    <label className={LabelClass}>Género</label>
                    <select className={InputClass} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                      <option value="">Seleccionar</option>
                      <option>Masculino</option><option>Femenino</option><option>Unisex</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Suplidor + Owner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LabelClass}>Suplidor</label>
                  <select className={InputClass} value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <option value="">Sin suplidor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Para quién</label>
                  <div className="flex gap-2">
                    {OWNERS.map(o => (
                      <button key={o} type="button" onClick={() => setForm(f => ({ ...f, owned_by: f.owned_by === o ? '' : o }))}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all"
                        style={form.owned_by === o
                          ? { background: OWNER_COLORS[o].bg, color: OWNER_COLORS[o].text, borderColor: OWNER_COLORS[o].text }
                          : { background: 'white', color: '#9ca3af', borderColor: '#e5e7eb' }}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Precios y costos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LabelClass}>Precio de compra al suplidor (DOP)</label>
                    <input type="number" className={InputClass} value={form.purchase_price || ''} onChange={e => setForm(f => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} placeholder="Ej. 2500" />
                  </div>
                  <div>
                    <label className={LabelClass}>Precio de la competencia (DOP)</label>
                    <input type="number" className={InputClass} value={form.competitor_price || ''} onChange={e => setForm(f => ({ ...f, competitor_price: parseFloat(e.target.value) || 0 }))} placeholder="Ej. 5500" />
                  </div>
                  <div>
                    <label className={LabelClass}>Envío suplidor → empresa (DOP, total del paquete)</label>
                    <input type="number" className={InputClass} value={form.supplier_shipping_cost || ''} onChange={e => setForm(f => ({ ...f, supplier_shipping_cost: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                  </div>
                  <div>
                    <label className={LabelClass}>Envío empresa → cliente (DOP)</label>
                    <input type="number" className={InputClass} value={form.client_shipping_cost || ''} onChange={e => setForm(f => ({ ...f, client_shipping_cost: parseFloat(e.target.value) || 0 }))} placeholder="0" />
                  </div>
                </div>

                {suggested > 0 && (
                  <div className="rounded-xl p-4 mt-4" style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #c4b5fd' }}>
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-purple-800 mb-0.5">Precio sugerido de venta</p>
                        <p className="text-2xl font-bold text-purple-700">{formatDOP(suggested)}</p>
                        <p className="text-xs text-purple-500 mt-1">
                          {(() => {
                            const trueCost = form.purchase_price + form.supplier_shipping_cost + form.client_shipping_cost
                            return form.competitor_price > 0
                              ? `10% bajo competencia · Costo real: ${formatDOP(trueCost)}`
                              : `2× costo real (${formatDOP(trueCost)})`
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

                <div className="mt-4">
                  <label className={LabelClass}>Precio de venta (DOP)</label>
                  <input type="number" className={InputClass} value={form.selling_price || ''} onChange={e => setForm(f => ({ ...f, selling_price: parseFloat(e.target.value) || 0 }))} placeholder={suggested > 0 ? `Sugerido: ${suggested}` : 'Ej. 5000'} />
                </div>
              </div>

              {/* Stock */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Cantidad</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LabelClass}>Cantidad a comprar</label>
                    <input type="number" min={1} className={InputClass} value={form.stock_quantity || ''} onChange={e => setForm(f => ({ ...f, stock_quantity: parseInt(e.target.value) || 1 }))} placeholder="1" />
                  </div>
                  {!isRestock && (
                    <div>
                      <label className={LabelClass}>Alerta mínimo de stock</label>
                      <input type="number" min={0} className={InputClass} value={form.min_stock_alert || ''} onChange={e => setForm(f => ({ ...f, min_stock_alert: parseInt(e.target.value) || 0 }))} placeholder="5" />
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={LabelClass}>Notas (opcional)</label>
                <input className={InputClass} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej. Urgente, esperar oferta..." />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeForm} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Agregar a la lista'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm purchase modal ────────────────────────────────────── */}
      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">¿Confirmás la compra?</h3>
            <p className="text-sm text-gray-500 mb-3">
              <span className="font-semibold text-gray-700">{confirmItem.brand} — {confirmItem.name}</span>
              {confirmItem.owned_by && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-md font-semibold"
                  style={OWNER_COLORS[confirmItem.owned_by]
                    ? { background: OWNER_COLORS[confirmItem.owned_by].bg, color: OWNER_COLORS[confirmItem.owned_by].text }
                    : {}}>
                  {confirmItem.owned_by}
                </span>
              )}
            </p>

            {confirmItem.purchase_price > 0 && (
              <div className="rounded-xl p-4 mb-5 text-left" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div className="flex items-center justify-between text-sm text-green-700 mb-2">
                  <span>{confirmItem.stock_quantity} uds. × {formatDOP(confirmItem.purchase_price)}</span>
                  <span className="font-semibold">{formatDOP(confirmItem.purchase_price * confirmItem.stock_quantity)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <label className="text-xs text-green-600 font-medium whitespace-nowrap">Envío paquete (ajustable)</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-green-600">DOP $</span>
                    <input
                      type="number"
                      className="w-24 text-right px-2 py-1 rounded-lg border border-green-200 text-sm font-semibold text-green-700 focus:outline-none focus:border-green-400"
                      style={{ background: 'white' }}
                      value={confirmShipping}
                      onChange={e => setConfirmShipping(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-green-200 pt-2">
                  <span className="text-sm font-bold text-green-800">Total gasto</span>
                  <span className="text-lg font-bold text-green-700">
                    {formatDOP(confirmItem.purchase_price * confirmItem.stock_quantity + confirmShipping)}
                  </span>
                </div>
                <p className="text-xs text-green-500 mt-2 text-center">Se registrará como gasto en Finanzas</p>
                {confirmItem.existing_product_id && (
                  <p className="text-xs text-blue-500 mt-1 text-center">Se sumará al stock actual en Inventario</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setConfirmItem(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleConfirmPurchase} disabled={confirmingPurchase}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)', opacity: confirmingPurchase ? 0.7 : 1 }}>
                {confirmingPurchase ? 'Procesando...' : '✓ Sí, comprado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
