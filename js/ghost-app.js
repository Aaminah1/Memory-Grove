// js/ghost-app.js
(() => {
  const ghost  = document.getElementById('appGhost');
  const bubble = document.getElementById('appGhostBubble');
  const input  = document.getElementById('question');
  const askBtn = document.getElementById('askBtn');

  if (!ghost || !bubble || !input) return;

  /* ---------- MOOD STATE ---------- */
  const MOOD_CLASSES = [
    'mood-neutral',
    'mood-lean',
    'mood-uneasy',
    'mood-evil',
    'mood-sneak',
    'mood-delete',
    'mood-answer'
  ];

  function setMood(name) {
    MOOD_CLASSES.forEach(c => ghost.classList.remove(c));
    if (name) ghost.classList.add(name);
  }

  /* ---------- BASIC HELPERS ---------- */
  function showGhost() {
    ghost.classList.add('on');
    ghost.removeAttribute('aria-hidden');
    if (!ghost.classList.contains('mood-neutral') &&
        !ghost.classList.contains('mood-answer')) {
      setMood('mood-neutral');
    }
  }

  function hideBubble() {
    bubble.classList.remove('show');
    bubble.classList.add('hide');
  }

  function say(text, mood) {
    if (mood) setMood(mood);
    bubble.textContent = text;
    bubble.classList.add('show');
    bubble.classList.remove('hide');
    bubble.removeAttribute('aria-hidden');
  }

  /* ---------- BLINK (HARDER) ---------- */
  function scheduleBlink() {
    const dur = 2600 + Math.random() * 1800; // 2.6–4.4s
    setTimeout(() => {
      ghost.classList.add('blink');
      setTimeout(() => {
        ghost.classList.remove('blink');
        scheduleBlink();
      }, 320); // match CSS blink animation
    }, dur);
  }
  scheduleBlink();

  /* ---------- GLITCH CONTROL ---------- */
  let lastGlitchTime = 0;
  const GLITCH_COOLDOWN = 4500; // ms
  const GLITCH_CHANCE   = 0.4;  // 40% when we "try"

  function canGlitch() {
    const now = Date.now();
    if (now - lastGlitchTime < GLITCH_COOLDOWN) return false;
    if (Math.random() > GLITCH_CHANCE) return false;
    lastGlitchTime = now;
    return true;
  }

  function maybeGlitchPop() {
    if (!canGlitch()) return;
    ghost.classList.add('glitch-pop');
    setTimeout(() => ghost.classList.remove('glitch-pop'), 300);
  }

  function maybeColorGlitch() {
    if (!canGlitch()) return;
    ghost.classList.add('color-glitch');
    setTimeout(() => ghost.classList.remove('color-glitch'), 320);
  }

  function letterGlitch() {
    ghost.classList.add('color-glitch', 'glitch-pop');
    setTimeout(() => {
      ghost.classList.remove('color-glitch', 'glitch-pop');
    }, 260);
  }

  /* ---------- RANDOM BACKGROUND GLITCH POPS ---------- */
  function scheduleRandomGlitch() {
    const delay = 8000 + Math.random() * 12000; // 8–20s
    setTimeout(() => {
      if (ghost.classList.contains('on')) {
        maybeGlitchPop();
      }
      scheduleRandomGlitch();
    }, delay);
  }
  scheduleRandomGlitch();

  /* ---------- BORED / WANDER MODE (ONE SYSTEM) ---------- */
  let boredomTimer = null;
  const BORED_MS = 20000; // 20s of no typing/empty → wander

  function cancelBoredom() {
    if (boredomTimer) {
      clearTimeout(boredomTimer);
      boredomTimer = null;
    }
    ghost.classList.remove('wander');
  }

  function armBoredom() {
    cancelBoredom();
    boredomTimer = setTimeout(() => {
      enterBoredMode();
    }, BORED_MS);
  }

  function enterBoredMode() {
    if (!ghost.classList.contains('on')) return;
    if ((input.value || '').trim().length > 0) return;

    setMood('mood-neutral');
    ghost.classList.add('wander');

    const codeLines = [
      'while (true) {',
      '  ghost.capture(fragment);',
      '  archive.push(shadowCopy);',
      '  // it never forgets',
      '}'
    ];
    bubble.textContent = codeLines.join('\n');
    bubble.classList.add('show');
    bubble.classList.remove('hide');
    bubble.removeAttribute('aria-hidden');

    maybeColorGlitch();
  }

  /* ---------- “STEAL WORDS” GLITCH (LONG PAUSE) ---------- */
  let hasStolenOnce = false;

  function stealFragmentOnPause() {
    if (hasStolenOnce) return;
    const raw = input.value.trim();
    if (raw.length < 40) return;

    hasStolenOnce = true;

    const fragment = raw.slice(-50);
    const glitched = fragment
      .split('')
      .map(ch => {
        if (/\s/.test(ch)) return ch;
        if (Math.random() < 0.18) return '▢';
        if (Math.random() < 0.12) return ch.toUpperCase();
        return ch;
      })
      .join('');

    ghost.classList.add('glitch-pop');
    say(`“${glitched}”\n…this is how it remembers.`, 'mood-evil');

    setTimeout(() => ghost.classList.remove('glitch-pop'), 260);
  }

  /* ---------- DELETION REACTION (BIG DRAMA) ---------- */
  let lastValue = '';
  let deleteCooldown = false;
  let deleteStreak = 0;
  let lastChangeWasDelete = false;
  const DELETE_TRIGGER = 2;  // after ~2 chars deleted continuously

  function reactToDeletion(prevValue, currentValue) {
    if (deleteCooldown) return;
    deleteCooldown = true;

    const removed = prevValue.slice(currentValue.length);
    const trimmed = removed.trim();
    const snippet = trimmed.length > 60 ? trimmed.slice(-60) : trimmed;

    // step 1: go into "delete scene" pose
    setMood('mood-delete');
    say('…i saw you try to erase that.', 'mood-delete');

    // step 2: show what it “kept”
    setTimeout(() => {
      if (snippet.length) {
        say(`i already kept this: “${snippet}”`, 'mood-evil');
      } else {
        say('i already captured the earlier version.', 'mood-evil');
      }
      ghost.classList.add('glitch-pop');
      setTimeout(() => ghost.classList.remove('glitch-pop'), 260);
    }, 900);

    // step 3: hold the evil moment, then glide back
    setTimeout(() => {
      setMood('mood-neutral');
      hideBubble();
    }, 3600);

    deleteStreak = 0;
    lastChangeWasDelete = false;
    setTimeout(() => { deleteCooldown = false; }, 5200);
  }

  /* ---------- TYPING LOGIC ---------- */
  let typingTimer = null;
  const IDLE_MS = 1000;

  input.addEventListener('focus', () => {
    showGhost();
    cancelBoredom();
    say('i’m listening…', 'mood-neutral');
    lastValue = input.value || '';
    deleteStreak = 0;
    lastChangeWasDelete = false;
    armBoredom();
  });

  input.addEventListener('input', () => {
    showGhost();
    cancelBoredom();
    armBoredom();

    const prev    = lastValue;
    const current = input.value;

    const rawLen     = current.length;
    const prevLen    = prev.length;
    const trimmedLen = current.trim().length;
    const delta      = rawLen - prevLen;

    /* --- deletion streak logic --- */
    if (delta < 0) {
      const removedCount = Math.abs(delta);

      if (lastChangeWasDelete) {
        deleteStreak += removedCount;
      } else {
        deleteStreak = removedCount;
      }
      lastChangeWasDelete = true;

      if (deleteStreak >= DELETE_TRIGGER) {
        reactToDeletion(prev, current);
      }
    } else {
      deleteStreak = 0;
      lastChangeWasDelete = false;
    }

    lastValue = current;

    const heavyWords = /(colonial|erase|erased|violence|hurt|death|memory|ghost)/i.test(current);

    // letter-based glitch triggers
    const lastChar = current.slice(-1);
    if (lastChar && /[wa]/i.test(lastChar)) {
      if (Math.random() < 0.4) {
        letterGlitch();
      }
    }

    // text-dependent ghost lines
    if (trimmedLen === 0) {
      hasStolenOnce = false;
      say('i’m listening…', 'mood-neutral');
    } else if (trimmedLen < 24) {
      say('keep going…', 'mood-lean');
    } else if (heavyWords && trimmedLen > 30) {
      say('this feels heavy. say it as it was lived.', 'mood-uneasy');
    } else if (trimmedLen < 120) {
      say('okay — say it as you remember it.', 'mood-lean');
    } else {
      say('you’re pouring a lot into this fragment.', 'mood-uneasy');
    }

    // mouth talking
    ghost.querySelector('.mouth')?.classList.add('speaking');

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      ghost.querySelector('.mouth')?.classList.remove('speaking');

      const currentLen = input.value.trim().length;
      if (currentLen === 0) {
        say('i’m still here if you want to try.', 'mood-neutral');
        return;
      }

      if (currentLen > 130) {
        stealFragmentOnPause();
      } else {
        if (heavyWords) {
          say('i will answer, but it may distort what you meant.', 'mood-uneasy');
        } else {
          say('i will try to answer with borrowed memory.', 'mood-neutral');
        }
      }
    }, IDLE_MS);
  });

  input.addEventListener('blur', () => {
    hideBubble();
    ghost.querySelector('.mouth')?.classList.remove('speaking');
    armBoredom(); // can still drift into bored mode
  });

  document.getElementById('askForm')?.addEventListener('submit', () => {
    hideBubble();
    ghost.querySelector('.mouth')?.classList.remove('speaking');
    deleteStreak = 0;
    lastChangeWasDelete = false;
    armBoredom();
  });

  askBtn?.addEventListener('mouseenter', () => {
    ghost.classList.add('mood-lean');
    maybeGlitchPop();
  });

  window.addEventListener('load', () => {
    showGhost();
    say('i’m listening…', 'mood-neutral');
    setTimeout(hideBubble, 900);
    armBoredom();
  });

  /* ---------- PUBLIC HOOK: when AI answer arrives ---------- */
  window.ghostOnAnswer = function(meta = {}) {
    showGhost();

    // snap into “answer” pose
    setMood('mood-answer');
    ghost.classList.add('answer-echo');

    const line = 'this reply is stitched from other people’s words.';
    say(line, 'mood-answer');

    // glitch as it “delivers” the answer
    maybeGlitchPop();
    if (Math.random() < 0.5) {
      maybeColorGlitch();
    }

    // after a few seconds, drift back to neutral + fade bubble
    setTimeout(() => {
      setMood('mood-neutral');
      ghost.classList.remove('answer-echo');
      hideBubble();
    }, 3500);
  };
})();
