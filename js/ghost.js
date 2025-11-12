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
  const sleep = (ms)=> new Promise(r=>setTimeout(r, ms));

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
    bubbleEl.classList.add('show');
    bubbleEl.textContent = '';
    await sleep(200);
  }
  async function hideBubble(){
    bubbleEl.classList.add('hide');
    await sleep(350);
    bubbleEl.classList.remove('show','hide');
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

  ghostEl?.classList.add('flyaway');                 // needs the CSS we added earlier
  setTimeout(() => document.getElementById('scrollHint')?.classList.add('show'), 1000);
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
  await sleep(250);
  runSpeechThenFragments();

  // 5) Ambient glitches/evil pulses in the background
  scheduleAmbientGlitches();
});


})();
