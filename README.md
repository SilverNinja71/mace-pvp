# ⚔️ Spear-Mace PVP

A fast-paced 2D aerial platformer fighting game inspired by **Minecraft's Mace and Spear mechanics**, remastered from an original Khan Academy ProcessingJS project into a modern, zero-dependency HTML5 application with procedural Web Audio sound synthesis, particle effects, multiple difficulty archetypes, and local 2-Player duel mode.

![Game Preview](index.html)

---

## 🎮 How to Play

### Quick Start
You can launch or share the game immediately in multiple ways:

1. **Standalone Downloadable HTML (Single-File Offline Play)**:
   - File: [`spear-mace-pvp.html`](file:///Users/lin/.gemini/antigravity/scratch/spear-mace-pvp/spear-mace-pvp.html)
   - Double-click to play directly via `file://` in any browser!
   - 100% self-contained (~248 KB): HTML, CSS, JavaScript, procedural Web Audio sound, and canvas renderer all embedded into **one single file**.
   - Zero internet connection or local server required. Easy to share on Discord, flash drives, or email.
   - You can also click the **📥 Download .html** button in the in-game header to download a fresh copy at any time!

2. **One-Command Local Server**:
   ```bash
   ./start.sh
   # or: python3 server.py
   ```
   This automatically starts a local server and opens your default browser at `http://localhost:8080`.

3. **Direct Browser Open**:
   Open `index.html` or `spear-mace-pvp.html` in Chrome, Safari, Firefox, or Edge. Zero Node.js or npm packages required!

---

## 🕹️ Controls

### Single Player / Player 1
| Action | Key(s) | Description |
| :--- | :--- | :--- |
| **Move Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> | Run across platforms |
| **Jump / Double Jump** | <kbd>W</kbd> or <kbd>↑</kbd> | Tap once to jump, tap in air for double jump |
| **Spear Dash** | <kbd>Space</kbd> | High-speed horizontal burst (ground or air). Can dash mid-slam! |
| **Mace Slam** | <kbd>S</kbd> or <kbd>↓</kbd> | Dive downwards at terminal velocity. Hits harder from greater heights! |
| **Pause** | <kbd>Esc</kbd> | Open pause menu |
| **Toggle Mute** | <kbd>M</kbd> | Toggle synthesized Web Audio sound effects |
| **Restart Match** | <kbd>R</kbd> | Quick restart current match |
| **Home Screen** | <kbd>H</kbd> | Return to mode selection menu |

### Local 2-Player Mode (Duel on 1 Keyboard)
- **Player 1**: <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> to move/jump/slam + <kbd>Space</kbd> to Spear Dash
- **Player 2**: <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> to move/jump/slam + <kbd>Enter</kbd> (or <kbd>Shift</kbd>) to Spear Dash

---

## ⚔️ Combat Mechanics

### 1. The Mace Slam (Heavy Impact)
- **Height-Scaled Damage**: Dropping on top of an opponent deals damage based on how far above them you were:
  $$\text{Damage} = \text{clamp}(20 + \Delta \text{Height} \times 1.0, 20, 150)$$
  *Dropping from the skybox off the top edge can land massive 100+ critical hits!*
- **Ground Shockwave**: If you land a slam on the ground near an opponent ($\le 30\text{px}$ radius), it unleashes a ground shockwave for 20 area-of-effect damage.
- **Attacker Bounce**: Successfully connecting with a slam launches you back into the air with $-12$ velocity, resetting your dash so you can immediately chain aerial strikes!

### 2. The Spear Dash (Wind Charge)
- Dashing horizontally into an opponent deals **20 dash damage** and knocks them back.
- Works both on the ground and mid-air.
- You can even dash **mid-slam** to adjust your horizontal alignment!

### 3. Off-Screen Orbit Indicators
- Jumps and bounces can launch you high above the arena ceiling. An off-screen indicator triangle dynamically tracks your altitude in pixels.

---

## 🤖 Game Modes & AI Archetypes

| Mode | Hotkey | Max HP | Description |
| :--- | :---: | :---: | :--- |
| **Practice** | <kbd>T</kbd> | 1000 | 10x health sparring ring with a gentle bot to practice combos and air dashes. |
| **Easy** | <kbd>E</kbd> | 100 | Relaxed bot reaction times. Good for mastering mace bounce chains. |
| **Normal** | <kbd>N</kbd> | 100 | Standard competitive baseline. Bot predicts movement and dodges slams. |
| **Pro** | <kbd>P</kbd> | 100 | Aggressive bot that double jumps to gain height for devastating slams, dodges incoming dashes, and punishes stun. |
| **God** | <kbd>G</kbd> | 100 | **Mythic Boss Bot**: Shrouded in near-black armor, cycles into full invisibility every 15s, regenerates HP after 3s without hits, and has zero dash cooldown mid-air. |
| **Local 2-Player** | <kbd>2</kbd> | 100 | True head-to-head PvP duel on a single keyboard. |
| **Custom Sandbox** | <kbd>C</kbd> | Custom | Tweak any of the 31 bot AI parameters in real time (speed, dodge rate, slam chance, invis, regen, etc.). |

---

## 👤 Google Sign-In & Gamer Profile
Spear-Mace PVP includes a dedicated player profile and authentication system:
- **Google Sign-In**:
  - Supports the official **Google Identity Services (GIS)** client SDK.
  - Built-in zero-config Google authentication flow so you can test and link your Google profile instantly without requiring GCP console setup.
- **Custom Gamer Tag**: Set a personalized display name (e.g. `MaceMaster_99`) or use the random tag generator (<kbd>🎲 Random</kbd>).
- **In-Game Display**: Your chosen username appears on the match HUD, health bars, and game-over victory banners!
- **8 Hero Avatars**: Pick between Steve, Alex, Mace Knight, Wind Breeze, Nether Titan, Ender Champion, Gold Paladin, or your synced Google profile picture.
- **Career Battle Record**: Tracks matches, wins, losses, win rate, total mace slams, peak slam damage, and win streaks with an XP leveling progression system saved locally in your browser.

---

---

## 🗡️ Minecraft Weapons Arsenal & Enchantments
Visit the **⚔️ Armory** to unlock and equip different Minecraft-themed weapons:
- **Minecraft Mace**: Signature aerial slam weapon. Height-scaled damage, orbital launches, and ground shockwaves.
  - *Enchantments*: **Density V** (more height damage), **Wind Burst III** (extra launch bounce), **Breach IV** (penetrates armor).
- **Wind Spear**: Extended wind charges on ground and air. Pierces through incoming attacks.
  - *Enchantments*: **Impaling V** (dash damage), **Piercing IV** (velocity & range), **Breeze Agility III** (lower cooldown).
- **Diamond Sword**: Precision dash slice with a shorter dash distance but dealing **massive swift blade damage**.
  - *Enchantments*: **Sharpness V** (slash damage), **Knockback II** (launches opponents further), **Sweeping Edge III** (wider hit area).
- **Steve Bare Fists**: Brutal close-range knuckle punches with rapid combo recovery and high damage.
  - *Enchantments*: **Strength II** (punch impact), **Haste IV** (faster attack barrages), **Heavy Impact III** (longer stun).
- **Enchanted Bow**: Marksman bow that fires **ranged arrow projectiles** (space key to shoot) with gravity and reload cooldown.
  - *Enchantments*: **Power V** (arrow damage), **Infinity IV** (rapid reload), **Punch II** (arrow knockback).

---

## 🎭 Block Face Skins (Minecraft & Roblox)
Equip iconic characters in the **🎭 Skins Shop**:
- **Minecraft Steve** (Classic blue shirt & brown hair)
- **Minecraft Alex** (Classic green tunic & orange hair)
- **Roblox Classic Noob** (Iconic yellow head, blue torso & green legs)
- **Roblox Man Face** (The legendary smirk block face!)
- **Creeper** (Pixelated green frown)
- **Enderman** (Deep obsidian head with glowing purple eyes)
- **Skeleton Skull** (Bone white undead archer)
- **Zombie** (Rotten green Steve)
- **Diamond Helmet Hero** (Gleaming diamond knight armor)

---

## 💰 Gold Economy & Level Progression
- Defeating single-player bots awards **Gold and XP** (scaled by difficulty: Easy, Normal, Pro, God).
- **Leveling up automatically creates Gold** (+200 Gold per level up!).
- Arena victories award **Gold, XP, and Arena Rating Points (RP)**.
- Spend your Gold to unlock weapons, Minecraft enchantments, and rare block face skins!

---

## 🏟️ Multiplayer Arena Hub (1v1, 2v2, 5v5)
Enter the **🏟️ Arena Hub** for multi-fighter aerial combat:
- **Battle Sizes**:
  - **1 v 1 Duel**: Pure solo combat.
  - **2 v 2 Tag Team**: Co-op 4-player team battle (Red Team vs Blue Team).
  - **5 v 5 Epic Brawl**: 10-fighter massive team chaos!
- **Matchmaking & Private Rooms**:
  - **Public Quick Match**: Click *Find Match* to enter the matchmaking queue with live radar search and player counter.
  - **Private Room**: Create or join custom private rooms using shareable Room Codes (e.g. `MACE-XK92-481`).
- **Loadout Selection**: Choose your equipped weapon before deploying into battle.

---

## 👑 Competitive Divisions & National Leaderboard
Compete in ranked arena matches to earn **Rating Points (RP)** and rank up across 5 divisions:
1. **Bronze Tier** (0 - 499 RP)
2. **Silver Tier** (500 - 999 RP)
3. **Gold Tier** (1000 - 1499 RP)
4. **Diamond Tier** (1500 - 1999 RP)
5. **Obsidian Tier** (2000+ RP) - *The pinnacle champion tier with a crown badge!*

Click **🏆 Ranked** to view the **National Obsidian Leaderboard**:
- Inspect top national champions (e.g. `#1 xX_MaceGod_Xx`, `#2 SkySniper_Pro`), their win rates, favorite weapons, and country flags.
- Track your own live placement and ascent on the national ladder!

---

## 📁 Project Architecture

```
spear-mace-pvp/
├── index.html            # Main layout, HUD, Armory, Skins, Arena & Leaderboard modals
├── css/style.css         # Modern arcade UI styling with dark aesthetic
├── js/
│   ├── config.js         # Game constants, physics variables, BOT_SETTINGS table
│   ├── audio.js          # Procedural Web Audio API sound generator (zero asset files)
│   ├── weapons.js        # Minecraft weapons (Mace, Spear, Sword, Fists, Bow) & Arrows
│   ├── arena.js          # 1v1, 2v2, 5v5 matchmaking, tiers, and national leaderboard
│   ├── auth.js           # Google Sign-In, Gold economy, skins inventory & career stats
│   ├── particles.js      # Shockwaves, sparks, wind trails, floating damage numbers
│   ├── entity.js         # Fighter physics, weapon stats, skin rendering & arrow attacks
│   ├── ai.js             # Bot AI decision tree (dodges, lead prediction, climbs)
│   ├── combat.js         # Combat resolution, weapon damage, friendly-fire filtering
│   ├── renderer.js       # Canvas renderer with Minecraft weapons, skins & team HUDs
│   ├── game.js           # 60 FPS loop, arrow update, team matches & state controller
│   ├── ui.js             # Armory, Skins, Arena hub, Leaderboard, and touch controls
│   └── main.js           # Application entry point
├── bundle.js             # Standalone universal bundle (works directly from file://)
├── build.py              # Zero-dependency Python script to rebuild bundle.js
├── server.py             # Lightweight local HTTP server with auto browser launch
├── start.sh              # 1-click startup script for macOS/Linux
└── README.md             # Complete documentation
```

---

## 🎨 Graphics Styles
You can toggle between two visual styles at any time using the **🎨 Style** button in the top navigation bar:
- **Enhanced Style**: Stylized pixel characters holding animated 3D-effect Minecraft Maces & Wind Spears with dynamic combat posing and aura effects.
- **Classic Style**: The nostalgic Khan Academy ProcessingJS green square player and colored bot boxes.

---

## ⚡ Ultra-Responsive & Zero-Lag Architecture

The game has been engineered specifically for competitive-grade low latency and consistent frame pacing:
1. **Fixed 60Hz Physics Timestep with Accumulator**:
   - Uses a delta-time accumulator loop (`FIXED_DT = 1000 / 60`).
   - Prevents physics from running at double speed on 120Hz/144Hz ProMotion screens while ensuring identical jump arcs, dash distances, and hitstun regardless of monitor refresh rate.
   - Includes a 100ms spiral-of-death clamp to eliminate lag spikes on background tab resume.
2. **Jump & Dash Input Buffering**:
   - Stores jump inputs up to 6 frames (~100ms) before landing, automatically executing instant leaps the exact frame a fighter touches down.
   - Buffers dashes and weapon attacks during cooldown or stun recovery, eliminating dropped inputs.
   - Snappy horizontal braking (`0.65` ground deceleration) and instant directional turnaround eliminate floaty slide latency.
3. **Zero-Allocation Hot Update Loop (GC Elimination)**:
   - Fighter rosters (`allFighters`) and team targets are cached and iterated using in-place indexed `for` loops without allocating temporary arrays (`.filter()`, spread `[...]`) every tick.
   - Direct `_botAI` property references eliminate linear lookups and closure allocations on combat hits.
   - Audio noise buffers (1.0s) are precomputed once, eliminating per-dash/per-slam Float32 buffer allocations.
4. **Canvas & GPU Hardware Acceleration**:
   - `#game-canvas` utilizes `transform: translateZ(0)` and `will-change: transform` to force dedicated GPU composite layering.
   - `touch-action: none` on canvas and `touch-action: manipulation` across all buttons eliminates mobile 300ms click delay.
   - Batched particle drawing eliminates redundant canvas state stack saves and restores.

---

## 🔊 Sound Design
All sound effects in Spear-Mace PVP are **100% procedurally synthesized** via the standard browser Web Audio API:
- **Mace Slam**: Resonant anvil crunch + sub-bass frequency sweep.
- **Spear Dash**: White noise wind-burst envelope.
- **Ground Shockwave**: Low-frequency rumble.
- **Double Jump**: High-frequency sparkle.
- **Invisibility**: Mysterious phased acoustic warning.
- *Zero external sound files or network requests required.*
