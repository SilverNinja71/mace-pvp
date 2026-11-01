// ==========================================
// InputController: keyboard + mouse (pointer lock), gamepad and touch.
// Taps are "latched": a press is remembered until a physics step uses it,
// so a quick click between two steps is never lost. Looking around is
// applied every drawn frame for the smoothest aim.
// ==========================================

const PRESS_KEYS = {
    Space: 'jump', ShiftLeft: 'slam', ShiftRight: 'slam', KeyF: 'parry', KeyE: 'parry',
    KeyB: 'size', KeyV: 'view', Escape: 'pause', KeyP: 'pause'
};

export class InputController {
    constructor(canvas, touchRoot) {
        this.canvas = canvas;
        this.keys = Object.create(null);
        this.latch = { jump: false, spear: false, mace: false, slam: false, parry: false, size: false, view: false, pause: false };
        this.lookDX = 0; this.lookDY = 0;
        this.sensitivity = 1;
        this.invertY = false;
        this.active = false;          // true while a match is being played
        this.locked = false;
        this.onUnlock = null;         // called when pointer lock is lost mid-match
        this.mouseHeld = [false, false, false];
        this.usingTouch = false;
        this.usingPad = false;
        this.padPrev = [];
        this.padMove = { x: 0, y: 0 };
        this.touch = { moveId: null, ox: 0, oy: 0, x: 0, y: 0, lookId: null, lx: 0, ly: 0, jumpHeld: false };
        this.touchRoot = touchRoot;
        this.showScores = false;
        this.lockFailed = typeof canvas.requestPointerLock !== 'function'; // no pointer lock at all: look with plain mouse moves
        this.bind();
    }

    bind() {
        window.addEventListener('keydown', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            if (this.active && (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow'))) e.preventDefault();
            if (e.code === 'Tab') this.showScores = true;
            if (this.keys[e.code]) return; // key repeat
            this.keys[e.code] = true;
            const a = PRESS_KEYS[e.code];
            if (a) this.latch[a] = true;
            this.usingTouch = false;
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'Tab') this.showScores = false;
        });
        window.addEventListener('blur', () => { this.keys = Object.create(null); this.mouseHeld = [false, false, false]; });

        const c = this.canvas;
        c.addEventListener('contextmenu', (e) => e.preventDefault());
        c.addEventListener('mousedown', (e) => {
            if (!this.active) return;
            if (!this.locked && !this.usingTouch) { this.requestLock(); if (!this.lockFailed) return; }
            this.mouseHeld[e.button] = true;
            if (e.button === 0) this.latch.spear = true;
            else if (e.button === 2) this.latch.mace = true;
            else if (e.button === 1) { this.latch.parry = true; e.preventDefault(); }
        });
        window.addEventListener('mouseup', (e) => { this.mouseHeld[e.button] = false; });
        window.addEventListener('mousemove', (e) => {
            if (!this.active) return;
            if (this.locked || this.lockFailed) {
                this.lookDX += e.movementX || 0;
                this.lookDY += e.movementY || 0;
            }
        });
        document.addEventListener('pointerlockchange', () => {
            const was = this.locked;
            this.locked = document.pointerLockElement === c;
            if (this.locked) this.lockErrors = 0;
            if (was && !this.locked && this.active && this.onUnlock) this.onUnlock();
        });
        // a refused lock (asked too soon after Esc) is retried on the next click
        // a refused lock right after Esc is normal; refused again and again means the page can't lock
        // the mouse at all (an iframe without permission), so fall back to plain mouse movement
        document.addEventListener('pointerlockerror', () => { this.lockErrors = (this.lockErrors || 0) + 1; if (this.lockErrors >= 3) this.lockFailed = true; });

        // touch: first touch switches to touch controls
        window.addEventListener('touchstart', () => { this.usingTouch = true; }, { passive: true });
        this.bindTouch();
    }

    requestLock() {
        if (this.usingTouch || this.locked || this.lockFailed) return;
        try {
            const r = this.canvas.requestPointerLock({ unadjustedMovement: true });
            if (r && r.catch) r.catch(() => {
                // some browsers refuse unadjustedMovement: try plain
                try { const r2 = this.canvas.requestPointerLock(); if (r2 && r2.catch) r2.catch(() => {}); } catch (e) { /* retried on next click */ }
            });
        } catch (e) {
            try { this.canvas.requestPointerLock(); } catch (e2) { /* retried on next click */ }
        }
    }

    exitLock() {
        if (document.pointerLockElement) document.exitPointerLock();
    }

