// ==========================================
// Fighters. Each skin is a rigged, fully modelled character from assets/chars (built by tools/build-art.py
// from the CC0 Quaternius packs) with recoloured clothes and its own hat, helmet or crest. A smooth code-built
// figure stands in until the model has loaded, and stays if the download fails. Both have the same joints,
// so the one pose code below drives either: animation clips (or simple swings) for the body, and two-bone
// arm solving that puts the hands exactly where each weapon move needs them. Weapons sit in the hands.
// ==========================================

import * as THREE from 'three';
import { GLTFLoader } from '../lib/three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from '../lib/three/addons/utils/SkeletonUtils.js';
import { GeoBatch, lateTexture, canvasTexture, ASSETS } from './gfx.js';
import { GLOWS, trailColors } from './cosmetics.js';

let QUALITY = 'high';
export function setCharacterQuality(q) { QUALITY = q; }

// Skin palettes, keyed by the skin ids saved in the shared profile
// (internal ids kept from the 2D game: "steve", "alex", "noob", ...)
export const SKINS = {
    steve:          { name: 'Skye',           skin: '#e8b48c', shirt: '#d8452e', pants: '#3f4656', hair: '#c8922e', accent: '#2f6fb3', cap: '#1d2c55', eyes: '#2b5fae', leather: '#6b4630', gear: 'skye' },
    alex:           { name: 'Gale',           skin: '#f1c39a', shirt: '#eceee6', pants: '#2f7a58', hair: '#7fd3ff', accent: '#7b5cff', eyes: '#2e8b57', leather: '#5a4a68', gear: 'gale' },
    noob:           { name: 'Sunbolt',        skin: '#e9b98f', shirt: '#ff8a1f', pants: '#34508f', hair: '#fff6df', accent: '#ffe9c0', eyes: '#3b2a1e', grin: true, gear: 'sunbolt', tan: '#e87a18' },
    man_face:       { name: 'Dapper Duke',    skin: '#e8b48f', shirt: '#3a3a4a', pants: '#20202a', hair: '#1c1c22', accent: '#c9a227', eyes: '#222', moustache: true, gear: 'duke', tan: '#34343f' },
    creeper:        { name: 'Moss Golem',     skin: '#8a8f86', shirt: '#6b7a4f', pants: '#4d5844', hair: '#5f8a3a', accent: '#ffb300', eyes: '#ffb300', mossy: true, glowEyes: 3, leather: '#55604a', gear: 'golem', stone: true },
    enderman:       { name: 'Void Wraith',    skin: '#1d1f3d', shirt: '#17183a', pants: '#0e0f20', hair: '#1d1f3d', accent: '#3df5ff', eyes: '#3df5ff', visor: true, glowEyes: 5, leather: '#23244c', gear: 'wraith', stone: true },
    skeleton:       { name: 'Bone Knight',    skin: '#e9e5d6', shirt: '#7a6a55', pants: '#4a4038', hair: '#9aa3ad', accent: '#c0392b', eyes: '#c0392b', helmet: true, glowEyes: 1.5, leather: '#5a4c3c', gear: 'bone', stone: true },
    zombie:         { name: 'Bog Brute',      skin: '#8a9a4a', shirt: '#6b4a2f', pants: '#2f2f38', hair: '#4a5a2a', accent: '#c9a227', eyes: '#ffef8a', glowEyes: 1.5, gear: 'brute', big: 1.12, stone: true, tan: '#5a4028' },
    diamond_knight: { name: 'Crystal Knight', skin: '#e0ac7e', shirt: '#7a5cd6', pants: '#3d2f7a', hair: '#b48cff', accent: '#e2c2ff', eyes: '#123', helmet: true, leather: '#b9a8ff', gear: 'crystal' }
};

// ---------- weapons ----------
const WEAPON_MATS = {};
function wm(key, make) {
    const k = key + QUALITY;
    if (!WEAPON_MATS[k]) { WEAPON_MATS[k] = make(); WEAPON_MATS[k].userData.shared = true; }
    return WEAPON_MATS[k];
}

// Weapon styles live in cosmetics.js (still exported from here for anything importing them)
export { GLOWS };
function glowStyle(id) { return GLOWS[id] || GLOWS.sun; }
export function weaponColors(glowId) {
    const G = glowStyle(glowId);
    // the shaft is wood or painted, darker than the shop swatch once it's in real light
    const shaft = new THREE.Color(G.shaft).multiplyScalar(0.55).getHex(THREE.LinearSRGBColorSpace);
    return { metal: G.metal, shaft, tip: G.tip, halo: G.halo, rune: G.rune };
}
// The two colours of a fighter's streak: its bought trail, or its weapon's glow
export function trailStyle(trailId, glowId) {
    const t = trailColors(trailId, glowStyle(glowId) === GLOWS[glowId] ? glowId : 'sun');
    return { a: t[0], b: t[1] };
}

const weaponLit = () => wm('wlit', () => (QUALITY === 'low' ? new THREE.MeshLambertMaterial({ vertexColors: true }) : new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.65, roughness: 0.46, envMapIntensity: 0.62 })));
const weaponGlow = () => wm('wglow', () => new THREE.MeshBasicMaterial({ vertexColors: true }));
const R90 = Math.PI / 2;

// A shape that spins around the Y axis, from [radius, height] points
function lathe(points, seg = 10) {
    const g = new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(p[0], p[1])), seg);
    return g;
}

// Tip toward -Z, hand at z = 0
export function buildSpear(scale = 1, glowId = 'sun') {
    const C = weaponColors(glowId);
    const g = new THREE.Group();
    const lit = new GeoBatch(1), glow = new GeoBatch(1);
    // shaft: tapered, with leather wraps where the hand goes, and a butt cap
    lit.addAt(new THREE.CylinderGeometry(0.024, 0.03, 1.9, 8), 0, 0, -0.35, C.shaft, 0, 0, 1, 1, 1, R90);
    for (const z of [-0.14, -0.06, 0.02, 0.1]) lit.addAt(new THREE.CylinderGeometry(0.033, 0.033, 0.06, 8), 0, 0, z, 0x3a2a1e, 0, 0, 1, 1, 1, R90);
    lit.addAt(lathe([[0, 0], [0.04, 0.02], [0.03, 0.09], [0.028, 0.1]], 8).rotateX(-R90), 0, 0, 0.62, C.metal);
    // socket and swept guard
    lit.addAt(lathe([[0.024, 0], [0.042, 0.03], [0.034, 0.17], [0.05, 0.2], [0.03, 0.24]], 8).rotateX(-R90), 0, 0, -1.25, C.metal);
    for (const s of [-1, 1]) lit.addAt(new THREE.ConeGeometry(0.03, 0.2, 5), s * 0.09, 0, -1.48, C.metal, 0, 0, 0.7, 1, 0.5, R90 * 0.75, s * 1.2);
    // leaf blade: flat diamond with a glowing core
    const blade = new THREE.OctahedronGeometry(0.1, 0);
    lit.addAt(blade, 0, 0, -1.74, C.metal, 0, 0, 0.95, 0.24, 3.4);
    glow.addAt(new THREE.OctahedronGeometry(0.1, 0), 0, 0, -1.74, C.tip, 0, 0, 0.55, 0.32, 2.7, 0, 0, { bright: 1.5 });
    g.add(new THREE.Mesh(lit.build(), weaponLit()));
    g.add(new THREE.Mesh(glow.build(), weaponGlow()));
    for (const c of g.children) c.castShadow = true;
    g.children[1].castShadow = false;
    // the soft glow around the tip (its own material: it brightens during dashes)
    const halo = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 1), new THREE.MeshBasicMaterial({ color: C.halo, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.set(0.7, 0.4, 2.9);
    halo.position.z = -1.74;
    halo.material.userData.noFlash = true;
    halo.material.userData.ownGlow = true;
    g.add(halo);
    g.userData.glow = halo;
    g.userData.tipZ = -2.05;
    g.scale.setScalar(scale);
    return g;
}

// Head toward +Y, hand at y = 0
export function buildMace(scale = 1, glowId = 'sun') {
    const C = weaponColors(glowId);
    const g = new THREE.Group();
    const lit = new GeoBatch(1), glow = new GeoBatch(1);
    lit.addAt(new THREE.CylinderGeometry(0.027, 0.033, 0.72, 8), 0, 0.06, 0, C.shaft);
    for (const y of [-0.12, -0.04, 0.04, 0.12]) lit.addAt(new THREE.CylinderGeometry(0.037, 0.037, 0.055, 8), 0, y, 0, 0x3a2a1e);
    lit.addAt(lathe([[0, -0.05], [0.05, -0.03], [0.058, 0.0], [0.03, 0.04]], 8), 0, -0.32, 0, C.metal);
    lit.addAt(lathe([[0.03, 0], [0.05, 0.03], [0.04, 0.08]], 8), 0, 0.36, 0, C.metal);
    // flanged head: a core with six blades and a crown spike
    lit.addAt(lathe([[0.03, 0], [0.1, 0.06], [0.125, 0.15], [0.1, 0.25], [0.04, 0.31], [0, 0.32]], 12), 0, 0.42, 0, C.metal);
    for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        const f = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.11, 0.05), new THREE.Vector2(0.13, 0.18), new THREE.Vector2(0.09, 0.28), new THREE.Vector2(0, 0.32)]), { depth: 0.022, bevelEnabled: false });
        f.translate(0.06, 0, -0.011);
        lit.addAt(f, 0, 0.42, 0, C.metal, 0, a);
    }
    lit.addAt(new THREE.ConeGeometry(0.035, 0.14, 6), 0, 0.81, 0, C.metal);
    // glowing rune ring
    glow.addAt(new THREE.TorusGeometry(0.128, 0.012, 6, 18).rotateX(R90), 0, 0.57, 0, C.rune, 0, 0, 1, 1, 1, 0, 0, { bright: 2.6 });
    g.add(new THREE.Mesh(lit.build(), weaponLit()));
    g.add(new THREE.Mesh(glow.build(), weaponGlow()));
    g.children[0].castShadow = true;
    g.userData.tipY = 0.74;
    g.scale.setScalar(scale);
    return g;
}

