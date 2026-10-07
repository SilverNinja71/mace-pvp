// ==========================================
// SPEAR-MACE PVP - Combat & Collision Engine
// Resolves air slams, ground slam shockwaves, dash strikes,
// arrows, and weapon-specific damage & knockback
// ==========================================

import { CORE_PHYSICS } from './config.js';
import { sound } from './audio.js';

export class CombatEngine {
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
