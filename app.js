// =============================
// Memory Grove — app.js (updated with per-class notes + replies)
// =============================

// ---------- CONFIG ----------
const API_URL = 'https://memory-grove-api.vercel.app/api/ghost';

// ---------- STATE ----------
let selectedClass = null;     // 'green' | 'yellow' | 'red'
let activeFilter  = 'all';    // 'all' | 'green' | 'yellow' | 'red'

// Existing stone/classify modal refs (left intact if you use it elsewhere)
let stoneModal, stoneGhostEl, stoneNoteEl, stoneSaveBtn, stoneDeleteBtn;
let modalSeedId = null;
let modalSelClass = null;

// NEW: Notes modal refs
let notesModal, notesTitleEl, notesListEl, notesInputEl, notesSaveBtn, notesCloseBtns = [];
let notesSeedId = null;
let notesClass = null;

// ---------- UTIL ----------
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
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
  if (!tombTextEl || !classifyBoxEl) return;
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

// NEW: threads per class (each thread: {class:'green|yellow|red', messages:[{by,text,at}]})
function normalizeSeed(raw) {
  return {
    id: raw.id || Date.now(),
    ghost: (raw.ghost || '').toString(),
    note: (raw.note  || '').toString(),     // legacy planter note
    class: raw.class || 'yellow',
    at:   raw.at    || new Date().toISOString(),
    threads: Array.isArray(raw.threads) ? raw.threads : []
  };
}
function getThreadForClass(seed, cls, createIfMissing=false){
  seed.threads = seed.threads || [];
  let t = seed.threads.find(t => t.class === cls);
  if (!t && createIfMissing) {
    t = { class: cls, messages: [] };
    seed.threads.push(t);
  }
  return t || null;
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

function renderSeeds() {
  const seedList  = document.getElementById('seedList');
  const seedCount = document.getElementById('seedCount');
  if (!seedList || !seedCount) return;

  const seeds = loadSeeds().map(normalizeSeed);
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

function syncViewBox(svg) {
  const w = Math.max(800, svg.clientWidth || 1200);
  const h = Math.max(500, svg.clientHeight || 700);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  return { w, h };
}

const OVERLAY = {
  green:  { src:'images/green.png',  w:0.42, h:0.40, ax:'center', ay:'top',    dx:  0, dy:15 },
  yellow: { src:'images/yellow.png', w:0.52, h:0.34, ax:'right',  ay:'middle', dx: -35, dy:-20},
  red:    { src:'images/red.png',    w:0.58, h:0.42, ax:'center', ay:'bottom', dx:  0, dy:-62 }
};

function renderStones() {
  const svg   = document.getElementById('groveCanvas');
  const layer = document.getElementById('stonesLayer');
  if (!svg || !layer) return;

  const { w: viewW, h: viewH } = syncViewBox(svg);

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

function drawStone(parent, x, y, w, h, seed) {
  const ns = 'http://www.w3.org/2000/svg';

  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'stone');
  g.setAttribute('tabindex','0');
  g.setAttribute('role','button');
  g.setAttribute('aria-label','Open memory');
  g.style.cursor = 'pointer';

  // Base tombstone image
  const stone = document.createElementNS(ns, 'image');
  stone.setAttribute('href', STONE_IMG);
  stone.setAttribute('x', x);
  stone.setAttribute('y', y);
  stone.setAttribute('width',  w);
  stone.setAttribute('height', h);
  stone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  g.appendChild(stone);

  // Overlay for the seed's chosen class
  addOverlay(g, seed.class || 'yellow', x, y, w, h);

  // Add note badge(s) for any class that has messages
  ['green','yellow','red'].forEach(cls => addNoteBadge(g, seed, cls, x, y, w, h));

  // Inscription inside the stone
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

  // Click + keyboard to open main stone modal (if you want to keep it)
  const open = () => openStoneModal(seed);
  g.addEventListener('click', open);
  g.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });

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
  group.appendChild(piece);
}

