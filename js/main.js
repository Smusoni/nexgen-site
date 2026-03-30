/* ============================================
   NexGen — Main JavaScript
   ============================================ */

(function () {
  'use strict';

  /* ---------- file:// warning (styles + fetch break when not served over http) ---------- */
  if (window.location.protocol === 'file:') {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'alert');
    bar.style.cssText =
      'position:fixed;left:0;right:0;top:0;z-index:99999;background:#991b1b;color:#fff;padding:12px 16px;font:14px/1.45 system-ui,sans-serif;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.35);';
    bar.innerHTML =
      'This page is opened as a local file, so CSS, images, and booking usually fail. In a terminal, <code style="background:rgba(0,0,0,.2);padding:2px 8px;border-radius:4px;">cd</code> into the <strong>nexgen-site</strong> project folder (where <code style="background:rgba(0,0,0,.2);padding:2px 8px;border-radius:4px;">index.html</code> lives), run <code style="background:rgba(0,0,0,.2);padding:2px 8px;border-radius:4px;">npx http-server . -p 8080</code>, then open <strong>http://127.0.0.1:8080/book.html</strong>.';
    if (document.body) {
      document.body.insertBefore(bar, document.body.firstChild);
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        document.body.insertBefore(bar, document.body.firstChild);
      });
    }
  }

  /* ---------- Navbar scroll effect ---------- */
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
    if (window.scrollY > 50) navbar.classList.add('scrolled');
  }

  /* ---------- Mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const navOverlay = document.getElementById('navOverlay');

  function closeNav() {
    if (navToggle) navToggle.classList.remove('open');
    if (navLinks) navLinks.classList.remove('open');
    if (navOverlay) navOverlay.classList.remove('open');
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const opening = !navLinks.classList.contains('open');
      navToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
      if (navOverlay) navOverlay.classList.toggle('open');
      if (opening) document.body.style.overflow = 'hidden';
      else document.body.style.overflow = '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeNav();
        document.body.style.overflow = '';
      });
    });
  }

  if (navOverlay) {
    navOverlay.addEventListener('click', () => {
      closeNav();
      document.body.style.overflow = '';
    });
  }

  /* ---------- Scroll-triggered fade-in ---------- */
  const fadeEls = document.querySelectorAll('.fade-up');
  function markFadeVisible(el, observer) {
    el.classList.add('visible');
    if (observer) observer.unobserve(el);
  }
  if (fadeEls.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            markFadeVisible(entry.target, observer);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px 80px 0px' }
    );
    fadeEls.forEach(el => observer.observe(el));
    // IO often fires on the next frame; elements already in view can look "blank" until then.
    observer.takeRecords().forEach(entry => {
      if (entry.isIntersecting) markFadeVisible(entry.target, observer);
    });
    requestAnimationFrame(() => {
      fadeEls.forEach(el => {
        if (el.classList.contains('visible')) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        if (rect.top < vh && rect.bottom > 0) markFadeVisible(el, observer);
      });
    });
  } else {
    fadeEls.forEach(el => el.classList.add('visible'));
  }

  /* ---------- FAQ Accordion ---------- */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!question || !answer) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      faqItems.forEach(other => {
        other.classList.remove('open');
        const otherAnswer = other.querySelector('.faq-answer');
        if (otherAnswer) otherAnswer.style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Active nav link highlighting ---------- */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a:not(.btn)').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const adminLink = document.getElementById('nexgen-admin-link');
  if (adminLink) {
    const meta = document.querySelector('meta[name="nexgen-api"]');
    const base = meta?.getAttribute('content')?.trim().replace(/\/$/, '');
    if (base) {
      adminLink.href = `${base}/admin/`;
      adminLink.target = '_blank';
      adminLink.rel = 'noopener noreferrer';
    }
  }

})();
