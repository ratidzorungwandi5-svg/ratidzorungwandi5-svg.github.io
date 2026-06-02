const themeToggle = document.querySelector('.theme-toggle');
const root = document.documentElement;

themeToggle?.addEventListener('click', () => {
  const isDark = root.classList.toggle('light-theme');
  themeToggle.textContent = isDark ? '🌙' : '☀️';
});

const mobileButton = document.querySelector('.mobile-menu-button');
const siteNav = document.querySelector('.site-nav');

mobileButton?.addEventListener('click', () => {
  if (!siteNav) return;
  const expanded = siteNav.classList.toggle('open');
  mobileButton.setAttribute('aria-expanded', String(expanded));
});
