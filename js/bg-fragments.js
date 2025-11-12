// js/bg-fragments.js — subtle, background-only drifting fragments (manual start)
(() => {
  if (window.__FRAGMENTS_BUILT__) return;
  window.__FRAGMENTS_BUILT__ = true;

  const field = document.getElementById('fragField');
  if (!field) { window.Fragments = { start: () => {} }; return; }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- DIALS (tweak here) ---------------- */
  const COUNT_BASE     = 70;     // baseline fragment count for 1920x1080
  const COUNT_SCALE    = (innerWidth * innerHeight) / (1920 * 1080);
  const COUNT          = Math.max(28, Math.min(120, Math.round(COUNT_BASE * COUNT_SCALE)));

  const ORBIT_MIN      = 120;    // px from center
  const ORBIT_MAX      = Math.max(380, Math.min(innerWidth, innerHeight) * 0.45);

  const WOBBLE         = 10;     // px small noise on position
  const Z_BOB          = 240;    // depth amplitude (translateZ)
  const ANG_SPEED_MIN  = 0.00005;
  const ANG_SPEED_MAX  = 0.00022;

  const BASE_FONT_MIN  = 10;     // px
  const BASE_FONT_MAX  = 16;

  const ALPHA_BASE     = 0.18;   // overall faintness
  const ALPHA_JITTER   = 0.08;   // random per-frag variance
  const GLOBAL_ALPHA   = 0.88;   // global multiplier (0.7–0.9 stays subtle)

  const FLICKER_RATE   = 0.05;   // fraction that flicker
  const RESPAWN_FADE   = 420;    // ms fade-out/in on respawn
  const IDLE_FLAT_MS   = 1800;   // ms before flattening the field

  /* ---------------- Content pool ---------------- */
  const SNIPPETS = [
    'def truth(x): return "approximation"',
    '“Knowledge” ≠ understanding',
    'SELECT meaning FROM world WHERE origin="local";',
    'lo siento, no tengo contexto',
    '翻译：记忆是模糊的…',
    'MemoryError: context_overflow',
    '“The internet never forgets.”',
    'function recall(){ /* hallucinate */ }',
    'Cultural note missing...',
    'λx. simulate(x)',
    '…data truncated at source',
    'مَعْرِفَة بلا سياق',
    '404: lived knowledge not found',
    'biased_prior += 1',
    '“close enough”',
    '{ hallucination: true }',
    '≈ truthy',
    '/* TODO: verify with humans */',
    '— mistranslated —',
    'Undefined reference: history'
  ];

  /* ---------------- State ---------------- */
  let frags = [];
  let cx = 0, cy = 0, rect;
  function measure() {
    rect = field.getBoundingClientRect();
    cx = rect.left + rect.width  / 2;
    cy = rect.top  + rect.height / 2;
  }
  measure();
  addEventListener('resize', measure);

  // start flat; unflatten on mouse move then flatten again when idle
  field.classList.add('flat');
  let flat = true, idleTimer = 0;
  let targetRX = 0, targetRY = 0, targetPersp = 800;
  let mmDirty = null;

  addEventListener('mousemove', e => { mmDirty = {x: e.clientX, y: e.clientY}; }, {passive:true});

  function handleMouse(x, y){
    if (!rect) return;
    const mx = (x - rect.left) / rect.width;
    const my = (y - rect.top)  / rect.height;
    if (!isFinite(mx) || !isFinite(my)) return;

    const maxTilt = 5; // degrees
    targetRY = (mx - 0.5) * maxTilt;    // yaw
    targetRX = (0.5 - my) * maxTilt;    // pitch
    targetPersp = 900;

    if (flat) { field.classList.remove('flat'); flat = false; }
    idleTimer = performance.now();
  }

  /* ---------------- Utilities ---------------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const choice = arr => arr[(Math.random() * arr.length) | 0];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp  = (a, b, t) => a + (b - a) * t;

  /* ---------------- Build one fragment ---------------- */
  function makeFrag() {
    const el = document.createElement('div');
    el.className = 'frag';
    if (Math.random() < FLICKER_RATE) el.classList.add('flick');
    el.textContent = choice(SNIPPETS);
    field.appendChild(el);

    const baseSize = rand(BASE_FONT_MIN, BASE_FONT_MAX);
    el.style.fontSize = baseSize + 'px';

    const baseAlpha = (ALPHA_BASE + Math.random() * ALPHA_JITTER) * GLOBAL_ALPHA;
    el.style.opacity = '0';

    // orbit params
    const r0   = rand(ORBIT_MIN, ORBIT_MAX);
    const ang0 = Math.random() * Math.PI * 2;
    const dir  = Math.random() < 0.5 ? -1 : 1;
    const w    = rand(ANG_SPEED_MIN, ANG_SPEED_MAX) * (reduce ? 0.5 : 1);
    const phase= Math.random() * 1000;
    const jitter = rand(-Math.PI, Math.PI);

    const born = performance.now() + rand(0, 800); // staggered fade-in
    const f = {
      el, baseSize, baseAlpha,
      r0, ang: ang0, dir, w, phase, jitter,
      x: 0, y: 0, z: 0,
      cx: 0, cy: 0,
      dead: false,
      lastAlpha: 0,
      born
    };
    frags.push(f);

    // soft fade-in later
    setTimeout(() => { el.style.opacity = baseAlpha.toFixed(2); }, (f.born - performance.now()) + 60);

    return f;
  }

  /* ---------------- Positioning ---------------- */
  function place(f, now){
    // slow circular orbit
    const t   = now + f.phase;
    const ang = f.ang + f.dir * f.w * (now - f.born);

    // slow radius breathing to avoid hard rings
    const rBreath = 1 + 0.08 * Math.sin(t * 0.00035 + f.jitter);
    const r  = clamp(f.r0 * rBreath, ORBIT_MIN * 0.9, ORBIT_MAX * 1.05);

    // base orbit
    const ox = Math.cos(ang) * r;
    const oy = Math.sin(ang) * r;

    // tiny wobble (prevents perfectly clean circle)
    const wobX = WOBBLE * Math.sin(t * 0.0013 + f.jitter * 0.5);
    const wobY = WOBBLE * Math.cos(t * 0.0011 - f.jitter * 0.6);

    // fake depth bob
    const zb   = Math.sin(t * 0.0009 + f.jitter) * Z_BOB;

    // screen position relative to field center
    f.x = cx + ox + wobX - rect.left;
    f.y = cy + oy + wobY - rect.top;
    f.z = zb;

    // alpha based on distance & depth (always subtle)
    const dist   = Math.hypot(ox, oy);
    const dist01 = clamp((dist - ORBIT_MIN) / (ORBIT_MAX - ORBIT_MIN + 1), 0, 1);
    const z01    = clamp(Math.abs(zb) / (Z_BOB || 1), 0, 1);

    const depthFactor = 0.62 + 0.38 * (1 - z01);
    const distFactor  = 0.72 + 0.28 * (1 - dist01);
    const targetAlpha = clamp(f.baseAlpha * depthFactor * distFactor, 0.06, 0.45);

    if (Math.abs(targetAlpha - f.lastAlpha) > 0.03) {
      f.el.style.opacity = targetAlpha.toFixed(2);
      f.lastAlpha = targetAlpha;
    }

    f.el.style.transform = `translate3d(${f.x}px, ${f.y}px, ${f.z}px)`;
  }

  /* ---------------- Lifecycle (soft respawn) ---------------- */
  function maybeRespawn(f, now){
    if (Math.random() < 0.0006) {
      f.dead = true;
      f.el.style.transition = `opacity ${RESPAWN_FADE}ms ease`;
      f.el.style.opacity = '0';
      setTimeout(() => {
        f.el.textContent = choice(SNIPPETS);
        f.el.style.transition = `opacity ${RESPAWN_FADE}ms ease`;
        f.baseAlpha = (ALPHA_BASE + Math.random()*ALPHA_JITTER) * GLOBAL_ALPHA;
        f.r0   = rand(ORBIT_MIN, ORBIT_MAX);
        f.ang  = Math.random() * Math.PI * 2;
        f.dir  = Math.random() < 0.5 ? -1 : 1;
        f.w    = rand(ANG_SPEED_MIN, ANG_SPEED_MAX) * (reduce ? 0.5 : 1);
        f.jitter = rand(-Math.PI, Math.PI);
        f.phase  = Math.random() * 1000;
        f.born   = now;
        f.dead   = false;
        f.el.style.opacity = f.baseAlpha.toFixed(2);
      }, RESPAWN_FADE + 20);
    }
  }

  /* ---------------- Field transforms (mouse-driven) ---------------- */
  function updateFieldTransforms(){
    const cs = getComputedStyle(field);
    const curRX = parseFloat(cs.getPropertyValue('--rx')) || 0;
    const curRY = parseFloat(cs.getPropertyValue('--ry')) || 0;
    const curP  = parseFloat(cs.getPropertyValue('--persp')) || 800;

    const tRot = reduce ? 0.12 : 0.18;
    const tPer = reduce ? 0.08 : 0.12;

    field.style.setProperty('--rx', `${lerp(curRX, targetRX, tRot)}deg`);
    field.style.setProperty('--ry', `${lerp(curRY, targetRY, tRot)}deg`);
    field.style.setProperty('--persp', `${Math.max(1, lerp(curP,  targetPersp, tPer))}px`);
  }

  /* ---------------- Main loop ---------------- */
  function tick(now){
    if (mmDirty){ handleMouse(mmDirty.x, mmDirty.y); mmDirty = null; }

    if (!reduce && !flat && (performance.now() - idleTimer > IDLE_FLAT_MS)){
      field.classList.add('flat');
      flat = true;
      targetRX = 0; targetRY = 0; targetPersp = 14;
    }

    if (!reduce) updateFieldTransforms();

    for (const f of frags){
      if (!f.dead) place(f, now);
      maybeRespawn(f, now);
    }

    requestAnimationFrame(tick);
  }

  /* ---------------- Init ---------------- */
  function buildAll(){
    measure();
    for (let i = 0; i < COUNT; i++) makeFrag();
    setTimeout(() => field.classList.add('on'), 200); // fade in
    requestAnimationFrame(tick);
  }

  function start(){
    if (reduce){
      frags = [];
      for (let i = 0; i < Math.max(18, Math.round(COUNT * 0.35)); i++) makeFrag();
      field.classList.add('on');
      requestAnimationFrame(tick);
      return;
    }
    buildAll();
  }

  /* 🔸 Manual API: DO NOT auto-start. Call Fragments.start() when ready. */
  window.Fragments = { start };
})();
