'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, UserPlus, Loader2 } from 'lucide-react'

interface Props {
  onCreated: (id: string, label: string) => void
  onClose: () => void
}

export default function QuickCreateClient({ onCreated, onClose }: Props) {
  const [first_name, setFirst] = useState('')
  const [last_name, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!first_name.trim() || !last_name.trim()) {
      setError('Nombre y apellido son requeridos')
      return
    }
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('clients')
      .insert([{
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone || null,
        email: email || null,
        loyalty_points: 0,
        total_purchases: 0,
        purchase_count: 0,
      }])
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onCreated(data.id, `${data.first_name} ${data.last_name}`)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Nuevo Cliente</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400"
                placeholder="Juan"
                value={first_name}
                onChange={e => setFirst(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Apellido *</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400"
                placeholder="Pérez"
                value={last_name}
                onChange={e => setLast(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400"
              placeholder="+1 809 000 0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400"
              placeholder="juan@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
            className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Crear Cliente
          </button>
        </div>
      </div>
    </div>
  )
}
