/* Glass stage: three projects float on a frosted panel. Click a side card, use the arrows,
   tabs, keyboard or drag to change which project is in focus. Auto-advances until you interact. */
(() => {
  const gs = document.getElementById('gs');
  if (!gs) return;
  const panel = gs.querySelector('.gs-panel');
  const items = [...gs.querySelectorAll('.gs-item')];
  const infos = [...gs.querySelectorAll('.gs-info')];
  const tabs = [...gs.querySelectorAll('[data-go]')];
  const dot = gs.querySelector('.gs-dot');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = items.length;
  let idx = 0, auto = !reduce, hover = false, visible = false, dragging = false, dragged = false, sx = 0;

  function set(i) {
    idx = ((i % N) + N) % N;
    items.forEach((it, k) => {
      const p = (k - idx + N) % N;
      it.dataset.pos = p === 0 ? '0' : p === 1 ? '1' : '-1';
      it.setAttribute('aria-label', `${it.dataset.name}${p === 0 ? ' (selected)' : ' — show this project'}`);
    });
    infos.forEach((el, k) => el.classList.toggle('on', k === idx));
    tabs.forEach((t) => t.classList.toggle('on', +t.dataset.go === idx));
    dot.style.left = (N > 1 ? (idx / (N - 1)) * 100 : 0) + '%';
  }
  const user = (fn) => { auto = false; fn(); };

  items.forEach((it, k) => it.addEventListener('click', () => { if (dragged) return; if (k !== idx) user(() => set(k)); }));
  tabs.forEach((t) => t.addEventListener('click', () => user(() => set(+t.dataset.go))));
  gs.querySelector('.gs-arrow.prev').addEventListener('click', () => user(() => set(idx - 1)));
  gs.querySelector('.gs-arrow.next').addEventListener('click', () => user(() => set(idx + 1)));
  addEventListener('keydown', (e) => {
    if (!hover && !gs.contains(document.activeElement)) return;
    if (e.key === 'ArrowLeft') user(() => set(idx - 1));
    if (e.key === 'ArrowRight') user(() => set(idx + 1));
  });

  /* drag to switch */
  panel.addEventListener('pointerdown', (e) => { if (e.button > 0 || e.target.closest('a,button')) return; dragging = true; dragged = false; sx = e.clientX; });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 8) { dragged = true; panel.classList.add('drag'); }
    if (Math.abs(dx) > 70) { sx = e.clientX; user(() => set(idx + (dx < 0 ? 1 : -1))); }
  });
  const end = () => { dragging = false; panel.classList.remove('drag'); setTimeout(() => (dragged = false), 0); };
  addEventListener('pointerup', end); addEventListener('pointercancel', end);

  /* mouse parallax for glow + tiles */
  panel.addEventListener('pointermove', (e) => {
    const r = panel.getBoundingClientRect();
    panel.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    panel.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  });
  panel.addEventListener('pointerleave', () => { panel.style.setProperty('--mx', 0); panel.style.setProperty('--my', 0); });

  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.4 }).observe(gs);
  gs.addEventListener('pointerenter', () => (hover = true));
  gs.addEventListener('pointerleave', () => (hover = false));
  setInterval(() => { if (auto && visible && !hover) set(idx + 1); }, 6500);

  set(0);
})();
