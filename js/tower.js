/* The Agent Tower — a CSS-3D carousel of portfolio sections.
   Spin by dragging, with the arrows, or just by scrolling the page. Click a panel and it
   flies out into a full sheet; "Back to tower" returns it. */
(() => {
  const stage = document.getElementById('tw-stage');
  if (!stage) return;
  const rig = document.getElementById('tw-rig');
  const spin = document.getElementById('tw-spin');
  const panels = [...stage.querySelectorAll('.tw-panel')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = panels.length, STEP = 360 / N;

  const DATA = [
    { tag: '01 / ABOUT', title: 'About<br>Me', line: 'An AI engineer who measures everything.', bg: ['#e2d8ff', '#b3a5f7'],
      p: 'I ship Generative AI systems that survive contact with reality: multi-agent RAG pipelines, MCP tool-calling servers, and the evals, guardrails and observability that keep them honest. I own projects end to end, from retrieval and orchestration to Dockerized deployment and CI/CD.',
      list: ['B.Tech, Computer Science & Engineering — Bennett University (May 2027)', 'Based in Greater Noida, India', 'Cleared 3 rounds of Flipkart GRiD 8.0, AI Engineering Track'],
      metrics: [['3', 'shipped systems'], ['19/19', 'adversarial cases'], ['0.89', 'groundedness']], cta: [['Email me', 'mailto:priyanshuuux@gmail.com'], ['Try to break my agent', '#lab', 'alt']] },
    { tag: '02 / SUPERPOWERS', title: 'Tech<br>Powers', line: 'Agents, retrieval, evals, shipping.', bg: ['#ffe0cc', '#ffb89f'],
      p: 'My toolkit is built around making LLM systems reliable, not just impressive.',
      list: ['<b>Agents:</b> LangGraph, LangChain, MCP, ReAct, human-in-the-loop', '<b>Retrieval:</b> Qdrant, pgvector, Chroma, FAISS, BM25, RRF, Docling', '<b>Evals &amp; guardrails:</b> DeepEval, G-Eval, LangSmith, injection defence', '<b>Backend:</b> Python, FastAPI, Docker, GitHub Actions, PostgreSQL, Redis, SQL', '<b>Models:</b> PyTorch, Hugging Face, Groq, scikit-learn, prompt engineering'],
      metrics: [], cta: [['See it in action', '#lab']] },
    { tag: '03 / PROJECTS', title: 'The<br>Projects', line: 'Three systems. All measured.', bg: ['#c9f7e3', '#8fe6c4'],
      p: 'Production-style GenAI systems, each with an eval suite behind it. Flip through them on the glass stage below.',
      list: [
        '<b>TicketPilot</b> — 4-agent support system on LangGraph with an MCP server and human approval. 19/19 correct outcomes, 0 wrong refunds. <a href="https://github.com/priyanshuu-x/ticketpilot" target="_blank" rel="noopener">GitHub ↗</a>',
        '<b>PaperPilot</b> — hybrid RAG over 20 arXiv papers with page-level citations. 0.89 groundedness, 0.87 relevance. <a href="https://github.com/priyanshuu-x/PaperPilot" target="_blank" rel="noopener">GitHub ↗</a>',
        '<b>LLM Gateway</b> — OpenAI-compatible router with fallback, caching, rate limits and guardrails. 2 real bypasses caught. <a href="https://github.com/priyanshuu-x/llm-gateway" target="_blank" rel="noopener">GitHub ↗</a>'],
      metrics: [['3', 'systems'], ['19/19', 'TicketPilot'], ['0.89', 'PaperPilot']],
      cta: [['See the project stage', '#work'], ['Try the demo', '#lab', 'alt']] },
    { tag: '04 / CONTACT', title: 'Say<br>Hello', line: 'Open to internships, 2026–27.', bg: ['#ffd1e4', '#ff9fc4'],
      p: 'Have an agent that needs adult supervision? I reply fast.',
      list: ['priyanshuuux@gmail.com', 'github.com/priyanshuu-x', 'linkedin.com/in/priyanshusingh-aidev'],
      metrics: [], cta: [['Email me', 'mailto:priyanshuuux@gmail.com'], ['LinkedIn ↗', 'https://linkedin.com/in/priyanshusingh-aidev', 'alt']] },
  ];

  /* responsive scale */
  function fit() {
    const w = stage.clientWidth;
    stage.style.setProperty('--s', Math.max(0.42, Math.min(1.05, w / 1000)).toFixed(3));
  }
  fit(); addEventListener('resize', fit);

  /* motion state */
  let angle = 0, vel = reduce ? 0 : -13, goal = null, dragging = false, startX = 0, lastX = 0, moved = 0, dragged = false, visible = false, locked = false;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(stage);

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || locked) return;
    if (goal !== null) {
      angle += (goal - angle) * 0.12;
      vel = 0;
      if (Math.abs(goal - angle) < 0.1) { angle = goal; goal = null; }
    } else if (!dragging) {
      angle += vel; vel *= 0.93;
      if (Math.abs(vel) < 0.2) angle += (Math.round(angle / STEP) * STEP - angle) * 0.08;
    }
    spin.style.transform = `rotateY(${angle}deg)`;
  }
  requestAnimationFrame(frame);

  function rotateTo(i) {
    let a = -i * STEP;
    a += 360 * Math.round((angle - a) / 360);
    goal = a;
  }

  /* drag */
  stage.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    dragging = true; dragged = false; moved = 0; startX = lastX = e.clientX; goal = null;
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    if (moved > 6) { dragged = true; stage.classList.add('drag'); }
    if (dragged) { angle += dx * 0.32; vel = dx * 0.32; }
  });
  const up = () => { dragging = false; stage.classList.remove('drag'); };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  stage.addEventListener('click', (e) => { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);

  /* scroll-linked spin: the tower turns as the page scrolls past it */
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const d = scrollY - lastY; lastY = scrollY;
    if (visible && !reduce && !locked) vel = Math.max(-9, Math.min(9, vel + d * 0.018));
  }, { passive: true });

  /* arrows + keyboard */
  document.getElementById('tw-prev').addEventListener('click', () => { goal = null; vel = 4.4; });
  document.getElementById('tw-next').addEventListener('click', () => { goal = null; vel = -4.4; });
  panels.forEach((p, i) => p.addEventListener('focus', () => { if (!dragging) rotateTo(i); }));

  /* expanded sheet */
  const sheet = document.createElement('div');
  sheet.className = 'tw-sheet';
  sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Section details');
  sheet.innerHTML = '<div class="tw-sheet-in" data-lenis-prevent></div>';
  document.body.appendChild(sheet);
  const inner = sheet.firstChild;
  let openIdx = -1, openBtn = null;

  const setRect = (r, radius) => {
    sheet.style.left = r.left + 'px'; sheet.style.top = r.top + 'px';
    sheet.style.width = r.width + 'px'; sheet.style.height = r.height + 'px';
    sheet.style.borderRadius = radius;
  };

  function open(i) {
    const d = DATA[i], btn = panels[i];
    openIdx = i; openBtn = btn; locked = true;
    window.__lenis && window.__lenis.stop();
    sheet.style.background = `linear-gradient(150deg, ${d.bg[0]}, ${d.bg[1]})`;
    inner.innerHTML = `
      <div class="tw-bar"><button class="tw-back" type="button">← Back to tower</button><span class="tw-tag mono">${d.tag}</span></div>
      <div class="tw-body">
        <div><h3 class="tw-h">${d.title}</h3><p class="tw-line">${d.line}</p></div>
        <div>
          <p class="tw-p">${d.p}</p>
          <ul class="tw-list">${d.list.map((l) => `<li>${l}</li>`).join('')}</ul>
          ${d.metrics.length ? `<div class="tw-metrics">${d.metrics.map((m) => `<div><b>${m[0]}</b><small>${m[1]}</small></div>`).join('')}</div>` : ''}
          <div class="tw-cta">${d.cta.map((c) => `<a href="${c[1]}" class="${c[2] || ''}" ${c[1].startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${c[0]}</a>`).join('')}</div>
        </div>
      </div>`;
    inner.scrollTop = 0;
    const r = btn.getBoundingClientRect();
    sheet.style.transition = 'none';
    sheet.classList.add('on'); sheet.classList.remove('shown');
    setRect(r, '24px');
    sheet.offsetWidth; // reflow
    sheet.style.transition = '';
    const m = Math.max(10, innerWidth * 0.03);
    setRect({ left: m, top: Math.max(10, innerHeight * 0.04), width: innerWidth - m * 2, height: innerHeight * 0.92 }, '28px');
    sheet.classList.add('shown');
    setTimeout(() => inner.querySelector('.tw-back').focus({ preventScroll: true }), 500);
  }

  function close(after) {
    if (openIdx < 0) return;
    sheet.classList.remove('shown');
    const r = openBtn.getBoundingClientRect();
    const onScreen = r.width > 40 && r.bottom > 0 && r.top < innerHeight;
    if (onScreen) setRect(r, '24px'); else sheet.style.opacity = '0';
    const btn = openBtn;
    openIdx = -1;
    setTimeout(() => {
      sheet.classList.remove('on'); sheet.style.opacity = '';
      locked = false;
      window.__lenis && window.__lenis.start();
      btn.focus({ preventScroll: true });
      if (after) after();
    }, reduce ? 20 : 750);
  }

  panels.forEach((p, i) => p.addEventListener('click', () => open(i)));
  sheet.addEventListener('click', (e) => {
    if (e.target.closest('.tw-back')) { close(); return; }
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      close(() => {
        if (!target) return;
        if (window.__lenis) window.__lenis.scrollTo(target, { offset: -20, duration: 1.4 });
        else target.scrollIntoView({ behavior: 'smooth' });
      });
    }
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openIdx >= 0) close();
    if (visible && openIdx < 0 && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      if (e.key === 'ArrowLeft') { goal = null; vel = 4.4; }
      if (e.key === 'ArrowRight') { goal = null; vel = -4.4; }
    }
  });
})();
