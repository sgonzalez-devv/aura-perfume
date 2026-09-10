'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Send, Trash2, StickyNote } from 'lucide-react'

interface Note {
  id: string
  content: string
  author_id: string | null
  author_name: string
  created_at: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
}

function authorColor(name: string) {
  const colors = [
    ['#7c3aed', '#ede9fe'],
    ['#059669', '#d1fae5'],
    ['#d97706', '#fef3c7'],
    ['#dc2626', '#fee2e2'],
    ['#0284c7', '#e0f2fe'],
    ['#c026d3', '#fae8ff'],
  ]
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return colors[hash % colors.length]
}

export default function NotesPage() {
  const { user, profile } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const authorName = profile?.full_name || user?.email?.split('@')[0] || 'Anónimo'

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: true })
    setNotes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  // Scroll to bottom when notes load or new note arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notes])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('notes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
        fetchNotes()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchNotes])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    await supabase.from('notes').insert([{
      content: trimmed,
      author_id: user?.id || null,
      author_name: authorName,
    }])
    setText('')
    setSending(false)
    textareaRef.current?.focus()
  }

  async function handleDelete(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOwn = (note: Note) => note.author_id === user?.id

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: 'calc(100vh - 0px)' }}>
      {/* Header */}
      <div className="px-6 lg:px-8 py-6 flex-shrink-0" style={{ borderBottom: '1px solid #ede9fe' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#ede9fe' }}>
            <StickyNote className="w-5 h-5" style={{ color: '#7c3aed' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Notas del equipo
            </h1>
            <p className="text-gray-400 text-sm">Ideas, recordatorios y apuntes compartidos</p>
          </div>
        </div>
      </div>

      {/* Notes feed */}
      <div className="flex-1 overflow-y-auto px-6 lg:px-8 py-5 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-7 h-7 animate-spin" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#f5f3ff' }}>
              <StickyNote className="w-8 h-8" style={{ color: '#c4b5fd' }} />
            </div>
            <p className="text-gray-600 font-semibold mb-1">Sin notas todavía</p>
            <p className="text-gray-400 text-sm max-w-xs">Escribe la primera idea del equipo. Tú y tu compañero verán todo aquí en tiempo real.</p>
          </div>
        ) : (
          notes.map(note => {
            const own = isOwn(note)
            const [fg, bg] = authorColor(note.author_name)
            const initial = note.author_name.charAt(0).toUpperCase()
            return (
              <div key={note.id} className={`flex gap-3 group ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: bg, color: fg }}>
                  {initial}
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] ${own ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`flex items-center gap-2 ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-xs font-semibold text-gray-500">{own ? 'Tú' : note.author_name}</span>
                    <span className="text-xs text-gray-300">{timeAgo(note.created_at)}</span>
                  </div>
                  <div className="flex items-start gap-2 group/bubble">
                    {own && (
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 flex-shrink-0 mt-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div
                      className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words"
                      style={own
                        ? { background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: 'white', borderBottomRightRadius: 4 }
                        : { background: 'white', color: '#374151', border: '1px solid #e5e7eb', borderBottomLeftRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                      }>
                      {note.content}
                    </div>
                    {!own && (
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="opacity-0 group-hover/bubble:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 flex-shrink-0 mt-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-6 lg:px-8 py-4" style={{ borderTop: '1px solid #ede9fe', background: 'white' }}>
        <div className="flex gap-3 items-end">
          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: authorColor(authorName)[1], color: authorColor(authorName)[0] }}>
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe una nota... (Enter para enviar, Shift+Enter para nueva línea)"
              className="w-full px-4 py-3 pr-12 rounded-2xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 transition-all"
              style={{ maxHeight: 120, overflowY: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="absolute right-2 bottom-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: text.trim() ? 'linear-gradient(135deg, #7c3aed, #5b21b6)' : '#e5e7eb',
                color: text.trim() ? 'white' : '#9ca3af',
              }}>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-300 mt-2 ml-11">Las notas son visibles para todo el equipo en tiempo real</p>
      </div>
    </div>
  )
}
