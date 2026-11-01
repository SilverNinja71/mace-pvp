// ==========================================
// BotBrain: computer opponents. Each step it looks at the arena and fills
// the same intent a player's controls would. It walks between islands with
// the jump pads, leads its spear dashes at moving targets, rides the
// geyser to slam from high up, gets out from under falling slams, parries,
// and uses its jumps and dashes to get back from the void.
// ==========================================

import { BOT_LEVELS, SPEAR, MACE, PHYS } from './config.js';
import { CENTER_R } from './arena.js';

const TAU = Math.PI * 2;
function wrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }

export class BotBrain {
    constructor(fighter, levelId, game) {
        this.f = fighter;
        this.level = BOT_LEVELS[levelId] || BOT_LEVELS.normal;
        this.levelId = levelId;
        this.game = game;
        this.target = null;
        this.think = 0;
        this.plan = 'approach';
        this.planT = 0;
        this.aimYaw = fighter.yaw;
        this.aimPitch = 0;
        this.wantYaw = fighter.yaw; this.wantPitch = 0;
        this.moveX = 0; this.moveZ = 0;
        this.strafe = Math.random() < 0.5 ? 1 : -1;
        this.strafeT = 0;
        this.seen = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
        this.reactT = 0;
        this.press = { jump: false, spear: false, mace: false, parry: false, size: false };
        this.jumpHold = 0;
        this.climbCd = 3 + Math.random() * 4;
        this.dodgeCd = 0;
        this.passive = levelId === 'dummy';
        this.stuckT = 0;
    }

    pickTarget() {
        const f = this.f;
        let best = null, bestScore = Infinity;
        for (const o of this.game.fighters) {
            if (o === f || !o.alive || o.team === f.team) continue;
            const dx = o.pos.x - f.pos.x, dy = o.pos.y - f.pos.y, dz = o.pos.z - f.pos.z;
            let score = Math.sqrt(dx * dx + dy * dy * 2 + dz * dz);
            if (o.invisible && score > 6) score += 40;
            if (o === this.target) score -= 4; // keep the same target unless another is much closer
            if (o.isLocal) score -= 2;
            if (o.spawnShield > 0) score += 12;
            if (score < bestScore) { bestScore = score; best = o; }
        }
        this.target = best;
    }

    // Fill intent I for one step
    fill(I, dt) {
        const f = this.f, g = this.game, L = this.level;
        const P = this.press;
        P.jump = P.spear = P.mace = P.parry = P.size = false;
        this.think -= dt;
        this.reactT -= dt;
        this.dodgeCd -= dt;
        this.climbCd -= dt;
        this.planT += dt;
        this.strafeT -= dt;
        if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = 1 + Math.random() * 2.5; }

        if (!f.alive || this.passive) {
            I.fwd = I.right = 0; I.jump = I.spear = I.mace = I.slam = I.parry = I.size = false; I.jumpHeld = false;
            I.yaw = f.yaw; I.pitch = 0;
            if (this.passive && f.alive) this.dummyMove(I, dt);
            return;
        }

        if (this.think <= 0) {
            this.think = 0.1;
            this.pickTarget();
        }
        const t = this.target;
        // What the bot "sees" is refreshed every reaction period (slower bots react later)
        if (t && this.reactT <= 0) {
            this.reactT = L.react * (0.7 + Math.random() * 0.6);
            const s = this.seen;
            s.x = t.pos.x; s.y = t.pos.y; s.z = t.pos.z; s.vx = t.vel.x; s.vy = t.vel.y; s.vz = t.vel.z;
            if (t.invisible) { s.x += (Math.random() - 0.5) * 6; s.z += (Math.random() - 0.5) * 6; }
        }
        const ground = g.physics.groundAt(f.pos.x, f.pos.z, 0.3, f.pos.y + 0.1);
        const overVoid = ground === -Infinity;

        this.moveX = 0; this.moveZ = 0;
        let jumpHeld = false;

        if (!f.onGround && (overVoid || f.pos.y < ground - 0.5) && f.pos.y < (t ? Math.max(4, t.pos.y + 3) : 4) && !f.padFlight) {
            this.recover(dt);
            jumpHeld = this.jumpHold > 0;
        } else if (!this.dodge(dt) && t) {
            this.engage(t, dt, ground);
        } else if (!t) {
            // nobody to fight: drift toward the middle
            this.goToward(0, 0, 0.6);
        }

