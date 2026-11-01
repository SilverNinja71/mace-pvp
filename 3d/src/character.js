// ==========================================
// Character models: chunky low-poly fighters with pixel-art faces,
// the procedural Wind Spear and Storm Mace, and the first-person
// viewmodel arms. All animation is procedural (no model files).
// ==========================================

import * as THREE from 'three';
import { toon, canvasTexture } from './gfx.js';

const SPEAR_RECOVER = 0.6; // spear cooldown left while the arm is still pulling back

// Skin palettes, keyed by the skin ids saved in the shared profile
// (internal ids kept from the 2D game: "steve", "alex", "noob", ...)
export const SKINS = {
    steve:          { name: 'Steve',          skin: '#e0ac7e', shirt: '#2f6fb3', pants: '#2b3a67', hair: '#3b2a1e', accent: '#d8402f', cap: '#1d2c55', eyes: '#2b5fae' },
    alex:           { name: 'Alex',           skin: '#f1c39a', shirt: '#f2f2ea', pants: '#6b4a2f', hair: '#7fd3ff', accent: '#3aa86b', eyes: '#2e8b57' },
    noob:           { name: 'Sunbolt',        skin: '#f6b26b', shirt: '#ff8a1f', pants: '#3d5a99', hair: '#ffffff', accent: '#ffffff', eyes: '#3b2a1e', grin: true },
    man_face:       { name: 'Dapper Duke',    skin: '#e8b48f', shirt: '#3a3a4a', pants: '#24242e', hair: '#1c1c22', accent: '#c9a227', eyes: '#222', moustache: true },
    creeper:        { name: 'Creeper',        skin: '#6aa84f', shirt: '#4f8a3a', pants: '#3e6e2e', hair: '#6aa84f', accent: '#ffb300', eyes: '#ffb300', mossy: true },
    enderman:       { name: 'Void Wraith',    skin: '#1d1f3d', shirt: '#14152b', pants: '#0e0f20', hair: '#1d1f3d', accent: '#3df5ff', eyes: '#3df5ff', visor: true },
    skeleton:       { name: 'Skeleton Skull', skin: '#e9e5d6', shirt: '#cfcab8', pants: '#a8a392', hair: '#e9e5d6', accent: '#555', eyes: '#222' },
    zombie:         { name: 'Zombie',         skin: '#5f9e6e', shirt: '#2e8b8b', pants: '#4b3f8c', hair: '#3f6e4b', accent: '#2e8b8b', eyes: '#1b1b1b' },
    diamond_knight: { name: 'Diamond Helmet', skin: '#e0ac7e', shirt: '#4fd1e0', pants: '#2a7f8c', hair: '#6ff0ff', accent: '#bffcff', eyes: '#123', helmet: true }
};

// 8x8 pixel face, drawn once per skin
const faceCache = new Map();
function faceTexture(id) {
    if (faceCache.has(id)) return faceCache.get(id);
    const s = SKINS[id] || SKINS.steve;
    const tex = canvasTexture(8, 8, (ctx) => {
        const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
        ctx.fillStyle = s.skin; ctx.fillRect(0, 0, 8, 8);
        ctx.fillStyle = s.hair; ctx.fillRect(0, 0, 8, 2);
        if (s.helmet) { ctx.fillStyle = s.hair; ctx.fillRect(0, 0, 8, 3); ctx.fillRect(0, 0, 1, 8); ctx.fillRect(7, 0, 1, 8); }
        if (s.visor) { ctx.fillStyle = s.eyes; ctx.fillRect(1, 3, 6, 1); return; }
        if (s.mossy) { px(1, 2, '#4f8a3a'); px(5, 1, '#8fd16a'); px(6, 5, '#4f8a3a'); }
        // eyes
        px(1, 3, '#ffffff'); px(2, 3, s.eyes); px(5, 3, s.eyes); px(6, 3, '#ffffff');
        if (s.mossy) { ctx.fillStyle = '#1b2b14'; ctx.fillRect(3, 5, 2, 2); px(2, 6, '#1b2b14'); px(5, 6, '#1b2b14'); return; }
        if (s.moustache) { ctx.fillStyle = '#2a1a10'; ctx.fillRect(2, 5, 4, 1); px(1, 6, '#2a1a10'); px(6, 6, '#2a1a10'); }
        else if (s.grin) { ctx.fillStyle = '#7a2b16'; ctx.fillRect(2, 5, 4, 1); px(2, 4, '#7a2b16'); px(5, 4, '#7a2b16'); ctx.fillStyle = '#fff'; ctx.fillRect(3, 5, 2, 1); }
        else { ctx.fillStyle = '#8a4b38'; ctx.fillRect(3, 5, 2, 1); }
        if (id === 'steve') { ctx.fillStyle = s.cap; ctx.fillRect(0, 0, 8, 1); px(1, 2, '#c99a3a'); px(6, 2, '#c99a3a'); }
        if (id === 'noob') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 1, 8, 1); }
    }, true);
    faceCache.set(id, tex);
    return tex;
}

