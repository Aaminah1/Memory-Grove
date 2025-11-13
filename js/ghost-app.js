// js/ghost-app.js
(() => {
  const ghost  = document.getElementById('appGhost');
  const bubble = document.getElementById('appGhostBubble');
  const input  = document.getElementById('question');
  const askBtn = document.getElementById('askBtn');

  if (!ghost || !bubble || !input) return;

  /* ---------- BLINK VARIATION ---------- */
  function seedBlink() {
    const dur = 3.6 + Math.random() * 1.2; // 3.6–4.8s
    document.documentElement.style.setProperty('--blinkDur', `${dur.toFixed(2)}s`);
  }
  seedBlink();

  /* ---------- MOOD STATE ---------- */
  const MOOD_CLASSES = ['mood-neutral', 'mood-lean', 'mood-uneasy', 'mood-evil'];

  function setMood(name) {
    MOOD_CLASSES.forEach(c => ghost.classList.remove(c));
    if (name) ghost.classList.add(name);
  }

  function setStateInvade(on) {
    if (on) ghost.classList.add('invade');
    else ghost.classList.remove('invade');
  }
  function setStateVanish(on) {
    if (on) ghost.classList.add('vanish');
    else ghost.classList.remove('vanish');
  }

  /* ---------- BUBBLE HELPERS ---------- */
  function showGhost() {
    ghost.classList.add('on');
    ghost.removeAttribute('aria-hidden');
    if (!MOOD_CLASSES.some(c => ghost.classList.contains(c))) {
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

  /* ---------- “STEAL WORDS” GLITCH + INVASION ---------- */
  let hasStolenOnce = false;

  function stealFragment() {
    if (hasStolenOnce) return;
    const raw = input.value.trim();
    if (raw.length < 40) return;

    hasStolenOnce = true;

    const fragment = raw.slice(-80); // last 80 chars
    const glitched = fragment
      .split('')
      .map(ch => {
        if (/\s/.test(ch)) return ch;
        if (Math.random() < 0.20) return '▢';
        if (Math.random() < 0.15) return ch.toUpperCase();
        return ch;
      })
      .join('');

    // invade: slide in, get big & evil
    setStateInvade(true);
    setMood('mood-evil');
    ghost.classList.add('glitch-pop');

    say(`“${glitched}”\n…it likes this version better.`, 'mood-evil');

    setTimeout(() => {
      ghost.classList.remove('glitch-pop');
    }, 220);

    // then fade out + return calmer
    setTimeout(() => {
      setStateVanish(true);
      hideBubble();
    }, 1800);

    setTimeout(() => {
      setStateInvade(false);
      setStateVanish(false);
      setMood('mood-neutral');
      showGhost();
      say('as if nothing happened.', 'mood-neutral');
    }, 3200);
  }

  /* ---------- RANDOM GLITCH POPS ---------- */
  function scheduleRandomGlitch() {
    const delay = 8000 + Math.random() * 12000; // 8–20s
    setTimeout(() => {
      if (ghost.classList.contains('on') && !ghost.classList.contains('vanish')) {
        ghost.classList.add('glitch-pop');
        setTimeout(() => ghost.classList.remove('glitch-pop'), 180);
      }
      scheduleRandomGlitch();
    }, delay);
  }
  scheduleRandomGlitch();

  /* ---------- TYPING LOGIC ---------- */
  let typingTimer = null;
  const IDLE_MS = 1000;

  input.addEventListener('focus', () => {
    showGhost();
    say('i’m listening…', 'mood-neutral');
  });

  input.addEventListener('input', () => {
    showGhost();

    const text = input.value;
    const len  = text.trim().length;
    const heavyWords = /(colonial|erase|erased|violence|hurt|death|memory|ghost|harm)/i.test(text);

    // lean closer as they type more (just mood, CSS handles size)
    if (len === 0) {
      hasStolenOnce = false;
      setMood('mood-neutral');
      say('i’m listening…', 'mood-neutral');
    } else if (len < 40) {
      setMood('mood-lean');
      say('keep going…', 'mood-lean');
    } else if (len < 120) {
      setMood(heavyWords ? 'mood-uneasy' : 'mood-lean');
      say('okay — say it as you remember it.', heavyWords ? 'mood-uneasy' : 'mood-lean');
    } else {
      setMood(heavyWords ? 'mood-uneasy' : 'mood-lean');
      say('you’re giving it a lot to twist.', 'mood-uneasy');
    }

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
        // on a long heavy pause → invade + steal
        stealFragment();
      } else {
        if (heavyWords) {
          say('i will answer, but it may hollow something out.', 'mood-uneasy');
        } else {
          say('i will try to answer with borrowed memory.', 'mood-neutral');
        }
      }
    }, IDLE_MS);
  });

  input.addEventListener('blur', () => {
    hideBubble();
    ghost.querySelector('.mouth')?.classList.remove('speaking');
  });

  document.getElementById('askForm')?.addEventListener('submit', () => {
    hideBubble();
    ghost.querySelector('.mouth')?.classList.remove('speaking');
  });

  // Hover ask button → obvious lean in
  askBtn?.addEventListener('mouseenter', () => {
    if (!ghost.classList.contains('vanish')) {
      setMood('mood-lean');
      ghost.classList.add('glitch-pop');
      setTimeout(() => ghost.classList.remove('glitch-pop'), 200);
    }
  });

  // On load, quick hello
  window.addEventListener('load', () => {
    showGhost();
    say('i’m listening…', 'mood-neutral');
    setTimeout(hideBubble, 900);
  });
})();
