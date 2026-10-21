// ==========================================
// SPEAR-MACE PVP - Bot AI Controller
// Exact behavioral logic and formulas from original ProcessingJS code
// ==========================================

import { sound } from './audio.js';
import { CORE_PHYSICS } from './config.js';

export class BotAI {
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
        this.sizeTimer = 0;

        // Pro / God: parry rolls (one per incoming dash) and weapon-swap checks
        this.parryRolled = false;
        this.swapTimer = 0;
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
        this.sizeTimer = 0;
        this.parryRolled = false;
        this.swapTimer = 0;
    }

    // How well a weapon suits the current spacing (higher is better)
    weaponFit(weaponId, absDist, dy, above) {
        switch (weaponId) {
            case "mace":  return above && absDist < 160 ? 3.2 : (absDist < 110 ? 2.6 : 1);
            case "spear": return absDist >= 110 && absDist < 300 ? 2.8 : (absDist < 110 ? 1.8 : 1.2);
            case "sword": return absDist < 170 ? 2.7 : 1.3;
            case "fists": return absDist < 60 ? 3 : 0.6;
            case "bow":   return absDist > 240 && Math.abs(dy) < 60 ? 3.3 : (absDist > 180 ? 1.6 : 0.3);
            default:      return 1;
        }
    }

    // Swap to the other loadout weapon when it clearly suits the distance better
    considerSwap(targetPlayer, distance) {
        const bot = this.bot;
        if (!bot.loadout || bot.loadout.length < 2 || bot.dashing || bot.slamming) return;
        const absDist = Math.abs(distance);
        const dy = targetPlayer.y - bot.y;
        const above = bot.y < targetPlayer.y - 40;
        const current = bot.loadout[bot.activeSlot];
        const other = bot.loadout[1 - bot.activeSlot];
        if (this.weaponFit(other, absDist, dy, above) > this.weaponFit(current, absDist, dy, above) + 0.5) {
            bot.swapWeapon();
        }
    }

    // Helper: Bot dash initiating
    startDash(attack, distanceToTarget) {
        const bot = this.bot;
        if (!bot.dashReady || bot.dashing || bot.dashCooldown > 0) {
            return false;
        }
        // Hold a raised parry guard instead of dashing out of it (a dash would turn the parry into a clash)
        if (bot.parryWindow > 0) {
            return false;
        }

        if (attack) {
            bot.facing = distanceToTarget > 0 ? 1 : -1;
        } else {
            bot.facing = distanceToTarget > 0 ? -1 : 1;
        }

        const success = bot.dash(this.params.dashSpeed, attack, this.params.botDashCooldown);
        if (success) {
            this.dashTimerAI = (this.bot.weaponId === "mace" ? this.params : this.dashStyleParams()).dashAIDelay;
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

    // Slams only hurt with a mace, so bots with other weapons dash in much more often
    dashStyleParams() {
        const P = this.params;
        if (this._dashFor !== P) {
            this._dashFor = P;
            this._dashParams = {
                ...P,
                dashAttackChance: Math.min(90, P.dashAttackChance * 2),
                dashAttackHeight: P.dashAttackHeight + 60,
                dashAttackRange: P.dashAttackRange * 1.3,
                randomDashChance: P.randomDashChance * 3,
                dashAIDelay: Math.round(P.dashAIDelay / 2)
            };
        }
        return this._dashParams;
    }

    update(targetPlayer) {
        const bot = this.bot;
        const P = bot.weaponId === "mace" ? this.params : this.dashStyleParams();

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

        // Buddha bots grow big up close and shrink back down when far away
        if (bot.classId === "buddha" && --this.sizeTimer <= 0) {
            if ((Math.abs(distance) < 160) !== !!bot.big) bot.toggleSize();
            this.sizeTimer = 60 + Math.floor(Math.random() * 120);
        }

        // Predicted distance with lead time
        const predictedDistance = distance + targetPlayer.xVel * P.slamLead;

        if (bot.stun <= 0) {

            // Face player (when not mid-dash)
            if (!bot.dashing) {
                bot.facing = distance > 0 ? 1 : -1;
            }

            // ---------- Parry a dash aimed at the bot (pro / god) ----------
            if (!targetPlayer.dashing) {
                this.parryRolled = false;
            } else if (
                P.parryChance > 0 &&
                !this.parryRolled &&
                targetPlayer.dashAttack &&
                Math.abs(distance) < 90 &&
                Math.abs(targetPlayer.y - bot.y) < 40 &&
                ((distance > 0 && targetPlayer.facing === -1) ||
                 (distance < 0 && targetPlayer.facing === 1))
            ) {
                this.parryRolled = true; // one roll per incoming dash
                if (bot.parryCooldown <= 0 && Math.random() * 100 < P.parryChance) {
                    bot.parry();
                }
            }

            // ---------- Swap weapons for the current distance (pro / god) ----------
            if (P.weaponSwap > 0 && --this.swapTimer <= 0) {
                this.swapTimer = 24;
                this.considerSwap(targetPlayer, distance);
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
            if (bot.parryWindow > 0 && !bot.dashing) {
                bot.xVel *= 0.5; // plant the feet while the parry guard is up
            } else if ((this.dodging || this.runAway) && !bot.dashing) {
                bot.xVel = distance > 0 ? -P.runSpeed : P.runSpeed;
            } else if (!bot.dashing && bot.weaponId === "bow" && P.weaponSwap > 0) {
                // Archer spacing: hold about 230-300px away so arrows have room to fly
                const absDist = Math.abs(distance);
                if (absDist < 230) {
                    bot.xVel = distance > 0 ? -P.speed : P.speed;
                } else if (absDist > 300) {
                    bot.xVel = distance > 0 ? P.speed : -P.speed;
                } else {
                    bot.xVel *= 0.6;
                }
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
                bot.weaponId === "mace" && // other weapons don't hurt when slamming
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
