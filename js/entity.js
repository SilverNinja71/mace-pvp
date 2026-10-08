// ==========================================
// SPEAR-MACE PVP - Fighter Entity Class
// Handles physics, weapons, skin customization, and multi-fighter combat
// ==========================================

import { CORE_PHYSICS, ARENA_CONFIG } from './config.js';
import { sound } from './audio.js';
import { getComputedWeaponStats } from './weapons.js';

export class Fighter {
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

        this.isDead = false;
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
        this.x = x;
        this.y = y;
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
