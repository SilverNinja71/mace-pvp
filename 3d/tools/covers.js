// ==========================================
// Store-page covers, rendered from the game itself.
// Open the game (http://localhost:8000/3d/), then in the browser console:
//     const m = await import('./tools/covers.js'); await m.downloadCovers(window.__sma);
// It saves cover-landscape.png (1920x1080), cover-portrait.png (800x1200) and
// cover-square.png (800x800). CrazyGames' rules: the title is the only text,
// no borders, logos or "Play now".
// ==========================================

import * as THREE from 'three';
import { CharacterModel, preloadSkin } from '../src/character.js';

// Fighters fill the frame: the hero comes down from above with the mace, the rival braces underneath
const SIZES = {
    landscape: { w: 1920, h: 1080, cam: [-5.2, 0.9, 15.0], look: [-0.7, 2.05, 8.7], fov: 42, title: 'left' },
    portrait:  { w: 800,  h: 1200, cam: [-3.5, 0.8, 13.4], look: [0.7, 2.75, 10.0], fov: 62, title: 'top' },
    square:    { w: 800,  h: 800,  cam: [-4.1, 0.9, 14.0], look: [0.7, 2.55, 10.0], fov: 54, title: 'top' }
};

function pose(model, f, dt = 0.016) {
    for (let i = 0; i < 30; i++) model.animate(f, dt, i * dt);
}

// Build the posed scene once: the hero slamming down on a rival
function stage(game) {
    if (game.showcase) game.showcase.model.root.visible = false; // the lobby's own fighter and podium stay out of the picture
    game.useLayout('colosseum');
    game.arena.setTheme('sunset', game.scene, game.hemi, game.sun);
    const hero = new CharacterModel('steve', '#4aa3ff', 'sun');
    hero.root.position.set(0.1, 1.95, 10.5);
    hero.root.rotation.set(-0.25, 2.5, 0.08, 'YXZ'); // face the camera, leaning into the slam
    const heroPose = { vel: { x: 0, y: -20, z: 0 }, onGround: false, dashT: 0, spearCd: 0, slamming: true, swingT: 0, parryT: 0, glide: false, pitch: 0.5, bigScale: 1, stunT: 0 };
    pose(hero, heroPose);
    const rival = new CharacterModel('noob', '#ff5a4a', 'ember');
    rival.root.position.set(1.25, 0, 9.5);
    rival.root.rotation.set(-0.08, 2.05, 0.05);
    const rivalPose = { vel: { x: 3, y: 0, z: 0 }, onGround: true, dashT: 0.1, spearCd: 0, slamming: false, swingT: 0, parryT: 0, glide: false, pitch: 0.35, bigScale: 1, stunT: 0.2 };
    pose(rival, rivalPose);
    stage.repose = () => { pose(hero, heroPose); pose(rival, rivalPose); };
    game.scene.add(hero.root, rival.root);
    // shockwave and debris under the rival
    const fx = game.fx;
    fx.clear();
    fx.ring(1.25, 0.08, 9.5, 0.5, 3.6, 1, '#ffb43a');
    fx.groundBurst(1.25, 0, 9.5, 16, '#b9ab95', 5, 0.14);
    fx.emit(1.25, 1.1, 9.5, 22, '#ffd27a', 5, 0.08, 2, -2, 0.6);
    fx.emit(0.1, 2.9, 10.5, 12, '#5ff3ff', 2, 0.07, 2, 0, 0);
    fx.update(0.18, 100, 100);
    return () => { game.scene.remove(hero.root, rival.root); hero.dispose(); rival.dispose(); fx.clear(); if (game.showcase) game.showcase.model.root.visible = true; };
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
    await preloadSkin('steve'); await preloadSkin('noob');
    const r = game.renderer;
    const oldDpr = r.getPixelRatio();
    const unstage = stage(game);
    await new Promise((res) => { const c = new MessageChannel(); c.port1.onmessage = res; c.port2.postMessage(0); }); // let the models swap in
    if (stage.repose) stage.repose();
    const cam = new THREE.PerspectiveCamera(45, 1, 0.05, 900);
    const out = {};
    for (const [name, s] of Object.entries(SIZES)) {
        game.setRenderSize(s.w, s.h, 1);
        cam.aspect = s.w / s.h;
        cam.fov = s.fov;
        cam.position.set(...s.cam);
        cam.lookAt(...s.look);
        cam.updateProjectionMatrix();
        game.renderView(cam);
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
