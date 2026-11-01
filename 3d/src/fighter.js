// ==========================================
// Fighter: one player or bot. Holds its state and runs its movement and
// abilities for one physics step from an "intent" (what the controls ask
// for this step). Players, bots and online friends all use the same code,
// so everyone plays by the same rules. Hits are resolved in combat.js.
// ==========================================

import { PHYS, SPEAR, MACE, PARRY, MATCH, CLASSES } from './config.js';
import { GEYSER_R, GEYSER_VEL } from './arena.js';

export function makeIntent() {
    return { fwd: 0, right: 0, yaw: 0, pitch: 0, jump: false, jumpHeld: false, spear: false, mace: false, slam: false, parry: false, size: false };
}

const v3 = () => ({ x: 0, y: 0, z: 0 });

export class Fighter {
    constructor(opts) {
        this.id = opts.id;
        this.name = opts.name;
        this.team = opts.team;             // index; fighters on the same team can't hurt each other
        this.isBot = !!opts.isBot;
        this.isLocal = !!opts.isLocal;
        this.classId = opts.classId || 'normal';
        this.skinId = opts.skinId || 'steve';
        this.botLevel = opts.botLevel || null;
        this.dmgMult = opts.dmgMult || 1;    // bot difficulty
        this.speedMult = opts.speedMult || 1;
        this.pos = v3(); this.prevPos = v3(); this.vel = v3();
        this.dashDir = v3();
        this.yaw = 0; this.pitch = 0; this.prevYaw = 0;
        this.radius = PHYS.radius; this.height = PHYS.height;
        this.maxHp = this.classId === 'normal' ? MATCH.maxHp + 10 : MATCH.maxHp;
        this.stats = { damageDealt: 0, slamsLanded: 0, dashesLanded: 0, maxSlamDamage: 0, kos: 0, deaths: 0, parries: 0, crits: 0 };
        this.kos = 0; this.deaths = 0;
        this.big = false; this.bigScale = 1;
        this.reset();
    }

    get maxAirDashes() { return this.classId === 'energy' ? CLASSES.energy.airCharges : SPEAR.airCharges; }

    // Fresh life at a spawn point
    reset(spawn) {
        if (spawn) {
            this.pos.x = spawn.x; this.pos.y = spawn.y + 0.05; this.pos.z = spawn.z;
            this.yaw = spawn.yaw; this.pitch = -0.08;
        }
        this.prevPos.x = this.pos.x; this.prevPos.y = this.pos.y; this.prevPos.z = this.pos.z;
        this.prevYaw = this.yaw;
        this.vel.x = this.vel.y = this.vel.z = 0;
        this.hp = this.maxHp;
        this.alive = true;
        this.respawnT = 0;
        this.onGround = false;
        this.coyote = 0; this.jumpBuf = 0; this.jumpsLeft = 1; this.jumpHoldT = 0;
        this.airDashes = this.maxAirDashes;
        this.spearCd = 0; this.dashT = 0; this.hitMask = 0;
        this.slamming = false; this.apexY = this.pos.y;
        this.swingT = 0; this.swingCd = 0; this.swingPending = false;
        this.parryT = 0; this.parryCd = 0;
        this.stunT = 0; this.invulnT = 1.5; this.spawnShield = 1.5;
        this.slowT = 0; this.poisonT = 0; this.blindT = 0; this.fireT = 0; this.dotT = 0; this.dotSrc = null;
        this.lastHitBy = null; this.lastHitTime = -99;
        this.padFlight = false; this.glide = false;
        this.padCd = 0;
        this.landImpact = 0;
        // class timers
        this.invisT = 0; this.visibleT = 0;
        this.voidT = this.classId === 'void' ? 6 + Math.random() * 6 : 0;
        if (this.big) this.setBig(false);
    }

    setBig(on) {
        this.big = on;
        const s = on ? CLASSES.buddha.bigScale : 1;
        this.bigScale = s;
        this.radius = PHYS.radius * s;
        this.height = PHYS.height * s;
    }

    get invisible() { return this.invisT > 0; }

