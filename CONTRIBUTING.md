# 🛠️ Contributing & IDE Editing Guide

Welcome to **Spear-Mace PVP**! This project is structured as a zero-dependency, modern HTML5 web game. You can edit it with any code editor or IDE (Visual Studio Code, Antigravity, Cursor, WebStorm, etc.).

---

## 🚀 Quick Setup in Your IDE

### 1. Open the Project
Open the project directory in your IDE:
```bash
# In VS Code or Cursor:
code /Users/lin/.gemini/antigravity/scratch/spear-mace-pvp
```

### 2. Live Server / Preview
- **Using Built-in Python Server**:
  Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> (or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> on Mac) and select **"Start Game Server"**, or run:
  ```bash
  python3 server.py
  ```
  This opens `http://localhost:8080/index.html` with instant browser preview.
- **Using VS Code Live Server Extension**:
  Right-click `index.html` and click **"Open with Live Server"**.

---

## 📁 Source Code Organization

When editing in your IDE, all modular game logic lives inside the [`js/`](js/) folder:

| File | Purpose | What You Can Edit |
| :--- | :--- | :--- |
| [`js/config.js`](js/config.js) | Physics & constants | Gravity, jump power, coyote time, and `BOT_SETTINGS` (Practice to God modes). |
| [`js/weapons.js`](js/weapons.js) | Weapon archetypes | Add new weapons, enchantments, upgrade trees, and projectile physics. |
| [`js/arena.js`](js/arena.js) | Ranked tiers & matchmaking | Leaderboard seed, rank thresholds (Bronze to Obsidian), team generator. |
| [`js/auth.js`](js/auth.js) | Profiles, economy & skins | Block face skins, gold payouts, level progression, and Google Auth. |
| [`js/entity.js`](js/entity.js) | Fighter physics engine | Input buffering, jump dynamics, squash & stretch, collision detection. |
| [`js/ai.js`](js/ai.js) | Bot combat intelligence | Dodge calculations, lead targeting, climbing, and punishment logic. |
| [`js/combat.js`](js/combat.js) | Hit resolution | Slam damage formulas, knockback, armor breach, and friendly-fire filters. |
| [`js/renderer.js`](js/renderer.js) | Canvas rendering | Draw functions for Minecraft weapons, block face skins, clouds, and HUD. |
| [`js/audio.js`](js/audio.js) | Synthesized sound engine | Procedural Web Audio API sound effects (crunches, swooshes, sparkles). |
| [`js/particles.js`](js/particles.js) | Particle FX | Shockwaves, wind dash trails, hit sparks, and floating damage numbers. |
| [`js/game.js`](js/game.js) | Game loop & controller | Fixed 60Hz physics accumulator, input listeners, team management. |
| [`js/ui.js`](js/ui.js) | Menu & modal manager | Modals for Armory, Skins, Arena Hub, Leaderboard, and Mobile Touch. |
| [`js/main.js`](js/main.js) | Application bootstrap | DOM ready hook and engine instantiation. |

---

## 🔨 Building the Bundle & Standalone HTML

Whenever you edit files in `js/`, run the zero-dependency Python bundler:
```bash
python3 build.py
```
This automatically updates:
1. `bundle.js`: Consolidated script for `index.html`.
2. `spear-mace-pvp.html`: The 100% self-contained standalone HTML file for offline play and downloading.

*(In VS Code, pressing <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> runs this build task automatically).*

---

## 🎨 Styling & Layout
- Modify [`css/style.css`](css/style.css) for arcade styling, cards, modal animations, and HUD layouts.
- Modify [`index.html`](index.html) for DOM markup and modals.

---

## 🌐 Deploying to GitHub Pages
This repository includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`).
When you push your commits to the `main` branch:
1. Go to your repo on GitHub: **Settings** $\rightarrow$ **Pages**.
2. Under **Build and deployment**, select **Source: GitHub Actions**.
3. Your game will automatically go live at:
   `https://<your-username>.github.io/<your-repo-name>/`!
