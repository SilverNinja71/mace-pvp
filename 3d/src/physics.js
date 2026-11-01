// ==========================================
// PhysicsWorld: fast collision for fighters against the arena.
// The arena is made of two shapes only: upright cylinders (floors, islands,
// pillars) and boxes. Fighters are upright cylinders too, so every test is
// a cheap circle-vs-circle or circle-vs-rectangle check on the ground plane
// plus a height range. Nothing here allocates while the game runs.
// ==========================================

import { PHYS } from './config.js';

export class PhysicsWorld {
    constructor() {
        this.colliders = [];   // { kind: 'cyl'|'box', x, z, r, minX, maxX, minZ, maxZ, yb, yt }
    }

    addCylinder(x, z, r, yBottom, yTop, tag = null) {
        const c = { kind: 'cyl', x, z, r, yb: yBottom, yt: yTop, tag,
            minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r };
        this.colliders.push(c);
        return c;
    }

    addBox(minX, yb, minZ, maxX, yt, maxZ, tag = null) {
        const c = { kind: 'box', x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, r: 0,
            minX, maxX, minZ, maxZ, yb, yt, tag };
        this.colliders.push(c);
        return c;
    }

    // Does a circle (x, z, r) on the ground plane overlap this collider's footprint?
    static overlaps(c, x, z, r) {
        if (c.kind === 'cyl') {
            const dx = x - c.x, dz = z - c.z, rr = c.r + r;
            return dx * dx + dz * dz < rr * rr;
        }
        const cx = x < c.minX ? c.minX : (x > c.maxX ? c.maxX : x);
        const cz = z < c.minZ ? c.minZ : (z > c.maxZ ? c.maxZ : z);
        const dx = x - cx, dz = z - cz;
        return dx * dx + dz * dz < r * r;
    }

    // Highest walkable top under a circle, no higher than maxY. -Infinity over the void.
    groundAt(x, z, r, maxY) {
        let best = -Infinity;
        const cs = this.colliders;
        for (let i = 0; i < cs.length; i++) {
            const c = cs[i];
            if (c.yt > maxY || c.yt <= best) continue;
            if (PhysicsWorld.overlaps(c, x, z, r)) best = c.yt;
        }
        return best;
    }

    // Lowest ceiling above minY (for bumping your head)
    ceilingAt(x, z, r, minY) {
        let best = Infinity;
        const cs = this.colliders;
        for (let i = 0; i < cs.length; i++) {
            const c = cs[i];
            if (c.yb < minY || c.yb >= best) continue;
            if (PhysicsWorld.overlaps(c, x, z, r)) best = c.yb;
        }
        return best;
    }

