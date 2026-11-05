/* Hero WebGL: a refractive glass torus-knot + orbiting glass bits floating in front of
   a typographic backdrop, so the words bend through the glass. Three.js, no post-processing. */
(() => {
  const canvas = document.getElementById('glass');
  const hero = document.getElementById('hero');
  if (!canvas || !window.THREE) return;
  const T = window.THREE;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  /* studio environment built from bright panels, so the glass has something to reflect */
  const pm = new T.PMREMGenerator(renderer);
  const env = new T.Scene();
  env.add(new T.Mesh(new T.BoxGeometry(30, 30, 30), new T.MeshBasicMaterial({ color: 0x07050f, side: T.BackSide })));
  const panel = (c, x, y, z, w, h, k = 1) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(0xffffff, -8, 6, 6, 9, 5, 6);
  panel(0xb59cff, 9, 1, 4, 5, 9, 5);
  panel(0xffffff, 0, -9, 3, 12, 3, 3);
  panel(0x7c3aed, -9, -3, -4, 6, 8, 4);
  panel(0xffffff, 3, 9, -6, 8, 3, 4);
  scene.environment = pm.fromScene(env, 0.03).texture;

  /* typographic backdrop that refracts through the glass */
  const tc = document.createElement('canvas');
  tc.width = 2048; tc.height = 1024;
  const tx = tc.getContext('2d');
  const tex = new T.CanvasTexture(tc);
  tex.anisotropy = 4;
  function paintText() {
    tx.clearRect(0, 0, 2048, 1024);
    tx.font = '800 150px "Inter Tight", Arial, sans-serif';
    tx.textBaseline = 'middle';
    tx.lineWidth = 3;
    tx.strokeStyle = '#fff';
    const rows = ['LLM · RAG · MCP', 'AGENTS · EVALS', 'GUARDRAILS · '];
    rows.forEach((t, i) => { tx.strokeText(t, 60 + i * 120, 220 + i * 290); });
    tex.needsUpdate = true;
  }
  paintText();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintText);
  const back = new T.Mesh(
    new T.PlaneGeometry(1, 1),
    new T.MeshBasicMaterial({ map: tex, alphaTest: 0.3, color: 0x3d2f80, toneMapped: false })
  );
  back.position.z = -2.2;
  back.visible = false; // backdrop text removed: it competed with the name
  scene.add(back);

  /* glass */
  const glass = new T.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 1.6, ior: 1.5,
    attenuationColor: new T.Color(0xa78bfa), attenuationDistance: 5,
    clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.7, specularIntensity: 1,
  });
  const group = new T.Group();
  scene.add(group);
  const knot = new T.Mesh(new T.TorusKnotGeometry(1, 0.34, 260, 40, 2, 3), glass);
  group.add(knot);
  const ring = new T.Mesh(new T.TorusGeometry(1.9, 0.05, 24, 160), glass);
  ring.rotation.x = Math.PI / 2.4;
  group.add(ring);
  const orb = new T.Mesh(new T.SphereGeometry(0.34, 48, 48), glass);
  group.add(orb);
  const cube = new T.Mesh(new T.BoxGeometry(0.5, 0.5, 0.5), glass);
  group.add(cube);

  let w = 1, h = 1, mobile = false;
  function resize() {
    w = hero.clientWidth; h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    mobile = w < 760;
    const dist = camera.position.z - back.position.z;
    const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * dist;
    back.scale.set(Math.max(vh * camera.aspect, vh * 2), Math.max(vh, vh * camera.aspect / 2), 1);
    const s = mobile ? 0.62 : Math.min(1.15, w / 1250 + 0.35);
    group.scale.setScalar(s);
  }
  resize();
  addEventListener('resize', resize);

  let mx = 0, my = 0, tx_ = 0, ty_ = 0, visible = true, t0 = performance.now();
  addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    tx_ += (mx - tx_) * 0.06; ty_ += (my - ty_) * 0.06;
    const vh = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const vw = vh * camera.aspect;
    const sy = Math.min(scrollY, innerHeight);
    group.position.set(mobile ? 0 : vw * 0.23, (mobile ? vh * 0.22 : vh * 0.04) + sy * 0.004, 0);
    group.rotation.set(ty_ * 0.5 + t * 0.15, tx_ * 0.7 + t * 0.25, 0);
    knot.rotation.set(t * 0.35, t * 0.2, 0);
    ring.rotation.z = t * 0.4;
    orb.position.set(Math.cos(t * 0.9) * 1.9, Math.sin(t * 0.9) * 0.6, Math.sin(t * 0.9) * 1.6);
    cube.position.set(Math.cos(t * 0.6 + 2) * -2.1, Math.sin(t * 0.7) * 1.1, Math.sin(t * 0.6 + 2) * 1.2);
    cube.rotation.set(t * 0.8, t * 0.6, 0);
    back.position.x = tx_ * -0.25;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
