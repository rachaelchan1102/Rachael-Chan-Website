/**
 * Render a 1200x630 link-preview image for each case study.
 *
 * LinkedIn, Slack and the rest only show a thumbnail if the page points at
 * a real raster image, and there's no screenshot of either project in the
 * repo. So the card is drawn with the site's own palette and fonts and
 * screenshotted, which keeps it on-brand and needs nothing from outside.
 *
 *   node tools/build-og-images.js
 *
 * Requires playwright (dev-only; not a dependency of the site itself).
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'og');

// pulled out of the generated pages so the wording can't drift
function readCards() {
  const dir = path.join(ROOT, 'case');
  return fs.readdirSync(dir).map((slug) => {
    const html = fs.readFileSync(path.join(dir, slug, 'index.html'), 'utf8');
    const pick = (re) => (html.match(re) || [, ''])[1].trim();
    return {
      slug,
      title: pick(/<meta property="og:title" content="([^"]+)"/).replace(/ — Rachael Chan$/, ''),
      desc: pick(/<meta property="og:description" content="([^"]+)"/),
      kicker: pick(/<p class="nb-kicker">([^<]+)</),
    };
  });
}

const page = (c) => `<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Courier+Prime:wght@400;700&family=Newsreader:opsz,wght@6..72,300..600&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; display: flex; align-items: center; justify-content: center;
    background-color: #f5f2ec;
    background-image: radial-gradient(rgba(90,70,50,.075) 1px, transparent 1px);
    background-size: 10px 10px;
    font-family: Newsreader, Georgia, serif;
  }
  .card {
    position: relative; width: 980px; padding: 56px 60px 52px;
    background: #fffdf8; border: 1.5px solid #3f6188;
    outline: 1px solid #3f6188; outline-offset: 5px;
    box-shadow: 0 18px 44px -12px rgba(60,45,30,.3);
    transform: rotate(-.5deg);
  }
  .tape {
    position: absolute; top: -17px; left: 50%; width: 150px; height: 34px; margin-left: -75px;
    transform: rotate(-1.6deg); opacity: .92;
    background-color: #e3d9c6;
    background-image:
      linear-gradient(180deg, rgba(255,255,255,.32) 0, rgba(255,255,255,0) 20%, rgba(0,0,0,.04) 70%, rgba(0,0,0,.1) 100%),
      repeating-linear-gradient(0deg, rgba(78,68,54,.36) 0 1.5px, transparent 1.5px 13px),
      repeating-linear-gradient(90deg, rgba(78,68,54,.36) 0 1.5px, transparent 1.5px 13px),
      repeating-linear-gradient(0deg, rgba(160,82,70,.38) 5px 6.5px, transparent 6.5px 13px),
      repeating-linear-gradient(90deg, rgba(160,82,70,.38) 5px 6.5px, transparent 6.5px 13px);
    clip-path: polygon(0 0,5px 12%,0 25%,5px 37%,0 50%,5px 62%,0 75%,5px 87%,0 100%,100% 100%,calc(100% - 5px) 87%,100% 75%,calc(100% - 5px) 62%,100% 50%,calc(100% - 5px) 37%,100% 25%,calc(100% - 5px) 12%,100% 0);
  }
  .kicker { font-family: 'Courier Prime', monospace; font-size: 17px; letter-spacing: .18em;
            text-transform: uppercase; color: #9b9082; }
  h1 { font-family: Caveat, cursive; font-size: 92px; font-weight: 700; line-height: 1.02;
       color: #2b2620; margin: 6px 0 18px; letter-spacing: -.01em; }
  p  { font-size: 27px; line-height: 1.45; color: #6f6559; max-width: 24em; }
  .by { display: flex; align-items: baseline; gap: 14px; margin-top: 34px;
        padding-top: 22px; border-top: 1px dashed #d9cdb8; }
  .name { font-family: Caveat, cursive; font-size: 32px; font-weight: 600; color: #3f6188; }
  .site { font-family: 'Courier Prime', monospace; font-size: 16px; color: #9b9082; letter-spacing: .06em; }
</style></head><body>
  <div class="card">
    <div class="tape"></div>
    <div class="kicker">${c.kicker.replace(/&middot;|·/g, '·')}</div>
    <h1>${c.title}</h1>
    <p>${c.desc}</p>
    <div class="by"><span class="name">Rachael Chan</span><span class="site">rachaelchan.ca</span></div>
  </div>
</body></html>`;

(async () => {
  const cards = readCards();
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const c of cards) {
    await p.setContent(page(c), { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);           // let the webfonts settle
    const file = path.join(OUT, `${c.slug}.png`);
    await p.screenshot({ path: file });
    console.log(`  assets/og/${c.slug}.png   ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  }
  await browser.close();
  console.log(`\n${cards.length} image(s) generated`);
})();
