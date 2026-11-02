# How to submit Spear-Mace: Sky Arena

Do this first: play the game on your Mac with the sound on, and check it runs smoothly.

```bash
cd ~/Downloads/mace-split/mace-pvp-3d && python3 -m http.server 8000
```

Then open http://localhost:8000/3d/ and click PLAY.

If you change the game, rebuild the zips with `python3 3d/tools/build-portals.py`.

All files are in `~/Downloads/mace-split/mace-pvp-3d/3d/`:
- Zips: `dist/spear-mace-crazygames.zip`, `dist/spear-mace-poki.zip`, `dist/spear-mace-itch.zip`
- Images and videos: `store/`
- Text to paste (title, descriptions, controls, tags, category): `store/store-page.md`

## CrazyGames

1. Sign in to the CrazyGames developer portal and start a new game submission. Choose HTML5.
2. Upload `dist/spear-mace-crazygames.zip`.
3. Set the orientation to landscape. For controls, choose mouse and keyboard, plus mobile/touch.
4. Paste the title, descriptions, controls, tags and category from `store/store-page.md`.
5. Upload the covers: `cover-landscape.png` (1920x1080), `cover-portrait.png` (800x1200), `cover-square.png` (800x800).
6. Upload the videos: `preview-landscape.webm` and `preview-portrait.webm`. If the portal won't accept WebM, convert them to MP4 with HandBrake (free).
7. Say the game uses the CrazyGames SDK v3, with gameplay events, rewarded ads and midgame ads. Leave multiplayer off: this zip has no online rooms.
8. Submit. New games usually start with a small test launch. If they ask for changes, bring their message back to Claude.

## Poki

Poki reviews games before they're accepted, so you apply first.

1. Apply through Poki's developer site (Poki for Developers) and follow their steps. If they accept the game, they'll tell you where to upload it.
2. Upload `dist/spear-mace-poki.zip`.
3. Use the same text and images as above. If they ask for other image sizes, ask Claude to make them.
4. Say the game uses the Poki SDK, with gameplay events, commercial breaks and rewarded breaks.

The Poki connection has only been tested with a stand-in, not on Poki itself, so check ads and sound in their test tool if they give you one.

## itch.io

1. Sign in to itch.io and choose Upload new project.
2. Set "Kind of project" to HTML.
3. Upload `dist/spear-mace-itch.zip` and tick "This file will be played in the browser".
4. Set the embed size to 1280 x 720 and turn on the fullscreen button.
5. Paste the title, description and tags from `store/store-page.md`. Use `cover-landscape.png` as the cover (itch.io may ask you to crop it) and add a few screenshots.
6. Save as a draft, try it on the draft page, then set it to Public.

This version has no ads, and online rooms work, so you can share a room link with friends.
