// js/ghost.js — Full-body ghost with slow entrance + interval chatter
(() => {
  if (window.Ghost) return;

  function el(tag, cls){ const n = document.createElement(tag); if(cls) n.className = cls; return n; }

  function buildGhostDOM(){
    const wrap = el('div','ghost');          // root
    wrap.setAttribute('aria-hidden','true');
    wrap.innerHTML = `
      <div class="wrap">
        <div class="aura"></div>
        <div class="body"></div>
        <div class="blob"></div>
        <div class="hem"></div>
        <div class="arm left"></div>
        <div class="arm right"></div>
        <div class="tail"></div>
        <div class="eye left"></div>
        <div class="eye right"></div>
        <div class="bubble" role="status" aria-live="polite"></div>
      </div>`;
    return wrap;
  }

  function mount(root=document.body){
    const elRoot = buildGhostDOM();
    root.appendChild(elRoot);

    let chatterTimer = null;
    let blinkTimer = null;

    const api = {
      el: elRoot,

// inside build/module API in ghost.js
show(x='50%', y='56vh', opts={}){
  const {
    delayMs = 1400,
    slowFade = true,
    variant  = 'sheet',    // 'sheet' | 'wisp'
    pureSheet= true,       // hide blob/tail
    tall     = true,       // elongate body
    noArms   = true        // hide arms
  } = opts;

  elRoot.style.left = typeof x === 'number' ? `${x}px` : x;
  elRoot.style.top  = typeof y === 'number' ? `${y}`   : y;
  if (slowFade) elRoot.classList.add('slowfade');

  elRoot.classList.toggle('variant-sheet', variant === 'sheet');
  elRoot.classList.toggle('variant-wisp',  variant === 'wisp');
  elRoot.classList.toggle('noblob', !!pureSheet);
  elRoot.classList.toggle('tall',   !!tall);
  elRoot.classList.toggle('noarms', !!noArms);

  setTimeout(()=>{ elRoot.style.opacity=''; elRoot.classList.add('on'); }, Math.max(0, delayMs));

  startBlinking();
  return api;
},

      whisper(text='', { glitch=false, holdMs=2600 }={}){
        const bubble = elRoot.querySelector('.bubble');
        if (!bubble) return api;
        bubble.textContent = String(text);
        if (glitch){ bubble.classList.remove('glitch'); void bubble.offsetWidth; bubble.classList.add('glitch'); }
        bubble.classList.add('on');
        clearTimeout(bubble._t);
        bubble._t = setTimeout(()=> bubble.classList.remove('on'), Math.max(900, holdMs));
        return api;
      },

      startChatter(messages=[], { minMs=4200, maxMs=8200, holdMs=2400 }={}){
        stopChatter();
        if (!Array.isArray(messages) || messages.length === 0) return api;
        const pick = () => messages[Math.floor(Math.random()*messages.length)];
        const loop = () => {
          const line = pick();
          const glitch = Math.random() < 0.45;
          api.whisper(line, { glitch, holdMs });
          const next = Math.floor(minMs + Math.random()*(maxMs - minMs));
          chatterTimer = setTimeout(loop, next);
        };
        const firstDelay = Math.floor(minMs + Math.random()*(maxMs - minMs));
        chatterTimer = setTimeout(loop, firstDelay);
        return api;
      },

      stopChatter(){ stopChatter(); return api; }
    };

    function stopChatter(){ if (chatterTimer) { clearTimeout(chatterTimer); chatterTimer = null; } }

    function startBlinking(){
      stopBlinking();
      const node = elRoot;
      const blink = () => {
        node.classList.add('blink');
        setTimeout(()=> node.classList.remove('blink'), 100);
        const next = 2600 + Math.random()*3800;
        blinkTimer = setTimeout(blink, next);
      };
      blinkTimer = setTimeout(blink, 2400 + Math.random()*1200);
    }
    function stopBlinking(){ if (blinkTimer) { clearTimeout(blinkTimer); blinkTimer = null; } }

    return api;
  }

  window.Ghost = { mount };
})();