// ---------- weapons ----------
const WEAPON_MATS = {};
function wm(key, make) { return WEAPON_MATS[key] || (WEAPON_MATS[key] = make()); }

export function buildSpear(scale = 1) {
    const g = new THREE.Group();
    const silver = wm('silver', () => toon(0xdfe6ee));
    const gold = wm('gold', () => new THREE.MeshBasicMaterial({ color: 0xffd54a }));
    const wrap = wm('wrap', () => toon(0x3a6fb0));
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 1.9, 6), silver);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.35;
    g.add(shaft);
    for (const z of [0.1, -0.05, 0.25]) {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.07, 6), wrap);
        r.rotation.x = Math.PI / 2;
        r.position.z = z;
        g.add(r);
    }
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 6), gold);
    collar.rotation.x = Math.PI / 2;
    collar.position.z = -1.28;
    g.add(collar);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), gold);
    tip.scale.set(0.8, 0.8, 3.2);
    tip.position.z = -1.6;
    g.add(tip);
    // the glow at the tip
    const glow = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(1, 1, 3);
    glow.position.z = -1.6;
    g.add(glow);
    g.userData.glow = glow;
    g.scale.setScalar(scale);
    return g;
}

export function buildMace(scale = 1) {
    const g = new THREE.Group();
    const wood = wm('wood', () => toon(0x6b4428));
    const iron = wm('iron', () => toon(0x8c96a3));
    const ironDark = wm('irond', () => toon(0x5c6470));
    const rune = wm('rune', () => new THREE.MeshBasicMaterial({ color: 0x5ff3ff }));
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.75, 6), wood);
    handle.position.y = 0.28;
    g.add(handle);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 6), ironDark);
    grip.position.y = -0.02;
    g.add(grip);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), iron);
    head.position.y = 0.76;
    g.add(head);
    // spikes on four sides and the top
    const spike = new THREE.ConeGeometry(0.06, 0.16, 4);
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]];
    for (const d of dirs) {
        const s = new THREE.Mesh(spike, ironDark);
        s.position.set(d[0] * 0.21, 0.76 + d[1] * 0.21, d[2] * 0.21);
        if (d[0]) s.rotation.z = -d[0] * Math.PI / 2;
        if (d[2]) s.rotation.x = d[2] * Math.PI / 2;
        g.add(s);
    }
    // glowing runes on each face
    for (let i = 0; i < 4; i++) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.005), rune);
        const a = i * Math.PI / 2;
        r.position.set(Math.sin(a) * 0.152, 0.79, Math.cos(a) * 0.152);
        r.rotation.y = a;
        g.add(r);
        const r2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.005), rune);
        r2.position.set(Math.sin(a) * 0.152, 0.74, Math.cos(a) * 0.152);
        r2.rotation.y = a;
        g.add(r2);
    }
    g.userData.head = head;
    g.scale.setScalar(scale);
    return g;
}

// ---------- third-person fighter ----------
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x14121c, side: THREE.BackSide });

function part(w, h, d, mat, outline = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    if (outline) {
        const o = new THREE.Mesh(geo, outlineMat);
        o.scale.setScalar(1.08);
        o.castShadow = false;
        m.add(o);
    }
    return m;
}

