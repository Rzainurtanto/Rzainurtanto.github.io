// Script kecil untuk halaman studi kasus: tombol tema terang / gelap dan tahun di footer
(() => {
  'use strict';

  const root = document.documentElement;
  const themeToggle = document.querySelector('.theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const applyTheme = (theme) => {
    const isDark = theme === 'dark';
    root.dataset.theme = theme;
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
    themeToggle.firstElementChild.textContent = isDark ? '☀' : '☾';
    themeMeta.setAttribute('content', isDark ? '#0e1b2a' : '#f4efe6');
  };

  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');

  themeToggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) { /* storage tidak tersedia */ }
  });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
