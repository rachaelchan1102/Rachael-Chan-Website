const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(pointer:fine)').matches;

// scroll reveals
const io = new IntersectionObserver((es) => {
  es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// scroll progress thread
const bar = document.getElementById('progress');
addEventListener('scroll', () => {
  const h = document.documentElement;
  bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
}, { passive: true });

// the toolbox — toolbox by default (click to open, never auto), plain list as fallback
(function () {
  const listView = document.getElementById('tbListView');
  const scene = document.getElementById('tbScene');
  const box = document.getElementById('tbBox');
  const tools = document.getElementById('tbTools');
  const hint = document.getElementById('tbHint');
  const showBox = document.getElementById('tbShowBox');
  const showList = document.getElementById('tbShowList');
  if (!scene || !box || !listView) return;

  const setOpen = (open) => {
    scene.classList.toggle('open', open);
    box.setAttribute('aria-expanded', open);
    tools.setAttribute('aria-hidden', !open);
    hint.innerHTML = open
      ? '<span class="spark">✦</span> click to pack it up'
      : '<span class="spark">✦</span> click the toolbox';
  };

  let userTouched = false;
  box.addEventListener('click', () => {
    userTouched = true;
    scene.classList.remove('beg'); // they clicked — no more begging
    setOpen(!scene.classList.contains('open'));
  });

  // if someone is about to scroll past without ever clicking, don't open it
  // for them — just bounce HARDER to beg for the click
  let begFired = false;
  const almostPast = () => {
    if (begFired || userTouched || scene.hidden) return;
    const r = scene.getBoundingClientRect();
    if (r.bottom > 0 && r.bottom < innerHeight * 0.45) {
      begFired = true;
      scene.classList.add('beg');
      removeEventListener('scroll', almostPast);
    }
  };
  addEventListener('scroll', almostPast, { passive: true });

  showBox.addEventListener('click', () => {
    listView.hidden = true;
    scene.hidden = false;
  });

  showList.addEventListener('click', () => {
    setOpen(false);
    setTimeout(() => {
      scene.hidden = true;
      listView.hidden = false;
    }, reduce ? 0 : 350);
  });
})();

// one experience card at a time gets the full "hovered" focus state:
// whichever is closest to the middle of the viewport. Hover works too.
const expRows = [...document.querySelectorAll('.exp-row')];
let focusRaf = null;
function focusRow() {
  focusRaf = null;
  const mid = innerHeight / 2;
  let best = null, bestDist = Infinity;
  expRows.forEach((r) => {
    const rect = r.getBoundingClientRect();
    if (rect.bottom < 100 || rect.top > innerHeight - 100) return; // barely/not visible
    const d = Math.abs((rect.top + rect.bottom) / 2 - mid);
    if (d < bestDist) { bestDist = d; best = r; }
  });
  expRows.forEach((r) => r.classList.toggle('live', r === best));
}
addEventListener('scroll', () => {
  if (!focusRaf) focusRaf = requestAnimationFrame(focusRow);
}, { passive: true });
focusRow();

// magnetic buttons
if (!reduce && fine) {
  document.querySelectorAll('[data-magnet]').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
    });
    btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
  });
}

// gentle 3D tilt on project cards
if (!reduce && fine) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(1100px) rotateX(${(-y * 2).toFixed(2)}deg) rotateY(${(x * 2).toFixed(2)}deg)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}
