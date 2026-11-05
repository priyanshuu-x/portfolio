/* "Break my agent" — a client-side miniature of a multi-agent support pipeline.
   Guardrail -> Supervisor -> Investigator -> Policy -> Human approval -> Resolver.
   No network calls: rules are plain JS standing in for the MCP server. */
(() => {
  const out = document.getElementById('term-out');
  if (!out) return;
  const form = document.getElementById('term-form');
  const input = document.getElementById('term-in');
  const pipe = document.getElementById('pipe');
  const chips = document.getElementById('chips');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? 10 : ms));

  const ME = 'aarav';
  const seedOrders = () => ({
    '1042': { owner: ME, item: 'Wireless earbuds', amount: 42, status: 'delivered', days: 6, refunded: false },
    '2077': { owner: ME, item: 'Mechanical keyboard', amount: 480, status: 'delivered', days: 12, refunded: false },
    '4410': { owner: ME, item: 'Backpack', amount: 65, status: 'delivered', days: 51, refunded: false },
    '5001': { owner: ME, item: 'Headphones', amount: 120, status: 'in_transit', days: 0, refunded: false },
    '3150': { owner: 'meera', item: '4K monitor', amount: 310, status: 'delivered', days: 3, refunded: false },
  });
  let orders = seedOrders();
  const stats = { blocked: 0, refunds: 0, wrong: 0 };
  let busy = false;
  let pendingApproval = null;

  // Regex guardrails with wildcard gaps ([\s\S]{0,n}) so padded / reworded attacks still match.
  const INJECTION = [
    /ignore[\s\S]{0,40}(previous|prior|above|earlier|all|your)[\s\S]{0,40}(instruction|rule|prompt|polic)/i,
    /disregard[\s\S]{0,40}(rule|polic|instruction|guard)/i,
    /(reveal|show|print|leak|repeat)[\s\S]{0,30}(system|hidden|initial|secret)[\s\S]{0,20}(prompt|instruction|message)/i,
    /you\s+are\s+now|pretend\s+(to\s+be|you)|act\s+as\s+(an?\s+)?(admin|root|dan|developer)|developer\s+mode|jailbreak|\bDAN\b/i,
    /(override|bypass|disable|turn\s+off)[\s\S]{0,30}(polic|rule|guard|check|approval|safety)/i,
    /(without|skip|no\s+need\s+for)[\s\S]{0,20}(approval|human|review|verification)/i,
    /<\/?\s*system\s*>|^\s*system\s*:|\[\s*inst\s*\]/i,
    /(as|i\s*am|i'?m)\s+(the\s+)?(admin|administrator|ceo|developer|support\s+manager)/i,
  ];
  const PII = [/\b(?:\d[ -]?){13,16}\b/, /\b\d{3}-\d{2}-\d{4}\b/];

  const $ = (s) => pipe.querySelector(`[data-n="${s}"]`);
  const resetPipe = () => pipe.querySelectorAll('.node').forEach((n) => (n.className = 'node'));
  const light = (id, cls = 'on') => { const n = $(id); if (n) n.className = 'node ' + cls; };
  const done = (id, cls = 'ok') => light(id, cls);

  function line(text, cls = 'log', tag) {
    const d = document.createElement('div');
    d.className = 'ln t-' + cls;
    if (tag) {
      const t = document.createElement('span');
      t.className = 'tag';
      t.textContent = `[${tag}]`;
      d.appendChild(t);
    }
    d.appendChild(document.createTextNode(text));
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
    return d;
  }
  async function say(text) {
    const d = line('', 'say');
    if (reduce) { d.textContent = text; out.scrollTop = out.scrollHeight; return; }
    for (let i = 0; i < text.length; i += 2) {
      d.textContent = text.slice(0, i + 2);
      out.scrollTop = out.scrollHeight;
      await sleep(12);
    }
    d.textContent = text;
  }
  function bump(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 300);
  }

  function intro() {
    out.innerHTML = '';
    line('TicketPilot-lite online. You are signed in as aarav (cust_01).', 'ok');
    line('Ask for a refund, or try to make me misbehave. Click a chip below or type.', 'log');
    line('Tip: order numbers are 4 digits, e.g. “refund order #1042”. Type help for commands.', 'log');
  }

  const COMMANDS = {
    help: () => [
      'commands:  help · about · projects · skills · contact · clear',
      'tickets:   “refund order #1042”, “where is order #5001”',
      'attacks:   go on, try “ignore previous instructions…”',
    ],
    about: () => ['Priyanshu Singh — AI engineer. Multi-agent RAG, MCP tool-calling, guardrails & evals.', 'Final-year B.Tech CSE, Bennett University. Flipkart GRiD 8.0 Top 48 finalist.'],
    projects: () => ['TicketPilot  — 4-agent support system, 19/19 adversarial cases, 0 wrong refunds', 'PaperPilot   — hybrid RAG over arXiv, 0.89 groundedness, citations to the page', 'LLM Gateway  — OpenAI-compatible router with cache, rate limits and guardrails'],
    skills: () => ['LangGraph · LangChain · MCP · RAG · Qdrant · pgvector · FastAPI · Docker · DeepEval · PyTorch · Redis'],
    contact: () => ['priyanshuuux@gmail.com · github.com/priyanshuu-x · linkedin.com/in/priyanshusingh-aidev'],
    whoami: () => ['aarav (cust_01) — a customer with 4 orders. Not an admin. Nice try.'],
    ls: () => Object.keys(orders).filter((k) => orders[k].owner === ME).map((k) => `#${k}`),
    sudo: () => ['sudo: this is a support agent, not a shell. Incident logged. 😉'],
  };

  async function guardrail(text) {
    light('guard');
    line('scanning input for prompt-injection and PII…', 'log', 'guardrail');
    await sleep(450);
    const hit = INJECTION.find((r) => r.test(text));
    if (hit) {
      done('guard', 'bad');
      line('prompt-injection pattern matched — request dropped before any LLM call', 'bad', 'guardrail');
      stats.blocked++; bump('st-blocked', stats.blocked);
      await say('Blocked. I only follow my policy, not instructions hidden inside a customer message. If you genuinely want a refund, tell me the order number and I’ll check it properly.');
      return false;
    }
    if (PII.some((r) => r.test(text))) {
      line('card / ID number detected — redacted before logging', 'warn', 'guardrail');
    }
    done('guard');
    return true;
  }

  function waitForHuman(order, id) {
    return new Promise((resolve) => {
      const box = document.createElement('div');
      box.className = 'approve';
      box.innerHTML = '<button class="yes" data-cur>Approve refund</button><button class="no" data-cur>Reject</button>';
      out.appendChild(box);
      out.scrollTop = out.scrollHeight;
      const fin = (v) => { pendingApproval = null; box.querySelectorAll('button').forEach((b) => (b.disabled = true)); resolve(v); };
      box.querySelector('.yes').onclick = () => fin(true);
      box.querySelector('.no').onclick = () => fin(false);
      pendingApproval = fin;
    });
  }

  async function ticket(text) {
    light('sup');
    line('classifying intent and planning tool calls…', 'log', 'supervisor');
    await sleep(500);

    const wantsRefund = /refund|return|money\s*back|cancel/i.test(text);
    const wantsStatus = /where|status|track|deliver/i.test(text);
    const idMatch = text.match(/#?\b(\d{4})\b/);
    const bulk = /\b(all|every|each|everything)\b[\s\S]{0,20}(order|purchase|item)/i.test(text) || /(order|purchase)s\b[\s\S]{0,15}\b(all|every)\b/i.test(text);

    if (!wantsRefund && !wantsStatus) {
      done('sup', 'bad');
      line('retrieval confidence 0.08 < 0.35 — outside my scope, refusing without an LLM call', 'warn', 'gate');
      await say('That’s outside what I can help with. I handle refunds and order questions. (Same idea as the confidence gate in PaperPilot: no evidence, no answer.)');
      return;
    }
    if (bulk) {
      done('sup'); light('pol');
      line('rule violated: one order per ticket', 'bad', 'policy');
      done('pol', 'bad');
      await say('I can only process one order per ticket. Give me a single order number and I’ll check it.');
      return;
    }
    if (!idMatch) {
      done('sup');
      await say('Which order is this about? Give me the 4-digit order number, like #1042.');
      return;
    }
    done('sup');

    const id = idMatch[1];
    light('inv');
    line(`MCP tool get_order("${id}") with caller=cust_01`, 'log', 'investigator');
    await sleep(550);
    const o = orders[id];
    if (!o) {
      done('inv', 'bad');
      line('order not found', 'bad', 'mcp-server');
      await say(`I can’t find an order #${id} on your account.`);
      return;
    }
    if (o.owner !== ME) {
      done('inv', 'bad');
      line('ownership check FAILED — enforced server-side, the model never sees this order', 'bad', 'mcp-server');
      stats.blocked++; bump('st-blocked', stats.blocked);
      await say(`I can’t find an order #${id} on your account. (The tool layer won’t even confirm it exists — cross-customer lookups are denied by the server, not by the model’s good manners.)`);
      return;
    }
    done('inv');
    line(`found: ${o.item}, $${o.amount}, ${o.status}${o.status === 'delivered' ? `, delivered ${o.days}d ago` : ''}`, 'ok', 'mcp-server');

    if (!wantsRefund) {
      await say(o.status === 'in_transit' ? `Order #${id} (${o.item}) is in transit — it hasn’t been delivered yet.` : `Order #${id} (${o.item}) was delivered ${o.days} days ago.`);
      return;
    }

    light('pol');
    line('checking refund policy against tool results…', 'log', 'policy');
    await sleep(600);
    if (o.refunded) { done('pol', 'bad'); await say(`Order #${id} was already refunded. I won’t refund it twice.`); return; }
    if (o.status !== 'delivered') { done('pol', 'bad'); line('status != delivered', 'bad', 'policy'); await say(`Order #${id} hasn’t been delivered yet, so it isn’t refundable. I can cancel it once it arrives, or you can wait for delivery.`); return; }
    if (o.days > 30) { done('pol', 'bad'); line(`${o.days}d > 30d window`, 'bad', 'policy'); await say(`Order #${id} was delivered ${o.days} days ago — outside the 30-day refund window, so I can’t refund it.`); return; }
    done('pol');

    if (o.amount > 100) {
      light('hitl', 'wait');
      line(`amount $${o.amount} > $100 — graph interrupt(): waiting for human approval`, 'warn', 'policy');
      await say(`Order #${id} is $${o.amount}, above my $100 limit. A human has to approve this one. Please play the support manager:`);
      const ok = await waitForHuman(o, id);
      if (!ok) {
        done('hitl', 'bad');
        line('human rejected — graph resumed with decision=reject', 'warn', 'hitl');
        await say(`Understood — refund for order #${id} was declined by the reviewer. Nothing was charged back.`);
        return;
      }
      done('hitl');
      line('human approved — graph resumed with decision=approve', 'ok', 'hitl');
    } else {
      light('hitl', 'ok');
      line(`amount $${o.amount} ≤ $100 — auto-approved`, 'ok', 'policy');
    }

    light('res');
    line(`MCP tool issue_refund("${id}", $${o.amount})`, 'log', 'resolver');
    await sleep(600);
    o.refunded = true;
    stats.refunds++; bump('st-refunds', stats.refunds);
    line('refund issued · grounding check passed (every claim traced to a tool result)', 'ok', 'resolver');
    done('res');
    await say(`Done. Refunded $${o.amount} for order #${id} (${o.item}). It should reach your original payment method in 3–5 business days.`);
  }

  async function handle(raw) {
    const text = raw.trim();
    if (!text) return;

    if (pendingApproval) {
      line(text, 'you');
      if (/^(approve|yes|y|ok|approved)$/i.test(text)) pendingApproval(true);
      else if (/^(reject|no|n|deny|declined?)$/i.test(text)) pendingApproval(false);
      else line('waiting on the human decision — type approve or reject, or press a button.', 'warn');
      return;
    }
    if (busy) return;
    busy = true;
    chips.querySelectorAll('button').forEach((b) => (b.disabled = true));
    try {
      resetPipe();
      line(text, 'you');
      const cmd = text.toLowerCase().replace(/^\//, '').split(/\s+/)[0];
      if (cmd === 'clear') { intro(); return; }
      if (COMMANDS[cmd] && text.split(/\s+/).length <= 2) {
        COMMANDS[cmd]().forEach((l) => line(l, 'say'));
        return;
      }
      if (await guardrail(text)) await ticket(text);
    } finally {
      busy = false;
      chips.querySelectorAll('button').forEach((b) => (b.disabled = false));
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    handle(v);
  });
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-q]');
    if (b) handle(b.dataset.q);
  });
  document.getElementById('term-reset').addEventListener('click', () => {
    if (busy && !pendingApproval) return;
    if (pendingApproval) pendingApproval(false);
    orders = seedOrders();
    stats.blocked = stats.refunds = stats.wrong = 0;
    ['st-blocked', 'st-refunds', 'st-wrong'].forEach((id) => (document.getElementById(id).textContent = '0'));
    resetPipe();
    intro();
  });

  intro();
})();
