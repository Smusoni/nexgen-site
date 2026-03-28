/* ============================================
   Booking Multi-Step Form — API + Stripe Checkout
   ============================================ */

(function () {
  'use strict';

  function getApiBase() {
    const meta = document.querySelector('meta[name="nexgen-api"]');
    const fromMeta = meta && meta.getAttribute('content') ? meta.getAttribute('content').trim() : '';
    const isLocalPage =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (fromMeta) {
      const base = fromMeta.replace(/\/$/, '');
      // Netlify/production sites still ship localhost in meta if NEXGEN_API_URL was never set at build — don't call that URL.
      if (!isLocalPage && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)) {
        return '';
      }
      return base;
    }
    if (isLocalPage) {
      return 'http://localhost:4000';
    }
    return '';
  }

  const API_BASE = getApiBase();

  let currentStep = 1;
  const booking = {
    serviceId: null,
    serviceCode: null,
    serviceLabel: '',
    priceCents: 0,
    slotId: null,
    slotLabel: '',
    date: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  };

  const steps = document.querySelectorAll('.booking-step');
  const indicators = document.querySelectorAll('.step-indicator');
  const lines = document.querySelectorAll('.step-line');

  function goToStep(n) {
    if (n < 1 || n > 4) return;
    currentStep = n;

    steps.forEach(function (s) { s.classList.remove('active'); });
    const target = document.getElementById('step' + n);
    if (target) target.classList.add('active');

    indicators.forEach(function (ind, i) {
      const stepNum = i + 1;
      ind.classList.remove('active', 'completed');
      if (stepNum === n) ind.classList.add('active');
      else if (stepNum < n) ind.classList.add('completed');
    });

    lines.forEach(function (line, i) {
      line.classList.toggle('active', i < n - 1);
    });

    const prog = document.querySelector('.booking-progress');
    if (prog) window.scrollTo({ top: prog.offsetTop - 100, behavior: 'smooth' });
  }

  function showServiceError(msg) {
    const el = document.getElementById('serviceLoadError');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
  }

  async function loadServices() {
    const container = document.getElementById('serviceOptions');
    if (!container) return;

    if (!API_BASE) {
      showServiceError(
        'Booking API URL is missing. In Netlify: Site settings → Environment variables → add NEXGEN_API_URL (your Render API, e.g. https://yourservice.onrender.com), then trigger a new deploy.'
      );
      return;
    }

    try {
      const r = await fetch(API_BASE + '/api/public/services');
      if (!r.ok) throw new Error('Could not load services');
      const services = await r.json();
      container.innerHTML = '';

      services.forEach(function (svc) {
        const price = svc.priceCents / 100;
        const div = document.createElement('div');
        div.className = 'service-option';
        div.dataset.serviceId = svc.id;
        div.dataset.serviceCode = svc.code;
        div.dataset.priceCents = String(svc.priceCents);
        div.dataset.label = svc.name + (svc.isGroup ? ' — $' + price + '/player' : ' — $' + price);
        div.innerHTML =
          '<h4>' + escapeHtml(svc.name) + '</h4>' +
          '<div class="so-price">$' + price + (svc.isGroup ? '<span>/player</span>' : '') + '</div>' +
          '<div class="so-desc">' + (svc.isGroup ? 'Group session' : 'Individual training') + '</div>';
        div.addEventListener('click', function () {
          container.querySelectorAll('.service-option').forEach(function (o) { o.classList.remove('selected'); });
          div.classList.add('selected');
          booking.serviceId = svc.id;
          booking.serviceCode = svc.code;
          booking.serviceLabel = div.dataset.label;
          booking.priceCents = svc.priceCents;
        });
        container.appendChild(div);
      });

      const college = document.createElement('div');
      college.className = 'service-option';
      college.dataset.special = 'collegepro';
      college.innerHTML =
        '<h4>College &amp; Pro</h4><div class="so-price">Custom</div><div class="so-desc">Contact for pricing</div>';
      college.addEventListener('click', function () {
        window.location.href = 'contact.html';
      });
      container.appendChild(college);

      showServiceError('');
    } catch (e) {
      showServiceError(e.message || 'Failed to load services. Is the API running?');
    }
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  async function loadSlotsForDate() {
    const container = document.getElementById('timeSlots');
    const hint = document.getElementById('slotsHint');
    if (!container || !booking.serviceCode) return;

    booking.slotId = null;
    booking.slotLabel = '';
    container.innerHTML = '';

    const dateInput = document.getElementById('bookingDate');
    const dateVal = dateInput && dateInput.value;
    if (!dateVal) {
      if (hint) hint.textContent = 'Choose a date to see available times.';
      return;
    }

    if (!API_BASE) return;

    if (hint) hint.textContent = 'Loading times…';

    try {
      const q = new URLSearchParams({ serviceCode: booking.serviceCode, date: dateVal });
      const r = await fetch(API_BASE + '/api/public/slots?' + q.toString());
      if (!r.ok) throw new Error('Could not load slots');
      const slots = await r.json();

      if (slots.length === 0) {
        if (hint) hint.textContent = 'No open slots this day. Pick another date or ask the coach to add availability in admin.';
        return;
      }

      if (hint) hint.textContent = 'Select a time (' + slots.length + ' available).';

      slots.forEach(function (slot) {
        const start = new Date(slot.startAt);
        const label = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const div = document.createElement('div');
        div.className = 'time-slot';
        div.dataset.slotId = slot.id;
        div.textContent = label + ' (' + slot.remainingSeats + ' left)';
        div.addEventListener('click', function () {
          container.querySelectorAll('.time-slot').forEach(function (s) { s.classList.remove('selected'); });
          div.classList.add('selected');
          booking.slotId = slot.id;
          booking.slotLabel = label;
        });
        container.appendChild(div);
      });
    } catch (e) {
      if (hint) hint.textContent = e.message || 'Failed to load slots.';
    }
  }

  document.getElementById('toStep2').addEventListener('click', function () {
    if (!booking.serviceId) {
      alert('Please select a service to continue.');
      return;
    }
    goToStep(2);
  });

  const dateInput = document.getElementById('bookingDate');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate() + 1).padStart(2, '0');
  dateInput.setAttribute('min', yyyy + '-' + mm + '-' + dd);

  dateInput.addEventListener('change', function () {
    booking.date = dateInput.value;
    loadSlotsForDate();
  });

  document.getElementById('backToStep1').addEventListener('click', function () { goToStep(1); });

  document.getElementById('toStep3').addEventListener('click', function () {
    booking.date = dateInput.value;
    if (!booking.date) {
      alert('Please select a date.');
      return;
    }
    if (!booking.slotId) {
      alert('Please select a time slot.');
      return;
    }
    goToStep(3);
  });

  document.getElementById('backToStep2').addEventListener('click', function () { goToStep(2); });

  document.getElementById('toStep4').addEventListener('click', function () {
    var valid = true;
    var fields = [
      { id: 'firstName', key: 'firstName' },
      { id: 'lastName', key: 'lastName' },
      { id: 'email', key: 'email' },
      { id: 'phone', key: 'phone' },
    ];

    fields.forEach(function (f) {
      var el = document.getElementById(f.id);
      var val = el.value.trim();
      var group = el.closest('.form-group');
      if (!val || (f.key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))) {
        group.classList.add('error');
        valid = false;
      } else {
        group.classList.remove('error');
        booking[f.key] = val;
      }
    });

    booking.notes = document.getElementById('notes').value.trim();

    if (!valid) return;
    populateSummary();
    goToStep(4);
  });

  function formatDate(dateStr) {
    var parts = dateStr.split('-');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10) + ', ' + parts[0];
  }

  function populateSummary() {
    document.getElementById('summaryService').textContent = booking.serviceLabel;
    document.getElementById('summaryDate').textContent = formatDate(booking.date);
    document.getElementById('summaryTime').textContent = booking.slotLabel;
    document.getElementById('summaryName').textContent = booking.firstName + ' ' + booking.lastName;
    document.getElementById('summaryEmail').textContent = booking.email;
    document.getElementById('summaryPhone').textContent = booking.phone;

    var notesRow = document.getElementById('summaryNotesRow');
    if (booking.notes) {
      notesRow.style.display = 'flex';
      document.getElementById('summaryNotes').textContent = booking.notes;
    } else {
      notesRow.style.display = 'none';
    }

    document.getElementById('summaryTotal').textContent =
      booking.priceCents > 0 ? '$' + (booking.priceCents / 100).toFixed(0) : '—';
  }

  document.getElementById('backToStep3').addEventListener('click', function () { goToStep(3); });

  document.getElementById('confirmBooking').addEventListener('click', async function () {
    var btn = document.getElementById('confirmBooking');
    btn.textContent = 'Processing…';
    btn.disabled = true;

    if (!API_BASE) {
      alert('API URL not configured.');
      btn.textContent = 'Confirm & Pay →';
      btn.disabled = false;
      return;
    }

    try {
      var r = await fetch(API_BASE + '/api/public/bookings/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: booking.slotId,
          serviceId: booking.serviceId,
          playerName: booking.firstName + ' ' + booking.lastName,
          email: booking.email,
          phone: booking.phone,
          notes: booking.notes || undefined,
          seats: 1,
        }),
      });
      var data = await r.json().catch(function () { return {}; });
      if (!r.ok) {
        throw new Error(data.error || (data.errors && data.errors.join(', ')) || 'Checkout failed');
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (e) {
      alert(e.message || 'Something went wrong');
      btn.textContent = 'Confirm & Pay →';
      btn.disabled = false;
    }
  });

  loadServices();
})();
