/* ═══════════════════════════════════════════════════════════
   STAN — Immersive Experience · app.js
   YouTube IFrame API · captions synchronisées · pluie · GSAP
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const VIDEO_ID = 'gOMhN-hfMtY';           // Eminem - Stan (Long Version) ft. Dido — EminemVEVO
  const VIDEO_LEN = 489;                    // 8:09
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) document.documentElement.classList.add('no-motion');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ─────────────────────────── PLUIE ─────────────────────────── */
  const rain = (() => {
    const canvas = $('#rain');
    const ctx = canvas.getContext('2d');
    let w, h, drops = [], raf;
    let intensity = 1; // réagit à la vitesse de scroll
    const mouse = { x: 0.5 };

    function resize() {
      w = canvas.width = innerWidth;
      h = canvas.height = innerHeight;
      const count = Math.min(180, Math.floor(w / 9));
      drops = Array.from({ length: count }, () => spawn(true));
    }
    function spawn(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -20,
        len: 10 + Math.random() * 18,
        speed: 7 + Math.random() * 9,
        drift: 0.6 + Math.random() * 1.2
      };
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(139,163,196,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        const dx = d.drift + mouse.x * 1.6;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - dx * d.len * 0.12, d.y + d.len);
        ctx.stroke();
        d.y += d.speed * intensity;
        d.x -= dx;
        if (d.y > h) drops[i] = spawn(false);
        if (d.x < -20) d.x = w + 20;
      }
      raf = requestAnimationFrame(frame);
    }
    addEventListener('resize', resize);
    addEventListener('mousemove', e => { mouse.x = (e.clientX / w - 0.5); });
    let lastY = scrollY;
    addEventListener('scroll', () => {
      const v = Math.min(3, Math.abs(scrollY - lastY) / 30);
      lastY = scrollY;
      intensity = 1 + v;
    }, { passive: true });

    resize();
    if (!reduceMotion) frame();
    else ctx.clearRect(0, 0, w, h);
    return { stop: () => cancelAnimationFrame(raf) };
  })();

  /* ─────────────────────────── COMPTEUR DE VISITES ─────────────────────────── */
  // Compteur local et honnête : il compte les visites sur cet appareil
  // (les services de compteurs globaux sans clé sont peu fiables).
  (() => {
    const KEY = 'stan-mmlp-visits';
    let n = 0;
    try {
      n = parseInt(localStorage.getItem(KEY) || '0', 10) + 1;
      localStorage.setItem(KEY, String(n));
    } catch (e) { n = 1; }
    const el = $('#visitorCount');
    el.textContent = n + (n > 1 ? ' visites' : ' visite');
  })();

  /* ─────────────────────────── CURSEUR ─────────────────────────── */
  (() => {
    if (matchMedia('(pointer:coarse)').matches) return;
    const dot = $('.cursor-dot'), ring = $('.cursor-ring');
    let rx = 0, ry = 0, tx = 0, ty = 0;
    addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = `translate(${tx}px,${ty}px) translate(-50%,-50%)`;
    });
    (function loop() {
      rx += (tx - rx) * 0.16; ry += (ty - ry) * 0.16;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    $$('a,button,.flip,.ref,.stat,.chapter__seek,.dock__bar').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
    });
  })();

  /* ─────────────────────────── YOUTUBE ─────────────────────────── */
  let yt = null, ytReady = false, gateDone = false;

  window.onYouTubeIframeAPIReady = function () {
    yt = new YT.Player('yt-bg', {
      videoId: VIDEO_ID,
      playerVars: {
        autoplay: 0, controls: 0, disablekb: 1, fs: 0,
        modestbranding: 1, rel: 0, playsinline: 1,
        iv_load_policy: 3, cc_load_policy: 0, start: 0
      },
      events: {
        onReady: () => { ytReady = true; if (pendingStart) start(pendingStart); },
        onStateChange: onState
      }
    });
  };

  function onState(e) {
    const playing = e.data === YT.PlayerState.PLAYING;
    $('#iconPlay').style.display = playing ? 'none' : '';
    $('#iconPause').style.display = playing ? '' : 'none';
  }

  let pendingStart = null;
  function start(muted) {
    if (!ytReady) { pendingStart = muted; return; }
    if (muted) { yt.mute(); } else { yt.unMute(); yt.setVolume(85); }
    yt.playVideo();
    gateDone = true;
    $('#gate').classList.add('is-gone');
    $('.video-stage').classList.add('is-live');
    document.body.classList.add('is-entered');
    $('#dock').hidden = false;
    requestAnimationFrame(() => $('#dock').classList.add('is-on'));
    $$('.caption')[0] && captionLoop();
  }

  $('#enterSound').addEventListener('click', () => start(false));
  $('#enterMuted').addEventListener('click', () => start(true));
  $('#gate').addEventListener('keydown', e => {
    if (e.key === 'Enter') { $('#enterSound').click(); }
  });

  /* ─────────────────────────── DOCK ─────────────────────────── */
  $('#dockPlay').addEventListener('click', () => {
    if (!yt) return;
    (yt.getPlayerState() === YT.PlayerState.PLAYING) ? yt.pauseVideo() : yt.playVideo();
  });
  $('#dockMute').addEventListener('click', () => {
    if (!yt) return;
    if (yt.isMuted()) { yt.unMute(); yt.setVolume(85); }
    else yt.mute();
    $('#iconVol').style.display = yt.isMuted() ? 'none' : '';
    $('#iconMuted').style.display = yt.isMuted() ? '' : 'none';
  });

  const fmt = s => {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };

  const bar = $('#dockBar');
  let scrubbing = false;
  function seekFromEvent(e) {
    if (!yt) return;
    const r = bar.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const p = Math.min(1, Math.max(0, x / r.width));
    yt.seekTo(p * VIDEO_LEN, true);
  }
  bar.addEventListener('pointerdown', e => { scrubbing = true; seekFromEvent(e); });
  addEventListener('pointermove', e => { if (scrubbing) seekFromEvent(e); });
  addEventListener('pointerup', () => scrubbing = false);
  bar.addEventListener('keydown', e => {
    if (!yt) return;
    if (e.key === 'ArrowRight') yt.seekTo(Math.min(VIDEO_LEN, yt.getCurrentTime() + 10), true);
    if (e.key === 'ArrowLeft') yt.seekTo(Math.max(0, yt.getCurrentTime() - 10), true);
  });

  function playerLoop() {
    if (yt && ytReady) {
      const t = yt.getCurrentTime();
      const p = t / VIDEO_LEN;
      $('#dockFill').style.width = (p * 100) + '%';
      $('#dockKnob').style.left = (p * 100) + '%';
      $('#dockTime').textContent = fmt(t) + ' / 8:09';
      bar.setAttribute('aria-valuenow', Math.floor(t));
    }
    requestAnimationFrame(playerLoop);
  }
  playerLoop();

  /* ─────────────────────────── CAPTIONS SYNCHRO ─────────────────────────── */
  // Repères de chapitres + fragments iconiques très courts (références culturelles).
  const cues = [
    { t: 0,   ch: 'OUVERTURE',      txt: '« my tea\u2019s gone cold… »' },
    { t: 42,  ch: 'LETTRE N°1',     txt: '« Dear Slim… »' },
    { t: 100, ch: 'LETTRE N°1',     txt: 'le plus grand fan du monde' },
    { t: 150, ch: 'LETTRE N°1',     txt: 'il attend juste une réponse' },
    { t: 188, ch: 'LETTRE N°2',     txt: '« Dear Slim, tu m\u2019as toujours ignoré » — l\u2019obsession grandit' },
    { t: 250, ch: 'LETTRE N°2',     txt: 'la cassette tourne, la colère monte' },
    { t: 300, ch: 'LE DERNIER TRAJET', txt: 'il pleut sur le pare-brise' },
    { t: 318, ch: 'LE DERNIER TRAJET', txt: 'le magnétophone roule encore' },
    { t: 360, ch: 'LE DERNIER TRAJET', txt: '…et la cassette continue de tourner' },
    { t: 420, ch: 'ÉPILOGUE',       txt: 'dans le bus, Slim ouvre enfin son courrier' },
    { t: 455, ch: 'ÉPILOGUE',       txt: 'il répond trop tard' },
    { t: 475, ch: 'FIN',            txt: 'le petit frère, devant la télé' }
  ];
  let currentCue = -1;

  function captionLoop() {
    if (!yt || !ytReady) { requestAnimationFrame(captionLoop); return; }
    const t = yt.getCurrentTime();
    let idx = -1;
    for (let i = 0; i < cues.length; i++) {
      if (t >= cues[i].t && t < cues[i].t + 14) idx = i;
    }
    if (idx !== currentCue) {
      currentCue = idx;
      const cap = $('#caption');
      if (idx >= 0) {
        $('#captionChapter').textContent = cues[idx].ch;
        $('#captionText').textContent = cues[idx].txt;
        cap.classList.add('is-on');
        const tx = $('#captionText');
        tx.classList.remove('swap'); void tx.offsetWidth; tx.classList.add('swap');
      } else {
        $('#caption').classList.remove('is-on');
      }
    }
    requestAnimationFrame(captionLoop);
  }

  /* ─────────────────────────── CHAPITRES → SEEK ─────────────────────────── */
  $$('.chapter__seek').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = +btn.dataset.seek;
      if (yt && ytReady) { yt.unMute(); yt.setVolume(85); yt.seekTo(t, true); yt.playVideo(); }
      scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ─────────────────────────── GSAP / SCROLL ─────────────────────────── */
  gsap.registerPlugin(ScrollTrigger);

  // reveals
  $$('.reveal').forEach(el => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' }
    });
  });

  // progress de la barre verticale (histoire)
  gsap.to('#railProgress', {
    height: '100%', ease: 'none',
    scrollTrigger: { trigger: '#timeline', start: 'top 70%', end: 'bottom 60%', scrub: 0.4 }
  });

  // parallaxe du hero (les fantômes latéraux restent en CSS pur)
  if (!reduceMotion) {
    gsap.to('.hero__inner', {
      yPercent: 18, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  // effet machine à écrire sur les lettres
  $$('.paper__body.type').forEach(el => {
    const html = el.innerHTML;
    el.innerHTML = '';
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => typeHTML(el, html, reduceMotion ? 0 : 14)
    });
  });

  function typeHTML(el, html, speed) {
    // type le texte en préservant les balises <strong>
    const parts = html.split(/(<[^>]+>)/g);
    el.innerHTML = '';
    let i = 0;
    function next() {
      if (i >= parts.length) return;
      const part = parts[i++];
      if (part.startsWith('<')) { el.innerHTML += part; next(); return; }
      let j = 0;
      (function tick() {
        if (j >= part.length) { next(); return; }
        el.innerHTML += part[j++];
        if (speed === 0) { el.innerHTML = parts.join(''); return; }
        setTimeout(tick, speed + Math.random() * speed);
      })();
    }
    next();
  }

  // compteurs animés
  $$('.stat__num').forEach(el => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => {
        if (target === 2017) { el.textContent = '2017'; return; }
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.8, ease: 'power2.out',
          onUpdate: () => el.textContent = Math.round(obj.v) + suffix
        });
      }
    });
  });

  // spotlight qui suit la souris sur les cartes références
  $$('.ref').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // flip cartes au clavier
  $$('.flip').forEach(f => {
    f.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.classList.toggle('is-flipped'); }
    });
  });

  // scrim assombri dès qu'on quitte le hero
  ScrollTrigger.create({
    start: () => innerHeight * 0.6, end: 'max',
    onToggle: s => document.body.classList.toggle('is-scrolled', s.isActive)
  });

  /* ─────────────────── MODE CINÉMA ─────────────────── */
  // Si l'écran est assez large pour laisser ~230px de bande noire de chaque
  // côté du clip (format 4:3 centré), tout le contenu se range sur les côtés
  // et le centre reste réservé au clip.
  const timelineEl = $('#timeline');
  const chapterEls = $$('.chapter', timelineEl);
  const cinemaState = { on: false };

  function updateCinema() {
    const gutter = (innerWidth - innerHeight * 4 / 3) / 2;
    const on = gutter >= 230;
    if (on) {
      document.documentElement.style.setProperty('--gw', Math.max(220, Math.floor(gutter - 28)) + 'px');
    }
    if (on === cinemaState.on) return;
    cinemaState.on = on;
    document.body.classList.toggle('cinema', on);
    if (on) {
      if (!timelineEl.querySelector('.rail')) {
        const L = document.createElement('div'); L.className = 'rail rail--left';
        const R = document.createElement('div'); R.className = 'rail rail--right';
        chapterEls.forEach((ch, i) => (i % 2 === 0 ? L : R).appendChild(ch));
        timelineEl.append(L, R);
      }
    } else {
      chapterEls.forEach(ch => timelineEl.appendChild(ch)); // restaure l'ordre d'origine
      $$('.rail', timelineEl).forEach(r => r.remove());
    }
    ScrollTrigger.refresh();
  }
  let cineT;
  addEventListener('resize', () => { clearTimeout(cineT); cineT = setTimeout(updateCinema, 150); });
  updateCinema();

})();
