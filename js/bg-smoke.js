// js/bg-smoke.js — slow, natural fog; starts after title reveal
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cvs = document.getElementById('bgSmoke');
  if (!cvs) return;
  const ctx = cvs.getContext('2d');

  let W, H, bw, bh, buf, bctx, img;
  function resize(){
    W = cvs.width  = innerWidth;
    H = cvs.height = innerHeight;
    // low-res buffer for soft fog + perf
    bw = Math.max(320, Math.round(W * 0.35));
    bh = Math.max(200, Math.round(H * 0.35));
    buf = document.createElement('canvas');
    buf.width = bw; buf.height = bh;
    bctx = buf.getContext('2d', { willReadFrequently: true });
    img = bctx.createImageData(bw, bh);
  }
  resize();
  addEventListener('resize', resize);

  // --- tiny hash + fbm noise (unchanged core) ---
  const R = 4096, rn = new Uint32Array(R);
  for (let i=0;i<R;i++) rn[i] = (1103515245*(i+12345)+12345)>>>0;
  const hash=(x,y,z)=> rn[(x*374761393 ^ y*668265263 ^ z*2147483647) & (R-1)];
  const sCurve=t=>t*t*(3-2*t);
  function vnoise(x,y,z){
    const xi=x|0, yi=y|0, zi=z|0;
    const xf=x-xi, yf=y-yi, zf=z-zi; let n=0,w=0;
    for (let dz=0;dz<2;dz++) for (let dy=0;dy<2;dy++) for (let dx=0;dx<2;dx++){
      const h = hash(xi+dx, yi+dy, zi+dz)/0xffffffff;
      const wx=dx?sCurve(xf):1-sCurve(xf);
      const wy=dy?sCurve(yf):1-sCurve(yf);
      const wz=dz?sCurve(zf):1-sCurve(zf);
      const ww=wx*wy*wz; n+=h*ww; w+=ww;
    } return n/w;
  }
  function fbm(x,y,t){ let a=0,amp=1,freq=1; for(let o=0;o<4;o++){ a+=vnoise(x*freq,y*freq,t*freq)*amp; freq*=1.9; amp*=.55;} return a/1.8; }

  // --- look/feel dials (slower, steadier) ---
  const color = { r:170, g:185, b:205 };
  const RISE  = reduce ? 0.0009 : 0.0022;  // vertical advection (smaller = slower)
  const T_FREQ= 0.06;                      // temporal evolution speed (lower = calmer)
  const DENS  = 0.62;                      // overall opacity scale
  const SCALE = 1.2;                       // spatial frequency
  const t0 = performance.now();

  let req = null, running = false;

  function frame(now){
    const t=(now-t0)/1000;
    const adv=t*RISE;                      // steady upwards drift

    const data=img.data; let p=0;
    for (let j=0;j<bh;j++){
      const v=j/(bh-1);
      // gentle fade-in from top (soft horizon)
      const mask = Math.min(1, Math.max(0, (v-0.03)/0.97));
      for (let i=0;i<bw;i++){
        const u=i/(bw-1);

        // stable fbm with slow temporal change, no sine wobble
        const n = fbm(u*SCALE, (v-adv)*SCALE, t*T_FREQ);

        // threshold/contrast shaping → soft fog
        let d = (n - 0.50) * 2.3;          // adjust midpoint & contrast
        if (d < 0) d = 0; else if (d > 1) d = 1;
        d *= mask;

        data[p++]=color.r;
        data[p++]=color.g;
        data[p++]=color.b;
        data[p++]=Math.round(255 * d * DENS);
      }
    }

    bctx.putImageData(img,0,0);

    // normal compositing (no additive "glow" fake look)
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation='source-over';
    ctx.drawImage(buf,0,0,W,H);

    req = requestAnimationFrame(frame);
  }

  function start(){
    if (running) return;
    running = true;
    cvs.classList.add('on');               // CSS fade-in
    req = requestAnimationFrame(frame);
  }
  function stop(){
    if (!running) return;
    running = false;
    cancelAnimationFrame(req);
  }

  // Start after the title locks in
  window.addEventListener('intro:reveal-done', () => {
    setTimeout(start, 600);
  });

  // Optionally start immediately (reduced motion) but keep it faint
  if (reduce){ setTimeout(start, 120); }
})();
