"""Generate a standalone page for each case study.

The case-study copy lives in one place: the .nb-overlay blocks in
index.html. This lifts each one out and wraps it in a real HTML page at
/case/<slug>/, so the URL can be shared somewhere that never sees a
#fragment - LinkedIn, Slack, a CV.

Run it after editing any case-study text:

    python tools/build-case-pages.py
"""

import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://www.rachaelchan.ca'

sys.stdout.reconfigure(encoding='utf-8')


def read(path):
    return io.open(os.path.join(ROOT, path), encoding='utf-8').read()


def text_of(html):
    """Strip tags and collapse whitespace, for meta descriptions."""
    t = re.sub(r'<[^>]+>', '', html)
    t = (t.replace('&amp;', '&').replace('&#8212;', '—')
          .replace('&#8599;', '').replace('&#10005;', '')
          .replace('&nbsp;', ' ').replace('&#169;', '©'))
    return re.sub(r'\s+', ' ', t).strip()


src = read('index.html')

# the bits of <head> worth carrying over verbatim
fonts = re.search(r'<link href="https://fonts\.googleapis[^>]+>', src).group(0)
favicon = re.search(r'<link rel="icon"[^>]+>', src).group(0)

overlays = re.findall(r'<div class="nb-overlay" id="[^"]+" data-slug="[^"]+" hidden>.*?\n</div>',
                      src, re.S)
if not overlays:
    raise SystemExit('no .nb-overlay blocks found in index.html')

pages = []
for block in overlays:
    slug = re.search(r'data-slug="([^"]+)"', block).group(1)
    title = text_of(re.search(r'<h2 class="nb-title"[^>]*>(.*?)</h2>', block, re.S).group(1))
    sub = text_of(re.search(r'<p class="nb-sub">(.*?)</p>', block, re.S).group(1))
    kicker = text_of(re.search(r'<p class="nb-kicker">(.*?)</p>', block, re.S).group(1))

    # the notebook itself, without the overlay chrome
    nb = re.search(r'(<div class="nb"[^>]*>.*)\n\s*</div>\s*$', block, re.S).group(1)
    nb = re.sub(r'\s*<button class="nb-close".*?</button>\n', '\n', nb, flags=re.S)
    nb = re.sub(r'\s*<div class="nb-scrim"[^>]*></div>\n', '', nb)

    # tabs become plain anchors: there's no scroll container to drive on a
    # normal page, and anchors work without any script at all
    nb = re.sub(r'<button type="button" data-goto="([^"]+)">',
                lambda m: '<a href="#%s">' % m.group(1), nb)
    nb = re.sub(r'(<a href="#[a-z0-9-]+">(?:(?!</button>).)*?)</button>',
                lambda m: m.group(1) + '</a>', nb, flags=re.S)

    # the page lives two levels down, so site-relative asset paths in the
    # copied markup have to be re-pointed
    nb = nb.replace('src="assets/', 'src="../../assets/')
    nb = nb.replace('href="assets/', 'href="../../assets/')

    pages.append({'slug': slug, 'title': title, 'sub': sub, 'kicker': kicker, 'nb': nb})

TEMPLATE = '''<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} — Rachael Chan</title>
  <meta name="description" content="{desc}" />
  <link rel="canonical" href="{url}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Rachael Chan" />
  <meta property="og:title" content="{title} — Rachael Chan" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:url" content="{url}" />
  <meta property="og:image" content="{img}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{title} — Rachael Chan" />
  <meta name="twitter:description" content="{desc}" />
  <meta name="twitter:image" content="{img}" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  {fonts}
  <link rel="stylesheet" href="../../styles.css" />
  {favicon}
</head>
<body>

<div class="page case-page">

  <header class="top">
    <a class="brand" href="../../index.html" aria-label="Rachael Chan — back to the homepage">
      <span class="tape tape--blue" aria-hidden="true"></span>
      <span class="avatar"><img src="../../assets/profile/rachael%20chan.png" alt="" /></span>
      <span class="name">Rachael Chan</span>
    </a>
    <nav class="top-nav">
      <a class="chip r1" href="../../index.html#work">&#8592; ALL PROJECTS</a>
      <button class="chip theme-toggle" id="themeToggle" type="button" aria-label="Switch between light and dark mode"><svg class="ci ti ti-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v2.3M12 19.3v2.3M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.4 12h2.3M19.3 12h2.3M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg><svg class="ci ti ti-moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z"/></svg><span class="chip-label tt-label"><span class="tt-dark">LIGHT</span><span class="tt-light">DARK</span></span></button>
    </nav>
  </header>

  <main class="case-main">
{nb}
  </main>

  <footer class="foot">
    <div class="foot-mount">
      <span class="tape tape--plaid foot-tape" aria-hidden="true"></span>
      <div class="foot-card">
        <div class="foot-row">
          <div>
            <p class="foot-hi">Say hi &#8212;</p>
            <a class="foot-mail" href="mailto:rachaelchan1102@gmail.com">rachaelchan1102@gmail.com</a>
            <div class="foot-chips">
              <a class="chip" href="https://github.com/rachaelchan1102" target="_blank" rel="noopener">GITHUB &#8599;</a>
              <a class="chip" href="https://linkedin.com/in/rachael-chan-01726b334/" target="_blank" rel="noopener">LINKEDIN &#8599;</a>
            </div>
          </div>
          <div class="foot-end">
            <p class="foot-thanks">thanks for reading</p>
            <p class="foot-copy">&#169; <span id="year">2026</span> Rachael Chan &#183; Toronto</p>
          </div>
        </div>
      </div>
    </div>
  </footer>

</div>

<script src="../../script.js"></script>
<script>window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};</script>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
'''

for pg in pages:
    out_dir = os.path.join(ROOT, 'case', pg['slug'])
    os.makedirs(out_dir, exist_ok=True)
    url = '%s/case/%s/' % (SITE, pg['slug'])
    html = TEMPLATE.format(
        title=pg['title'],
        desc=pg['sub'],
        url=url,
        img='%s/assets/og/%s.png' % (SITE, pg['slug']),
        fonts=fonts,
        favicon=favicon,
        nb=pg['nb'],
    )
    io.open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(html)
    print('  case/%s/index.html   %s' % (pg['slug'], pg['title']))

print('\n%d page(s) generated' % len(pages))
