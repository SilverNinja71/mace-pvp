#!/usr/bin/env python3
"""Builds the upload zips for each game portal.

    python3 3d/tools/build-portals.py

dist/spear-mace-crazygames.zip   CrazyGames: their SDK v3 and ads, no online rooms
dist/spear-mace-poki.zip         Poki: the Poki SDK (commercial and rewarded breaks), no online rooms
dist/spear-mace-itch.zip         itch.io: no ads, online rooms included

Each folder (dist/crazygames, dist/poki, dist/itch) is the same game with a small settings script at the
top of the page. The hub's shared-accounts script is left out of all of them, and the build stops if
a page or script would reach any server other than the ones allowed for that portal. Every build also plays
normally when its portal's SDK is blocked or missing.
"""
import os, re, shutil, sys, zipfile

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(GAME, 'dist')
W3 = 'http://www.w3.org/'
CG_SDK = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'
POKI_SDK = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js'

PORTALS = {
    'crazygames': {
        'head': '<script>window.SMA_PORTAL = "crazygames"; window.SMA_ON_CRAZYGAMES = true; window.SMA_OFFLINE = true;</script>\n',
        'peerjs': False,
    },
    'poki': {
        'head': '<script>window.SMA_PORTAL = "poki"; window.SMA_OFFLINE = true;</script>\n<script src="%s"></script>\n' % POKI_SDK,
        'peerjs': False,
    },
    'itch': {
        'head': '<script>window.SMA_PORTAL = "none";</script>\n',
        'peerjs': True,
    },
}
# the SDK addresses appear in the shared wrapper, so they're allowed in every build; only these servers are ever reached
ALLOWED = (CG_SDK, POKI_SDK, W3)


def must_sub(pattern, repl, text):
    new, n = re.subn(pattern, repl, text)
    if not n:
        sys.exit('build-portals: pattern not found: ' + pattern)
    return new


def build(name, cfg):
    out = os.path.join(DIST, name)
    html = open(os.path.join(GAME, 'index.html'), encoding='utf-8').read()
    html = must_sub(r'<!-- shared accounts[^\n]*\n<script>if \(!window\.SMA_ON_CRAZYGAMES[^\n]*\n', '', html)
    if not cfg['peerjs']:
        html = must_sub(r'<!-- PeerJS[^\n]*\n<script>if \(!window\.SMA_ON_CRAZYGAMES[^\n]*\n', '', html)
    html = must_sub(r'(<script>\n  // On CrazyGames)', lambda m: cfg['head'] + m.group(1), html)
    if '"./lib/three/' not in html:
        sys.exit('build-portals: the import map must point at ./lib/three/ (a bare lib/ is ignored)')

    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    skip = shutil.ignore_patterns() if cfg['peerjs'] else shutil.ignore_patterns('peerjs')
    for d in ('src', 'lib', 'fonts', 'assets'):
        shutil.copytree(os.path.join(GAME, d), os.path.join(out, d), ignore=skip)
    for f in ('style.css', 'favicon.svg', 'CREDITS.md'):
        shutil.copy(os.path.join(GAME, f), os.path.join(out, f))
    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)

    bad = []
    for d, _, files in os.walk(out):
        for f in files:
            if not f.endswith(('.html', '.js', '.css')) or f in ('three.module.min.js', 'peerjs.min.js') or os.sep + 'addons' + os.sep in d + os.sep:
                continue  # (library files only mention addresses in comments and specs)
            text = open(os.path.join(d, f), encoding='utf-8').read()
            for u in re.findall(r'https?://[^\s"\'<>)`]+', text):
                if not u.startswith(ALLOWED):
                    bad.append(os.path.relpath(os.path.join(d, f), out) + ': ' + u)
    if bad:
        sys.exit('build-portals: outside addresses left in %s:\n  %s' % (name, '\n  '.join(bad)))

    zip_path = os.path.join(DIST, 'spear-mace-%s.zip' % name)
    if os.path.exists(zip_path):
        os.remove(zip_path)
    total = n = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for d, _, files in sorted(os.walk(out)):
            for f in sorted(files):
                p = os.path.join(d, f)
                z.write(p, os.path.relpath(p, out))
                total += os.path.getsize(p)
                n += 1
    print('%-10s %d files, %.2f MB unzipped, %.2f MB zip -> %s' % (
        name, n, total / 1e6, os.path.getsize(zip_path) / 1e6, os.path.relpath(zip_path, os.path.dirname(GAME))))


if __name__ == '__main__':
    for name, cfg in PORTALS.items():
        build(name, cfg)