        // Don't walk off edges by accident
        if (f.onGround && (this.moveX || this.moveZ) && this.plan !== 'pad') {
            const ax = f.pos.x + this.moveX * 1.6, az = f.pos.z + this.moveZ * 1.6;
            if (g.physics.groundAt(ax, az, 0.2, f.pos.y + 0.6) < f.pos.y - 3) {
                // steer along the edge instead (toward the centre of what we're standing on)
                const zone = g.arena.zoneOf(f.pos.x, f.pos.z);
                const c = zone > 0 ? g.arena.islands[zone - 1] : { x: 0, z: 0 };
                const dx = c.x - f.pos.x, dz = c.z - f.pos.z, l = Math.hypot(dx, dz) || 1;
                this.moveX = dx / l; this.moveZ = dz / l;
            }
        }

        // Turn smoothly toward where we want to look (better bots turn faster)
        const turn = (6 + 16 * L.aim) * dt;
        this.aimYaw += Math.max(-turn, Math.min(turn, wrap(this.wantYaw - this.aimYaw)));
        this.aimPitch += Math.max(-turn, Math.min(turn, this.wantPitch - this.aimPitch));
        this.aimPitch = Math.max(-1.4, Math.min(1.4, this.aimPitch));
        I.yaw = this.aimYaw;
        I.pitch = this.aimPitch;

