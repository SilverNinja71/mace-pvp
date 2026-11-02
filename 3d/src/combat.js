// ==========================================
// Combat: resolves spear dashes, mace slams, ground shockwaves, mace
// swings, parries and clashes between fighters, after every fighter has
// moved for the step. Online, only the host runs this.
// ==========================================

import { SPEAR, MACE, PARRY, HIT, CLASSES } from './config.js';

const tmp = { x: 0, y: 0, z: 0 };

export function slamDamage(fall) {
    const d = MACE.minDamage + Math.max(0, fall - MACE.minFall) * MACE.perMetre;
    return Math.min(MACE.maxDamage, Math.max(MACE.minDamage, d));
}

export class Combat {
    constructor(game) {
        this.game = game;
    }

    enemies(a, d) {
        return d !== a && d.alive && d.team !== a.team;
    }

    step() {
        const fs = this.game.fighters;
        for (let i = 0; i < fs.length; i++) {
            const a = fs[i];
            if (!a.alive) continue;
            if (a.dashT > 0) this.checkDash(a, fs);
            if (a.slamming) this.checkSlamDirect(a, fs);
            if (a.swingPending && a.swingT <= 0.16) { a.swingPending = false; this.checkSwing(a, fs); }
        }
        this.separate(fs);
    }

    // Soft push so fighters don't stand inside each other (not while dashing: spears pierce through)
    separate(fs) {
        for (let i = 0; i < fs.length; i++) {
            const a = fs[i];
            if (!a.alive || a.dashT > 0) continue;
            for (let j = i + 1; j < fs.length; j++) {
                const b = fs[j];
                if (!b.alive || b.dashT > 0) continue;
                if (a.pos.y > b.pos.y + b.height || b.pos.y > a.pos.y + a.height) continue;
                const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
                const rr = a.radius + b.radius;
                const d2 = dx * dx + dz * dz;
                if (d2 >= rr * rr || d2 < 1e-8) continue;
                const d = Math.sqrt(d2), push = (rr - d) * 0.5;
                a.pos.x -= dx / d * push; a.pos.z -= dz / d * push;
                b.pos.x += dx / d * push; b.pos.z += dz / d * push;
            }
        }
    }

