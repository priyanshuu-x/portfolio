/* Scratch-to-reveal project cards.
   Each .card gets a foil canvas on top. Press + drag to scratch; once ~45% is cleared the
   foil dissolves. A "Reveal" button keeps it usable with keyboard, touch and reduced motion. */
(() => {
  const cards = [...document.querySelectorAll('.card')];
  if (!cards.length) return;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const counter = document.getElementById('unlock-count');
  const hintTotal = document.getElementById('unlock-total');
  const doneMsg = document.getElementById('unlock-done');
  let revealed = 0;
  if (hintTotal) hintTotal.textContent = cards.length;

  const countUp = (el) => {
    const to = parseFloat(el.dataset.to), dec = +(el.dataset.dec || 0);
    const t0 = performance.now();
    const f = (t) => {
      const p = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (to * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(f);
    };
    el.textContent = '0';
    requestAnimationFrame(f);
  };

  function paintFoil(ctx, w, h, idx) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#6a7de8'); g.addColorStop(0.28, '#a99af4');
    g.addColorStop(0.5, '#f7c4e2'); g.addColorStop(0.72, '#9fb0f5'); g.addColorStop(1, '#7a6be6');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // brushed lines
    ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    for (let x = -h; x < w; x += 7) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h * 0.6, 0); ctx.stroke(); }
    ctx.restore();
    // glitter
    for (let i = 0; i < (w * h) / 500; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.28})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5 * dpr, 1.5 * dpr);
    }
    // sheen
    const s = ctx.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0.3, 'rgba(255,255,255,0)'); s.addColorStop(0.45, 'rgba(255,255,255,.22)'); s.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; ctx.fillRect(0, 0, w, h);
    // border
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2 * dpr; ctx.strokeRect(14 * dpr, 14 * dpr, w - 28 * dpr, h - 28 * dpr);
    // text
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(20,10,60,.6)'; ctx.shadowBlur = 12 * dpr;
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    const big = Math.max(18, Math.min(w / dpr / 21, 46)) * dpr;
    ctx.font = `800 ${big}px Syne, system-ui, sans-serif`;
    ctx.fillText('SCRATCH TO REVEAL', w / 2, h / 2 - big * 0.1);
    ctx.font = `500 ${Math.max(11, big * 0.26)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.fillText(`PROJECT 0${idx + 1}  ·  CLASSIFIED  ·  DRAG TO UNLOCK`, w / 2, h / 2 + big * 0.72);
    ctx.font = `${big * 0.7}px sans-serif`;
    ctx.fillText('✦', w * 0.1, h * 0.16); ctx.fillText('✦', w * 0.9, h * 0.84);
  }

  cards.forEach((card, idx) => {
    const cv = document.createElement('canvas');
    cv.className = 'scratch';
    cv.setAttribute('aria-hidden', 'true');
    cv.dataset.cur = '';
    const skip = document.createElement('button');
    skip.type = 'button'; skip.className = 'skip-scratch mono'; skip.textContent = 'Reveal ↗';
    skip.setAttribute('aria-label', `Reveal project ${idx + 1}`);
    card.append(cv, skip);
    card.classList.add('locked');

    const ctx = cv.getContext('2d');
    const CELL = 28;
    let cols, rows, grid, marked, started = false, done = false, drawing = false, last = null;

    function setup() {
      if (started || done) return;
      const r = card.getBoundingClientRect();
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      cols = Math.ceil(cv.width / (CELL * dpr)); rows = Math.ceil(cv.height / (CELL * dpr));
      grid = new Uint8Array(cols * rows); marked = 0;
      ctx.globalCompositeOperation = 'source-over';
      paintFoil(ctx, cv.width, cv.height, idx);
    }
    setup();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(setup);
    addEventListener('resize', setup);

    function reveal(auto) {
      if (done) return;
      done = true;
      card.classList.remove('locked');
      card.classList.add('revealed');
      cv.style.opacity = '0';
      setTimeout(() => cv.remove(), 700);
      skip.remove();
      card.querySelectorAll('[data-to]').forEach(countUp);
      revealed++;
      if (counter) counter.textContent = revealed;
      if (revealed === cards.length && doneMsg) doneMsg.classList.add('show');
    }
    skip.addEventListener('click', () => reveal(false));

    const pos = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * cv.width, y: ((e.clientY - r.top) / r.height) * cv.height };
    };
    function mark(p, rad) {
      const c0 = Math.max(0, Math.floor((p.x - rad) / (CELL * dpr))), c1 = Math.min(cols - 1, Math.floor((p.x + rad) / (CELL * dpr)));
      const r0 = Math.max(0, Math.floor((p.y - rad) / (CELL * dpr))), r1 = Math.min(rows - 1, Math.floor((p.y + rad) / (CELL * dpr)));
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const i = r * cols + c;
        if (!grid[i]) { grid[i] = 1; marked++; }
      }
    }
    function scratch(e) {
      const p = pos(e), rad = 34 * dpr;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = rad * 2;
      ctx.beginPath(); ctx.moveTo((last || p).x, (last || p).y); ctx.lineTo(p.x, p.y); ctx.stroke();
      mark(p, rad * 0.8);
      last = p; started = true;
      if (marked / (cols * rows) > 0.45) reveal(true);
    }
    cv.addEventListener('pointerdown', (e) => { drawing = true; last = null; cv.setPointerCapture(e.pointerId); scratch(e); });
    cv.addEventListener('pointermove', (e) => { if (drawing) scratch(e); });
    const stop = () => { drawing = false; last = null; };
    cv.addEventListener('pointerup', stop);
    cv.addEventListener('pointercancel', stop);
  });

  const all = document.getElementById('reveal-all');
  if (all) all.addEventListener('click', () => document.querySelectorAll('.skip-scratch').forEach((b) => b.click()));
})();
