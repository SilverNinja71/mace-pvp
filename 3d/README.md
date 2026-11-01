# Spear-Mace: Sky Arena (3D), work in progress

This is the 3D rebuild of Spear-Mace PVP for CrazyGames. It is **not playable yet**: there is no page to open.
The 2D game at the top of this repository is unchanged and still works.

## Done (in `src/`, about 3,400 lines, every file passes a syntax check)

| File | What it does |
|---|---|
| `config.js` | Tuning: gravity -28 m/s², 0.12 s coyote time, jump buffer, spear and mace numbers, parry, match rules, the 8 classes from the 2D game, bot levels |
| `physics.js` | Fast collision: upright cylinders and boxes, step-up, ground and ceiling checks, raycasts, line of sight. No allocations per frame |
| `arena.js` | The Floating Sky Pillar Arena: round colosseum, 12 pillars (tall and broken), 4 floating monoliths, a centre wind geyser, 4 tiered islands with jump pads, gradient sky, instanced clouds, dust motes moved by a shader. Static parts are merged into 2 draw calls |
| `gfx.js` | Cel-shading ramp, geometry merging, glow and ring textures |
| `character.js` | Low-poly fighters with 8×8 pixel faces for every skin in the shared save, a procedural spear (silver shaft, glowing gold tip) and a rune mace, walk/attack animation, first-person viewmodel arms with bob and sway |
| `fighter.js` | Movement and abilities: jump, wind-charge double jump, glide, spear dash in the look direction (ground or air), mace slam, ground swing, parry, jump pads, geyser, void, class abilities |
| `combat.js` | Spear pierce with crit at full extension, slam damage from fall height, a landed hit bounces you up and resets the fall, shockwave, swing, parry, clash, poison/fire/slow/blind, lightning bolts, knockback that grows as health drops |
| `bot.js` | Bot AI: jump-pad navigation, spear dashes that lead the target, geyser climbs for high slams, slam and dash dodging, parries, getting back from the void |
| `fx.js` | Pooled voxel sparks, shockwave rings, lightning, floating damage numbers, screen shake |
| `audio.js` | Procedural positional sound effects, mute switch, `#mute` in the address |
| `input.js` | Keyboard and mouse with pointer lock, latched taps, gamepad, touch joystick and buttons |
| `camera.js` | First person or over the shoulder (V), wall collision, FOV kick 90→105 on dashes |
| `profile.js` | Reads and writes the shared `spear_mace_user_profile` save (same XP and gold rules as 2D) and checks trophies |
| `crazygames.js` | CrazyGames SDK v3: gameplayStart/Stop, loading events, rewarded and midgame ads with mute and pause, invite links |

`lib/three/` is Three.js r160 and `fonts/` holds Fredoka and Lilita One. Both are copied from Penguin League's
vendor folder, so nothing loads from a CDN.

## Still to do, in order

1. `game.js`: scene, renderer, the fixed 120 Hz loop with interpolation, modes (Quick Play, Duel, Brawl, Gauntlet,
   Training), KOs, respawns, timer, and effects and sound for each event.
2. `ui.js` + `index.html` + CSS: title screen with one-click Quick Play, class and skin pickers, settings, HUD,
   pause screen, results, the rewarded "Revive with full health" button, and touch buttons.
3. Tutorial (short and skippable) and control hints for the first minute.
4. Auto quality with dynamic resolution, and Reduced motion.
5. `tools/build-crazygames.py`: the upload zip, built the same way as Penguin League's.
6. Online rooms (PeerJS, `?room=` links) to finish last. The 2D game's online play still works in the meantime.
