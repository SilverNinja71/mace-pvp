#!/usr/bin/env python3
"""Builds the CrazyGames upload for Spear-Mace: Sky Arena.

    python3 3d/tools/build-crazygames.py

dist/crazygames/                 the game folder: index.html, style.css, src/, lib/three, fonts/
dist/spear-mace-crazygames.zip   the same folder zipped, ready to upload in the developer portal

Differences from the GitHub Pages copy: the shared-accounts script is left out (it lives on the
hub site), online rooms are switched off, and the build stops if the page or any script would
reach a server other than CrazyGames' own SDK.
"""
import os, re, shutil, sys, zipfile

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(GAME, 'dist')
OUT = os.path.join(DIST, 'crazygames')
ZIP = os.path.join(DIST, 'spear-mace-crazygames.zip')
ALLOWED = ('https://sdk.crazygames.com/crazygames-sdk-v3.js', 'http://www.w3.org/')


def must_sub(pattern, repl, text):
    new, n = re.subn(pattern, repl, text)
    if not n:
        sys.exit('build-crazygames: pattern not found: ' + pattern)
    return new


html = open(os.path.join(GAME, 'index.html'), encoding='utf-8').read()
html = must_sub(r'<!-- shared accounts[^\n]*\n<script>if \(!window\.SMA_ON_CRAZYGAMES[^\n]*\n', '', html)
html = must_sub(r'(<script>\n  // On CrazyGames)', '<script>window.SMA_ON_CRAZYGAMES = true; window.SMA_OFFLINE = true;</script>\n\\1', html)
if '"./lib/three/' not in html:
    sys.exit('build-crazygames: the import map must point at ./lib/three/ (a bare lib/ is ignored)')

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)
for d in ('src', 'lib', 'fonts'):
    shutil.copytree(os.path.join(GAME, d), os.path.join(OUT, d))
for f in ('style.css', 'favicon.svg'):
    shutil.copy(os.path.join(GAME, f), os.path.join(OUT, f))
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)

# nothing may reach outside the zip except the CrazyGames SDK
bad = []
for d, _, files in os.walk(OUT):
    for f in files:
        if not f.endswith(('.html', '.js', '.css')) or f == 'three.module.min.js':
            continue
        text = open(os.path.join(d, f), encoding='utf-8').read()
        for u in re.findall(r'https?://[^\s"\'<>)`]+', text):
            if not u.startswith(ALLOWED):
                bad.append(os.path.relpath(os.path.join(d, f), OUT) + ': ' + u)
if bad:
    sys.exit('build-crazygames: outside addresses left:\n  ' + '\n  '.join(bad))

if os.path.exists(ZIP):
    os.remove(ZIP)
total = 0
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, _, files in sorted(os.walk(OUT)):
        for f in sorted(files):
            p = os.path.join(d, f)
            z.write(p, os.path.relpath(p, OUT))
            total += os.path.getsize(p)
print('crazygames: %d files, %.2f MB unzipped, %.2f MB zip -> %s' % (
    sum(len(f) for _, _, f in os.walk(OUT)), total / 1e6, os.path.getsize(ZIP) / 1e6, os.path.relpath(ZIP, os.path.dirname(GAME))))
