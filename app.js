// ---------- CONFIG ----------
const API_URL = 'https://memory-grove-api.vercel.app/api/ghost';

// ---------- STATE ----------
let selectedClass = null;     // 'green' | 'yellow' | 'red'
let activeFilter  = 'all';    // 'all' | 'green' | 'yellow' | 'red'

// Modal refs (set by ensureModal)
let stoneModal, stoneGhostEl, stoneNoteEl, stoneSaveBtn, stoneDeleteBtn;
let modalSeedId = null;
let modalSelClass = null;

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
function saveSeeds(arr){ localStorage.setItem('memorySeeds', JSON.stringify(arr)); }

// Wait until #tombstoneText has finished appearing
function revealClassifyAfterText(tombTextEl, classifyBoxEl) {
  classifyBoxEl.hidden = true;
  const show = () => {
    if (!classifyBoxEl.hidden) return;
    requestAnimationFrame(() => {
      classifyBoxEl.hidden = false;
      setStep('classify');
      document.querySelector('.classify-row button')?.focus();
    });
  };
  const cs = getComputedStyle(tombTextEl);
  const hasAnim = cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0;
  const hasTrans = parseFloat(cs.transitionDuration) > 0;
  let done = false;
  const finish = () => { if (!done) { done = true; cleanup(); show(); } };
  let stableTimer = null;
  const OBSERVE_STABLE_MS = 160;
  const mo = new MutationObserver(() => {
    clearTimeout(stableTimer);
    stableTimer = setTimeout(finish, OBSERVE_STABLE_MS);
  });
  mo.observe(tombTextEl, { characterData: true, subtree: true, childList: true });
  const onEnd = () => finish();
  if (hasAnim) tombTextEl.addEventListener('animationend', onEnd, { once: true });
  if (hasTrans) tombTextEl.addEventListener('transitionend', onEnd, { once: true });
  const safety = setTimeout(finish, 0);
  function cleanup() { try { mo.disconnect(); } catch{} clearTimeout(stableTimer); clearTimeout(safety); }
}

