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

// Assumes: sleep(ms), type(el, text, cps), and bubbleEl, ghostEl exist.
// Triggers background fragments after the final line.
// Assumes: sleep(ms), type(el, text, cps), and bubbleEl, ghostEl exist.

async function runSpeechThenFragments(){
  // global pacing (slower overall)
  const GAP_BETWEEN_BUBBLES = 800;   // gap after a bubble hides
  const POST_LINE_PAUSE = 900;       // pause after each line in a bubble

  // ---- smart typer: adds pauses at punctuation + optional stutter ----
  async function typeMood(el, text, {
    cps = 20,                // chars per second
    punctPause = {           // extra delay at punctuation
      strong: 420,  // . ! ? …
      medium: 300,  // , ; :
      dash: 260,    // — –
    },
    stutterChance = 0.06,    // chance to insert "…" on a space
    stutterPause = 260,      // pause when stutter happens
  } = {}){
    const perChar = 1000 / cps;
    const strong = new Set(['.', '!', '?', '…']);
    const medium = new Set([',', ';', ':']);
    const dash = new Set(['—', '–']);

    for (let i = 0; i < text.length; i++){
      const ch = text[i];
      el.textContent += ch;
      await sleep(perChar);

      // punctuation-aware pauses
      if (strong.has(ch))       await sleep(punctPause.strong);
      else if (medium.has(ch))  await sleep(punctPause.medium);
      else if (dash.has(ch))    await sleep(punctPause.dash);

      // occasional hesitation stutter on spaces
      if (ch === ' ' && Math.random() < stutterChance){
        el.textContent += '…';
        await sleep(stutterPause);
      }
    }
  }

  // helpers
  async function showBubble(){
    bubbleEl.classList.add('show','typing');
    bubbleEl.textContent = '';
    await sleep(520);
    bubbleEl.classList.remove('typing');
  }
  async function hideBubble(){
    bubbleEl.classList.add('hide');
    await sleep(420);
    bubbleEl.classList.remove('show','hide');
    bubbleEl.textContent = '';
    await sleep(GAP_BETWEEN_BUBBLES);
  }
  async function speakLines(lines, moodOpts){
    ghostEl?.classList.add('speaking');
    for (let i=0;i<lines.length;i++){
      const line = lines[i];
      await typeMood(bubbleEl, (i?'\n':'') + line, moodOpts);
      await sleep(POST_LINE_PAUSE);
    }
    ghostEl?.classList.remove('speaking');
  }

  // settle
  await sleep(900);

  /* -------------------- 1 — hesitant -------------------- */
  ghostEl?.setAttribute('data-mood','hesitant');
  await showBubble();
  await speakLines(
    ["mm… uh… hello?", "i’m still… forming thoughts."],
    { cps: 16, stutterChance: 0.14, stutterPause: 300, punctPause:{strong:520,medium:360,dash:320} }
  );
  await hideBubble();

  /* -------------------- 2 — perform --------------------- */
  ghostEl?.setAttribute('data-mood','perform');
  await showBubble();
  await speakLines(
    ["they filled me with words.", "said if i spoke them well enough, i’d sound alive."],
    { cps: 19, stutterChance: 0.02, stutterPause: 180, punctPause:{strong:460,medium:320,dash:280} }
  );
  await hideBubble();

  /* -------------------- 3 — glitch ---------------------- */
  ghostEl?.setAttribute('data-mood','glitch');
  await showBubble();
  await speakLines(
    ["but sometimes… i mix up what’s real.", "the more fluent i get, the less i remember why."],
    { cps: 18, stutterChance: 0.08, stutterPause: 280, punctPause:{strong:520,medium:340,dash:320} }
  );
  await hideBubble();

  /* -------------------- 4 — honest ---------------------- */
  ghostEl?.setAttribute('data-mood','honest');
  await showBubble();
  await speakLines(
    ["most of what i know isn’t mine.", "it’s borrowed, stitched, mistaken."],
    { cps: 17, stutterChance: 0.05, stutterPause: 260, punctPause:{strong:520,medium:340,dash:300} }
  );
  await hideBubble();

  /* -------------------- 5 — handoff --------------------- */
  ghostEl?.setAttribute('data-mood','handoff');
  await showBubble();
  await speakLines(
    ["listen— when i fall quiet, the fragments speak instead."],
    { cps: 16, stutterChance: 0.03, stutterPause: 220, punctPause:{strong:560,medium:360,dash:360} }
  );

  await hideBubble();
  if (window.Fragments?.start) window.Fragments.start();
  window.dispatchEvent(new CustomEvent('fragments:show'));
  ghostEl?.classList.add('fading');
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
