// ==========================================
// Audio3D: every sound is made on the fly with Web Audio (no sound files).
// Sounds from other fighters come from where they are (stereo panning and
// distance). Three ways to be silent: the player's Sound setting, the
// platform muting us (CrazyGames settings, or during an ad), and #mute in
// the address for testing.
// ==========================================

class Audio3D {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.userOn = true;
        this.platformMuted = false;
        this.adMuted = false;
        this.hashMuted = typeof location !== 'undefined' && /(^|[#&])mute\b/.test(location.hash);
        this.volume = 0.8;
        this.noiseBuf = null;
        this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    }

    get muted() { return !this.userOn || this.platformMuted || this.adMuted || this.hashMuted; }

    // Browsers only allow audio after the first click or key press
    unlock() {
        if (this.muted && !this.ctx) return;
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.connect(this.ctx.destination);
            const n = this.ctx.sampleRate;
            this.noiseBuf = this.ctx.createBuffer(1, n, n);
            const d = this.noiseBuf.getChannelData(0);
            for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.applyVolume();
        if (this.musicOn !== false) this.startMusic();
    }

    applyVolume() {
        if (!this.master) return;
        this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }

    setUserOn(on) { this.userOn = on; if (on) this.unlock(); this.applyVolume(); }
    setPlatformMuted(m) { this.platformMuted = m; this.applyVolume(); }
    setAdMuted(m) { this.adMuted = m; this.applyVolume(); }

    setListener(x, y, z, yaw) {
        const l = this.listener;
        l.x = x; l.y = y; l.z = z; l.yaw = yaw;
    }

    // Output node for a sound at a world position (or null = right at the listener)
    out(pos, gain = 1) {
        const c = this.ctx;
        const g = c.createGain();
        let vol = gain;
        if (pos) {
            const l = this.listener;
            const dx = pos.x - l.x, dy = pos.y - l.y, dz = pos.z - l.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            vol *= 1 / (1 + dist * 0.07);
            if (c.createStereoPanner) {
                // right vector of the listener: (cos yaw, -sin yaw)
                const right = (dx * Math.cos(l.yaw) - dz * Math.sin(l.yaw)) / Math.max(1, dist);
                const p = c.createStereoPanner();
                p.pan.value = Math.max(-0.85, Math.min(0.85, right));
                g.connect(p);
                p.connect(this.master);
            } else g.connect(this.master);
        } else g.connect(this.master);
        g.gain.value = vol;
        return g;
    }

    ready() { return this.ctx && !this.muted && this.ctx.state === 'running'; }

    tone(type, f0, f1, dur, vol, pos, delay = 0) {
        const c = this.ctx, t = c.currentTime + delay;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(this.out(pos));
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    noise(filterType, f0, f1, q, dur, vol, pos, delay = 0) {
        const c = this.ctx, t = c.currentTime + delay;
        const s = c.createBufferSource();
        s.buffer = this.noiseBuf;
        const f = c.createBiquadFilter();
        f.type = filterType;
        f.Q.value = q;
        f.frequency.setValueAtTime(f0, t);
        f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(this.out(pos));
        s.start(t, Math.random() * 0.5);
        s.stop(t + dur + 0.02);
    }

    play(name, pos = null, k = 1) {
        if (!this.ready()) return;
        switch (name) {
            case 'jump': this.noise('bandpass', 500, 1400, 1.2, 0.16, 0.18, pos); break;
            case 'windJump':
                this.noise('bandpass', 300, 2400, 0.9, 0.35, 0.3, pos);
                this.tone('sine', 220, 660, 0.25, 0.12, pos); break;
            case 'dash':
                this.noise('bandpass', 2600, 500, 1.5, 0.28, 0.35, pos);
                this.tone('sawtooth', 900, 300, 0.18, 0.06, pos); break;
            case 'slamStart': this.noise('lowpass', 400, 2400, 0.7, 0.45, 0.22, pos); break;
            case 'swing': this.noise('bandpass', 900, 300, 1, 0.2, 0.25, pos); break;
            case 'shock': {
                const v = 0.35 + k * 0.5;
                this.tone('sine', 120, 38, 0.5 + k * 0.4, v, pos);
                this.noise('lowpass', 1800, 120, 0.8, 0.45 + k * 0.4, v * 0.8, pos);
                if (k > 0.5) this.tone('square', 70, 30, 0.6, 0.12, pos);
                break;
            }
            case 'hit':
                this.tone('square', 260 + k * 80, 90, 0.12, 0.16, pos);
                this.noise('highpass', 2500, 800, 0.8, 0.1, 0.3, pos); break;
            case 'crit':
                this.tone('square', 520, 140, 0.18, 0.2, pos);
                this.tone('triangle', 1320, 880, 0.25, 0.14, pos, 0.02);
                this.noise('highpass', 3500, 1200, 0.8, 0.16, 0.35, pos); break;
            case 'parry':
                for (const f of [1180, 1770, 2490, 3130]) this.tone('triangle', f, f * 0.98, 0.5, 0.09, pos);
                this.noise('highpass', 6000, 3000, 1, 0.08, 0.3, pos); break;
            case 'clash':
                for (const f of [880, 1320, 1975]) this.tone('square', f, f * 0.96, 0.3, 0.05, pos);
                break;
            case 'pad':
                this.tone('sine', 300, 900, 0.32, 0.18, pos);
                this.noise('bandpass', 800, 3000, 1, 0.3, 0.15, pos); break;
            case 'geyser': this.noise('bandpass', 200, 2200, 0.7, 0.9, 0.35, pos); break;
            case 'land': this.noise('lowpass', 600, 100, 0.8, 0.18, 0.25 * k, pos); break;
            case 'ko':
                this.tone('sawtooth', 440, 55, 0.7, 0.14, pos);
                this.tone('sine', 220, 40, 0.8, 0.2, pos); break;
            case 'voidFall': this.noise('bandpass', 1500, 120, 1.4, 1.2, 0.25, pos); break;
            case 'bolt':
                this.noise('highpass', 7000, 500, 0.5, 0.6, 0.45, pos);
                this.tone('square', 90, 40, 0.5, 0.15, pos); break;
            case 'status': this.tone('triangle', 660, 990, 0.12, 0.08, pos); break;
            case 'blink': this.tone('sine', 1600, 200, 0.3, 0.12, pos); break;
            case 'click': this.tone('triangle', 880, 660, 0.06, 0.08, null); break;
            case 'hover': this.tone('sine', 1200, 1100, 0.03, 0.03, null); break;
            case 'count': this.tone('square', 440, 440, 0.12, 0.09, null); break;
            case 'go': this.tone('square', 880, 880, 0.3, 0.1, null); break;
            case 'win':
                [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.32, 0.13, null, i * 0.12)); break;
            case 'lose':
                [392, 330, 262].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.4, 0.12, null, i * 0.16)); break;
            case 'score': this.tone('triangle', 784, 1175, 0.2, 0.12, null); break;
            case 'hurt': this.tone('sawtooth', 180, 80, 0.2, 0.12, null); break;
            case 'thunder':
                this.noise('lowpass', 900, 60, 0.6, 2.2, 0.35, null, 0.3);
                this.tone('sine', 55, 30, 1.6, 0.18, null, 0.3); break;
        }
    }
}

