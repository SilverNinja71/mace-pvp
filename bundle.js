(function() {
  'use strict';

  // ===== config.js =====
  // ==========================================
  // SPEAR-MACE PVP - Game Configuration
  // Faithful to the original Khan Academy ProcessingJS game
  // ==========================================
  
  const ARENA_CONFIG = {
      width: 800,
      height: 400,
      groundY: 390
  };
  
  const CORE_PHYSICS = {
      gravity: 0.30,
      jumpPower: -7.5,
      coyoteTime: 10,
      groundY: 390,
  
      slamSpeed: 15,
      dashSpeed: 20,
      dashTime: 6,
      dashCooldown: 40,        // frames before player can dash again
  
      slamRadius: 30,
      slamGroundDamage: 20,
      slamAirDamage: 30,
  
      hitStun: 40,
      maxHp: 100,
  
      slamMinDamage: 20,
      slamMaxDamage: 150,
      slamHeightScale: 1,
  
      dashDamage: 20,          // damage dealt when a dash connects
      hitLaunch: -12,          // upward launch speed for attacker after hit
      runAwayTime: 60          // frames bot runs away after stun ends
  };
  
  const PLATFORMS_CONFIG = [
      { x: 0,   y: 390, w: 800, h: 30, name: "Main Floor" },
      { x: 140, y: 275, w: 150, h: 12, name: "Left Ledge" },
      { x: 510, y: 275, w: 150, h: 12, name: "Right Ledge" }
  ];
  
  // Exact Bot difficulty settings table from the original source
  const BOT_SETTINGS = {
      dashAttackChance:   { practice: 1,   easy: 8,   normal: 40,  pro: 70,  god: 70 },
      dashAttackRange:    { practice: 180, easy: 250, normal: 300, pro: 450, god: 450 },
      dashAttackHeight:   { practice: 40,  easy: 50,  normal: 60,  pro: 90,  god: 90 },
      randomDashChance:   { practice: 0.1, easy: 2,   normal: 3,   pro: 3,   god: 8 },
      escapeDashChance:   { practice: 10,  easy: 40,  normal: 40,  pro: 65,  god: 65 },
      runAwayChance:      { practice: 70,  easy: 70,  normal: 40,  pro: 15,  god: 15 },
      dodgeChance:        { practice: 8,   easy: 50,  normal: 95,  pro: 100, god: 100 },
      dodgeRange:         { practice: 50,  easy: 50,  normal: 90,  pro: 140, god: 140 },
      slamChance:         { practice: 20,  easy: 90,  normal: 100, pro: 100, god: 100 },
      slamCooldown:       { practice: 220, easy: 100, normal: 40,  pro: 20,  god: 20 },
      slamRange:          { practice: 50,  easy: 70,  normal: 90,  pro: 120, god: 120 },
      slamLead:           { practice: 0,   easy: 0,   normal: 8,   pro: 14,  god: 14 },
      climbHeight:        { practice: 0,   easy: 0,   normal: 1,   pro: 1,   god: 1 },
      punishChance:       { practice: 0,   easy: 0,   normal: 35,  pro: 80,  god: 80 },
      dashDodgeChance:    { practice: 0,   easy: 0,   normal: 45,  pro: 85,  god: 85 },
      speed:              { practice: 1.5, easy: 2,   normal: 3,   pro: 5,   god: 5 },
      runSpeed:           { practice: 3,   easy: 4,   normal: 5.5, pro: 9,   god: 9 },
      jumpChance:         { practice: 40,  easy: 80,  normal: 100, pro: 100, god: 100 },
      doubleJumpChance:   { practice: 20,  easy: 70,  normal: 100, pro: 100, god: 100 },
      damageMult:         { practice: 0.6, easy: 1,   normal: 1.65,pro: 2,   god: 2 },
      maxHP:              { practice: 1000,easy: 100, normal: 100, pro: 100, god: 100 },
      damageTaken:        { practice: 1,   easy: 1,   normal: 1,   pro: 0.7, god: 0.7 },
      stunMult:           { practice: 1,   easy: 1,   normal: 1,   pro: 0.35,god: 0.35 },
      botDashCooldown:    { practice: 40,  easy: 40,  normal: 40,  pro: 0,   god: 0 },
      dashAIDelay:        { practice: 80,  easy: 80,  normal: 80,  pro: 35,  god: 10 },
      dashSpeed:          { practice: 20,  easy: 20,  normal: 20,  pro: 28,  god: 28 },
      airDashRecharge:    { practice: 0,   easy: 0,   normal: 0,   pro: 0,   god: 1 },
      invisible:          { practice: 0,   easy: 0,   normal: 0,   pro: 1,   god: 1 },
      invisEvery:         { practice: 900, easy: 900, normal: 900, pro: 900, god: 900 },
      invisLength:        { practice: 300, easy: 300, normal: 300, pro: 300, god: 300 },
      regen:              { practice: 0,   easy: 0,   normal: 0,   pro: 0.02,god: 0.02 }
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
  function applyMinecraftBackground() {
      const c = pxCanvas(16, 16);
      const ctx = c.getContext("2d");
      
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
              dashSpeed: 20,
              dashDistance: 6, // frames
              dashDamage: 20,
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
                  costPerLevel: 150,
                  apply: (stats, lvl) => { stats.slamPower += lvl * 0.15; stats.slamMaxDmg += lvl * 15; }
              },
              {
                  id: "wind_burst",
                  name: "Wind Burst III",
                  desc: "Launches you significantly higher into the air after landing a hit.",
                  maxLevel: 3,
                  costPerLevel: 200,
                  apply: (stats, lvl) => { stats.hitLaunch -= lvl * 1.8; }
              },
              {
                  id: "breach",
                  name: "Breach IV",
                  desc: "Ignores a portion of opponent damage reduction and armor.",
                  maxLevel: 4,
                  costPerLevel: 180,
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
          baseCost: 200,
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
                  costPerLevel: 140,
                  apply: (stats, lvl) => { stats.dashDamage += lvl * 4; }
              },
              {
                  id: "piercing",
                  name: "Piercing IV",
                  desc: "Increases dash velocity and distance.",
                  maxLevel: 4,
                  costPerLevel: 175,
                  apply: (stats, lvl) => { stats.dashSpeed += lvl * 2; stats.dashDistance += lvl * 1; }
              },
              {
                  id: "feather_light",
                  name: "Breeze Agility",
                  desc: "Reduces dash cooldown time.",
                  maxLevel: 3,
                  costPerLevel: 220,
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
          baseCost: 350,
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
                  costPerLevel: 180,
                  apply: (stats, lvl) => { stats.dashDamage += lvl * 6; stats.damage += lvl * 5; }
              },
              {
                  id: "knockback",
                  name: "Knockback II",
                  desc: "Sends enemies flying further across the arena.",
                  maxLevel: 3,
                  costPerLevel: 160,
                  apply: (stats, lvl) => { stats.knockbackMult = 1.0 + lvl * 0.35; }
              },
              {
                  id: "sweeping_edge",
                  name: "Sweeping Edge III",
                  desc: "Widens the horizontal hit area of your blade slice.",
                  maxLevel: 3,
                  costPerLevel: 210,
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
          baseCost: 150,
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
                  costPerLevel: 160,
                  apply: (stats, lvl) => { stats.dashDamage += lvl * 7; stats.damage += lvl * 6; }
              },
              {
                  id: "haste",
                  name: "Haste Beacon",
                  desc: "Reduces attack cooldown for rapid-fire punch barrages.",
                  maxLevel: 4,
                  costPerLevel: 180,
                  apply: (stats, lvl) => { stats.attackCooldown -= lvl * 3; }
              },
              {
                  id: "iron_grip",
                  name: "Heavy Fist Impact",
                  desc: "Increases stun duration dealt to struck opponents.",
                  maxLevel: 3,
                  costPerLevel: 200,
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
          baseCost: 500,
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
                  costPerLevel: 200,
                  apply: (stats, lvl) => { stats.arrowDamage += lvl * 7; }
              },
              {
                  id: "infinity",
                  name: "Infinity / Quick Charge",
                  desc: "Dramatically reduces bow reload time between shots.",
                  maxLevel: 4,
                  costPerLevel: 220,
                  apply: (stats, lvl) => { stats.reloadTime = Math.max(18, stats.reloadTime - lvl * 7); }
              },
              {
                  id: "punch",
                  name: "Punch II",
                  desc: "Adds strong knockback to arrows.",
                  maxLevel: 3,
                  costPerLevel: 180,
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
  
      spawnArrow(x, y, facing, ownerId, ownerTeam, damage = 30, speed = 16, knockbackMult = 1.0) {
          this.arrows.push({
              x,
              y,
              vx: facing * speed,
              vy: -1.2, // slight upward arc
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
                      // Hit fighter!
                      f.hp -= a.damage;
                      f.hitCooldown = 20;
                      f.stun = 25;
                      f.xVel = a.facing * 7 * (a.knockbackMult || 1.0);
                      f.yVel = -5;
  
                      if (onHitCallback) {
                          onHitCallback(f, a);
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
  
  const NATIONAL_LEADERBOARD_SEED = [
      { rank: 1, name: "xX_MaceGod_Xx", rp: 2840, tier: "obsidian", wins: 342, winRate: "89%", weapon: "mace", flag: "", skin: "steve" },
      { rank: 2, name: "SkySniper_Pro", rp: 2715, tier: "obsidian", wins: 298, winRate: "84%", weapon: "bow", flag: "", skin: "alex" },
      { rank: 3, name: "DiamondSlicer", rp: 2640, tier: "obsidian", wins: 285, winRate: "82%", weapon: "sword", flag: "", skin: "man_face" },
      { rank: 4, name: "BreezeTitan", rp: 2580, tier: "obsidian", wins: 260, winRate: "80%", weapon: "spear", flag: "", skin: "steve" },
      { rank: 5, name: "NoobDestroyer99", rp: 2490, tier: "obsidian", wins: 245, winRate: "79%", weapon: "fists", flag: "", skin: "noob" },
      { rank: 6, name: "ApexSlammer", rp: 2410, tier: "obsidian", wins: 231, winRate: "77%", weapon: "mace", flag: "", skin: "creeper" },
      { rank: 7, name: "EnderValkyrie", rp: 2350, tier: "obsidian", wins: 219, winRate: "76%", weapon: "spear", flag: "", skin: "enderman" },
      { rank: 8, name: "NetherKnight", rp: 2280, tier: "obsidian", wins: 208, winRate: "75%", weapon: "sword", flag: "", skin: "steve" },
      { rank: 9, name: "GravityGhost", rp: 2190, tier: "obsidian", wins: 195, winRate: "74%", weapon: "mace", flag: "", skin: "skeleton" },
      { rank: 10, name: "BowLegend_Infinity", rp: 2120, tier: "obsidian", wins: 184, winRate: "73%", weapon: "bow", flag: "", skin: "alex" }
  ];
  
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
  
          // User is always Captain of Red Team
          redTeam.push({
              id: "player_user",
              name: userProfile.username || "Player",
              isPlayer: true,
              team: "red",
              weaponId: selectedWeaponId,
              skinId: userProfile.skinId || "steve",
              maxHp: 100,
              x: 120,
              y: 300,
              facing: 1
          });
  
          const botNames = [
              "SkyCrusher", "BladeStorm", "VortexStriker", "ArrowFlurry",
              "ObsidianGuard", "MaceBrawler", "WindStalker", "IronGolem",
              "NetherReaper", "DiamondFighter"
          ];
          const weaponPool = ["mace", "spear", "sword", "fists", "bow"];
          const skinPool = ["steve", "alex", "noob", "man_face", "creeper", "enderman"];
  
          // Fill remaining Red Team slots if 2v2 or 5v5
          for (let i = 1; i < totalPerTeam; i++) {
              const bName = botNames[i % botNames.length];
              const wep = weaponPool[Math.floor(Math.random() * weaponPool.length)];
              const skin = skinPool[Math.floor(Math.random() * skinPool.length)];
              redTeam.push({
                  id: `bot_red_${i}`,
                  name: `${bName}`,
                  isPlayer: false,
                  team: "red",
                  weaponId: wep,
                  skinId: skin,
                  maxHp: 100,
                  x: 100 + i * 45,
                  y: 300,
                  facing: 1
              });
          }
  
          // Fill Blue Team slots
          for (let i = 0; i < totalPerTeam; i++) {
              const bName = botNames[(i + 4) % botNames.length];
              const wep = weaponPool[Math.floor(Math.random() * weaponPool.length)];
              const skin = skinPool[Math.floor(Math.random() * skinPool.length)];
              blueTeam.push({
                  id: `bot_blue_${i}`,
                  name: `Rival_${bName}`,
                  isPlayer: false,
                  team: "blue",
                  weaponId: wep,
                  skinId: skin,
                  maxHp: 100,
                  x: 680 - i * 45,
                  y: 300,
                  facing: -1
              });
          }
  
          return { redTeam, blueTeam, matchType };
      }
  
      // Get national leaderboard with player inserted at their appropriate rank
      getLeaderboard(userProfile) {
          const board = [...NATIONAL_LEADERBOARD_SEED];
          const userRP = userProfile.arenaRP || 250;
          const userTier = this.getTier(userRP);
          const userWins = userProfile.stats?.wins || 0;
          const matches = userProfile.stats?.matches || 0;
          const userWinRate = matches > 0 ? `${Math.round((userWins / matches) * 100)}%` : "0%";
  
          const playerEntry = {
              rank: 999,
              name: `${userProfile.username || 'You'} (YOU)`,
              rp: userRP,
              tier: userTier.id,
              wins: userWins,
              winRate: userWinRate,
              weapon: userProfile.equippedWeapon || "mace",
              flag: "",
              skin: userProfile.skinId || "steve",
              isUser: true
          };
  
          // Determine user rank based on RP
          let inserted = false;
          for (let i = 0; i < board.length; i++) {
              if (userRP >= board[i].rp) {
                  board.splice(i, 0, playerEntry);
                  inserted = true;
                  break;
              }
          }
  
          if (!inserted) {
              board.push(playerEntry);
          }
  
          // Re-index ranks
          board.forEach((entry, idx) => {
              entry.rank = idx + 1;
          });
  
          return board;
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
      { id: "noob", name: "Roblox Noob", icon: "", cost: 100, desc: "The iconic yellow block head with simple smile and blue torso." },
      { id: "man_face", name: "Roblox Man Face", icon: "", cost: 200, desc: "The legendary, unmistakable smirking block face." },
      { id: "creeper", name: "Creeper Face", icon: "", cost: 250, desc: "Pixelated green explosive face with iconic black frown." },
      { id: "enderman", name: "Enderman", icon: "", cost: 300, desc: "Deep dark obsidian head with glowing mystical violet eyes." },
      { id: "skeleton", name: "Skeleton Skull", icon: "", cost: 250, desc: "Bone white archer skull with hollow dark eyes." },
      { id: "zombie", name: "Zombie", icon: "", cost: 200, desc: "Infected undead Steve with necrotic green skin." },
      { id: "diamond_knight", name: "Diamond Helmet", icon: "", cost: 400, desc: "Gleaming enchanted diamond helmet warrior." }
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
                  if (parsed.gold === undefined) parsed.gold = 500;
                  if (!parsed.equippedWeapon) parsed.equippedWeapon = "mace";
                  if (!parsed.unlockedWeapons) parsed.unlockedWeapons = ["mace", "spear"];
                  if (!parsed.weaponUpgrades) parsed.weaponUpgrades = {};
                  if (!parsed.skinId) parsed.skinId = "steve";
                  if (!parsed.unlockedSkins) parsed.unlockedSkins = ["steve", "alex"];
                  if (parsed.arenaRP === undefined) parsed.arenaRP = 250;
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
              gold: 500, // 500 starter gold
              equippedWeapon: "mace",
              unlockedWeapons: ["mace", "spear"],
              weaponUpgrades: {},
              skinId: "steve",
              unlockedSkins: ["steve", "alex"],
              arenaRP: 250,
              stats: {
                  matches: 0,
                  wins: 0,
                  losses: 0,
                  slamsLanded: 0,
                  dashesLanded: 0,
                  maxSlamDamage: 0,
                  currentStreak: 0,
                  bestStreak: 0
              }
          };
      }
  
      saveUser() {
          try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(this.user));
              this.notifyListeners();
          } catch (e) {
              console.error("Failed to save user profile:", e);
          }
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
  
      equipWeapon(weaponId) {
          if (this.user.unlockedWeapons.includes(weaponId)) {
              this.user.equippedWeapon = weaponId;
              this.saveUser();
              return true;
          }
          return false;
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
  
      initGoogleClient() {
          if (typeof window !== "undefined" && window.google && window.google.accounts) {
              try {
                  const clientId = window.GOOGLE_CLIENT_ID || null;
                  if (clientId) {
                      window.google.accounts.id.initialize({
                          client_id: clientId,
                          callback: (response) => this.handleGoogleCredentialResponse(response)
                      });
                  }
              } catch (e) {
                  console.warn("Google Identity Services initialization warning:", e);
              }
          }
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
          this.user.email = null;
          this.user.authProvider = "guest";
          this.user.avatarType = "preset";
          this.user.avatarVal = "steve";
          this.user.avatarUrl = null;
          this.saveUser();
      }
  
      // ==========================================
      // PROGRESSION & COMBAT RESULTS
      // ==========================================
  
      recordMatchResult(isWin, mode = "normal", matchStats = null) {
          const s = this.user.stats;
          s.matches++;
  
          let goldEarned = 0;
          let xpEarned = 0;
  
          if (isWin) {
              s.wins++;
              s.currentStreak++;
              if (s.currentStreak > s.bestStreak) {
                  s.bestStreak = s.currentStreak;
              }
  
              // Defeating bots creates gold & XP scaled by difficulty!
              if (mode === "god") {
                  goldEarned = 350;
                  xpEarned = 300;
              } else if (mode === "pro") {
                  goldEarned = 180;
                  xpEarned = 160;
              } else if (mode === "normal") {
                  goldEarned = 100;
                  xpEarned = 90;
              } else if (mode === "easy") {
                  goldEarned = 50;
                  xpEarned = 50;
              } else {
                  goldEarned = 25; // practice
                  xpEarned = 25;
              }
          } else {
              s.losses++;
              s.currentStreak = 0;
              goldEarned = 20; // consolation
              xpEarned = 35;
          }
  
          if (matchStats) {
              s.slamsLanded += (matchStats.slamsLanded || 0);
              s.dashesLanded += (matchStats.dashesLanded || 0);
              if (matchStats.maxSlamDamage > s.maxSlamDamage) {
                  s.maxSlamDamage = matchStats.maxSlamDamage;
              }
          }
  
          this.addGold(goldEarned);
          this.addXP(xpEarned);
          this.saveUser();
  
          return { isWin, goldEarned, xpEarned };
      }
  
      // Ranked Arena Match Outcome
      recordArenaMatchResult(isWin, matchType = "1v1") {
          const s = this.user.stats;
          s.matches++;
  
          let rpDelta = 0;
          let goldEarned = 0;
          let xpEarned = 0;
  
          if (isWin) {
              s.wins++;
              s.currentStreak++;
              if (s.currentStreak > s.bestStreak) {
                  s.bestStreak = s.currentStreak;
              }
  
              rpDelta = matchType === "5v5" ? 45 : (matchType === "2v2" ? 35 : 30);
              goldEarned = matchType === "5v5" ? 280 : (matchType === "2v2" ? 200 : 160);
              xpEarned = 150;
  
              this.user.arenaRP = (this.user.arenaRP || 250) + rpDelta;
          } else {
              s.losses++;
              s.currentStreak = 0;
              rpDelta = -12;
              goldEarned = 40;
              xpEarned = 50;
  
              this.user.arenaRP = Math.max(0, (this.user.arenaRP || 250) + rpDelta);
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
  
      setSkin(skinId) {
          this.skinId = skinId;
      }
  
      setTeam(team) {
          this.team = team;
      }
  
      reset(x, facing, maxHp = 100) {
          this.x = x;
          this.y = 300;
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
  
      // Jump / Double Jump execution with Input Buffering
      jump() {
          if (this.stun > 0 || this.dashing) {
              // Buffer jump while recovering from stun or dash
              this.jumpBuffer = 6;
              return false;
          }
  
          if (this.onGround || this.coyoteTimer > 0 || this.jumpsLeft > 0) {
              const isDoubleJump = !this.onGround && this.coyoteTimer <= 0;
  
              this.yVel = CORE_PHYSICS.jumpPower;
  
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
          if (this.stun > 0) {
              if (this.stun <= 5) this.dashBuffer = 6;
              return false;
          }
  
          const speed = customSpeed ?? (this.weaponStats.dashSpeed || CORE_PHYSICS.dashSpeed);
          const cooldown = customCooldown ?? (this.weaponStats.attackCooldown || CORE_PHYSICS.dashCooldown);
          const duration = this.weaponStats.dashDistance || CORE_PHYSICS.dashTime;
  
          // If equipped with Bow, dash key shoots an arrow!
          if (this.weaponId === "bow") {
              if (this.arrowCooldown <= 0 && arrowManager) {
                  const reloadTime = this.weaponStats.reloadTime || 45;
                  this.arrowCooldown = reloadTime;
  
                  // Spawn arrow
                  arrowManager.spawnArrow(
                      this.facing > 0 ? this.x + this.w + 4 : this.x - 4,
                      this.y + this.h / 2,
                      this.facing,
                      this.id,
                      this.team,
                      this.weaponStats.arrowDamage || 30,
                      this.weaponStats.arrowSpeed || 16,
                      this.weaponStats.arrowKnockback || 1.0
                  );
  
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
  
          if (this.dashReady && !this.dashing && this.dashCooldown <= 0) {
              this.dashReady = false;
              this.dashing = true;
              this.dashAttack = isAttack;
              this.dashTimer = duration;
              this.dashCooldown = cooldown;
  
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
          if (this.stun > 0 || this.onGround || this.slamming || this.dashing) return false;
  
          this.slamming = true;
          this.slamStartY = this.y;
          this.yVel = CORE_PHYSICS.slamSpeed;
  
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
                  prevBottom <= p.y + 1 &&
                  this.y + this.h >= p.y &&
                  this.yVel >= 0
              ) {
                  this.y = p.y - this.h;
                  this.yVel = 0;
                  this.onGround = true;
  
                  // Reset double jump
                  this.jumpsLeft = 1;
  
                  // Landing recharges dash
                  if (!this.dashing) {
                      this.dashReady = true;
                  }
  
                  return true;
              }
          }
  
          return false;
      }
  
      // Core physics step
      updatePhysics(platforms, particleManager = null, arrowManager = null) {
          if (this.hp <= 0) return;
  
          // Update stat tracking (altitude)
          const altitude = Math.max(0, ARENA_CONFIG.groundY - this.y);
          if (altitude > this.stats.maxHeight) {
              this.stats.maxHeight = altitude;
          }
  
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
  
          // Keep slam at high speed
          if (this.slamming && !this.dashing) {
              if (this.yVel < CORE_PHYSICS.slamSpeed) {
                  this.yVel = CORE_PHYSICS.slamSpeed;
              }
          }
  
          // Store bottom before position step
          const prevBottom = this.y + this.h;
          const wasGrounded = this.onGround;
  
          // Apply movement
          this.x += this.xVel;
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
              this.hp = 0;
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
                  if (Math.abs(distance) > 35) {
                      bot.xVel = distance > 0 ? P.speed : -P.speed;
                  } else {
                      bot.xVel *= 0.8;
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
                  this.dashTimerAI <= 0 &&
                  Math.abs(distance) < P.dashAttackRange &&
                  Math.abs(targetPlayer.y - bot.y) < P.dashAttackHeight
              ) {
                  if (Math.random() * 100 < P.dashAttackChance) {
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
      }
  
      // Resolves direct mid-air mace slam
      checkAirSlam(attacker, defender, damageMultiplier, stunMultiplier, onDefenderHit = null) {
          if (!attacker.slamming || attacker.dashing) return false;
          if (defender.hp <= 0 || defender.hitCooldown > 0) return false;
          // Friendly fire protection
          if (attacker.team && defender.team && attacker.team === defender.team) return false;
  
          const wStats = attacker.weaponStats || {};
          const slamScale = wStats.slamPower || CORE_PHYSICS.slamHeightScale;
          const slamMaxDmg = wStats.slamMaxDmg || CORE_PHYSICS.slamMaxDamage;
          const hitLaunch = wStats.hitLaunch || CORE_PHYSICS.hitLaunch;
  
          // Bounding box collision
          if (
              attacker.x < defender.x + defender.w &&
              attacker.x + attacker.w > defender.x &&
              attacker.y < defender.y + defender.h &&
              attacker.y + attacker.h > defender.y
          ) {
              const heightDifference = defender.y - attacker.y;
              let slamDamage = CORE_PHYSICS.slamMinDamage + heightDifference * slamScale;
              slamDamage = Math.max(CORE_PHYSICS.slamMinDamage, Math.min(slamMaxDmg, slamDamage));
  
              // Breach armor upgrade check
              let effDmgMult = damageMultiplier;
              if (wStats.breachArmor) {
                  effDmgMult = Math.max(effDmgMult, 1.0 - (1.0 - effDmgMult) * (1.0 - wStats.breachArmor));
              }
  
              const finalDamage = slamDamage * effDmgMult;
              defender.hp -= finalDamage;
              defender.hitCooldown = 25;
              defender.stun = Math.round(CORE_PHYSICS.hitStun * stunMultiplier);
  
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
              attacker.stats.damageDealt += finalDamage;
              attacker.stats.slamsLanded++;
              if (finalDamage > attacker.stats.maxSlamDamage) {
                  attacker.stats.maxSlamDamage = finalDamage;
              }
              defender.stats.damageTaken += finalDamage;
  
              if (onDefenderHit) onDefenderHit();
  
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
  
          if (
              distance <= CORE_PHYSICS.slamRadius &&
              Math.abs(attacker.y - defender.y) < 40 &&
              defender.hp > 0 &&
              defender.hitCooldown <= 0
          ) {
              const finalDamage = CORE_PHYSICS.slamGroundDamage * damageMultiplier;
              defender.hp -= finalDamage;
              defender.hitCooldown = 25;
              defender.stun = Math.round(CORE_PHYSICS.hitStun * stunMultiplier);
  
              defender.slamming = false;
              defender.dashing = false;
              defender.dashAttack = false;
  
              // Attacker lands firmly on the ground without huge recoil boost or self-damage
              attacker.yVel = 0;
              attacker.onGround = true;
              attacker.dashReady = true;
  
              attacker.stats.damageDealt += finalDamage;
              attacker.stats.slamsLanded++;
              defender.stats.damageTaken += finalDamage;
  
              if (onDefenderHit) onDefenderHit();
  
              sound.playSlamHit(0.4);
              this.particles.addHitSparks(defenderCenter, defender.y + defender.h / 2, 12, "#ffaa00");
              this.particles.addDamageText(defender.x + defender.w / 2, defender.y, finalDamage, true);
              this.particles.triggerShake(9, 12);
  
              return true;
          }
  
          return false;
      }
  
      // Resolves dashing collision (Sword slash, Fist punch, Spear thrust, Mace charge)
      checkDashHit(attacker, defender, damageMultiplier, stunMultiplier, onDefenderHit = null) {
          if (!attacker.dashing || !attacker.dashAttack) return false;
          if (defender.hp <= 0 || defender.hitCooldown > 0) return false;
          if (attacker.team && defender.team && attacker.team === defender.team) return false;
  
          const wStats = attacker.weaponStats || {};
          const baseDmg = wStats.dashDamage || CORE_PHYSICS.dashDamage;
          const knockMult = wStats.knockbackMult || 1.0;
          const stunBonus = wStats.stunBonus || 0;
          const rangeExtra = (wStats.range && wStats.range > 25) ? (wStats.range - 25) : 0;
  
          if (
              attacker.x - rangeExtra < defender.x + defender.w &&
              attacker.x + attacker.w + rangeExtra > defender.x &&
              attacker.y < defender.y + defender.h &&
              attacker.y + attacker.h > defender.y
          ) {
              const finalDamage = baseDmg * damageMultiplier;
              defender.hp -= finalDamage;
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
  
              attacker.stats.damageDealt += finalDamage;
              attacker.stats.dashesLanded++;
              defender.stats.damageTaken += finalDamage;
  
              if (onDefenderHit) onDefenderHit();
  
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
          this.canvas.style.width = `${this.width}px`;
          this.canvas.style.height = `${this.height}px`;
          this.ctx.scale(this.dpr, this.dpr);
      }
  
      setBiome(biome) {
          this.biome = biome || "overworld";
      }
  
      drawBackground() {
          const ctx = this.ctx;
          this.frameCount++;
          const biome = this.biome || "overworld";
  
          if (biome === "nether") {
              // Nether: Deep crimson-orange fog and netherrack peaks
              ctx.fillStyle = "#330808";
              ctx.fillRect(0, 0, this.width, this.height);
  
              // Lava river glow at horizon
              ctx.fillStyle = "#cf4417";
              ctx.fillRect(0, 310, this.width, this.height - 310);
  
              // Netherrack pillars & jagged stalagmites
              ctx.fillStyle = "#5c1818";
              const pillars = [[0, 260], [100, 220], [220, 270], [340, 230], [460, 280], [580, 210], [700, 250]];
              for (const [px, py] of pillars) {
                  ctx.fillRect(px, py, 90, this.height - py);
              }
  
              // Floating ash particles
              ctx.fillStyle = "#ff7b25";
              for (let i = 0; i < 15; i++) {
                  const ax = (Math.sin(this.frameCount * 0.02 + i * 1.5) * 400 + 400 + i * 27) % this.width;
                  const ay = (this.frameCount * 0.4 + i * 31) % 360;
                  ctx.fillRect(ax, ay, 3, 3);
              }
          } else if (biome === "end") {
              // The End: Void darkness with obsidian pillars
              ctx.fillStyle = "#0c0714";
              ctx.fillRect(0, 0, this.width, this.height);
  
              // Distant purple void clouds
              ctx.fillStyle = "#221338";
              ctx.fillRect(0, 280, this.width, this.height - 280);
  
              // Tall Obsidian Spikes
              ctx.fillStyle = "#15151e";
              ctx.fillRect(80, 140, 50, 250);
              ctx.fillRect(320, 90, 60, 300);
              ctx.fillRect(600, 160, 55, 230);
  
              // Ender crystal glow at top of middle pillar
              const glow = (Math.sin(this.frameCount * 0.1) > 0) ? "#e066ff" : "#b030d0";
              ctx.fillStyle = glow;
              ctx.fillRect(342, 75, 16, 15);
          } else {
              // Overworld: Flat Minecraft sky (no gradient)
              ctx.fillStyle = "#79a6ff";
              ctx.fillRect(0, 0, this.width, this.height);
  
              // Blocky distant hills (stepped, flat colors)
              ctx.fillStyle = "#5f8f4f";
              const hills = [[0, 320], [80, 296], [160, 272], [240, 296], [320, 320], [400, 296], [480, 264], [560, 288], [640, 312], [720, 288]];
              for (const [hx, hy] of hills) {
                  ctx.fillRect(hx, hy, 80, this.height - hy);
              }
  
              // Drifting blocky clouds
              ctx.fillStyle = "#ffffff";
              for (const cloud of this.clouds) {
                  cloud.x += cloud.speed;
                  if (cloud.x > this.width + 100) cloud.x = -150;
  
                  const cx = Math.round(cloud.x / 8) * 8;
                  const cy = Math.round(cloud.y / 8) * 8;
                  ctx.fillRect(cx, cy, cloud.w, 16);
                  ctx.fillRect(cx + 16, cy - 8, Math.round(cloud.w * 0.6 / 8) * 8, 8);
                  ctx.fillStyle = "#dfe9ff";
                  ctx.fillRect(cx, cy + 16, cloud.w, 4);
                  ctx.fillStyle = "#ffffff";
              }
          }
      }
  
      drawPlatforms() {
          const ctx = this.ctx;
          const biome = this.biome || "overworld";
  
          for (const p of PLATFORMS_CONFIG) {
              if (biome === "nether") {
                  // Netherrack platform with red nether brick
                  ctx.fillStyle = "#632222";
                  ctx.fillRect(p.x, p.y, p.w, p.h);
                  ctx.fillStyle = "#4a1414";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      ctx.fillRect(bx, p.y, 2, p.h);
                  }
                  ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
  
                  // Crimson nylium top fringe
                  ctx.fillStyle = "#9e1b2f";
                  ctx.fillRect(p.x, p.y, p.w, 6);
                  ctx.fillStyle = "#731120";
                  for (let gx = p.x; gx < p.x + p.w; gx += 8) {
                      ctx.fillRect(gx, p.y + 6, 4, 3);
                  }
              } else if (biome === "end") {
                  // End stone platform with purpur/obsidian trim
                  ctx.fillStyle = "#dfddaa";
                  ctx.fillRect(p.x, p.y, p.w, p.h);
                  ctx.fillStyle = "#b5b279";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      ctx.fillRect(bx, p.y, 2, p.h);
                  }
                  ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
  
                  // Purpur top cap
                  ctx.fillStyle = "#995a94";
                  ctx.fillRect(p.x, p.y, p.w, 5);
                  ctx.fillStyle = "#6d3b6a";
                  for (let gx = p.x; gx < p.x + p.w; gx += 8) {
                      ctx.fillRect(gx, p.y + 5, 4, 2);
                  }
              } else {
                  // Overworld: Stone block platform with grass top
                  ctx.fillStyle = "#7d7d7d";
                  ctx.fillRect(p.x, p.y, p.w, p.h);
                  ctx.fillStyle = "#5f5f5f";
                  for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                      ctx.fillRect(bx, p.y, 2, p.h);
                  }
                  ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
                  if (p.h > 12) ctx.fillRect(p.x, p.y + Math.floor(p.h / 2), p.w, 2);
  
                  // Grass top (ground) or stone cap (floating)
                  ctx.fillStyle = p.y >= 380 ? "#5da83e" : "#a4a4a4";
                  ctx.fillRect(p.x, p.y, p.w, 6);
                  ctx.fillStyle = p.y >= 380 ? "#3f7d2a" : "#808080";
                  for (let gx = p.x; gx < p.x + p.w; gx += 8) {
                      ctx.fillRect(gx, p.y + 6, 4, 2);
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
      drawFighter(f, fallbackColor = [120, 40, 190], showOverheadBar = false) {
          if (f.hp <= 0) return;
  
          const ctx = this.ctx;
          const centerX = f.x + f.w / 2;
          const centerY = f.y + f.h / 2;
  
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.scale(f.squashX || 1.0, f.squashY || 1.0);
          ctx.translate(-centerX, -centerY);
  
          // Draw weapon
          this.drawWeapons(f, 1.0);
  
          // Draw skin / block face
          this.drawSkin(f, 1.0);
  
          // Team highlight border and aura (Red vs Blue in arena)
          if (f.team) {
              const teamColor = f.team === "red" ? "#ff4757" : "#1e90ff";
              const teamAura = f.team === "red" ? "rgba(255, 71, 87, 0.28)" : "rgba(30, 144, 255, 0.28)";
  
              // Soft highlight aura around the character
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
  
      drawOverheadBar(f) {
          const ctx = this.ctx;
          ctx.save();
  
          const barW = 34;
          const barH = 4;
          const barX = f.x + f.w / 2 - barW / 2;
          const barY = f.y - 12;
  
          // Background
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
  
          // HP fill
          const ratio = Math.max(0, f.hp / f.maxHp);
          ctx.fillStyle = f.team === "red" ? "#ff4757" : (f.team === "blue" ? "#3498db" : "#2ecc71");
          ctx.fillRect(barX, barY, barW * ratio, barH);
  
          // Name tag
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px 'Segoe UI', system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(f.name || (f.team ? f.team.toUpperCase() : "P"), f.x + f.w / 2, barY - 2);
  
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
      drawHUD(player, bot, botColor, modeLabel, p1Label = "YOU", p2Label = "BOT") {
          const ctx = this.ctx;
          ctx.save();
  
          const barW = 160;
          const barH = 18;
  
          // Player 1 HP
          ctx.fillStyle = "rgba(30, 30, 30, 0.85)";
          ctx.fillRect(20, 18, barW, barH);
  
          const p1GhostRatio = Math.max(0, player.ghostHp / player.maxHp);
          ctx.fillStyle = "#ff4757";
          ctx.fillRect(20, 18, barW * p1GhostRatio, barH);
  
          const p1Ratio = Math.max(0, player.hp / player.maxHp);
          ctx.fillStyle = "#2ecc71";
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
  
          ctx.fillStyle = "#000000";
          ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(`${p1Label}: ${Math.max(0, player.hp).toFixed(1)}`, 24, 27);
  
          // Bot / Player 2 HP
          const bX = this.width - 20 - barW;
          ctx.fillStyle = "rgba(30, 30, 30, 0.85)";
          ctx.fillRect(bX, 18, barW, barH);
  
          const bGhostRatio = Math.max(0, bot.ghostHp / bot.maxHp);
          ctx.fillStyle = "#ff4757";
          ctx.fillRect(bX, 18, barW * bGhostRatio, barH);
  
          const bRatio = Math.max(0, bot.hp / bot.maxHp);
          ctx.fillStyle = `rgb(${botColor[0]}, ${botColor[1]}, ${botColor[2]})`;
          ctx.fillRect(bX, 18, barW * bRatio, barH);
  
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeRect(bX, 18, barW, barH);
  
          const bDashRatio = bot.dashCooldown > 0 ? (1 - bot.dashCooldown / 40) : 1;
          ctx.fillStyle = bot.dashReady && bot.dashCooldown <= 0 ? "#00d2d3" : "#576574";
          ctx.fillRect(bX, 38, barW * bDashRatio, 4);
  
          ctx.fillStyle = (botColor[0] + botColor[1] + botColor[2] < 200) ? "#ffffff" : "#000000";
          ctx.fillText(`${p2Label}: ${Math.max(0, bot.hp).toFixed(1)}`, bX + 6, 27);
  
          // Mode Label (Centered top)
          ctx.fillStyle = "#1e272e";
          ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(modeLabel.toUpperCase() + " MODE", this.width / 2, 26);
  
          ctx.restore();
      }
  
      // Team Arena 2v2 and 5v5 HUD
      drawTeamArenaHUD(redTeam, blueTeam, matchType) {
          const ctx = this.ctx;
          ctx.save();
  
          const redAlive = redTeam.filter(f => f.hp > 0).length;
          const blueAlive = blueTeam.filter(f => f.hp > 0).length;
  
          // Red Banner (Left)
          ctx.fillStyle = "rgba(231, 76, 60, 0.95)";
          ctx.fillRect(20, 16, 140, 26);
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 2;
          ctx.strokeRect(20, 16, 140, 26);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`RED TEAM (${redAlive}/${redTeam.length})`, 90, 29);
  
          // Blue Banner (Right)
          ctx.fillStyle = "rgba(41, 128, 185, 0.95)";
          ctx.fillRect(this.width - 160, 16, 140, 26);
          ctx.strokeRect(this.width - 160, 16, 140, 26);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 13px monospace";
          ctx.fillText(`BLUE TEAM (${blueAlive}/${blueTeam.length})`, this.width - 90, 29);
  
          // Center Match Type Badge
          ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
          ctx.fillRect(this.width / 2 - 60, 16, 120, 26);
          ctx.strokeRect(this.width / 2 - 60, 16, 120, 26);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px monospace";
          ctx.fillText(`ARENA ${matchType.toUpperCase()}`, this.width / 2, 29);
  
          ctx.restore();
      }
  
      drawControlsHint(isPvP = false) {
          const ctx = this.ctx;
          ctx.save();
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
          ctx.textAlign = "left";
  
          if (isPvP) {
              ctx.fillText("P1: WASD = MOVE/JUMP | SPACE = ATTACK/DASH/BOW | S = SLAM", 14, this.height - 18);
              ctx.textAlign = "right";
              ctx.fillText("P2: ARROWS = MOVE/JUMP | ENTER = ATTACK/DASH/BOW | DOWN = SLAM", this.width - 14, this.height - 18);
          } else {
              ctx.fillText("ARROWS / WASD = MOVE   •   UP = JUMP / DOUBLE JUMP", 14, this.height - 24);
              ctx.fillText("SPACE = WEAPON ATTACK / DASH / SHOOT BOW   •   DOWN / S = MACE SLAM", 14, this.height - 10);
              ctx.textAlign = "right";
              ctx.fillText("ESC = PAUSE  •  M = MUTE  •  R = RESTART  •  H = HOME", this.width - 14, this.height - 10);
          }
  
          ctx.restore();
      }
  
      drawGameOver(winnerName, statsP1, statsP2, rewardInfo = null) {
          const ctx = this.ctx;
          ctx.save();
  
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(0, 0, this.width, this.height);
  
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
  
          ctx.font = "bold 38px 'Segoe UI', system-ui, sans-serif";
          ctx.fillText(`${winnerName} WINS!`, this.width / 2, this.height / 2 - 45);
  
          // Reward information pill (Gold & XP & RP earned)
          if (rewardInfo) {
              ctx.font = "bold 15px 'Segoe UI', system-ui, sans-serif";
              ctx.fillStyle = "#f1c40f";
              let rewText = `+${rewardInfo.goldEarned} Gold   •   +${rewardInfo.xpEarned} XP`;
              if (rewardInfo.rpDelta) {
                  const rpSign = rewardInfo.rpDelta > 0 ? `+${rewardInfo.rpDelta}` : `${rewardInfo.rpDelta}`;
                  rewText += `   •   ${rpSign} RP`;
              }
              ctx.fillText(rewText, this.width / 2, this.height / 2 - 5);
          }
  
          ctx.fillStyle = "#ffffff";
          ctx.font = "15px 'Segoe UI', system-ui, sans-serif";
          ctx.fillText("Press R to restart match", this.width / 2, this.height / 2 + 35);
          ctx.font = "13px 'Segoe UI', system-ui, sans-serif";
          ctx.fillStyle = "#bdc3c7";
          ctx.fillText("Press H for home screen", this.width / 2, this.height / 2 + 60);
  
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
  
          // State
          this.state = "menu"; // "menu", "play", "paused", "gameover"
          this.mode = "normal";
          this.customBotParams = null;
          this.botParams = {};
          this.lastRewardInfo = null;
  
          // Key states
          this.keys = {};
  
          // Loop timing
          this.lastTime = 0;
          this.animFrameId = null;
  
          // Listen for username / loadout changes
          auth.onUserChanged((user) => {
              this.playerName = user.username;
              this.player.name = user.username;
              this.player.setWeapon(user.equippedWeapon || "mace", user.weaponUpgrades || {});
              this.player.setSkin(user.skinId || "steve");
          });
  
          this.setupInputs();
          this.applyMode("normal");
      }
  
      applyMode(mode, customOverrides = null) {
          this.mode = mode;
          this.isTeamMatch = false;
          this.matchType = "1v1";
          this.customBotParams = customOverrides;
          this.botParams = getBotParamsForMode(mode, customOverrides);
  
          const maxHp = (mode === "practice") ? 1000 : (this.botParams.maxHP || 100);
          const user = auth.getUser();
  
          this.player.reset(150, 1, maxHp);
          this.player.setWeapon(user.equippedWeapon || "mace", user.weaponUpgrades || {});
          this.player.setSkin(user.skinId || "steve");
          this.player.setTeam(null);
  
          this.bot.reset(650, -1, maxHp);
          this.bot.setWeapon(mode === "god" ? "mace" : (mode === "pro" ? "sword" : "spear"), {});
          this.bot.setSkin(mode === "god" ? "enderman" : (mode === "pro" ? "diamond_knight" : "alex"));
          this.bot.setTeam(null);
  
          this.botAI.setParams(this.botParams);
          this.botAI.reset();
          this.bot._botAI = this.botAI;
  
          this.redTeam = [this.player];
          this.blueTeam = [this.bot];
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
  
      // Starts a 1v1, 2v2, or 5v5 Arena Match
      startArenaTeamMatch(matchType = "2v2", selectedWeaponId = "mace") {
          sound.ensureContext();
          sound.playClick();
  
          this.mode = "arena";
          this.matchType = matchType;
          this.isTeamMatch = true;
          this.botParams = getBotParamsForMode("normal");
  
          const user = auth.getUser();
          const roster = arena.generateTeamRoster(matchType, user, selectedWeaponId);
  
          // Build Red Team
          this.redTeam = roster.redTeam.map((data, idx) => {
              if (data.isPlayer) {
                  this.player.reset(data.x, data.facing, data.maxHp);
                  this.player.setWeapon(selectedWeaponId, user.weaponUpgrades || {});
                  this.player.setSkin(user.skinId || "steve");
                  this.player.setTeam("red");
                  this.player.name = user.username || "Player";
                  return this.player;
              } else {
                  const fighter = new Fighter(true, data.id, data.name);
                  fighter.reset(data.x, data.facing, data.maxHp);
                  fighter.setWeapon(data.weaponId, {});
                  fighter.setSkin(data.skinId);
                  fighter.setTeam("red");
                  return fighter;
              }
          });
  
          // Build Blue Team
          this.blueTeam = roster.blueTeam.map((data) => {
              const fighter = new Fighter(true, data.id, data.name);
              fighter.reset(data.x, data.facing, data.maxHp);
              fighter.setWeapon(data.weaponId, {});
              fighter.setSkin(data.skinId);
              fighter.setTeam("blue");
              return fighter;
          });
  
          // Initialize Bot AIs for all non-player fighters
          this.allBots = [];
          this.redTeam.forEach(f => {
              if (f.isBot) {
                  const ai = new BotAI(f);
                  ai.setParams(this.botParams);
                  f._botAI = ai;
                  this.allBots.push({ fighter: f, ai });
              } else {
                  f._botAI = null;
              }
          });
          this.blueTeam.forEach(f => {
              const ai = new BotAI(f);
              ai.setParams(this.botParams);
              f._botAI = ai;
              this.allBots.push({ fighter: f, ai });
          });
  
          this.allFighters = [...this.redTeam, ...this.blueTeam];
  
          this.arrowManager.reset();
          this.particles.reset();
          this.lastRewardInfo = null;
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
          this.state = "play";
  
          if (this.uiCallbacks.onStateChanged) {
              this.uiCallbacks.onStateChanged(this.state);
          }
      }
  
      goHome() {
          sound.playClick();
          this.state = "menu";
          if (this.uiCallbacks.onStateChanged) {
              this.uiCallbacks.onStateChanged(this.state);
          }
      }
  
      togglePause() {
          if (this.state === "play") {
              this.state = "paused";
          } else if (this.state === "paused") {
              this.state = "play";
          }
          if (this.uiCallbacks.onStateChanged) {
              this.uiCallbacks.onStateChanged(this.state);
          }
      }
  
      setupInputs() {
          window.addEventListener("keydown", (e) => {
              sound.ensureContext();
  
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
                  if (e.code === "KeyT") this.startGame("practice");
                  if (e.code === "KeyE") this.startGame("easy");
                  if (e.code === "KeyN") this.startGame("normal");
                  if (e.code === "KeyP") this.startGame("pro");
                  if (e.code === "KeyG") this.startGame("god");
                  if (e.code === "Digit2") this.startGame("pvp");
                  return;
              }
  
              // Match Restart / Home keys
              if (this.state === "gameover" || this.player.hp <= 0 || (this.isTeamMatch ? false : this.bot.hp <= 0)) {
                  if (e.code === "KeyR") {
                      this.restartMatch();
                      return;
                  }
                  if (e.code === "KeyH") {
                      this.goHome();
                      return;
                  }
              }
  
              if (this.state !== "play") return;
  
              // --- Player 1 Jump ---
              if (e.code === "ArrowUp" || e.code === "KeyW") {
                  this.player.jump();
              }
  
              // --- Player 1 Weapon Attack / Dash / Bow Shoot ---
              if (e.code === "Space") {
                  this.player.dash(null, true, null, this.arrowManager);
              }
  
              // --- Player 1 Slam ---
              if (e.code === "ArrowDown" || e.code === "KeyS") {
                  this.player.slam();
              }
  
              // --- Local PvP: Player 2 controls ---
              if (this.mode === "pvp") {
                  if (e.code === "ArrowUp") {
                      this.bot.jump();
                  }
                  if (e.code === "Enter" || e.code === "ShiftRight") {
                      this.bot.dash(this.botParams.dashSpeed, true, this.botParams.botDashCooldown, this.arrowManager);
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
  
          // Player 1 Continuous Horizontal Movement
          if (this.player.stun <= 0 && !this.player.dashing) {
              const left = this.keys["KeyA"] || (this.mode !== "pvp" && this.keys["ArrowLeft"]);
              const right = this.keys["KeyD"] || (this.mode !== "pvp" && this.keys["ArrowRight"]);
  
              const speed = 3;
              if (left && !right) {
                  this.player.xVel = -speed;
                  this.player.facing = -1;
              } else if (right && !left) {
                  this.player.xVel = speed;
                  this.player.facing = 1;
              } else {
                  this.player.xVel *= 0.65;
                  if (Math.abs(this.player.xVel) < 0.1) this.player.xVel = 0;
              }
          }
  
          // Player 2 Input (PVP Mode)
          if (this.mode === "pvp") {
              if (this.bot.stun <= 0 && !this.bot.dashing) {
                  const left = this.keys["ArrowLeft"];
                  const right = this.keys["ArrowRight"];
  
                  const speed = 3;
                  if (left && !right) {
                      this.bot.xVel = -speed;
                      this.bot.facing = -1;
                  } else if (right && !left) {
                      this.bot.xVel = speed;
                      this.bot.facing = 1;
                  } else {
                      this.bot.xVel *= 0.65;
                      if (Math.abs(this.bot.xVel) < 0.1) this.bot.xVel = 0;
                  }
              }
          }
      }
  
      update() {
          if (this.state !== "play") {
              this.particles.update();
              return;
          }
  
          this.handleContinuousInput();
  
          const damageTakenMult = this.botParams.damageTaken ?? 1;
          const stunMult = this.botParams.stunMult ?? 1;
          const damageDealtMult = this.botParams.damageMult ?? 1;
  
          // Update all AI fighters (in-place zero allocation)
          for (let i = 0; i < this.allBots.length; i++) {
              const { fighter, ai } = this.allBots[i];
              if (fighter.hp <= 0) continue;
  
              const opposingTeam = fighter.team === "red" ? this.blueTeam : this.redTeam;
              let nearest = null;
              let minDist = Infinity;
              for (let j = 0; j < opposingTeam.length; j++) {
                  const t = opposingTeam[j];
                  if (t.hp > 0) {
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
                  const opposingTeam = f.team === "red" ? this.blueTeam : (f.team === "blue" ? this.redTeam : (f.isPlayer ? this.blueTeam : this.redTeam));
                  const mult = f.isPlayer ? damageTakenMult : damageDealtMult;
                  for (let j = 0; j < opposingTeam.length; j++) {
                      const def = opposingTeam[j];
                      this.combat.checkGroundSlam(f, def, mult, stunMult, () => {
                          if (def._botAI) def._botAI.onHit();
                      });
                  }
                  f.slamming = false;
              }
          }
  
          // Update Arrow Projectiles
          this.arrowManager.update(PLATFORMS_CONFIG, this.allFighters, (hitFighter, arrow) => {
              sound.playDashHit();
              this.particles.addHitSparks(arrow.x, arrow.y, 10, "#e74c3c");
              this.particles.addDamageText(hitFighter.x + hitFighter.w / 2, hitFighter.y, arrow.damage, false);
              this.particles.triggerShake(4, 6);
  
              if (hitFighter._botAI) hitFighter._botAI.onHit();
          });
  
          // Resolve mid-air slams and dash collisions between opposing teams (zero temporary array allocation)
          for (let i = 0; i < this.redTeam.length; i++) {
              const atk = this.redTeam[i];
              if (atk.hp <= 0) continue;
              for (let j = 0; j < this.blueTeam.length; j++) {
                  const def = this.blueTeam[j];
                  if (def.hp <= 0) continue;
  
                  this.combat.checkAirSlam(atk, def, damageTakenMult, stunMult, () => {
                      if (def._botAI) def._botAI.onHit();
                  });
                  this.combat.checkDashHit(atk, def, damageTakenMult, stunMult, () => {
                      if (def._botAI) def._botAI.onHit();
                  });
              }
          }
  
          for (let i = 0; i < this.blueTeam.length; i++) {
              const atk = this.blueTeam[i];
              if (atk.hp <= 0) continue;
              for (let j = 0; j < this.redTeam.length; j++) {
                  const def = this.redTeam[j];
                  if (def.hp <= 0) continue;
  
                  this.combat.checkAirSlam(atk, def, damageDealtMult, 1.0, () => {
                      if (def._botAI) def._botAI.onHit();
                  });
                  this.combat.checkDashHit(atk, def, damageDealtMult, 1.0, () => {
                      if (def._botAI) def._botAI.onHit();
                  });
              }
          }
  
          // Particles & Camera Shake
          this.particles.update();
  
          // Check match resolution
          if (this.isTeamMatch) {
              let redAllDead = true;
              for (let i = 0; i < this.redTeam.length; i++) {
                  if (this.redTeam[i].hp > 0) { redAllDead = false; break; }
              }
              let blueAllDead = true;
              for (let i = 0; i < this.blueTeam.length; i++) {
                  if (this.blueTeam[i].hp > 0) { blueAllDead = false; break; }
              }
  
              if (redAllDead || blueAllDead) {
                  this.state = "gameover";
                  const isWin = !redAllDead && blueAllDead;
                  if (isWin) sound.playWin(); else sound.playLoss();
  
                  // Record ranked arena outcome
                  this.lastRewardInfo = auth.recordArenaMatchResult(isWin, this.matchType);
  
                  if (this.uiCallbacks.onStateChanged) {
                      this.uiCallbacks.onStateChanged(this.state);
                  }
              }
          } else {
              // Standard Single-Player / PvP 1v1
              if (this.player.hp <= 0 || this.bot.hp <= 0) {
                  this.state = "gameover";
                  const isWin = this.player.hp > 0;
                  if (isWin) sound.playWin(); else sound.playLoss();
  
                  if (this.mode !== "pvp") {
                      this.lastRewardInfo = auth.recordMatchResult(isWin, this.mode, this.player.stats);
                  }
  
                  if (this.uiCallbacks.onStateChanged) {
                      this.uiCallbacks.onStateChanged(this.state);
                  }
              }
          }
      }
  
      render() {
          const ctx = this.renderer.ctx;
  
          ctx.save();
          ctx.translate(this.particles.cameraShake.x, this.particles.cameraShake.y);
  
          this.renderer.drawBackground();
          this.renderer.drawPlatforms();
  
          const botMeta = MODE_METADATA[this.mode] || MODE_METADATA.normal;
          const botColor = botMeta.color;
  
          // Render all fighters
          for (let i = 0; i < this.allFighters.length; i++) {
              const f = this.allFighters[i];
              this.renderer.drawFighter(f, botColor, this.isTeamMatch);
              const indR = f.team === "red" ? 255 : (f.team === "blue" ? 30 : 46);
              const indG = f.team === "red" ? 71 : (f.team === "blue" ? 144 : 204);
              const indB = f.team === "red" ? 87 : (f.team === "blue" ? 255 : 113);
              this.renderer.drawOffscreenIndicator(f, indR, indG, indB, f.name);
          }
  
          // Render Flying Arrows
          this.arrowManager.draw(ctx);
  
          // Particle FX & floating combat text
          this.particles.draw(ctx);
  
          // HUD & Controls Hint
          if (this.isTeamMatch) {
              this.renderer.drawTeamArenaHUD(this.redTeam, this.blueTeam, this.matchType);
          } else {
              const p1Label = this.mode === "pvp" ? "PLAYER 1" : (this.playerName || "YOU");
              const p2Label = this.mode === "pvp" ? "PLAYER 2" : (this.mode === "god" ? "GOD BOT" : "BOT");
              this.renderer.drawHUD(this.player, this.bot, botColor, botMeta.name, p1Label, p2Label);
          }
  
          this.renderer.drawControlsHint(this.mode === "pvp");
  
          // Game Over Banner
          if (this.state === "gameover") {
              let winner = "YOU";
              if (this.isTeamMatch) {
                  let redAllDead = true;
                  for (let i = 0; i < this.redTeam.length; i++) {
                      if (this.redTeam[i].hp > 0) { redAllDead = false; break; }
                  }
                  winner = redAllDead ? "BLUE TEAM" : "RED TEAM";
              } else {
                  winner = this.player.hp > 0 ? (this.mode === "pvp" ? "PLAYER 1" : (this.playerName || "YOU")) : (this.mode === "pvp" ? "PLAYER 2" : "BOT");
              }
  
              this.renderer.drawGameOver(winner, this.player.stats, this.bot.stats, this.lastRewardInfo);
          }
  
          ctx.restore();
      }
  
      start() {
          let lastTime = performance.now();
          let accumulator = 0;
          const FIXED_DT = 1000 / 60; // 60Hz physics timestep (16.6667ms)
  
          const loop = (currentTime) => {
              let frameTime = currentTime - lastTime;
              if (frameTime > 100) frameTime = 100; // Cap to avoid spiral of death on backgrounding
              lastTime = currentTime;
  
              accumulator += frameTime;
              while (accumulator >= FIXED_DT) {
                  this.update();
                  accumulator -= FIXED_DT;
              }
  
              this.render();
              this.animFrameId = requestAnimationFrame(loop);
          };
  
          this.animFrameId = requestAnimationFrame(loop);
      }
  
      stop() {
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
  
          const modes = ["practice", "easy", "normal", "pro", "god", "pvp", "custom"];
          const versusModes = ["pvp", "custom"];
  
          modes.forEach((modeKey) => {
              const meta = MODE_METADATA[modeKey];
              if (!meta) return;
  
              const card = document.createElement("div");
              card.className = `mode-card mode-${modeKey}`;
              card.innerHTML = `
                  <div class="card-header">
                      <span class="card-badge" style="background:${meta.rgb}">${meta.badge}</span>
                      <span class="card-hotkey">[ ${meta.hotkey} ]</span>
                  </div>
                  <h3 class="card-title">${meta.name}</h3>
                  <p class="card-sub">${meta.sub}</p>
                  <p class="card-desc">${meta.desc}</p>
                  <button class="btn-play-mode" style="border-color:${meta.rgb}">SELECT MODE</button>
              `;
  
              card.addEventListener("click", () => {
                  if (modeKey === "custom") {
                      this.openCustomBotModal();
                  } else {
                      this.game.startGame(modeKey);
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
          this.themeBtn = document.getElementById("btn-theme");
          this.currentBiome = "overworld";
          if (this.themeBtn) {
              this.themeBtn.addEventListener("click", () => {
                  const biomes = ["overworld", "nether", "end"];
                  const nextIdx = (biomes.indexOf(this.currentBiome) + 1) % biomes.length;
                  this.currentBiome = biomes[nextIdx];
                  const capitalized = this.currentBiome.charAt(0).toUpperCase() + this.currentBiome.slice(1);
                  this.themeBtn.textContent = `Theme: ${capitalized}`;
                  this.game.renderer.setBiome(this.currentBiome);
                  sound.playClick();
              });
          }
  
          // Inventory [i] triggers & shortcut
          this.inventoryBtn = document.getElementById("btn-inventory");
          this.homeInventoryBtn = document.getElementById("btn-home-inventory");
          this.inventoryModal = document.getElementById("inventory-modal");
  
          if (this.inventoryBtn) this.inventoryBtn.addEventListener("click", () => this.openInventoryModal());
          if (this.homeInventoryBtn) this.homeInventoryBtn.addEventListener("click", () => this.openInventoryModal());
  
          window.addEventListener("keydown", (e) => {
              if (e.key === "i" || e.key === "I") {
                  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
                  if (activeTag !== "input" && activeTag !== "textarea") {
                      this.toggleInventoryModal();
                  }
              }
          });
  
          // Navigation buttons
          if (this.homeBtn) this.homeBtn.addEventListener("click", () => this.game.goHome());
          if (this.restartBtn) this.restartBtn.addEventListener("click", () => this.game.restartMatch());
          if (this.pauseBtn) this.pauseBtn.addEventListener("click", () => this.game.togglePause());
          if (this.userProfileBtn) this.userProfileBtn.addEventListener("click", () => this.openAuthModal());
          if (this.downloadBtn) this.downloadBtn.addEventListener("click", () => this.downloadGame());
          if (this.leaderboardBtn) this.leaderboardBtn.addEventListener("click", () => this.openLeaderboardModal());
  
          // Home screen arena banner
          const arenaBanner = document.getElementById("home-arena-banner");
          if (arenaBanner) arenaBanner.addEventListener("click", () => this.openArenaModal());
  
          // Pause Modal buttons
          const resumeBtn = document.getElementById("btn-resume");
          if (resumeBtn) resumeBtn.addEventListener("click", () => this.game.togglePause());
          const pauseRestartBtn = document.getElementById("btn-pause-restart");
          if (pauseRestartBtn) {
              pauseRestartBtn.addEventListener("click", () => {
                  this.pauseModal.classList.add("hidden");
                  this.game.restartMatch();
              });
          }
          const pauseHomeBtn = document.getElementById("btn-pause-home");
          if (pauseHomeBtn) {
              pauseHomeBtn.addEventListener("click", () => {
                  this.pauseModal.classList.add("hidden");
                  this.game.goHome();
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
                  if (e.target === backdrop || !e.target.closest(".modal-card")) {
                      backdrop.classList.add("hidden");
                      sound.playClick();
                  }
              });
          });
  
          this.setupTouchButtons();
      }
  
      updateMuteButton(isMuted) {
          if (!this.muteBtn) return;
          this.muteBtn.textContent = isMuted ? "Unmute" : "Sound On";
      }
  
      // ==========================================
      // USER PROFILE & GOOGLE AUTH SYSTEM
      // ==========================================
  
      setupAuthUI() {
          auth.onUserChanged((user) => {
              this.updateHeaderProfileBadge(user);
              if (this.goldDisplay) {
                  this.goldDisplay.textContent = `Gold: ${user.gold || 0}`;
              }
              this.updateHomeProfile(user);
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
  
      updateHomeProfile(user) {
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
                  googleSection.innerHTML = `
                      <button id="btn-google-signin" class="btn-google-signin">
                          <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                          </svg>
                          <span>Sign in with Google</span>
                      </button>
                      <p class="google-disclaimer">Link your Google account to sync your profile across devices.</p>
                  `;
                  document.getElementById("btn-google-signin")?.addEventListener("click", () => {
                      this.triggerGoogleSignInFlow();
                  });
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
                          <span class="cs-val">${s.slamsLanded}</span>
                          <span class="cs-label">Mace Slams</span>
                      </div>
                      <div class="career-stat-card">
                          <span class="cs-val" style="color:#e67e22">${s.maxSlamDamage.toFixed(0)}</span>
                          <span class="cs-label">Max Slam DMG</span>
                      </div>
                  </div>
              `;
          }
      }
  
      triggerGoogleSignInFlow() {
          sound.playClick();
          if (window.google && window.google.accounts && window.GOOGLE_CLIENT_ID) {
              try {
                  window.google.accounts.id.prompt();
                  return;
              } catch (e) {
                  console.warn("GIS prompt fallback:", e);
              }
          }
  
          const googleMockModal = document.getElementById("google-mock-modal");
          if (googleMockModal) {
              googleMockModal.classList.remove("hidden");
              this.setupGoogleMockOptions();
          }
      }
  
      setupGoogleMockOptions() {
          const demoAccounts = [
              { name: "Steve Gamer", email: "steve.craft@gmail.com", avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80" },
              { name: "Alex Champion", email: "alex.aerial@gmail.com", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" }
          ];
  
          const container = document.getElementById("google-account-list");
          if (!container) return;
  
          container.innerHTML = "";
          demoAccounts.forEach((acc) => {
              const item = document.createElement("div");
              item.className = "google-acc-row";
              item.innerHTML = `
                  <img src="${acc.avatar}" alt="${acc.name}" class="google-acc-img">
                  <div class="google-acc-text">
                      <div class="google-acc-name">${acc.name}</div>
                      <div class="google-acc-email">${acc.email}</div>
                  </div>
              `;
              item.addEventListener("click", () => {
                  auth.signInWithGoogleData({
                      id: Math.floor(Math.random() * 1000000).toString(),
                      name: acc.name,
                      email: acc.email,
                      picture: acc.avatar
                  });
                  document.getElementById("google-mock-modal")?.classList.add("hidden");
                  sound.playClick();
                  this.renderAuthModalContent();
              });
              container.appendChild(item);
          });
  
          const customBtn = document.getElementById("btn-custom-google-signin");
          const customInput = document.getElementById("input-custom-google-email");
          if (customBtn && customInput) {
              customBtn.onclick = () => {
                  const email = customInput.value.trim() || "player@gmail.com";
                  const handle = email.split("@")[0] || "GooglePlayer";
                  auth.signInWithGoogleData({
                      id: Math.floor(Math.random() * 1000000).toString(),
                      name: handle,
                      email: email,
                      picture: null
                  });
                  document.getElementById("google-mock-modal")?.classList.add("hidden");
                  sound.playClick();
                  this.renderAuthModalContent();
              };
          }
      }
  
      // ==========================================
      // UNIFIED MINECRAFT INVENTORY, CRAFTING, ARMORY & SKINS
      // ==========================================
  
      setupInventoryUI() {
          this.tabWeapons = document.getElementById("tab-inv-weapons");
          this.tabCraft = document.getElementById("tab-inv-craft");
          this.tabSkins = document.getElementById("tab-inv-skins");
  
          this.panelWeapons = document.getElementById("inv-panel-weapons");
          this.panelCraft = document.getElementById("inv-panel-craft");
          this.panelSkins = document.getElementById("inv-panel-skins");
  
          this.tabWeapons?.addEventListener("click", () => this.switchInventoryTab("weapons"));
          this.tabCraft?.addEventListener("click", () => this.switchInventoryTab("craft"));
          this.tabSkins?.addEventListener("click", () => this.switchInventoryTab("skins"));
      }
  
      setupArmoryUI() {}
      setupSkinsUI() {}
  
      switchInventoryTab(tab) {
          [this.tabWeapons, this.tabCraft, this.tabSkins].forEach(t => t?.classList.remove("active"));
          [this.panelWeapons, this.panelCraft, this.panelSkins].forEach(p => p?.classList.add("hidden"));
  
          if (tab === "craft") {
              this.tabCraft?.classList.add("active");
              this.panelCraft?.classList.remove("hidden");
              this.renderCraftingTabContent();
          } else if (tab === "skins") {
              this.tabSkins?.classList.add("active");
              this.panelSkins?.classList.remove("hidden");
              this.renderSkinsModalContent();
          } else {
              this.tabWeapons?.classList.add("active");
              this.panelWeapons?.classList.remove("hidden");
              this.renderHotbarSlots();
              this.renderWeaponsModalContent();
          }
          sound.playClick();
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
  
      // Minecraft Hotbar & Blank Inventory Slots
      renderHotbarSlots() {
          const container = document.getElementById("mc-hotbar-slots");
          if (!container) return;
          container.innerHTML = "";
  
          const user = auth.getUser();
          const unlocked = user.unlockedWeapons || ["mace", "spear"];
          const equipped = user.equippedWeapon || "mace";
  
          // Render 9 slots (Minecraft standard hotbar)
          for (let i = 0; i < 9; i++) {
              const slot = document.createElement("div");
              slot.className = "mc-slot";
              const weaponId = unlocked[i];
  
              if (weaponId && WEAPON_TYPES[weaponId]) {
                  const w = WEAPON_TYPES[weaponId];
                  if (weaponId === equipped) {
                      slot.classList.add("active");
                  }
                  slot.title = `${w.name} (${weaponId === equipped ? 'Equipped' : 'Click to Equip'})`;
                  slot.innerHTML = `
                      ${weaponIconHTML(weaponId, 28)}
                      <span class="mc-slot-num">${i + 1}</span>
                  `;
                  slot.addEventListener("click", () => {
                      auth.equipWeapon(weaponId);
                      sound.playClick();
                      this.renderHotbarSlots();
                      this.renderWeaponsModalContent();
                  });
              } else {
                  slot.classList.add("empty");
                  slot.title = `Blank Inventory Slot ${i + 1}`;
                  slot.innerHTML = `<span class="mc-slot-num" style="opacity:0.35;">${i + 1}</span>`;
              }
              container.appendChild(slot);
          }
      }
  
      // Minecraft 3x3 Crafting Table & Enchanting Station
      renderCraftingTabContent() {
          const user = auth.getUser();
          const equipped = user.equippedWeapon || "mace";
          const w = WEAPON_TYPES[equipped] || WEAPON_TYPES.mace;
  
          // Center slot holds the equipped weapon
          const centerSlot = document.getElementById("craft-center-slot");
          if (centerSlot) {
              centerSlot.innerHTML = `${weaponIconHTML(equipped, 32)}`;
              centerSlot.title = `Current Weapon: ${w.name}`;
          }
  
          // Result slot holds the upgraded / enchanted result
          const resultSlot = document.getElementById("craft-result-slot");
          if (resultSlot) {
              resultSlot.innerHTML = `
                  <div style="position:relative; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">
                      ${weaponIconHTML(equipped, 40)}
                      <span style="position:absolute; bottom:2px; right:3px; font-size:10px; color:#55ff55; font-weight:bold; text-shadow:1px 1px 0 #000;">ENCH</span>
                  </div>
              `;
              resultSlot.title = `Enchanted ${w.name}`;
          }
  
          // Populate surrounding crafting slots with authentic Minecraft ingredients
          const craftSlots = document.querySelectorAll(".crafting-3x3 .c-slot:not(.c-slot-center)");
          const ingredients = ["Lapis", "Breeze", "Amethyst", "Diamond", "Gold", "Obsidian", "Netherite", "Emerald"];
          craftSlots.forEach((slot, idx) => {
              if (!slot.innerHTML) {
                  const ingName = ingredients[idx % ingredients.length];
                  slot.title = `Crafting Catalyst: ${ingName}`;
                  slot.innerHTML = `<span style="font-size:9px; color:#aaa; font-family:var(--font-pixel); text-shadow:1px 1px 0 #000;">${ingName[0]}</span>`;
              }
          });
  
          // Populate Enchantment Upgrades for the equipped weapon
          const container = document.getElementById("crafting-upgrades-container");
          if (!container) return;
          container.innerHTML = "";
  
          const gold = user.gold || 0;
  
          const infoCard = document.createElement("div");
          infoCard.className = "weapon-shop-card equipped";
          infoCard.innerHTML = `
              <div class="weapon-shop-header">
                  <div class="ws-left">
                      <span class="ws-icon">${weaponIconHTML(w.id, 32)}</span>
                      <div>
                          <div class="ws-title">${w.name} (Active in Crafting Grid)</div>
                          <div class="ws-cat">Tier Upgrades & Enchantments Table</div>
                      </div>
                  </div>
                  <div class="ws-right">
                      <span class="badge-equipped">IN CRAFTING BENCH</span>
                  </div>
              </div>
              <div class="ws-desc">Select enchantments below to upgrade damage, wind propulsion and knockback for this weapon using Gold.</div>
          `;
          container.appendChild(infoCard);
  
          if (w.upgrades && w.upgrades.length > 0) {
              w.upgrades.forEach(u => {
                  const curLvl = user.weaponUpgrades[u.id] || 0;
                  const isMax = curLvl >= u.maxLevel;
                  const cost = u.costPerLevel * (curLvl + 1);
  
                  const upgCard = document.createElement("div");
                  upgCard.className = "weapon-shop-card";
                  upgCard.innerHTML = `
                      <div class="weapon-shop-header">
                          <div class="ws-left">
                              <div>
                                  <div class="ws-title" style="color:#55ff55;">${u.name}</div>
                                  <div class="ws-cat">Tier ${curLvl}/${u.maxLevel}</div>
                              </div>
                          </div>
                          <div class="ws-right">
                              ${isMax ? 
                                  `<span class="badge-max">MAX ENCHANTED</span>` : 
                                  `<button class="btn-ctrl btn-craft-upgrade" data-upg="${u.id}" data-cost="${cost}" ${gold < cost ? 'disabled' : ''}>
                                      Enchant (${cost} G)
                                  </button>`
                              }
                          </div>
                      </div>
                      <div class="ws-desc">${u.desc}</div>
                  `;
                  container.appendChild(upgCard);
              });
  
              container.querySelectorAll(".btn-craft-upgrade").forEach(btn => {
                  btn.onclick = () => {
                      const res = auth.upgradeWeapon(btn.dataset.upg, parseInt(btn.dataset.cost));
                      if (res.success) {
                          sound.playWin();
                          this.renderCraftingTabContent();
                      } else {
                          alert(res.error);
                      }
                  };
              });
          }
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
              const isEquipped = user.equippedWeapon === w.id;
  
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
                          ${isEquipped ? 
                              `<span class="badge-equipped">EQUIPPED</span>` :
                              (isUnlocked ? 
                                  `<button class="btn-ctrl btn-equip-weap" data-id="${w.id}">Equip</button>` :
                                  `<button class="btn-ctrl btn-unlock-weap" data-id="${w.id}" data-cost="${w.baseCost}" ${gold < w.baseCost ? 'disabled' : ''}>
                                      Unlock (${w.baseCost} G)
                                  </button>`
                              )
                          }
                      </div>
                  </div>
                  <div class="ws-desc">${w.desc}</div>
                  <div class="ws-stats-row">
                      <span>Base DMG: <b>${w.stats.dashDamage}</b></span>
                      <span>Speed: <b>${w.stats.dashSpeed}</b></span>
                      <span>Recovery: <b>${w.stats.attackCooldown}f</b></span>
                      ${w.stats.arrowDamage ? `<span>Arrow DMG: <b>${w.stats.arrowDamage}</b></span>` : ''}
                  </div>
              `;
  
              container.appendChild(card);
          });
  
          // Attach Equip / Unlock handlers
          container.querySelectorAll(".btn-equip-weap").forEach(btn => {
              btn.onclick = () => {
                  auth.equipWeapon(btn.dataset.id);
                  sound.playClick();
                  this.renderHotbarSlots();
                  this.renderWeaponsModalContent();
              };
          });
  
          container.querySelectorAll(".btn-unlock-weap").forEach(btn => {
              btn.onclick = () => {
                  const res = auth.unlockWeapon(btn.dataset.id, parseInt(btn.dataset.cost));
                  if (res.success) {
                      sound.playWin();
                      this.renderHotbarSlots();
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
                              `<button class="btn-ctrl btn-unlock-skin" data-id="${face.id}" data-cost="${face.cost}" ${gold < face.cost ? 'disabled' : ''}>
                                  ${face.cost} Gold
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
  
          // Weapon select cards in arena
          document.querySelectorAll(".arena-wep-card").forEach(card => {
              card.addEventListener("click", () => {
                  document.querySelectorAll(".arena-wep-card").forEach(c => c.classList.remove("selected"));
                  card.classList.add("selected");
                  this.selectedArenaWeapon = card.dataset.wep;
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
                  document.getElementById("private-room-panel").classList.remove("hidden");
                  sound.playClick();
              };
          }
  
          // Launch Private Match button
          const btnLaunchPrivate = document.getElementById("btn-launch-private");
          if (btnLaunchPrivate) {
              btnLaunchPrivate.onclick = () => {
                  this.arenaModal.classList.add("hidden");
                  this.game.startArenaTeamMatch(this.selectedArenaMode, this.selectedArenaWeapon);
              };
          }
  
          // Join Private Room button
          const btnJoin = document.getElementById("btn-join-private");
          const joinInput = document.getElementById("input-join-code");
          if (btnJoin && joinInput) {
              btnJoin.onclick = () => {
                  const code = joinInput.value.trim().toUpperCase();
                  if (code.length < 5) {
                      alert("Please enter a valid Room Code!");
                      return;
                  }
                  sound.playWin();
                  this.arenaModal.classList.add("hidden");
                  this.game.startArenaTeamMatch(this.selectedArenaMode, this.selectedArenaWeapon);
              };
          }
      }
  
      openArenaModal() {
          if (!this.arenaModal) return;
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
  
      startMatchmakingQueue(matchType, weaponId) {
          if (!this.queueModal) return;
          this.arenaModal.classList.add("hidden");
          this.queueModal.classList.remove("hidden");
          sound.playClick();
  
          const timerEl = document.getElementById("queue-timer-text");
          const statusEl = document.getElementById("queue-status-text");
          const countEl = document.getElementById("queue-count-text");
  
          let seconds = 0;
          let count = 1;
          const total = matchType === "5v5" ? 10 : (matchType === "2v2" ? 4 : 2);
  
          if (statusEl) statusEl.textContent = `Finding players for ${matchType.toUpperCase()}...`;
          if (countEl) countEl.textContent = `1 / ${total} Players`;
  
          clearInterval(this.queueInterval);
          this.queueInterval = setInterval(() => {
              seconds++;
              if (timerEl) timerEl.textContent = `0:${seconds < 10 ? '0' : ''}${seconds}`;
  
              // Simulated matchmaking connections
              if (seconds === 1) {
                  count = Math.min(total, Math.ceil(total * 0.5));
                  if (countEl) countEl.textContent = `${count} / ${total} Players`;
              } else if (seconds === 2) {
                  count = Math.min(total, total - 1);
                  if (countEl) countEl.textContent = `${count} / ${total} Players`;
              } else if (seconds >= 3) {
                  clearInterval(this.queueInterval);
                  if (countEl) countEl.textContent = `${total} / ${total} Players`;
                  if (statusEl) statusEl.textContent = `MATCH FOUND! Entering Arena...`;
                  sound.playWin();
  
                  setTimeout(() => {
                      this.queueModal.classList.add("hidden");
                      this.game.startArenaTeamMatch(matchType, weaponId);
                  }, 800);
              }
          }, 800);
  
          // Cancel queue
          const cancelBtn = document.getElementById("btn-cancel-queue");
          if (cancelBtn) {
              cancelBtn.onclick = () => {
                  clearInterval(this.queueInterval);
                  this.queueModal.classList.add("hidden");
                  this.openArenaModal();
              };
          }
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
  
          leaderboardData.forEach(entry => {
              const isUser = !!entry.isUser;
              const tierObj = ARENA_TIERS[entry.tier] || ARENA_TIERS.obsidian;
  
              const row = document.createElement("div");
              row.className = `leaderboard-row ${isUser ? 'user-highlight' : ''} ${entry.rank <= 3 ? 'top-three' : ''}`;
  
              let rankBadge = `#${entry.rank}`;
              if (entry.rank === 1) rankBadge = "#1";
              else if (entry.rank === 2) rankBadge = "#2";
              else if (entry.rank === 3) rankBadge = "#3";
  
              row.innerHTML = `
                  <div class="lb-rank">${rankBadge}</div>
                  <div class="lb-player">
                      <span class="lb-flag">${headImgHTML(entry.skin || "steve", 22)}</span>
                      <span class="lb-name">${entry.name}</span>
                  </div>
                  <div class="lb-tier" style="color:${tierObj.color}">
                      <span>${tierPipHTML(tierObj)} ${tierObj.name}</span>
                  </div>
                  <div class="lb-rp"><b>${entry.rp}</b> RP</div>
                  <div class="lb-weapon">${WEAPON_TYPES[entry.weapon]?.name || entry.weapon}</div>
                  <div class="lb-winrate">${entry.winRate} Win</div>
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
              this.game.startGame("custom", customOverrides);
          });
      }
  
      openCustomBotModal() {
          if (this.customBotModal) {
              this.customBotModal.classList.remove("hidden");
          }
      }
  
      openStatsModal() {
          if (!this.statsModal) return;
  
          const p1 = this.game.player.stats;
          const p2 = this.game.bot.stats;
  
          const statsBody = document.getElementById("stats-body");
          if (statsBody) {
              statsBody.innerHTML = `
                  <div class="stats-grid">
                      <div class="stat-col">
                          <h4>${this.game.playerName || 'PLAYER 1'} (MATCH)</h4>
                          <p>Total Damage Dealt: <b>${p1.damageDealt.toFixed(0)}</b></p>
                          <p>Mace Slams Landed: <b>${p1.slamsLanded}</b></p>
                          <p>Weapon Dashes Landed: <b>${p1.dashesLanded}</b></p>
                          <p>Hardest Mace Slam: <b>${p1.maxSlamDamage.toFixed(0)} DMG</b></p>
                          <p>Peak Altitude: <b>${Math.round(p1.maxHeight)} px</b></p>
                      </div>
                      <div class="stat-col">
                          <h4>${this.game.mode === 'pvp' ? 'PLAYER 2' : 'BOT'}</h4>
                          <p>Total Damage Dealt: <b>${p2.damageDealt.toFixed(0)}</b></p>
                          <p>Mace Slams Landed: <b>${p2.slamsLanded}</b></p>
                          <p>Weapon Dashes Landed: <b>${p2.dashesLanded}</b></p>
                          <p>Hardest Mace Slam: <b>${p2.maxSlamDamage.toFixed(0)} DMG</b></p>
                          <p>Peak Altitude: <b>${Math.round(p2.maxHeight)} px</b></p>
                      </div>
                  </div>
              `;
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
  
          bindButton("touch-left", 
              () => { this.game.keys["ArrowLeft"] = true; },
              () => { this.game.keys["ArrowLeft"] = false; }
          );
          bindButton("touch-right", 
              () => { this.game.keys["ArrowRight"] = true; },
              () => { this.game.keys["ArrowRight"] = false; }
          );
          bindButton("touch-jump", 
              () => { this.game.player.jump(); },
              () => {}
          );
          bindButton("touch-dash", 
              () => { this.game.player.dash(null, true, null, this.game.arrowManager); },
              () => {}
          );
          bindButton("touch-slam", 
              () => { this.game.player.slam(); },
              () => {}
          );
      }
  
      detectTouchDevice() {
          const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
          if (isTouch && this.touchControls) {
              this.touchControls.classList.remove("hidden");
          }
      }
  
      onStateChanged(state) {
          if (state === "menu") {
              if (this.menuOverlay) this.menuOverlay.classList.remove("hidden");
              if (this.pauseModal) this.pauseModal.classList.add("hidden");
          } else if (state === "play") {
              if (this.menuOverlay) this.menuOverlay.classList.add("hidden");
              if (this.pauseModal) this.pauseModal.classList.add("hidden");
          } else if (state === "paused") {
              if (this.pauseModal) this.pauseModal.classList.remove("hidden");
          }
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
  
      applyMinecraftBackground();
  
      let ui = null;
  
      // Instantiate game engine
      const game = new Game(canvas, {
          onStateChanged: (state) => {
              if (ui) ui.onStateChanged(state);
          },
          onMuteToggled: (isMuted) => {
              if (ui) ui.updateMuteButton(isMuted);
          }
      });
  
      // Instantiate UI and menu manager
      ui = new UIManager(game);
  
      // Start 60fps game loop
      game.start();
  
      console.log("Spear-Mace PVP initialized successfully!");
  });
  

})();