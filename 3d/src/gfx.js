// ==========================================
// Shared graphics helpers: the world's textured materials, a small geometry merger
// so the whole static arena draws in a handful of calls, sculpted shapes (fluted
// columns, chamfered blocks, rock) and the soft textures effects use.
// ==========================================

import * as THREE from 'three';

export const ASSETS = new URL('../assets/', import.meta.url).href;

// ---------- textures that arrive later ----------
// A material gets a 1x1 stand-in at once and the real image swaps in when it has loaded, with no
// shader rebuild and no wait. If the download fails, the arena just keeps its plain painted colours.
const loader = new THREE.TextureLoader();
export const assetStats = { started: 0, loaded: 0, failed: 0, bytesHint: 0 };

export function lateTexture(url, opts = {}) {
    const fallback = opts.fallback || [255, 255, 255];
    const c = document.createElement('canvas');
    c.width = c.height = 2;
    const cx = c.getContext('2d');
    cx.fillStyle = `rgb(${fallback[0]},${fallback[1]},${fallback[2]})`;
    cx.fillRect(0, 0, 2, 2);
    const t = new THREE.Texture(c);
    t.colorSpace = opts.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = opts.aniso || 1;
    t.flipY = opts.flipY !== undefined ? opts.flipY : true;
    t.needsUpdate = true;
    assetStats.started++;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
        assetStats.loaded++;
            t.dispose(); // the stand-in's storage can't change size
        t.image = img;
        t.needsUpdate = true;
        if (opts.onload) opts.onload(t);
    };
    img.onerror = () => { assetStats.failed++; console.warn('texture failed', url); if (opts.onerror) opts.onerror(); };
    img.src = url;
    return t;
}

// ---------- world materials ----------
// name: [texture set, roughness, metalness, env strength, base tint]
const WORLD = {
    tile:  { set: 'tile',  rough: 0.75 },
    pave:  { set: 'pave',  rough: 0.8 },
    flag:  { set: 'flag',  rough: 0.85 },
    block: { set: 'block', rough: 0.9 },
    wall:  { set: 'wall',  rough: 0.9 },
    rock:  { set: 'rock',  rough: 1.0 },
    grass: { set: 'grass', rough: 1.0 },
    slate: { set: 'slate', rough: 0.4, env: 1.1 },   // polished obsidian
    gold:  { rough: 0.38, metal: 1, env: 0.9 },
    bronze: { rough: 0.45, metal: 0.9, env: 1.1 },
    plain: { rough: 0.85 }
};
let worldQuality = null, worldMats = null;

// One set of materials for all maps, so changing map never reloads images
export function worldMaterialQuality() { return worldQuality; }

export function worldMaterial(name, quality) {
    if (worldQuality !== quality) {
        if (worldMats) for (const k in worldMats) { worldMats[k].userData.owned = false; }
        worldQuality = quality; worldMats = {};
    }
    if (worldMats[name]) return worldMats[name];
    const W = WORLD[name] || WORLD.plain;
    const aniso = quality === 'high' ? 8 : quality === 'medium' ? 4 : 2;
    let m;
    const url = (s) => ASSETS + 'world/' + W.set + s;
    if (quality === 'low') {
        m = new THREE.MeshLambertMaterial({ vertexColors: true });
        if (W.set) m.map = lateTexture(url('_d.jpg'), { srgb: true, aniso });
    } else {
        m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: W.rough, metalness: W.metal || 0, envMapIntensity: W.env || 1 });
        if (W.set) {
            m.map = lateTexture(url('_d.jpg'), { srgb: true, aniso });
            m.normalMap = lateTexture(url('_n.jpg'), { aniso, fallback: [128, 128, 255] });
            m.normalScale = new THREE.Vector2(1, 1);
            if (quality === 'high' || name === 'slate') m.roughnessMap = lateTexture(url('_r.jpg'), { aniso, fallback: [255, 255, 255] });
        }
    }
    m.userData.shared = true;
    worldMats[name] = m;
    return m;
}