// ---------- MODAL (complete + self-inject if missing) ----------
function ensureModal(){
  stoneModal = document.getElementById('stoneModal');
  if (!stoneModal) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
<div class="modal" id="stoneModal" aria-hidden="true" role="dialog" aria-modal="true">
  <div class="modal__backdrop" data-close></div>
  <div class="modal__dialog" role="document">
    <button class="modal-close" type="button" aria-label="Close" data-close>✕</button>
    <h3 class="modal__title">Ghost Memory</h3>
    <div class="modal__body">
      <p id="stoneGhost" class="modal-ghost"></p>
      <div class="modal-classify">
        <button type="button" class="mc" data-class="green"  title="Resonates">Resonates</button>
        <button type="button" class="mc" data-class="yellow" title="Partial / nuance">Partially right</button>
        <button type="button" class="mc" data-class="red"    title="Counter-memory">Wrong / harmful</button>
      </div>
      <label class="visually-hidden" for="stoneNote">Your note</label>
      <textarea id="stoneNote" placeholder="Add a correction, nuance, or counter-memory (optional)"></textarea>
    </div>
    <div class="modal__footer">
      <button id="stoneDelete" class="btn-danger" type="button">Delete</button>
      <div class="spacer"></div>
      <button id="stoneSave" class="btn-primary" type="button">Save</button>
    </div>
  </div>
</div>`;
    document.body.appendChild(wrap.firstElementChild);
    stoneModal = document.getElementById('stoneModal');
  }
  // refs
  stoneGhostEl    = document.getElementById('stoneGhost');
  stoneNoteEl     = document.getElementById('stoneNote');
  stoneSaveBtn    = document.getElementById('stoneSave');
  stoneDeleteBtn  = document.getElementById('stoneDelete');

  // close handlers
  stoneModal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeStoneModal));
  stoneModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeStoneModal();
  });

  // classify chips inside modal
  stoneModal.querySelectorAll('.mc').forEach(btn => {
    btn.addEventListener('click', () => {
      stoneModal.querySelectorAll('.mc').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      modalSelClass = btn.getAttribute('data-class');
    });
  });

  // buttons
  stoneSaveBtn.addEventListener('click', () => {
    if (modalSeedId == null) return;
    const seeds = loadSeeds();
    const i = seeds.findIndex(s => String(s.id) === String(modalSeedId));
    if (i === -1) return;
    if (modalSelClass) seeds[i].class = modalSelClass;
    seeds[i].note = stoneNoteEl.value.trim();
    saveSeeds(seeds);
    renderSeeds(); renderStones(); updateGroveBadge();
    showToast('Saved'); closeStoneModal();
  });
  stoneDeleteBtn.addEventListener('click', () => {
    if (modalSeedId == null) return;
    const seeds = loadSeeds().filter(s => String(s.id) !== String(modalSeedId));
    saveSeeds(seeds);
    renderSeeds(); renderStones(); updateGroveBadge();
    showToast('Deleted'); closeStoneModal();
  });
}

function setModalOpen(open){
  if (!stoneModal) return;
  stoneModal.setAttribute('aria-hidden', open ? 'false' : 'true');
  stoneModal.classList.toggle('is-open', open);   // <-- add this line
  document.body.classList.toggle('modal-open', open);
  if (open){
    setTimeout(() => stoneModal.querySelector('.modal-close')?.focus(), 0);
    document.addEventListener('keydown', onEscClose);
  } else {
    document.removeEventListener('keydown', onEscClose);
  }
}

function onEscClose(e){ if (e.key === 'Escape') closeStoneModal(); }
function closeStoneModal(){ setModalOpen(false); modalSeedId = null; }

function openStoneModal(seed){
  ensureModal(); // make sure modal exists/wired
  modalSeedId   = seed.id;
  modalSelClass = seed.class || 'yellow';
  stoneGhostEl.textContent = seed.ghost || '(no text)';
  stoneNoteEl.value = seed.note || '';
  // activate selected chip
  stoneModal.querySelectorAll('.mc').forEach(b => {
    const isActive = b.getAttribute('data-class') === modalSelClass;
    b.classList.toggle('active', isActive);
  });
  setModalOpen(true);
}

// ---------- APP ----------
window.addEventListener('DOMContentLoaded', () => {
  // Tabs
  const tabAsk = document.getElementById('tab-ask');
  const tabGrove = document.getElementById('tab-grove');
  const ghostSection = document.getElementById('ghostSection');
  const groveSection = document.getElementById('groveSection');

  tabAsk?.addEventListener('click', () => {
    tabAsk.classList.add('active'); tabGrove.classList.remove('active');
    ghostSection.hidden = false;    groveSection.hidden = true;
  });
  tabGrove?.addEventListener('click', () => {
    tabGrove.classList.add('active'); tabAsk.classList.remove('active');
    ghostSection.hidden = true;      groveSection.hidden = false;
    renderSeeds();
    renderStones();
  });

  // Nudge → go to Grove
  const groveNudge  = document.getElementById('groveNudge');
  const gotoGrove   = document.getElementById('gotoGrove');
  gotoGrove?.addEventListener('click', () => {
    tabGrove?.click();
    groveNudge.hidden = true;
  });

  // Ask
  const askForm = document.getElementById('askForm');
  const askBtn  = document.getElementById('askBtn');
  const questionEl = document.getElementById('question');

  const tombstone = document.getElementById('tombstoneSection');
  const tombText  = document.getElementById('tombstoneText');
  const skeleton  = document.getElementById('skeleton');
  const errorBox  = document.getElementById('errorBox');

  const classifyBox = document.getElementById('classifyBox');

  const plantBtn  = document.getElementById('plantBtn');
  const selectedChip = document.getElementById('selectedChip');
  const tabGroveBtn = document.getElementById('tab-grove');

  questionEl?.addEventListener('input', () => {
    askBtn.disabled = questionEl.value.trim().length < 3;
  });
  plantBtn.disabled = true;

  // Classification chips (Ask panel)
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
  askForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = questionEl.value.trim();
    if (q.length < 3) { questionEl.focus(); showToast('Type a longer question.'); return; }
    setStep('read');
    askBtn.disabled = true; askBtn.textContent = 'Listening…';
    tombstone.hidden = false;
    tombText.textContent = '';
    errorBox.hidden = true; errorBox.textContent = '';
    skeleton.hidden = false;
    classifyBox.hidden = true;
    selectedClass = null;
    plantBtn.disabled = true;
    selectedChip.hidden = true;
    document.querySelectorAll('.classify button[data-class]').forEach(b => b.classList.remove('active'));

    try {
      const text = await getGhostMemory(q);
      tombText.textContent = text || 'The ghost is silent…';
      skeleton.hidden = true;
      revealClassifyAfterText(tombText, classifyBox);
    } catch (err) {
      skeleton.hidden = true;
      const msg = mapErrorMessage(err?.message || String(err));
      errorBox.textContent = msg;
      errorBox.hidden = false;
      tombText.textContent = 'The ghost is silent for now…';
      classifyBox.hidden = true;
      showToast('Could not get a reply.');
    } finally {
      askBtn.disabled = false; askBtn.textContent = 'Ask';
    }
  });

  // Plant seed from Ask panel
  plantBtn?.addEventListener('click', () => {
    const ghost = tombText.textContent.trim();
    if (!ghost) { showToast('Ask the ghost first.'); return; }
    if (!selectedClass) { showToast('Choose how it felt.'); return; }
    const note = document.getElementById('note').value.trim();
    const seeds = loadSeeds();
    seeds.unshift({ id: Date.now(), class: selectedClass, ghost, note, at: new Date().toISOString() });
    saveSeeds(seeds);

    document.getElementById('note').value = '';
    selectedClass = null;
    plantBtn.disabled = true;
    selectedChip.hidden = true;
    document.querySelectorAll('.classify button[data-class]').forEach(b => b.classList.remove('active'));

    setStep('plant');
    showToast('Seed planted 🌱');

    updateGroveBadge();
    tabGroveBtn.classList.add('pulse');
    setTimeout(() => tabGroveBtn.classList.remove('pulse'), 1800);
    groveNudge.hidden = false;
    setTimeout(() => { if (!document.getElementById('groveSection').hidden) groveNudge.hidden = true; }, 4000);

    tabGrove?.click();
  });

  // Grove: filters/export/import
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      activeFilter = btn.getAttribute('data-filter');
      renderSeeds();
      renderStones();
    });
  });

  // Optional export/import (keep your existing buttons if you have them)
  const exportBtn = document.getElementById('exportBtn');
  exportBtn?.addEventListener('click', () => {
    const blob = new Blob([localStorage.getItem('memorySeeds') || '[]'], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `memory-grove-seeds-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Exported seeds');
  });
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
        saveSeeds(arr);
        renderSeeds();
        renderStones();
        showToast('Imported seeds');
      } catch { showToast('Invalid seeds file'); }
      finally { e.target.value = ''; }
    });
  }

  // Start
  renderSeeds();
  updateGroveBadge();
  if (!document.getElementById('groveSection').hidden) renderStones();

  // Reflow stones on resize
  window.addEventListener('resize', debounce(renderStones, 200));
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

