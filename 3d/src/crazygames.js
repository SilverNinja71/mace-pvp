// ==========================================
// CrazyGames SDK (v3) wrapper. Only does anything when the game runs on
// CrazyGames (inside their iframe), or locally with ?useLocalSdk=true.
// Everywhere else every call is a harmless no-op, and the game never
// waits for the SDK to boot.
// ==========================================

import { audio } from './audio.js';

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
const ROOM_PARAM = 'roomId';

class CrazyGames {
    constructor() {
        this.sdk = null;
        this.active = false;
        this.gameplay = false;
        this.wantGameplay = false;
        this.adPlaying = false;
        this.onPause = null;      // (paused: bool) => void, set by the game: pause while an ad shows
        this.ready = null;
    }

    localTest() {
        try { return new URLSearchParams(location.search).get('useLocalSdk') === 'true'; } catch (e) { return false; }
    }

    shouldLoad() {
        if (window.SMA_ON_CRAZYGAMES) return true;
        let framed = false;
        try { framed = window.self !== window.top; } catch (e) { framed = true; }
        return framed || this.localTest();
    }

    init() {
        if (this.ready) return this.ready;
        this.ready = new Promise((resolve) => {
            if (!this.shouldLoad()) return resolve(false);
            let done = false;
            const finish = (ok) => { if (!done) { done = true; clearTimeout(timer); resolve(ok); } };
            const timer = setTimeout(() => finish(false), 6000);
            const start = () => {
                const sdk = window.CrazyGames && window.CrazyGames.SDK;
                if (!sdk || typeof sdk.init !== 'function') return finish(false);
                Promise.resolve().then(() => sdk.init()).then(() => {
                    if (done) return;
                    this.sdk = sdk;
                    this.active = sdk.environment === 'crazygames' || (sdk.environment === 'local' && this.localTest());
                    if (this.active) this.activate();
                    finish(this.active);
                }).catch((e) => { console.warn('CrazyGames SDK init failed; playing without it.', e); finish(false); });
            };
            if (window.CrazyGames && window.CrazyGames.SDK) return start();
            const s = document.createElement('script');
            s.src = SDK_URL;
            s.async = true;
            s.onload = start;
            s.onerror = () => finish(false);
            document.head.appendChild(s);
        });
        return this.ready;
    }

    activate() {
        document.documentElement.classList.add('on-crazygames');
        // the game usually finishes loading before the SDK is ready; if not, report the loading phase
        if (!window.SMA_READY) { this.loadingStart(); this.loadingOpen = true; }
        const apply = (st) => audio.setPlatformMuted(!!(st && st.muteAudio));
        this.safe(() => apply(this.sdk.game.settings));
        this.safe(() => this.sdk.game.addSettingsChangeListener((st) => apply({ ...(this.sdk.game.settings || {}), ...(st || {}) })));
        if (this.wantGameplay) this.setGameplay(true);
    }

    safe(fn) {
        try {
            const r = fn();
            if (r && typeof r.catch === 'function') r.catch((e) => console.warn('CrazyGames SDK:', e));
            return r;
        } catch (e) { console.warn('CrazyGames SDK:', e); return undefined; }
    }

    loadingStart() { if (this.active) this.safe(() => this.sdk.game.loadingStart()); }
    loadingStop() { if (this.active && this.loadingOpen) { this.loadingOpen = false; this.safe(() => this.sdk.game.loadingStop()); } }

    // true while a match is actually being played (not menus, pauses or ads)
    setGameplay(on) {
        this.wantGameplay = on;
        if (!this.active || on === this.gameplay || this.adPlaying) return;
        this.gameplay = on;
        this.safe(() => on ? this.sdk.game.gameplayStart() : this.sdk.game.gameplayStop());
    }

    happytime() { if (this.active) this.safe(() => this.sdk.game.happytime()); }

    get adsAvailable() { return this.active && !!(this.sdk && this.sdk.ad); }

    // type: 'rewarded' | 'midgame'. Resolves true if the ad finished (rewarded: give the reward).
    showAd(type) {
        if (!this.adsAvailable || this.adPlaying) return Promise.resolve(false);
        return new Promise((resolve) => {
            const wasGameplay = this.gameplay;
            const begin = () => {
                this.adPlaying = true;
                if (this.gameplay) { this.gameplay = false; this.safe(() => this.sdk.game.gameplayStop()); }
                audio.setAdMuted(true);
                if (this.onPause) this.onPause(true);
            };
            // an ad that never starts (blocked, or the shared 3-minute ad cooldown) must not hang the game
            const noStart = setTimeout(() => { if (!this.adPlaying) end(false); }, 5000);
            let ended = false;
            const end = (ok) => {
                if (ended) return;
                ended = true;
                clearTimeout(noStart);
                const was = this.adPlaying;
                this.adPlaying = false;
                audio.setAdMuted(false);
                if (was && this.onPause) this.onPause(false);
                if (wasGameplay && this.wantGameplay) this.setGameplay(true);
                resolve(ok);
            };
            try {
                this.sdk.ad.requestAd(type, {
                    adStarted: begin,
                    adFinished: () => end(true),
                    adError: (e) => { console.warn('CrazyGames ad error:', e); end(false); }
                });
            } catch (e) { end(false); }
        });
    }

    // ---- multiplayer invites ----
    inviteRoom() {
        if (!this.active) return null;
        const v = this.safe(() => this.sdk.game.getInviteParam(ROOM_PARAM));
        return typeof v === 'string' && v ? v : null;
    }
    inviteLink(code) {
        if (!this.active) return Promise.resolve(null);
        return Promise.resolve().then(() => this.sdk.game.inviteLink({ [ROOM_PARAM]: code }))
            .then((l) => (typeof l === 'string' && l ? l : null)).catch(() => null);
    }
    showInvite(code) { if (this.active && code) this.safe(() => this.sdk.game.showInviteButton({ [ROOM_PARAM]: code })); }
    hideInvite() { if (this.active) this.safe(() => this.sdk.game.hideInviteButton()); }
}

export const crazyGames = new CrazyGames();
