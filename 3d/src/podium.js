// ==========================================
// The lobby's podium: a stone drum with a gold rim and a ring of light in your
// weapon's glow colour, a soft beam of light, and a ribbon that shows your trail.
// It only exists in the lobby and adds no real lights, so the game never has to
// rebuild its shaders when a match starts.
// ==========================================

import * as THREE from 'three';

let beamTex = null;
function beamTexture() {
    if (beamTex) return beamTex;
    const c = document.createElement('canvas');
    c.width = 4; c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.1)');
    g.addColorStop(1, 'rgba(255,255,255,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
    beamTex = new THREE.CanvasTexture(c);
    beamTex.colorSpace = THREE.SRGBColorSpace;
    return beamTex;
}

let poolTex = null;
function poolTexture() {
    if (poolTex) return poolTex;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 18, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.28)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    poolTex = new THREE.CanvasTexture(c);
    poolTex.colorSpace = THREE.SRGBColorSpace;
    return poolTex;
}

const glowMat = (color, opts) => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, ...opts });

// A flat ribbon curling around the fighter, bright at the head and fading to nothing
function buildRibbon(c1, c2) {
    const N = 42, pos = [], col = [], idx = [];
    const a = new THREE.Color(c1), b = new THREE.Color(c2), tmp = new THREE.Color();
    for (let i = 0; i <= N; i++) {
        const k = i / N, ang = k * Math.PI * 1.7;
        const r = 0.95, y = k * 0.5, w = 0.2 * (1 - k) + 0.02;
        const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
        pos.push(x, y - w, z, x, y + w, z);
        tmp.copy(a).lerp(b, k);
        const alpha = (1 - k) ** 1.2;
        col.push(tmp.r, tmp.g, tmp.b, alpha, tmp.r, tmp.g, tmp.b, alpha);
        if (i < N) { const v = i * 2; idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); // the fourth number fades it out
    geo.setIndex(idx);
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
}

// The top of the podium is at y = 0 in this group. Returns { group, height, update(time, showTrail) }
export function buildPodium(glowColor, trail) {
    const group = new THREE.Group();
    const H = 0.62;
    const add = (geo, mat, y, cast = true) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.y = y;
        m.castShadow = cast; m.receiveShadow = true;
        group.add(m);
        return m;
    };
    const stone = new THREE.MeshLambertMaterial({ color: 0x34478a, flatShading: true });
    const stoneTop = new THREE.MeshLambertMaterial({ color: 0x5068c4, flatShading: true });
    const gold = new THREE.MeshLambertMaterial({ color: 0xffc23a, emissive: 0x7a4a00, flatShading: true });
    add(new THREE.CylinderGeometry(1.32, 1.5, 0.24, 16), stone, -H + 0.12);
    add(new THREE.CylinderGeometry(1.06, 1.24, 0.3, 16), stone, -H + 0.39);
    add(new THREE.CylinderGeometry(1.1, 1.1, 0.05, 16), gold, -0.055);
    add(new THREE.CylinderGeometry(1.0, 1.04, 0.05, 16), stoneTop, -0.02);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.03, 6, 40), glowMat(glowColor, { opacity: 1 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.012;
    group.add(ring);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.43, 0.028, 6, 40), glowMat(glowColor, { opacity: 0.75 }));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -H + 0.25;
    group.add(rim);

    // a pool of light under the fighter and on the ground around the podium
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), glowMat(0xfff2d0, { map: poolTexture(), opacity: 0.55 }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.006;
    group.add(pool);
    const groundGlow = new THREE.Mesh(new THREE.CircleGeometry(3.0, 28), glowMat(glowColor, { map: poolTexture(), opacity: 0.5 }));
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.position.y = -H + 0.012;
    group.add(groundGlow);

    // the beam of light from above
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.86, 4.0, 24, 1, true), glowMat(0xfff4dc, { map: beamTexture(), opacity: 0.2, side: THREE.DoubleSide }));
    beam.position.y = 2.0;
    group.add(beam);

    const ribbon = buildRibbon(trail[0], trail[1]);
    group.add(ribbon);
    ribbon.visible = false;

    return {
        group,
        height: H,
        update(time, showTrail) {
            ring.material.opacity = 0.8 + Math.sin(time * 2.4) * 0.2;
            ribbon.visible = !!showTrail;
            if (showTrail) {
                ribbon.rotation.y = -time * 3.2;
                ribbon.position.y = 0.5 + Math.sin(time * 1.4) * 0.3;
            }
        }
    };
}
