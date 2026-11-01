// ==========================================
// Shared graphics helpers: the cartoon (cel) shading ramp, materials,
// and a small geometry merger so the whole static arena draws in a
// handful of calls instead of hundreds.
// ==========================================

import * as THREE from 'three';

// Three-step light ramp: shadow, mid, lit. Nearest filtering gives the hard cartoon bands.
let ramp = null;
export function toonRamp() {
    if (ramp) return ramp;
    const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
    ramp = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    ramp.minFilter = THREE.NearestFilter;
    ramp.magFilter = THREE.NearestFilter;
    ramp.generateMipmaps = false;
    ramp.needsUpdate = true;
    return ramp;
}

export function toon(color, opts = {}) {
    return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...opts });
}

// A vertex-coloured toon material used by merged geometry
let vcMat = null;
export function vertexToon() {
    if (!vcMat) vcMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
    return vcMat;
}

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _n = new THREE.Matrix3();
const _v = new THREE.Vector3();

// Collects coloured pieces, then builds one BufferGeometry from them.
export class GeoBatch {
    constructor() {
        this.parts = [];
    }

    // geometry is consumed. color: hex or THREE.Color. jitter: random brightness variation
    // per face, which gives the low-poly faceted look.
    add(geometry, matrix, color, jitter = 0) {
        this.parts.push({ g: geometry.index ? geometry.toNonIndexed() : geometry, m: matrix.clone(), color, jitter });
        return this;
    }

    // Helper: position/rotation/scale in one call
    addAt(geometry, x, y, z, color, jitter = 0, rotY = 0, sx = 1, sy = 1, sz = 1, rotX = 0, rotZ = 0) {
        _m.compose(_v.set(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ)), new THREE.Vector3(sx, sy, sz));
        return this.add(geometry, _m, color, jitter);
    }

    build() {
        let count = 0;
        for (const p of this.parts) count += p.g.attributes.position.count;
        const pos = new Float32Array(count * 3);
        const nor = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        let o = 0;
        for (const p of this.parts) {
            const pa = p.g.attributes.position, na = p.g.attributes.normal;
            _n.getNormalMatrix(p.m);
            _c.set(p.color);
            const base = { r: _c.r, g: _c.g, b: _c.b };
            for (let i = 0; i < pa.count; i++) {
                // One colour per triangle so faces read as separate facets
                if (i % 3 === 0) {
                    const j = p.jitter ? 1 + (Math.random() * 2 - 1) * p.jitter : 1;
                    _c.setRGB(base.r * j, base.g * j, base.b * j);
                }
                _v.fromBufferAttribute(pa, i).applyMatrix4(p.m);
                pos[o * 3] = _v.x; pos[o * 3 + 1] = _v.y; pos[o * 3 + 2] = _v.z;
                _v.fromBufferAttribute(na, i).applyMatrix3(_n).normalize();
                nor[o * 3] = _v.x; nor[o * 3 + 1] = _v.y; nor[o * 3 + 2] = _v.z;
                col[o * 3] = _c.r; col[o * 3 + 1] = _c.g; col[o * 3 + 2] = _c.b;
                o++;
            }
            p.g.dispose();
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.computeBoundingSphere();
        this.parts.length = 0;
        return g;
    }
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
    ringTex = canvasTexture(128, 128, (ctx, w) => {
        const g = ctx.createRadialGradient(w / 2, w / 2, w * 0.28, w / 2, w / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.55, 'rgba(255,255,255,0.15)');
        g.addColorStop(0.8, 'rgba(255,255,255,1)');
        g.addColorStop(0.9, 'rgba(255,255,255,0.6)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, w);
    });
    return ringTex;
}