    // Distance from point (px,py,pz) to a fighter's body axis (an upright line from feet to head)
    static axisDist(f, px, py, pz) {
        const y = Math.max(f.pos.y + f.radius * 0.5, Math.min(f.pos.y + f.height - f.radius * 0.3, py));
        const dx = px - f.pos.x, dy = py - y, dz = pz - f.pos.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    checkDash(a, fs) {
        const reach = 1.7 * a.bigScale;
        const chestY = a.pos.y + a.height * 0.6;
        for (let j = 0; j < fs.length; j++) {
            const d = fs[j];
            if (!this.enemies(a, d) || (a.hitMask & (1 << j))) continue;
            // the spear: from the chest to the tip, three sample points
            let hit = false;
            for (let k = 0; k <= 2 && !hit; k++) {
                const t = reach * k / 2;
                const px = a.pos.x + a.dashDir.x * t, py = chestY + a.dashDir.y * t, pz = a.pos.z + a.dashDir.z * t;
                if (Combat.axisDist(d, px, py, pz) < SPEAR.hitRadius * 0.5 + d.radius + (k === 2 ? 0.25 : 0)) hit = true;
            }
            if (!hit) continue;
            a.hitMask |= (1 << j);
            if (d.parryT > 0) { this.parry(a, d); return; }
            // two spears meeting head-on: a clash, nobody is hurt
            if (d.dashT > 0 && dot(a.dashDir, d.dashDir) < -0.35) {
                d.hitMask |= (1 << fs.indexOf(a));
                this.clash(a, d);
                return;
            }
            const progress = 1 - a.dashT / SPEAR.time;
            const crit = progress >= 1 - SPEAR.critWindow || d.slamming; // full extension, or catching a slammer
            let dmg = SPEAR.damage * (crit ? SPEAR.critMult : 1);
            if (a.classId === 'energy') dmg *= CLASSES.energy.dashMult;
            const hx = a.dashDir.x, hz = a.dashDir.z;
            const hl = Math.hypot(hx, hz) || 1;
            this.hit(a, d, dmg, crit ? 'spearCrit' : 'spear', hx / hl, hz / hl, SPEAR.knockback * (crit ? 1.25 : 1), SPEAR.knockUp);
            a.stats.dashesLanded++;
            if (crit) a.stats.crits++;
        }
    }

    checkSlamDirect(a, fs) {
        for (let j = 0; j < fs.length; j++) {
            const d = fs[j];
            if (!this.enemies(a, d)) continue;
            const top = d.pos.y + d.height;
            if (a.pos.y > top + 0.9 || a.pos.y < top - 1.1) continue;
            const dx = d.pos.x - a.pos.x, dz = d.pos.z - a.pos.z;
            const rr = MACE.directRadius * a.bigScale + d.radius * 0.5;
            if (dx * dx + dz * dz > rr * rr) continue;
            if (d.invulnT > 0) continue;
            if (d.parryT > 0) { this.parry(a, d); return; }
            const fall = a.apexY - a.pos.y;
            const dmg = slamDamage(fall);
            const dl = Math.hypot(dx, dz);
            const kx = dl > 0.05 ? dx / dl : -Math.sin(a.yaw), kz = dl > 0.05 ? dz / dl : -Math.cos(a.yaw);
            this.hit(a, d, dmg, 'slam', kx, kz, MACE.knockback * 0.7, MACE.knockUp * 0.6, fall);
            this.slamStats(a, dmg);
            this.game.emit('shockwave', a, Math.min(1, fall / 18), a.pos.y);
            this.bounce(a);
            return;
        }
    }

    // A slam hitting the floor: shockwave damage around the landing spot
    slamLand(a) {
        const net = this.game.remote;
        if (net && !net.isHost) {
            // online guest: show the impact now, the host works out who it hit
            const fall = a.apexY - a.pos.y, strength = Math.min(1, fall / 18);
            this.game.emit('shockwave', a, strength, a.pos.y, MACE.shockRadius * (0.7 + strength * 0.5) * a.bigScale);
            net.sendSlam(a);
            a.apexY = a.pos.y;
            return;
        }
        const fall = a.apexY - a.pos.y;
        const strength = Math.min(1, fall / 18);
        const R = MACE.shockRadius * (0.7 + strength * 0.5) * a.bigScale;
        const fs = this.game.fighters;
        let any = false;
        this.game.emit('shockwave', a, strength, a.pos.y, R);
        for (let j = 0; j < fs.length; j++) {
            const d = fs[j];
            if (!this.enemies(a, d) || d.invulnT > 0) continue;
            if (Math.abs(d.pos.y - a.pos.y) > 1.7) continue;
            const dx = d.pos.x - a.pos.x, dz = d.pos.z - a.pos.z;
            const dist = Math.hypot(dx, dz);
            if (dist > R + d.radius) continue;
            if (d.parryT > 0) { this.parry(a, d); continue; }
            const dmg = slamDamage(fall) * MACE.shockMult * (1 - 0.6 * Math.min(1, dist / R));
            const kx = dist > 0.05 ? dx / dist : 1, kz = dist > 0.05 ? dz / dist : 0;
            this.hit(a, d, dmg, 'shock', kx, kz, MACE.knockback * (0.8 + strength * 0.6), MACE.knockUp, fall);
            this.slamStats(a, dmg);
            any = true;
        }
        if (any) this.bounce(a);
        a.apexY = a.pos.y;
    }

    checkSwing(a, fs) {
        const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw);
        const range = MACE.swingRange * a.bigScale;
        for (let j = 0; j < fs.length; j++) {
            const d = fs[j];
            if (!this.enemies(a, d) || d.invulnT > 0) continue;
            if (Math.abs(d.pos.y - a.pos.y) > 1.6) continue;
            const dx = d.pos.x - a.pos.x, dz = d.pos.z - a.pos.z;
            const dist = Math.hypot(dx, dz);
            if (dist > range + d.radius || dist < 1e-4) continue;
            if ((dx * fx + dz * fz) / dist < 0.35) continue;
            if (d.parryT > 0) { this.parry(a, d); return; }
            this.hit(a, d, MACE.swingDamage, 'swing', dx / dist, dz / dist, MACE.knockback, MACE.knockUp * 0.7);
        }
    }

    // Like the mace in the original: a landed slam bounces you back up and resets your fall
    bounce(a) {
        const R = this.game.remote;
        if (R && R.isGuestFighter(a)) { a.slamming = false; a.vel.y = MACE.bounceVel; R.sendBody(a, 'bounce'); return; }
        a.slamming = false;
        a.onGround = false;
        a.vel.y = MACE.bounceVel;
        a.vel.x *= 0.5; a.vel.z *= 0.5;
        a.apexY = a.pos.y;
        a.jumpsLeft = 1;
        a.airDashes = a.maxAirDashes;
        a.spearCd = Math.min(a.spearCd, 0.1);
    }

    slamStats(a, dmg) {
        a.stats.slamsLanded++;
        if (dmg >= 60) a.stats.bigSlams++;
        if (dmg > a.stats.maxSlamDamage) a.stats.maxSlamDamage = dmg;
    }

