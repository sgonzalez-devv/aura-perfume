'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Plus, Edit2, Star, Phone, MessageCircle, Download, X, AlertTriangle, CheckCircle, Users, Cake, ChevronRight } from 'lucide-react'

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  whatsapp: string
  city: string
  birthday: string
  gender: string
  notes: string
  loyalty_points: number
  vip_status: boolean
  total_purchases: number
  purchase_count: number
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

function isBirthdayThisMonth(birthday: string) {
  if (!birthday) return false
  const month = parseInt(birthday.split('-')[1])
  return month === new Date().getMonth() + 1
}

const emptyClient: Omit<Client, 'id'> = {
  first_name: '', last_name: '', email: '', phone: '', whatsapp: '',
  city: '', birthday: '', gender: '', notes: '',
  loyalty_points: 0, vip_status: false, total_purchases: 0, purchase_count: 0,
}

const InputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
const LabelClass = "block text-xs font-medium text-gray-600 mb-1.5"

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<Omit<Client, 'id'>>(emptyClient)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [selected, setSelected] = useState<Client | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const fetchClients = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('first_name')
    setClients(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  function openAdd() {
    setEditing(null)
    setForm(emptyClient)
    setShowModal(true)
  }

  function openEdit(c: Client, e?: React.MouseEvent) {
    e?.stopPropagation()
    setEditing(c)
    const { id, ...rest } = c
    setForm(rest)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(emptyClient)
  }

  async function handleSave() {
    if (!form.first_name || !form.last_name) {
      showToast('Nombre y apellido son requeridos', 'error')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      email: form.email || null,       // avoid unique constraint on empty string
      birthday: form.birthday || null, // empty string fails date column
      gender: form.gender || null,
      loyalty_points: Number(form.loyalty_points),
      total_purchases: Number(form.total_purchases),
      purchase_count: Number(form.purchase_count),
    }
    if (editing) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editing.id)
      if (error) showToast('Error al actualizar cliente', 'error')
      else { showToast('Cliente actualizado', 'success'); closeModal(); fetchClients() }
    } else {
      const { error } = await supabase.from('clients').insert([payload])
      if (error) showToast('Error al crear cliente', 'error')
      else { showToast('Cliente creado correctamente', 'success'); closeModal(); fetchClients() }
    }
    setSaving(false)
  }

  function exportCSV() {
    const headers = ['Nombre', 'Apellido', 'Email', 'Teléfono', 'WhatsApp', 'Ciudad', 'Cumpleaños', 'Género', 'Puntos', 'VIP', 'Total Compras', 'Nº Compras']
    const rows = clients.map(c => [
      c.first_name, c.last_name, c.email, c.phone, c.whatsapp,
      c.city, c.birthday, c.gender, c.loyalty_points,
      c.vip_status ? 'Sí' : 'No', c.total_purchases, c.purchase_count
    ])
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `clientes-aura-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    showToast('CSV exportado correctamente', 'success')
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) || c.phone?.includes(q) || c.city?.toLowerCase().includes(q)
  })

  return (
    <div className="p-6 lg:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Clientes
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{clients.length} clientes registrados</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono o ciudad..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100"
          />
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
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#faf9ff' }}>
                  {['Cliente', 'Contacto', 'Ciudad', 'Puntos', 'Total Gastado', 'Compras', 'VIP', ''].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c.id} className="table-row-hover transition-colors cursor-pointer" onClick={() => setSelected(c)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: c.vip_status ? 'linear-gradient(135deg, #c9a84c, #a07c2a)' : 'linear-gradient(135deg, #e9d5ff, #c4b5fd)', color: c.vip_status ? 'white' : '#7c3aed' }}>
                          {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {c.first_name} {c.last_name}
                            {isBirthdayThisMonth(c.birthday) && <span className="ml-1">🎂</span>}
                          </p>
                          <p className="text-xs text-gray-400">{c.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {c.phone && (
                          <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        {c.whatsapp && (
                          <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-500 transition-colors">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <span className="text-xs text-gray-500">{c.phone || c.whatsapp || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{c.city || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold" style={{ color: '#7c3aed' }}>{c.loyalty_points || 0} pts</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-800">{formatDOP(c.total_purchases)}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 text-center">{c.purchase_count || 0}</td>
                    <td className="px-5 py-4">
                      {c.vip_status && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                          style={{ background: '#fef9c3', color: '#a07c2a' }}>
                          <Star className="w-3 h-3 fill-current" /> VIP
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                      <button onClick={e => openEdit(c, e)} className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Client Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end modal-overlay" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1a0835, #2d0f5e)' }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ background: selected.vip_status ? 'linear-gradient(135deg, #c9a84c, #a07c2a)' : 'rgba(255,255,255,0.15)', color: 'white' }}>
                  {selected.first_name.charAt(0)}{selected.last_name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {selected.first_name} {selected.last_name}
                  </h3>
                  {selected.vip_status && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold mt-1"
                      style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                      <Star className="w-3 h-3 fill-current" /> Cliente VIP
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 rounded-xl" style={{ background: '#f5f3ff' }}>
                  <p className="text-xl font-bold" style={{ color: '#7c3aed' }}>{formatDOP(selected.total_purchases)}</p>
                  <p className="text-xs text-gray-500 mt-1">Total gastado</p>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ background: '#f0fdf4' }}>
                  <p className="text-xl font-bold text-green-600">{selected.purchase_count || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Compras</p>
                </div>
                <div className="text-center p-4 rounded-xl" style={{ background: '#fffbeb' }}>
                  <p className="text-xl font-bold" style={{ color: '#c9a84c' }}>{selected.loyalty_points || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Puntos</p>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3">
                {[
                  { label: 'Email', value: selected.email, icon: '✉️' },
                  { label: 'Teléfono', value: selected.phone, icon: '📞' },
                  { label: 'WhatsApp', value: selected.whatsapp, icon: '💬' },
                  { label: 'Ciudad', value: selected.city, icon: '📍' },
                  { label: 'Género', value: selected.gender, icon: '👤' },
                  { label: 'Cumpleaños', value: selected.birthday ? new Date(selected.birthday + 'T00:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) + (isBirthdayThisMonth(selected.birthday) ? ' 🎂' : '') : null, icon: '🎉' },
                ].filter(f => f.value).map(field => (
                  <div key={field.label} className="flex items-center gap-3 text-sm">
                    <span className="w-7 text-center">{field.icon}</span>
                    <div>
                      <span className="text-xs text-gray-400 block">{field.label}</span>
                      <span className="text-gray-700 font-medium">{field.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {selected.notes && (
                <div className="rounded-xl p-4" style={{ background: '#faf9ff', border: '1px solid #e9d5ff' }}>
                  <p className="text-xs font-medium text-gray-500 mb-2">Notas</p>
                  <p className="text-sm text-gray-700">{selected.notes}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { openEdit(selected); setSelected(null) }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
                {selected.whatsapp && (
                  <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                    style={{ background: '#25d366' }}>
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {editing ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LabelClass}>Nombre *</label>
                  <input className={InputClass} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Juan" />
                </div>
                <div>
                  <label className={LabelClass}>Apellido *</label>
                  <input className={InputClass} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Pérez" />
                </div>
                <div>
                  <label className={LabelClass}>Email</label>
                  <input type="email" className={InputClass} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@ejemplo.com" />
                </div>
                <div>
                  <label className={LabelClass}>Teléfono</label>
                  <input className={InputClass} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 809 000 0000" />
                </div>
                <div>
                  <label className={LabelClass}>WhatsApp</label>
                  <input className={InputClass} value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+1 809 000 0000" />
                </div>
                <div>
                  <label className={LabelClass}>Ciudad</label>
                  <input className={InputClass} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Santo Domingo" />
                </div>
                <div>
                  <label className={LabelClass}>Cumpleaños</label>
                  <input type="date" className={InputClass} value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))} />
                </div>
                <div>
                  <label className={LabelClass}>Género</label>
                  <select className={InputClass} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Seleccionar</option>
                    <option>Masculino</option>
                    <option>Femenino</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div>
                  <label className={LabelClass}>Puntos de Lealtad</label>
                  <input type="number" className={InputClass} value={form.loyalty_points || ''} onChange={e => setForm(f => ({ ...f, loyalty_points: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <label className={LabelClass}>Notas</label>
                <textarea className={InputClass + ' min-h-[80px] resize-none'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Preferencias, alergias, observaciones..." />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="vip" checked={form.vip_status} onChange={e => setForm(f => ({ ...f, vip_status: e.target.checked }))} className="w-4 h-4 accent-yellow-500" />
                <label htmlFor="vip" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-500" /> Cliente VIP
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
