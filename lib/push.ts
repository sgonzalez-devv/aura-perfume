export async function sendPushNotification(
  title: string,
  body: string,
  url?: string
) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url }),
    });
  } catch (err) {
    console.error('Push notification failed:', err);
  }
}
