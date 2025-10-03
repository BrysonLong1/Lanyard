// main.js

// -----------------------
// Fade-in on scroll
// -----------------------
(function initFadeIn() {
  const elements = document.querySelectorAll('.fade-in');

  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('revealed'));
    return;
  }

  const io = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12 });

  elements.forEach(el => io.observe(el));
})();

// -----------------------
// Contact form
// -----------------------
(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const msg = document.getElementById('formMsg');
  const submitBtn = form.querySelector('button[type="submit"]');

  let hardLock = false; // prevents rapid resubmits for a moment

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
  const val = (name) => String(new FormData(form).get(name) || '').trim();

  const setStatus = (text, isError = false) => {
    if (!msg) return;
    msg.textContent = text;
    msg.style.color = isError ? '#b42318' : 'var(--muted)';
  };

  const setInvalid = (el, invalid) => {
    if (!el) return;
    el.setAttribute('aria-invalid', invalid ? 'true' : 'false');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (hardLock) return;

    const name   = val('name');
    const email  = val('email');
    const phone  = val('phone');
    let reason   = val('reason');
    const trap   = val('trap'); // honeypot

    // Clear previous a11y state
    ['name','email','reason'].forEach(n => setInvalid(form.querySelector(`[name="${n}"]`), false));

    // Validate
    let firstBad = null;
    if (!name || name.length < 2) firstBad = firstBad || 'name';
    if (!emailOk(email))          firstBad = firstBad || 'email';
    if (!reason || reason.length < 10) firstBad = firstBad || 'reason';

    if (firstBad) {
      setInvalid(form.querySelector(`[name="${firstBad}"]`), true);
      setStatus(
        firstBad === 'email'
          ? 'Please enter a valid email address.'
          : firstBad === 'reason'
          ? 'Please provide a brief message (10+ characters).'
          : 'Please enter your name (2+ characters).',
        true
      );
      form.querySelector(`[name="${firstBad}"]`)?.focus();
      return;
    }

    // Trim super-long messages for safety (server can still accept longer if needed)
    if (reason.length > 4000) reason = reason.slice(0, 4000);

    const payload = { name, email, phone, reason, trap };

    // Disable UI while sending
    submitBtn?.setAttribute('disabled', 'true');
    submitBtn?.classList.add('sending');
    setStatus('Sending...');

    // Timeout protection
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      // Attempt to parse JSON; if not JSON, synthesize a failure
      let json = null;
      try {
        json = await res.json();
      } catch {
        json = { ok: false, message: 'Unexpected server response.' };
      }

      if (res.ok && json?.ok) {
        setStatus('Thanks! We’ll get back to you shortly.');
        form.reset();
        hardLock = true;
        setTimeout(() => { hardLock = false; }, 2000);
      } else {
        const message = json?.message || `Unable to send right now (status ${res.status}).`;
        setStatus(message, true);
      }
    } catch (err) {
      const aborted = err?.name === 'AbortError';
      setStatus(aborted ? 'Request timed out. Please try again.' : 'Network error. Please try again.', true);
    } finally {
      clearTimeout(timeout);
      submitBtn?.removeAttribute('disabled');
      submitBtn?.classList.remove('sending');
    }
  });
})();
