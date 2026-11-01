// ==========================================
// Arena: the Floating Sky Pillar Arena.
// A round stone colosseum in the middle with a ring of pillars for cover,
// four floating monoliths to slam down from, a wind geyser in the centre,
// and four tiered islands joined to the colosseum by jump pads.
// Everything static is merged into a few meshes; the colliders live in
// PhysicsWorld.
// ==========================================

import * as THREE from 'three';
import { PhysicsWorld } from './physics.js';
import { PHYS } from './config.js';
import { GeoBatch, vertexToon, rockCone, glowTexture } from './gfx.js';

export const CENTER_R = 24;
export const PILLAR_RING = 17;
export const ISLAND_DIST = 40;
export const ISLAND_R = 8.5;
const ISLAND_H = [2, 6, 2, 9];
const MONO_R = 10.5;
const MONO_HALF = 1.7;
const MONO_BOTTOM = 8.6, MONO_TOP = 11.6;
export const GEYSER_R = 1.9;
export const GEYSER_VEL = 29.5;

// Island angles (radians), distances and heights for each layout
export const LAYOUTS = {
    colosseum: { name: 'Sky Colosseum', centerR: 24, angles: [0, Math.PI / 2, Math.PI, Math.PI * 1.5], dist: [40, 40, 40, 40], heights: [2, 6, 2, 9] },
    ruins:     { name: 'Sky Ruins',     centerR: 21, angles: [Math.PI / 4, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75], dist: [37, 41, 37, 41], heights: [3, 8, 3, 1] }
};

const PAL = {
    stone: 0xd9d2c3, stoneDark: 0xa99f8e, tileA: 0xcfc7b4, tileB: 0xbdb39d, gold: 0xf2c14e,
    rock: 0x8a7a6a, rockDark: 0x6b5d52, grass: 0x7fcf5a, grassDark: 0x5fae45, dirt: 0x9c6b45,
    obsidian: 0x3b3552, trunk: 0x8a5a3b, leaf: 0x5cc25a, leaf2: 0x8ee06a, cloud: 0xffffff
};

export class Arena {
    constructor(scene, quality, layout = 'colosseum') {
        this.scene = scene;
        this.layout = layout;
        this.name = LAYOUTS[layout].name;
        this.centerR = LAYOUTS[layout].centerR;
        this.daisH = layout === 'ruins' ? 2.0 : 0;
        this.physics = new PhysicsWorld();
        this.group = new THREE.Group();
        this.pads = [];        // { x, y, z, r, vx, vy, vz, to, glow }
        this.geyser = { x: 0, z: 0, r: GEYSER_R, y: layout === 'ruins' ? 2.0 : 0 };
        this.spawns = [];      // { x, y, z, yaw } one per island, facing the centre
        this.islands = [];     // { x, z, y, r }
        this.time = 0;
        this.build(quality);
        scene.add(this.group);
    }

    build(quality) {
        const ph = this.physics;
        const solid = new GeoBatch();
        const glow = new GeoBatch();

        if (this.layout === 'ruins') this.buildRuins(solid, glow);
        else this.buildColosseum(solid, glow);

        // ---------- islands ----------
        const L = LAYOUTS[this.layout];
        for (let i = 0; i < 4; i++) {
            const a = L.angles[i];
            const DIST = L.dist[i];
            const cx = Math.cos(a) * DIST, cz = Math.sin(a) * DIST;
            const y = L.heights[i];
            this.islands.push({ x: cx, z: cz, y, r: ISLAND_R });
            ph.addCylinder(cx, cz, ISLAND_R, y - 4, y, 'island');
            solid.addAt(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R * 0.97, 0.7, 14, 1), cx, y - 0.35, cz, PAL.grass, 0.08, i);
            solid.addAt(new THREE.CylinderGeometry(ISLAND_R * 0.97, ISLAND_R * 0.9, 1.2, 14, 1), cx, y - 1.3, cz, PAL.dirt, 0.1, i);
            solid.addAt(rockCone(ISLAND_R * 0.9, 9 + i, 11, i + 21), cx, y - 1.9, cz, PAL.rock, 0.14, i);
            // upper tier, set toward the outside
            const ux = Math.cos(a) * (DIST + 3.2), uz = Math.sin(a) * (DIST + 3.2);
            ph.addCylinder(ux, uz, 3.4, y, y + 3, 'tier');
            solid.addAt(new THREE.CylinderGeometry(3.4, 3.5, 3, 10, 1), ux, y + 1.5, uz, PAL.rock, 0.12, i * 2);
            solid.addAt(new THREE.CylinderGeometry(3.42, 3.42, 0.3, 10, 1), ux, y + 2.9, uz, PAL.grassDark, 0.08, i * 2);
            // stepping block up to the tier
            const sx = Math.cos(a + 0.42) * (DIST + 0.8), sz = Math.sin(a + 0.42) * (DIST + 0.8);
            ph.addBox(sx - 0.8, y, sz - 0.8, sx + 0.8, y + 1.5, sz + 0.8, 'step');
            solid.addAt(new THREE.BoxGeometry(1.6, 1.5, 1.6), sx, y + 0.75, sz, PAL.stoneDark, 0.1);
            // a tree on the tier and crystals on the island
            this.addTree(solid, ux + Math.cos(a + 1.6) * 1.2, y + 3, uz + Math.sin(a + 1.6) * 1.2, i);
            for (let k = 0; k < 3; k++) {
                const ka = a + 2.1 + k * 0.5;
                const kx = cx + Math.cos(ka) * 6.3, kz = cz + Math.sin(ka) * 6.3;
                glow.addAt(new THREE.OctahedronGeometry(0.45 + k * 0.12, 0), kx, y + 0.5 + k * 0.1, kz, k === 1 ? 0x7af0ff : 0x9fd8ff, 0, ka, 0.7, 1.8, 0.7);
            }
            // spawn point faces the centre
            const spx = Math.cos(a) * (DIST - 2), spz = Math.sin(a) * (DIST - 2);
            this.spawns.push({ x: spx, y, z: spz, yaw: Math.atan2(spx, spz) }); // forward (-sin, -cos) points at the centre
        }

