/* Cinematic background: a procedural sky that travels from day to dusk to night as you scroll,
   with sun glow, god rays, three depth layers of lit clouds, stars, film grain and vignette,
   plus real glass shapes drifting at different depths that refract the sky behind them.
   One WebGL canvas, fixed behind the page. Falls back to the CSS gradient if WebGL is unavailable. */
(() => {
  const cv = document.getElementById('sky');
  if (!cv || !window.THREE) return;
  const T = window.THREE;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 760px)').matches;

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: cv, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { return; }
  const ratio = Math.min(devicePixelRatio || 1, small ? 1 : 1.25) * (small ? 0.55 : 0.8);
  renderer.setPixelRatio(ratio);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  /* ---------- sky shader (full-screen, always behind everything) ---------- */
  const skyMat = new T.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { uRes: { value: new T.Vector2(1, 1) }, uTime: { value: 0 }, uScroll: { value: 0 }, uMouse: { value: new T.Vector2(0, 0) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }',
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform vec2 uRes; uniform float uTime; uniform float uScroll; uniform vec2 uMouse;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.03 + vec2(11.7, 5.3); a *= 0.5; } return s; }
      vec4 cloud(vec2 p, float scale, float scr, float drift, float seed, vec3 lit, vec3 shade, vec2 sunDir, float cover){
        vec2 q = p * scale + vec2(uTime * drift + uMouse.x * 0.06 * scale + seed, -uScroll * scr * 6.0 + uMouse.y * 0.04 * scale + seed * 0.7);
        float d = fbm(q);
        float dl = fbm(q + sunDir * 0.08);
        float dens = smoothstep(cover, cover + 0.26, d);
        float light = clamp((d - dl) * 6.0 + 0.5, 0.0, 1.0);
        return vec4(mix(shade, lit, light), dens);
      }
      void main(){
        vec2 uv = vUv; float asp = uRes.x / uRes.y; vec2 p = (uv - 0.5) * vec2(asp, 1.0);
        float sc = uScroll;
        float t1 = smoothstep(0.12, 0.55, sc), t2 = smoothstep(0.62, 0.98, sc);

        vec3 top = mix(mix(vec3(0.07, 0.20, 0.72), vec3(0.14, 0.10, 0.44), t1), vec3(0.02, 0.02, 0.14), t2);
        vec3 hor = mix(mix(vec3(0.24, 0.42, 0.86), vec3(0.95, 0.46, 0.52), t1), vec3(0.26, 0.15, 0.46), t2);
        vec3 col = mix(hor, top, pow(smoothstep(0.0, 1.0, uv.y), 0.72));

        vec2 sunUv = vec2(asp < 1.0 ? 0.80 : 0.70, mix(asp < 1.0 ? 0.86 : 0.68, 0.20, smoothstep(0.0, 0.85, sc)));
        vec2 sd = (uv - sunUv) * vec2(asp, 1.0); float dist = length(sd);
        vec3 sunCol = mix(mix(vec3(1.0, 0.95, 0.80), vec3(1.0, 0.55, 0.42), t1), vec3(0.62, 0.45, 0.88), t2);
        float night = 1.0 - t2 * 0.75;
        col += sunCol * (exp(-dist * 5.0) * 0.75 + exp(-dist * 1.5) * 0.20) * night;
        float ang = atan(sd.y, sd.x);
        float rays = pow(noise(vec2(ang * 7.0 + uTime * 0.03, 1.7)), 2.2) * exp(-dist * 1.7) * 0.5 * night;
        col += sunCol * rays;

        // stars (appear toward dusk and night)
        vec2 g = uv * vec2(asp, 1.0) * 70.0; vec2 id = floor(g); float r = hash(id);
        float star = step(0.986, r) * (1.0 - smoothstep(0.0, 0.5, length(fract(g) - 0.5))) * (0.6 + 0.4 * sin(uTime * 2.0 + r * 40.0));
        float starAmt = (t1 * 0.25 + t2 * 0.95) * smoothstep(0.25, 0.85, uv.y);

        vec2 sunDir = normalize(vec2(0.45, 0.6));
        vec3 lit = mix(mix(vec3(0.86, 0.89, 0.97), vec3(1.0, 0.72, 0.64), t1), vec3(0.58, 0.46, 0.88), t2);
        vec3 shade = mix(mix(vec3(0.46, 0.56, 0.90), vec3(0.42, 0.30, 0.62), t1), vec3(0.14, 0.10, 0.34), t2);
        vec4 c1 = cloud(p, 1.2, 0.55, 0.004, 0.0, lit * 0.95, shade, sunDir, 0.50);
        float m1 = (1.0 - smoothstep(0.25, 0.95, uv.y));
        col = mix(col, c1.rgb, c1.a * 0.55 * m1);
        vec4 c2 = cloud(p, 2.0, 1.0, 0.009, 7.1, lit, shade * 0.95, sunDir, 0.50);
        float m2 = (1.0 - smoothstep(0.10, 0.85, uv.y));
        col = mix(col, c2.rgb, c2.a * 0.70 * m2);
        vec4 c3 = cloud(p, 3.1, 1.7, 0.016, 3.7, lit * 1.02, shade * 0.9, sunDir, 0.54);
        float m3 = (1.0 - smoothstep(0.0, 0.60, uv.y));
        col = mix(col, c3.rgb, c3.a * 0.85 * m3);
        col += vec3(star) * starAmt * (1.0 - max(c1.a * m1, max(c2.a * m2, c3.a * m3)));

        col *= mix(0.70, 1.0, (1.0 - smoothstep(0.3, 1.3, length(p * vec2(0.95, 1.1)))));   // vignette
        col += (hash(uv * uRes + fract(uTime)) - 0.5) * 0.028;                         // film grain
        gl_FragColor = vec4(clamp(col, 0.0, 1.0) * 0.94, 1.0);
      }`,
  });
  const sky = new T.Mesh(new T.PlaneGeometry(2, 2), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  /* ---------- glass shapes at different depths (desktop only) ---------- */
  const shapes = [];
  if (!small) {
    const pm = new T.PMREMGenerator(renderer);
    const env = new T.Scene();
    env.add(new T.Mesh(new T.BoxGeometry(30, 30, 30), new T.MeshBasicMaterial({ color: 0x0a0a22, side: T.BackSide })));
    const panel = (c, x, y, z, w, h, k) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
    panel(0xffffff, -8, 6, 6, 9, 5, 6); panel(0xaec4ff, 9, 1, 4, 5, 9, 5); panel(0xffc2dc, -9, -3, -4, 6, 8, 4); panel(0xffffff, 3, 9, -6, 8, 3, 4);
    scene.environment = pm.fromScene(env, 0.03).texture;

    const glass = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.06, transmission: 1, thickness: 1.4, ior: 1.45,
      attenuationColor: new T.Color(0xc4b5ff), attenuationDistance: 4, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.0 });
    const defs = [
      { g: new T.IcosahedronGeometry(1, 0), x: -5.2, y0: -2, z: -1.0, s: 1.0, f: 0.95, r: 0.30 },
      { g: new T.TorusGeometry(0.85, 0.3, 28, 90), x: 5.6, y0: -6, z: -2.5, s: 1.1, f: 0.80, r: 0.25 },
      { g: new T.OctahedronGeometry(1, 0), x: -4.6, y0: -10, z: 0.5, s: 0.85, f: 1.10, r: 0.40 },
      { g: new T.SphereGeometry(0.8, 48, 48), x: 5.0, y0: -14, z: -1.5, s: 1.0, f: 0.90, r: 0.15 },
      { g: new T.TorusKnotGeometry(0.7, 0.22, 140, 24), x: -5.4, y0: -18, z: -3.0, s: 1.1, f: 0.75, r: 0.30 },
      { g: new T.IcosahedronGeometry(0.9, 1), x: 4.8, y0: -22, z: -0.5, s: 0.9, f: 1.0, r: 0.35 },
    ];
    defs.forEach((d) => {
      const m = new T.Mesh(d.g, glass);
      m.scale.setScalar(d.s);
      scene.add(m); shapes.push({ m, ...d });
    });
  }

  /* ---------- state ---------- */
  let sc = 0, scT = 0, mx = 0, my = 0, tmx = 0, tmy = 0, visible = true, last = 0, frame = 0;
  const TRAVEL = 24;
  function onScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    scT = h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('pointermove', (e) => { tmx = (e.clientX / innerWidth) * 2 - 1; tmy = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    skyMat.uniforms.uRes.value.set(w * ratio, h * ratio);
  }
  resize(); onScroll(); sc = scT;
  addEventListener('resize', () => { resize(); if (reduce) render(0); });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  function render(t) {
    skyMat.uniforms.uTime.value = reduce ? 0 : t;
    skyMat.uniforms.uScroll.value = sc;
    skyMat.uniforms.uMouse.value.set(mx, -my);
    camera.position.x = mx * 0.35; camera.position.y = -my * 0.2; camera.lookAt(0, 0, 0);
    for (const s of shapes) {
      s.m.position.set(s.x + mx * 0.25 * (1 + s.z * -0.1), s.y0 + sc * TRAVEL * s.f, s.z);
      s.m.rotation.set(t * s.r * 0.4 + sc * 3, t * s.r * 0.6 + sc * 2, 0);
    }
    renderer.render(scene, camera);
  }

  document.documentElement.classList.add('has-sky');
  function loop(now) {
    requestAnimationFrame(loop);
    if (!visible) return;
    if (small && (frame++ & 1)) return;           // half the frames on phones
    const t = now / 1000, dt = Math.min(0.05, t - last); last = t;
    sc += (scT - sc) * Math.min(1, dt * 4.5);
    mx += (tmx - mx) * Math.min(1, dt * 3); my += (tmy - my) * Math.min(1, dt * 3);
    render(t);
  }
  if (reduce) {
    render(0);
    addEventListener('scroll', () => { sc = scT; render(0); }, { passive: true });
  } else requestAnimationFrame(loop);
})();