    // Apply a hit. kx/kz: unit push direction on the ground plane.
    hit(a, d, dmg, kind, kx, kz, knock, up, fall = 0) {
        if (d.invulnT > 0 || !d.alive) return false;
        const g = this.game;
        if (a.invisible) dmg *= CLASSES.shadow.damageMult;
        if (a.big) dmg *= CLASSES.buddha.damageMult;
        dmg *= a.dmgMult;
        dmg = Math.round(dmg);
        const before = d.hp;
        d.hp -= dmg;
        const dealt = Math.min(dmg, Math.max(0, before));
        a.stats.damageDealt += dealt;
        d.invulnT = HIT.invuln;
        d.stunT = Math.max(d.stunT, HIT.stun * (kind === 'slam' || kind === 'shock' ? 1.3 : 1));
        d.cancelActions();
        d.padFlight = false;
        d.lastHitBy = a;
        d.lastHitTime = g.time;
        d.airborneSinceHit = true;
        // the lower your health, the farther you fly: knockouts into the void get likelier
        const pressure = 1 + (1 - Math.max(0, d.hp) / d.maxHp) * 0.8;
        const kb = knock * pressure * (d.big ? 0.75 : 1);
        d.vel.x = kx * kb;
        d.vel.z = kz * kb;
        d.vel.y = up * (0.85 + 0.25 * pressure);
        d.onGround = false;
        d.apexY = d.pos.y;

        let bolt = false;
        if ((kind === 'slam' || kind === 'shock') && a.classId === 'lightning') {
            d.stunT += CLASSES.lightning.stunBonus;
            if (Math.random() < CLASSES.lightning.boltChance && d.hp > 0) {
                d.hp -= CLASSES.lightning.boltDamage;
                a.stats.damageDealt += CLASSES.lightning.boltDamage;
                bolt = true;
            }
        }
        this.statusEffects(a, d);
        const R = g.remote;
        if (R && R.isGuestFighter(d)) R.sendBody(d, 'hit');
        const crit = kind === 'spearCrit' || ((kind === 'slam' || kind === 'shock') && dmg >= 60);
        g.emit('hit', a, d, dmg, kind, crit, bolt);
        g.hitstop(Math.min(HIT.hitstopMax, dmg * HIT.hitstopPer));
        if (d.hp <= 0) g.knockOut(d, kind);
        return true;
    }

    statusEffects(a, d) {
        if (d.hp <= 0) return;
        if (a.classId === 'potion') {
            const c = CLASSES.potion;
            if (Math.random() < c.slowChance) { d.slowT = c.slowTime; this.game.emit('status', d, 'slowed', '#5aa0ff'); }
            if (Math.random() < c.poisonChance) { d.poisonT = c.poisonTime; d.dotSrc = a; this.game.emit('status', d, 'poisoned', '#5ce65c'); }
            if (Math.random() < c.blindChance) { d.blindT = c.blindTime; this.game.emit('status', d, 'blinded', '#dddddd'); }
        } else if (a.classId === 'pyro') {
            const c = CLASSES.pyro;
            if (Math.random() < c.fireChance) { d.fireT = c.fireTime; d.dotSrc = a; this.game.emit('status', d, 'fire', '#ff7a2f'); }
        }
    }

    // Poison and fire ticks
    dot(d, dmg) {
        if (!d.alive) return;
        if (this.game.remote && !this.game.remote.isHost) return; // the host deals it
        d.hp -= dmg;
        const src = d.dotSrc;
        if (src) { src.stats.damageDealt += dmg; d.lastHitBy = src; d.lastHitTime = this.game.time; }
        this.game.emit('dot', d, dmg);
        if (d.hp <= 0) this.game.knockOut(d, 'dot');
    }

    // The defender's guard was up: no damage, the attacker is stunned and knocked back
    parry(a, d) {
        const dx = a.pos.x - d.pos.x, dz = a.pos.z - d.pos.z;
        const l = Math.hypot(dx, dz) || 1;
        a.cancelActions();
        a.stunT = Math.max(a.stunT, PARRY.attackerStun);
        a.vel.x = dx / l * PARRY.bounce; a.vel.z = dz / l * PARRY.bounce; a.vel.y = 6;
        a.onGround = false;
        a.apexY = a.pos.y;
        const R = this.game.remote;
        if (R && R.isGuestFighter(a)) R.sendBody(a, 'parry');
        d.parryT = 0;
        d.parryCd = 0;
        d.spearCd = 0;
        d.airDashes = d.maxAirDashes;
        d.invulnT = Math.max(d.invulnT, PARRY.safeTime);
        d.stats.parries++;
        midpoint(a, d, tmp);
        this.game.emit('parry', d, a, tmp.x, tmp.y, tmp.z);
        this.game.hitstop(0.08);
    }

    clash(a, d) {
        const dx = a.pos.x - d.pos.x, dz = a.pos.z - d.pos.z;
        const l = Math.hypot(dx, dz) || 1;
        for (const [f, s] of [[a, 1], [d, -1]]) {
            f.cancelActions();
            f.vel.x = dx / l * PARRY.bounce * s; f.vel.z = dz / l * PARRY.bounce * s; f.vel.y = 5;
            f.onGround = false;
            f.invulnT = Math.max(f.invulnT, PARRY.safeTime);
            f.spearCd = 0;
            f.airDashes = f.maxAirDashes;
        }
        const R = this.game.remote;
        if (R) { if (R.isGuestFighter(a)) R.sendBody(a, 'clash'); if (R.isGuestFighter(d)) R.sendBody(d, 'clash'); }
        midpoint(a, d, tmp);
        this.game.emit('clash', a, d, tmp.x, tmp.y, tmp.z);
        this.game.hitstop(0.07);
    }
}

function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function midpoint(a, d, out) {
    out.x = (a.pos.x + d.pos.x) / 2;
    out.y = (a.pos.y + d.pos.y) / 2 + 1.1;
    out.z = (a.pos.z + d.pos.z) / 2;
    return out;
}