// The glowing parts: brighter than 1.0 on purpose, so the bloom picks them up
let glowMat = null;
export function glowMaterial() {
    if (!glowMat) { glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true }); glowMat.userData.shared = true; }
    return glowMat;
}

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _n = new THREE.Matrix3();
const _v = new THREE.Vector3();

// Collects coloured pieces, then builds one BufferGeometry from them. Every piece gets texture
// coordinates in real-world units from its shape:
//   'box'   (default) from the triangle's main direction, so stone tiles stay square on any shape
//   'cyl'   wrapped around the piece's own axis, for columns
//   'polar' rings around the centre, for round floors (tile rows follow the circle)
// ao: { y0, h, min } darkens toward the ground (fake ambient occlusion), { top } darkens toward the top
export class GeoBatch {
    constructor(tilesPerMeter = 0.25) {
        this.parts = [];
        this.scale = tilesPerMeter;
    }

    add(geometry, matrix, color, jitter = 0, opts = null) {
        this.parts.push({ g: geometry.index ? geometry.toNonIndexed() : geometry, m: matrix.clone(), color, jitter, opts });
        return this;
    }

    // position/rotation/scale in one call. opts: { uv, ao, scale, glow }
    addAt(geometry, x, y, z, color, jitter = 0, rotY = 0, sx = 1, sy = 1, sz = 1, rotX = 0, rotZ = 0, opts = null) {
        _m.compose(_v.set(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ)), new THREE.Vector3(sx, sy, sz));
        return this.add(geometry, _m, color, jitter, opts);
    }

    get count() { return this.parts.length; }

    build() {
        let count = 0;
        for (const p of this.parts) count += p.g.attributes.position.count;
        const pos = new Float32Array(count * 3);
        const nor = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const uvs = new Float32Array(count * 2);
        let o = 0;
        const n0 = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        for (const p of this.parts) {
            const pa = p.g.attributes.position, na = p.g.attributes.normal;
            _n.getNormalMatrix(p.m);
            _c.set(p.color);
            const O = p.opts || {};
            const k = O.bright || 1;
            const j = p.jitter ? 1 + (Math.random() * 2 - 1) * p.jitter : 1;
            const hue = p.jitter ? (Math.random() * 2 - 1) * p.jitter * 0.25 : 0;
            const R = _c.r * j * (1 + hue) * k, G = _c.g * j * k, B = _c.b * j * (1 - hue) * k;
            const s = (O.scale || 1) * this.scale;
            const ao = O.ao;
            const cx = p.m.elements[12], cz = p.m.elements[14];
            for (let i = 0; i < pa.count; i += 3) {
                a.fromBufferAttribute(pa, i).applyMatrix4(p.m);
                b.fromBufferAttribute(pa, i + 1).applyMatrix4(p.m);
                c.fromBufferAttribute(pa, i + 2).applyMatrix4(p.m);
                n0.copy(b).sub(a).cross(_v.copy(c).sub(a));
                const ax = Math.abs(n0.x), ay = Math.abs(n0.y), az = Math.abs(n0.z);
                let wrap = null;
                const facet = O.facet ? 1 - O.facet * Math.random() : 1; // crystals: each face its own brightness
                if (O.uv === 'cyl' || O.uv === 'polar') {
                    // keep one triangle on the same side of the atan2 seam
                    const t0 = Math.atan2(a.z - cz, a.x - cx), t1 = Math.atan2(b.z - cz, b.x - cx), t2 = Math.atan2(c.z - cz, c.x - cx);
                    const hi = Math.max(t0, t1, t2), lo = Math.min(t0, t1, t2);
                    wrap = hi - lo > Math.PI;
                }
                for (let v = 0; v < 3; v++) {
                    const q = v === 0 ? a : v === 1 ? b : c;
                    const i2 = i + v;
                    pos[o * 3] = q.x; pos[o * 3 + 1] = q.y; pos[o * 3 + 2] = q.z;
                    _v.fromBufferAttribute(na, i2).applyMatrix3(_n).normalize();
                    nor[o * 3] = _v.x; nor[o * 3 + 1] = _v.y; nor[o * 3 + 2] = _v.z;
                    let u0, v0;
                    if (O.uv === 'cyl') {
                        let t = Math.atan2(q.z - cz, q.x - cx);
                        if (wrap && t < 0) t += Math.PI * 2;
                        u0 = t * (O.uRadius || 1) * s; v0 = q.y * s;
                    } else if (O.uv === 'polar') {
                        let t = Math.atan2(q.z - cz, q.x - cx);
                        if (wrap && t < 0) t += Math.PI * 2;
                        u0 = t / (Math.PI * 2) * (O.uTiles || 16); v0 = Math.hypot(q.x - cx, q.z - cz) * s;
                    } else if (ay >= ax && ay >= az) { u0 = q.x * s; v0 = q.z * s; }
                    else if (ax >= az) { u0 = q.z * s; v0 = q.y * s; }
                    else { u0 = q.x * s; v0 = q.y * s; }
                    uvs[o * 2] = u0; uvs[o * 2 + 1] = v0;
                    let d = facet;
                    if (ao) {
                        if (ao.h) d *= ao.min + (1 - ao.min) * smooth01((q.y - ao.y0) / ao.h);
                        if (ao.top) d *= ao.min + (1 - ao.min) * smooth01((ao.top - q.y) / (ao.hTop || 2));
                    }
                    col[o * 3] = R * d; col[o * 3 + 1] = G * d; col[o * 3 + 2] = B * d;
                    o++;
                }
            }
            p.g.dispose();
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        g.computeBoundingSphere();
        this.parts.length = 0;
        return g;
    }
}

