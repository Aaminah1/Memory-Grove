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