export class CharacterModel {
    constructor(skinId, teamColor) {
        const s = SKINS[skinId] || SKINS.steve;
        this.root = new THREE.Group();
        this.body = new THREE.Group();      // scaled for Buddha, squashed on landings
        this.root.add(this.body);
        const skinMat = toon(s.skin), shirtMat = toon(s.shirt), pantsMat = toon(s.pants), hairMat = toon(s.hair);
        this.mats = [skinMat, shirtMat, pantsMat, hairMat];

        this.hips = new THREE.Group();
        this.hips.position.y = 0.92;
        this.body.add(this.hips);
        this.torso = part(0.56, 0.66, 0.32, shirtMat);
        this.torso.position.y = 0.35;
        this.hips.add(this.torso);
        // team sash
        const sash = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.34), toon(teamColor));
        sash.position.y = -0.2;
        this.torso.add(sash);
        this.sash = sash;

        this.neck = new THREE.Group();
        this.neck.position.y = 0.34;
        this.torso.add(this.neck);
        const faceMat = new THREE.MeshToonMaterial({ map: faceTexture(skinId), gradientMap: skinMat.gradientMap });
        const headMats = [hairMat, hairMat, hairMat, skinMat, faceMat, hairMat]; // +x -x +y -y +z -z (face on +z... set below)
        const headGeo = new THREE.BoxGeometry(0.44, 0.44, 0.44);
        this.head = new THREE.Mesh(headGeo, [hairMat, hairMat, hairMat, skinMat, hairMat, faceMat]);
        this.head.castShadow = true;
        const ho = new THREE.Mesh(headGeo, outlineMat); ho.scale.setScalar(1.07); this.head.add(ho);
        this.head.position.y = 0.24;
        this.neck.add(this.head);
        void headMats;
        if (s.helmet) {
            const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.4), toon(s.accent));
            crest.position.y = 0.27; this.head.add(crest);
        }
        if (skinId === 'steve' || skinId === 'alex') {
            const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.36), toon(s.accent));
            scarf.position.y = 0.3; this.torso.add(scarf);
        }
        if (skinId === 'man_face') {
            const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8), toon(0x1c1c22));
            hat.position.y = 0.38; this.head.add(hat);
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 8), toon(0x1c1c22));
            brim.position.y = 0.23; this.head.add(brim);
        }

        const limb = (x, y, w, h, mat, parent) => {
            const pivot = new THREE.Group();
            pivot.position.set(x, y, 0);
            const m = part(w, h, w, mat);
            m.position.y = -h / 2;
            pivot.add(m);
            parent.add(pivot);
            return pivot;
        };
        this.armR = limb(0.37, 0.28, 0.17, 0.62, skinMat, this.torso);
        this.armL = limb(-0.37, 0.28, 0.17, 0.62, skinMat, this.torso);
        // sleeves
        for (const a of [this.armR, this.armL]) {
            const sl = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.24, 0.19), shirtMat);
            sl.position.y = -0.1; a.add(sl);
        }
        this.legR = limb(0.14, 0, 0.21, 0.86, pantsMat, this.hips);
        this.legL = limb(-0.14, 0, 0.21, 0.86, pantsMat, this.hips);

        // weapons: spear in the right hand, mace in the left
        this.spear = buildSpear(0.9);
        this.spear.position.set(0, -0.58, 0.05);
        this.spear.rotation.x = Math.PI / 2 - 0.3; // tip up at rest, rotated in animate()
        this.armR.add(this.spear);
        this.mace = buildMace(1);
        this.mace.position.set(0, -0.6, 0.02);
        this.mace.rotation.x = -1.2;
        this.armL.add(this.mace);

        // a soft blob shadow for low quality (real shadows are off there)
        this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
        this.blob.rotation.x = -Math.PI / 2;
        this.blob.position.y = 0.03;
        this.root.add(this.blob);

        this.walkPhase = 0;
        this.squash = 1;
        this.opacity = 1;
    }

    setOpacity(o) {
        if (Math.abs(o - this.opacity) < 0.01) return;
        this.opacity = o;
        this.root.traverse((n) => {
            if (!n.isMesh) return;
            const ms = Array.isArray(n.material) ? n.material : [n.material];
            for (const m of ms) {
                if (!m.userData.cloned) {
                    // give this model its own copy before changing opacity
                    const c = m.clone(); c.userData.cloned = true;
                    if (Array.isArray(n.material)) n.material[n.material.indexOf(m)] = c; else n.material = c;
                }
            }
            const list = Array.isArray(n.material) ? n.material : [n.material];
            for (const m of list) { m.transparent = o < 1; m.opacity = o; m.depthWrite = o >= 1; }
            n.castShadow = o >= 1 && n.material !== outlineMat;
        });
    }

    // f: the Fighter, interpolated position already applied to root by the caller
    animate(f, dt, time) {
        const speed = Math.hypot(f.vel.x, f.vel.z);
        const grounded = f.onGround;
        this.walkPhase += dt * (grounded ? Math.min(speed, 10) * 1.6 : 0);
        const swing = grounded ? Math.sin(this.walkPhase) * Math.min(1, speed / 6) * 0.9 : 0;
        const air = !grounded;

        // legs (positive x rotation swings a limb forward)
        this.legR.rotation.x = air ? 0.55 : swing;
        this.legL.rotation.x = air ? -0.3 : -swing;
        // arms: walk swing + attacks
        let rX = -swing * 0.6, lX = swing * 0.6, rZ = 0, lZ = 0;
        let spearRx = Math.PI / 2 - 0.3;
        if (f.dashT > 0) {
            // thrust: right arm straight out along the look direction, spear level with it
            rX = Math.PI / 2 + f.pitch; spearRx = -Math.PI / 2;
        } else if (f.spearCd > SPEAR_RECOVER) {
            rX = 1.2; spearRx = -Math.PI / 2 + 0.4;
        }
        let maceRx = -1.2;
        if (f.slamming) {
            lX = Math.PI * 0.95; maceRx = Math.PI * 0.9; // mace raised overhead, coming down
        } else if (f.swingT > 0) {
            const k = f.swingT / 0.3;
            lX = 0.9 + (Math.PI * 0.9 - 0.9) * k; maceRx = -1.0 + 3.6 * k;
        } else if (air) {
            lX = 0.5; lZ = -0.35; rZ = 0.35;
        }
        if (f.parryT > 0) { rX = 1.4; lX = 1.4; rZ = -0.55; lZ = 0.55; }
        if (f.glide) { rZ = 1.35; lZ = -1.35; rX = 0; lX = 0; }
        this.armR.rotation.set(rX, 0, rZ);
        this.armL.rotation.set(lX, 0, lZ);
        this.spear.rotation.x = spearRx;
        this.mace.rotation.x = maceRx;
        // torso lean and head look
        this.hips.rotation.x = f.dashT > 0 ? -0.35 : (air ? -0.1 : -Math.min(speed, 8) * 0.012);
        this.neck.rotation.x = f.pitch * 0.6;
        this.hips.position.y = 0.92 + (grounded ? Math.abs(Math.cos(this.walkPhase)) * 0.05 * Math.min(1, speed / 6) : 0);
        // squash on landing
        this.squash += (1 - this.squash) * Math.min(1, dt * 12);
        const big = f.bigScale || 1;
        this.body.scale.set(big * (2 - this.squash) ** 0.5, big * this.squash, big * (2 - this.squash) ** 0.5);
        // stun wobble
        this.body.rotation.z = f.stunT > 0 ? Math.sin(time * 30) * 0.08 : 0;
        // spear tip glows during dashes
        this.spear.userData.glow.material.opacity = f.dashT > 0 ? 0.9 : 0.35;
    }

    land(impact) {
        this.squash = Math.max(0.6, 1 - impact * 0.02);
    }

    dispose() {
        this.root.traverse((n) => { if (n.isMesh && n.geometry) n.geometry.dispose(); });
    }
}

