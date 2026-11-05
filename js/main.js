(() => {
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const fine = matchMedia('(pointer:fine)').matches;

  /* ---------- split helpers ---------- */
  $$('[data-chars]').forEach((el) => {
    const t = el.textContent;
    el.textContent = '';
    el.setAttribute('aria-hidden', 'true');
    [...t].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--c', i);
      s.textContent = ch;
      el.appendChild(s);
    });
  });

  $$('[data-split]').forEach((el) => {
    const walk = (node, ctr) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w.trim()) { frag.appendChild(document.createTextNode(w)); return; }
            const wm = document.createElement('span'); wm.className = 'wm';
            const wi = document.createElement('span'); wi.className = 'wi';
            wi.style.setProperty('--w', ctr.i++);
            wi.textContent = w; wm.appendChild(wi); frag.appendChild(wm);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n, ctr);
      });
    };
    walk(el, { i: 0 });
  });

  // about text: word-by-word scroll scrub
  const about = $('#about-text');
  let aboutWords = [];
  if (about) {
    const words = about.textContent.trim().split(/\s+/);
    about.textContent = '';
    aboutWords = words.map((w) => {
      const s = document.createElement('span');
      s.className = 'w'; s.textContent = w + ' ';
      about.appendChild(s); return s;
    });
  }

  /* ---------- loader ---------- */
  const loader = $('#loader');
  const ln = $('#loader-n');
  let started = false;
  function start() {
    if (started) return; started = true;
    document.body.classList.add('go');
    loader && loader.classList.add('done');
    setTimeout(() => loader && loader.remove(), 1200);
  }
  if (loader && !reduce) {
    let n = 0;
    const tick = () => {
      n += Math.max(1, Math.round((100 - n) / 9));
      if (n >= 100) { ln.textContent = 100; setTimeout(start, 250); return; }
      ln.textContent = n; setTimeout(tick, 45);
    };
    tick();
    setTimeout(start, 4000); // safety net
  } else start();

  /* ---------- smooth scroll (Lenis, optional) ---------- */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
  }
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const t = id === '#top' ? document.body : $(id);
      if (!t) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(id === '#top' ? 0 : t, { offset: -20, duration: 1.4 });
      else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ---------- menu ---------- */
  const burger = $('#burger'), links = $('#links');
  function closeMenu() { links.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); lenis && lenis.start(); }
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
    lenis && (open ? lenis.stop() : lenis.start());
  });

  /* ---------- reveal + counters ---------- */
  const countUp = (el) => {
    const to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0);
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1400;
    const f = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (to * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-to]', e.target).forEach(countUp);
    if (e.target.matches('[data-to]')) countUp(e.target);
    io.unobserve(e.target);
  }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-r],[data-split],.metrics').forEach((el) => io.observe(el));
  // stagger siblings
  $$('.stats .stat, .powers .power').forEach((el, i) => el.style.setProperty('--d', (i % 5) * 0.07 + 's'));

  /* ---------- cursor, magnetic, spotlight ---------- */
  const dot = $('#cursor-dot'), ring = $('#cursor-ring');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  if (fine) {
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      html.classList.add('has-cursor');
      const t = e.target.closest('[data-mag],[data-cur],a,button,input');
      ring.classList.toggle('big', !!t);
    }, { passive: true });
    $$('[data-mag]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
    $$('.spot').forEach((el) => el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', e.clientX - r.left + 'px');
      el.style.setProperty('--my', e.clientY - r.top + 'px');
    }));
  }


  /* ---------- 3D tilt on glass panels ---------- */
  if (fine && !reduce) {
    $$('.viz,.stat,.orders,.rules,.score').forEach((el) => {
      el.classList.add('tilt');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add('live');
        el.style.transform = `perspective(900px) rotateX(${-py * 10}deg) rotateY(${px * 12}deg) translateZ(6px)`;
      });
      el.addEventListener('pointerleave', () => { el.classList.remove('live'); el.style.transform = ''; });
    });
  }

  /* ---------- clock (IST) ---------- */
  const clock = $('#clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tickClock = () => (clock.textContent = fmt.format(new Date()));
  tickClock(); setInterval(tickClock, 1000);

  /* ---------- scroll-driven bits ---------- */
  const progress = $('#progress'), nav = $('#nav'), orb = $('#orb'), name = $('.hero-name'), hero = $('#hero');
  const hint = $('#float-hint'), lab = $('#lab');
  let lastY = 0;
  function onScroll() {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    nav.classList.toggle('solid', y > 40);
    nav.classList.toggle('hide', y > 300 && y > lastY + 4 && !links.classList.contains('open'));
    if (y < lastY - 4) nav.classList.remove('hide');
    lastY = y;

    if (y < innerHeight * 1.2 && !reduce) {
      orb.style.transform = `translate3d(${mx * -0.02}px,${y * 0.25 + my * -0.02}px,0)`;
      name.style.transform = `translate3d(0,${y * -0.12}px,0)`;
    }
    if (about && aboutWords.length) {
      const r = about.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.25)));
      const n = Math.round(p * aboutWords.length);
      aboutWords.forEach((w, i) => w.classList.toggle('lit', i < n));
    }
    // floating hint: appear after hero, vanish while the lab is on screen
    const lr = lab.getBoundingClientRect();
    const inLab = lr.top < innerHeight * 0.6 && lr.bottom > innerHeight * 0.3;
    hint.classList.toggle('show', y > innerHeight * 0.7);
    hint.classList.toggle('gone', inLab);
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- neural network canvas (reacts to cursor) ---------- */
  const cv = $('#net'), cx = cv.getContext('2d');
  let W, H, nodes = [], dpr = Math.min(devicePixelRatio || 1, 1.5);
  function size() {
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    const n = Math.min(90, Math.round((innerWidth * innerHeight) / 20000));
    nodes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr,
    }));
  }
  size(); addEventListener('resize', size);
  const LINK = 150 * dpr;
  function draw() {
    cx.clearRect(0, 0, W, H);
    const px = mx * dpr, py = my * dpr;
    for (const a of nodes) {
      a.x += a.vx; a.y += a.vy;
      if (a.x < 0 || a.x > W) a.vx *= -1;
      if (a.y < 0 || a.y > H) a.vy *= -1;
      const dx = a.x - px, dy = a.y - py, d = Math.hypot(dx, dy);
      if (d < 180 * dpr && d > 1) { a.x += (dx / d) * 0.6; a.y += (dy / d) * 0.6; }
      cx.fillStyle = 'rgba(196,181,253,.7)';
      cx.beginPath(); cx.arc(a.x, a.y, 1.6 * dpr, 0, 6.283); cx.fill();
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          cx.strokeStyle = `rgba(167,139,250,${(1 - d / LINK) * 0.35})`;
          cx.lineWidth = dpr * 0.7;
          cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();
        }
      }
      const d = Math.hypot(a.x - px, a.y - py);
      if (d < 200 * dpr) {
        cx.strokeStyle = `rgba(221,214,254,${(1 - d / (200 * dpr)) * 0.6})`;
        cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(px, py); cx.stroke();
      }
    }
  }

  /* ---------- main loop ---------- */
  function raf(t) {
    lenis && lenis.raf(t);
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    if (fine) {
      dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    }
    if (!document.hidden && !reduce) draw();
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  if (reduce) draw();
})();