// ---------- model files ----------
const gltf = new GLTFLoader();
const skinFiles = new Map();
let animFile = null;
const hideErr = (p) => { p.catch(() => {}); return p; };

const loaded = {};        // files that have arrived, for building a fighter at once with no stand-in
let loadedAnims = null;

export function preloadSkin(id) {
    if (!SKINS[id]) id = 'steve';
    if (!skinFiles.has(id)) skinFiles.set(id, hideErr(gltf.loadAsync(ASSETS + 'chars/' + id + '.glb').then((f) => { loaded[id] = f; return f; })));
    if (!animFile) animFile = hideErr(gltf.loadAsync(ASSETS + 'chars/anims.glb').then((f) => { loadedAnims = f; return f; }));
    return Promise.all([skinFiles.get(id), animFile]);
}

// After the first screen is up, fetch the other fighters one at a time so matches start without waiting
export function preloadAllSkins(first) {
    // the outfit textures too, so a fighter never appears in flat colours
    for (const n of ['ranger', 'peasant']) { chartex(n + '_d', true); chartex(n + '_n', false, [128, 128, 255]); chartex(n + '_orm', false); }
    const ids = Object.keys(SKINS).filter((k) => k !== first);
    const next = () => { const id = ids.shift(); if (id) preloadSkin(id).then(next, next); };
    preloadSkin(first).then(next, next);
}

// ---------- recolouring materials ----------
const texCache = new Map();
function chartex(name, srgb, fallback) {
    const k = name + QUALITY;
    if (!texCache.has(k)) texCache.set(k, lateTexture(ASSETS + 'chars/' + name + '.jpg', { srgb, flipY: false, aniso: QUALITY === 'high' ? 4 : 2, fallback }));
    return texCache.get(k);
}

const RECOLOR = `
    { vec3 cc = diffuseColor.rgb;
      float L = dot(cc, vec3(0.2126, 0.7152, 0.0722));
      float mx = max(cc.r, max(cc.g, cc.b));
      float sat = (mx - min(cc.r, min(cc.g, cc.b))) / max(mx, 0.001);
      if (uMode < 0.5) {
        // Plain tint: skin and hair. The texture's light and shade stay, its colour goes.
        cc = mix(cc, uA * clamp(L / uRef, 0.05, 1.2), uMix);
      } else if (uMode < 1.5) {
        // Ranger outfit: green cloth becomes shirt (light) and trousers (dark); brown leather gets its own colour
        float green = smoothstep(0.03, 0.18, (cc.g - max(cc.r, cc.b)) / max(mx, 0.001));
        float dark = 1.0 - smoothstep(0.012, 0.05, L);
        vec3 tint = mix(uA, uB, dark) * clamp(L / mix(0.09, 0.016, dark), 0.3, 1.5);
        float brown = (1.0 - green) * smoothstep(0.3, 0.55, sat) * step(cc.b, cc.r);
        cc = mix(cc, uC * clamp(L / 0.08, 0.25, 1.6), brown * uMix2);
        cc = mix(cc, tint, green);
      } else {
        // Peasant outfit: pale cloth becomes shirt, dark cloth trousers, tan parts the accent
        float pale = smoothstep(0.1, 0.3, L) * (1.0 - smoothstep(0.35, 0.65, sat));
        float dark = 1.0 - smoothstep(0.012, 0.075, L);
        float tan = (1.0 - pale) * (1.0 - dark) * smoothstep(0.35, 0.7, sat);
        // gentle shading from the texture: folds stay, patches don't
        vec3 tint = uA * mix(0.72, 1.12, smoothstep(0.1, 0.6, L));
        cc = mix(cc, uB * clamp(sqrt(L / 0.03), 0.55, 1.5), dark);
        cc = mix(cc, tint, pale);
        cc = mix(cc, uC * clamp(sqrt(L / 0.12), 0.55, 1.25), tan);
        // the rest of the cloth follows the shirt, so nothing stays brown on a bright outfit
        cc = mix(cc, uA * clamp(sqrt(L / 0.16), 0.5, 1.05), (1.0 - pale) * (1.0 - dark) * (1.0 - tan) * 0.8);
      }
      diffuseColor.rgb = cc; }
`;
function recolorPatch(m, mode, A, B, C, ref, mix, mix2) {
    const U = {
        uMode: { value: mode }, uA: { value: new THREE.Color(A) }, uB: { value: new THREE.Color(B || A) }, uC: { value: new THREE.Color(C || A) },
        uRef: { value: ref || 0.4 }, uMix: { value: mix === undefined ? 1 : mix }, uMix2: { value: mix2 === undefined ? 1 : mix2 }
    };
    m.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, U);
        s.fragmentShader = s.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform float uMode; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uRef; uniform float uMix; uniform float uMix2;')
            .replace('#include <map_fragment>', '#include <map_fragment>\n' + RECOLOR);
    };
    m.customProgramCacheKey = () => 'recolor1';
    return m;
}
function litMat(opts) {
    if (QUALITY === 'low') {
        const { normalMap, roughnessMap, metalnessMap, roughness, metalness, normalScale, ...rest } = opts;
        return new THREE.MeshLambertMaterial(rest);
    }
    return new THREE.MeshStandardMaterial(opts);
}

// A fresh set of this skin's materials (each fighter owns its set, for hit flashes and fading)
function makeSkinMaterials(id) {
    const s = SKINS[id];
    const female = id === 'alex' || id === 'enderman' || id === 'diamond_knight';
    const set = (id === 'noob' || id === 'man_face' || id === 'zombie') ? 'peasant' : 'ranger';
    const g = female ? 'f' : 'm';
    const out = {};
    out.cloth = recolorPatch(litMat({ map: chartex(set + '_d', true), normalMap: chartex(set + '_n', false, [128, 128, 255]), roughnessMap: chartex(set + '_orm', false), metalnessMap: chartex(set + '_orm', false, [0, 200, 0]), roughness: 1, metalness: 1 }),
        set === 'ranger' ? 1 : 2, s.shirt, s.pants, s.tan || s.leather || s.accent, 0.4, 1, s.leather ? 1 : 0);
    out.skin = recolorPatch(litMat({ map: chartex('arm_' + g + '_d', true), normalMap: chartex('arm_' + g + '_n', false, [128, 128, 255]), roughness: 0.62 }), 0, s.skin, null, null, 0.34, 1);
    out.head = recolorPatch(litMat({ map: chartex('head_' + g + '_d', true), normalMap: chartex('head_' + g + '_n', false, [128, 128, 255]), roughness: s.stone ? 0.8 : 0.55 }), 0, s.skin, null, null, 0.5, s.stone ? 1 : 0.8);
    out.brow = recolorPatch(litMat({ map: chartex('hair1_d', true), roughness: 0.8 }), 0, new THREE.Color(s.hair).multiplyScalar(0.45), null, null, 0.25, 1);
    const hairTex = (id === 'alex' || id === 'diamond_knight') ? 'hair2' : 'hair1';
    out.hair = recolorPatch(litMat({ map: chartex(hairTex + '_d', true), normalMap: chartex(hairTex + '_n', false, [128, 128, 255]), roughness: 0.62 }), 0, s.hair, null, null, hairTex === 'hair2' ? 0.42 : 0.34, 1);
    out.eye = recolorPatch(litMat({ map: chartex('eye_d', true), roughness: 0.22 }), 0, s.eyes, null, null, 0.3, s.glowEyes ? 1 : 0.55);
    if (s.glowEyes) { out.eye.emissive = new THREE.Color(s.eyes); out.eye.emissiveIntensity = s.glowEyes; }
    for (const k in out) out[k].userData.baseEmissive = out[k].emissive ? out[k].emissive.clone() : null;
    return out;
}

