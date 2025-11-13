(() => {
  const ghost   = document.getElementById('appGhost');
  const bubble  = document.getElementById('appGhostBubble');
  const input   = document.getElementById('question');
  const askBtn  = document.getElementById('askBtn');
  if (!ghost || !bubble || !input) return;

  function seedBlink(){
    const dur = 3.6 + Math.random()*1.2; // 3.6–4.8s
    document.documentElement.style.setProperty('--blinkDur', `${dur.toFixed(2)}s`);
  }
  seedBlink();

  let typingTimer = null;
  const IDLE_MS = 900;

  function showGhost(){
    ghost.classList.add('on');
    ghost.removeAttribute('aria-hidden');
  }
function hideBubble(){
  bubble.classList.remove('show');
  bubble.classList.add('hide');
  setTimeout(() => bubble.classList.remove('hide'), 220);
}
function say(text){
  bubble.textContent = text;
  bubble.classList.add('show');
  bubble.classList.remove('hide');
  bubble.removeAttribute('aria-hidden');
}

  // Appear when focusing the field
  input.addEventListener('focus', () => {
    showGhost();
    say('i’m listening…');
  });

  // Update the “listening” line as the user types
  input.addEventListener('input', () => {
    showGhost();
    const len = input.value.trim().length;
    if (len === 0){
      say('i’m listening…');
    } else if (len < 24){
      say('keep going…');
    } else {
      say('okay, say it as you remember it.');
    }
    ghost.querySelector('.mouth')?.classList.add('speaking');
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      ghost.querySelector('.mouth')?.classList.remove('speaking');
      say('i will try to answer with borrowed memory.');
    }, IDLE_MS);
  });

  // Calm down on blur
  input.addEventListener('blur', () => {
    hideBubble();
    ghost.querySelector('.mouth')?.classList.remove('speaking');
  });

  // On submit: keep ghost visible but hide the bubble
  document.getElementById('askForm')?.addEventListener('submit', () => {
    hideBubble();
    ghost.querySelector('.mouth')?.classList.remove('speaking');
  });

  // Optional: quick sanity ping so you can see it immediately on load
  document.addEventListener('DOMContentLoaded', () => {
    showGhost();
    say('i’m listening…');
    setTimeout(hideBubble, 1000);
  });
})();
