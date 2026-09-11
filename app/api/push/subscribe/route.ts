import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fiieosdzkpzqtsfijydb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpaWVvc2R6a3B6cXRzZmlqeWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njk1MzMsImV4cCI6MjEwNDU0NTUzM30.AMAwpCpVDGGMT08sE3emwWjllLG3xeJOE4gd6uVF5tI'
);

export async function POST(req: NextRequest) {
  const subscription = await req.json();

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

  return NextResponse.json({ success: true });
}
