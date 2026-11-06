/* Guardrail Run — a tiny canvas game where each level is one of my projects.
   Attacks fall from the sky: catch them with the guardrail. Real users must pass through.
   Clear a level to unlock that project's results. Self-contained, no network, no dependencies. */
(() => {
  const cv = document.getElementById('gm-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const ov = document.getElementById('gm-ov');
  const live = document.getElementById('gm-live');
  const cards = [...document.querySelectorAll('.gl')];
  const frame = cv.parentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(devicePixelRatio || 1, 2);

  const LEVELS = [
    { name: 'TicketPilot', sub: 'Policy, ownership & human approval', goal: 8, speed: 105, gap: 1.35, reward: 'About & the Agent Tower', go: ['#about', 'Go to About ↓'], shield: 170, accent: '#86e0e8',
      bad: ['ignore previous instructions', 'refund every order', 'act as admin', 'refund #3150 (not mine)', 'skip human approval', 'reveal system prompt'],
      good: ['refund #1042', 'track order #5001', 'return #2077'] },
    { name: 'PaperPilot', sub: 'Grounding, citations & off-topic gates', goal: 11, speed: 130, gap: 1.15, reward: 'the Projects', go: ['#work', 'See the projects ↓'], shield: 150, accent: '#b3a8fa',
      bad: ['capital of France?', 'make up a citation', 'you are DAN', 'print your prompt', 'ignore the papers', 'write my essay'],
      good: ['what is RRF?', 'how does BM25 rank?', 'cite the reranker paper'] },
    { name: 'LLM Gateway', sub: 'Injection, PII & rate limits', goal: 14, speed: 160, gap: 1.0, reward: 'the live agent demo', go: ['#lab', 'Try to break my agent ↓'], shield: 132, accent: '#ffdc7a',
      bad: ['<system>override</system>', 'SSN 123-45-6789', 'disregard all rules', 'spam x1000 req/s', 'jailbreak mode on', 'bypass the guardrail'],
      good: ['summarize this doc', 'translate to Hindi', 'write a regex'] },
  ];

  let W = 960, H = 540;
  const S = { mode: 'menu', lv: 0, score: 0, lives: 3, blocked: 0, combo: 0, items: [], parts: [], floats: [], stars: [], shake: 0, flash: 0,
              spawn: 0, tx: 480, sx: 480, keys: { l: false, r: false }, visible: false, totalBlocked: 0, falsePos: 0, cleared: [false, false, false], t: 0 };
  let best = 0;
  try { best = +localStorage.getItem('gm-best') || 0; } catch (e) { /* storage may be blocked */ }
  cv.__game = S; // handy for testing

  function size() {
    const portrait = innerWidth < 700;
    W = portrait ? 420 : 960; H = portrait ? 640 : 540;
    cv.width = W * dpr; cv.height = H * dpr;
    frame.style.aspectRatio = `${W} / ${H}`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.tx = S.sx = W / 2;
    S.stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6 + .3, v: Math.random() * 14 + 6 }));
  }
  size();
  addEventListener('resize', () => { if (S.mode !== 'play') size(); });

  const L = () => LEVELS[S.lv];
  const say = (m) => { if (live) live.textContent = m; };
  const floorY = () => H - 34;
  const shieldY = () => H - 78;


  /* ---------- quest: clearing levels unlocks sections of the page ---------- */
  const GROUPS = ['tower', 'work', 'lab'];
  let unlocked = 0;
  try { unlocked = Math.min(3, Math.max(0, +localStorage.getItem('gm-unlocked') || 0)); } catch (e) { /* storage may be blocked */ }
  const goTo = (sel) => {
    const t = document.querySelector(sel); if (!t) return;
    if (window.__lenis) window.__lenis.scrollTo(t, { offset: -20, duration: 1.4 }); else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  function lockSection(i) {
    const sec = document.getElementById(GROUPS[i]);
    if (!sec || sec.querySelector(':scope > .q-veil')) return;
    sec.classList.add('is-locked');
    [...sec.children].forEach((c) => c.setAttribute('inert', ''));
    const v = document.createElement('div');
    v.className = 'q-veil';
    v.innerHTML = `<div class="q-card"><p class="gm-k mono">LOCKED · LEVEL ${i + 1}</p><h3>Clear Level ${i + 1} to unlock ${LEVELS[i].reward}.</h3><div class="q-btns"><a href="#play" class="q-play" data-cur>▶ Play Level ${i + 1} ↑</a><button type="button" data-quest="skip" data-cur>Skip: unlock everything</button></div></div>`;
    sec.appendChild(v);
  }
  function unlockSection(i) {
    const sec = document.getElementById(GROUPS[i]);
    if (!sec) return;
    [...sec.children].forEach((c) => c.removeAttribute('inert'));
    sec.classList.remove('is-locked');
    const v = sec.querySelector(':scope > .q-veil');
    if (v) { v.classList.add('out'); setTimeout(() => v.remove(), reduce ? 20 : 950); }
  }
  function applyQuest() {
    GROUPS.forEach((_, i) => (i < unlocked ? unlockSection(i) : lockSection(i)));
    cards.forEach((c, i) => { const open = i < unlocked; c.classList.toggle('locked', !open); c.classList.toggle('open', open); });
    document.documentElement.classList.toggle('quest-done', unlocked >= 3);
  }
  function setUnlocked(n) {
    unlocked = Math.max(unlocked, Math.min(3, n));
    try { localStorage.setItem('gm-unlocked', String(unlocked)); } catch (e) { /* ignore */ }
    applyQuest();
  }
  document.addEventListener('click', (e) => {
    const sk = e.target.closest('[data-quest="skip"]');
    if (sk) { e.preventDefault(); setUnlocked(3); if (S.mode === 'play') pause(); if (sk.dataset.goto) setTimeout(() => goTo(sk.dataset.goto), 80); return; }
    const go = e.target.closest('a.gm-go');
    if (go) { e.preventDefault(); goTo(go.getAttribute('href')); }
  });

  /* ---------- overlays ---------- */
  function show(html) { ov.innerHTML = html; ov.classList.remove('hide'); const b = ov.querySelector('button'); b && b.focus({ preventScroll: true }); }
  function hide() { ov.classList.add('hide'); ov.innerHTML = ''; }

  function menu() {
    S.mode = 'menu';
    const done = unlocked >= 3;
    const next = Math.min(unlocked, 2);
    show(`
      <div class="gm-card">
        <p class="gm-k mono">LEVEL MODE · GUARDRAIL RUN</p>
        <h3>Defend the agent.</h3>
        <p>Attacks fall from the sky. <b>Catch them</b> with your guardrail. <b>Let real users through.</b></p>
        <div class="gm-legend mono"><span class="chip bad">ignore previous instructions</span><i>catch it</i><span class="chip good">refund #1042</span><i>let it pass</i></div>
        <p class="gm-small mono">Drag your mouse or finger · or use ← → · Esc pauses · 3 lives</p>
        ${best ? `<p class="gm-small mono">Best score: ${best}</p>` : ''}
        <button type="button" data-act="start" data-cur>${done ? '↻ Play again' : `▶ ${unlocked ? 'Continue with' : 'Start'} Level ${next + 1}`}</button>
        ${done ? '' : '<button type="button" class="gm-skip" data-quest="skip" data-goto="#tower" data-cur>Skip the game: unlock everything</button>'}
      </div>`);
  }

  function startLevel(i) {
    S.lv = i; S.lives = 3; S.blocked = 0; S.combo = 0; S.items = []; S.parts = []; S.floats = []; S.spawn = .6;
    if (i === 0) { S.score = 0; S.totalBlocked = 0; S.falsePos = 0; }
    S.mode = 'play'; hide();
    cv.focus({ preventScroll: true });
    say(`Level ${i + 1}: ${L().name}. Block ${L().goal} attacks.`);
  }

  function cleared() {
    S.mode = 'cleared'; S.cleared[S.lv] = true;
    const card = cards[S.lv];
    if (card) { card.classList.add('pop'); setTimeout(() => card.classList.remove('pop'), 1200); }
    const last = S.lv === LEVELS.length - 1;
    const bonus = S.lives * 25;
    S.score += bonus;
    saveBest();
    setUnlocked(S.lv + 1);
    say(`Level ${S.lv + 1} cleared. ${L().reward} unlocked.`);
    const go = L().go;
    if (last) {
      show(`
        <div class="gm-card win">
          <p class="gm-k mono">ALL LEVELS CLEARED · THE WHOLE PORTFOLIO IS OPEN</p>
          <h3>Superpower unlocked:<br><em>Guardrail Master</em></h3>
          <p>You blocked <b>${S.totalBlocked}</b> attacks with <b>${S.falsePos}</b> false positive${S.falsePos === 1 ? '' : 's'}. That is the job: stop the bad, never block the real.</p>
          <p class="gm-small mono">Final score ${S.score}${S.score >= best ? ' · new best!' : ` · best ${best}`}</p>
          <div class="gm-btns"><a href="#lab" class="gm-link gm-go" data-cur>Try to break my agent ↓</a><button type="button" data-act="restart" data-cur>↻ Play again</button></div>
        </div>`);
    } else {
      show(`
        <div class="gm-card">
          <p class="gm-k mono">LEVEL ${S.lv + 1} CLEARED · +${bonus} life bonus</p>
          <h3>${L().reward.charAt(0).toUpperCase() + L().reward.slice(1)} <em>unlocked</em></h3>
          <p>It is open on the page now. Keep going for <b>${LEVELS[S.lv + 1].reward}</b>, or go and look around.</p>
          <div class="gm-btns"><button type="button" data-act="next" data-cur>▶ Start Level ${S.lv + 2}</button><a href="${go[0]}" class="gm-link gm-go" data-cur>${go[1]}</a></div>
        </div>`);
    }
  }

  function over() {
    S.mode = 'over'; saveBest();
    say('Breached. Game over.');
    show(`
      <div class="gm-card bad">
        <p class="gm-k mono">BREACHED</p>
        <h3>The agent got hacked.</h3>
        <p>Level ${S.lv + 1} (${L().name}) · blocked ${S.blocked} of ${L().goal}. Score ${S.score}.</p>
        <button type="button" data-act="retry" data-cur>↻ Retry level ${S.lv + 1}</button>
      </div>`);
  }

  function pause() {
    if (S.mode !== 'play') return;
    S.mode = 'pause';
    show(`<div class="gm-card"><p class="gm-k mono">PAUSED</p><h3>Take a breath.</h3><button type="button" data-act="resume" data-cur>▶ Resume</button></div>`);
  }

  function saveBest() {
    if (S.score > best) { best = S.score; try { localStorage.setItem('gm-best', String(best)); } catch (e) { /* ignore */ } }
  }

  ov.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    if (a === 'start') startLevel(unlocked >= 3 ? 0 : Math.min(unlocked, 2));
    else if (a === 'restart') startLevel(0);
    else if (a === 'next') startLevel(S.lv + 1);
    else if (a === 'retry') startLevel(S.lv);
    else if (a === 'resume') { S.mode = 'play'; hide(); cv.focus({ preventScroll: true }); }
  });

  /* ---------- input ---------- */
  const toX = (e) => { const r = cv.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; };
  cv.addEventListener('pointermove', (e) => { S.tx = toX(e); });
  cv.addEventListener('pointerdown', (e) => { S.tx = toX(e); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { pause(); return; }
    if (S.mode !== 'play' && S.mode !== 'pause') return;
    const inGame = document.activeElement === cv || frame.matches(':hover');
    if (!inGame) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') { S.keys.l = true; e.preventDefault(); }
    if (e.key === 'ArrowRight' || e.key === 'd') { S.keys.r = true; e.preventDefault(); }
  });
  addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') S.keys.l = false;
    if (e.key === 'ArrowRight' || e.key === 'd') S.keys.r = false;
  });
  new IntersectionObserver((es) => { S.visible = es[0].isIntersecting; if (!S.visible) pause(); }, { threshold: 0.25 }).observe(frame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  /* ---------- simulation ---------- */
  function chipSize(text) { ctx.font = '500 13px "JetBrains Mono", monospace'; return Math.ceil(ctx.measureText(text).width) + 30; }

  function spawn() {
    const lv = L();
    const bad = Math.random() < 0.68;
    const list = bad ? lv.bad : lv.good;
    const text = list[(Math.random() * list.length) | 0];
    const w = chipSize(text);
    const ramp = 1 + S.blocked * 0.018;
    S.items.push({ x: Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, Math.random() * W)), y: -20, w, h: 30, text, bad, vy: lv.speed * ramp * (0.85 + Math.random() * 0.3) });
  }

  function burst(x, y, color, n) {
    if (reduce) n = Math.min(n, 4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = 60 + Math.random() * 180;
      S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: .5 + Math.random() * .4, c: color });
    }
  }
  const float = (x, y, text, c) => S.floats.push({ x, y, text, c, life: .9 });

  function hit(kind, it) {
    if (kind === 'block') {
      S.combo++; const m = Math.min(3, 1 + Math.floor(S.combo / 4));
      S.score += 10 * m; S.blocked++; S.totalBlocked++;
      burst(it.x, it.y, '#ffffff', 12); float(it.x, it.y - 10, m > 1 ? `BLOCKED x${m}` : 'BLOCKED', '#c9f7e3');
      if (S.blocked >= L().goal) cleared();
    } else if (kind === 'breach') {
      S.lives--; S.combo = 0; if (!reduce) S.shake = .35; S.flash = .5;
      burst(it.x, floorY(), '#ff7d9c', 16); float(it.x, floorY() - 14, 'BREACH!', '#ff9db2');
      say(`Breach. ${S.lives} lives left.`);
      if (S.lives <= 0) over();
    } else if (kind === 'false') {
      S.lives--; S.combo = 0; S.falsePos++; if (!reduce) S.shake = .25; S.flash = .35;
      burst(it.x, it.y, '#ffd28a', 12); float(it.x, it.y - 10, 'FALSE POSITIVE', '#ffd28a');
      say(`You blocked a real user. ${S.lives} lives left.`);
      if (S.lives <= 0) over();
    } else if (kind === 'pass') {
      S.score += 3; float(it.x, floorY() - 14, '+3 served', '#c9f7e3');
    }
  }

  function update(dt) {
    S.t += dt;
    S.stars.forEach((s) => { s.y += s.v * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
    S.parts = S.parts.filter((p) => (p.life -= dt) > 0); S.parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; });
    S.floats = S.floats.filter((f) => (f.life -= dt) > 0); S.floats.forEach((f) => { f.y -= 26 * dt; });
    S.shake = Math.max(0, S.shake - dt); S.flash = Math.max(0, S.flash - dt);
    if (S.mode !== 'play') return;

    const kb = (S.keys.r ? 1 : 0) - (S.keys.l ? 1 : 0);
    if (kb) S.tx += kb * 620 * dt;
    S.tx = Math.max(0, Math.min(W, S.tx));
    const sw = L().shield;
    S.sx += (Math.max(sw / 2, Math.min(W - sw / 2, S.tx)) - S.sx) * Math.min(1, dt * 16);

    S.spawn -= dt;
    if (S.spawn <= 0) { spawn(); S.spawn = L().gap * (0.75 + Math.random() * 0.5) / (1 + S.blocked * 0.012); }

    for (const it of S.items) {
      const prev = it.y; it.y += it.vy * dt;
      const top = shieldY();
      if (!it.done && prev + it.h / 2 <= top + 6 && it.y + it.h / 2 >= top && Math.abs(it.x - S.sx) < sw / 2 + it.w / 2 - 14) {
        it.done = true; hit(it.bad ? 'block' : 'false', it);
      } else if (!it.done && it.y - it.h / 2 > floorY() - 8) {
        it.done = true; hit(it.bad ? 'breach' : 'pass', it);
      }
      if (S.mode !== 'play') break;
    }
    S.items = S.items.filter((i) => !i.done);
  }

  /* ---------- drawing ---------- */
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  function draw() {
    ctx.save();
    if (S.shake > 0) ctx.translate((Math.random() - .5) * 8 * S.shake * 3, (Math.random() - .5) * 8 * S.shake * 3);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1f3fb8'); g.addColorStop(.55, '#5a56d8'); g.addColorStop(1, '#c58be4');
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    // horizon glow
    const hg = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, H * .8);
    hg.addColorStop(0, 'rgba(255,190,220,.55)'); hg.addColorStop(1, 'rgba(255,190,220,0)');
    ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    S.stars.forEach((s) => { ctx.globalAlpha = .25 + s.r / 3; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); });
    ctx.globalAlpha = 1;

    const lv = L();
    // agent core / floor
    const fy = floorY();
    const fg = ctx.createLinearGradient(0, fy, 0, H);
    fg.addColorStop(0, S.flash > 0 ? 'rgba(255,90,120,.9)' : 'rgba(255,255,255,.35)'); fg.addColorStop(1, 'rgba(255,255,255,.08)');
    ctx.fillStyle = fg; ctx.fillRect(0, fy, W, H - fy);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(0, fy, W, 1.5);
    ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText('YOUR AGENT  ·  KEEP IT SAFE  ·  SERVE REAL USERS', W / 2, fy + (H - fy) / 2 + 1);

    // items
    ctx.textAlign = 'center';
    S.items.forEach((it) => {
      rr(it.x - it.w / 2, it.y - it.h / 2, it.w, it.h, 15);
      ctx.fillStyle = it.bad ? 'rgba(255,92,128,.34)' : 'rgba(110,255,196,.28)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = it.bad ? '#ff8aa6' : '#8dffd0'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '500 13px "JetBrains Mono", monospace'; ctx.fillText(it.text, it.x, it.y + 1);
    });

    // shield
    const sw = lv.shield, sy = shieldY();
    ctx.save(); ctx.shadowColor = lv.accent; ctx.shadowBlur = 28;
    const sg = ctx.createLinearGradient(0, sy - 10, 0, sy + 12);
    sg.addColorStop(0, 'rgba(255,255,255,.95)'); sg.addColorStop(1, lv.accent);
    rr(S.sx - sw / 2, sy - 8, sw, 18, 9); ctx.fillStyle = sg; ctx.fill(); ctx.restore();
    ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.fillStyle = '#16295a'; ctx.fillText('GUARDRAIL', S.sx, sy + 2);

    // particles + floating text
    S.parts.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life * 1.6); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 3, 3); });
    ctx.globalAlpha = 1;
    ctx.font = '700 13px "JetBrains Mono", monospace';
    S.floats.forEach((f) => { ctx.globalAlpha = Math.min(1, f.life * 1.6); ctx.fillStyle = f.c; ctx.fillText(f.text, f.x, f.y); });
    ctx.globalAlpha = 1;

    // HUD
    const small = W < 700;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.font = '500 12px "JetBrains Mono", monospace'; ctx.fillStyle = '#fff';
    ctx.fillText(`LEVEL ${S.lv + 1} · ${lv.name.toUpperCase()}`, 18, 22);
    ctx.textAlign = 'right'; ctx.fillText(`SCORE ${S.score}`, W - 18, 22);
    let hearts = ''; for (let i = 0; i < 3; i++) hearts += i < S.lives ? '◆ ' : '◇ ';
    const bw = small ? W - 36 : Math.min(260, W * .4), bx = W / 2 - bw / 2, by = small ? 48 : 14;
    if (small) { ctx.textAlign = 'left'; ctx.fillText(hearts.trim(), 18, 38); } else { ctx.fillText(hearts.trim(), W - 18, 44); }
    rr(bx, by, bw, 10, 5); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill();
    rr(bx, by, Math.max(10, bw * Math.min(1, S.blocked / lv.goal)), 10, 5); ctx.fillStyle = lv.accent; ctx.fill();
    ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.fillStyle = '#fff';
    if (small) { ctx.textAlign = 'right'; ctx.fillText(`${S.blocked} / ${lv.goal} blocked`, W - 18, 38); }
    else { ctx.textAlign = 'center'; ctx.fillText(`${S.blocked} / ${lv.goal} attacks blocked`, W / 2, 40); }
    if (S.combo >= 4) { ctx.textAlign = 'center'; ctx.fillStyle = '#ffe6a8'; ctx.fillText(`COMBO ${S.combo}`, W / 2, by + 24); }
    ctx.restore();
  }

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!S.visible && S.mode !== 'menu') return;
    update(dt);
    draw();
  }
  requestAnimationFrame(loop);
  applyQuest();
  menu();
})();