// ---------- hats, helmets and the like, built around the head ----------
function plainMat(color, rough = 0.7, metal = 0, emissive = 0) {
    const m = litMat({ color, roughness: rough, metalness: metal });
    if (emissive) { m.emissive = new THREE.Color(color); m.emissiveIntensity = emissive; m.userData.baseEmissive = m.emissive.clone(); }
    return m;
}
function addPiece(parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    parent.add(m);
    return m;
}
// Everything is placed in body space at rest: (0, 0, 0) is the middle of the head, -Z is forward
function buildHeadGear(s) {
    const h = new THREE.Group();
    const accent = plainMat(s.accent, 0.5, 0.2);
    switch (s.gear) {
        case 'sunbolt': addPiece(h, new THREE.TorusGeometry(0.098, 0.012, 6, 22), plainMat(0xffffff, 0.8), 0, 0.05, 0.002, 0.92, 1.12, 0.6, R90); break;
        case 'duke': {
            const black = plainMat(0x17171d, 0.42, 0.1);
            addPiece(h, new THREE.CylinderGeometry(0.098, 0.09, 0.2, 18), black, 0, 0.2, 0.005);
            addPiece(h, new THREE.CylinderGeometry(0.17, 0.17, 0.012, 22), black, 0, 0.1, 0.005, 1, 1, 1.08);
            addPiece(h, new THREE.CylinderGeometry(0.094, 0.094, 0.028, 18), plainMat(s.accent, 0.3, 0.9), 0, 0.122, 0.005);
            const tash = plainMat(0x20140c, 0.8);
            for (const sd of [-1, 1]) addPiece(h, new THREE.SphereGeometry(0.03, 8, 6), tash, sd * 0.03, -0.062, -0.112, 1.35, 0.38, 0.45, 0, 0, sd * 0.28);
            break;
        }
        case 'golem': {
            const rock = plainMat(0x777b72, 0.95), moss = plainMat(0x5f8a3a, 1);
            addPiece(h, new THREE.DodecahedronGeometry(0.07, 0), rock, 0.06, 0.1, 0.03, 1.1, 0.7, 1);
            addPiece(h, new THREE.DodecahedronGeometry(0.06, 0), rock, -0.08, 0.075, -0.02, 1, 0.8, 1.1);
            addPiece(h, new THREE.IcosahedronGeometry(0.1, 1), moss, 0, 0.1, 0.03, 1.2, 0.45, 1.1);
            break;
        }
        case 'wraith': addPiece(h, new THREE.BoxGeometry(0.18, 0.022, 0.03), plainMat(s.accent, 0.3, 0, 5), 0, 0.016, -0.118); break;
        case 'bone': {
            const steel = plainMat(0xaab2bc, 0.32, 0.95);
            addPiece(h, new THREE.SphereGeometry(0.135, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), steel, 0, 0.012, 0.005, 1, 1.08, 1.1);
            addPiece(h, new THREE.BoxGeometry(0.02, 0.1, 0.03), steel, 0, -0.03, -0.14);
            addPiece(h, new THREE.BoxGeometry(0.022, 0.09, 0.27), plainMat(s.accent, 0.8), 0, 0.17, 0.02);
            break;
        }
        case 'crystal': {
            const steel = plainMat(0xc9c3ee, 0.25, 0.95), cry = plainMat(s.accent, 0.2, 0, 1.1);
            addPiece(h, new THREE.TorusGeometry(0.1, 0.014, 6, 20), steel, 0, 0.058, 0.002, 0.95, 1.12, 1, R90);
            for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.55; addPiece(h, new THREE.OctahedronGeometry(0.032, 0), cry, Math.sin(a) * 0.1, 0.095 + (i === 2 ? 0.03 : 0), -Math.cos(a) * 0.11, 0.75, i === 2 ? 2 : 1.45, 0.75); }
            break;
        }
        default: break;
    }
    return h;
}
function buildNeckGear(s) {
    const n = new THREE.Group();
    if (s.gear === 'skye' || s.gear === 'gale') {
        const m = plainMat(s.accent, 0.85);
        addPiece(n, new THREE.TorusGeometry(0.083, 0.043, 8, 18), m, 0, 0.0, 0.0, 1, 1.06, 1.05, R90);
        addPiece(n, new THREE.ConeGeometry(0.05, 0.22, 6), m, 0.03, -0.03, 0.11, 1, 1, 0.45, 2.7);
    }
    return n;
}

// ---------- the code-built stand-in ----------
// Same joints as the real models, modelled from smooth tapered shapes
function capsule(r0, r1, len, seg = 10) {
    const pts = [];
    for (let i = 0; i <= 4; i++) { const a = i / 4 * R90; pts.push(new THREE.Vector2(Math.sin(a) * r1, -Math.cos(a) * r1)); }
    for (let i = 0; i <= 4; i++) { const a = R90 - i / 4 * R90; pts.push(new THREE.Vector2(Math.sin(a) * r0, Math.cos(a) * r0 + len)); }
    const g = new THREE.LatheGeometry(pts, seg);
    g.rotateX(Math.PI); // from the joint (y = 0) down to -len
    g.computeVertexNormals();
    return g;
}

