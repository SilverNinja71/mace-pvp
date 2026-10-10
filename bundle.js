(function() {
  'use strict';

  // ===== config.js =====
  // ==========================================
  // SPEAR-MACE PVP - Game Configuration
  // Faithful to the original Khan Academy ProcessingJS game
  // ==========================================
  
  // Google Sign-In: paste your OAuth Client ID here (looks like
  // "1234567890-abc123.apps.googleusercontent.com"). Create one at
  // https://console.cloud.google.com/apis/credentials with your site
  // (e.g. https://silverninja71.github.io) as an Authorized JavaScript origin.
  // Leave empty to hide Google sign-in.
  const GOOGLE_CLIENT_ID = "";
  
  // Overall game speed (1 = original). Lower = everything moves a bit slower.
  const GAME_SPEED = 0.85;
  
  // Walking speed for human players (bots use speed / runSpeed in BOT_SETTINGS)
  const PLAYER_MOVE_SPEED = 4.2;
  
  // Player classes (press I to pick). Times are in frames (60 = 1 second at full speed).
  const CLASSES = {
      normal: {
          name: "Normal",
          desc: "No special ability. Balanced."
      },
      shadow: {
          name: "Shadow",
          desc: "After 22s visible you turn invisible to enemies for 6s: 25% faster and 1.2x damage. When it ends you teleport back to your spawn.",
          invisCycle: 28 * 60,
          invisTime: 6 * 60,
          invisSpeedMult: 1.25,
          invisDamageMult: 1.2
      },
      lightning: {
          name: "Lightning",
          desc: "Mace slams stun 6-10 frames longer, and each slam has a 5% chance to call down a lightning bolt for +20 damage.",
          stunBonusMin: 6,
          stunBonusMax: 10,
          boltChance: 0.05,
          boltDamage: 20
      },
      energy: {
          name: "Energy",
          desc: "Dash again in the air (slightly weaker dashes). Speed boost starts at 25% and grows while you run (max 60%); jumping or standing still drains it.",
          dashCooldown: 40,
          dashDamageMult: 0.85,
          boostStart: 0.25,
          boostMax: 0.60,
          runFrames: 20,
          runGain: 0.01,
          jumpLoss: 0.05,
          stillFrames: 60,
          stillLoss: 0.01
      },
      potion: {
          name: "Potionmaster",
          desc: "Your hits: 25% chance to slow (half speed, 3s), 20% to poison (1 damage every 0.5s for 2s), 5% to blind (2s).",
          slowChance: 0.25, slowTime: 180,
          poisonChance: 0.2, poisonTime: 120, poisonTick: 30,
          blindChance: 0.05, blindTime: 120
      },
      pyro: {
          name: "Pyro",
          desc: "Your hits have a 25% chance to set enemies on fire for 5s: 2 damage per second, and each burn freezes them briefly.",
          fireChance: 0.25, fireTime: 300, fireTick: 60, fireDamage: 2, fireFreeze: 15
      },
      void: {
          name: "Void Walker",
          desc: "Every 7-20 seconds you teleport high above a random enemy, ready to slam. No warning.",
          minDelay: 420,
          maxDelay: 1200
      },
      buddha: {
          name: "Buddha",
          desc: "Press B to grow big or shrink back. While big you deal 1.3x damage at the same speed, but your body is twice as big and much easier to hit.",
          bigScale: 2,            // body (hitbox) is 2x as big...
          attackReachScale: 1.4,  // ...but attacks only reach 1.4x as far
          bigDamageMult: 1.3,
          toggleCooldown: 30
      }
  };
  
  const ARENA_CONFIG = {
      width: 800,
      height: 440,             // Taller view so the ground layers are visible
      groundY: 390
  };
  
  const CORE_PHYSICS = {
      gravity: 0.35,
      jumpPower: -7.2,         // Lower jumps (was -8.5) so double jumps stay on screen
      coyoteTime: 12,
      groundY: 390,
  
      slamSpeed: 17,           // Weightier, deliberate downward slam (reduced from 24)
      dashSpeed: 15,           // Controlled, snappy dash (reduced from 24)
      dashTime: 6,
      dashCooldown: 15,        // Quick re-attack cooldown
  
      slamRadius: 40,
      slamGroundDamage: 25,
      slamAirDamage: 35,
  
      hitStun: 28,             // Snappy hitstun
      maxHp: 100,
  
      slamMinDamage: 25,
      slamMaxDamage: 160,
      slamHeightScale: 1,
  
      dashDamage: 25,          // damage dealt when a dash connects
      hitLaunch: -12,          // upward launch speed for attacker after hit
      runAwayTime: 40          // frames bot runs away after stun ends
  };
  
  const PLATFORMS_CONFIG = [
      { x: 0,   y: 390, w: 800, h: 50, name: "Main Floor" },
      { x: 140, y: 275, w: 150, h: 12, name: "Left Ledge" },
      { x: 510, y: 275, w: 150, h: 12, name: "Right Ledge" }
  ];
  
  // Bot difficulty settings (originally from the ProcessingJS source, rebalanced so each
  // level is clearly harder than the last). damageMult = how hard the bot hits,
  // damageTaken / stunMult = how much damage and stun the bot takes.
  const BOT_SETTINGS = {
      dashAttackChance:   { practice: 1,   easy: 8,   normal: 40,  pro: 70,  god: 70 },
      dashAttackRange:    { practice: 180, easy: 250, normal: 300, pro: 450, god: 450 },
      dashAttackHeight:   { practice: 40,  easy: 50,  normal: 60,  pro: 90,  god: 90 },
      randomDashChance:   { practice: 0.1, easy: 2,   normal: 3,   pro: 3,   god: 5 },
      escapeDashChance:   { practice: 10,  easy: 40,  normal: 40,  pro: 65,  god: 65 },
      runAwayChance:      { practice: 70,  easy: 50,  normal: 40,  pro: 15,  god: 15 },
      dodgeChance:        { practice: 8,   easy: 25,  normal: 65,  pro: 85,  god: 95 },
      dodgeRange:         { practice: 50,  easy: 50,  normal: 90,  pro: 140, god: 140 },
      slamChance:         { practice: 20,  easy: 90,  normal: 100, pro: 100, god: 100 },
      slamCooldown:       { practice: 220, easy: 100, normal: 40,  pro: 20,  god: 20 },
      slamRange:          { practice: 50,  easy: 70,  normal: 90,  pro: 120, god: 120 },
      slamLead:           { practice: 0,   easy: 0,   normal: 8,   pro: 14,  god: 14 },
      climbHeight:        { practice: 0,   easy: 0,   normal: 1,   pro: 1,   god: 1 },
      punishChance:       { practice: 0,   easy: 0,   normal: 20,  pro: 65,  god: 75 },
      dashDodgeChance:    { practice: 0,   easy: 0,   normal: 35,  pro: 60,  god: 75 },
      speed:              { practice: 1.2, easy: 1.6, normal: 2.4, pro: 3.2, god: 3.6 },
      runSpeed:           { practice: 2.4, easy: 3.2, normal: 4.4, pro: 6,   god: 6.8 },
      jumpChance:         { practice: 40,  easy: 80,  normal: 100, pro: 100, god: 100 },
      doubleJumpChance:   { practice: 20,  easy: 70,  normal: 100, pro: 100, god: 100 },
      damageMult:         { practice: 0.6, easy: 0.85,normal: 1.05,pro: 1.25,god: 1.4 },
      maxHP:              { practice: 1000,easy: 100, normal: 100, pro: 100, god: 100 },
      damageTaken:        { practice: 1,   easy: 1,   normal: 1,   pro: 0.85,god: 0.8 },
      stunMult:           { practice: 1,   easy: 1,   normal: 1,   pro: 0.6, god: 0.5 },
      botDashCooldown:    { practice: 40,  easy: 40,  normal: 40,  pro: 15,  god: 8 },
      dashAIDelay:        { practice: 80,  easy: 80,  normal: 80,  pro: 56,  god: 42 },
      dashSpeed:          { practice: 20,  easy: 20,  normal: 20,  pro: 24,  god: 26 },
      airDashRecharge:    { practice: 0,   easy: 0,   normal: 0,   pro: 0,   god: 1 },
      invisible:          { practice: 0,   easy: 0,   normal: 0,   pro: 0,   god: 1 },
      invisEvery:         { practice: 900, easy: 900, normal: 900, pro: 900, god: 720 },
      invisLength:        { practice: 300, easy: 300, normal: 300, pro: 300, god: 420 },
      regen:              { practice: 0,   easy: 0,   normal: 0,   pro: 0,   god: 0.05 }
  };
  
  const MODE_METADATA = {
      practice: {
          id: "practice",
          name: "Practice Mode",
          hotkey: "T",
          sub: "1000 HP each, gentle bot",
          desc: "Safe sparring ring. Learn mace drop timing and air dashes with 10x health.",
          color: [40, 120, 130],
          rgb: "rgb(40, 120, 130)",
          difficultyLabel: "Gentle",
          badge: "TRAINING"
      },
      easy: {
          id: "easy",
          name: "Easy Mode",
          hotkey: "E",
          sub: "Relaxed bot, standard HP",
          desc: "Relaxed bot behavior. Good for practicing slam bounce chains.",
          color: [150, 0, 0],
          rgb: "rgb(150, 0, 0)",
          difficultyLabel: "Easy",
          badge: "NOVICE"
      },
      normal: {
          id: "normal",
          name: "Normal Mode",
          hotkey: "N",
          sub: "Full challenge, predictive bot",
          desc: "The standard experience. Bot leads slams, dodges, and punishes stun.",
          color: [120, 40, 190],
          rgb: "rgb(120, 40, 190)",
          difficultyLabel: "Standard",
          badge: "BALANCED"
      },
      pro: {
          id: "pro",
          name: "Pro Mode",
          hotkey: "P",
          sub: "Ruthless bot, double jump climbs",
          desc: "Fast, ruthless bot that climbs high for maximum slam velocity and dodges dashes.",
          color: [230, 180, 20],
          rgb: "rgb(230, 180, 20)",
          difficultyLabel: "Hard",
          badge: "VETERAN"
      },
      god: {
          id: "god",
          name: "God Mode",
          hotkey: "G",
          sub: "Near-black entity with invisibility & regen",
          desc: "Nightmare boss bot: stealth camouflage, instant air dash recharge, and health regen.",
          color: [35, 35, 35],
          rgb: "rgb(35, 35, 35)",
          difficultyLabel: "Boss",
          badge: "MYTHIC"
      },
      pvp: {
          id: "pvp",
          name: "Local 2-Player",
          hotkey: "2",
          sub: "Head-to-head duel on one keyboard",
          desc: "Player 1 uses WASD + Space (Dash) + S (Slam). Player 2 uses Arrows + Shift/Enter + Down.",
          color: [255, 90, 30],
          rgb: "rgb(255, 90, 30)",
          difficultyLabel: "Versus",
          badge: "PVP"
      },
      custom: {
          id: "custom",
          name: "Custom Sandbox",
          hotkey: "C",
          sub: "Tweak any of the 31 bot AI parameters",
          desc: "Full sandbox mode. Customize bot speed, slam multiplier, stealth, and regen to your liking.",
          color: [0, 180, 216],
          rgb: "rgb(0, 180, 216)",
          difficultyLabel: "Sandbox",
          badge: "CUSTOM"
      }
  };
  
  /**
   * Creates a bot parameter dictionary for a given mode.
   */
  function getBotParamsForMode(mode, customOverrides = null) {
      const params = {};
      const baseMode = (mode === "pvp" || mode === "custom") ? "normal" : mode;
      
      for (const key in BOT_SETTINGS) {
          params[key] = BOT_SETTINGS[key][baseMode] ?? BOT_SETTINGS[key].normal;
      }
  
      if (mode === "custom" && customOverrides) {
          Object.assign(params, customOverrides);
      }
  
      return params;
  }
  

  // ===== pixel.js =====
  // ==========================================
  // SPEAR-MACE PVP - Pixel Art Helpers
  // Procedurally generated Minecraft-style textures:
  //  - dirt background tile
  //  - 8x8 block heads (Steve, Alex, mobs) + rotating 3D cube avatars
  //  - 16x16 weapon icons
  // No external image assets are needed.
  // ==========================================
  
  const PX_CACHE = {};
  
  function pxCanvas(w, h) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c;
  }
  
  // Darken / lighten a #rrggbb color by an amount (-1..1)
  function pxShade(hex, amt) {
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
      r = f(r); g = f(g); b = f(b);
      return `rgb(${r},${g},${b})`;
  }
  
  // Tiny deterministic noise so the textures feel like Minecraft blocks
  function pxNoise(x, y, seed = 0) {
      const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
      return v - Math.floor(v);
  }
  
  // ------------------------------------------
  // DIRT BACKGROUND WITH TOP GRASS (Minecraft dirt block)
  // Clean pixel art without noisy random specks
  // ------------------------------------------
  // Page colors per theme (background behind the tile and the header bar)
  const PAGE_THEMES = {
      space: { bg: "#0a0f2c", header: "rgba(8, 12, 34, 0.94)", tileSize: "128px" },
      overworld: { bg: "#4a3322", header: "rgba(30, 20, 15, 0.94)", tileSize: "64px" },
      nether: { bg: "#3a0c10", header: "rgba(30, 8, 10, 0.94)", tileSize: "64px" },
      end: { bg: "#1a1424", header: "rgba(14, 10, 22, 0.94)", tileSize: "64px" }
  };
  
  // Starry deep-space tile matching the cube globe logo
  function spaceTile() {
      const c = pxCanvas(64, 64);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#0b1233";
      ctx.fillRect(0, 0, 64, 64);
      // stars of a few brightness levels
      const stars = [
          [6, 8, "#ffffff"], [21, 3, "#9fb4ff"], [37, 17, "#ffffff"], [52, 28, "#6f86d6"],
          [11, 25, "#6f86d6"], [29, 33, "#cfe0ff"], [58, 45, "#ffffff"], [44, 56, "#9fb4ff"],
          [17, 49, "#ffffff"], [3, 60, "#6f86d6"], [48, 11, "#6f86d6"], [33, 61, "#cfe0ff"]
      ];
      for (const [x, y, col] of stars) {
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
      }
      // two "big" twinkle stars
      ctx.fillStyle = "#e8f0ff";
      ctx.fillRect(25, 12, 1, 3); ctx.fillRect(24, 13, 3, 1);
      ctx.fillRect(55, 37, 1, 3); ctx.fillRect(54, 38, 3, 1);
      return c;
  }
  
  function applyMinecraftBackground(theme = "space") {
      const page = PAGE_THEMES[theme] || PAGE_THEMES.overworld;
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty("--page-bg", page.bg);
      rootStyle.setProperty("--header-bg", page.header);
      rootStyle.setProperty("--tile-size", page.tileSize);
      if (theme === "space") {
          rootStyle.setProperty("--dirt", `url(${spaceTile().toDataURL()})`);
          return;
      }
  
      const c = pxCanvas(16, 16);
      const ctx = c.getContext("2d");
      
      if (theme === "nether") {
          // Netherrack with Crimson Nylium top
          ctx.fillStyle = "#681b22"; // Rich dark crimson base
          ctx.fillRect(0, 0, 16, 16);
  
          // Dark crevices & porous holes
          ctx.fillStyle = "#450f14";
          ctx.fillRect(1, 4, 3, 3);
          ctx.fillRect(8, 6, 4, 3);
          ctx.fillRect(3, 11, 4, 3);
          ctx.fillRect(11, 12, 3, 3);
  
          ctx.fillStyle = "#32080c";
          ctx.fillRect(2, 5, 2, 2);
          ctx.fillRect(9, 7, 2, 2);
          ctx.fillRect(4, 12, 2, 2);
          ctx.fillRect(12, 13, 2, 2);
  
          // Fiery red highlights
          ctx.fillStyle = "#8d252e";
          ctx.fillRect(6, 2, 3, 2);
          ctx.fillRect(13, 5, 2, 2);
          ctx.fillRect(0, 9, 2, 2);
          ctx.fillRect(8, 11, 2, 2);
  
          // Bright embers
          ctx.fillStyle = "#aa333c";
          ctx.fillRect(2, 2, 1, 1);
          ctx.fillRect(10, 3, 1, 1);
          ctx.fillRect(14, 10, 1, 1);
          ctx.fillRect(7, 14, 1, 1);
  
          // Crimson Nylium top edge
          ctx.fillStyle = "#a81932";
          ctx.fillRect(0, 0, 16, 2);
          ctx.fillStyle = "#cf2646";
          ctx.fillRect(2, 2, 2, 1);
          ctx.fillRect(7, 2, 2, 2);
          ctx.fillRect(12, 2, 2, 1);
      } else if (theme === "end") {
          // End Stone with Purpur trim
          ctx.fillStyle = "#ded99f"; // Creamy pale sulfur stone
          ctx.fillRect(0, 0, 16, 16);
  
          // Dark pitted craters
          ctx.fillStyle = "#b8b072";
          ctx.fillRect(1, 4, 3, 3);
          ctx.fillRect(8, 6, 4, 3);
          ctx.fillRect(3, 11, 4, 3);
          ctx.fillRect(11, 12, 3, 3);
  
          ctx.fillStyle = "#968e52";
          ctx.fillRect(2, 5, 2, 2);
          ctx.fillRect(9, 7, 2, 2);
          ctx.fillRect(4, 12, 2, 2);
          ctx.fillRect(12, 13, 2, 2);
  
          // Deep pores
          ctx.fillStyle = "#777138";
          ctx.fillRect(2, 6, 1, 1);
          ctx.fillRect(10, 8, 1, 1);
          ctx.fillRect(5, 13, 1, 1);
  
          // Pale creamy highlights
          ctx.fillStyle = "#f2eed0";
          ctx.fillRect(6, 2, 3, 2);
          ctx.fillRect(13, 5, 2, 2);
          ctx.fillRect(0, 9, 2, 2);
          ctx.fillRect(8, 11, 2, 2);
  
          // Purpur top cap
          ctx.fillStyle = "#985f95";
          ctx.fillRect(0, 0, 16, 2);
          ctx.fillStyle = "#6d3b6a";
          ctx.fillRect(2, 2, 2, 1);
          ctx.fillRect(7, 2, 2, 2);
          ctx.fillRect(12, 2, 2, 1);
      } else {
          // Rich blocky dirt colors (clean Minecraft-style palette)
          ctx.fillStyle = "#866043"; // Main warm brown dirt
          ctx.fillRect(0, 0, 16, 16);
          
          // Blocky dirt patches
          ctx.fillStyle = "#725037";
          ctx.fillRect(1, 4, 3, 3);
          ctx.fillRect(8, 6, 4, 3);
          ctx.fillRect(3, 11, 4, 3);
          ctx.fillRect(11, 12, 3, 3);
  
          ctx.fillStyle = "#5c3d28";
          ctx.fillRect(2, 5, 2, 2);
          ctx.fillRect(9, 7, 2, 2);
          ctx.fillRect(4, 12, 2, 2);
          ctx.fillRect(12, 13, 2, 2);
  
          ctx.fillStyle = "#9c7250";
          ctx.fillRect(6, 2, 3, 2);
          ctx.fillRect(13, 5, 2, 2);
          ctx.fillRect(0, 9, 2, 2);
          ctx.fillRect(8, 11, 2, 2);
  
          // Green grass block top row (2px grass with dangling roots)
          ctx.fillStyle = "#4c9e32";
          ctx.fillRect(0, 0, 16, 2);
          ctx.fillStyle = "#3e8529";
          ctx.fillRect(2, 2, 2, 1);
          ctx.fillRect(7, 2, 2, 2);
          ctx.fillRect(12, 2, 2, 1);
      }
  
      document.documentElement.style.setProperty("--dirt", `url(${c.toDataURL()})`);
  }
  
  // ------------------------------------------
  // BLOCK HEADS
  // Pattern legend per skin palette: H hair, S skin, W white, P pupil, M mouth/nose, D dark
  // ------------------------------------------
  const PX_HEADS = {
      steve: {
          pal: { H: "#3b2a17", S: "#c4936a", W: "#ffffff", P: "#4a3f9e", M: "#7a4d30" },
          hairRows: 3, hair: "#3b2a17", skin: "#c4936a",
          front: ["HHHHHHHH", "HHHHHHHH", "HSSSSSSH", "SSSSSSSS", "SWPSSPWS", "SSSMMSSS", "SSMMMMSS", "SSMSSMSS"]
      },
      alex: {
          pal: { H: "#c9792a", S: "#e6b48f", W: "#ffffff", P: "#3f8a3f", M: "#b9826b" },
          hairRows: 3, hair: "#c9792a", skin: "#e6b48f",
          front: ["HHHHHHHH", "HHHHHHHH", "HHSSSSHH", "HSSSSSSH", "SWPSSPWS", "SSSSSSSS", "SSSMMSSS", "SSSSSSSS"]
      },
      noob: {
          pal: { S: "#f2d21f", D: "#222222" },
          hairRows: 0, skin: "#f2d21f", hair: "#f2d21f",
          front: ["SSSSSSSS", "SSSSSSSS", "SSSSSSSS", "SSDSSDSS", "SSSSSSSS", "SDSSSSDS", "SSDDDDSS", "SSSSSSSS"]
      },
      man_face: {
          pal: { H: "#2d2d2d", S: "#e8c690", D: "#111111" },
          hairRows: 2, hair: "#2d2d2d", skin: "#e8c690",
          front: ["HHHHHHHH", "HHHHHHHH", "SSSSSSSS", "SDDSSDDS", "SSDSSSDS", "SSSSSSSS", "SSSSDDDS", "SSSSSSSS"]
      },
      creeper: {
          pal: { G: "#4fae3c", B: "#1a1a1a", L: "#3d8a2e" },
          hairRows: 0, skin: "#4fae3c", hair: "#4fae3c",
          front: ["GGLGGGLG", "GBBGGBBG", "GBBGGBBG", "GGGBBGGG", "GGBBBBGG", "GLBBBBGG", "GGBGGBGG", "GGGGLGGG"]
      },
      enderman: {
          pal: { K: "#16101c", P: "#e07cff", Q: "#ffffff" },
          hairRows: 0, skin: "#16101c", hair: "#16101c",
          front: ["KKKKKKKK", "KKKKKKKK", "KKKKKKKK", "KKKKKKKK", "KQPKKPQK", "KKKKKKKK", "KKKKKKKK", "KKKKKKKK"]
      },
      skeleton: {
          pal: { S: "#d6d6d6", L: "#bdbdbd", D: "#4a4a4a" },
          hairRows: 0, skin: "#d6d6d6", hair: "#d6d6d6",
          front: ["SSSLSSSS", "SSSSSSLS", "SSSSSSSS", "SDDSSDDS", "SDDSSDDS", "SSSDDSSS", "SDSDSDSD", "SSDSDSDS"]
      },
      zombie: {
          pal: { H: "#2f5f27", S: "#5a9a45", P: "#2a3a8a", M: "#2f5f27", D: "#3d6e32" },
          hairRows: 2, hair: "#2f5f27", skin: "#5a9a45",
          front: ["HHHHHHHH", "HHHHHHHH", "SSSSSSSS", "SSSSSSSS", "SPPSSPPS", "SSSDDSSS", "SSMMMMSS", "SSSSSSSS"]
      },
      diamond_knight: {
          pal: { C: "#3fd6d6", B: "#1d9aa0", V: "#10222b", W: "#d9ffff" },
          hairRows: 0, skin: "#3fd6d6", hair: "#2ab5b8",
          front: ["BBBBBBBB", "BCCCCCCB", "CCCCCCCC", "VVVVVVVV", "VWVVVVWV", "CCCCCCCC", "CBCCCCBC", "BBBBBBBB"]
      }
  };
  
  // Avatar presets in auth.js that don't have their own head use these
  const PX_PRESET_HEAD = {
      steve: "steve", alex: "alex", mace_knight: "diamond_knight", wind_breeze: "skeleton",
      nether_warrior: "zombie", ender_champion: "enderman", golden_paladin: "noob", shadow_bot: "creeper"
  };
  
  function pxDrawTexture(rows, pal, size = 8, seed = 0) {
      const c = pxCanvas(size, size);
      const ctx = c.getContext("2d");
      for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
              const ch = rows[y][x];
              const col = pal[ch] || "#ff00ff";
              const n = pxNoise(x, y, seed);
              ctx.fillStyle = pxShade(col, (n - 0.5) * 0.12);
              ctx.fillRect(x, y, 1, 1);
          }
      }
      return c.toDataURL();
  }
  
  function pxSolidTexture(col, seed = 0) {
      const rows = Array(8).fill("SSSSSSSS");
      return pxDrawTexture(rows, { S: col }, 8, seed);
  }
  
  // Returns { front, back, left, right, top, bottom } data URLs for a head.
  function headTextures(skinId) {
      const id = PX_HEADS[skinId] ? skinId : (PX_PRESET_HEAD[skinId] || "steve");
      const key = "head:" + id;
      if (PX_CACHE[key]) return PX_CACHE[key];
  
      const h = PX_HEADS[id];
      const front = pxDrawTexture(h.front, h.pal, 8, 1);
  
      const sideRows = [];
      for (let y = 0; y < 8; y++) sideRows.push((y < h.hairRows ? "H" : "S").repeat(8));
      const sidePal = { H: h.hair, S: h.skin };
      const side = pxDrawTexture(sideRows, sidePal, 8, 2);
      const back = pxSolidTexture(h.hairRows > 0 ? h.hair : h.skin, 4);
      const top = pxSolidTexture(h.hair, 5);
      const bottom = pxSolidTexture(h.skin, 6);
  
      PX_CACHE[key] = { front, back, left: side, right: side, top, bottom };
      return PX_CACHE[key];
  }
  
  // Flat 2D head icon (just the face) as an <img>
  function headImgHTML(skinId, size = 32, cls = "") {
      const t = headTextures(skinId);
      return `<img class="px-head ${cls}" src="${t.front}" width="${size}" height="${size}" alt="" style="width:${size}px;height:${size}px">`;
  }
  
  // Rotating 3D cube whose faces are the Minecraft head textures
  function cubeHTML(skinId, size = 40) {
      const t = headTextures(skinId);
      const faces = ["front", "back", "left", "right", "top", "bottom"]
          .map(f => `<span class="cube-face cube-${f}" style="background-image:url(${t[f]})"></span>`)
          .join("");
      return `<span class="cube-wrap" style="--s:${size}px"><span class="cube">${faces}</span></span>`;
  }
  
  function presetHeadId(presetId) {
      return PX_PRESET_HEAD[presetId] || "steve";
  }
  
  // Small colored square used in place of tier medals
  function tierPipHTML(tier) {
      return `<span class="tier-pip" style="background:${tier.color}"></span>`;
  }
  
  // ------------------------------------------
  // WEAPON ICONS (16x16 sprites)
  // ------------------------------------------
  function pxWeaponSprite(id) {
      const c = pxCanvas(16, 16);
      const ctx = c.getContext("2d");
      const px = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); };
      const rect = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
      const wood = "#8a5a2b", woodD = "#5e3b1c";
  
      if (id === "sword") {
          for (let i = 0; i < 10; i++) { px(5 + i, 10 - i, "#f0f0f0"); px(6 + i, 10 - i, "#aeb7bd"); }
          for (let k = 0; k < 5; k++) px(3 + k, 9 + k, woodD);
          px(4, 12, wood); px(3, 13, wood); px(2, 14, woodD);
      } else if (id === "spear") {
          for (let i = 0; i < 12; i++) { px(1 + i, 14 - i, wood); px(2 + i, 14 - i, woodD); }
          rect(12, 2, 2, 2, "#cfd6db"); px(14, 1, "#f0f0f0"); px(15, 0, "#f0f0f0"); px(11, 3, "#aeb7bd"); px(13, 1, "#aeb7bd");
      } else if (id === "fists") {
          rect(2, 6, 5, 6, "#d9a577"); rect(2, 10, 5, 2, "#b8855a");
          rect(9, 4, 5, 6, "#d9a577"); rect(9, 8, 5, 2, "#b8855a");
          rect(2, 6, 5, 1, "#f0c79d"); rect(9, 4, 5, 1, "#f0c79d");
      } else if (id === "bow") {
          [[9, 1], [10, 2], [11, 3], [11, 4], [12, 5], [12, 6], [12, 7], [12, 8], [12, 9], [11, 10], [11, 11], [10, 12], [9, 13]]
              .forEach(([x, y]) => px(x, y, wood));
          for (let y = 1; y <= 13; y++) px(8, y, "#e8e8e8");
          for (let x = 2; x <= 10; x++) px(x, 7, "#9aa3a8");
          px(1, 7, "#d9d9d9"); px(1, 6, "#d9d9d9"); px(1, 8, "#d9d9d9");
      } else { // mace
          for (let i = 0; i < 10; i++) { px(2 + i, 14 - i, wood); px(3 + i, 14 - i, woodD); }
          rect(9, 1, 6, 6, "#5a5f66");
          rect(10, 2, 4, 4, "#8a9199");
          rect(10, 2, 2, 2, "#c1c8cf");
          rect(8, 3, 1, 2, "#3a3d42"); rect(15, 3, 1, 2, "#3a3d42");
          rect(11, 0, 2, 1, "#3a3d42"); rect(11, 7, 2, 1, "#3a3d42");
      }
      return c.toDataURL();
  }
  
  // Data URL of a weapon's pixel sprite (for drawing on the canvas)
  function weaponIconURL(id) {
      const key = "wep:" + id;
      if (!PX_CACHE[key]) PX_CACHE[key] = pxWeaponSprite(id);
      return PX_CACHE[key];
  }
  
  function weaponIconHTML(id, size = 32) {
      const key = "wep:" + id;
      if (!PX_CACHE[key]) PX_CACHE[key] = pxWeaponSprite(id);
      return `<img class="px-icon" src="${PX_CACHE[key]}" width="${size}" height="${size}" alt="" style="width:${size}px;height:${size}px">`;
  }
  

  // ===== audio.js =====
  // ==========================================
  // SPEAR-MACE PVP - Procedural Web Audio Engine
  // 100% synthesized - zero external sound files needed
  // ==========================================
  
  class SoundEngine {
      constructor() {
          this.ctx = null;
          this.masterGain = null;
          this.muted = false;
          this.volume = 0.7;
  
          // Restore mute preference if saved
          try {
              const savedMute = localStorage.getItem("spear_mace_muted");
              if (savedMute !== null) this.muted = savedMute === "true";
              const savedVol = localStorage.getItem("spear_mace_vol");
              if (savedVol !== null) this.volume = parseFloat(savedVol) || 0.7;
          } catch (e) {
              // LocalStorage might be disabled
          }
  
          this.cachedNoiseBuffer = null;
      }
  
      init() {
          if (this.ctx) return;
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
      }
  
      ensureContext() {
          if (!this.ctx) {
              this.init();
          }
          if (this.ctx && this.ctx.state === "suspended") {
              this.ctx.resume();
          }
      }
  
      setMuted(muted) {
          this.muted = muted;
          if (this.masterGain && this.ctx) {
              this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
          }
          try {
              localStorage.setItem("spear_mace_muted", this.muted ? "true" : "false");
          } catch (e) {}
      }
  
      toggleMute() {
          this.setMuted(!this.muted);
          return this.muted;
      }
  
      setVolume(vol) {
          this.volume = Math.max(0, Math.min(1, vol));
          if (this.masterGain && this.ctx && !this.muted) {
              this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
          }
          try {
              localStorage.setItem("spear_mace_vol", this.volume.toString());
          } catch (e) {}
      }
  
      // Helper: precompute or get reusable white noise buffer
      getNoiseBuffer() {
          if (!this.ctx) return null;
          if (!this.cachedNoiseBuffer) {
              const bufferSize = this.ctx.sampleRate * 1.0; // 1 second precomputed
              this.cachedNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
              const data = this.cachedNoiseBuffer.getChannelData(0);
              for (let i = 0; i < bufferSize; i++) {
                  data[i] = Math.random() * 2 - 1;
              }
          }
          return this.cachedNoiseBuffer;
      }
  
      playJump() {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const now = this.ctx.currentTime;
  
          osc.type = "sine";
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
  
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  
          osc.connect(gain);
          gain.connect(this.masterGain);
  
          osc.start(now);
          osc.stop(now + 0.13);
      }
  
      playDoubleJump() {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const now = this.ctx.currentTime;
  
          osc.type = "triangle";
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
  
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  
          osc.connect(gain);
          gain.connect(this.masterGain);
  
          osc.start(now);
          osc.stop(now + 0.15);
      }
  
      // Wind charge / Spear Dash swoosh
      playDash() {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const now = this.ctx.currentTime;
          const noiseBuf = this.getNoiseBuffer();
          if (!noiseBuf) return;
  
          const noise = this.ctx.createBufferSource();
          noise.buffer = noiseBuf;
  
          const filter = this.ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(600, now);
          filter.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
          filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);
          filter.Q.value = 3.0;
  
          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);
  
          noise.start(now);
          noise.stop(now + 0.16);
      }
  
      // High velocity dive sound
      playSlamStart() {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
  
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);
  
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  
          osc.connect(gain);
          gain.connect(this.masterGain);
  
          osc.start(now);
          osc.stop(now + 0.23);
      }
  
      // Signature Mace Heavy Crunch / Anvil smash
      playSlamHit(intensityRatio = 0.5) {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const now = this.ctx.currentTime;
          const clampedRatio = Math.max(0.1, Math.min(1.0, intensityRatio));
  
          // Sub bass thump
          const subOsc = this.ctx.createOscillator();
          const subGain = this.ctx.createGain();
          subOsc.type = "sine";
          subOsc.frequency.setValueAtTime(130 + clampedRatio * 50, now);
          subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
  
          subGain.gain.setValueAtTime(0.6 * clampedRatio + 0.2, now);
          subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  
          subOsc.connect(subGain);
          subGain.connect(this.masterGain);
          subOsc.start(now);
          subOsc.stop(now + 0.36);
  
          // Metallic Mace Clang (anvil overtone)
          const clang = this.ctx.createOscillator();
          const clangGain = this.ctx.createGain();
          clang.type = "triangle";
          clang.frequency.setValueAtTime(680, now);
          clang.frequency.exponentialRampToValueAtTime(210, now + 0.2);
  
          clangGain.gain.setValueAtTime(0.35 * clampedRatio, now);
          clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  
          clang.connect(clangGain);
          clangGain.connect(this.masterGain);
          clang.start(now);
          clang.stop(now + 0.21);
  
          // Impact crunch noise
          const noiseBuf = this.getNoiseBuffer();
          if (noiseBuf) {
              const noise = this.ctx.createBufferSource();
              noise.buffer = noiseBuf;
              const filter = this.ctx.createBiquadFilter();
              filter.type = "lowpass";
              filter.frequency.setValueAtTime(1200 + clampedRatio * 2000, now);
              filter.frequency.exponentialRampToValueAtTime(200, now + 0.18);
  
              const nGain = this.ctx.createGain();
              nGain.gain.setValueAtTime(0.4 * clampedRatio, now);
              nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  
              noise.connect(filter);
              filter.connect(nGain);
              nGain.connect(this.masterGain);
  
              noise.start(now);
              noise.stop(now + 0.19);
          }
      }
  
      // Ground slam shockwave
      playGroundSlam() {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
  
          osc.type = "sine";
          osc.frequency.setValueAtTime(90, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);
  
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  
          osc.connect(gain);
          gain.connect(this.masterGain);
  
          osc.start(now);
          osc.stop(now + 0.29);
      }
  
      // Dash attack hit (spear strike / thrust)
      playDashHit() {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
  
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(380, now);
          osc.frequency.exponentialRampToValueAtTime(95, now + 0.12);
  
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  
          osc.connect(gain);
          gain.connect(this.masterGain);
  
          osc.start(now);
          osc.stop(now + 0.13);
      }
  
      // Invisibility flicker / shroud sound
      playInvisWarning() {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
  
          osc.type = "sine";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.setValueAtTime(700, now + 0.05);
  
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  
          osc.connect(gain);
          gain.connect(this.masterGain);
  
          osc.start(now);
          osc.stop(now + 0.11);
      }
  
      // Victory fanfare
      playWin() {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
          notes.forEach((freq, index) => {
              const start = this.ctx.currentTime + index * 0.1;
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
  
              osc.type = "triangle";
              osc.frequency.setValueAtTime(freq, start);
  
              const dur = index === notes.length - 1 ? 0.4 : 0.12;
              gain.gain.setValueAtTime(0.25, start);
              gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  
              osc.connect(gain);
              gain.connect(this.masterGain);
  
              osc.start(start);
              osc.stop(start + dur + 0.02);
          });
      }
  
      // Defeat tone
      playLoss() {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const notes = [311.13, 293.66, 277.18, 246.94]; // Eb4, D4, Db4, B3
          notes.forEach((freq, index) => {
              const start = this.ctx.currentTime + index * 0.15;
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
  
              osc.type = "sawtooth";
              osc.frequency.setValueAtTime(freq, start);
  
              gain.gain.setValueAtTime(0.18, start);
              gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
  
              osc.connect(gain);
              gain.connect(this.masterGain);
  
              osc.start(start);
              osc.stop(start + 0.25);
          });
      }
  
      playClick() {
          this.ensureContext();
          if (!this.ctx || this.muted) return;
  
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
  
          osc.type = "sine";
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
  
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  
          osc.connect(gain);
          gain.connect(this.masterGain);
  
          osc.start(now);
          osc.stop(now + 0.05);
      }
  }
  
  const sound = new SoundEngine();
  

  // ===== weapons.js =====
  // ==========================================
  // SPEAR-MACE PVP - Weapons & Enchantments Engine
  // Minecraft-themed arsenal: Mace, Spear, Sword, Fists, and Bow
  // ==========================================
  
  const WEAPON_TYPES = {
      mace: {
          id: "mace",
          name: "Minecraft Mace",
          icon: "",
          category: "Heavy Impact",
          desc: "Signature weapon. Height-scaled slam damage with orbital launches and ground shockwaves.",
          baseCost: 0, // Default starter weapon
          unlockedByDefault: true,
          stats: {
              damage: 20,
              dashSpeed: 14,   // deliberate, slower heavy mace dash (was 20)
              dashDistance: 6, // frames
              dashDamage: 20,
              slamSpeed: 16,   // slower, weightier mace smash descent (was 24)
              slamPower: 1.0,  // height scale multiplier
              slamMaxDmg: 150,
              hitLaunch: -12,
              attackCooldown: 40,
              range: 30
          },
          upgrades: [
              {
                  id: "density",
                  name: "Density V",
                  desc: "Increases slam damage multiplier from greater heights.",
                  maxLevel: 5,
                  costPerLevel: 300,
                  apply: (stats, lvl) => { stats.slamPower += lvl * 0.15; stats.slamMaxDmg += lvl * 15; }
              },
              {
                  id: "wind_burst",
                  name: "Wind Burst III",
                  desc: "Launches you significantly higher into the air after landing a hit.",
                  maxLevel: 3,
                  costPerLevel: 400,
                  apply: (stats, lvl) => { stats.hitLaunch -= lvl * 1.8; }
              },
              {
                  id: "breach",
                  name: "Breach IV",
                  desc: "Ignores a portion of opponent damage reduction and armor.",
                  maxLevel: 4,
                  costPerLevel: 360,
                  apply: (stats, lvl) => { stats.breachArmor = lvl * 0.1; }
              }
          ]
      },
  
      spear: {
          id: "spear",
          name: "Wind Spear",
          icon: "",
          category: "Wind Charge",
          desc: "Super-fast wind dashes on ground and air. Pierces through incoming attacks.",
          baseCost: 400,
          unlockedByDefault: true,
          stats: {
              damage: 20,
              dashSpeed: 24,
              dashDistance: 8,
              dashDamage: 22,
              slamPower: 0.8,
              slamMaxDmg: 110,
              hitLaunch: -10,
              attackCooldown: 35,
              range: 35
          },
          upgrades: [
              {
                  id: "impaling",
                  name: "Impaling V",
                  desc: "Increases spear dash strike damage.",
                  maxLevel: 5,
                  costPerLevel: 280,
                  apply: (stats, lvl) => { stats.dashDamage += lvl * 4; }
              },
              {
                  id: "piercing",
                  name: "Piercing IV",
                  desc: "Increases dash velocity and distance.",
                  maxLevel: 4,
                  costPerLevel: 350,
                  apply: (stats, lvl) => { stats.dashSpeed += lvl * 2; stats.dashDistance += lvl * 1; }
              },
              {
                  id: "feather_light",
                  name: "Breeze Agility",
                  desc: "Reduces dash cooldown time.",
                  maxLevel: 3,
                  costPerLevel: 440,
                  apply: (stats, lvl) => { stats.attackCooldown -= lvl * 5; }
              }
          ]
      },
  
      sword: {
          id: "sword",
          name: "Diamond Sword",
          icon: "",
          category: "Blade Slice",
          desc: "Shorter, precision dash slice that deals massive swift slash damage.",
          baseCost: 700,
          unlockedByDefault: false,
          stats: {
              damage: 32,
              dashSpeed: 16,
              dashDistance: 4, // shorter dash
              dashDamage: 38, // higher damage!
              slamPower: 0.85,
              slamMaxDmg: 120,
              hitLaunch: -9,
              attackCooldown: 28, // faster recovery
              range: 28
          },
          upgrades: [
              {
                  id: "sharpness",
                  name: "Sharpness V",
                  desc: "Significantly enhances blade slice damage.",
                  maxLevel: 5,
                  costPerLevel: 360,
                  apply: (stats, lvl) => { stats.dashDamage += lvl * 6; stats.damage += lvl * 5; }
              },
              {
                  id: "knockback",
                  name: "Knockback II",
                  desc: "Sends enemies flying further across the arena.",
                  maxLevel: 3,
                  costPerLevel: 320,
                  apply: (stats, lvl) => { stats.knockbackMult = 1.0 + lvl * 0.35; }
              },
              {
                  id: "sweeping_edge",
                  name: "Sweeping Edge III",
                  desc: "Widens the horizontal hit area of your blade slice.",
                  maxLevel: 3,
                  costPerLevel: 420,
                  apply: (stats, lvl) => { stats.range += lvl * 8; }
              }
          ]
      },
  
      fists: {
          id: "fists",
          name: "Steve Bare Fists",
          icon: "",
          category: "Martial Brawl",
          desc: "Pure close-quarters Steve punches! Does brutal damage in hand-to-hand combat.",
          baseCost: 300,
          unlockedByDefault: false,
          stats: {
              damage: 42,
              dashSpeed: 14,
              dashDistance: 3, // quick lunge
              dashDamage: 45, // brutal fist strike!
              slamPower: 0.7,
              slamMaxDmg: 100,
              hitLaunch: -11,
              attackCooldown: 22, // ultra fast combo rate
              range: 22
          },
          upgrades: [
              {
                  id: "strength",
                  name: "Strength II",
                  desc: "Potion of Strength power! Heavily boosts fist impact damage.",
                  maxLevel: 5,
                  costPerLevel: 320,
                  apply: (stats, lvl) => { stats.dashDamage += lvl * 7; stats.damage += lvl * 6; }
              },
              {
                  id: "haste",
                  name: "Haste Beacon",
                  desc: "Reduces attack cooldown for rapid-fire punch barrages.",
                  maxLevel: 4,
                  costPerLevel: 360,
                  apply: (stats, lvl) => { stats.attackCooldown -= lvl * 3; }
              },
              {
                  id: "iron_grip",
                  name: "Heavy Fist Impact",
                  desc: "Increases stun duration dealt to struck opponents.",
                  maxLevel: 3,
                  costPerLevel: 400,
                  apply: (stats, lvl) => { stats.stunBonus = lvl * 8; }
              }
          ]
      },
  
      bow: {
          id: "bow",
          name: "Enchanted Bow",
          icon: "",
          category: "Ranged Marksman",
          desc: "Fires deadly arrows from afar. Dash key shoots arrows with a reload cooldown.",
          baseCost: 1000,
          unlockedByDefault: false,
          stats: {
              damage: 18,
              dashSpeed: 12,
              dashDistance: 3,
              dashDamage: 15,
              arrowDamage: 30,
              arrowSpeed: 16,
              reloadTime: 45, // frames between shots (0.75s)
              slamPower: 0.7,
              slamMaxDmg: 95,
              hitLaunch: -8,
              attackCooldown: 40,
              range: 25
          },
          upgrades: [
              {
                  id: "power",
                  name: "Power V",
                  desc: "Greatly increases arrow projectile damage.",
                  maxLevel: 5,
                  costPerLevel: 400,
                  apply: (stats, lvl) => { stats.arrowDamage += lvl * 7; }
              },
              {
                  id: "infinity",
                  name: "Infinity / Quick Charge",
                  desc: "Dramatically reduces bow reload time between shots.",
                  maxLevel: 4,
                  costPerLevel: 440,
                  apply: (stats, lvl) => { stats.reloadTime = Math.max(18, stats.reloadTime - lvl * 7); }
              },
              {
                  id: "punch",
                  name: "Punch II",
                  desc: "Adds strong knockback to arrows.",
                  maxLevel: 3,
                  costPerLevel: 360,
                  apply: (stats, lvl) => { stats.arrowKnockback = 1.0 + lvl * 0.4; }
              }
          ]
      }
  };
  
  /**
   * Computes effective weapon stats taking into account user upgrade levels
   */
  function getComputedWeaponStats(weaponId, upgradeLevels = {}) {
      const base = WEAPON_TYPES[weaponId] || WEAPON_TYPES.mace;
      const computed = { ...base.stats };
  
      if (base.upgrades && Array.isArray(base.upgrades)) {
          base.upgrades.forEach(upg => {
              const currentLvl = upgradeLevels[upg.id] || 0;
              if (currentLvl > 0 && upg.apply) {
                  upg.apply(computed, currentLvl);
              }
          });
      }
  
      return computed;
  }
  
  /**
   * Arrow projectile manager
   */
  class ArrowManager {
      constructor() {
          this.arrows = [];
      }
  
      reset() {
          this.arrows = [];
      }
  
      // aimAngle (radians) fires toward a point; without it the arrow flies straight ahead
      spawnArrow(x, y, facing, ownerId, ownerTeam, damage = 30, speed = 16, knockbackMult = 1.0, aimAngle = null) {
          const aimed = aimAngle !== null && aimAngle !== undefined;
          this.arrows.push({
              x,
              y,
              vx: aimed ? Math.cos(aimAngle) * speed : facing * speed,
              vy: aimed ? Math.sin(aimAngle) * speed : -1.2, // slight upward arc
              gravity: 0.15,
              facing,
              ownerId,
              ownerTeam,
              damage,
              knockbackMult,
              life: 180,
              stuck: false
          });
      }
  
      update(platforms, fighters, onHitCallback = null) {
          for (let i = this.arrows.length - 1; i >= 0; i--) {
              const a = this.arrows[i];
  
              if (a.stuck) {
                  a.life--;
                  if (a.life <= 0) {
                      this.arrows.splice(i, 1);
                  }
                  continue;
              }
  
              a.x += a.vx;
              a.y += a.vy;
              a.vy += a.gravity;
              a.life--;
  
              // Platform collision (arrows stick into ground)
              for (const p of platforms) {
                  if (
                      a.x >= p.x && a.x <= p.x + p.w &&
                      a.y >= p.y && a.y <= p.y + p.h
                  ) {
                      a.stuck = true;
                      a.vx = 0;
                      a.vy = 0;
                      a.life = 60; // disappear in 1s
                      break;
                  }
              }
  
              if (a.stuck) continue;
  
              // Fighter collision
              for (const f of fighters) {
                  if (f.hp <= 0) continue;
                  if (f.id === a.ownerId) continue; // don't shoot yourself
                  if (a.ownerTeam && f.team === a.ownerTeam) continue; // friendly fire disabled in team matches
  
                  if (
                      a.x >= f.x && a.x <= f.x + f.w &&
                      a.y >= f.y && a.y <= f.y + f.h &&
                      f.hitCooldown <= 0
                  ) {
                      // Hit fighter! (stats count only the HP actually removed)
                      const dealt = Math.min(a.damage, Math.max(0, f.hp));
                      f.hp -= a.damage;
                      f.stats.damageTaken += dealt;
                      f.hitCooldown = 20;
                      f.stun = 25;
                      f.xVel = a.facing * 7 * (a.knockbackMult || 1.0);
                      f.yVel = -5;
  
                      const shooter = fighters.find(fl => fl.id === a.ownerId);
                      if (shooter) f.lastHitBy = shooter;
                      if (shooter) {
                          shooter.stats.arrowsHit++;
                          shooter.stats.damageDealt += dealt;
                      }
  
                      if (onHitCallback) {
                          onHitCallback(f, a, a.damage);
                      }
  
                      this.arrows.splice(i, 1);
                      break;
                  }
              }
  
              // Boundary removal
              if (a.y > 450 || a.x < -50 || a.x > 850 || a.life <= 0) {
                  this.arrows.splice(i, 1);
              }
          }
      }
  
      draw(ctx) {
          ctx.save();
          for (const a of this.arrows) {
              ctx.save();
              ctx.translate(a.x, a.y);
              const angle = Math.atan2(a.vy, a.vx);
              ctx.rotate(angle);
  
              // Arrow shaft
              ctx.fillStyle = "#8d6e63";
              ctx.fillRect(-12, -1.5, 20, 3);
  
              // Feathers (fletching)
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(-14, -3.5, 5, 7);
  
              // Arrowhead (flint / iron tip)
              ctx.fillStyle = "#78909c";
              ctx.beginPath();
              ctx.moveTo(8, -4);
              ctx.lineTo(16, 0);
              ctx.lineTo(8, 4);
              ctx.closePath();
              ctx.fill();
  
              ctx.restore();
          }
          ctx.restore();
      }
  }
  

  // ===== arena.js =====
  // ==========================================
  // SPEAR-MACE PVP - Arena System & National Leaderboard
  // Handles 1v1, 2v2, 5v5 Matches, Public Queuing, Private Rooms,
  // Competitive Tiers (Bronze to Obsidian), and National Leaderboard
  // ==========================================
  
  const ARENA_TIERS = {
      bronze: {
          id: "bronze",
          name: "Bronze",
          minRP: 0,
          maxRP: 499,
          color: "#cd7f32",
          icon: "",
          badge: "BRONZE"
      },
      silver: {
          id: "silver",
          name: "Silver",
          minRP: 500,
          maxRP: 999,
          color: "#bdc3c7",
          icon: "",
          badge: "SILVER"
      },
      gold: {
          id: "gold",
          name: "Gold",
          minRP: 1000,
          maxRP: 1499,
          color: "#f1c40f",
          icon: "",
          badge: "GOLD"
      },
      diamond: {
          id: "diamond",
          name: "Diamond",
          minRP: 1500,
          maxRP: 1999,
          color: "#00d2d3",
          icon: "",
          badge: "DIAMOND"
      },
      obsidian: {
          id: "obsidian",
          name: "Obsidian",
          minRP: 2000,
          maxRP: Infinity,
          color: "#9b59b6",
          icon: "",
          badge: "OBSIDIAN"
      }
  };
  
  // National Leaderboard Seed: Completely empty to ensure ONLY real people are featured on the leaderboard
  const NATIONAL_LEADERBOARD_SEED = [];
  
  class ArenaManager {
      constructor() {
          this.queueStatus = "idle"; // "idle" | "queuing" | "matched"
          this.queueTimer = 0;
          this.queueInterval = null;
          this.currentLobby = null;
      }
  
      getTier(rp = 0) {
          if (rp >= 2000) return ARENA_TIERS.obsidian;
          if (rp >= 1500) return ARENA_TIERS.diamond;
          if (rp >= 1000) return ARENA_TIERS.gold;
          if (rp >= 500)  return ARENA_TIERS.silver;
          return ARENA_TIERS.bronze;
      }
  
      generateRoomCode() {
          const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
          const code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
          const num = Math.floor(Math.random() * 900 + 100);
          return `MACE-${code}-${num}`;
      }
  
      // Creates random AI fighters to fill team slots in 2v2 and 5v5
      generateTeamRoster(matchType = "1v1", userProfile, selectedWeaponId = "mace") {
          const totalPerTeam = matchType === "5v5" ? 5 : (matchType === "2v2" ? 2 : 1);
          const redTeam = [];
          const blueTeam = [];
  
          const userRP = userProfile.arenaRP || 250;
          const userTier = this.getTier(userRP);
  
          // User is ALWAYS Captain of Blue Team (User is always Blue against opponents)
          blueTeam.push({
              id: "player_user",
              name: userProfile.username || "Player",
              isPlayer: true,
              team: "blue",
              weaponId: selectedWeaponId,
              skinId: userProfile.skinId || "steve",
              maxHp: 100,
              x: 120,
              y: 300,
              facing: 1,
              rank: userTier.name,
              tierId: userTier.id,
              rp: userRP
          });
  
          const botNames = [
              "SkyCrusher", "BladeStorm", "VortexStriker", "ArrowFlurry",
              "ObsidianGuard", "MaceBrawler", "WindStalker", "IronGolem",
              "NetherReaper", "DiamondFighter"
          ];
          const weaponPool = ["mace", "spear", "sword", "fists", "bow"];
          const skinPool = ["steve", "alex", "noob", "man_face", "creeper", "enderman"];
          const botTiers = ["bronze", "silver", "gold", "diamond", "obsidian"];
  
          // Fill remaining Blue Team slots (Allies) if 2v2 or 5v5
          for (let i = 1; i < totalPerTeam; i++) {
              const bName = botNames[i % botNames.length];
              const wep = weaponPool[Math.floor(Math.random() * weaponPool.length)];
              const skin = skinPool[Math.floor(Math.random() * skinPool.length)];
              const tierKey = botTiers[Math.min(botTiers.length - 1, Math.floor(Math.random() * botTiers.length))];
              const tierObj = ARENA_TIERS[tierKey];
              blueTeam.push({
                  id: `bot_blue_${i}`,
                  name: `[BOT] ${bName}`,
                  isPlayer: false,
                  team: "blue",
                  weaponId: wep,
                  skinId: skin,
                  maxHp: 100,
                  x: 100 + i * 45,
                  y: 300,
                  facing: 1,
                  rank: tierObj.name,
                  tierId: tierObj.id,
                  rp: Math.floor(tierObj.minRP + Math.random() * 400)
              });
          }
  
          // Fill Red Team slots (Opponents)
          for (let i = 0; i < totalPerTeam; i++) {
              const bName = botNames[(i + 4) % botNames.length];
              const wep = weaponPool[Math.floor(Math.random() * weaponPool.length)];
              const skin = skinPool[Math.floor(Math.random() * skinPool.length)];
              const tierKey = botTiers[Math.min(botTiers.length - 1, Math.floor(Math.random() * botTiers.length))];
              const tierObj = ARENA_TIERS[tierKey];
              redTeam.push({
                  id: `bot_red_${i}`,
                  name: `[BOT] ${bName}`,
                  isPlayer: false,
                  team: "red",
                  weaponId: wep,
                  skinId: skin,
                  maxHp: 100,
                  x: 680 - i * 45,
                  y: 300,
                  facing: -1,
                  rank: tierObj.name,
                  tierId: tierObj.id,
                  rp: Math.floor(tierObj.minRP + Math.random() * 400)
              });
          }
  
          return { redTeam, blueTeam, matchType };
      }
  
      // Get verified national leaderboard with ONLY real human players (zero bots)
      getLeaderboard(userProfile) {
          const REAL_LEADERBOARD_KEY = "spear_mace_real_leaderboard";
          let board = [];
          try {
              const raw = localStorage.getItem(REAL_LEADERBOARD_KEY);
              if (raw) {
                  board = JSON.parse(raw);
              }
          } catch (e) {
              board = [];
          }
  
          // Strictly purge any bots from the leaderboard
          board = board.filter(entry => entry && !entry.isBot && !(entry.name && entry.name.startsWith("[BOT]")));
  
          // Upsert current active real player
          if (userProfile && userProfile.username) {
              const userRP = userProfile.arenaRP || 250;
              const userTier = this.getTier(userRP);
              const userWins = userProfile.stats?.wins || 0;
              const matches = userProfile.stats?.matches || 0;
              const userWinRate = matches > 0 ? `${Math.round((userWins / matches) * 100)}%` : "0%";
  
              const existingIdx = board.findIndex(p => 
                  (p.id && p.id === userProfile.id) || 
                  (p.name && p.name.toLowerCase() === userProfile.username.toLowerCase())
              );
  
              const playerEntry = {
                  id: userProfile.id || "current_user",
                  name: userProfile.username || 'You',
                  rp: userRP,
                  tier: userTier.id,
                  wins: userWins,
                  matches: matches,
                  winRate: userWinRate,
                  weapon: userProfile.equippedWeapon || "mace",
                  flag: "",
                  skin: userProfile.skinId || "steve",
                  isUser: true,
                  isBot: false,
                  lastActive: Date.now()
              };
  
              if (existingIdx >= 0) {
                  board[existingIdx] = playerEntry;
              } else {
                  board.push(playerEntry);
              }
  
              try {
                  localStorage.setItem(REAL_LEADERBOARD_KEY, JSON.stringify(board));
              } catch (e) {}
          }
  
          // Sort descending by RP, then by wins
          board.sort((a, b) => {
              if (b.rp !== a.rp) return b.rp - a.rp;
              return (b.wins || 0) - (a.wins || 0);
          });
  
          // Re-index ranks
          return board.map((entry, idx) => ({
              ...entry,
              rank: idx + 1,
              isUser: entry.id === userProfile?.id || entry.name?.toLowerCase() === userProfile?.username?.toLowerCase()
          }));
      }
  }
  
  const arena = new ArenaManager();
  

  // ===== auth.js =====
  // ==========================================
  // SPEAR-MACE PVP - Authentication, Economy & Profile Manager
  // Handles Google Sign-In, Gold Currency, Minecraft Weapons Arsenal,
  // Block Face Skins (Steve, Alex, Roblox Noob, Man Face), and Arena RP
  // ==========================================
  
  const STORAGE_KEY = "spear_mace_user_profile";
  
  const AVATAR_PRESETS = [
      { id: "steve", name: "Steve", icon: "", bg: "#2ecc71" },
      { id: "alex", name: "Alex", icon: "", bg: "#e67e22" },
      { id: "mace_knight", name: "Mace Knight", icon: "", bg: "#3498db" },
      { id: "wind_breeze", name: "Wind Breeze", icon: "", bg: "#00d2d3" },
      { id: "nether_warrior", name: "Nether Titan", icon: "", bg: "#e74c3c" },
      { id: "ender_champion", name: "Ender Champion", icon: "", bg: "#9b59b6" },
      { id: "golden_paladin", name: "Gold Paladin", icon: "", bg: "#f1c40f" },
      { id: "shadow_bot", name: "Shadow Rogue", icon: "", bg: "#2c3e50" }
  ];
  
  const BLOCK_FACES = [
      { id: "steve", name: "Minecraft Steve", icon: "", cost: 0, desc: "Classic Minecraft icon with cyan tee and brown hair." },
      { id: "alex", name: "Minecraft Alex", icon: "", cost: 0, desc: "Classic Minecraft explorer with green tunic and orange hair." },
      { id: "noob", name: "Roblox Noob", icon: "", cost: 200, desc: "The iconic yellow block head with simple smile and blue torso." },
      { id: "man_face", name: "Roblox Man Face", icon: "", cost: 400, desc: "The legendary, unmistakable smirking block face." },
      { id: "creeper", name: "Creeper Face", icon: "", cost: 500, desc: "Pixelated green explosive face with iconic black frown." },
      { id: "enderman", name: "Enderman", icon: "", cost: 600, desc: "Deep dark obsidian head with glowing mystical violet eyes." },
      { id: "skeleton", name: "Skeleton Skull", icon: "", cost: 500, desc: "Bone white archer skull with hollow dark eyes." },
      { id: "zombie", name: "Zombie", icon: "", cost: 400, desc: "Infected undead Steve with necrotic green skin." },
      { id: "diamond_knight", name: "Diamond Helmet", icon: "", cost: 800, desc: "Gleaming enchanted diamond helmet warrior." }
  ];
  
  const RANDOM_USERNAMES = [
      "MaceMaster", "WindStriker", "AerialAce", "SlamLord",
      "SkyCrusher", "BreezeDasher", "VortexKnight", "ImpactKing",
      "GravityDiver", "IronHammer", "SpearPhalanx", "ZenithSlammer",
      "HyperMace", "NimbusRider", "AeroDominator", "ApexBreaker",
      "DiamondSlicer", "RobloxianPro", "NetherChampion", "EnderAce"
  ];
  
  class AuthManager {
      constructor() {
          this.user = this.loadUser();
          this.listeners = [];
          this.initGoogleClient();
      }
  
      loadUser() {
          try {
              const data = localStorage.getItem(STORAGE_KEY);
              if (data) {
                  const parsed = JSON.parse(data);
                  // Schema backfills
                  if (parsed.gold === undefined) parsed.gold = 300;
                  if (!parsed.equippedWeapon) parsed.equippedWeapon = "mace";
                  if (parsed.secondaryWeapon === undefined) parsed.secondaryWeapon = null;
                  if (!parsed.classId) parsed.classId = "normal";
                  if (!parsed.unlockedWeapons) parsed.unlockedWeapons = ["mace", "spear"];
                  if (!parsed.weaponUpgrades) parsed.weaponUpgrades = {};
                  // Weapons no longer have stats: refund any enchantment upgrades once
                  if (!parsed.upgradesRefunded) {
                      let refund = 0;
                      Object.values(WEAPON_TYPES).forEach(w => (w.upgrades || []).forEach(u => {
                          const lvl = parsed.weaponUpgrades[u.id] || 0;
                          refund += u.costPerLevel * lvl * (lvl + 1) / 2;
                      }));
                      parsed.gold = (parsed.gold || 0) + refund;
                      parsed.weaponUpgrades = {};
                      parsed.upgradesRefunded = true;
                      // Save right away so a reload can never refund twice
                      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
                  }
                  if (!parsed.skinId) parsed.skinId = "steve";
                  if (!parsed.unlockedSkins) parsed.unlockedSkins = ["steve", "alex"];
                  if (parsed.friends === undefined) {
                      parsed.friends = [
                          { id: "f1", name: "AlexPro", status: "online" },
                          { id: "f2", name: "EndKnight", status: "in-match" },
                          { id: "f3", name: "BreezeDasher", status: "offline" }
                      ];
                  }
                  if (parsed.mail === undefined) {
                      parsed.mail = [
                          { id: "m1", from: "Arena Master", type: "gift", title: "Daily Combat Bounty", text: "Heroic work in the Arena! Claim your daily combat bounty.", giftGold: 100, claimed: false, date: "Today" },
                          { id: "m2", from: "AlexPro", type: "message", title: "GG on your last match!", text: "Nice ground slam back on the Obsidian platform, let's team up for 2v2 soon!", giftGold: 0, claimed: false, date: "Yesterday" }
                      ];
                  }
                  if (parsed.isMinor === undefined) parsed.isMinor = false;
                  return parsed;
              }
          } catch (e) {
              console.error("Failed to load user profile:", e);
          }
  
          // Default User
          return {
              id: "guest_" + Math.random().toString(36).substring(2, 8),
              username: "Steve",
              email: null,
              avatarType: "preset",
              avatarVal: "steve",
              avatarUrl: null,
              authProvider: "guest", // "guest" | "google"
              level: 1,
              xp: 0,
              gold: 300, // 300 starter gold
              equippedWeapon: "mace",
              secondaryWeapon: null, // second loadout slot (swap with Q in matches)
              classId: "normal", // Normal / Shadow / Lightning / Energy
              unlockedWeapons: ["mace", "spear"],
              weaponUpgrades: {},
              skinId: "steve",
              unlockedSkins: ["steve", "alex"],
              arenaRP: 250,
              isMinor: false,
              friends: [
                  { id: "f1", name: "AlexPro", status: "online" },
                  { id: "f2", name: "EndKnight", status: "in-match" },
                  { id: "f3", name: "BreezeDasher", status: "offline" }
              ],
              mail: [
                  { id: "m1", from: "Arena Master", type: "gift", title: "Daily Combat Bounty", text: "Heroic work in the Arena! Claim your daily combat bounty.", giftGold: 100, claimed: false, date: "Today" },
                  { id: "m2", from: "AlexPro", type: "message", title: "GG on your last match!", text: "Nice ground slam back on the Obsidian platform, let's team up for 2v2 soon!", giftGold: 0, claimed: false, date: "Yesterday" }
              ],
              stats: {
                  matches: 0,
                  wins: 0,
                  losses: 0,
                  slamsLanded: 0,
                  dashesLanded: 0,
                  maxSlamDamage: 0,
                  kills: 0,
                  damageDealt: 0,
                  currentStreak: 0,
                  bestStreak: 0
              }
          };
      }
  
      saveUser() {
          try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(this.user));
              this.syncRealPlayerToLeaderboard();
              this.notifyListeners();
          } catch (e) {
              console.error("Failed to save user profile:", e);
          }
      }
  
      syncRealPlayerToLeaderboard() {
          if (!this.user || !this.user.username) return;
          try {
              const raw = localStorage.getItem("spear_mace_real_leaderboard");
              let list = raw ? JSON.parse(raw) : [];
              // Remove any bots
              list = list.filter(p => p && !p.isBot && !(p.name && p.name.startsWith("[BOT]")));
  
              const existingIdx = list.findIndex(p => 
                  (p.id && p.id === this.user.id) || 
                  (p.name && p.name.toLowerCase() === this.user.username.toLowerCase())
              );
  
              const userWins = this.user.stats?.wins || 0;
              const matches = this.user.stats?.matches || 0;
              const userWinRate = matches > 0 ? `${Math.round((userWins / matches) * 100)}%` : "0%";
              const rp = this.user.arenaRP || 250;
              let tierId = "bronze";
              if (rp >= 2000) tierId = "obsidian";
              else if (rp >= 1500) tierId = "diamond";
              else if (rp >= 1000) tierId = "gold";
              else if (rp >= 500) tierId = "silver";
  
              const entry = {
                  id: this.user.id,
                  name: this.user.username,
                  rp: rp,
                  tier: tierId,
                  wins: userWins,
                  matches: matches,
                  winRate: userWinRate,
                  weapon: this.user.equippedWeapon || "mace",
                  skin: this.user.skinId || "steve",
                  isBot: false,
                  isUser: true,
                  updatedAt: Date.now()
              };
  
              if (existingIdx >= 0) {
                  list[existingIdx] = entry;
              } else {
                  list.push(entry);
              }
  
              localStorage.setItem("spear_mace_real_leaderboard", JSON.stringify(list));
          } catch (e) {}
      }
  
      onUserChanged(callback) {
          this.listeners.push(callback);
          callback(this.user);
      }
  
      notifyListeners() {
          for (const cb of this.listeners) {
              cb(this.user);
          }
      }
  
      getUser() {
          return this.user;
      }
  
      getUsername() {
          return this.user.username || "Steve";
      }
  
      setUsername(newUsername) {
          const trimmed = (newUsername || "").trim();
          if (trimmed.length < 2) {
              return { success: false, error: "Username must be at least 2 characters." };
          }
          if (trimmed.length > 16) {
              return { success: false, error: "Username must be 16 characters or less." };
          }
          if (!/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
              return { success: false, error: "Username can only contain letters, numbers, spaces, and underscores." };
          }
  
          this.user.username = trimmed;
          this.saveUser();
          return { success: true, username: trimmed };
      }
  
      setAvatar(type, val, url = null) {
          this.user.avatarType = type;
          this.user.avatarVal = val;
          this.user.avatarUrl = url;
          this.saveUser();
      }
  
      getRandomUsername() {
          const base = RANDOM_USERNAMES[Math.floor(Math.random() * RANDOM_USERNAMES.length)];
          const num = Math.floor(Math.random() * 90 + 10);
          return `${base}_${num}`;
      }
  
      // ==========================================
      // ECONOMY & WEAPONS & SKINS
      // ==========================================
  
      addGold(amount) {
          this.user.gold = (this.user.gold || 0) + amount;
          this.saveUser();
      }
  
      spendGold(amount) {
          if ((this.user.gold || 0) >= amount) {
              this.user.gold -= amount;
              this.saveUser();
              return true;
          }
          return false;
      }
  
      unlockWeapon(weaponId, cost) {
          if (!this.user.unlockedWeapons.includes(weaponId)) {
              if (this.spendGold(cost)) {
                  this.user.unlockedWeapons.push(weaponId);
                  this.user.equippedWeapon = weaponId;
                  this.saveUser();
                  return { success: true };
              }
              return { success: false, error: "Not enough gold!" };
          }
          return { success: false, error: "Weapon already unlocked." };
      }
  
      // slot 1 = primary weapon, slot 2 = secondary. Equipping a weapon that's in the
      // other slot swaps the two.
      equipWeapon(weaponId, slot = 1) {
          if (!this.user.unlockedWeapons.includes(weaponId)) return false;
          const u = this.user;
          if (slot === 2) {
              if (u.equippedWeapon === weaponId) u.equippedWeapon = u.secondaryWeapon || u.equippedWeapon;
              u.secondaryWeapon = weaponId;
              if (u.equippedWeapon === u.secondaryWeapon) u.secondaryWeapon = null;
          } else {
              if (u.secondaryWeapon === weaponId) u.secondaryWeapon = u.equippedWeapon;
              u.equippedWeapon = weaponId;
              if (u.secondaryWeapon === u.equippedWeapon) u.secondaryWeapon = null;
          }
          this.saveUser();
          return true;
      }
  
      setClass(classId) {
          this.user.classId = classId;
          this.saveUser();
      }
  
      clearSecondaryWeapon() {
          this.user.secondaryWeapon = null;
          this.saveUser();
      }
  
      upgradeWeapon(upgradeId, cost, maxLevel = 5) {
          const curLvl = this.user.weaponUpgrades[upgradeId] || 0;
          if (curLvl >= maxLevel) {
              return { success: false, error: "Already at maximum upgrade tier!" };
          }
          if (this.spendGold(cost)) {
              this.user.weaponUpgrades[upgradeId] = curLvl + 1;
              this.saveUser();
              return { success: true, newLevel: curLvl + 1 };
          }
          return { success: false, error: "Not enough gold!" };
      }
  
      unlockSkin(skinId, cost) {
          if (!this.user.unlockedSkins.includes(skinId)) {
              if (this.spendGold(cost)) {
                  this.user.unlockedSkins.push(skinId);
                  this.user.skinId = skinId;
                  this.saveUser();
                  return { success: true };
              }
              return { success: false, error: "Not enough gold!" };
          }
          return { success: false, error: "Skin already unlocked." };
      }
  
      equipSkin(skinId) {
          if (this.user.unlockedSkins.includes(skinId)) {
              this.user.skinId = skinId;
              this.saveUser();
              return true;
          }
          return false;
      }
  
      // ==========================================
      // GOOGLE IDENTITY SERVICES
      // ==========================================
  
      isGoogleConfigured() {
          return !!GOOGLE_CLIENT_ID;
      }
  
      // The Google script loads asynchronously; wait for it, then initialize once
      initGoogleClient() {
          this.googleReady = false;
          this.googleReadyCallbacks = [];
          if (!this.isGoogleConfigured() || typeof window === "undefined") return;
  
          let tries = 0;
          const tryInit = () => {
              if (window.google && window.google.accounts && window.google.accounts.id) {
                  try {
                      window.google.accounts.id.initialize({
                          client_id: GOOGLE_CLIENT_ID,
                          callback: (response) => this.handleGoogleCredentialResponse(response),
                          auto_select: false
                      });
                      this.googleReady = true;
                      this.googleReadyCallbacks.forEach(cb => cb());
                      this.googleReadyCallbacks = [];
                  } catch (e) {
                      console.warn("Google Identity Services initialization warning:", e);
                  }
                  return;
              }
              if (++tries < 100) setTimeout(tryInit, 100); // give up after ~10s (offline / blocked)
          };
          tryInit();
      }
  
      // Draws Google's official "Sign in with Google" button into the element
      renderGoogleButton(el) {
          const draw = () => {
              el.innerHTML = "";
              window.google.accounts.id.renderButton(el, {
                  theme: "filled_black",
                  size: "large",
                  text: "signin_with",
                  shape: "rectangular"
              });
          };
          if (this.googleReady) draw();
          else this.googleReadyCallbacks.push(draw);
      }
  
      parseJwt(token) {
          try {
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                  return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              return JSON.parse(jsonPayload);
          } catch (e) {
              return null;
          }
      }
  
      handleGoogleCredentialResponse(response) {
          if (!response || !response.credential) return;
          const payload = this.parseJwt(response.credential);
          if (!payload) return;
  
          this.signInWithGoogleData({
              id: payload.sub,
              email: payload.email,
              name: payload.name || payload.given_name || "Google Player",
              picture: payload.picture
          });
          if (this.onGoogleSignIn) this.onGoogleSignIn();
      }
  
      signInWithGoogleData({ id, email, name, picture }) {
          this.user.id = `g_${id}`;
          this.user.email = email;
          this.user.authProvider = "google";
          
          if (!this.user.username || this.user.username === "Player" || this.user.username === "Steve") {
              const suggested = (name || "Player").replace(/[^a-zA-Z0-9_]/g, "").substring(0, 14);
              this.user.username = suggested || "GooglePlayer";
          }
  
          // Always keep Steve's head as avatar
          this.user.avatarType = "preset";
          this.user.avatarVal = "steve";
          this.user.avatarUrl = null;
  
          this.saveUser();
          return this.user;
      }
  
      signOut() {
          if (typeof window !== "undefined" && window.google && window.google.accounts && window.google.accounts.id) {
              try { window.google.accounts.id.disableAutoSelect(); } catch (e) { /* not initialized */ }
          }
          this.user.email = null;
          this.user.authProvider = "guest";
          this.user.avatarType = "preset";
          this.user.avatarVal = "steve";
          this.user.avatarUrl = null;
          this.saveUser();
      }
  
      // ==========================================
      // FRIENDS, MAILBOX & PARENTAL/MINOR PROTECTION
      // ==========================================
  
      toggleMinorMode(enabled) {
          this.user.isMinor = !!enabled;
          this.saveUser();
          return this.user.isMinor;
      }
  
      getFriends() {
          return this.user.friends || [];
      }
  
      addFriend(name) {
          const clean = (name || "").trim();
          if (clean.length < 2) return { success: false, error: "Friend name too short." };
          if (!this.user.friends) this.user.friends = [];
          if (this.user.friends.some(f => f.name.toLowerCase() === clean.toLowerCase())) {
              return { success: false, error: "Friend already added!" };
          }
          const statuses = ["online", "in-match", "offline"];
          const randStatus = statuses[Math.floor(Math.random() * statuses.length)];
          const newFriend = { id: "f_" + Date.now(), name: clean, status: randStatus };
          this.user.friends.push(newFriend);
          this.saveUser();
          return { success: true, friend: newFriend };
      }
  
      removeFriend(id) {
          if (!this.user.friends) return false;
          this.user.friends = this.user.friends.filter(f => f.id !== id);
          this.saveUser();
          return true;
      }
  
      getMail() {
          const rawMail = this.user.mail || [];
          // If minor playing mode is active, they can't get text messages, ONLY loot/gifts!
          if (this.user.isMinor) {
              return rawMail.map(m => {
                  if (m.type === "message" && (!m.giftGold || m.giftGold <= 0)) {
                      return {
                          ...m,
                          text: "[Message hidden by Minor Account Protection. Only loot packages and gifts can be received.]",
                          isRestricted: true
                      };
                  }
                  return m;
              });
          }
          return rawMail;
      }
  
      sendMail(toName, title, text, giftGold = 0) {
          const cleanTo = (toName || "").trim();
          const cleanTitle = (title || "Letter from Arena").trim();
          const cleanText = (text || "").trim();
          const goldToSend = Math.max(0, parseInt(giftGold) || 0);
  
          if (!cleanTo) return { success: false, error: "Please specify a recipient." };
          if (goldToSend > 0) {
              if ((this.user.gold || 0) < goldToSend) {
                  return { success: false, error: "Not enough gold to send this gift!" };
              }
              this.spendGold(goldToSend);
          }
  
          // Simulate delivery & auto-reply after sending
          setTimeout(() => {
              if (!this.user.mail) this.user.mail = [];
              const isGift = goldToSend > 0;
              const replyGift = isGift ? Math.round(goldToSend * 1.25) : 0;
              this.user.mail.unshift({
                  id: "m_" + Date.now(),
                  from: cleanTo,
                  type: replyGift > 0 ? "gift" : "message",
                  title: `Re: ${cleanTitle}`,
                  text: replyGift > 0 
                      ? `Thanks for your gift package! Here is a bounty return from our raid!` 
                      : `Hey ${this.getUsername()}, received your message! Let's conquer the next match together.`,
                  giftGold: replyGift,
                  claimed: false,
                  date: "Just now"
              });
              this.saveUser();
          }, 1200);
  
          return { success: true, message: "Mail delivered successfully!" };
      }
  
      claimMailGift(mailId) {
          if (!this.user.mail) return { success: false, error: "No mail found." };
          const item = this.user.mail.find(m => m.id === mailId);
          if (!item) return { success: false, error: "Mail not found." };
          if (item.claimed) return { success: false, error: "Loot already claimed." };
          const gold = item.giftGold || 0;
          if (gold > 0) {
              this.addGold(gold);
              item.claimed = true;
              this.saveUser();
              return { success: true, goldClaimed: gold };
          }
          return { success: false, error: "No loot attached to this mail." };
      }
  
      deleteMail(mailId) {
          if (!this.user.mail) return false;
          this.user.mail = this.user.mail.filter(m => m.id !== mailId);
          this.saveUser();
          return true;
      }
  
      // ==========================================
      // PROGRESSION & COMBAT RESULTS (SCALED ECONOMY)
      // ==========================================
  
      recordMatchResult(isWin, mode = "normal", matchStats = null) {
          const s = this.user.stats;
          s.matches++;
  
          let goldEarned = 0;
          let xpEarned = 0;
  
          // Scaled economy: Starter matches award less gold; higher tiers award substantially more!
          if (isWin) {
              s.wins++;
              s.currentStreak++;
              if (s.currentStreak > s.bestStreak) {
                  s.bestStreak = s.currentStreak;
              }
  
              if (mode === "god") {
                  goldEarned = 320; // High stakes apex match
                  xpEarned = 300;
              } else if (mode === "pro") {
                  goldEarned = 140;
                  xpEarned = 160;
              } else if (mode === "normal") {
                  goldEarned = 45;
                  xpEarned = 70;
              } else if (mode === "easy") {
                  goldEarned = 18;  // Lower starter match
                  xpEarned = 35;
              } else {
                  goldEarned = 8;   // Practice starter match
                  xpEarned = 15;
              }
          } else {
              s.losses++;
              s.currentStreak = 0;
              goldEarned = mode === "god" ? 35 : (mode === "pro" ? 20 : (mode === "normal" ? 10 : 4));
              xpEarned = 25;
          }
  
          this.addMatchStatsToCareer(matchStats);
  
          this.addGold(goldEarned);
          this.addXP(xpEarned);
          this.saveUser();
  
          return { isWin, goldEarned, xpEarned };
      }
  
      // Ranked Arena Match Outcome (Scales heavily as rank increases)
      // Adds one match's combat numbers to the lifetime career record
      addMatchStatsToCareer(matchStats) {
          if (!matchStats) return;
          const s = this.user.stats;
          s.slamsLanded = (s.slamsLanded || 0) + (matchStats.slamsLanded || 0);
          s.dashesLanded = (s.dashesLanded || 0) + (matchStats.dashesLanded || 0);
          s.kills = (s.kills || 0) + (matchStats.kills || 0);
          s.damageDealt = (s.damageDealt || 0) + (matchStats.damageDealt || 0);
          if ((matchStats.maxSlamDamage || 0) > (s.maxSlamDamage || 0)) {
              s.maxSlamDamage = matchStats.maxSlamDamage;
          }
      }
  
      recordArenaMatchResult(isWin, matchType = "1v1", matchStats = null) {
          const s = this.user.stats;
          s.matches++;
          this.addMatchStatsToCareer(matchStats);
  
          const curRP = this.user.arenaRP || 250;
          let rpDelta = 0;
          let goldEarned = 0;
          let xpEarned = 0;
  
          // Tier multipliers: Bronze (<400), Silver (<800), Gold (<1400), Diamond (<2200), Obsidian (2200+)
          const tierFactor = curRP >= 2200 ? 3.0 : (curRP >= 1400 ? 2.2 : (curRP >= 800 ? 1.6 : (curRP >= 400 ? 1.2 : 0.8)));
  
          if (isWin) {
              s.wins++;
              s.currentStreak++;
              if (s.currentStreak > s.bestStreak) {
                  s.bestStreak = s.currentStreak;
              }
  
              rpDelta = matchType === "5v5" ? 45 : (matchType === "2v2" ? 35 : 30);
              const baseGold = matchType === "5v5" ? 160 : (matchType === "2v2" ? 120 : 90);
              goldEarned = Math.round(baseGold * tierFactor);
              xpEarned = Math.round(100 * tierFactor);
  
              this.user.arenaRP = curRP + rpDelta;
          } else {
              s.losses++;
              s.currentStreak = 0;
              rpDelta = -14;
              goldEarned = Math.round(20 * tierFactor);
              xpEarned = 35;
  
              this.user.arenaRP = Math.max(0, curRP + rpDelta);
          }
  
          this.addGold(goldEarned);
          this.addXP(xpEarned);
          this.saveUser();
  
          return { isWin, rpDelta, goldEarned, xpEarned, newRP: this.user.arenaRP };
      }
  
      addXP(amount) {
          this.user.xp += amount;
          // Level progression: each level requires 200 XP
          const nextLevel = Math.floor(this.user.xp / 200) + 1;
          if (nextLevel > this.user.level) {
              const levelGained = nextLevel - this.user.level;
              this.user.level = nextLevel;
              // Level progression generates Gold! (200 Gold per level)
              const bonusGold = levelGained * 200;
              this.user.gold = (this.user.gold || 0) + bonusGold;
          }
      }
  
      getRankTitle() {
          const wins = this.user.stats.wins;
          if (wins >= 50) return "Grand Mace Master";
          if (wins >= 25) return "Sky Champion";
          if (wins >= 10) return "Aerial Duelist";
          if (wins >= 3) return "Arena Fighter";
          return "Novice Recruit";
      }
  }
  
  const auth = new AuthManager();
  

  // ===== online.js =====
  // ==========================================
  // SPEAR-MACE PVP - Peer-to-Peer Online Play
  // Browsers connect directly with WebRTC (via PeerJS, loaded in index.html).
  // The host runs the match simulation and accepts up to 3 friends; guests
  // send inputs and draw the snapshots the host streams back.
  // ==========================================
  
  // Prefix keeps our room IDs from colliding with other apps on the public PeerJS server
  const PEER_ID_PREFIX = "spear-mace-pvp-";
  const CONNECT_TIMEOUT_MS = 12000;
  
  class OnlineSession {
      constructor() {
          this.peer = null;
          this.role = null; // "host" | "guest" | null
          this.conns = new Map(); // peerId -> DataConnection (host: guests, guest: just the host)
          this.maxGuests = 1;
          this.onMessage = null; // (msg, fromPeerId) => void
          this.onDisconnect = null; // (reason, peerId) => void
          this.onGuestJoined = null; // (peerId) => void (host only)
          this.connectTimer = null;
      }
  
      isAvailable() {
          return typeof window !== "undefined" && typeof window.Peer === "function";
      }
  
      isConnected() {
          for (const c of this.conns.values()) if (c.open) return true;
          return false;
      }
  
      guestCount() {
          let n = 0;
          for (const c of this.conns.values()) if (c.open) n++;
          return n;
      }
  
      // Host a room; onReady fires once the room code is registered
      host(roomCode, maxGuests, onReady, onError) {
          this.close();
          if (!this.isAvailable()) {
              onError("Online play couldn't load. Check your internet connection and refresh.");
              return;
          }
          this.role = "host";
          this.maxGuests = maxGuests;
          this.peer = new window.Peer(PEER_ID_PREFIX + roomCode);
  
          this.peer.on("open", () => onReady());
          this.peer.on("connection", (conn) => {
              if (this.guestCount() >= this.maxGuests) {
                  conn.on("open", () => {
                      conn.send({ t: "full" });
                      setTimeout(() => conn.close(), 300);
                  });
                  return;
              }
              this.attachConnection(conn, () => {
                  if (this.onGuestJoined) this.onGuestJoined(conn.peer);
              });
          });
          this.peer.on("error", (err) => onError(this.describeError(err)));
      }
  
      // Join a friend's room: calls onConnected once the data channel is open
      join(roomCode, onConnected, onError) {
          this.close();
          if (!this.isAvailable()) {
              onError("Online play couldn't load. Check your internet connection and refresh.");
              return;
          }
          this.role = "guest";
          this.peer = new window.Peer();
  
          this.peer.on("open", () => {
              const conn = this.peer.connect(PEER_ID_PREFIX + roomCode, { reliable: true });
              this.attachConnection(conn, () => {
                  clearTimeout(this.connectTimer);
                  onConnected();
              });
          });
          this.peer.on("error", (err) => {
              clearTimeout(this.connectTimer);
              onError(this.describeError(err));
          });
  
          this.connectTimer = setTimeout(() => {
              if (!this.isConnected()) {
                  onError("Couldn't reach that room. Make sure your friend's room is still open, then try again.");
                  this.close();
              }
          }, CONNECT_TIMEOUT_MS);
      }
  
      attachConnection(conn, onOpen) {
          this.conns.set(conn.peer, conn);
          conn.on("open", onOpen);
          conn.on("data", (msg) => {
              if (this.onMessage && msg && typeof msg === "object") this.onMessage(msg, conn.peer);
          });
          const lost = (reason) => this.handleDisconnect(conn.peer, reason);
          conn.on("close", () => lost(this.role === "host" ? "A player left the match." : "The host left the match."));
          conn.on("error", () => lost("The connection was lost."));
      }
  
      handleDisconnect(peerId, reason) {
          if (!this.conns.has(peerId)) return; // already closed on purpose
          this.conns.delete(peerId);
          if (this.onDisconnect) this.onDisconnect(reason, peerId);
      }
  
      // Host: send to every guest. Guest: send to the host.
      send(msg) {
          for (const c of this.conns.values()) this.sendOn(c, msg);
      }
  
      sendTo(peerId, msg) {
          const c = this.conns.get(peerId);
          if (c) this.sendOn(c, msg);
      }
  
      sendOn(conn, msg) {
          if (!conn.open) return;
          try {
              conn.send(msg);
          } catch (e) {
              console.warn("Online send failed:", e);
          }
      }
  
      close() {
          clearTimeout(this.connectTimer);
          const conns = [...this.conns.values()];
          this.conns.clear(); // closing on purpose: don't report these as disconnects
          conns.forEach(c => {
              try { c.close(); } catch (e) { /* already closed */ }
          });
          if (this.peer) {
              try { this.peer.destroy(); } catch (e) { /* already destroyed */ }
              this.peer = null;
          }
          this.role = null;
      }
  
      describeError(err) {
          const type = err && err.type;
          if (type === "peer-unavailable") return "Room not found. Check the code, or ask your friend to create the room again.";
          if (type === "unavailable-id") return "That room code is already in use. Create a new room.";
          if (type === "network" || type === "server-error" || type === "socket-error" || type === "socket-closed") {
              return "Couldn't reach the online server. Check your internet connection and try again.";
          }
          if (type === "browser-incompatible") return "This browser doesn't support online play. Try Chrome, Edge, Firefox or Safari.";
          return "Online connection error. Please try again.";
      }
  }
  
  const online = new OnlineSession();
  

  // ===== particles.js =====
  // ==========================================
  // SPEAR-MACE PVP - Particles & Combat FX
  // ==========================================
  
  class ParticleManager {
      constructor() {
          this.particles = [];
          this.shockwaves = [];
          this.floatingTexts = [];
          this.cameraShake = { intensity: 0, duration: 0, x: 0, y: 0 };
      }
  
      reset() {
          this.particles = [];
          this.shockwaves = [];
          this.floatingTexts = [];
          this.cameraShake = { intensity: 0, duration: 0, x: 0, y: 0 };
      }
  
      triggerShake(intensity = 8, frames = 12) {
          this.cameraShake.intensity = Math.max(this.cameraShake.intensity, intensity);
          this.cameraShake.duration = Math.max(this.cameraShake.duration, frames);
      }
  
      addShockwave(x, y, maxRadius = 45, color = "rgba(255, 170, 0, 0.8)", strokeWidth = 3) {
          this.shockwaves.push({
              x,
              y,
              radius: 8,
              maxRadius,
              alpha: 1.0,
              growthRate: (maxRadius - 8) / 12,
              fadeRate: 1.0 / 12,
              color,
              strokeWidth
          });
      }
  
      addHitSparks(x, y, count = 12, color = "#ffbb00") {
          for (let i = 0; i < count; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 2 + Math.random() * 6;
              this.particles.push({
                  x,
                  y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed - 1.5,
                  gravity: 0.2,
                  size: 2 + Math.random() * 3,
                  alpha: 1.0,
                  decay: 0.04 + Math.random() * 0.03,
                  color,
                  type: "spark"
              });
          }
      }
  
      addDashTrail(x, y, facing, color = "rgba(200, 240, 255, 0.7)") {
          for (let i = 0; i < 3; i++) {
              this.particles.push({
                  x: x + (Math.random() * 10 - 5),
                  y: y + (Math.random() * 14 - 7),
                  vx: -facing * (1 + Math.random() * 2),
                  vy: (Math.random() - 0.5) * 1.5,
                  gravity: 0,
                  size: 4 + Math.random() * 5,
                  alpha: 0.8,
                  decay: 0.08,
                  color,
                  type: "smoke"
              });
          }
      }
  
      addDust(x, y, count = 6) {
          for (let i = 0; i < count; i++) {
              const vx = (Math.random() - 0.5) * 4;
              const vy = -Math.random() * 2;
              this.particles.push({
                  x: x + (Math.random() * 20 - 10),
                  y: y,
                  vx,
                  vy,
                  gravity: 0.08,
                  size: 2 + Math.random() * 3,
                  alpha: 0.6,
                  decay: 0.05,
                  color: "rgba(180, 180, 180, 0.6)",
                  type: "dust"
              });
          }
      }
  
      addFloatingText(x, y, text, color = "#ffffff", isCrit = false, scale = 1.0) {
          this.floatingTexts.push({
              x: x + (Math.random() * 20 - 10),
              y: y - 10,
              vy: -2.2,
              text,
              color,
              alpha: 1.0,
              life: 45,
              maxLife: 45,
              isCrit,
              scale
          });
      }
  
      addDamageText(x, y, damage, isSlam = false) {
          let color = "#ffe135"; // normal yellow
          let scale = 1.0;
          let isCrit = false;
          let suffix = "";
  
          if (damage >= 100) {
              color = "#ff2244"; // massive crit red
              scale = 1.6;
              isCrit = true;
              suffix = " !";
          } else if (damage >= 50) {
              color = "#ff6b1a"; // heavy slam orange
              scale = 1.3;
              isCrit = isSlam;
          } else if (isSlam) {
              color = "#ffaa00";
              scale = 1.15;
          }
  
          const displayText = `-${damage.toFixed(0)}${suffix}`;
          this.addFloatingText(x, y, displayText, color, isCrit, scale);
      }
  
      update() {
          // Camera shake
          if (this.cameraShake.duration > 0) {
              this.cameraShake.duration--;
              const amount = this.cameraShake.intensity * (this.cameraShake.duration / 12);
              this.cameraShake.x = (Math.random() * 2 - 1) * amount;
              this.cameraShake.y = (Math.random() * 2 - 1) * amount;
              if (this.cameraShake.duration <= 0) {
                  this.cameraShake.intensity = 0;
                  this.cameraShake.x = 0;
                  this.cameraShake.y = 0;
              }
          } else {
              this.cameraShake.x = 0;
              this.cameraShake.y = 0;
          }
  
          // Particles
          for (let i = this.particles.length - 1; i >= 0; i--) {
              const p = this.particles[i];
              p.x += p.vx;
              p.y += p.vy;
              p.vy += p.gravity;
              p.alpha -= p.decay;
              if (p.size > 0.5) p.size *= 0.96;
  
              if (p.alpha <= 0 || p.size <= 0.4) {
                  this.particles.splice(i, 1);
              }
          }
  
          // Shockwaves
          for (let i = this.shockwaves.length - 1; i >= 0; i--) {
              const s = this.shockwaves[i];
              s.radius += s.growthRate;
              s.alpha -= s.fadeRate;
  
              if (s.alpha <= 0 || s.radius >= s.maxRadius) {
                  this.shockwaves.splice(i, 1);
              }
          }
  
          // Floating texts
          for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
              const t = this.floatingTexts[i];
              t.y += t.vy;
              t.vy *= 0.94;
              t.life--;
              t.alpha = Math.max(0, t.life / t.maxLife);
  
              if (t.life <= 0) {
                  this.floatingTexts.splice(i, 1);
              }
          }
      }
  
      draw(ctx) {
          if (this.shockwaves.length === 0 && this.particles.length === 0 && this.floatingTexts.length === 0) {
              return;
          }
  
          ctx.save();
  
          // 1. Batched Shockwaves
          for (let i = 0; i < this.shockwaves.length; i++) {
              const s = this.shockwaves[i];
              ctx.globalAlpha = Math.max(0, s.alpha);
              ctx.strokeStyle = s.color;
              ctx.lineWidth = s.strokeWidth;
              ctx.beginPath();
              ctx.ellipse(s.x, s.y, s.radius, s.radius * 0.45, 0, 0, Math.PI * 2);
              ctx.stroke();
          }
  
          // 2. Batched Particles (Zero per-item save/restore!)
          for (let i = 0; i < this.particles.length; i++) {
              const p = this.particles[i];
              ctx.globalAlpha = Math.max(0, p.alpha);
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
              ctx.fill();
          }
  
          // 3. Batched Floating Damage Text
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          for (let i = 0; i < this.floatingTexts.length; i++) {
              const t = this.floatingTexts[i];
              ctx.globalAlpha = Math.max(0, t.alpha);
  
              const fontSize = Math.round(14 * t.scale);
              ctx.font = `bold ${fontSize}px "Segoe UI", system-ui, -apple-system, sans-serif`;
  
              ctx.strokeStyle = "#000000";
              ctx.lineWidth = t.isCrit ? 4 : 3;
              ctx.strokeText(t.text, t.x, t.y);
  
              ctx.fillStyle = t.color;
              ctx.fillText(t.text, t.x, t.y);
          }
  
          ctx.restore();
      }
  }
  

  // ===== entity.js =====
  // ==========================================
  // SPEAR-MACE PVP - Fighter Entity Class
  // Handles physics, weapons, skin customization, and multi-fighter combat
  // ==========================================
  
  
  class Fighter {
      constructor(isBot = false, id = "p1", name = "Player") {
          this.isBot = isBot;
          this.id = id;
          this.name = name;
  
          this.w = 25;
          this.h = 25;
  
          // Position & Velocity
          this.x = 150;
          this.y = 300;
          this.xVel = 0;
          this.yVel = 0;
  
          // Team (for 2v2 and 5v5 Arena modes)
          this.team = null; // "red" | "blue" | null
  
          // Weapon & Skin
          this.weaponId = "mace";
          this.weaponStats = getComputedWeaponStats("mace");
          this.skinId = "steve";
          this.arrowCooldown = 0;
          this.aimAngle = null; // bow aim (radians) set from the mouse; null = shoot straight ahead
  
          // Class (see CLASSES in config.js)
          this.classId = "normal";
          this.resetClassState();
  
          // State Flags
          this.onGround = false;
          this.jumpsLeft = 1;
          this.coyoteTimer = 0;
          this.facing = 1;
          this.jumpBuffer = 0; // Frames to buffer jump input before landing
          this.dashBuffer = 0; // Frames to buffer dash input before cooldown ends
  
          // Dash State
          this.dashReady = true;
          this.dashing = false;
          this.dashTimer = 0;
          this.dashCooldown = 0;
          this.dashAttack = false;
  
          // Slam State
          this.slamming = false;
          this.slamStartY = 0;
  
          // Health & Stun
          this.maxHp = CORE_PHYSICS.maxHp;
          this.hp = this.maxHp;
          this.ghostHp = this.maxHp;
          this.hitCooldown = 0;
          this.stun = 0;
          this.isBotGame = false;
  
          // Visual squash & stretch
          this.squashX = 1.0;
          this.squashY = 1.0;
  
          // Stats tracking
          this.stats = {
              damageDealt: 0,
              damageTaken: 0,
              slamsLanded: 0,
              dashesLanded: 0,
              arrowsHit: 0,
              maxSlamDamage: 0,
              maxHeight: 0
          };
      }
  
      setWeapon(weaponId, upgradeLevels = {}) {
          this.weaponId = weaponId;
          this.weaponStats = getComputedWeaponStats(weaponId, upgradeLevels);
      }
  
      setClass(classId) {
          this.classId = CLASSES[classId] ? classId : "normal";
          this.resetClassState();
      }
  
      // Clears class timers and status effects (new match, respawn, class change)
      resetClassState() {
          this.shadowTimer = 0;
          this.invis = false;
          this.energyBoost = CLASSES.energy.boostStart;
          this.runFrames = 0;
          this.stillFrames = 0;
          this.voidTimer = this.nextVoidDelay();
          this.sizeCooldown = 0;
          this.setBig(false);
          // Status effects from enemy Potionmaster / Pyro hits
          this.slowT = 0;
          this.poisonT = 0;
          this.blindT = 0;
          this.fireT = 0;
          this.freezeT = 0;
          this.dotSource = null;
      }
  
      nextVoidDelay() {
          const v = CLASSES.void;
          return v.minDelay + Math.floor(Math.random() * (v.maxDelay - v.minDelay + 1));
      }
  
      // Walking speed multiplier from the class (slow is applied in physics for everyone)
      moveSpeedMult() {
          if (this.classId === "shadow" && this.invis) return CLASSES.shadow.invisSpeedMult;
          if (this.classId === "energy") return 1 + this.energyBoost;
          return 1;
      }
  
      // Damage multiplier from the class (invisible Shadow, big Buddha)
      classDamageMult() {
          if (this.classId === "shadow" && this.invis) return CLASSES.shadow.invisDamageMult;
          if (this.classId === "buddha" && this.big) return CLASSES.buddha.bigDamageMult;
          return 1;
      }
  
      // Buddha: switch between normal and big size (feet stay on the ground)
      setBig(big) {
          const size = big ? 25 * CLASSES.buddha.bigScale : 25;
          if (this.w !== undefined && this.w !== size) {
              const cx = this.x + this.w / 2;
              const feet = this.y + this.h;
              this.w = size;
              this.h = size;
              this.x = Math.max(0, Math.min(ARENA_CONFIG.width - size, cx - size / 2));
              this.y = feet - size;
          } else {
              this.w = size;
              this.h = size;
          }
          this.big = big;
      }
  
      toggleSize() {
          if (this.classId !== "buddha" || this.hp <= 0 || this.sizeCooldown > 0) return false;
          this.setBig(!this.big);
          this.sizeCooldown = CLASSES.buddha.toggleCooldown;
          this.squashX = 1.2;
          this.squashY = 0.85;
          sound.playSlamStart();
          return true;
      }
  
      // Two-weapon loadout: primary + optional secondary, swapped with swapWeapon()
      setLoadout(primary, secondary = null, upgradeLevels = {}) {
          this.loadout = secondary && secondary !== primary ? [primary, secondary] : [primary];
          this.loadoutUpgrades = upgradeLevels;
          this.activeSlot = 0;
          this.swapCooldown = 0;
          this.setWeapon(primary, upgradeLevels);
      }
  
      swapWeapon() {
          if (!this.loadout || this.loadout.length < 2) return false;
          if (this.swapCooldown > 0 || this.dashing || this.slamming || this.hp <= 0) return false;
          this.activeSlot = 1 - this.activeSlot;
          this.setWeapon(this.loadout[this.activeSlot], this.loadoutUpgrades || {});
          this.swapCooldown = 20; // ~1/3 second between swaps
          this.squashX = 1.15;
          this.squashY = 0.9;
          sound.playClick();
          return true;
      }
  
      setSkin(skinId) {
          this.skinId = skinId;
      }
  
      setTeam(team) {
          this.team = team;
      }
  
      reset(x, facing, maxHp = 100) {
          this.resetClassState();
          this.x = x;
          this.y = 300;
          this.spawnX = x;
          this.spawnY = 300;
          this.xVel = 0;
          this.yVel = 0;
          this.onGround = false;
          this.jumpsLeft = 1;
          this.coyoteTimer = 0;
          this.facing = facing;
          this.jumpBuffer = 0;
          this.dashBuffer = 0;
  
          this.dashReady = true;
          this.dashing = false;
          this.dashTimer = 0;
          this.dashCooldown = 0;
          this.dashAttack = false;
          this.arrowCooldown = 0;
  
          this.slamming = false;
          this.slamStartY = 0;
  
          this.maxHp = maxHp;
          this.hp = maxHp;
          this.ghostHp = maxHp;
          this.hitCooldown = 0;
          this.stun = 0;
  
          this.squashX = 1.0;
          this.squashY = 1.0;
  
          this.isDead = false;
          this.lastHitBy = null;
          this.stats = {
              kills: 0,
              damageDealt: 0,
              damageTaken: 0,
              slamsAttempted: 0,
              slamsLanded: 0,
              slamsMissed: 0,
              dashesAttempted: 0,
              dashesLanded: 0,
              dashesMissed: 0,
              arrowsAttempted: 0,
              arrowsHit: 0,
              arrowsMissed: 0,
              maxSlamDamage: 0,
              maxHeight: 0
          };
      }
  
      respawn(x, y) {
          const classId = this.classId;
          this.resetClassState();
          this.classId = classId;
          this.x = x;
          this.y = y;
          this.spawnX = x;
          this.spawnY = y;
          this.xVel = 0;
          this.yVel = 0;
          this.hp = this.maxHp;
          this.ghostHp = this.maxHp;
          this.slamming = false;
          this.dashing = false;
          this.dashAttack = false;
          this.dashReady = true;
          this.dashCooldown = 0;
          this.stun = 0;
          this.hitCooldown = 60; // 1 second invulnerability
          this.isDead = false;
          this.squashX = 1.0;
          this.squashY = 1.0;
      }
  
      // Jump / Double Jump execution with Input Buffering
      jump() {
          if (this.freezeT > 0) return false;
          if (this.stun > 0 || this.dashing) {
              // Buffer jump while recovering from stun or dash
              this.jumpBuffer = 6;
              return false;
          }
  
          if (this.onGround || this.coyoteTimer > 0 || this.jumpsLeft > 0) {
              const isDoubleJump = !this.onGround && this.coyoteTimer <= 0;
  
              this.yVel = CORE_PHYSICS.jumpPower;
              if (this.classId === "energy") {
                  this.energyBoost = Math.max(0, Math.round((this.energyBoost - CLASSES.energy.jumpLoss) * 100) / 100);
              }
  
              if (isDoubleJump) {
                  this.jumpsLeft--;
                  sound.playDoubleJump();
                  this.squashX = 0.8;
                  this.squashY = 1.25;
              } else {
                  sound.playJump();
                  this.squashX = 0.85;
                  this.squashY = 1.2;
              }
  
              this.onGround = false;
              this.coyoteTimer = 0;
              this.jumpBuffer = 0;
              return true;
          }
  
          // Buffer jump input for 6 frames (~100ms) so tapping jump just before landing executes instantly
          this.jumpBuffer = 6;
          return false;
      }
  
      // Dash / Weapon Attack execution with Input Buffering
      dash(customSpeed = null, isAttack = true, customCooldown = null, arrowManager = null) {
          if (this.freezeT > 0) return false;
          if (this.stun > 0) {
              if (this.stun <= 5) this.dashBuffer = 6;
              return false;
          }
  
          const speed = customSpeed ?? (this.weaponStats.dashSpeed || CORE_PHYSICS.dashSpeed);
          let cooldown = customCooldown ?? (this.weaponStats.attackCooldown || CORE_PHYSICS.dashCooldown);
          if (this.classId === "energy") {
              // Energy: air dashes recharge (no one-dash-per-jump limit) on a 0.75s cooldown
              cooldown = Math.max(cooldown, CLASSES.energy.dashCooldown);
              if (!this.dashing) this.dashReady = true;
          }
          const duration = this.weaponStats.dashDistance || CORE_PHYSICS.dashTime;
  
          // If equipped with Bow, dash key shoots an arrow!
          if (this.weaponId === "bow") {
              if (this.arrowCooldown <= 0 && arrowManager) {
                  const reloadTime = this.weaponStats.reloadTime || 45;
                  this.arrowCooldown = reloadTime;
  
                  // Spawn arrow (aimed at the mouse when an aim angle is set)
                  const aim = this.aimAngle;
                  const aimed = aim !== null && aim !== undefined;
                  if (aimed) this.facing = Math.cos(aim) >= 0 ? 1 : -1;
                  arrowManager.spawnArrow(
                      aimed ? this.x + this.w / 2 + Math.cos(aim) * 18 : (this.facing > 0 ? this.x + this.w + 4 : this.x - 4),
                      aimed ? this.y + this.h / 2 + Math.sin(aim) * 18 : this.y + this.h / 2,
                      this.facing,
                      this.id,
                      this.team,
                      (this.weaponStats.arrowDamage || 30) * this.classDamageMult(),
                      this.weaponStats.arrowSpeed || 16,
                      this.weaponStats.arrowKnockback || 1.0,
                      aimed ? aim : null
                  );
  
                  this.stats.arrowsAttempted++;
                  sound.playDash(); // bow shoot twang
                  this.squashX = 1.2;
                  this.squashY = 0.85;
  
                  // Slight recoil
                  this.xVel = -this.facing * 3;
                  this.dashBuffer = 0;
                  return true;
              }
              if (this.arrowCooldown <= 5) this.dashBuffer = 6;
              return false;
          }
  
          if (this.slamming) {
              this.slamming = false;
              this.dashReady = true;
              this.dashCooldown = 0;
          }
  
          if (this.dashReady && !this.dashing && this.dashCooldown <= 0) {
              this.dashReady = false;
              this.dashing = true;
              this.dashAttack = isAttack;
              this.dashTimer = duration;
              this.dashCooldown = cooldown;
  
              if (isAttack) {
                  this.stats.dashesAttempted++;
              }
  
              this.yVel = 0;
              this.xVel = this.facing * speed;
  
              this.squashX = 1.35;
              this.squashY = 0.7;
  
              sound.playDash();
              this.dashBuffer = 0;
              return true;
          }
  
          // Buffer dash if cooldown is ending shortly
          if (this.dashCooldown <= 5) {
              this.dashBuffer = 6;
          }
  
          return false;
      }
  
      // Slam execution
      slam() {
          if (this.freezeT > 0) return false;
          if (this.stun > 0 || this.onGround || this.slamming || this.dashing) return false;
  
          this.slamming = true;
          this.slamStartY = this.y;
          const speed = this.weaponStats?.slamSpeed || CORE_PHYSICS.slamSpeed;
          this.yVel = speed;
          this.stats.slamsAttempted++;
  
          this.squashX = 0.75;
          this.squashY = 1.35;
  
          sound.playSlamStart();
          return true;
      }
  
      // Platform one-way collision check
      checkPlatformCollision(platforms, prevBottom) {
          this.onGround = false;
  
          for (let i = 0; i < platforms.length; i++) {
              const p = platforms[i];
  
              if (
                  this.x < p.x + p.w &&
                  this.x + this.w > p.x &&
                  prevBottom <= p.y + Math.max(2, Math.abs(this.yVel)) &&
                  this.y + this.h >= p.y &&
                  this.yVel >= 0
              ) {
                  this.y = p.y - this.h;
                  this.yVel = 0;
                  this.onGround = true;
  
                  // Reset double jump instantly
                  this.jumpsLeft = 2;
  
                  // Landing recharges dash with ZERO delay
                  this.dashReady = true;
                  this.dashCooldown = 0;
  
                  return true;
              }
          }
  
          return false;
      }
  
      // Per-frame class abilities and status effects (runs on whoever simulates the match)
      updateClassAndStatus() {
          if (this.sizeCooldown > 0) this.sizeCooldown--;
  
          // Shadow: 20s visible, then 8s invisible; when it ends, teleport back to spawn
          if (this.classId === "shadow") {
              const cls = CLASSES.shadow;
              const wasInvis = this.invis;
              this.shadowTimer++;
              this.invis = (this.shadowTimer % cls.invisCycle) >= cls.invisCycle - cls.invisTime;
              if (wasInvis && !this.invis && this.spawnX !== undefined) {
                  this.x = this.spawnX;
                  this.y = this.spawnY;
                  this.xVel = 0;
                  this.yVel = 0;
                  this.dashing = false;
                  this.slamming = false;
                  this.onGround = false;
              }
          } else {
              this.invis = false;
          }
  
          // Energy: boost grows while running on the ground, drains while standing still
          if (this.classId === "energy" && this.onGround && !this.dashing) {
              const cls = CLASSES.energy;
              if (Math.abs(this.xVel) > 1) {
                  this.stillFrames = 0;
                  if (++this.runFrames >= cls.runFrames) {
                      this.runFrames = 0;
                      this.energyBoost = Math.min(cls.boostMax, Math.round((this.energyBoost + cls.runGain) * 100) / 100);
                  }
              } else if (Math.abs(this.xVel) < 0.3) {
                  this.runFrames = 0;
                  if (++this.stillFrames >= cls.stillFrames) {
                      this.stillFrames = 0;
                      this.energyBoost = Math.max(0, Math.round((this.energyBoost - cls.stillLoss) * 100) / 100);
                  }
              }
          }
  
          // Status effects
          if (this.slowT > 0) this.slowT--;
          if (this.blindT > 0) this.blindT--;
          if (this.freezeT > 0) this.freezeT--;
          if (this.poisonT > 0) {
              this.poisonT--;
              if (this.poisonT % CLASSES.potion.poisonTick === 0) this.takeTickDamage(1);
          }
          if (this.fireT > 0) {
              const cls = CLASSES.pyro;
              this.fireT--;
              if (this.fireT % cls.fireTick === 0) {
                  this.takeTickDamage(cls.fireDamage);
                  this.freezeT = cls.fireFreeze;
                  this.dashing = false;
                  this.dashAttack = false;
              }
          }
      }
  
      // Poison / burn damage, credited to whoever applied it
      takeTickDamage(amount) {
          const dealt = Math.min(amount, Math.max(0, this.hp));
          this.hp -= amount;
          this.stats.damageTaken += dealt;
          if (this.dotSource) {
              this.dotSource.stats.damageDealt += dealt;
              this.lastHitBy = this.dotSource;
          }
      }
  
      // Core physics step
      updatePhysics(platforms, particleManager = null, arrowManager = null) {
          if (this.hp <= 0) return;
  
          // Update stat tracking (altitude)
          // Height of the fighter's feet above the floor
          const altitude = Math.max(0, ARENA_CONFIG.groundY - (this.y + this.h));
          if (altitude > this.stats.maxHeight) {
              this.stats.maxHeight = altitude;
          }
  
          if (this.swapCooldown > 0) this.swapCooldown--;
  
          this.updateClassAndStatus();
  
          // Arrow cooldown countdown
          if (this.arrowCooldown > 0) {
              this.arrowCooldown--;
          }
  
          // Squash & stretch recovery
          this.squashX += (1.0 - this.squashX) * 0.15;
          this.squashY += (1.0 - this.squashY) * 0.15;
  
          // Smooth ghost HP bar decay
          if (this.ghostHp > this.hp) {
              this.ghostHp -= Math.max(0.4, (this.ghostHp - this.hp) * 0.08);
              if (this.ghostHp < this.hp) this.ghostHp = this.hp;
          } else if (this.ghostHp < this.hp) {
              this.ghostHp = this.hp;
          }
  
          // Dash cooldown
          if (this.dashCooldown > 0) {
              this.dashCooldown--;
          }
  
          // On-ground dash recovery: guarantee that any grounded fighter regains dash readiness once cooldown expires
          if (this.dashCooldown <= 0 && this.onGround && !this.dashing) {
              this.dashReady = true;
          }
  
          // Buffered dash activation as soon as cooldown and stun clear
          if (this.dashBuffer > 0) {
              this.dashBuffer--;
              if (this.dashReady && !this.dashing && this.dashCooldown <= 0 && this.stun <= 0) {
                  this.dash(null, true, null, arrowManager);
                  this.dashBuffer = 0;
              }
          }
  
          // Dash execution & particle trail
          if (this.dashing) {
              this.yVel = 0;
              this.dashTimer--;
  
              if (particleManager) {
                  let trailColor = "rgba(200, 240, 255, 0.7)";
                  if (this.weaponId === "sword") trailColor = "rgba(0, 220, 255, 0.85)"; // diamond sparks
                  if (this.weaponId === "fists") trailColor = "rgba(255, 180, 50, 0.8)";  // brawl dust
  
                  particleManager.addDashTrail(
                      this.facing > 0 ? this.x : this.x + this.w,
                      this.y + this.h / 2,
                      this.facing,
                      trailColor
                  );
              }
  
              if (this.dashTimer <= 0) {
                  this.dashing = false;
                  this.dashAttack = false;
                  this.xVel = this.facing * 3;
              }
          }
  
          // Stun countdown
          if (this.stun > 0) {
              this.stun--;
              this.xVel *= 0.95;
          }
  
          // Gravity (suspended during dash)
          if (!this.dashing) {
              this.yVel += CORE_PHYSICS.gravity;
          }
  
          // Keep slam at designated speed
          if (this.slamming && !this.dashing) {
              const targetSlam = this.weaponStats?.slamSpeed || CORE_PHYSICS.slamSpeed;
              if (this.yVel < targetSlam) {
                  this.yVel = targetSlam;
              }
          }
  
          // Store bottom before position step
          const prevBottom = this.y + this.h;
          const wasGrounded = this.onGround;
  
          // Burn freeze: can't move. Slow: half speed (dashes and knockback are unaffected)
          if (this.freezeT > 0 && !this.dashing && this.stun <= 0) this.xVel = 0;
          const slowMult = this.slowT > 0 && !this.dashing && this.stun <= 0 ? 0.5 : 1;
  
          // Apply movement
          this.x += this.xVel * slowMult;
          this.y += this.yVel;
  
          // Coyote time countdown
          if (!this.onGround && this.coyoteTimer > 0) {
              this.coyoteTimer--;
          }
  
          // Platform collision
          const landed = this.checkPlatformCollision(platforms, prevBottom);
  
          // Landing squash, dust, and instant buffered jump execution
          if (landed && !wasGrounded) {
              this.squashX = 1.25;
              this.squashY = 0.75;
              if (particleManager) {
                  particleManager.addDust(this.x + this.w / 2, this.y + this.h, 6);
              }
              if (this.jumpBuffer > 0) {
                  this.jumpBuffer = 0;
                  this.jump();
              }
          } else if (this.jumpBuffer > 0) {
              this.jumpBuffer--;
          }
  
          // Stepped off ledge
          if (wasGrounded && !landed && this.yVel >= 0) {
              this.coyoteTimer = CORE_PHYSICS.coyoteTime;
          }
  
          // Ceiling: bump your head instead of flying off the top of the screen
          if (this.y < 0) {
              this.y = 0;
              if (this.yVel < 0) this.yVel = 0;
          }
  
          // Arena horizontal boundaries
          if (this.x < 0) {
              this.x = 0;
              this.xVel = 0;
          }
          if (this.x + this.w > ARENA_CONFIG.width) {
              this.x = ARENA_CONFIG.width - this.w;
              this.xVel = 0;
          }
  
          // Fell off bottom of screen
          if (this.y > ARENA_CONFIG.height + 50) {
              if (this.isPlayer && this.isBotGame) {
                  this.x = 400;
                  this.y = 200;
                  this.yVel = 0;
                  this.xVel = 0;
                  this.hp = this.maxHp;
              } else {
                  this.hp = 0;
              }
          }
  
          // Invulnerability hit cooldown
          if (this.hitCooldown > 0) {
              this.hitCooldown--;
          }
  
          return landed;
      }
  }
  

  // ===== ai.js =====
  // ==========================================
  // SPEAR-MACE PVP - Bot AI Controller
  // Exact behavioral logic and formulas from original ProcessingJS code
  // ==========================================
  
  
  class BotAI {
      constructor(botFighter) {
          this.bot = botFighter;
          this.params = {};
  
          // Timers & AI state flags
          this.jumpTimer = 0;
          this.dashTimerAI = 0;
          this.slamTimer = 0;
          this.escapeDash = false;
          this.dodging = false;
          this.dodgeRolled = false;
          this.runAway = false;
          this.runAwayTimer = 0;
  
          // God mode specials
          this.invisClock = 0;
          this.invisTimer = 0;
          this.sinceHit = 0;
      }
  
      setParams(params) {
          this.params = { ...params };
      }
  
      reset() {
          this.jumpTimer = 0;
          this.dashTimerAI = 0;
          this.slamTimer = 0;
          this.escapeDash = false;
          this.dodging = false;
          this.dodgeRolled = false;
          this.runAway = false;
          this.runAwayTimer = 0;
          this.invisClock = 0;
          this.invisTimer = 0;
          this.sinceHit = 0;
      }
  
      // Helper: Bot dash initiating
      startDash(attack, distanceToTarget) {
          const bot = this.bot;
          if (!bot.dashReady || bot.dashing || bot.dashCooldown > 0) {
              return false;
          }
  
          if (attack) {
              bot.facing = distanceToTarget > 0 ? 1 : -1;
          } else {
              bot.facing = distanceToTarget > 0 ? -1 : 1;
          }
  
          const success = bot.dash(this.params.dashSpeed, attack, this.params.botDashCooldown);
          if (success) {
              this.dashTimerAI = this.params.dashAIDelay;
          }
          return success;
      }
  
      // Called when bot is hit by player
      onHit() {
          this.sinceHit = 0;
  
          if (Math.random() * 100 < this.params.escapeDashChance) {
              this.escapeDash = true;
          } else if (Math.random() * 100 < this.params.runAwayChance) {
              this.runAway = true;
              this.runAwayTimer = CORE_PHYSICS.runAwayTime;
          }
      }
  
      update(targetPlayer) {
          const bot = this.bot;
          const P = this.params;
  
          if (bot.hp <= 0) return;
  
          // Timers
          this.jumpTimer--;
          this.dashTimerAI--;
          this.slamTimer--;
  
          // God bot: dash recharges instantly even in the air
          if (P.airDashRecharge > 0 && !bot.dashing) {
              bot.dashReady = true;
          }
  
          const playerCenter = targetPlayer.x + targetPlayer.w / 2;
          const botCenter = bot.x + bot.w / 2;
          const distance = playerCenter - botCenter;
  
          // Predicted distance with lead time
          const predictedDistance = distance + targetPlayer.xVel * P.slamLead;
  
          if (bot.stun <= 0) {
  
              // Face player (when not mid-dash)
              if (!bot.dashing) {
                  bot.facing = distance > 0 ? 1 : -1;
              }
  
              // ---------- Dodge incoming slam ----------
              const slamThreat = targetPlayer.slamming &&
                                 targetPlayer.y < bot.y &&
                                 Math.abs(distance) < P.dodgeRange;
  
              if (!targetPlayer.slamming) {
                  this.dodgeRolled = false;
              }
  
              if (slamThreat && !this.dodgeRolled) {
                  this.dodgeRolled = true;
                  if (Math.random() * 100 < P.dodgeChance) {
                      this.dodging = true;
                  }
              }
  
              if (!slamThreat) {
                  this.dodging = false;
              }
  
              if (this.dodging) {
                  this.startDash(false, distance);
              }
  
              // ---------- Dodge incoming dash (pro / god) ----------
              if (
                  P.dashDodgeChance > 0 &&
                  targetPlayer.dashing &&
                  !bot.dashing &&
                  Math.abs(distance) < 160 &&
                  Math.abs(targetPlayer.y - bot.y) < 40 &&
                  ((distance > 0 && targetPlayer.facing === 1) ||
                   (distance < 0 && targetPlayer.facing === -1))
              ) {
                  if (Math.random() * 100 < P.dashDodgeChance) {
                      this.startDash(false, distance);
                  }
              }
  
              // ---------- Escape dash after being hit ----------
              if (this.escapeDash) {
                  this.escapeDash = false;
                  this.startDash(false, distance);
              }
  
              // ---------- Run away timer countdown ----------
              if (this.runAway) {
                  this.runAwayTimer--;
                  if (this.runAwayTimer <= 0) {
                      this.runAway = false;
                  }
              }
  
              // ---------- Movement towards or away from player ----------
              if ((this.dodging || this.runAway) && !bot.dashing) {
                  bot.xVel = distance > 0 ? -P.runSpeed : P.runSpeed;
              } else if (!bot.dashing) {
                  if (Math.abs(distance) > 40) {
                      bot.xVel = distance > 0 ? P.speed : -P.speed;
                  } else if (Math.abs(distance) > 28) {
                      bot.xVel = distance > 0 ? P.speed * 0.7 : -P.speed * 0.7;
                  } else {
                      // Close quarters (< 28px):
                      // In point-blank range, do not push continuously into player's pushbox.
                      // If dash is ready, strike immediately!
                      if (bot.dashReady && bot.dashCooldown <= 0 && this.dashTimerAI <= 0) {
                          this.startDash(true, distance);
                      } else {
                          // Dash is on cooldown: back away to maintain tactical spacing or leap to initiate aerial attack
                          bot.xVel = distance >= 0 ? -P.speed : P.speed;
                          if (this.jumpTimer <= 0 && bot.onGround && Math.random() < 0.35) {
                              bot.jump();
                              this.jumpTimer = 30 + Math.random() * 25;
                          }
                      }
                  }
              }
  
              // ---------- Jump ----------
              if (
                  this.jumpTimer <= 0 &&
                  bot.onGround &&
                  !bot.dashing
              ) {
                  if (
                      targetPlayer.y < bot.y - 20 ||
                      Math.random() * 100 < P.jumpChance
                  ) {
                      bot.jump();
                      this.jumpTimer = 45 + Math.random() * 40;
                  }
              }
  
              // ---------- Double jump ----------
              if (
                  !bot.onGround &&
                  !bot.dashing &&
                  !bot.slamming &&
                  bot.jumpsLeft > 0 &&
                  bot.yVel > -2 &&
                  (Math.abs(distance) < 150 || P.climbHeight > 0) &&
                  Math.random() * 100 < P.doubleJumpChance
              ) {
                  bot.jump(); // will consume extra jump
              }
  
              // ---------- Punish a stunned player ----------
              if (
                  P.punishChance > 0 &&
                  targetPlayer.stun > 0 &&
                  !bot.dashing &&
                  !this.runAway &&
                  bot.dashReady &&
                  Math.abs(distance) < 300 &&
                  Math.abs(targetPlayer.y - bot.y) < 80
              ) {
                  if (Math.random() * 100 < P.punishChance) {
                      this.startDash(true, distance);
                  }
              }
  
              // ---------- Dash attack ----------
              if (
                  !bot.dashing &&
                  !this.runAway &&
                  bot.dashReady &&
                  bot.dashCooldown <= 0 &&
                  this.dashTimerAI <= 0 &&
                  Math.abs(distance) < P.dashAttackRange &&
                  Math.abs(targetPlayer.y - bot.y) < P.dashAttackHeight
              ) {
                  const strikeChance = Math.abs(distance) < 65 ? Math.max(80, P.dashAttackChance) : P.dashAttackChance;
                  if (Math.random() * 100 < strikeChance) {
                      this.startDash(true, distance);
                  }
              }
  
              // ---------- Random gap-closing dash ----------
              if (
                  !bot.dashing &&
                  !this.runAway &&
                  !bot.slamming &&
                  bot.dashReady &&
                  this.dashTimerAI <= 0 &&
                  Math.abs(distance) > 60
              ) {
                  if (Math.random() * 100 < P.randomDashChance) {
                      this.startDash(true, distance);
                  }
              }
  
              // ---------- Slam ----------
              if (
                  !bot.onGround &&
                  !bot.slamming &&
                  !bot.dashing &&
                  !this.runAway &&
                  this.slamTimer <= 0
              ) {
                  if (
                      bot.y < targetPlayer.y - 20 &&
                      Math.abs(predictedDistance) < P.slamRange
                  ) {
                      if (Math.random() * 100 < P.slamChance) {
                          bot.slam();
                          this.slamTimer = P.slamCooldown;
                      }
                  }
              }
  
              // ---------- Dash movement handling ----------
              if (bot.dashing) {
                  bot.yVel = 0;
                  bot.xVel = bot.facing * P.dashSpeed;
              }
          }
  
          // God mode extras (Invisibility & Regen)
          this.updateExtras();
      }
  
      updateExtras() {
          const bot = this.bot;
          const P = this.params;
  
          if (bot.hp <= 0) return;
  
          // Invisibility cycle
          if (P.invisible > 0) {
              if (this.invisTimer > 0) {
                  this.invisTimer--;
              } else {
                  this.invisClock++;
                  if (this.invisClock === P.invisEvery - 45) {
                      sound.playInvisWarning();
                  }
                  if (this.invisClock >= P.invisEvery) {
                      this.invisClock = 0;
                      this.invisTimer = P.invisLength;
                  }
              }
          } else {
              this.invisTimer = 0;
          }
  
          // Health regen after not being hit for 3 seconds (180 frames)
          this.sinceHit++;
          if (P.regen > 0 && this.sinceHit > 180 && bot.hp < bot.maxHp) {
              bot.hp = Math.min(bot.maxHp, bot.hp + P.regen);
          }
      }
  }
  

  // ===== combat.js =====
  // ==========================================
  // SPEAR-MACE PVP - Combat & Collision Engine
  // Resolves air slams, ground slam shockwaves, dash strikes,
  // arrows, and weapon-specific damage & knockback
  // ==========================================
  
  
  class CombatEngine {
      constructor(particleManager) {
          this.particles = particleManager;
          this.bolts = []; // Lightning class bolts being drawn: { x, y, life }
      }
  
      // Lightning class: mace slams add 18-22 extra stun frames, and 5% of slams call down a bolt (+20 damage)
      lightningStun(attacker, defender) {
          if (attacker.classId !== "lightning") return 0;
          const cls = CLASSES.lightning;
          const extra = cls.stunBonusMin + Math.floor(Math.random() * (cls.stunBonusMax - cls.stunBonusMin + 1));
          this.particles.addFloatingText(defender.x + defender.w / 2, defender.y - 14, `+${extra} stun`, "#ffe14a", false, 1.0);
          if (Math.random() < cls.boltChance && defender.hp > 0) {
              const dealt = Math.min(cls.boltDamage, Math.max(0, defender.hp));
              defender.hp -= cls.boltDamage;
              defender.stats.damageTaken += dealt;
              attacker.stats.damageDealt += dealt;
              defender.lastHitBy = attacker;
              this.bolts.push({ x: defender.x + defender.w / 2, y: defender.y + defender.h, life: 24 });
              this.particles.addFloatingText(defender.x + defender.w / 2, defender.y - 30, `LIGHTNING! +${cls.boltDamage}`, "#ffff6e", true, 1.2);
              this.particles.triggerShake(8, 10);
          }
          return extra;
      }
  
      // Potionmaster / Pyro: chance-based status effects on every hit (mace, dash or arrow)
      applyHitEffects(attacker, defender) {
          if (!attacker || defender.hp <= 0) return;
          const popup = (text, color, i) => this.particles.addFloatingText(defender.x + defender.w / 2, defender.y - 14 - i * 14, text, color, false, 1.0);
          let n = 0;
          if (attacker.classId === "potion") {
              const cls = CLASSES.potion;
              if (Math.random() < cls.slowChance) { defender.slowT = cls.slowTime; popup("SLOWED", "#5aa0ff", n++); }
              if (Math.random() < cls.poisonChance) { defender.poisonT = cls.poisonTime; defender.dotSource = attacker; popup("POISONED", "#50dc50", n++); }
              if (Math.random() < cls.blindChance) { defender.blindT = cls.blindTime; popup("BLINDED", "#d2d2d2", n++); }
          } else if (attacker.classId === "pyro") {
              const cls = CLASSES.pyro;
              if (Math.random() < cls.fireChance) { defender.fireT = cls.fireTime; defender.dotSource = attacker; popup("ON FIRE!", "#ff6e14", n++); }
          }
      }
  
      // The part of a fighter that can land hits. A big Buddha's body is huge (easy to hit),
      // but its attacks only reach a little farther than normal.
      attackBox(f) {
          if (f.classId === "buddha" && f.big) {
              const size = 25 * CLASSES.buddha.attackReachScale;
              return { x: f.x + (f.w - size) / 2, y: f.y + f.h - size, w: size, h: size };
          }
          return f;
      }
  
      // Applies damage and returns how much HP was actually removed (no overkill in stats)
      applyDamage(attacker, defender, amount) {
          const dealt = Math.min(amount, Math.max(0, defender.hp));
          defender.hp -= amount;
          defender.stats.damageTaken += dealt;
          defender.lastHitBy = attacker;
          this.applyHitEffects(attacker, defender);
          return dealt;
      }
  
      // Resolves direct mid-air mace slam
      checkAirSlam(attacker, defender, damageMultiplier, stunMultiplier, onDefenderHit = null) {
          if (!attacker.slamming || attacker.dashing) return false;
          if (defender.hp <= 0 || defender.hitCooldown > 0) return false;
          // Friendly fire protection
          if (attacker.team && defender.team && attacker.team === defender.team) return false;
  
          const wStats = attacker.weaponStats || {};
          const ab = this.attackBox(attacker);
          const slamScale = wStats.slamPower || CORE_PHYSICS.slamHeightScale;
          const slamMaxDmg = wStats.slamMaxDmg || CORE_PHYSICS.slamMaxDamage;
          const hitLaunch = wStats.hitLaunch || CORE_PHYSICS.hitLaunch;
  
          // Bounding box collision
          if (
              ab.x < defender.x + defender.w &&
              ab.x + ab.w > defender.x &&
              ab.y < defender.y + defender.h &&
              ab.y + ab.h > defender.y
          ) {
              const heightDifference = defender.y - ab.y;
              let slamDamage = CORE_PHYSICS.slamMinDamage + heightDifference * slamScale;
              slamDamage = Math.max(CORE_PHYSICS.slamMinDamage, Math.min(slamMaxDmg, slamDamage));
  
              // Breach armor upgrade check
              let effDmgMult = damageMultiplier;
              if (wStats.breachArmor) {
                  effDmgMult = Math.max(effDmgMult, 1.0 - (1.0 - effDmgMult) * (1.0 - wStats.breachArmor));
              }
  
              const finalDamage = slamDamage * effDmgMult;
              const dealt = this.applyDamage(attacker, defender, finalDamage);
              defender.hitCooldown = 25;
              defender.stun = Math.round(CORE_PHYSICS.hitStun * stunMultiplier) + this.lightningStun(attacker, defender);
  
              // Cancel defender actions & apply knockback
              defender.slamming = false;
              defender.dashing = false;
              defender.dashAttack = false;
  
              defender.xVel = (attacker.x < defender.x) ? 7 : -7;
              defender.yVel = -7;
  
              // Attacker bounces up into the air
              attacker.slamming = false;
              attacker.yVel = hitLaunch;
              attacker.dashReady = true;
  
              attacker.squashX = 0.8;
              attacker.squashY = 1.3;
              defender.squashX = 1.3;
              defender.squashY = 0.7;
  
              // Stats
              attacker.stats.damageDealt += dealt;
              attacker.stats.slamsLanded++;
              if (finalDamage > attacker.stats.maxSlamDamage) {
                  attacker.stats.maxSlamDamage = finalDamage;
              }
  
              if (onDefenderHit) onDefenderHit(finalDamage, attacker, defender);
  
              const hitX = (attacker.x + defender.x) / 2 + 12;
              const hitY = (attacker.y + defender.y) / 2 + 12;
  
              sound.playSlamHit(slamDamage / slamMaxDmg);
              this.particles.addHitSparks(hitX, hitY, 16, "#ff9900");
              this.particles.addShockwave(hitX, hitY, 50, "rgba(255, 140, 0, 0.9)", 4);
              this.particles.addDamageText(defender.x + defender.w / 2, defender.y, finalDamage, true);
              this.particles.triggerShake(Math.min(18, 6 + finalDamage * 0.1), 14);
  
              return true;
          }
  
          return false;
      }
  
      // Resolves ground impact shockwave when slam lands
      checkGroundSlam(attacker, defender, damageMultiplier, stunMultiplier, onDefenderHit = null) {
          // Friendly fire protection
          if (attacker.team && defender.team && attacker.team === defender.team) return false;
  
          const attackerCenter = attacker.x + attacker.w / 2;
          const defenderCenter = defender.x + defender.w / 2;
          const distance = Math.abs(attackerCenter - defenderCenter);
  
          this.particles.addShockwave(attackerCenter, attacker.y + attacker.h, 60, "rgba(255, 180, 0, 0.85)", 3);
          this.particles.addDust(attackerCenter, attacker.y + attacker.h, 12);
          sound.playGroundSlam();
  
          // Attacker lands firmly on the ground with ZERO delay, instant dash/jump readiness
          attacker.yVel = 0;
          attacker.onGround = true;
          attacker.dashReady = true;
          attacker.dashCooldown = 0;
          attacker.slamming = false;
          attacker.stun = 0;
          attacker.jumpsLeft = 2;
  
          if (
              distance <= CORE_PHYSICS.slamRadius &&
              Math.abs((attacker.y + attacker.h) - (defender.y + defender.h)) < 40 && // compare feet (sizes differ)
              defender.hp > 0 &&
              defender.hitCooldown <= 0
          ) {
              const finalDamage = CORE_PHYSICS.slamGroundDamage * damageMultiplier;
              const dealt = this.applyDamage(attacker, defender, finalDamage);
              defender.hitCooldown = 20;
              defender.stun = Math.round(CORE_PHYSICS.hitStun * stunMultiplier) + this.lightningStun(attacker, defender);
  
              defender.slamming = false;
              defender.dashing = false;
              defender.dashAttack = false;
  
              attacker.stats.damageDealt += dealt;
              // One slam that hits several enemies still counts as one landed slam
              if (!attacker.groundSlamCounted) {
                  attacker.stats.slamsLanded++;
                  attacker.groundSlamCounted = true;
              }
  
              if (onDefenderHit) onDefenderHit(finalDamage, attacker, defender);
  
              sound.playSlamHit(0.4);
              this.particles.addHitSparks(defenderCenter, defender.y + defender.h / 2, 12, "#ffaa00");
              this.particles.addDamageText(defender.x + defender.w / 2, defender.y, finalDamage, true);
              this.particles.triggerShake(6, 8);
  
              return true;
          }
  
          return false;
      }
  
      // Resolves dashing collision (Sword slash, Fist punch, Spear thrust, Mace charge)
      checkDashHit(attacker, defender, damageMultiplier, stunMultiplier, onDefenderHit = null) {
          if (!attacker.dashing || !attacker.dashAttack) return false;
          if (defender.hp <= 0 || defender.hitCooldown > 0) return false;
          if (attacker.team && defender.team && attacker.team === defender.team) return false;
  
          const ab = this.attackBox(attacker);
          const wStats = attacker.weaponStats || {};
          let baseDmg = wStats.dashDamage || CORE_PHYSICS.dashDamage;
          if (attacker.classId === "energy") baseDmg *= CLASSES.energy.dashDamageMult;
          const knockMult = wStats.knockbackMult || 1.0;
          const stunBonus = wStats.stunBonus || 0;
          const rangeExtra = (wStats.range && wStats.range > 25) ? (wStats.range - 25) : 0;
  
          if (
              ab.x - rangeExtra < defender.x + defender.w &&
              ab.x + ab.w + rangeExtra > defender.x &&
              ab.y < defender.y + defender.h &&
              ab.y + ab.h > defender.y
          ) {
              const finalDamage = baseDmg * damageMultiplier;
              const dealt = this.applyDamage(attacker, defender, finalDamage);
              defender.hitCooldown = 22;
              defender.stun = Math.round((CORE_PHYSICS.hitStun + stunBonus) * stunMultiplier);
  
              defender.slamming = false;
              defender.dashing = false;
              defender.dashAttack = false;
  
              defender.xVel = attacker.facing * 7 * knockMult;
              defender.yVel = -7;
  
              attacker.dashing = false;
              attacker.dashAttack = false;
              attacker.dashTimer = 0;
              attacker.xVel = attacker.facing * 3;
              if (attacker.onGround && attacker.dashCooldown <= 0) {
                  attacker.dashReady = true;
              }
  
              attacker.stats.damageDealt += dealt;
              attacker.stats.dashesLanded++;
  
              if (onDefenderHit) onDefenderHit(finalDamage, attacker, defender);
  
              const hitX = (attacker.x + defender.x) / 2 + 12;
              const hitY = (attacker.y + defender.y) / 2 + 12;
  
              // Weapon specific FX
              sound.playDashHit();
  
              let sparkColor = "#00e1ff";
              if (attacker.weaponId === "sword") sparkColor = "#55efc4"; // diamond cyan
              if (attacker.weaponId === "fists") sparkColor = "#e67e22"; // brawl orange
              if (attacker.weaponId === "mace") sparkColor = "#f39c12";  // mace gold
  
              this.particles.addHitSparks(hitX, hitY, 14, sparkColor);
              this.particles.addShockwave(hitX, hitY, 35, sparkColor, 2);
              this.particles.addDamageText(defender.x + defender.w / 2, defender.y, finalDamage, false);
              this.particles.triggerShake(5, 8);
  
              return true;
          }
  
          return false;
      }
  }
  

  // ===== renderer.js =====
  // ==========================================
  // SPEAR-MACE PVP - Canvas Renderer
  // Supports Minecraft weapons (Mace, Spear, Sword, Fists, Bow),
  // Block Face skins (Steve, Alex, Roblox Noob, Roblox Man Face, etc.),
  // and multi-fighter 1v1, 2v2, 5v5 team arena matches
  // ==========================================
  
  
  class Renderer {
      constructor(canvas) {
          this.canvas = canvas;
          this.ctx = canvas.getContext('2d');
          this.width = ARENA_CONFIG.width;
          this.height = ARENA_CONFIG.height;
          this.dpr = window.devicePixelRatio || 1;
  
          this.graphicStyle = "enhanced"; // "enhanced" or "classic"
          this.frameCount = 0;
  
          // Clouds for background ambiance
          this.clouds = [
              { x: 50,  y: 60,  w: 90,  speed: 0.25 },
              { x: 320, y: 110, w: 120, speed: 0.18 },
              { x: 620, y: 70,  w: 80,  speed: 0.3 }
          ];
  
          this.setupDPI();
      }
  
      setupDPI() {
          this.dpr = window.devicePixelRatio || 1;
          this.canvas.width = this.width * this.dpr;
          this.canvas.height = this.height * this.dpr;
          this.canvas.style.width = "100%";
          this.canvas.style.height = "auto";
          this.ctx.scale(this.dpr, this.dpr);
      }
  
      setBiome(biome) {
          this.biome = biome || "space";
      }
  
      drawBackground() {
          const ctx = this.ctx;
          this.frameCount++;
          const biome = this.biome || "space";
  
          if (biome === "space") {
              if (!this.spaceLayer) this.spaceLayer = this.buildSpaceLayer();
              ctx.drawImage(this.spaceLayer, 0, 0, this.width, this.height);
  
              // Twinkling stars
              for (let i = 0; i < 36; i++) {
                  if ((Math.floor(this.frameCount / 18) + i * 7) % 6 === 0) continue;
                  ctx.fillStyle = i % 5 === 0 ? "#ffffff" : (i % 2 ? "#9fb4ff" : "#cfe0ff");
                  const sz = i % 7 === 0 ? 3 : 2;
                  ctx.fillRect((i * 131 + 37) % this.width, (i * 71 + 13) % 330, sz, sz);
              }
              // Occasional shooting star
              const t = this.frameCount % 600;
              if (t < 40) {
                  const sx = 120 + t * 9;
                  const sy = 40 + t * 3;
                  for (let k = 0; k < 6; k++) {
                      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 - k * 0.15})`;
                      ctx.fillRect(Math.round(sx - k * 9), Math.round(sy - k * 3), 4, 2);
                  }
              }
          } else if (biome === "nether") {
              if (!this.netherLayer) this.netherLayer = this.buildNetherLayer();
              ctx.drawImage(this.netherLayer, 0, 0, this.width, this.height);
  
              // Lava surface shimmer (moving bright pixels)
              ctx.fillStyle = "#ffb43a";
              for (let i = 0; i < 24; i++) {
                  const lx = (i * 37 + this.frameCount * (0.3 + (i % 3) * 0.15)) % this.width;
                  ctx.fillRect(Math.round(lx), 352 + (i % 4) * 8, 6, 2);
              }
              // Rising embers
              for (let i = 0; i < 18; i++) {
                  const ax = (i * 47 + Math.sin(this.frameCount * 0.02 + i) * 20 + this.width) % this.width;
                  const ay = 380 - ((this.frameCount * (0.35 + (i % 4) * 0.1) + i * 53) % 380);
                  ctx.fillStyle = i % 3 ? "#ff7b25" : "#ffd36b";
                  ctx.fillRect(Math.round(ax), Math.round(ay), 2, 2);
              }
          } else if (biome === "end") {
              if (!this.endLayer) this.endLayer = this.buildEndLayer();
              ctx.drawImage(this.endLayer, 0, 0, this.width, this.height);
  
              // Twinkling stars
              for (let i = 0; i < 40; i++) {
                  if ((Math.floor(this.frameCount / 20) + i) % 5 === 0) continue;
                  ctx.fillStyle = i % 4 ? "#d8c8ff" : "#ffffff";
                  ctx.fillRect((i * 97) % this.width, (i * 53) % 200, 2, 2);
              }
              // End crystals pulsing on the obsidian pillars
              const pulse = Math.sin(this.frameCount * 0.08) > 0;
              for (const [cx, cy] of [[112, 128], [345, 78], [628, 148]]) {
                  ctx.fillStyle = pulse ? "#ff8cff" : "#c04ad8";
                  ctx.fillRect(cx - 7, cy - 7, 14, 14);
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(cx - 2, cy - 2, 4, 4);
              }
                  } else {
              // Overworld: static layers are painted once and cached
              if (!this.overworldLayer) this.overworldLayer = this.buildOverworldLayer();
              ctx.drawImage(this.overworldLayer, 0, 0, this.width, this.height);
  
              // Drifting blocky clouds (two-tone, pixel-snapped)
              for (const cloud of this.clouds) {
                  cloud.x += cloud.speed;
                  if (cloud.x > this.width + 100) cloud.x = -150;
  
                  const cx = Math.round(cloud.x / 8) * 8;
                  const cy = Math.round(cloud.y / 8) * 8;
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(cx, cy, cloud.w, 16);
                  ctx.fillRect(cx + 16, cy - 8, Math.round(cloud.w * 0.6 / 8) * 8, 8);
                  ctx.fillStyle = "#dfe9ff";
                  ctx.fillRect(cx, cy + 16, cloud.w, 6);
              }
          }
      }
  
      // Draws an isometric pixel cube from 8x8 face maps (top vertex at cx, ty; half = half-width)
      drawIsoCube(g, cx, ty, half, faces, palette, shades) {
          const k = 0.577 * half;
          const mats = {
              top: [half, -k, half, k, cx - half, ty + k],
              left: [half, k, 0, 2 * k, cx - half, ty + k],
              right: [half, -k, 0, 2 * k, cx, ty + 2 * k]
          };
          const shade = (hex, f) => {
              const n = parseInt(hex.slice(1), 16);
              const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
              return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
          };
          for (const side of ["left", "right", "top"]) {
              const grid = faces[side];
              g.save();
              g.transform(...mats[side]);
              for (let r = 0; r < 8; r++) {
                  for (let c = 0; c < 8; c++) {
                      g.fillStyle = shade(palette[grid[r][c]], shades[side]);
                      g.fillRect(c / 8, r / 8, 1 / 8 + 0.004, 1 / 8 + 0.004);
                  }
              }
              g.restore();
          }
          // bright front edges
          g.strokeStyle = "rgba(232, 254, 255, 0.85)";
          g.lineWidth = Math.max(1.5, half / 26);
          g.beginPath();
          g.moveTo(cx - half, ty + k);
          g.lineTo(cx, ty + 2 * k);
          g.lineTo(cx + half, ty + k);
          g.stroke();
      }
  
      // Space backdrop matching the logo: starfield, cube globe planet with atmosphere, cube moon
      buildSpaceLayer() {
          const c = document.createElement("canvas");
          c.width = this.width;
          c.height = this.height;
          const g = c.getContext("2d");
          const W = this.width;
  
          const bands = ["#060a1f", "#08102a", "#0b1535", "#0e1a42", "#121f4f", "#16255c"];
          const bandH = Math.ceil(this.height / bands.length);
          bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bandH, W, bandH + 1); });
  
          // Pixel nebula clouds
          const neb = [[40, 60, 120, 18, "#1d2a6a"], [70, 78, 80, 12, "#24327a"], [430, 300, 160, 16, "#1a2660"],
              [470, 316, 90, 10, "#22307a"], [250, 40, 90, 10, "#1a2660"]];
          for (const [x, y, w, h, col] of neb) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  
          // Static stars
          for (let i = 0; i < 70; i++) {
              g.fillStyle = i % 3 === 0 ? "#6f86d6" : (i % 3 === 1 ? "#9fb4ff" : "#ffffff");
              g.fillRect((i * 97 + 11) % W, (i * 53 + 29) % 360, 1 + (i % 4 === 0 ? 1 : 0), 1 + (i % 4 === 0 ? 1 : 0));
          }
  
          // Atmosphere glow behind the planet
          const pcx = 610, pty = 74, half = 62;
          const glow = g.createRadialGradient(pcx, pty + 72, 10, pcx, pty + 72, 150);
          glow.addColorStop(0, "rgba(95, 208, 255, 0.45)");
          glow.addColorStop(0.5, "rgba(58, 157, 255, 0.15)");
          glow.addColorStop(1, "rgba(58, 157, 255, 0)");
          g.fillStyle = glow;
          g.fillRect(pcx - 160, pty - 80, 320, 320);
  
          // Cube globe planet (same maps as the logo)
          const palette = { w: "#2f7de1", W: "#1f5fc0", l: "#5bbf3a", f: "#3a8f2a", s: "#e8d27a", m: "#9696a0", i: "#ecf4ff", c: "#ffffff" };
          const faces = {
              top: ["Wwwllwww", "wcclllfw", "wcllffll", "wwlllsww", "wwwswcWw", "Wwwwwclw", "lwcwlffl", "llwwwllw"],
              left: ["wwlllwwW", "wllfflcc", "wwllswww", "Wwwwwwll", "lcwwwlfl", "llwWwwll", "slwwwwww", "iiiiwiii"],
              right: ["wwwwllww", "Wwwlffll", "llwccllw", "flwwwwwW", "llwwwmlw", "scwwlllw", "wwWwwlww", "iiwiiiii"]
          };
          this.drawIsoCube(g, pcx, pty, half, faces, palette, { top: 1.12, left: 0.88, right: 0.62 });
  
          // Cube moon
          const moonFaces = {
              top: Array(8).fill("gggggggg").map((r, i) => (i === 2 ? "ggdggggg" : i === 5 ? "gggggdgg" : r)),
              left: Array(8).fill("gggggggg").map((r, i) => (i === 3 ? "gdgggggg" : r)),
              right: Array(8).fill("gggggggg").map((r, i) => (i === 4 ? "ggggdggg" : r))
          };
          this.drawIsoCube(g, 712, 52, 16, moonFaces, { g: "#e3e0d5", d: "#b8b4a8" }, { top: 1.05, left: 0.82, right: 0.62 });
  
          // Faint distant planet-cube on the left
          g.globalAlpha = 0.55;
          const redFaces = { top: Array(8).fill("rrrRrrrr"), left: Array(8).fill("rRrrrrRr"), right: Array(8).fill("rrrrRrrr") };
          this.drawIsoCube(g, 92, 120, 20, redFaces, { r: "#c2553a", R: "#9a3f2a" }, { top: 1.1, left: 0.85, right: 0.6 });
          g.globalAlpha = 1;
          return c;
      }
  
      // Moon-rock floor: pale grey blocks with craters
      drawMoonFloor(ctx, p) {
          const B = 16;
          for (let bx = p.x; bx < p.x + p.w; bx += B) {
              const n = (bx / B) | 0;
              ctx.fillStyle = n % 2 ? "#c9c6bb" : "#c2bfb3";
              ctx.fillRect(bx, p.y, B, p.h);
              ctx.fillStyle = "#a9a598";
              ctx.fillRect(bx + ((n * 5) % 10) + 2, p.y + 12, 5, 4);
              ctx.fillRect(bx + ((n * 7 + 3) % 11), p.y + 30, 4, 3);
              ctx.fillStyle = "#918d80";
              ctx.fillRect(bx + ((n * 5) % 10) + 3, p.y + 13, 3, 2);
              ctx.fillStyle = "#dedbd0";
              ctx.fillRect(bx + ((n * 3 + 9) % 13), p.y + 22, 2, 2);
              ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
              ctx.fillRect(bx, p.y, 1, p.h);
          }
          // Lighter dusty top edge
          ctx.fillStyle = "#e6e3d8";
          ctx.fillRect(p.x, p.y, p.w, 3);
          ctx.fillStyle = "#b3afa2";
          ctx.fillRect(p.x, p.y + 3, p.w, 1);
      }
  
      // Glowing crystal ledge (sea-lantern style)
      drawCrystalLedge(ctx, p) {
          ctx.fillStyle = "rgba(95, 208, 255, 0.18)";
          ctx.fillRect(p.x - 4, p.y - 3, p.w + 8, p.h + 10);
          ctx.fillStyle = "#3e9fd6";
          ctx.fillRect(p.x, p.y, p.w, p.h);
          for (let bx = p.x; bx < p.x + p.w; bx += 12) {
              ctx.fillStyle = ((bx - p.x) / 12) % 2 ? "#5fc4ee" : "#4cb3e4";
              ctx.fillRect(bx + 1, p.y + 2, 10, p.h - 4);
              ctx.fillStyle = "#c8f4ff";
              ctx.fillRect(bx + 3, p.y + 4, 2, 2);
          }
          ctx.fillStyle = "#e8fbff";
          ctx.fillRect(p.x, p.y, p.w, 2);
          ctx.fillStyle = "#245e8c";
          ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
      }
  
      // Nether backdrop: crimson cave ceiling, glowstone, netherrack cliffs, lava sea
      buildNetherLayer() {
          const c = document.createElement("canvas");
          c.width = this.width;
          c.height = this.height;
          const g = c.getContext("2d");
          const W = this.width;
          const ground = ARENA_CONFIG.groundY;
  
          const bands = ["#2a0606", "#350909", "#410c0b", "#4f110e", "#5f1711", "#712015"];
          const bandH = Math.ceil(ground / bands.length);
          bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bandH, W, bandH + 1); });
  
          // Jagged cave ceiling with hanging netherrack
          g.fillStyle = "#3b0b0b";
          for (let x = 0; x < W; x += 8) {
              const h = 24 + Math.round((Math.sin(x * 0.02) * 14 + Math.sin(x * 0.07 + 2) * 8) / 8) * 8;
              g.fillRect(x, 0, 8, h);
          }
          // Glowstone clusters on the ceiling
          for (const [gx, gy] of [[90, 30], [300, 22], [520, 34], [700, 26]]) {
              g.fillStyle = "#c79a3c"; g.fillRect(gx, gy, 24, 16);
              g.fillStyle = "#ffe08a"; g.fillRect(gx + 4, gy + 4, 8, 6); g.fillRect(gx + 14, gy + 8, 6, 5);
          }
          // Far cliffs
          g.fillStyle = "#5a1414";
          for (let x = 0; x < W; x += 8) {
              const h = 210 + Math.round((Math.sin(x * 0.013 + 1) * 30 + Math.sin(x * 0.041) * 12) / 8) * 8;
              g.fillRect(x, h, 8, ground - h);
          }
          // Near cliffs with crimson nylium tops
          g.fillStyle = "#7a1e1e";
          for (let x = 0; x < W; x += 8) {
              const h = 270 + Math.round((Math.sin(x * 0.019 + 3) * 22 + Math.sin(x * 0.05) * 8) / 8) * 8;
              g.fillRect(x, h, 8, ground - h);
              g.fillStyle = "#b02a3e"; g.fillRect(x, h, 8, 3); g.fillStyle = "#7a1e1e";
          }
          // Lava sea in front of the cliffs
          g.fillStyle = "#e05a12";
          g.fillRect(0, 346, W, ground - 346);
          g.fillStyle = "#f58a1f";
          g.fillRect(0, 346, W, 4);
          // Lavafalls pouring from the cliffs
          for (const lx of [160, 430, 690]) {
              g.fillStyle = "#e86a14"; g.fillRect(lx, 230, 10, 120);
              g.fillStyle = "#ffb43a"; g.fillRect(lx + 3, 230, 3, 120);
          }
          return c;
      }
  
      // End backdrop: void sky, distant end islands, obsidian pillars
      buildEndLayer() {
          const c = document.createElement("canvas");
          c.width = this.width;
          c.height = this.height;
          const g = c.getContext("2d");
          const W = this.width;
          const ground = ARENA_CONFIG.groundY;
  
          const bands = ["#07040d", "#0b0614", "#10081c", "#160b25", "#1d0f30", "#24133b"];
          const bandH = Math.ceil(ground / bands.length);
          bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bandH, W, bandH + 1); });
  
          // Distant floating end islands
          for (const [ix, iy, iw] of [[40, 230, 120], [520, 200, 150], [300, 260, 90], [690, 250, 90]]) {
              g.fillStyle = "#a9a46e"; g.fillRect(ix, iy, iw, 10);
              g.fillStyle = "#8a8550"; g.fillRect(ix + 8, iy + 10, iw - 16, 8); g.fillRect(ix + 20, iy + 18, iw - 40, 6);
          }
          // Obsidian pillars with iron-bar cages at the top
          for (const [px, py, pw] of [[90, 140, 44], [320, 90, 50], [605, 160, 46]]) {
              g.fillStyle = "#15111f"; g.fillRect(px, py, pw, ground - py);
              g.fillStyle = "#231b33";
              for (let y = py + 6; y < ground; y += 16) g.fillRect(px + 4, y, pw - 8, 2);
              g.fillStyle = "#3a3346"; g.fillRect(px + pw / 2 - 1, py - 18, 2, 18);
              g.fillRect(px + 4, py - 18, 2, 18); g.fillRect(px + pw - 6, py - 18, 2, 18);
          }
          // Void haze near the floor
          g.fillStyle = "#2c1748";
          g.fillRect(0, 352, W, ground - 352);
          return c;
      }
  
      // Paints the Overworld backdrop (sky bands, sun, mountains, hills, trees) to an offscreen canvas
      buildOverworldLayer() {
          const c = document.createElement("canvas");
          c.width = this.width;
          c.height = this.height;
          const g = c.getContext("2d");
          const W = this.width;
          const ground = ARENA_CONFIG.groundY;
  
          // Sky in flat bands (lighter toward the horizon), no gradients
          const bands = ["#5b8dff", "#6597ff", "#70a1ff", "#7cabff", "#89b5ff", "#97c0ff"];
          const bandH = Math.ceil(ground / bands.length);
          bands.forEach((col, i) => {
              g.fillStyle = col;
              g.fillRect(0, i * bandH, W, bandH + 1);
          });
  
          // Square Minecraft sun with a soft halo ring
          g.fillStyle = "#fff6b3";
          g.fillRect(636, 36, 56, 56);
          g.fillStyle = "#fffde6";
          g.fillRect(648, 48, 32, 32);
  
          // Far mountains (blue-grey), stepped like blocks
          const far = [[0, 210], [60, 190], [120, 175], [170, 195], [230, 160], [290, 180], [350, 200],
              [400, 170], [460, 150], [520, 175], [580, 195], [640, 165], [700, 185], [760, 200]];
          g.fillStyle = "#8aa3c8";
          far.forEach(([x, y], i) => {
              const w = (far[i + 1] ? far[i + 1][0] : W) - x;
              g.fillRect(x, y, w, ground - y);
          });
          g.fillStyle = "#e8eef8"; // snow caps
          far.forEach(([x, y], i) => {
              const w = (far[i + 1] ? far[i + 1][0] : W) - x;
              if (y < 185) g.fillRect(x, y, w, 8);
          });
  
          // Near hills (green), stepped 8px blocks, reaching all the way down to the floor
          g.fillStyle = "#4f8a3c";
          for (let x = 0; x < W; x += 8) {
              const h = 250 + Math.round((Math.sin(x * 0.011) * 22 + Math.sin(x * 0.031 + 1.7) * 10) / 8) * 8;
              g.fillRect(x, h, 8, ground - h);
          }
          g.fillStyle = "#5d9c46"; // sunlit top edge
          for (let x = 0; x < W; x += 8) {
              const h = 250 + Math.round((Math.sin(x * 0.011) * 22 + Math.sin(x * 0.031 + 1.7) * 10) / 8) * 8;
              g.fillRect(x, h, 8, 4);
          }
  
          // Rows of pixel oak trees in the mid-ground
          const tree = (x, base, s) => {
              g.fillStyle = "#6b4a2b";
              g.fillRect(x + 3 * s, base - 6 * s, 2 * s, 6 * s);
              g.fillStyle = "#2f6b2a";
              g.fillRect(x, base - 12 * s, 8 * s, 6 * s);
              g.fillRect(x + 2 * s, base - 14 * s, 4 * s, 2 * s);
              g.fillStyle = "#3d8436";
              g.fillRect(x + s, base - 12 * s, 3 * s, 2 * s);
          };
          [[30, 330], [130, 345], [250, 325], [360, 340], [470, 330], [585, 345], [700, 335]].forEach(([x, b]) => tree(x, b, 3));
          g.fillStyle = "#3f7330"; // darker meadow band behind the arena floor
          g.fillRect(0, 350, W, ground - 350);
          [[80, 386], [200, 388], [420, 386], [540, 388], [660, 386], [760, 388]].forEach(([x, b]) => tree(x, b, 4));
  
          return c;
      }
  
      // Grass block top, dirt middle, stone with ores at the bottom (16px Minecraft blocks)
      drawGrassFloor(ctx, p) {
          const B = 16;
          const dirtEnd = p.y + 30;
          for (let bx = p.x; bx < p.x + p.w; bx += B) {
              const n = (bx / B) | 0;
              // Dirt
              ctx.fillStyle = "#866043";
              ctx.fillRect(bx, p.y, B, dirtEnd - p.y);
              ctx.fillStyle = "#6f4e35";
              ctx.fillRect(bx + ((n * 5) % 11), p.y + 12, 3, 3);
              ctx.fillRect(bx + ((n * 7 + 4) % 12), p.y + 20, 2, 2);
              ctx.fillStyle = "#9b7653";
              ctx.fillRect(bx + ((n * 3 + 8) % 13), p.y + 16, 2, 2);
              // Stone
              ctx.fillStyle = "#7f7f7f";
              ctx.fillRect(bx, dirtEnd, B, p.y + p.h - dirtEnd);
              ctx.fillStyle = "#6a6a6a";
              ctx.fillRect(bx + ((n * 5 + 2) % 12), dirtEnd + 4, 4, 2);
              ctx.fillRect(bx + ((n * 3) % 10), dirtEnd + 11, 3, 2);
              if (n % 7 === 3) { // coal ore
                  ctx.fillStyle = "#2b2b2b";
                  ctx.fillRect(bx + 4, dirtEnd + 6, 3, 3);
                  ctx.fillRect(bx + 9, dirtEnd + 10, 2, 2);
              } else if (n % 13 === 8) { // iron ore
                  ctx.fillStyle = "#d8af93";
                  ctx.fillRect(bx + 5, dirtEnd + 5, 3, 2);
                  ctx.fillRect(bx + 10, dirtEnd + 11, 2, 2);
              }
              ctx.fillStyle = "rgba(0, 0, 0, 0.18)"; // block seams
              ctx.fillRect(bx, p.y, 1, p.h);
          }
          // Grass top with ragged edge
          ctx.fillStyle = "#5da83e";
          ctx.fillRect(p.x, p.y, p.w, 5);
          ctx.fillStyle = "#7cc958";
          ctx.fillRect(p.x, p.y, p.w, 2);
          ctx.fillStyle = "#5da83e";
          for (let gx = p.x; gx < p.x + p.w; gx += 4) {
              if (((gx / 4) | 0) % 3 !== 0) ctx.fillRect(gx, p.y + 5, 4, ((gx / 4) | 0) % 2 ? 3 : 2);
          }
          // Darker band where dirt meets stone
          ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
          ctx.fillRect(p.x, dirtEnd, p.w, 2);
      }
  
      // Floating oak-plank ledge with a grass carpet and hanging vines
      drawOakLedge(ctx, p) {
          // Soft shadow under the ledge
          ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
          ctx.fillRect(p.x + 4, p.y + p.h, p.w - 8, 4);
          // Planks
          ctx.fillStyle = "#a4844f";
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.fillStyle = "#8b6d3d";
          ctx.fillRect(p.x, p.y + Math.floor(p.h / 2), p.w, 1);
          for (let bx = p.x; bx < p.x + p.w; bx += 16) {
              const off = (((bx - p.x) / 16) | 0) % 2 ? 8 : 0;
              ctx.fillRect(bx + off, p.y, 1, Math.floor(p.h / 2));
              ctx.fillRect(bx + 8 - off, p.y + Math.floor(p.h / 2), 1, p.h - Math.floor(p.h / 2));
          }
          ctx.fillStyle = "#6e5430";
          ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
          // Grass carpet
          ctx.fillStyle = "#5da83e";
          ctx.fillRect(p.x, p.y, p.w, 4);
          ctx.fillStyle = "#7cc958";
          ctx.fillRect(p.x, p.y, p.w, 1);
          // Hanging vines
          ctx.fillStyle = "#3f7d2a";
          for (let vx = p.x + 10; vx < p.x + p.w - 6; vx += 23) {
              const len = 6 + ((vx * 7) % 10);
              ctx.fillRect(vx, p.y + p.h, 2, len);
              ctx.fillRect(vx + 2, p.y + p.h + len - 3, 2, 3);
          }
      }
  
      // Shadow on the surface beneath a fighter (shrinks as they rise)
      drawFighterShadow(f) {
          if (f.hp <= 0) return;
          const feet = f.y + f.h;
          let surface = ARENA_CONFIG.groundY;
          for (const p of PLATFORMS_CONFIG) {
              if (p.y >= feet - 1 && p.y < surface && f.x + f.w > p.x && f.x < p.x + p.w) surface = p.y;
          }
          const gap = Math.max(0, surface - feet);
          const scale = Math.max(0.3, 1 - gap / 220);
          const w = Math.round((f.w + 6) * scale);
          const ctx = this.ctx;
          ctx.fillStyle = `rgba(0, 0, 0, ${0.32 * scale})`;
          ctx.fillRect(Math.round(f.x + f.w / 2 - w / 2), surface - 2, w, 3);
      }
  
      // Full-screen white flash for heavy hits and KOs
      drawFlash(alpha) {
          if (alpha <= 0) return;
          this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.6, alpha)})`;
          this.ctx.fillRect(-20, -20, this.width + 40, this.height + 40);
      }
  
      drawPlatforms() {
          const ctx = this.ctx;
          const biome = this.biome || "space";
  
          for (const p of PLATFORMS_CONFIG) {
              const isFloor = p.y >= 380;
  
              if (biome === "space") {
                  if (isFloor) this.drawMoonFloor(ctx, p);
                  else this.drawCrystalLedge(ctx, p);
              } else if (biome === "nether") {
                  // ==========================================
                  // NETHER: AUTHENTIC NETHERRACK BLOCKS
                  // ==========================================
                  // Base Netherrack rock body
                  ctx.fillStyle = "#681b22";
                  ctx.fillRect(p.x, p.y, p.w, p.h);
  
                  // Porous dark crevices and cracks (tiled 16x16)
                  ctx.fillStyle = "#3e0e13";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      for (let by = p.y; by < p.y + p.h; by += 16) {
                          ctx.fillRect(bx + 2, by + 4, 3, 3);
                          ctx.fillRect(bx + 9, by + 7, 4, 3);
                          ctx.fillRect(bx + 4, by + 12, 3, 2);
                      }
                  }
  
                  // Dark red pitted pores
                  ctx.fillStyle = "#4e141a";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      for (let by = p.y; by < p.y + p.h; by += 16) {
                          ctx.fillRect(bx + 3, by + 5, 2, 2);
                          ctx.fillRect(bx + 10, by + 8, 2, 2);
                          ctx.fillRect(bx + 13, by + 3, 2, 2);
                      }
                  }
  
                  // Fiery red highlights & glowing ember specks
                  ctx.fillStyle = "#932630";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      for (let by = p.y; by < p.y + p.h; by += 16) {
                          ctx.fillRect(bx + 7, by + 2, 3, 2);
                          ctx.fillRect(bx + 1, by + 10, 2, 2);
                          ctx.fillRect(bx + 12, by + 11, 2, 2);
                      }
                  }
                  ctx.fillStyle = "#bd313c";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      ctx.fillRect(bx + 6, p.y + (p.h > 14 ? 8 : 4), 1, 1);
                      ctx.fillRect(bx + 14, p.y + 2, 1, 1);
                  }
  
                  // Block grid mortar lines
                  ctx.fillStyle = "#2c080b";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      ctx.fillRect(bx, p.y, 1, p.h);
                  }
                  ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
  
                  // Crimson Nylium turf top carpet & hanging roots
                  ctx.fillStyle = "#9e1a31";
                  ctx.fillRect(p.x, p.y, p.w, 5);
                  ctx.fillStyle = "#cc2746";
                  ctx.fillRect(p.x, p.y, p.w, 2);
                  ctx.fillStyle = "#751022";
                  for (let gx = p.x; gx < p.x + p.w; gx += 8) {
                      ctx.fillRect(gx, p.y + 5, 3, 3);
                      ctx.fillRect(gx + 4, p.y + 5, 2, 2);
                  }
              } else if (biome === "end") {
                  // ==========================================
                  // THE END: AUTHENTIC END STONE BLOCKS
                  // ==========================================
                  // Base pale creamy End Stone
                  ctx.fillStyle = "#ded99f";
                  ctx.fillRect(p.x, p.y, p.w, p.h);
  
                  // Dark sulfur crater pits (tiled 16x16)
                  ctx.fillStyle = "#b5ad6e";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      for (let by = p.y; by < p.y + p.h; by += 16) {
                          ctx.fillRect(bx + 2, by + 4, 4, 3);
                          ctx.fillRect(bx + 9, by + 8, 4, 3);
                          ctx.fillRect(bx + 4, by + 12, 3, 2);
                      }
                  }
  
                  // Deep crater pores
                  ctx.fillStyle = "#8a8349";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      for (let by = p.y; by < p.y + p.h; by += 16) {
                          ctx.fillRect(bx + 3, by + 5, 2, 2);
                          ctx.fillRect(bx + 10, by + 9, 2, 2);
                      }
                  }
  
                  // Pale creamy highlights
                  ctx.fillStyle = "#f3efcb";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      for (let by = p.y; by < p.y + p.h; by += 16) {
                          ctx.fillRect(bx + 7, by + 2, 3, 2);
                          ctx.fillRect(bx + 1, by + 10, 2, 2);
                          ctx.fillRect(bx + 13, by + 11, 2, 2);
                      }
                  }
  
                  // Block seams
                  ctx.fillStyle = "#706a38";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      ctx.fillRect(bx, p.y, 1, p.h);
                  }
                  ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
  
                  if (isFloor) {
                      // End Stone Bricks border at top of floor
                      ctx.fillStyle = "#eae6ba";
                      ctx.fillRect(p.x, p.y, p.w, 3);
                      ctx.fillStyle = "#948c4f";
                      for (let bx = p.x; bx < p.x + p.w; bx += 32) {
                          ctx.fillRect(bx, p.y, 2, 6);
                      }
                  } else {
                      // Purpur block top cap on floating ledges
                      ctx.fillStyle = "#995a94";
                      ctx.fillRect(p.x, p.y, p.w, 5);
                      ctx.fillStyle = "#b870b2";
                      ctx.fillRect(p.x, p.y, p.w, 2);
                      ctx.fillStyle = "#6d3b6a";
                      for (let gx = p.x; gx < p.x + p.w; gx += 8) {
                          ctx.fillRect(gx, p.y + 5, 3, 2);
                      }
                      // Obsidian brackets on ledge corners
                      ctx.fillStyle = "#1b1424";
                      ctx.fillRect(p.x, p.y, 4, p.h);
                      ctx.fillRect(p.x + p.w - 4, p.y, 4, p.h);
                  }
              } else {
                  // ==========================================
                  // OVERWORLD: GRASS BLOCKS, DIRT, STONE & OAK LEDGES
                  // ==========================================
                  if (isFloor) {
                      this.drawGrassFloor(ctx, p);
                  } else {
                      this.drawOakLedge(ctx, p);
                  }
              }
          }
      }
  
      // ==========================================
      // MINECRAFT WEAPONS RENDERING
      // ==========================================
      drawWeapons(f, alpha = 1.0) {
          const ctx = this.ctx;
          const centerX = f.x + f.w / 2;
          const centerY = f.y + f.h / 2;
          const weaponId = f.weaponId || "mace";
  
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(centerX, centerY);
          ctx.scale(f.facing, 1);
  
          if (weaponId === "mace") {
              if (f.slamming) {
                  // Mace swing downwards
                  ctx.rotate(Math.PI * 0.45);
                  ctx.translate(14, 0);
                  ctx.fillStyle = "#6d4c41";
                  ctx.fillRect(-2, -18, 4, 22);
                  ctx.fillStyle = "#455a64";
                  ctx.fillRect(-7, -26, 14, 10);
                  ctx.fillStyle = "#78909c";
                  ctx.fillRect(-5, -24, 10, 6);
                  ctx.fillStyle = "#ffb300";
                  ctx.fillRect(-2, -22, 4, 3);
              } else {
                  // Idle Mace on back
                  ctx.rotate(-0.4);
                  ctx.fillStyle = "#5d4037";
                  ctx.fillRect(-2, -14, 3, 16);
                  ctx.fillStyle = "#455a64";
                  ctx.fillRect(-6, -20, 10, 7);
              }
          } else if (weaponId === "spear") {
              if (f.dashing) {
                  // Spear forward thrust
                  ctx.translate(12, 0);
                  ctx.fillStyle = "#8d6e63";
                  ctx.fillRect(-10, -2, 24, 4);
                  ctx.fillStyle = "#00e5ff";
                  ctx.beginPath();
                  ctx.moveTo(14, -5);
                  ctx.lineTo(26, 0);
                  ctx.lineTo(14, 5);
                  ctx.closePath();
                  ctx.fill();
                  // Wind swirl
                  ctx.fillStyle = "rgba(0, 229, 255, 0.4)";
                  ctx.beginPath();
                  ctx.arc(20, 0, 8, 0, Math.PI * 2);
                  ctx.fill();
              } else {
                  // Idle Spear upright
                  ctx.rotate(-0.25);
                  ctx.fillStyle = "#8d6e63";
                  ctx.fillRect(0, -22, 3, 24);
                  ctx.fillStyle = "#00e5ff";
                  ctx.beginPath();
                  ctx.moveTo(-1, -22);
                  ctx.lineTo(1.5, -29);
                  ctx.lineTo(4, -22);
                  ctx.closePath();
                  ctx.fill();
              }
          } else if (weaponId === "sword") {
              // DIAMOND SWORD
              if (f.dashing) {
                  // Slash posture forward
                  ctx.rotate(0.3);
                  ctx.translate(10, 2);
                  // Handle & Crossguard
                  ctx.fillStyle = "#5d4037";
                  ctx.fillRect(-6, -2, 6, 4);
                  ctx.fillStyle = "#2c3e50";
                  ctx.fillRect(0, -6, 3, 12);
                  // Diamond Blade
                  ctx.fillStyle = "#00d2d3";
                  ctx.fillRect(3, -3, 18, 6);
                  ctx.fillStyle = "#54a0ff";
                  ctx.fillRect(4, -1.5, 16, 3);
                  // Tip
                  ctx.fillStyle = "#00d2d3";
                  ctx.beginPath();
                  ctx.moveTo(21, -3);
                  ctx.lineTo(26, 0);
                  ctx.lineTo(21, 3);
                  ctx.closePath();
                  ctx.fill();
              } else {
                  // Idle Sword at side
                  ctx.rotate(-0.35);
                  ctx.fillStyle = "#5d4037";
                  ctx.fillRect(4, -4, 4, 3);
                  ctx.fillStyle = "#2c3e50";
                  ctx.fillRect(2, -7, 8, 3);
                  ctx.fillStyle = "#00d2d3";
                  ctx.fillRect(4, -22, 4, 15);
              }
          } else if (weaponId === "fists") {
              // STEVE BARE FISTS
              if (f.dashing) {
                  // Dual punching fists lunging forward
                  ctx.fillStyle = "#d35400";
                  ctx.fillRect(12, -7, 8, 6);
                  ctx.fillStyle = "#e67e22";
                  ctx.fillRect(16, 1, 8, 6);
              } else {
                  // Raised boxer guard hands
                  ctx.fillStyle = "#d35400";
                  ctx.fillRect(6, -6, 5, 5);
                  ctx.fillRect(8, 0, 5, 5);
              }
          } else if (weaponId === "bow") {
              // ENCHANTED BOW
              ctx.translate(10, 0);
              ctx.strokeStyle = "#8d6e63";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, 10, -Math.PI * 0.45, Math.PI * 0.45);
              ctx.stroke();
  
              // Bowstring
              ctx.strokeStyle = "#ecf0f1";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(4, -9);
              ctx.lineTo(-2, 0); // drawn string
              ctx.lineTo(4, 9);
              ctx.stroke();
  
              // Nocked arrow
              ctx.fillStyle = "#78909c";
              ctx.fillRect(-2, -1.5, 14, 3);
          }
  
          ctx.restore();
      }
  
      // ==========================================
      // BLOCK FACE SKINS RENDERING
      // ==========================================
      drawSkin(f, alpha = 1.0) {
          const ctx = this.ctx;
          const skin = f.skinId || "steve";
          const facing = f.facing || 1;
          const x = f.x;
          const y = f.y;
          const w = f.w;
          const h = f.h;
  
          ctx.save();
          ctx.globalAlpha = alpha;
  
          if (skin === "alex") {
              // Minecraft Alex: Orange hair, olive green shirt, brown pants
              ctx.fillStyle = "#e67e22"; // Orange Hair
              ctx.fillRect(x, y, w, 8);
              ctx.fillStyle = "#27ae60"; // Olive green tunic
              ctx.fillRect(x, y + 8, w, 10);
              ctx.fillStyle = "#795548"; // Pants
              ctx.fillRect(x, y + 18, w, 7);
              // Face
              ctx.fillStyle = "#f5cd79";
              ctx.fillRect(x + (facing > 0 ? 6 : 2), y + 4, 16, 8);
              // Green Eyes
              ctx.fillStyle = "#2ecc71";
              ctx.fillRect(x + (facing > 0 ? 15 : 4), y + 7, 4, 4);
          } else if (skin === "noob") {
              // Roblox Classic Noob: Yellow head, royal blue torso, lime green legs
              ctx.fillStyle = "#ffeb3b"; // Yellow head
              ctx.fillRect(x, y, w, 10);
              ctx.fillStyle = "#1976d2"; // Blue torso
              ctx.fillRect(x, y + 10, w, 8);
              ctx.fillStyle = "#4caf50"; // Green legs
              ctx.fillRect(x, y + 18, w, 7);
              // Cute Noob Face
              ctx.fillStyle = "#212121";
              const eyeX = facing > 0 ? x + 15 : x + 5;
              ctx.fillRect(eyeX, y + 4, 3, 3);
              ctx.fillRect(eyeX + (facing > 0 ? 4 : -4), y + 4, 3, 3);
              // Smile
              ctx.fillRect(x + (facing > 0 ? 14 : 4), y + 8, 6, 2);
          } else if (skin === "man_face") {
              // Roblox Iconic Man Face (The Smirk)
              ctx.fillStyle = "#ffeaa7"; // Skin
              ctx.fillRect(x, y, w, h);
              ctx.fillStyle = "#2d3436"; // Hair
              ctx.fillRect(x, y, w, 5);
              // Man Face Smirk & Eyes
              ctx.fillStyle = "#000000";
              const mfX = facing > 0 ? x + 10 : x + 2;
              // Smug raised eyebrow & sharp eye
              ctx.fillRect(mfX, y + 6, 5, 2);
              ctx.fillRect(mfX + 6, y + 5, 5, 2);
              ctx.fillRect(mfX + 1, y + 9, 3, 2);
              ctx.fillRect(mfX + 7, y + 8, 3, 2);
              // Iconic smirk line
              ctx.fillRect(mfX + 2, y + 15, 8, 2);
              ctx.fillRect(mfX + 8, y + 13, 3, 3);
              // Shirt trim
              ctx.fillStyle = "#e74c3c";
              ctx.fillRect(x, y + 19, w, 6);
          } else if (skin === "creeper") {
              // Creeper Face: Mottled green with black frown
              ctx.fillStyle = "#2ecc71";
              ctx.fillRect(x, y, w, h);
              ctx.fillStyle = "#27ae60";
              ctx.fillRect(x + 2, y + 2, 8, 8);
              ctx.fillRect(x + 14, y + 14, 8, 8);
              // Black Creeper Mouth
              ctx.fillStyle = "#000000";
              ctx.fillRect(x + 4, y + 6, 5, 5);  // Eye L
              ctx.fillRect(x + 16, y + 6, 5, 5); // Eye R
              ctx.fillRect(x + 9, y + 12, 7, 4); // Mouth top
              ctx.fillRect(x + 7, y + 16, 4, 7); // Mouth bottom L
              ctx.fillRect(x + 14, y + 16, 4, 7);// Mouth bottom R
          } else if (skin === "enderman") {
              // Enderman: Pitch black with purple glowing eyes
              ctx.fillStyle = "#1e1e1e";
              ctx.fillRect(x, y, w, h);
              // Glowing purple eyes
              ctx.fillStyle = "#a855f7";
              const eEyeX = facing > 0 ? x + 14 : x + 3;
              ctx.fillRect(eEyeX, y + 9, 7, 3);
              ctx.fillStyle = "#d8b4fe";
              ctx.fillRect(eEyeX + (facing > 0 ? 3 : 0), y + 9, 4, 3);
          } else if (skin === "skeleton") {
              // Skeleton: White bone with hollow gray eyes
              ctx.fillStyle = "#ecf0f1";
              ctx.fillRect(x, y, w, h);
              ctx.fillStyle = "#57606f";
              const sEyeX = facing > 0 ? x + 14 : x + 4;
              ctx.fillRect(sEyeX, y + 7, 5, 5);
              // Grin
              ctx.fillStyle = "#2f3542";
              ctx.fillRect(x + (facing > 0 ? 10 : 3), y + 17, 10, 2);
          } else if (skin === "zombie") {
              // Zombie: Necrotic green face with blue shirt
              ctx.fillStyle = "#55efc4";
              ctx.fillRect(x, y, w, 12);
              ctx.fillStyle = "#00cec9";
              ctx.fillRect(x, y + 12, w, 13);
              ctx.fillStyle = "#2d3436";
              ctx.fillRect(x, y, w, 4); // Hair
              // Hollow eyes
              ctx.fillStyle = "#2d3436";
              const zEyeX = facing > 0 ? x + 15 : x + 4;
              ctx.fillRect(zEyeX, y + 6, 4, 4);
          } else if (skin === "diamond_knight") {
              // Diamond Helmet Hero
              ctx.fillStyle = "#00d2d3";
              ctx.fillRect(x, y, w, h);
              ctx.fillStyle = "#54a0ff";
              ctx.fillRect(x + 2, y + 2, w - 4, 6);
              // Dark visor slit
              ctx.fillStyle = "#090d13";
              ctx.fillRect(x + (facing > 0 ? 10 : 2), y + 9, 13, 4);
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(x + (facing > 0 ? 18 : 4), y + 10, 3, 2);
          } else {
              // Default: Minecraft Steve
              ctx.fillStyle = "#5d4037"; // Dark brown hair
              ctx.fillRect(x, y, w, 6);
              ctx.fillStyle = "#f5cd79"; // Skin
              ctx.fillRect(x, y + 6, w, 7);
              ctx.fillStyle = "#00d2d3"; // Cyan tee
              ctx.fillRect(x, y + 13, w, 7);
              ctx.fillStyle = "#2980b9"; // Blue pants
              ctx.fillRect(x, y + 20, w, 5);
              // Blue eyes
              ctx.fillStyle = "#2980b9";
              const stEyeX = facing > 0 ? x + 15 : x + 4;
              ctx.fillRect(stEyeX, y + 8, 4, 4);
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(stEyeX + (facing > 0 ? 2 : 0), y + 8, 2, 2);
          }
  
          ctx.restore();
      }
  
      // ==========================================
      // DRAW FIGHTER (Single, 2v2, or 5v5)
      // ==========================================
      // alpha < 1 draws a faint ghost (an invisible Shadow seen by its own team)
      drawFighter(f, fallbackColor = [120, 40, 190], showOverheadBar = false, alpha = 1.0) {
          if (f.hp <= 0) return;
  
          const ctx = this.ctx;
          const centerX = f.x + f.w / 2;
          const centerY = f.y + f.h / 2;
  
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.scale(f.squashX || 1.0, f.squashY || 1.0);
          ctx.translate(-centerX, -centerY);
  
          // Skins are drawn at 25px; a big Buddha is the same art scaled up
          const scale = f.w / 25;
          const df = scale !== 1 ? { ...f, w: 25, h: 25 } : f;
          ctx.save();
          if (scale !== 1) {
              ctx.translate(f.x, f.y);
              ctx.scale(scale, scale);
              ctx.translate(-f.x, -f.y);
          }
  
          // Draw weapon
          this.drawWeapons(df, alpha);
  
          // Draw skin / block face
          this.drawSkin(df, alpha);
          ctx.restore(); // outlines below use the real (possibly big) size
          ctx.globalAlpha = alpha;
  
          // Team highlight border and aura (Blue vs Red)
          if (f.team) {
              const isBlue = f.team === "blue";
              const teamColor = isBlue ? "#1e90ff" : "#ff4757";
              const teamAura = isBlue ? "rgba(30, 144, 255, 0.28)" : "rgba(255, 71, 87, 0.28)";
  
              // Soft highlight aura around character
              ctx.fillStyle = teamAura;
              ctx.fillRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6);
  
              // Crisp 2px team outline
              ctx.strokeStyle = teamColor;
              ctx.lineWidth = 2;
              ctx.strokeRect(f.x - 1, f.y - 1, f.w + 2, f.h + 2);
  
              // Team corner pips for a blocky retro badge look
              ctx.fillStyle = teamColor;
              ctx.fillRect(f.x - 2, f.y - 2, 3, 3);
              ctx.fillRect(f.x + f.w - 1, f.y - 2, 3, 3);
              ctx.fillRect(f.x - 2, f.y + f.h - 1, 3, 3);
              ctx.fillRect(f.x + f.w - 1, f.y + f.h - 1, 3, 3);
          }
  
          // WHITE HIGHLIGHT ON PLAYER
          if (f.isPlayer) {
              // Radiant white aura
              ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
              ctx.fillRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6);
  
              // Crisp 2px solid white outline
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              ctx.strokeRect(f.x - 1, f.y - 1, f.w + 2, f.h + 2);
  
              // Blocky white corner brackets
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(f.x - 2, f.y - 2, 3, 3);
              ctx.fillRect(f.x + f.w - 1, f.y - 2, 3, 3);
              ctx.fillRect(f.x - 2, f.y + f.h - 1, 3, 3);
              ctx.fillRect(f.x + f.w - 1, f.y + f.h - 1, 3, 3);
  
              // Floating white indicator arrow above player's head
              const bob = Math.sin(this.frameCount * 0.15) * 2;
              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              const tipY = f.y - 8 + bob;
              ctx.moveTo(centerX, tipY);
              ctx.lineTo(centerX - 4, tipY - 5);
              ctx.lineTo(centerX + 4, tipY - 5);
              ctx.closePath();
              ctx.fill();
          }
  
          // Slamming effect ring
          if (f.slamming) {
              ctx.strokeStyle = "rgb(255, 160, 0)";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
              ctx.stroke();
  
              // Downward air trail
              ctx.fillStyle = "rgba(255, 180, 0, 0.4)";
              ctx.beginPath();
              ctx.moveTo(f.x, f.y);
              ctx.lineTo(f.x + f.w, f.y);
              ctx.lineTo(f.x + f.w / 2, f.y - 18);
              ctx.closePath();
              ctx.fill();
          }
  
          ctx.restore();
  
          // Overhead health bar & name for 2v2 and 5v5 matches
          if (showOverheadBar) {
              this.drawOverheadBar(f);
          }
      }
  
      // Health bars use team colors; nearly-dead fighters blink lighter
      teamBarColor(team, ratio) {
          const low = ratio <= 0.25 && Math.floor(this.frameCount / 12) % 2 === 0;
          if (team === "red") return low ? "#ffa8b0" : "#ff4757";
          if (team === "blue") return low ? "#a8d0ff" : "#2f86ff";
          return low ? "#a8f0c0" : "#2ecc71";
      }
  
      drawOverheadBar(f) {
          if (f.hp <= 0) return;
          const ctx = this.ctx;
          ctx.save();
  
          const barW = 46;
          const barH = 5;
          const barX = Math.round(f.x + f.w / 2 - barW / 2);
          const barY = Math.round(f.y - 18);
  
          // Name tag background & text
          let nameText = f.name || (f.team ? f.team.toUpperCase() : "PLAYER");
          if (f.isBot && !nameText.startsWith("[BOT]")) {
              nameText = `[BOT] ${nameText}`;
          }
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
  
          // Small name tag backing
          const nameWidth = ctx.measureText(nameText).width;
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.fillRect(Math.round(f.x + f.w / 2 - nameWidth / 2 - 3), barY - 12, nameWidth + 6, 11);
  
          // Name text
          ctx.fillStyle = f.team === "red" ? "#ff7675" : (f.team === "blue" ? "#74b9ff" : "#55ff55");
          ctx.fillText(nameText, Math.round(f.x + f.w / 2), barY - 2);
  
          // Health bar frame
          ctx.fillStyle = "#1e1e1e";
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1;
          ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);
  
          // Ghost HP
          const ghostRatio = Math.max(0, Math.min(1, (f.ghostHp || f.hp) / f.maxHp));
          ctx.fillStyle = "#e8e8e8"; // recent damage
          ctx.fillRect(barX, barY, Math.round(barW * ghostRatio), barH);
  
          // Current HP fill in team color
          const ratio = Math.max(0, Math.min(1, f.hp / f.maxHp));
          ctx.fillStyle = this.teamBarColor(f.team, ratio);
          ctx.fillRect(barX, barY, Math.round(barW * ratio), barH);
  
          // Exact HP text below bar
          ctx.font = "bold 8px monospace";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(`${Math.max(0, Math.ceil(f.hp))} HP`, Math.round(f.x + f.w / 2), barY + barH + 1);
  
          ctx.restore();
      }
  
      // Off-screen indicator
      drawOffscreenIndicator(character, r, g, b, label = "") {
          if (character.y + character.h >= 0 || character.hp <= 0) return;
  
          const ctx = this.ctx;
          const cx = Math.max(12, Math.min(this.width - 12, character.x + character.w / 2));
          const heightAbove = -(character.y + character.h);
          const size = Math.max(6, Math.min(16, 16 - heightAbove / 40));
  
          ctx.save();
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
  
          ctx.beginPath();
          ctx.moveTo(cx, 5);
          ctx.lineTo(cx - size / 2, 5 + size);
          ctx.lineTo(cx + size / 2, 5 + size);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
  
          ctx.fillStyle = "#000000";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(`${Math.round(heightAbove)}px`, cx, 8 + size);
  
          ctx.restore();
      }
  
      // Standard 1v1 HUD
      // Glows for status effects: burning (pulsing red), poisoned (green), slowed (blue)
      drawStatusEffects(f) {
          if (f.hp <= 0) return;
          const ctx = this.ctx;
          const pulse = 0.5 + 0.5 * Math.sin(this.frameCount * 0.35);
          ctx.save();
          if (f.fireT > 0) {
              ctx.fillStyle = `rgba(255, ${80 + Math.round(pulse * 60)}, 20, ${0.25 + pulse * 0.25})`;
              ctx.fillRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6);
              ctx.fillStyle = "#ffb43a";
              for (let i = 0; i < 3; i++) {
                  const fx = f.x + ((this.frameCount * 3 + i * 9) % f.w);
                  ctx.fillRect(Math.round(fx), Math.round(f.y - 4 - ((this.frameCount + i * 7) % 8)), 3, 3);
              }
          }
          if (f.poisonT > 0) {
              ctx.strokeStyle = "rgba(80, 220, 80, 0.85)";
              ctx.lineWidth = 2;
              ctx.strokeRect(f.x - 4, f.y - 4, f.w + 8, f.h + 8);
          }
          if (f.slowT > 0) {
              ctx.fillStyle = "rgba(90, 160, 255, 0.3)";
              ctx.fillRect(f.x, f.y + f.h - 6, f.w, 6);
          }
          ctx.restore();
      }
  
      // Blocky Minecraft-style lightning bolt from the sky down to (x, y)
      drawLightningBolt(bolt) {
          const ctx = this.ctx;
          const alpha = Math.min(1, bolt.life / 12);
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${0.25 * alpha})`;
          ctx.fillRect(-20, -20, this.width + 40, this.height + 40);
          let x = bolt.x;
          for (let y = 0; y < bolt.y; y += 12) {
              const nx = bolt.x + (((y * 37 + bolt.x * 13) % 21) - 10);
              ctx.fillStyle = `rgba(255, 250, 160, ${alpha})`;
              ctx.fillRect(Math.round(Math.min(x, nx)) - 3, y, Math.abs(nx - x) + 6, 14);
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
              ctx.fillRect(Math.round(nx) - 1, y, 3, 14);
              x = nx;
          }
          ctx.restore();
      }
  
      // Class name + ability status for the local player, above the weapon hotbar
      drawClassStatus(f) {
          if (!f || f.hp <= 0) return;
          const ctx = this.ctx;
          const secs = (frames) => (frames / (60 * GAME_SPEED)).toFixed(1);
          let text = f.classId && f.classId !== "normal" ? CLASSES[f.classId].name.toUpperCase() : "";
          let color = "#ffffff";
          if (f.classId === "shadow") {
              const cls = CLASSES.shadow;
              const t = f.shadowTimer % cls.invisCycle;
              if (f.invis) {
                  text += ` · INVISIBLE ${secs(cls.invisCycle - t)}s`;
                  color = "#c8a8ff";
              } else {
                  text += ` · invisible in ${secs(cls.invisCycle - cls.invisTime - t)}s`;
              }
          } else if (f.classId === "lightning") {
              text += " · slams stun longer";
              color = "#ffe14a";
          } else if (f.classId === "energy") {
              text += ` · speed +${Math.round((f.energyBoost || 0) * 100)}%`;
              color = "#7ff0ff";
          } else if (f.classId === "potion") {
              text += " · hits slow, poison, blind";
              color = "#9ae66e";
          } else if (f.classId === "pyro") {
              text += " · hits can burn";
              color = "#ff8a3a";
          } else if (f.classId === "void") {
              text += " · teleports above enemies";
              color = "#c08cff";
          } else if (f.classId === "buddha") {
              text += f.big ? " · BIG (B to shrink)" : " · B to grow";
              color = "#ffd27a";
          }
          // Status effects on you
          const status = [];
          if (f.slowT > 0) status.push("SLOWED");
          if (f.poisonT > 0) status.push("POISONED");
          if (f.fireT > 0) status.push("ON FIRE");
          if (f.blindT > 0) status.push("BLIND");
          ctx.save();
          ctx.font = "16px VT323, monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          const lines = [];
          if (status.length) lines.push([status.join(", "), "#ff7675"]);
          if (text) lines.push([text, color]);
          lines.reverse().forEach(([line, col], i) => {
              const y = this.height - 58 - i * 16;
              ctx.strokeText(line, 14, y);
              ctx.fillStyle = col;
              ctx.fillText(line, 14, y);
          });
          ctx.restore();
      }
  
      // Minecraft-style 2-slot hotbar for the local player's loadout (bottom-left)
      drawLoadoutHotbar(f) {
          if (!f || !f.loadout || f.loadout.length < 2) return;
          const ctx = this.ctx;
          if (!this.iconCache) this.iconCache = {};
          const size = 30;
          const x0 = 14;
          const y0 = this.height - size - 14;
          ctx.save();
          f.loadout.forEach((id, i) => {
              const x = x0 + i * (size + 4);
              const active = i === f.activeSlot;
              ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
              ctx.fillRect(x, y0, size, size);
              ctx.strokeStyle = active ? "#ffffff" : "#555555";
              ctx.lineWidth = active ? 3 : 2;
              ctx.strokeRect(x, y0, size, size);
              let img = this.iconCache[id];
              if (!img) {
                  img = new Image();
                  img.src = weaponIconURL(id);
                  this.iconCache[id] = img;
              }
              if (img.complete) {
                  ctx.imageSmoothingEnabled = false;
                  ctx.globalAlpha = active ? 1 : 0.55;
                  ctx.drawImage(img, x + 3, y0 + 3, size - 6, size - 6);
                  ctx.globalAlpha = 1;
              }
          });
          ctx.font = "16px VT323, monospace";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.strokeText("Q: swap", x0 + 2 * (size + 4) + 4, y0 + size / 2);
          ctx.fillText("Q: swap", x0 + 2 * (size + 4) + 4, y0 + size / 2);
          ctx.restore();
      }
  
      drawHUD(player, bot, botColor, modeLabel, p1Label = "YOU", p2Label = "BOT", scoreRed = 0, scoreBlue = 0, isTiebreaker = false, tiebreakerTimer = 0, redDmg = 0, blueDmg = 0, isTeamMatch = false) {
          const ctx = this.ctx;
          ctx.save();
  
          const barW = 200;
          const barH = 18;
  
          // Name on the left (shortened to fit), HP number on the right, inside the bar
          const barLabel = (x, label, hp, maxHp) => {
              ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
              ctx.textBaseline = "middle";
              const hpText = `${Math.max(0, Math.ceil(hp))}/${maxHp}`;
              ctx.textAlign = "right";
              ctx.fillStyle = "#ffffff";
              ctx.fillText(hpText, x + barW - 5, 27);
              const room = barW - 14 - ctx.measureText(hpText).width;
              let name = label;
              ctx.textAlign = "left";
              while (name.length > 1 && ctx.measureText(name).width > room) name = name.slice(0, -1);
              if (name !== label) name = name.slice(0, -1) + "…";
              ctx.fillText(name, x + 5, 27);
          };
  
          // Player 1 HP
          ctx.fillStyle = "rgba(30, 30, 30, 0.85)";
          ctx.fillRect(20, 18, barW, barH);
  
          const p1GhostRatio = Math.max(0, player.ghostHp / player.maxHp);
          ctx.fillStyle = "#e8e8e8";
          ctx.fillRect(20, 18, barW * p1GhostRatio, barH);
  
          const p1Ratio = Math.max(0, player.hp / player.maxHp);
          ctx.fillStyle = this.teamBarColor(player.team || "blue", p1Ratio);
          ctx.fillRect(20, 18, barW * p1Ratio, barH);
  
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(20, 18, barW, barH);
  
          // Player 1 Dash / Bow cooldown meter
          const p1CooldownMax = player.weaponId === "bow" ? (player.weaponStats.reloadTime || 45) : 40;
          const curCooldown = player.weaponId === "bow" ? player.arrowCooldown : player.dashCooldown;
          const p1DashRatio = curCooldown > 0 ? (1 - curCooldown / p1CooldownMax) : 1;
          ctx.fillStyle = curCooldown <= 0 ? "#00d2d3" : "#576574";
          ctx.fillRect(20, 38, barW * p1DashRatio, 4);
  
          barLabel(20, p1Label, player.hp, player.maxHp);
  
          // Bot / Player 2 HP
          const bX = this.width - 20 - barW;
          ctx.fillStyle = "rgba(30, 30, 30, 0.85)";
          ctx.fillRect(bX, 18, barW, barH);
  
          const bGhostRatio = Math.max(0, bot.ghostHp / bot.maxHp);
          ctx.fillStyle = "#e8e8e8";
          ctx.fillRect(bX, 18, barW * bGhostRatio, barH);
  
          const bRatio = Math.max(0, bot.hp / bot.maxHp);
          ctx.fillStyle = this.teamBarColor(bot.team || "red", bRatio);
          ctx.fillRect(bX, 18, barW * bRatio, barH);
  
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(bX, 18, barW, barH);
  
          const bDashRatio = bot.dashCooldown > 0 ? (1 - bot.dashCooldown / 40) : 1;
          ctx.fillStyle = bot.dashReady && bot.dashCooldown <= 0 ? "#00d2d3" : "#576574";
          ctx.fillRect(bX, 38, barW * bDashRatio, 4);
  
          barLabel(bX, p2Label, bot.hp, bot.maxHp);
  
          // Center Scoreboard (First to 11 in team arena, or 1v1 duel banner)
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(this.width / 2 - 80, 8, 160, 32);
          ctx.strokeStyle = isTiebreaker ? "#f1c40f" : "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(this.width / 2 - 80, 8, 160, 32);
  
          if (isTiebreaker) {
              ctx.fillStyle = "#f1c40f";
              ctx.font = "bold 11px monospace";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(`⚔️ TIEBREAKER: ${(Math.max(0, tiebreakerTimer) / 60).toFixed(1)}s`, this.width / 2, 18);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 9px monospace";
              ctx.fillText(`BLUE: ${Math.round(blueDmg)} | RED: ${Math.round(redDmg)} DMG`, this.width / 2, 30);
          } else {
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 13px monospace";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(`${scoreBlue}  -  ${scoreRed}`, this.width / 2, 19);
              ctx.fillStyle = "#f1c40f";
              ctx.font = "bold 9px monospace";
              const subBadge = isTeamMatch ? "FIRST TO 11 KILLS" : `${(modeLabel || "1v1 DUEL").toUpperCase()}`;
              ctx.fillText(subBadge, this.width / 2, 31);
          }
  
          ctx.restore();
      }
  
      // Team Arena 1v1, 2v2 and 5v5 HUD displaying every person and their exact health
      drawTeamArenaHUD(redTeam, blueTeam, matchType, scoreRed = 0, scoreBlue = 0, isTiebreaker = false, tiebreakerTimer = 0, redDmg = 0, blueDmg = 0) {
          const ctx = this.ctx;
          ctx.save();
  
          const redAlive = redTeam.filter(f => f.hp > 0).length;
          const blueAlive = blueTeam.filter(f => f.hp > 0).length;
  
          // Center Match Score & Type Badge
          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(this.width / 2 - 80, 8, 160, 32);
          ctx.strokeStyle = isTiebreaker ? "#f1c40f" : "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(this.width / 2 - 80, 8, 160, 32);
  
          if (isTiebreaker) {
              ctx.fillStyle = "#f1c40f";
              ctx.font = "bold 11px monospace";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(`⚔️ TIEBREAKER: ${(Math.max(0, tiebreakerTimer) / 60).toFixed(1)}s`, this.width / 2, 18);
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 9px monospace";
              ctx.fillText(`BLUE: ${Math.round(blueDmg)} | RED: ${Math.round(redDmg)} DMG`, this.width / 2, 30);
          } else {
              ctx.fillStyle = "#ffffff";
              ctx.font = "bold 13px monospace";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(`BLUE ${scoreBlue} : ${scoreRed} RED`, this.width / 2, 19);
              ctx.fillStyle = "#f1c40f";
              ctx.font = "bold 9px monospace";
              ctx.fillText(`ARENA ${matchType.toUpperCase()} • FIRST TO 11`, this.width / 2, 31);
          }
  
          // --- BLUE TEAM ROSTER (Left Side - YOUR TEAM) ---
          ctx.fillStyle = "rgba(41, 128, 185, 0.95)";
          ctx.fillRect(16, 10, 160, 24);
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 1;
          ctx.strokeRect(16, 10, 160, 24);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`BLUE TEAM (${blueAlive}/${blueTeam.length})`, 96, 22);
  
          const rItemH = matchType === "5v5" ? 18 : 22;
          blueTeam.forEach((f, idx) => {
              const itemY = 38 + idx * (rItemH + 4);
              const isAlive = f.hp > 0;
              const hpRatio = Math.max(0, Math.min(1, f.hp / f.maxHp));
              const ghostRatio = Math.max(0, Math.min(1, (f.ghostHp || f.hp) / f.maxHp));
  
              // Card background
              ctx.fillStyle = isAlive ? "rgba(20, 20, 20, 0.85)" : "rgba(20, 30, 40, 0.6)";
              ctx.fillRect(16, itemY, 160, rItemH);
              ctx.strokeStyle = f.isPlayer ? "#ffffff" : (isAlive ? "#2980b9" : "#555");
              ctx.lineWidth = f.isPlayer ? 2 : 1;
              ctx.strokeRect(16, itemY, 160, rItemH);
  
              // Fighter Name
              ctx.font = "bold 10px monospace";
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillStyle = f.isPlayer ? "#ffffff" : (isAlive ? "#74b9ff" : "#888888");
              const name = (f.name || `Blue ${idx + 1}`).substring(0, 10);
              ctx.fillText(name, 22, itemY + rItemH / 2);
  
              // HP Bar inside card
              const barX = 90;
              const barW = 80;
              const barH = rItemH - 8;
              const barY = itemY + 4;
  
              ctx.fillStyle = "#111";
              ctx.fillRect(barX, barY, barW, barH);
  
              if (isAlive) {
                  ctx.fillStyle = "#e8e8e8";
                  ctx.fillRect(barX, barY, barW * ghostRatio, barH);
                  ctx.fillStyle = this.teamBarColor(f.team, hpRatio);
                  ctx.fillRect(barX, barY, barW * hpRatio, barH);
                  ctx.fillStyle = "#ffffff";
                  ctx.font = "bold 9px monospace";
                  ctx.textAlign = "center";
                  ctx.fillText(`${Math.max(0, Math.ceil(f.hp))} HP`, barX + barW / 2, itemY + rItemH / 2);
              } else {
                  ctx.fillStyle = "#e74c3c";
                  ctx.font = "bold 9px monospace";
                  ctx.textAlign = "center";
                  ctx.fillText("ELIMINATED", barX + barW / 2, itemY + rItemH / 2);
              }
          });
  
          // --- RED TEAM ROSTER (Right Side - OPPONENTS) ---
          const bStartX = this.width - 176;
          ctx.fillStyle = "rgba(231, 76, 60, 0.95)";
          ctx.fillRect(bStartX, 10, 160, 24);
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 1;
          ctx.strokeRect(bStartX, 10, 160, 24);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`RED TEAM (${redAlive}/${redTeam.length})`, bStartX + 80, 22);
  
          redTeam.forEach((f, idx) => {
              const itemY = 38 + idx * (rItemH + 4);
              const isAlive = f.hp > 0;
              const hpRatio = Math.max(0, Math.min(1, f.hp / f.maxHp));
              const ghostRatio = Math.max(0, Math.min(1, (f.ghostHp || f.hp) / f.maxHp));
  
              ctx.fillStyle = isAlive ? "rgba(20, 20, 20, 0.85)" : "rgba(40, 20, 20, 0.6)";
              ctx.fillRect(bStartX, itemY, 160, rItemH);
              ctx.strokeStyle = isAlive ? "#c0392b" : "#555";
              ctx.lineWidth = 1;
              ctx.strokeRect(bStartX, itemY, 160, rItemH);
  
              ctx.font = "bold 10px monospace";
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillStyle = isAlive ? "#ff7675" : "#888888";
              const name = (f.name || `Red ${idx + 1}`).substring(0, 10);
              ctx.fillText(name, bStartX + 6, itemY + rItemH / 2);
  
              const barX = bStartX + 74;
              const barW = 80;
              const barH = rItemH - 8;
              const barY = itemY + 4;
  
              ctx.fillStyle = "#111";
              ctx.fillRect(barX, barY, barW, barH);
  
              if (isAlive) {
                  ctx.fillStyle = "#e8e8e8";
                  ctx.fillRect(barX, barY, barW * ghostRatio, barH);
                  ctx.fillStyle = this.teamBarColor(f.team, hpRatio);
                  ctx.fillRect(barX, barY, barW * hpRatio, barH);
                  ctx.fillStyle = "#ffffff";
                  ctx.font = "bold 9px monospace";
                  ctx.textAlign = "center";
                  ctx.fillText(`${Math.max(0, Math.ceil(f.hp))} HP`, barX + barW / 2, itemY + rItemH / 2);
              } else {
                  ctx.fillStyle = "#e74c3c";
                  ctx.font = "bold 9px monospace";
                  ctx.textAlign = "center";
                  ctx.fillText("ELIMINATED", barX + barW / 2, itemY + rItemH / 2);
              }
          });
  
          ctx.restore();
      }
  
      drawControlsHint(isPvP = false, matchFrames = 0) {
          const ctx = this.ctx;
          // Smoothly fade out after ~5 seconds (240 frames) so combat arena remains completely clean
          let alpha = 1.0;
          if (matchFrames > 200) {
              alpha = Math.max(0, 1.0 - (matchFrames - 200) / 70);
          }
          if (alpha <= 0) return;
  
          ctx.save();
          ctx.globalAlpha = alpha;
  
          // On the ground strip at the bottom, right of the weapon hotbar, so it never covers the HUD
          const bannerX = 170;
          const bannerW = this.width - bannerX - 14;
          const bannerH = 18;
          const bannerY = this.height - 34;
  
          ctx.fillStyle = "rgba(10, 12, 18, 0.72)";
          ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
          ctx.lineWidth = 1;
          ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
  
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px 'Segoe UI', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
  
          if (isPvP) {
              ctx.fillText("P1: WASD = MOVE/JUMP | SPACE = DASH/ATTACK | S = SLAM   ••   P2: ARROWS | ENTER = ATTACK | DOWN = SLAM", this.width / 2, bannerY + bannerH / 2);
          } else {
              ctx.fillText("WASD / ARROWS = MOVE • SPACE / CLICK = ATTACK • S / DOWN = SLAM • Q = SWAP WEAPON • ESC = PAUSE", this.width / 2, bannerY + bannerH / 2);
          }
  
          ctx.restore();
      }
  
  }
  

  // ===== game.js =====
  // ==========================================
  // SPEAR-MACE PVP - Main Game Controller
  // Manages game loop, state transitions, input, 2-Player mode,
  // Arrows projectile system, and 1v1 / 2v2 / 5v5 Team Arena matches
  // ==========================================
  
  
  class Game {
      constructor(canvas, uiCallbacks = {}) {
          this.canvas = canvas;
          this.uiCallbacks = uiCallbacks;
          this.playerName = auth.getUsername();
  
          // Managers
          this.renderer = new Renderer(canvas);
          this.particles = new ParticleManager();
          this.combat = new CombatEngine(this.particles);
          this.arrowManager = new ArrowManager();
  
          // Fighters
          this.player = new Fighter(false, "p1", this.playerName);
          this.bot = new Fighter(true, "p2", "Bot");
          this.botAI = new BotAI(this.bot);
  
          // Multi-fighter Team Arena Mode lists
          this.isTeamMatch = false;
          this.matchType = "1v1"; // "1v1", "2v2", "5v5"
          this.redTeam = [this.player];
          this.blueTeam = [this.bot];
          this.bot._botAI = this.botAI;
          this.allBots = [{ fighter: this.bot, ai: this.botAI }];
          this.allFighters = [this.player, this.bot];
  
          // Match Scoring & Sudden Death Tiebreaker (First to 11 Kills, 10-10 Tiebreaker)
          this.targetKills = 11;
          this.scoreRed = 0;
          this.scoreBlue = 0;
          this.isTiebreaker = false;
          this.tiebreakerTimer = 0;
          this.tiebreakerRedDamage = 0;
          this.tiebreakerBlueDamage = 0;
          this.respawnQueue = [];
          this.highestJumper = null;
          this.winnerTeam = null;
          this.matchFrames = 0;
  
          // State
          this.state = "menu"; // "menu", "play", "paused", "gameover"
          this.mode = "normal";
          this.customBotParams = null;
          this.botParams = {};
          this.lastRewardInfo = null;
  
          // Online (peer-to-peer) match state
          this.onlineRole = null; // "host" | "guest" | null
          this.localFighter = this.player; // the fighter this browser controls
          this.remoteInputs = {}; // online host: peerId -> { left, right }
          this.sentInput = { left: false, right: false };
  
          // Key states
          this.keys = {};
  
          this.flash = 0; // white screen flash strength (heavy hits / KOs)
  
          // Mouse position in arena coordinates (for aiming the bow)
          this.mouse = { x: 0, y: 0, active: false };
  
          // Loop timing
          this.lastTime = 0;
          this.animFrameId = null;
  
          // Listen for username / loadout changes
          auth.onUserChanged((user) => {
              this.playerName = user.username;
              this.player.name = user.username;
              this.player.setLoadout(user.equippedWeapon || "mace", user.secondaryWeapon);
              this.player.setSkin(user.skinId || "steve");
              this.player.setClass(user.classId || "normal");
          });
  
          this.setupInputs();
          this.applyMode("normal");
      }
  
      applyMode(mode, customOverrides = null, keepOnline = false) {
          // Starting any offline game ends a pending or finished online session
          if (!keepOnline && online.role) online.close();
          this.mode = mode;
          this.onlineRole = null;
          this.localFighter = this.player;
          this.isTeamMatch = false;
          this.matchType = "1v1";
          this.customBotParams = customOverrides;
          this.botParams = getBotParamsForMode(mode, customOverrides);
  
          // Reset match score & tiebreaker
          this.scoreRed = 0;
          this.scoreBlue = 0;
          this.matchFrames = 0;
          this.isTiebreaker = false;
          this.tiebreakerTimer = 0;
          this.tiebreakerRedDamage = 0;
          this.tiebreakerBlueDamage = 0;
          this.respawnQueue = [];
          this.highestJumper = null;
          this.winnerTeam = null;
  
          const maxHp = (mode === "practice") ? 1000 : (this.botParams.maxHP || 100);
          const user = auth.getUser();
  
          const isBot = (mode !== "pvp" && mode !== "arena");
          this.player.reset(150, 1, maxHp);
          this.player.setLoadout(user.equippedWeapon || "mace", user.secondaryWeapon);
          this.player.setSkin(user.skinId || "steve");
          this.player.setClass(user.classId || "normal");
          this.player.setTeam("blue"); // PLAYER IS ALWAYS BLUE
          this.player.isBotGame = isBot;
          this.player.isPlayer = true;
          this.player.name = this.playerName || "Player";
  
          const botMeta = MODE_METADATA[mode] || { name: "Bot" };
          this.bot.reset(650, -1, maxHp);
          this.bot.name = (mode === "pvp") ? "Player 2" : `[BOT] ${botMeta.name}`;
          this.bot.setLoadout(mode === "god" ? "mace" : (mode === "pro" ? "sword" : "spear"));
          this.bot.setSkin(mode === "god" ? "enderman" : (mode === "pro" ? "diamond_knight" : "alex"));
          this.bot.setClass("normal");
          this.bot.setTeam("red"); // OPPONENT IS ALWAYS RED
          this.bot.isBotGame = isBot;
          this.bot.isBot = mode !== "pvp"; // Player 2 is a person in local PvP (no [BOT] tag)
  
          this.botAI.setParams(this.botParams);
          this.botAI.reset();
          this.bot._botAI = this.botAI;
  
          this.blueTeam = [this.player];
          this.redTeam = [this.bot];
          this.allBots = [{ fighter: this.bot, ai: this.botAI }];
          this.allFighters = [this.player, this.bot];
  
          this.arrowManager.reset();
          this.particles.reset();
          this.lastRewardInfo = null;
  
          if (this.uiCallbacks.onModeChanged) {
              this.uiCallbacks.onModeChanged(mode);
          }
      }
  
      startGame(mode = "normal", customOverrides = null) {
          sound.ensureContext();
          sound.playClick();
          this.applyMode(mode, customOverrides);
          this.state = "play";
  
          if (this.uiCallbacks.onStateChanged) {
              this.uiCallbacks.onStateChanged(this.state);
          }
      }
  
      // Online match from the host's setup: { matchType: "1v1" | "2v2", slots: [...] }.
      // Each slot is { name, skin, weapon, weapon2, upgrades, team, peer } where peer is
      // "host", a guest's peer id, or null for a bot. Slots list Blue first, then Red,
      // and every browser builds the fighters in that same order.
      startOnlineMatch(role, setup, localSlot) {
          sound.ensureContext();
          this.applyMode("pvp", null, true);
          this.mode = "online";
          this.onlineRole = role;
          this.onlineSetup = setup;
          this.botParams = getBotParamsForMode("normal");
  
          const slots = setup.slots;
          const makeFighter = (slot, i) => {
              const isBot = !slot.peer;
              let f;
              if (i === 0) {
                  f = this.player;
              } else if (setup.matchType === "1v1") {
                  f = this.bot;
              } else {
                  f = new Fighter(isBot, `o${i}`, slot.name);
              }
              const blue = slot.team === "blue";
              const sameTeamIndex = slots.slice(0, i).filter(s => s.team === slot.team).length;
              f.reset(blue ? 150 + sameTeamIndex * 60 : 650 - sameTeamIndex * 60, blue ? 1 : -1, 100);
              f.name = slot.name || (isBot ? "Bot" : "Player");
              f.setLoadout(slot.weapon || "mace", slot.weapon2 || null, slot.upgrades || {});
              f.setSkin(slot.skin || "steve");
              f.setClass(slot.cls || "normal");
              f.setTeam(slot.team);
              f.isBot = isBot;
              f.isBotGame = false;
              f.isPlayer = i === localSlot;
              f.netPeer = slot.peer;
              f._botAI = null;
              return f;
          };
          const fighters = slots.map(makeFighter);
  
          this.isTeamMatch = setup.matchType !== "1v1";
          this.matchType = setup.matchType;
          this.blueTeam = fighters.filter(f => f.team === "blue");
          this.redTeam = fighters.filter(f => f.team === "red");
          this.allFighters = fighters;
          this.localFighter = fighters[localSlot] || this.player;
  
          // Only the host runs bot brains
          this.allBots = [];
          if (role === "host") {
              fighters.forEach(f => {
                  if (!f.isBot) return;
                  const ai = new BotAI(f);
                  ai.setParams(this.botParams);
                  f._botAI = ai;
                  this.allBots.push({ fighter: f, ai });
              });
          }
  
          this.remoteInputs = {};
          this.sentInput = { left: false, right: false };
  
          this.state = "play";
          if (this.uiCallbacks.onStateChanged) {
              this.uiCallbacks.onStateChanged(this.state);
          }
      }
  
      // Host: a guest dropped out mid-match, so a bot takes over their fighter
      replaceWithBot(peerId) {
          const f = this.allFighters.find(x => x.netPeer === peerId);
          if (!f) return;
          f.netPeer = null;
          f.isBot = true;
          const ai = new BotAI(f);
          ai.setParams(this.botParams);
          f._botAI = ai;
          this.allBots.push({ fighter: f, ai });
          if (this.onlineSetup) {
              const slot = this.onlineSetup.slots[this.allFighters.indexOf(f)];
              if (slot) slot.peer = null;
          }
      }
  
      // Shadow class: invisible fighters are hidden from the other team. On a shared local
      // PvP screen both players watch the same view, so there they show as a ghost instead.
      isHiddenFromViewer(f) {
          if (!f.invis || f.hp <= 0 || this.mode === "pvp") return false;
          const viewer = this.localFighter || this.player;
          return f.team !== viewer.team;
      }
  
      isOnlineGuest() {
          return this.mode === "online" && this.onlineRole === "guest";
      }
  
      // ---- Online networking: snapshots (host -> guest) and inputs (guest -> host) ----
  
      packFighter(f) {
          const r = (n) => Math.round(n * 10) / 10;
          return [r(f.x), r(f.y), r(f.xVel), r(f.yVel), f.facing, r(f.hp), r(f.ghostHp),
              r(f.squashX), r(f.squashY), f.dashing ? 1 : 0, f.slamming ? 1 : 0, f.maxHp, f.weaponId, f.invis ? 1 : 0,
              (f.slowT > 0 ? 1 : 0) | (f.poisonT > 0 ? 2 : 0) | (f.fireT > 0 ? 4 : 0) | (f.blindT > 0 ? 8 : 0) | (f.freezeT > 0 ? 16 : 0),
              f.big ? 1 : 0, Math.round(f.energyBoost * 100), f.shadowTimer];
      }
  
      unpackFighter(f, d) {
          const prevHp = f.hp;
          [f.x, f.y, f.xVel, f.yVel, f.facing, f.hp, f.ghostHp, f.squashX, f.squashY] = d;
          f.dashing = !!d[9];
          f.slamming = !!d[10];
          f.maxHp = d[11];
          if (d[12] && d[12] !== f.weaponId) f.setWeapon(d[12], {});
          f.invis = !!d[13];
          // Status effects (guests only need on/off for drawing)
          const fx = d[14] || 0;
          f.slowT = fx & 1 ? 1 : 0;
          f.poisonT = fx & 2 ? 1 : 0;
          f.fireT = fx & 4 ? 1 : 0;
          f.blindT = fx & 8 ? 1 : 0;
          f.freezeT = fx & 16 ? 1 : 0;
          if (!!d[15] !== !!f.big) {
              f.setBig(!!d[15]);
              [f.x, f.y] = d; // keep the host's exact position after resizing
          }
          if (d[16] !== undefined) f.energyBoost = d[16] / 100;
          if (d[17] !== undefined) f.shadowTimer = d[17];
          // Recreate hit effects locally from health changes
          if (f.hp < prevHp - 0.01 && prevHp > 0) {
              const dmg = prevHp - Math.max(0, f.hp);
              sound.playDashHit();
              this.particles.addHitSparks(f.x + f.w / 2, f.y + f.h / 2, 10, "#e74c3c");
              this.particles.addDamageText(f.x + f.w / 2, f.y, dmg, dmg >= 30);
              this.particles.triggerShake(4, 6);
              if (dmg >= 50) this.flash = Math.max(this.flash, 0.3);
              if (f.hp <= 0) {
                  this.flash = 0.55;
                  this.particles.addFloatingText(f.x + f.w / 2, f.y - 12, `${f.name} ELIMINATED!`, "#ff2244", true, 1.3);
              }
          }
      }
  
      buildSnapshot() {
          return {
              t: "snap",
              f: this.allFighters.map(f => this.packFighter(f)),
              a: this.arrowManager.arrows.map(a => [Math.round(a.x), Math.round(a.y), a.vx, a.vy, a.stuck ? 1 : 0, a.facing]),
              m: this.matchFrames,
              b: this.combat.bolts.map(bo => [Math.round(bo.x), Math.round(bo.y), bo.life]),
              sc: [this.scoreBlue, this.scoreRed, this.isTiebreaker ? 1 : 0, this.tiebreakerTimer,
                  Math.round(this.tiebreakerBlueDamage), Math.round(this.tiebreakerRedDamage)]
          };
      }
  
      handleNetMessage(msg, fromPeer = null) {
          const isHost = this.mode === "online" && this.onlineRole === "host";
          if (msg.t === "snap" && this.isOnlineGuest() && this.state === "play") {
              msg.f.forEach((d, i) => { if (this.allFighters[i]) this.unpackFighter(this.allFighters[i], d); });
              this.arrowManager.arrows = msg.a.map(([x, y, vx, vy, stuck, facing]) => ({
                  x, y, vx, vy, facing, stuck: !!stuck, gravity: 0, life: 60
              }));
              this.matchFrames = msg.m;
              if (msg.b) this.combat.bolts = msg.b.map(([x, y, life]) => ({ x, y, life }));
              if (msg.sc) {
                  [this.scoreBlue, this.scoreRed] = msg.sc;
                  this.isTiebreaker = !!msg.sc[2];
                  this.tiebreakerTimer = msg.sc[3];
                  this.tiebreakerBlueDamage = msg.sc[4];
                  this.tiebreakerRedDamage = msg.sc[5];
              }
          } else if (msg.t === "input" && isHost) {
              this.remoteInputs[fromPeer] = { left: !!msg.l, right: !!msg.r };
          } else if (msg.t === "act" && isHost && this.state === "play") {
              const f = this.allFighters.find(x => x.netPeer === fromPeer);
              if (!f || f.hp <= 0) return;
              if (msg.a === "jump") f.jump();
              if (msg.a === "dash") {
                  f.aimAngle = typeof msg.aim === "number" ? msg.aim : null;
                  f.dash(null, true, null, this.arrowManager);
              }
              if (msg.a === "slam") f.slam();
              if (msg.a === "swap") f.swapWeapon();
              if (msg.a === "size") f.toggleSize();
          } else if (msg.t === "end" && this.isOnlineGuest() && this.state === "play") {
              msg.stats.forEach((st, i) => { this.allFighters[i].stats = st; });
              this.finishMatch(msg.w === this.localFighter.team);
          }
      }
  
      // Starts a 1v1, 2v2, or 5v5 Arena Match
      startArenaTeamMatch(matchType = "2v2", selectedWeaponId = "mace") {
          sound.ensureContext();
          sound.playClick();
  
          if (online.role) online.close();
          this.mode = "arena";
          this.onlineRole = null;
          this.localFighter = this.player;
          this.matchType = matchType;
          this.isTeamMatch = true;
          this.botParams = getBotParamsForMode("normal");
  
          const user = auth.getUser();
          const roster = arena.generateTeamRoster(matchType, user, selectedWeaponId);
  
          // Build Blue Team (Player is always on Blue Team)
          this.blueTeam = roster.blueTeam.map((data) => {
              if (data.isPlayer) {
                  this.player.reset(data.x, data.facing, data.maxHp);
                  // Arena pick is the primary; the loadout's other weapon is the secondary
                  const second = user.secondaryWeapon !== selectedWeaponId ? user.secondaryWeapon : (user.equippedWeapon !== selectedWeaponId ? user.equippedWeapon : null);
                  this.player.setLoadout(selectedWeaponId, second);
                  this.player.setSkin(user.skinId || "steve");
                  this.player.setClass(user.classId || "normal");
                  this.player.setTeam("blue");
                  this.player.name = user.username || "Player";
                  this.player.isBotGame = false;
                  this.player.isPlayer = true;
                  return this.player;
              } else {
                  const fighter = new Fighter(true, data.id, data.name);
                  fighter.reset(data.x, data.facing, data.maxHp);
                  fighter.setWeapon(data.weaponId, {});
                  fighter.setSkin(data.skinId);
                  fighter.setTeam("blue");
                  return fighter;
              }
          });
  
          // Build Red Team (Opponents are on Red Team)
          this.redTeam = roster.redTeam.map((data) => {
              const fighter = new Fighter(true, data.id, data.name);
              fighter.reset(data.x, data.facing, data.maxHp);
              fighter.setWeapon(data.weaponId, {});
              fighter.setSkin(data.skinId);
              fighter.setTeam("red");
              return fighter;
          });
  
          // Initialize Bot AIs for all non-player fighters
          this.allBots = [];
          this.blueTeam.forEach(f => {
              if (f.isBot) {
                  const ai = new BotAI(f);
                  ai.setParams(this.botParams);
                  f._botAI = ai;
                  this.allBots.push({ fighter: f, ai });
              } else {
                  f._botAI = null;
              }
          });
          this.redTeam.forEach(f => {
              const ai = new BotAI(f);
              ai.setParams(this.botParams);
              f._botAI = ai;
              this.allBots.push({ fighter: f, ai });
          });
  
          this.allFighters = [...this.blueTeam, ...this.redTeam];
  
          this.arrowManager.reset();
          this.particles.reset();
          this.lastRewardInfo = null;
  
          // Reset match score & tiebreaker
          this.scoreRed = 0;
          this.scoreBlue = 0;
          this.matchFrames = 0;
          this.isTiebreaker = false;
          this.tiebreakerTimer = 0;
          this.tiebreakerRedDamage = 0;
          this.tiebreakerBlueDamage = 0;
          this.respawnQueue = [];
          this.highestJumper = null;
          this.winnerTeam = null;
  
          this.state = "play";
  
          if (this.uiCallbacks.onStateChanged) {
              this.uiCallbacks.onStateChanged(this.state);
          }
      }
  
      restartMatch() {
          sound.playClick();
          if (this.isTeamMatch) {
              this.startArenaTeamMatch(this.matchType, this.player.weaponId);
              return;
          }
  
          const maxHp = (this.mode === "practice") ? 1000 : (this.botParams.maxHP || 100);
          this.player.reset(150, 1, maxHp);
          this.bot.reset(650, -1, maxHp);
          this.botAI.reset();
          this.bot._botAI = this.botAI;
          this.allFighters = [this.player, this.bot];
          this.arrowManager.reset();
          this.particles.reset();
          this.lastRewardInfo = null;
  
          this.scoreRed = 0;
          this.scoreBlue = 0;
          this.matchFrames = 0;
          this.isTiebreaker = false;
          this.tiebreakerTimer = 0;
          this.tiebreakerRedDamage = 0;
          this.tiebreakerBlueDamage = 0;
          this.respawnQueue = [];
          this.highestJumper = null;
          this.winnerTeam = null;
  
          this.state = "play";
  
          if (this.uiCallbacks.onStateChanged) {
              this.uiCallbacks.onStateChanged(this.state);
          }
      }
  
      goHome() {
          sound.playClick();
          if (this.mode === "online") {
              online.close();
              this.onlineRole = null;
          }
          this.state = "menu";
          if (this.uiCallbacks.onStateChanged) {
              this.uiCallbacks.onStateChanged(this.state);
          }
      }
  
      togglePause() {
          // Online matches can't be paused: the other player is still playing
          if (this.mode === "online") return;
          if (this.state === "play") {
              this.state = "paused";
          } else if (this.state === "paused") {
              this.state = "play";
          }
          if (this.uiCallbacks.onStateChanged) {
              this.uiCallbacks.onStateChanged(this.state);
          }
      }
  
      // The bow aims at the mouse for whoever this browser controls
      usesMouseAim() {
          const f = this.localFighter;
          return this.state === "play" && this.mouse.active && f && f.weaponId === "bow" && f.hp > 0;
      }
  
      aimAngleFor(f) {
          return Math.atan2(this.mouse.y - (f.y + f.h / 2), this.mouse.x - (f.x + f.w / 2));
      }
  
      // Jump / slam / swap for whoever this browser controls (touch buttons use these too)
      localAction(action) {
          if (this.state !== "play") return;
          if (this.isOnlineGuest()) {
              online.send({ t: "act", a: action });
              return;
          }
          const f = this.localFighter;
          if (action === "jump") f.jump();
          if (action === "slam") f.slam();
          if (action === "swap") f.swapWeapon();
          if (action === "size") f.toggleSize();
      }
  
      // Space / left-click attack for the local fighter (bow shots go toward the mouse)
      localAttack() {
          const f = this.localFighter;
          const aim = this.usesMouseAim() ? this.aimAngleFor(f) : null;
          if (this.isOnlineGuest()) {
              online.send({ t: "act", a: "dash", aim });
              return;
          }
          f.aimAngle = aim;
          f.dash(null, true, null, this.arrowManager);
      }
  
      setupInputs() {
          const toArena = (e) => {
              const rect = this.canvas.getBoundingClientRect();
              if (!rect.width || !rect.height) return null;
              return {
                  x: (e.clientX - rect.left) * (this.renderer.width / rect.width),
                  y: (e.clientY - rect.top) * (this.renderer.height / rect.height)
              };
          };
  
          this.canvas.addEventListener("mousemove", (e) => {
              const p = toArena(e);
              if (!p) return;
              this.mouse.x = p.x;
              this.mouse.y = p.y;
              this.mouse.active = true;
          });
  
          // Tapping the arena on a touch screen aims there and attacks (like a click)
          this.canvas.addEventListener("touchstart", (e) => {
              if (this.state !== "play" || !e.touches.length) return;
              const p = toArena(e.touches[0]);
              if (p) {
                  this.mouse.x = p.x;
                  this.mouse.y = p.y;
                  this.mouse.active = true;
              }
              e.preventDefault();
              this.localAttack();
          }, { passive: false });
  
          // Left-click attacks like Space (the bow fires toward the mouse)
          this.canvas.addEventListener("mousedown", (e) => {
              if (e.button !== 0 || this.state !== "play") return;
              const f = this.localFighter;
              if (!f) return;
              const p = toArena(e);
              if (p) {
                  this.mouse.x = p.x;
                  this.mouse.y = p.y;
                  this.mouse.active = true;
              }
              e.preventDefault();
              this.localAttack();
          });
  
          window.addEventListener("keydown", (e) => {
              sound.ensureContext();
  
              // Never treat typing in a text field (room codes, names, pasted links) as game input
              const t = e.target;
              if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
  
              const gameKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyW", "KeyS", "KeyA", "KeyD"];
              if (gameKeys.includes(e.code) && this.state !== "menu") {
                  e.preventDefault();
              }
  
              const alreadyDown = this.keys[e.code];
              this.keys[e.code] = true;
              this.keys[e.keyCode] = true;
  
              if (alreadyDown) return;
  
              // Global Shortcuts
              if (e.code === "KeyM") {
                  sound.toggleMute();
                  if (this.uiCallbacks.onMuteToggled) this.uiCallbacks.onMuteToggled(sound.muted);
                  return;
              }
  
              if (e.code === "Escape") {
                  this.togglePause();
                  return;
              }
  
              // Menu Keys
              if (this.state === "menu") {
                  const launch = (mode) => {
                      if (this.uiCallbacks.onStartModeRequested) {
                          this.uiCallbacks.onStartModeRequested(mode);
                      } else {
                          this.startGame(mode);
                      }
                  };
                  if (e.code === "KeyT") launch("practice");
                  if (e.code === "KeyE") launch("easy");
                  if (e.code === "KeyN") launch("normal");
                  if (e.code === "KeyP") launch("pro");
                  if (e.code === "KeyG") launch("god");
                  if (e.code === "Digit2") launch("pvp");
                  return;
              }
  
              // Match Restart / Home keys
              if (this.state === "gameover" || this.player.hp <= 0 || (this.isTeamMatch ? false : this.bot.hp <= 0)) {
                  if (e.code === "KeyR") {
                      if (this.uiCallbacks.onRestartRequested) {
                          this.uiCallbacks.onRestartRequested();
                      } else {
                          this.restartMatch();
                      }
                      return;
                  }
                  if (e.code === "KeyH") {
                      if (this.uiCallbacks.onHomeRequested) {
                          this.uiCallbacks.onHomeRequested();
                      } else {
                          this.goHome();
                      }
                      return;
                  }
              }
  
              if (this.state !== "play") return;
  
              // Online guest: send actions to the host, which runs the match
              if (this.isOnlineGuest()) {
                  if (e.code === "ArrowUp" || e.code === "KeyW") online.send({ t: "act", a: "jump" });
                  if (e.code === "Space") this.localAttack();
                  if (e.code === "ArrowDown" || e.code === "KeyS") online.send({ t: "act", a: "slam" });
                  if (e.code === "KeyQ") online.send({ t: "act", a: "swap" });
                  if (e.code === "KeyB") online.send({ t: "act", a: "size" });
                  return;
              }
  
              // In local PvP the arrow keys belong to Player 2 only
              const p1Arrows = this.mode !== "pvp";
  
              // --- Player 1 Jump ---
              if (e.code === "KeyW" || (p1Arrows && e.code === "ArrowUp")) {
                  this.player.jump();
              }
  
              // --- Swap between your two loadout weapons ---
              if (e.code === "KeyQ") {
                  this.localFighter.swapWeapon();
              }
  
              // --- Buddha class: grow big / shrink ---
              if (e.code === "KeyB") {
                  this.localFighter.toggleSize();
              }
  
              // --- Player 1 Weapon Attack / Dash / Bow Shoot ---
              if (e.code === "Space") {
                  this.localAttack();
              }
  
              // --- Player 1 Slam ---
              if (e.code === "KeyS" || (p1Arrows && e.code === "ArrowDown")) {
                  this.player.slam();
              }
  
              // --- Local PvP: Player 2 controls ---
              if (this.mode === "pvp") {
                  if (e.code === "ArrowUp") {
                      this.bot.jump();
                  }
                  if (e.code === "Enter" || e.code === "ShiftRight") {
                      this.bot.dash(null, true, null, this.arrowManager);
                  }
                  if (e.code === "ArrowDown") {
                      this.bot.slam();
                  }
              }
          });
  
          window.addEventListener("keyup", (e) => {
              this.keys[e.code] = false;
              this.keys[e.keyCode] = false;
          });
  
          window.addEventListener("resize", () => {
              this.renderer.setupDPI();
          });
      }
  
      handleContinuousInput() {
          if (this.state !== "play") return;
  
          // Online guest: stream left/right held state to the host
          if (this.isOnlineGuest()) {
              const left = !!(this.keys["KeyA"] || this.keys["ArrowLeft"]);
              const right = !!(this.keys["KeyD"] || this.keys["ArrowRight"]);
              if (left !== this.sentInput.left || right !== this.sentInput.right) {
                  this.sentInput = { left, right };
                  online.send({ t: "input", l: left, r: right });
              }
              return;
          }
  
          // Player 1 Continuous Horizontal Movement
          if (this.player.stun <= 0 && !this.player.dashing) {
              const left = this.keys["KeyA"] || (this.mode !== "pvp" && this.keys["ArrowLeft"]);
              const right = this.keys["KeyD"] || (this.mode !== "pvp" && this.keys["ArrowRight"]);
  
              const speed = PLAYER_MOVE_SPEED * this.player.moveSpeedMult();
              if (left && !right) {
                  this.player.xVel = -speed;
                  this.player.facing = -1;
              } else if (right && !left) {
                  this.player.xVel = speed;
                  this.player.facing = 1;
              } else {
                  this.player.xVel *= 0.55;
                  if (Math.abs(this.player.xVel) < 0.1) this.player.xVel = 0;
              }
          }
  
          // Online host: move each guest's fighter from their streamed left/right input
          if (this.mode === "online") {
              for (const f of this.allFighters) {
                  if (!f.netPeer || f.netPeer === "host" || f.hp <= 0 || f.stun > 0 || f.dashing) continue;
                  const input = this.remoteInputs[f.netPeer] || {};
                  if (input.left && !input.right) {
                      f.xVel = -PLAYER_MOVE_SPEED * f.moveSpeedMult();
                      f.facing = -1;
                  } else if (input.right && !input.left) {
                      f.xVel = PLAYER_MOVE_SPEED * f.moveSpeedMult();
                      f.facing = 1;
                  } else {
                      f.xVel *= 0.55;
                      if (Math.abs(f.xVel) < 0.1) f.xVel = 0;
                  }
              }
          }
  
          // Player 2 Input (local PvP keys)
          if (this.mode === "pvp") {
              if (this.bot.stun <= 0 && !this.bot.dashing) {
                  const left = this.keys["ArrowLeft"];
                  const right = this.keys["ArrowRight"];
  
                  const speed = PLAYER_MOVE_SPEED * this.bot.moveSpeedMult(); // Same as Player 1 so duels are fair
                  if (left && !right) {
                      this.bot.xVel = -speed;
                      this.bot.facing = -1;
                  } else if (right && !left) {
                      this.bot.xVel = speed;
                      this.bot.facing = 1;
                  } else {
                      this.bot.xVel *= 0.55;
                      if (Math.abs(this.bot.xVel) < 0.1) this.bot.xVel = 0;
                  }
              }
          }
      }
  
      // Void Walker: every 7-20s, teleport high above a random living enemy
      updateVoidWalkers() {
          for (const f of this.allFighters) {
              if (f.classId !== "void" || f.hp <= 0) continue;
              if (--f.voidTimer > 0) continue;
              f.voidTimer = f.nextVoidDelay();
              const foes = this.allFighters.filter(o => o.team !== f.team && o.hp > 0);
              if (!foes.length) continue;
              const target = foes[Math.floor(Math.random() * foes.length)];
              this.particles.addDust(f.x + f.w / 2, f.y + f.h / 2, 12);
              f.x = Math.max(0, Math.min(ARENA_CONFIG.width - f.w, target.x + target.w / 2 - f.w / 2));
              f.y = Math.max(0, target.y - (5 + Math.random()) * f.h);
              f.xVel = 0;
              f.yVel = 0;
              f.dashing = false;
              f.slamming = false;
              f.onGround = false;
              f.coyoteTimer = 0;
              this.particles.addShockwave(f.x + f.w / 2, f.y + f.h / 2, 30, "#b45cff", 3);
          }
      }
  
      updateBolts() {
          const bolts = this.combat.bolts;
          for (let i = bolts.length - 1; i >= 0; i--) {
              if (--bolts[i].life <= 0) bolts.splice(i, 1);
          }
      }
  
      // Difficulty multipliers only apply to the single opponent bot in solo modes.
      // Arena teams, local PvP and online play are always even.
      isDifficultyBot(f) {
          return f === this.bot && !this.isTeamMatch && this.mode !== "pvp" && this.mode !== "online";
      }
  
      // damageMult = how hard the bot hits, damageTaken = how much damage the bot takes
      hitDamageMult(attacker, defender) {
          let mult = 1;
          mult *= attacker.classDamageMult(); // invisible Shadow / big Buddha
          if (this.isDifficultyBot(attacker)) mult *= this.botParams.damageMult ?? 1;
          if (this.isDifficultyBot(defender)) mult *= this.botParams.damageTaken ?? 1;
          return mult;
      }
  
      // stunMult = how long the bot stays stunned when hit
      hitStunMult(defender) {
          return this.isDifficultyBot(defender) ? (this.botParams.stunMult ?? 1) : 1;
      }
  
      update() {
          if (this.state !== "play") {
              this.particles.update();
              return;
          }
  
          if (this.isOnlineGuest()) {
              // The host simulates; we only animate effects and send our input
              this.handleContinuousInput();
              this.particles.update();
              return;
          }
  
          this.matchFrames++;
          this.handleContinuousInput();
  
          // Update all AI fighters (in-place zero allocation)
          for (let i = 0; i < this.allBots.length; i++) {
              const { fighter, ai } = this.allBots[i];
              if (fighter.hp <= 0) continue;
  
              const opposingTeam = fighter.team === "red" ? this.blueTeam : this.redTeam;
              let nearest = null;
              let minDist = Infinity;
              for (let j = 0; j < opposingTeam.length; j++) {
                  const t = opposingTeam[j];
                  // Bots lose track of invisible Shadows, and can't see anyone while blinded
                  if (t.hp > 0 && !t.invis && fighter.blindT <= 0) {
                      const dist = Math.abs(t.x - fighter.x);
                      if (dist < minDist) {
                          minDist = dist;
                          nearest = t;
                      }
                  }
              }
  
              if (nearest) {
                  ai.update(nearest);
  
                  // If bot has bow and is in line with target, shoot arrow
                  if (fighter.weaponId === "bow" && fighter.arrowCooldown <= 0 && Math.abs(nearest.y - fighter.y) < 50) {
                      fighter.dash(null, true, null, this.arrowManager);
                  }
              }
          }
  
          // Update physics for all fighters
          for (let i = 0; i < this.allFighters.length; i++) {
              const f = this.allFighters[i];
              const landed = f.updatePhysics(PLATFORMS_CONFIG, this.particles, this.arrowManager);
  
              // Ground slam on landing
              if (landed && f.slamming) {
                  f.slamming = false;
                  f.yVel = 0;
                  f.onGround = true;
                  f.dashReady = true;
                  f.dashCooldown = 0;
                  f.stun = 0;
                  f.hitCooldown = 0;
                  f.jumpsLeft = 2;
                  f.groundSlamCounted = false;
  
                  const opposingTeam = f.team === "red" ? this.blueTeam : (f.team === "blue" ? this.redTeam : (f.isPlayer ? this.blueTeam : this.redTeam));
                  for (let j = 0; j < opposingTeam.length; j++) {
                      const def = opposingTeam[j];
                      this.combat.checkGroundSlam(f, def, this.hitDamageMult(f, def), this.hitStunMult(def), (dmg, atk, defender) => {
                          if (defender._botAI) defender._botAI.onHit();
                          if (dmg >= 50) this.flash = Math.max(this.flash, 0.3);
                          if (this.isTiebreaker) {
                              if (atk.team === "red" || (!atk.team && atk === this.player)) {
                                  this.tiebreakerRedDamage += dmg;
                              } else {
                                  this.tiebreakerBlueDamage += dmg;
                              }
                          }
                      });
                  }
              }
          }
  
          // Decisive push-separation between overlapping fighters so models never fuse together
          for (let i = 0; i < this.allFighters.length; i++) {
              const f1 = this.allFighters[i];
              if (f1.hp <= 0 || f1.dashing) continue;
              for (let j = i + 1; j < this.allFighters.length; j++) {
                  const f2 = this.allFighters[j];
                  if (f2.hp <= 0 || f2.dashing) continue;
  
                  const dx = (f2.x + f2.w / 2) - (f1.x + f1.w / 2);
                  const dy = Math.abs(f2.y - f1.y);
                  if (Math.abs(dx) < 24 && dy < 32) {
                      const overlap = 24 - Math.abs(dx);
                      const push = Math.max(1.2, overlap * 0.4);
                      if (dx > 0) {
                          f1.x = Math.max(0, f1.x - push);
                          f2.x = Math.min(ARENA_CONFIG.width - f2.w, f2.x + push);
                      } else if (dx < 0) {
                          f1.x = Math.min(ARENA_CONFIG.width - f1.w, f1.x + push);
                          f2.x = Math.max(0, f2.x - push);
                      } else {
                          f1.x = Math.max(0, f1.x - push);
                          f2.x = Math.min(ARENA_CONFIG.width - f2.w, f2.x + push);
                      }
                  }
              }
          }
  
          // Update Arrow Projectiles
          this.arrowManager.update(PLATFORMS_CONFIG, this.allFighters, (hitFighter, arrow, dmg) => {
              sound.playDashHit();
              const arrowDmg = dmg || arrow.damage || 30;
              this.particles.addHitSparks(arrow.x, arrow.y, 10, "#e74c3c");
              this.particles.addDamageText(hitFighter.x + hitFighter.w / 2, hitFighter.y, arrowDmg, false);
              this.particles.triggerShake(4, 6);
  
              if (hitFighter._botAI) hitFighter._botAI.onHit();
              const arrowShooter = this.allFighters.find(f => f.id === arrow.ownerId);
              if (arrowShooter) this.combat.applyHitEffects(arrowShooter, hitFighter);
  
              if (this.isTiebreaker) {
                  const shooter = arrowShooter;
                  if (shooter) {
                      if (shooter.team === "red" || (!shooter.team && shooter === this.player)) {
                          this.tiebreakerRedDamage += arrowDmg;
                      } else {
                          this.tiebreakerBlueDamage += arrowDmg;
                      }
                  }
              }
          });
  
          // Resolve mid-air slams and dash collisions between opposing teams (zero temporary array allocation)
          for (let i = 0; i < this.redTeam.length; i++) {
              const atk = this.redTeam[i];
              if (atk.hp <= 0) continue;
              for (let j = 0; j < this.blueTeam.length; j++) {
                  const def = this.blueTeam[j];
                  if (def.hp <= 0) continue;
  
                  this.combat.checkAirSlam(atk, def, this.hitDamageMult(atk, def), this.hitStunMult(def), (dmg) => {
                      if (def._botAI) def._botAI.onHit();
                      if (dmg >= 50) this.flash = Math.max(this.flash, 0.3);
                      if (this.isTiebreaker) this.tiebreakerRedDamage += dmg;
                  });
                  this.combat.checkDashHit(atk, def, this.hitDamageMult(atk, def), this.hitStunMult(def), (dmg) => {
                      if (def._botAI) def._botAI.onHit();
                      if (dmg >= 50) this.flash = Math.max(this.flash, 0.3);
                      if (this.isTiebreaker) this.tiebreakerRedDamage += dmg;
                  });
              }
          }
  
          for (let i = 0; i < this.blueTeam.length; i++) {
              const atk = this.blueTeam[i];
              if (atk.hp <= 0) continue;
              for (let j = 0; j < this.redTeam.length; j++) {
                  const def = this.redTeam[j];
                  if (def.hp <= 0) continue;
  
                  this.combat.checkAirSlam(atk, def, this.hitDamageMult(atk, def), this.hitStunMult(def), (dmg) => {
                      if (def._botAI) def._botAI.onHit();
                      if (dmg >= 50) this.flash = Math.max(this.flash, 0.3);
                      if (this.isTiebreaker) this.tiebreakerBlueDamage += dmg;
                  });
                  this.combat.checkDashHit(atk, def, this.hitDamageMult(atk, def), this.hitStunMult(def), (dmg) => {
                      if (def._botAI) def._botAI.onHit();
                      if (dmg >= 50) this.flash = Math.max(this.flash, 0.3);
                      if (this.isTiebreaker) this.tiebreakerBlueDamage += dmg;
                  });
              }
          }
  
          this.updateVoidWalkers();
          this.updateBolts();
  
          // Particles & Camera Shake
          this.particles.update();
  
          // 1. Process Fighter Eliminations & Score Updates
          for (let i = 0; i < this.allFighters.length; i++) {
              const f = this.allFighters[i];
              if (f.hp <= 0 && !f.isDead) {
                  f.isDead = true;
                  this.flash = 0.55;
                  f.stats.deaths = (f.stats.deaths || 0) + 1;
                  sound.playDashHit();
                  this.particles.addHitSparks(f.x + f.w / 2, f.y + f.h / 2, 22, "#e74c3c");
                  this.particles.addDust(f.x + f.w / 2, f.y + f.h / 2, 16);
  
                  const isRedFighter = f.team === "red" || (!f.team && f !== this.player);
                  if (isRedFighter) {
                      this.scoreBlue++;
                      this.particles.addFloatingText(f.x + f.w / 2, f.y - 12, `${f.name} ELIMINATED!`, "#ff2244", true, 1.3);
                      const killer = this.findKiller(f, this.blueTeam);
                      if (killer && killer.stats) killer.stats.kills++;
  
                      // In single-player bot games & 1v1 duels, killing the bot immediately wins the match!
                      if (!this.isTeamMatch) {
                          this.finishMatch(true);
                          return;
                      }
                  } else {
                      this.scoreRed++;
                      this.particles.addFloatingText(f.x + f.w / 2, f.y - 12, `${f.name} ELIMINATED!`, "#ff2244", true, 1.3);
                      const killer = this.findKiller(f, this.redTeam);
                      if (killer && killer.stats) killer.stats.kills++;
  
                      // In single-player bot games, player death immediately ends the match!
                      if (!this.isTeamMatch) {
                          this.finishMatch(false);
                          return;
                      }
                  }
  
                  // Check 10-10 Sudden Death Tiebreaker Trigger (Arena Team Matches)
                  if (this.scoreRed === 10 && this.scoreBlue === 10 && !this.isTiebreaker) {
                      this.isTiebreaker = true;
                      this.tiebreakerTimer = 10 * 60; // 10.0 seconds (600 frames)
                      this.tiebreakerRedDamage = 0;
                      this.tiebreakerBlueDamage = 0;
                      sound.playDoubleJump();
                      this.particles.addShockwave(400, 200, 120, "#f1c40f", 5);
                  }
  
                  // Check Win Conditions (First to 11 Kills in Arena)
                  if (!this.isTiebreaker) {
                      if (this.scoreBlue >= 11 && this.scoreRed < 10) {
                          this.finishMatch(true); // Blue (Player) wins!
                          return;
                      } else if (this.scoreRed >= 11 && this.scoreBlue < 10) {
                          this.finishMatch(false); // Red (Opponent) wins
                          return;
                      }
                  } else {
                      if (this.scoreBlue >= 11) {
                          this.finishMatch(true); // Blue wins
                          return;
                      } else if (this.scoreRed >= 11) {
                          this.finishMatch(false); // Red wins
                          return;
                      }
                  }
  
                  // Schedule fighter respawn for Arena Team Matches
                  const spawnX = isRedFighter ? (600 + Math.random() * 80) : (120 + Math.random() * 80);
                  const spawnY = 160;
                  this.respawnQueue.push({ fighter: f, timer: 60, spawnX, spawnY });
              }
          }
  
          // 2. Process Respawn Queue
          for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
              const item = this.respawnQueue[i];
              item.timer--;
              if (item.timer <= 0) {
                  item.fighter.respawn(item.spawnX, item.spawnY);
                  this.particles.addDust(item.fighter.x + 12, item.fighter.y + 24, 15);
                  this.particles.addFloatingText(item.fighter.x + 12, item.fighter.y - 10, "RESPAWNED!", "#2ecc71");
                  this.respawnQueue.splice(i, 1);
              }
          }
  
          if (this.mode === "online" && this.onlineRole === "host") {
              online.send(this.buildSnapshot());
          }
  
          // 3. Process Tiebreaker Timer (10 Seconds, Whoever Dealt Most Damage Wins)
          if (this.isTiebreaker) {
              this.tiebreakerTimer--;
              if (this.tiebreakerTimer <= 0) {
                  // 10 seconds expired! Compare damage dealt
                  if (this.tiebreakerBlueDamage > this.tiebreakerRedDamage) {
                      this.finishMatch(true);
                  } else if (this.tiebreakerRedDamage > this.tiebreakerBlueDamage) {
                      this.finishMatch(false);
                  } else {
                      this.finishMatch(this.scoreBlue >= this.scoreRed);
                  }
                  return;
              }
          }
      }
  
      // Whoever landed the final hit gets the KO (falls back to the nearest living opponent)
      findKiller(victim, opposingTeam) {
          const hitter = victim.lastHitBy;
          victim.lastHitBy = null;
          if (hitter && opposingTeam.includes(hitter)) return hitter;
          let nearest = null;
          let best = Infinity;
          for (const o of opposingTeam) {
              if (o.hp <= 0) continue;
              const d = Math.abs(o.x - victim.x);
              if (d < best) { best = d; nearest = o; }
          }
          return nearest;
      }
  
      finishMatch(isPlayerWin) {
          this.state = "gameover";
          if (this.mode === "online") {
              // isPlayerWin is from this browser's point of view
              const otherTeam = this.localFighter.team === "blue" ? "red" : "blue";
              this.winnerTeam = isPlayerWin ? this.localFighter.team : otherTeam;
          } else {
              this.winnerTeam = isPlayerWin ? "blue" : "red";
          }
          if (isPlayerWin) sound.playWin(); else sound.playLoss();
  
          // Calculate missed mace slams, missed dashes, and missed arrows for all fighters
          this.allFighters.forEach(f => {
              f.stats.slamsMissed = Math.max(0, (f.stats.slamsAttempted || 0) - (f.stats.slamsLanded || 0));
              f.stats.dashesMissed = Math.max(0, (f.stats.dashesAttempted || 0) - (f.stats.dashesLanded || 0));
              f.stats.arrowsMissed = Math.max(0, (f.stats.arrowsAttempted || 0) - (f.stats.arrowsHit || 0));
          });
  
          // Determine who jumped the highest (Altitude Champion 👑)
          let highest = this.allFighters[0];
          for (let i = 1; i < this.allFighters.length; i++) {
              if ((this.allFighters[i].stats.maxHeight || 0) > (highest.stats.maxHeight || 0)) {
                  highest = this.allFighters[i];
              }
          }
          this.highestJumper = highest;
  
          // Scale reward economy
          if (this.mode === "online") {
              this.lastRewardInfo = null; // friendly matches don't change gold or rank
          } else if (this.isTeamMatch) {
              this.lastRewardInfo = auth.recordArenaMatchResult(isPlayerWin, this.matchType, this.player.stats);
          } else {
              if (this.mode !== "pvp" && this.mode !== "online") {
                  this.lastRewardInfo = auth.recordMatchResult(isPlayerWin, this.mode, this.player.stats);
              }
          }
  
          if (this.mode === "online" && this.onlineRole === "host") {
              online.send({ ...this.buildSnapshot(), a: [] });
              online.send({ t: "end", w: this.winnerTeam, stats: this.allFighters.map(f => f.stats) });
          }
  
          if (this.uiCallbacks.onStateChanged) {
              this.uiCallbacks.onStateChanged(this.state);
          }
          if (this.uiCallbacks.onMatchFinished) {
              this.uiCallbacks.onMatchFinished(this);
          }
      }
  
      render() {
          const ctx = this.renderer.ctx;
  
          ctx.save();
          ctx.translate(this.particles.cameraShake.x, this.particles.cameraShake.y);
  
          this.renderer.drawBackground();
          this.renderer.drawPlatforms();
  
          const botMeta = this.mode === "online"
              ? { ...(MODE_METADATA.pvp || MODE_METADATA.normal), name: "Online Duel" }
              : (MODE_METADATA[this.mode] || MODE_METADATA.normal);
          const botColor = botMeta.color;
  
          // Ground shadows under fighters
          for (let i = 0; i < this.allFighters.length; i++) {
              if (!this.isHiddenFromViewer(this.allFighters[i])) this.renderer.drawFighterShadow(this.allFighters[i]);
          }
  
          // Render all fighters
          const isMultiplayer = this.isTeamMatch || this.mode === "pvp" || this.mode === "online";
          for (let i = 0; i < this.allFighters.length; i++) {
              const f = this.allFighters[i];
              if (this.isHiddenFromViewer(f)) continue; // invisible Shadow on the other team
              if (f.invis && f.hp > 0) {
                  // You and your teammates see an invisible Shadow as a faint ghost
                  this.renderer.drawFighter(f, botColor, isMultiplayer, 0.3);
              } else {
                  this.renderer.drawFighter(f, botColor, isMultiplayer);
              }
              this.renderer.drawStatusEffects(f);
              const indR = f.team === "red" ? 255 : (f.team === "blue" ? 30 : 46);
              const indG = f.team === "red" ? 71 : (f.team === "blue" ? 144 : 204);
              const indB = f.team === "red" ? 87 : (f.team === "blue" ? 255 : 113);
              this.renderer.drawOffscreenIndicator(f, indR, indG, indB, f.name);
          }
  
          // Lightning class bolts
          for (const bolt of this.combat.bolts) this.renderer.drawLightningBolt(bolt);
  
          // Render Flying Arrows
          this.arrowManager.draw(ctx);
  
          // Particle FX & floating combat text
          this.particles.draw(ctx);
  
          // Blinded by a Potionmaster: everything goes dark except yourself
          const viewer = this.localFighter;
          if (viewer && viewer.blindT > 0 && viewer.hp > 0 && this.state === "play" && this.mode !== "pvp") {
              ctx.fillStyle = "rgba(0, 0, 0, 0.94)";
              ctx.fillRect(-20, -20, this.renderer.width + 40, this.renderer.height + 40);
              this.renderer.drawFighter(viewer, botColor, isMultiplayer);
              this.renderer.drawStatusEffects(viewer);
          }
  
          // HUD & Controls Hint with Score and Tiebreaker Status
          if (this.isTeamMatch) {
              this.renderer.drawTeamArenaHUD(
                  this.redTeam, this.blueTeam, this.matchType,
                  this.scoreRed, this.scoreBlue,
                  this.isTiebreaker, this.tiebreakerTimer,
                  this.tiebreakerRedDamage, this.tiebreakerBlueDamage
              );
          } else {
              let p1Label = this.mode === "pvp" ? "PLAYER 1" : (this.playerName || "YOU");
              let p2Label = this.mode === "pvp" ? "PLAYER 2" : (this.bot.name || "BOT");
              if (this.mode === "online") {
                  p1Label = this.player.name + (this.localFighter === this.player ? " (YOU)" : "");
                  p2Label = this.bot.name + (this.localFighter === this.bot ? " (YOU)" : "");
              }
              this.renderer.drawHUD(
                  this.player, this.bot, botColor, botMeta.name, p1Label, p2Label,
                  this.scoreRed, this.scoreBlue,
                  this.isTiebreaker, this.tiebreakerTimer,
                  this.tiebreakerRedDamage, this.tiebreakerBlueDamage,
                  this.isTeamMatch
              );
          }
  
          if (this.state === "play") {
              this.renderer.drawLoadoutHotbar(this.localFighter);
              this.renderer.drawClassStatus(this.localFighter);
          }
  
          // Hit / KO flash, fading out
          if (this.flash > 0) {
              this.renderer.drawFlash(this.flash);
              this.flash = Math.max(0, this.flash - 0.04);
          }
  
          // Bow aim line toward the mouse
          const aiming = this.usesMouseAim();
          const cursor = aiming ? "crosshair" : "";
          if (this.canvas.style.cursor !== cursor) this.canvas.style.cursor = cursor;
          if (aiming) this.drawAimLine(ctx, this.localFighter);
  
          this.renderer.drawControlsHint(this.mode === "pvp", this.matchFrames);
  
          // Game Over: the Smash-style results screen is an HTML overlay (see UIManager.openResultsScreen)
  
          ctx.restore();
      }
  
      drawAimLine(ctx, f) {
          const angle = this.aimAngleFor(f);
          const cx = f.x + f.w / 2;
          const cy = f.y + f.h / 2;
          const ready = f.arrowCooldown <= 0;
          ctx.save();
          ctx.fillStyle = ready ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.3)";
          // Dotted pixel line, like a Minecraft bow trajectory hint
          for (let d = 22; d <= 70; d += 8) {
              ctx.fillRect(Math.round(cx + Math.cos(angle) * d) - 1, Math.round(cy + Math.sin(angle) * d) - 1, 3, 3);
          }
          ctx.restore();
      }
  
      start() {
          let lastTime = performance.now();
          let accumulator = 0;
          // Physics steps per second: 60 at GAME_SPEED 1, fewer when the game is slowed down
          const FIXED_DT = 1000 / (60 * GAME_SPEED);
  
          const step = (currentTime) => {
              let frameTime = currentTime - lastTime;
              if (frameTime > 100) frameTime = 100; // Cap to avoid spiral of death on backgrounding
              if (frameTime < 0) frameTime = 0;
              lastTime = currentTime;
  
              accumulator += frameTime;
              // Guard each step, so a single runtime error can never stop the loop and freeze the game.
              try {
                  while (accumulator >= FIXED_DT) {
                      this.update();
                      accumulator -= FIXED_DT;
                  }
              } catch (err) {
                  accumulator = 0;
                  console.error("Game update error:", err);
              }
              try {
                  this.render();
              } catch (err) {
                  console.error("Game render error:", err);
              }
          };
  
          const loop = (currentTime) => {
              this.animFrameId = requestAnimationFrame(loop);
              step(currentTime);
          };
          this.animFrameId = requestAnimationFrame(loop);
  
          // Browsers pause requestAnimationFrame in background tabs. Keep online matches
          // running (and in sync for the other player) when this tab is hidden.
          this.hiddenTimer = setInterval(() => {
              if (document.hidden && this.mode === "online") step(performance.now());
          }, FIXED_DT);
      }
  
      stop() {
          if (this.hiddenTimer) {
              clearInterval(this.hiddenTimer);
              this.hiddenTimer = null;
          }
          if (this.animFrameId) {
              cancelAnimationFrame(this.animFrameId);
              this.animFrameId = null;
          }
      }
  }
  

  // ===== ui.js =====
  // ==========================================
  // SPEAR-MACE PVP - UI & Menu System
  // Manages Home Screen, Mode Selection, Modals, Custom Bot Sandbox,
  // Google Sign-In, Username / Profile Page, Armory, Skins,
  // Arena Hub (1v1, 2v2, 5v5), and National Obsidian Leaderboard
  // ==========================================
  
  
  class UIManager {
      constructor(game) {
          this.game = game;
  
          // Modals
          this.menuOverlay = document.getElementById("menu-overlay");
          this.pauseModal = document.getElementById("pause-modal");
          this.customBotModal = document.getElementById("custom-bot-modal");
          this.statsModal = document.getElementById("stats-modal");
          this.authModal = document.getElementById("auth-modal");
          this.weaponsModal = document.getElementById("weapons-modal");
          this.skinsModal = document.getElementById("skins-modal");
          this.arenaModal = document.getElementById("arena-modal");
          this.leaderboardModal = document.getElementById("leaderboard-modal");
          this.queueModal = document.getElementById("queue-modal");
          this.socialModal = document.getElementById("social-modal");
          this.resignModal = document.getElementById("resign-modal");
          this.matchmakingModal = document.getElementById("matchmaking-modal");
  
          // Top Navigation & Action Buttons
          this.muteBtn = document.getElementById("btn-mute");
          this.styleBtn = document.getElementById("btn-style");
          this.homeBtn = document.getElementById("btn-home");
          this.restartBtn = document.getElementById("btn-restart");
          this.pauseBtn = document.getElementById("btn-pause");
          this.statsBtn = document.getElementById("btn-stats");
          this.userProfileBtn = document.getElementById("btn-user-profile");
          this.armoryBtn = document.getElementById("btn-armory");
          this.skinsBtn = document.getElementById("btn-skins");
          this.arenaBtn = document.getElementById("btn-arena");
          this.leaderboardBtn = document.getElementById("btn-leaderboard");
          this.socialBtn = document.getElementById("btn-social");
          this.goldDisplay = document.getElementById("gold-display");
          this.downloadBtn = document.getElementById("btn-download");
  
          this.modeCardsContainer = document.getElementById("mode-cards");
          this.modeCardsVersus = document.getElementById("mode-cards-versus");
          this.carSlide = 0;
          this.touchControls = document.getElementById("touch-controls");
  
          // Arena Matchmaking State
          this.selectedArenaMode = "2v2"; // "1v1", "2v2", "5v5"
          this.selectedArenaWeapon = "mace";
          this.queueTimer = 0;
          this.queueInterval = null;
          this.matchmakingInterval = null;
  
          this.init();
      }
  
      init() {
          this.renderModeCards();
          this.setupCarousel();
          this.setupEventListeners();
          this.setupCustomBotForm();
          this.setupAuthUI();
          this.setupInventoryUI();
          this.setupArmoryUI();
          this.setupSkinsUI();
          this.setupArenaUI();
          this.setupResultsUI();
          this.handleInviteLinkOnLoad();
          this.setupSocialUI();
          this.setupTouchButtons();
          this.detectTouchDevice();
      }
  
      // Home screen carousel: Home -> Bot Battles -> Versus & Sandbox -> Arena
      setupCarousel() {
          this.carTrack = document.getElementById("car-track");
          this.carSlides = this.carTrack ? this.carTrack.querySelectorAll(".car-slide") : [];
          this.carTitle = document.getElementById("car-title");
          this.carDots = document.getElementById("car-dots");
          const prev = document.getElementById("car-prev");
          const next = document.getElementById("car-next");
          if (!this.carTrack) return;
  
          if (this.carDots) {
              this.carDots.innerHTML = "";
              this.carSlides.forEach((_, i) => {
                  const d = document.createElement("span");
                  d.className = "car-dot";
                  d.addEventListener("click", () => this.goToSlide(i));
                  this.carDots.appendChild(d);
              });
          }
  
          if (prev) prev.addEventListener("click", () => this.goToSlide(this.carSlide - 1));
          if (next) next.addEventListener("click", () => this.goToSlide(this.carSlide + 1));
  
          window.addEventListener("keydown", (e) => {
              if (this.menuOverlay.classList.contains("hidden")) return;
              if (document.querySelector(".modal-backdrop:not(.hidden)")) return;
              if (e.key === "ArrowRight") this.goToSlide(this.carSlide + 1);
              else if (e.key === "ArrowLeft") this.goToSlide(this.carSlide - 1);
          });
  
          this.goToSlide(0, true);
      }
  
      goToSlide(index, silent = false) {
          if (!this.carTrack) return;
          const max = this.carSlides.length - 1;
          const i = Math.max(0, Math.min(max, index));
          this.carSlide = i;
          this.carTrack.style.transform = `translateX(${-i * 100}%)`;
          if (this.carTitle) this.carTitle.textContent = this.carSlides[i].dataset.title || "";
          if (this.carDots) {
              [...this.carDots.children].forEach((d, k) => d.classList.toggle("active", k === i));
          }
          const prev = document.getElementById("car-prev");
          const next = document.getElementById("car-next");
          if (prev) prev.disabled = i === 0;
          if (next) next.disabled = i === max;
          if (!silent) sound.playClick();
      }
  
      renderModeCards() {
          if (!this.modeCardsContainer) return;
          this.modeCardsContainer.innerHTML = "";
          if (this.modeCardsVersus) this.modeCardsVersus.innerHTML = "";
  
          // Local 2-Player has its own big button on the home screen
          const modes = ["practice", "easy", "normal", "pro", "god", "custom"];
          const versusModes = [];
  
          modes.forEach((modeKey) => {
              const meta = MODE_METADATA[modeKey];
              if (!meta) return;
  
              const card = document.createElement("div");
              card.className = `mode-card mode-${modeKey}`;
              card.innerHTML = `
                  <span class="card-badge" style="background:${meta.rgb}">${meta.difficultyLabel || meta.badge}</span>
                  <h3 class="card-title">${meta.name.replace(" Mode", "")}</h3>
                  <p class="card-sub">${meta.sub}</p>
              `;
  
              card.addEventListener("click", () => {
                  if (modeKey === "custom") {
                      this.openCustomBotModal();
                  } else {
                      this.launchMatchWithLoading(modeKey);
                  }
              });
  
              const target = (versusModes.includes(modeKey) && this.modeCardsVersus) ? this.modeCardsVersus : this.modeCardsContainer;
              target.appendChild(card);
          });
      }
  
      setupEventListeners() {
          // Retro button press animation for every button
          document.addEventListener("click", (e) => {
              const b = e.target.closest("button, .btn-ctrl, .mode-card, .home-arena-banner, .home-profile-banner");
              if (!b || b.disabled) return;
              b.classList.remove("mc-press");
              void b.offsetWidth;
              b.classList.add("mc-press");
              setTimeout(() => b.classList.remove("mc-press"), 220);
          });
  
          // Sound mute toggle
          if (this.muteBtn) {
              this.muteBtn.addEventListener("click", () => {
                  const isMuted = sound.toggleMute();
                  this.updateMuteButton(isMuted);
              });
              this.updateMuteButton(sound.muted);
          }
  
          // Theme / Biome Toggle (Overworld -> Nether -> End)
          // Settings dropdown in the header
          const settingsBtn = document.getElementById("btn-settings");
          const settingsMenu = document.getElementById("settings-menu");
          if (settingsBtn && settingsMenu) {
              const setOpen = (open) => {
                  settingsMenu.classList.toggle("hidden", !open);
                  settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
              };
              settingsBtn.addEventListener("click", (e) => {
                  e.stopPropagation();
                  setOpen(settingsMenu.classList.contains("hidden"));
              });
              document.addEventListener("click", (e) => {
                  if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) setOpen(false);
              });
              document.addEventListener("keydown", (e) => {
                  if (e.key === "Escape") setOpen(false);
              });
          }
  
          this.themeBtn = document.getElementById("btn-theme");
          this.currentBiome = "space";
          if (this.themeBtn) {
              this.themeBtn.addEventListener("click", () => {
                  const biomes = ["space", "overworld", "nether", "end"];
                  const nextIdx = (biomes.indexOf(this.currentBiome) + 1) % biomes.length;
                  this.currentBiome = biomes[nextIdx];
                  const capitalized = this.currentBiome.charAt(0).toUpperCase() + this.currentBiome.slice(1);
                  this.themeBtn.textContent = `Theme: ${capitalized}`;
                  this.game.renderer.setBiome(this.currentBiome);
                  applyMinecraftBackground(this.currentBiome);
                  sound.playClick();
              });
          }
  
          // Screen Size Toggle (Big Screen / Maximum)
          const arenaContainer = document.getElementById("arena-container") || document.querySelector(".arena-container");
          this.screenSizeBtn = document.getElementById("btn-screen-size");
          this.hudScreenBtn = document.getElementById("btn-hud-screen");
          let isScreenMax = false;
          const toggleScreenSize = () => {
              isScreenMax = !isScreenMax;
              if (arenaContainer) {
                  arenaContainer.classList.toggle("screen-max", isScreenMax);
              }
              if (this.screenSizeBtn) {
                  this.screenSizeBtn.textContent = isScreenMax ? "Screen: Max" : "Screen: Big";
              }
              if (this.hudScreenBtn) {
                  this.hudScreenBtn.textContent = isScreenMax ? "⛶ Standard" : "⛶ Max";
              }
              this.game.renderer.setupDPI();
              sound.playClick();
          };
          if (this.screenSizeBtn) this.screenSizeBtn.addEventListener("click", toggleScreenSize);
          if (this.hudScreenBtn) this.hudScreenBtn.addEventListener("click", toggleScreenSize);
  
          // Arena Top Quick Action Buttons
          const hudHomeBtn = document.getElementById("btn-hud-home");
          const hudPauseBtn = document.getElementById("btn-hud-pause");
          const hudRestartBtn = document.getElementById("btn-hud-restart");
  
          if (hudHomeBtn) {
              hudHomeBtn.addEventListener("click", () => {
                  this.handleHomeClick();
              });
          }
          if (hudPauseBtn) {
              hudPauseBtn.addEventListener("click", () => {
                  this.game.togglePause();
              });
          }
          if (hudRestartBtn) {
              hudRestartBtn.addEventListener("click", () => {
                  this.triggerMatchmakingRestart();
              });
          }
  
          // Inventory [i] triggers & shortcut
          this.inventoryBtn = document.getElementById("btn-inventory");
          this.homeInventoryBtn = document.getElementById("btn-home-inventory");
          this.inventoryModal = document.getElementById("inventory-modal");
  
          if (this.inventoryBtn) this.inventoryBtn.addEventListener("click", () => this.openLoadoutModal());
          if (this.homeInventoryBtn) this.homeInventoryBtn.addEventListener("click", () => this.openLoadoutModal());
  
          // Press I anywhere to pick your weapon and class
          window.addEventListener("keydown", (e) => {
              if (e.key === "i" || e.key === "I") {
                  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
                  if (activeTag !== "input" && activeTag !== "textarea" && activeTag !== "select") {
                      this.toggleLoadoutModal();
                  }
              }
          });
          this.setupLoadoutUI();
  
          // Navigation buttons
          if (this.homeBtn) this.homeBtn.addEventListener("click", () => this.handleHomeClick());
          if (this.restartBtn) this.restartBtn.addEventListener("click", () => this.triggerMatchmakingRestart());
          if (this.pauseBtn) this.pauseBtn.addEventListener("click", () => this.game.togglePause());
          if (this.userProfileBtn) this.userProfileBtn.addEventListener("click", () => this.openAuthModal());
          if (this.socialBtn) this.socialBtn.addEventListener("click", () => this.openSocialModal());
          if (this.downloadBtn) this.downloadBtn.addEventListener("click", () => this.downloadGame());
          if (this.leaderboardBtn) this.leaderboardBtn.addEventListener("click", () => this.openLeaderboardModal());
  
          // Multiplayer resignation modal buttons
          const cancelResignBtn = document.getElementById("btn-cancel-resign");
          if (cancelResignBtn) cancelResignBtn.addEventListener("click", () => {
              if (this.resignModal) this.resignModal.classList.add("hidden");
          });
          const confirmResignBtn = document.getElementById("btn-confirm-resign");
          if (confirmResignBtn) confirmResignBtn.addEventListener("click", () => this.confirmResign());
  
          // Matchmaking queue modal buttons
          const cancelMatchmakingBtn = document.getElementById("btn-cancel-matchmaking");
          if (cancelMatchmakingBtn) cancelMatchmakingBtn.addEventListener("click", () => this.cancelMatchmaking());
  
          // Stats modal action buttons
          const statsPlayAgainBtn = document.getElementById("btn-stats-play-again");
          if (statsPlayAgainBtn) statsPlayAgainBtn.addEventListener("click", () => this.triggerMatchmakingRestart());
          const statsHomeBtn = document.getElementById("btn-stats-home");
          if (statsHomeBtn) statsHomeBtn.addEventListener("click", () => {
              if (this.statsModal) this.statsModal.classList.add("hidden");
              this.game.goHome();
          });
  
          // Home screen arena banner
          // Home screen: Ranked / Online / Local 2-Player
          const rankedBtn = document.getElementById("home-ranked-btn");
          if (rankedBtn) rankedBtn.addEventListener("click", () => this.openArenaModal("ranked"));
          const onlineBtn = document.getElementById("home-online-btn");
          if (onlineBtn) onlineBtn.addEventListener("click", () => this.openArenaModal("online"));
          const localBtn = document.getElementById("home-local-btn");
          if (localBtn) localBtn.addEventListener("click", () => this.launchMatchWithLoading("pvp"));
  
          const arenaBanner = document.getElementById("home-arena-banner");
          if (arenaBanner) arenaBanner.addEventListener("click", () => this.openArenaModal());
  
          // Pause Modal buttons
          const resumeBtn = document.getElementById("btn-resume");
          if (resumeBtn) resumeBtn.addEventListener("click", () => this.game.togglePause());
          const pauseRestartBtn = document.getElementById("btn-pause-restart");
          if (pauseRestartBtn) {
              pauseRestartBtn.addEventListener("click", () => {
                  this.pauseModal.classList.add("hidden");
                  this.triggerMatchmakingRestart();
              });
          }
          const pauseHomeBtn = document.getElementById("btn-pause-home");
          if (pauseHomeBtn) {
              pauseHomeBtn.addEventListener("click", () => {
                  this.pauseModal.classList.add("hidden");
                  this.handleHomeClick();
              });
          }
  
          // Generic close modal buttons
          document.querySelectorAll(".btn-close-modal").forEach((btn) => {
              btn.addEventListener("click", (e) => {
                  const modal = e.target.closest(".modal-backdrop");
                  if (modal) modal.classList.add("hidden");
              });
          });
  
          // Automatically close ANY opened modal when clicking outside the window (on backdrop)
          document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
              backdrop.addEventListener("click", (e) => {
                  // Ignore clicks on buttons that were re-rendered (removed from the page) mid-click
                  if (e.target === backdrop || (e.target.isConnected && !e.target.closest(".modal-card"))) {
                      backdrop.classList.add("hidden");
                      sound.playClick();
                  }
              });
          });
  
          this.setupTouchButtons();
  
          // Wire game callbacks to ui
          if (this.game) {
              this.game.uiCallbacks = this.game.uiCallbacks || {};
              this.game.uiCallbacks.onStartModeRequested = (mode) => this.launchMatchWithLoading(mode);
              this.game.uiCallbacks.onRestartRequested = () => this.triggerMatchmakingRestart();
              this.game.uiCallbacks.onHomeRequested = () => this.handleHomeClick();
          }
      }
  
      updateMuteButton(isMuted) {
          if (!this.muteBtn) return;
          this.muteBtn.textContent = isMuted ? "Sound: Off" : "Sound: On";
      }
  
      // ==========================================
      // USER PROFILE & GOOGLE AUTH SYSTEM
      // ==========================================
  
      setupAuthUI() {
          // Refresh the profile screen after Google's sign-in popup finishes
          auth.onGoogleSignIn = () => {
              sound.playClick();
              if (this.authModal && !this.authModal.classList.contains("hidden")) this.renderAuthModalContent();
          };
  
          auth.onUserChanged((user) => {
              this.updateHeaderProfileBadge(user);
              if (this.goldDisplay) {
                  this.goldDisplay.textContent = `Gold: ${user.gold || 0}`;
              }
              this.updateHomeProfile(user);
  
              // Dynamically refresh open inventory tab so buy buttons update to gold
              if (this.inventoryModal && !this.inventoryModal.classList.contains("hidden")) {
                  if (this.tabSkins && this.tabSkins.classList.contains("active")) {
                      this.renderSkinsModalContent();
                  } else {
                      this.renderWeaponsModalContent();
                  }
              }
          });
  
          const profileBanner = document.getElementById("home-profile-banner");
          if (profileBanner) {
              profileBanner.addEventListener("click", () => this.openAuthModal());
          }
      }
  
      // Always show Steve's head as the cube avatar
      avatarHeadId(user) {
          return "steve";
      }
  
      updateHomeLoadoutSummary(user) {
          const el = document.getElementById("home-loadout-summary");
          if (!el) return;
          const w1 = WEAPON_TYPES[user.equippedWeapon] || WEAPON_TYPES.mace;
          const w2 = user.secondaryWeapon && WEAPON_TYPES[user.secondaryWeapon];
          const cls = CLASSES[user.classId] || CLASSES.normal;
          el.textContent = `${w1.name}${w2 ? " + " + w2.name : ""} · ${cls.name}`;
      }
  
      updateHomeProfile(user) {
          this.updateHomeLoadoutSummary(user);
          const cube = document.getElementById("home-cube");
          if (cube) cube.innerHTML = cubeHTML(this.avatarHeadId(user), 56);
          const name = document.getElementById("hp-name");
          if (name) name.textContent = user.username || "Steve";
      }
  
      updateHeaderProfileBadge(user) {
          if (!this.userProfileBtn) return;
  
          const avatarHtml = cubeHTML(this.avatarHeadId(user), 22);
          const isGoogle = user.authProvider === "google";
          const googleTag = isGoogle ? `<span class="google-pill-tag">G</span>` : "";
  
          this.userProfileBtn.innerHTML = `
              ${avatarHtml}
              <span class="header-username">${user.username || "Steve"}</span>
              ${googleTag}
              <span class="header-level-badge">Lv.${user.level}</span>
          `;
      }
  
      openAuthModal() {
          if (!this.authModal) return;
          this.renderAuthModalContent();
          this.authModal.classList.remove("hidden");
          sound.playClick();
      }
  
      renderAuthModalContent() {
          const user = auth.getUser();
          const isGoogle = user.authProvider === "google";
          const rankTitle = auth.getRankTitle();
  
          // Google Auth Section
          const googleSection = document.getElementById("auth-google-section");
          if (googleSection) {
              if (isGoogle) {
                  googleSection.innerHTML = `
                      <div class="google-connected-box">
                          <div class="google-user-info">
                              <span class="google-check-icon">OK</span>
                              <div>
                                  <div class="google-name">${user.email ? user.email : "Connected Google Account"}</div>
                                  <div class="google-status">Google Account Connected</div>
                              </div>
                          </div>
                          <button id="btn-google-signout" class="btn-ctrl btn-signout">Sign Out</button>
                      </div>
                  `;
                  document.getElementById("btn-google-signout")?.addEventListener("click", () => {
                      auth.signOut();
                      sound.playClick();
                      this.renderAuthModalContent();
                  });
              } else {
                  if (auth.isGoogleConfigured()) {
                      googleSection.innerHTML = `
                          <div id="google-signin-button" class="google-signin-button">Loading Google sign-in...</div>
                          <p class="google-disclaimer">Sign in with your Google account. Your progress is saved in this browser.</p>
                      `;
                      auth.renderGoogleButton(document.getElementById("google-signin-button"));
                  } else {
                      googleSection.innerHTML = `
                          <p class="google-disclaimer">Google sign-in isn't set up yet.</p>
                      `;
                  }
              }
          }
  
          // Username Section
          const usernameInput = document.getElementById("input-username");
          const usernameFeedback = document.getElementById("username-feedback");
          if (usernameInput) usernameInput.value = user.username || "Steve";
  
          const btnRandom = document.getElementById("btn-random-username");
          if (btnRandom) {
              btnRandom.onclick = () => {
                  const randomName = auth.getRandomUsername();
                  if (usernameInput) usernameInput.value = randomName;
                  sound.playClick();
              };
          }
  
          const btnSaveUsername = document.getElementById("btn-save-username");
          if (btnSaveUsername) {
              btnSaveUsername.onclick = () => {
                  if (!usernameInput) return;
                  const result = auth.setUsername(usernameInput.value);
                  if (result.success) {
                      if (usernameFeedback) {
                          usernameFeedback.textContent = "Username saved successfully!";
                          usernameFeedback.className = "form-feedback success";
                      }
                      sound.playClick();
                  } else {
                      if (usernameFeedback) {
                          usernameFeedback.textContent = result.error;
                          usernameFeedback.className = "form-feedback error";
                      }
                  }
              };
          }
  
          // Avatar Picker - Always Steve's Head
          const avatarPickerContainer = document.getElementById("avatar-picker-grid");
          if (avatarPickerContainer) {
              avatarPickerContainer.innerHTML = `
                  <div class="avatar-choice selected" style="cursor:default;" title="Minecraft Steve">
                      ${cubeHTML("steve", 48)}
                  </div>
                  <div style="display:flex; flex-direction:column; justify-content:center; margin-left:10px;">
                      <span style="font-weight:bold; color:var(--text-primary); font-size:14px;">Steve's Cube Head</span>
                      <span style="font-size:12px; color:var(--text-muted);">Hero Avatar</span>
                  </div>
              `;
          }
  
          // Career Stats
          const statsContainer = document.getElementById("auth-career-stats");
          if (statsContainer) {
              const s = user.stats;
              const winRate = s.matches > 0 ? ((s.wins / s.matches) * 100).toFixed(1) : "0.0";
              const xpInLevel = user.xp % 200;
              const tier = arena.getTier(user.arenaRP || 250);
  
              statsContainer.innerHTML = `
                  <div class="career-header">
                      <div class="career-rank-badge">
                          <span class="rank-name" style="color:${tier.color}">${tierPipHTML(tier)} ${tier.name} Tier</span>
                          <span class="level-pill">Level ${user.level}</span>
                      </div>
                      <div class="xp-bar-wrapper">
                          <div class="xp-label">XP: ${xpInLevel} / 200</div>
                          <div class="xp-track">
                              <div class="xp-fill" style="width: ${(xpInLevel / 200) * 100}%"></div>
                          </div>
                      </div>
                  </div>
                  <div class="career-stats-grid">
                      <div class="career-stat-card">
                          <span class="cs-val">${user.gold || 0}</span>
                          <span class="cs-label">Gold</span>
                      </div>
                      <div class="career-stat-card">
                          <span class="cs-val" style="color:#00d2d3">${user.arenaRP || 250}</span>
                          <span class="cs-label">Arena RP</span>
                      </div>
                      <div class="career-stat-card">
                          <span class="cs-val" style="color:#2ecc71">${s.wins}</span>
                          <span class="cs-label">Victories</span>
                      </div>
                      <div class="career-stat-card">
                          <span class="cs-val" style="color:#f1c40f">${winRate}%</span>
                          <span class="cs-label">Win Rate</span>
                      </div>
                      <div class="career-stat-card">
                          <span class="cs-val">${s.matches || 0}</span>
                          <span class="cs-label">Matches</span>
                      </div>
                      <div class="career-stat-card">
                          <span class="cs-val" style="color:#ff7675">${s.kills || 0}</span>
                          <span class="cs-label">Total KOs</span>
                      </div>
                      <div class="career-stat-card">
                          <span class="cs-val">${Math.round(s.damageDealt || 0)}</span>
                          <span class="cs-label">Damage Dealt</span>
                      </div>
                      <div class="career-stat-card">
                          <span class="cs-val">${s.bestStreak || 0}</span>
                          <span class="cs-label">Best Win Streak</span>
                      </div>
                      <div class="career-stat-card">
                          <span class="cs-val">${s.slamsLanded || 0}</span>
                          <span class="cs-label">Slams Landed</span>
                      </div>
                      <div class="career-stat-card">
                          <span class="cs-val" style="color:#e67e22">${Math.round(s.maxSlamDamage || 0)}</span>
                          <span class="cs-label">Max Slam DMG</span>
                      </div>
                  </div>
              `;
          }
      }
  
      // ==========================================
      // UNIFIED MINECRAFT INVENTORY, CRAFTING, ARMORY & SKINS
      // ==========================================
  
      setupInventoryUI() {
          this.tabWeapons = document.getElementById("tab-inv-weapons");
          this.tabSkins = document.getElementById("tab-inv-skins");
  
          this.panelWeapons = document.getElementById("inv-panel-weapons");
          this.panelSkins = document.getElementById("inv-panel-skins");
  
          this.tabWeapons?.addEventListener("click", () => this.switchInventoryTab("weapons"));
          this.tabSkins?.addEventListener("click", () => this.switchInventoryTab("skins"));
      }
  
      setupArmoryUI() {}
      setupSkinsUI() {}
  
      switchInventoryTab(tab) {
          [this.tabWeapons, this.tabSkins].forEach(t => t?.classList.remove("active"));
          [this.panelWeapons, this.panelSkins].forEach(p => p?.classList.add("hidden"));
  
          if (tab === "skins") {
              this.tabSkins?.classList.add("active");
              this.panelSkins?.classList.remove("hidden");
              this.renderSkinsModalContent();
          } else {
              this.tabWeapons?.classList.add("active");
              this.panelWeapons?.classList.remove("hidden");
              this.renderWeaponsModalContent();
          }
          sound.playClick();
      }
  
      // ==========================================
      // LOADOUT (press I): weapon dropdowns + class grid
      // ==========================================
  
      setupLoadoutUI() {
          this.loadoutModal = document.getElementById("loadout-modal");
          if (!this.loadoutModal) return;
          document.getElementById("lo-tab-weapon").onclick = () => this.switchLoadoutTab("weapon");
          document.getElementById("lo-tab-class").onclick = () => this.switchLoadoutTab("class");
          document.getElementById("lo-done").onclick = () => this.closeLoadoutModal();
          document.getElementById("lo-open-shop").onclick = () => {
              this.closeLoadoutModal();
              this.openInventoryModal("weapons");
          };
          const w1 = document.getElementById("lo-weapon1");
          const w2 = document.getElementById("lo-weapon2");
          w1.onchange = () => {
              auth.equipWeapon(w1.value, 1);
              sound.playClick();
              this.renderLoadoutWeapons();
          };
          w2.onchange = () => {
              if (w2.value === "none") auth.clearSecondaryWeapon();
              else auth.equipWeapon(w2.value, 2);
              sound.playClick();
              this.renderLoadoutWeapons();
          };
      }
  
      openLoadoutModal(tab = "weapon") {
          if (!this.loadoutModal) return;
          this.loadoutModal.classList.remove("hidden");
          this.switchLoadoutTab(tab, true);
          sound.playClick();
      }
  
      closeLoadoutModal() {
          if (!this.loadoutModal) return;
          this.loadoutModal.classList.add("hidden");
          sound.playClick();
      }
  
      toggleLoadoutModal() {
          if (!this.loadoutModal) return;
          if (this.loadoutModal.classList.contains("hidden")) this.openLoadoutModal();
          else this.closeLoadoutModal();
      }
  
      switchLoadoutTab(tab, silent = false) {
          const isClass = tab === "class";
          const tw = document.getElementById("lo-tab-weapon");
          const tc = document.getElementById("lo-tab-class");
          tw.classList.toggle("active", !isClass);
          tc.classList.toggle("active", isClass);
          tw.setAttribute("aria-selected", String(!isClass));
          tc.setAttribute("aria-selected", String(isClass));
          document.getElementById("lo-panel-weapon").classList.toggle("hidden", isClass);
          document.getElementById("lo-panel-class").classList.toggle("hidden", !isClass);
          // Weapon picks are saved the moment they change, so switching tabs keeps them
          if (isClass) this.renderLoadoutClasses();
          else this.renderLoadoutWeapons();
          if (!silent) sound.playClick();
      }
  
      renderLoadoutWeapons() {
          const user = auth.getUser();
          const unlocked = user.unlockedWeapons || ["mace", "spear"];
          const option = (w, selected) => {
              const owned = unlocked.includes(w.id);
              return `<option value="${w.id}" ${selected ? "selected" : ""} ${owned ? "" : "disabled"}>${w.name}${owned ? "" : ` (locked: ${w.baseCost} gold)`}</option>`;
          };
          const all = Object.values(WEAPON_TYPES);
          document.getElementById("lo-weapon1").innerHTML = all.map(w => option(w, w.id === user.equippedWeapon)).join("");
          document.getElementById("lo-weapon2").innerHTML =
              `<option value="none" ${user.secondaryWeapon ? "" : "selected"}>None</option>` +
              all.filter(w => w.id !== user.equippedWeapon).map(w => option(w, w.id === user.secondaryWeapon)).join("");
      }
  
      renderLoadoutClasses() {
          const grid = document.getElementById("lo-class-grid");
          const current = auth.getUser().classId || "normal";
          grid.innerHTML = Object.entries(CLASSES).map(([id, c]) => `
              <button type="button" class="lo-class-card class-${id} ${id === current ? "selected" : ""}" role="radio" aria-checked="${id === current}" data-class="${id}">
                  <span class="lo-class-name">${c.name}</span>
                  <span class="lo-class-desc">${c.desc}</span>
              </button>
          `).join("");
          grid.querySelectorAll(".lo-class-card").forEach(card => {
              card.onclick = () => {
                  auth.setClass(card.dataset.class);
                  sound.playClick();
                  grid.querySelectorAll(".lo-class-card").forEach(c => {
                      const on = c === card;
                      c.classList.toggle("selected", on);
                      c.setAttribute("aria-checked", String(on));
                  });
              };
          });
      }
  
      openInventoryModal(tab = "weapons") {
          if (!this.inventoryModal) return;
          this.inventoryModal.classList.remove("hidden");
          this.switchInventoryTab(tab);
      }
  
      toggleInventoryModal() {
          if (!this.inventoryModal) return;
          if (this.inventoryModal.classList.contains("hidden")) {
              this.openInventoryModal("weapons");
          } else {
              this.inventoryModal.classList.add("hidden");
              sound.playClick();
          }
      }
  
      openWeaponsModal() {
          this.openInventoryModal("weapons");
      }
  
      openSkinsModal() {
          this.openInventoryModal("skins");
      }
  
      renderWeaponsModalContent() {
          const container = document.getElementById("weapons-list-container");
          if (!container) return;
  
          const user = auth.getUser();
          const gold = user.gold || 0;
          container.innerHTML = "";
  
          // Weapons Catalog
          Object.values(WEAPON_TYPES).forEach(w => {
              const isUnlocked = user.unlockedWeapons.includes(w.id);
              const inSlot1 = user.equippedWeapon === w.id;
              const inSlot2 = user.secondaryWeapon === w.id;
              const isEquipped = inSlot1 || inSlot2;
  
              const card = document.createElement("div");
              card.className = `weapon-shop-card ${isEquipped ? 'equipped' : ''}`;
  
              card.innerHTML = `
                  <div class="weapon-shop-header">
                      <div class="ws-left">
                          <span class="ws-icon">${weaponIconHTML(w.id, 32)}</span>
                          <div>
                              <div class="ws-title">${w.name}</div>
                              <div class="ws-cat">${w.category}</div>
                          </div>
                      </div>
                      <div class="ws-right">
                          ${inSlot1 ?
                              `<span class="badge-equipped">SLOT 1</span>` :
                            inSlot2 ?
                              `<span class="badge-equipped badge-slot2">SLOT 2</span>
                               <button class="btn-ctrl btn-clear-slot2" title="Remove from slot 2">Unequip</button>` :
                              (isUnlocked ?
                                  `<button class="btn-ctrl btn-equip-weap" data-id="${w.id}" data-slot="1" title="Main weapon">Slot 1</button>
                                   <button class="btn-ctrl btn-equip-weap" data-id="${w.id}" data-slot="2" title="Second weapon (press Q in a match to swap)">Slot 2</button>` :
                                  `<button class="btn-ctrl btn-unlock-weap ${gold >= w.baseCost ? 'btn-can-buy' : ''}" data-id="${w.id}" data-cost="${w.baseCost}" ${gold < w.baseCost ? 'disabled' : ''}>
                                      ${gold >= w.baseCost ? '⭐ ' : ''}Unlock (${w.baseCost} G)
                                  </button>`
                              )
                          }
                      </div>
                  </div>
                  <div class="ws-desc">${w.desc}</div>
              `;
  
              container.appendChild(card);
          });
  
          // Attach Equip / Unlock handlers
          container.querySelectorAll(".btn-clear-slot2").forEach(btn => {
              btn.onclick = () => {
                  auth.clearSecondaryWeapon();
                  sound.playClick();
                  this.renderWeaponsModalContent();
              };
          });
  
          container.querySelectorAll(".btn-equip-weap").forEach(btn => {
              btn.onclick = () => {
                  auth.equipWeapon(btn.dataset.id, parseInt(btn.dataset.slot) || 1);
                  sound.playClick();
                  this.renderWeaponsModalContent();
              };
          });
  
          container.querySelectorAll(".btn-unlock-weap").forEach(btn => {
              btn.onclick = () => {
                  const res = auth.unlockWeapon(btn.dataset.id, parseInt(btn.dataset.cost));
                  if (res.success) {
                      sound.playWin();
                          this.renderWeaponsModalContent();
                  } else {
                      alert(res.error);
                  }
              };
          });
      }
  
      renderSkinsModalContent() {
          const container = document.getElementById("skins-grid-container");
          if (!container) return;
  
          const user = auth.getUser();
          const gold = user.gold || 0;
          container.innerHTML = "";
  
          BLOCK_FACES.forEach(face => {
              const isUnlocked = user.unlockedSkins.includes(face.id);
              const isEquipped = user.skinId === face.id;
  
              const card = document.createElement("div");
              card.className = `skin-card ${isEquipped ? 'equipped' : ''}`;
              card.innerHTML = `
                  <div class="skin-avatar-preview">${cubeHTML(face.id, 48)}</div>
                  <div class="skin-info">
                      <div class="skin-name">${face.name}</div>
                      <div class="skin-desc">${face.desc}</div>
                  </div>
                  <div class="skin-action">
                      ${isEquipped ?
                          `<span class="badge-equipped">EQUIPPED</span>` :
                          (isUnlocked ?
                              `<button class="btn-ctrl btn-equip-skin" data-id="${face.id}">Equip</button>` :
                              `<button class="btn-ctrl btn-unlock-skin ${gold >= face.cost ? 'btn-can-buy' : ''}" data-id="${face.id}" data-cost="${face.cost}" ${gold < face.cost ? 'disabled' : ''}>
                                  ${gold >= face.cost ? '⭐ ' : ''}${face.cost} Gold
                              </button>`
                          )
                      }
                  </div>
              `;
              container.appendChild(card);
          });
  
          container.querySelectorAll(".btn-equip-skin").forEach(btn => {
              btn.onclick = () => {
                  auth.equipSkin(btn.dataset.id);
                  sound.playClick();
                  this.renderSkinsModalContent();
              };
          });
  
          container.querySelectorAll(".btn-unlock-skin").forEach(btn => {
              btn.onclick = () => {
                  const res = auth.unlockSkin(btn.dataset.id, parseInt(btn.dataset.cost));
                  if (res.success) {
                      sound.playWin();
                      this.renderSkinsModalContent();
                  } else {
                      alert(res.error);
                  }
              };
          });
      }
  
      // ==========================================
      // MULTIPLAYER ARENA HUB & LOBBY
      // ==========================================
  
      setupArenaUI() {
          // Mode pills
          document.querySelectorAll(".arena-mode-pill").forEach(pill => {
              pill.addEventListener("click", () => {
                  document.querySelectorAll(".arena-mode-pill").forEach(p => p.classList.remove("active"));
                  pill.classList.add("active");
                  this.selectedArenaMode = pill.dataset.mode;
                  sound.playClick();
              });
          });
  
          // Quick Queue / Find Match button
          const btnQueue = document.getElementById("btn-arena-find-match");
          if (btnQueue) {
              btnQueue.onclick = () => {
                  this.startMatchmakingQueue(this.selectedArenaMode, this.selectedArenaWeapon);
              };
          }
  
          // Host Private Room button
          const btnHost = document.getElementById("btn-host-private");
          if (btnHost) {
              btnHost.onclick = () => {
                  const code = arena.generateRoomCode();
                  document.getElementById("private-room-code-display").textContent = code;
                  const linkInput = document.getElementById("private-room-link");
                  if (linkInput) linkInput.value = this.buildRoomLink(code);
                  const status = document.getElementById("copy-link-status");
                  if (status) status.textContent = "";
                  document.getElementById("private-room-panel").classList.remove("hidden");
                  sound.playClick();
                  this.hostOnlineRoom(code);
              };
          }
  
          // Copy Invite Link button
          const btnCopyLink = document.getElementById("btn-copy-room-link");
          const linkInput = document.getElementById("private-room-link");
          if (btnCopyLink && linkInput) {
              btnCopyLink.onclick = () => this.copyRoomLink(linkInput);
              // Clicking the link field selects all of it for easy manual copying
              linkInput.addEventListener("focus", () => linkInput.select());
              linkInput.addEventListener("click", () => linkInput.select());
          }
  
          // Join Private Room button
          const btnJoin = document.getElementById("btn-join-private");
          const joinInput = document.getElementById("input-join-code");
          if (btnJoin && joinInput) {
              btnJoin.onclick = () => {
                  const code = this.parseRoomCode(joinInput.value);
                  if (!code) {
                      alert("Please enter a valid Room Code or paste an invite link!");
                      return;
                  }
                  joinInput.value = code;
                  sound.playClick();
                  this.joinOnlineRoom(code);
              };
          }
  
          online.onMessage = (msg, peer) => this.handleOnlineMessage(msg, peer);
          online.onDisconnect = (reason, peer) => this.handleOnlineDisconnect(reason, peer);
  
          const btnOnlineStart = document.getElementById("btn-online-start");
          if (btnOnlineStart) btnOnlineStart.onclick = () => this.hostStartOnlineMatch();
      }
  
      // ==========================================
      // ONLINE (PEER-TO-PEER) LOBBY
      // ==========================================
  
      setOnlineStatus(text, isError = false) {
          const el = document.getElementById("online-status");
          if (!el) return;
          el.textContent = text;
          el.classList.toggle("error", isError);
      }
  
      myOnlineInfo() {
          const user = auth.getUser();
          return {
              name: (user.username || "Player").slice(0, 20),
              skin: user.skinId || "steve",
              weapon: this.selectedArenaWeapon || user.equippedWeapon || "mace",
              weapon2: (user.secondaryWeapon && user.secondaryWeapon !== (this.selectedArenaWeapon || user.equippedWeapon))
                  ? user.secondaryWeapon
                  : (user.equippedWeapon !== this.selectedArenaWeapon ? user.equippedWeapon : null),
              upgrades: {},
              cls: user.classId || "normal"
          };
      }
  
      // ---- Host lobby: up to 4 players. Join order fills Blue, Red, Blue, Red. ----
  
      hostOnlineRoom(code) {
          let matchType = this.selectedArenaMode === "1v1" ? "1v1" : "2v2";
          this.lobby = { matchType, players: [{ peer: "host", info: this.myOnlineInfo() }] };
          const note = this.selectedArenaMode === "5v5" ? " (online rooms go up to 2v2)" : "";
          this.setOnlineStatus("Opening room...");
          online.host(code, matchType === "1v1" ? 1 : 3, () => {
              this.setOnlineStatus(matchType === "1v1"
                  ? "Room open (1v1). Waiting for your friend to join..."
                  : `Room open (2v2)${note}. Invite up to 3 friends, then press Start. Empty spots become bots.`);
              this.renderOnlineLobby();
          }, (err) => this.setOnlineStatus(err, true));
      }
  
      joinOnlineRoom(code) {
          this.lobby = null;
          this.renderOnlineLobby();
          this.setOnlineStatus("Connecting to your friend's room...");
          online.join(code, () => {
              this.setOnlineStatus("Connected! Waiting for the host...");
              online.send({ t: "hello", info: this.myOnlineInfo() });
          }, (err) => this.setOnlineStatus(err, true));
      }
  
      lobbyTeam(index) {
          return index % 2 === 0 ? "blue" : "red";
      }
  
      // Lobby list shown to everyone; the host also gets the Start button (2v2)
      renderOnlineLobby(players = null, matchType = null) {
          const box = document.getElementById("online-lobby");
          const list = document.getElementById("online-lobby-list");
          const startBtn = document.getElementById("btn-online-start");
          if (!box || !list) return;
          const isHost = online.role === "host" && this.lobby;
          const shown = players || (isHost ? this.lobby.players.map((p, i) => ({ name: p.info.name, team: this.lobbyTeam(i) })) : null);
          const type = matchType || (this.lobby && this.lobby.matchType);
          if (!shown || type !== "2v2") {
              box.classList.add("hidden");
              return;
          }
          box.classList.remove("hidden");
          const escapeHTML = (str) => String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
          const col = (team) => {
              const names = shown.filter(p => p.team === team).map(p => `<li>${escapeHTML(p.name)}</li>`);
              while (names.length < 2) names.push(`<li class="lobby-bot">Bot (empty spot)</li>`);
              return `<div class="lobby-team lobby-${team}"><div class="lobby-team-name">${team === "blue" ? "Blue" : "Red"} Team</div><ul>${names.join("")}</ul></div>`;
          };
          list.innerHTML = col("blue") + col("red");
          if (startBtn) startBtn.classList.toggle("hidden", !isHost);
      }
  
      broadcastLobby() {
          if (!this.lobby) return;
          online.send({
              t: "lobby",
              matchType: this.lobby.matchType,
              players: this.lobby.players.map((p, i) => ({ name: p.info.name, team: this.lobbyTeam(i) }))
          });
          this.renderOnlineLobby();
      }
  
      // Builds the match slots (Blue first, then Red); empty 2v2 spots become bots
      buildOnlineSetup() {
          const lobby = this.lobby;
          this.lobby.players[0].info = this.myOnlineInfo(); // host may have changed weapons
          const botInfo = (n) => ({
              name: n,
              skin: ["alex", "zombie", "skeleton", "creeper"][Math.floor(Math.random() * 4)],
              weapon: ["mace", "spear", "sword"][Math.floor(Math.random() * 3)],
              weapon2: null,
              upgrades: {}
          });
          const slotFor = (player, team, botName) => player
              ? { ...player.info, team, peer: player.peer }
              : { ...botInfo(botName), team, peer: null };
          const p = lobby.players;
          if (lobby.matchType === "1v1") {
              return { matchType: "1v1", slots: [slotFor(p[0], "blue"), slotFor(p[1], "red", "Rival Bot")] };
          }
          return {
              matchType: "2v2",
              slots: [
                  slotFor(p[0], "blue"), slotFor(p[2], "blue", "Ally Bot"),
                  slotFor(p[1], "red", "Rival Bot"), slotFor(p[3], "red", "Rival Bot 2")
              ]
          };
      }
  
      startOnlineFromMessage(role, setup, you) {
          if (this.arenaModal) this.arenaModal.classList.add("hidden");
          if (this.statsModal) this.statsModal.classList.add("hidden");
          this.hideResultsScreen();
          this.setOnlineStatus("");
          this.game.startOnlineMatch(role, setup, you);
      }
  
      hostStartOnlineMatch() {
          if (!this.lobby || online.role !== "host") return;
          if (this.lobby.matchType === "1v1" && this.lobby.players.length < 2) return;
          const setup = this.buildOnlineSetup();
          setup.slots.forEach((slot, i) => {
              if (slot.peer && slot.peer !== "host") online.sendTo(slot.peer, { t: "start", setup, you: i });
          });
          this.startOnlineFromMessage("host", setup, 0);
      }
  
      handleOnlineMessage(msg, peer) {
          if (msg.t === "hello" && online.role === "host" && this.lobby) {
              if (this.lobby.players.some(p => p.peer === peer)) return;
              this.lobby.players.push({ peer, info: msg.info || { name: "Player" } });
              if (this.lobby.matchType === "1v1") {
                  this.setOnlineStatus("Friend connected! Starting...");
                  this.hostStartOnlineMatch();
              } else {
                  this.setOnlineStatus(`${(msg.info && msg.info.name) || "A friend"} joined. Press Start when everyone's in.`);
                  this.broadcastLobby();
              }
          } else if (msg.t === "lobby" && online.role === "guest") {
              this.setOnlineStatus("You're in! Waiting for the host to start...");
              this.renderOnlineLobby(msg.players, msg.matchType);
          } else if (msg.t === "full" && online.role === "guest") {
              this.setOnlineStatus("That room is full.", true);
          } else if (msg.t === "start" && online.role === "guest") {
              this.startOnlineFromMessage("guest", msg.setup, msg.you);
          } else if (msg.t === "rematch" && online.role === "host") {
              if (this.game.state === "gameover") this.hostStartOnlineMatch();
          } else {
              this.game.handleNetMessage(msg, peer);
          }
      }
  
      handleOnlineDisconnect(reason, peer) {
          const inMatch = this.game.mode === "online" && this.game.state !== "menu";
          if (online.role === "host" && this.lobby) {
              const leaving = this.lobby.players.find(p => p.peer === peer);
              this.lobby.players = this.lobby.players.filter(p => p.peer !== peer);
              const name = leaving ? leaving.info.name : "A player";
              if (inMatch && this.game.isTeamMatch) {
                  // 2v2 keeps going: a bot takes over their fighter
                  this.game.replaceWithBot(peer);
                  this.showToast(`${name} left. A bot took over.`);
                  return;
              }
              if (!inMatch) {
                  this.setOnlineStatus(`${name} left the room.`);
                  this.broadcastLobby();
                  return;
              }
          }
          if (inMatch) {
              if (this.statsModal) this.statsModal.classList.add("hidden");
              this.game.goHome();
              this.showToast(reason);
          } else {
              this.setOnlineStatus(reason, true);
              this.renderOnlineLobby();
          }
      }
  
      onlineRematch() {
          if (this.game.state !== "gameover") return;
          if (online.role === "host") {
              this.hostStartOnlineMatch();
          } else if (online.isConnected()) {
              online.send({ t: "rematch" });
              const btn = document.getElementById("btn-results-again");
              if (btn) btn.textContent = "Waiting for host...";
          }
      }
  
      showToast(text) {
          let toast = document.getElementById("game-toast");
          if (!toast) {
              toast = document.createElement("div");
              toast.id = "game-toast";
              toast.className = "game-toast";
              toast.setAttribute("role", "status");
              const container = document.getElementById("arena-container") || document.body;
              container.appendChild(toast);
          }
          toast.textContent = text;
          toast.classList.add("show");
          clearTimeout(this.toastTimer);
          this.toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
      }
  
      // Shareable invite link for a private room, e.g. https://site/index.html?room=MACE-ABCD-123
      buildRoomLink(code) {
          const base = window.location.href.split(/[?#]/)[0];
          return `${base}?room=${encodeURIComponent(code)}`;
      }
  
      // Accepts a bare room code or a full pasted invite link and returns the code (or null)
      parseRoomCode(text) {
          let raw = (text || "").trim();
          if (!raw) return null;
          const match = raw.match(/[?&#]room=([^&#\s]+)/i);
          if (match) raw = decodeURIComponent(match[1]);
          const code = raw.toUpperCase().replace(/\s+/g, "");
          return /^[A-Z0-9-]{5,}$/.test(code) ? code : null;
      }
  
      copyRoomLink(linkInput) {
          const status = document.getElementById("copy-link-status");
          const text = linkInput.value;
          const done = (ok) => {
              if (status) status.textContent = ok ? "Link copied! Send it to a friend." : "Select the link and press Ctrl/Cmd+C to copy.";
              sound.playClick();
          };
          const fallback = () => {
              linkInput.focus();
              linkInput.select();
              let ok = false;
              try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
              done(ok);
          };
          if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(text).then(() => done(true), fallback);
          } else {
              fallback();
          }
      }
  
      // If the page was opened from an invite link (?room=CODE), open the arena hub with the code filled in
      handleInviteLinkOnLoad() {
          let code = null;
          try {
              code = this.parseRoomCode(window.location.search);
          } catch (e) {
              code = null;
          }
          if (!code) return;
          const joinInput = document.getElementById("input-join-code");
          if (joinInput) joinInput.value = code;
          this.openArenaModal("online");
      }
  
      // view: "ranked" (vs bots, earns RP) or "online" (play friends with a link)
      openArenaModal(view = "ranked") {
          if (!this.arenaModal) return;
          const card = this.arenaModal.querySelector(".modal-arena-card");
          if (card) card.dataset.view = view;
          const title = document.getElementById("arena-modal-title");
          if (title) title.textContent = view === "online" ? "Play Friends Online" : "Ranked";
          // Online rooms go up to 2v2
          if (view === "online" && this.selectedArenaMode === "5v5") {
              const pill = this.arenaModal.querySelector('.arena-mode-pill[data-mode="2v2"]');
              if (pill) pill.click();
          }
          // Your weapon comes from the loadout (I menu)
          this.selectedArenaWeapon = auth.getUser().equippedWeapon || "mace";
          this.renderArenaHubContent();
          this.arenaModal.classList.remove("hidden");
          sound.playClick();
      }
  
      renderArenaHubContent() {
          const user = auth.getUser();
          const tier = arena.getTier(user.arenaRP || 250);
  
          // Header Rank Banner
          const banner = document.getElementById("arena-rank-banner");
          if (banner) {
              const nextTierRP = tier.id === "obsidian" ? "MAX" : `${tier.maxRP + 1} RP`;
              const currentRP = user.arenaRP || 250;
              const rpProgress = tier.id === "obsidian" ? 100 : Math.min(100, Math.max(0, ((currentRP - tier.minRP) / (tier.maxRP - tier.minRP)) * 100));
  
              banner.innerHTML = `
                  <div class="arb-left">
                      <span class="arb-icon" style="color:${tier.color}">${tierPipHTML(tier)}</span>
                      <div>
                          <div class="arb-tier" style="color:${tier.color}">${tier.name} Division</div>
                          <div class="arb-rp">${currentRP} Rating Points (RP)</div>
                      </div>
                  </div>
                  <div class="arb-progress">
                      <div class="arb-track">
                          <div class="arb-fill" style="width: ${rpProgress}%; background: ${tier.color};"></div>
                      </div>
                      <div class="arb-next">Next Tier: ${nextTierRP}</div>
                  </div>
              `;
          }
      }
  
      // Ranked arena vs bots: go straight to the VS screen (there is no online queue)
      startMatchmakingQueue(matchType, weaponId) {
          if (this.arenaModal) this.arenaModal.classList.add("hidden");
          sound.playClick();
          this.launchArenaMatchWithLoading(matchType, weaponId);
      }
  
      // ==========================================
      // NATIONAL OBSIDIAN LEADERBOARD
      // ==========================================
  
      setupLeaderboardUI() {
          // Will render on open
      }
  
      openLeaderboardModal() {
          if (!this.leaderboardModal) return;
          this.renderLeaderboardContent();
          this.leaderboardModal.classList.remove("hidden");
          sound.playClick();
      }
  
      renderLeaderboardContent() {
          const container = document.getElementById("leaderboard-list-container");
          if (!container) return;
  
          const user = auth.getUser();
          const leaderboardData = arena.getLeaderboard(user);
          container.innerHTML = "";
  
          if (!leaderboardData || leaderboardData.length === 0) {
              container.innerHTML = `
                  <div style="text-align:center; padding:28px 10px; color:var(--text-muted); font-size:13px; border:2px dashed #444; border-radius:4px; margin:10px 0;">
                      <div style="font-size:26px; margin-bottom:6px;">🛡️</div>
                      <b style="color:#fff;">No ranked players on this device yet</b><br>
                      <span>Play Ranked vs Bots in the Arena to earn RP. Only profiles that have played on this device appear here.</span>
                  </div>
              `;
              return;
          }
  
          leaderboardData.forEach(entry => {
              const isUser = !!entry.isUser;
              const tierObj = ARENA_TIERS[entry.tier] || ARENA_TIERS.obsidian;
  
              const row = document.createElement("div");
              row.className = `leaderboard-row ${isUser ? 'user-highlight' : ''} ${entry.rank <= 3 ? 'top-three' : ''}`;
  
              let rankBadge = `#${entry.rank}`;
              if (entry.rank === 1) rankBadge = "👑 #1";
              else if (entry.rank === 2) rankBadge = "🥈 #2";
              else if (entry.rank === 3) rankBadge = "🥉 #3";
  
              row.innerHTML = `
                  <div class="lb-rank">${rankBadge}</div>
                  <div class="lb-player">
                      <span class="lb-flag">${headImgHTML(entry.skin || "steve", 22)}</span>
                      <span class="lb-name">${entry.name} ${isUser ? '<span style="color:#55ff55; font-size:10px; margin-left:4px; font-weight:bold;">(YOU)</span>' : ''}</span>
                  </div>
                  <div class="lb-tier" style="color:${tierObj.color}">
                      <span>${tierPipHTML(tierObj)} ${tierObj.name}</span>
                  </div>
                  <div class="lb-rp"><b>${entry.rp}</b> RP</div>
                  <div class="lb-weapon">${WEAPON_TYPES[entry.weapon]?.name || entry.weapon}</div>
                  <div class="lb-winrate">${entry.winRate || '0%'} Win</div>
              `;
              container.appendChild(row);
          });
      }
  
      // ==========================================
      // CUSTOM BOT SANDBOX FORM
      // ==========================================
  
      setupCustomBotForm() {
          const form = document.getElementById("custom-bot-form");
          if (!form) return;
  
          const sliders = [
              { id: "custom-speed", key: "speed", min: 1, max: 10, step: 0.5, defaultVal: 3.5, label: "Walk Speed" },
              { id: "custom-run-speed", key: "runSpeed", min: 2, max: 14, step: 0.5, defaultVal: 6, label: "Flee Speed" },
              { id: "custom-dash-speed", key: "dashSpeed", min: 15, max: 35, step: 1, defaultVal: 22, label: "Dash Speed" },
              { id: "custom-dash-cooldown", key: "botDashCooldown", min: 0, max: 60, step: 5, defaultVal: 20, label: "Dash Cooldown (frames)" },
              { id: "custom-dash-chance", key: "dashAttackChance", min: 0, max: 100, step: 5, defaultVal: 50, label: "Dash Attack Chance (%)" },
              { id: "custom-dodge-chance", key: "dodgeChance", min: 0, max: 100, step: 5, defaultVal: 80, label: "Slam Dodge Chance (%)" },
              { id: "custom-dash-dodge-chance", key: "dashDodgeChance", min: 0, max: 100, step: 5, defaultVal: 60, label: "Dash Dodge Chance (%)" },
              { id: "custom-slam-chance", key: "slamChance", min: 0, max: 100, step: 5, defaultVal: 95, label: "Mace Slam Chance (%)" },
              { id: "custom-damage-mult", key: "damageMult", min: 0.5, max: 3.0, step: 0.1, defaultVal: 1.5, label: "Damage Dealt Multiplier" },
              { id: "custom-damage-taken", key: "damageTaken", min: 0.2, max: 1.5, step: 0.1, defaultVal: 0.8, label: "Damage Taken Multiplier" },
              { id: "custom-hp", key: "maxHP", min: 50, max: 1500, step: 50, defaultVal: 150, label: "Max HP" }
          ];
  
          const container = document.getElementById("custom-bot-fields");
          if (container) {
              container.innerHTML = "";
              sliders.forEach((s) => {
                  const group = document.createElement("div");
                  group.className = "control-group";
                  group.innerHTML = `
                      <div class="control-label">
                          <span>${s.label}</span>
                          <span id="${s.id}-val" class="control-value">${s.defaultVal}</span>
                      </div>
                      <input type="range" id="${s.id}" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.defaultVal}" class="slider">
                  `;
                  container.appendChild(group);
  
                  const input = group.querySelector("input");
                  const valDisplay = group.querySelector(".control-value");
                  input.addEventListener("input", () => {
                      valDisplay.textContent = input.value;
                  });
              });
  
              const extrasGroup = document.createElement("div");
              extrasGroup.className = "control-group-toggles";
              extrasGroup.innerHTML = `
                  <label class="toggle-label">
                      <input type="checkbox" id="custom-air-dash" data-key="airDashRecharge">
                      <span>Instant Air Dash Recharge</span>
                  </label>
                  <label class="toggle-label">
                      <input type="checkbox" id="custom-climb-height" data-key="climbHeight" checked>
                      <span>Double Jump Climb Height (Higher Slams)</span>
                  </label>
                  <label class="toggle-label">
                      <input type="checkbox" id="custom-invisible" data-key="invisible">
                      <span>Stealth Camouflage (Periodic Invisibility)</span>
                  </label>
              `;
              container.appendChild(extrasGroup);
          }
  
          form.addEventListener("submit", (e) => {
              e.preventDefault();
              const customOverrides = {};
  
              container.querySelectorAll("input[type=range]").forEach((input) => {
                  customOverrides[input.dataset.key] = parseFloat(input.value);
              });
  
              const airDash = document.getElementById("custom-air-dash");
              if (airDash) customOverrides.airDashRecharge = airDash.checked ? 1 : 0;
  
              const climb = document.getElementById("custom-climb-height");
              if (climb) customOverrides.climbHeight = climb.checked ? 1 : 0;
  
              const invis = document.getElementById("custom-invisible");
              if (invis) {
                  customOverrides.invisible = invis.checked ? 1 : 0;
                  customOverrides.invisEvery = 600;
                  customOverrides.invisLength = 240;
              }
  
              this.customBotModal.classList.add("hidden");
              this.launchMatchWithLoading("custom", customOverrides);
          });
      }
  
      openCustomBotModal() {
          if (this.customBotModal) {
              this.customBotModal.classList.remove("hidden");
          }
      }
  
      handleHomeClick() {
          const inMatch = (this.game.state === "play" || this.game.state === "paused");
          const isMultiplayer = this.game.isTeamMatch || this.game.mode === "pvp" || this.game.mode === "online";
  
          if (inMatch && isMultiplayer) {
              if (this.resignModal) {
                  this.resignModal.classList.remove("hidden");
                  sound.playClick();
                  return;
              }
          }
  
          this.game.goHome();
      }
  
      confirmResign() {
          if (this.resignModal) this.resignModal.classList.add("hidden");
          if (this.game.isTeamMatch) {
              auth.recordArenaMatchResult(false, this.game.matchType);
          }
          sound.playLoss();
          this.game.goHome();
      }
  
      triggerMatchmakingRestart() {
          if (this.game.mode === "online") {
              this.onlineRematch();
              return;
          }
          sound.playClick();
          this.hideResultsScreen();
          if (this.statsModal) this.statsModal.classList.add("hidden");
          if (this.pauseModal) this.pauseModal.classList.add("hidden");
  
          if (this.game.isTeamMatch) {
              this.launchArenaMatchWithLoading(this.game.matchType, this.game.player.weaponId);
          } else {
              this.launchMatchWithLoading(this.game.mode);
          }
      }
  
      cancelMatchmaking() {
          if (this.matchmakingInterval) {
              clearInterval(this.matchmakingInterval);
              this.matchmakingInterval = null;
          }
          if (this.matchmakingModal) this.matchmakingModal.classList.add("hidden");
          this.game.goHome();
      }
  
      // ==========================================
      // MATCHUP LOADING / VS SCREEN (Who vs Who & Ranks)
      // ==========================================
      // Matches start instantly: close menus and go (no countdown screen)
      showMatchLoadingScreen(matchConfig, onStartCallback) {
          document.querySelectorAll(".overlay, .modal-backdrop").forEach(m => m.classList.add("hidden"));
          onStartCallback();
      }
  
      launchMatchWithLoading(modeKey, customOverrides = null) {
          const user = auth.getUser();
          const userTier = arena.getTier(user.arenaRP || 250);
          const botMeta = MODE_METADATA[modeKey] || { name: "Bot" };
  
          const blueTeam = [{
              name: user.username || "Steve",
              skinId: user.skinId || "steve",
              weaponId: user.equippedWeapon || "mace",
              rank: `${userTier.name} (${user.arenaRP || 250} RP)`,
              tierColor: userTier.color,
              isPlayer: true
          }];
  
          let botSkin = "alex";
          let botWeapon = "spear";
          let botRank = "Bronze II (450 RP)";
          let botTierColor = "#cd7f32";
  
          if (modeKey === "practice") {
              botSkin = "steve"; botWeapon = "mace"; botRank = "Training Ring"; botTierColor = "#95a5a6";
          } else if (modeKey === "easy") {
              botSkin = "alex"; botWeapon = "spear"; botRank = "Bronze II (450 RP)"; botTierColor = "#cd7f32";
          } else if (modeKey === "normal") {
              botSkin = "noob"; botWeapon = "sword"; botRank = "Gold I (1,280 RP)"; botTierColor = "#f1c40f";
          } else if (modeKey === "pro") {
              botSkin = "diamond_knight"; botWeapon = "sword"; botRank = "Diamond II (1,840 RP)"; botTierColor = "#00d2d3";
          } else if (modeKey === "god") {
              botSkin = "enderman"; botWeapon = "mace"; botRank = "Obsidian Grandmaster (2,950 RP)"; botTierColor = "#9b59b6";
          } else if (modeKey === "pvp") {
              botSkin = "alex"; botWeapon = "spear"; botRank = "Challenger Red"; botTierColor = "#e74c3c";
          } else if (modeKey === "custom") {
              botSkin = "man_face"; botWeapon = "mace"; botRank = "Custom Bot"; botTierColor = "#e67e22";
          }
  
          const redTeam = [{
              name: (modeKey === "pvp") ? "Player 2" : `[BOT] ${botMeta.name}`,
              skinId: botSkin,
              weaponId: botWeapon,
              rank: botRank,
              tierColor: botTierColor,
              isPlayer: false
          }];
  
          this.showMatchLoadingScreen({
              title: `${botMeta.name.toUpperCase()} • 1v1 MATCH`,
              blueTeam,
              redTeam
          }, () => {
              this.game.startGame(modeKey, customOverrides);
          });
      }
  
      launchArenaMatchWithLoading(matchType, weaponId) {
          const user = auth.getUser();
          const roster = arena.generateTeamRoster(matchType, user, weaponId);
  
          const blueTeam = roster.blueTeam.map(f => {
              const tier = f.tierId ? ARENA_TIERS[f.tierId] : arena.getTier(f.rp || 250);
              return {
                  name: f.name,
                  skinId: f.skinId,
                  weaponId: f.weaponId,
                  rank: `${tier.name} (${f.rp || 250} RP)`,
                  tierColor: tier.color,
                  isPlayer: f.isPlayer
              };
          });
  
          const redTeam = roster.redTeam.map(f => {
              const tier = f.tierId ? ARENA_TIERS[f.tierId] : arena.getTier(f.rp || 250);
              return {
                  name: f.name,
                  skinId: f.skinId,
                  weaponId: f.weaponId,
                  rank: `${tier.name} (${f.rp || 250} RP)`,
                  tierColor: tier.color,
                  isPlayer: false
              };
          });
  
          this.showMatchLoadingScreen({
              title: `ARENA ${matchType.toUpperCase()} RANKED MATCH`,
              blueTeam,
              redTeam
          }, () => {
              this.game.startArenaTeamMatch(matchType, weaponId);
          });
      }
  
      // ==========================================
      // FRIENDS, MAILBOX & CHILD/MINOR SAFETY UI
      // ==========================================
      setupSocialUI() {
          const modal = this.socialModal;
          if (!modal) return;
  
          // Tab switching
          const tabBtns = modal.querySelectorAll(".social-tab-btn");
          const tabPanes = modal.querySelectorAll(".tab-pane");
          tabBtns.forEach(btn => {
              btn.addEventListener("click", () => {
                  sound.playClick();
                  const target = btn.dataset.tab;
                  tabBtns.forEach(b => b.classList.toggle("active", b === btn));
                  tabPanes.forEach(p => p.classList.toggle("active", p.id === `tab-${target}`));
              });
          });
  
          // Add friend
          const addBtn = document.getElementById("btn-add-friend");
          const addInput = document.getElementById("input-add-friend");
          const addMsg = document.getElementById("add-friend-msg");
          if (addBtn && addInput) {
              addBtn.addEventListener("click", () => {
                  sound.playClick();
                  const res = auth.addFriend(addInput.value);
                  if (res.success) {
                      addInput.value = "";
                      if (addMsg) {
                          addMsg.style.color = "#2ecc71";
                          addMsg.textContent = `Added ${res.friend.name} to friends!`;
                          setTimeout(() => { if (addMsg) addMsg.textContent = ""; }, 3000);
                      }
                      this.renderFriendsList();
                  } else {
                      if (addMsg) {
                          addMsg.style.color = "#e74c3c";
                          addMsg.textContent = res.error || "Could not add friend.";
                      }
                  }
              });
          }
  
          // Send mail & gifts
          const sendBtn = document.getElementById("btn-send-mail");
          const mailTo = document.getElementById("input-mail-to");
          const mailGift = document.getElementById("input-mail-gift");
          const mailText = document.getElementById("input-mail-text");
          const sendMsg = document.getElementById("send-mail-msg");
          if (sendBtn) {
              sendBtn.addEventListener("click", () => {
                  sound.playClick();
                  const to = mailTo ? mailTo.value : "";
                  const gift = mailGift ? parseInt(mailGift.value) || 0 : 0;
                  const text = mailText ? mailText.value : "";
  
                  const res = auth.sendMail(to, "Letter from Arena", text, gift);
                  if (res.success) {
                      if (mailTo) mailTo.value = "";
                      if (mailGift) mailGift.value = "";
                      if (mailText) mailText.value = "";
                      if (sendMsg) {
                          sendMsg.style.color = "#2ecc71";
                          sendMsg.textContent = "Mail sent successfully!";
                          setTimeout(() => { if (sendMsg) sendMsg.textContent = ""; }, 3000);
                      }
                      this.renderMailbox();
                  } else {
                      if (sendMsg) {
                          sendMsg.style.color = "#e74c3c";
                          sendMsg.textContent = res.error || "Failed to send mail.";
                      }
                  }
              });
          }
  
          // Minor safety toggle
          const minorToggle = document.getElementById("toggle-minor-mode");
          if (minorToggle) {
              minorToggle.checked = !!auth.getUser().isMinor;
              minorToggle.addEventListener("change", () => {
                  sound.playClick();
                  auth.toggleMinorMode(minorToggle.checked);
                  this.updateSafetyBadge();
                  this.renderMailbox();
              });
          }
  
          this.renderFriendsList();
          this.renderMailbox();
          this.updateSafetyBadge();
      }
  
      openSocialModal() {
          if (!this.socialModal) return;
          sound.playClick();
          this.renderFriendsList();
          this.renderMailbox();
          this.updateSafetyBadge();
          this.socialModal.classList.remove("hidden");
      }
  
      renderFriendsList() {
          const list = document.getElementById("friends-list");
          const countSpan = document.getElementById("friends-count");
          if (!list) return;
  
          const friends = auth.getFriends();
          if (countSpan) countSpan.textContent = friends.length;
  
          if (friends.length === 0) {
              list.innerHTML = `<p style="color:var(--text-muted); padding:10px;">No friends added yet. Add players by username above!</p>`;
              return;
          }
  
          list.innerHTML = friends.map(f => `
              <div class="friend-item">
                  <div class="friend-name-col">
                      <span class="friend-status-dot status-${f.status || 'offline'}" title="${f.status}"></span>
                      <strong style="color:#fff;">${f.name}</strong>
                      <span style="font-size:14px; color:var(--text-muted);">(${f.status || 'offline'})</span>
                  </div>
                  <div class="friend-actions">
                      <button class="btn-ctrl btn-sm-ctrl btn-mail-friend" data-name="${f.name}">Mail / Gift</button>
                      <button class="btn-ctrl btn-sm-ctrl btn-remove-friend" data-id="${f.id}" style="color:#e74c3c;">✕</button>
                  </div>
              </div>
          `).join("");
  
          list.querySelectorAll(".btn-mail-friend").forEach(b => {
              b.addEventListener("click", () => {
                  sound.playClick();
                  const name = b.dataset.name;
                  const mailTo = document.getElementById("input-mail-to");
                  if (mailTo) mailTo.value = name;
                  const mailboxTabBtn = this.socialModal?.querySelector(".social-tab-btn[data-tab='mailbox']");
                  if (mailboxTabBtn) mailboxTabBtn.click();
              });
          });
  
          list.querySelectorAll(".btn-remove-friend").forEach(b => {
              b.addEventListener("click", () => {
                  sound.playClick();
                  auth.removeFriend(b.dataset.id);
                  this.renderFriendsList();
              });
          });
      }
  
      renderMailbox() {
          const list = document.getElementById("mail-list");
          const countSpan = document.getElementById("mail-count");
          if (!list) return;
  
          const mail = auth.getMail();
          if (countSpan) countSpan.textContent = mail.length;
  
          if (mail.length === 0) {
              list.innerHTML = `<p style="color:var(--text-muted); padding:10px;">Your mailbox is empty.</p>`;
              return;
          }
  
          list.innerHTML = mail.map(m => {
              const hasGift = (m.giftGold || 0) > 0;
              const giftHtml = hasGift 
                  ? (m.claimed 
                      ? `<span style="color:#2ecc71; font-weight:bold; font-size:15px;">Claimed ✓ (+${m.giftGold} G)</span>` 
                      : `<button class="btn-ctrl btn-sm-ctrl btn-claim-gift" data-id="${m.id}" style="background:#f1c40f; color:#000; font-weight:bold;">Claim ${m.giftGold} Gold 🎁</button>`)
                  : ``;
  
              return `
                  <div class="mail-item ${hasGift && !m.claimed ? 'has-gift' : ''}">
                      <div class="mail-top-line">
                          <span class="mail-from">From: ${m.from}</span>
                          <span class="mail-date">${m.date || 'Today'}</span>
                      </div>
                      <div class="mail-text ${m.isRestricted ? 'restricted' : ''}">
                          ${m.text}
                      </div>
                      <div class="mail-footer">
                          <div>${giftHtml}</div>
                          <button class="btn-ctrl btn-sm-ctrl btn-del-mail" data-id="${m.id}" style="color:#e74c3c;">Delete</button>
                      </div>
                  </div>
              `;
          }).join("");
  
          list.querySelectorAll(".btn-claim-gift").forEach(b => {
              b.addEventListener("click", () => {
                  const res = auth.claimMailGift(b.dataset.id);
                  if (res.success) {
                      sound.playWin();
                      this.renderMailbox();
                  }
              });
          });
  
          list.querySelectorAll(".btn-del-mail").forEach(b => {
              b.addEventListener("click", () => {
                  sound.playClick();
                  auth.deleteMail(b.dataset.id);
                  this.renderMailbox();
              });
          });
      }
  
      updateSafetyBadge() {
          const badge = document.getElementById("safety-status-badge");
          const toggle = document.getElementById("toggle-minor-mode");
          const isMinor = auth.getUser().isMinor;
  
          if (toggle) toggle.checked = !!isMinor;
          if (badge) {
              if (isMinor) {
                  badge.className = "safety-badge active-minor";
                  badge.textContent = "Active: Minor Protection Active (Text Mail Hidden, Loot Only)";
              } else {
                  badge.className = "safety-badge";
                  badge.textContent = "Active: Standard Account (All Mail & Messages Allowed)";
              }
          }
      }
  
      openStatsModal() {
          if (!this.statsModal) return;
  
          const p1 = this.game.player;
          // In team matches the head-to-head compares you with the best opponent
          const p2 = this.game.isTeamMatch
              ? this.game.redTeam.slice().sort((a, b) => (b.stats.kills - a.stats.kills) || (b.stats.damageDealt - a.stats.damageDealt))[0]
              : this.game.bot;
          const statsBody = document.getElementById("stats-body");
          if (!statsBody) return;
  
          const highest = this.game.highestJumper || p1;
          const isTiebreaker = this.game.isTiebreaker;
          const isPlayerWin = this.game.winnerTeam === (this.game.localFighter || p1).team;
          let winner = this.game.winnerTeam === "blue" ? (p1.name || "Steve") : (p2.name || "Opponent");
          if (this.game.isTeamMatch) winner = this.game.winnerTeam === "blue" ? "Blue Team" : "Red Team";
          const rewardInfo = this.game.lastRewardInfo;
  
          // Calculate Combat Performance Rating (S+, S, A, B, C, D)
          const calcGrade = (fighter, won) => {
              let score = (won ? 50 : 20);
              score += (fighter.stats.kills || 0) * 25;
              score += Math.min(40, (fighter.stats.damageDealt || 0) / 3.5);
              const slams = fighter.stats.slamsLanded || 0;
              const slamAtt = slams + (fighter.stats.slamsMissed || 0);
              if (slamAtt > 0) score += (slams / slamAtt) * 20;
              const dashes = fighter.stats.dashesLanded || 0;
              const dashAtt = dashes + (fighter.stats.dashesMissed || 0);
              if (dashAtt > 0) score += (dashes / dashAtt) * 15;
              if (score >= 95) return { grade: "S+", color: "#f1c40f" };
              if (score >= 80) return { grade: "S", color: "#f39c12" };
              if (score >= 65) return { grade: "A", color: "#00d2d3" };
              if (score >= 50) return { grade: "B", color: "#2ecc71" };
              if (score >= 35) return { grade: "C", color: "#e67e22" };
              return { grade: "D", color: "#e74c3c" };
          };
  
          const p1Grade = calcGrade(p1, isPlayerWin);
          const p2Grade = calcGrade(p2, !isPlayerWin);
  
          const p1SlamsLanded = p1.stats.slamsLanded || 0;
          const p1SlamsMissed = Math.max(0, (p1.stats.slamsAttempted || 0) - p1SlamsLanded);
          const p1SlamAcc = (p1SlamsLanded + p1SlamsMissed > 0) 
              ? Math.round((p1SlamsLanded / (p1SlamsLanded + p1SlamsMissed)) * 100) : 0;
  
          const p2SlamsLanded = p2.stats.slamsLanded || 0;
          const p2SlamsMissed = Math.max(0, (p2.stats.slamsAttempted || 0) - p2SlamsLanded);
          const p2SlamAcc = (p2SlamsLanded + p2SlamsMissed > 0) 
              ? Math.round((p2SlamsLanded / (p2SlamsLanded + p2SlamsMissed)) * 100) : 0;
  
          const p1DashesLanded = p1.stats.dashesLanded || 0;
          const p1DashesMissed = Math.max(0, (p1.stats.dashesAttempted || 0) - p1DashesLanded);
          const p1DashAcc = (p1DashesLanded + p1DashesMissed > 0)
              ? Math.round((p1DashesLanded / (p1DashesLanded + p1DashesMissed)) * 100) : 0;
  
          const p2DashesLanded = p2.stats.dashesLanded || 0;
          const p2DashesMissed = Math.max(0, (p2.stats.dashesAttempted || 0) - p2DashesLanded);
          const p2DashAcc = (p2DashesLanded + p2DashesMissed > 0)
              ? Math.round((p2DashesLanded / (p2DashesLanded + p2DashesMissed)) * 100) : 0;
  
          const p1Dmg = Math.round(p1.stats.damageDealt || 0);
          const p2Dmg = Math.round(p2.stats.damageDealt || 0);
          const totalDmg = Math.max(1, p1Dmg + p2Dmg);
          const p1DmgPct = Math.round((p1Dmg / totalDmg) * 100);
  
          const p1Alt = Math.round(p1.stats.maxHeight || 0);
          const p2Alt = Math.round(p2.stats.maxHeight || 0);
          const totalAlt = Math.max(1, p1Alt + p2Alt);
          const p1AltPct = Math.round((p1Alt / totalAlt) * 100);
  
          const p1Wep = WEAPON_TYPES[p1.weaponId] || WEAPON_TYPES.mace;
          const p2Wep = WEAPON_TYPES[p2.weaponId] || WEAPON_TYPES.mace;
  
          let rewardPills = "";
          if (rewardInfo) {
              rewardPills = `
                  <div class="stats-rewards-bar">
                      <span class="reward-pill">+${rewardInfo.goldEarned} Gold</span>
                      <span class="reward-pill xp">+${rewardInfo.xpEarned} XP</span>
                      ${rewardInfo.rpDelta ? `<span class="reward-pill rp">${rewardInfo.rpDelta > 0 ? '+' : ''}${rewardInfo.rpDelta} RP</span>` : ''}
                  </div>
              `;
          }
  
          // Subtitle text
          let subTitle = "";
          if (this.game.isTeamMatch) {
              subTitle = isTiebreaker 
                  ? '⚔️ 10-10 Sudden Death Tiebreaker (Highest Damage Won)' 
                  : `Final Score: Blue ${this.game.scoreBlue} - Red ${this.game.scoreRed} (First to 11 Kills)`;
          } else {
              const modeMeta = MODE_METADATA[this.game.mode] || {};
              const modeName = modeMeta.name || "Bot";
              subTitle = isPlayerWin ? `1v1 Duel • [${modeName.toUpperCase()}] ELIMINATED!` : `1v1 Duel • DEFEATED BY [${modeName.toUpperCase()}]`;
          }
  
          const hasBowInvolved = (p1.weaponId === "bow" || p2.weaponId === "bow" || (p1.stats.arrowsHit || 0) > 0 || (p2.stats.arrowsHit || 0) > 0);
  
          statsBody.innerHTML = `
              <div class="stats-winner-banner ${isPlayerWin ? 'victory' : 'defeat'}">
                  <div class="stats-winner-title">👑 ${winner.toUpperCase()} ${isPlayerWin ? 'VICTORY!' : 'WINS!'}</div>
                  <div class="stats-score-line">${subTitle}</div>
                  ${rewardPills}
              </div>
  
              <!-- Head-to-Head Combat Cards -->
              <div class="h2h-duel-container">
                  <!-- Blue Fighter (YOU) -->
                  <div class="h2h-fighter-card h2h-card-blue">
                      <div class="h2h-avatar-box">
                          ${headImgHTML(p1.skinId || 'steve', 40)}
                      </div>
                      <div class="h2h-info-box">
                          <div class="h2h-name-row">
                              <span class="h2h-name">${p1.name || 'You'}</span>
                              <span class="h2h-tag">YOU</span>
                          </div>
                          <div class="h2h-wep-row">
                              ${weaponIconHTML(p1.weaponId || 'mace', 16)} ${p1Wep.name}
                          </div>
                      </div>
                      <div class="h2h-grade-badge" style="border-color:${p1Grade.color}; color:${p1Grade.color};">
                          ${p1Grade.grade}
                      </div>
                  </div>
  
                  <div class="h2h-vs-divider">VS</div>
  
                  <!-- Red Fighter (OPPONENT / BOT) -->
                  <div class="h2h-fighter-card h2h-card-red">
                      <div class="h2h-avatar-box">
                          ${headImgHTML(p2.skinId || 'alex', 40)}
                      </div>
                      <div class="h2h-info-box">
                          <div class="h2h-name-row">
                              <span class="h2h-tag">FOE</span>
                              <span class="h2h-name">${p2.name || 'Bot'}</span>
                          </div>
                          <div class="h2h-wep-row">
                              ${weaponIconHTML(p2.weaponId || 'spear', 16)} ${p2Wep.name}
                          </div>
                      </div>
                      <div class="h2h-grade-badge" style="border-color:${p2Grade.color}; color:${p2Grade.color};">
                          ${p2Grade.grade}
                      </div>
                  </div>
              </div>
  
              <!-- Head-to-Head Comparative Metric Gauges -->
              <div class="h2h-stats-list">
                  <!-- Damage Dealt -->
                  <div class="h2h-stat-line">
                      <div class="h2h-stat-left ${p1Dmg >= p2Dmg ? 'winner-stat' : ''}">${p1Dmg} DMG</div>
                      <div class="h2h-stat-center">
                          <span class="h2h-stat-label">Damage Dealt</span>
                          <div class="h2h-bar-track">
                              <div class="h2h-bar-left" style="width: ${p1DmgPct}%;"></div>
                              <div class="h2h-bar-right" style="width: ${100 - p1DmgPct}%;"></div>
                          </div>
                      </div>
                      <div class="h2h-stat-right ${p2Dmg >= p1Dmg ? 'winner-stat' : ''}">${p2Dmg} DMG</div>
                  </div>
  
                  <!-- Kills -->
                  <div class="h2h-stat-line">
                      <div class="h2h-stat-left ${p1.stats.kills >= p2.stats.kills ? 'winner-stat' : ''}">${p1.stats.kills || 0} Kills</div>
                      <div class="h2h-stat-center">
                          <span class="h2h-stat-label">Eliminations</span>
                      </div>
                      <div class="h2h-stat-right ${p2.stats.kills >= p1.stats.kills ? 'winner-stat' : ''}">${p2.stats.kills || 0} Kills</div>
                  </div>
  
                  <!-- Mace Ground Slams -->
                  <div class="h2h-stat-line">
                      <div class="h2h-stat-left ${p1SlamsLanded >= p2SlamsLanded ? 'winner-stat' : ''}">
                          ${p1SlamsLanded} <span style="font-size:12px; color:#ff7675;">(${p1SlamsMissed} miss)</span>
                      </div>
                      <div class="h2h-stat-center">
                          <span class="h2h-stat-label">Mace Slams (${p1SlamAcc}% vs ${p2SlamAcc}%)</span>
                      </div>
                      <div class="h2h-stat-right ${p2SlamsLanded >= p1SlamsLanded ? 'winner-stat' : ''}">
                          ${p2SlamsLanded} <span style="font-size:12px; color:#ff7675;">(${p2SlamsMissed} miss)</span>
                      </div>
                  </div>
  
                  <!-- Dashes & Attacks -->
                  <div class="h2h-stat-line">
                      <div class="h2h-stat-left ${p1DashesLanded >= p2DashesLanded ? 'winner-stat' : ''}">
                          ${p1DashesLanded} <span style="font-size:12px; color:#ff7675;">(${p1DashesMissed} miss)</span>
                      </div>
                      <div class="h2h-stat-center">
                          <span class="h2h-stat-label">Weapon Attacks (${p1DashAcc}% vs ${p2DashAcc}%)</span>
                      </div>
                      <div class="h2h-stat-right ${p2DashesLanded >= p1DashesLanded ? 'winner-stat' : ''}">
                          ${p2DashesLanded} <span style="font-size:12px; color:#ff7675;">(${p2DashesMissed} miss)</span>
                      </div>
                  </div>
  
                  <!-- Bow Arrows (if used) -->
                  ${hasBowInvolved ? `
                  <div class="h2h-stat-line">
                      <div class="h2h-stat-left ${ (p1.stats.arrowsHit || 0) >= (p2.stats.arrowsHit || 0) ? 'winner-stat' : ''}">
                          ${p1.stats.arrowsHit || 0} Hits <span style="font-size:12px; color:#ff7675;">(${p1.stats.arrowsMissed || 0} miss)</span>
                      </div>
                      <div class="h2h-stat-center">
                          <span class="h2h-stat-label">Bow Arrows</span>
                      </div>
                      <div class="h2h-stat-right ${ (p2.stats.arrowsHit || 0) >= (p1.stats.arrowsHit || 0) ? 'winner-stat' : ''}">
                          ${p2.stats.arrowsHit || 0} Hits <span style="font-size:12px; color:#ff7675;">(${p2.stats.arrowsMissed || 0} miss)</span>
                      </div>
                  </div>
                  ` : ''}
  
                  <!-- Max Single Slam Hit -->
                  <div class="h2h-stat-line">
                      <div class="h2h-stat-left ${ (p1.stats.maxSlamDamage || 0) >= (p2.stats.maxSlamDamage || 0) ? 'winner-stat' : ''}">
                          ${Math.round(p1.stats.maxSlamDamage || 0)} DMG
                      </div>
                      <div class="h2h-stat-center">
                          <span class="h2h-stat-label">Max Slam Impact</span>
                      </div>
                      <div class="h2h-stat-right ${ (p2.stats.maxSlamDamage || 0) >= (p1.stats.maxSlamDamage || 0) ? 'winner-stat' : ''}">
                          ${Math.round(p2.stats.maxSlamDamage || 0)} DMG
                      </div>
                  </div>
  
                  <!-- Peak Jump Altitude -->
                  <div class="h2h-stat-line">
                      <div class="h2h-stat-left ${p1Alt >= p2Alt ? 'winner-stat' : ''}">${p1Alt} px</div>
                      <div class="h2h-stat-center">
                          <span class="h2h-stat-label">Peak Altitude</span>
                          <div class="h2h-bar-track">
                              <div class="h2h-bar-left" style="width: ${p1AltPct}%;"></div>
                              <div class="h2h-bar-right" style="width: ${100 - p1AltPct}%;"></div>
                          </div>
                      </div>
                      <div class="h2h-stat-right ${p2Alt >= p1Alt ? 'winner-stat' : ''}">${p2Alt} px</div>
                  </div>
              </div>
  
              <!-- Altitude Champion Crown -->
              <div class="altitude-champion-box">
                  <div class="altitude-crown">👑</div>
                  <div class="altitude-info">
                      <h4>ALTITUDE CHAMPION</h4>
                      <p><strong>${highest.name}</strong> dominated the aerial heights at <strong>${Math.round(highest.stats?.maxHeight || 0)} px</strong> peak altitude!</p>
                  </div>
              </div>
          `;
  
          // If team arena match with 3+ players, also append full team roster table
          if (this.game.allFighters && this.game.allFighters.length > 2) {
              let tableRows = "";
              this.game.allFighters.forEach(f => {
                  const st = f.stats || {};
                  const slamsMissed = Math.max(0, (st.slamsAttempted || 0) - (st.slamsLanded || 0));
                  const dashesMissed = Math.max(0, (st.dashesAttempted || 0) - (st.dashesLanded || 0));
                  const teamBadge = f.team ? ` [${f.team.toUpperCase()}]` : "";
                  tableRows += `
                      <tr>
                          <td><strong>${f.name}${teamBadge}</strong></td>
                          <td style="color:#2ecc71; font-weight:bold;">${st.kills || 0}</td>
                          <td>${st.slamsLanded || 0} <span style="color:#ff7675;">(${slamsMissed}m)</span></td>
                          <td>${st.dashesLanded || 0} <span style="color:#ff7675;">(${dashesMissed}m)</span></td>
                          <td>${Math.round(st.damageDealt || 0)}</td>
                          <td style="color:#00d2d3; font-weight:bold;">${Math.round(st.maxHeight || 0)} px</td>
                      </tr>
                  `;
              });
              const tableHtml = `
                  <div class="stats-table-container">
                      <table class="stats-table">
                          <thead>
                              <tr>
                                  <th>Squad Member</th>
                                  <th>Kills</th>
                                  <th>Slams</th>
                                  <th>Dashes</th>
                                  <th>Damage</th>
                                  <th>Peak</th>
                              </tr>
                          </thead>
                          <tbody>${tableRows}</tbody>
                      </table>
                  </div>
              `;
              statsBody.insertAdjacentHTML("beforeend", tableHtml);
          }
  
          this.statsModal.classList.remove("hidden");
      }
  
      setupTouchButtons() {
          const bindButton = (id, onDown, onUp) => {
              const btn = document.getElementById(id);
              if (!btn) return;
  
              const start = (e) => {
                  e.preventDefault();
                  sound.ensureContext();
                  onDown();
              };
              const end = (e) => {
                  e.preventDefault();
                  onUp();
              };
  
              btn.addEventListener("touchstart", start, { passive: false });
              btn.addEventListener("touchend", end, { passive: false });
              btn.addEventListener("mousedown", start);
              btn.addEventListener("mouseup", end);
          };
  
          // A / D are Player 1's keys in every mode (arrows belong to Player 2 in local PvP)
          bindButton("touch-left",
              () => { this.game.keys["KeyA"] = true; },
              () => { this.game.keys["KeyA"] = false; }
          );
          bindButton("touch-right",
              () => { this.game.keys["KeyD"] = true; },
              () => { this.game.keys["KeyD"] = false; }
          );
          bindButton("touch-jump", () => this.game.localAction("jump"), () => {});
          bindButton("touch-dash", () => this.game.localAttack(), () => {});
          bindButton("touch-slam", () => this.game.localAction("slam"), () => {});
          bindButton("touch-swap", () => this.game.localAction("swap"), () => {});
      }
  
      detectTouchDevice() {
          const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
          if (isTouch && this.touchControls) {
              this.touchControls.classList.remove("hidden");
          }
      }
  
      onStateChanged(state) {
          if (state !== "gameover") this.hideResultsScreen();
          if (state === "menu") {
              if (this.menuOverlay) this.menuOverlay.classList.remove("hidden");
              if (this.pauseModal) this.pauseModal.classList.add("hidden");
              if (this.statsModal) this.statsModal.classList.add("hidden");
          } else if (state === "play") {
              if (this.menuOverlay) this.menuOverlay.classList.add("hidden");
              if (this.pauseModal) this.pauseModal.classList.add("hidden");
              if (this.statsModal) this.statsModal.classList.add("hidden");
          } else if (state === "paused") {
              if (this.pauseModal) this.pauseModal.classList.remove("hidden");
          } else if (state === "gameover") {
              this.openResultsScreen();
          }
      }
  
      // ==========================================
      // SMASH-STYLE RESULTS SCREEN
      // ==========================================
  
      setupResultsUI() {
          this.resultsScreen = document.getElementById("results-screen");
          this.resultsTimer = null;
  
          const again = document.getElementById("btn-results-again");
          if (again) again.addEventListener("click", () => this.triggerMatchmakingRestart());
          const details = document.getElementById("btn-results-details");
          if (details) details.addEventListener("click", () => this.openStatsModal());
          const home = document.getElementById("btn-results-home");
          if (home) home.addEventListener("click", () => this.handleHomeClick());
      }
  
      hideResultsScreen() {
          if (this.resultsTimer) {
              clearTimeout(this.resultsTimer);
              this.resultsTimer = null;
          }
          if (this.resultsScreen) this.resultsScreen.classList.add("hidden");
      }
  
      openResultsScreen() {
          const screen = this.resultsScreen;
          if (!screen) {
              this.openStatsModal();
              return;
          }
          const g = this.game;
          const isPlayerWin = g.winnerTeam === "blue";
  
          // Winner name in the big banner
          let winnerName;
          if (g.isTeamMatch) {
              winnerName = isPlayerWin ? "BLUE TEAM" : "RED TEAM";
          } else if (g.mode === "pvp") {
              winnerName = isPlayerWin ? "PLAYER 1" : "PLAYER 2";
          } else if (g.mode === "online") {
              winnerName = isPlayerWin ? (g.player.name || "HOST") : (g.bot.name || "GUEST");
          } else {
              winnerName = isPlayerWin ? (g.player.name || "YOU") : (g.bot.name || "BOT");
          }
          const nameEl = document.getElementById("results-winner-name");
          nameEl.textContent = winnerName;
          screen.dataset.winner = g.winnerTeam || "blue";
  
          const subEl = document.getElementById("results-subtitle");
          if (g.isTeamMatch) {
              subEl.textContent = g.isTiebreaker
                  ? `Sudden Death • Blue ${g.scoreBlue} - Red ${g.scoreRed}`
                  : `${g.matchType.toUpperCase()} • Blue ${g.scoreBlue} - Red ${g.scoreRed}`;
          } else {
              const modeMeta = MODE_METADATA[g.mode] || {};
              subEl.textContent = g.mode === "pvp" ? "Local 1v1 Duel"
                  : g.mode === "online" ? (g.winnerTeam === g.localFighter.team ? "Online 1v1 • You won!" : "Online 1v1 • Good game!")
                  : `1v1 vs ${modeMeta.name || "Bot"}`;
          }
  
          // Placement order: winning team first, then by KOs, then damage dealt
          const fighters = (g.allFighters || [g.player, g.bot]).slice();
          const teamOf = (f) => f.team || (f === g.player ? "blue" : "red");
          fighters.sort((a, b) => {
              const aw = teamOf(a) === g.winnerTeam ? 0 : 1;
              const bw = teamOf(b) === g.winnerTeam ? 0 : 1;
              if (aw !== bw) return aw - bw;
              const ak = (a.stats && a.stats.kills) || 0;
              const bk = (b.stats && b.stats.kills) || 0;
              if (ak !== bk) return bk - ak;
              return ((b.stats && b.stats.damageDealt) || 0) - ((a.stats && a.stats.damageDealt) || 0);
          });
  
          const ordinal = (n) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
          const compact = fighters.length > 4;
          const escapeHTML = (str) => String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  
          const cards = fighters.map((f, i) => {
              const st = f.stats || {};
              // Teams share a placement (whole winning team is 1st), solo duels rank individually
              const place = g.isTeamMatch ? (teamOf(f) === g.winnerTeam ? 1 : 2) : i + 1;
              const team = teamOf(f);
              const isYou = f === (g.localFighter || g.player);
              const wep = WEAPON_TYPES[f.weaponId] || WEAPON_TYPES.mace;
              return `
                  <div class="rs-card rs-${team} ${place === 1 ? "rs-first" : ""} ${isYou ? "rs-you" : ""}" style="animation-delay:${0.15 + i * 0.08}s">
                      <div class="rs-place">${ordinal(place)}</div>
                      <div class="rs-portrait">${headImgHTML(f.skinId || (team === "blue" ? "steve" : "alex"), compact ? 32 : 72)}</div>
                      <div class="rs-name">${escapeHTML(f.name || "Fighter")}${isYou ? ' <span class="rs-you-tag">YOU</span>' : ""}</div>
                      <div class="rs-wep">${weaponIconHTML(f.weaponId || "mace", 16)} ${escapeHTML(wep.name)}</div>
                      ${f.classId && f.classId !== "normal" ? `<div class="rs-class rs-class-${f.classId}">${CLASSES[f.classId].name}</div>` : ""}
                      <div class="rs-stats">
                          <div><span>KOs</span><b>${st.kills || 0}</b></div>
                          <div><span>Falls</span><b>${st.deaths || 0}</b></div>
                          <div><span>Damage</span><b>${Math.round(st.damageDealt || 0)}</b></div>
                      </div>
                  </div>
              `;
          }).join("");
  
          const againBtn = document.getElementById("btn-results-again");
          if (againBtn) againBtn.textContent = g.mode === "online" ? "Rematch (R)" : "Play Again (R)";
  
          const fightersEl = document.getElementById("results-fighters");
          fightersEl.classList.toggle("compact", compact);
          // One row per team in team matches (winners on top)
          fightersEl.style.setProperty("--rs-cols", g.isTeamMatch ? Math.ceil(fighters.length / 2) : fighters.length);
          fightersEl.innerHTML = cards;
  
          const rewardsEl = document.getElementById("results-rewards");
          const r = g.lastRewardInfo;
          rewardsEl.innerHTML = r ? `
              <span class="reward-pill">+${r.goldEarned} Gold</span>
              <span class="reward-pill xp">+${r.xpEarned} XP</span>
              ${r.rpDelta ? `<span class="reward-pill rp">${r.rpDelta > 0 ? "+" : ""}${r.rpDelta} RP</span>` : ""}
          ` : "";
  
          // Phase 1: "GAME!" splash over the arena, Phase 2: slide in the results panel
          this.hideResultsScreen();
          screen.classList.remove("hidden", "show-panel");
          // Restart CSS animations
          void screen.offsetWidth;
          this.resultsTimer = setTimeout(() => {
              this.resultsTimer = null;
              if (this.game.state === "gameover") screen.classList.add("show-panel");
          }, 1400);
      }
  
      downloadGame() {
          sound.playClick();
          // Fetch pre-built standalone HTML file or trigger direct download
          fetch("spear-mace-pvp.html")
              .then(res => {
                  if (!res.ok) throw new Error("Fetch failed");
                  return res.blob();
              })
              .then(blob => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "spear-mace-pvp.html";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
              })
              .catch(() => {
                  const a = document.createElement("a");
                  a.href = "spear-mace-pvp.html";
                  a.download = "spear-mace-pvp.html";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
              });
      }
  }
  

  // ===== main.js =====
  // ==========================================
  // SPEAR-MACE PVP - Application Bootstrap
  // ==========================================
  
  
  window.addEventListener("DOMContentLoaded", () => {
      const canvas = document.getElementById("game-canvas");
      if (!canvas) {
          console.error("Game canvas element not found.");
          return;
      }
  
      applyMinecraftBackground("space");
  
      let ui = null;
  
      // Instantiate game engine
      const game = new Game(canvas, {
          onStateChanged: (state) => {
              if (ui) ui.onStateChanged(state);
          },
          onMuteToggled: (isMuted) => {
              if (ui) ui.updateMuteButton(isMuted);
          },
          onRestartRequested: () => {
              if (ui) ui.triggerMatchmakingRestart();
          },
          onHomeRequested: () => {
              if (ui) ui.handleHomeClick();
          }
      });
  
      // Instantiate UI and menu manager
      ui = new UIManager(game);
  
      // Start 60fps game loop
      game.start();
  
      console.log("Spear-Mace PVP initialized successfully!");
  });
  

})();