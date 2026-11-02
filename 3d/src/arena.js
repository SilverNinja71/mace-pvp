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
import { GLTFLoader } from '../lib/three/addons/loaders/GLTFLoader.js';
import { worldMaterialQuality, GeoBatch, worldMaterial, glowMaterial, rockMass, rockCone, flutedColumn, chamferBox, glowTexture, softDiscTexture, puffTexture, cloudNoiseTexture, lateTexture, ASSETS } from './gfx.js';

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

// Island angles (radians), distances and heights for each layout (names are in i18n.js: map.<id>)
export const LAYOUTS = {
    colosseum: { centerR: 24, angles: [0, Math.PI / 2, Math.PI, Math.PI * 1.5], dist: [40, 40, 40, 40], heights: [2, 6, 2, 9] },
    spires:    { centerR: 18, angles: [0, Math.PI / 2, Math.PI, Math.PI * 1.5], dist: [34, 36, 34, 36], heights: [4, 1, 6, 2] },
    ruins:     { centerR: 21, angles: [Math.PI / 4, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75], dist: [37, 41, 37, 41], heights: [3, 8, 3, 1] }
};

// Tints multiply the photo textures, so 0xffffff means the stone's own colour
const PAL = {
    stone: 0xf3ead9, stoneDark: 0xb7aa96, tileA: 0xfff0d8, tileB: 0x7fb0c8, tileC: 0xf0a070, tileWarm: 0xe07a50, tileTeal: 0x58b8b0, gold: 0xc9962f, bronze: 0xb98a55,
    rock: 0xb5a999, rockDark: 0x7f756b, grass: 0xbfe08a, grassDark: 0x8dbb62, dirt: 0x9a6f4c,
    obsidian: 0x5a4a8c, trunk: 0x7a5236, leaf: 0x56b04f, leaf2: 0x86d05f
};
const GLOW = 2.6; // glowing parts are brighter than white so the bloom catches them
const R90 = Math.PI / 2;

// ---------- nature models (one file, shared by all arenas) ----------
const natureTime = { value: 0 };
let naturePromise = null;
function loadNature() {
    if (naturePromise) return naturePromise;
    naturePromise = new GLTFLoader().loadAsync(ASSETS + 'world/nature.glb').then((gltf) => {
        const Q = worldMaterialQuality();
        const low = Q === 'low';
        const mats = {};
        const make = (name) => {
            if (mats[name]) return mats[name];
            const leafy = /Leaves|Grass|Flowers|Pine/.test(name);
            const file = { Bark_NormalTree: 'n_bark', Leaves_NormalTree: 'n_leaves_tree', Leaves_Pine: 'n_leaves_pine', Leaves: 'n_leaves', Grass: 'n_grass', Flowers: 'n_flowers', Rocks: 'n_rocks' }[name] || 'n_rocks';
            const ext = leafy ? '.png' : '.jpg';
            const map = lateTexture(ASSETS + 'world/' + file + ext, { srgb: true, flipY: false, aniso: 2 });
            const opts = { map, side: leafy ? THREE.DoubleSide : THREE.FrontSide, alphaTest: leafy ? 0.4 : 0 };
            const m = low ? new THREE.MeshLambertMaterial(opts) : new THREE.MeshStandardMaterial({ ...opts, roughness: leafy ? 0.75 : 0.95, envMapIntensity: 0.7 });
            m.userData.shared = true;
            if (leafy && !low) {
                // grass and leaves move a little in the wind
                m.onBeforeCompile = (s) => {
                    s.uniforms.uWind = natureTime;
                    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;')
                        .replace('#include <begin_vertex>', `#include <begin_vertex>
                        #ifdef USE_INSTANCING
                        { float ph = instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.9; float k = position.y * 0.03;
                          transformed.x += sin(uWind * 1.7 + ph) * k; transformed.z += cos(uWind * 1.3 + ph) * k * 0.7; }
                        #endif`);
                };
                m.customProgramCacheKey = () => 'wind1';
            }
            mats[name] = m;
            return m;
        };
        const species = {};
        gltf.scene.traverse((o) => {
            if (!o.isMesh) return;
            const nm = o.parent && o.parent !== gltf.scene && o.parent.name ? o.parent.name : o.name.replace(/_\d+$/, '');
            (species[nm] = species[nm] || []).push({ geometry: o.geometry, material: make(o.material.name) });
        });
        return { species };
    }).catch((e) => { console.warn('nature models failed, keeping simple trees', e && e.message); return null; });
    return naturePromise;
}

function addGlow(batch, geometry, x, y, z, color, k = GLOW, rotY = 0, sx = 1, sy = 1, sz = 1, rotX = 0, rotZ = 0) {
    batch.addAt(geometry, x, y, z, color, 0, rotY, sx, sy, sz, rotX, rotZ, { bright: k, facet: geometry.type === 'OctahedronGeometry' ? 0.62 : 0 });
}

export class Arena {
    static skyListeners = new Set();

    constructor(scene, quality, layout = 'colosseum', renderer = null) {
        this.scene = scene;
        this.renderer = renderer;
        this.layout = layout;
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
        // when a sky photo finishes downloading, use it and re-light from it
        this.skyListener = () => { if (this.theme) { this.useSkyImage(this.theme); this.refreshEnv(); } };
        Arena.skyListeners.add(this.skyListener);
    }