// NEW: add a small 📝 badge near the overlay if that class has thread messages
function addNoteBadge(group, seed, cls, x, y, w, h) {
  const thread = getThreadForClass(seed, cls, false);
  if (!thread || !thread.messages || !thread.messages.length) return;

  const ns = 'http://www.w3.org/2000/svg';
  const t = OVERLAY[cls];
  if (!t) return;

  // anchor to overlay box
  const ow = w * t.w, oh = h * t.h;
  let ox = x, oy = y;
  if (t.ax === 'center') ox = x + (w - ow) / 2;
  else if (t.ax === 'right') ox = x + w - ow * 0.25;
  else if (t.ax === 'left')  ox = x - ow * 0.25;
  if (t.ay === 'top')         oy = y - oh * 0.60;
  else if (t.ay === 'middle') oy = y + (h - oh) / 2;
  else if (t.ay === 'bottom') oy = y + h - oh * 0.15;
  ox += t.dx; oy += t.dy;

  // place badge at overlay's top-right
  const bx = ox + ow - 18;
  const by = oy - 6;

  const g = document.createElementNS(ns, 'g');
  g.setAttribute('class', 'note-badge');
  g.style.cursor = 'pointer';
  g.addEventListener('click', (e) => { e.stopPropagation(); openNotesModal(seed, cls); });

  const bg = document.createElementNS(ns, 'rect');
  bg.setAttribute('x', bx);
  bg.setAttribute('y', by);
  bg.setAttribute('rx', 6);
  bg.setAttribute('ry', 6);
  bg.setAttribute('width', 28);
  bg.setAttribute('height', 20);
  bg.setAttribute('fill', '#1e1f27');
  bg.setAttribute('stroke', '#aaa');
  bg.setAttribute('stroke-width', '1');

  const txt = document.createElementNS(ns, 'text');
  txt.setAttribute('x', bx + 8);
  txt.setAttribute('y', by + 14);
  txt.setAttribute('font-size', '12');
  txt.setAttribute('font-family', 'system-ui, sans-serif');
  txt.setAttribute('fill', '#fff');
  txt.textContent = '📝';

  // tiny count dot (optional)
  const count = thread.messages.length;
  if (count > 1) {
    const cBG = document.createElementNS(ns, 'circle');
    cBG.setAttribute('cx', bx + 26);
    cBG.setAttribute('cy', by + 4);
    cBG.setAttribute('r', 6);
    cBG.setAttribute('fill', '#e5484d');
    const cTx = document.createElementNS(ns, 'text');
    cTx.setAttribute('x', bx + 26);
    cTx.setAttribute('y', by + 6);
    cTx.setAttribute('text-anchor', 'middle');
    cTx.setAttribute('font-size', '9');
    cTx.setAttribute('font-family', 'system-ui, sans-serif');
    cTx.setAttribute('fill', '#fff');
    cTx.textContent = Math.min(9, count); // 9+ compact
    g.appendChild(cBG);
    g.appendChild(cTx);
  }

  g.appendChild(bg);
  g.appendChild(txt);
  group.appendChild(g);
}