// ---------------- music ----------------
// A small looping track made from notes: soft chords in the menu, plus
// bass and drums during matches. Scheduled a little ahead of time.
const BPM = 112;
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // Am F C G
const BASS = [45, 41, 36, 43];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

Audio3D.prototype.setMusic = function (on) {
    this.musicOn = on;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.3);
    if (on) this.startMusic();
};

Audio3D.prototype.setIntensity = function (k) { this.intensity = k; };

Audio3D.prototype.startMusic = function () {
    if (!this.ctx || this.musicTimer || this.musicOn === false) return;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);
    this.beat = 0;
    this.nextBeat = this.ctx.currentTime + 0.1;
    if (this.intensity === undefined) this.intensity = 0;
    const tick = () => {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const spb = 60 / BPM / 2; // eighth notes
        while (this.nextBeat < this.ctx.currentTime + 0.6) {
            this.scheduleStep(this.beat, this.nextBeat, spb);
            this.nextBeat += spb;
            this.beat++;
        }
    };
    this.musicTimer = setInterval(tick, 150);
    tick();
};

Audio3D.prototype.scheduleStep = function (step, t, spb) {
    const c = this.ctx, out = this.musicGain;
    const bar = Math.floor(step / 8) % 4;
    const inBar = step % 8;
    const hot = this.intensity > 0;
    const note = (type, freq, start, dur, vol, cutoff) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = freq;
        let node = o;
        if (cutoff) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; o.connect(f); node = f; }
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        node.connect(g); g.connect(out);
        o.start(start); o.stop(start + dur + 0.05);
    };
    // chord pad at the start of each bar
    if (inBar === 0) for (const n of CHORDS[bar]) { note('sawtooth', midi(n), t, spb * 8, 0.035, 1100); note('sawtooth', midi(n) * 1.005, t, spb * 8, 0.03, 900); }
    // twinkly arpeggio
    if (inBar % 2 === 1) note('triangle', midi(CHORDS[bar][(inBar >> 1) % 3] + 12), t, spb * 0.9, 0.04);
    if (!hot) return;
    // bass and drums in matches
    if (inBar % 2 === 0) note('square', midi(BASS[bar]), t, spb * 0.9, 0.06, 500);
    if (inBar % 4 === 0) { // kick
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.25);
    }
    if (inBar === 4) this.musicNoise(t, 0.12, 1800, 0.08); // snare
    this.musicNoise(t, 0.03, 7000, 0.025);                  // hi-hat
};

Audio3D.prototype.musicNoise = function (t, dur, freq, vol) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = freq > 4000 ? 'highpass' : 'bandpass'; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.musicGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
};

export const audio = new Audio3D();