        // Turn the wanted world-space move into forward/right relative to where we face
        const sy = Math.sin(I.yaw), cy = Math.cos(I.yaw);
        I.fwd = this.moveX * -sy + this.moveZ * -cy;
        I.right = this.moveX * cy + this.moveZ * -sy;
        if (this.jumpHold > 0) { this.jumpHold -= dt; jumpHeld = true; }
        I.jump = P.jump; I.jumpHeld = jumpHeld || P.jump;
        I.spear = P.spear; I.mace = P.mace; I.slam = false; I.parry = P.parry; I.size = P.size;
    }

    goToward(x, z, k = 1) {
        const f = this.f;
        const dx = x - f.pos.x, dz = z - f.pos.z, l = Math.hypot(dx, dz);
        if (l < 0.3) return l;
        this.moveX = dx / l * k; this.moveZ = dz / l * k;
        return l;
    }

    lookAt(x, y, z) {
        const f = this.f;
        const dx = x - f.pos.x, dy = y - (f.pos.y + 1.55), dz = z - f.pos.z;
        this.wantYaw = Math.atan2(-dx, -dz);
        this.wantPitch = Math.atan2(dy, Math.hypot(dx, dz));
    }

    aimed(tol = 0.14) {
        return Math.abs(wrap(this.wantYaw - this.aimYaw)) < tol && Math.abs(this.wantPitch - this.aimPitch) < tol * 1.5;
    }

    // Off the edge: jump, then dash back toward solid ground
    recover() {
        const f = this.f, g = this.game;
        // nearest landing spot: the colosseum or the closest island
        let tx = 0, tz = 0, ty = 0, best = Infinity;
        const cands = [{ x: 0, z: 0, y: 0, r: CENTER_R }, ...g.arena.islands];
        for (const c of cands) {
            const dx = c.x - f.pos.x, dz = c.z - f.pos.z;
            const d = Math.hypot(dx, dz) - c.r + Math.max(0, c.y - f.pos.y) * 1.5;
            if (d < best) {
                best = d;
                const l = Math.hypot(dx, dz) || 1;
                const inset = Math.min(l, c.r * 0.6);
                tx = f.pos.x + dx / l * (l - c.r + inset); tz = f.pos.z + dz / l * (l - c.r + inset); ty = c.y;
            }
        }
        this.goToward(tx, tz, 1);
        this.lookAt(tx, ty + 3 + Math.max(0, ty - f.pos.y), tz);
        this.plan = 'recover';
        if (f.vel.y < 1 && f.jumpsLeft > 0) { this.press.jump = true; this.jumpHold = 0.5; }
        else if (f.vel.y < -2 && f.airDashes > 0 && f.spearCd <= 0 && this.aimed(0.3)) this.press.spear = true;
        else if (f.jumpsLeft === 0 && f.airDashes === 0) this.jumpHold = 0.2; // glide the rest
    }

    // React to attacks aimed at us. Returns true if dodging this step.
    dodge(dt) {
        const f = this.f, L = this.level;
        if (this.dodgeCd > 0 && this.plan !== 'dodge') return false;
        if (this.plan === 'dodge' && this.planT < 0.45) {
            this.moveX = this.dodgeX; this.moveZ = this.dodgeZ;
            return true;
        }
        for (const o of this.game.fighters) {
            if (o === f || !o.alive || o.team === f.team) continue;
            const dx = f.pos.x - o.pos.x, dz = f.pos.z - o.pos.z;
            const hd = Math.hypot(dx, dz);
            // a slam coming down on us
            if ((o.slamming || (o.vel.y < -8 && o.pos.y > f.pos.y + 3)) && hd < MACE.shockRadius + 1 && o.pos.y > f.pos.y + 1.5) {
                this.dodgeCd = 0.6;
                const timeToLand = (o.pos.y - f.pos.y) / Math.max(10, -o.vel.y);
                if (timeToLand < 0.18 && Math.random() < L.parry) { this.press.parry = true; return true; }
                if (Math.random() < L.dodge) {
                    const l = hd || 1;
                    this.dodgeX = dx / l || 1; this.dodgeZ = dz / l || 0;
                    this.plan = 'dodge'; this.planT = 0;
                    this.moveX = this.dodgeX; this.moveZ = this.dodgeZ;
                    if (Math.random() < 0.4) this.press.jump = true;
                    return true;
                }
                return false;
            }
            // a spear dash coming at us
            if (o.dashT > 0) {
                const d3 = Math.hypot(dx, f.pos.y - o.pos.y, dz) || 1;
                const along = (dx * o.dashDir.x + (f.pos.y - o.pos.y) * o.dashDir.y + dz * o.dashDir.z) / d3;
                if (along > 0.82 && d3 < 9) {
                    this.dodgeCd = 0.5;
                    if (d3 < 4.5 && Math.random() < L.parry) { this.press.parry = true; return true; }
                    if (Math.random() < L.dodge) {
                        // sidestep across the dash line, and hop
                        const sx = -o.dashDir.z, sz = o.dashDir.x;
                        const sl = Math.hypot(sx, sz) || 1;
                        const side = Math.random() < 0.5 ? 1 : -1;
                        this.dodgeX = sx / sl * side; this.dodgeZ = sz / sl * side;
                        this.plan = 'dodge'; this.planT = 0;
                        this.moveX = this.dodgeX; this.moveZ = this.dodgeZ;
                        this.press.jump = Math.random() < 0.6;
                        return true;
                    }
                    return false;
                }
            }
        }
        if (this.plan === 'dodge') this.plan = 'approach';
        return false;
    }

    engage(t, dt, ground) {
        const f = this.f, g = this.game, L = this.level, s = this.seen;
        const dx = s.x - f.pos.x, dz = s.z - f.pos.z;
        const hd = Math.hypot(dx, dz);
        const dy = s.y - f.pos.y;
        const myZone = g.arena.zoneOf(f.pos.x, f.pos.z);
        const tZone = g.arena.zoneOf(s.x, s.z);

        // ---- in the air above the target: line up the slam ----
        if (!f.onGround && f.pos.y - s.y > 2.2 && !f.padFlight) {
            const h = f.pos.y - s.y;
            const tFall = h / 40 + 0.05;
            const lead = L.slamLead;
            const px = s.x + s.vx * tFall * lead, pz = s.z + s.vz * tFall * lead;
            const d = this.goToward(px, pz, 1);
            this.lookAt(px, s.y, pz);
            if (d < 1.5 + h * 0.04) { this.press.mace = true; this.plan = 'approach'; }
            else if (d > 7 && f.airDashes > 0 && f.spearCd <= 0 && f.vel.y < 0 && h < 14) {
                this.lookAt(s.x + s.vx * 0.2 * L.aim, s.y + 1, s.z + s.vz * 0.2 * L.aim);
                if (this.aimed(0.25)) this.press.spear = true;
            }
            return;
        }

        // ---- geyser climb plan: ride the centre geyser up, then come down on them ----
        if (this.plan === 'climb') {
            if (this.planT > 6 || myZone !== 0) { this.plan = 'approach'; }
            else {
                if (f.onGround) {
                    this.goToward(0, 0, 1);
                    this.lookAt(s.x, s.y + 1, s.z);
                } else {
                    // rising: drift toward above the target
                    this.goToward(s.x, s.z, 0.7);
                    this.lookAt(s.x, s.y, s.z);
                }
                return;
            }
        }

        // ---- different platform: take the jump pads ----
        if (tZone >= 0 && myZone >= 0 && tZone !== myZone && t.onGround) {
            const next = myZone === 0 ? tZone : 0;
            const pad = g.arena.padFor(myZone, next);
            if (pad && f.onGround) {
                this.plan = 'pad';
                const d = this.goToward(pad.x, pad.z, 1);
                this.lookAt(pad.tx, pad.ty + 1.5, pad.tz);
                if (d < 0.4) { this.moveX = 0; this.moveZ = 0; }
                return;
            }
        } else if (this.plan === 'pad') this.plan = 'approach';

        // ---- same platform ----
        this.plan = 'approach';
        if (myZone === 0 && tZone === 0 && f.onGround && this.climbCd <= 0 && hd > 5 && Math.random() < L.climb * dt * 6) {
            this.plan = 'climb'; this.planT = 0; this.climbCd = 7 + Math.random() * 6;
            return;
        }

        const chestY = s.y + 1.1;
        // spear dash in range, leading the target
        const dashRange = 8.5;
        if (hd < dashRange && hd > 2.4 && Math.abs(dy) < 5 && f.spearCd <= 0 && (f.onGround || f.airDashes > 0)) {
            const travel = Math.hypot(hd, dy) / SPEAR.speed + 0.05;
            const err = (1 - L.aim) * 1.6;
            const ax = s.x + s.vx * travel * L.aim + (Math.random() - 0.5) * err;
            const az = s.z + s.vz * travel * L.aim + (Math.random() - 0.5) * err;
            this.lookAt(ax, chestY + s.vy * travel * 0.5 * L.aim, az);
            this.goToward(s.x, s.z, 0.5);
            if (this.aimed(0.12) && Math.random() < L.aggression * 0.25 && g.physics.lineClear(f.pos.x, f.pos.y + 1.5, f.pos.z, s.x, chestY, s.z)) {
                this.press.spear = true;
            }
            return;
        }
        // close: mace swing, or hop and slam on top of them
        if (hd <= 2.4 && Math.abs(dy) < 1.5) {
            this.lookAt(s.x, chestY, s.z);
            if (f.onGround && f.swingCd <= 0 && Math.random() < L.aggression * 0.08) this.press.mace = true;
            else if (f.onGround && Math.random() < L.aggression * 0.03) { this.press.jump = true; this.jumpHold = 0; }
            else if (!f.onGround && f.jumpsLeft > 0 && f.vel.y < 2 && Math.random() < 0.2) this.press.jump = true;
            // back off a little and circle
            this.moveX = -dx / (hd || 1) * 0.3 + (-dz / (hd || 1)) * this.strafe * 0.7;
            this.moveZ = -dz / (hd || 1) * 0.3 + (dx / (hd || 1)) * this.strafe * 0.7;
            return;
        }
        // target above us (on a pillar or monolith): jump up after them
        if (dy > 2 && hd < 4 && f.onGround && Math.random() < 0.05) this.press.jump = true;
        if (!f.onGround && dy > 0.5 && f.jumpsLeft > 0 && f.vel.y < 0) this.press.jump = true;

        // otherwise approach, weaving a little
        this.lookAt(s.x, chestY, s.z);
        const l = hd || 1;
        const weave = hd < 14 ? 0.35 : 0;
        this.moveX = dx / l + (-dz / l) * this.strafe * weave;
        this.moveZ = dz / l + (dx / l) * this.strafe * weave;
        const ml = Math.hypot(this.moveX, this.moveZ) || 1;
        this.moveX /= ml; this.moveZ /= ml;
        // hop over gaps now and then to look alive
        if (f.onGround && Math.random() < 0.004) this.press.jump = true;
        void ground; void PHYS;
    }

    // Training dummy: strolls back and forth slowly
    dummyMove(I, dt) {
        const f = this.f;
        this.planT += dt;
        const k = Math.sin(this.planT * 0.6);
        I.yaw = f.yaw;
        I.fwd = 0; I.right = Math.abs(k) > 0.3 ? Math.sign(k) * 0.35 : 0;
        I.jump = false; I.jumpHeld = false;
    }
}