// ---------- MODAL: existing stone modal (kept minimal) ----------
function ensureModal(){
  stoneModal = document.getElementById('stoneModal');
  if (!stoneModal) return; // optional now
  // refs
  stoneGhostEl    = document.getElementById('stoneGhost');
  stoneNoteEl     = document.getElementById('stoneNote');
  stoneSaveBtn    = document.getElementById('stoneSave');
  stoneDeleteBtn  = document.getElementById('stoneDelete');

  stoneModal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeStoneModal));
  stoneModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeStoneModal();
  });
  stoneModal.querySelectorAll('.mc').forEach(btn => {
    btn.addEventListener('click', () => {
      stoneModal.querySelectorAll('.mc').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      modalSelClass = btn.getAttribute('data-class');
    });
  });

  stoneSaveBtn?.addEventListener('click', () => {
    if (modalSeedId == null) return;
    const seeds = loadSeeds().map(normalizeSeed);
    const i = seeds.findIndex(s => String(s.id) === String(modalSeedId));
    if (i === -1) return;
    if (modalSelClass) seeds[i].class = modalSelClass;
    seeds[i].note = (stoneNoteEl?.value || '').trim();
    saveSeeds(seeds);
    renderSeeds(); renderStones(); updateGroveBadge();
    showToast('Saved'); closeStoneModal();
  });
  stoneDeleteBtn?.addEventListener('click', () => {
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
  stoneModal.classList.toggle('is-open', open);
  document.body.classList.toggle('modal-open', open);
}
function onEscClose(e){ if (e.key === 'Escape') closeStoneModal(); }
function closeStoneModal(){ setModalOpen(false); modalSeedId = null; }
function openStoneModal(seed){
  if (!document.getElementById('stoneModal')) return; // optional
  ensureModal();
  modalSeedId   = seed.id;
  modalSelClass = seed.class || 'yellow';
  if (stoneGhostEl) stoneGhostEl.textContent = seed.ghost || '(no text)';
  if (stoneNoteEl)  stoneNoteEl.value = seed.note || '';
  stoneModal.querySelectorAll('.mc').forEach(b => {
    const isActive = b.getAttribute('data-class') === modalSelClass;
    b.classList.toggle('active', isActive);
  });
  setModalOpen(true);
  document.addEventListener('keydown', onEscClose);
}

// ---------- NOTES MODAL (threads & replies, local only) ----------
function ensureNotesModal(){
  notesModal = document.getElementById('notesModal');
  if (!notesModal) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `
<div id="notesModal" class="modal" aria-hidden="true" role="dialog" aria-modal="true">
  <div class="modal__backdrop" data-close></div>
  <div class="modal__dialog" role="document">
    <header class="modal__header">
      <h3 id="notesTitle">Notes</h3>
      <button class="modal-close" type="button" aria-label="Close" data-close>✕</button>
    </header>
    <div class="modal__body">
      <ul id="notesList" class="notes-list"></ul>
      <label class="visually-hidden" for="notesInput">Add a note</label>
      <textarea id="notesInput" placeholder="Write a reply…"></textarea>
    </div>
    <footer class="modal__footer">
      <div class="spacer"></div>
      <button id="notesSave" class="btn-primary" type="button">Post</button>
    </footer>
  </div>
</div>`;
    document.body.appendChild(wrap.firstElementChild);
    notesModal = document.getElementById('notesModal');
  }
  notesTitleEl = document.getElementById('notesTitle');
  notesListEl  = document.getElementById('notesList');
  notesInputEl = document.getElementById('notesInput');
  notesSaveBtn = document.getElementById('notesSave');
  notesCloseBtns = Array.from(notesModal.querySelectorAll('[data-close]'));

  notesCloseBtns.forEach(b => b.addEventListener('click', closeNotesModal));
  notesModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal__backdrop')) closeNotesModal();
    if (e.target === notesModal) closeNotesModal();
  });

  notesSaveBtn.onclick = () => {
    const txt = (notesInputEl?.value || '').trim();
    if (!txt || notesSeedId == null || !notesClass) return;
    const seeds = loadSeeds().map(normalizeSeed);
    const i = seeds.findIndex(s => String(s.id) === String(notesSeedId));
    if (i === -1) return;
    const thread = getThreadForClass(seeds[i], notesClass, true);
    thread.messages.push({
      by: 'you',
      text: txt,
      at: new Date().toISOString()
    });
    saveSeeds(seeds);
    notesInputEl.value = '';
    renderNotesList(thread);
    renderStones(); // update badges/count
  };
}
function setNotesModalOpen(open){
  if (!notesModal) return;
  notesModal.setAttribute('aria-hidden', open ? 'false' : 'true');
  notesModal.classList.toggle('is-open', open);
  document.body.classList.toggle('modal-open', open);
}
function closeNotesModal(){ setNotesModalOpen(false); notesSeedId = null; notesClass = null; }
function openNotesModal(seed, cls){
  ensureNotesModal();
  notesSeedId = seed.id;
  notesClass = cls;
  const title = ({green:'🌱 Resonates', yellow:'🌿 Partially right', red:'🪦 Wrong / harmful'})[cls] || 'Notes';
  notesTitleEl.textContent = title;

  const thread = getThreadForClass(seed, cls, true);
  renderNotesList(thread);

  setNotesModalOpen(true);
}
function renderNotesList(thread){
  if (!notesListEl) return;
  notesListEl.innerHTML = '';
  if (!thread || !thread.messages || !thread.messages.length){
    const li = document.createElement('li');
    li.className = 'note-empty';
    li.textContent = 'No notes yet — be the first to reply.';
    notesListEl.appendChild(li);
    return;
  }
  for (const m of thread.messages) {
    const li = document.createElement('li');
    li.className = 'note-item';
    li.innerHTML = `
      <div class="note-head">
        <strong class="note-author">${escapeHTML(m.by || 'visitor')}</strong>
        <small class="note-time">${new Date(m.at || Date.now()).toLocaleString()}</small>
      </div>
      <p class="note-text">${escapeHTML(m.text || '')}</p>
    `;
    notesListEl.appendChild(li);
  }
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

// ---------- APP ----------
window.addEventListener('DOMContentLoaded', () => {
  // Tabs
  const tabAsk = document.getElementById('tab-ask');
  const tabGrove = document.getElementById('tab-grove');
  const ghostSection = document.getElementById('ghostSection');
  const groveSection = document.getElementById('groveSection');

  tabAsk?.addEventListener('click', () => {
    tabAsk.classList.add('active'); tabGrove.classList.remove('active');
    if (ghostSection) ghostSection.hidden = false;
    if (groveSection) groveSection.hidden = true;
  });
  tabGrove?.addEventListener('click', () => {
    tabGrove.classList.add('active'); tabAsk.classList.remove('active');
    if (ghostSection) ghostSection.hidden = true;
    if (groveSection) groveSection.hidden = false;
    renderSeeds();
    renderStones();
  });

  // Nudge → go to Grove
  const groveNudge  = document.getElementById('groveNudge');
  const gotoGrove   = document.getElementById('gotoGrove');
  gotoGrove?.addEventListener('click', () => {
    tabGrove?.click();
    if (groveNudge) groveNudge.hidden = true;
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
    if (askBtn) askBtn.disabled = questionEl.value.trim().length < 3;
  });
  if (plantBtn) plantBtn.disabled = true;

  // Classification chips (Ask panel)
  document.querySelectorAll('.classify button[data-class]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedClass = btn.getAttribute('data-class');
      document.querySelectorAll('.classify button[data-class]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (plantBtn) plantBtn.disabled = false;
      if (selectedChip) {
        selectedChip.hidden = false;
        selectedChip.textContent = ({
          green: '🌱 will plant a green seed (resonates)',
          yellow:'🌿 will plant a yellow seed (partial)',
          red:   '🪦 will plant a red seed (counter-memory)'
        })[selectedClass];
      }
      setStep('classify');
    });
  });

  // Submit Ask
  askForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = (questionEl?.value || '').trim();
    if (q.length < 3) { questionEl?.focus(); showToast('Type a longer question.'); return; }

    setStep('read');
    if (askBtn){ askBtn.disabled = true; askBtn.textContent = 'Listening…'; }
    if (tombstone) tombstone.hidden = false;
    if (tombText)  tombText.textContent = '';
    if (errorBox){ errorBox.hidden = true; errorBox.textContent = ''; }
    if (skeleton) skeleton.hidden = false;
    if (classifyBox) classifyBox.hidden = true;

    selectedClass = null;
    if (plantBtn) plantBtn.disabled = true;
    if (selectedChip) selectedChip.hidden = true;
    document.querySelectorAll('.classify button[data-class]').forEach(b => b.classList.remove('active'));

    try {
      const text = await getGhostMemory(q);
      if (tombText) tombText.textContent = text || 'The ghost is silent…';
      if (skeleton) skeleton.hidden = true;
      revealClassifyAfterText(tombText, classifyBox);
    } catch (err) {
      if (skeleton) skeleton.hidden = true;
      const msg = mapErrorMessage(err?.message || String(err));
      if (errorBox) { errorBox.textContent = msg; errorBox.hidden = false; }
      if (tombText) tombText.textContent = 'The ghost is silent for now…';
      if (classifyBox) classifyBox.hidden = true;
      showToast('Could not get a reply.');
    } finally {
      if (askBtn){ askBtn.disabled = false; askBtn.textContent = 'Ask'; }
    }
  });

  // Plant seed from Ask panel (now also seeds a class-thread if note present)
  plantBtn?.addEventListener('click', () => {
    const ghost = (tombText?.textContent || '').trim();
    if (!ghost) { showToast('Ask the ghost first.'); return; }
    if (!selectedClass) { showToast('Choose how it felt.'); return; }

    const noteEl = document.getElementById('note');
    const note = (noteEl?.value || '').trim();

    const seeds = loadSeeds().map(normalizeSeed);
    const newSeed = {
      id: Date.now(),
      class: selectedClass,
      ghost,
      note, // legacy field (still shown in the list panel)
      at: new Date().toISOString(),
      threads: []
    };
    if (note) {
      const t = { class: selectedClass, messages: [] };
      t.messages.push({ by:'you', text: note, at: new Date().toISOString() });
      newSeed.threads.push(t);
    }
    seeds.unshift(newSeed);
    saveSeeds(seeds);

    if (noteEl) noteEl.value = '';
    selectedClass = null;
    if (plantBtn) plantBtn.disabled = true;
    if (selectedChip) selectedChip.hidden = true;
    document.querySelectorAll('.classify button[data-class]').forEach(b => b.classList.remove('active'));

    setStep('plant');
    showToast('Seed planted 🌱');

    updateGroveBadge();
    tabGroveBtn?.classList.add('pulse');
    setTimeout(() => tabGroveBtn?.classList.remove('pulse'), 1800);
    const groveNudge  = document.getElementById('groveNudge');
    if (groveNudge) {
      groveNudge.hidden = false;
      setTimeout(() => {
        const groveSection = document.getElementById('groveSection');
        if (groveSection && !groveSection.hidden) groveNudge.hidden = true;
      }, 4000);
    }

    tabGrove?.click();
    renderStones(); // so the new badge appears immediately
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

  // Export / Import (optional)
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
        const arr = JSON.parse(text).map(normalizeSeed);
        if (!Array.isArray(arr)) throw new Error('Bad file');
        saveSeeds(arr);
        renderSeeds();
        renderStones();
        updateGroveBadge();
        showToast('Imported seeds');
      } catch { showToast('Invalid seeds file'); }
      finally { e.target.value = ''; }
    });
  }

  // Start
  ensureModal();      // stone modal (optional)
  ensureNotesModal(); // notes modal
  renderSeeds();
  updateGroveBadge();
  const groveSectionVisible = !document.getElementById('groveSection')?.hidden;
  if (groveSectionVisible) renderStones();

  // Reflow stones on resize
  window.addEventListener('resize', debounce(renderStones, 200));
});

// helpers
function debounce(fn, ms=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
