// ==========================================
// SPEAR-MACE PVP - Procedural Web Audio Engine
// 100% synthesized - zero external sound files needed
// ==========================================

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;
        this.volume = 0.7;

        // Restore mute preference if saved
        try {
            const savedMute = localStorage.getItem("spear_mace_muted");
            if (savedMute !== null) this.muted = savedMute === "true";
            const savedVol = localStorage.getItem("spear_mace_vol");
            if (savedVol !== null) this.volume = parseFloat(savedVol) || 0.7;
        } catch (e) {
            // LocalStorage might be disabled
        }

        this.cachedNoiseBuffer = null;
    }

    init() {
        if (this.ctx) return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
    }

    ensureContext() {
        if (!this.ctx) {
            this.init();
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        }
        try {
            localStorage.setItem("spear_mace_muted", this.muted ? "true" : "false");
        } catch (e) {}
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain && this.ctx && !this.muted) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
        try {
            localStorage.setItem("spear_mace_vol", this.volume.toString());
        } catch (e) {}
    }

    // Helper: precompute or get reusable white noise buffer
    getNoiseBuffer() {
        if (!this.ctx) return null;
        if (!this.cachedNoiseBuffer) {
            const bufferSize = this.ctx.sampleRate * 1.0; // 1 second precomputed
            this.cachedNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = this.cachedNoiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        }
        return this.cachedNoiseBuffer;
    }

    playJump() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = "sine";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.13);
    }

    playDoubleJump() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // Wind charge / Spear Dash swoosh
    playDash() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const noiseBuf = this.getNoiseBuffer();
        if (!noiseBuf) return;

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuf;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.15);
        filter.Q.value = 3.0;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.16);
    }

    // High velocity dive sound
    playSlamStart() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.23);
    }

    // Signature Mace Heavy Crunch / Anvil smash
    playSlamHit(intensityRatio = 0.5) {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const clampedRatio = Math.max(0.1, Math.min(1.0, intensityRatio));

        // Sub bass thump
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = "sine";
        subOsc.frequency.setValueAtTime(130 + clampedRatio * 50, now);
        subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

        subGain.gain.setValueAtTime(0.6 * clampedRatio + 0.2, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        subOsc.connect(subGain);
        subGain.connect(this.masterGain);
        subOsc.start(now);
        subOsc.stop(now + 0.36);

        // Metallic Mace Clang (anvil overtone)
        const clang = this.ctx.createOscillator();
        const clangGain = this.ctx.createGain();
        clang.type = "triangle";
        clang.frequency.setValueAtTime(680, now);
        clang.frequency.exponentialRampToValueAtTime(210, now + 0.2);

        clangGain.gain.setValueAtTime(0.35 * clampedRatio, now);
        clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        clang.connect(clangGain);
        clangGain.connect(this.masterGain);
        clang.start(now);
        clang.stop(now + 0.21);

        // Impact crunch noise
        const noiseBuf = this.getNoiseBuffer();
        if (noiseBuf) {
            const noise = this.ctx.createBufferSource();
            noise.buffer = noiseBuf;
            const filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(1200 + clampedRatio * 2000, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.18);

            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.4 * clampedRatio, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            noise.connect(filter);
            filter.connect(nGain);
            nGain.connect(this.masterGain);

            noise.start(now);
            noise.stop(now + 0.19);
        }
    }

    // Ground slam shockwave
    playGroundSlam() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.29);
    }

    // Dash attack hit (spear strike / thrust)
    playDashHit() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(95, now + 0.12);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.13);
    }

    // Invisibility flicker / shroud sound
    playInvisWarning() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(700, now + 0.05);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.11);
    }

    // Victory fanfare
    playWin() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
            const start = this.ctx.currentTime + index * 0.1;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, start);

            const dur = index === notes.length - 1 ? 0.4 : 0.12;
            gain.gain.setValueAtTime(0.25, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(start);
            osc.stop(start + dur + 0.02);
        });
    }

    // Defeat tone
    playLoss() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const notes = [311.13, 293.66, 277.18, 246.94]; // Eb4, D4, Db4, B3
        notes.forEach((freq, index) => {
            const start = this.ctx.currentTime + index * 0.15;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.18, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(start);
            osc.stop(start + 0.25);
        });
    }

    playClick() {
        this.ensureContext();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.05);
    }
}

export const sound = new SoundEngine();