function smooth01(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

// ---------- sculpted shapes ----------
function rng(seed) { let s = (seed * 9301 + 49297) % 233280; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

// A fluted column around Y from y=0 to y=h. r0 at the bottom, r1 at the top.
export function flutedColumn(r0, r1, h, flutes = 14, rows = 5, brokenTop = 0, seed = 1) {
    const seg = flutes * 4;
    const pos = [], idx = [];
    const rnd = rng(seed);
    const tops = [];
    for (let i = 0; i < seg; i++) tops.push(brokenTop ? h - brokenTop * (0.5 + 0.5 * Math.sin(i * 0.37 + seed) * Math.sin(i * 0.13 + seed * 2)) - rnd() * brokenTop * 0.25 : h);
    for (let r = 0; r <= rows; r++) {
        const t = r / rows;
        for (let i = 0; i <= seg; i++) {
            const a = (i % seg) / seg * Math.PI * 2;
            const y = t * tops[i % seg];
            const flute = Math.pow(Math.abs(Math.cos(a * flutes / 2)), 0.6); // 1 on the ridges, 0 in the grooves
            const rr = (r0 + (r1 - r0) * t) * (0.93 + 0.07 * flute);
            pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
        }
    }
    const w = seg + 1;
    for (let r = 0; r < rows; r++) for (let i = 0; i < seg; i++) {
        const A = r * w + i, B = A + 1, C = A + w, D = C + 1;
        idx.push(A, C, B, B, C, D);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
}

// A box with chamfered edges, centred on the origin. Reads as cut stone instead of a default cube.
export function chamferBox(w, h, d, c = 0.06) {
    const x = w / 2, y = h / 2, z = d / 2;
    c = Math.min(c, x * 0.45, y * 0.45, z * 0.45);
    const P = [];
    // a loop of 8 points at each of 4 heights makes the sides and the bevels
    const loop = (yy, inset) => {
        const X = x - inset, Z = z - inset, q = c - inset;
        return [[X - q, yy, Z], [X, yy, Z - q], [X, yy, -Z + q], [X - q, yy, -Z], [-X + q, yy, -Z], [-X, yy, -Z + q], [-X, yy, Z - q], [-X + q, yy, Z]];
    };
    const rings = [loop(-y, c), loop(-y + c, 0), loop(y - c, 0), loop(y, c)];
    const quad = (a, b, cc, dd) => { P.push(...a, ...b, ...cc, ...a, ...cc, ...dd); };
    for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) {
        const j = (i + 1) % 8;
        quad(rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i]);
    }
    const cap = (ring, flip) => {
        for (let i = 1; i < 7; i++) {
            if (flip) P.push(...ring[0], ...ring[i], ...ring[i + 1]);
            else P.push(...ring[0], ...ring[i + 1], ...ring[i]);
        }
    };
    cap(rings[3], false);
    cap(rings[0], true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.computeVertexNormals(); // non-indexed: flat bevels
    return g;
}

// Tapered rock column for floating islands: strata ledges and a jagged point, pointing down from y=0
export function rockMass(radius, depth, segments = 16, seed = 1) {
    const rows = 9;
    const pos = [], idx = [];
    const rnd = rng(seed);
    const lobes = [rnd() * 6, rnd() * 6, rnd() * 6];
    for (let r = 0; r <= rows; r++) {
        const t = r / rows;
        // a stepped outline makes ledges; it narrows to a crooked tip
        const ledge = Math.floor(t * 4.5) / 4.5;
        const shape = Math.pow(1 - (t * 0.55 + ledge * 0.45), 0.7);
        const y = -t * depth;
        const ox = (rnd() - 0.5) * radius * 0.25 * t, oz = (rnd() - 0.5) * radius * 0.25 * t;
        for (let i = 0; i < segments; i++) {
            const a = i / segments * Math.PI * 2;
            const n = 1 + 0.13 * Math.sin(a * 3 + lobes[0]) + 0.08 * Math.sin(a * 7 + lobes[1] + t * 3) + 0.05 * Math.sin(a * 13 + lobes[2] - t * 7);
            const j = r === 0 ? 1 : n * (0.9 + rnd() * 0.2);
            const rr = radius * (r === 0 ? 1 : Math.max(0.02, shape)) * j;
            // height wobble stays well inside a row's height, so rows never fold over each other (folds left holes)
            pos.push(Math.cos(a) * rr + (r ? ox : 0), y + (r ? (rnd() - 0.5) * depth / rows * 0.5 : 0), Math.sin(a) * rr + (r ? oz : 0));
        }
    }
    // the last column joins the first, so the seam can't crack open
    const w = segments;
    for (let r = 0; r < rows; r++) for (let i = 0; i < segments; i++) {
        const j = (i + 1) % segments;
        const A = r * w + i, B = r * w + j, C = (r + 1) * w + i, D = (r + 1) * w + j;
        idx.push(A, B, C, B, D, C);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
}

// Low-poly rock underside for a floating platform: a jagged cone pointing down
export function rockCone(radius, depth, segments = 9, seed = 1) {
    const g = new THREE.ConeGeometry(radius, depth, segments, 2, false);
    g.rotateX(Math.PI);
    g.translate(0, -depth / 2, 0);
    const p = g.attributes.position;
    let s = seed * 9301 + 49297;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        if (y > -0.01) continue; // keep the top rim flush with the floor
        const k = 0.75 + rnd() * 0.5;
        p.setX(i, p.getX(i) * k);
        p.setZ(i, p.getZ(i) * k);
        p.setY(i, y * (0.85 + rnd() * 0.3));
    }
    g.computeVertexNormals();
    return g;
}

// Canvas texture helper
export function canvasTexture(w, h, draw, pixelated = false) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (pixelated) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
    return t;
}

// Soft round glow sprite used by sparks, dust and the jump pads
let glowTex = null;
export function glowTexture() {
    if (glowTex) return glowTex;
    glowTex = canvasTexture(64, 64, (ctx, w) => {
        const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, w);
    });
    return glowTex;
}

