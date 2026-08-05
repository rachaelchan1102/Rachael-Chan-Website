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
    'playing piano',
    'scrapbooking',
    'sleeping in',
    'trying tea samples at Teaspresso',
    'window shopping at Eaton Centre',
    'hiding out on the 28th floor of Chestnut Residence',
    'petting cats',
    'plane watching',
    'lining up for BOGO HeyTea deals',
    'watching plane crash documentaries',
    'baking mini 4-inch cakes',
    'baking toffee chocolate chip cookies',
    'trying to replicate Scaddabush pasta recipes',
    'binging singing competition shows',
    'escaping back to Markham',
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

/* ---------- demo videos ----------
   These clips are tens of megabytes, so nothing is fetched until the
   card is actually on screen. Each then loops while visible and pauses
   when it isn't. If every source fails to play, the frame says so
   instead of sitting blank. */
(function () {
  const vids = document.querySelectorAll('.work-thumb video');
  if (!vids.length) return;

  function load(v) {
    if (v.dataset.loaded) return;
    v.dataset.loaded = '1';
    v.querySelectorAll('source[data-src]').forEach((src) => { src.src = src.dataset.src; });
    v.load();
  }

  vids.forEach((v) => {
    // fires once the browser has run out of sources to try
    v.addEventListener('error', () => v.closest('.work-thumb').classList.add('failed'), true);
    v.addEventListener('loadeddata', () => v.closest('.work-thumb').classList.remove('failed'));
  });

  const vObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        load(v);
        try { v.currentTime = 0; } catch (_) {}
        v.play().catch(() => {});
      } else if (v.dataset.loaded) {
        v.pause();
      }
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

/* ---------- per-project "Why?" summary ---------- */
document.querySelectorAll('.why-btn').forEach((btn) => {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  if (!panel) return;
  btn.addEventListener('click', () => {
    const open = panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.why-label').textContent = open ? 'HIDE' : 'WHY?';
  });
});

/* ---------- Off the Clock: page through the photo deck ---------- */
(function () {
  const track = document.getElementById('snapTrack');
  if (!track) return;
  const deck = track.closest('.snap-deck');
  const viewport = track.parentElement;
  const slides = [...track.children];
  const pageEl = document.getElementById('snapPage');
  const pagesEl = document.getElementById('snapPages');
  let page = 0;
  let anchor = 0; // index of the first photo on the current page

  const perPage = () =>
    Math.max(1, parseInt(getComputedStyle(deck).getPropertyValue('--per'), 10) || 1);
  const gap = () => parseFloat(getComputedStyle(track).gap) || 0;
  const pageCount = () => Math.max(1, Math.ceil(slides.length / perPage()));

  // keepAnchor: after a resize the photos-per-page may have changed, so
  // stay on the photo you were looking at instead of the page number
  function render(keepAnchor) {
    const per = perPage();
    const total = pageCount();
    if (keepAnchor) page = Math.floor(anchor / per);
    page = ((page % total) + total) % total;           // wrap both ways
    anchor = page * per;
    track.style.transform = `translateX(${-page * (viewport.clientWidth + gap())}px)`;
    if (pageEl) pageEl.textContent = String(page + 1);
    if (pagesEl) pagesEl.textContent = String(total);
    // keep off-screen photos out of the tab order
    slides.forEach((s, i) => {
      const onPage = Math.floor(i / per) === page;
      s.inert = !onPage;
      s.setAttribute('aria-hidden', String(!onPage));
    });
  }

  deck.querySelectorAll('[data-snap-dir]').forEach((btn) => {
    btn.addEventListener('click', () => {
      page += Number(btn.dataset.snapDir);
      render();
    });
  });

  // arrow keys when the deck has focus, and swipe on touch
  deck.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { page += 1; render(); }
    else if (e.key === 'ArrowLeft') { page -= 1; render(); }
    else return;
    e.preventDefault();
  });

  let startX = null;
  viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  viewport.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 45) { page += dx < 0 ? 1 : -1; render(); }
  });
  viewport.addEventListener('pointercancel', () => { startX = null; });

  // re-measure when the column width or the per-page count changes
  let raf = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const prev = track.style.transition;
      track.style.transition = 'none';   // resize shouldn't animate
      render(true);
      void track.offsetWidth;
      track.style.transition = prev;
    });
  }).observe(viewport);

  render();
})();

/* ============================================================
   case-study notebooks
   The notebook zooms open from the card that was clicked: one
   transform on one element, so nothing in the page reflows.
   ============================================================ */
