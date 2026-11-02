// ==========================================
// Store-page preview video, recorded from the game itself (silent WebM).
// Open the game, then in the browser console:
//     const v = await import('./tools/preview-video.js');
//     await v.downloadPreview(window.__sma, 1920, 1080);   // landscape
//     await v.downloadPreview(window.__sma, 1080, 1620);   // portrait (2:3)
// It opens on the cover image, then shows about 18 s of a Pro bot brawl, with a
// camera that follows whoever is in the action. Keep the tab in front while it records.
// ==========================================

import * as THREE from 'three';
import { BotBrain } from '../src/bot.js';
import { SIM_DT } from '../src/config.js';
import { renderCovers } from './covers.js';

const yieldNow = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = r; c.port2.postMessage(0); });

export async function recordPreview(game, w, h, seconds = 18) {
    const covers = await renderCovers(game);
    const coverImg = new Image();
    coverImg.src = w > h ? covers.landscape : covers.portrait;
    await coverImg.decode();

    // a Pro brawl with our fighter played by a bot, filmed in third person
    const quality = game.settings.quality;
    game.settings.quality = 'high'; // no automatic resolution changes while recording
    game.ui.start({ mode: 'brawl', level: 'pro', layout: 'colosseum', theme: 'sunset' });
    const me = game.local;
    const brain = new BotBrain(me, 'pro', game);
    const fillBefore = game.input.fill;
    game.input.fill = (I) => { brain.fill(I, SIM_DT); game.look.yaw = I.yaw; game.look.pitch = Math.max(-0.35, Math.min(0.35, I.pitch)); };
    game.rig.mode = 'third';
    const r = game.renderer;
    const dpr = r.getPixelRatio();
    game.setRenderSize(w, h, 1);
    game.camera.aspect = w / h;
    game.rig.setAspect(w / h);
    game.camera.updateProjectionMatrix();
    me.invulnT = 3;

    const rec = document.createElement('canvas');
    rec.width = w; rec.height = h;
    const ctx = rec.getContext('2d');
    const stream = rec.captureStream(30);
    const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 9e6 });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((res) => { recorder.onstop = res; });
    recorder.start(500);

    // director camera: follows whoever was just in the action, circling slowly
    const cam = new THREE.PerspectiveCamera(w > h ? 55 : 68, w / h, 0.05, 900);
    let focus = null, focusT = 0, orbit = 0.6;
    const camPos = new THREE.Vector3(0, 6, 14), look = new THREE.Vector3(0, 1.5, 0);
    const emitBefore = game.emit.bind(game);
    game.emit = (name, a, ...rest) => {
        if ((name === 'hit' || name === 'shockwave' || name === 'dash' || name === 'slamStart') && a && a.alive && focusT > 2.2) { focus = a; focusT = 0; }
        return emitBefore(name, a, ...rest);
    };
    const pickFocus = () => {
        let best = null, bd = Infinity;
        for (const f of game.fighters) {
            if (!f.alive || f.pos.y < -3) continue;
            const d = Math.hypot(f.pos.x, f.pos.z);
            if (d < bd) { bd = d; best = f; }
        }
        return best;
    };

    const t0 = performance.now();
    let last = t0;
    game.lastFrame = t0;
    // skip the countdown so the action starts right after the cover
    game.introT = 0.01;
    while (performance.now() - t0 < seconds * 1000) {
        await yieldNow();
        const now = performance.now();
        if (now - last < 30) continue;
        last = now;
        const t = (now - t0) / 1000;
        if (t < 0.8) { ctx.drawImage(coverImg, 0, 0, w, h); game.lastFrame = now; continue; }
        if (game.state === 'over') break;
        game.frame(now);
        focusT += 0.033;
        if (!focus || !focus.alive || focus.pos.y < -3) { focus = pickFocus(); focusT = 0; }
        if (focus) {
            orbit += 0.006;
            const fx = focus.pos.x, fy = Math.max(0, focus.pos.y), fz = focus.pos.z;
            const want = new THREE.Vector3(fx + Math.cos(orbit) * 6.4, fy + 2.5, fz + Math.sin(orbit) * 6.4);
            camPos.lerp(want, 0.06);
            look.lerp(new THREE.Vector3(fx, fy + 1.3, fz), 0.12);
        }
        // don't film through pillars: stop short of anything between the fighter and the camera
        const dir = camPos.clone().sub(look);
        const full = dir.length();
        dir.normalize();
        const hit = game.physics.raycast(look.x, look.y, look.z, dir.x, dir.y, dir.z, full);
        cam.position.copy(look).addScaledVector(dir, Math.max(1.5, Math.min(full, hit - 0.4)));
        cam.lookAt(look);
        game.renderView(cam);
        ctx.drawImage(r.domElement, 0, 0, w, h);
        // a soft fade from the cover into gameplay
        if (t < 1.3) { ctx.globalAlpha = 1 - (t - 0.8) / 0.5; ctx.drawImage(coverImg, 0, 0, w, h); ctx.globalAlpha = 1; }
    }
    recorder.stop();
    await done;

    game.input.fill = fillBefore;
    game.emit = emitBefore;
    game.settings.quality = quality;
    r.setPixelRatio(dpr);
    game.quitToMenu();
    game.resize();
    return new Blob(chunks, { type: 'video/webm' });
}

export async function downloadPreview(game, w, h) {
    const blob = await recordPreview(game, w, h);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `preview-${w > h ? 'landscape' : 'portrait'}.webm`;
    a.click();
}
