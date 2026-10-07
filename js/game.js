// ==========================================
// SPEAR-MACE PVP - Main Game Controller
// Manages game loop, state transitions, input, 2-Player mode,
// Arrows projectile system, and 1v1 / 2v2 / 5v5 Team Arena matches
// ==========================================

import { ARENA_CONFIG, PLATFORMS_CONFIG, BOT_SETTINGS, MODE_METADATA, getBotParamsForMode } from './config.js';
import { sound } from './audio.js';
import { ParticleManager } from './particles.js';
import { Fighter } from './entity.js';
import { BotAI } from './ai.js';
import { CombatEngine } from './combat.js';
import { Renderer } from './renderer.js';
import { auth } from './auth.js';
import { ArrowManager } from './weapons.js';
import { arena } from './arena.js';

export class Game {
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

        const isBot = (mode !== "pvp" && mode !== "arena");
        this.player.reset(150, 1, maxHp);
        this.player.setWeapon(user.equippedWeapon || "mace", user.weaponUpgrades || {});
        this.player.setSkin(user.skinId || "steve");
        this.player.setTeam(null);
        this.player.isBotGame = isBot;
        this.player.isPlayer = true;

        this.bot.reset(650, -1, maxHp);
        this.bot.setWeapon(mode === "god" ? "mace" : (mode === "pro" ? "sword" : "spear"), {});
        this.bot.setSkin(mode === "god" ? "enderman" : (mode === "pro" ? "diamond_knight" : "alex"));
        this.bot.setTeam(null);
        this.bot.isBotGame = isBot;

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
                this.player.isBotGame = false;
                this.player.isPlayer = true;
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

            const speed = 5.2; // Snappy, responsive movement
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
                f.slamming = false;
                f.yVel = 0;
                f.onGround = true;
                f.dashReady = true;
                f.dashCooldown = 0;
                f.stun = 0;
                f.hitCooldown = 0;
                f.jumpsLeft = 2;

                const opposingTeam = f.team === "red" ? this.blueTeam : (f.team === "blue" ? this.redTeam : (f.isPlayer ? this.blueTeam : this.redTeam));
                const mult = f.isPlayer ? damageTakenMult : damageDealtMult;
                for (let j = 0; j < opposingTeam.length; j++) {
                    const def = opposingTeam[j];
                    this.combat.checkGroundSlam(f, def, mult, stunMult, () => {
                        if (def._botAI) def._botAI.onHit();
                    });
                }
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
