"""Turn a design export (the "portfolio-export" folder from the zip) into the site.

    python3 tools/import-export.py ~/Downloads/portfolio-export

The export keeps every page as a flat "*.dc.html" file with placeholder "#"
links. This copies it into the repo and applies what the live site needs on
top of the design, without touching the design itself:

  - fills in the GitHub / LinkedIn / email / live-site links, and opens
    outside links and email in a new tab
  - hides the FSAE GitHub button (that repo isn't public)
  - moves pages to short addresses (/work, /projects/oum, /m/work, ...) and
    rewrites every link and file-name check in the page scripts to match
  - adds the phone/laptop switch (device-route.js) and the favicon set
  - points the empty diagram slots at the SVGs in assets/diagrams/
  - speeds up the home pages' station-to-station scroll (STATION_MOVE_MS)
  - applies copy updates made since the export (COPY_FIXES)

Files the repo owns (device-route.js, favicons, assets/diagrams, vercel.json)
are left alone.
"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GH = 'https://github.com/rachaelchan1102'
LI = 'https://linkedin.com/in/rachael-chan-01726b334/'
MAIL = 'mailto:rachaelchan1102@gmail.com'
REPO = {'convospark': GH + '/ConvoSparkAI', 'oum': GH + '/OntarioUniversityMetrics', 'rosterflow': GH + '/RosterFlow'}
LIVE = {'oum': 'https://www.ontariouniversitymetrics.com/'}
HIDE_GITHUB = {'fsae'}
DIAGRAMS = {'oum-diagram-pipeline': 'oum_pipeline_diagram.svg', 'oum-diagram-tokens': 'token_matching_diagram.svg',
            'convo-diagram-rag': 'rag_pipeline_diagram_convosparkai.svg', 'convo-diagram-speech': 'speech_segmentation_diagram.svg'}
# Station-to-station scroll on the home pages, in ms (the export uses 1900).
STATION_MOVE_MS = 1200
# Copy updates made after the design export, as (old, new) text swaps per page.
# Each must match once; the import warns if the export's wording has changed.
COPY_FIXES = {
    'rosterflow': [
        ('77% → 96%', '23% → 4%'),
        ('shows fully staffed after cancellations (simulated)', 'volunteer spots left unfilled, over 3 months'),
        ('>8 → 3<', '>10 → 6<'),
        ('musicians driving per show, on average', 'vehicles per site visit, across 10 shows'),
        ('Adopting the backup policy raised the share of fully staffed shows from 77% to 96% in simulation, and carpool grouping cut the average number of musicians driving to each show from 8 to 3.',
         'Scheduling backups for each show cut unfilled volunteer spots from 23% to 4% over 3 months, and grouping nearby musicians into shared rides cut the average number of vehicles per site visit from 10 to 6 across 10 shows.'),
        ('Shows fully staffed after cancellations', 'Volunteer spots left unfilled'),
        ('77% (no backups)', '23% (no backups)'),
        ('96% (with backups)', '4% (with backups)'),
        ('Musicians driving per show, on average', 'Vehicles per site visit, on average'),
        ('border-top:1px solid #c9c5ba">8</td>', 'border-top:1px solid #c9c5ba">10</td>'),
        ('3 (62% fewer vehicles)', '6 (40% fewer vehicles)'),
        ('The fill-rate figures come from a Monte Carlo simulation of 5,000 runs with a fixed 1-in-8 chance that any musician cancels. They estimate the effect of the backup policy under that assumption and are not a measured season of real shows.',
         'The number of backups per show comes from a Monte Carlo simulation of 5,000 runs with a 1-in-8 chance that any musician cancels. The unfilled-spot figures were measured over 3 months of real shows, and the vehicle figures across 10 shows.'),
    ],
}
ICONS = ('<link rel="icon" href="/favicon.svg" type="image/svg+xml">\n'
         '<link rel="icon" href="/favicon-96.png" sizes="96x96" type="image/png">\n'
         '<link rel="apple-touch-icon" href="/apple-touch-icon.png">')
VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1">'
# Export files that aren't part of the site.
SKIP = {'README.md', 'Line Video.dc.html', '.image-slots.state.json', 'assets/favicon.svg', 'assets/linkedin-robot.png'}

PROJECTS = ['pso', 'rosterflow', 'fsae', 'oum', 'convospark']
SECTIONS = ['Work', 'Projects', 'Story', 'Resume']
PAGES = {'Portfolio Home - Assembly Line v4.dc.html': '/', 'Mobile - Home.dc.html': '/m'}
for s in SECTIONS:
    PAGES[f'Portfolio {s} - Line.dc.html'] = f'/{s.lower()}'
    PAGES[f'Mobile - {s}.dc.html'] = f'/m/{s.lower()}'
for p in PROJECTS:
    PAGES[f'project-{p}.dc.html'] = f'/projects/{p}'
    PAGES[f'Mobile - project-{p}.dc.html'] = f'/m/projects/{p}'


def out_file(url):
    return os.path.join(ROOT, url.strip('/'), 'index.html')


def fill_links(s, project):
    """Replace href="#" placeholders by what the button says."""
    def rep(m):
        tag = m.group(0)
        inner = s[m.end():s.find('</a>', m.end())]
        text = ' '.join(re.sub(r'<[^>]+>', ' ', inner).split()).upper()
        label = (re.search(r'aria-label="([^"]*)"', tag) or [None, ''])[1].upper()
        name = text or label
        if name == 'GITHUB':
            url = REPO.get(project) if project and text == 'GITHUB' else GH
        elif name == 'LINKEDIN':
            url = LI
        elif name == 'EMAIL':
            url = MAIL
        elif name == 'LIVE SITE':
            url = LIVE.get(project)
        else:
            url = None
        if not url:
            if not (name == 'GITHUB' and project in HIDE_GITHUB):
                print(f'  left as "#": {name or "?"}')
            return tag
        return tag.replace('href="#"', f'href="{url}"', 1)
    s = re.sub(r'<a\b[^>]*href="#"[^>]*>', rep, s)
    if project in HIDE_GITHUB:
        s = re.sub(r'\n<a href="#"[^>]*>(?:(?!</a>).)*GITHUB</a>', '', s, count=1, flags=re.S)
    # Outside links and email open in a new tab.
    return re.sub(r'<a href="((?:https?|mailto):[^"]*)"(?![^>]*target=)', r'<a href="\1" target="_blank" rel="noopener"', s)


def short_urls(s):
    """Swap file names for short addresses, including the name checks in the page scripts."""
    s = re.sub(r"(\(sessionStorage\.getItem\('lineHome'\) \|\| ''\)|\blh)\.indexOf\('v4'\) >= 0", r"\1 === '/'", s)
    s = re.sub(r"(\(sessionStorage\.getItem\('lineHome'\) \|\| ''\)|\blh)\.indexOf\('Mobile - Home'\) >= 0", r"\1 === '/m'", s)
    s = s.replace("lh && lh === '/m'", "lh === '/m'").replace("lh && lh === '/'", "lh === '/'")
    s = s.replace("document.referrer.indexOf('Assembly') >= 0", "/^[a-z]+:\\/\\/[^\\/]+\\/(index\\.html)?$/.test(document.referrer)")
    s = s.replace('a[href*="Assembly Line v4"]', 'a[href="/"],a[href^="/#"]')
    s = s.replace('a[href*="Mobile - Home"]', 'a[href="/m"],a[href^="/m#"]')
    s = s.replace('a[href$="Projects.dc.html"]', 'a[href$="/projects"]')
    for old in sorted(PAGES, key=len, reverse=True):
        pat = re.escape(old)
        if old.startswith('project-'):
            pat = r'(?<!Mobile - )' + pat
        s = re.sub(pat, PAGES[old], s)
    # Pages now live in folders, so shared files are referenced from the root.
    s = re.sub(r'''(["'(])(?:\./)?(assets|results)/''', r'\1/\2/', s)
    s = re.sub(r'''(["'])\./(support|page-fade|image-slot|device-route)\.js''', r'\1/\2.js', s)
    return s.replace("'support.js'", "'/support.js'")


def apply_copy_fixes(s, project, where):
    for old, new in COPY_FIXES.get(project, []):
        n = s.count(old)
        if n != 1:
            print(f'  copy fix not applied in {where} ({n} matches): {old[:60]}')
            continue
        s = s.replace(old, new)
    return s


def build_page(src, project):
    s = apply_copy_fixes(open(src).read(), project, os.path.basename(src))
    s = fill_links(s, project)
    s = s.replace('<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">', '')
    assert s.count(VIEWPORT) == 1, src
    s = s.replace(VIEWPORT, VIEWPORT + '\n' + ICONS, 1)
    s = s.replace('<script src="./support.js"></script>', '<script src="./device-route.js"></script>\n<script src="./support.js"></script>', 1)
    if 'Home' in os.path.basename(src):
        s, n = re.subn(r't0s = performance\.now\(\), D = \d+', f't0s = performance.now(), D = {STATION_MOVE_MS}', s)
        if not n:
            print(f'  station move speed not found in {os.path.basename(src)}; left as exported')
    for sid, svg in DIAGRAMS.items():
        s = s.replace(f'<image-slot id="{sid}"', f'<image-slot id="{sid}" src="assets/diagrams/{svg}"')
    return short_urls(s)


def build_page_fade(src):
    s = open(src).read()
    s = s.replace("if (/Assembly%20Line|Assembly Line/.test(location.pathname))", "if (/^\\/(index\\.html)?$/.test(location.pathname))")
    s = s.replace("href.indexOf('.dc.html') < 0", "href.charAt(0) !== '/' || href.charAt(1) === '/'")
    s = s.replace("if (href.indexOf('Assembly Line') >= 0 && document.getElementById('leaveFade')) return;",
                  "if (/^\\/(#|$)/.test(href) && document.getElementById('leaveFade')) return;")
    assert 'Assembly' not in s and '.dc.html' not in s, 'page-fade.js changed shape; update build_page_fade'
    return s


def main(export):
    missing = [f for f in PAGES if not os.path.exists(os.path.join(export, f))]
    if missing:
        sys.exit(f'Not in the export: {missing}')
    for old, url in PAGES.items():
        project = (re.search(r'project-(\w+)\.dc\.html$', old) or [None, None])[1]
        print(f'{old} -> {url}')
        dest = out_file(url)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        open(dest, 'w').write(build_page(os.path.join(export, old), project))
    open(os.path.join(ROOT, 'page-fade.js'), 'w').write(build_page_fade(os.path.join(export, 'page-fade.js')))
    for f in ('support.js', 'image-slot.js'):
        shutil.copy2(os.path.join(export, f), os.path.join(ROOT, f))
    preview = open(os.path.join(export, 'Phone Preview.html')).read().replace('src="Mobile - Home.dc.html"', 'src="/m"')
    open(os.path.join(ROOT, 'Phone Preview.html'), 'w').write(preview)
    for folder in ('assets', 'results'):
        for dirpath, _, files in os.walk(os.path.join(export, folder)):
            for f in files:
                rel = os.path.relpath(os.path.join(dirpath, f), export)
                if rel in SKIP:
                    continue
                os.makedirs(os.path.join(ROOT, os.path.dirname(rel)), exist_ok=True)
                shutil.copy2(os.path.join(export, rel), os.path.join(ROOT, rel))
    left = [f for f in os.listdir(export) if f not in PAGES and f not in SKIP and f not in
            ('assets', 'results', 'support.js', 'image-slot.js', 'page-fade.js', 'Phone Preview.html')]
    if left:
        print('Not imported (new in this export?):', left)


if __name__ == '__main__':
    main(os.path.expanduser(sys.argv[1]) if len(sys.argv) > 1 else sys.exit(__doc__))