// ---------- first-person viewmodel ----------
export class ViewModel {
    constructor(skinId) {
        const s = SKINS[skinId] || SKINS.steve;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(62, 1, 0.01, 10);
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
        const dl = new THREE.DirectionalLight(0xffffff, 1.6);
        dl.position.set(-1, 2, 1);
        this.scene.add(dl);
        this.root = new THREE.Group();
        this.camera.add(this.root);
        this.scene.add(this.camera);
        const skinMat = toon(s.skin), shirtMat = toon(s.shirt);
        const arm = (side) => {
            const pivot = new THREE.Group();
            const fore = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.42), skinMat);
            fore.position.z = -0.2;
            pivot.add(fore);
            const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.115, 0.12), shirtMat);
            sleeve.position.z = -0.03;
            pivot.add(sleeve);
            pivot.position.set(side * 0.3, -0.32, -0.36);
            this.root.add(pivot);
            return pivot;
        };
        this.armR = arm(1);
        this.armL = arm(-1);
        this.spear = buildSpear(0.55);
        this.spear.position.set(0, 0.04, -0.42);
        this.armR.add(this.spear);
        this.mace = buildMace(0.4);
        this.mace.position.set(0, 0.03, -0.45);
        this.mace.rotation.x = -0.75;
        this.armL.add(this.mace);
        this.bob = 0;
        this.swayX = 0; this.swayY = 0;
        this.kickR = 0; this.kickL = 0;
    }

    setAspect(a) { this.camera.aspect = a; this.camera.updateProjectionMatrix(); }

    // lookDX/DY: how much the view turned this frame (for sway)
    animate(f, dt, lookDX, lookDY, reducedMotion) {
        const speed = Math.hypot(f.vel.x, f.vel.z);
        if (f.onGround) this.bob += dt * Math.min(speed, 10) * 1.5;
        const bobAmt = reducedMotion ? 0.3 : 1;
        const bx = Math.sin(this.bob) * 0.018 * Math.min(1, speed / 6) * bobAmt;
        const by = -Math.abs(Math.cos(this.bob)) * 0.022 * Math.min(1, speed / 6) * bobAmt;
        this.swayX += (-lookDX * 0.6 - this.swayX) * Math.min(1, dt * 10);
        this.swayY += (lookDY * 0.6 - this.swayY) * Math.min(1, dt * 10);
        this.swayX = Math.max(-0.08, Math.min(0.08, this.swayX));
        this.swayY = Math.max(-0.08, Math.min(0.08, this.swayY));
        const fall = f.onGround ? 0 : Math.max(-0.05, Math.min(0.05, -f.vel.y * 0.002));
        this.root.position.set(bx + this.swayX, by + this.swayY + fall, 0);

        // spear (right): thrust forward during a dash
        const thrust = f.dashT > 0 ? 1 : 0;
        this.kickR += (thrust - this.kickR) * Math.min(1, dt * (thrust ? 30 : 9));
        this.armR.position.set(0.3 - this.kickR * 0.1, -0.32 + this.kickR * 0.06, -0.36 - this.kickR * 0.26);
        this.armR.rotation.set(this.kickR * 0.1, this.kickR * 0.1, 0);
        // mace (left): raised overhead while slamming, chop on a swing
        let target = 0;
        if (f.slamming) target = 1;
        else if (f.swingT > 0) target = f.swingT > 0.18 ? 1 : -0.6;
        this.kickL += (target - this.kickL) * Math.min(1, dt * 16);
        this.armL.position.set(-0.34 + Math.max(0, this.kickL) * 0.14, -0.36 + this.kickL * 0.22, -0.4 - Math.abs(this.kickL) * 0.08);
        this.armL.rotation.set(this.kickL * 0.9, 0, -Math.max(0, this.kickL) * 0.3);
        if (f.parryT > 0) {
            this.armR.rotation.z = 0.7; this.armL.rotation.z = -0.7;
            this.armR.position.x = 0.12; this.armL.position.x = -0.12;
        }
        this.spear.userData.glow.material.opacity = f.dashT > 0 ? 0.95 : 0.35;
        this.root.visible = f.alive;
    }
}
