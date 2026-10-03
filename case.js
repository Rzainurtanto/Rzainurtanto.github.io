// Script kecil untuk halaman studi kasus: tombol tema terang / gelap dan tahun di footer
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    const commit = () => {
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage tidak tersedia */ }
    };
    if (!document.startViewTransition || reduceMotion) { commit(); return; }
    root.dataset.themeShift = next === 'dark' ? 'to-dark' : 'to-light';
    // Pengaman: kalau transisi tidak berjalan, tema tetap berganti
    let applied = false;
    const run = () => { if (!applied) { applied = true; commit(); } };
    setTimeout(() => { run(); delete root.dataset.themeShift; }, 600);
    const transition = document.startViewTransition(run);
    transition.ready.catch(() => {}); // transisi bisa dilewati kalau tombol diklik cepat berturut-turut
    transition.finished.catch(() => {}).finally(() => { delete root.dataset.themeShift; });
  });

  // Garis cakrawala di footer tergambar saat terlihat
  const horizons = document.querySelectorAll('.section, .site-footer');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    horizons.forEach((el) => el.classList.add('is-drawn'));
  } else {
    const horizonObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    horizons.forEach((el) => horizonObserver.observe(el));
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