    build(quality) {
        const ph = this.physics;
        this.quality = quality;
        // one batch per material, in tile repeats per metre
        const W = this.world = {
            tile: new GeoBatch(0.9), pave: new GeoBatch(0.95), flag: new GeoBatch(0.5), block: new GeoBatch(0.34), wall: new GeoBatch(0.42),
            rock: new GeoBatch(0.13), grass: new GeoBatch(0.22), slate: new GeoBatch(0.4), gold: new GeoBatch(1), bronze: new GeoBatch(1), plain: new GeoBatch(1)
        };
        const glow = new GeoBatch(1);
        this.glowB = glow;
        this.contacts = [];    // soft dark discs on the ground: x, y, z, radius, darkness

        if (this.layout === 'ruins') this.buildRuins(W, glow);
        else if (this.layout === 'spires') this.buildSpires(W, glow);
        else this.buildColosseum(W, glow);

        // ---------- islands ----------
        const L = LAYOUTS[this.layout];
        for (let i = 0; i < 4; i++) {
            const a = L.angles[i];
            const DIST = L.dist[i];
            const cx = Math.cos(a) * DIST, cz = Math.sin(a) * DIST;
            const y = L.heights[i];
            this.islands.push({ x: cx, z: cz, y, r: ISLAND_R });
            ph.addCylinder(cx, cz, ISLAND_R, y - 4, y, 'island');
            // turf, a band of earth, then the rock mass below
            W.grass.addAt(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R * 0.985, 0.55, 40, 1), cx, y - 0.275, cz, PAL.grass, 0.06, i);
            W.rock.addAt(new THREE.CylinderGeometry(ISLAND_R * 0.985, ISLAND_R * 0.9, 1.3, 40, 1), cx, y - 1.2, cz, PAL.dirt, 0.08, i, 1, 1, 1, 0, 0, { scale: 2.2, ao: { y0: y - 1.85, h: 0, top: y - 0.5, hTop: 0.6, min: 0.55 } });
            W.rock.addAt(rockMass(ISLAND_R * 0.91, 10 + i * 1.2, 24, i + 21), cx, y - 1.85, cz, PAL.rock, 0.08, i, 1, 1, 1, 0, 0, { ao: { y0: 0, h: 0, top: y - 1.85, hTop: 2.2, min: 0.5 } });
            // upper tier, set toward the outside
            const ux = Math.cos(a) * (DIST + 3.2), uz = Math.sin(a) * (DIST + 3.2);
            ph.addCylinder(ux, uz, 3.4, y, y + 3, 'tier');
            W.rock.addAt(new THREE.CylinderGeometry(3.38, 3.5, 3, 22, 3), ux, y + 1.5, uz, PAL.rock, 0.08, i * 2, 1, 1, 1, 0, 0, { scale: 1.6, ao: { y0: y, h: 1.2, min: 0.55 } });
            W.grass.addAt(new THREE.CylinderGeometry(3.42, 3.42, 0.3, 22, 1), ux, y + 2.9, uz, PAL.grassDark, 0.06, i * 2);
            this.contacts.push([ux, y + 0.015, uz, 4.6, 0.55]);
            // stepping block up to the tier
            const sx = Math.cos(a + 0.42) * (DIST + 0.8), sz = Math.sin(a + 0.42) * (DIST + 0.8);
            ph.addBox(sx - 0.8, y, sz - 0.8, sx + 0.8, y + 1.5, sz + 0.8, 'step');
            W.wall.addAt(chamferBox(1.6, 1.5, 1.6, 0.09), sx, y + 0.75, sz, PAL.stoneDark, 0.08, 0, 1, 1, 1, 0, 0, { ao: { y0: y, h: 0.7, min: 0.6 } });
            // (it floats off the island's edge, so it needs a root of its own)
            W.rock.addAt(rockMass(1.0, 1.7, 10, i + 61), sx, y + 0.02, sz, PAL.rock, 0.06, i, 1, 1, 1, 0, 0, { scale: 3 });
            // a tree on the tier and crystals on the island
            this.addTree(ux + Math.cos(a + 1.6) * 1.2, y + 3, uz + Math.sin(a + 1.6) * 1.2, i);
            for (let k = 0; k < 3; k++) {
                const ka = a + 1.05 + k * 0.5; // (well to the side of the jump pad)
                const kx = cx + Math.cos(ka) * 6.3, kz = cz + Math.sin(ka) * 6.3;
                addGlow(glow, new THREE.OctahedronGeometry(0.45 + k * 0.12, 1), kx, y + 0.5 + k * 0.1, kz, k === 1 ? 0x46d8f0 : 0x6cb4f0, 1.25, ka, 0.7, 1.8, 0.7);
                W.rock.addAt(new THREE.DodecahedronGeometry(0.55 + k * 0.1, 0), kx, y + 0.05, kz, PAL.rockDark, 0.1, ka, 1.1, 0.55, 1.1);
                this.contacts.push([kx, y + 0.016, kz, 1.25, 0.5]);
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
            this.addPad(W, glow, px, 0, pz, isl.x - Math.cos(a) * 2.5, isl.y, isl.z - Math.sin(a) * 2.5, i + 1);
            // island -> centre
            const qx = isl.x - Math.cos(a) * (ISLAND_R - 1.6), qz = isl.z - Math.sin(a) * (ISLAND_R - 1.6);
            this.addPad(W, glow, qx, isl.y, qz, Math.cos(a) * 10, 0, Math.sin(a) * 10, 0);
        }

        // ---------- background: distant islands ----------
        for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2 + 0.3;
            const d = 120 + (i % 3) * 35;
            const x = Math.cos(a) * d, z = Math.sin(a) * d, y = -10 + (i % 4) * 9;
            const r = 9 + (i % 3) * 5;
            W.grass.addAt(new THREE.CylinderGeometry(r, r * 0.95, 1.4, 16, 1), x, y, z, PAL.grass, 0.1, i);
            W.rock.addAt(rockMass(r * 0.95, r * 1.5, 14, i + 40), x, y - 0.7, z, PAL.rock, 0.1, i);
            if (i % 2 === 0) this.addTree(x + 2, y + 0.7, z - 1, i, 2.2);
        }
        // floating rubble near the arena
        for (let i = 0; i < 26; i++) {
            const a = i * 2.4;
            const d = 28 + (i * 7.3) % 40;
            const y = -14 + ((i * 5.1) % 30);
            if (d < 33 && y > -3) continue;
            W.rock.addAt(new THREE.DodecahedronGeometry(0.6 + (i % 4) * 0.45, 1), Math.cos(a) * d, y, Math.sin(a) * d, i % 2 ? PAL.rock : PAL.rockDark, 0.12, a, 1, 0.7, 1);
        }

        // ---------- turn the batches into meshes ----------
        const castsShadow = { block: true, wall: true, slate: true, gold: false, bronze: false, tile: false, pave: false, flag: true, rock: false, grass: false, plain: true };
        this.solidMeshes = [];
        for (const k in W) {
            if (!W[k].count) continue;
            const mesh = new THREE.Mesh(W[k].build(), worldMaterial(k, quality));
            mesh.receiveShadow = quality !== 'low';
            mesh.castShadow = quality !== 'low' && castsShadow[k];
            mesh.matrixAutoUpdate = false;
            this.group.add(mesh);
            this.solidMeshes.push(mesh);
        }
        // the rock and turf only need to shade what is under them, not each other
        const glowMesh = new THREE.Mesh(glow.build(), glowMaterial());
        glowMesh.matrixAutoUpdate = false;
        this.group.add(glowMesh);

        // the stand-in trees are the 'plain' batch; real trees replace them when the nature models arrive
        this.codeTrees = this.solidMeshes.find((m) => m.material === worldMaterial('plain', quality));
        loadNature().then((N) => { if (!this.disposed && N) this.plantNature(N); }).catch((e) => console.warn('nature models', e && e.message));

