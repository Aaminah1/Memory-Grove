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
function normalizeSeed(raw) {
  return {
    id: raw.id || Date.now(),
    ghost: (raw.ghost || '').toString(),
    note: (raw.note  || '').toString(),
    class: raw.class || 'yellow',
    at:   raw.at    || Date.now()
  };
}

// For demo: if empty, create a few fake stones so you can see the grid.
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

function renderStones() {
  const svg   = document.getElementById('groveCanvas');
  const layer = document.getElementById('stonesLayer');
  if (!svg || !layer) return;

  // get data
  let seeds = loadSeeds().map(normalizeSeed);
  if (!seeds.length) seeds = ensureMock();

  // filter by activeFilter from STATE
  if (activeFilter !== 'all') seeds = seeds.filter(s => s.class === activeFilter);

  // clear
  while (layer.firstChild) layer.removeChild(layer.firstChild);

  // layout
  const viewW = 1200, viewH = 700;
  const leftPad = 80, rightPad = 80, topPad = 80, bottomPad = 140;
  const usableW = viewW - leftPad - rightPad;

  const dims = {
    sm: { w: 80,  h: 110, r: 24 },
    md: { w: 110, h: 150, r: 28 },
    lg: { w: 150, h: 210, r: 34 }
  };
  const sizeOf = (seed) => {
    const weight = Math.min(240, (seed.note.length + seed.ghost.length*0.25)) + Math.random()*50;
    if (weight > 200) return 'lg';
    if (weight > 120) return 'md';
    return 'sm';
  };

  const baseW = dims.sm.w + 24;
  const cols  = Math.max(3, Math.floor(usableW / baseW));
  const gapX  = Math.max(16, (usableW - cols*baseW)/Math.max(1,cols-1) + 24);
  const rowGap = 26;

  let cursorX = leftPad, cursorY = topPad;
  let col = 0; const rowH = []; let row = 0; rowH[row] = 0;

  seeds.forEach(seed => {
    const sz = sizeOf(seed);
    const d  = dims[sz];

    if (col >= cols) {
      cursorY += (rowH[row] || 0) + rowGap;
      cursorX = leftPad;
      col = 0; row += 1; rowH[row] = 0;
    }

    const jx = (Math.random() - .5) * 8;
    const jy = (Math.random() - .5) * 6;
    const x = Math.round(cursorX + jx);
    const y = Math.round(cursorY + jy);

    drawStone(layer, x, y, d.w, d.h, d.r, seed);

    cursorX += d.w + gapX;
    col += 1;
    rowH[row] = Math.max(rowH[row], d.h);
  });
}

function drawStone(parent, x, y, w, h, r, seed) {
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  g.setAttribute('class', 'stone');
  g.setAttribute('tabindex','0');
  g.style.cursor = 'pointer';

  // halo ring tinted by class
  const halo = document.createElementNS('http://www.w3.org/2000/svg','rect');
  halo.setAttribute('x', x-4);
  halo.setAttribute('y', y-4);
  halo.setAttribute('width', w+8);
  halo.setAttribute('height', h+12);
  halo.setAttribute('rx', r+6);
  halo.setAttribute('ry', r+6);
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke-width', '2');
  halo.setAttribute('opacity', '.35');
  halo.setAttribute('class', `stone-halo ${seed.class}`);
  g.appendChild(halo);

  // base stone
  const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
  rect.setAttribute('x', x);
  rect.setAttribute('y', y+8);
  rect.setAttribute('width', w);
  rect.setAttribute('height', h);
  rect.setAttribute('rx', r);
  rect.setAttribute('ry', r);
  rect.setAttribute('fill', 'url(#stoneGrad)');
  rect.setAttribute('filter', 'url(#stoneShadow)');
  g.appendChild(rect);

  // engraved notch
  const line = document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1', x + w*0.2);
  line.setAttribute('x2', x + w*0.8);
  line.setAttribute('y1', y + Math.max(24, r+10));
  line.setAttribute('y2', y + Math.max(24, r+10));
  line.setAttribute('stroke', '#5b5f68');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('opacity', '.8');
  g.appendChild(line);

  // subtle label
  const label = document.createElementNS('http://www.w3.org/2000/svg','text');
  label.setAttribute('x', x + w/2);
  label.setAttribute('y', y + Math.max(44, r+28));
  label.setAttribute('text-anchor','middle');
  label.setAttribute('class','stone-label');
  label.textContent = (seed.ghost || '—').slice(0, 28);
  g.appendChild(label);

  g.addEventListener('click', () => {
    alert(`Ghost memory (${seed.class}):\n\n${seed.ghost}\n\nNote: ${seed.note || '(none)'}`);
  });

  parent.appendChild(g);
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
