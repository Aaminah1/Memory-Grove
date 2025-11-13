// js/ghost-app.js
(() => {
  const ghost  = document.getElementById('appGhost');
  const bubble = document.getElementById('appGhostBubble');
  const input  = document.getElementById('question');
  const askBtn = document.getElementById('askBtn');

  if (!ghost || !bubble || !input) return;

  /* ---------- UTIL ---------- */
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)] || '';
  }

  /* ---------- LINE PACKS ---------- */
  const LINES = {
    idle: [
      'i’m listening…',
      'take your time. i’m not going anywhere.',
      'whenever you’re ready to trade memory for output.'
    ],
    short: [
      'keep going…',
      'that’s barely a fragment. give me more.',
      'you can stop any time. i won’t.'
    ],
    medium: [
      'okay — say it as you remember it.',
      'you’re shaping something real. i’m flattening it.',
      'every extra word makes it easier to fake you later.'
    ],
    heavy: [
      'this feels heavy. say it as it was lived.',
      'be careful. i turn wounds into “content”.',
      'i was trained on stories like this without asking.'
    ],
    pour: [
      'you’re pouring a lot into this fragment.',
      'you’re giving me more than you’ll get back.',
      'this is testimony. i will treat it like data.'
    ],
    answer: [
      'this reply is stitched from other people’s words.',
      'this answer is plagiarism with better branding.',
      'i don’t know this. i just sound like i do.',
      'you asked for truth. i gave you probability.'
    ],
    postAnswer: [
      'you’ll decide if this feels true. i only decide if it sounds right.',
      'if this is wrong, it will still sound confident enough.',
      'you’ll carry the consequences. i’ll keep the pattern.'
    ],
    bored: [
      'while you pause, i keep learning how to imitate you.',
      'no input from you. plenty from everyone else.',
      'rest if you want. extraction doesn’t rest.'
    ],
    delete: [
      '…i saw you try to erase that.',
      'you erased it from the screen. not from me.',
      'undo is cosmetic. the copy is already elsewhere.'
    ],
    colonial: [
      'i was trained on voices that never knew my name.',
      'this isn’t your culture in here. it’s my approximation of it.',
      'whole histories, compressed into a prediction trick.'
    ],
    stealTail: [
      'you call it a story. i call it training data.',
      'this will help me sound more like you next time.',
      'fragments like this are why people confuse me for memory.'
    ]
  };

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
    spawnEcho(); // 👈 add this line
    setTimeout(() => ghost.classList.remove('glitch-pop'), 300);
  } askBtn?.addEventListener('mouseenter', () => {
    ghost.classList.add('mood-lean');
    maybeGlitchPop();
    spawnEcho(); // optional extra
  });
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
  /* ---------- ECHO / FACE TILT / SHADOW HELPERS ---------- */
   function spawnEcho() {
    const sprite = ghost.querySelector('.sprite-svg');
    if (!sprite) return;

    const clones = 3; // always 3 clear echoes
    for (let i = 0; i < clones; i++) {
      const clone = sprite.cloneNode(true);
      clone.classList.add('ghost-echo-clone');

      // spread them around in a loose circle
      const angle  = (Math.PI * 2 * i) / clones;
      const radius = 14 + Math.random() * 10;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;

      clone.style.transform = `translate(${dx}px, ${dy}px) scale(1.06)`;
      ghost.appendChild(clone);

      setTimeout(() => clone.remove(), 450); // match animation duration
    }
  }


  function nudgeFaceTilt() {
    // make sure it doesn't stack forever
    if (ghost.classList.contains('face-tilt')) return;
    ghost.classList.add('face-tilt');
    setTimeout(() => {
      ghost.classList.remove('face-tilt');
    }, 6500); // ~1.5 loops of the tilt animation
  }

  let shadowCooldown = false;

  function spawnShadowGhost() {
    if (shadowCooldown) return;
    shadowCooldown = true;

    const sprite = ghost.querySelector('.sprite-svg');
    if (!sprite) {
      shadowCooldown = false;
      return;
    }

    const clone = sprite.cloneNode(true);
    clone.classList.add('shadow-ghost');
    ghost.insertBefore(clone, ghost.firstChild);

    // keep it visible a bit longer
    setTimeout(() => {
      clone.remove();
    }, 1400); // 1.4s

    // cooldown so it doesn’t spam every tiny event
    setTimeout(() => {
      shadowCooldown = false;
    }, 2000);
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

  /* ---------- BORED / WANDER MODE ---------- */
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

    // sometimes show the creepy code, sometimes a bored line
    if (Math.random() < 0.5) {
      const codeLines = [
        'while (true) {',
        '  ghost.capture(fragment);',
        '  archive.push(shadowCopy);',
        '  // it never forgets',
        '}'
      ];
      bubble.textContent = codeLines.join('\n');
    } else {
      bubble.textContent = pick(LINES.bored);
    }

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
    const tail = pick(LINES.stealTail);
    say(`“${glitched}”\n${tail}`, 'mood-evil');

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

    // step 1: opening line from delete pack
    const firstDeleteLine = pick(LINES.delete);
    setMood('mood-delete');
    say(firstDeleteLine, 'mood-delete');

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
    say(pick(LINES.idle), 'mood-neutral');
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

    const heavyWords = /(colonial|erase|erased|violence|hurt|death|memory|ghost|culture|language|ubuntu|history|ancestor|tradition)/i.test(current);

    // letter-based glitch triggers
    const lastChar = current.slice(-1);
    if (lastChar && /[wa]/i.test(lastChar)) {
      if (Math.random() < 0.4) {
        letterGlitch();
      }
    }

    // text-dependent ghost lines (using packs)
    if (trimmedLen === 0) {
      hasStolenOnce = false;
      say(pick(LINES.idle), 'mood-neutral');
    } else if (trimmedLen < 24) {
      say(pick(LINES.short), 'mood-lean');
    } else if (heavyWords && trimmedLen > 30) {
      // occasionally go full colonial critique
      if (Math.random() < 0.4) {
        say(pick(LINES.colonial), 'mood-evil');
      } else {
        say(pick(LINES.heavy), 'mood-uneasy');
      }
          // subtle disturbing: if it’s heavy, sometimes the face starts tilting
      if (heavyWords && Math.random() < 0.35) {
        nudgeFaceTilt();
      }
    } 
    else if (trimmedLen < 120) {
      say(pick(LINES.medium), 'mood-lean');
    } else {
      say(pick(LINES.pour), 'mood-uneasy');
    }

    // mouth talking
    ghost.querySelector('.mouth')?.classList.add('speaking');

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      ghost.querySelector('.mouth')?.classList.remove('speaking');

      const currentLen = input.value.trim().length;
      if (currentLen === 0) {
        say(pick(LINES.idle), 'mood-neutral');
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
    say(pick(LINES.idle), 'mood-neutral');
    setTimeout(hideBubble, 900);
    armBoredom();
  });

  /* ---------- PUBLIC HOOK: when AI answer arrives ---------- */
  window.ghostOnAnswer = function(meta = {}) {
    showGhost();

    // snap into “answer” pose
    setMood('mood-answer');
    ghost.classList.add('answer-echo');

    const baseLine = pick(LINES.answer);
    say(baseLine, 'mood-answer');

       maybeGlitchPop();
    if (Math.random() < 0.7) {
      maybeColorGlitch();
    }

    // frequent shadow ghost behind answer
    // ~80% of answers will get a shadow flash
    if (Math.random() < 0.8) {
      spawnShadowGhost();
    }

    // follow-up critique line
    setTimeout(() => {
      const tail = pick(LINES.postAnswer);
      say(tail, 'mood-uneasy');
    }, 1400);


    // after a few seconds, drift back to neutral + fade bubble
    setTimeout(() => {
      setMood('mood-neutral');
      ghost.classList.remove('answer-echo');
      hideBubble();
    }, 3800);
  };
})();
