(function () {
  if (window.__pageFade) return; window.__pageFade = true;
  var BG = '#f3f0e8';
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:' + BG + ';opacity:1;pointer-events:none;transition:opacity .55s ease';
  (document.body || document.documentElement).appendChild(ov);
  if (/^\/(index\.html)?$/.test(location.pathname)) { ov.style.transition = 'none'; ov.style.opacity = '0'; }
  function reveal() { setTimeout(function () { ov.style.opacity = '0'; }, 30); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(reveal, 60); }); else setTimeout(reveal, 60);
  window.addEventListener('pageshow', function (e) { if (e.persisted) ov.style.opacity = '0'; });
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var href = a.getAttribute('href') || '';
    if (a.target === '_blank' || href.charAt(0) === '#' || /^(mailto:|tel:|https?:)/i.test(href) || href.charAt(0) !== '/' || href.charAt(1) === '/') return;
    if (/^\/(#|$)/.test(href) && document.getElementById('leaveFade')) return;
    e.preventDefault();
    ov.style.pointerEvents = 'auto'; ov.style.transition = 'opacity .4s ease'; ov.style.opacity = '1';
    var m = document.querySelector('main') || document.querySelector('x-dc > div');
    if (m) { m.style.transition = 'scale .45s cubic-bezier(.5,0,.75,0)'; m.style.transformOrigin = '50% 30%'; m.style.scale = '.96'; }
    setTimeout(function () { window.location.href = href; }, 420);
  });
})();