function buildStandInRig(s, female) {
    const mat = (c, r = 0.75) => { const m = litMat({ color: c, roughness: r }); m.userData.baseEmissive = m.emissive ? m.emissive.clone() : null; return m; };
    const skin = mat(s.skin, 0.6), shirt = mat(s.shirt), pants = mat(s.pants), hair = mat(s.hair, 0.65), boot = mat(0x3a2c22, 0.6), acc = mat(s.accent, 0.5);
    const root = new THREE.Group();
    const add = (geo, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    const joint = (parent, x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); parent.add(j); return j; };
    const wd = female ? 0.9 : 1;
    const pelvis = joint(root, 0, 0.94, 0);
    add(capsule(0.135 * wd, 0.15, 0.1), pants, pelvis, 0, 0.08, 0);
    const spine = joint(pelvis, 0, 0.06, 0);
    const chest = joint(spine, 0, 0.2, 0);
    // the torso: wide at the shoulders, narrower at the waist
    const torso = new THREE.Mesh(new THREE.LatheGeometry([[0.001, -0.24], [0.13, -0.24], [0.135, -0.14], [0.155, 0], [0.175 * wd, 0.12], [0.16 * wd, 0.2], [0.07, 0.26], [0.04, 0.27]].map((p) => new THREE.Vector2(p[0], p[1])), 14), shirt);
    torso.scale.set(1, 1, 0.68);
    torso.castShadow = true;
    chest.add(torso);
    const belt = add(new THREE.TorusGeometry(0.132, 0.022, 6, 16).rotateX(R90), acc, chest, 0, -0.22, 0); belt.scale.z = 0.72;
    const neck = joint(chest, 0, 0.26, 0);
    add(capsule(0.045, 0.05, 0.07, 8), skin, neck, 0, 0.07, 0);
    const head = joint(neck, 0, 0.08, 0);
    const skull = add(new THREE.SphereGeometry(0.105, 18, 14), skin, head, 0, 0.1, 0); skull.scale.set(0.92, 1.12, 1.0);
    add(new THREE.SphereGeometry(0.075, 12, 10), skin, head, 0, 0.045, -0.018).scale.set(0.82, 0.9, 0.92); // jaw
    add(new THREE.ConeGeometry(0.016, 0.04, 6), skin, head, 0, 0.09, -0.108).rotation.x = -1.2;           // nose
    const eyeW = mat(0xf5f2ea, 0.3), eyeC = s.glowEyes ? mat(s.eyes) : mat(s.eyes, 0.2);
    if (s.glowEyes) { eyeC.emissive = new THREE.Color(s.eyes); eyeC.emissiveIntensity = s.glowEyes; eyeC.userData.baseEmissive = eyeC.emissive.clone(); }
    for (const sd of [-1, 1]) {
        add(new THREE.SphereGeometry(0.017, 8, 6), eyeW, head, sd * 0.038, 0.115, -0.092);
        add(new THREE.SphereGeometry(0.0095, 6, 6), eyeC, head, sd * 0.038, 0.115, -0.106);
        add(new THREE.BoxGeometry(0.042, 0.008, 0.014), hair, head, sd * 0.038, 0.143, -0.1);
    }
    if (s.gear !== 'wraith' && s.gear !== 'bone') {
        const cap = add(new THREE.SphereGeometry(0.113, 16, 10, 0, Math.PI * 2, 0, Math.PI * (female ? 0.72 : 0.55)), hair, head, 0, 0.112, 0.01); cap.scale.set(0.97, 1.14, 1.04);
    }
    const arm = (sd) => {
        const up = joint(chest, sd * 0.2 * wd, 0.17, 0);
        add(capsule(0.052, 0.04, 0.27), shirt, up);
        const lo = joint(up, 0, -0.29, 0);
        add(capsule(0.038, 0.032, 0.25), skin, lo);
        const hand = joint(lo, 0, -0.27, 0);
        const palm = add(new THREE.SphereGeometry(0.042, 10, 8), skin, hand, 0, -0.03, 0); palm.scale.set(0.72, 1.1, 1);
        add(new THREE.SphereGeometry(0.018, 6, 6), skin, hand, sd * -0.012, -0.015, -0.035); // thumb
        return { up, lo, hand };
    };
    const armR = arm(1), armL = arm(-1);
    const leg = (sd) => {
        const th = joint(pelvis, sd * 0.09, 0.0, 0);
        add(capsule(0.075, 0.056, 0.4), pants, th);
        const ca = joint(th, 0, -0.42, 0);
        add(capsule(0.054, 0.04, 0.38), pants, ca);
        const fo = joint(ca, 0, -0.42, 0);
        const shoe = add(new THREE.SphereGeometry(0.058, 10, 8), boot, fo, 0, -0.058, -0.045); shoe.scale.set(0.82, 0.7, 1.75);
        add(new THREE.CylinderGeometry(0.046, 0.042, 0.12, 8), boot, fo, 0, 0.03, 0);
        return { th, ca, fo };
    };
    const legR = leg(1), legL = leg(-1);
    return {
        root, standIn: true,
        pelvis, spineA: spine, spineB: chest, chest, neck, head,
        arms: { r: armR, l: armL }, legs: { r: legR, l: legL },
        headCenter: new THREE.Vector3(0, 1.57, -0.01),
        grip: { r: new THREE.Vector3(0, 0, -1), l: new THREE.Vector3(0, 0, -1) }, gripAt: { r: new THREE.Vector3(0, -0.055, 0), l: new THREE.Vector3(0, -0.055, 0) }
    };
}

// ---------- the real models ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _m = new THREE.Matrix4();

function buildSkinnedRig(skinId, file, wantClips) {
    const s = SKINS[skinId];
    const scene = cloneSkinned(file.scene);
    const mats = makeSkinMaterials(skinId);
    const root = new THREE.Group();
    root.add(scene);
    scene.rotation.y = Math.PI; // the files face +Z, the game faces -Z
    const bones = {};
    scene.traverse((o) => {
        if (o.isBone) bones[o.name] = o;
        if (o.isSkinnedMesh || o.isMesh) {
            o.frustumCulled = false; // a skinned mesh's box doesn't follow its pose
            o.castShadow = true;
            const nm = o.material && o.material.name;
            if (mats[nm]) o.material = mats[nm];
        }
    });
    root.updateMatrixWorld(true);
    // how each hand holds a stick: along the line from little finger to thumb, in the palm
    const grip = {}, gripAt = {};
    for (const sd of ['r', 'l']) {
        const hand = bones['hand_' + sd];
        const wp = (n) => bones[n + '_' + sd].getWorldPosition(new THREE.Vector3());
        const hp = hand.getWorldPosition(new THREE.Vector3());
        const mid = wp('middle_01'), thumb = wp('thumb_01'), pinky = wp('pinky_01');
        const fingers = mid.clone().sub(hp).normalize();
        const side = thumb.clone().sub(pinky).normalize();
        const palm = new THREE.Vector3().crossVectors(fingers, side).normalize();
        if (palm.dot(wp('thumb_02').sub(hp)) < 0) palm.negate();
        // curl the fingers into a fist, in world space at rest
        for (const f of ['index', 'middle', 'ring', 'pinky']) {
            for (const [k, ang] of [['01', 0.95], ['02', 1.2], ['03', 0.7]]) {
                const b = bones[f + '_' + k + '_' + sd];
                if (!b) continue;
                const before = bones[f + '_04_leaf_' + sd].getWorldPosition(new THREE.Vector3());
                rotW(b, side, ang);
                b.updateMatrixWorld(true);
                const after = bones[f + '_04_leaf_' + sd].getWorldPosition(new THREE.Vector3());
                if (after.sub(before).dot(palm) < 0) { rotW(b, side, -2 * ang); b.updateMatrixWorld(true); }
            }
        }
        const t2 = bones['thumb_02_' + sd];
        if (t2) { const before = wp('thumb_04_leaf'); rotW(t2, fingers, 0.5); t2.updateMatrixWorld(true); if (wp('thumb_04_leaf').sub(before).dot(palm) < 0) { rotW(t2, fingers, -1); t2.updateMatrixWorld(true); } }
        const invQ = hand.getWorldQuaternion(new THREE.Quaternion()).invert();
        grip[sd] = side.clone().applyQuaternion(invQ).normalize();
        const at = hp.clone().addScaledVector(fingers, 0.075).addScaledVector(palm, 0.03);
        gripAt[sd] = hand.worldToLocal(at);
    }
    // gear goes on at rest: head space
    const headB = bones.Head;
    const headTop = headB.getWorldPosition(new THREE.Vector3());
    const headCenter = new THREE.Vector3(headTop.x, headTop.y + 0.09, headTop.z - 0.015);
    const headGear = buildHeadGear(s);
    headGear.position.copy(headCenter);
    root.add(headGear);
    headB.attach(headGear);
    if (bones.neck_01) {
        // a body under the open collars: the outfits are hollow, and the head file stops at the neck
        const plug = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), mats.head);
        plug.scale.set(1.22, 1.15, 0.8);
        plug.position.copy(bones.neck_01.getWorldPosition(new THREE.Vector3()));
        plug.position.y -= 0.115;
        plug.castShadow = false;
        root.add(plug);
        bones.spine_03.attach(plug);
        const neckGear = buildNeckGear(s);
        neckGear.position.copy(bones.neck_01.getWorldPosition(new THREE.Vector3()));
        root.add(neckGear);
        bones.spine_03.attach(neckGear);
    }
    if (s.big) { for (const n of ['spine_02', 'spine_03']) bones[n].scale.multiplyScalar(s.big); }
    const R = {
        root, scene, mats, bones,
        pelvis: bones.pelvis, spineA: bones.spine_01, spineB: bones.spine_03, chest: bones.spine_03, neck: bones.neck_01, head: bones.Head,
        arms: { r: { up: bones.upperarm_r, lo: bones.lowerarm_r, hand: bones.hand_r }, l: { up: bones.upperarm_l, lo: bones.lowerarm_l, hand: bones.hand_l } },
        legs: { r: { th: bones.thigh_r, ca: bones.calf_r, fo: bones.foot_r }, l: { th: bones.thigh_l, ca: bones.calf_l, fo: bones.foot_l } },
        headCenter, grip, gripAt
    };
    if (wantClips) {
        const mixer = new THREE.AnimationMixer(scene);
        const acts = {};
        const ratio = wantClips.pelvisRatio(bones.pelvis);
        for (const c of wantClips.list) {
            let clip = c;
            if (Math.abs(ratio - 1) > 0.01) {
                clip = c.clone();
                for (const t of clip.tracks) if (t.name === 'pelvis.position') { t.values = t.values.slice(); for (let i = 0; i < t.values.length; i++) t.values[i] *= ratio; }
            }
            acts[c.name] = mixer.clipAction(clip);
        }
        R.mixer = mixer; R.acts = acts;
    }
    return R;
}

// The clips, once per file load: keep rotations, and the pelvis movement scaled to each body
let clipSet = null;
function getClips(animGltf) {
    if (clipSet) return clipSet;
    const list = animGltf.animations;
    let ual = null;
    animGltf.scene.traverse((o) => { if (o.name === 'pelvis') ual = o; });
    const ref = ual ? ual.position.length() : 1;
    clipSet = { list, pelvisRatio: (bone) => bone.position.length() / ref };
    return clipSet;
}

