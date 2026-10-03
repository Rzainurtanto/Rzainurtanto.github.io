// Transisi antarhalaman: matahari pixel tenggelam ke cakrawala selama pindah halaman.
// Dipakai di beranda dan halaman studi kasus. Tampilannya ada di style.css (bagian 15).
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pageName = (url) => {
    const path = url.pathname.replace(/index\.html$/, '');
    if (/\/berkasir\/$/.test(path)) return 'BERKASIR';
    if (/\/pensight\/$/.test(path)) return 'PENSIGHT';
    return 'BERANDA';
  };

  /* ---------- Tiba di halaman baru: tutup layar transisi ---------- */
  // Kelas is-arriving dipasang oleh script kecil di <head> supaya layar transisi tampil sejak awal
  const finish = () => {
    if (!root.classList.contains('is-arriving') || root.classList.contains('is-arrived')) return;
    root.classList.add('is-arrived');
    setTimeout(() => {
      root.classList.remove('is-arriving', 'is-arrived');
      delete root.dataset.loading;
    }, 450);
  };

  if (root.classList.contains('is-arriving')) {
    const start = performance.now();
    // Tampil minimal sebentar supaya animasinya sempat terlihat, tapi tidak lebih lama dari perlu
    window.addEventListener('load', () => setTimeout(finish, Math.max(0, 350 - (performance.now() - start))));
    setTimeout(finish, 3000); // pengaman kalau ada file yang lama dimuat
  }

  /* ---------- Meninggalkan halaman: tampilkan layar transisi ---------- */
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || reduceMotion) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return; // link ke website lain
    if (url.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '')) return; // pindah bagian di halaman yang sama

    event.preventDefault();
    const name = pageName(url);
    try { sessionStorage.setItem('page-loader', name); } catch (e) { /* storage tidak tersedia */ }

    // Jendela detail project berada di lapisan paling atas, jadi ditutup dulu
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    root.dataset.loading = name;
    root.classList.add('is-leaving');
    setTimeout(() => { location.href = url.href; }, 300);
  });

  // Kembali lewat tombol Back: halaman dipulihkan dari cache, jadi bersihkan layar transisi
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    root.classList.remove('is-leaving', 'is-arriving', 'is-arrived');
    delete root.dataset.loading;
  });
})();
