// ==========================================
// Effects: pooled spark/debris particles (one instanced mesh), glowing
// shockwave rings, lightning bolts, floating damage numbers, screen shake
// and speed lines. Everything is allocated up front and reused.
// ==========================================

import * as THREE from 'three';
import { ringTexture, glowTexture } from './gfx.js';

const MAX_P = 500;
const MAX_RINGS = 14;
const MAX_TEXT = 24;

export class FX {
    constructor(scene, camera, layer) {
        this.scene = scene;
        this.camera = camera;
        this.layer = layer;
        this.reduced = false;

        // ---- particles: little voxel cubes ----
        const geo = new THREE.BoxGeometry(1, 1, 1);
        this.pMesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_P);
        this.pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.pMesh.setColorAt(0, new THREE.Color());
        this.pMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.pMesh.frustumCulled = false;
        this.pMesh.count = 0;
        scene.add(this.pMesh);
        this.pPos = new Float32Array(MAX_P * 3);
        this.pVel = new Float32Array(MAX_P * 3);
        this.pLife = new Float32Array(MAX_P);
        this.pMax = new Float32Array(MAX_P);
        this.pSize = new Float32Array(MAX_P);
        this.pGrav = new Float32Array(MAX_P);
        this.pCol = new Float32Array(MAX_P * 3);
        this.pRot = new Float32Array(MAX_P);
        this.pCount = 0;

        // ---- shockwave / wind rings ----
        this.rings = [];
        const ringGeo = new THREE.PlaneGeometry(2, 2);
        ringGeo.rotateX(-Math.PI / 2);
        for (let i = 0; i < MAX_RINGS; i++) {
            const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: ringTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
            m.visible = false;
            m.renderOrder = 5;
            scene.add(m);
            this.rings.push({ mesh: m, life: 0, max: 1, r0: 1, r1: 4, vertical: false });
        }

        // ---- lightning bolts ----
        this.bolts = [];
        for (let i = 0; i < 3; i++) {
            const g = new THREE.Group();
            const mat = new THREE.MeshBasicMaterial({ color: 0xfff6a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
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
    emit(x, y, z, n, color, speed = 6, size = 0.12, life = 0.6, grav = -18, upBias = 0.4) {
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
            this.pSize[k] = size * (0.6 + Math.random() * 0.8);
            this.pGrav[k] = grav;
            this.pRot[k] = Math.random() * 6;
            const j = 0.85 + Math.random() * 0.3;
            this.pCol[k * 3] = this._c.r * j; this.pCol[k * 3 + 1] = this._c.g * j; this.pCol[k * 3 + 2] = this._c.b * j;
        }
    }

    // A flat burst along the ground (shockwave debris)
    groundBurst(x, y, z, n, color, speed, size) {
        this._c.set(color);
        for (let i = 0; i < n; i++) {
            if (this.pCount >= MAX_P) return;
            const k = this.pCount++;
            const a = Math.random() * Math.PI * 2;
            const s = speed * (0.5 + Math.random() * 0.7);
            this.pPos[k * 3] = x + Math.cos(a) * 0.5; this.pPos[k * 3 + 1] = y + 0.1; this.pPos[k * 3 + 2] = z + Math.sin(a) * 0.5;
            this.pVel[k * 3] = Math.cos(a) * s; this.pVel[k * 3 + 1] = 3 + Math.random() * 7; this.pVel[k * 3 + 2] = Math.sin(a) * s;
            this.pLife[k] = this.pMax[k] = 0.5 + Math.random() * 0.6;
            this.pSize[k] = size * (0.6 + Math.random() * 0.9);
            this.pGrav[k] = -26;
            this.pRot[k] = Math.random() * 6;
            const j = 0.8 + Math.random() * 0.4;
            this.pCol[k * 3] = this._c.r * j; this.pCol[k * 3 + 1] = this._c.g * j; this.pCol[k * 3 + 2] = this._c.b * j;
        }
    }

    // ---------- rings ----------
    ring(x, y, z, r0, r1, life, color, vertical = false, yaw = 0, pitch = 0) {
        let best = this.rings[0];
        for (const r of this.rings) { if (r.life <= 0) { best = r; break; } if (r.life < best.life) best = r; }
        best.life = best.max = life;
        best.r0 = r0; best.r1 = r1;
        best.mesh.position.set(x, y, z);
        best.mesh.material.color.set(color);
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
        // particles
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
        for (let k = 0; k < n; k++) {
            const s = this.pSize[k] * Math.min(1, this.pLife[k] / this.pMax[k] * 2);
            this.pRot[k] += dt * 6;
            this._e.set(this.pRot[k], this.pRot[k] * 0.7, 0);
            this._q.setFromEuler(this._e);
            this._v.set(this.pPos[k * 3], this.pPos[k * 3 + 1], this.pPos[k * 3 + 2]);
            this._s.set(s, s, s);
            this._m.compose(this._v, this._q, this._s);
            this.pMesh.setMatrixAt(k, this._m);
            this._c.setRGB(this.pCol[k * 3], this.pCol[k * 3 + 1], this.pCol[k * 3 + 2]);
            this.pMesh.setColorAt(k, this._c);
        }
        this.pMesh.count = n;
        if (n) { this.pMesh.instanceMatrix.needsUpdate = true; this.pMesh.instanceColor.needsUpdate = true; }

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
        this.pSize[to] = this.pSize[from]; this.pGrav[to] = this.pGrav[from]; this.pRot[to] = this.pRot[from];
    }

    clear() {
        this.pCount = 0;
        this.pMesh.count = 0;
        for (const r of this.rings) { r.life = 0; r.mesh.visible = false; }
        for (const b of this.bolts) { b.life = 0; b.group.visible = false; }
        for (const t of this.texts) { t.life = 0; t.el.style.display = 'none'; }
        this.shakeT = 0; this.shakeX = this.shakeY = 0;
    }
}
