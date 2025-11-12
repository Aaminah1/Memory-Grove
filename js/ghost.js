// js/ghost.js — GROVE→GHOST cue (guaranteed), then assemble, then speech → fragments
(() => {
  if (window.__GHOST_SEQ__) return;
  window.__GHOST_SEQ__ = true;

  const reduce   = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const titleEl  = document.getElementById('title');
  const ghostEl  = document.getElementById('ghost');
  const bubbleEl = document.getElementById('ghostBubble');
  if (!titleEl || !ghostEl) return;

  /* ---------- utils ---------- */
  function setupBlinkRandomization(){
  const ghostEl  = document.getElementById('ghost');
  if (!ghostEl) return;

  // randomize baseline rhythm a little each load
  const baseDur   = 3.6 + Math.random()*1.2;  // 3.6–4.8s
  const baseDelay = 0.7 + Math.random()*0.6;  // 0.7–1.3s
  ghostEl.style.setProperty('--blinkDur',   `${baseDur.toFixed(2)}s`);
  ghostEl.style.setProperty('--blinkDelay', `${baseDelay.toFixed(2)}s`);

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // every 2–5s: nudge a quick blink
  (function blinkLoop(){
    const wait = 2000 + Math.random()*3000;
    setTimeout(() => {
      ghostEl.classList.add('blink-now');
      // clear quickly so CSS can reapply next time
      setTimeout(() => ghostEl.classList.remove('blink-now'), 160);
      blinkLoop();
    }, wait);
  })();

  // sometimes do a "double-blink" (every 8–14s)
  (function dblLoop(){
    const wait = 8000 + Math.random()*6000;
    setTimeout(() => {
      ghostEl.classList.add('double-blink');
      setTimeout(() => ghostEl.classList.remove('double-blink'), 260);
      dblLoop();
    }, wait);
  })();
}

const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));
function waitForTransitionEnd(el, timeout=800){
  return new Promise(resolve=>{
    let done=false;
    const onEnd = ()=>{ if(done) return; done=true; el.removeEventListener('transitionend', onEnd); resolve(); };
    el.addEventListener('transitionend', onEnd, { once:true });
    setTimeout(onEnd, timeout); // fallback
  });
}

function waitForAnimationEnd(el, name=null, timeout=1500){
  return new Promise(resolve=>{
    let done=false;
    const onEnd = (e)=>{
      if (done) return;
      if (name && e.animationName !== name) return; // if a name is provided, match it
      done=true; el.removeEventListener('animationend', onEnd);
      resolve();
    };
    el.addEventListener('animationend', onEnd);
    setTimeout(()=>{ if(!done){ done=true; el.removeEventListener('animationend', onEnd); resolve(); } }, timeout);
  });
}

function setGhostOffset(xPx, yPx){
  ghostEl.style.setProperty('--tx', `${xPx|0}px`);
  ghostEl.style.setProperty('--ty', `${yPx|0}px`);
}
function viewportBox(padVw = 6, padVh = 8){
  const vw = Math.max(320, window.innerWidth  || 320);
  const vh = Math.max(320, window.innerHeight || 320);
  const xPad = vw * (padVw/100);
  const yPad = vh * (padVh/100);
  return { vw, vh, xPad, yPad };
}
/* =========================================================
   WANDER MODE: gentle roaming + occasional offscreen slip
========================================================= */
let _wanderStop = false;

async function startWanderMode(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // respect user
  _wanderStop = false;
  ghostEl.classList.add('wander');

  // start near current spot
  setGhostOffset(0,0);

  while(!_wanderStop){
    await wanderStep();               // pick a new target & move there
    if (_wanderStop) break;

    // 1 in 4 times: slip offscreen and re-enter with a glitch
    if (Math.random() < 0.25){
      await slipOffAndReturn();
    }

    // idle pause before next step
    await sleep(400 + Math.random()*600);
  }
}

function stopWanderMode(){
  _wanderStop = true;
  ghostEl.classList.remove('wander');
  // reset offsets
  setGhostOffset(0,0);
}

async function wanderStep(){
  const { vw, vh, xPad, yPad } = viewportBox(10, 12);

  // target around the center: +/- 28vw horizontally, +/- 14vh vertically
  const xMax = vw * 0.28;
  const yMax = vh * 0.14;
  const tx = (Math.random()*2 - 1) * xMax;
  const ty = (Math.random()*2 - 1) * yMax;

  // duration scales with distance (so long moves feel slower)
  const dist = Math.hypot(tx - getPx('--tx'), ty - getPx('--ty'));
  const dur  = clamp(map(dist, 60, xMax, 1400, 2600), 900, 3000);

  // apply “travel” transition briefly (CSS long-ease in .wander helps)
  setGhostOffset(tx, ty);
  await sleep(dur);
}

