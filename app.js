// Basic scaffold — no API yet
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

  // Switch tabs
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

  // Mock ask ghost
  askForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('question').value.trim();
    if (!q) return;
    tombstoneText.textContent = `The ghost whispers: "${q}" (mock reply)`;
    tombstone.hidden = false;
  });

  // Save mock seeds in localStorage
  plantBtn.addEventListener('click', () => {
    const note = document.getElementById('note').value.trim();
    const ghost = tombstoneText.textContent;
    const seed = {
      id: Date.now(),
      ghost,
      note
    };
    const seeds = loadSeeds();
    seeds.unshift(seed);
    localStorage.setItem('memorySeeds', JSON.stringify(seeds));
    document.getElementById('note').value = '';
    alert('Seed planted 🌱');
  });

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
      li.innerHTML = `<div><strong>Memory:</strong> ${s.ghost}</div>
                      <div><em>Note:</em> ${s.note || '(none)'}</div>`;
      seedList.appendChild(li);
    }
  }
});
