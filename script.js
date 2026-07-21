const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// rotating intro line
(function () {
  const el = document.getElementById('rotator');
  if (!el) return;
  const phrases = [
    'at Teaspresso trying tea samples',
    'at Eaton Centre window shopping',
    'on the 28th floor of Chestnut Residence',
    'playing piano',
    'petting cats',
    'plane watching',
    'in bed sleeping',
    'in line for BOGO HeyTea deals',
    'watching plane crash documentaries',
    'baking mini 4-inch cakes',
    'baking toffee chocolate chip cookies',
    'trying to replicate Scaddabush pasta recipes',
    'binging singing competition shows',
    'back in Markham',
  ];
  if (reduceMotion) { el.textContent = phrases[0]; return; }
  let i = 0;
  el.textContent = phrases[0];
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

// theme toggle (follows system until the user picks)
(function () {
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const stored = localStorage.getItem('theme');
  if (stored) root.setAttribute('data-theme', stored);
  const current = () => root.getAttribute('data-theme') || (prefersDark.matches ? 'dark' : 'light');
  const paint = () => { if (btn) btn.textContent = current() === 'dark' ? '☀' : '☾'; };
  paint();
  if (btn) btn.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    paint();
  });
  prefersDark.addEventListener('change', () => { if (!localStorage.getItem('theme')) paint(); });
})();

// restart preview videos from the start each time they scroll into view
(function () {
  const vids = document.querySelectorAll('.work-thumb video');
  if (!vids.length) return;
  const vObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { try { v.currentTime = 0; } catch (_) {} v.play().catch(() => {}); }
      else { v.pause(); }
    });
  }, { threshold: 0.4 });
  vids.forEach((v) => vObs.observe(v));
})();

// scroll reveals
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// per-project "Why?" toggles
document.querySelectorAll('.why-btn').forEach((btn) => {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  if (!panel) return;
  btn.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.why-label').textContent = open ? 'Hide' : 'Why?';
  });
});

// deep-dive accordion (full case study)
(function () {
  const btn = document.querySelector('.deepdive-btn');
  const panel = document.getElementById('oum-deepdive');
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    const opening = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(opening));
    btn.querySelector('.dd-label').textContent = opening ? 'Hide case study' : 'Full case study';
  });
  panel.querySelectorAll('.dd-head').forEach((head) => {
    head.addEventListener('click', () => {
      const isOpen = head.getAttribute('aria-expanded') === 'true';
      head.setAttribute('aria-expanded', String(!isOpen));
    });
  });
})();