// rotate a joint around a world-space axis, keeping its children attached
function rotW(bone, axis, angle) {
    bone.parent.getWorldQuaternion(_q).invert();
    _q3.setFromAxisAngle(_e.copy(axis).applyQuaternion(_q).normalize(), angle);
    bone.quaternion.premultiply(_q3);
}
// turn a joint so a world-space direction (from -> to) lines up, by amount w
function aimJoint(bone, from, to, w = 1) {
    _q3.setFromUnitVectors(from, to);
    if (w < 1) _q3.slerp(_q2.identity(), 1 - w);
    bone.parent.getWorldQuaternion(_q).invert();
    bone.getWorldQuaternion(_q2);
    _q2.premultiply(_q3).premultiply(_q);
    bone.quaternion.copy(_q2);
    bone.updateMatrixWorld(true);
}

const _s = new THREE.Vector3(), _el = new THREE.Vector3(), _h = new THREE.Vector3(), _t = new THREE.Vector3(), _pole = new THREE.Vector3(), _n1 = new THREE.Vector3(), _n2 = new THREE.Vector3();

// Two-bone arm: puts the hand on target (world space), the elbow bent toward `pole`. w blends from the current pose.
function solveArm(arm, target, pole, w) {
    if (w <= 0.001) return;
    arm.up.getWorldPosition(_s);
    arm.lo.getWorldPosition(_el);
    arm.hand.getWorldPosition(_h);
    const a = _s.distanceTo(_el), b = _el.distanceTo(_h);
    _t.copy(_h).lerp(target, w);
    let d = _s.distanceTo(_t);
    const maxD = (a + b) * 0.995;
    if (d > maxD) { _t.sub(_s).multiplyScalar(maxD / d).add(_s); d = maxD; }
    if (d < 0.05) return;
    const toT = _n1.copy(_t).sub(_s).normalize();
    const cosA = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)));
    const along = cosA * a, up = Math.sqrt(Math.max(0, a * a - along * along));
    // elbow lies off the shoulder-hand line, toward the pole
    const off = _pole.copy(pole).addScaledVector(toT, -pole.dot(toT));
    if (off.lengthSq() < 1e-5) off.set(0.1, -1, 0).addScaledVector(toT, -toT.y);
    off.normalize();
    const elbow = _n2.copy(_s).addScaledVector(toT, along).addScaledVector(off, up);
    // upper arm
    _a.copy(_el).sub(_s).normalize();
    _b.copy(elbow).sub(_s).normalize();
    aimJoint(arm.up, _a, _b);
    // forearm
    arm.lo.getWorldPosition(_el);
    arm.hand.getWorldPosition(_h);
    _a.copy(_h).sub(_el).normalize();
    _b.copy(_t).sub(_el).normalize();
    aimJoint(arm.lo, _a, _b);
}

// A weapon's mount on a hand: the group's +Y runs along the fist's grip line
function makeHolder(rig, side) {
    const holder = new THREE.Group();
    holder.position.copy(rig.gripAt[side]);
    holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rig.grip[side]);
    rig.arms[side].hand.add(holder);
    return holder;
}
// Turns the hand so the fist's grip line points along dir (world space)
function aimGrip(rig, side, dir, w) {
    if (w <= 0.001) return;
    const hand = rig.arms[side].hand;
    hand.getWorldQuaternion(_q);
    _c.copy(rig.grip[side]).applyQuaternion(_q).normalize();
    aimJoint(hand, _c, dir, w);
}

// ---------- third-person fighter ----------
// Shared pose code: hands in body space (x right, y up, z back), facing -Z
const POLE_R = new THREE.Vector3(), POLE_L = new THREE.Vector3();
const _w1 = new THREE.Vector3(), _w2 = new THREE.Vector3(), _dirS = new THREE.Vector3(), _dirM = new THREE.Vector3(), _hS = new THREE.Vector3(), _hM = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _right = new THREE.Vector3();

const smoothE = (cur, tgt, rate, dt) => cur + (tgt - cur) * Math.min(1, dt * rate);
function lerp3(out, x, y, z, k) { out.x += (x - out.x) * k; out.y += (y - out.y) * k; out.z += (z - out.z) * k; }