// Ring texture for shockwaves
let ringTex = null;
export function ringTexture() {
    if (ringTex) return ringTex;
    ringTex = canvasTexture(256, 256, (ctx, w) => {
        // a thin bright edge with a faint wash behind it, not a thick band
        const g = ctx.createRadialGradient(w / 2, w / 2, w * 0.28, w / 2, w / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.6, 'rgba(255,255,255,0.03)');
        g.addColorStop(0.86, 'rgba(255,255,255,0.22)');
        g.addColorStop(0.94, 'rgba(255,255,255,1)');
        g.addColorStop(0.97, 'rgba(255,255,255,0.45)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, w);
    });
    return ringTex;
}

// Soft dark disc for contact shadows and blob shadows
let softTex = null;
export function softDiscTexture() {
    if (softTex) return softTex;
    softTex = canvasTexture(64, 64, (ctx, w) => {
        const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, w);
    });
    softTex.colorSpace = THREE.NoColorSpace;
    return softTex;
}

// A soft cloud puff, made of many overlapping blobs
let puffTex = null;
export function puffTexture() {
    if (puffTex) return puffTex;
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    puffTex = canvasTexture(128, 128, (ctx, w) => {
        for (let i = 0; i < 46; i++) {
            const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.7) * w * 0.3;
            const x = w / 2 + Math.cos(a) * d, y = w / 2 + Math.sin(a) * d * 0.72, r = w * (0.07 + rnd() * 0.13);
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(255,255,255,0.28)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
    });
    puffTex.colorSpace = THREE.NoColorSpace;
    return puffTex;
}

