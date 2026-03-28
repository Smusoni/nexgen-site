import { config } from '../config';
import type { Booking, Service, Slot } from '@prisma/client';

type BookingWithRelations = Booking & { service: Service; slot: Slot };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatWhen(iso: Date): string {
  return iso.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Sends admin an email when a booking is paid and confirmed (Stripe webhook).
 * Requires RESEND_API_KEY. If missing, logs and skips (no-op).
 */
export async function sendAdminBookingConfirmedEmail(booking: BookingWithRelations): Promise<void> {
  const apiKey = config.resend.apiKey;
  if (!apiKey) {
    console.info('RESEND_API_KEY not set — skipping admin booking email');
    return;
  }

  const to = config.resend.notifyEmails;
  if (to.length === 0) {
    console.warn('No ADMIN_NOTIFY_EMAIL or ADMIN_EMAIL — skipping admin booking email');
    return;
  }

  const from = config.resend.from;
  const amount = booking.service.priceCents * booking.seats;
  const subject = `New paid booking — ${booking.playerName} (${booking.service.name})`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <h2>New booking confirmed</h2>
  <p>A player just completed payment.</p>
  <table style="border-collapse: collapse; margin-top: 1rem;">
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Player</strong></td><td>${escapeHtml(booking.playerName)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Email</strong></td><td>${escapeHtml(booking.email)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Phone</strong></td><td>${escapeHtml(booking.phone || '—')}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Service</strong></td><td>${escapeHtml(booking.service.name)} (${escapeHtml(booking.service.code)})</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>When</strong></td><td>${escapeHtml(formatWhen(booking.slot.startAt))} – ${escapeHtml(formatWhen(booking.slot.endAt))}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Seats</strong></td><td>${booking.seats}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Paid</strong></td><td>${formatMoney(amount)}</td></tr>
    ${booking.notes ? `<tr><td style="padding: 4px 12px 4px 0; vertical-align: top;"><strong>Notes</strong></td><td>${escapeHtml(booking.notes)}</td></tr>` : ''}
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Booking ID</strong></td><td><code>${escapeHtml(booking.id)}</code></td></tr>
  </table>
  <p style="margin-top: 1.5rem; font-size: 0.9rem; color: #555;">${
    config.publicApiUrl
      ? `Manage bookings in your <a href="${escapeHtml(config.publicApiUrl + '/admin/')}">admin dashboard</a>.`
      : 'Log into your API admin dashboard at <code>/admin/</code> to manage bookings.'
  }</p>
</body>
</html>`.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API ${res.status}: ${body}`);
  }
}
