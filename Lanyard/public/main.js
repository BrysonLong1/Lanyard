// Fade-in on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in').forEach(el => io.observe(el));

// Contact form submit
const form = document.getElementById('contactForm');
if (form) {
  const msg = document.getElementById('formMsg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = 'Sending...';

    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.ok) {
        msg.textContent = 'Thanks! We’ll get back to you shortly.';
        form.reset();
      } else {
        msg.textContent = json.message || 'Something went wrong. Please try again.';
      }
    } catch {
      msg.textContent = 'Network error. Please try again.';
    }
  });
}
