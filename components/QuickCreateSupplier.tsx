'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Building2, Loader2 } from 'lucide-react'

interface Props {
  onCreated: (id: string, name: string) => void
  onClose: () => void
}

export default function QuickCreateSupplier({ onCreated, onClose }: Props) {
  const [name, setName] = useState('')
  const [contact_name, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('suppliers')
      .insert([{
        name: name.trim(),
        contact_name: contact_name || null,
        phone: phone || null,
        country: country || null,
      }])
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onCreated(data.id, data.name)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Nuevo Proveedor</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
              placeholder="Fragrance Supply Co."
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contacto</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
              placeholder="María García"
              value={contact_name}
              onChange={e => setContact(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
              placeholder="+1 809 000 0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">País</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
              placeholder="República Dominicana"
              value={country}
              onChange={e => setCountry(e.target.value)}
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
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Crear Proveedor
          </button>
        </div>
      </div>
    </div>
  )
}
