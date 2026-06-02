const themeToggle = document.querySelector('.theme-toggle');
const root = document.documentElement;
const mobileButton = document.querySelector('.mobile-menu-button');
const siteNav = document.querySelector('.site-nav');
const contactForm = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');

themeToggle?.addEventListener('click', () => {
  const isLight = root.classList.toggle('light-theme');
  themeToggle.textContent = isLight ? '☀️' : '🌙';
});

mobileButton?.addEventListener('click', () => {
  if (!siteNav) return;
  const expanded = siteNav.classList.toggle('open');
  mobileButton.setAttribute('aria-expanded', String(expanded));
});

siteNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    if (!siteNav.classList.contains('open')) return;
    siteNav.classList.remove('open');
    mobileButton?.setAttribute('aria-expanded', 'false');
  });
});

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!formMessage) return;

  formMessage.textContent = 'Thanks! Your message has been received. We’ll reply shortly.';
  formMessage.classList.add('visible');
  contactForm.reset();

  window.setTimeout(() => {
    formMessage.classList.remove('visible');
  }, 7000);
});
