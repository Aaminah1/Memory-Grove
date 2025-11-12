// js/ghost-electric.js — Electric/Frequency emergence for the ghost (one-shot)
(() => {
  const ghost = document.getElementById('ghost');
  if (!ghost) return;

  function randomBoltPath(w, h, cx, cy){
    // lightning-ish from edge toward center
    const startSide = Math.floor(Math.random()*4);
    let x = (startSide===0)? 0 : (startSide===1? w : (startSide===2? Math.random()*w : Math.random()*w));
    let y = (startSide===0)? Math.random()*h : (startSide===1? Math.random()*h : (startSide===2? 0 : h));
    const pts = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];
    const steps = 7 + (Math.random()*6|0);
    for (let i=0;i<steps;i++){
      const t = (i+1)/steps;
      // lerp toward center with jitter
      const tx = x + (cx-x)*t + (Math.random()-0.5)*22;
      const ty = y + (cy-y)*t + (Math.random()-0.5)*22;
      pts.push(`L ${tx.toFixed(1)} ${ty.toFixed(1)}`);
    }
    return pts.join(' ');
  }

  function makeSine(d, amp, freq, phase, steps){
    const pts = [];
    for (let i=0;i<=steps;i++){
      const t = i/steps;
      const x = d.x0 + t*(d.x1-d.x0);
      const y = d.y0 + t*(d.y1-d.y0) + Math.sin(t*freq*2*Math.PI + phase)*amp;
      pts.push(`${i===0?'M':'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }

  function ghostElectricIntro(opts = {}){
    const DUR     = opts.duration ?? 1400;           // total time of effect
    const HOLD    = opts.hold     ?? 200;            // linger before fade
    const SIZE    = opts.size     ?? 1.25;           // overlay scale vs sprite
    const BOLTS   = opts.bolts    ?? 4;              // # of lightning bolts
    const WAVES   = opts.waves    ?? 3;              // # of oscillating waves
    const onDone  = opts.after    ?? (()=>{});

    // ensure ghost container is visible during intro
    ghost.classList.add('on','charging');

    // Build overlay SVG
    const wrap = document.createElementNS('http://www.w3.org/2000/svg','svg');
    wrap.setAttribute('class','electric-intro');
    wrap.setAttribute('viewBox','0 0 300 300');
    wrap.style.animation = 'boltPulse 220ms ease-in-out infinite';

    // defs: noise + displacement for shiver
    const defs = document.createElementNS(wrap.namespaceURI,'defs');
    const turb = document.createElementNS(wrap.namespaceURI,'feTurbulence');
    turb.setAttribute('type','fractalNoise');
    turb.setAttribute('baseFrequency','0.9');
    turb.setAttribute('numOctaves','1');
    turb.setAttribute('seed', String((Math.random()*1000)|0));
    turb.setAttribute('result','noise');

    const disp = document.createElementNS(wrap.namespaceURI,'feDisplacementMap');
    disp.setAttribute('in','SourceGraphic');
    disp.setAttribute('in2','noise');
    disp.setAttribute('scale','6');
    disp.setAttribute('xChannelSelector','R');
    disp.setAttribute('yChannelSelector','G');

    const filt = document.createElementNS(wrap.namespaceURI,'filter');
    filt.setAttribute('id','elecDistort');
    filt.appendChild(turb); filt.appendChild(disp);
    defs.appendChild(filt);
    wrap.appendChild(defs);

    const g = document.createElementNS(wrap.namespaceURI,'g');
    g.setAttribute('filter','url(#elecDistort)');
    wrap.appendChild(g);

    // center
    const cx = 150, cy = 150;

    // Waves (concentric-ish oscillations)
    for (let i=0;i<WAVES;i++){
      const path = document.createElementNS(wrap.namespaceURI,'path');
      const r    = 52 + i*22;
      const amp  = 6 + i*3;
      const freq = 3 + i;
      const phase= Math.random()*Math.PI*2;
      const steps= 90;

      path.setAttribute('d', makeSine({x0: cx-r, y0: cy, x1: cx+r, y1: cy}, amp, freq, phase, steps));
      path.setAttribute('fill','none');
      path.setAttribute('stroke','hsl(195, 100%, 72%)');
      path.setAttribute('stroke-width', String(1.6 - i*0.3));
      path.setAttribute('stroke-linecap','round');
      path.setAttribute('stroke-dasharray','12 10');
      path.style.animation = `dashFlow ${520 + i*120}ms linear infinite`;
      g.appendChild(path);
    }

    // Bolts
    for (let b=0;b<BOLTS;b++){
      const bolt = document.createElementNS(wrap.namespaceURI,'path');
      bolt.setAttribute('d', randomBoltPath(300,300,cx,cy));
      bolt.setAttribute('fill','none');
      bolt.setAttribute('stroke','hsl(195, 100%, 85%)');
      bolt.setAttribute('stroke-width','2.5');
      bolt.setAttribute('stroke-linecap','round');
      bolt.setAttribute('stroke-opacity','0.0'); // will flicker in
      g.appendChild(bolt);

      // quick flicker schedule
      const flickerTimes = 3 + (Math.random()*2|0);
      for (let k=0;k<flickerTimes;k++){
        setTimeout(()=>{
          bolt.setAttribute('stroke-opacity','1');
          setTimeout(()=> bolt.setAttribute('stroke-opacity','0.0'), 70 + (Math.random()*60|0));
        }, 90 + b*60 + k*(140 + (Math.random()*60|0)));
      }
    }

    // Mount overlay and scale
    ghost.appendChild(wrap);
    // scale by CSS width/height of .electric-intro: bump via SIZE
    const baseW = Math.min(window.innerWidth*0.34, 420);
    wrap.style.width  = `${baseW*SIZE}px`;
    wrap.style.height = `${baseW*SIZE}px`;

    // Timers: end => fade overlay + reveal sprite
    const endAt = performance.now() + DUR;

    // ensure the ghost sprite fades in once electricity finishes
    setTimeout(() => {
      wrap.style.transition = 'opacity 260ms ease';
      wrap.style.opacity = '0';
      ghost.classList.add('ready'); // your CSS fades in .sprite
      ghost.style.animation = 'settleGlow 600ms ease forwards';
      setTimeout(() => {
        ghost.classList.remove('charging');
        wrap.remove();
        onDone();
      }, 280);
    }, DUR + HOLD);

    // return a Promise so callers can await completion
    return new Promise(resolve => {
      setTimeout(resolve, DUR + HOLD + 300);
    });
  }

  // expose globally
  window.ghostElectricIntro = ghostElectricIntro;
})();
