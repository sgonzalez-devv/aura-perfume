'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotificationSetup() {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setStatus('subscribed');
      });
    });
  }, []);

  async function subscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      setStatus('subscribed');
    } catch (err) {
      console.error('Subscribe error:', err);
      if (Notification.permission === 'denied') setStatus('denied');
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'unsupported') return null;

  return (
    <div className="flex items-center gap-2">
      {status === 'subscribed' ? (
        <button
          onClick={unsubscribe}
          disabled={loading}
          title="Desactivar notificaciones"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 text-purple-200 hover:bg-purple-600/50 text-xs transition-colors disabled:opacity-50"
        >
          <Bell size={14} className="text-purple-300" />
          <span>Notificaciones activas</span>
        </button>
      ) : (
        <button
          onClick={subscribe}
          disabled={loading || status === 'denied'}
          title={status === 'denied' ? 'Notificaciones bloqueadas en este dispositivo' : 'Activar notificaciones push'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 text-xs transition-colors disabled:opacity-40"
        >
          <BellOff size={14} />
          <span>{status === 'denied' ? 'Bloqueado' : 'Activar notificaciones'}</span>
        </button>
      )}
    </div>
  );
}