    // Unit look direction from yaw/pitch (yaw 0 looks toward -z)
    lookDir(out) {
        const cp = Math.cos(this.pitch);
        out.x = -Math.sin(this.yaw) * cp;
        out.y = Math.sin(this.pitch);
        out.z = -Math.cos(this.yaw) * cp;
        return out;
    }

    cancelActions() {
        this.dashT = 0;
        this.slamming = false;
        this.swingT = 0;
        this.swingPending = false;
        this.glide = false;
    }

    // One physics step. game gives access to physics, arena, the clock and event hooks.
    step(I, dt, game) {
        const p = this.pos, v = this.vel;
        this.prevPos.x = p.x; this.prevPos.y = p.y; this.prevPos.z = p.z;
        this.prevYaw = this.yaw;
        if (!this.alive) return;

        // ---- timers ----
        this.spearCd = Math.max(0, this.spearCd - dt);
        this.swingCd = Math.max(0, this.swingCd - dt);
        this.parryCd = Math.max(0, this.parryCd - dt);
        this.parryT = Math.max(0, this.parryT - dt);
        this.stunT = Math.max(0, this.stunT - dt);
        this.invulnT = Math.max(0, this.invulnT - dt);
        this.spawnShield = Math.max(0, this.spawnShield - dt);
        this.slowT = Math.max(0, this.slowT - dt);
        this.blindT = Math.max(0, this.blindT - dt);
        this.padCd = Math.max(0, this.padCd - dt);
        this.tickStatus(dt, game);
        this.tickClass(dt, game, I);
        if (!this.alive) return;

        this.yaw = I.yaw;
        this.pitch = I.pitch;
        const stunned = this.stunT > 0;
        if (I.jumpHeld) this.jumpHoldT += dt; else this.jumpHoldT = 0;

        // ---- wish direction from the move keys ----
        const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
        let wx = 0, wz = 0;
        if (!stunned) {
            wx = -sy * I.fwd + cy * I.right;
            wz = -cy * I.fwd - sy * I.right;
            const len = Math.hypot(wx, wz);
            if (len > 1) { wx /= len; wz /= len; }
        }
        let speed = PHYS.walkSpeed * this.speedMult;
        if (this.slowT > 0) speed *= 0.5;
        if (this.invisible) speed *= CLASSES.shadow.speedMult;
        if (this.padFlight && (wx || wz)) this.padFlight = false; // steering ends the pad's guided arc

        // ---- abilities (pressed this step) ----
        if (!stunned) {
            if (I.parry && this.parryCd <= 0) {
                this.parryT = PARRY.window;
                this.parryCd = PARRY.cooldown;
                game.emit('parryUp', this);
            }
            if (I.size && this.classId === 'buddha') {
                this.setBig(!this.big);
                game.emit('grow', this);
            }
            if (I.spear && this.spearCd <= 0 && this.dashT <= 0 && !this.slamming && (this.onGround || this.coyote > 0 || this.airDashes > 0)) {
                this.startDash(game);
            }
            const slamAsk = (I.mace || I.slam);
            if (slamAsk && this.dashT <= 0 && !this.slamming) {
                const below = game.physics.groundAt(p.x, p.z, this.radius * 0.6, p.y + 0.05);
                if (!this.onGround && p.y - below > 1.0) {
                    this.slamming = true;
                    this.glide = false;
                    this.padFlight = false;
                    v.y = Math.min(v.y, MACE.slamSpeed);
                    v.x *= 0.45; v.z *= 0.45;
                    game.emit('slamStart', this);
                } else if (this.onGround && I.mace && this.swingCd <= 0) {
                    this.swingT = 0.3;
                    this.swingCd = MACE.swingCooldown;
                    this.swingPending = true;
                    game.emit('swing', this);
                }
            }
            // jump buffer: a press just before landing still jumps
            if (I.jump) this.jumpBuf = PHYS.jumpBuffer;
        }
        this.jumpBuf = Math.max(0, this.jumpBuf - dt);
        if (this.swingT > 0) this.swingT = Math.max(0, this.swingT - dt);

        // ---- velocity ----
        if (this.dashT > 0) {
            const ds = SPEAR.speed * (this.invisible ? 1.1 : 1);
            v.x = this.dashDir.x * ds; v.y = this.dashDir.y * ds; v.z = this.dashDir.z * ds;
            this.dashT -= dt;
            if (this.dashT <= 0) {
                v.x *= 0.38; v.z *= 0.38;
                v.y = Math.min(v.y * 0.3, 5);
                this.apexY = Math.max(this.apexY, p.y);
            }
        } else {
            if (this.onGround) {
                const tx = wx * speed, tz = wz * speed;
                const accel = (wx || wz) ? PHYS.groundAccel : PHYS.groundFriction * speed;
                approach(v, tx, tz, accel * dt);
                if (this.swingT > 0) { v.x *= 0.9; v.z *= 0.9; }
            } else if (!this.padFlight) {
                // air: steer toward the keys without killing momentum you already have
                const ctl = this.slamming ? 0.45 : 1;
                if (wx || wz) {
                    const along = v.x * wx + v.z * wz;
                    const add = Math.min(PHYS.airAccel * ctl * dt, Math.max(0, speed - along));
                    v.x += wx * add; v.z += wz * add;
                }
                const drag = 1 - PHYS.airDrag * dt * (wx || wz ? 0.3 : 1);
                v.x *= drag; v.z *= drag;
            }
            // gravity, glide
            v.y += PHYS.gravity * dt;
            if (v.y < PHYS.maxFall) v.y = PHYS.maxFall;
            this.glide = !this.onGround && !this.slamming && !stunned && I.jumpHeld && this.jumpHoldT > 0.22 && this.jumpsLeft === 0 && v.y < 0;
            if (this.glide) {
                if (v.y < PHYS.glideFall) v.y += (PHYS.glideFall - v.y) * Math.min(1, dt * 10);
                const fx = -sy, fz = -cy;
                const along = v.x * fx + v.z * fz;
                if (along < PHYS.glideSpeed) { v.x += fx * 14 * dt; v.z += fz * 14 * dt; }
                this.apexY = p.y; // gliding down gently doesn't build slam height
            }
        }

        // ---- jumping ----
        if (this.jumpBuf > 0 && !stunned && this.dashT <= 0 && !this.slamming) {
            const jm = this.big ? CLASSES.buddha.jumpMult : 1;
            if (this.onGround || this.coyote > 0) {
                v.y = PHYS.jumpVel * jm;
                this.onGround = false;
                this.coyote = 0;
                this.jumpBuf = 0;
                this.jumpsLeft = this.big ? 0 : 1;
                this.padFlight = false;
                game.emit('jump', this);
            } else if (this.jumpsLeft > 0 && I.jump) {
                // second jump: a wind-charge burst under your feet
                v.y = Math.max(v.y, PHYS.windJumpVel);
                this.jumpsLeft--;
                this.jumpBuf = 0;
                this.padFlight = false;
                game.emit('windJump', this);
            }
        }

        // ---- jump pads and the geyser (on touching them) ----
        if (this.dashT <= 0 && this.padCd <= 0) {
            const pads = game.arena.pads;
            for (let i = 0; i < pads.length; i++) {
                const pd = pads[i];
                const dx = p.x - pd.x, dz = p.z - pd.z;
                if (dx * dx + dz * dz < pd.r * pd.r && Math.abs(p.y - pd.y - 0.18) < 0.45 && v.y <= 0.5) {
                    v.x = pd.vx; v.y = pd.vy; v.z = pd.vz;
                    p.x = pd.x; p.z = pd.z;
                    this.padFlight = true;
                    this.slamming = false;
                    this.onGround = false;
                    this.jumpsLeft = 1;
                    this.airDashes = this.maxAirDashes;
                    this.padCd = 0.5;
                    game.emit('pad', this, pd);
                    break;
                }
            }
            const gy = game.arena.geyser;
            if (p.x * p.x + p.z * p.z < GEYSER_R * GEYSER_R && p.y < gy.y + 0.6 && v.y <= 1) {
                v.y = GEYSER_VEL;
                v.x *= 0.3; v.z *= 0.3;
                this.slamming = false;
                this.onGround = false;
                this.jumpsLeft = 1;
                this.airDashes = this.maxAirDashes;
                this.padCd = 0.5;
                game.emit('geyser', this);
            }
        }

        // ---- move ----
        const wasGround = this.onGround;
        const fallV = v.y;
        game.physics.move(this, dt);

        if (this.onGround) {
            if (!wasGround) this.onLand(-fallV, game);
            this.coyote = PHYS.coyoteTime;
            this.apexY = p.y;
            this.jumpsLeft = this.big ? 0 : 1;
            this.airDashes = this.maxAirDashes;
            this.padFlight = false;
        } else {
            this.coyote = Math.max(0, this.coyote - dt);
            if (p.y > this.apexY) this.apexY = p.y;
        }

        if (p.y < PHYS.voidY) game.knockOut(this, 'void');
    }

