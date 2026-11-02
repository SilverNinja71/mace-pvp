// ==========================================
// Game: owns the scene, the fighters and the match. Physics runs in fixed
// 120 Hz steps (the same on every screen, 60 Hz or 144 Hz); drawing
// happens every frame, in between steps, using interpolated positions.
// ==========================================

import * as THREE from 'three';
import { SIM_DT, MATCH, CLASSES, CLASS_IDS, BOT_LEVELS, BOT_NAMES, TEAM_COLORS, HIT, PHYS, classHp } from './config.js';
import { Arena, LAYOUTS } from './arena.js';
import { Fighter, makeIntent } from './fighter.js';
import { Combat } from './combat.js';
import { BotBrain } from './bot.js';
import { FX } from './fx.js';
import { CameraRig } from './camera.js';
import { CharacterModel, ViewModel, SKINS, GLOWS, setCharacterQuality, preloadSkin, preloadAllSkins } from './character.js';
import { PostFX } from './post.js';
import { installHeightHaze } from './gfx.js';
import { audio } from './audio.js';
import { profile } from './profile.js';
import { crazyGames } from './crazygames.js';
import { missions } from './missions.js';
import { achievements } from './achievements.js';
import { t, tn } from './i18n.js';
import { buildPodium } from './podium.js';
import { trailColors, TRAILS } from './cosmetics.js';

// Mode names are in i18n.js (mode.<id>)
export const MODES = {
    quick:    { bots: 1, kos: MATCH.duelKOs, time: MATCH.timeLimit },
    duel:     { bots: 1, kos: MATCH.duelKOs, time: MATCH.timeLimit },
    brawl:    { bots: 3, kos: MATCH.brawlKOs, time: MATCH.timeLimit + 60 },
    gauntlet: { bots: 0, kos: 0, time: 0 },
    hill:     { bots: 3, kos: 0, time: MATCH.timeLimit, hill: 45 },
    stand:    { bots: 3, kos: 0, time: 0, lives: 2 },
    training: { bots: 1, kos: 0, time: 0 },
    online:   { bots: 0, kos: MATCH.duelKOs, time: MATCH.timeLimit }
};

// Low: no post-processing and no real shadows. Medium: fewer samples, a smaller shadow map that only shows the
// arena (fighters get soft blob shadows). High: everything. Auto quality starts here and steps down at runtime.
const QUALITY = {
    high:   { shadows: 2048, dynamicShadows: true,  maxDpr: 2,   post: true,  samples: 4 },
    medium: { shadows: 1024, dynamicShadows: false, maxDpr: 1.5, post: true,  samples: 2 },
    low:    { shadows: 0,    dynamicShadows: false, maxDpr: 1,   post: false, samples: 0 }
};

// Where the lobby's podium stands on each map, and which way the camera looks from there (radians: 0 = toward -z)
const LOBBY_SPOTS = {
    colosseum: { x: -10, z: -3, az: Math.PI * 5 / 9 },
    spires:    { x: -6,  z: 3,  az: Math.PI / 9 },
    ruins:     { x: -15, z: -3, az: Math.PI * 5 / 9 }
};
const LOBBY_DIST = 8;        // metres from camera to fighter
const LOBBY_MAX_TAN = 1.7;  // the widest the lens gets (about 120 degrees); after that the camera backs off
const LOBBY_PITCH = 0.06;   // looking slightly up

function lobbyForward(spot) { return { x: Math.sin(spot.az), z: -Math.cos(spot.az) }; }

const _v = new THREE.Vector3();
const GUEST_SENDS = new Set(['jump', 'windJump', 'dash', 'slamStart', 'swing', 'parryUp', 'land', 'pad', 'geyser', 'grow', 'vanish', 'reveal', 'blinkOut', 'blinkIn']);
const TUTORIAL_MOVES = new Set(['jump', 'windJump', 'dash', 'slamStart', 'swing', 'parryUp', 'land']);

