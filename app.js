// ---------- CONFIG ----------
const API_URL = 'https://memory-grove-api.vercel.app/api/ghost';
const CANDIDATES = [
  'https://memory-grove-api.vercel.app/api/ghost',
  'https://memory-grove-api.vercel.app/ghost'
];
// ---------- APP ----------
window.addEventListener('DOMContentLoaded', () => {
  const tabAsk = document.getElementById('tab-ask');
  const tabGrove = document.getElementById('tab-grove');
  const ghostSection = document.getElementById('ghostSection');
  const groveSection = document.getElementById('groveSection');
  const askForm = document.getElementById('askForm');
  const tombstone = document.getElementById('tombstoneSection');
  const tombstoneText = document.getElementById('tombstoneText');
  const plantBtn = document.getElementById('plantBtn');
  const seedList = document.getElementById('seedList');

  // Tabs
  tabAsk.addEventListener('click', () => {
    tabAsk.classList.add('active');
    tabGrove.classList.remove('active');
    ghostSection.hidden = false;
    groveSection.hidden = true;
  });
  tabGrove.addEventListener('click', () => {
    tabGrove.classList.add('active');
    tabAsk.classList.remove('active');
    ghostSection.hidden = true;
    groveSection.hidden = false;
    renderSeeds();
  });

  // Ask the ghost (real API call)
  askForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = document.getElementById('question').value.trim();
    if (!q) return;

    tombstone.hidden = true;
    tombstoneText.textContent = 'Listening for a memory…';

    try {
      const text = await getGhostMemory(q);
      tombstoneText.textContent = text;
    } catch (err) {
      console.error(err);
      tombstoneText.textContent = 'The ghost is silent for now…';
    }
    tombstone.hidden = false;
  });

  // Save seeds locally
  plantBtn.addEventListener('click', () => {
    const note = document.getElementById('note').value.trim();
    const ghost = tombstoneText.textContent;
    const seed = { id: Date.now(), ghost, note };
    const seeds = loadSeeds();
    seeds.unshift(seed);
    localStorage.setItem('memorySeeds', JSON.stringify(seeds));
    document.getElementById('note').value = '';
    alert('Seed planted 🌱');
  });

  renderSeeds();

  function loadSeeds() {
    try { return JSON.parse(localStorage.getItem('memorySeeds')) || []; }
    catch { return []; }
  }
  function renderSeeds() {
    seedList.innerHTML = '';
    const seeds = loadSeeds();
    if (!seeds.length) {
      seedList.innerHTML = '<li>No seeds yet. Ask the ghost to begin.</li>';
      return;
    }
    for (const s of seeds) {
      const li = document.createElement('li');
      li.className = 'seed';
      li.innerHTML = `<div><strong>Memory:</strong> ${escapeHTML(s.ghost)}</div>
                      <div><em>Note:</em> ${escapeHTML(s.note || '(none)')}</div>`;
      seedList.appendChild(li);
    }
  }
});

// Call your Vercel API
async function getGhostMemory(question) {
  let lastErr;
  for (const url of CANDIDATES) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data.text;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('No ghost endpoint found');
}


function escapeHTML(s='') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
