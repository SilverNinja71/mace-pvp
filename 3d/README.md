# Spear-Mace: Sky Arena (3D)

A fast 3D arena fighter built from Spear-Mace PVP for CrazyGames (and later Poki and itch.io).
Dash with the Wind Spear, slam down from the clouds with the Storm Mace, and knock rivals into the void.
The 2D game at the top of this repository is unchanged.

**Play locally:** run a simple web server from the repository folder (for example `python3 -m http.server 8000`)
and open <http://localhost:8000/3d/>. Add `#mute` to the address for silent testing.
Once this branch is merged, GitHub Pages serves it at `https://silverninja71.github.io/mace-pvp/3d/`.

## Controls

| Action | Keyboard and mouse | Gamepad | Touch |
|---|---|---|---|
| Move / look | WASD / mouse | Left / right stick | Left thumb / drag right side |
| Jump, wind jump (press again in the air), glide (hold) | Space | A | JUMP |
| Spear dash (where you look; ground or air) | Left click | X, RB or RT | SPEAR |
| Mace slam (in the air) / mace swing (on the ground) | Right click or Shift | B or LT | MACE |
| Parry | F, E or middle click | LB | PARRY |
| Camera: first or third person | V | Back | 👁 |
| Buddha grow/shrink | B | Y | — |
| Pause | P or Esc | Start | ❚❚ |
| Scores | Hold Tab | — | — |

## Modes
- **Quick Play**: one click from the title screen. A duel against a bot whose level follows your record (Easy for your first wins, then Normal, then Pro).
- **Duel**: 1 vs 1 bot (Easy, Normal, Pro, God), first to 3 knockouts, 3 minutes, then sudden death.
- **Brawl**: free-for-all against 3 bots, first to 7.
- **King of the Hill**: hold the glowing centre zone alone to score; first to 45 against 3 bots.
- **Last Stand**: 2 lives each; be the last fighter standing against 3 bots.
- **Gauntlet**: one life, waves of tougher bots. On CrazyGames you can revive once by watching an ad.
- Classes unlock as you level up: Normal and Energy at the start, then Lightning (2), Pyro (3), Potionmaster (4), Shadow (5), Void Walker (6), Buddha (7).
- **Training**: a 7-step tutorial (skippable), then free practice on a dummy.
- **Online**: rooms for up to 4 friends with a room code or a `?room=CODE` link (GitHub Pages copy only).

## Progression
Gold and XP come from every match (the same save and rules as the 2D game). Spend gold on skins and weapon
glows (Frost, Ember, Verdant, Void). Classes unlock as you level up. 15 achievements (shown on the results screen and in the Fighter panel) pay gold once each. Three daily missions pay extra gold, and Arena RP
moves you up from Bronze to Obsidian (these tiers also award the shared trophies).

## Maps
- **Sky Colosseum**: a round stone colosseum with a ring of tall and broken pillars, four floating monoliths, a wind geyser in the middle, and four islands on jump pads.
- **Sky Spires**: a smaller disc with four stone spires of rising height (up to 13 m), joined by floating stepping stones. The tallest spire is the place for huge slams.
- **Sky Ruins**: a raised dais with stairs and the geyser on top, stone arches with perches on top, three high monoliths, and islands on the diagonals.

Each map comes at sunset, at night under the stars, or in a thunderstorm. New players start in the Colosseum at sunset.

## Store page (CrazyGames, Poki, itch.io)
`store/` has the covers, the preview videos and `store-page.md` (title, descriptions, controls, tags).
`tools/covers.js` and `tools/preview-video.js` remake them from the game in the browser.

## How it's built
Plain ES modules in `src/`, with Three.js r160 bundled in `lib/three`. There's no build step for the web
copy. `tools/build-portals.py` makes the upload zips for CrazyGames, Poki and itch.io in `dist/`. See `store/SUBMIT.md`.

| File | What it does |
|---|---|
| `config.js` | Every tuning number: gravity -28 m/s², coyote time 0.12 s, spear, mace, parry, match rules, the 8 classes, bot levels |
| `physics.js` | Fast collision against cylinders and boxes, step-up, raycasts |
| `arena.js` | Both maps (colosseum and ruins), islands, jump pads, geyser, sky, clouds, dust, sunset/night/storm themes |
| `fighter.js` | Movement and abilities for players, bots and online friends alike |
| `combat.js` | Spear pierce and crits, slam damage from fall height with bounce, shockwave, parry, clash, status effects |
| `bot.js` | Bot AI: jump pads, aimed dashes, geyser climbs, slam dodging, parries, getting back from the void |
| `game.js` | The fixed 120 Hz loop with interpolation, modes, knockouts, respawns, the camera, effects and sounds for each event |
| `ui.js`, `tutorial.js`, `missions.js` | Menus, HUD, results, the tutorial, daily missions |
| `i18n.js` | Every word the player sees, in English, Spanish, Brazilian Portuguese, French, German, Russian, Turkish, Polish and Indonesian. `node tools/check-i18n.mjs` checks that every language has every key |
| `character.js` | Low-poly fighters with pixel faces, the procedural spear and mace, first-person arms |
| `fx.js`, `audio.js`, `camera.js`, `input.js` | Effects, procedural sound and music, cameras, keyboard/mouse/gamepad/touch |
| `profile.js` | The shared `spear_mace_user_profile` save (same gold, XP and stats as the 2D game) |
| `crazygames.js` | CrazyGames SDK v3: gameplay start/stop, happytime, midgame and rewarded ads, invite links |
| `online.js` | PeerJS rooms: the host decides hits and knockouts, and every player moves their own fighter |
