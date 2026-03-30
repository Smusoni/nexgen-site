import { config } from '../config';
import type { AnalysisPurchase, Booking, MembershipSubscription, Service, Slot } from '@prisma/client';

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

function analysisPackLabel(pack: string): string {
  if (pack === 'pack3') return '3-game pack';
  if (pack === 'pack5') return '5-game pack';
  return 'Single game';
}

export async function sendAdminAnalysisPurchaseEmail(purchase: AnalysisPurchase): Promise<void> {
  const apiKey = config.resend.apiKey;
  if (!apiKey) {
    console.info('RESEND_API_KEY not set — skipping admin analysis email');
    return;
  }
  const to = config.resend.notifyEmails;
  if (to.length === 0) return;

  const subject = `Game analysis purchase — ${analysisPackLabel(purchase.pack)} (${formatMoney(purchase.amountCents)})`;
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <h2>Game analysis paid</h2>
  <table style="border-collapse: collapse; margin-top: 1rem;">
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Customer</strong></td><td>${escapeHtml(purchase.customerName || '—')}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Email</strong></td><td>${escapeHtml(purchase.customerEmail)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Pack</strong></td><td>${escapeHtml(analysisPackLabel(purchase.pack))}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Paid</strong></td><td>${formatMoney(purchase.amountCents)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Stripe session</strong></td><td><code>${escapeHtml(purchase.stripeCheckoutSessionId)}</code></td></tr>
  </table>
  <p style="margin-top: 1rem; font-size: 0.9rem; color: #555;">Follow up to collect match footage and deliver the analysis.</p>
</body>
</html>`.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: config.resend.from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API ${res.status}: ${body}`);
  }
}

function membershipPlanLabel(plan: string): string {
  if (plan === 'intensive') return 'Intensive Training + Film ($450/mo)';
  return 'Weekly Training + Film ($300/mo)';
}

export async function sendAdminMembershipStartedEmail(
  sub: MembershipSubscription,
): Promise<void> {
  const apiKey = config.resend.apiKey;
  if (!apiKey) {
    console.info('RESEND_API_KEY not set — skipping admin membership email');
    return;
  }
  const to = config.resend.notifyEmails;
  if (to.length === 0) return;

  const subject = `New membership — ${membershipPlanLabel(sub.plan)}`;
  const period = sub.currentPeriodEnd
    ? formatWhen(sub.currentPeriodEnd)
    : '—';
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <h2>Membership started</h2>
  <table style="border-collapse: collapse; margin-top: 1rem;">
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Customer</strong></td><td>${escapeHtml(sub.customerName || '—')}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Email</strong></td><td>${escapeHtml(sub.customerEmail)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Plan</strong></td><td>${escapeHtml(membershipPlanLabel(sub.plan))}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Stripe subscription</strong></td><td><code>${escapeHtml(sub.stripeSubscriptionId)}</code></td></tr>
    <tr><td style="padding: 4px 12px 4px 0;"><strong>Current period ends</strong></td><td>${escapeHtml(period)}</td></tr>
  </table>
  <p style="margin-top: 1rem; font-size: 0.9rem; color: #555;">Coordinate weekly sessions and film deliverables per plan.</p>
</body>
</html>`.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: config.resend.from, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API ${res.status}: ${body}`);
  }
}