(function () {
  const root = document.documentElement;
  let active = null;      // the open .nb-overlay
  let lastTrigger = null; // button to hand focus back to

  function lockScroll() {
    // pad for the scrollbar we're about to remove so the page doesn't jump
    const gap = window.innerWidth - root.clientWidth;
    if (gap > 0) root.style.setProperty('--sb-gap', gap + 'px');
    root.classList.add('nb-lock');
    if (gap > 0) document.body.style.paddingRight = gap + 'px';
  }
  function unlockScroll() {
    root.classList.remove('nb-lock');
    document.body.style.paddingRight = '';
  }

  function open(id, trigger) {
    const overlay = document.getElementById(id);
    if (!overlay || active) return;
    active = overlay;
    lastTrigger = trigger || null;

    // zoom out of the card the reader clicked
    const nb = overlay.querySelector('.nb');
    if (trigger) {
      const r = trigger.getBoundingClientRect();
      nb.style.setProperty('--nb-origin',
        `${Math.round(r.left + r.width / 2)}px ${Math.round(r.top + r.height / 2)}px`);
    } else {
      nb.style.removeProperty('--nb-origin');
    }

    lockScroll();
    overlay.hidden = false;
    overlay.querySelector('.nb-scroll').scrollTop = 0;
    // next frame, so the transition has a start state to animate from
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add('open');
      overlay.querySelector('.nb-close').focus({ preventScroll: true });
      // section offsets only exist once it's visible
      if (overlay.markTabs) overlay.markTabs();
    }));
  }

  function close() {
    if (!active) return;
    const overlay = active;
    active = null;
    overlay.classList.remove('open');
    unlockScroll();

    const done = () => {
      overlay.hidden = true;
      overlay.removeEventListener('transitionend', onEnd);
    };
    const onEnd = (e) => { if (e.target === overlay && e.propertyName === 'opacity') done(); };
    overlay.addEventListener('transitionend', onEnd);
    setTimeout(() => { if (overlay.hidden === false && !overlay.classList.contains('open')) done(); }, 500);

    if (lastTrigger) { lastTrigger.focus({ preventScroll: true }); lastTrigger = null; }
  }

  document.querySelectorAll('.nb-open-btn').forEach((btn) => {
    btn.addEventListener('click', () => open(btn.dataset.notebook, btn));
  });
  document.querySelectorAll('[data-nb-close]').forEach((el) => {
    el.addEventListener('click', close);
  });

  document.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    // keep focus inside the open notebook
    const focusables = active.querySelectorAll('a[href], button:not([disabled])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* section tabs: jump within the notebook, and highlight what you're reading */
  document.querySelectorAll('.nb-overlay').forEach((overlay) => {
    const scroller = overlay.querySelector('.nb-scroll');
    const rail = overlay.querySelector('.nb-tabs');
    const tabs = [...overlay.querySelectorAll('.nb-tabs button')];
    if (!tabs.length) return;

    // the rail pins over the top of the paper, so everything below has to
    // clear its height rather than the raw scrollport edge
    const railH = () => rail.offsetHeight;

    // distance from the top of the scrollable content to this element
    const topOf = (el) =>
      el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

    const sections = tabs.map((t) => overlay.querySelector('#' + t.dataset.goto)).filter(Boolean);
    const setCurrent = (idx) => tabs.forEach((t, i) => t.setAttribute('aria-current', String(i === idx)));

    // a click wins over scroll tracking until the reader scrolls again —
    // the last sections sit at the bottom of the scroll range and can
    // never reach the top, so position alone can't tell them apart
    let picked = -1;
    let pickedAt = 0;

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        const target = overlay.querySelector('#' + tab.dataset.goto);
        if (!target) return;
        picked = i;
        pickedAt = performance.now();
        setCurrent(i);
        scroller.scrollTo({ top: topOf(target) - railH() - 10, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });

    const mark = () => {
      // ignore the scroll events the click itself produced
      if (picked >= 0 && performance.now() - pickedAt < 900) { setCurrent(picked); return; }
      picked = -1;
      const y = scroller.scrollTop + railH() + 24;
      let idx = 0;
      sections.forEach((s, i) => { if (topOf(s) <= y) idx = i; });
      // the final section can't scroll to the top, so at the bottom it's
      // whatever has begun above the middle of the page
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4) {
        const mid = scroller.scrollTop + scroller.clientHeight / 2;
        sections.forEach((s, i) => { if (topOf(s) <= mid && i > idx) idx = i; });
      }
      setCurrent(idx);
    };
    overlay.markTabs = mark;
    let queued = false;
    scroller.addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { mark(); queued = false; });
    }, { passive: true });
  });
})();