async function slipOffAndReturn(){
  const { vw, vh } = viewportBox();
  const fromRight = Math.random() < 0.5;

  // Fly off towards a side and fade a bit
  const exitX = (fromRight ? vw*0.75 : -vw*0.75);
  const exitY = (Math.random()*2 - 1) * (vh*0.18);
  setGhostOffset(exitX, exitY);
  ghostEl.style.opacity = '0.35';
  ghostEl.classList.add('glitch'); // little chroma slice on the way out
  setTimeout(()=>ghostEl.classList.remove('glitch'), 220);
  await sleep(900 + Math.random()*500);

  // Re-enter from the opposite side with a pop
  const enterX = (fromRight ? -vw*0.55 : vw*0.55);
  const enterY = (Math.random()*2 - 1) * (vh*0.12);
  setGhostOffset(enterX, enterY);
  ghostEl.style.opacity = '0.55';
  ghostEl.classList.add('glitch');
  setTimeout(()=>ghostEl.classList.remove('glitch'), 220);
  await sleep(600 + Math.random()*400);

  // Then drift back near center
  const tx = (Math.random()*2 - 1) * (vw*0.20);
  const ty = (Math.random()*2 - 1) * (vh*0.10);
  setGhostOffset(tx, ty);
  ghostEl.style.opacity = '0.65';
  await sleep(900 + Math.random()*600);
}

/* small utilities for wander */
function getPx(varName){
  const v = getComputedStyle(ghostEl).getPropertyValue(varName);
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}
function map(x, inMin, inMax, outMin, outMax){
  const t = (x - inMin) / (inMax - inMin);
  return outMin + (Math.max(0, Math.min(1, t)) * (outMax - outMin));
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }


  function getLetterSpans(){
    return Array.from(titleEl.querySelectorAll('.ch'));
  }

  // Find “ GROVE” and wrap it so we can safely swap letters
  function wrapWordIfNeeded(word='GROVE'){
    const letters = getLetterSpans();
    if (!letters.length) return null;

    const W = word.toUpperCase();
    for (let i=1; i<=letters.length - W.length; i++){
      const prev = letters[i-1]?.textContent;
      const slice = letters.slice(i, i+W.length).map(n=>n.textContent).join('');
      if ((prev===' ' || prev==='\u00A0') && slice === W){
        if (letters[i].parentElement?.classList.contains('wordWrap')){
          return letters[i].parentElement;
        }
        const wrap = document.createElement('span');
        wrap.className = 'wordWrap';
        wrap.dataset.word = W;
        const parent = letters[i].parentNode;
        parent.insertBefore(wrap, letters[i]);
        for (let k=0; k<W.length; k++) wrap.appendChild(letters[i+k]);
        return wrap;
      }
    }
    return null;
  }

  // Robust cue: retry a few times if another title effect is still mutating DOM
  async function cueGroveToGhostOnce(visibleMs=2000, retries=6, gap=180){
    for (let attempt = 0; attempt <= retries; attempt++){
      const wrap = wrapWordIfNeeded('GROVE');
      if (wrap){
        const inner = Array.from(wrap.childNodes).filter(n => n.nodeType===1);
        if (inner.length === 5){
          const ghost = 'GHOST'.split('');
          inner.forEach((el,i)=>{
            el.dataset._orig = el.textContent;
            el.textContent = ghost[i];
          });
          wrap.dataset.word = 'GHOST';
          wrap.classList.add('rgbWord','wobble');

          await sleep(visibleMs);

          inner.forEach(el=>{
            if (el.dataset._orig){
              el.textContent = el.dataset._orig;
              delete el.dataset._orig;
            }
          });
          wrap.dataset.word = 'GROVE';
          wrap.classList.remove('rgbWord','wobble');
          return true; // success
        }
      }
      await sleep(gap);
    }
    return false; // couldn’t find/wrap
  }

  async function type(el, text, speed=22){
    el.classList.add('show');
    el.textContent = '';
    for (let i=0;i<text.length;i++){
      el.textContent += text[i];
      await sleep(speed + Math.random()*10);
    }
  }

function scheduleAmbientGlitches(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // frequent small glitches: 3–6s
  (function microLoop(){
    const wait = 3000 + Math.random()*3000;
    setTimeout(() => {
      ghostEl.classList.add('glitch');
      setTimeout(() => ghostEl.classList.remove('glitch'), 200);
      microLoop();
    }, wait);
  })();

  // rarer strong glitch + evil face: 10–18s
  (function strongLoop(){
 const wait = 7000 + Math.random()*6000; 
    setTimeout(async () => {
      ghostEl.classList.add('evil','glitch');
      setTimeout(() => ghostEl.classList.remove('glitch'), 220);
      await new Promise(r => setTimeout(r, 900 + Math.random()*700));
      ghostEl.classList.remove('evil');
      strongLoop();
    }, wait);
  })();
}

