'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle, Truck, Mail, Phone, Globe } from 'lucide-react'

interface Supplier {
  id: string
  name: string
  contact_name: string
  email: string
  phone: string
  country: string
  notes: string
}

interface SupplierWithCount extends Supplier {
  product_count: number
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

const emptySupplier: Omit<Supplier, 'id'> = { name: '', contact_name: '', email: '', phone: '', country: '', notes: '' }
const InputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
const LabelClass = "block text-xs font-medium text-gray-600 mb-1.5"

const COUNTRY_FLAGS: Record<string, string> = {
  'República Dominicana': '🇩🇴', 'USA': '🇺🇸', 'Estados Unidos': '🇺🇸',
  'Francia': '🇫🇷', 'España': '🇪🇸', 'Italia': '🇮🇹', 'Colombia': '🇨🇴',
  'México': '🇲🇽', 'Panamá': '🇵🇦', 'Reino Unido': '🇬🇧',
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState<Omit<Supplier, 'id'>>(emptySupplier)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    const [{ data: supps }, { data: prods }] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('supplier_id').eq('is_active', true),
    ])
    const countMap: Record<string, number> = {}
    ;(prods || []).forEach(p => {
      if (p.supplier_id) countMap[p.supplier_id] = (countMap[p.supplier_id] || 0) + 1
    })
    setSuppliers((supps || []).map(s => ({ ...s, product_count: countMap[s.id] || 0 })))
    setLoading(false)
  }, [])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  function openAdd() {
    setEditing(null)
    setForm(emptySupplier)
    setShowModal(true)
  }

  function openEdit(s: Supplier) {
    setEditing(s)
    const { id, ...rest } = s
    setForm(rest)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditing(null)
    setForm(emptySupplier)
  }

  async function handleSave() {
    if (!form.name) { showToast('El nombre es requerido', 'error'); return }
    setSaving(true)
    if (editing) {
      const { error } = await supabase.from('suppliers').update(form).eq('id', editing.id)
      if (error) showToast('Error al actualizar proveedor', 'error')
      else { showToast('Proveedor actualizado', 'success'); closeModal(); fetchSuppliers() }
    } else {
      const { error } = await supabase.from('suppliers').insert([form])
      if (error) showToast('Error al crear proveedor', 'error')
      else { showToast('Proveedor creado correctamente', 'success'); closeModal(); fetchSuppliers() }
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) showToast('Error al eliminar proveedor', 'error')
    else { showToast('Proveedor eliminado', 'success'); fetchSuppliers() }
    setDeleteConfirm(null)
  }

  function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  const gradients = [
    'linear-gradient(135deg, #7c3aed, #5b21b6)',
    'linear-gradient(135deg, #c9a84c, #a07c2a)',
    'linear-gradient(135deg, #059669, #047857)',
    'linear-gradient(135deg, #dc2626, #b91c1c)',
    'linear-gradient(135deg, #2563eb, #1d4ed8)',
    'linear-gradient(135deg, #d97706, #b45309)',
  ]

  return (
    <div className="p-6 lg:p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
            Proveedores
          </h1>
          <p className="text-gray-500 mt-1 text-sm">{suppliers.length} proveedores registrados</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="w-8 h-8 animate-spin" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-20">
          <Truck className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 mb-4">No hay proveedores registrados</p>
          <button onClick={openAdd} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
            Agregar primer proveedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {suppliers.map((s, i) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden hover:shadow-card-hover transition-all">
              {/* Card header */}
              <div className="p-5" style={{ background: gradients[i % gradients.length] }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: 'rgba(255,255,255,0.2)' }}>
                      {getInitials(s.name)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>{s.name}</h3>
                      {s.country && (
                        <p className="text-xs text-white/70 mt-0.5">
                          {COUNTRY_FLAGS[s.country] || '🌍'} {s.country}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-all">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card body */}
              <div className="p-5 space-y-3">
                {s.contact_name && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">👤</div>
                    <span>{s.contact_name}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <a href={`mailto:${s.email}`} className="text-purple-600 hover:underline truncate">{s.email}</a>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <a href={`tel:${s.phone}`} className="hover:text-purple-600">{s.phone}</a>
                  </div>
                )}
                {s.notes && (
                  <div className="mt-3 p-3 rounded-xl bg-gray-50 text-xs text-gray-500 leading-relaxed">
                    {s.notes}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <span className="text-xs text-gray-400">Productos activos</span>
                  <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                    {s.product_count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">¿Eliminar proveedor?</h3>
            <p className="text-sm text-gray-500 mb-6">Los productos asociados no serán eliminados.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Playfair Display, serif' }}>
                {editing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={LabelClass}>Nombre de la empresa *</label>
                <input className={InputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej. Fragrance World" />
              </div>
              <div>
                <label className={LabelClass}>Nombre del contacto</label>
                <input className={InputClass} value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Ej. María García" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LabelClass}>Email</label>
                  <input type="email" className={InputClass} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contacto@empresa.com" />
                </div>
                <div>
                  <label className={LabelClass}>Teléfono</label>
                  <input className={InputClass} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 809 000 0000" />
                </div>
              </div>
              <div>
                <label className={LabelClass}>País</label>
                <input className={InputClass} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Ej. República Dominicana" />
              </div>
              <div>
                <label className={LabelClass}>Notas</label>
                <textarea className={InputClass + ' min-h-[80px] resize-none'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Términos de pago, condiciones especiales, observaciones..." />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