    bindTouch() {
        const root = this.touchRoot;
        if (!root) return;
        const stick = root.querySelector('.t-stick');
        const knob = root.querySelector('.t-knob');
        this.stickEl = stick; this.knobEl = knob;
        const T = this.touch;
        const zone = root.querySelector('.t-zone');
        zone.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse') return;
            this.usingTouch = true;
            e.preventDefault();
            const left = e.clientX < window.innerWidth * 0.42;
            if (left && T.moveId === null) {
                T.moveId = e.pointerId; T.ox = T.x = e.clientX; T.oy = T.y = e.clientY;
                stick.style.display = 'block';
                stick.style.transform = `translate(${T.ox}px, ${T.oy}px)`;
                knob.style.transform = 'translate(0px, 0px)';
            } else if (!left && T.lookId === null) {
                T.lookId = e.pointerId; T.lx = e.clientX; T.ly = e.clientY;
            }
            try { zone.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ }
        });
        zone.addEventListener('pointermove', (e) => {
            if (e.pointerId === T.moveId) {
                T.x = e.clientX; T.y = e.clientY;
                let dx = T.x - T.ox, dy = T.y - T.oy;
                const l = Math.hypot(dx, dy), max = 55;
                if (l > max) { dx = dx / l * max; dy = dy / l * max; }
                knob.style.transform = `translate(${dx}px, ${dy}px)`;
            } else if (e.pointerId === T.lookId) {
                this.lookDX += (e.clientX - T.lx) * 2.2;
                this.lookDY += (e.clientY - T.ly) * 2.2;
                T.lx = e.clientX; T.ly = e.clientY;
            }
        });
        const end = (e) => {
            if (e.pointerId === T.moveId) { T.moveId = null; stick.style.display = 'none'; }
            if (e.pointerId === T.lookId) T.lookId = null;
        };
        zone.addEventListener('pointerup', end);
        zone.addEventListener('pointercancel', end);

        root.querySelectorAll('[data-act]').forEach((b) => {
            const act = b.getAttribute('data-act');
            b.addEventListener('pointerdown', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.usingTouch = true;
                this.latch[act] = true;
                if (act === 'jump') T.jumpHeld = true;
                b.classList.add('down');
            });
            const up = () => { if (act === 'jump') T.jumpHeld = false; b.classList.remove('down'); };
            b.addEventListener('pointerup', up);
            b.addEventListener('pointercancel', up);
            b.addEventListener('pointerleave', up);
        });
    }

    // Gamepad: read once per drawn frame
    pollPad(dt) {
        const pads = navigator.getGamepads ? navigator.getGamepads() : null;
        let gp = null;
        if (pads) for (const p of pads) if (p && p.connected) { gp = p; break; }
        if (!gp) { this.padMove.x = this.padMove.y = 0; this.padJump = false; return; }
        const dz = (v) => (Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84);
        const lx = dz(gp.axes[0] || 0), ly = dz(gp.axes[1] || 0);
        const rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
        this.padMove.x = lx; this.padMove.y = ly;
        if (lx || ly || rx || ry) this.usingPad = true;
        // right stick looks (curved for fine aim)
        const curve = (v) => Math.sign(v) * v * v;
        this.lookDX += curve(rx) * 900 * dt;
        this.lookDY += curve(ry) * 650 * dt;
        const pressed = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
        const edge = (i) => pressed(i) && !this.padPrev[i];
        if (edge(0)) this.latch.jump = true;
        if (edge(2) || edge(7) || edge(5)) this.latch.spear = true;
        if (edge(1) || edge(6)) this.latch.mace = true;
        if (edge(4)) this.latch.parry = true;
        if (edge(3)) this.latch.size = true;
        if (edge(8) || edge(10) || edge(11)) this.latch.view = true;
        if (edge(9)) this.latch.pause = true;
        this.padJump = pressed(0);
        for (let i = 0; i < gp.buttons.length; i++) this.padPrev[i] = pressed(i);
        if (gp.buttons.some((b) => b && b.pressed)) this.usingPad = true;
    }

    // Gamepad rumble (strength 0-1), only while a pad is being used
    rumble(strength, ms) {
        if (!this.usingPad || !navigator.getGamepads) return;
        for (const gp of navigator.getGamepads()) {
            const a = gp && gp.vibrationActuator;
            if (a && a.playEffect) {
                try { a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength * 1.2) }); } catch (e) { /* not supported */ }
                return;
            }
        }
    }

    // Look change since last frame, in radians
    takeLook() {
        const k = 0.0022 * this.sensitivity;
        const dx = this.lookDX * k, dy = this.lookDY * k * (this.invertY ? -1 : 1);
        this.lookDX = 0; this.lookDY = 0;
        return [dx, dy];
    }

    // Fill a fighter intent for one physics step (taps are used up here)
    fill(I) {
        const k = this.keys;
        let fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
        let right = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
        if (this.padMove.x || this.padMove.y) { right = this.padMove.x; fwd = -this.padMove.y; }
        const T = this.touch;
        if (T.moveId !== null) {
            const dx = T.x - T.ox, dy = T.y - T.oy;
            const l = Math.hypot(dx, dy);
            if (l > 8) {
                const m = Math.min(1, l / 55);
                right = dx / l * m; fwd = -dy / l * m;
            }
        }
        I.fwd = fwd; I.right = right;
        I.jumpHeld = !!(k.Space || T.jumpHeld || this.padJump);
        const L = this.latch;
        I.jump = L.jump; I.spear = L.spear; I.mace = L.mace; I.slam = L.slam; I.parry = L.parry; I.size = L.size;
        L.jump = L.spear = L.mace = L.slam = L.parry = L.size = false;
    }

    takeView() { const v = this.latch.view; this.latch.view = false; return v; }
    takePause() { const v = this.latch.pause; this.latch.pause = false; return v; }

    clear() {
        for (const key in this.latch) this.latch[key] = false;
        this.lookDX = this.lookDY = 0;
    }
}