// ---------- GROVE RENDERER ----------
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
// demo seeds if empty
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
  saveSeeds(s);
  return s;
}

// Match viewBox to CSS size
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

  const { w: viewW, h: viewH } = syncViewBox(svg);

  // background rect resize if present
  const bg = document.getElementById('bgRect');
  if (bg) { bg.setAttribute('width', viewW); bg.setAttribute('height', viewH); }

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
  cols = Math.max(2, Math.min(cols, N));
  let rows = Math.ceil(N / cols);

  // cell size
  const cellW = usableW / cols;
  const cellH = usableH / rows;

  // stone size relative to cell (portrait-ish)
  const stoneW = Math.max(80, Math.min(cellW * 0.78, 220));
  const stoneH = stoneW * 1.25;

  // gaps
  const totalW = cols * stoneW;
  const totalH = rows * stoneH;
  const gapX = cols > 1 ? (usableW - totalW) / (cols - 1) : 0;
  const VERTICAL_SPACING = 1.55;
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

const OVERLAY = {
  green:  { src:'images/green.png',  w:0.42, h:0.40, ax:'center', ay:'top',    dx:  0, dy:15 },
  yellow: { src:'images/yellow.png', w:0.52, h:0.34, ax:'right',  ay:'middle', dx: -35, dy:-20},
  red:    { src:'images/red.png',    w:0.58, h:0.42, ax:'center', ay:'bottom', dx:  0, dy:-62 }
};

