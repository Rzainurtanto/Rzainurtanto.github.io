(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Tema terang / gelap ---------- */
  const themeToggle = $('.theme-toggle');
  const themeMeta = $('meta[name="theme-color"]');

  const applyTheme = (theme) => {
    const isDark = theme === 'dark';
    root.dataset.theme = theme;
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
    themeToggle.firstElementChild.textContent = isDark ? '☀' : '☾';
    themeMeta.setAttribute('content', isDark ? '#12101f' : '#f5eddf');
  };

  applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');

  themeToggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) { /* storage tidak tersedia */ }
  });

  /* ---------- Menu mobile ---------- */
  const menuToggle = $('.menu-toggle');
  const navLinks = $('#nav-links');

  const setMenu = (open) => {
    navLinks.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  };

  menuToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  navLinks.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', (event) => {
    if (navLinks.classList.contains('open') && !event.target.closest('.topbar')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navLinks.classList.contains('open')) {
      setMenu(false);
      menuToggle.focus();
    }
  });

  /* ---------- Header & progress scroll (bar EXP) ---------- */
  const topbar = $('.topbar');
  let ticking = false;

  const updateScroll = () => {
    const max = root.scrollHeight - window.innerHeight;
    root.style.setProperty('--progress', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
    topbar.classList.toggle('is-scrolled', window.scrollY > 8);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateScroll);
      ticking = true;
    }
  }, { passive: true });
  updateScroll();

  /* ---------- Link navigasi aktif ---------- */
  const links = $$('.nav-links a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        const active = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  $$('main section[id]').forEach((section) => sectionObserver.observe(section));

  /* ---------- Animasi muncul saat di-scroll ---------- */
  const revealEls = $$('.reveal');

  const finishReveal = (el) => {
    // Lepas kelas reveal setelah animasi selesai agar efek hover kembali responsif
    el.addEventListener('transitionend', function done(event) {
      if (event.target !== el || event.propertyName !== 'opacity') return;
      el.classList.remove('reveal');
      el.removeEventListener('transitionend', done);
    });
    el.classList.add('is-visible');
  };

  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        finishReveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Filter project ---------- */
  const filters = $$('.filter');
  const cards = $$('.project-card');
  const filterStatus = $('#filter-status');

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      let shown = 0;

      filters.forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });

      cards.forEach((card) => {
        const visible = filter === 'all' || card.dataset.category === filter;
        card.hidden = !visible;
        if (!visible) return;
        shown += 1;
        if (!card.classList.contains('is-visible')) finishReveal(card);
        card.classList.remove('pop');
        void card.offsetWidth; // restart animasi
        card.classList.add('pop');
      });

      filterStatus.textContent = `Menampilkan ${shown} project`;
    });
  });

  /* ---------- Detail project (modal + galeri foto) ---------- */
  const modal = $('#quest-modal');
  const galleryImg = $('.gallery-img', modal);
  const galleryVideo = $('.gallery-video', modal);
  const galleryMain = $('.gallery-main', modal);
  const galleryEmpty = $('.gallery-empty', modal);
  const galleryCount = $('.gallery-count', modal);
  const galleryThumbs = $('.gallery-thumbs', modal);
  const prevButton = $('.gallery-nav.prev', modal);
  const nextButton = $('.gallery-nav.next', modal);
  const modalLink = $('.modal-link', modal);
  const modalLinkAlt = $('.modal-link-alt', modal);
  let slides = [];
  let currentSlide = 0;

  const getImages = (card) => (card.dataset.images || '')
    .split(',')
    .map((src) => src.trim())
    .filter(Boolean);

  const pad = (n) => String(n).padStart(2, '0');
  const isVideo = (src) => /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(src || '');

  const stopVideo = () => {
    galleryVideo.pause();
    galleryVideo.hidden = true;
  };

  const showEmpty = () => {
    galleryImg.hidden = true;
    stopVideo();
    galleryEmpty.hidden = false;
  };

  const showSlide = (index) => {
    if (!slides.length) return;
    currentSlide = (index + slides.length) % slides.length;
    const slide = slides[currentSlide];

    galleryEmpty.hidden = true;
    if (!slide.src) {
      showEmpty();
    } else if (slide.video) {
      galleryImg.hidden = true;
      galleryMain.classList.remove('is-landscape');
      galleryVideo.onerror = showEmpty;
      galleryVideo.hidden = false;
      galleryVideo.poster = slide.poster || '';
      if (galleryVideo.getAttribute('src') !== slide.src) galleryVideo.src = slide.src;
      galleryVideo.setAttribute('aria-label', slide.alt);
    } else {
      stopVideo();
      galleryImg.onerror = showEmpty;
      // Screenshot lebar (desktop) pakai galeri yang lebih pendek supaya tidak banyak ruang kosong
      galleryImg.onload = () => galleryMain.classList.toggle('is-landscape', galleryImg.naturalWidth > galleryImg.naturalHeight * 1.2);
      galleryImg.hidden = false;
      galleryImg.alt = slide.alt;
      galleryImg.src = slide.src;
    }

    galleryCount.textContent = `${pad(currentSlide + 1)} / ${pad(slides.length)}`;
    $$('.thumb', galleryThumbs).forEach((thumb, i) => {
      if (i === currentSlide) thumb.setAttribute('aria-current', 'true');
      else thumb.removeAttribute('aria-current');
    });
  };

  const buildGallery = (images, title, poster) => {
    slides = (images.length ? images : [null]).map((src, i) => ({
      src,
      video: isVideo(src),
      poster,
      alt: `${title} — ${isVideo(src) ? 'video' : 'foto'} ${i + 1}`
    }));
    const multiple = slides.length > 1;

    galleryThumbs.replaceChildren(...slides.map((slide, i) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = slide.video ? 'thumb is-video' : 'thumb';
      thumb.setAttribute('aria-label', `Lihat ${slide.video ? 'video' : 'foto'} ${i + 1}`);
      thumb.textContent = pad(i + 1);
      const thumbSrc = slide.video ? slide.poster : slide.src;
      if (thumbSrc) {
        const img = new Image();
        img.alt = '';
        img.onload = () => thumb.replaceChildren(img);
        img.src = thumbSrc;
      }
      thumb.addEventListener('click', () => showSlide(i));
      return thumb;
    }));

    galleryThumbs.hidden = !multiple;
    galleryCount.hidden = !multiple;
    prevButton.hidden = !multiple;
    nextButton.hidden = !multiple;
    showSlide(0);
  };

  const openProject = (card) => {
    const title = $('h3', card).textContent.trim();
    const [category, year] = $$('.project-meta span', card).map((span) => span.textContent);
    const detail = $('template.project-detail', card);
    const link = (card.dataset.link || '').trim();

    $('#modal-title').textContent = title;
    $('.modal-category', modal).textContent = category || '';
    $('.modal-year', modal).textContent = year || '';
    $('.modal-desc', modal).replaceChildren(
      detail ? detail.content.cloneNode(true) : $('p', card).cloneNode(true)
    );
    $('.modal-tags', modal).replaceChildren(...$$('.project-tags li', card).map((li) => li.cloneNode(true)));

    modalLink.hidden = !link;
    if (link) {
      modalLink.href = link;
      $('.link-label', modalLink).textContent = card.dataset.linkLabel || 'KUNJUNGI PROJECT';
    }

    // Link kedua (opsional), misalnya video demo
    const altLink = (card.dataset.linkAlt || '').trim();
    modalLinkAlt.hidden = !altLink;
    if (altLink) {
      modalLinkAlt.href = altLink;
      $('.link-label', modalLinkAlt).textContent = card.dataset.linkAltLabel || 'TONTON DEMO';
    }

    buildGallery(getImages(card), title, card.dataset.poster);
    modal.showModal();
    root.classList.add('modal-open');
    // Selalu mulai dari atas, jangan lanjut dari posisi scroll project sebelumnya
    modal.scrollTop = 0;
    galleryThumbs.scrollLeft = 0;
  };

  cards.forEach((card) => {
    $('.project-link', card).addEventListener('click', () => openProject(card));

    const visual = $('.project-visual', card);
    const [cover] = getImages(card);
    if (!cover) return;

    if (isVideo(cover)) {
      // Project video: tampilkan poster, putar preview tanpa suara saat kartu di-hover
      const preview = document.createElement('video');
      preview.className = 'project-cover';
      preview.muted = true;
      preview.loop = true;
      preview.playsInline = true;
      preview.preload = 'none';
      preview.setAttribute('aria-hidden', 'true');
      if (card.dataset.poster) preview.poster = card.dataset.poster;
      preview.src = cover;
      visual.append(preview);

      if (!reduceMotion) {
        card.addEventListener('mouseenter', () => { preview.play().catch(() => {}); });
        card.addEventListener('mouseleave', () => { preview.pause(); preview.load(); }); // kembali ke thumbnail
      }
      return;
    }

    // Cover kartu: data-poster bila ada, kalau tidak pakai foto pertama
    const img = new Image();
    img.className = 'project-cover';
    img.alt = '';
    img.onload = () => visual.append(img);
    img.src = card.dataset.poster || cover;
  });

  prevButton.addEventListener('click', () => showSlide(currentSlide - 1));
  nextButton.addEventListener('click', () => showSlide(currentSlide + 1));
  $('.modal-close', modal).addEventListener('click', () => modal.close());

  modal.addEventListener('click', (event) => {
    if (event.target === modal) modal.close(); // klik di luar jendela
  });
  modal.addEventListener('keydown', (event) => {
    if (slides.length < 2 || event.target === galleryVideo) return;
    if (event.key === 'ArrowLeft') showSlide(currentSlide - 1);
    if (event.key === 'ArrowRight') showSlide(currentSlide + 1);
  });
  modal.addEventListener('close', () => {
    root.classList.remove('modal-open');
    galleryImg.removeAttribute('src');
    galleryVideo.pause();
    galleryVideo.removeAttribute('src');
    galleryVideo.load();
  });

  // Geser foto dengan swipe di HP
  let touchStartX = null;
  $('.gallery-main', modal).addEventListener('touchstart', (event) => {
    touchStartX = event.touches[0].clientX;
  }, { passive: true });
  $('.gallery-main', modal).addEventListener('touchend', (event) => {
    if (touchStartX === null || slides.length < 2) return;
    const delta = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 40) showSlide(currentSlide + (delta < 0 ? 1 : -1));
    touchStartX = null;
  });

  /* ---------- Latar hero mengikuti jam pengunjung ---------- */
  const heroArt = $('.hero-art');
  const hudTime = $('.hud-time');
  const sceneLabel = $('.scene-label');
  const timesOfDay = {
    dawn: { name: 'PAGI', label: 'morning routine', greet: ['GOOD', 'MORNING!'] },
    day: { name: 'SIANG', label: 'daylight quest', greet: ['HELLO,', 'WELCOME!'] },
    dusk: { name: 'SORE', label: 'golden hour', greet: ['GOOD', 'EVENING!'] },
    night: { name: 'MALAM', label: 'night shift', greet: ['STILL UP?', 'WELCOME!'] }
  };
  // Untuk mencoba suasana lain: tambahkan ?time=dawn | day | dusk | night di URL
  const forcedTime = new URLSearchParams(location.search).get('time');

  const getTimeOfDay = (hour) => {
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 16) return 'day';
    if (hour >= 16 && hour < 18) return 'dusk';
    return 'night';
  };

  let currentTime = 'night';
  // Waktu pilihan pengunjung lewat klik jam di HUD (null = ikut jam asli)
  let manualTime = timesOfDay[forcedTime] ? forcedTime : null;

  const updateSky = () => {
    const now = new Date();
    currentTime = manualTime || getTimeOfDay(now.getHours());
    const info = timesOfDay[currentTime];
    heroArt.dataset.time = currentTime;
    root.dataset.sky = currentTime; // dipakai juga oleh karakter kecil di luar ilustrasi
    hudTime.textContent = `${info.name} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    hudTime.classList.toggle('is-manual', Boolean(manualTime));
    hudTime.setAttribute('aria-label', `Waktu: ${info.name}${manualTime ? ' (dipilih manual)' : ''}. Klik untuk ganti waktu`);
    sceneLabel.textContent = info.label;
  };

  // Klik jam: Otomatis → Pagi → Siang → Sore → Malam → Otomatis
  const timeCycle = [null, 'dawn', 'day', 'dusk', 'night'];
  hudTime.addEventListener('click', () => {
    const next = timeCycle[(timeCycle.indexOf(manualTime) + 1) % timeCycle.length];
    manualTime = next;
    updateSky();
    showToast(next ? `⏱ WAKTU: ${timesOfDay[next].name}` : '⏱ WAKTU: OTOMATIS');
  });

  updateSky();
  setInterval(updateSky, 30000);

  /* ---------- Karakter: siklus pose idle + balon dialog ---------- */
  const character = $('.character');
  const speechBubble = $('.speech-bubble');
  const bubbleLineOne = $('.bubble-line-one');
  const bubbleLineTwo = $('.bubble-line-two');

  // pose: '' (diam), 'is-waving' (melambai), 'is-phone' (main HP)
  const idleScenes = [
    { pose: 'is-waving', duration: 3000, text: () => timesOfDay[currentTime].greet },
    { pose: '', duration: 3200, text: ["LET'S", 'CREATE!'] },
    { pose: 'is-phone', duration: 4400, text: ['WAIT,', 'NEW NOTIF!'] },
    // Malam hari teman-teman kecilnya tidur, jadi karakter utama berbisik
    { pose: '', duration: 3200, text: () => (currentTime === 'night' ? ['SSST...', "THEY'RE ASLEEP"] : ['NICE TO', 'MEET YOU!']) }
  ];
  let sceneIndex = 0;

  const say = ([lineOne, lineTwo]) => {
    speechBubble.classList.remove('bubble-swap');
    void speechBubble.offsetWidth; // restart animasi
    bubbleLineOne.textContent = lineOne;
    bubbleLineTwo.textContent = lineTwo;
    speechBubble.classList.add('bubble-swap');
  };

  const playScene = () => {
    const scene = idleScenes[sceneIndex];
    character.classList.remove('is-waving', 'is-phone');
    if (scene.pose && !reduceMotion) {
      void character.offsetWidth; // agar animasi lambaian bisa diulang
      character.classList.add(scene.pose);
    }
    if (!document.hidden) say(typeof scene.text === 'function' ? scene.text() : scene.text);
    sceneIndex = (sceneIndex + 1) % idleScenes.length;
    setTimeout(playScene, scene.duration);
  };

  playScene();

  /* ---------- Terminal kontak (efek mengetik) ---------- */
  const consoleEl = $('.contact-console');
  const typeLines = $$('[data-type]', consoleEl);

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const texts = typeLines.map((line) => line.textContent);
    typeLines.forEach((line) => { line.textContent = ''; });

    const typeConsole = async () => {
      for (let i = 0; i < typeLines.length; i += 1) {
        for (let c = 1; c <= texts[i].length; c += 1) {
          typeLines[i].textContent = texts[i].slice(0, c);
          await wait(i === 0 ? 45 : 22);
        }
        await wait(260);
      }
    };

    const consoleObserver = new IntersectionObserver((entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      typeConsole();
    }, { threshold: 0.5 });
    consoleObserver.observe(consoleEl);
  }

  /* ---------- Pilihan email (Gmail / email kampus) ---------- */
  const emailToggle = $('.email-toggle');
  const emailChooser = $('#email-chooser');

  const setEmailChooser = (open) => {
    emailChooser.hidden = !open;
    emailToggle.setAttribute('aria-expanded', String(open));
  };

  emailToggle.addEventListener('click', () => setEmailChooser(emailChooser.hidden));
  document.addEventListener('pointerdown', (event) => {
    if (!emailChooser.hidden && !event.target.closest('.email-wrap')) setEmailChooser(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !emailChooser.hidden) {
      setEmailChooser(false);
      emailToggle.focus();
    }
  });
  // Setelah memilih "KIRIM", tutup pilihannya
  $$('.email-send', emailChooser).forEach((link) => link.addEventListener('click', () => setEmailChooser(false)));

  /* ---------- Salin email ---------- */
  const toast = $('.toast');
  let toastTimer;

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  };

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    field.remove();
    if (!ok) throw new Error('copy failed');
  };

  $$('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await copyText(button.dataset.copy);
        showToast('✦ EMAIL TERSALIN!');
      } catch (e) {
        showToast(button.dataset.copy);
      }
    });
  });

  /* ---------- Musik latar ---------- */
  // Lagu utama: taruh file mp3-nya di path ini. Kalau file tidak ditemukan,
  // website otomatis memutar musik chiptune 8-bit bawaan.
  const MUSIC = {
    file: 'assets/audio/suiheisen-reff.dat', // MP3 berekstensi .dat supaya tidak ditangkap IDM
    title: 'Suiheisen',
    artist: 'back number · 水平線'
  };
  const CHIPTUNE = { title: 'Pixel Quest Theme', artist: '8-bit chiptune' };
  const DEFAULT_VOLUME = 5; // persen

  const musicToggle = $('.music-toggle');
  const musicPanel = $('#music-panel');
  const musicPlay = $('.music-play', musicPanel);
  const volumeInput = $('.music-volume input', musicPanel);
  const volumeOutput = $('.music-volume output', musicPanel);
  const nowPlaying = $('.now-playing');
  let musicOn = false;
  let player = null;
  let autoStarted = false;
  let nowPlayingTimer;
  let volume = DEFAULT_VOLUME;
  try {
    const saved = parseInt(localStorage.getItem('music-volume-v2'), 10);
    if (saved >= 0 && saved <= 100) volume = saved;
  } catch (e) { /* storage tidak tersedia */ }

  // Lagu diambil lewat fetch lalu diputar dari memori (blob), bukan dari URL .mp3 langsung.
  // Dengan begitu download manager seperti IDM tidak memunculkan jendela "Download File".
  let musicBlobUrl = null;
  let musicBlobPromise = null;
  const preloadMusic = () => {
    if (!musicBlobPromise) {
      musicBlobPromise = fetch(MUSIC.file)
        .then((response) => {
          // 204 = permintaan diambil alih download manager, 404 = file tidak ada
          if (response.status !== 200) throw new Error('File lagu tidak bisa dimuat');
          return response.arrayBuffer();
        })
        .then((buffer) => {
          if (!buffer.byteLength) throw new Error('File lagu kosong');
          // Beri tahu browser bahwa isinya audio MP3 (ekstensi file-nya .dat)
          musicBlobUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
        })
        .catch(() => { musicBlobUrl = null; }); // mis. dibuka via file:// → pakai URL biasa
    }
    return musicBlobPromise;
  };

  // Pemutar lagu dari file mp3
  const createFilePlayer = () => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.loop = true;
    const ensureSource = () => {
      if (!audio.getAttribute('src')) audio.src = musicBlobUrl || MUSIC.file;
    };
    return {
      info: MUSIC,
      isFile: true,
      // Kalau lagu sudah termuat, play() dipanggil langsung (penting untuk Safari/iPhone
      // yang hanya mengizinkan audio di dalam aksi klik pengunjung)
      start: () => {
        if (musicBlobUrl || audio.getAttribute('src')) {
          ensureSource();
          return audio.play();
        }
        return preloadMusic().then(() => { ensureSource(); return audio.play(); });
      },
      stop: () => audio.pause(),
      pause: () => audio.pause(),
      resume: () => audio.play().catch(() => {}),
      setVolume: (v) => { audio.volume = v / 100; }
    };
  };

  // Pemutar chiptune: sequencer kecil berbasis Web Audio API
  const createChiptunePlayer = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Gelombang pulse 25% ala konsol 8-bit
    const harmonics = 32;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    for (let n = 1; n < harmonics; n += 1) real[n] = (2 * Math.sin(n * Math.PI * 0.25)) / (n * Math.PI);
    const pulseWave = ctx.createPeriodicWave(real, imag);

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noise.length; i += 1) noise[i] = Math.random() * 2 - 1;

    const BPM = 104;
    const STEP = 60 / BPM / 4; // durasi 1/16 not
    const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

    // Progresi C - Am - F - G (2 putaran = 8 bar)
    const chords = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
    const bassRoots = [48, 45, 41, 43];
    const melody = [
      [76, 79, 84, 79, 76, 79, 81, 79], [76, 0, 72, 76, 81, 0, 79, 76],
      [77, 81, 84, 81, 77, 81, 79, 77], [74, 79, 83, 86, 83, 79, 77, 74],
      [84, 83, 84, 79, 76, 79, 84, 88], [84, 81, 76, 81, 84, 83, 81, 79],
      [81, 77, 81, 84, 89, 88, 86, 84], [83, 86, 79, 83, 86, 0, 0, 0]
    ];
    const arpPattern = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 3];
    const bassPattern = [0, 0, 12, 0, 7, 0, 12, 7];

    const tone = (type, midi, time, length, vol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      if (type === 'pulse') osc.setPeriodicWave(pulseWave);
      else osc.type = type;
      osc.frequency.value = freq(midi);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(vol, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
      osc.connect(gain).connect(master);
      osc.start(time);
      osc.stop(time + length + 0.02);
    };

    const hat = (time) => {
      const src = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      src.buffer = noiseBuffer;
      filter.type = 'highpass';
      filter.frequency.value = 7000;
      gain.gain.setValueAtTime(0.025, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
      src.connect(filter).connect(gain).connect(master);
      src.start(time);
    };

    let step = 0;
    let nextTime = 0;
    let timer = null;
    let level = 0;
    let playing = false;

    const scheduleStep = (s, time) => {
      const bar = Math.floor(s / 16) % 8;
      const inBar = s % 16;
      const chord = chords[bar % 4];

      tone('square', chord[arpPattern[inBar]], time, STEP * 0.9, 0.018);
      if (inBar % 2 === 0) {
        const note = melody[bar][inBar / 2];
        if (note) tone('pulse', note, time, STEP * 1.8, 0.05);
        tone('triangle', bassRoots[bar % 4] + bassPattern[inBar / 2], time, STEP * 1.7, 0.14);
      }
      if (inBar % 4 === 2) hat(time);
    };

    const scheduler = () => {
      while (nextTime < ctx.currentTime + 0.12) {
        scheduleStep(step, nextTime);
        nextTime += STEP;
        step = (step + 1) % (16 * 8);
      }
    };

    const fade = (to, duration) => {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(to, now + duration);
    };

    return {
      info: CHIPTUNE,
      isFile: false,
      start: async () => {
        playing = true;
        await Promise.race([ctx.resume(), new Promise((resolve) => setTimeout(resolve, 300))]);
        if (ctx.state !== 'running') {
          playing = false;
          const blocked = new Error('Autoplay diblokir browser');
          blocked.name = 'NotAllowedError';
          throw blocked;
        }
        if (!timer) {
          step = 0;
          nextTime = ctx.currentTime + 0.05;
          timer = setInterval(scheduler, 25);
        }
        fade(level, 0.6);
      },
      stop: () => {
        playing = false;
        fade(0, 0.3);
        setTimeout(() => {
          if (playing) return;
          clearInterval(timer);
          timer = null;
          ctx.suspend();
        }, 350);
      },
      pause: () => ctx.suspend(),
      resume: () => ctx.resume(),
      setVolume: (v) => {
        level = (v / 100) * 2.4;
        if (playing) fade(level, 0.15);
      }
    };
  };

  const updateMusicUI = () => {
    musicToggle.classList.toggle('is-playing', musicOn);
    musicPanel.classList.toggle('is-playing', musicOn);
    musicPlay.classList.toggle('is-playing', musicOn);
    musicPlay.setAttribute('aria-label', musicOn ? 'Jeda lagu' : 'Putar lagu');
  };

  const showTrack = (info) => {
    $('.music-title', musicPanel).textContent = info.title;
    $('.music-artist', musicPanel).textContent = info.artist;
    if ('mediaSession' in navigator && 'MediaMetadata' in window) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: info.title, artist: info.artist, album: 'Rzainurtanto Portfolio' });
    }
  };

  const showNowPlaying = (info) => {
    $('.np-title', nowPlaying).textContent = info.title;
    $('.np-artist', nowPlaying).textContent = info.artist;
    nowPlaying.classList.add('show');
    clearTimeout(nowPlayingTimer);
    nowPlayingTimer = setTimeout(() => nowPlaying.classList.remove('show'), 4500);
  };

  const setVolumeUI = () => {
    volumeInput.value = String(volume);
    volumeInput.style.setProperty('--fill', `${volume}%`);
    volumeOutput.textContent = `${volume}%`;
  };

  const startPlayer = async () => {
    if (!player) player = createFilePlayer();
    player.setVolume(volume);
    try {
      await player.start();
    } catch (error) {
      // Diblokir kebijakan autoplay browser → jangan ganti ke chiptune, tunggu interaksi
      if (error && error.name === 'NotAllowedError') throw error;
      if (!player.isFile) throw error;
      // File lagu tidak ditemukan / tidak bisa diputar → pakai chiptune bawaan
      player = createChiptunePlayer();
      player.setVolume(volume);
      await player.start();
    }
  };

  const setMusic = async (on, { remember = true, announce = true } = {}) => {
    musicOn = on;
    pausedForVideo = false;
    updateMusicUI();
    if (remember) {
      try { localStorage.setItem('music', on ? 'on' : 'off'); } catch (e) { /* storage tidak tersedia */ }
    }
    if (!on) {
      if (player) player.stop();
      nowPlaying.classList.remove('show');
      return 'stopped';
    }
    try {
      await startPlayer();
    } catch (error) {
      musicOn = false;
      updateMusicUI();
      if (error && error.name === 'NotAllowedError') return 'blocked';
      showToast('MUSIK TIDAK BISA DIPUTAR');
      return 'error';
    }
    autoStarted = true;
    showTrack(player.info);
    if (announce) showNowPlaying(player.info);
    syncMusicWithVideo(); // kalau video sedang berbunyi, musik langsung dijeda
    return 'playing';
  };

  const setPanel = (open) => {
    musicPanel.hidden = !open;
    musicToggle.setAttribute('aria-expanded', String(open));
    musicToggle.setAttribute('aria-label', open ? 'Tutup pemutar musik' : 'Buka pemutar musik');
  };

  // Mulai memuat lagu saat kursor/jari mendekati tombol musik, supaya klik langsung berbunyi
  ['pointerenter', 'touchstart'].forEach((type) => musicToggle.addEventListener(type, preloadMusic, { once: true, passive: true }));

  musicToggle.addEventListener('click', () => {
    const open = musicPanel.hidden;
    setPanel(open);
    // Klik pertama langsung memutar lagu, berikutnya hanya membuka/menutup panel
    if (open && !musicOn && !autoStarted) {
      autoStarted = true;
      setMusic(true);
    }
  });
  $('.music-close', musicPanel).addEventListener('click', () => { setPanel(false); musicToggle.focus(); });
  musicPlay.addEventListener('click', () => {
    autoStarted = true;
    // Saat musik dijeda karena video, tombol play berarti "lanjutkan musik": jeda videonya
    if (pausedForVideo) { galleryVideo.pause(); return; }
    setMusic(!musicOn);
  });

  // Tombol "Putar lagu" di kartu Side Quests
  $$('[data-play-music]').forEach((button) => {
    button.addEventListener('click', () => {
      if (musicOn && player) showNowPlaying(player.info);
      else setMusic(true);
    });
  });

  volumeInput.addEventListener('input', () => {
    volume = parseInt(volumeInput.value, 10);
    setVolumeUI();
    if (player) player.setVolume(volume);
    try { localStorage.setItem('music-volume-v2', String(volume)); } catch (e) { /* storage tidak tersedia */ }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!musicPanel.hidden && !event.target.closest('.music-wrap')) setPanel(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !musicPanel.hidden) {
      setPanel(false);
      musicToggle.focus();
    }
  });

  // Jeda musik saat video project diputar dengan suara, lanjut lagi setelah video berhenti
  let pausedForVideo = false;
  const videoHasSound = () => !galleryVideo.paused && !galleryVideo.muted && galleryVideo.volume > 0;

  const syncMusicWithVideo = () => {
    if (!musicOn || !player) return;
    if (videoHasSound() && !pausedForVideo) {
      pausedForVideo = true;
      player.pause();
      musicToggle.classList.remove('is-playing');
      musicPanel.classList.remove('is-playing');
      showToast('♪ MUSIK DIJEDA SELAMA VIDEO');
    } else if (!videoHasSound() && pausedForVideo) {
      pausedForVideo = false;
      if (!document.hidden) player.resume();
      updateMusicUI();
    }
  };

  ['play', 'pause', 'ended', 'volumechange', 'emptied'].forEach((type) => {
    galleryVideo.addEventListener(type, syncMusicWithVideo);
  });

  // Jeda saat tab tidak aktif
  document.addEventListener('visibilitychange', () => {
    if (!musicOn || !player) return;
    if (document.hidden) player.pause();
    else if (!pausedForVideo) player.resume();
  });

  setVolumeUI();
  showTrack(MUSIC);

  // Putar otomatis saat halaman dibuka. Browser biasanya memblokir audio sebelum
  // pengunjung berinteraksi, jadi kalau diblokir lagu mulai pada klik/tap/tombol pertama.
  // Kalau pengunjung pernah mematikan musik, pilihannya dihormati (tidak diputar otomatis).
  const startOnFirstGesture = () => {
    const onGesture = (event) => {
      ['pointerdown', 'keydown', 'touchstart'].forEach((type) => document.removeEventListener(type, onGesture));
      if (musicOn) return;
      // Klik pada pemutar musik sudah ditangani tombolnya sendiri
      if (event.target.closest && event.target.closest('.music-wrap')) return;
      setMusic(true, { remember: false });
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach((type) => document.addEventListener(type, onGesture, { passive: true }));
  };

  let musicPref = null;
  try { musicPref = localStorage.getItem('music'); } catch (e) { /* storage tidak tersedia */ }
  if (musicPref !== 'off') {
    setMusic(true, { remember: false }).then((result) => {
      if (result === 'blocked') startOnFirstGesture();
    });
  }

  /* ---------- Mulai dari atas saat halaman dibuka / di-refresh ---------- */
  // Hapus #bagian dari alamat (misalnya #work setelah klik menu) supaya refresh tidak lompat ke sana
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  const scrollToTopNow = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  scrollToTopNow();
  window.addEventListener('load', scrollToTopNow);
  window.addEventListener('pageshow', (event) => { if (event.persisted) scrollToTopNow(); });

  /* ---------- Tahun di footer ---------- */
  $('#year').textContent = new Date().getFullYear();
})();
