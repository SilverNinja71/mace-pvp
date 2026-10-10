// ==========================================
// SPEAR-MACE PVP - Combat & Collision Engine
// Resolves air slams, ground slam shockwaves, dash strikes,
// arrows, and weapon-specific damage & knockback
// ==========================================

import { CORE_PHYSICS, CLASSES } from './config.js';
import { sound } from './audio.js';

export class CombatEngine {
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
