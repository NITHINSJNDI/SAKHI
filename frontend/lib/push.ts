import { query } from '@/lib/db';

/**
 * Send a push notification to every device a user has signed in on, through
 * Expo's push service. Tokens Expo reports as no longer registered are removed.
 */
export async function sendPushToUser(userId: number, title: string, body: string, data?: Record<string, unknown>) {
  const { rows } = await query('SELECT token FROM push_tokens WHERE user_id = $1', [userId]);
  if (rows.length === 0) return { sent: 0 };

  const messages = rows.map((r: any) => ({ to: r.token, title, body, data, sound: 'default' }));
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const json = await res.json().catch(() => null);
  const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
  for (let i = 0; i < tickets.length; i++) {
    if (tickets[i]?.details?.error === 'DeviceNotRegistered') {
      await query('DELETE FROM push_tokens WHERE token = $1', [messages[i].to]);
    }
  }
  return { sent: tickets.filter(t => t?.status === 'ok').length };
}