        // ---------- jump pads ----------
        for (let i = 0; i < 4; i++) {
            const a = L.angles[i];
            const isl = this.islands[i];
            // centre -> island
            const px = Math.cos(a) * (this.centerR - 2.6), pz = Math.sin(a) * (this.centerR - 2.6);
            this.addPad(solid, glow, px, 0, pz, isl.x - Math.cos(a) * 2.5, isl.y, isl.z - Math.sin(a) * 2.5, i + 1);
            // island -> centre
            const qx = isl.x - Math.cos(a) * (ISLAND_R - 1.6), qz = isl.z - Math.sin(a) * (ISLAND_R - 1.6);
            this.addPad(solid, glow, qx, isl.y, qz, Math.cos(a) * 10, 0, Math.sin(a) * 10, 0);
        }

        // ---------- background: distant islands ----------
        for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2 + 0.3;
            const d = 120 + (i % 3) * 35;
            const x = Math.cos(a) * d, z = Math.sin(a) * d, y = -10 + (i % 4) * 9;
            const r = 9 + (i % 3) * 5;
            solid.addAt(new THREE.CylinderGeometry(r, r * 0.95, 1.4, 10, 1), x, y, z, PAL.grass, 0.1, i);
            solid.addAt(rockCone(r * 0.95, r * 1.4, 9, i + 40), x, y - 0.7, z, PAL.rock, 0.14, i);
            if (i % 2 === 0) this.addTree(solid, x + 2, y + 0.7, z - 1, i, 2.2);
        }
        // floating rubble near the arena
        for (let i = 0; i < 26; i++) {
            const a = i * 2.4;
            const d = 28 + (i * 7.3) % 40;
            const y = -14 + ((i * 5.1) % 30);
            if (d < 33 && y > -3) continue;
            solid.addAt(new THREE.DodecahedronGeometry(0.6 + (i % 4) * 0.45, 0), Math.cos(a) * d, y, Math.sin(a) * d, i % 2 ? PAL.rock : PAL.rockDark, 0.15, a, 1, 0.7, 1);
        }

        const solidMesh = new THREE.Mesh(solid.build(), vertexToon());
        solidMesh.receiveShadow = true;
        solidMesh.castShadow = quality !== 'low';
        solidMesh.matrixAutoUpdate = false;
        this.group.add(solidMesh);

        const glowMesh = new THREE.Mesh(glow.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
        glowMesh.matrixAutoUpdate = false;
        this.group.add(glowMesh);

        this.buildGeyserFX();
        this.buildSky();
        this.buildClouds();
        this.buildDust(quality === 'low' ? 120 : 320);
    }

    // Layout 1: the round colosseum with a ring of pillars and four monoliths
    buildColosseum(solid, glow) {
        const ph = this.physics;
        // ---------- centre colosseum ----------
        ph.addCylinder(0, 0, CENTER_R, -6, 0, 'center');
        solid.addAt(new THREE.CylinderGeometry(CENTER_R, CENTER_R, 1.2, 48, 1), 0, -0.6, 0, PAL.stone, 0.04);
        solid.addAt(rockCone(CENTER_R * 0.98, 16, 14, 3), 0, -1.2, 0, PAL.rock, 0.12);
        solid.addAt(rockCone(CENTER_R * 0.55, 26, 9, 7), 0, -4, 0, PAL.rockDark, 0.12);
        // floor rings (a hair above the floor so they don't flicker)
        const ring = (r0, r1, y, color, seg = 48) => {
            const g = new THREE.RingGeometry(r0, r1, seg, 1);
            g.rotateX(-Math.PI / 2);
            solid.addAt(g, 0, y, 0, color, 0.03);
        };
        ring(GEYSER_R + 0.2, 6.5, 0.012, PAL.tileB);
        ring(6.5, 7.0, 0.014, PAL.gold, 40);
        ring(7.0, 13.6, 0.012, PAL.tileA);
        ring(13.6, 14.1, 0.014, PAL.gold, 48);
        ring(14.1, CENTER_R - 0.7, 0.012, PAL.tileB);
        ring(CENTER_R - 0.7, CENTER_R, 0.016, PAL.stoneDark, 48);
        // radial tile seams
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const g = new THREE.BoxGeometry(0.12, 0.02, 9.5);
            solid.addAt(g, Math.cos(a) * 18.9, 0.02, Math.sin(a) * 18.9, PAL.stoneDark, 0, -a + Math.PI / 2);
        }
        // a low decorative curb around the edge (no collider: you can still be knocked off)
        for (let i = 0; i < 36; i++) {
            if (i % 9 === 0) continue; // gaps where the jump pads are
            const a = ((i + 0.5) / 36) * Math.PI * 2;
            solid.addAt(new THREE.BoxGeometry(3.6, 0.35, 0.55), Math.cos(a) * (CENTER_R - 0.35), 0.17, Math.sin(a) * (CENTER_R - 0.35), PAL.stoneDark, 0.06, -a + Math.PI / 2);
        }

        // ---------- pillar ring: tall columns and broken stumps ----------
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
            const x = Math.cos(a) * PILLAR_RING, z = Math.sin(a) * PILLAR_RING;
            const tall = i % 2 === 0;
            const h = tall ? 8 : 3.4;
            const r = tall ? 1.05 : 1.15;
            ph.addCylinder(x, z, r, 0, h, 'pillar');
            solid.addAt(new THREE.BoxGeometry(r * 2.5, 0.5, r * 2.5), x, 0.25, z, PAL.stoneDark, 0.05, a);
            solid.addAt(new THREE.CylinderGeometry(r, r * 1.08, h - 0.8, 8, 1), x, 0.5 + (h - 0.8) / 2, z, PAL.stone, 0.07, a);
            if (tall) {
                solid.addAt(new THREE.BoxGeometry(r * 2.6, 0.5, r * 2.6), x, h - 0.25, z, PAL.stoneDark, 0.05, a);
                glow.addAt(new THREE.BoxGeometry(r * 2.65, 0.08, r * 2.65), x, h - 0.6, z, 0x6fe7ff, 0, a);
            } else {
                // jagged broken top
                solid.addAt(new THREE.ConeGeometry(r * 0.9, 0.9, 5), x, h + 0.05, z, PAL.stone, 0.1, a * 3);
                solid.addAt(new THREE.DodecahedronGeometry(0.55, 0), x + Math.cos(a + 1.3) * 2.1, 0.35, z + Math.sin(a + 1.3) * 2.1, PAL.stoneDark, 0.1, a);
            }
        }

        // ---------- floating monoliths (high perches for big slams) ----------
        for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + i * Math.PI / 2;
            const x = Math.cos(a) * MONO_R, z = Math.sin(a) * MONO_R;
            ph.addBox(x - MONO_HALF, MONO_BOTTOM, z - MONO_HALF, x + MONO_HALF, MONO_TOP, z + MONO_HALF, 'monolith');
            const hgt = MONO_TOP - MONO_BOTTOM;
            solid.addAt(new THREE.BoxGeometry(MONO_HALF * 2, hgt, MONO_HALF * 2), x, MONO_BOTTOM + hgt / 2, z, PAL.obsidian, 0.08);
            solid.addAt(rockCone(MONO_HALF * 1.2, 2.6, 6, i + 11), x, MONO_BOTTOM, z, PAL.obsidian, 0.15);
            // glowing runes on each side and the rim
            for (let s = 0; s < 4; s++) {
                const sa = s * Math.PI / 2;
                const ox = Math.sin(sa) * (MONO_HALF + 0.01), oz = Math.cos(sa) * (MONO_HALF + 0.01);
                // a forked wind rune: a stem with two branches rising from its middle
                const cy = MONO_BOTTOM + hgt / 2;
                const sx = Math.cos(sa) * 0.32, sz = -Math.sin(sa) * 0.32; // sideways along this face
                glow.addAt(new THREE.BoxGeometry(0.2, 1.8, 0.03), x + ox, cy, z + oz, 0xb48cff, 0, sa);
                glow.addAt(new THREE.BoxGeometry(0.17, 0.95, 0.03), x + ox + sx, cy + 0.42, z + oz + sz, 0xb48cff, 0, sa, 1, 1, 1, 0, -0.6);
                glow.addAt(new THREE.BoxGeometry(0.17, 0.95, 0.03), x + ox - sx, cy + 0.42, z + oz - sz, 0xb48cff, 0, sa, 1, 1, 1, 0, 0.6);
            }
            glow.addAt(new THREE.BoxGeometry(MONO_HALF * 2 + 0.06, 0.1, MONO_HALF * 2 + 0.06), x, MONO_TOP - 0.15, z, 0xd2b8ff);
        }

        // ---------- centre wind geyser ----------
        solid.addAt(new THREE.CylinderGeometry(GEYSER_R + 0.35, GEYSER_R + 0.5, 0.25, 20), 0, 0.12, 0, PAL.stoneDark, 0.04);
        glow.addAt(new THREE.CylinderGeometry(GEYSER_R, GEYSER_R, 0.06, 20), 0, 0.26, 0, 0x8af3ff);
        for (let i = 0; i < 6; i++) {
            const g = new THREE.BoxGeometry(GEYSER_R * 2, 0.08, 0.16);
            solid.addAt(g, 0, 0.31, 0, PAL.stoneDark, 0, (i / 6) * Math.PI);
        }

    }

    // Layout 2: Sky Ruins - a raised dais with stairs and the geyser on top, stone arches,
    // broken stumps, and three high monoliths
    buildRuins(solid, glow) {
        const ph = this.physics;
        const R = this.centerR;
        ph.addCylinder(0, 0, R, -6, 0, 'center');
        solid.addAt(new THREE.CylinderGeometry(R, R, 1.2, 40, 1), 0, -0.6, 0, PAL.tileB, 0.05);
        solid.addAt(rockCone(R * 0.98, 15, 13, 5), 0, -1.2, 0, PAL.rock, 0.12);
        solid.addAt(rockCone(R * 0.5, 24, 9, 9), 0, -4, 0, PAL.rockDark, 0.12);
        // cracked flagstones
        for (let i = 0; i < 26; i++) {
            const a = i * 2.39, d = 8 + (i * 5.3) % 12;
            const g = new THREE.BoxGeometry(1.6 + (i % 3) * 0.5, 0.03, 1.2 + (i % 2) * 0.6);
            solid.addAt(g, Math.cos(a) * d, 0.015, Math.sin(a) * d, i % 2 ? PAL.tileA : PAL.stoneDark, 0.05, a);
        }
        const ring = (r0, r1, y, color, seg = 40) => {
            const g = new THREE.RingGeometry(r0, r1, seg, 1);
            g.rotateX(-Math.PI / 2);
            solid.addAt(g, 0, y, 0, color, 0.03);
        };
        ring(R - 0.8, R, 0.016, PAL.stoneDark);
        // the raised dais, with stairs on four sides
        const D = 6.5, H = this.daisH;
        ph.addCylinder(0, 0, D, 0, H, 'dais');
        solid.addAt(new THREE.CylinderGeometry(D, D + 0.3, H, 24, 1), 0, H / 2, 0, PAL.stone, 0.06);
        ring(GEYSER_R + 0.6, D - 0.4, H + 0.012, PAL.tileA, 24);
        ring(D - 0.4, D, H + 0.014, PAL.gold, 24);
        for (let i = 0; i < 4; i++) {
            const ax = Math.round(Math.cos(i * Math.PI / 2)), az = Math.round(Math.sin(i * Math.PI / 2));
            for (let k = 0; k < 3; k++) {
                const top = H * (k + 1) / 4;
                const d0 = D + 0.1 + (2 - k) * 0.95;      // outer edge of this step
                const cxs = ax * (d0 - 0.475), czs = az * (d0 - 0.475);
                const hw = 1.6;
                const minX = ax ? cxs - 0.5 : -hw, maxX = ax ? cxs + 0.5 : hw;
                const minZ = az ? czs - 0.5 : -hw, maxZ = az ? czs + 0.5 : hw;
                ph.addBox(minX, 0, minZ, maxX, top, maxZ, 'step');
                solid.addAt(new THREE.BoxGeometry(maxX - minX, top, maxZ - minZ), (minX + maxX) / 2, top / 2, (minZ + maxZ) / 2, k % 2 ? PAL.stone : PAL.stoneDark, 0.05);
            }
        }
        // stone arches over the four main paths (cover, and a high perch on the lintel)
        for (let i = 0; i < 4; i++) {
            const ax = Math.round(Math.cos(i * Math.PI / 2)), az = Math.round(Math.sin(i * Math.PI / 2));
            const cx = ax * 14, cz = az * 14;
            const tx = az, tz = ax; // along the arch
            for (const s2 of [-1, 1]) {
                const px = cx + tx * 2.4 * s2, pz = cz + tz * 2.4 * s2;
                ph.addBox(px - 0.6, 0, pz - 0.6, px + 0.6, 6, pz + 0.6, 'arch');
                solid.addAt(new THREE.BoxGeometry(1.2, 6, 1.2), px, 3, pz, PAL.stone, 0.07);
                solid.addAt(new THREE.BoxGeometry(1.6, 0.4, 1.6), px, 0.2, pz, PAL.stoneDark, 0.05);
            }
            const lx = tx ? 3.6 : 0.75, lz = tz ? 3.6 : 0.75;
            ph.addBox(cx - lx, 6, cz - lz, cx + lx, 7, cz + lz, 'lintel');
            solid.addAt(new THREE.BoxGeometry(lx * 2, 1, lz * 2), cx, 6.5, cz, PAL.stoneDark, 0.06);
            glow.addAt(new THREE.BoxGeometry(lx * 2 + 0.04, 0.1, lz * 2 + 0.04), cx, 6.3, cz, 0x6fe7ff);
        }
        // broken stumps on the diagonals, between the arches
        for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + i * Math.PI / 2 + 0.35;
            const x = Math.cos(a) * 13.5, z = Math.sin(a) * 13.5;
            const h = 2.2 + (i % 2) * 1.6;
            ph.addCylinder(x, z, 1.2, 0, h, 'pillar');
            solid.addAt(new THREE.CylinderGeometry(1.2, 1.3, h, 8, 1), x, h / 2, z, PAL.stone, 0.08, a);
            solid.addAt(new THREE.ConeGeometry(1.0, 0.8, 5), x, h + 0.1, z, PAL.stone, 0.1, a * 2);
        }
        // three high monoliths
        for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3 + Math.PI / 6;
            const x = Math.cos(a) * 9.5, z = Math.sin(a) * 9.5;
            const yb = 10, yt = 13.2, hw = 1.6;
            ph.addBox(x - hw, yb, z - hw, x + hw, yt, z + hw, 'monolith');
            solid.addAt(new THREE.BoxGeometry(hw * 2, yt - yb, hw * 2), x, (yb + yt) / 2, z, PAL.obsidian, 0.08);
            solid.addAt(rockCone(hw * 1.2, 2.8, 6, i + 31), x, yb, z, PAL.obsidian, 0.15);
            glow.addAt(new THREE.BoxGeometry(hw * 2 + 0.06, 0.1, hw * 2 + 0.06), x, yt - 0.15, z, 0xd2b8ff);
            for (let k = 0; k < 4; k++) {
                const sa = k * Math.PI / 2;
                const fx = x + Math.sin(sa) * (hw + 0.01), fz = z + Math.cos(sa) * (hw + 0.01), cy = (yb + yt) / 2;
                const tx = Math.cos(sa) * 0.3, tz = -Math.sin(sa) * 0.3;
                glow.addAt(new THREE.BoxGeometry(0.2, 1.7, 0.03), fx, cy, fz, 0xb48cff, 0, sa);
                glow.addAt(new THREE.BoxGeometry(0.16, 0.9, 0.03), fx + tx, cy + 0.4, fz + tz, 0xb48cff, 0, sa, 1, 1, 1, 0, -0.6);
                glow.addAt(new THREE.BoxGeometry(0.16, 0.9, 0.03), fx - tx, cy + 0.4, fz - tz, 0xb48cff, 0, sa, 1, 1, 1, 0, 0.6);
            }
        }
        // the geyser on top of the dais
        solid.addAt(new THREE.CylinderGeometry(GEYSER_R + 0.35, GEYSER_R + 0.5, 0.25, 20), 0, H + 0.12, 0, PAL.stoneDark, 0.04);
        glow.addAt(new THREE.CylinderGeometry(GEYSER_R, GEYSER_R, 0.06, 20), 0, H + 0.26, 0, 0x8af3ff);
    }

    addTree(batch, x, y, z, seed, s = 1) {
        batch.addAt(new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 2.2 * s, 6), x, y + 1.1 * s, z, PAL.trunk, 0.1, seed);
        batch.addAt(new THREE.IcosahedronGeometry(1.3 * s, 0), x, y + 2.6 * s, z, PAL.leaf, 0.14, seed);
        batch.addAt(new THREE.IcosahedronGeometry(0.9 * s, 0), x + 0.4 * s, y + 3.5 * s, z - 0.2 * s, PAL.leaf2, 0.14, seed * 2);
    }

    // A jump pad at (x, y, z) that throws you onto (tx, ty, tz) along a high arc
    addPad(solid, glow, x, y, z, tx, ty, tz, toZone) {
        const apex = Math.max(y, ty) + 7;
        const g = -PHYS.gravity;
        const vy = Math.sqrt(2 * g * (apex - y));
        const T = vy / g + Math.sqrt(2 * (apex - ty) / g);
        const dx = tx - x, dz = tz - z;
        this.physics.addCylinder(x, z, 1.25, y - 0.2, y + 0.18, 'pad');
        solid.addAt(new THREE.CylinderGeometry(1.35, 1.5, 0.2, 16), x, y + 0.08, z, 0x6b6f86, 0.04);
        glow.addAt(new THREE.CylinderGeometry(1.0, 1.0, 0.06, 16), x, y + 0.2, z, 0x6dffb0);
        // arrow pointing where the pad throws you
        const yaw = Math.atan2(dx, dz);
        const arrow = new THREE.ConeGeometry(0.42, 0.9, 3);
        arrow.rotateX(Math.PI / 2);
        glow.addAt(arrow, x + Math.sin(yaw) * 0.25, y + 0.26, z + Math.cos(yaw) * 0.25, 0xffffff, 0, yaw, 1, 0.12, 1);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x6dffb0, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
        sprite.position.set(x, y + 0.9, z);
        sprite.scale.set(3.2, 3.2, 1);
        this.group.add(sprite);
        this.pads.push({ x, y, z, r: 1.25, vx: dx / T, vy, vz: dz / T, to: toZone, glow: sprite, tx, ty, tz });
    }

    buildGeyserFX() {
        // A column of spinning wind streaks over the centre geyser
        const g = new THREE.CylinderGeometry(GEYSER_R * 0.9, GEYSER_R * 1.15, 13, 16, 1, true);
        g.translate(0, 6.5, 0);
        const tex = (() => {
            const c = document.createElement('canvas');
            c.width = 64; c.height = 128;
            const ctx = c.getContext('2d');
            ctx.clearRect(0, 0, 64, 128);
            for (let i = 0; i < 9; i++) {
                const x = (i * 23) % 64, y = (i * 41) % 128;
                const grd = ctx.createLinearGradient(0, y, 0, y + 50);
                grd.addColorStop(0, 'rgba(255,255,255,0)');
                grd.addColorStop(0.5, 'rgba(255,255,255,0.9)');
                grd.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = grd;
                ctx.fillRect(x, y, 3, 50);
                ctx.fillRect(x, y - 128, 3, 50);
            }
            const t = new THREE.CanvasTexture(c);
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            return t;
        })();
        tex.repeat.set(3, 1);
        this.geyserTex = tex;
        const m = new THREE.MeshBasicMaterial({ map: tex, color: 0xaef6ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        this.geyserMesh = new THREE.Mesh(g, m);
        this.geyserMesh.position.y = this.geyser.y;
        this.group.add(this.geyserMesh);
    }

    buildSky() {
        const g = new THREE.SphereGeometry(600, 24, 16);
        const m = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            fog: false,
            uniforms: {
                top: { value: new THREE.Color(0x2f7fe0) },
                mid: { value: new THREE.Color(0x8ecbff) },
                horizon: { value: new THREE.Color(0xffe2c4) },
                bottom: { value: new THREE.Color(0xc6dcf5) }
            },
            vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
            fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP;
                void main(){ float h = vP.y; vec3 c;
                  if (h > 0.0) { c = mix(horizon, mid, smoothstep(0.0, 0.25, h)); c = mix(c, top, smoothstep(0.25, 0.9, h)); }
                  else { c = mix(horizon, bottom, smoothstep(0.0, -0.3, h)); }
                  gl_FragColor = vec4(c, 1.0); }`
        });
        this.skyMat = m;
        this.sky = new THREE.Mesh(g, m);
        this.sky.renderOrder = -10;
        this.sky.frustumCulled = false;
        this.scene.add(this.sky);
        // a soft sun disc
        const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff1c9, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
        sun.position.set(-260, 210, -320);
        sun.scale.set(180, 180, 1);
        this.sky.add(sun);
        this.sunSprite = sun;
        // stars for night matches
        const n = 500, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, y = Math.random() * 0.9 + 0.08, r = Math.sqrt(1 - y * y);
            pos[i * 3] = Math.cos(a) * r * 550; pos[i * 3 + 1] = y * 550; pos[i * 3 + 2] = Math.sin(a) * r * 550;
        }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 }));
        this.stars.visible = false;
        this.sky.add(this.stars);
    }

    buildClouds() {
        // Puffy low-poly clouds: a sea of them below the arena and a few drifting above
        const puff = new THREE.IcosahedronGeometry(1, 1);
        const mat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: vertexToon().gradientMap, fog: true });
        const count = 150;
        const mesh = new THREE.InstancedMesh(puff, mat, count);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
        let idx = 0;
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const clusters = [];
        for (let i = 0; i < 26; i++) {
            const a = rnd() * Math.PI * 2;
            const below = i < 18;
            const d = below ? 30 + rnd() * 150 : 70 + rnd() * 120;
            clusters.push({ x: Math.cos(a) * d, y: below ? -38 - rnd() * 18 : 26 + rnd() * 30, z: Math.sin(a) * d, s: below ? 9 + rnd() * 8 : 5 + rnd() * 5 });
        }
        for (const c of clusters) {
            const n = 5 + Math.floor(rnd() * 2);
            for (let k = 0; k < n && idx < count; k++) {
                p.set(c.x + (rnd() - 0.5) * c.s * 2.4, c.y + (rnd() - 0.3) * c.s * 0.4, c.z + (rnd() - 0.5) * c.s * 1.6);
                const sc = c.s * (0.5 + rnd() * 0.6);
                s.set(sc * 1.3, sc * 0.7, sc);
                q.setFromEuler(new THREE.Euler(0, rnd() * 3, 0));
                m.compose(p, q, s);
                mesh.setMatrixAt(idx++, m);
            }
        }
        mesh.count = idx;
        mesh.instanceMatrix.needsUpdate = true;
        this.clouds = mesh;
        this.scene.add(mesh);
    }

    buildDust(n) {
        // Dust motes drifting in the light; all the motion is in the shader, so it costs no CPU
        const pos = new Float32Array(n * 3);
        const seedA = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 48;
            pos[i * 3] = Math.cos(a) * d;
            pos[i * 3 + 1] = Math.random() * 22 - 2;
            pos[i * 3 + 2] = Math.sin(a) * d;
            seedA[i] = Math.random() * 100;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('seed', new THREE.BufferAttribute(seedA, 1));
        const m = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
            uniforms: { time: { value: 0 }, map: { value: glowTexture() }, scale: { value: 300 } },
            vertexShader: `attribute float seed; uniform float time; uniform float scale; varying float vA;
                void main(){ vec3 p = position;
                  p.y = mod(p.y + time * 0.35 + seed, 24.0) - 2.0;
                  p.x += sin(time * 0.3 + seed) * 1.2; p.z += cos(time * 0.27 + seed * 1.3) * 1.2;
                  vec4 mv = modelViewMatrix * vec4(p, 1.0);
                  vA = 0.35 + 0.35 * sin(time * 1.3 + seed * 5.0);
                  gl_PointSize = scale * 0.09 / -mv.z; gl_Position = projectionMatrix * mv; }`,
            fragmentShader: `uniform sampler2D map; varying float vA;
                void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, 0.95, 0.8) * t.a * vA, 1.0); }`
        });
        this.dust = new THREE.Points(g, m);
        this.dust.frustumCulled = false;
        this.dustMat = m;
        this.scene.add(this.dust);
    }

    // Sky colours for each time of day: [top, mid, horizon, bottom, fog, hemi sky, hemi ground, sun colour, sun strength, hemi strength]
    static THEMES = {
        sunset: { top: 0x2f7fe0, mid: 0x8ecbff, horizon: 0xffe2c4, bottom: 0xc6dcf5, fog: 0xd6e8fb, fogFar: 320, hs: 0xe4f2ff, hg: 0x8f7f70, sun: 0xfff0d8, sunI: 2.4, hemiI: 1.25, stars: false, sunSprite: 0xfff1c9 },
        night:  { top: 0x070b24, mid: 0x1b2a5c, horizon: 0x5a4a8a, bottom: 0x141c3c, fog: 0x2a3060, fogFar: 260, hs: 0x8fa6ff, hg: 0x2a2440, sun: 0xb8c8ff, sunI: 1.5, hemiI: 0.9, stars: true, sunSprite: 0xdfe8ff },
        storm:  { top: 0x2b3240, mid: 0x4f5a6e, horizon: 0x8a94a6, bottom: 0x3a4250, fog: 0x7a8496, fogFar: 200, hs: 0xc8d2e6, hg: 0x5a5560, sun: 0xdde4f0, sunI: 1.4, hemiI: 1.1, stars: false, sunSprite: 0x9aa4b4 }
    };

    setTheme(name, scene, hemi, sun) {
        const t = Arena.THEMES[name] || Arena.THEMES.sunset;
        this.theme = name;
        const u = this.skyMat.uniforms;
        u.top.value.set(t.top); u.mid.value.set(t.mid); u.horizon.value.set(t.horizon); u.bottom.value.set(t.bottom);
        scene.fog.color.set(t.fog); scene.fog.far = t.fogFar;
        hemi.color.set(t.hs); hemi.groundColor.set(t.hg); hemi.intensity = t.hemiI;
        sun.color.set(t.sun); sun.intensity = t.sunI;
        this.baseHemi = t.hemiI;
        this.stars.visible = t.stars;
        this.sunSprite.material.color.set(t.sunSprite);
        this.flashT = 0;
        this.nextFlash = 4 + Math.random() * 6;
        this.hemi = hemi;
    }

    // Remove everything this arena added to the scene
    dispose() {
        for (const o of [this.group, this.sky, this.clouds, this.dust]) {
            if (!o) continue;
            this.scene.remove(o);
            o.traverse((n) => { if (n.geometry) n.geometry.dispose(); });
        }
    }

    setPointScale(heightPx) {
        if (this.dustMat) this.dustMat.uniforms.scale.value = heightPx;
    }

    update(dt) {
        this.time += dt;
        if (this.geyserTex) this.geyserTex.offset.y -= dt * 1.6;
        if (this.geyserMesh) this.geyserMesh.rotation.y += dt * 1.4;
        if (this.dustMat) this.dustMat.uniforms.time.value = this.time;
        if (this.clouds) this.clouds.rotation.y += dt * 0.004;
        // storm: distant lightning lights up the sky now and then
        if (this.theme === 'storm' && this.hemi) {
            this.nextFlash -= dt;
            if (this.nextFlash <= 0) { this.flashT = 0.35; this.nextFlash = 5 + Math.random() * 9; if (this.onThunder) this.onThunder(); }
            if (this.flashT > 0) {
                this.flashT -= dt;
                const k = this.flashT > 0.25 || (this.flashT > 0.08 && this.flashT < 0.14) ? 1 : 0;
                this.hemi.intensity = this.baseHemi + k * 2.2;
            } else this.hemi.intensity = this.baseHemi;
        }
        for (let i = 0; i < this.pads.length; i++) {
            const p = this.pads[i];
            const s = 2.8 + Math.sin(this.time * 4 + i) * 0.4;
            p.glow.scale.set(s, s, 1);
        }
    }

    // Which platform is under (x, z)? 0 = colosseum, 1-4 = islands, -1 = none
    zoneOf(x, z) {
        if (x * x + z * z < (this.centerR + 1) * (this.centerR + 1)) return 0;
        for (let i = 0; i < 4; i++) {
            const isl = this.islands[i];
            const dx = x - isl.x, dz = z - isl.z;
            if (dx * dx + dz * dz < (ISLAND_R + 4) * (ISLAND_R + 4)) return i + 1;
        }
        return -1;
    }

    // The pad that leaves zone `from` toward zone `to` (one hop through the centre)
    padFor(from, to) {
        for (const p of this.pads) {
            if (from === 0 && p.to === to) return p;
            if (from !== 0 && p.to === 0 && this.zoneOf(p.x, p.z) === from) return p;
        }
        return null;
    }

    monolithTops() {
        const out = [];
        for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + i * Math.PI / 2;
            out.push({ x: Math.cos(a) * MONO_R, y: MONO_TOP, z: Math.sin(a) * MONO_R });
        }
        return out;
    }
}
