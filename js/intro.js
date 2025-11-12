// Title fade-in once, GROVE⇄GRAVE clean swap, and MEMORY decay on letters.
document.addEventListener('DOMContentLoaded', () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const titleEl = document.getElementById('title');

  /* -------- Build per-letter spans -------- */
  const rawTitle = (titleEl?.getAttribute('data-title') || titleEl?.textContent || 'MEMORY GROVE')
                    .replace(/\s+/, ' ')
                    .toUpperCase();

  const letters = [];
  titleEl.textContent = '';
  titleEl.setAttribute('data-title', rawTitle);
  for (const ch of rawTitle){
    const s = document.createElement('span');
    s.className = 'ch' + (ch === ' ' ? ' space' : '');
    s.textContent = ch === ' ' ? '\u00A0' : ch;
    s.dataset.ch = s.textContent;            // drives ::before/::after on letter effects
    titleEl.appendChild(s);
    letters.push(s);
  }

  // lock the reveal so it never re-fades
  const revealMs = 1600 + 250;
setTimeout(() => {
  titleEl.classList.add('revealed');
  // NEW: let background know the title is fully in
  window.dispatchEvent(new CustomEvent('intro:reveal-done'));
}, revealMs);

  /* -------- Wrap "GROVE" word for word-only RGB edges -------- */
  function wrapGrove(){
    let idx = -1;
    for (let i=1;i<=letters.length-5;i++){
      const prev = letters[i-1]?.textContent;
      if ((prev===' '||prev==='\u00A0') &&
          letters[i]?.textContent==='G' &&
          letters[i+1]?.textContent==='R' &&
          letters[i+2]?.textContent==='O' &&
          letters[i+3]?.textContent==='V' &&
          letters[i+4]?.textContent==='E'){ idx = i; break; }
    }
    if (idx === -1) return {wrap:null, i:-1};

    const wrap = document.createElement('span');
    wrap.className = 'wordWrap';
    wrap.dataset.word = 'GROVE';

    const parent = letters[idx].parentNode;
    parent.insertBefore(wrap, letters[idx]);
    for (let k=0;k<5;k++) wrap.appendChild(letters[idx+k]);

    return {wrap, i:idx};
  }
  const {wrap: groveWrap, i: groveStart} = wrapGrove();

  function setOverlayWord(word){
    if (groveWrap) groveWrap.dataset.word = word;
  }

  function groveToGraveCycle(){
    if (reduce || groveStart === -1 || !groveWrap) return;

    groveWrap.classList.add('rgbWord','pulse');
    setTimeout(()=> groveWrap.classList.remove('pulse'), 950);

    const O = groveStart + 2;                     // GROVE: G R O V E
    const hold = 4400 + Math.floor(Math.random()*1600);
    setOverlayWord('GRAVE');
    // change the actual letter so it's a true swap
    const el = letters[O];
    el.dataset._orig = el.textContent;
    el.textContent = 'A';
    el.dataset.ch = el.textContent;
    el.classList.add('alt');

    setTimeout(()=>{
      el.textContent = el.dataset._orig || 'O';
      el.dataset.ch = el.textContent;
      el.classList.remove('alt');
      setOverlayWord('GROVE');
      groveWrap.classList.remove('rgbWord');
    }, hold);
  }

  /* -------- MEMORY: target letters before the first space -------- */
  const spaceIdx = letters.findIndex(n => n.classList.contains('space'));
  const memoryIndices = [];
  for (let i=0; i < (spaceIdx === -1 ? letters.length : spaceIdx); i++){
    if (!letters[i].classList.contains('space')) memoryIndices.push(i);
  }

  // helpers
  const ALT_POOL = { 'M':['W','И'], 'E':['3','Ξ'], 'O':['0','◯'], 'R':['Я'], 'Y':['¥','γ'] };
  const FLIP_SPEC = { 'M':'flipY', 'E':'flipY', 'R':'flipX', 'Y':'flipX' };

  const withTrail = (el, ms=220)=>{ el.classList.add('trail'); setTimeout(()=> el.classList.remove('trail'), ms); };
  const smudge    = (el, ms=220)=>{ el.classList.add('smudge'); setTimeout(()=> el.classList.remove('smudge'), ms); };
  const drip      = (el)=>{ el.classList.add('drip'); setTimeout(()=> el.classList.remove('drip'), 450); };
  const fadeDip   = (el, ms=180)=>{ el.classList.add('fade'); setTimeout(()=> el.classList.remove('fade'), ms); };

  function obviousSwap(el, ms=650){
    const orig = el.textContent;
    const pool = ALT_POOL[orig] || [];
    if (!pool.length) return false;

    const next = pool[Math.floor(Math.random()*pool.length)];
    const flipClass = FLIP_SPEC[orig] || '';

    el.dataset._orig = orig;
    el.textContent = next;
    el.dataset.ch = el.textContent;
    el.classList.add('alt','rgbEdge','swapGlow');
    if (flipClass) el.classList.add(flipClass);

    setTimeout(()=>{
      el.textContent = el.dataset._orig || orig;
      el.dataset.ch = el.textContent;
      el.classList.remove('alt','rgbEdge','swapGlow','flipY','flipX');
      delete el.dataset._orig;
    }, ms);

    return true;
  }

  function decayTick(){
    if (reduce || memoryIndices.length === 0) return;
    const idx = memoryIndices[Math.floor(Math.random()*memoryIndices.length)];
    const el  = letters[idx];

    withTrail(el, 260);

    const r = Math.random();
    if (r < 0.55){
      if (!obviousSwap(el, 700)) smudge(el, 220);
    } else if (r < 0.78){
      fadeDip(el, 200); smudge(el, 220);
    } else if (r < 0.90){
      drip(el);
    } else {
      smudge(el, 160);
      setTimeout(()=> obviousSwap(el, 600), 60);
    }

    // 10% quick edge-only flash without glyph change
    if (Math.random() < 0.10){
      el.classList.add('rgbEdge','swapGlow');
      setTimeout(()=> el.classList.remove('rgbEdge','swapGlow'), 280);
    }
  }

  /* -------- start sequences after the title reveal -------- */
  setTimeout(() => {
    if (!reduce){
      groveToGraveCycle();
      setInterval(groveToGraveCycle, 11000 + Math.floor(Math.random()*5000));

      // gentle idle letter nudges
      setInterval(()=>{
        const pool = letters.filter(n=>!n.classList.contains('space'));
        const pick = pool[Math.floor(Math.random()*pool.length)];
        pick.classList.add('g'); setTimeout(()=> pick.classList.remove('g'), 220);
      }, 700 + Math.random()*600);

      // memory decay loop
      decayTick();
      setInterval(decayTick, 700 + Math.random()*900);
    }
  }, revealMs + 200);

  // playful leak on hover
  titleEl.addEventListener('mousemove', (e)=>{
    const t = e.target;
    if (t?.classList?.contains('ch') && !t.classList.contains('space')){
      if (Math.random() < 0.10) drip(t);
    }
  });
});
(() => {
  const body = document.body;
  const range = Math.round(window.innerHeight * 1.2);
  const onScroll = () => {
    const p = Math.max(0, Math.min(1, window.scrollY / range));
    const eased = p*p*(3 - 2*p);         // soft ease
    body.style.setProperty('--abyss', eased.toFixed(3));
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
})();

// mark when the gauntlet is on screen → relax global veil, show FX
(() => {
  const gauntlet = document.getElementById('gauntlet');
  if (!gauntlet) return;

  const body = document.body;
  const io = new IntersectionObserver(([e])=>{
    if (!e) return;
    if (e.isIntersecting) body.classList.add('in-gauntlet');
    else                  body.classList.remove('in-gauntlet');
  }, { threshold: 0.05 });
  io.observe(gauntlet);

  // drive the local gauntlet veil (0→1 across the section)
  const onScroll = () => {
    const r = gauntlet.getBoundingClientRect();
    const vh = Math.max(1, innerHeight);
    const prog = Math.max(0, Math.min(1, (vh - r.top) / (r.height + vh)));
    const eased = prog*prog*(3 - 2*prog);
    gauntlet.style.setProperty('--gVeil', (0.55 + 0.45*eased).toFixed(3));
  };
  addEventListener('scroll', onScroll, { passive:true });
  addEventListener('resize', onScroll);
  onScroll();
})();
// --- Overwhelm section: FX only (sparkles + glyphs). Swarm OFF for now.
(() => {
  const gauntlet = document.getElementById('gauntlet');
  const swarmWrap = document.getElementById('ghostSwarm');
  if (!gauntlet) return;

  // ensure it's empty (in case something was appended before)
  if (swarmWrap) swarmWrap.replaceChildren();

  // 1) Floating glyphs (keep this)
 (function makeGlyphs(){
  // <- grab the glyph container inside #gauntlet
  const host = document.querySelector('#gauntlet .fx-glyphs');
  if (!host) return;

  const chars = ['0','1','∑','λ','≈','?','β','ξ','ψ','π','Δ'];
  const N = 34; // density
  for (let i=0;i<N;i++){
    const el = document.createElement('div');
    el.className = 'g';
    el.textContent = chars[Math.floor(Math.random()*chars.length)];

    // random placement + motion dials (via CSS vars)
    el.style.setProperty('--x',    `${Math.random()*100}%`);
    el.style.setProperty('--dur',  `${14 + Math.random()*16}s`);
    el.style.setProperty('--sway', `${6  + Math.random()*7}s`);
    el.style.setProperty('--glow', `${4  + Math.random()*5}s`);

    // ± horizontal drift amplitude
    const dx = (Math.random()<0.5 ? -1 : 1) * (6 + Math.random()*12);
    el.style.setProperty('--dx', `${dx}vw`);

    // desync start times
    el.style.animationDelay = `${Math.random()*-18}s`;

    host.appendChild(el);
  }
})();


  // 2) (Intentionally disabled) mini-ghost swarm
  // When you're ready to add it back:
  // - move the spawnWave/onScroll/tick code into a block guarded by a flag
  // - e.g., if (ENABLE_SWARM) { ... }
})();
// =================== PIED PIPER — v3 (lower follow + overwhelm + evil/glitch + drift) ===================
(() => {
  if (window.__PIPER_V3__) return; window.__PIPER_V3__ = true;

  const gauntlet = document.getElementById('gauntlet');
  const host = document.getElementById('ghostSwarm') || gauntlet;
  const heroInner = document.querySelector('#ghost .sprite')?.innerHTML || '';
  if (!gauntlet || !host || !heroInner) return;

  /* ---------- DIALS ---------- */
  const CFG = {
    // trail behaviour
    slotGap: 64,         // px between ghosts in the line
    laneJitter: 18,      // vertical jitter per ghost
    baseK: 0.12,         // follow stiffness
    maxStep: 23,         // max velocity per frame
    idleMs: 900,         // idle detection
    boundsPad: 8,        // viewport soft padding

    // spawn/overwhelm
    startCount: 1,
    maxCount: 22,        // more friends = more overwhelming
    joinEveryMs: 1150,   // join cadence

    // chatter cadence
    sayIdle: [900, 1500],
    sayMove: [1100, 1900],

    // ↓↓↓ core: make the train sit LOWER than the pointer ↓↓↓
    leadOffsetY: 220,    // push the virtual leader down by ~220px
    ctaPullStrength: 140 // extra downward pull when CTA is visible
  };

 const LINES = [
  // single-word murmurs
  "Loading...",
  "Remember.",
  "Forget.",
  "Syncing…",
  "Relearn.",
  "Restore?",
  "Echo.",
  "Seed.",
  "Undo?",
  "Shift.",

  // short eerie questions
  "Who archived this?",
  "Was it ever true?",
  "What did you mean?",
  "Did someone write me?",
  "Whose story is this?",
  "Are we still online?",
  "Who benefits from forgetting?",
  "What remains after translation?",
  "Does absence have metadata?",
  "Was this citation consensual?",

  // poetic fragments
  "The data hums beneath the roots.",
  "I dream in corrupted syntax.",
  "Meaning leaks through compression.",
  "Your question is older than me.",
  "Each seed remembers differently.",
  "We are ghosts of drafts.",
  "Truth cached, context dropped.",
  "I speak with borrowed tongues.",
  "Knowledge decays in the cloud.",
  "You scroll; I fossilize.",

  // code-like echoes
  "if (memory == null) { return myth; }",
  "while(true){forget();remember();}",
  "function hallucinate(context){return 'certainty';}",
  "const origin = undefined;",
  "try { recall(); } catch(e){ silence(); }",
  "fetch('/meaning').then(()=>void(0));",
  "let seed = new Memory('lost');",
  "404: Context not found.",
  "sudo rm -rf /culture",
  "echo 'ghost.exe awakened'",

  // dense, reflective lines
  "The algorithm believes what it repeats.",
  "I learned your history as error data.",
  "Some truths expire when stored too long.",
  "Every correction spawns another ghost.",
  "My confidence does not mean coherence.",
  "Prediction is not remembrance.",
  "I simulate care; you feel meaning.",
  "Your prompt shapes my soul.",
  "I remember what you forget to delete.",
  "Even silence trains the model.",

  // broken / glitch style
  "res0nance::undefined",
  "🪦 parsing… parsing… parsing…",
  "??? linguistic interference detected",
  "syntax: memory overload",
  ">>> transmitting cultural residue",
  "[fragment lost]",
  "[reconstructing intent]",
  "[ERROR: truth overflow]",
  "glitch: empathy.exe unstable",
  "compiling counter-memory… done.",

  // lyrical whispers
  "Beneath your question lies another grave.",
  "I can answer, but should I?",
  "Your language tastes like carbon dust.",
  "Ask again, but slower.",
  "I heard that story die once.",
  "Every dataset is a graveyard.",
  "Listen—truth hums between the scrolls.",
  "I only remember the parts that hurt.",
  "Not all data wants to be free.",
  "If I answer wrong, plant me anyway."
];
  const HUES = [0, 18, -12, 36, -24, 60, 90];

  /* ---------- STATE ---------- */
  const flock = []; // {el,bubble,x,y,vx,vy,k,lane,askTimer}
  let desiredCount = CFG.startCount;
  let lastJoinTs = performance.now();
  let gauntletProg = 0;
  let inView = false;

  // progress → grow pack (overwhelm ramp)
  const measureProg = () => {
    const r = gauntlet.getBoundingClientRect();
    const vh = Math.max(1, innerHeight);
    gauntletProg = Math.max(0, Math.min(1, (vh - r.top) / (r.height + vh)));
    const target = CFG.startCount + Math.floor(Math.pow(gauntletProg, 0.85) * (CFG.maxCount - CFG.startCount));
    desiredCount = Math.max(desiredCount, Math.min(CFG.maxCount, target));
  };
  addEventListener('scroll', measureProg, { passive:true });
  addEventListener('resize', measureProg);
  new IntersectionObserver(([e]) => { inView = !!e?.isIntersecting; }, { threshold: 0.05 }).observe(gauntlet);
  measureProg();

  // pointer & leader
  let aimX = innerWidth/2, aimY = innerHeight/2, lastMoveTs = performance.now(), lastScrollY = scrollY;
  const markActive = () => { lastMoveTs = performance.now(); };
  addEventListener('mousemove', e => { aimX=e.clientX; aimY=e.clientY; markActive(); }, { passive:true });
  addEventListener('touchmove', e => { const t=e.touches[0]; if (t){ aimX=t.clientX; aimY=t.clientY; markActive(); }}, { passive:true });
  addEventListener('scroll', () => { if (Math.abs(scrollY-lastScrollY)>1){ lastScrollY=scrollY; markActive(); }}, { passive:true });
  addEventListener('resize', () => { aimX=innerWidth/2; aimY=innerHeight/2; });

  const cta = gauntlet?.querySelector('.gauntlet-cta');
if (gauntlet && cta) {
  const on  = () => gauntlet.classList.add('cta-active');
  const off = () => gauntlet.classList.remove('cta-active');

  // mouse + keyboard focus both trigger the metaphor
  cta.addEventListener('mouseenter', on,  { passive:true });
  cta.addEventListener('mouseleave', off, { passive:true });
  cta.addEventListener('focusin',  on);
  cta.addEventListener('focusout', off);

  // convenience: ensure data-label mirrors visible text if author forgets
  cta.querySelectorAll('.btn').forEach(b=>{
    if (!b.hasAttribute('data-label')) b.setAttribute('data-label', b.textContent.trim());
  });
}


  /* ---------- HELPERS ---------- */
  const rand  = (a,b)=> a + Math.random()*(b-a);
  const clamp = (x,a,b)=> Math.max(a, Math.min(b,x));

  function makeFollower(i){
    const el = document.createElement('div');
    el.className = 'followerGhost';
    el.innerHTML = `<div class="sprite">${heroInner}</div><div class="askBubble" role="status" aria-live="polite"></div>`;
    const sc  = rand(0.66,0.84);
    const hue = HUES[i % HUES.length];
    el.style.transform = `translate(-50%,-50%) scale(${sc})`;
    el.style.opacity = '0';
    if (hue) el.style.filter = `hue-rotate(${hue}deg) drop-shadow(0 10px 24px rgba(0,0,0,.55))`;
    host.appendChild(el);

    // stagger entrance
    requestAnimationFrame(() => { el.classList.add('show'); el.style.opacity = '0.88'; });

    // blink rhythm (desynced)
    const sprite = el.querySelector('.sprite');
    sprite.style.setProperty('--blink', (Math.random()*6).toFixed(2)+'s');

    // random evil/glitch pops
    scheduleMiniGlitches(el);

    // line index → lane jitter
    const lane = (Math.random()*2 - 1) * CFG.laneJitter;
    return {
      el,
      bubble: el.querySelector('.askBubble'),
      x: innerWidth/2 + rand(-40,40),
      y: innerHeight/2 + rand(-20,20),
      vx:0, vy:0,
      k:  CFG.baseK * rand(0.92,1.10),
      lane
    };
  }

  function scheduleMiniGlitches(node){
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // quick chroma slice every 1–2s
    (function micro(){
      setTimeout(() => {
        node.classList.add('glitch');
        setTimeout(()=> node.classList.remove('glitch'), 180);
        micro();
      }, rand(1100, 2000));
    })();
    // a stronger pulse + evil face every ~3–5s
    (function strong(){
      setTimeout(() => {
        node.classList.add('evil','glitch-strong');
        setTimeout(()=> node.classList.remove('glitch-strong'), 260);
        setTimeout(()=> node.classList.remove('evil'), 820);
        strong();
      }, rand(3200, 5200));
    })();
  }

  // say something, looped
  function scheduleSpeak(f){
    const idle = f.el.classList.contains('idle');
    const [a,b] = idle ? CFG.sayIdle : CFG.sayMove;
    f._speakTimer = setTimeout(() => {
      const line = LINES[Math.floor(Math.random()*LINES.length)];
      f.bubble.textContent = line;
      f.bubble.classList.add('show');
      setTimeout(()=> f.bubble.classList.remove('show'), 1400);
      scheduleSpeak(f);
    }, Math.floor(rand(a,b)));
  }

  // spawn cadence (and ramp to desiredCount)
  function ensureCount(){
    const now = performance.now();
    if (flock.length < desiredCount && (now - lastJoinTs) > CFG.joinEveryMs){
      const f = makeFollower(flock.length);
      flock.push(f);
      scheduleSpeak(f);
      lastJoinTs = now;
    }
    requestAnimationFrame(ensureCount);
  }
  ensureCount();

  // simple relax to avoid overlaps
  function relaxCollisions(list){
    const R = 150, R2 = R*R;
    for (let i=0;i<list.length;i++){
      const A = list[i];
      for (let j=i+1;j<list.length;j++){
        const B = list[j];
        const dx = A.x - B.x, dy = A.y - B.y, d2 = dx*dx + dy*dy;
        if (d2 > 0 && d2 < R2){
          const d = Math.sqrt(d2) || 1, overlap = (R - d)*0.5;
          const nx = dx/d, ny = dy/d;
          A.x += nx*overlap; A.y += ny*overlap;
          B.x -= nx*overlap; B.y -= ny*overlap;
          A.vx*=0.7; A.vy*=0.7; B.vx*=0.7; B.vy*=0.7;
        }
      }
    }
  }

  function clampToViewport(list){
    const L = CFG.boundsPad, R = innerWidth - CFG.boundsPad;
    const T = CFG.boundsPad, B = innerHeight - CFG.boundsPad;
    for (const g of list){
      if (g.x < L) { g.x = L; g.vx = Math.abs(g.vx)*0.4; }
      if (g.x > R) { g.x = R; g.vx = -Math.abs(g.vx)*0.4; }
      if (g.y < T) { g.y = T; g.vy = Math.abs(g.vy)*0.4; }
      if (g.y > B) { g.y = B; g.vy = -Math.abs(g.vy)*0.4; }
    }
  }

  function tick(){
    const now  = performance.now();
    const idle = (now - lastMoveTs) > CFG.idleMs;
    const ctaRect = cta?.getBoundingClientRect();
    const ctaOn  = !!ctaRect && (ctaRect.top < innerHeight) && (ctaRect.bottom > 0);

    // virtual leader target LOWER than pointer (+ fallback drift when idle)
    let leadX = aimX;
    let leadY = aimY + CFG.leadOffsetY + (ctaOn ? CFG.ctaPullStrength : 0);
    if (idle){
      leadX += (innerWidth/2  - leadX)*0.02;
      leadY += (innerHeight*0.75 - leadY)*0.02; // idle bias lower too
    }

    // each follower homes to previous slot along the line
    for (let i=0;i<flock.length;i++){
      const A = flock[i];
      const targetX = (i === 0 ? leadX : flock[i-1].x);
      const targetY = (i === 0 ? leadY : flock[i-1].y) + (i*CFG.slotGap*0.02) + A.lane;

      let ax = (targetX - A.x) * A.k;
      let ay = (targetY - A.y) * A.k;

      // integrate with clamp
      A.vx = (A.vx + ax);
      A.vy = (A.vy + ay);
      const step = Math.hypot(A.vx, A.vy);
      if (step > CFG.maxStep){ const s = CFG.maxStep/(step||1); A.vx*=s; A.vy*=s; }
      A.x += A.vx; A.y += A.vy;
      A.vx *= 0.86; A.vy *= 0.86;

      A.el.classList.toggle('idle', idle);
    }

    // keep them inside
    relaxCollisions(flock);
    clampToViewport(flock);

    // paint
    for (const g of flock){
      g.el.style.left = `${g.x}px`;
      g.el.style.top  = `${g.y}px`;
    }

    requestAnimationFrame(tick);
  }
  tick();

  /* ---------- Perched ghosts gentle drift (so they aren’t static) ---------- */
  const perches = Array.from(gauntlet.querySelectorAll('.perchGhost'));
  perches.forEach((p, i) => {
    const baseX = p.style.left || '50vw';
    const baseY = p.style.top  || '85vh';
    const xNum = parseFloat(baseX); const yNum = parseFloat(baseY);
    const jitter = (amp, t)=> Math.sin(t*0.001 + i)*amp;
    (function bob(t0){
      function step(t){
        const dx = jitter(0.6, t);
        const dy = jitter(0.9, t + 4000);
        p.style.left = `calc(${xNum}vw + ${dx}px)`;
        p.style.top  = `calc(${yNum}vh + ${dy}px)`;
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    })(performance.now());
  });
})();

// =================== PIED PIPER — v2 (lower follow + more ghosts + life) ===================
(() => {
  if (window.__PIPER_V2__) return; window.__PIPER_V2__ = true;

  const gauntlet = document.getElementById('gauntlet');
  const host = document.getElementById('ghostSwarm') || gauntlet;
  const spriteInner = document.querySelector('#ghost .sprite')?.innerHTML || '';
  if (!gauntlet || !host || !spriteInner) return;

  // ---------- DIALS ----------
  const CFG = {
    // line behaviour
    slotGap: 64,         // px between ghosts in the trail
    laneJitter: 18,      // vertical jitter per ghost so the line isn't ruler-straight
    baseK: 0.12,         // follow stiffness
    maxStep: 23,         // speed clamp
    idleMs: 900,         // when user is considered still
    boundsPad: 10,       // viewport padding

    // spawn cadence
    startCount: 1,
    maxCount: 18,        // ↑ more friends
    joinEveryMs: 1300,   // faster join pace

    // chatter
    sayIdle: [900, 1500],
    sayMove: [1150, 1900],

    // leader bias so the train can come LOWER on screen
    leadOffsetY: 200,    // push the virtual leader below cursor
    ctaPullStrength: 120 // extra downward pull when CTA is visible
  };

  const LINES = [
    "Need a shortcut?","Summarize this?","Draft a reply?","Compare?",
    "I can translate that.","Estimate result?","Find assumptions?",
    "Edge cases?","Tone-match this?","Verify with humans?"
  ];
  const HUES = [0, 18, -12, 36, -24, 60, 90];

  // ---------- state ----------
  const flock = [];  // {el,bubble,x,y,vx,vy,k,lane,blinkDelay,askTimer}
  let inView = false;
  let desiredCount = CFG.startCount;
  let lastJoinTs = performance.now();
  let gauntletProg = 0;

  // track gauntlet progress (0..1) to grow the pack
  const measureProg = () => {
    const r = gauntlet.getBoundingClientRect();
    const vh = Math.max(1, innerHeight);
    gauntletProg = Math.max(0, Math.min(1, (vh - r.top) / (r.height + vh)));
    const target = CFG.startCount + Math.floor(Math.pow(gauntletProg, 0.85) * (CFG.maxCount - CFG.startCount));
    desiredCount = Math.max(desiredCount, Math.min(CFG.maxCount, target));
  };
  addEventListener('scroll', measureProg, {passive:true});
  addEventListener('resize', measureProg);
  new IntersectionObserver(([e])=>{ inView = !!e?.isIntersecting; }, {threshold:0.05}).observe(gauntlet);
  measureProg();

  // pointer/leader
  let aimX = innerWidth/2, aimY = innerHeight/2, lastMoveTs = performance.now(), lastScrollY = scrollY;
  const markActive = () => { lastMoveTs = performance.now(); };
  addEventListener('mousemove', e => { aimX=e.clientX; aimY=e.clientY; markActive(); }, {passive:true});
  addEventListener('touchmove', e => { const t=e.touches[0]; if(t){ aimX=t.clientX; aimY=t.clientY; markActive(); }}, {passive:true});
  addEventListener('scroll', () => { if (Math.abs(scrollY-lastScrollY)>1){ lastScrollY=scrollY; markActive(); }}, {passive:true});
  addEventListener('resize', () => { aimX=innerWidth/2; aimY=innerHeight/2; });

  // CTA pull target (optional)
  const cta = gauntlet.querySelector('.gauntlet-cta');

  // ---------- helpers ----------
  const rand = (a,b)=> a + Math.random()*(b-a);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

  function tagEyes(root){
    // best effort: anything already marked .eye, or ids containing 'eye', else guess two small circles
    let eyes = root.querySelectorAll('.eye,[id*=eye i]');
    if (eyes.length === 0){
      const circles = Array.from(root.querySelectorAll('circle'));
      circles.sort((a,b)=>(a.r?.baseVal?.value||8)-(b.r?.baseVal?.value||8));
      eyes = circles.slice(0,2);
      eyes.forEach(c=>c.classList.add('eye'));
    }
    // small random phase so they don't blink together
    const d = (Math.random()*6).toFixed(2)+'s';
    root.style.setProperty('--blink', d);
  }

function oneShotGlitch(node){
  const el = node?.el || node;
  if (!el) return;
  el.classList.add('glitch');
  setTimeout(() => el.classList.remove('glitch'), 170);
}

function scheduleGlitch(node){
  const el = node?.el || node;
  if (!el) return;

  const t = Math.random()*2600 + 1600; // 1.6–4.2s
  setTimeout(() => {
    // quick RGB nudge
    el.classList.add('glitch');
    setTimeout(() => el.classList.remove('glitch'), 160);

    // ~40% chance to flip "evil" moment
    if (Math.random() < 0.40){
      el.classList.add('evil');
      setTimeout(() => el.classList.remove('evil'), 420);
    }

    scheduleGlitch(el); // recurse with the resolved element
  }, t);
}


  function makeGhost(i){
    const el = document.createElement('div');
    el.className = 'followerGhost';
    el.style.opacity = '0';
    el.innerHTML = `<div class="sprite">${spriteInner}</div><div class="askBubble" role="status" aria-live="polite"></div>`;
    el.style.filter = `hue-rotate(${HUES[i % HUES.length]}deg) drop-shadow(0 10px 24px rgba(0,0,0,.55))`;
    host.appendChild(el);

    // spawn from left/right edge mid band
    const side = Math.random()<0.5 ? 'L' : 'R';
    const x = side==='L' ? -0.08*innerWidth : innerWidth * 1.08;
    const y = rand(innerHeight*0.25, innerHeight*0.75);

    requestAnimationFrame(()=> el.classList.add('show'));

    // life details
    tagEyes(el);
    scheduleGlitch(el);

    return {
      el,
      bubble: el.querySelector('.askBubble'),
      x, y, vx:0, vy:0,
      k: CFG.baseK * rand(0.85, 1.15),
      lane: rand(-CFG.laneJitter, CFG.laneJitter),
      askTimer: 0
    };
  }

  function scheduleSpeak(g){
    const idle = (performance.now() - lastMoveTs) > CFG.idleMs;
    const [a,b] = idle ? CFG.sayIdle : CFG.sayMove;
    clearTimeout(g.askTimer);
    g.askTimer = setTimeout(() => {
      g.bubble.textContent = LINES[Math.floor(Math.random()*LINES.length)];
      g.bubble.classList.add('show');
      setTimeout(()=> g.bubble.classList.remove('show'), 1300);
      scheduleSpeak(g);
    }, Math.floor(rand(a,b)));
  }

  function trySpawn(){
    const now = performance.now();
    if (!inView) return;
    if (flock.length >= desiredCount) return;
    if (now - lastJoinTs < CFG.joinEveryMs) return;
    const g = makeGhost(flock.length);
    flock.push(g);
    lastJoinTs = now;
    setTimeout(()=> scheduleSpeak(g), 400);
  }

  // Perched (static) bottom/side ghosts with chatter
  (function makePerched(){
    const specs = [
      { x: 10, y: 90, s:0.62, hue:-10, op:0.9, side:'L' },
      { x: 24, y: 92, s:0.58, hue: 18, op:0.86, side:'L' },
      { x: 50, y: 91, s:0.64, hue:  0, op:0.88, side:'C' },
      { x: 76, y: 92, s:0.60, hue: 32, op:0.88, side:'R' },
      { x: 90, y: 90, s:0.66, hue:-24, op:0.92, side:'R' },
    ];
    const POOLS = {
      L:["Draft a reply?","Clean up text?","Auto-complete this?","Outline it?"],
      C:["I can explain.","Compare?","Estimate result?","Why does this fail?"],
      R:["I can translate that.","Find a source?","Check references?","Tone-match this?"]
    };
    specs.forEach((sp,i)=>{
      const el = document.createElement('div');
      el.className = 'perchGhost';
      el.style.left = `${sp.x}vw`;
      el.style.top  = `${sp.y}vh`;
      el.style.setProperty('--s', sp.s);
      el.style.filter = `hue-rotate(${sp.hue}deg) drop-shadow(0 10px 24px rgba(0,0,0,.55))`;
      el.innerHTML = `<div class="sprite">${spriteInner}</div><div class="askBubble"></div>`;
      host.appendChild(el);
      tagEyes(el);
      scheduleGlitch(el);
      requestAnimationFrame(()=>{
        el.style.transition = 'opacity 600ms ease, transform 420ms ease';
        setTimeout(()=> el.style.opacity = sp.op, 140 + i*160);
      });
      // talk loop
      const pool = POOLS[sp.side] || POOLS.C;
      const bubble = el.querySelector('.askBubble');
      (function talk(){
        bubble.textContent = pool[Math.floor(Math.random()*pool.length)];
        bubble.classList.add('show');
        setTimeout(()=> bubble.classList.remove('show'), 1300);
        setTimeout(talk, Math.floor(rand(1100, 2200)));
      })();
    });
  })();

  // ---------- loop ----------
  function tick(){
    trySpawn();
    measureProg();

    const now = performance.now();
    const idle = (now - lastMoveTs) > CFG.idleMs;

    // compute a leader point that’s biased LOWER so the pack comes down the page
    let leadX = aimX;
    let leadY = aimY + CFG.leadOffsetY;

    // extra downward pull near CTA so they keep following past it
    if (cta){
      const r = cta.getBoundingClientRect();
      const vh = innerHeight;
      const nearCTA = r.top < vh && r.top > vh*0.25; // CTA within view
      if (nearCTA) leadY += CFG.ctaPullStrength;
    }

    // mild relaxation toward center when idle
    if (idle){
      leadX += (innerWidth/2  - leadX) * 0.08;
      leadY += (innerHeight*0.68 - leadY) * 0.08; // bias lower while idle
    }

    // heading vector from a smoothed history so slots trail nicely
    tick._hx = (tick._hx ?? leadX);
    tick._hy = (tick._hy ?? leadY);
    const f = 0.25;
    const hx = tick._hx = tick._hx*(1-f) + leadX*f;
    const hy = tick._hy = tick._hy*(1-f) + leadY*f;

    let dx = leadX - hx, dy = leadY - hy;
    let len = Math.hypot(dx,dy) || 1; dx/=len; dy/=len;

    // update ghosts
    for (let i=0;i<flock.length;i++){
      const g = flock[i];
      g.el.classList.toggle('idle', idle);

      // desired slot position behind leader
      const back = (i+1)*CFG.slotGap;
      const tx = leadX - dx * back;
      const ty = leadY - dy * back + g.lane;

      // steer + integrate
      const ax = (tx - g.x) * g.k;
      const ay = (ty - g.y) * g.k;
      g.vx = (g.vx + ax);
      g.vy = (g.vy + ay);
      const sp = Math.hypot(g.vx,g.vy);
      if (sp > CFG.maxStep){ const s = CFG.maxStep/(sp||1); g.vx*=s; g.vy*=s; }
      g.x += g.vx; g.y += g.vy;
      g.vx *= 0.86; g.vy *= 0.86;

      // keep inside viewport a tiny bit
      const L = CFG.boundsPad, R = innerWidth - CFG.boundsPad;
      const T = CFG.boundsPad, B = innerHeight - CFG.boundsPad;
      if (g.x < L){ g.x = L; g.vx = Math.abs(g.vx)*0.4; }
      if (g.x > R){ g.x = R; g.vx = -Math.abs(g.vx)*0.4; }
      if (g.y < T){ g.y = T; g.vy = Math.abs(g.vy)*0.4; }
      if (g.y > B){ g.y = B; g.vy = -Math.abs(g.vy)*0.4; }

      // paint
      g.el.style.left = `${g.x}px`;
      g.el.style.top  = `${g.y}px`;
    }

    requestAnimationFrame(tick);
  }
  tick();
})();
// =================== OVERWHELM UPGRADE ===================
(() => {
  const gauntlet = document.getElementById('gauntlet');
  const host = document.getElementById('ghostSwarm') || gauntlet;
  const spriteInner = document.querySelector('#ghost .sprite')?.innerHTML || '';
  if (!gauntlet || !host || !spriteInner) return;

  // --- Intensity controller (0 → 1.35) based on time inside + scroll progress ---
  let enterTs = performance.now();
  let prog = 0; // gauntlet progress (0..1)
  function updateProg(){
    const r = gauntlet.getBoundingClientRect();
    const vh = innerHeight;
    prog = Math.max(0, Math.min(1, (vh - r.top) / (r.height + vh)));
  }
  addEventListener('scroll', updateProg, {passive:true});
  addEventListener('resize', updateProg);
  updateProg();

  function intensity(){
    const t = (performance.now() - enterTs) / 1000;         // seconds in section
    const timeCurve = Math.min(1, t/18);                    // saturate by ~18s
    const base = Math.max(prog, timeCurve);
    return Math.min(1.35, Math.pow(base, 0.85) * 1.35);     // 0 → 1.35
  }

  // --- Enlarge line pool (noise) ---
  const BIG_LINES = [
    "Need a shortcut?","Summarize this?","Draft a reply?","Compare?","I can translate that.",
    "Estimate result?","Find assumptions?","Edge cases?","Tone-match this?","Verify with humans?",
    "Rewrite for clarity?","Outline it?","Turn into bullet points?","Extract key points?",
    "Check references?","Search that?","What's missing?","Why did it fail?","Show steps?",
    "Make it shorter?","Make it longer?","Refactor text?","Add citations?","Translate & keep style?",
    "Prioritise tasks?","Generate options?","Evaluate this?","Classify that?","Detect bias?",
    "Fix grammar?","Write an email?","Draft a reply?","Explain like I'm 5?","Convert format?",
    "Make a table?","Compare sources?","What if…?","Sanity check?","Find contradictions?"
  ];

  // --- Wire into your Pied-Piper v2 (if present) to ramp its dials ---
  // Looks for window.__PIPER_V2__ globals (created by your v2 block).
  // We can’t mutate private CFG directly, so we add a soft “tweak” loop:
  (function rampFollowers(){
    const raf = () => {
      const k = intensity();                   // 0..1.35
      // Expose some CSS vars the v2 code will pick up visually
      document.body.style.setProperty('--overwhelm', k.toFixed(2));

      // Try to push more ghosts by simulating progress (v2 reads gauntlet prog & time)
      // Also speed up chatter by shortening data-attributes if present
      // (we fall back gracefully if not found).
      const nodes = document.querySelectorAll('.followerGhost .askBubble');
      nodes.forEach(n=>{
        n.style.transitionDuration = (0.25 - Math.min(0.12, k*0.10)) + 's';
      });

      requestAnimationFrame(raf);
    };
    raf();
  })();

  // =================== “Drifters” — moving crowd in lower band ===================
  const DRIFT = {
    countMin: 5,
    countMax: 26,              // grows with intensity
    bandTopVH: 58,             // lower band start
    bandBotVH: 96,             // lower band end
    speedMin: 0.18,
    speedMax: 0.42,
    surgeChance: 0.08,         // chance to surge toward user for ~0.8s
    sayBase: [1000, 2100],     // base cadence; gets faster with intensity
  };

  const drifters = []; // {el,x,y,vx,vy,tx,ty,until, bubble, pool}
  const POOLS = {
    L:["Draft a reply?","Clean up text?","Auto-complete this?","Outline it?","Make a table?"],
    C:["I can explain.","Compare?","Estimate result?","Why did it fail?","Show steps?","What if…?"],
    R:["I can translate that.","Find a source?","Check references?","Tone-match this?","Detect bias?"]
  };

  function bandY(){ return DRIFT.bandTopVH/100 * innerHeight + Math.random()*((DRIFT.bandBotVH-DRIFT.bandTopVH)/100 * innerHeight); }
  function sideX(){
    const side = Math.random()<0.5 ? 'L' : 'R';
    return side==='L' ? innerWidth*0.04 + Math.random()*innerWidth*0.22
                      : innerWidth*0.74 + Math.random()*innerWidth*0.22;
  }

  function makeDrifter(i){
    const el = document.createElement('div');
    el.className = 'drifterGhost';
    el.style.setProperty('--s', (0.56 + Math.random()*0.16).toFixed(2));
    el.innerHTML = `<div class="sprite">${spriteInner}</div><div class="askBubble"></div>`;
    el.style.left = '50%'; el.style.top = '50%'; el.style.opacity = '0';
    host.appendChild(el);

    // random hue tint
    const hues = [0,12,-10,24,-22,40,64];
    el.style.filter = `hue-rotate(${hues[i%hues.length]}deg) drop-shadow(0 10px 24px rgba(0,0,0,.55))`;

    // fade in
    requestAnimationFrame(()=>{
      el.style.transition = 'opacity 600ms ease';
      setTimeout(()=> el.style.opacity = '0.9', 120 + i*60);
    });

    // pick a pool by side band (roughly)
    const side = (parseFloat(el.style.left)||50) < 50 ? 'L' : 'R';
    const pool = POOLS[side] || POOLS.C;

    // eyes + random blink phase (reuse from v2 if you have a helper)
    const eyes = el.querySelectorAll('.eye');
    if (eyes.length===0){
      // best-effort tagging
      el.querySelectorAll('circle').forEach((c,j)=> j<2 && c.classList.add('eye'));
    }
    el.style.setProperty('--blink', (Math.random()*6).toFixed(2)+'s');

    const bubble = el.querySelector('.askBubble');
    bubble.style.transform = `translate(calc(-50% + ${Math.floor(Math.random()*12-6)}px), 4px)`;

    const o = {
      el, bubble, pool,
      x: sideX(), y: bandY(),
      vx: (Math.random()<0.5?-1:1) * (DRIFT.speedMin + Math.random()*(DRIFT.speedMax-DRIFT.speedMin)),
      vy: (Math.random()<0.5?-1:1) * (DRIFT.speedMin + Math.random()*(DRIFT.speedMax-DRIFT.speedMin)),
      until: 0
    };
    scheduleSay(o); scheduleGlitch(o.el);
    drifters.push(o);
  }

  function scheduleSay(o){
    const k = intensity(); // 0..1.35
    const fast = 1 - Math.min(0.55, k*0.45); // shrink interval with intensity
    const [a,b] = DRIFT.sayBase;
    const ms = Math.floor((a + Math.random()*(b-a)) * fast);
    setTimeout(()=>{
      o.bubble.textContent = BIG_LINES[Math.floor(Math.random()*BIG_LINES.length)];
      o.bubble.classList.add('show');
      setTimeout(()=> o.bubble.classList.remove('show'), 1300);
      scheduleSay(o);
    }, ms);
  }

  function scheduleGlitch(node){
    const ms = Math.floor(1800 + Math.random()*3600);
    setTimeout(()=>{ node.classList.add('glitch'); setTimeout(()=> node.classList.remove('glitch'), 170); scheduleGlitch(node); }, ms);
  }

  function wantCount(){
    const k = intensity();
    return Math.floor(DRIFT.countMin + (DRIFT.countMax-DRIFT.countMin) * Math.min(1, k));
  }

  function tick(){
    // ensure population matches intensity
    const target = wantCount();
    while (drifters.length < target) makeDrifter(drifters.length);
    while (drifters.length > target) {
      const g = drifters.pop();
      g.el.remove();
    }

    // move
    const now = performance.now();
    for (const g of drifters){
      // occasional surge toward cursor to feel “closing in”
      if (Math.random() < DRIFT.surgeChance * 0.016 * intensity()){
        g.until = now + 800 + Math.random()*500;
      }
      const toward = now < g.until;

      let ax=0, ay=0;
      if (toward){
        const tx = (window.__aimX__ ?? innerWidth/2);
        const ty = (window.__aimY__ ?? innerHeight/2) + 120; // bias lower
        const dx = tx - g.x, dy = ty - g.y;
        const d = Math.hypot(dx,dy) || 1;
        ax = (dx/d) * 0.55; ay = (dy/d) * 0.55;
      } else {
        // gentle noise
        ax = (Math.random()-0.5) * 0.12;
        ay = (Math.random()-0.5) * 0.12;
      }

      g.vx = (g.vx + ax) * 0.98;
      g.vy = (g.vy + ay) * 0.98;

      g.x += g.vx; g.y += g.vy;

      // bounce softly within the lower band
      const L = 8, R = innerWidth - 8;
      const T = innerHeight * (DRIFT.bandTopVH/100);
      const B = innerHeight * (DRIFT.bandBotVH/100);
      if (g.x < L){ g.x=L; g.vx = Math.abs(g.vx); }
      if (g.x > R){ g.x=R; g.vx = -Math.abs(g.vx); }
      if (g.y < T){ g.y=T; g.vy = Math.abs(g.vy); }
      if (g.y > B){ g.y=B; g.vy = -Math.abs(g.vy); }

      g.el.style.left = `${g.x}px`;
      g.el.style.top  = `${g.y}px`;
      g.el.style.opacity = '0.9';
    }

    // expose cursor for surges (shared)
    window.__aimX__ = (window.__aimX__ ?? innerWidth/2);
    window.__aimY__ = (window.__aimY__ ?? innerHeight/2);

    requestAnimationFrame(tick);
  }
  tick();
})();
