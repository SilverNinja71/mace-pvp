// ==========================================
// CameraRig: first-person or over-the-shoulder third-person (V toggles).
// The third-person camera pulls in when a pillar is behind you. The field
// of view kicks wider during spear dashes and fast falls. FOV settings are
// horizontal degrees (90 by default), converted for the screen shape.
// ==========================================

import * as THREE from 'three';

export class CameraRig {
    constructor(camera, physics) {
        this.cam = camera;
        this.physics = physics;
        this.mode = 'first';
        this.baseFov = 90;
        this.fovNow = 90;
        this.distNow = 3.8;
        this.aspect = 16 / 9;
        this.reduced = false;
        this.deathT = 0;
        this._look = new THREE.Vector3();
        this._right = new THREE.Vector3();
        this.cam.rotation.order = 'YXZ';
    }

    toggle() { this.mode = this.mode === 'first' ? 'third' : 'first'; return this.mode; }

    setAspect(a) { this.aspect = a; }

    applyFov(hDeg) {
        const v = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hDeg) / 2) / this.aspect);
        let vDeg = THREE.MathUtils.radToDeg(v);
        vDeg = Math.max(50, Math.min(100, vDeg)); // phones held upright would otherwise get a fisheye
        if (Math.abs(this.cam.fov - vDeg) > 0.01) { this.cam.fov = vDeg; this.cam.updateProjectionMatrix(); }
    }

    // pos: interpolated feet position of the followed fighter
    update(f, px, py, pz, yaw, pitch, dt, fx) {
        const cam = this.cam;
        const eyeH = 1.6 * (f.bigScale || 1);
        const cp = Math.cos(pitch);
        const look = this._look.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
        const right = this._right.set(Math.cos(yaw), 0, -Math.sin(yaw));
        const ex = px, ey = py + eyeH, ez = pz;

        // FOV kick: spear dash +15, falling fast up to +8
        let kick = 0;
        if (f.dashT > 0) kick = 15;
        else if (f.slamming) kick = 10;
        else if (f.vel.y < -18) kick = Math.min(8, (-f.vel.y - 18) * 0.3);
        if (this.reduced) kick *= 0.35;
        const target = this.baseFov + kick;
        this.fovNow += (target - this.fovNow) * Math.min(1, dt * (kick > this.fovNow - this.baseFov ? 18 : 6));
        this.applyFov(this.fovNow);

        if (!f.alive) {
            // knocked out: look at where it happened from a little above
            this.deathT += dt;
            const back = 5 + Math.min(4, this.deathT * 2);
            cam.position.set(ex - look.x * back, Math.max(ey, -20) + 2 + this.deathT, ez - look.z * back);
            cam.lookAt(ex, Math.max(ey, -24), ez);
            return;
        }
        this.deathT = 0;

        if (this.mode === 'first') {
            cam.position.set(ex, ey, ez);
        } else {
            // pivot over the right shoulder, then back along the look direction
            const bs = f.bigScale || 1;
            const sx = ex + right.x * 0.7 * bs, sy = ey + 0.35 * bs, sz = ez + right.z * 0.7 * bs;
            const want = 3.8 * bs;
            const hit = this.physics.raycast(sx, sy, sz, -look.x, -look.y, -look.z, want + 0.3) - 0.3;
            const d = Math.max(0.6, Math.min(want, hit));
            this.distNow = d < this.distNow ? d : this.distNow + (d - this.distNow) * Math.min(1, dt * 5);
            cam.position.set(sx - look.x * this.distNow, sy - look.y * this.distNow, sz - look.z * this.distNow);
        }
        cam.rotation.set(pitch, yaw, 0);
        if (fx.shakeX || fx.shakeY) {
            cam.position.x += right.x * fx.shakeX * 6;
            cam.position.z += right.z * fx.shakeX * 6;
            cam.position.y += fx.shakeY * 6;
            cam.rotation.z = fx.shakeX * 0.6;
        }
    }
}
