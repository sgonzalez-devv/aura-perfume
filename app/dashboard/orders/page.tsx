'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, AlertTriangle, CheckCircle, ShoppingCart, Eye, ChevronDown } from 'lucide-react'

interface Supplier {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  brand: string
  purchase_price: number
}

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_brand: string
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  subtotal: number
}

interface Order {
  id: string
  order_number: string
  supplier_id: string
  supplier_name: string
  status: string
  subtotal: number
  shipping_cost: number
  total: number
  ordered_at: string
  expected_at: string
  received_at: string
  notes: string
}

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

function statusBadge(status: string) {
  const map: Record<string, { label: string; class: string }> = {
    'pendiente': { label: 'Pendiente', class: 'bg-yellow-50 text-yellow-700' },
    'en_transito': { label: 'En tránsito', class: 'bg-blue-50 text-blue-700' },
    'recibido': { label: 'Recibido', class: 'bg-green-50 text-green-700' },
    'cancelado': { label: 'Cancelado', class: 'bg-red-50 text-red-700' },
  }
  return map[status] || { label: status, class: 'bg-gray-100 text-gray-600' }
}

const InputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
const LabelClass = "block text-xs font-medium text-gray-600 mb-1.5"

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const [detailItems, setDetailItems] = useState<OrderItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [filterStatus, setFilterStatus] = useState('')

  // Form state
  const [formSupplier, setFormSupplier] = useState('')
  const [formStatus, setFormStatus] = useState('pendiente')
  const [formShipping, setFormShipping] = useState(0)
  const [formOrderedAt, setFormOrderedAt] = useState(new Date().toISOString().slice(0, 10))
  const [formExpectedAt, setFormExpectedAt] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formItems, setFormItems] = useState<Array<{ product_id: string; quantity_ordered: number; unit_cost: number }>>([])
  const [saving, setSaving] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('purchase_orders').select('*').order('ordered_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }, [])

  const fetchSuppliers = useCallback(async () => {
    const { data } = await supabase.from('suppliers').select('id, name').order('name')
    setSuppliers(data || [])
  }, [])

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('id, name, brand, purchase_price').eq('is_active', true).order('name')
    setProducts(data || [])
  }, [])

  useEffect(() => {
    Promise.all([fetchOrders(), fetchSuppliers(), fetchProducts()])
  }, [fetchOrders, fetchSuppliers, fetchProducts])

  async function openDetail(order: Order) {
    setDetailOrder(order)
    setDetailLoading(true)
    const { data } = await supabase.from('purchase_order_items').select('*').eq('order_id', order.id)
    setDetailItems(data || [])
    setDetailLoading(false)
  }

  function resetForm() {
    setFormSupplier('')
    setFormStatus('pendiente')
    setFormShipping(0)
    setFormOrderedAt(new Date().toISOString().slice(0, 10))
    setFormExpectedAt('')
    setFormNotes('')
    setFormItems([])
  }

  function openModal() {
    resetForm()
    setShowModal(true)
  }

  function addItem() {
    setFormItems(items => [...items, { product_id: '', quantity_ordered: 1, unit_cost: 0 }])
  }

  function updateItem(idx: number, field: string, value: string | number) {
    setFormItems(items => items.map((item, i) => {
      if (i !== idx) return item
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value)
        return { ...item, product_id: value as string, unit_cost: prod?.purchase_price || 0 }
      }
      return { ...item, [field]: value }
    }))
  }

  async function handleCreate() {
    if (!formSupplier) { showToast('Selecciona un proveedor', 'error'); return }
    if (formItems.length === 0) { showToast('Agrega al menos un producto', 'error'); return }
    setSaving(true)

    const supplier = suppliers.find(s => s.id === formSupplier)
    const subtotal = formItems.reduce((s, i) => s + (i.unit_cost * i.quantity_ordered), 0)
    const total = subtotal + formShipping
    const orderNumber = `OC-${Date.now()}`

    const { data: orderData, error } = await supabase.from('purchase_orders').insert([{
      order_number: orderNumber,
      supplier_id: formSupplier,
      supplier_name: supplier?.name || '',
      status: formStatus,
      subtotal, shipping_cost: formShipping, total,
      ordered_at: formOrderedAt,
      expected_at: formExpectedAt || null,
      notes: formNotes,
    }]).select().single()

    if (error || !orderData) { showToast('Error al crear orden', 'error'); setSaving(false); return }

    const items = formItems.map(i => {
      const prod = products.find(p => p.id === i.product_id)
      return {
        order_id: orderData.id,
        product_id: i.product_id,
        product_name: prod?.name || '',
        product_brand: prod?.brand || '',
        quantity_ordered: i.quantity_ordered,
        quantity_received: 0,
        unit_cost: i.unit_cost,
        subtotal: i.unit_cost * i.quantity_ordered,
      }
    })
    await supabase.from('purchase_order_items').insert(items)

    showToast('Orden de compra creada', 'success')
    setShowModal(false)
    resetForm()
    fetchOrders()
    setSaving(false)
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'recibido') updates.received_at = new Date().toISOString()
    await supabase.from('purchase_orders').update(updates).eq('id', orderId)
    showToast('Estado actualizado', 'success')
    fetchOrders()
    if (detailOrder?.id === orderId) {
      setDetailOrder(prev => prev ? { ...prev, status: newStatus } : null)
    }
  }

  const filtered = orders.filter(o => !filterStatus || o.status === filterStatus)
  const subtotalItems = formItems.reduce((s, i) => s + (i.unit_cost * i.quantity_ordered), 0)
  const totalOrder = subtotalItems + formShipping

  return (
    <div className="p-6 lg:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
            Órdenes de Compra
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{orders.length} órdenes registradas</p>
        </div>
        <button onClick={openModal} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
          <Plus className="w-4 h-4" />
          Nueva Orden
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 mb-6">
        <div className="flex gap-3 items-center flex-wrap">
          <span className="text-sm text-gray-500">Estado:</span>
          {[{ value: '', label: 'Todos' }, { value: 'pendiente', label: 'Pendiente' }, { value: 'en_transito', label: 'En tránsito' }, { value: 'recibido', label: 'Recibido' }, { value: 'cancelado', label: 'Cancelado' }].map(opt => (
            <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: filterStatus === opt.value ? '#7c3aed' : '#f5f3ff',
                color: filterStatus === opt.value ? 'white' : '#7c3aed',
              }}>
              {opt.label}
            </button>
          ))}
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
            <ShoppingCart className="w-14 h-14 mx-auto mb-4 text-gray-200" />
            <p className="text-gray-400 mb-4">No hay órdenes de compra</p>
            <button onClick={openModal} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
              Crear primera orden
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#faf9ff' }}>
                  {['#Orden', 'Proveedor', 'Estado', 'Subtotal', 'Envío', 'Total', 'Ordenado', 'Esperado', ''].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(order => {
                  const badge = statusBadge(order.status)
                  return (
                    <tr key={order.id} className="table-row-hover transition-colors cursor-pointer" onClick={() => openDetail(order)}>
                      <td className="px-5 py-4 text-sm font-bold" style={{ color: '#7c3aed' }}>#{order.order_number}</td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-800">{order.supplier_name}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badge.class}`}>{badge.label}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{formatDOP(order.subtotal)}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{formatDOP(order.shipping_cost)}</td>
                      <td className="px-5 py-4 text-sm font-bold text-gray-800">{formatDOP(order.total)}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{order.ordered_at ? order.ordered_at.slice(0, 10) : '—'}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{order.expected_at ? order.expected_at.slice(0, 10) : '—'}</td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openDetail(order)} className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Panel */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex justify-end modal-overlay" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setDetailOrder(null)}>
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #1a0835, #2d0f5e)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'rgba(201,168,76,0.7)' }}>Orden de Compra</p>
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>#{detailOrder.order_number}</h3>
                  <p className="text-white/60 text-sm mt-0.5">{detailOrder.supplier_name}</p>
                </div>
                <button onClick={() => setDetailOrder(null)} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status + Actions */}
              <div className="flex items-center justify-between">
                <span className={`text-sm px-3 py-1.5 rounded-full font-semibold ${statusBadge(detailOrder.status).class}`}>
                  {statusBadge(detailOrder.status).label}
                </span>
                <div className="flex gap-2">
                  {detailOrder.status === 'pendiente' && (
                    <>
                      <button onClick={() => updateOrderStatus(detailOrder.id, 'en_transito')}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100">
                        Marcar en tránsito
                      </button>
                      <button onClick={() => updateOrderStatus(detailOrder.id, 'cancelado')}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-700 hover:bg-red-100">
                        Cancelar
                      </button>
                    </>
                  )}
                  {detailOrder.status === 'en_transito' && (
                    <button onClick={() => updateOrderStatus(detailOrder.id, 'recibido')}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-green-50 text-green-700 hover:bg-green-100">
                      Marcar como recibido
                    </button>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: '#f5f3ff' }}>
                  <p className="text-xs text-gray-400 mb-1">Fecha de orden</p>
                  <p className="text-sm font-semibold text-gray-700">{detailOrder.ordered_at?.slice(0, 10) || '—'}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: '#f5f3ff' }}>
                  <p className="text-xs text-gray-400 mb-1">Fecha esperada</p>
                  <p className="text-sm font-semibold text-gray-700">{detailOrder.expected_at?.slice(0, 10) || '—'}</p>
                </div>
                {detailOrder.received_at && (
                  <div className="p-3 rounded-xl col-span-2" style={{ background: '#f0fdf4' }}>
                    <p className="text-xs text-gray-400 mb-1">Fecha recibida</p>
                    <p className="text-sm font-semibold text-green-700">{detailOrder.received_at.slice(0, 10)}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Productos de la orden</h4>
                {detailLoading ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Cargando...</div>
                ) : detailItems.length === 0 ? (
                  <p className="text-center py-6 text-gray-400 text-sm">Sin productos</p>
                ) : (
                  <div className="space-y-2">
                    {detailItems.map(item => (
                      <div key={item.id} className="p-3 rounded-xl" style={{ background: '#faf9ff', border: '1px solid #e9d5ff' }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
                            <p className="text-xs text-gray-400">{item.product_brand}</p>
                          </div>
                          <p className="text-sm font-bold" style={{ color: '#7c3aed' }}>{formatDOP(item.subtotal)}</p>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Pedido: <span className="font-medium text-gray-700">{item.quantity_ordered}</span></span>
                          <span>Recibido: <span className="font-medium text-gray-700">{item.quantity_received}</span></span>
                          <span>Costo: <span className="font-medium text-gray-700">{formatDOP(item.unit_cost)}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="rounded-xl p-4" style={{ background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatDOP(detailOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Envío</span>
                    <span className="font-medium">{formatDOP(detailOrder.shipping_cost)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-purple-200 pt-2 mt-2">
                    <span style={{ color: '#7c3aed' }}>Total</span>
                    <span style={{ color: '#7c3aed' }}>{formatDOP(detailOrder.total)}</span>
                  </div>
                </div>
              </div>

              {detailOrder.notes && (
                <div className="rounded-xl p-4 bg-gray-50">
                  <p className="text-xs font-medium text-gray-400 mb-1">Notas</p>
                  <p className="text-sm text-gray-700">{detailOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>Nueva Orden de Compra</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LabelClass}>Proveedor *</label>
                  <select className={InputClass} value={formSupplier} onChange={e => setFormSupplier(e.target.value)}>
                    <option value="">Seleccionar proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Estado</label>
                  <select className={InputClass} value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_transito">En tránsito</option>
                    <option value="recibido">Recibido</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Fecha de orden</label>
                  <input type="date" className={InputClass} value={formOrderedAt} onChange={e => setFormOrderedAt(e.target.value)} />
                </div>
                <div>
                  <label className={LabelClass}>Fecha esperada</label>
                  <input type="date" className={InputClass} value={formExpectedAt} onChange={e => setFormExpectedAt(e.target.value)} />
                </div>
                <div>
                  <label className={LabelClass}>Costo de envío (DOP)</label>
                  <input type="number" className={InputClass} value={formShipping || ''} onChange={e => setFormShipping(parseFloat(e.target.value) || 0)} placeholder="0" />
                </div>
              </div>

              {/* Product lines */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">Productos *</label>
                  <button onClick={addItem} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
                <div className="space-y-3">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl" style={{ background: '#faf9ff', border: '1px solid #e9d5ff' }}>
                      <div className="col-span-5">
                        <select className={InputClass} value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                          <option value="">Seleccionar producto</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} — {p.brand}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" className={InputClass} value={item.quantity_ordered} min={1} onChange={e => updateItem(idx, 'quantity_ordered', parseInt(e.target.value) || 1)} placeholder="Cant." />
                      </div>
                      <div className="col-span-3">
                        <input type="number" className={InputClass} value={item.unit_cost || ''} onChange={e => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)} placeholder="Costo unit." />
                      </div>
                      <div className="col-span-1 text-xs text-gray-500 text-center">{formatDOP(item.unit_cost * item.quantity_ordered)}</div>
                      <div className="col-span-1">
                        <button onClick={() => setFormItems(items => items.filter((_, i) => i !== idx))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {formItems.length === 0 && (
                    <div className="text-center py-6 rounded-xl text-gray-400 text-sm" style={{ border: '2px dashed #e9d5ff' }}>
                      Agrega productos a la orden
                    </div>
                  )}
                </div>
              </div>

              {formItems.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: '#f5f3ff', border: '1px solid #e9d5ff' }}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Subtotal productos</span>
                    <span className="font-medium">{formatDOP(subtotalItems)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Costo de envío</span>
                    <span className="font-medium">{formatDOP(formShipping)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-purple-200 pt-2">
                    <span style={{ color: '#7c3aed' }}>Total Orden</span>
                    <span style={{ color: '#7c3aed' }}>{formatDOP(totalOrder)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className={LabelClass}>Notas</label>
                <textarea className={InputClass + ' min-h-[70px] resize-none'} value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Observaciones de la orden..." />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Creando...' : 'Crear Orden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
