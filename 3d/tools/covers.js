// ==========================================
// Store-page covers, rendered from the game itself.
// Open the game (http://localhost:8000/3d/), then in the browser console:
//     const m = await import('./tools/covers.js'); await m.downloadCovers(window.__sma);
// It saves cover-landscape.png (1920x1080), cover-portrait.png (800x1200) and
// cover-square.png (800x800). CrazyGames' rules: the title is the only text,
// no borders, logos or "Play now".
// ==========================================

import * as THREE from 'three';
import { CharacterModel } from '../src/character.js';

const SIZES = {
    landscape: { w: 1920, h: 1080, cam: [7.5, 2.2, 9.5], look: [-1.6, 3.6, 1.5], fov: 42, title: 'left' },
    portrait:  { w: 800,  h: 1200, cam: [5.6, 4.2, 10.5], look: [0.25, 4.6, 1.5], fov: 60, title: 'top' },
    square:    { w: 800,  h: 800,  cam: [7.4, 3.9, 11.5], look: [0.25, 5.0, 1.5], fov: 58, title: 'top' }
};

function pose(model, f, dt = 0.016) {
    for (let i = 0; i < 30; i++) model.animate(f, dt, i * dt);
}

// Build the posed scene once: the hero slamming down on a rival
function stage(game) {
    game.useLayout('colosseum');
    game.arena.setTheme('sunset', game.scene, game.hemi, game.sun);
    const hero = new CharacterModel('steve', '#4aa3ff', 'sun');
    hero.root.position.set(-0.4, 4.6, 2.2);
    hero.root.rotation.set(-0.35, -2.25, 0.12, 'YXZ'); // face the camera, leaning into the slam
    pose(hero, { vel: { x: 0, y: -20, z: 0 }, onGround: false, dashT: 0, spearCd: 0, slamming: true, swingT: 0, parryT: 0, glide: false, pitch: 0.5, bigScale: 1, stunT: 0 });
    const rival = new CharacterModel('noob', '#ff5a4a', 'ember');
    rival.root.position.set(0.9, 0, 0.6);
    rival.root.rotation.set(-0.12, 2.6, 0.08);
    pose(rival, { vel: { x: 3, y: 0, z: 0 }, onGround: true, dashT: 0.1, spearCd: 0, slamming: false, swingT: 0, parryT: 0, glide: false, pitch: 0.35, bigScale: 1, stunT: 0.2 });
    game.scene.add(hero.root, rival.root);
    // shockwave and debris under the rival
    const fx = game.fx;
    fx.clear();
    fx.ring(0.9, 0.08, 0.6, 0.5, 5.5, 1, '#ffb43a');
    fx.ring(0.9, 0.12, 0.6, 0.3, 3.2, 1, '#fff1b0');
    fx.groundBurst(0.9, 0, 0.6, 30, '#b9ab95', 8, 0.22);
    fx.emit(0.9, 1.2, 0.6, 30, '#ffd27a', 7, 0.12, 2, -2, 0.6);
    fx.emit(-0.4, 5.3, 2.2, 14, '#5ff3ff', 3, 0.09, 2, 0, 0);
    fx.update(0.18, 100, 100);
    return () => { game.scene.remove(hero.root, rival.root); hero.dispose(); rival.dispose(); fx.clear(); };
}

function drawTitle(ctx, w, h, where) {
    const big = where === 'left' ? h * 0.17 : Math.min(w * 0.15, h * 0.1);
    const x = where === 'left' ? w * 0.06 : w / 2;
    const y = where === 'left' ? h * 0.36 : big * 1.05;
    ctx.textAlign = where === 'left' ? 'left' : 'center';
    ctx.textBaseline = 'alphabetic';
    const line = (text, size, yy, fill, stroke) => {
        ctx.font = `${size}px 'Lilita One', 'Fredoka', sans-serif`;
        ctx.lineJoin = 'round';
        ctx.lineWidth = size * 0.14;
        ctx.strokeStyle = stroke;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = size * 0.2;
        ctx.shadowOffsetY = size * 0.06;
        ctx.strokeText(text, x, yy);
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = fill;
        ctx.fillText(text, x, yy);
    };
    if (where === 'left') {
        line('SPEAR', big, y, '#eef5ff', '#1b2a5c');
        line('MACE', big, y + big * 0.95, '#ffcf3a', '#5c2d00');
        line('SKY ARENA', big * 0.36, y + big * 1.5, '#ffffff', '#1b2a5c');
    } else {
        line('SPEAR', big, y, '#eef5ff', '#1b2a5c');
        line('MACE', big, y + big * 0.95, '#ffcf3a', '#5c2d00');
        line('SKY ARENA', big * 0.36, y + big * 1.5, '#ffffff', '#1b2a5c');
    }
}

// Returns { landscape, portrait, square } as PNG data URLs
export async function renderCovers(game) {
    await document.fonts.load("100px 'Lilita One'");
    const r = game.renderer;
    const oldSize = new THREE.Vector2();
    r.getSize(oldSize);
    const oldDpr = r.getPixelRatio();
    const unstage = stage(game);
    const cam = new THREE.PerspectiveCamera(45, 1, 0.05, 900);
    const out = {};
    for (const [name, s] of Object.entries(SIZES)) {
        r.setPixelRatio(1);
        r.setSize(s.w, s.h, false);
        cam.aspect = s.w / s.h;
        cam.fov = s.fov;
        cam.position.set(...s.cam);
        cam.lookAt(...s.look);
        cam.updateProjectionMatrix();
        game.arena.setPointScale(s.h);
        r.clear();
        r.render(game.scene, cam);
        const c = document.createElement('canvas');
        c.width = s.w; c.height = s.h;
        const ctx = c.getContext('2d');
        ctx.drawImage(r.domElement, 0, 0, s.w, s.h);
        // soft vignette so the title reads
        const g = where => where === 'left' ? ctx.createLinearGradient(0, 0, s.w * 0.6, 0) : ctx.createLinearGradient(0, 0, 0, s.h * 0.5);
        const grad = g(s.title);
        grad.addColorStop(0, 'rgba(10,20,50,0.45)');
        grad.addColorStop(1, 'rgba(10,20,50,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s.w, s.h);
        drawTitle(ctx, s.w, s.h, s.title);
        out[name] = c.toDataURL('image/png');
    }
    unstage();
    r.setPixelRatio(oldDpr);
    r.setSize(oldSize.x, oldSize.y, false);
    game.resize();
    return out;
}

export async function downloadCovers(game) {
    const covers = await renderCovers(game);
    for (const [name, url] of Object.entries(covers)) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `cover-${name}.png`;
        a.click();
    }
}
