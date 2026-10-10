// The laptop and phone versions are separate pages: /work is the laptop page
// and /m/work is its phone twin. Send each visitor to the version that
// matches their screen, keeping any #section in the URL.
(function () {
  var PHONE_MAX = 760;
  var path = location.pathname.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
  var onPhonePage = path === '/m' || path.indexOf('/m/') === 0;
  var isPhone = window.innerWidth < PHONE_MAX;
  var to = null;

  if (isPhone && !onPhonePage) to = path === '/' ? '/m' : '/m' + path;
  else if (!isPhone && onPhonePage) to = path.slice(2) || '/';

  // Inside the phone preview frame, always show what was asked for.
  if (to && window.top === window) location.replace(to + location.search + location.hash);
})();