export class CharacterModel {
    constructor(skinId, teamColor, glowId = 'sun') {
        this.skinId = SKINS[skinId] ? skinId : 'steve';
        const s = SKINS[this.skinId];
        this.root = new THREE.Group();
        this.body = new THREE.Group();      // scaled for Buddha, squashed on landings
        this.root.add(this.body);
        this.glowId = glowId;

        const female = this.skinId === 'alex' || this.skinId === 'enderman' || this.skinId === 'diamond_knight';
        const ready = loaded[this.skinId] && loadedAnims;
        if (ready) this.rig = buildSkinnedRig(this.skinId, loaded[this.skinId], getClips(loadedAnims));
        else {
            this.rig = buildStandInRig(s, female);
            // gear on the stand-in too, so it keeps its identity
            const hg = buildHeadGear(s);
            hg.position.set(0, 0.1, -0.005);
            this.rig.head.add(hg);
        }
        this.body.add(this.rig.root);

        // a band of team colour at the waist
        this.teamMat = litMat({ color: teamColor, roughness: 0.5 });
        this.teamMat.userData.baseEmissive = this.teamMat.emissive ? this.teamMat.emissive.clone() : null;
        this.sash = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 20).rotateX(R90), this.teamMat);
        this.sash.scale.z = 0.74;

        this.spear = buildSpear(0.62, glowId);
        this.mace = buildMace(0.6, glowId);
        this.attachWeapons(this.rig);
        this.placeSash(this.rig);

        // a soft blob shadow for when real fighter shadows are off
        this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16), new THREE.MeshBasicMaterial({ map: blobTexture(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }));
        this.blob.rotation.x = -R90;
        this.blob.position.y = 0.035;
        this.blob.material.userData.noFlash = true;
        this.root.add(this.blob);

        this.walkPhase = 0;
        this.squash = 1;
        this.opacity = 1;
        this.flashT = 0;
        this.hitT = 0;
        this.w = { idle: 1, walk: 0, jog: 0, sprint: 0, air: 0 };
        this.yawOff = 0;
        this.lean = 0;
        this.handS = new THREE.Vector3(0.27, 1.02, -0.2);
        this.handM = new THREE.Vector3(-0.3, 0.98, -0.12);
        this.dirS = new THREE.Vector3(0.03, 0.9, -0.42).normalize();
        this.dirM = new THREE.Vector3(-0.2, 0.85, -0.42).normalize();
        this.ikS = 0.8; this.ikM = 0.8;
        this.slamHit = 0;
        this.wasSlam = false;
        this.ko = 0;
        this.disposed = false;

        if (ready) { this.startClips(this.rig); return; }
        preloadSkin(this.skinId).then(([file, anims]) => {
            if (this.disposed) return;
            try { this.useRig(buildSkinnedRig(this.skinId, file, getClips(anims))); } catch (e) { console.warn('model failed, keeping the stand-in', e); }
        }).catch((e) => console.warn('model download failed, keeping the stand-in', this.skinId, e && e.message));
    }

    get hasModel() { return !this.rig.standIn; }

    attachWeapons(rig) {
        const hS = makeHolder(rig, 'r'), hM = makeHolder(rig, 'l');
        // the spear's tip (-Z) and the mace's head (+Y) point up the fist's grip line
        this.spear.rotation.set(R90, 0, 0);
        this.spear.position.set(0, -0.02, 0);
        this.mace.rotation.set(0, 0, 0);
        this.mace.position.set(0, 0.03, 0);
        hS.add(this.spear); hM.add(this.mace);
        this.holderS = hS; this.holderM = hM;
    }

    placeSash(rig) {
        const j = rig.spineA;
        j.add(this.sash);
        if (rig.standIn) this.sash.position.set(0, 0.0, 0);
        else {
            // the band is horizontal in body space, wherever this bone's axes point
            rig.root.updateMatrixWorld(true);
            j.getWorldPosition(_a);
            const wrap = new THREE.Group();
            wrap.add(this.sash);
            wrap.position.copy(_a);
            rig.root.add(wrap);
            j.attach(wrap);
        }
    }

    // Swap in the loaded model
    useRig(R) {
        const old = this.rig;
        if (this.opacity < 1) { const o = this.opacity; this.opacity = 1; this.pendingOpacity = o; }
        this.body.remove(old.root);
        // move the weapons and the band across before freeing the stand-in's own parts
        this.holderS.remove(this.spear); this.holderM.remove(this.mace);
        this.sash.parent.remove(this.sash);
        disposeTree(old.root);
        this.rig = R;
        this.body.add(R.root);
        this.attachWeapons(R);
        this.placeSash(R);
        this.startClips(R);
        if (this.pendingOpacity !== undefined) { const o = this.pendingOpacity; this.pendingOpacity = undefined; this.setOpacity(o); }
        if (this.onRig) this.onRig();
    }

    startClips(R) {
        const A = R.acts;
        if (A) {
            for (const [k, a] of Object.entries(A)) {
                a.enabled = true;
                a.setEffectiveWeight(0);
                if (k === 'idle' || k === 'swordIdle' || k === 'walk' || k === 'jog' || k === 'sprint' || k === 'jumpLoop') { a.setLoop(THREE.LoopRepeat, Infinity); a.play(); }
            }
            A.idle.setEffectiveWeight(0.65); A.swordIdle.setEffectiveWeight(0.35);
            R.mixer.update(0);
        }
    }

    // White flash when hit, with a flinch
    flash() { this.flashT = 0.14; this.hitT = 0.28; if (this.rig.acts) this.oneShot('hit', 0.55); }

    oneShot(name, weight) {
        const a = this.rig.acts && this.rig.acts[name];
        if (!a) return;
        a.reset();
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = false;
        a.setEffectiveWeight(weight);
        a.play();
        this.oneShotAct = a;
        this.oneShotW = weight;
    }

    setOpacity(o) {
        if (Math.abs(o - this.opacity) < 0.01) return;
        this.opacity = o;
        this.root.traverse((n) => {
            if (!n.isMesh || n === this.blob) return;
            const ms = Array.isArray(n.material) ? n.material : [n.material];
            for (let i = 0; i < ms.length; i++) {
                let m = ms[i];
                if (m.userData.shared) {
                    // give this model its own copy before changing opacity
                    m = m.clone(); m.userData.shared = false;
                    if (Array.isArray(n.material)) n.material[i] = m; else n.material = m;
                }
                if (m.userData.ownGlow) continue;
                m.transparent = o < 1; m.opacity = o; m.depthWrite = o >= 1;
            }
            n.castShadow = o >= 1 && !(n.material && n.material.isMeshBasicMaterial);
        });
    }

    // Plays the knockout while the game tumbles the fighter
    koPose(dt) {
        const A = this.rig.acts;
        if (A && !this.ko) {
            for (const k of ['idle', 'swordIdle', 'walk', 'jog', 'sprint', 'jumpLoop']) A[k].setEffectiveWeight(0);
            A.death.reset(); A.death.setLoop(THREE.LoopOnce, 1); A.death.clampWhenFinished = true; A.death.setEffectiveWeight(1); A.death.timeScale = 1.6; A.death.play();
        }
        this.ko = 1;
        if (A) this.rig.mixer.update(dt);
    }

    // f: the Fighter, interpolated position already applied to root by the caller
    animate(f, dt, time) {
        const R = this.rig, A = R.acts;
        if (this.ko && A) {
            // back from a knockout
            A.death.stop();
            for (const k of ['idle', 'swordIdle', 'walk', 'jog', 'sprint', 'jumpLoop']) A[k].play();
        }
        this.ko = 0;
        const yaw = this.root.rotation.y;
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw); // forward
        const rx = Math.cos(yaw), rz = -Math.sin(yaw);   // right
        const vF = f.vel.x * fx + f.vel.z * fz, vR = f.vel.x * rx + f.vel.z * rz;
        const speed = Math.hypot(f.vel.x, f.vel.z);
        const grounded = f.onGround;
        const air = !grounded;
        const rising = f.vel.y > 1;
        // ---- body: clips on the real model, swings on the stand-in
        const W = this.w;
        if (A && !this.ko) { /* the fighting stance replaces the plain idle */ }
        const tgt = (k, v) => { W[k] = smoothE(W[k], v, 12, dt); };
        tgt('air', air ? 1 : 0);
        const gr = grounded ? 1 : 0;
        const sp = Math.min(speed, 12);
        tgt('idle', gr * (sp < 0.6 ? 1 : 0));
        tgt('walk', gr * (sp >= 0.6 && sp < 3 ? 1 : 0));
        tgt('jog', gr * (sp >= 3 && sp < 6.8 ? 1 : 0));
        tgt('sprint', gr * (sp >= 6.8 ? 1 : 0));
        this.walkPhase += dt * (grounded ? Math.min(speed, 10) * 1.6 : 0);
        // legs turn toward where you're moving, the chest stays on the aim
        let yawTgt = 0;
        if (grounded && speed > 1) yawTgt = Math.max(-0.95, Math.min(0.95, Math.atan2(-vR, Math.abs(vF) + 0.01))) * (vF < -0.5 ? -1 : 1);
        this.yawOff = smoothE(this.yawOff, yawTgt, 10, dt);
        const back = vF < -0.5 ? -1 : 1;
        if (A) {
            A.idle.setEffectiveWeight(W.idle * 0.65); A.swordIdle.setEffectiveWeight(W.idle * 0.35); // a plain stand with a little of the fighting stance
            A.walk.setEffectiveWeight(W.walk); A.walk.timeScale = back * Math.max(0.6, sp / 1.7);
            A.jog.setEffectiveWeight(W.jog); A.jog.timeScale = back * Math.max(0.7, sp / 4.2);
            A.sprint.setEffectiveWeight(W.sprint); A.sprint.timeScale = back * Math.max(0.8, sp / 7.5);
            A.jumpLoop.setEffectiveWeight(W.air); A.jumpLoop.timeScale = rising ? 1 : 0.5;
            if (this.oneShotAct) {
                this.oneShotW = Math.max(0, this.oneShotW - dt * 2.2);
                this.oneShotAct.setEffectiveWeight(this.oneShotW);
                if (this.oneShotW <= 0) { this.oneShotAct.stop(); this.oneShotAct = null; }
            }
            R.mixer.update(dt);
        } else this.standInLegs(R, speed, grounded, f, time, back);

        // ---- torso
        this.lean = smoothE(this.lean, f.dashT > 0 ? 0.42 : (f.slamming ? 0.35 : (air ? (rising ? 0.05 : 0.18) : Math.min(speed, 9) * 0.018 * back)), 10, dt);
        this.body.updateWorldMatrix(true, false);
        R.root.updateMatrixWorld(true);
        const upW = _w1.set(0, 1, 0).transformDirection(this.body.matrixWorld);
        const rightW = _right.set(1, 0, 0).transformDirection(this.body.matrixWorld);
        if (Math.abs(this.yawOff) > 0.005) {
            rotW(R.pelvis, upW, this.yawOff);
            rotW(R.spineA, upW, -this.yawOff * 0.55);
            rotW(R.spineB, upW, -this.yawOff * 0.45);
        }
        // lean forward from the hips; flinch back when hit
        const flinch = this.hitT > 0 ? Math.sin(this.hitT / 0.28 * Math.PI) * -0.3 : 0;
        const stun = f.stunT > 0 ? Math.sin(time * 30) * 0.08 : 0;
        // (the jump and sprint clips already bend forward a lot; hold the back straighter so the head stays up)
        const upright = A ? (W.air * 0.42 + W.sprint * 0.2) : 0;
        if (this.lean || flinch || upright) rotW(R.spineA, rightW, -(this.lean + flinch - upright));
        if (A && W.air > 0.01) rotW(R.spineB, rightW, W.air * 0.25);
        // the chest turns into each move
        const twist = f.dashT > 0 ? -0.55 : (f.slamming ? 0.25 : (f.swingT > 0 ? 0.45 * (f.swingT / 0.3 * 2 - 1) : 0));
        this.twist = smoothE(this.twist || 0, twist, 18, dt);
        if (this.twist) rotW(R.spineB, upW, this.twist);
        // head follows the aim
        const headPitch = (f.pitch || 0) * 0.75;
        R.root.updateMatrixWorld(true);
        rotW(R.neck, rightW, -headPitch * 0.4);
        rotW(R.head, rightW, -headPitch * 0.6);
        // ---- hands: where each move wants them, in body space
        this.poseHands(f, dt, time, speed, air, rising);
        R.root.updateMatrixWorld(true);
        // solve the arms, then point the fists along their weapons
        this.body.localToWorld(_hS.copy(this.handS));
        this.body.localToWorld(_hM.copy(this.handM));
        _dirS.copy(this.dirS).transformDirection(this.body.matrixWorld);
        _dirM.copy(this.dirM).transformDirection(this.body.matrixWorld);
        POLE_R.set(0.55, -0.7, 0.35).transformDirection(this.body.matrixWorld);
        POLE_L.set(-0.55, -0.7, 0.35).transformDirection(this.body.matrixWorld);
        solveArm(R.arms.r, _hS, POLE_R, this.ikS);
        solveArm(R.arms.l, _hM, POLE_L, this.ikM);
        aimGrip(R, 'r', _dirS, Math.min(1, this.ikS * 1.25));
        aimGrip(R, 'l', _dirM, Math.min(1, this.ikM * 1.25));

        // ---- the rest
        this.hitT = Math.max(0, this.hitT - dt);
        R.root.position.y = grounded && !A ? Math.abs(Math.cos(this.walkPhase)) * 0.04 * Math.min(1, speed / 6) : 0;
        // squash on landing
        this.squash += (1 - this.squash) * Math.min(1, dt * 12);
        const big = f.bigScale || 1;
        this.body.scale.set(big * (2 - this.squash) ** 0.5, big * this.squash, big * (2 - this.squash) ** 0.5);
        // stun wobble
        this.body.rotation.z = stun;
        // spear tip glows during dashes
        this.spear.userData.glow.material.opacity = f.dashT > 0 ? 0.4 : 0.1;
        if (this.flashT > 0 || this.flashOn) {
            this.flashT = Math.max(0, this.flashT - dt);
            const k = this.flashT / 0.14 * 0.85;
            this.root.traverse((n) => {
                if (!n.isMesh) return;
                const ms = Array.isArray(n.material) ? n.material : [n.material];
                for (const m of ms) {
                    if (!m.emissive || m.userData.shared || m.userData.noFlash) continue;
                    const be = m.userData.baseEmissive;
                    if (be) m.emissive.setRGB(be.r + k, be.g + k, be.b + k); else m.emissive.setRGB(k, k, k);
                }
            });
            this.flashOn = this.flashT > 0;
        }
    }

    // Simple running legs for the stand-in figure
    standInLegs(R, speed, grounded, f, time, back) {
        const amt = grounded ? Math.min(1, speed / 6) * 0.95 : 0;
        const s = Math.sin(this.walkPhase) * back;
        const bend = (j, v) => { j.rotation.set(v, 0, 0); };
        const air = !grounded;
        bend(R.legs.r.th, air ? 0.5 : s * amt);
        bend(R.legs.l.th, air ? -0.25 : -s * amt);
        bend(R.legs.r.ca, air ? -0.7 : -Math.max(0, -Math.cos(this.walkPhase) * back) * amt * 1.2 - 0.05);
        bend(R.legs.l.ca, air ? -0.3 : -Math.max(0, Math.cos(this.walkPhase) * back) * amt * 1.2 - 0.05);
        R.pelvis.rotation.set(0, 0, 0);
        R.spineA.rotation.set(0, 0, 0); R.spineB.rotation.set(0, 0, 0);
        R.neck.rotation.set(0, 0, 0); R.head.rotation.set(0, 0, 0);
        R.pelvis.position.y = 0.94 - (grounded ? 0 : 0.03) + Math.sin(time * 2) * 0.005;
    }

    poseHands(f, dt, time, speed, air, rising) {
        const breath = Math.sin(time * 2.1) * 0.008;
        const runK = this.w.jog + this.w.sprint + this.w.walk * 0.5;
        const swing = Math.sin(this.walkPhase) * runK;
        // ready stance: spear angled forward like a lance, mace low in the other fist, elbows in
        let sx = 0.23, sy = 1.04 + breath + Math.abs(swing) * 0.03, sz = -0.2 - swing * 0.06, ikS = 0.9;
        let mx = -0.25, my = 0.95 + breath + Math.abs(swing) * 0.03, mz = -0.14 + swing * 0.06, ikM = 0.9;
        let dsx = -0.06, dsy = 0.62, dsz = -0.78;
        let dmx = -0.22, dmy = 0.62, dmz = -0.75;
        let rate = 14;
        const pitch = f.pitch || 0;
        const cp = Math.cos(pitch), spitch = Math.sin(pitch);
        // ---- falling: arms rise for balance
        if (air && !f.slamming && !f.glide) {
            const k = rising ? 0.4 : 1;
            sy += 0.14 * k; sx += 0.1 * k; sz += 0.03;
            my += 0.14 * k; mx -= 0.1 * k; mz += 0.03;
        }
        const recovering = f.spearCd > SPEAR_RECOVER;
        if (f.dashT > 0) {
            // thrust: the arm drives straight out along the aim, the spear level with it
            sx = 0.14; sy = 1.32 + spitch * 0.6; sz = -cp * 0.62; dsx = -0.02; dsy = spitch; dsz = -cp; ikS = 1; rate = 34;
            mx = -0.26; my = 1.0; mz = 0.26; dmx = -0.3; dmy = 0.5; dmz = 0.7; ikM = 1;
        } else if (recovering) {
            sx = 0.2; sy = 1.18; sz = -0.32; dsx = 0.02; dsy = 0.55; dsz = -0.82; ikS = 1; rate = 12;
        }
        if (this.slamHit > 0) {
            // the slam lands: mace driven into the ground in front
            this.slamHit -= dt;
            mx = -0.12; my = 0.42; mz = -0.56; dmx = -0.1; dmy = -0.25; dmz = -0.96; ikM = 1; rate = 40;
        } else if (f.slamming) {
            // both hands up: mace overhead
            mx = -0.08; my = 1.88; mz = 0.05; dmx = -0.1; dmy = 0.45; dmz = 0.88; ikM = 1; rate = 22;
            sx = 0.34; sy = 1.2; sz = 0.14; dsx = 0.2; dsy = 0.72; dsz = 0.66;
        } else if (f.swingT > 0) {
            // ground swing: from up and back to down in front
            const k = 1 - f.swingT / 0.3;
            const a = k < 0.25 ? 0 : (k - 0.25) / 0.75; const e = a * a * (3 - 2 * a);
            mx = -0.2 + 0.08 * e; my = 1.78 - e * 0.95; mz = 0.1 - e * 0.72;
            const ang = 0.75 - e * 2.5; // radians from straight up, positive = back
            dmx = -0.08; dmy = Math.cos(ang); dmz = Math.sin(ang);
            ikM = 1; rate = 30;
        }
        if (f.parryT > 0) {
            // weapons crossed in front of the chest
            sx = 0.15; sy = 1.32; sz = -0.34; dsx = -0.72; dsy = 0.68; dsz = -0.14;
            mx = -0.15; my = 1.3; mz = -0.34; dmx = 0.72; dmy = 0.68; dmz = -0.14;
            ikS = 1; ikM = 1; rate = 34;
        }
        if (f.glide) {
            // arms spread wide, weapons out to the sides
            sx = 0.62; sy = 1.42; sz = -0.05; dsx = 0.8; dsy = 0.45; dsz = -0.35;
            mx = -0.62; my = 1.42; mz = -0.05; dmx = -0.8; dmy = 0.45; dmz = -0.35;
            ikS = 1; ikM = 1;
        }
        if (this.hitT > 0) { sz += 0.1; mz += 0.1; }
        const k = Math.min(1, dt * rate);
        lerp3(this.handS, sx, sy, sz, k);
        lerp3(this.handM, mx, my, mz, k);
        lerp3(this.dirS, dsx, dsy, dsz, k); this.dirS.normalize();
        lerp3(this.dirM, dmx, dmy, dmz, k); this.dirM.normalize();
        this.ikS = smoothE(this.ikS, ikS, 18, dt);
        this.ikM = smoothE(this.ikM, ikM, 18, dt);
        if (f.slamming) this.wasSlam = true;
    }

    land(impact) {
        this.squash = Math.max(0.6, 1 - impact * 0.02);
        if (this.wasSlam) { this.slamHit = 0.24; this.wasSlam = false; }
        else if (impact > 6 && this.rig.acts) this.oneShot('land', 0.5);
    }

    // Where the weapon in use is, for its trail. out: { tip, base } in world space, or false when no weapon is swinging
    trailPoints(f, tip, base) {
        if (f.dashT > 0) {
            this.spear.updateWorldMatrix(true, false);
            tip.set(0, 0, this.spear.userData.tipZ).applyMatrix4(this.spear.matrixWorld);
            base.set(0, 0, -1.45).applyMatrix4(this.spear.matrixWorld);
            return 'spear';
        }
        if (f.slamming || f.swingT > 0 || this.slamHit > 0) {
            this.mace.updateWorldMatrix(true, false);
            tip.set(0, 0.85, 0).applyMatrix4(this.mace.matrixWorld);
            base.set(0, 0.42, 0).applyMatrix4(this.mace.matrixWorld);
            return 'mace';
        }
        return false;
    }

    dispose() {
        this.disposed = true;
        if (this.rig.mixer) this.rig.mixer.stopAllAction();
        disposeTree(this.root);
    }
}

