'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, CheckCircle, AlertTriangle, ShoppingBag, Check, Trash2, RotateCcw, PackagePlus } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

interface ShoppingItem {
  id: string
  brand: string
  name: string
  notes: string
  is_purchased: boolean
  purchased_at: string | null
  created_at: string
}

const InputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
const LabelClass = "block text-xs font-medium text-gray-600 mb-1.5"

export default function ShoppingListPage() {
  const router = useRouter()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'purchased'>('pending')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ brand: '', name: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('shopping_list')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function handleAdd() {
    if (!form.brand.trim() || !form.name.trim()) {
      showToast('Marca y nombre son requeridos', 'error')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('shopping_list').insert([{
      brand: form.brand.trim(),
      name: form.name.trim(),
      notes: form.notes.trim(),
    }])
    if (error) showToast('Error al agregar item', 'error')
    else {
      showToast('Agregado a la lista', 'success')
      setForm({ brand: '', name: '', notes: '' })
      setShowForm(false)
      fetchItems()
    }
    setSaving(false)
  }

  async function handleMarkPurchased(id: string) {
    await supabase.from('shopping_list').update({
      is_purchased: true,
      purchased_at: new Date().toISOString(),
    }).eq('id', id)
    showToast('Marcado como comprado', 'success')
    fetchItems()
  }

  async function handleUndo(id: string) {
    await supabase.from('shopping_list').update({
      is_purchased: false,
      purchased_at: null,
    }).eq('id', id)
    fetchItems()
  }

  async function handleDelete(id: string) {
    await supabase.from('shopping_list').delete().eq('id', id)
    showToast('Eliminado', 'success')
    fetchItems()
  }

  function handleAddToInventory(item: ShoppingItem) {
    const params = new URLSearchParams({ brand: item.brand, name: item.name })
    router.push(`/dashboard/inventory?${params.toString()}`)
  }

  const pending = items.filter(i => !i.is_purchased)
  const purchased = items.filter(i => i.is_purchased)
  const shown = tab === 'pending' ? pending : purchased

  return (
    <div className="p-6 lg:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Lista de Compras
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Perfumes pendientes de comprar al proveedor</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
          <Plus className="w-4 h-4" /> Agregar perfume
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Nuevo item</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={LabelClass}>Marca *</label>
              <input
                className={InputClass}
                value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                placeholder="Ej. Dior, Chanel, YSL..."
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div>
              <label className={LabelClass}>Nombre del perfume *</label>
              <input
                className={InputClass}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Sauvage, N°5..."
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div>
              <label className={LabelClass}>Notas (opcional)</label>
              <input
                className={InputClass}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ej. 100ml, para reponer stock..."
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { setShowForm(false); setForm({ brand: '', name: '', notes: '' }) }}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : 'Agregar a la lista'}
            </button>
          </div>
        </div>
      )}

      {/* Summary chips */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('pending')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: tab === 'pending' ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : 'white',
            color: tab === 'pending' ? 'white' : '#6b7280',
            boxShadow: tab === 'pending' ? '0 4px 12px rgba(124,58,237,0.25)' : '0 1px 3px rgba(0,0,0,0.08)',
          }}>
          <ShoppingBag className="w-4 h-4" />
          Pendientes
          {pending.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md text-xs font-bold"
              style={{ background: tab === 'pending' ? 'rgba(255,255,255,0.25)' : '#ede9fe', color: tab === 'pending' ? 'white' : '#7c3aed' }}>
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('purchased')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: tab === 'purchased' ? '#059669' : 'white',
            color: tab === 'purchased' ? 'white' : '#6b7280',
            boxShadow: tab === 'purchased' ? '0 4px 12px rgba(5,150,105,0.25)' : '0 1px 3px rgba(0,0,0,0.08)',
          }}>
          <Check className="w-4 h-4" />
          Comprados
          {purchased.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md text-xs font-bold"
              style={{ background: tab === 'purchased' ? 'rgba(255,255,255,0.25)' : '#d1fae5', color: tab === 'purchased' ? 'white' : '#059669' }}>
              {purchased.length}
            </span>
          )}
        </button>
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
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#f5f3ff' }}>
              <ShoppingBag className="w-8 h-8" style={{ color: '#7c3aed' }} />
            </div>
            <p className="text-gray-700 font-semibold text-base mb-1">
              {tab === 'pending' ? 'Lista vacía' : 'Sin compras registradas'}
            </p>
            <p className="text-gray-400 text-sm max-w-xs">
              {tab === 'pending'
                ? 'Agrega los perfumes que quieres comprar al proveedor. Cuando los compres, márcalos y agrégalos al inventario.'
                : 'Los perfumes que marques como comprados aparecerán aquí.'}
            </p>
            {tab === 'pending' && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                <Plus className="w-4 h-4" /> Agregar perfume
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {shown.map(item => (
              <li key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group">
                {/* Check button / status */}
                {tab === 'pending' ? (
                  <button
                    onClick={() => handleMarkPurchased(item.id)}
                    title="Marcar como comprado"
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
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: '#ede9fe', color: '#7c3aed' }}>
                      {item.brand}
                    </span>
                    <span className={`text-sm font-medium ${item.is_purchased ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.name}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
                  )}
                  {item.is_purchased && item.purchased_at && (
                    <p className="text-xs text-green-500 mt-0.5">
                      Comprado el {new Date(item.purchased_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {tab === 'pending' && (
                    <button
                      onClick={() => handleAddToInventory(item)}
                      title="Abrir en inventario"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-purple-50"
                      style={{ color: '#7c3aed' }}>
                      <PackagePlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Agregar al inventario</span>
                    </button>
                  )}
                  {tab === 'purchased' && (
                    <button
                      onClick={() => handleUndo(item.id)}
                      title="Mover a pendientes"
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Eliminar"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tip for pending tab */}
      {tab === 'pending' && pending.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          Marca un perfume como comprado para luego cargarlo al inventario con toda la información de precio y stock.
        </p>
      )}
    </div>
  )
}