export class Game {
    constructor(canvas, ui, input) {
        this.canvas = canvas;
        this.ui = ui;
        this.input = input;
        this.settings = Object.assign({ quality: 'auto', fov: 90, sens: 1, invertY: false, reducedMotion: false, sound: true, music: true, view: 'first', volMaster: 0.8, volSfx: 1, volMusic: 0.8 }, profile.settings);
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
        this.isMobile = isMobile;
        this.qualityName = this.settings.quality === 'auto' ? (isMobile ? 'medium' : 'high') : this.settings.quality;
        const q = QUALITY[this.qualityName];

        installHeightHaze();
        setCharacterQuality(this.qualityName);
        // the first screen's fighter comes first; phones then fetch the rest only as a match needs them
        if (isMobile) preloadSkin(profile.skinId); else preloadAllSkins(profile.skinId);
        // The HDR target does the antialiasing when post-processing is on, so the screen itself doesn't need it
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !q.post, powerPreference: 'high-performance', stencil: false });
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // only applies when drawing straight to the screen
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.autoClear = false;
        this.renderer.shadowMap.enabled = q.shadows > 0;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.maxDpr = Math.min(window.devicePixelRatio || 1, q.maxDpr);
        this.dpr = this.maxDpr;
        this.renderer.setPixelRatio(this.dpr);
        this.post = q.post && !/[?&]nopost\b/.test(location.search) ? new PostFX(this.renderer, { samples: q.samples, bloom: true }) : null;
        if (this.post && !this.post.supported) this.post = null;
        this.dynamicShadows = q.dynamicShadows;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0xd6e8fb, 60, 320);
        this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 1400);
        this.scene.add(this.camera);
        this.hemi = new THREE.HemisphereLight(0xe4f2ff, 0x8f7f70, 0.5);
        this.scene.add(this.hemi);
        this.sun = new THREE.DirectionalLight(0xfff0d8, 3);
        this.sun.position.set(-38, 70, -30);
        this.sun.target.position.set(0, 0, 0);
        this.scene.add(this.sun, this.sun.target);
        if (q.shadows) {
            this.sun.castShadow = true;
            this.sun.shadow.mapSize.set(q.shadows, q.shadows);
            const c = this.sun.shadow.camera;
            c.left = -60; c.right = 60; c.top = 60; c.bottom = -60; c.near = 10; c.far = 220;
            // enough bias that the stone doesn't shadow itself (the old shimmer on the pillars), small enough that nothing floats
            this.sun.shadow.bias = -0.0005;
            this.sun.shadow.normalBias = 0.08;
            this.sun.shadow.radius = q.shadows >= 2048 ? 3 : 2;
            // Medium draws the shadow map once per arena; High redraws it each frame so fighters cast too
            this.sun.shadow.autoUpdate = !!q.dynamicShadows;
        }

        this.arena = new Arena(this.scene, this.qualityName, 'colosseum', this.renderer);
        this.arena.setTheme('sunset', this.scene, this.hemi, this.sun);
        this.arena.onThunder = () => audio.play('thunder');
        this.physics = this.arena.physics;
        this.combat = new Combat(this);
        this.fx = new FX(this.scene, this.camera, document.getElementById('fx-layer'));
        this.fx.floorAt = (x, y, z) => this.physics.groundAt(x, z, 0.3, y + 0.3);
        this.rig = new CameraRig(this.camera, this.physics);
        this.rig.mode = this.settings.view === 'third' ? 'third' : 'first';
        this.viewModel = new ViewModel(profile.skinId, profile.glowId);
        this.arena.onEnv = (t) => { this.viewModel.scene.environment = t; };
        this.viewModel.scene.environment = this.scene.environment;
        this.applySettings();

        this.fighters = [];
        this.models = [];
        this.brains = [];
        this.intents = [];
        this.local = null;
        this.look = { yaw: 0, pitch: 0 };
        this.state = 'menu';       // menu | intro | play | paused | over
        this.mode = null;
        this.time = 0;
        this.acc = 0;
        this.hitstopT = 0;
        this.introT = 0;
        this.matchT = 0;
        this.suddenDeath = false;
        this.reviveUsed = false;
        this.reviveOffered = false;
        this.wave = 0;
        this.waveT = 0;
        this.lastFrame = performance.now();
        this.frameEMA = 16.7;
        this.slowT = 0; this.fastT = 0;
        this.tutorial = null;
        this.remote = null;        // online session glue (online.js), when playing online
        this.menuT = 0;

        crazyGames.onPause = (p) => { this.adPause = p; if (p && this.state === 'play') this.pause(); };
        window.addEventListener('resize', () => this.resize());
        canvas.addEventListener('webglcontextlost', (e) => e.preventDefault()); // lets the browser give the context back
        canvas.addEventListener('webglcontextrestored', () => { if (this.post) { this.post.watch.pbo = null; this.post.watch.fence = null; } this.resize(); });
        this.resize();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
        // Build every effect's shader in the background now, so the first hit of the first match doesn't freeze the game.
        // (Shaders differ by where they draw, so this has to happen with the HDR target bound.)
        const warm = (scene, camera, lights) => {
            const r = this.renderer;
            if (this.post && this.post.enabled) r.setRenderTarget(this.post.rt);
            let p = null;
            try { p = r.compileAsync(scene, camera, lights); } catch (e) { /* older browsers just compile on first use */ }
            r.setRenderTarget(null);
            return p || Promise.resolve();
        };
        setTimeout(() => {
            warm(this.scene, this.camera);
            warm(this.viewModel.scene, this.viewModel.camera);
        }, 200);
        // and a loaded fighter, solid and see-through (spawn shield, Shadow class): both are different shaders too
        preloadSkin(profile.skinId).then(() => {
            const pose = { vel: { x: 0, y: 0, z: 0 }, onGround: true, dashT: 0, spearCd: 0, slamming: false, swingT: 0, parryT: 0, glide: false, pitch: 0, bigScale: 1, stunT: 0, alive: true };
            const solid = new CharacterModel(profile.skinId, TEAM_COLORS[0], profile.glowId), ghost = new CharacterModel(profile.skinId, TEAM_COLORS[0], profile.glowId);
            solid.animate(pose, 0.016, 0); ghost.animate(pose, 0.016, 0);
            ghost.setOpacity(0.5);
            const temp = new THREE.Scene();
            temp.add(solid.root, ghost.root);
            // kept for good: a shader is thrown away when the last material using it goes
            this.warmModels = [solid, ghost];
            warm(temp, this.camera, this.scene);
        }).catch(() => {});
    }

    // The lobby's fighter on the podium: your look, or what you're trying on (showcaseLook)
    refreshShowcase() {
        const clock = this.showcase ? this.showcase.t : 0;
        if (this.showcase) { this.scene.remove(this.showcase.model.root); this.showcase.model.dispose(); this.showcase = null; }
        if (this.state !== 'menu') return;
        const look = this.showcaseLook || {};
        const glowId = look.glowId || profile.glowId;
        const trailId = look.trailId || profile.trailId;
        const model = new CharacterModel(look.skinId || profile.skinId, TEAM_COLORS[0], glowId);
        const podium = buildPodium((GLOWS[glowId] || GLOWS.sun).tip, trailColors(trailId, glowId));
        // the podium rides on the model's root, so it turns with the fighter and leaves with it when a match starts
        model.root.add(podium.group);
        const spot = LOBBY_SPOTS[this.arena.layout] || LOBBY_SPOTS.colosseum;
        const floor = this.physics.groundAt(spot.x, spot.z, 0.5, 40);
        model.root.position.set(spot.x, (floor === -Infinity ? 0 : floor) + podium.height, spot.z);
        this.scene.add(model.root);
        const fake = { vel: { x: 0, y: 0, z: 0 }, onGround: true, dashT: 0, spearCd: 0, slamming: false, swingT: 0, parryT: 0, glide: false, pitch: 0, bigScale: 1, stunT: 0, alive: true, trailId, glowId };
        this.showcase = { model, podium, fake, spot, t: clock };
    }

    // Turn the fighter (the lobby's drag). dx in pixels
    turnShowcase(dx) {
        this.showYaw = (this.showYaw || 0) + dx * 0.0085;
        this.showSpin = Math.max(-3, Math.min(3, dx * 0.12));
    }

    // Show a map behind the podium
    previewMap(layout) {
        if (this.state !== 'menu' || this.arena.layout === layout) return;
        this.useLayout(layout);
        this.arena.setTheme('sunset', this.scene, this.hemi, this.sun);
        this.refreshShowcase();
    }

    updateShowcase(dt) {
        const s = this.showcase;
        if (!s) return;
        s.t += dt;
        const f = s.fake, weapons = this.ui.lobbyTab === 'weapons';
        // idle, showing off a move now and then. On the Weapons tab: spear out, then mace up, held longer
        if (weapons) {
            const k = s.t % 5;
            f.dashT = k < 2.3 ? 0.1 : 0;
            f.slamming = k >= 2.6 && k < 4.8;
        } else {
            const k = s.t % 7;
            f.dashT = k > 3 && k < 3.4 ? 0.1 : 0;
            f.slamming = k > 5.2 && k < 6;
        }
        f.pitch = f.slamming ? 0.35 : 0;
        // a turn keeps drifting after you let go
        if (this.showSpin) {
            this.showYaw = (this.showYaw || 0) + this.showSpin * dt;
            this.showSpin *= Math.exp(-dt * 5);
            if (Math.abs(this.showSpin) < 0.01) this.showSpin = 0;
        }
        // yaw 0 faces the camera, three-quarters on so both weapons show
        const fw = lobbyForward(s.spot);
        s.model.root.rotation.y = Math.atan2(fw.x, fw.z) + 0.42 + (this.showYaw || 0);
        s.model.animate(f, dt, s.t);
        this.fx.trail('showcase', s.model, f);
        s.podium.update(s.t, weapons);
    }

    // The lobby's camera: a fixed distance behind the fighter, a lens wide enough to show them at the size
    // the free space between the panels allows, and a lens shift (like a tilt-shift camera) that slides the
    // picture so they stand in that space. The shift never skews them, and the next match's first
    // change of field of view rebuilds the projection without it.
    frameShowcase(dt) {
        const s = this.showcase, cam = this.camera;
        if (!s) return;
        const W = this.width || 1, H = this.height || 1;
        const rect = this.ui.stageRect ? this.ui.stageRect() : null;
        const r = rect && rect.w > 10 && rect.h > 10 ? rect : { x: 0, y: 0, w: W, h: H };
        const want = { scale: Math.min(r.h / 3.45, r.w / 3.2), cx: r.x + r.w / 2, cy: r.y + r.h / 2 }; // scale: pixels per metre
        const m = this.menuShot || (this.menuShot = { ...want });
        const k = this.settings.reducedMotion ? 1 : 1 - Math.exp(-dt * 7);
        m.scale += (want.scale - m.scale) * k;
        m.cx += (want.cx - m.cx) * k;
        m.cy += (want.cy - m.cy) * k;

        const p = s.model.root.position;
        const focusY = p.y + 0.72; // the middle of podium and fighter
        const fw = lobbyForward(s.spot);
        const sway = this.settings.reducedMotion ? 0 : Math.sin(this.menuT * 0.26) * 0.012;
        const fx = fw.x * Math.cos(sway) - fw.z * Math.sin(sway), fz = fw.z * Math.cos(sway) + fw.x * Math.sin(sway);
        // stay in front of anything solid behind the camera
        const room = this.physics.raycast(p.x, focusY, p.z, -fx, 0, -fz, LOBBY_DIST + 1);
        let dist = Math.max(4, Math.min(LOBBY_DIST, room - 0.6));
        let tan = (H / 2) / (m.scale * dist);
        if (tan > LOBBY_MAX_TAN) { tan = LOBBY_MAX_TAN; dist = (H / 2) / (m.scale * tan); }

        cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tan));
        cam.updateProjectionMatrix();
        const e = cam.projectionMatrix.elements;
        e[8] = -2 * (m.cx - W / 2) / W;
        e[9] = 2 * (m.cy - H / 2) / H;
        cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
        cam.position.set(p.x - fx * dist, focusY - LOBBY_PITCH * dist, p.z - fz * dist);
        cam.lookAt(cam.position.x + fx, cam.position.y + LOBBY_PITCH, cam.position.z + fz);
    }

    // Build the arena for a layout (if it isn't the one already built)
    useLayout(layout) {
        if (this.arena && this.arena.layout === layout) return;
        if (this.arena) this.arena.dispose();
        this.arena = new Arena(this.scene, this.qualityName, layout, this.renderer);
        this.arena.onThunder = () => audio.play('thunder');
        this.arena.onEnv = (t) => { this.viewModel.scene.environment = t; };
        this.arena.setPointScale(this.height * this.dpr || 600);
        this.physics = this.arena.physics;
        this.rig.physics = this.physics;
        if (this.sun.castShadow) this.sun.shadow.needsUpdate = true;
    }

    applySettings() {
        const s = this.settings;
        this.input.sensitivity = s.sens;
        this.input.invertY = s.invertY;
        this.rig.baseFov = s.fov;
        this.rig.reduced = s.reducedMotion;
        this.fx.reduced = s.reducedMotion;
        audio.setUserOn(s.sound);
        audio.musicOn = s.music;
        audio.setVolumes(s.volMaster, s.volSfx, s.volMusic);
        audio.setMusic(s.music);
    }

    setSetting(k, v) {
        this.settings[k] = v;
        profile.setSetting(k, v);
        this.applySettings();
    }

    resize() {
        const w = window.innerWidth, h = window.innerHeight;
        this.width = w; this.height = h;
        this.renderer.setSize(w, h, false);
        if (this.post) this.post.setSize(w * this.dpr, h * this.dpr);
        this.camera.aspect = w / h;
        this.rig.setAspect(w / h);
        this.camera.updateProjectionMatrix();
        this.viewModel.setAspect(w / h);
        this.arena.setPointScale(h * this.dpr);
    }

    // Draw one finished picture with any camera. Covers, videos and other tools use this too:
    //   game.setRenderSize(1920, 1080, 1); game.renderView(myCamera);
    // viewModel: also draw the first-person arms on top.
    renderView(camera = this.camera, viewModel = false) {
        const r = this.renderer;
        if (this.post && this.post.enabled) {
            this.post.begin();
            r.render(this.scene, camera);
            if (viewModel) { r.clearDepth(); r.render(this.viewModel.scene, this.viewModel.camera); }
            this.post.finish();
            if (this.post.isBlack(performance.now())) this.disablePost('black');
        } else {
            r.setRenderTarget(null);
            r.clear();
            r.render(this.scene, camera);
            if (viewModel) { r.clearDepth(); r.render(this.viewModel.scene, this.viewModel.camera); }
        }
    }

    // Change the size of the picture without touching the window (for tools). Undo with game.resize().
    setRenderSize(w, h, dpr = 1) {
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(w, h, false);
        if (this.post) this.post.setSize(w * dpr, h * dpr);
        this.arena.setPointScale(h * dpr);
    }

    // Stop using the HDR path, for good this session: it showed black, or we need the speed
    disablePost(why) {
        if (!this.post) return;
        console.warn('Post-processing off:', why);
        this.post.enabled = false;
        this.renderer.setRenderTarget(null);
    }

    // ---------------- match setup ----------------

    makeFighter(i, opts) {
        const f = new Fighter({ id: i, team: i, ...opts });
        this.fighters.push(f);
        f.glowId = opts.glowId || 'sun';
        f.trailId = opts.trailId || 'glow';
        const model = new CharacterModel(f.skinId, TEAM_COLORS[i % TEAM_COLORS.length], f.glowId);
        this.scene.add(model.root);
        this.models.push(model);
        this.intents.push(makeIntent());
        this.brains.push(opts.isBot ? new BotBrain(f, opts.botLevel, this) : null);
        return f;
    }

    // Give a bot slot a new identity (Gauntlet waves reuse slots)
    configureBot(i, level) {
        const L = BOT_LEVELS[level] || BOT_LEVELS.normal;
        const f = this.fighters[i];
        f.name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
        f.classId = CLASS_IDS[Math.floor(Math.random() * CLASS_IDS.length)];
        f.maxHp = classHp(f.classId);
        f.botLevel = level;
        f.dmgMult = L.damage;
        f.speedMult = L.speed;
        const skins = Object.keys(SKINS);
        const skin = skins[Math.floor(Math.random() * skins.length)];
        if (skin !== f.skinId) {
            f.skinId = skin;
            this.scene.remove(this.models[i].root);
            this.models[i].dispose();
            this.models[i] = new CharacterModel(skin, TEAM_COLORS[i % TEAM_COLORS.length], f.glowId);
            this.scene.add(this.models[i].root);
        }
        this.brains[i] = new BotBrain(f, level, this);
        f.team = 1; // Gauntlet bots are on one side: they don't fight each other
    }

    clearMatch() {
        for (const m of this.models) { this.scene.remove(m.root); m.dispose(); }
        this.fighters = []; this.models = []; this.brains = []; this.intents = [];
        if (this.hillZone) { this.scene.remove(this.hillZone.ring, this.hillZone.column); this.hillZone.ring.geometry.dispose(); this.hillZone.column.geometry.dispose(); this.hillZone.ring.material.dispose(); this.hillZone.column.material.dispose(); this.hillZone = null; }
        this.local = null;
        this.fx.clear();
        this.tutorial = null;
    }

    randomBotOpts(level) {
        const L = BOT_LEVELS[level] || BOT_LEVELS.normal;
        const skins = Object.keys(SKINS);
        return {
            name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
            isBot: true, botLevel: level, dmgMult: L.damage, speedMult: L.speed,
            classId: CLASS_IDS[Math.floor(Math.random() * CLASS_IDS.length)],
            skinId: skins[Math.floor(Math.random() * skins.length)],
            glowId: pickOne(Object.keys(GLOWS))
        };
    }

    // opts: { mode, level }
    startMatch(opts) {
        this.clearMatch();
        if (this.showcase) { this.scene.remove(this.showcase.model.root); this.showcase.model.dispose(); this.showcase = null; }
        // map and time of day: training and your first matches in the colosseum at sunset, then any
        const fresh = opts.mode === 'training' || (profile.data.stats.matches || 0) < 3;
        const layout = opts.layout || (fresh ? 'colosseum' : pickOne(Object.keys(LAYOUTS)));
        this.matchTheme = opts.theme || (fresh ? 'sunset' : pickOne(['sunset', 'sunset', 'night', 'storm']));
        this.useLayout(layout);
        this.endT = 0;
        this.pendingResults = null;
        this.timeScale = 1;
        this.streak = 0;
        this.lastKoTime = -99;
        this.onlineMatch = !!opts.roster;
        this.mode = opts.mode;
        this.level = opts.level || 'normal';
        this.modeDef = MODES[opts.mode];
        this.remote = opts.remote || null;
        if (opts.mode === 'online') this.modeDef = { ...MODES.online, kos: opts.kos || MATCH.duelKOs, time: opts.roster.length > 2 ? MATCH.timeLimit + 60 : MATCH.timeLimit };
        if (opts.roster && opts.mode === 'hill') this.modeDef = { ...MODES.hill, bots: 0 };
        this.time = 0;
        this.acc = 0;
        this.matchT = 0;
        this.suddenDeath = false;
        this.reviveUsed = false;
        this.reviveOffered = false;
        this.killfeed = [];
        this.wave = 0;

        let me;
        if (opts.roster) {
            opts.roster.forEach((r, i) => {
                const f = this.makeFighter(i, { name: r.name, classId: r.classId, skinId: r.skinId, glowId: GLOWS[r.glowId] ? r.glowId : 'sun', trailId: TRAILS[r.trailId] ? r.trailId : 'glow', isLocal: i === opts.localIndex });
                if (i === opts.localIndex) me = f;
            });
        } else me = this.makeFighter(0, { name: profile.name, isLocal: true, classId: profile.classId, skinId: profile.skinId, glowId: profile.glowId, trailId: profile.trailId });
        this.local = me;
        if (opts.mode === 'training') {
            const d = this.makeFighter(1, { name: t('fighter.dummy'), isBot: true, botLevel: 'dummy', classId: 'normal', skinId: 'skeleton', dmgMult: 0.5 });
            d.maxHp = 200;
        } else if (opts.mode === 'gauntlet') {
            for (let i = 1; i <= 3; i++) this.makeFighter(i, this.randomBotOpts('easy'));
        } else if (!opts.roster) {
            for (let i = 1; i <= this.modeDef.bots; i++) this.makeFighter(i, this.randomBotOpts(this.level));
        }
        // spawns: duels face each other across the arena (online, everyone must agree, so no shuffling)
        const order = this.fighters.length <= 2 ? [2, 0] : (opts.roster ? [0, 2, 1, 3] : shuffle([0, 1, 2, 3]));
        this.fighters.forEach((f, i) => {
            f.reset(this.arena.spawns[order[i % order.length]]);
            f.kos = 0; f.deaths = 0; f.hill = 0; f.out = false; f.outAt = 0; f.left = false;
            for (const k in f.stats) f.stats[k] = 0;
        });
        if (opts.mode === 'training') {
            const d = this.fighters[1];
            d.reset({ x: 0, y: 0, z: -9, yaw: 0 });
            me.reset({ x: 0, y: 0, z: 9, yaw: 0 });
        }
        if (opts.mode === 'gauntlet') this.startWave(1, true);
        if (opts.mode === 'hill') this.makeHill();

        this.look.yaw = me.yaw; this.look.pitch = me.pitch;
        if (this.viewModel) this.viewModel.dispose();
        this.viewModel = new ViewModel(profile.skinId, profile.glowId);
        this.viewModel.scene.environment = this.scene.environment;
        this.viewModel.setAspect(this.width / this.height);
        this.state = 'intro';
        this.introT = opts.mode === 'training' ? 0.01 : 3;
        this.lastCount = 4;
        this.input.active = true;
        this.input.clear();
        this.input.requestLock();
        this.ui.matchStarted(this);
        crazyGames.setGameplay(true);
        audio.setIntensity(opts.mode === 'training' ? 0 : 1);
        this.arena.setTheme(this.matchTheme, this.scene, this.hemi, this.sun);
        // the map's name, and how to win this mode
        const firstTo = t('goal.kos', { n: this.modeDef.kos });
        const goal = { quick: firstTo, duel: firstTo, brawl: firstTo, online: firstTo, hill: t('goal.hill', { n: this.modeDef.hill }), stand: t('goal.stand'),
            gauntlet: t('goal.gauntlet'), training: t('goal.training') }[this.mode] || '';
        this.ui.banner(t('map.' + this.arena.layout), goal, '#bfe8ff', 2.8);
        this.timeScale = 1;
    }

    // Gauntlet: each wave brings fresh bots, harder as you go
    startWave(n, first = false) {
        this.wave = n;
        const count = n >= 9 ? 3 : (n >= 5 ? 2 : 1);
        const level = n <= 1 ? 'easy' : n <= 3 ? 'normal' : n <= 6 ? 'pro' : 'god';
        const me = this.local;
        if (!first) me.hp = Math.min(me.maxHp, me.hp + 35);
        // spawn the wave on the islands farthest from the player
        const spawns = this.arena.spawns.slice().sort((a, b) => dist2(b, me.pos) - dist2(a, me.pos));
        for (let i = 1; i <= 3; i++) {
            const f = this.fighters[i];
            if (i <= count) {
                this.configureBot(i, level);
                f.reset(spawns[(i - 1) % spawns.length]);
                f.respawnT = 0;
            } else {
                f.alive = false;
                f.respawnT = Infinity;
                f.pos.y = -999;
                this.models[i].root.visible = false;
            }
        }
        this.waveT = 0;
        this.ui.buildTags(this);
        if (!first) {
            this.ui.banner(t('wave.title', { n }), tn('wave.bots', count, { level: t('bot.' + level) }), '#ffd54a', 2);
            audio.play('score');
        }
    }

    pause() {
        if (this.state !== 'play' && this.state !== 'intro') return;
        if (this.remote) {
            // online matches keep going: just show the menu and free the mouse
            this.overlayPause = true;
            this.input.active = false;
            this.input.exitLock();
            this.ui.showPause(true);
            return;
        }
        this.prePause = this.state;
        this.state = 'paused';
        this.input.active = false;
        this.input.exitLock();
        crazyGames.setGameplay(false);
        this.ui.showPause(true);
    }

    resume() {
        if (this.overlayPause) {
            this.overlayPause = false;
            this.input.active = true;
            this.input.clear();
            this.input.requestLock();
            this.ui.showPause(false);
            return;
        }
        if (this.state !== 'paused') return;
        this.state = this.prePause || 'play';
        this.input.active = true;
        this.input.clear();
        this.input.requestLock();
        crazyGames.setGameplay(true);
        this.ui.showPause(false);
        this.lastFrame = performance.now();
    }

    quitToMenu(keepRoom = false) {
        this.state = 'menu';
        this.input.active = false;
        this.input.exitLock();
        crazyGames.setGameplay(false);
        this.overlayPause = false;
        this.endT = 0;
        this.pendingResults = null;
        if (this.remote) {
            const r = this.remote;
            this.remote = null;
            if (keepRoom && r.peer) r.backToLobby(); else r.leave(true);
        }
        this.clearMatch();
        this.refreshShowcase();
        audio.setIntensity(0);
        this.timeScale = 1;
        this.arena.setTheme('sunset', this.scene, this.hemi, this.sun);
        this.ui.showMenu();
    }

    // ---------------- events from fighters and combat ----------------

    emit(name, a, b, c, d, e, f2) {
        const fx = this.fx;
        const localInvolved = a === this.local || b === this.local;
        if (this.remote) {
            if (this.remote.isHost) this.remote.relayEvent(name, a, b, c, d, e, f2);
            else if (a === this.local && GUEST_SENDS.has(name)) this.remote.sendEvent(name, a, b);
        }
        switch (name) {
            case 'jump':
                fx.emit(a.pos.x, a.pos.y + 0.1, a.pos.z, 5, '#e8e2d0', 2.5, 0.09, 0.4, -6, 0.2);
                audio.play('jump', a === this.local ? null : a.pos);
                break;
            case 'windJump':
                fx.ring(a.pos.x, a.pos.y + 0.1, a.pos.z, 0.4, 2.4, 0.4, '#bff6ff');
                fx.emit(a.pos.x, a.pos.y, a.pos.z, 12, '#d8fbff', 5, 0.08, 0.45, -2, -0.6);
                audio.play('windJump', a === this.local ? null : a.pos);
                break;
            case 'dash':
                audio.play('dash', a === this.local ? null : a.pos);
                if (a === this.local) this.ui.speedLines(1);
                break;
            case 'slamStart':
                audio.play('slamStart', a === this.local ? null : a.pos);
                break;
            case 'swing':
                audio.play('swing', a === this.local ? null : a.pos);
                break;
            case 'parryUp':
                fx.ring(a.pos.x, a.pos.y + 1.1, a.pos.z, 0.3, 1.3, 0.18, '#9ff0ff', true, a.yaw);
                break;
            case 'shockwave': {
                // a = slammer, b = strength 0-1, c = floor y, d = radius
                const R = d || 3;
                fx.ring(a.pos.x, c + 0.08, a.pos.z, 0.5, R * 1.15, 0.55, '#ffb43a');
                fx.ring(a.pos.x, c + 0.12, a.pos.z, 0.3, R * 0.7, 0.4, '#fff1b0');
                if (b > 0.5) fx.ring(a.pos.x, c + 0.1, a.pos.z, 1, R * 1.6, 0.8, '#ff7a2f');
                fx.groundBurst(a.pos.x, c, a.pos.z, 14 + Math.round(b * 26), '#b9ab95', 6 + b * 10, 0.22 + b * 0.18);
                fx.emit(a.pos.x, c + 0.2, a.pos.z, 10 + Math.round(b * 10), '#ffd27a', 5 + b * 6, 0.1, 0.5, -10, 0.5);
                audio.play('shock', a === this.local ? null : a.pos, b);
                this.shakeNear(a.pos, 6 + b * 14, 0.25 + b * 0.25);
                if (a === this.local) this.input.rumble(0.35 + b * 0.6, 200 + b * 200);
                if (a === this.local && b > 0.6) this.ui.banner('', t('fx.megaSlam'), '#ffb43a', 0.9, true);
                break;
            }
            case 'hit': {
                // a attacker, b defender, c damage, d kind, e crit, f2 bolt
                const y = b.pos.y + b.height * 0.6;
                const col = e ? '#ffcf3a' : '#ffffff';
                fx.emit(b.pos.x, y, b.pos.z, e ? 22 : 12, e ? '#ffd54a' : '#fff5d8', e ? 9 : 6, e ? 0.13 : 0.1, 0.45, -12, 0.3);
                fx.emit(b.pos.x, y, b.pos.z, 6, SKINS[b.skinId] ? SKINS[b.skinId].shirt : '#ff5555', 4, 0.12, 0.5, -16, 0.4);
                fx.text(b.pos.x, b.pos.y + b.height + 0.4, b.pos.z, String(c), e ? '#ffcf3a' : (d === 'slam' || d === 'shock' ? '#ffa04a' : '#ffffff'), e || c >= 40);
                if (e) fx.text(b.pos.x, b.pos.y + b.height + 1.1, b.pos.z, t(d === 'spearCrit' ? 'fx.critical' : 'fx.crushed'), col, true);
                if (f2) { fx.bolt(b.pos.x, b.pos.y, b.pos.z); audio.play('bolt', b.pos); fx.text(b.pos.x, b.pos.y + b.height + 1.8, b.pos.z, t('fx.lightning'), '#fff36e', true); }
                audio.play(e ? 'crit' : 'hit', localInvolved ? null : b.pos, Math.min(1, c / 60));
                if (this.models[b.id]) this.models[b.id].flash();
                if (a === this.local) { this.ui.hitmarker(e); if (e || c >= 40) this.fx.shake(e ? 9 : 6, 0.25); }
                if (b === this.local && a) {
                    // which way the hit came from, relative to where we're looking
                    const ang = Math.atan2(-(a.pos.x - b.pos.x), -(a.pos.z - b.pos.z)) - this.look.yaw;
                    this.ui.damageFrom(-ang);
                }
                if (b === this.local) { this.ui.hurt(c); this.fx.shake(Math.min(16, 5 + c * 0.15), 0.3); audio.play('hurt'); this.input.rumble(Math.min(1, 0.3 + c / 80), 220); }
                else if (a === this.local) this.input.rumble(e ? 0.6 : 0.25, e ? 160 : 90);
                if (this.tutorial) this.tutorial.event('hit', a, b, c, d);
                break;
            }
            case 'parry':
            case 'clash': {
                const x = c, y = d, z = e;
                fx.ring(x, y, z, 0.3, 2.6, 0.35, '#ffffff', true, this.look.yaw);
                fx.ring(x, y, z, 0.2, 1.6, 0.3, name === 'parry' ? '#9ff0ff' : '#fff1a8', true, this.look.yaw + 1.2);
                fx.emit(x, y, z, 20, '#ffffff', 9, 0.09, 0.4, -8, 0);
                fx.text(x, y + 0.6, z, t(name === 'parry' ? 'fx.parry' : 'fx.clash'), name === 'parry' ? '#bff6ff' : '#fff1a8', true);
                audio.play(name, localInvolved ? null : { x, y, z });
                if (localInvolved) this.fx.shake(10, 0.3); else this.shakeNear({ x, y, z }, 6, 0.2);
                if (this.tutorial) this.tutorial.event(name, a, b);
                break;
            }
            case 'pad':
                fx.ring(b.x, b.y + 0.25, b.z, 0.5, 2.2, 0.4, '#6dffb0');
                audio.play('pad', a === this.local ? null : a.pos);
                if (this.tutorial) this.tutorial.event('pad', a);
                break;
            case 'geyser':
                fx.emit(0, 0.4, 0, 18, '#c8fbff', 9, 0.1, 0.7, 4, 2);
                audio.play('geyser', a === this.local ? null : a.pos);
                if (this.tutorial) this.tutorial.event('geyser', a);
                break;
            case 'land':
                fx.emit(a.pos.x, a.pos.y + 0.05, a.pos.z, 6, '#d9cfbb', 3, 0.1, 0.35, -8, 0.1);
                this.models[a.id] && this.models[a.id].land(b);
                if (a === this.local) this.fx.shake(Math.min(5, b * 0.15), 0.15);
                audio.play('land', a === this.local ? null : a.pos, Math.min(1, b / 30));
                break;
            case 'status':
                fx.text(a.pos.x, a.pos.y + a.height + 0.9, a.pos.z, t('fx.' + b), c, false); // b is an id: online, each player reads it in their language
                audio.play('status', a.pos);
                break;
            case 'dot':
                fx.text(a.pos.x, a.pos.y + a.height + 0.4, a.pos.z, String(Math.round(b)), a.fireT > 0 ? '#ff7a2f' : '#5ce65c');
                if (a === this.local) this.ui.hurt(b * 0.5);
                break;
            case 'vanish':
            case 'reveal':
            case 'grow':
                fx.emit(a.pos.x, a.pos.y + 1, a.pos.z, 16, CLASSES[a.classId].color, 4, 0.1, 0.5, 0, 0);
                if (a === this.local && name === 'vanish') this.ui.banner('', t('fx.invisible'), '#a99bff', 0.9, true);
                break;
            case 'blinkOut':
            case 'blinkIn':
                fx.emit(a.pos.x, a.pos.y + 1, a.pos.z, 22, '#b05cff', 6, 0.11, 0.5, 0, 0);
                if (name === 'blinkIn') { fx.ring(a.pos.x, a.pos.y + 1, a.pos.z, 0.2, 2.5, 0.4, '#d2a8ff', true, this.look.yaw); audio.play('blink', a.pos); }
                if (a === this.local && name === 'blinkIn') { this.look.pitch = -0.9; this.ui.banner('', t('fx.voidBlink'), '#d2a8ff', 1, true); }
                break;
        }
        if (this.tutorial && a === this.local && TUTORIAL_MOVES.has(name)) this.tutorial.event(name, a, b);
    }

    // Thumbs and sticks aim less precisely than a mouse: a spear dash started within about
    // 12 degrees of an enemy is nudged straight at them
    aimAssist(me, I) {
        let best = null, bestErr = 0.22;
        const ex = me.pos.x, ey = me.pos.y + 1.6, ez = me.pos.z;
        for (const o of this.fighters) {
            if (o === me || !o.alive || o.team === me.team || (o.invisible && !me.big)) continue;
            const dx = o.pos.x - ex, dy = o.pos.y + 1.1 - ey, dz = o.pos.z - ez;
            const h = Math.hypot(dx, dz);
            if (h > 12 || h < 0.5) continue;
            const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, h);
            let dyaw = yaw - I.yaw;
            while (dyaw > Math.PI) dyaw -= Math.PI * 2;
            while (dyaw < -Math.PI) dyaw += Math.PI * 2;
            const err = Math.hypot(dyaw, (pitch - I.pitch) * 0.7);
            if (err < bestErr && this.physics.lineClear(ex, ey, ez, o.pos.x, o.pos.y + 1.1, o.pos.z)) { bestErr = err; best = { yaw: I.yaw + dyaw, pitch }; }
        }
        if (best) { I.yaw = best.yaw; I.pitch = best.pitch; }
    }

    shakeNear(p, amt, time) {
        const me = this.local;
        if (!me) return;
        const d = Math.hypot(p.x - me.pos.x, p.y - me.pos.y, p.z - me.pos.z);
        const k = Math.max(0, 1 - d / 26);
        if (k > 0) this.fx.shake(amt * k, time);
    }

    hitstop(s) {
        if (this.remote) return;
        if (s > this.hitstopT) this.hitstopT = s;
    }

    randomEnemy(f) {
        const list = this.fighters.filter(o => o !== f && o.alive && o.team !== f.team);
        return list.length ? list[Math.floor(Math.random() * list.length)] : null;
    }

    // ---------------- knockouts ----------------

    knockOut(f, cause) {
        if (!f.alive || this.state === 'over') return; // nothing counts after the match is decided
        if (this.remote && !this.remote.isHost) return; // the host decides KOs
        f.deaths++;
        f.stats.deaths++;
        // the last attacker gets the KO if it was recent, or if you never touched the ground after their hit
        let killer = (f.lastHitBy && f.lastHitBy !== f && (this.time - f.lastHitTime < HIT.koCreditTime || f.airborneSinceHit)) ? f.lastHitBy : null;
        if (!killer && this.fighters.length === 2 && this.mode !== 'training') killer = this.fighters[f.id === 0 ? 1 : 0];
        if (killer) { killer.kos++; killer.stats.kos++; if (cause === 'void') killer.stats.voidKos++; }
        // these words are ids too (sent online as they are); the kill feed shows them through the table
        const causeText = cause === 'void' ? 'VOID' : (cause === 'slam' || cause === 'shock') ? 'SLAM' : cause === 'swing' ? 'MACE' : cause === 'dot' ? 'BURN' : 'SPEAR';
        this.koEffects(f, killer, causeText);
        if (this.remote && this.remote.isHost) this.remote.relayKO(f, killer, causeText);

        f.respawnT = MATCH.respawnTime;
        if (this.mode === 'training') f.respawnT = 1;
        if (this.mode === 'gauntlet') {
            if (f === this.local) {
                f.respawnT = Infinity;
                this.gauntletOver();
            } else {
                f.respawnT = Infinity;
            }
            return;
        }
        // Last Stand: out of lives means out of the match
        if (this.mode === 'stand' && f.deaths >= this.modeDef.lives) {
            f.respawnT = Infinity;
            f.out = true;
            f.outAt = this.time;
            if (f === this.local) this.ui.banner(t('ko.eliminated'), t('ko.outOfLives'), '#ff6b5a', 1.6);
            else this.ui.banner('', t('ko.isOut', { name: f.name }), '#ffd54a', 1.2, true);
            const left = this.fighters.filter(o => !o.out);
            if (left.length <= 1 || f === this.local) { this.endMatch(); return; }
        }
        // A one-time revive in matches against bots (rewarded ad)
        if (f === this.local && !this.reviveUsed && !this.remote && crazyGames.adsAvailable && this.mode !== 'training' && killer) {
            this.reviveOffered = true;
            f.respawnT = 5;
            this.reviveKiller = killer;
            this.ui.offerRevive(true);
        }
        this.checkWin();
    }

    // What everyone sees when a fighter is knocked out (guests run this from the host's message)
    koEffects(f, killer, causeText) {
        f.alive = false;
        f.hp = 0;
        f.cancelActions();
        f.respawnT = MATCH.respawnTime;
        const model = this.models[f.id];
        if (causeText !== 'VOID') {
            const col = SKINS[f.skinId] ? SKINS[f.skinId].shirt : '#888';
            this.fx.emit(f.pos.x, f.pos.y + 1, f.pos.z, 34, col, 9, 0.2, 0.9, -18, 0.6);
            this.fx.emit(f.pos.x, f.pos.y + 1, f.pos.z, 14, '#ffffff', 7, 0.12, 0.6, -10, 0.6);
            this.fx.ring(f.pos.x, f.pos.y + 1, f.pos.z, 0.3, 3, 0.5, '#ffffff', true, this.look.yaw);
            // the fighter tumbles away spinning, then bursts
            if (model && f !== this.local) {
                const hit = f.lastHitBy;
                let kx = f.vel.x, kz = f.vel.z;
                if (hit && Math.hypot(kx, kz) < 2) { kx = f.pos.x - hit.pos.x; kz = f.pos.z - hit.pos.z; }
                const l = Math.hypot(kx, kz) || 1;
                f.koAnim = { t: 0, vx: kx / l * 9, vy: 7, vz: kz / l * 9, spin: (Math.random() < 0.5 ? -1 : 1) * 9 };
            } else if (model) model.root.visible = false;
            audio.play('ko', f === this.local ? null : f.pos);
        } else {
            audio.play('voidFall', f === this.local ? null : f.pos);
        }
        this.shakeNear(f.pos, 8, 0.3);
        this.ui.killfeed(killer, f, causeText);
        if (killer === this.local) {
            // knockout streaks: several KOs close together
            this.streak = (this.time - (this.lastKoTime || -99) < 9) ? (this.streak || 1) + 1 : 1;
            this.lastKoTime = this.time;
            const call = ['', '', t('ko.double'), t('ko.triple'), t('ko.unstoppable')][Math.min(4, this.streak)];
            this.ui.banner(call || t(causeText === 'VOID' ? 'ko.voidKnockout' : 'ko.knockout'), `${f.name}${call && causeText === 'VOID' ? ' · ' + t('ko.intoVoidSub') : ''}`, call ? '#ff9f1c' : '#ffd54a', 1.4);
            if (call) audio.play('win');
        }
        else if (f === this.local) this.ui.banner(t(causeText === 'VOID' ? 'ko.intoVoid' : 'ko.knockedOut'), killer ? t('ko.by', { name: killer.name }) : '', '#ff6b5a', 1.6);
        if (this.tutorial) this.tutorial.event('ko', killer, f);
    }

    // Rewarded ad finished: undo the knockout and come back with full health
    revive() {
        const f = this.local;
        if (!f || f.alive || this.reviveUsed) return;
        this.reviveUsed = true;
        this.reviveOffered = false;
        this.ui.offerRevive(false);
        if (this.mode === 'gauntlet') {
            this.state = 'play';
            this.pendingGauntlet = null; // the run goes on: rewards are counted when it really ends
            this.ui.hideResults();
            delete this.ui.cache.touch; delete this.ui.cache.ctp; // let the HUD show the touch controls again
            this.input.clear();
            this.input.active = true;
            this.input.requestLock();
            crazyGames.setGameplay(true);
        } else if (this.reviveKiller) {
            this.reviveKiller.kos--; this.reviveKiller.stats.kos--;
            f.deaths--; f.stats.deaths--;
        }
        this.respawn(f);
        this.ui.banner(t('ko.revived'), t('ko.fullHealth'), '#6dffb0', 1.4);
    }

    respawn(f) {
        // the island farthest from living enemies
        let best = null, bestD = -1;
        for (const s of this.arena.spawns) {
            let d = Infinity;
            for (const o of this.fighters) if (o !== f && o.alive) d = Math.min(d, dist2(s, o.pos));
            if (d > bestD) { bestD = d; best = s; }
        }
        f.reset(best);
        if (this.remote && this.remote.isHost) this.remote.relaySpawn(f);
        const m = this.models[f.id];
        if (m) m.root.visible = true;
        if (f === this.local) { this.look.yaw = f.yaw; this.look.pitch = f.pitch; }
        this.fx.emit(f.pos.x, f.pos.y + 1, f.pos.z, 16, '#bff6ff', 4, 0.1, 0.6, 2, 1);
    }

    // What wins the match: knockouts, or hill points in King of the Hill
    score(f) {
        if (this.mode === 'hill') return Math.floor(f.hill || 0);
        if (this.mode === 'stand') return (f.out ? 0 : 100) + (this.modeDef.lives - f.deaths) * 10 + f.kos;
        return f.kos;
    }

    checkWin() {
        const def = this.modeDef;
        if (!def.kos) return;
        const top = this.leader();
        if (this.suddenDeath && top && !this.tied()) return this.endMatch();
        if (top && top.kos >= def.kos) this.endMatch();
    }

    leader() {
        let best = null;
        for (const f of this.fighters) if (!f.left && (!best || this.score(f) > this.score(best))) best = f;
        return best;
    }

    tied() {
        const top = this.leader();
        return !!top && this.fighters.filter(f => !f.left && this.score(f) === this.score(top)).length > 1;
    }

    // King of the Hill: standing in the glowing zone alone earns a point a second
    makeHill() {
        const ruins = this.arena.layout === 'ruins';
        const z = { r: ruins ? 6.2 : 7, y: ruins ? this.arena.daisH : 0, owner: null, contested: false };
        const ringGeo = new THREE.RingGeometry(z.r - 0.4, z.r, 56, 1);
        ringGeo.rotateX(-Math.PI / 2);
        z.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
        z.ring.position.y = z.y + 0.06;
        const colGeo = new THREE.CylinderGeometry(z.r, z.r, 7, 40, 1, true);
        colGeo.translate(0, 3.5, 0);
        z.column = new THREE.Mesh(colGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
        z.column.position.y = z.y;
        this.scene.add(z.ring, z.column);
        this.hillZone = z;
    }

    inHill(f) {
        const z = this.hillZone;
        return z && f.alive && Math.hypot(f.pos.x, f.pos.z) < z.r && f.pos.y > z.y - 0.5 && f.pos.y < z.y + 3;
    }

    hillTick(dt) {
        const z = this.hillZone;
        const guest = this.remote && !this.remote.isHost;
        let inside = null, count = 0;
        for (const f of this.fighters) if (this.inHill(f)) { inside = f; count++; }
        z.contested = count > 1;
        const owner = count === 1 ? inside : null;
        if (owner !== z.owner && owner === this.local) audio.play('score');
        z.owner = owner;
        if (owner && !guest) {
            const before = Math.floor(owner.hill);
            owner.hill += dt;
            if (Math.floor(owner.hill) !== before && owner === this.local && Math.floor(owner.hill) % 10 === 0) this.ui.banner('', t('ko.points', { n: Math.floor(owner.hill) }), '#ffd54a', 0.8, true);
            if (owner.hill >= this.modeDef.hill) return this.endMatch();
        }
        if (!guest && this.suddenDeath && !this.tied()) this.endMatch();
    }

    endMatch() {
        if (this.state === 'over') return;
        this.state = 'over';
        this.overlayPause = false;
        this.ui.showPause(false);
        this.input.active = false;
        this.input.exitLock();
        crazyGames.setGameplay(false);
        this.ui.offerRevive(false);
        // players who left rank last; in Last Stand, whoever went out later ranks higher
        const ranked = this.fighters.slice().sort((a, b) => (a.left ? 1 : 0) - (b.left ? 1 : 0) || this.score(b) - this.score(a) || (b.outAt || 0) - (a.outAt || 0) || b.kos - a.kos || a.deaths - b.deaths || b.stats.damageDealt - a.stats.damageDealt);
        const win = ranked[0] === this.local;
        let reward = null;
        let done = [];
        if (this.mode !== 'training') {
            reward = profile.recordMatch(win, this.remote ? 'online' : this.level, this.local.stats);
            done = missions.record(this.local.stats, { win });
        }
        const ach = this.mode === 'training' ? [] : achievements.check({ stats: this.local.stats, win, mode: this.mode, level: this.level, online: !!this.remote, classId: this.local.classId });
        audio.play(win ? 'win' : 'lose');
        if (win) crazyGames.happytime();
        if (this.remote && this.remote.isHost) this.remote.relayEnd(ranked);
        this.finishSlowly({ win, ranked, local: this.local, reward, mode: this.mode, level: this.level, missions: done, ach });
    }

    // Guest: the host says the match is over
    endMatchRemote(order) {
        if (this.state === 'over') return;
        this.state = 'over';
        this.overlayPause = false;
        this.ui.showPause(false);
        this.input.active = false;
        this.input.exitLock();
        crazyGames.setGameplay(false);
        const ranked = order.map(i => this.fighters[i]).filter(Boolean);
        const win = ranked[0] === this.local;
        const reward = profile.recordMatch(win, 'online', this.local.stats);
        const done = missions.record(this.local.stats, { win });
        const ach = achievements.check({ stats: this.local.stats, win, mode: this.mode, online: true, classId: this.local.classId });
        audio.play(win ? 'win' : 'lose');
        this.finishSlowly({ win, ranked, local: this.local, reward, mode: this.mode, missions: done, ach });
    }

    // The winning knockout plays out in slow motion before the results appear
    finishSlowly(results) {
        this.pendingResults = results;
        this.endT = this.settings.reducedMotion ? 0.8 : 1.6;
        this.timeScale = this.settings.reducedMotion ? 1 : 0.25;
        this.ui.offerRevive(false);
        this.ui.banner(t(results.win ? 'res.victory' : 'res.defeat'), results.win ? t('match.youWin') : t('match.wins', { name: results.ranked[0].name }), results.win ? '#ffd54a' : '#ff6b5a', 2);
    }

    gauntletOver() {
        const canRevive = !this.reviveUsed && crazyGames.adsAvailable;
        this.state = 'over';
        this.input.active = false;
        this.input.exitLock();
        crazyGames.setGameplay(false);
        // died between waves (the current one already cleared)? then it counts
        const waves = this.fighters.slice(1).some(f => f.alive) ? this.wave - 1 : this.wave;
        this.pendingGauntlet = { waves };
        this.ui.showResults({ gauntlet: true, waves, local: this.local, canRevive, best: profile.data.arena3d.gauntletBest });
    }

    // Called when the player leaves the Gauntlet results without reviving
    finishGauntlet() {
        if (!this.pendingGauntlet) return null;
        const r = profile.recordGauntlet(this.pendingGauntlet.waves, this.local.stats);
        r.missions = missions.record(this.local.stats, { wave: this.wave });
        r.ach = achievements.check({ stats: this.local.stats, win: false, mode: 'gauntlet', wave: this.wave, classId: this.local.classId });
        this.pendingGauntlet = null;
        return r;
    }

    // ---------------- the loop ----------------

    loop(now) {
        requestAnimationFrame(this.loop);
        this.frame(now);
    }

    // One drawn frame (tests can call this directly with made-up times)
    frame(now) {
        let dt = (now - this.lastFrame) / 1000;
        this.lastFrame = now;
        if (dt > 0.1) dt = 0.1; // after a tab switch
        if (dt <= 0) return;
        this.adaptQuality(dt);

        this.input.pollPad(dt);
        if (this.state === 'play' || this.state === 'intro') {
            if (this.input.takePause()) { this.pause(); }
            if (this.input.takeView()) { this.settings.view = this.rig.toggle(); profile.setSetting('view', this.settings.view); }
            // look: applied every frame for the smoothest aim
            const [dx, dy] = this.input.takeLook();
            this.look.yaw -= dx;
            this.look.pitch = Math.max(-1.5, Math.min(1.5, this.look.pitch - dy));
            this.lookDX = dx; this.lookDY = dy;
        } else {
            this.input.takePause(); this.input.takeView(); this.input.takeLook();
            this.lookDX = this.lookDY = 0;
        }

        if (this.state === 'intro') {
            this.introT -= dt;
            const n = Math.ceil(this.introT);
            if (n !== this.lastCount && n >= 0) {
                this.lastCount = n;
                if (n > 0) { this.ui.countdown(String(n)); audio.play('count'); }
            }
            if (this.introT <= 0) {
                this.state = 'play';
                if (this.mode !== 'training') { this.ui.countdown(t('fx.go')); audio.play('go'); }
            }
        }

        if (this.state === 'play' || this.state === 'intro' || this.state === 'over') {
            if (this.endT > 0) {
                this.endT -= dt;
                if (this.endT <= 0) { this.timeScale = 1; this.ui.showResults(this.pendingResults); }
            }
            if (this.hitstopT > 0) {
                this.hitstopT -= dt;
            } else {
                this.acc += dt * (this.timeScale || 1);
                let steps = 0;
                while (this.acc >= SIM_DT && steps < 14) {
                    this.simStep();
                    this.acc -= SIM_DT;
                    steps++;
                }
                if (steps >= 14) this.acc = 0;
            }
        }
        if (this.remote) this.remote.update(dt);
        this.render(dt * (this.timeScale || 1));
    }

    simStep() {
        const dt = SIM_DT;
        this.time += dt;
        const playing = this.state === 'play';
        const fs = this.fighters;
        const R = this.remote;
        for (let i = 0; i < fs.length; i++) {
            const f = fs[i], I = this.intents[i];
            if (f === this.local) {
                if (this.state === 'over' || this.overlayPause) { I.fwd = I.right = 0; I.jump = I.spear = I.mace = I.slam = I.parry = I.size = false; I.jumpHeld = false; if (this.overlayPause) this.input.fill(this.scratchI || (this.scratchI = makeIntent())); }
                else this.input.fill(I);
                I.yaw = this.look.yaw; I.pitch = this.look.pitch;
                if (I.spear && (this.input.usingTouch || this.input.usingPad)) this.aimAssist(f, I);
            } else if (R) {
                // online: friends move themselves; the host extends their moves, guests draw the host's snapshots
                if (R.isHost) R.advance(f, dt); else R.interpolate(f);
                continue;
            } else if (this.brains[i]) {
                this.brains[i].fill(I, dt);
            }
            if (!playing && this.state !== 'over') {
                // countdown: look around, but no moving yet
                I.fwd = I.right = 0; I.jump = I.spear = I.mace = I.slam = I.parry = false; I.jumpHeld = false;
            }
            f.step(I, dt, this);
        }
        if (!this.remote || this.remote.isHost) this.combat.step();
        if (this.state !== 'play') return;

        // respawns
        for (const f of fs) {
            if (f.alive || f.respawnT === Infinity) continue;
            f.respawnT -= dt;
            if (f.respawnT <= 0 && !(this.remote && !this.remote.isHost)) {
                if (f === this.local && this.reviveOffered) { this.reviveOffered = false; this.ui.offerRevive(false); }
                this.respawn(f);
            }
        }
        // training dummy heals back up
        if (this.mode === 'training') {
            const d = fs[1];
            if (d && d.alive && this.time - d.lastHitTime > 1.6) d.hp = d.maxHp;
            if (this.tutorial) this.tutorial.update(dt, this);
        }
        // gauntlet waves
        if (this.mode === 'gauntlet') {
            let left = 0;
            for (let i = 1; i < fs.length; i++) if (fs[i].alive) left++;
            if (left === 0) {
                this.waveT += dt;
                if (this.waveT > 1.6) this.startWave(this.wave + 1);
            }
        }
        if (this.mode === 'hill' && this.hillZone) this.hillTick(dt);
        // match clock
        const def = this.modeDef;
        if (def.time && !(this.remote && !this.remote.isHost)) {
            this.matchT += dt;
            if (!this.suddenDeath && this.matchT >= def.time) {
                if (this.tied()) {
                    this.suddenDeath = true;
                    this.ui.banner(t(this.mode === 'hill' ? 'timer.overtime' : 'timer.suddenDeath'), t(this.mode === 'hill' ? 'match.nextPoint' : 'match.nextKo'), '#ff6b5a', 2);
                } else this.endMatch();
            }
        }
    }

    render(dt) {
        const alpha = Math.min(1, this.acc / SIM_DT);
        const fs = this.fighters;
        const me = this.local;
        this.arena.update(dt);
        if (this.hillZone) {
            const z = this.hillZone;
            const col = z.contested ? 0xff5a4a : z.owner ? new THREE.Color(TEAM_COLORS[z.owner.id % 4]).getHex() : 0xffffff;
            z.ring.material.color.setHex(col);
            z.column.material.color.setHex(col);
            z.column.material.opacity = 0.1 + Math.sin(this.time * 4) * 0.04 + (z.owner ? 0.06 : 0);
        }

        for (let i = 0; i < fs.length; i++) {
            const f = fs[i], m = this.models[i];
            if (!m) continue;
            const x = f.prevPos.x + (f.pos.x - f.prevPos.x) * alpha;
            const y = f.prevPos.y + (f.pos.y - f.prevPos.y) * alpha;
            const z = f.prevPos.z + (f.pos.z - f.prevPos.z) * alpha;
            m.root.position.set(x, y, z);
            m.root.rotation.y = f === me ? this.look.yaw : lerpAngle(f.prevYaw, f.yaw, alpha);
            const firstPersonSelf = f === me && this.rig.mode === 'first';
            m.root.visible = f.alive && !firstPersonSelf;
            if (!f.alive && f.koAnim) {
                // knockout tumble
                const k = f.koAnim;
                k.t += dt;
                m.root.position.set(f.pos.x + k.vx * k.t, f.pos.y + k.vy * k.t - 10 * k.t * k.t, f.pos.z + k.vz * k.t);
                m.root.rotation.set(k.t * k.spin, m.root.rotation.y + dt * 4, k.t * k.spin * 0.6);
                m.body.scale.setScalar(Math.max(0.05, 1 - k.t * 1.4));
                m.root.visible = true;
                m.koPose(dt);
                if (k.t > 0.55) {
                    const p = m.root.position;
                    this.fx.emit(p.x, p.y + 0.8, p.z, 18, SKINS[f.skinId] ? SKINS[f.skinId].shirt : '#888', 7, 0.16, 0.7, -14, 0.5);
                    this.fx.emit(p.x, p.y + 0.8, p.z, 10, '#ffffff', 5, 0.1, 0.5, -8, 0.5);
                    m.root.visible = false;
                    f.koAnim = null;
                }
                continue;
            }
            if (f.alive && m.root.rotation.x) { m.root.rotation.x = 0; m.root.rotation.z = 0; }
            if (f.alive && !firstPersonSelf) {
                let op = 1;
                if (f.invisible) op = f === me ? 0.35 : 0.08 + Math.random() * 0.04;
                if (f.spawnShield > 0 && Math.floor(f.spawnShield * 10) % 2 === 0) op = Math.min(op, 0.5);
                m.setOpacity(op);
                m.blob.visible = !(this.renderer.shadowMap.enabled && this.dynamicShadows);
                m.animate(f, dt, this.time);
                this.fx.trail(f.id, m, f);
            }
            // dash sparkle
            if (f.alive && f.dashT > 0) {
                this.fx.emit(x, y + f.height * 0.6, z, 2, '#fff3b0', 0.8, 0.07, 0.25, 0, 0);
            }
            if (f.alive && f.slamming) this.fx.emit(x, y + 0.6, z, 1, '#ffd27a', 0.6, 0.08, 0.3, 4, 0);
            if (f.alive && f.fireT > 0 && Math.random() < 0.5) this.fx.emit(x, y + 1, z, 1, '#ff7a2f', 1.5, 0.1, 0.5, 6, 1);
        }

        // camera
        if (me) {
            const x = me.prevPos.x + (me.pos.x - me.prevPos.x) * alpha;
            const y = me.prevPos.y + (me.pos.y - me.prevPos.y) * alpha;
            const z = me.prevPos.z + (me.pos.z - me.prevPos.z) * alpha;
            this.rig.update(me, x, y, z, this.look.yaw, this.look.pitch, dt, this.fx);
            audio.setListener(x, y + 1.6, z, this.look.yaw);
            this.viewModel.animate(me, dt, this.lookDX || 0, this.lookDY || 0, this.settings.reducedMotion);
        } else {
            // lobby: your fighter on the podium
            this.menuT += dt;
            this.updateShowcase(dt);
            this.frameShowcase(dt);
        }
        this.fx.update(dt, this.width, this.height);

        this.renderView(this.camera, !!(me && me.alive && this.rig.mode === 'first' && this.state !== 'menu'));
        if (this.state !== 'menu') this.ui.hud(this, dt);
    }

    // Auto quality: lower the resolution when frames take too long, raise it again when there's room
    adaptQuality(dt) {
        if (this.settings.quality !== 'auto') return;
        this.frameEMA += (dt * 1000 - this.frameEMA) * 0.05;
        if (this.frameEMA > 19.5) { this.slowT += dt; this.fastT = 0; }
        else if (this.frameEMA < 15.5) { this.fastT += dt; this.slowT = 0; }
        else { this.slowT = 0; this.fastT = 0; }
        const r = this.renderer;
        const stepDpr = (d) => { this.dpr = Math.max(0.6, Math.min(this.maxDpr, this.dpr + d)); r.setPixelRatio(this.dpr); this.resize(); };
        if (this.slowT > 1) {
            this.slowT = 0;
            // Steps, cheapest to notice first: a sharper-than-1 screen comes down to 1; fighters stop casting real shadows;
            // resolution to 0.8; post-processing off; resolution to 0.6; then no real shadows at all.
            if (this.dpr > 1) stepDpr(-0.15);
            else if (this.sun.castShadow && this.sun.shadow.autoUpdate) { this.sun.shadow.autoUpdate = false; this.sun.shadow.needsUpdate = true; this.dynamicShadows = false; }
            else if (this.dpr > 0.8) stepDpr(-0.1);
            else if (this.post && this.post.enabled) this.disablePost('too slow');
            else if (this.dpr > 0.6) stepDpr(-0.1);
            else if (r.shadowMap.enabled) {
                r.shadowMap.enabled = false;
                this.sun.castShadow = false;
                this.scene.traverse((n) => { if (n.material) for (const m of [].concat(n.material)) m.needsUpdate = true; });
            }
        } else if (this.fastT > 4 && this.dpr < this.maxDpr) {
            stepDpr(0.1);
            this.fastT = 0;
        }
    }
}

function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
function lerpAngle(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
}
void _v;