        this.buildContacts();
        this.buildGeyserFX();
        this.buildSky();
        this.buildClouds();
        this.buildDust(quality === 'low' ? 120 : 320);
    }

    // Trees, bushes, grass and flowers from the nature models. Purely decoration: nothing here collides.
    plantNature(N) {
        const low = this.quality === 'low';
        let seed = 77;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const spots = {};                // species -> [matrix...]
        const put = (name, x, y, z, s, yaw = rnd() * 6.28) => {
            (spots[name] = spots[name] || []).push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(s, s * (0.9 + rnd() * 0.25), s)));
        };
        const trees = ['CommonTree_1', 'CommonTree_2', 'Pine_1'];
        (this.treeSpots || []).forEach((t, i) => {
            const big = t.s > 1;
            if (big && low) return; // far away, and the most expensive thing on Low
            put(trees[i % trees.length], t.x, t.y - 0.05, t.z, (big ? 0.95 : 0.46) * (0.9 + rnd() * 0.25));
            if (!big) { put('Bush_Common_Flowers', t.x + 1.4, t.y, t.z + 0.6, 0.42); put('Fern_1', t.x - 1.1, t.y, t.z + 0.9, 0.5); }
        });
        if (!low) {
            for (const isl of this.islands) {
                const R = ISLAND_R - 0.6;
                const scatter = (name, n, size) => {
                    for (let i = 0; i < n; i++) {
                        const a = rnd() * 6.28, d = Math.sqrt(rnd()) * R;
                        put(name, isl.x + Math.cos(a) * d, isl.y - 0.02, isl.z + Math.sin(a) * d, size * (0.7 + rnd() * 0.6));
                    }
                };
                const dense = this.quality === 'high' ? 1 : 0.5;
                scatter('Grass_Common_Tall', Math.round(26 * dense), 0.42);
                scatter('Grass_Common_Short', Math.round(60 * dense), 0.5);
                scatter('Flower_3_Group', 7, 0.3);
                scatter('Flower_4_Group', 7, 0.3);
                scatter('Rock_Medium_1', 3, 0.34);
                scatter('Rock_Medium_2', 2, 0.26);
                scatter('Fern_1', 5, 0.55);
            }
        }
        for (const name in spots) {
            const proto = N.species[name];
            if (!proto) continue;
            for (const part of proto) {
                const mesh = new THREE.InstancedMesh(part.geometry, part.material, spots[name].length);
                spots[name].forEach((m, i) => mesh.setMatrixAt(i, m));
                mesh.instanceMatrix.needsUpdate = true;
                mesh.computeBoundingSphere();
                mesh.frustumCulled = true;
                mesh.castShadow = !low && (name.includes('Tree') || name.includes('Pine') || name.includes('Bush'));
                mesh.receiveShadow = !low;
                mesh.userData.natureShared = true;
                this.group.add(mesh);
            }
        }
        if (this.codeTrees) this.codeTrees.visible = false;
        if (this.onPlanted) this.onPlanted();
    }

    // Soft dark discs where things meet the ground: fake ambient occlusion, cheap on every device
    buildContacts() {
        const n = this.contacts.length;
        if (!n) return;
        const g = new THREE.PlaneGeometry(2, 2);
        g.rotateX(-R90);
        // darkness per instance is written to a custom attribute
        const dark = new Float32Array(n);
        const m = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, fog: false, toneMapped: false,
            polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
            uniforms: { map: { value: softDiscTexture() } },
            vertexShader: `attribute float dark; varying vec2 vUv; varying float vD;
                void main(){ vUv = uv; vD = dark; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying float vD;
                void main(){ gl_FragColor = vec4(0.03, 0.025, 0.05, texture2D(map, vUv).a * vD); }`
        });
        const mesh = new THREE.InstancedMesh(g, m, n);
        const mt = new THREE.Matrix4();
        for (let i = 0; i < n; i++) {
            const [x, y, z, r, d] = this.contacts[i];
            mt.makeScale(r, 1, r);
            mt.setPosition(x, y, z);
            mesh.setMatrixAt(i, mt);
            dark[i] = d;
        }
        g.setAttribute('dark', new THREE.InstancedBufferAttribute(dark, 1));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.frustumCulled = false;
        mesh.renderOrder = 1;
        this.group.add(mesh);
    }

    // A round floor made of rings of tiles that follow the circle
    floorRing(batch, r0, r1, y, color, tilesPerMeter = 0.5, seg = 72, sectors = 0, color2 = 0) {
        const uTiles = Math.max(4, Math.round(Math.PI * (r0 + r1) * tilesPerMeter));
        const bright = batch === this.world.tile ? 2.1 : batch === this.world.pave ? 1.9 : 1;
        if (!sectors) {
            const g = new THREE.RingGeometry(r0, r1, seg, 3);
            g.rotateX(-R90);
            batch.addAt(g, 0, y, 0, color, 0.015, 0, 1, 1, 1, 0, 0, { uv: 'polar', uTiles, bright });
            return;
        }
        // wedges in two alternating colours
        const per = Math.max(2, Math.round(seg / sectors));
        for (let i = 0; i < sectors; i++) {
            const g = new THREE.RingGeometry(r0, r1, per, 3, (i / sectors) * Math.PI * 2, (1 / sectors) * Math.PI * 2);
            g.rotateX(-R90);
            batch.addAt(g, 0, y, 0, i % 2 ? color2 : color, 0.02, 0, 1, 1, 1, 0, 0, { uv: 'polar', uTiles, bright });
        }
    }

    // The carved drum under a round floor: its wall, a band of dentils, a metal trim, and the rock below
    floorDrum(W, R, seed) {
        const wall = new THREE.CylinderGeometry(R, R * 0.985, 1.2, 96, 1, true);
        W.wall.addAt(wall, 0, -0.6, 0, PAL.stone, 0, 0, 1, 1, 1, 0, 0, { uv: 'cyl', uRadius: R, ao: { y0: 0, h: 0, top: 0, hTop: 0.01, min: 1 } });
        const n = Math.round(R * 4.2);
        for (let i = 0; i < n; i++) {
            const a = (i + 0.5) / n * Math.PI * 2;
            W.block.addAt(chamferBox(0.5, 0.42, 0.28, 0.05), Math.cos(a) * (R + 0.08), -0.82, Math.sin(a) * (R + 0.08), PAL.stoneDark, 0.05, -a + R90);
        }
        W.bronze.addAt(new THREE.TorusGeometry(R + 0.02, 0.05, 6, 96).rotateX(R90), 0, -0.3, 0, PAL.bronze);
        W.rock.addAt(rockMass(R * 0.98, R * 0.72, 40, seed), 0, -1.2, 0, PAL.rock, 0.05, 0, 1, 1, 1, 0, 0, { ao: { y0: 0, h: 0, top: -1.2, hTop: 2.6, min: 0.45 } });
        W.rock.addAt(rockMass(R * 0.55, R * 1.15, 22, seed + 4), 0, -4, 0, PAL.rockDark, 0.05);
    }

    // The geyser's carved basin
    geyserBase(W, glow, y) {
        W.block.addAt(new THREE.CylinderGeometry(GEYSER_R + 0.35, GEYSER_R + 0.5, 0.25, 40), 0, y + 0.12, 0, PAL.stoneDark, 0.04);
        W.bronze.addAt(new THREE.TorusGeometry(GEYSER_R + 0.12, 0.09, 8, 40).rotateX(R90), 0, y + 0.26, 0, PAL.bronze);
        addGlow(glow, new THREE.CylinderGeometry(GEYSER_R, GEYSER_R, 0.06, 40), 0, y + 0.26, 0, 0x8af3ff, GLOW);
        for (let i = 0; i < 6; i++) W.bronze.addAt(new THREE.BoxGeometry(GEYSER_R * 2, 0.08, 0.16), 0, y + 0.31, 0, PAL.bronze, 0, (i / 6) * Math.PI);
        this.contacts.push([0, y + 0.014, 0, GEYSER_R + 1.3, 0.5]);
    }

    // A forked wind rune: a stem with two branches rising from its middle
    rune(glow, fx, fy, fz, sa, scale = 1) {
        const sx = Math.cos(sa) * 0.32 * scale, sz = -Math.sin(sa) * 0.32 * scale;
        addGlow(glow, new THREE.BoxGeometry(0.2 * scale, 1.8 * scale, 0.03), fx, fy, fz, 0xb48cff, GLOW, sa);
        addGlow(glow, new THREE.BoxGeometry(0.17 * scale, 0.95 * scale, 0.03), fx + sx, fy + 0.42 * scale, fz + sz, 0xb48cff, GLOW, sa, 1, 1, 1, 0, -0.6);
        addGlow(glow, new THREE.BoxGeometry(0.17 * scale, 0.95 * scale, 0.03), fx - sx, fy + 0.42 * scale, fz - sz, 0xb48cff, GLOW, sa, 1, 1, 1, 0, 0.6);
    }

    // Layout 1: the round colosseum with a ring of pillars and four monoliths
    buildColosseum(W, glow) {
        const ph = this.physics;
        // ---------- centre colosseum ----------
        ph.addCylinder(0, 0, CENTER_R, -6, 0, 'center');
        this.floorDrum(W, CENTER_R, 3);
        // floor rings of patterned tile with metal inlays; everything sits a hair apart so nothing flickers
        this.floorRing(W.tile, GEYSER_R + 0.2, 6.5, 0, PAL.tileC, 0.9, 48, 8, PAL.tileWarm);
        this.floorRing(W.gold, 6.5, 6.8, 0.004, PAL.gold, 1, 72);
        this.floorRing(W.tile, 6.8, 9.6, 0, PAL.tileTeal, 1.0, 96, 16, PAL.tileB);
        this.floorRing(W.bronze, 9.6, 9.72, 0.004, PAL.bronze, 1, 96);
        this.floorRing(W.pave, 9.72, 13.7, 0, PAL.tileC, 1.0, 112);
        this.floorRing(W.gold, 13.7, 14.0, 0.004, PAL.gold, 1, 96);
        this.floorRing(W.tile, 14.0, CENTER_R - 0.7, 0, PAL.tileA, 0.85, 144, 16, PAL.tileWarm);
        this.floorRing(W.block, CENTER_R - 0.7, CENTER_R, 0.002, PAL.stoneDark, 0.4, 128);
        // radial bronze seams on the outer ring
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            W.bronze.addAt(new THREE.BoxGeometry(0.1, 0.012, 9.1), Math.cos(a) * 18.9, 0.006, Math.sin(a) * 18.9, PAL.bronze, 0, -a + R90);
        }
        // a low carved curb around the edge (no collider: you can still be knocked off)
        for (let i = 0; i < 36; i++) {
            if (i % 9 === 0) continue; // gaps where the jump pads are
            const a = ((i + 0.5) / 36) * Math.PI * 2;
            W.block.addAt(chamferBox(3.6, 0.35, 0.55, 0.07), Math.cos(a) * (CENTER_R - 0.35), 0.17, Math.sin(a) * (CENTER_R - 0.35), PAL.stoneDark, 0.05, -a + R90, 1, 1, 1, 0, 0, { ao: { y0: 0, h: 0.2, min: 0.65 } });
        }

        // ---------- pillar ring: tall columns and broken stumps ----------
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
            const x = Math.cos(a) * PILLAR_RING, z = Math.sin(a) * PILLAR_RING;
            const tall = i % 2 === 0;
            const h = tall ? 8 : 3.4;
            const r = tall ? 1.05 : 1.15;
            ph.addCylinder(x, z, r, 0, h, 'pillar');
            // plinth and a moulded base
            W.block.addAt(chamferBox(r * 2.5, 0.5, r * 2.5, 0.08), x, 0.25, z, PAL.stoneDark, 0.04, a, 1, 1, 1, 0, 0, { ao: { y0: 0, h: 0.35, min: 0.6 } });
            W.block.addAt(new THREE.TorusGeometry(r * 1.03, 0.11, 8, 28).rotateX(R90), x, 0.6, z, PAL.stone, 0.03, 0, 1, 1, 1, 0, 0, { uv: 'cyl', uRadius: r });
            const shaftH = tall ? h - 1.25 : h - 0.5;
            W.wall.addAt(flutedColumn(r * 1.02, r * 0.93, shaftH, 12, tall ? 5 : 3, tall ? 0 : 0.8, i + 1), x, 0.5, z, PAL.stone, 0.05, a, 1, 1, 1, 0, 0, { uv: 'cyl', uRadius: r, ao: { y0: 0.5, h: 1.6, min: 0.62 } });
            if (tall) {
                // capital: a flare, a glowing band and a square slab
                W.block.addAt(new THREE.CylinderGeometry(r * 1.2, r * 0.93, 0.55, 28), x, h - 0.75 - 0.0, z, PAL.stone, 0.03, 0, 1, 1, 1, 0, 0, { uv: 'cyl', uRadius: r });
                W.block.addAt(chamferBox(r * 2.6, 0.5, r * 2.6, 0.09), x, h - 0.25, z, PAL.stoneDark, 0.04, a);
                addGlow(glow, new THREE.CylinderGeometry(r * 1.0, r * 1.0, 0.1, 28), x, h - 1.08, z, 0x6fe7ff, GLOW);
            } else {
                // jagged broken top with chunks on the ground
                W.wall.addAt(new THREE.IcosahedronGeometry(r * 0.86, 1), x, h - 0.72, z, PAL.stoneDark, 0.08, a * 3, 1, 0.24, 1);
                W.wall.addAt(new THREE.DodecahedronGeometry(0.55, 0), x + Math.cos(a + 1.3) * 2.1, 0.3, z + Math.sin(a + 1.3) * 2.1, PAL.stone, 0.1, a);
                W.wall.addAt(new THREE.DodecahedronGeometry(0.3, 0), x + Math.cos(a + 1.75) * 2.6, 0.17, z + Math.sin(a + 1.75) * 2.6, PAL.stoneDark, 0.1, a * 2);
                this.contacts.push([x + Math.cos(a + 1.3) * 2.1, 0.016, z + Math.sin(a + 1.3) * 2.1, 1.1, 0.5]);
            }
            this.contacts.push([x, 0.015, z, r * 2.5, 0.62]);
        }

        // ---------- floating monoliths (high perches for big slams) ----------
        for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + i * Math.PI / 2;
            const x = Math.cos(a) * MONO_R, z = Math.sin(a) * MONO_R;
            ph.addBox(x - MONO_HALF, MONO_BOTTOM, z - MONO_HALF, x + MONO_HALF, MONO_TOP, z + MONO_HALF, 'monolith');
            const hgt = MONO_TOP - MONO_BOTTOM;
            this.monolith(W, glow, x, z, MONO_HALF, MONO_BOTTOM, MONO_TOP, i + 11);
            void hgt;
        }

        // ---------- centre wind geyser ----------
        this.geyserBase(W, glow, 0);
    }

    // A polished obsidian block with a rock root, a glowing rim and a rune on each face
    monolith(W, glow, x, z, hw, yb, yt, seed) {
        const hgt = yt - yb;
        W.slate.addAt(chamferBox(hw * 2, hgt, hw * 2, 0.1), x, yb + hgt / 2, z, PAL.obsidian, 0.04);
        W.rock.addAt(rockMass(hw * 1.32, 3.0, 14, seed), x, yb + 0.02, z, 0x6a5f70, 0.08, seed, 1, 1, 1, 0, 0, { scale: 2.2, ao: { y0: 0, h: 0, top: yb, hTop: 1.1, min: 0.5 } });
        addGlow(glow, new THREE.BoxGeometry(hw * 2 + 0.06, 0.1, hw * 2 + 0.06), x, yt - 0.15, z, 0xd2b8ff, GLOW);
        for (let s = 0; s < 4; s++) {
            const sa = s * Math.PI / 2;
            this.rune(glow, x + Math.sin(sa) * (hw + 0.01), yb + hgt / 2, z + Math.cos(sa) * (hw + 0.01), sa);
        }
    }

    // Layout 2: Sky Ruins - a raised dais with stairs and the geyser on top, stone arches,
    // broken stumps, and three high monoliths
    buildRuins(W, glow) {
        const ph = this.physics;
        const R = this.centerR;
        ph.addCylinder(0, 0, R, -6, 0, 'center');
        this.floorDrum(W, R, 5);
        // old flagstones with patches of a lighter stone laid over them
        this.floorRing(W.flag, 0.1, R - 0.8, 0, 0xd8a47c, 0.5, 112, 12, 0x9fb0ac);
        for (let i = 0; i < 26; i++) {
            const a = i * 2.39, d = 8 + (i * 5.3) % 12;
            W.flag.addAt(new THREE.PlaneGeometry(1.6 + (i % 3) * 0.5, 1.2 + (i % 2) * 0.6).rotateX(-R90), Math.cos(a) * d, 0.006, Math.sin(a) * d, i % 2 ? 0xb8845e : 0x7f8f8c, 0.05, a);
        }
        this.floorRing(W.block, R - 0.8, R, 0.003, PAL.stoneDark, 0.4, 112);
        // the raised dais, with stairs on four sides
        const D = 6.5, H = this.daisH;
        ph.addCylinder(0, 0, D, 0, H, 'dais');
        W.wall.addAt(new THREE.CylinderGeometry(D, D + 0.3, H, 56, 2, true), 0, H / 2, 0, PAL.stone, 0.03, 0, 1, 1, 1, 0, 0, { uv: 'cyl', uRadius: D, ao: { y0: 0, h: 0.8, min: 0.62 } });
        this.floorRingAt(W.tile, GEYSER_R + 0.6, D - 0.4, H, PAL.tileB);
        this.floorRingAt(W.gold, D - 0.4, D, H + 0.003, PAL.gold);
        this.contacts.push([0, 0.014, 0, D + 1.5, 0.45]);
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
                W.block.addAt(chamferBox(maxX - minX, top, maxZ - minZ, 0.035), (minX + maxX) / 2, top / 2, (minZ + maxZ) / 2, k % 2 ? PAL.stone : PAL.stoneDark, 0.04);
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
                W.wall.addAt(chamferBox(1.2, 6, 1.2, 0.08), px, 3, pz, PAL.stone, 0.05, 0, 1, 1, 1, 0, 0, { ao: { y0: 0, h: 1.5, min: 0.62 } });
                W.block.addAt(chamferBox(1.6, 0.4, 1.6, 0.07), px, 0.2, pz, PAL.stoneDark, 0.04);
                W.block.addAt(chamferBox(1.5, 0.3, 1.5, 0.06), px, 5.85, pz, PAL.stoneDark, 0.04);
                this.contacts.push([px, 0.015, pz, 1.8, 0.6]);
            }
            const lx = tx ? 3.6 : 0.75, lz = tz ? 3.6 : 0.75;
            ph.addBox(cx - lx, 6, cz - lz, cx + lx, 7, cz + lz, 'lintel');
            W.block.addAt(chamferBox(lx * 2, 1, lz * 2, 0.08), cx, 6.5, cz, PAL.stoneDark, 0.04);
            addGlow(glow, new THREE.BoxGeometry(lx * 2 + 0.04, 0.1, lz * 2 + 0.04), cx, 6.3, cz, 0x6fe7ff, GLOW);
        }
        // broken stumps on the diagonals, between the arches
        for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + i * Math.PI / 2 + 0.35;
            const x = Math.cos(a) * 13.5, z = Math.sin(a) * 13.5;
            const h = 2.2 + (i % 2) * 1.6;
            ph.addCylinder(x, z, 1.2, 0, h, 'pillar');
            W.wall.addAt(flutedColumn(1.2, 1.12, h - 0.1, 12, 3, 0.7, i + 5), x, 0, z, PAL.stone, 0.05, a, 1, 1, 1, 0, 0, { uv: 'cyl', uRadius: 1.2, ao: { y0: 0, h: 1.2, min: 0.6 } });
            W.wall.addAt(new THREE.IcosahedronGeometry(1.03, 1), x, h - 0.72, z, PAL.stoneDark, 0.08, a * 2, 1, 0.24, 1);
            this.contacts.push([x, 0.015, z, 2.2, 0.6]);
        }
        // three high monoliths
        for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3 + Math.PI / 6;
            const x = Math.cos(a) * 9.5, z = Math.sin(a) * 9.5;
            const yb = 10, yt = 13.2, hw = 1.6;
            ph.addBox(x - hw, yb, z - hw, x + hw, yt, z + hw, 'monolith');
            this.monolith(W, glow, x, z, hw, yb, yt, i + 31);
        }
        // the geyser on top of the dais
        this.geyserBase(W, glow, H);
    }

    floorRingAt(batch, r0, r1, y, color) {
        const g = new THREE.RingGeometry(r0, r1, 56, 2);
        g.rotateX(-R90);
        batch.addAt(g, 0, y, 0, color, 0.015, 0, 1, 1, 1, 0, 0, { uv: 'polar', uTiles: Math.max(4, Math.round(Math.PI * (r0 + r1) * 0.5)) });
    }

    // Layout 3: Sky Spires - a small disc with four stone spires of rising height,
    // joined by floating stepping stones that spiral up to the tallest
    buildSpires(W, glow) {
        const ph = this.physics;
        const R = this.centerR;
        ph.addCylinder(0, 0, R, -6, 0, 'center');
        this.floorDrum(W, R, 13);
        this.floorRing(W.pave, GEYSER_R + 0.2, 7, 0, PAL.tileC, 1.0, 64);
        this.floorRing(W.gold, 7, 7.3, 0.004, PAL.gold, 1, 72);
        this.floorRing(W.tile, 7.3, R - 0.7, 0, PAL.tileTeal, 0.9, 112, 12, PAL.tileB);
        this.floorRing(W.block, R - 0.7, R, 0.002, PAL.stoneDark, 0.4, 96);
        const heights = [4, 7, 10, 13];
        const tops = [];
        for (let i = 0; i < 4; i++) {
            const a = Math.PI / 4 + i * Math.PI / 2;
            const x = Math.cos(a) * 10.5, z = Math.sin(a) * 10.5, h = heights[i];
            ph.addCylinder(x, z, 2.4, 0, h, 'spire');
            W.wall.addAt(new THREE.CylinderGeometry(2.3, 2.8, h, 24, Math.ceil(h), true), x, h / 2, z, PAL.stone, 0.05, a, 1, 1, 1, 0, 0, { uv: 'cyl', uRadius: 2.5, ao: { y0: 0, h: 2, min: 0.55 } });
            // rings of carved stone every few metres
            for (let k = 2; k < h - 1; k += 3) W.block.addAt(new THREE.TorusGeometry(2.72 - k * 0.5 * 0.5 / h, 0.12, 6, 28).rotateX(R90), x, k, z, PAL.stoneDark, 0.03, 0, 1, 1, 1, 0, 0, { uv: 'cyl', uRadius: 2.5 });
            W.flag.addAt(new THREE.CylinderGeometry(3.1, 2.6, 0.6, 28, 1), x, h - 0.3, z, PAL.stoneDark, 0.04, a);
            ph.addCylinder(x, z, 3.1, h - 0.6, h, 'spire-top');
            addGlow(glow, new THREE.CylinderGeometry(3.14, 3.14, 0.08, 36), x, h - 0.35, z, i === 3 ? 0xd2b8ff : 0x6fe7ff, GLOW);
            if (i === 3) addGlow(glow, new THREE.OctahedronGeometry(0.5, 0), x, h + 2.2, z, 0xb48cff, 1.5, 0, 1, 1.8, 1);
            tops.push({ x, z, h, a });
            this.contacts.push([x, 0.015, z, 3.9, 0.62]);
        }
        // stepping stones: from the floor up to the first spire, then between each spire and the next
        const stone = (x, y, z, s = 1.6) => {
            ph.addBox(x - s / 2, y - 0.5, z - s / 2, x + s / 2, y, z + s / 2, 'stone');
            W.flag.addAt(chamferBox(s, 0.5, s, 0.06), x, y - 0.25, z, PAL.stoneDark, 0.05);
            W.rock.addAt(rockMass(s * 0.6, 1.3, 8, Math.round(x * 7 + z)), x, y - 0.5, z, PAL.rock, 0.1, 0, 1, 1, 1, 0, 0, { scale: 3 });
        };
        const t0 = tops[0];
        stone(Math.cos(t0.a + 0.5) * 7.2, 2, Math.sin(t0.a + 0.5) * 7.2);
        for (let i = 0; i < 3; i++) {
            const a = tops[i].a + Math.PI / 4, b = tops[i + 1];
            const y = (tops[i].h + b.h) / 2;
            stone(Math.cos(a) * 11.5, y, Math.sin(a) * 11.5, 1.8);
        }
        // the geyser
        this.geyserBase(W, glow, 0);
    }

    // A tree from smooth shapes, shown when the nature models aren't there
    addTree(x, y, z, seed, s = 1) {
        const W = this.world;
        (this.treeSpots = this.treeSpots || []).push({ x, y, z, seed, s });
        W.plain.addAt(new THREE.CylinderGeometry(0.14 * s, 0.28 * s, 2.4 * s, 8, 2), x, y + 1.2 * s, z, PAL.trunk, 0.08, seed, 1, 1, 1, 0.04, 0.03);
        for (let k = 0; k < 5; k++) {
            const a = seed * 2.1 + k * 1.3, d = k ? 0.7 * s : 0;
            W.plain.addAt(new THREE.IcosahedronGeometry((k ? 0.85 : 1.25) * s, 2), x + Math.cos(a) * d, y + (2.7 + (k ? 0.55 * Math.sin(k * 2.2) : 0.35)) * s, z + Math.sin(a) * d, k % 2 ? PAL.leaf : PAL.leaf2, 0.08, a, 1, 0.82, 1);
        }
        this.contacts.push([x, y + 0.018, z, 1.25 * s, 0.5]);
    }

    // A jump pad at (x, y, z) that throws you onto (tx, ty, tz) along a high arc
    addPad(W, glow, x, y, z, tx, ty, tz, toZone) {
        const apex = Math.max(y, ty) + 7;
        const g = -PHYS.gravity;
        const vy = Math.sqrt(2 * g * (apex - y));
        const T = vy / g + Math.sqrt(2 * (apex - ty) / g);
        const dx = tx - x, dz = tz - z;
        this.physics.addCylinder(x, z, 1.25, y - 0.2, y + 0.18, 'pad');
        W.block.addAt(new THREE.CylinderGeometry(1.35, 1.5, 0.2, 32), x, y + 0.08, z, 0x8a8ea8, 0.03);
        W.bronze.addAt(new THREE.TorusGeometry(1.12, 0.07, 8, 32).rotateX(R90), x, y + 0.19, z, PAL.bronze);
        addGlow(glow, new THREE.CylinderGeometry(1.0, 1.0, 0.06, 32), x, y + 0.2, z, 0x6dffb0, GLOW * 0.8);
        this.contacts.push([x, y + 0.017, z, 2.1, 0.5]);
        // arrow pointing where the pad throws you
        const yaw = Math.atan2(dx, dz);
        const arrow = new THREE.ConeGeometry(0.42, 0.9, 3);
        arrow.rotateX(R90);
        addGlow(glow, arrow, x + Math.sin(yaw) * 0.25, y + 0.26, z + Math.cos(yaw) * 0.25, 0xffffff, GLOW, yaw, 1, 0.12, 1);
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
        const g = new THREE.SphereGeometry(600, 32, 20);
        const m = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            fog: false,
            uniforms: {
                top: { value: new THREE.Color(0x2f7fe0) },
                mid: { value: new THREE.Color(0x8ecbff) },
                horizon: { value: new THREE.Color(0xffe2c4) },
                bottom: { value: new THREE.Color(0xc6dcf5) },
                tSky: { value: null },
                tNoise: { value: cloudNoiseTexture() },
                hasSky: { value: 0 },
                exposure: { value: 1 },
                skySat: { value: 1 },
                skyTint: { value: new THREE.Color(1, 1, 1) },
                skyOff: { value: 0 },
                sunDir: { value: new THREE.Vector3(0, 1, 0) },
                sunColor: { value: new THREE.Color(0xffffff) },
                sunSize: { value: 0.0 },
                cloudTint: { value: new THREE.Color(0xffffff) },
                cloudAmt: { value: 0.0 },
                time: { value: 0 }
            },
            vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
            fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 bottom; uniform sampler2D tSky; uniform sampler2D tNoise;
                uniform float hasSky; uniform float exposure; uniform float skySat; uniform vec3 skyTint; uniform float skyOff; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunSize;
                uniform vec3 cloudTint; uniform float cloudAmt; uniform float time; varying vec3 vP;
                const float PI = 3.14159265;
                void main(){
                  vec3 d = normalize(vP); float h = d.y; vec3 c;
                  // the painted gradient is what shows before the photo sky arrives, or if it can't load
                  if (h > 0.0) { c = mix(horizon, mid, smoothstep(0.0, 0.25, h)); c = mix(c, top, smoothstep(0.25, 0.9, h)); }
                  else c = horizon;
                  if (hasSky > 0.5) {
                    float u = atan(d.z, d.x) / (2.0 * PI) + 0.5 + skyOff;
                    float v = asin(clamp(max(h, 0.002), 0.0, 1.0)) / (PI * 0.5);
                    vec3 s = textureLod(tSky, vec2(u, v), 0.0).rgb;
                    // at and below the horizon one row of the photo would stretch into vertical streaks: average it sideways
                    if (h < 0.04) {
                      vec3 w = vec3(0.0);
                      for (int i = -4; i <= 4; i++) w += textureLod(tSky, vec2(u + float(i) * 0.011, max(v, 0.016)), 0.0).rgb;
                      s = mix(w / 9.0, s, smoothstep(0.012, 0.04, h));
                    }
                    // the photo is 8 bits: a little noise before decoding breaks up its contour steps
                    float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
                    s = clamp(s + (ign - 0.5) * 2.0 / 255.0, 0.0, 0.995);
                    s = pow(s, vec3(2.2));
                    s = s / max(vec3(1.0) - s, vec3(0.04));
                    c = s * exposure * skyTint;
                    // richer colour in the sky, but ease off where it's bright: pushing saturation near the sun clips one
                    // channel to zero and leaves hard-edged blocks of pure yellow
                    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
                    float sat = mix(skySat, 0.82, smoothstep(0.35, 1.5, lum));
                    c = max(mix(vec3(lum), c, sat), vec3(0.0));
                    c = c / (1.0 + max(max(c.r, c.g), c.b) * 0.22); // soft shoulder: the sun stays bright, the sky around it keeps its colour
                    c = min(c, vec3(6.0));
                  }
                  // a thin high cloud layer that drifts, so the sky is alive and sharp up close
                  if (h > 0.02 && cloudAmt > 0.0) {
                    vec2 p = d.xz / (h + 0.18) * 0.09;
                    float n = texture2D(tNoise, p + vec2(time * 0.0012, time * 0.0005)).r * 0.65 + texture2D(tNoise, p * 2.7 - vec2(time * 0.002, 0.0)).r * 0.35;
                    float k = smoothstep(0.52, 0.78, n) * smoothstep(0.02, 0.22, h) * cloudAmt;
                    c = mix(c, cloudTint, k);
                  }
                  // the cloud sea's colour below the horizon
                  if (h <= 0.0) c = mix(c, bottom, smoothstep(0.0, -0.22, h));
                  // the sun: a hot core (it blooms) and a wide glow
                  float a = max(dot(d, sunDir), 0.0);
                  c += sunColor * (pow(a, 900.0) * 18.0 * sunSize + pow(a, 90.0) * 0.5 * sunSize + pow(a, 10.0) * 0.1 * sunSize) * (1.0 - hasSky * 0.9);
                  gl_FragColor = vec4(c, 1.0);
                  #include <tonemapping_fragment>
                  #include <colorspace_fragment>
                }`
        });
        this.skyMat = m;
        this.sky = new THREE.Mesh(g, m);
        this.sky.renderOrder = -10;
        this.sky.frustumCulled = false;
        this.scene.add(this.sky);
        // stars for night matches (the photo night sky has its own, these keep twinkling on the painted one)
        const n = 500, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, y = Math.random() * 0.9 + 0.08, r = Math.sqrt(1 - y * y);
            pos[i * 3] = Math.cos(a) * r * 550; pos[i * 3 + 1] = y * 550; pos[i * 3 + 2] = Math.sin(a) * r * 550;
        }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9, depthWrite: false }));
        this.stars.visible = false;
        this.sky.add(this.stars);
    }

    buildClouds() {
        // A sea of cloud far below: two slow scrolling layers. They fade out toward the edge, into the haze.
        const lg = new THREE.CircleGeometry(620, 48);
        lg.rotateX(-R90);
        const seaUniforms = {
            tNoise: { value: cloudNoiseTexture() }, time: { value: 0 },
            lit: { value: new THREE.Color(0xffffff) }, shade: { value: new THREE.Color(0x8899aa) }, fade: { value: new THREE.Color(0xc6dcf5) }
        };
        const sea = (y, scale, speed, alpha) => new THREE.Mesh(lg, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, fog: false,
            uniforms: { ...seaUniforms, scale: { value: scale }, speed: { value: speed }, alpha: { value: alpha } },
            vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
            fragmentShader: `uniform sampler2D tNoise; uniform float time; uniform vec3 lit; uniform vec3 shade; uniform vec3 fade; uniform float scale; uniform float speed; uniform float alpha; varying vec3 vW;
                void main(){
                  vec2 p = vW.xz * scale;
                  float n = texture2D(tNoise, p + time * speed * vec2(1.0, 0.4)).r * 0.62 + texture2D(tNoise, p * 3.1 - time * speed * vec2(0.7, 1.0)).r * 0.38;
                  float d = length(vW.xz);
                  float a = smoothstep(0.34, 0.62, n);
                  // a little light from one side, from how the noise changes
                  float n2 = texture2D(tNoise, p + vec2(0.012, 0.009) + time * speed * vec2(1.0, 0.4)).r;
                  vec3 c = mix(shade, lit, clamp(0.55 + (n - n2) * 5.0 + (n - 0.5) * 1.2, 0.0, 1.0));
                  c = mix(c, fade, smoothstep(120.0, 560.0, d));
                  gl_FragColor = vec4(c, a * alpha * (1.0 - smoothstep(460.0, 615.0, d)));
                  #include <tonemapping_fragment>
                  #include <colorspace_fragment>
                }`
        }));
        const s1 = sea(-58, 0.0016, 0.0016, 1.0), s2 = sea(-44, 0.0029, 0.0028, 0.72);
        s1.position.y = -58; s2.position.y = -44;
        s1.renderOrder = -6; s2.renderOrder = -5;
        const g = new THREE.Group();
        g.add(s1, s2);
        this.seaUniforms = seaUniforms;
        this.seaMats = [s1.material, s2.material];

        // Puffy clouds near the arena: soft billboards, a cluster each. All the facing is done in the shader.
        const count = this.quality === 'low' ? 60 : 170;
        const quad = new THREE.PlaneGeometry(1, 1);
        const shadeA = new Float32Array(count);
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const mesh = new THREE.InstancedMesh(quad, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, fog: false,
            uniforms: { map: { value: puffTexture() }, lit: seaUniforms.lit, shade: seaUniforms.shade, fade: seaUniforms.fade, fadeFar: { value: 420 } },
            vertexShader: `attribute float puff; varying vec2 vUv; varying float vP; varying float vF; uniform float fadeFar;
                void main(){
                  vUv = uv; vP = puff;
                  vec4 c = viewMatrix * modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                  float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz);
                  c.xy += position.xy * vec2(sx, sy);
                  vF = smoothstep(60.0, fadeFar, -c.z);
                  gl_Position = projectionMatrix * c; }`,
            fragmentShader: `uniform sampler2D map; uniform vec3 lit; uniform vec3 shade; uniform vec3 fade; varying vec2 vUv; varying float vP; varying float vF;
                void main(){
                  float a = texture2D(map, vUv).a;
                  if (a < 0.01) discard;
                  float up = clamp(1.1 - vUv.y * 0.0 - (1.0 - vUv.y) * 1.15 + vP * 0.35, 0.0, 1.0);
                  vec3 c = mix(shade, lit, up);
                  c = mix(c, fade, vF * 0.85);
                  gl_FragColor = vec4(c, min(1.0, a * 1.15) * 0.93);
                  #include <tonemapping_fragment>
                  #include <colorspace_fragment>
                }`
        }), count);
        const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
        let idx = 0;
        const clusters = [];
        for (let i = 0; i < 26; i++) {
            const a = rnd() * Math.PI * 2;
            const below = i < 18;
            const d = below ? 50 + rnd() * 170 : 80 + rnd() * 140;
            clusters.push({ x: Math.cos(a) * d, y: below ? -24 - rnd() * 14 : 18 + rnd() * 40, z: Math.sin(a) * d, s: below ? 13 + rnd() * 10 : 8 + rnd() * 7, n: below ? 7 : 6 });
        }
        for (const c of clusters) {
            for (let k = 0; k < c.n && idx < count; k++) {
                p.set(c.x + (rnd() - 0.5) * c.s * 2.8, c.y + (rnd() - 0.3) * c.s * 0.5, c.z + (rnd() - 0.5) * c.s * 2.2);
                const size = c.s * (1.5 + rnd() * 1.4);
                sc.set(size * 1.25, size * 0.8, size);
                mt.compose(p, q, sc);
                shadeA[idx] = rnd();
                mesh.setMatrixAt(idx++, mt);
            }
        }
        mesh.count = idx;
        quad.setAttribute('puff', new THREE.InstancedBufferAttribute(shadeA, 1));
        mesh.instanceMatrix.needsUpdate = true;
        mesh.frustumCulled = false;
        mesh.renderOrder = -4;
        g.add(mesh);
        this.clouds = g;
        this.scene.add(g);
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
                void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, 0.95, 0.8) * t.a * vA, 1.0);
                  #include <colorspace_fragment>
                }`
        });
        this.dust = new THREE.Points(g, m);
        this.dust.frustumCulled = false;
        this.dustMat = m;
        this.scene.add(this.dust);
    }

    // Light and sky for each time of day. exposure scales the photo sky; lit/shade colour the clouds; horizon, top and mid are the painted fallback sky.
    static THEMES = {
        sunset: { top: 0x2a4f9c, mid: 0x7b8fc4, horizon: 0xffb98a, bottom: 0xa9a2bc, fog: 0xc2a6a6, fogFar: 340, hs: 0xcfdcff, hg: 0x8a6a58, sun: 0xffc98f, sunI: 3.0, hemiI: 0.22, stars: false, sunC: 0xffd9a8, sunSize: 1, exposure: 0.42, lit: 0xffe4d0, shade: 0x6f6e98, sea: 0xa9a2bc, cloudTint: 0xffc9a8, cloudAmt: 0.2, sunDir: [-0.62, 0.46, -0.64], env: 1.55, skySat: 1.28 },
        night:  { top: 0x070b24, mid: 0x1b2a5c, horizon: 0x4a4a8a, bottom: 0x1a2148, fog: 0x232a58, fogFar: 280, hs: 0x8fa6ff, hg: 0x2a2440, sun: 0xaec2ff, sunI: 1.5, hemiI: 0.42, stars: true, sunC: 0xdfe8ff, sunSize: 0.35, exposure: 0.16, lit: 0x5c6aa8, shade: 0x1c2148, sea: 0x232a58, cloudTint: 0x39427a, cloudAmt: 0.12, sunDir: [-0.5, 0.72, -0.48], env: 5.0, skySat: 1.2, skyTint: [0.42, 0.62, 1.5] },
        storm:  { top: 0x2b3240, mid: 0x4f5a6e, horizon: 0x8a94a6, bottom: 0x4c5463, fog: 0x69738a, fogFar: 230, hs: 0xc8d2e6, hg: 0x5a5560, sun: 0xdde4f0, sunI: 1.25, hemiI: 0.6, stars: false, sunC: 0x9aa4b4, sunSize: 0, exposure: 0.28, lit: 0x7c8698, shade: 0x2c3340, sea: 0x4a5364, cloudTint: 0x3a4250, cloudAmt: 0.55, sunDir: [-0.5, 0.7, -0.5], env: 1.5, skySat: 1.0 }
    };

    // The sky images are shared by all arenas and only downloaded when first needed
    static skyTextures = {};
    static skyInfo = { sunset: 0.61279296875, night: 0.78271484375, storm: 0.466796875 }; // where each photo's sun or moon sits, across the panorama

    setTheme(name, scene, hemi, sun) {
        const t = Arena.THEMES[name] || Arena.THEMES.sunset;
        name = Arena.THEMES[name] ? name : 'sunset';
        this.theme = name;
        const u = this.skyMat.uniforms;
        u.top.value.set(t.top); u.mid.value.set(t.mid); u.horizon.value.set(t.horizon); u.bottom.value.set(t.bottom);
        scene.fog.color.set(t.fog); scene.fog.far = t.fogFar; scene.fog.near = 60;
        const hemiI = t.hemiI * (this.quality === 'low' ? 4.5 : 1); // Low has no sky reflections to fill the shade
        hemi.color.set(t.hs); hemi.groundColor.set(t.hg); hemi.intensity = hemiI;
        sun.color.set(t.sun); sun.intensity = t.sunI;
        // the light comes from where the sun is in the sky
        const d = u.sunDir.value.set(t.sunDir[0], t.sunDir[1], t.sunDir[2]).normalize();
        sun.position.copy(d).multiplyScalar(100);
        sun.shadow.needsUpdate = true;
        u.sunColor.value.set(t.sunC);
        u.sunSize.value = t.sunSize;
        u.exposure.value = t.exposure;
        u.skySat.value = t.skySat || 1;
        if (t.skyTint) u.skyTint.value.setRGB(t.skyTint[0], t.skyTint[1], t.skyTint[2]); else u.skyTint.value.setRGB(1, 1, 1);
        u.cloudTint.value.set(t.cloudTint);
        u.cloudAmt.value = this.quality === 'low' ? 0 : t.cloudAmt;
        // turn the panorama so its sun lines up with the light
        u.skyOff.value = Arena.skyInfo[name] - (Math.atan2(d.z, d.x) / (2 * Math.PI) + 0.5);
        this.seaUniforms.lit.value.set(t.lit); this.seaUniforms.shade.value.set(t.shade); this.seaUniforms.fade.value.set(t.sea);
        this.baseHemi = hemiI;
        this.stars.visible = t.stars;
        this.flashT = 0;
        this.nextFlash = 4 + Math.random() * 6;
        this.hemi = hemi;
        this.mainScene = scene;
        this.useSkyImage(name);
        this.refreshEnv();
    }

    useSkyImage(name) {
        const u = this.skyMat.uniforms;
        let tex = Arena.skyTextures[name];
        if (!tex) {
            tex = lateTexture(ASSETS + 'world/sky_' + name + '.jpg', { onload: (tx) => { tx.ready = true; Arena.skyListeners.forEach((f) => f()); } });
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
            Arena.skyTextures[name] = tex;
        }
        u.tSky.value = tex;
        u.hasSky.value = tex.ready ? 1 : 0;
    }

    // Reflections and soft ambient light come from the sky itself. Re-made when the sky changes.
    refreshEnv() {
        if (this.quality === 'low' || !this.renderer || !this.mainScene) return;
        const key = this.theme + (this.skyMat.uniforms.hasSky.value ? '+img' : '');
        if (this.envKey === key) return;
        this.envKey = key;
        const pm = new THREE.PMREMGenerator(this.renderer);
        const s = new THREE.Scene();
        // the same sky, a bit dimmer around the sun so highlights don't blow out, with the env strength for this time of day
        const m = this.skyMat.clone();
        m.uniforms.sunSize.value *= 0.15;
        m.uniforms.exposure.value = this.skyMat.uniforms.exposure.value * (Arena.THEMES[this.theme].env || 1);
        m.uniforms.tSky.value = this.skyMat.uniforms.tSky.value;
        m.uniforms.tNoise.value = this.skyMat.uniforms.tNoise.value;
        m.vertexShader = 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(100, 16, 10), m);
        s.add(mesh);
        const rt = pm.fromScene(s, 0.02, 1, 300);
        mesh.geometry.dispose(); m.dispose();
        pm.dispose();
        if (this.envRT) this.envRT.dispose();
        this.envRT = rt;
        this.mainScene.environment = rt.texture;
        if (this.onEnv) this.onEnv(rt.texture);
    }

    // Remove everything this arena added to the scene
    dispose() {
        this.disposed = true;
        if (this.skyListener) Arena.skyListeners.delete(this.skyListener);
        for (const o of [this.group, this.sky, this.clouds, this.dust]) {
            if (!o) continue;
            this.scene.remove(o);
            o.traverse((n) => {
                if (n.userData.natureShared) { n.dispose(); return; } // shared geometry, only the instance data is ours
                if (n.geometry) n.geometry.dispose();
                // materials made for this arena (shared world materials and cached textures stay)
                for (const mm of [].concat(n.material || [])) if (!mm.userData.shared) mm.dispose();
            });
        }
        if (this.envRT) { if (this.scene.environment === this.envRT.texture) this.scene.environment = null; this.envRT.dispose(); this.envRT = null; }
        if (this.geyserTex) this.geyserTex.dispose();
    }

    setPointScale(heightPx) {
        if (this.dustMat) this.dustMat.uniforms.scale.value = heightPx;
    }

    update(dt) {
        this.time += dt;
        natureTime.value = this.time;
        if (this.geyserTex) this.geyserTex.offset.y -= dt * 1.6;
        if (this.geyserMesh) this.geyserMesh.rotation.y += dt * 1.4;
        if (this.dustMat) this.dustMat.uniforms.time.value = this.time;
        if (this.clouds) { this.clouds.children[2].rotation.y += dt * 0.0035; this.seaUniforms.time.value = this.time; this.skyMat.uniforms.time.value = this.time; }
        // storm: distant lightning lights up the sky now and then
        if (this.theme === 'storm' && this.hemi) {
            this.nextFlash -= dt;
            if (this.nextFlash <= 0) { this.flashT = 0.35; this.nextFlash = 5 + Math.random() * 9; if (this.onThunder) this.onThunder(); }
            if (this.flashT > 0) {
                this.flashT -= dt;
                const k = this.flashT > 0.25 || (this.flashT > 0.08 && this.flashT < 0.14) ? 1 : 0;
                this.hemi.intensity = this.baseHemi + k * 2.6;
                this.skyMat.uniforms.exposure.value = Arena.THEMES.storm.exposure * (1 + k * 2.4);
            } else { this.hemi.intensity = this.baseHemi; this.skyMat.uniforms.exposure.value = Arena.THEMES.storm.exposure; }
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