    startDash(game) {
        const d = this.lookDir(this.dashDir);
        if ((this.onGround || this.coyote > 0) && d.y < 0.05) {
            // from the ground you can't dash into the floor
            d.y = 0.05;
            const l = Math.hypot(d.x, d.y, d.z);
            d.x /= l; d.y /= l; d.z /= l;
        }
        if (!this.onGround && this.coyote <= 0) this.airDashes--;
        this.dashT = SPEAR.time;
        this.spearCd = this.classId === 'energy' ? CLASSES.energy.cooldown : SPEAR.cooldown;
        this.hitMask = 0;
        this.onGround = false;
        this.coyote = 0;
        this.glide = false;
        this.padFlight = false;
        game.emit('dash', this);
    }

    onLand(impact, game) {
        this.landImpact = impact;
        if (this.slamming) {
            this.slamming = false;
            game.combat.slamLand(this);
        } else if (impact > 14) {
            game.emit('land', this, impact);
        }
    }

    tickStatus(dt, game) {
        if (this.poisonT > 0 || this.fireT > 0) {
            this.poisonT = Math.max(0, this.poisonT - dt);
            this.fireT = Math.max(0, this.fireT - dt);
            this.dotT += dt;
            const tick = 0.5;
            if (this.dotT >= tick) {
                this.dotT -= tick;
                const dmg = (this.poisonT > 0 ? 1 : 0) + (this.fireT > 0 ? CLASSES.pyro.fireDps * tick : 0);
                if (dmg > 0) game.combat.dot(this, dmg);
            }
        } else {
            this.dotT = 0;
        }
    }

