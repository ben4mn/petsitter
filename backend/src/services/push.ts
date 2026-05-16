import webpush from 'web-push';
import { query } from '../db/pool.js';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('[push] VAPID keys not set — push notifications disabled');
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

export async function sendToUser(userId: string, payload: PushPayload) {
  const { rows } = await query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
    `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
    [userId],
  );
  if (rows.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  await Promise.all(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err: any) {
        failed++;
        // 404/410 = stale subscription; remove it
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]);
        } else {
          console.error('[push] send failed', err?.statusCode, err?.body);
        }
      }
    }),
  );
  return { sent, failed };
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY || '';
}
