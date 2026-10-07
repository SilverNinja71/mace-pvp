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

        // Reset match score & tiebreaker
        this.scoreRed = 0;
        this.scoreBlue = 0;
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
        this.player.setWeapon(user.equippedWeapon || "mace", user.weaponUpgrades || {});
        this.player.setSkin(user.skinId || "steve");
        this.player.setTeam("blue"); // PLAYER IS ALWAYS BLUE
        this.player.isBotGame = isBot;
        this.player.isPlayer = true;
        this.player.name = this.playerName || "Player";

        const botMeta = MODE_METADATA[mode] || { name: "Bot" };
        this.bot.reset(650, -1, maxHp);
        this.bot.name = (mode === "pvp") ? "Player 2" : `[BOT] ${botMeta.name}`;
        this.bot.setWeapon(mode === "god" ? "mace" : (mode === "pro" ? "sword" : "spear"), {});
        this.bot.setSkin(mode === "god" ? "enderman" : (mode === "pro" ? "diamond_knight" : "alex"));
        this.bot.setTeam("red"); // OPPONENT IS ALWAYS RED
        this.bot.isBotGame = isBot;

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

        // Build Blue Team (Player is always on Blue Team)
        this.blueTeam = roster.blueTeam.map((data) => {
            if (data.isPlayer) {
                this.player.reset(data.x, data.facing, data.maxHp);
                this.player.setWeapon(selectedWeaponId, user.weaponUpgrades || {});
                this.player.setSkin(user.skinId || "steve");
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
                    this.combat.checkGroundSlam(f, def, mult, stunMult, (dmg, atk, defender) => {
                        if (defender._botAI) defender._botAI.onHit();
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

        // Soft push-separation between overlapping fighters so models never fuse together
        for (let i = 0; i < this.allFighters.length; i++) {
            const f1 = this.allFighters[i];
            if (f1.hp <= 0 || f1.dashing) continue;
            for (let j = i + 1; j < this.allFighters.length; j++) {
                const f2 = this.allFighters[j];
                if (f2.hp <= 0 || f2.dashing) continue;

                const dx = (f2.x + f2.w / 2) - (f1.x + f1.w / 2);
                const dy = Math.abs(f2.y - f1.y);
                if (Math.abs(dx) < 22 && dy < 32) {
                    const push = 1.0;
                    if (dx >= 0) {
                        f1.x = Math.max(0, f1.x - push);
                        f2.x = Math.min(ARENA_CONFIG.width - f2.w, f2.x + push);
                    } else {
                        f1.x = Math.min(ARENA_CONFIG.width - f1.w, f1.x + push);
                        f2.x = Math.max(0, f2.x - push);
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

            if (this.isTiebreaker) {
                const shooter = this.allFighters.find(f => f.id === arrow.ownerId);
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

                this.combat.checkAirSlam(atk, def, damageTakenMult, stunMult, (dmg) => {
                    if (def._botAI) def._botAI.onHit();
                    if (this.isTiebreaker) this.tiebreakerRedDamage += dmg;
                });
                this.combat.checkDashHit(atk, def, damageTakenMult, stunMult, (dmg) => {
                    if (def._botAI) def._botAI.onHit();
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

                this.combat.checkAirSlam(atk, def, damageDealtMult, 1.0, (dmg) => {
                    if (def._botAI) def._botAI.onHit();
                    if (this.isTiebreaker) this.tiebreakerBlueDamage += dmg;
                });
                this.combat.checkDashHit(atk, def, damageDealtMult, 1.0, (dmg) => {
                    if (def._botAI) def._botAI.onHit();
                    if (this.isTiebreaker) this.tiebreakerBlueDamage += dmg;
                });
            }
        }

        // Particles & Camera Shake
        this.particles.update();

        // 1. Process Fighter Eliminations & Score Updates
        for (let i = 0; i < this.allFighters.length; i++) {
            const f = this.allFighters[i];
            if (f.hp <= 0 && !f.isDead) {
                f.isDead = true;
                sound.playDashHit();
                this.particles.addHitSparks(f.x + f.w / 2, f.y + f.h / 2, 22, "#e74c3c");
                this.particles.addDust(f.x + f.w / 2, f.y + f.h / 2, 16);

                const isRedFighter = f.team === "red" || (!f.team && f !== this.player);
                if (isRedFighter) {
                    this.scoreBlue++;
                    this.particles.addDamageText(f.x + f.w / 2, f.y - 12, `${f.name} ELIMINATED!`, true);
                    const killer = this.blueTeam.find(b => b.hp > 0) || this.player;
                    if (killer && killer.stats) killer.stats.kills++;

                    // In single-player bot games & 1v1 duels, killing the bot immediately wins the match!
                    if (!this.isTeamMatch) {
                        this.finishMatch(true);
                        return;
                    }
                } else {
                    this.scoreRed++;
                    this.particles.addDamageText(f.x + f.w / 2, f.y - 12, `${f.name} ELIMINATED!`, true);
                    const killer = this.redTeam.find(r => r.hp > 0) || this.bot;
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
                this.particles.addDamageText(item.fighter.x + 12, item.fighter.y - 10, "RESPAWNED!", false);
                this.respawnQueue.splice(i, 1);
            }
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

    finishMatch(isPlayerWin) {
        this.state = "gameover";
        this.winnerTeam = isPlayerWin ? "blue" : "red";
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
        if (this.isTeamMatch) {
            this.lastRewardInfo = auth.recordArenaMatchResult(isPlayerWin, this.matchType);
        } else {
            if (this.mode !== "pvp") {
                this.lastRewardInfo = auth.recordMatchResult(isPlayerWin, this.mode, this.player.stats);
            }
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

        const botMeta = MODE_METADATA[this.mode] || MODE_METADATA.normal;
        const botColor = botMeta.color;

        // Render all fighters
        const isMultiplayer = this.isTeamMatch || this.mode === "pvp";
        for (let i = 0; i < this.allFighters.length; i++) {
            const f = this.allFighters[i];
            this.renderer.drawFighter(f, botColor, isMultiplayer);
            const indR = f.team === "red" ? 255 : (f.team === "blue" ? 30 : 46);
            const indG = f.team === "red" ? 71 : (f.team === "blue" ? 144 : 204);
            const indB = f.team === "red" ? 87 : (f.team === "blue" ? 255 : 113);
            this.renderer.drawOffscreenIndicator(f, indR, indG, indB, f.name);
        }

        // Render Flying Arrows
        this.arrowManager.draw(ctx);

        // Particle FX & floating combat text
        this.particles.draw(ctx);

        // HUD & Controls Hint with Score and Tiebreaker Status
        if (this.isTeamMatch) {
            this.renderer.drawTeamArenaHUD(
                this.redTeam, this.blueTeam, this.matchType,
                this.scoreRed, this.scoreBlue,
                this.isTiebreaker, this.tiebreakerTimer,
                this.tiebreakerRedDamage, this.tiebreakerBlueDamage
            );
        } else {
            const p1Label = this.mode === "pvp" ? "PLAYER 1" : (this.playerName || "YOU");
            const p2Label = this.mode === "pvp" ? "PLAYER 2" : (this.bot.name || "BOT");
            this.renderer.drawHUD(
                this.player, this.bot, botColor, botMeta.name, p1Label, p2Label,
                this.scoreRed, this.scoreBlue,
                this.isTiebreaker, this.tiebreakerTimer,
                this.tiebreakerRedDamage, this.tiebreakerBlueDamage
            );
        }

        this.renderer.drawControlsHint(this.mode === "pvp");

        // Game Over Banner
        if (this.state === "gameover") {
            let winner = "YOU";
            if (this.isTeamMatch) {
                winner = this.winnerTeam === "blue" ? "BLUE TEAM" : "RED TEAM";
            } else {
                winner = this.winnerTeam === "blue" 
                    ? (this.mode === "pvp" ? "PLAYER 1" : (this.player.name || "YOU")) 
                    : (this.mode === "pvp" ? "PLAYER 2" : (this.bot.name || "BOT"));
            }

            this.renderer.drawGameOver(
                winner, this.player.stats, this.bot.stats, this.lastRewardInfo,
                this.scoreBlue, this.scoreRed, this.highestJumper, this.isTiebreaker
            );
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
