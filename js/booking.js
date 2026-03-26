/* ============================================
   Booking Multi-Step Form — booking.js
   ============================================ */

(function () {
  'use strict';

  /* ---------- CONFIG ---------- */
  // Replace these with real values once Formspree + Stripe accounts are set up
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/YOUR_FORMSPREE_ID';

  const STRIPE_LINKS = {
    '1on1':     'https://buy.stripe.com/YOUR_1ON1_LINK',
    'group2':   'https://buy.stripe.com/YOUR_GROUP2_LINK',
    'group34':  'https://buy.stripe.com/YOUR_GROUP34_LINK',
    'group56':  'https://buy.stripe.com/YOUR_GROUP56_LINK',
    'collegepro': null // custom pricing — redirect to contact page
  };

  /* ---------- STATE ---------- */
  let currentStep = 1;
  const booking = {
    service: null,
    serviceLabel: '',
    price: 0,
    date: '',
    time: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  };

  /* ---------- DOM REFS ---------- */
  const steps = document.querySelectorAll('.booking-step');
  const indicators = document.querySelectorAll('.step-indicator');
  const lines = document.querySelectorAll('.step-line');

  /* ---------- NAVIGATION ---------- */
  function goToStep(n) {
    if (n < 1 || n > 4) return;
    currentStep = n;

    steps.forEach(s => s.classList.remove('active'));
    const target = document.getElementById('step' + n);
    if (target) target.classList.add('active');

    indicators.forEach((ind, i) => {
      const stepNum = i + 1;
      ind.classList.remove('active', 'completed');
      if (stepNum === n) ind.classList.add('active');
      else if (stepNum < n) ind.classList.add('completed');
    });

    lines.forEach((line, i) => {
      line.classList.toggle('active', i < n - 1);
    });

    window.scrollTo({ top: document.querySelector('.booking-progress').offsetTop - 100, behavior: 'smooth' });
  }

  /* ---------- STEP 1: SERVICE SELECTION ---------- */
  const serviceOptions = document.querySelectorAll('.service-option');
  serviceOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      serviceOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      booking.service = opt.dataset.service;
      booking.serviceLabel = opt.dataset.label;
      booking.price = parseInt(opt.dataset.price, 10);
    });
  });

  document.getElementById('toStep2').addEventListener('click', () => {
    if (!booking.service) {
      alert('Please select a service to continue.');
      return;
    }
    goToStep(2);
  });

  /* ---------- STEP 2: DATE & TIME ---------- */
  const dateInput = document.getElementById('bookingDate');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate() + 1).padStart(2, '0'); // earliest = tomorrow
  dateInput.setAttribute('min', `${yyyy}-${mm}-${dd}`);

  const timeSlots = document.querySelectorAll('.time-slot');
  timeSlots.forEach(slot => {
    slot.addEventListener('click', () => {
      timeSlots.forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
      booking.time = slot.dataset.time;
    });
  });

  document.getElementById('backToStep1').addEventListener('click', () => goToStep(1));

  document.getElementById('toStep3').addEventListener('click', () => {
    booking.date = dateInput.value;
    if (!booking.date) {
      alert('Please select a date.');
      return;
    }
    if (!booking.time) {
      alert('Please select a time slot.');
      return;
    }
    goToStep(3);
  });

  /* ---------- STEP 3: DETAILS ---------- */
  document.getElementById('backToStep2').addEventListener('click', () => goToStep(2));

  document.getElementById('toStep4').addEventListener('click', () => {
    let valid = true;
    const fields = [
      { id: 'firstName', key: 'firstName' },
      { id: 'lastName', key: 'lastName' },
      { id: 'email', key: 'email' },
      { id: 'phone', key: 'phone' }
    ];

    fields.forEach(f => {
      const el = document.getElementById(f.id);
      const val = el.value.trim();
      const group = el.closest('.form-group');

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

  /* ---------- STEP 4: SUMMARY ---------- */
  function populateSummary() {
    document.getElementById('summaryService').textContent = booking.serviceLabel;
    document.getElementById('summaryDate').textContent = formatDate(booking.date);
    document.getElementById('summaryTime').textContent = booking.time;
    document.getElementById('summaryName').textContent = booking.firstName + ' ' + booking.lastName;
    document.getElementById('summaryEmail').textContent = booking.email;
    document.getElementById('summaryPhone').textContent = booking.phone;

    const notesRow = document.getElementById('summaryNotesRow');
    if (booking.notes) {
      notesRow.style.display = 'flex';
      document.getElementById('summaryNotes').textContent = booking.notes;
    } else {
      notesRow.style.display = 'none';
    }

    document.getElementById('summaryTotal').textContent = booking.price > 0
      ? '$' + booking.price
      : 'Custom — to be confirmed';
  }

  function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(m, 10) - 1] + ' ' + parseInt(d, 10) + ', ' + y;
  }

  document.getElementById('backToStep3').addEventListener('click', () => goToStep(3));

  document.getElementById('confirmBooking').addEventListener('click', async () => {
    const btn = document.getElementById('confirmBooking');
    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
      await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          service: booking.serviceLabel,
          date: booking.date,
          time: booking.time,
          name: booking.firstName + ' ' + booking.lastName,
          email: booking.email,
          phone: booking.phone,
          notes: booking.notes || 'None',
          total: booking.price > 0 ? '$' + booking.price : 'Custom pricing'
        })
      });
    } catch (e) {
      // Formspree submission failed — still proceed to payment
      console.warn('Form submission error:', e);
    }

    if (booking.service === 'collegepro') {
      window.location.href = 'contact.html';
      return;
    }

    const stripeLink = STRIPE_LINKS[booking.service];
    if (stripeLink && !stripeLink.includes('YOUR_')) {
      window.location.href = stripeLink;
    } else {
      window.location.href = 'success.html';
    }
  });

})();
