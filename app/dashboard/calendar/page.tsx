'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Truck, ShoppingBag,
  Calendar, AlertCircle, CheckCircle,
} from 'lucide-react'

interface CalendarTask {
  id: string
  type: 'pedido' | 'envio'
  date: string
  supplier_id: string | null
  supplier_name: string
  client_id: string | null
  client_name: string
  product_name: string
  notes: string
  is_done: boolean
  created_by: string
  created_at: string
}

interface Supplier { id: string; name: string }
interface Client { id: string; first_name: string; last_name: string }

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  // Start on Monday
  const diff = (day === 0 ? -6 : 1 - day)
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

const InputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
const LabelClass = "block text-xs font-medium text-gray-600 mb-1.5"

export default function CalendarPage() {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState<CalendarTask[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalDate, setModalDate] = useState('')
  const [form, setForm] = useState({
    type: 'pedido' as 'pedido' | 'envio',
    supplier_id: '',
    client_id: '',
    product_name: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const authorName = profile?.full_name || user?.email?.split('@')[0] || 'Equipo'

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = isoDate(new Date())

  // Fetch range: entire week ±1 for buffer
  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const from = isoDate(addDays(weekStart, -1))
    const to = isoDate(addDays(weekStart, 8))
    const { data } = await supabase
      .from('calendar_tasks')
      .select('*')
      .gte('date', from)
      .lte('date', to)
      .order('created_at')
    setTasks(data || [])
    setLoading(false)
  }, [weekStart])

  const fetchMeta = useCallback(async () => {
    const [{ data: supps }, { data: cls }] = await Promise.all([
      supabase.from('suppliers').select('id, name').order('name'),
      supabase.from('clients').select('id, first_name, last_name').order('first_name'),
    ])
    setSuppliers(supps || [])
    setClients(cls || [])
  }, [])

  useEffect(() => { fetchMeta() }, [fetchMeta])
  useEffect(() => { fetchTasks() }, [fetchTasks])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_tasks' }, fetchTasks)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchTasks])

  function openModal(date: string) {
    setModalDate(date)
    setForm({ type: 'pedido', supplier_id: '', client_id: '', product_name: '', notes: '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.product_name.trim()) return
    if (form.type === 'pedido' && !form.supplier_id) return
    if (form.type === 'envio' && !form.client_id) return
    setSaving(true)

    const supplier = suppliers.find(s => s.id === form.supplier_id)
    const client = clients.find(c => c.id === form.client_id)

    await supabase.from('calendar_tasks').insert([{
      type: form.type,
      date: modalDate,
      supplier_id: form.type === 'pedido' ? form.supplier_id || null : null,
      supplier_name: form.type === 'pedido' ? supplier?.name || '' : '',
      client_id: form.type === 'envio' ? form.client_id || null : null,
      client_name: form.type === 'envio' ? `${client?.first_name} ${client?.last_name}`.trim() : '',
      product_name: form.product_name.trim(),
      notes: form.notes.trim(),
      created_by: authorName,
    }])

    setShowModal(false)
    setSaving(false)
  }

  async function toggleDone(task: CalendarTask) {
    await supabase.from('calendar_tasks').update({ is_done: !task.is_done }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_done: !t.is_done } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('calendar_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function goToday() { setWeekStart(startOfWeek(new Date())) }
  function prevWeek() { setWeekStart(d => addDays(d, -7)) }
  function nextWeek() { setWeekStart(d => addDays(d, 7)) }

  const tasksByDay = (date: string) => tasks.filter(t => t.date === date)
  const pendingToday = tasks.filter(t => t.date === today && !t.is_done)

  const weekLabel = (() => {
    const end = addDays(weekStart, 6)
    if (weekStart.getMonth() === end.getMonth())
      return `${weekStart.getDate()}–${end.getDate()} ${MONTHS_ES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
    return `${weekStart.getDate()} ${MONTHS_ES[weekStart.getMonth()]} – ${end.getDate()} ${MONTHS_ES[end.getMonth()]} ${end.getFullYear()}`
  })()

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Calendario
          </h1>
          <p className="text-gray-400 text-sm mt-1">Pedidos a suplidores y envíos a clientes</p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Hoy
          </button>
          <button onClick={nextWeek} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-600 ml-1 hidden sm:inline">{weekLabel}</span>
        </div>
      </div>

      {/* Week label on mobile */}
      <p className="text-sm font-medium text-gray-500 mb-4 sm:hidden text-center">{weekLabel}</p>

      {/* Today banner */}
      {pendingToday.length > 0 && (
        <div className="mb-5 rounded-2xl p-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '1px solid #fca5a5' }}>
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">
            Tienes {pendingToday.length} tarea{pendingToday.length > 1 ? 's' : ''} pendiente{pendingToday.length > 1 ? 's' : ''} para hoy
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-gray-500 font-medium">Pedido a suplidor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-500 font-medium">Envío a cliente</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
        {weekDays.map(day => {
          const dateStr = isoDate(day)
          const isToday = dateStr === today
          const dayTasks = tasksByDay(dateStr)
          const pending = dayTasks.filter(t => !t.is_done)
          const done = dayTasks.filter(t => t.is_done)

          return (
            <div key={dateStr}
              className="rounded-2xl border flex flex-col min-h-[180px] overflow-hidden transition-shadow hover:shadow-md"
              style={{
                borderColor: isToday ? '#7c3aed' : '#e5e7eb',
                background: isToday ? 'linear-gradient(180deg, #f5f3ff 0%, white 60%)' : 'white',
                boxShadow: isToday ? '0 0 0 2px #c4b5fd' : undefined,
              }}>
              {/* Day header */}
              <div className="px-3 py-2.5 flex items-center justify-between"
                style={{ borderBottom: `1px solid ${isToday ? '#e9d5ff' : '#f3f4f6'}` }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: isToday ? '#7c3aed' : '#9ca3af' }}>
                    {DAYS_ES[day.getDay()]}
                  </p>
                  <p className="text-lg font-bold leading-tight" style={{ color: isToday ? '#7c3aed' : '#374151' }}>
                    {day.getDate()}
                  </p>
                </div>
                <button
                  onClick={() => openModal(dateStr)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                  style={{ background: isToday ? '#7c3aed' : '#f3f4f6', color: isToday ? 'white' : '#6b7280' }}>
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks */}
              <div className="flex-1 p-2 space-y-1.5">
                {loading && dayTasks.length === 0 ? null : pending.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} />
                ))}
                {done.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} />
                ))}
                {dayTasks.length === 0 && !loading && (
                  <button
                    onClick={() => openModal(dateStr)}
                    className="w-full text-xs text-gray-300 hover:text-purple-400 transition-colors py-2 text-center">
                    + agregar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>Nueva tarea</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(() => {
                    const d = new Date(modalDate + 'T12:00:00')
                    return `${DAYS_ES[d.getDay()]}, ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`
                  })()}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Type toggle */}
              <div>
                <label className={LabelClass}>Tipo de tarea</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pedido', 'envio'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, type: t, supplier_id: '', client_id: '' }))}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all"
                      style={{
                        borderColor: form.type === t ? (t === 'pedido' ? '#ef4444' : '#22c55e') : '#e5e7eb',
                        background: form.type === t ? (t === 'pedido' ? '#fef2f2' : '#f0fdf4') : 'white',
                        color: form.type === t ? (t === 'pedido' ? '#dc2626' : '#16a34a') : '#6b7280',
                      }}>
                      {t === 'pedido'
                        ? <ShoppingBag className="w-4 h-4 flex-shrink-0" />
                        : <Truck className="w-4 h-4 flex-shrink-0" />}
                      {t === 'pedido' ? 'Pedido a suplidor' : 'Envío a cliente'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Supplier / Client selector */}
              {form.type === 'pedido' ? (
                <div>
                  <label className={LabelClass}>Suplidor *</label>
                  <select className={InputClass} value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                    <option value="">Seleccionar suplidor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className={LabelClass}>Cliente *</label>
                  <select className={InputClass} value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                    <option value="">Seleccionar cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                  </select>
                </div>
              )}

              {/* Product */}
              <div>
                <label className={LabelClass}>Perfume / Producto *</label>
                <input
                  className={InputClass}
                  value={form.product_name}
                  onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
                  placeholder="Ej. Dior Sauvage 100ml"
                  autoFocus
                />
              </div>

              {/* Notes */}
              <div>
                <label className={LabelClass}>Notas (opcional)</label>
                <input
                  className={InputClass}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ej. 3 unidades, urgente..."
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.product_name.trim() || (form.type === 'pedido' ? !form.supplier_id : !form.client_id)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: form.type === 'pedido' ? '#dc2626' : '#16a34a' }}>
                {saving ? 'Guardando...' : 'Agregar tarea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, onToggle, onDelete }: {
  task: CalendarTask
  onToggle: (t: CalendarTask) => void
  onDelete: (id: string) => void
}) {
  const isPedido = task.type === 'pedido'
  const dotColor = isPedido ? '#ef4444' : '#22c55e'
  const bgDone = '#f9fafb'

  return (
    <div className="group flex items-start gap-2 rounded-xl px-2.5 py-2 transition-colors hover:bg-gray-50"
      style={{ opacity: task.is_done ? 0.55 : 1 }}>
      {/* Color dot */}
      <div className="flex-shrink-0 mt-0.5 w-2 h-2 rounded-full" style={{ background: dotColor, marginTop: 5 }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold leading-tight truncate ${task.is_done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.product_name}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: dotColor }}>
          {isPedido ? task.supplier_name : task.client_name}
        </p>
        {task.notes && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{task.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggle(task)}
          className="p-1 rounded-lg transition-colors hover:bg-green-50"
          title={task.is_done ? 'Marcar pendiente' : 'Marcar listo'}>
          <Check className={`w-3.5 h-3.5 ${task.is_done ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 rounded-lg hover:bg-red-50 transition-colors"
          title="Eliminar">
          <X className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
        </button>
      </div>
    </div>
  )
}
