// ==========================================
// Effects: glowing sparks that stretch along their motion, lit stone debris and dust (all pooled,
// a few instanced draw calls), shockwave rings, ground cracks, weapon trails, lightning bolts,
// floating damage numbers and screen shake. Everything is allocated up front and reused.
// ==========================================

import * as THREE from 'three';
import { ringTexture, glowTexture, puffTexture, canvasTexture } from './gfx.js';
import { trailStyle } from './character.js';

const MAX_P = 500;
const MAX_CHUNKS = 180;
const MAX_PUFFS = 40;
const MAX_DECALS = 8;
const TRAIL_N = 22;
const MAX_TRAILS = 8;
const MAX_RINGS = 14;
const MAX_TEXT = 24;

export class FX {
    constructor(scene, camera, layer) {
        this.scene = scene;
        this.camera = camera;
        this.layer = layer;
        this.reduced = false;

        // ---- sparks: bright streaks facing the camera, stretched along their motion ----
        const quad = new THREE.PlaneGeometry(1, 1);
        const spark = new THREE.InstancedBufferGeometry();
        spark.index = quad.index;
        spark.setAttribute('position', quad.attributes.position);
        spark.setAttribute('uv', quad.attributes.uv);
        this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX_P * 3), 3).setUsage(THREE.DynamicDrawUsage);
        this.iVel = new THREE.InstancedBufferAttribute(new Float32Array(MAX_P * 3), 3).setUsage(THREE.DynamicDrawUsage);
        this.iCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX_P * 4), 4).setUsage(THREE.DynamicDrawUsage);
        spark.setAttribute('iPos', this.iPos);
        spark.setAttribute('iVel', this.iVel);
        spark.setAttribute('iCol', this.iCol);
        spark.instanceCount = 0;
        this.pMesh = new THREE.Mesh(spark, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
            uniforms: { },
            vertexShader: `attribute vec3 iPos; attribute vec3 iVel; attribute vec4 iCol; varying vec2 vUv; varying vec4 vC;
                void main(){
                  vUv = uv; vC = iCol;
                  vec4 c = viewMatrix * vec4(iPos, 1.0);
                  vec3 v = (viewMatrix * vec4(iVel, 0.0)).xyz;
                  vec2 d = v.xy; float sp = length(d);
                  d = sp > 0.001 ? d / sp : vec2(0.0, 1.0);
                  vec2 n = vec2(-d.y, d.x);
                  float len = iCol.a * (1.0 + min(sp * 0.09, 4.0));
                  c.xy += d * position.y * len + n * position.x * iCol.a * 0.55;
                  gl_Position = projectionMatrix * c; }`,
            fragmentShader: `varying vec2 vUv; varying vec4 vC;
                void main(){ vec2 q = (vUv - 0.5) * 2.0; float a = max(0.0, 1.0 - dot(q, q)); gl_FragColor = vec4(vC.rgb * a * a * 3.0, 1.0);
                  #include <colorspace_fragment>
                }`
        }));
        this.pMesh.frustumCulled = false;
        this.pMesh.renderOrder = 6;
        scene.add(this.pMesh);
        this.pPos = new Float32Array(MAX_P * 3);
        this.pVel = new Float32Array(MAX_P * 3);
        this.pLife = new Float32Array(MAX_P);
        this.pMax = new Float32Array(MAX_P);
        this.pSize = new Float32Array(MAX_P);
        this.pGrav = new Float32Array(MAX_P);
        this.pCol = new Float32Array(MAX_P * 3);
        this.pCount = 0;

        // ---- debris: chunks of real, lit stone that tumble and bounce ----
        this.cMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.62, 0), new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.95, envMapIntensity: 1.3, flatShading: true }), MAX_CHUNKS);
        this.cMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.cMesh.setColorAt(0, new THREE.Color());
        this.cMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.cMesh.frustumCulled = false;
        this.cMesh.count = 0;
        this.cMesh.castShadow = false;
        scene.add(this.cMesh);
        this.chunks = [];

        // ---- dust and smoke: soft puffs that grow and fade ----
        const pg = new THREE.InstancedBufferGeometry();
        pg.index = quad.index;
        pg.setAttribute('position', quad.attributes.position);
        pg.setAttribute('uv', quad.attributes.uv);
        this.dPos = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PUFFS * 4), 4).setUsage(THREE.DynamicDrawUsage);
        this.dCol = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PUFFS * 4), 4).setUsage(THREE.DynamicDrawUsage);
        pg.setAttribute('dPos', this.dPos);
        pg.setAttribute('dCol', this.dCol);
        pg.instanceCount = 0;
        this.dMesh = new THREE.Mesh(pg, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, fog: false, toneMapped: false,
            uniforms: { map: { value: puffTexture() } },
            vertexShader: `attribute vec4 dPos; attribute vec4 dCol; varying vec2 vUv; varying vec4 vC;
                void main(){ vUv = uv; vC = dCol; vec4 c = viewMatrix * vec4(dPos.xyz, 1.0); c.xy += position.xy * dPos.w; gl_Position = projectionMatrix * c; }`,
            fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec4 vC;
                void main(){ float a = texture2D(map, vUv).a; gl_FragColor = vec4(vC.rgb, a * vC.a);
                  #include <colorspace_fragment>
                }`
        }));
        this.dMesh.frustumCulled = false;
        this.dMesh.renderOrder = 4;
        scene.add(this.dMesh);
        this.puffs = [];

        // ---- ground cracks left by big slams ----
        const crack = canvasTexture(256, 256, (ctx, w) => {
            ctx.translate(w / 2, w / 2);
            let seed = 3; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
            const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
            g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.32, 'rgba(0,0,0,0.42)'); g.addColorStop(0.8, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(-w / 2, -w / 2, w, w);
            ctx.strokeStyle = 'rgba(0,0,0,0.95)'; ctx.lineCap = 'round';
            for (let i = 0; i < 13; i++) {
                let a = i / 13 * Math.PI * 2 + rnd() * 0.4, r = w * 0.05, x = Math.cos(a) * r, y = Math.sin(a) * r;
                ctx.lineWidth = 3.4;
                ctx.beginPath(); ctx.moveTo(x, y);
                while (r < w * (0.28 + rnd() * 0.2)) {
                    r += 8 + rnd() * 12; a += (rnd() - 0.5) * 0.5; x = Math.cos(a) * r; y = Math.sin(a) * r;
                    ctx.lineTo(x, y); ctx.lineWidth = Math.max(0.6, ctx.lineWidth * 0.85);
                }
                ctx.stroke();
            }
        });
        const dg = new THREE.PlaneGeometry(2, 2);
        dg.rotateX(-Math.PI / 2);
        this.decals = [];
        for (let i = 0; i < MAX_DECALS; i++) {
            const m = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: crack, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, toneMapped: false }));
            m.visible = false;
            m.renderOrder = 2;
            scene.add(m);
            this.decals.push({ mesh: m, life: 0 });
        }
        this.decalIdx = 0;

        // ---- weapon trails: a ribbon per fighter, from the weapon's tip to its middle ----
        this.trails = new Map();
        this.trailPool = [];
        const _idx = [];
        for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; _idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        for (let i = 0; i < MAX_TRAILS; i++) {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 6), 3).setUsage(THREE.DynamicDrawUsage));
            g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_N * 6), 3).setUsage(THREE.DynamicDrawUsage));
            g.setIndex(_idx);
            const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
            m.frustumCulled = false;
            m.visible = false;
            m.renderOrder = 7;
            scene.add(m);
            this.trailPool.push({ mesh: m, tip: new Float32Array(TRAIL_N * 3), base: new Float32Array(TRAIL_N * 3), age: new Float32Array(TRAIL_N), n: 0, owner: null, colA: new THREE.Color(), colB: new THREE.Color(), key: '' });
        }
        this._tip = new THREE.Vector3(); this._base = new THREE.Vector3();

        // ---- shockwave / wind rings ----
        this.rings = [];
        const ringGeo = new THREE.PlaneGeometry(2, 2);
        ringGeo.rotateX(-Math.PI / 2);
        for (let i = 0; i < MAX_RINGS; i++) {
            const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: THREE.AdditiveBlending, toneMapped: false }));
            m.visible = false;
            m.renderOrder = 5;
            scene.add(m);
            this.rings.push({ mesh: m, life: 0, max: 1, r0: 1, r1: 4, vertical: false });
        }

        // ---- lightning bolts ----
        this.bolts = [];
        for (let i = 0; i < 3; i++) {
            const g = new THREE.Group();
            const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.6, 1.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
            for (let k = 0; k < 6; k++) {
                const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.2, 0.22), mat);
                g.add(seg);
            }
            const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff2a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
            glow.scale.set(6, 6, 1);
            g.add(glow);
            g.visible = false;
            scene.add(g);
            this.bolts.push({ group: g, mat, life: 0 });
        }

        // ---- floating text ----
        this.texts = [];
        for (let i = 0; i < MAX_TEXT; i++) {
            const el = document.createElement('div');
            el.className = 'fx-text';
            el.style.display = 'none';
            layer.appendChild(el);
            this.texts.push({ el, x: 0, y: 0, z: 0, life: 0, max: 1, vy: 1.6 });
        }
        this.textIdx = 0;

        this.shakeAmt = 0;
        this.shakeT = 0;
        this.shakeX = 0; this.shakeY = 0;
        this.speedLines = 0;
        this._v = new THREE.Vector3();
        this._m = new THREE.Matrix4();
        this._q = new THREE.Quaternion();
        this._e = new THREE.Euler();
        this._s = new THREE.Vector3();
        this._c = new THREE.Color();
    }

    // ---------- particles ----------
    // Small and quick means sparks; big means real chunks of something
    emit(x, y, z, n, color, speed = 6, size = 0.12, life = 0.6, grav = -18, upBias = 0.4) {
        if (size >= 0.125 && grav <= -8) { this.emitChunks(x, y, z, n, color, speed, size, life, grav, upBias); return; }
        this._c.set(color);
        for (let i = 0; i < n; i++) {
            if (this.pCount >= MAX_P) return;
            const k = this.pCount++;
            this.pPos[k * 3] = x; this.pPos[k * 3 + 1] = y; this.pPos[k * 3 + 2] = z;
            // random direction, biased upward
            let dx = Math.random() * 2 - 1, dy = Math.random() * 2 - 1 + upBias, dz = Math.random() * 2 - 1;
            const l = Math.hypot(dx, dy, dz) || 1;
            const s = speed * (0.4 + Math.random() * 0.8);
            this.pVel[k * 3] = dx / l * s; this.pVel[k * 3 + 1] = dy / l * s; this.pVel[k * 3 + 2] = dz / l * s;
            this.pLife[k] = this.pMax[k] = life * (0.6 + Math.random() * 0.6);
            this.pSize[k] = size * (0.8 + Math.random() * 0.9);
            this.pGrav[k] = grav;
            const j = 0.85 + Math.random() * 0.3;
            this.pCol[k * 3] = this._c.r * j; this.pCol[k * 3 + 1] = this._c.g * j; this.pCol[k * 3 + 2] = this._c.b * j;
        }
    }

    emitChunks(x, y, z, n, color, speed, size, life, grav, upBias) {
        this._c.set(color);
        for (let i = 0; i < n; i++) {
            if (this.chunks.length >= MAX_CHUNKS) return;
            const a = Math.random() * Math.PI * 2;
            const hs = speed * (0.3 + Math.random() * 0.7);
            const j = 0.8 + Math.random() * 0.4;
            this.chunks.push({
                x, y, z, vx: Math.cos(a) * hs, vy: (Math.random() + upBias) * speed * 0.8, vz: Math.sin(a) * hs,
                life: life * (0.7 + Math.random() * 0.6), max: life, size: size * (0.5 + Math.random() * 0.9), grav,
                rx: Math.random() * 6, ry: Math.random() * 6, sr: 3 + Math.random() * 8, r: this._c.r * j, g: this._c.g * j, b: this._c.b * j, floor: y - 0.6
            });
        }
    }

    // A flat burst along the ground (shockwave debris), with dust and, on big ones, a crack in the floor
    groundBurst(x, y, z, n, color, speed, size) {
        this._c.set(color);
        const col = { r: this._c.r, g: this._c.g, b: this._c.b };
        for (let i = 0; i < n; i++) {
            if (this.chunks.length >= MAX_CHUNKS) break;
            const a = Math.random() * Math.PI * 2;
            const s = speed * (0.5 + Math.random() * 0.7);
            const j = 0.75 + Math.random() * 0.45;
            this.chunks.push({
                x: x + Math.cos(a) * 0.5, y: y + 0.1, z: z + Math.sin(a) * 0.5, vx: Math.cos(a) * s, vy: 3 + Math.random() * 7, vz: Math.sin(a) * s,
                life: 0.6 + Math.random() * 0.7, max: 1.2, size: size * (0.45 + Math.random() * 0.9), grav: -26,
                rx: Math.random() * 6, ry: Math.random() * 6, sr: 4 + Math.random() * 9, r: col.r * j, g: col.g * j, b: col.b * j, floor: y + 0.05
            });
        }
        const puffN = Math.min(10, 3 + (n >> 2));
        for (let i = 0; i < puffN; i++) {
            const a = Math.random() * Math.PI * 2, s = speed * (0.25 + Math.random() * 0.35);
            this.puff(x + Math.cos(a) * 0.6, y + 0.2, z + Math.sin(a) * 0.6, Math.cos(a) * s, 0.5 + Math.random() * 1.2, Math.sin(a) * s, 0.5 + size * 3, 0.5 + Math.random() * 0.5, col);
        }
        if (n >= 14) this.crack(x, y, z, 1.6 + n * 0.05);
    }

    puff(x, y, z, vx, vy, vz, size, life, col) {
        if (this.puffs.length >= MAX_PUFFS) this.puffs.shift();
        this.puffs.push({ x, y, z, vx, vy, vz, size, life, max: life, r: Math.min(1, col.r * 0.9 + 0.1), g: Math.min(1, col.g * 0.9 + 0.1), b: Math.min(1, col.b * 0.9 + 0.1) });
    }

    crack(x, y, z, r) {
        const d = this.decals[this.decalIdx];
        this.decalIdx = (this.decalIdx + 1) % MAX_DECALS;
        d.life = 5;
        d.mesh.position.set(x, y + 0.025, z);
        d.mesh.scale.set(r, 1, r);
        d.mesh.rotation.y = Math.random() * 6.28;
        d.mesh.material.opacity = 1;
        d.mesh.visible = true;
    }

    // ---------- weapon trails ----------
    // Call each frame for each visible fighter; f.trailId chooses the look (see trailStyle in character.js)
    trail(id, model, f) {
        let t = this.trails.get(id);
        const kind = model.trailPoints(f, this._tip, this._base);
        if (!kind) { if (t) t.active = false; return; }
        if (!t) {
            t = this.trailPool.find((p) => !p.owner);
            if (!t) return;
            t.owner = id; t.n = 0;
            this.trails.set(id, t);
        }
        const key = (f.trailId || '') + '|' + (f.glowId || '');
        if (t.key !== key) {
            const S = trailStyle(f.trailId, f.glowId);
            t.colA.set(S.a); t.colB.set(S.b);
            t.key = key;
        }
        t.active = true;
        // newest sample at the front
        t.tip.copyWithin(3, 0, (TRAIL_N - 1) * 3); t.base.copyWithin(3, 0, (TRAIL_N - 1) * 3); t.age.copyWithin(1, 0, TRAIL_N - 1);
        t.tip[0] = this._tip.x; t.tip[1] = this._tip.y; t.tip[2] = this._tip.z;
        t.base[0] = this._base.x; t.base[1] = this._base.y; t.base[2] = this._base.z;
        t.age[0] = 0;
        t.n = Math.min(TRAIL_N, t.n + 1);
    }

    updateTrails(dt) {
        for (const t of this.trailPool) {
            if (!t.owner) continue;
            let live = 0;
            for (let i = 0; i < t.n; i++) { t.age[i] += dt; if (t.age[i] < 0.28) live++; }
            if (!t.active && live === 0) {
                t.mesh.visible = false;
                this.trails.delete(t.owner);
                t.owner = null; t.n = 0;
                continue;
            }
            const p = t.mesh.geometry.attributes.position.array, c = t.mesh.geometry.attributes.color.array;
            for (let i = 0; i < TRAIL_N; i++) {
                const j = Math.min(i, t.n - 1);
                const k = 1 - Math.min(1, t.age[j] / 0.28);
                const v = k * k * 2.4 * (i < t.n ? 1 : 0);
                p[i * 6] = t.tip[j * 3]; p[i * 6 + 1] = t.tip[j * 3 + 1]; p[i * 6 + 2] = t.tip[j * 3 + 2];
                p[i * 6 + 3] = t.base[j * 3]; p[i * 6 + 4] = t.base[j * 3 + 1]; p[i * 6 + 5] = t.base[j * 3 + 2];
                const mx = i / (TRAIL_N - 1);
                c[i * 6] = (t.colA.r + (t.colB.r - t.colA.r) * mx) * v; c[i * 6 + 1] = (t.colA.g + (t.colB.g - t.colA.g) * mx) * v; c[i * 6 + 2] = (t.colA.b + (t.colB.b - t.colA.b) * mx) * v;
                // the inner edge is dim, so the ribbon fades toward the weapon's middle
                c[i * 6 + 3] = c[i * 6] * 0.12; c[i * 6 + 4] = c[i * 6 + 1] * 0.12; c[i * 6 + 5] = c[i * 6 + 2] * 0.12;
            }
            t.mesh.geometry.attributes.position.needsUpdate = true;
            t.mesh.geometry.attributes.color.needsUpdate = true;
            t.mesh.visible = t.n > 1;
        }
    }

    // ---------- rings ----------
    ring(x, y, z, r0, r1, life, color, vertical = false, yaw = 0, pitch = 0) {
        let best = this.rings[0];
        for (const r of this.rings) { if (r.life <= 0) { best = r; break; } if (r.life < best.life) best = r; }
        best.life = best.max = life;
        best.r0 = r0; best.r1 = r1;
        best.mesh.position.set(x, y, z);
        best.mesh.material.color.set(color).multiplyScalar(2.2);
        best.mesh.rotation.set(vertical ? Math.PI / 2 + pitch : 0, yaw, 0, 'YXZ');
        best.mesh.visible = true;
    }

    bolt(x, y, z) {
        const b = this.bolts.find(b => b.life <= 0) || this.bolts[0];
        b.life = 0.35;
        b.group.position.set(x, y, z);
        let cx = 0, cz = 0;
        for (let k = 0; k < 6; k++) {
            const seg = b.group.children[k];
            const nx = (Math.random() - 0.5) * 1.2, nz = (Math.random() - 0.5) * 1.2;
            seg.position.set((cx + nx) / 2, 2 + k * 3.9, (cz + nz) / 2);
            seg.rotation.set((nz - cz) * 0.25, 0, -(nx - cx) * 0.25);
            cx = nx; cz = nz;
        }
        b.group.children[6].position.set(0, 0.8, 0);
        b.group.visible = true;
    }

    // ---------- floating text ----------
    text(x, y, z, str, color, big = false) {
        const t = this.texts[this.textIdx];
        this.textIdx = (this.textIdx + 1) % MAX_TEXT;
        t.x = x; t.y = y; t.z = z;
        t.life = t.max = big ? 1.1 : 0.85;
        t.vy = big ? 1.4 : 1.9;
        t.el.textContent = str;
        t.el.style.color = color;
        t.el.className = big ? 'fx-text big' : 'fx-text';
        t.el.style.display = 'block';
    }

    shake(amount, time = 0.25) {
        const a = this.reduced ? amount * 0.25 : amount;
        if (a > this.shakeAmt * (this.shakeT > 0 ? 1 : 0)) { this.shakeAmt = a; this.shakeT = time; }
    }

    update(dt, width, height) {
        // sparks
        let n = this.pCount;
        for (let k = 0; k < n; k++) {
            this.pLife[k] -= dt;
            if (this.pLife[k] <= 0) {
                n--;
                this.copyParticle(n, k);
                k--;
                continue;
            }
            const i3 = k * 3;
            this.pVel[i3 + 1] += this.pGrav[k] * dt;
            this.pPos[i3] += this.pVel[i3] * dt;
            this.pPos[i3 + 1] += this.pVel[i3 + 1] * dt;
            this.pPos[i3 + 2] += this.pVel[i3 + 2] * dt;
        }
        this.pCount = n;
        const P = this.iPos.array, V = this.iVel.array, C = this.iCol.array;
        for (let k = 0; k < n; k++) {
            const i3 = k * 3, i4 = k * 4, f = this.pLife[k] / this.pMax[k];
            P[i3] = this.pPos[i3]; P[i3 + 1] = this.pPos[i3 + 1]; P[i3 + 2] = this.pPos[i3 + 2];
            V[i3] = this.pVel[i3]; V[i3 + 1] = this.pVel[i3 + 1]; V[i3 + 2] = this.pVel[i3 + 2];
            C[i4] = this.pCol[i3] * f; C[i4 + 1] = this.pCol[i3 + 1] * f; C[i4 + 2] = this.pCol[i3 + 2] * f;
            C[i4 + 3] = this.pSize[k] * Math.min(1, f * 2);
        }
        this.pMesh.geometry.instanceCount = n;
        this.pMesh.visible = n > 0;
        if (n) { this.iPos.needsUpdate = true; this.iVel.needsUpdate = true; this.iCol.needsUpdate = true; }

        // debris
        let w = 0;
        for (let i = 0; i < this.chunks.length; i++) {
            const q = this.chunks[i];
            q.life -= dt;
            if (q.life <= 0) continue;
            q.vy += q.grav * dt;
            q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
            if (q.y < q.floor && q.vy < 0) { q.y = q.floor; q.vy *= -0.42; q.vx *= 0.7; q.vz *= 0.7; q.sr *= 0.6; }
            q.rx += q.sr * dt; q.ry += q.sr * 0.7 * dt;
            this.chunks[w++] = q;
            const s = q.size * Math.min(1, q.life * 4);
            this._e.set(q.rx, q.ry, 0);
            this._q.setFromEuler(this._e);
            this._v.set(q.x, q.y, q.z);
            this._s.set(s, s * 0.8, s);
            this._m.compose(this._v, this._q, this._s);
            this.cMesh.setMatrixAt(w - 1, this._m);
            this._c.setRGB(q.r, q.g, q.b);
            this.cMesh.setColorAt(w - 1, this._c);
        }
        this.chunks.length = w;
        this.cMesh.count = w;
        this.cMesh.visible = w > 0;
        if (w) { this.cMesh.instanceMatrix.needsUpdate = true; this.cMesh.instanceColor.needsUpdate = true; }

        // dust
        w = 0;
        const DP = this.dPos.array, DC = this.dCol.array;
        for (let i = 0; i < this.puffs.length; i++) {
            const q = this.puffs[i];
            q.life -= dt;
            if (q.life <= 0) continue;
            q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
            q.vx *= 1 - dt * 2.2; q.vz *= 1 - dt * 2.2;
            q.size += dt * 2.2;
            this.puffs[w] = q;
            const f = q.life / q.max;
            DP[w * 4] = q.x; DP[w * 4 + 1] = q.y; DP[w * 4 + 2] = q.z; DP[w * 4 + 3] = q.size;
            DC[w * 4] = q.r; DC[w * 4 + 1] = q.g; DC[w * 4 + 2] = q.b; DC[w * 4 + 3] = f * f * 0.65;
            w++;
        }
        this.puffs.length = w;
        this.dMesh.geometry.instanceCount = w;
        this.dMesh.visible = w > 0;
        if (w) { this.dPos.needsUpdate = true; this.dCol.needsUpdate = true; }

        // cracks fade after a while
        for (const d of this.decals) {
            if (d.life <= 0) continue;
            d.life -= dt;
            d.mesh.material.opacity = Math.min(1, d.life / 1.5);
            if (d.life <= 0) d.mesh.visible = false;
        }
        this.updateTrails(dt);

        // rings
        for (const r of this.rings) {
            if (r.life <= 0) continue;
            r.life -= dt;
            if (r.life <= 0) { r.mesh.visible = false; continue; }
            const t = 1 - r.life / r.max;
            const e = 1 - (1 - t) * (1 - t);
            const rad = r.r0 + (r.r1 - r.r0) * e;
            r.mesh.scale.set(rad, rad, rad);
            r.mesh.material.opacity = (1 - t) * 0.95;
        }
        for (const b of this.bolts) {
            if (b.life <= 0) continue;
            b.life -= dt;
            b.mat.opacity = Math.max(0, b.life / 0.35) * (0.6 + Math.random() * 0.4);
            if (b.life <= 0) b.group.visible = false;
        }

        // text
        for (const t of this.texts) {
            if (t.life <= 0) continue;
            t.life -= dt;
            if (t.life <= 0) { t.el.style.display = 'none'; continue; }
            t.y += t.vy * dt;
            this._v.set(t.x, t.y, t.z).project(this.camera);
            if (this._v.z > 1) { t.el.style.display = 'none'; continue; }
            t.el.style.display = 'block';
            const sx = (this._v.x * 0.5 + 0.5) * width, sy = (-this._v.y * 0.5 + 0.5) * height;
            const k = t.life / t.max;
            const pop = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
            t.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -50%) scale(${pop.toFixed(2)})`;
            t.el.style.opacity = Math.min(1, k * 2.5).toFixed(2);
        }

        // shake
        if (this.shakeT > 0) {
            this.shakeT -= dt;
            const a = this.shakeAmt * Math.max(0, this.shakeT) * 4;
            this.shakeX = (Math.random() * 2 - 1) * a * 0.02;
            this.shakeY = (Math.random() * 2 - 1) * a * 0.02;
            if (this.shakeT <= 0) { this.shakeX = this.shakeY = 0; this.shakeAmt = 0; }
        }
    }

    copyParticle(from, to) {
        if (from === to) return;
        for (let j = 0; j < 3; j++) {
            this.pPos[to * 3 + j] = this.pPos[from * 3 + j];
            this.pVel[to * 3 + j] = this.pVel[from * 3 + j];
            this.pCol[to * 3 + j] = this.pCol[from * 3 + j];
        }
        this.pLife[to] = this.pLife[from]; this.pMax[to] = this.pMax[from];
        this.pSize[to] = this.pSize[from]; this.pGrav[to] = this.pGrav[from];
    }

    clear() {
        this.pCount = 0;
        this.pMesh.geometry.instanceCount = 0;
        this.pMesh.visible = false;
        this.chunks.length = 0; this.cMesh.count = 0; this.cMesh.visible = false;
        this.puffs.length = 0; this.dMesh.geometry.instanceCount = 0; this.dMesh.visible = false;
        for (const d of this.decals) { d.life = 0; d.mesh.visible = false; }
        for (const t of this.trailPool) { t.owner = null; t.n = 0; t.active = false; t.mesh.visible = false; }
        this.trails.clear();
        for (const r of this.rings) { r.life = 0; r.mesh.visible = false; }
        for (const b of this.bolts) { b.life = 0; b.group.visible = false; }
        for (const t of this.texts) { t.life = 0; t.el.style.display = 'none'; }
        this.shakeT = 0; this.shakeX = this.shakeY = 0;
    }
}
