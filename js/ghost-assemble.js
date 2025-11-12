// js/ghost-assemble.js — vortex of glyphs assembles into the ghost (Promise API)
(() => {
  const ghost = document.getElementById('ghost');
  if (!ghost) return;

  const sprite = ghost.querySelector('.sprite');
  let ranOnce = false;

  async function ghostAssembleEntrance(opts = {}) {
    // Prevent double-runs
    if (ranOnce) return Promise.resolve();
    ranOnce = true;

    const DUR    = opts.duration ?? 1500;      // ms for swirl-in
    const COUNT  = opts.count ?? 230;          // particles
    const R_MIN  = opts.rMin ?? 70;
    const R_MAX  = opts.rMax ?? 120;
    const CHARSET = opts.charset ?? "01#@&%+=*•·<>/\\{}[]()ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Ensure the container itself is visible (but keep the sprite hidden by CSS until ready)
    requestAnimationFrame(() => ghost.classList.add('on')); // ghost container fades in (sprite opacity stays 0 until .ready)  <-- css handles this

    // Measure the sprite box for canvas size
    const box = sprite.getBoundingClientRect();
    const CSS_W = Math.max(120, box.width  || 140);
    const CSS_H = Math.max(140, box.height || 170);
    const dpr   = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    // Canvas sits above the sprite while assembling
    const cvs = document.createElement('canvas');
    cvs.className = 'assemble';
    cvs.style.width  = CSS_W + 'px';
    cvs.style.height = CSS_H + 'px';
    cvs.width  = Math.round(CSS_W * dpr);
    cvs.height = Math.round(CSS_H * dpr);
    sprite.appendChild(cvs);

    const ctx = cvs.getContext('2d');
    ctx.scale(dpr, dpr);

    const cx = CSS_W / 2;
    const cy = CSS_H / 2;

    // Build particles
    const parts = [];
    for (let i = 0; i < COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = R_MIN + Math.random() * (R_MAX - R_MIN);
      const life  = DUR * (0.85 + Math.random() * 0.35);
      const start = performance.now() + Math.random() * 120;
      const char  = CHARSET[(Math.random() * CHARSET.length) | 0];
      const swirl = (Math.random() < .5 ? -1 : 1) * (0.9 + Math.random() * 0.8);
      const fs    = 8 + Math.random() * 6;
      const hue   = Math.random() < 0.5 ? -35 : 165; // magenta/cyan shimmer

      parts.push({ a, r, life, start, char, swirl, fs, hue });
    }

    const t0 = performance.now();
    const easeOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

    return new Promise(resolve => {
      function frame(now) {
        ctx.clearRect(0, 0, CSS_W, CSS_H);

        let active = 0;
        for (const p of parts) {
          if (now < p.start) continue;
          active++;

          const t = Math.min(1, (now - p.start) / p.life);
          const e = easeOutExpo(t);

          // spiral inward
          const aNow = p.a + e * p.swirl * 3.2;
          const rNow = (1 - e) * p.r;
          const x = cx + Math.cos(aNow) * rNow;
          const y = cy + Math.sin(aNow) * rNow;

          // slight life jitter
          const jx = Math.sin((now + p.r) * 0.01) * 0.6;
          const jy = Math.cos((now - p.r) * 0.012) * 0.6;

          // alpha in/out
          const alpha = Math.min(1, t * 2) * (1 - Math.max(0, t - 0.7) / 0.3);

          ctx.save();
          ctx.translate(x + jx, y + jy);
          ctx.rotate(aNow * 0.08);

          ctx.globalAlpha = 0.55 * alpha;
          ctx.fillStyle = `hsl(${p.hue}, 85%, 70%)`;
          ctx.font = `${p.fs}px ui-monospace, SFMono-Regular, Consolas, Menlo, monospace`;
          ctx.fillText(p.char, 0, 0);

          ctx.globalAlpha = 0.35 * alpha;
          ctx.fillStyle = `hsl(${p.hue + 200}, 85%, 70%)`;
          ctx.fillText(p.char, -1.5, 0.5);
          ctx.restore();
        }

        // tiny container jitter early
        const prog = Math.min(1, (now - t0) / DUR);
        if (prog < 0.9) {
          const j = (1 - prog) * 1.1;
          ghost.style.transform = `translateX(-50%) translateY(${j * Math.sin(now * 0.04)}px)`;
        } else {
          ghost.style.transform = `translateX(-50%)`;
        }

        if (active > 0) {
          requestAnimationFrame(frame);
        } else {
          // handoff: fade canvas, reveal sprite
          ghost.classList.add('ready'); // your CSS fades the sprite in
          cvs.style.transition = 'opacity 300ms ease';
          cvs.style.opacity = '0';
          setTimeout(() => {
            cvs.remove();
            resolve();
          }, 320);
        }
      }

      requestAnimationFrame(frame);
    });
  }

  // expose
  window.ghostAssembleEntrance = ghostAssembleEntrance;
})();