    tickClass(dt, game) {
        if (this.classId === 'shadow') {
            const c = CLASSES.shadow;
            if (this.invisT > 0) {
                this.invisT -= dt;
                if (this.invisT <= 0) { this.invisT = 0; this.visibleT = 0; game.emit('reveal', this); }
            } else {
                this.visibleT += dt;
                if (this.visibleT >= c.visibleTime) { this.invisT = c.invisTime; game.emit('vanish', this); }
            }
        } else if (this.classId === 'void') {
            this.voidT -= dt;
            if (this.voidT <= 0) {
                const c = CLASSES.void;
                this.voidT = c.minDelay + Math.random() * (c.maxDelay - c.minDelay);
                const t = game.randomEnemy(this);
                if (t) {
                    game.emit('blinkOut', this);
                    const a = Math.random() * Math.PI * 2;
                    this.pos.x = t.pos.x + Math.cos(a) * 1.2;
                    this.pos.z = t.pos.z + Math.sin(a) * 1.2;
                    this.pos.y = t.pos.y + c.height;
                    this.prevPos.x = this.pos.x; this.prevPos.y = this.pos.y; this.prevPos.z = this.pos.z;
                    this.vel.x = this.vel.z = 0; this.vel.y = 0;
                    this.apexY = this.pos.y;
                    this.cancelActions();
                    this.onGround = false;
                    this.jumpsLeft = 1;
                    this.airDashes = this.maxAirDashes;
                    game.emit('blinkIn', this);
                }
            }
        }
    }
}

// Move horizontal velocity toward (tx, tz) by at most maxDelta
function approach(v, tx, tz, maxDelta) {
    const dx = tx - v.x, dz = tz - v.z;
    const d = Math.hypot(dx, dz);
    if (d <= maxDelta || d < 1e-6) { v.x = tx; v.z = tz; return; }
    v.x += dx / d * maxDelta;
    v.z += dz / d * maxDelta;
}