// --- short lines for the GAI metaphor (choose one at random) ---
const BUBBLE_SCRIPTS = [
  "i speak with borrowed breath.\nwhen i fall quiet, the fragments answer.",
  "i’m stitched from other people’s words.\nwatch what unravels when i stop.",
  "i can perform meaning, not remember it.\nafter this, let the fragments tell you what i can’t."
];

// --- SHORT INTRO: one bubble → hide → fly ghost → show scroll hint → start fragments ---
async function runSpeechThenFragments(){
  const ghostEl  = document.getElementById('ghost');
  const bubbleEl = document.getElementById('ghostBubble');
  const scrollEl = document.getElementById('scrollHint');
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

  async function type(el, text, cps=24){
    el.classList.add('show');
    el.textContent = '';
    const perChar = 1000 / cps;
    for (let i=0; i<text.length; i++){
      el.textContent += text[i];
      await sleep(perChar);
    }
  }
async function showBubble(){
  bubbleEl.classList.remove('hide');
  bubbleEl.classList.add('show');
  // small delay so CSS transition can kick in
  await sleep(50);
}

async function hideBubble(){
  bubbleEl.classList.remove('show');
  bubbleEl.classList.add('hide');
  await waitForTransitionEnd(bubbleEl, 500); // wait for opacity/scale
  bubbleEl.classList.remove('hide');
  bubbleEl.textContent = '';
}

  const line = BUBBLE_SCRIPTS[Math.floor(Math.random()*BUBBLE_SCRIPTS.length)];
  ghostEl?.setAttribute('data-mood','honest');

  await showBubble();
  await type(bubbleEl, line, 24);
  await sleep(400);
  await hideBubble();

  if (window.Fragments?.start) window.Fragments.start();
window.dispatchEvent(new CustomEvent('fragments:show'));

// 1) fly away
ghostEl.classList.add('flyaway');
// wait for the keyframes named in your CSS: @keyframes ghostFlyAway
await waitForAnimationEnd(ghostEl, 'ghostFlyAway', 1200);
// clean up the flyaway class so future transforms aren’t fighting it
ghostEl.classList.remove('flyaway');

// 2) now begin gentle roaming (and only now)
startWanderMode();

// 3) hint
setTimeout(()=>document.getElementById('scrollHint')?.classList.add('show'), 600);
}
function scheduleGhostColorGlitches(opts={}){
  const {
    minDelay = 6500,   // ~6.5s
    maxDelay = 9000,   // to ~9s (adds randomness)
    strongEvery = 3    // every 3rd pulse is stronger
  } = opts;

  let n = 0;
  const jitter = () => Math.floor(minDelay + Math.random()*(maxDelay-minDelay));

  const loop = () => {
    const strong = (++n % strongEvery === 0);
    if (strong) ghostEl.classList.add('glitch-strong');
    ghostEl.classList.add('glitch');

    // clear the flags shortly after
    setTimeout(() => {
      ghostEl.classList.remove('glitch');
      if (strong) ghostEl.classList.remove('glitch-strong');
    }, strong ? 320 : 220);

    setTimeout(loop, jitter());
  };

  setTimeout(loop, jitter()); // first run
}

  

// ===== MASTER TIMELINE =====
window.addEventListener('intro:reveal-done', async () => {
  const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));

  // 0) Let your MEMORY / GROVE-GRAVE intro play first
  await sleep(7000); // adjust to your title timing

  // 1) Flash GROVE → GHOST (your existing cue)
  await cueGroveToGhostOnce(2000); // ~2s

  // 2) Jumpscare slam (then continue)
   if (typeof window.ghostElectricIntro === 'function') {
    await window.ghostElectricIntro({
      duration: 1500,  // try 1800 for more drama
      hold: 220,
      size: 1.35,      // visual scale of the overlay
      bolts: 5,
      waves: 3
    });
  }

  // 3) Assemble burst (promise-safe: works whether assemble returns a Promise or not)
  const DUR = 2200, HOLD = 350, BUF = 120; // keep these in sync with your assemble dials
  let assembleResult;
  if (typeof window.ghostAssembleEntrance === 'function') {
    assembleResult = window.ghostAssembleEntrance({
      duration: DUR,
      hold: HOLD,
      scale: 1.35,
      count: 520
    });
  }

  if (assembleResult && typeof assembleResult.then === 'function') {
    // assemble returns a Promise → await it
    await assembleResult;
  } else {
    // assemble is fire-and-forget → wait for its duration + hold + buffer
    await sleep(DUR + HOLD + BUF);
  }

  // 4) Slight buffer, then speech + fragments
 await runSpeechThenFragments();

startWanderMode();
  setupBlinkRandomization();
  // 5) Ambient glitches/evil pulses in the background
  scheduleAmbientGlitches();
});


})();