// Tiling cloud noise for the cloud sea (a few octaves of smoothed random values)
let noiseTex = null;
export function cloudNoiseTexture() {
    if (noiseTex) return noiseTex;
    const N = 256;
    const data = new Uint8Array(N * N * 4);
    const layers = [];
    let seed = 5;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (const size of [8, 16, 32, 64]) { const v = new Float32Array(size * size); for (let i = 0; i < v.length; i++) v[i] = rnd(); layers.push({ size, v }); }
    const smooth = (t) => t * t * (3 - 2 * t);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let f = 0, amp = 0.53;
        for (const L of layers) {
            const fx = x / N * L.size, fy = y / N * L.size;
            const x0 = fx | 0, y0 = fy | 0, x1 = (x0 + 1) % L.size, y1 = (y0 + 1) % L.size;
            const tx = smooth(fx - x0), ty = smooth(fy - y0);
            const a = L.v[y0 * L.size + x0], b = L.v[y0 * L.size + x1], c = L.v[y1 * L.size + x0], d = L.v[y1 * L.size + x1];
            f += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
            amp *= 0.5;
        }
        const i = (y * N + x) * 4, v = Math.min(255, f * 255);
        data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
    }
    noiseTex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
    noiseTex.magFilter = THREE.LinearFilter;
    noiseTex.minFilter = THREE.LinearMipmapLinearFilter;
    noiseTex.generateMipmaps = true;
    noiseTex.needsUpdate = true;
    return noiseTex;
}

// Haze that thickens with depth below the arena as well as with distance
// (Three's own fog only knows distance.) Called once, before any material compiles.
let hazeDone = false;
export function installHeightHaze() {
    if (hazeDone) return;
    hazeDone = true;
    const C = THREE.ShaderChunk;
    C.fog_pars_vertex = '#ifdef USE_FOG\n varying float vFogDepth;\n varying float vFogY;\n#endif\n';
    C.fog_vertex = '#ifdef USE_FOG\n vFogDepth = - mvPosition.z;\n vFogY = dot(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]), mvPosition.xyz - viewMatrix[3].xyz);\n#endif\n';
    C.fog_pars_fragment = '#ifdef USE_FOG\n uniform vec3 fogColor;\n varying float vFogDepth;\n varying float vFogY;\n #ifdef FOG_EXP2\n uniform float fogDensity;\n #else\n uniform float fogNear;\n uniform float fogFar;\n #endif\n#endif\n';
    C.fog_fragment = '#ifdef USE_FOG\n #ifdef FOG_EXP2\n float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );\n #else\n float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );\n #endif\n fogFactor = max(fogFactor, smoothstep(-5.0, -42.0, vFogY) * 0.93);\n gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n#endif\n';
}