    // Moves a body { pos, vel, onGround, radius, height } through one step.
    // Returns true if it hit a wall this step (bots use it to know they're stuck).
    move(body, dt) {
        const p = body.pos, v = body.vel;
        const r = body.radius, h = body.height;
        const wasGround = body.onGround;
        let hitWall = false;

        // --- horizontal ---
        p.x += v.x * dt;
        p.z += v.z * dt;
        const cs = this.colliders;
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < cs.length; i++) {
                const c = cs[i];
                if (c.yt <= p.y + 0.01 || c.yb >= p.y + h) continue;   // not at our height
                if (!PhysicsWorld.overlaps(c, p.x, p.z, r)) continue;
                // A low ledge: step up onto it instead of stopping
                if (c.yt - p.y <= PHYS.stepUp && wasGround && this.ceilingAt(p.x, p.z, r, c.yt) > c.yt + h) {
                    p.y = c.yt;
                    continue;
                }
                hitWall = true;
                this.pushOut(c, p, r, v);
            }
        }

        // --- vertical ---
        const oldY = p.y;
        p.y += v.y * dt;
        body.onGround = false;
        if (v.y <= 0) {
            const g = this.groundAt(p.x, p.z, r * 0.62, oldY + 0.06);
            if (p.y <= g) {
                p.y = g;
                v.y = 0;
                body.onGround = true;
            } else if (wasGround && oldY - g < 0.3 && v.y > -6) {
                // Walking down a small step or slope: stay glued to the floor
                p.y = g;
                v.y = 0;
                body.onGround = true;
            }
        } else {
            const ceil = this.ceilingAt(p.x, p.z, r * 0.8, oldY + h - 0.05);
            if (p.y + h > ceil) {
                p.y = ceil - h;
                v.y = 0;
            }
        }
        return hitWall;
    }

    pushOut(c, p, r, v) {
        if (c.kind === 'cyl') {
            let dx = p.x - c.x, dz = p.z - c.z;
            let d = Math.sqrt(dx * dx + dz * dz);
            if (d < 1e-5) { dx = 1; dz = 0; d = 1; }
            const nx = dx / d, nz = dz / d;
            const target = c.r + r + 0.001;
            p.x = c.x + nx * target;
            p.z = c.z + nz * target;
            const vn = v.x * nx + v.z * nz;
            if (vn < 0) { v.x -= vn * nx; v.z -= vn * nz; }
            return;
        }
        // Box: push out along the closest side
        const cx = p.x < c.minX ? c.minX : (p.x > c.maxX ? c.maxX : p.x);
        const cz = p.z < c.minZ ? c.minZ : (p.z > c.maxZ ? c.maxZ : p.z);
        let dx = p.x - cx, dz = p.z - cz;
        let d = Math.sqrt(dx * dx + dz * dz);
        let nx, nz;
        if (d > 1e-5) {
            nx = dx / d; nz = dz / d;
            p.x = cx + nx * (r + 0.001);
            p.z = cz + nz * (r + 0.001);
        } else {
            // Centre is inside the box: leave by the nearest face
            const l = p.x - c.minX, rr = c.maxX - p.x, b = p.z - c.minZ, f = c.maxZ - p.z;
            const m = Math.min(l, rr, b, f);
            if (m === l) { nx = -1; nz = 0; p.x = c.minX - r; }
            else if (m === rr) { nx = 1; nz = 0; p.x = c.maxX + r; }
            else if (m === b) { nx = 0; nz = -1; p.z = c.minZ - r; }
            else { nx = 0; nz = 1; p.z = c.maxZ + r; }
        }
        const vn = v.x * nx + v.z * nz;
        if (vn < 0) { v.x -= vn * nx; v.z -= vn * nz; }
    }

    // Distance along a ray (unit dir) to the first collider, or maxDist
    raycast(ox, oy, oz, dx, dy, dz, maxDist) {
        let best = maxDist;
        const cs = this.colliders;
        for (let i = 0; i < cs.length; i++) {
            const c = cs[i];
            const t = c.kind === 'box'
                ? rayBox(ox, oy, oz, dx, dy, dz, c.minX, c.yb, c.minZ, c.maxX, c.yt, c.maxZ)
                : rayCyl(ox, oy, oz, dx, dy, dz, c);
            if (t >= 0 && t < best) best = t;
        }
        return best;
    }

    // Is there a clear line between two points?
    lineClear(ax, ay, az, bx, by, bz) {
        const dx = bx - ax, dy = by - ay, dz = bz - az;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 1e-4) return true;
        return this.raycast(ax, ay, az, dx / len, dy / len, dz / len, len) >= len - 0.05;
    }
}

function rayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
    let tmin = -Infinity, tmax = Infinity;
    if (Math.abs(dx) < 1e-9) { if (ox < x0 || ox > x1) return -1; }
    else { let a = (x0 - ox) / dx, b = (x1 - ox) / dx; if (a > b) { const t = a; a = b; b = t; } tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); }
    if (Math.abs(dy) < 1e-9) { if (oy < y0 || oy > y1) return -1; }
    else { let a = (y0 - oy) / dy, b = (y1 - oy) / dy; if (a > b) { const t = a; a = b; b = t; } tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); }
    if (Math.abs(dz) < 1e-9) { if (oz < z0 || oz > z1) return -1; }
    else { let a = (z0 - oz) / dz, b = (z1 - oz) / dz; if (a > b) { const t = a; a = b; b = t; } tmin = Math.max(tmin, a); tmax = Math.min(tmax, b); }
    if (tmax < Math.max(tmin, 0)) return -1;
    return tmin >= 0 ? tmin : 0;
}

function rayCyl(ox, oy, oz, dx, dy, dz, c) {
    const fx = ox - c.x, fz = oz - c.z;
    // Inside already?
    if (fx * fx + fz * fz <= c.r * c.r && oy >= c.yb && oy <= c.yt) return 0;
    let best = -1;
    const a = dx * dx + dz * dz;
    if (a > 1e-9) {
        const b = 2 * (fx * dx + fz * dz);
        const cc = fx * fx + fz * fz - c.r * c.r;
        const disc = b * b - 4 * a * cc;
        if (disc >= 0) {
            const t = (-b - Math.sqrt(disc)) / (2 * a);
            if (t >= 0) {
                const y = oy + dy * t;
                if (y >= c.yb && y <= c.yt) best = t;
            }
        }
    }
    // Top and bottom caps
    if (Math.abs(dy) > 1e-9) {
        for (let k = 0; k < 2; k++) {
            const capY = k === 0 ? c.yt : c.yb;
            const t = (capY - oy) / dy;
            if (t >= 0 && (best < 0 || t < best)) {
                const x = fx + dx * t, z = fz + dz * t;
                if (x * x + z * z <= c.r * c.r) best = t;
            }
        }
    }
    return best;
}
