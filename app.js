// ---------- CONFIG ----------
const API_URL = 'https://memory-grove-api.vercel.app/api/ghost';

// ---------- STATE ----------
let selectedClass = null;     // 'green' | 'yellow' | 'red'
let activeFilter  = 'all';    // 'all' | 'green' | 'yellow' | 'red'

// ---------- UTIL ----------
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}
function setStep(active) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const map = { ask:'.step-ask', read:'.step-read', classify:'.step-classify', plant:'.step-plant' };
  document.querySelector(map[active] || '.step-ask')?.classList.add('active');
}
function escapeHTML(s='') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// Wait until #tombstoneText has *finished* appearing (handles CSS anim/transition OR typewriter changes)
function revealClassifyAfterText(tombTextEl, classifyBoxEl) {
  // always start hidden
  classifyBoxEl.hidden = true;

  const show = () => {
    if (!classifyBoxEl.hidden) return; // already shown
    // next frame to ensure final paint is done
    requestAnimationFrame(() => {
      classifyBoxEl.hidden = false;
      setStep('classify');
      document.querySelector('.classify-row button')?.focus();
    });
  };

  // If the element is being animated via CSS:
  const cs = getComputedStyle(tombTextEl);
  const hasAnim = cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0;
  const hasTrans = parseFloat(cs.transitionDuration) > 0;

  let done = false;
  const finish = () => { if (!done) { done = true; cleanup(); show(); } };

  // Mutation-based watcher: if text keeps changing (typewriter), wait until it stabilizes.
  let stableTimer = null;
  const OBSERVE_STABLE_MS = 160; // time with no changes = "finished"
  const mo = new MutationObserver(() => {
    clearTimeout(stableTimer);
    stableTimer = setTimeout(finish, OBSERVE_STABLE_MS);
  });
  mo.observe(tombTextEl, { characterData: true, subtree: true, childList: true });

  // CSS hooks
  const onEnd = () => finish();
  if (hasAnim) tombTextEl.addEventListener('animationend', onEnd, { once: true });
  if (hasTrans) tombTextEl.addEventListener('transitionend', onEnd, { once: true });

  // Safety: if none of the above trigger, show next frame
  const safety = setTimeout(finish, 0);

  function cleanup() {
    try { mo.disconnect(); } catch {}
    clearTimeout(stableTimer);
    clearTimeout(safety);
  }
}

