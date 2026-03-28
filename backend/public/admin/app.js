(function () {
  'use strict';

  const api = (path, opts = {}) =>
    fetch(path, {
      ...opts,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });

  const $ = (sel) => document.querySelector(sel);
  const loginView = $('#loginView');
  const dashView = $('#dashView');

  async function checkSession() {
    const r = await api('/api/admin/overview');
    if (r.ok) {
      loginView.classList.add('hidden');
      dashView.classList.remove('hidden');
      showTab('overview');
      loadOverview();
      return true;
    }
    return false;
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').textContent = '';
    const email = $('#loginEmail').value;
    const password = $('#loginPassword').value;
    const r = await api('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      $('#loginError').textContent = d.error || 'Login failed';
      return;
    }
    loginView.classList.add('hidden');
    dashView.classList.remove('hidden');
    showTab('overview');
    loadOverview();
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await api('/api/admin/auth/logout', { method: 'POST' });
    dashView.classList.add('hidden');
    loginView.classList.remove('hidden');
  });

  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      showTab(tab);
      if (tab === 'overview') loadOverview();
      if (tab === 'services') loadServicesAdmin();
      if (tab === 'slots') loadSlotsTab();
      if (tab === 'bookings') loadBookings();
      if (tab === 'payments') loadPayments();
    });
  });

  function showTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.add('hidden'));
    const el = $('#tab-' + name);
    if (el) el.classList.remove('hidden');
  }

  function fmtMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function fmtDt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  async function loadOverview() {
    const r = await api('/api/admin/overview');
    if (!r.ok) return;
    const d = await r.json();
    $('#overviewStats').innerHTML = `
      <div class="stat"><strong>${d.todayBookings}</strong>Today's confirmed</div>
      <div class="stat"><strong>${d.totalBookings}</strong>Total confirmed</div>
      <div class="stat"><strong>${fmtMoney(d.totalRevenue)}</strong>Total revenue</div>
    `;
    const tb = $('#overviewRecent tbody');
    tb.innerHTML = '';
    (d.recentBookings || []).forEach((b) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(b.playerName)}</td><td>${escapeHtml(b.service?.name || '')}</td><td>${fmtDt(b.slot?.startAt)}</td>`;
      tb.appendChild(tr);
    });
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  async function loadServicesAdmin() {
    const r = await api('/api/admin/services');
    if (!r.ok) return;
    const list = await r.json();
    const tb = $('#servicesTable tbody');
    tb.innerHTML = '';
    list.forEach((s) => {
      const tr = document.createElement('tr');
      tr.dataset.id = s.id;
      tr.innerHTML = `
        <td>${escapeHtml(s.code)}</td>
        <td><input type="text" value="${escapeHtml(s.name)}" data-f="name" style="width:100%;max-width:200px"></td>
        <td><input type="number" value="${s.priceCents}" data-f="priceCents" style="width:90px"></td>
        <td><input type="checkbox" data-f="isGroup" ${s.isGroup ? 'checked' : ''}></td>
        <td><input type="number" value="${s.defaultCapacity}" data-f="defaultCapacity" style="width:60px"></td>
        <td><input type="checkbox" data-f="active" ${s.active ? 'checked' : ''}></td>
        <td><button type="button" class="btn-sm btn-edit save-svc">Save</button></td>
      `;
      tb.appendChild(tr);
    });
    tb.querySelectorAll('.save-svc').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tr = btn.closest('tr');
        const id = tr.dataset.id;
        const body = {
          name: tr.querySelector('[data-f=name]').value,
          priceCents: parseInt(tr.querySelector('[data-f=priceCents]').value, 10),
          isGroup: tr.querySelector('[data-f=isGroup]').checked,
          defaultCapacity: parseInt(tr.querySelector('[data-f=defaultCapacity]').value, 10),
          active: tr.querySelector('[data-f=active]').checked,
        };
        await api('/api/admin/services/' + id, { method: 'PUT', body: JSON.stringify(body) });
        loadServicesAdmin();
      });
    });
  }

  async function loadSlotsTab() {
    const svcR = await api('/api/admin/services');
    const services = svcR.ok ? await svcR.json() : [];
    const sel = $('#slotServiceFilter');
    const sel2 = $('#slotServiceId');
    const sel3 = $('#bulkService');
    sel.innerHTML = '<option value="">All</option>';
    sel2.innerHTML = '';
    sel3.innerHTML = '';
    services.forEach((s) => {
      if (!s.active) return;
      sel.innerHTML += `<option value="${s.id}">${escapeHtml(s.code)}</option>`;
      sel2.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)}</option>`;
      sel3.innerHTML += `<option value="${s.id}">${escapeHtml(s.name)} (${escapeHtml(s.code)})</option>`;
    });
    loadSlotsList();
  }

  $('#slotFilter').addEventListener('submit', (e) => {
    e.preventDefault();
    loadSlotsList();
  });

  $('#slotCreate').addEventListener('submit', async (e) => {
    e.preventDefault();
    const serviceId = $('#slotServiceId').value;
    const startAt = $('#slotStart').value;
    const endAt = $('#slotEnd').value;
    const cap = $('#slotCap').value;
    const body = {
      serviceId,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      capacityOverride: cap ? parseInt(cap, 10) : null,
    };
    const r = await api('/api/admin/slots', { method: 'POST', body: JSON.stringify(body) });
    if (r.ok) {
      $('#slotCreate').reset();
      loadSlotsList();
    } else {
      alert((await r.json()).error || 'Failed');
    }
  });

  async function loadSlotsList() {
    const date = $('#slotDate').value;
    const serviceId = $('#slotServiceFilter').value;
    const q = new URLSearchParams();
    if (date) q.set('date', date);
    if (serviceId) q.set('serviceId', serviceId);
    const r = await api('/api/admin/slots?' + q.toString());
    if (!r.ok) return;
    const list = await r.json();
    const tb = $('#slotsTable tbody');
    tb.innerHTML = '';
    list.forEach((slot) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtDt(slot.startAt)}</td>
        <td>${fmtDt(slot.endAt)}</td>
        <td>${escapeHtml(slot.service?.code || '')}</td>
        <td>${slot.takenSeats}</td>
        <td>${slot.capacity}</td>
        <td>${slot.status}</td>
        <td>${slot.status === 'open' ? `<button type="button" class="btn-sm cancel-slot" data-id="${slot.id}">Cancel</button>` : ''}</td>
      `;
      tb.appendChild(tr);
    });
    tb.querySelectorAll('.cancel-slot').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancel this slot?')) return;
        await api('/api/admin/slots/' + btn.dataset.id, { method: 'DELETE' });
        loadSlotsList();
      });
    });
  }

  $('#bookingFilter').addEventListener('submit', (e) => {
    e.preventDefault();
    loadBookings();
  });

  async function loadBookings() {
    const q = new URLSearchParams();
    const st = $('#bookingStatus').value;
    const dt = $('#bookingDate').value;
    if (st) q.set('status', st);
    if (dt) q.set('date', dt);
    const r = await api('/api/admin/bookings?' + q.toString());
    if (!r.ok) return;
    const d = await r.json();
    const tb = $('#bookingsTable tbody');
    tb.innerHTML = '';
    (d.bookings || []).forEach((b) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(b.playerName)}</td>
        <td>${escapeHtml(b.email)}</td>
        <td>${b.status}</td>
        <td>${b.seats}</td>
        <td>${fmtDt(b.slot?.startAt)}</td>
        <td>${b.status !== 'cancelled' && b.status !== 'expired' ? `<button type="button" class="btn-sm cancel-book" data-id="${b.id}">Cancel</button>` : ''}</td>
      `;
      tb.appendChild(tr);
    });
    tb.querySelectorAll('.cancel-book').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Mark booking cancelled?')) return;
        await api('/api/admin/bookings/' + btn.dataset.id + '/cancel', { method: 'PATCH' });
        loadBookings();
      });
    });
  }

  $('#paymentFilter').addEventListener('submit', (e) => {
    e.preventDefault();
    loadPayments();
  });

  async function loadPayments() {
    const q = new URLSearchParams();
    const st = $('#paymentStatus').value;
    if (st) q.set('status', st);
    const r = await api('/api/admin/payments?' + q.toString());
    if (!r.ok) return;
    const d = await r.json();
    const tb = $('#paymentsTable tbody');
    tb.innerHTML = '';
    (d.payments || []).forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtMoney(p.amountCents)}</td>
        <td>${p.status}</td>
        <td>${escapeHtml(p.booking?.playerName || '')}</td>
        <td>${escapeHtml(p.booking?.id || '')}</td>
        <td>${fmtDt(p.paidAt || p.createdAt)}</td>
      `;
      tb.appendChild(tr);
    });
  }

  function generateBulkSlots() {
    const serviceId = $('#bulkService').value;
    const days = Array.from(document.querySelectorAll('.day-picker input:checked')).map((c) => parseInt(c.value, 10));
    const from = $('#bulkFrom').value;
    const to = $('#bulkTo').value;
    const duration = parseInt($('#bulkDuration').value, 10);
    const weeks = parseInt($('#bulkWeeks').value, 10);
    const cap = $('#bulkCap').value ? parseInt($('#bulkCap').value, 10) : null;

    if (!serviceId || days.length === 0 || !from || !to) return [];

    const [fH, fM] = from.split(':').map(Number);
    const [tH, tM] = to.split(':').map(Number);
    const startMin = fH * 60 + fM;
    const endMin = tH * 60 + tM;
    if (endMin <= startMin) return [];

    const slots = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = weeks * 7;

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      if (!days.includes(date.getDay())) continue;

      for (let m = startMin; m + duration <= endMin; m += duration) {
        const startAt = new Date(date);
        startAt.setHours(Math.floor(m / 60), m % 60, 0, 0);
        const endAt = new Date(startAt);
        endAt.setMinutes(endAt.getMinutes() + duration);
        slots.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), capacityOverride: cap });
      }
    }
    return slots;
  }

  $('#bulkPreviewBtn').addEventListener('click', () => {
    const slots = generateBulkSlots();
    const preview = $('#bulkPreview');
    const result = $('#bulkResult');
    result.textContent = '';
    result.className = 'bulk-result';

    if (slots.length === 0) {
      preview.innerHTML = '<p style="padding:0.75rem;color:#f87171;">No slots to generate. Check your days, time range, and duration.</p>';
      return;
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '<table><thead><tr><th>Day</th><th>Date</th><th>Start</th><th>End</th></tr></thead><tbody>';
    slots.forEach((s) => {
      const st = new Date(s.startAt);
      const en = new Date(s.endAt);
      html += `<tr>
        <td>${dayNames[st.getDay()]}</td>
        <td>${st.toLocaleDateString()}</td>
        <td>${st.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
        <td>${en.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    preview.innerHTML = html;
    result.textContent = slots.length + ' slot(s) will be created.';
    result.className = 'bulk-result ok';
  });

  $('#bulkCreate').addEventListener('submit', async (e) => {
    e.preventDefault();
    const serviceId = $('#bulkService').value;
    const slots = generateBulkSlots();
    const result = $('#bulkResult');

    if (slots.length === 0) {
      result.textContent = 'No slots to create. Use Preview first.';
      result.className = 'bulk-result err';
      return;
    }

    const btn = $('#bulkSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Creating ' + slots.length + ' slots…';
    result.textContent = '';

    try {
      const r = await api('/api/admin/slots/bulk', {
        method: 'POST',
        body: JSON.stringify({ serviceId, slots }),
      });
      const d = await r.json();
      if (r.ok) {
        result.textContent = (d.count || slots.length) + ' slots created successfully!';
        result.className = 'bulk-result ok';
        $('#bulkPreview').innerHTML = '';
        loadSlotsList();
      } else {
        result.textContent = d.error || 'Failed to create slots.';
        result.className = 'bulk-result err';
      }
    } catch (err) {
      result.textContent = err.message || 'Network error.';
      result.className = 'bulk-result err';
    }
    btn.disabled = false;
    btn.textContent = 'Create all slots';
  });

  checkSession();
})();
