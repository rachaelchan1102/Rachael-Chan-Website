const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- theme: dark by default, light if the system or the user says so ---------- */
(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  const initial = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  root.setAttribute('data-theme', initial);

  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const sync = () => btn.setAttribute('aria-pressed', String(root.getAttribute('data-theme') === 'dark'));
  sync();
  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    sync();
  });
})();

/* ---------- rotating intro line ---------- */
(function () {
  const el = document.getElementById('rotator');
  if (!el) return;
  const phrases = [
    'in bed sleeping',
    'at Teaspresso trying tea samples',
    'at Eaton Centre window shopping',
    'on the 28th floor of Chestnut Residence',
    'playing piano',
    'petting cats',
    'plane watching',
    'in line for BOGO HeyTea deals',
    'watching plane crash documentaries',
    'baking mini 4-inch cakes',
    'baking toffee chocolate chip cookies',
    'trying to replicate Scaddabush pasta recipes',
    'binging singing competition shows',
    'back in Markham',
  ];
  el.textContent = phrases[0];
  if (reduceMotion) return;
  let i = 0;
  setInterval(() => {
    el.classList.add('out');
    setTimeout(() => {
      let j;
      do { j = Math.floor(Math.random() * phrases.length); } while (j === i && phrases.length > 1);
      i = j;
      el.textContent = phrases[i];
      el.classList.remove('out');
    }, 400);
  }, 2900);
})();

/* ---------- restart preview videos each time they scroll into view ---------- */
(function () {
  const vids = document.querySelectorAll('.work-thumb video');
  if (!vids.length) return;
  const vObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { try { v.currentTime = 0; } catch (_) {} v.play().catch(() => {}); }
      else { v.pause(); }
    });
  }, { threshold: 0.2 });
  vids.forEach((v) => vObs.observe(v));
})();

/* ---------- scroll reveals ---------- */
(function () {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
})();

/* ---------- a project card sits flat and spans the grid while anything is open ---------- */
function syncCardWidth(card) {
  if (!card) return;
  const anyOpen = card.querySelector('.spec.open, .deepdive.open');
  card.classList.toggle('expanded', Boolean(anyOpen));
}

/* ---------- per-project "Why?" ---------- */
document.querySelectorAll('.why-btn').forEach((btn) => {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  if (!panel) return;
  btn.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.why-label').textContent = open ? 'HIDE' : 'WHY?';
    syncCardWidth(btn.closest('.work'));
  });
});

/* ---------- full case studies ---------- */
document.querySelectorAll('.deepdive-btn').forEach((btn) => {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  if (!panel) return;
  btn.addEventListener('click', () => {
    const opening = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(opening));
    btn.querySelector('.dd-label').textContent = opening ? 'HIDE CASE STUDY' : 'FULL CASE STUDY';
    // collapse the inner sections so it reopens tidy
    if (!opening) {
      panel.querySelectorAll('.dd-head[aria-expanded="true"]').forEach((head) => {
        head.setAttribute('aria-expanded', 'false');
      });
    }
    syncCardWidth(btn.closest('.work'));
  });
});

document.querySelectorAll('.dd-head').forEach((head) => {
  head.addEventListener('click', () => {
    const isOpen = head.getAttribute('aria-expanded') === 'true';
    head.setAttribute('aria-expanded', String(!isOpen));
  });
});
