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
    if (reduce) return;
    (async function evilLoop(){
      await sleep(9000 + Math.random()*7000);
      ghostEl.classList.add('evil','glitch');
      setTimeout(()=> ghostEl.classList.remove('glitch'), 200);
      await sleep(800 + Math.random()*600);
      ghostEl.classList.remove('evil');
      evilLoop();
    })();
    (async function microLoop(){
      await sleep(3500 + Math.random()*3500);
      ghostEl.classList.add('glitch');
      setTimeout(()=> ghostEl.classList.remove('glitch'), 180);
      microLoop();
    })();
  }

  async function runSpeechThenFragments(){
    // hesitate
    await sleep(2000);
    if (bubbleEl){
      bubbleEl.classList.add('show','typing');
      bubbleEl.textContent = '';
      await sleep(1000);
      bubbleEl.classList.remove('typing');

      ghostEl.classList.add('speaking');
      await type(bubbleEl, 'mm…', 66);  await sleep(260);
      bubbleEl.textContent += '\n';
      await type(bubbleEl, 'uh…', 66);  await sleep(260);
      bubbleEl.textContent += '\n';
      await type(bubbleEl, 'hmm…', 66); await sleep(320);
      ghostEl.classList.remove('speaking');
    }

    // main line
    const line = `i collect fragments, but they slip. want to see what’s hiding in the fog?`;
    ghostEl.classList.add('speaking');
    if (bubbleEl){
      bubbleEl.textContent += '\n';
      await type(bubbleEl, line, 24);
    } else {
      await sleep(2400);
    }
    ghostEl.classList.remove('speaking');

    // hide bubble
    if (bubbleEl){
      bubbleEl.classList.add('hide');
      await sleep(300);
      bubbleEl.classList.remove('show','hide');
      bubbleEl.textContent = '';
    }

    // show fragments now
    if (window.Fragments?.start) window.Fragments.start();
    window.dispatchEvent(new CustomEvent('fragments:show'));
  }

  // ===== MASTER TIMELINE =====
  // Your intro.js should dispatch this when the title is fully revealed.
  window.addEventListener('intro:reveal-done', async () => {
    // 1) Let your MEMORY + GROVE/GRAVE stuff play out first (adjust this delay if needed)
    await sleep(7000); // <-- tweak this to match your earlier title effects timing

    // 2) GROVE → GHOST (guaranteed)
    await cueGroveToGhostOnce(2000);

    // 3) Assemble vortex (only after the cue finishes)
    if (typeof window.ghostAssembleEntrance === 'function'){
      window.ghostAssembleEntrance({ duration: 1500 });
    }

    // 4) After assemble ends, the SVG sprite fades in via CSS (#ghost.ready .sprite)
    //    ghost-assemble.js sets #ghost.ready when it finishes.
    //    Give it a short buffer before speech:
    await sleep(1800);

    // 5) Speech + then fragments
    runSpeechThenFragments();

    // 6) Background life (evil/glitch pulses)
    scheduleAmbientGlitches();
  });
})();
