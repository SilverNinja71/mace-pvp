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
                if (Math.abs(distance) > 26) {
                    bot.xVel = distance > 0 ? P.speed : -P.speed;
                } else {
                    // Close quarters: keep active spacing so fighters never freeze merged together
                    bot.xVel = distance >= 0 ? 1.2 : -1.2;
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