// ---------- APP ----------
window.addEventListener('DOMContentLoaded', () => {
  // Tabs
  const tabAsk = document.getElementById('tab-ask');
  const tabGrove = document.getElementById('tab-grove');
  const ghostSection = document.getElementById('ghostSection');
  const groveSection = document.getElementById('groveSection');

  tabAsk.addEventListener('click', () => {
    tabAsk.classList.add('active'); tabGrove.classList.remove('active');
    ghostSection.hidden = false;    groveSection.hidden = true;
  });
  tabGrove.addEventListener('click', () => {
    tabGrove.classList.add('active'); tabAsk.classList.remove('active');
    ghostSection.hidden = true;      groveSection.hidden = false;
    renderSeeds();
  });

  // Nudge → go to Grove
  const groveNudge  = document.getElementById('groveNudge');
  const gotoGrove   = document.getElementById('gotoGrove');
  if (gotoGrove) {
    gotoGrove.addEventListener('click', () => {
      document.getElementById('tab-grove').click();
      groveNudge.hidden = true;
    });
  }

  // Ask
  const askForm = document.getElementById('askForm');
  const askBtn  = document.getElementById('askBtn');
  const questionEl = document.getElementById('question');

  const tombstone = document.getElementById('tombstoneSection');
  const tombText  = document.getElementById('tombstoneText');
  const skeleton  = document.getElementById('skeleton');
  const errorBox  = document.getElementById('errorBox');

  const classifyBox = document.getElementById('classifyBox'); // <-- the whole "Choose how it feels" block

  const plantBtn  = document.getElementById('plantBtn');
  const selectedChip = document.getElementById('selectedChip');
  const tabGroveBtn = document.getElementById('tab-grove');

  // Enable/disable Ask based on input length
  questionEl.addEventListener('input', () => {
    askBtn.disabled = questionEl.value.trim().length < 3;
  });

  // Disable Plant until a class is chosen
  plantBtn.disabled = true;

  // Classification
  document.querySelectorAll('.classify button[data-class]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedClass = btn.getAttribute('data-class');
      document.querySelectorAll('.classify button[data-class]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      plantBtn.disabled = false;
      selectedChip.hidden = false;
      selectedChip.textContent = ({
        green: '🌱 will plant a green seed (resonates)',
        yellow:'🌿 will plant a yellow seed (partial)',
        red:   '🪦 will plant a red seed (counter-memory)'
      })[selectedClass];
      setStep('classify');
    });
  });

  // Submit Ask
  askForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const q = questionEl.value.trim();
    if (q.length < 3) { questionEl.focus(); showToast('Type a longer question.'); return; }

    // UI: prepping
    setStep('read');
    askBtn.disabled = true; askBtn.textContent = 'Listening…';
    tombstone.hidden = false;
    tombText.textContent = '';
    errorBox.hidden = true; errorBox.textContent = '';
    skeleton.hidden = false;

    // hide classification while loading
    classifyBox.hidden = true;

    // reset classification for this reply
    selectedClass = null;
    plantBtn.disabled = true;
    selectedChip.hidden = true;
    document.querySelectorAll('.classify button[data-class]').forEach(b => b.classList.remove('active'));

    try {
      const text = await getGhostMemory(q);
      tombText.textContent = text || 'The ghost is silent…';
      skeleton.hidden = true;

      // Reveal the classify block only once the text is fully done showing
      revealClassifyAfterText(tombText, classifyBox);
    } catch (err) {
      skeleton.hidden = true;
      const msg = mapErrorMessage(err?.message || String(err));
      errorBox.textContent = msg;
      errorBox.hidden = false;
      tombText.textContent = 'The ghost is silent for now…';
      classifyBox.hidden = true; // keep hidden on error
      showToast('Could not get a reply.');
    } finally {
      askBtn.disabled = false; askBtn.textContent = 'Ask';
    }
  });

  // Plant seed
  plantBtn.addEventListener('click', () => {
    const ghost = tombText.textContent.trim();
    if (!ghost) { showToast('Ask the ghost first.'); return; }
    if (!selectedClass) { showToast('Choose how it felt.'); return; }

    const note = document.getElementById('note').value.trim();
    const seeds = loadSeeds();
    seeds.unshift({
      id: Date.now(),
      class: selectedClass,
      ghost,
      note,
      at: new Date().toISOString()
    });
    localStorage.setItem('memorySeeds', JSON.stringify(seeds));

    // reset micro-state
    document.getElementById('note').value = '';
    selectedClass = null;
    plantBtn.disabled = true;
    selectedChip.hidden = true;
    document.querySelectorAll('.classify button[data-class]').forEach(b => b.classList.remove('active'));

    setStep('plant');
    showToast('Seed planted 🌱');

    // pulse Grove, update badge, show nudge
    updateGroveBadge();
    tabGroveBtn.classList.add('pulse');
    setTimeout(() => tabGroveBtn.classList.remove('pulse'), 1800);
    groveNudge.hidden = false;
    setTimeout(() => { if (!document.getElementById('groveSection').hidden) groveNudge.hidden = true; }, 4000);

    // switch to Grove (keep this or remove if you prefer to stay on Ask)
    tabGrove.click();
  });

  // Grove: filters/export/import
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      activeFilter = btn.getAttribute('data-filter');
      renderSeeds();
    });
  });

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const blob = new Blob([localStorage.getItem('memorySeeds') || '[]'], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `memory-grove-seeds-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('Exported seeds');
    });
  }

  const importBtn = document.getElementById('importBtn');
  const importFile= document.getElementById('importFile');
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('Bad file');
        localStorage.setItem('memorySeeds', JSON.stringify(arr));
        renderSeeds();
        showToast('Imported seeds');
      } catch {
        showToast('Invalid seeds file');
      } finally { e.target.value = ''; }
    });
  }

  // Init
  renderSeeds();
  updateGroveBadge();

  // If grove is visible on first load, render stones immediately
  if (!document.getElementById('groveSection').hidden) renderStones();
});

// ---------- API ----------
async function getGhostMemory(question) {
  const res = await fetch(API_URL, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ question })
  });

  let data = null;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const serverMsg = (data && data.error) ? data.error : '';
    const msg = serverMsg || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return (data && data.text) ? data.text : '';
}

// ---------- SEEDS ----------
function loadSeeds() {
  try { return JSON.parse(localStorage.getItem('memorySeeds')) || []; }
  catch { return []; }
}
function renderSeeds() {
  const seedList  = document.getElementById('seedList');
  const seedCount = document.getElementById('seedCount');
  if (!seedList || !seedCount) return;

  const seeds = loadSeeds();
  const filtered = activeFilter === 'all'
    ? seeds
    : seeds.filter(s => (s.class || 'yellow') === activeFilter);

  seedList.innerHTML = '';
  seedCount.textContent = `${seeds.length} ${seeds.length === 1 ? 'seed' : 'seeds'}`;

  if (!filtered.length) {
    seedList.innerHTML = `
      <li class="seed">
        <div class="seed-head"><span class="seed-emoji">🌫️</span>
          <div class="seed-title">Empty path</div>
        </div>
        <p>No seeds here yet.</p>
      </li>`;
    updateGroveBadge();
    return;
  }

  for (const s of filtered) {
    const li = document.createElement('li');
    const cls = s.class || 'yellow';
    const { emoji, title } = iconForClass(cls);
    li.className = `seed seed-${cls}`;
    li.innerHTML = `
      <div class="seed-head">
        <span class="seed-emoji">${emoji}</span>
        <div class="seed-title">${escapeHTML(title)}</div>
      </div>
      <p><strong>Memory:</strong> ${escapeHTML(s.ghost)}</p>
      <p><em>Note:</em> ${escapeHTML(s.note || '(none)')}</p>
      <small>${new Date(s.at).toLocaleString()}</small>
    `;
    seedList.appendChild(li);
  }
  updateGroveBadge();
}

// ---------- GROVE RENDERER (tombstones in rows) ----------
// ------- GROVE RENDERER (fills container; image stones) -------
const STONE_IMG = 'images/tombstone.png';

function normalizeSeed(raw) {
  return {
    id: raw.id || Date.now(),
    ghost: (raw.ghost || '').toString(),
    note: (raw.note  || '').toString(),
    class: raw.class || 'yellow',
    at:   raw.at    || Date.now()
  };
}

// If empty, create a few mock stones so you can see the grid.
function ensureMock() {
  const now = Date.now();
  let s = loadSeeds();
  if (s.length) return s.map(normalizeSeed);
  s = [
    {id:now+1, class:'green',  ghost:'A good echo from the ghost.', note:'resonant'},
    {id:now+2, class:'yellow', ghost:'Half-right and half-smudged.', note:'needs nuance'},
    {id:now+3, class:'red',    ghost:'Confidently wrong in a familiar way.', note:'harmful'},
    {id:now+4, class:'yellow', ghost:'Fragmented memory, polished tone.', note:'meh'},
    {id:now+5, class:'green',  ghost:'It lands softly and true.', note:'nice'}
  ].map(normalizeSeed);
  localStorage.setItem('memorySeeds', JSON.stringify(s));
  return s;
}

// Make the SVG viewBox match the rendered size
function syncViewBox(svg) {
  const w = Math.max(800, svg.clientWidth || 1200);
  const h = Math.max(500, svg.clientHeight || 700);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  return { w, h };
}

function renderStones() {
  const svg   = document.getElementById('groveCanvas');
  const layer = document.getElementById('stonesLayer');
  if (!svg || !layer) return;

  // Match viewBox to CSS size
  const { w: viewW, h: viewH } = syncViewBox(svg);

  // Resize background + ground to fill new size
  const bg = document.getElementById('bgRect');
  if (bg) { bg.setAttribute('width', viewW); bg.setAttribute('height', viewH); }
  const ground = document.getElementById('ground');
  if (ground) {
    const cx = viewW * 0.5;
    const cy = viewH * 0.88;
    const rx = viewW * 0.46;
    const ry = Math.max(60, viewH * 0.09);
    ground.setAttribute('cx', cx);
    ground.setAttribute('cy', cy);
    ground.setAttribute('rx', rx);
    ground.setAttribute('ry', ry);
  }

  // padding so stones don’t hug edges
  const leftPad = Math.max(32, viewW * 0.06);
  const rightPad = leftPad;
  const topPad = Math.max(24, viewH * 0.06);
  const bottomPad = Math.max(100, viewH * 0.18);

  const usableW = Math.max(1, viewW - leftPad - rightPad);
  const usableH = Math.max(1, viewH - topPad - bottomPad);

  // data
  let seeds = loadSeeds().map(normalizeSeed);
  if (!seeds.length) seeds = ensureMock();
  if (activeFilter !== 'all') seeds = seeds.filter(s => s.class === activeFilter);

  // clear
  while (layer.firstChild) layer.removeChild(layer.firstChild);
  const N = seeds.length;
  if (!N) return;

  // grid that fills the area based on aspect
  const aspect = usableW / usableH;
  let cols = Math.ceil(Math.sqrt(N * aspect));
  cols = Math.max(2, Math.min(cols, N));      // clamp columns
  let rows = Math.ceil(N / cols);

  // cell size
  const cellW = usableW / cols;
  const cellH = usableH / rows;

  // stone size relative to cell (portrait-ish)
  const stoneW = Math.max(80, Math.min(cellW * 0.78, 220));
  const stoneH = stoneW * 1.25;

  // evenly distribute gaps
  const totalW = cols * stoneW;
  const totalH = rows * stoneH;
  const gapX = cols > 1 ? (usableW - totalW) / (cols - 1) : 0;
// add extra vertical spacing factor
const VERTICAL_SPACING = 1.55;  // increase to push rows farther apart
const gapY = rows > 1 ? ((usableH - totalH) / (rows - 1)) * VERTICAL_SPACING : 0;

  // place stones row-major
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (i >= N) break;
      const x = Math.round(leftPad + c * (stoneW + gapX));
      const y = Math.round(topPad  + r * (stoneH + gapY));
      drawStone(layer, x, y, stoneW, stoneH, seeds[i++]);
    }
  }
}

// point these to your actual paths
const OVERLAY = {
  // src      – image path
  // w,h      – size as a fraction of stone width/height
  // ax, ay   – which edge of the stone to anchor to: 'left'|'center'|'right' and 'top'|'middle'|'bottom'
  // dx, dy   – fine pixel nudges after anchoring
  green:  { src:'images/green.png',  w:0.42, h:0.40, ax:'center', ay:'top',    dx:  0, dy:15 }, // small sprout over the top
  yellow: { src:'images/yellow.png', w:0.52, h:0.34, ax:'right',  ay:'middle', dx: -35, dy:-20}, // branch on right side
  red:    { src:'images/red.png',    w:0.58, h:0.42, ax:'center', ay:'bottom', dx:  0, dy:-62 }  // roots just below base
};

function drawStone(parent, x, y, w, h, seed) {
  const ns = 'http://www.w3.org/2000/svg';

  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'stone');
  g.setAttribute('tabindex','0');
  g.style.cursor = 'pointer';

  // Base tombstone image
  const stone = document.createElementNS(ns, 'image');
stone.setAttribute('href', STONE_IMG);   stone.setAttribute('x', x);
  stone.setAttribute('y', y);
  stone.setAttribute('width',  w);
  stone.setAttribute('height', h);
  stone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  g.appendChild(stone);

  // Add overlay based on class
  addOverlay(g, seed.class || 'yellow', x, y, w, h);

  // Short label under stone (remove if not wanted)
 // Inscription INSIDE the stone (wrapped, 3 lines max)
// Inscription INSIDE the stone (wrapped, 3 lines max)
const inscription = (seed.ghost || '').trim();
if (inscription) {
  // ↑↑ make these insets bigger to create more white space
  const innerX = x + w * 0.26;   // was 0.22
  const innerY = y + h * 0.28;   // was 0.30
  const innerW = w * 0.48;       // was 0.56
  const innerH = h * 0.44;       // was 0.48

  const fo = document.createElementNS(ns, 'foreignObject');
  fo.setAttribute('x', innerX);
  fo.setAttribute('y', innerY);
  fo.setAttribute('width', innerW);
  fo.setAttribute('height', innerH);

  const div = document.createElement('div');
  div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  div.className = 'stone-inscription';
  div.textContent = inscription;

  // slightly smaller default font for comfort
  let fs = w * 0.095;            // was ~0.10
  if (inscription.length > 40) fs *= 0.9;
  if (inscription.length > 80) fs *= 0.85;
  div.style.fontSize = Math.max(9, Math.round(fs)) + 'px';

  fo.appendChild(div);
  g.appendChild(fo);
}

  // finally append the group itself
  parent.appendChild(g);
} // <-- this closes drawStone


// Places green/yellow/red images around the stone
function addOverlay(group, cls, x, y, w, h) {
  const ns = 'http://www.w3.org/2000/svg';
  const t = OVERLAY[cls];
  if (!t) return;

  // scale overlay relative to the stone
  const ow = w * t.w;
  const oh = h * t.h;

  // anchor the overlay to a logical point on the stone
  let ox = x, oy = y;

  // horizontal anchor
  if (t.ax === 'center') {
    ox = x + (w - ow) / 2;
  } else if (t.ax === 'right') {
    // slight overlap into the stone so the branch looks attached
    ox = x + w - ow * 0.25;
  } else if (t.ax === 'left') {
    ox = x - ow * 0.25;
  }

  // vertical anchor
  if (t.ay === 'top') {
    // overlap a little so the sprout grows out of the top edge
    oy = y - oh * 0.60;
  } else if (t.ay === 'middle') {
    oy = y + (h - oh) / 2;
  } else if (t.ay === 'bottom') {
    // tuck roots just under the base
    oy = y + h - oh * 0.15;
  }

  // fine pixel nudges
  ox += t.dx;
  oy += t.dy;

  const piece = document.createElementNS(ns, 'image');
  piece.setAttribute('href', t.src);
  piece.setAttribute('x', ox);
  piece.setAttribute('y', oy);
  piece.setAttribute('width',  ow);
  piece.setAttribute('height', oh);
  piece.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  group.appendChild(piece);
}

// reflow stones on resize
window.addEventListener('resize', debounce(renderStones, 200));

// helper
function debounce(fn, ms=200){
  let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };
}

// ---------- ICONS, BADGE, ERRORS ----------
function iconForClass(c) {
  if (c === 'green')  return { emoji:'🌱', title:'Resonates' };
  if (c === 'red')    return { emoji:'🪦', title:'Counter-memory' };
  return                { emoji:'🌿', title:'Partial / Nuanced' };
}

function updateGroveBadge() {
  let count = 0;
  try { count = (JSON.parse(localStorage.getItem('memorySeeds')) || []).length; }
  catch { count = 0; }
  const badge = document.getElementById('groveBadge');
  if (badge) {
    if (count > 0) { badge.textContent = String(count); badge.hidden = false; }
    else { badge.hidden = true; }
  }
}

function mapErrorMessage(raw='') {
  const s = raw.toLowerCase();
  if (s.includes('429')) return 'Rate limit reached. Please try again in a moment.';
  if (s.includes('401') || s.includes('unauthorized') || s.includes('invalid api key')) return 'Server auth failed (API key).';
  if (s.includes('openai_api_key not set')) return 'Server missing API key.';
  if (s.includes('failed to fetch') || s.includes('network')) return 'Network error. Check your connection.';
  if (s.includes('504') || s.includes('timeout')) return 'Upstream timeout. Please retry.';
  if (s.includes('502')) return 'Upstream failure (bad gateway).';
  if (s.includes('404')) return 'The ghost endpoint was not found.';
  return 'An unexpected error occurred.';
}
