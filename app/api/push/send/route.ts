import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  'mailto:samuelgonzalez3110@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const supabase = createClient(
  'https://fiieosdzkpzqtsfijydb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpaWVvc2R6a3B6cXRzZmlqeWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njk1MzMsImV4cCI6MjEwNDU0NTUzM30.AMAwpCpVDGGMT08sE3emwWjllLG3xeJOE4gd6uVF5tI'
);

export async function POST(req: NextRequest) {
  const { title, body, url } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 });
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth');

  if (error || !subscriptions?.length) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, body, url: url || '/dashboard' });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
    )
  );

  const failed = results.filter((r) => r.status === 'rejected');

  // Remove dead subscriptions (410 Gone)
  const expiredEndpoints: string[] = [];
  results.forEach((result, i) => {
    if (
      result.status === 'rejected' &&
      (result.reason as { statusCode?: number })?.statusCode === 410
    ) {
      expiredEndpoints.push(subscriptions[i].endpoint);
    }
  });

  if (expiredEndpoints.length) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);
  }

  return NextResponse.json({
    sent: results.length - failed.length,
    failed: failed.length,
  });
}