const SPEAR_RECOVER = 0.6; // spear cooldown left while the arm is still pulling back

let blobTex = null;
function blobTexture() {
    if (!blobTex) {
        blobTex = canvasTexture(64, 64, (ctx, w) => {
            const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(0.5, 'rgba(255,255,255,0.72)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
        });
    }
    return blobTex;
}

// Free this model's own geometry and materials. Loaded model geometry and textures are shared between fighters and stay.
function disposeTree(root) {
    root.traverse((n) => {
        if (!n.isMesh) return;
        if (n.isSkinnedMesh && n.skeleton) n.skeleton.dispose(); // each fighter has its own bone texture
        if (n.geometry && !n.isSkinnedMesh) n.geometry.dispose();
        for (const m of Array.isArray(n.material) ? n.material : [n.material]) if (m && !m.userData.shared) m.dispose();
    });
}

// ---------- first-person viewmodel ----------
export class ViewModel {
    constructor(skinId, glowId = 'sun') {
        this.skinId = SKINS[skinId] ? skinId : 'steve';
        const s = SKINS[this.skinId];
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(62, 1, 0.02, 12);
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.7));
        const dl = new THREE.DirectionalLight(0xfff4e4, 2.4);
        dl.position.set(-1, 2, 1);
        this.scene.add(dl);
        this.root = new THREE.Group();
        this.camera.add(this.root);
        this.scene.add(this.camera);
        this.spear = buildSpear(0.38, glowId);
        this.mace = buildMace(0.3, glowId);
        const female = this.skinId === 'alex' || this.skinId === 'enderman' || this.skinId === 'diamond_knight';
        const ready = loaded[this.skinId];
        this.setRig(ready ? buildSkinnedRig(this.skinId, ready, null) : buildStandInRig(s, female));
        this.bob = 0;
        this.swayX = 0; this.swayY = 0;
        this.kickR = 0; this.kickL = 0;
        this.handS = new THREE.Vector3(0.24, -0.16, -0.52);
        this.handM = new THREE.Vector3(-0.25, -0.17, -0.52);
        this.dirS = new THREE.Vector3(-0.1, 0.4, -0.9).normalize();
        this.dirM = new THREE.Vector3(0.12, 0.8, -0.58).normalize();
        this.disposed = false;
        if (ready) return;
        preloadSkin(this.skinId).then(([file]) => {
            if (this.disposed) return;
            try { const old = this.rig; this.holderS.remove(this.spear); this.holderM.remove(this.mace); this.root.remove(this.rigGroup); disposeTree(old.root); this.setRig(buildSkinnedRig(this.skinId, file, null)); } catch (e) { console.warn('first-person model failed', e); }
        }).catch(() => {});
    }

    setRig(R) {
        this.rig = R;
        // only the arms show: the rest of the body folds away, and the eyes sit at the camera
        const hide = (j) => { if (j) j.scale.setScalar(0.0001); };
        hide(R.legs.r.th); hide(R.legs.l.th); hide(R.neck);
        if (R.standIn) { for (const c of R.chest.children) if (c.isMesh) c.visible = false; for (const c of R.pelvis.children) if (c.isMesh) c.visible = false; }
        R.root.updateMatrixWorld(true);
        const g = new THREE.Group();
        g.add(R.root);
        // shoulders a little behind and below the eyes
        const up = R.arms.r.up.getWorldPosition(new THREE.Vector3());
        g.position.set(0, -up.y - 0.17, 0.12);
        this.rigGroup = g;
        this.root.add(g);
        this.holderS = makeHolder(R, 'r');
        this.holderM = makeHolder(R, 'l');
        this.spear.rotation.set(R90, 0, 0);
        this.spear.position.set(0, 0.01, 0);
        this.mace.position.set(0, 0.03, 0);
        this.holderS.add(this.spear);
        this.holderM.add(this.mace);
    }

    setAspect(a) { this.camera.aspect = a; this.camera.updateProjectionMatrix(); }

    dispose() { this.disposed = true; disposeTree(this.scene); }

    // lookDX/DY: how much the view turned this frame (for sway)
    animate(f, dt, lookDX, lookDY, reducedMotion) {
        const speed = Math.hypot(f.vel.x, f.vel.z);
        if (f.onGround) this.bob += dt * Math.min(speed, 10) * 1.5;
        const bobAmt = reducedMotion ? 0.3 : 1;
        const bx = Math.sin(this.bob) * 0.016 * Math.min(1, speed / 6) * bobAmt;
        const by = -Math.abs(Math.cos(this.bob)) * 0.02 * Math.min(1, speed / 6) * bobAmt;
        this.swayX += (-lookDX * 0.6 - this.swayX) * Math.min(1, dt * 10);
        this.swayY += (lookDY * 0.6 - this.swayY) * Math.min(1, dt * 10);
        this.swayX = Math.max(-0.07, Math.min(0.07, this.swayX));
        this.swayY = Math.max(-0.07, Math.min(0.07, this.swayY));
        const fall = f.onGround ? 0 : Math.max(-0.05, Math.min(0.05, -f.vel.y * 0.002));
        this.root.position.set(bx + this.swayX, by + this.swayY + fall, 0);

        // targets in camera space: x right, y up, -z forward
        let sx = 0.24, sy = -0.16, sz = -0.52, dsx = -0.14, dsy = 0.5, dsz = -0.85;
        let mx = -0.25, my = -0.17, mz = -0.52, dmx = 0.2, dmy = 0.88, dmz = -0.42;
        let rate = 14;
        const thrust = f.dashT > 0;
        if (thrust) { sx = 0.1; sy = -0.13; sz = -0.72; dsx = -0.015; dsy = 0.04; dsz = -1; rate = 34; }
        else if (f.spearCd > SPEAR_RECOVER) { sx = 0.28; sy = -0.28; sz = -0.38; dsy = 0.2; rate = 12; }
        if (f.slamming) { mx = -0.12; my = 0.1; mz = -0.42; dmx = 0.15; dmy = 0.85; dmz = 0.5; rate = 22; }
        else if (f.swingT > 0) {
            const k = 1 - f.swingT / 0.3;
            const a = k < 0.25 ? 0 : (k - 0.25) / 0.75; const e = a * a * (3 - 2 * a);
            mx = -0.2 + e * 0.1; my = 0.05 - e * 0.42; mz = -0.42 - e * 0.22;
            const ang = 0.5 - e * 2.3;
            dmx = 0.12; dmy = Math.cos(ang); dmz = Math.sin(ang); rate = 30;
        }
        if (f.parryT > 0) {
            sx = 0.16; sy = -0.17; sz = -0.42; dsx = -0.75; dsy = 0.65; dsz = -0.12;
            mx = -0.16; my = -0.17; mz = -0.42; dmx = 0.75; dmy = 0.65; dmz = -0.12; rate = 34;
        }
        const k = Math.min(1, dt * rate);
        lerp3(this.handS, sx, sy, sz, k);
        lerp3(this.handM, mx, my, mz, k);
        lerp3(this.dirS, dsx, dsy, dsz, k); this.dirS.normalize();
        lerp3(this.dirM, dmx, dmy, dmz, k); this.dirM.normalize();

        // solve in the camera's own space
        this.root.visible = f.alive;
        const R = this.rig;
        this.camera.position.set(0, 0, 0);
        this.camera.rotation.set(0, 0, 0);
        this.camera.updateMatrixWorld(true);
        this.root.updateMatrixWorld(true);
        _hS.copy(this.handS).applyMatrix4(this.camera.matrixWorld);
        _hM.copy(this.handM).applyMatrix4(this.camera.matrixWorld);
        POLE_R.set(0.7, -0.7, 0.1); POLE_L.set(-0.7, -0.7, 0.1);
        solveArm(R.arms.r, _hS, POLE_R, 1);
        solveArm(R.arms.l, _hM, POLE_L, 1);
        aimGrip(R, 'r', this.dirS, 1);
        aimGrip(R, 'l', this.dirM, 1);
        this.spear.userData.glow.material.opacity = thrust ? 0.4 : 0.1;
    }
}