function drawStone(parent, x, y, w, h, seed) {
  const ns = 'http://www.w3.org/2000/svg';

  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'stone');
  g.setAttribute('tabindex','0');
  g.setAttribute('role','button');
  g.setAttribute('aria-label','Open memory');
  g.style.cursor = 'pointer';

  // Click + keyboard to open modal
  const open = () => openStoneModal(seed);
  g.addEventListener('click', open);
  g.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

  // --- IMPORTANT: add a transparent hit-rect on top to capture clicks ---
  const hit = document.createElementNS(ns, 'rect');
  hit.setAttribute('x', x);
  hit.setAttribute('y', y);
  hit.setAttribute('width',  w);
  hit.setAttribute('height', h);
  hit.setAttribute('fill', 'transparent');   // visible = none, but clickable
  hit.style.pointerEvents = 'all';
  // we append this LAST so it sits above and gets the click
  // (we’ll append it after the visual pieces below)

  // Base tombstone image (leave pointer-events DEFAULT)
  const stone = document.createElementNS(ns, 'image');
  stone.setAttribute('href', STONE_IMG);
  stone.setAttribute('x', x);
  stone.setAttribute('y', y);
  stone.setAttribute('width',  w);
  stone.setAttribute('height', h);
  stone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  g.appendChild(stone);

  // Overlay (leave default pointer events)
  addOverlay(g, seed.class || 'yellow', x, y, w, h);

  // Inscription inside the stone (leave default pointer events)
  const inscription = (seed.ghost || '').trim();
  if (inscription) {
    const innerX = x + w * 0.26;
    const innerY = y + h * 0.28;
    const innerW = w * 0.48;
    const innerH = h * 0.44;

    const fo = document.createElementNS(ns, 'foreignObject');
    fo.setAttribute('x', innerX);
    fo.setAttribute('y', innerY);
    fo.setAttribute('width', innerW);
    fo.setAttribute('height', innerH);

    const div = document.createElement('div');
    div.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    div.className = 'stone-inscription';
    div.textContent = inscription;
    let fs = w * 0.095; if (inscription.length > 40) fs *= 0.9; if (inscription.length > 80) fs *= 0.85;
    div.style.fontSize = Math.max(9, Math.round(fs)) + 'px';

    fo.appendChild(div);
    g.appendChild(fo);
  }

  // <-- append the hit rect last so it’s on top for clicking
  g.appendChild(hit);

  parent.appendChild(g);
}


function addOverlay(group, cls, x, y, w, h) {
  const ns = 'http://www.w3.org/2000/svg';
  const t = OVERLAY[cls];
  if (!t) return;
  const ow = w * t.w;
  const oh = h * t.h;
  let ox = x, oy = y;
  if (t.ax === 'center') ox = x + (w - ow) / 2;
  else if (t.ax === 'right') ox = x + w - ow * 0.25;
  else if (t.ax === 'left')  ox = x - ow * 0.25;
  if (t.ay === 'top')        oy = y - oh * 0.60;
  else if (t.ay === 'middle')oy = y + (h - oh) / 2;
  else if (t.ay === 'bottom')oy = y + h - oh * 0.15;
  ox += t.dx; oy += t.dy;

  const piece = document.createElementNS(ns, 'image');
  piece.setAttribute('href', t.src);
  piece.setAttribute('x', ox);
  piece.setAttribute('y', oy);
  piece.setAttribute('width',  ow);
  piece.setAttribute('height', oh);
  piece.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  piece.style.pointerEvents = 'none'; // do not steal clicks
  group.appendChild(piece);
}

// helpers
function debounce(fn, ms=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

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
  if (badge) { if (count > 0) { badge.textContent = String(count); badge.hidden = false; } else { badge.hidden = true; } }
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
