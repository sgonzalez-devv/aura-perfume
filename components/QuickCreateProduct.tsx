'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Package, Loader2 } from 'lucide-react'

interface Props {
  onCreated: (id: string, label: string, sellingPrice: number, purchasePrice: number) => void
  onClose: () => void
}

export default function QuickCreateProduct({ onCreated, onClose }: Props) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [purchase_price, setPurchase] = useState('')
  const [selling_price, setSelling] = useState('')
  const [stock_quantity, setStock] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim() || !brand.trim()) {
      setError('Nombre y marca son requeridos')
      return
    }
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('products')
      .insert([{
        name: name.trim(),
        brand: brand.trim(),
        purchase_price: Number(purchase_price) || 0,
        selling_price: Number(selling_price) || 0,
        stock_quantity: Number(stock_quantity) || 0,
        is_active: true,
      }])
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onCreated(data.id, `${data.name} — ${data.brand}`, data.selling_price, data.purchase_price)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Nuevo Producto</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
              placeholder="Black Orchid"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Marca *</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
              placeholder="Tom Ford"
              value={brand}
              onChange={e => setBrand(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio compra</label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
                placeholder="0"
                value={purchase_price}
                onChange={e => setPurchase(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio venta</label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
                placeholder="0"
                value={selling_price}
                onChange={e => setSelling(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Stock inicial</label>
            <input
              type="number"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
              placeholder="0"
              value={stock_quantity}
              onChange={e => setStock(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Crear Producto
          </button>
        </div>
      </div>
    </div>
  )
}
