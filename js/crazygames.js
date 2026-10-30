// ==========================================
// SPEAR-MACE PVP - CrazyGames SDK (v3) bridge
// Only does anything when the game runs on CrazyGames. Everywhere else
// (GitHub Pages, the downloaded .html file) the SDK is either not loaded or
// reports environment "disabled", and every call below is a no-op.
// The game never waits for the SDK: it boots straight away and the
// CrazyGames features switch on once SDK.init() resolves.
// ==========================================

import { ON_CRAZYGAMES_HOST } from './config.js';
import { sound } from './audio.js';

const CG_SDK_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
const CG_INIT_TIMEOUT_MS = 6000;
// Invite links carry the room code under this parameter name
const CG_ROOM_PARAM = "roomId";
// updateRoom/leftRoom calls are spaced at least this far apart
const CG_ROOM_THROTTLE_MS = 300;

class CrazyGamesBridge {
    constructor() {
        this.sdk = null;
        this.active = false; // true only when SDK.environment says we're on CrazyGames
        this.environment = null;
        this.gameplayRunning = false;
        this.wantGameplay = false;
        this.room = null; // last room status sent to CrazyGames: { roomCode, joinable }
        this.pendingRoom = null; // status waiting for the throttle: same shape, or "left"
        this.roomTimer = null;
        this.lastRoomCall = 0;
        this.loadingReported = false;
        this.loadingDone = false;
        this.ready = null; // Promise<boolean>, resolves once we know whether the SDK is active
    }

    // CrazyGames always runs games inside an iframe on its own domain. On the owner's
    // site (top-level page, not framed) the SDK isn't even downloaded.
    shouldLoad() {
        if (typeof window === "undefined" || typeof document === "undefined") return false;
        if (ON_CRAZYGAMES_HOST) return true;
        let framed = false;
        try { framed = window.self !== window.top; } catch (e) { framed = true; }
        let localSdk = false;
        try { localSdk = new URLSearchParams(window.location.search).get("useLocalSdk") === "true"; } catch (e) { /* no URL */ }
        return framed || localSdk;
    }

    init() {
        if (this.ready) return this.ready;
        this.ready = new Promise((resolve) => {
            if (!this.shouldLoad()) return resolve(false);
            let settled = false;
            const finish = (ok) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(ok);
            };
            const timer = setTimeout(() => finish(false), CG_INIT_TIMEOUT_MS);
            const script = document.createElement("script");
            script.src = CG_SDK_URL;
            script.async = true;
            script.onerror = () => finish(false);
            script.onload = () => {
                const sdk = window.CrazyGames && window.CrazyGames.SDK;
                if (!sdk || typeof sdk.init !== "function") return finish(false);
                Promise.resolve()
                    .then(() => sdk.init())
                    .then(() => {
                        if (settled) return; // timed out: stay on normal behaviour
                        this.sdk = sdk;
                        this.environment = sdk.environment;
                        let localSdk = false;
                        try { localSdk = new URLSearchParams(window.location.search).get("useLocalSdk") === "true"; } catch (e) { /* no URL */ }
                        this.active = sdk.environment === "crazygames" || (sdk.environment === "local" && localSdk);
                        if (this.active) this.activate();
                        finish(this.active);
                    })
                    .catch((e) => {
                        console.warn("CrazyGames SDK init failed; playing without it.", e);
                        finish(false);
                    });
            };
            document.head.appendChild(script);
        });
        return this.ready;
    }

    activate() {
        document.documentElement.classList.add("on-crazygames");
        // Loading: the game itself boots without waiting for the SDK, so this
        // covers the last bit (fonts and the first frames of the menu) and
        // stops as soon as the menu is up and playable.
        this.loadingStart();
        const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(() => {}) : Promise.resolve();
        const pageLoaded = document.readyState === "complete"
            ? Promise.resolve()
            : new Promise((r) => window.addEventListener("load", r, { once: true }));
        Promise.all([fontsReady, pageLoaded]).then(() => {
            const done = () => this.loadingStop(); // runs once
            requestAnimationFrame(() => requestAnimationFrame(done));
            setTimeout(done, 1500); // hidden tabs don't run animation frames
        });
        // CrazyGames can mute the game (its own sound toggle). This silences all
        // game audio on top of the player's own Sound setting, which is left as is.
        const applyMute = (settings) => sound.setPlatformMuted(!!(settings && settings.muteAudio));
        this.safe(() => applyMute(this.sdk.game.settings));
        this.safe(() => this.sdk.game.addSettingsChangeListener((newSettings) => {
            const live = (this.sdk.game && this.sdk.game.settings) || {};
            applyMute({ ...live, ...(newSettings || {}) });
        }));
        if (this.wantGameplay) this.setGameplay(true);
    }

    safe(fn) {
        try {
            const r = fn();
            if (r && typeof r.catch === "function") r.catch((e) => console.warn("CrazyGames SDK:", e));
            return r;
        } catch (e) {
            console.warn("CrazyGames SDK:", e);
            return undefined;
        }
    }

    // ---- Gameplay tracking: call with true while a match is being played ----
    setGameplay(running) {
        this.wantGameplay = running;
        if (!this.active || running === this.gameplayRunning) return;
        this.gameplayRunning = running;
        this.safe(() => running ? this.sdk.game.gameplayStart() : this.sdk.game.gameplayStop());
    }

    // ---- Multiplayer invites ----

    // Room code from a CrazyGames invite link, or null
    getInviteRoom() {
        if (!this.active) return null;
        let v = this.safe(() => this.sdk.game.getInviteParam(CG_ROOM_PARAM));
        if (typeof v !== "string" || !v) v = null;
        return v;
    }

    isInstantMultiplayer() {
        return this.active && !!this.safe(() => this.sdk.game.isInstantMultiplayer);
    }

    // Resolves to the CrazyGames invite link for a room (null when not on CrazyGames)
    inviteLink(roomCode) {
        if (!this.active) return Promise.resolve(null);
        return Promise.resolve()
            .then(() => this.sdk.game.inviteLink({ [CG_ROOM_PARAM]: roomCode }))
            .then((link) => (typeof link === "string" && link ? link : null))
            .catch((e) => {
                console.warn("CrazyGames inviteLink failed:", e);
                return null;
            });
    }

    // ---- Multiplayer room status (SDK.game.updateRoom / leftRoom) ----
    // Tells CrazyGames which room the player is in and whether friends can still
    // join it, which drives its own Join/Invite buttons. updateRoom takes
    // { roomId, isJoinable, inviteParams } and only changes the fields given.
    // The calls are coalesced (the SDK throttles them) and repeats are skipped.
    // Older SDK builds without updateRoom fall back to the (deprecated) invite button.
    updateRoom(roomCode, joinable) {
        if (!this.active || !roomCode) return;
        this.pendingRoom = { roomCode, joinable: !!joinable };
        this.flushRoomSoon();
    }

    leftRoom() {
        if (!this.active) return;
        if (!this.room && !this.pendingRoom) return; // nothing was reported
        this.pendingRoom = "left";
        this.flushRoomSoon();
    }

    flushRoomSoon() {
        if (this.roomTimer) return;
        const wait = Math.max(0, (this.lastRoomCall || 0) + CG_ROOM_THROTTLE_MS - Date.now());
        this.roomTimer = setTimeout(() => {
            this.roomTimer = null;
            this.flushRoom();
        }, wait);
    }

    flushRoom() {
        const next = this.pendingRoom;
        this.pendingRoom = null;
        if (!next || !this.active) return;
        const game = this.sdk.game || {};
        const hasRoomApi = typeof game.updateRoom === "function";
        if (next === "left") {
            if (!this.room) return;
            this.room = null;
            this.lastRoomCall = Date.now();
            if (hasRoomApi && typeof game.leftRoom === "function") this.safe(() => game.leftRoom());
            else if (typeof game.hideInviteButton === "function") this.safe(() => game.hideInviteButton());
            return;
        }
        const prev = this.room;
        if (prev && prev.roomCode === next.roomCode && prev.joinable === next.joinable) return;
        this.room = next;
        this.lastRoomCall = Date.now();
        const inviteParams = { [CG_ROOM_PARAM]: next.roomCode };
        if (hasRoomApi) {
            this.safe(() => game.updateRoom({ roomId: next.roomCode, isJoinable: next.joinable, inviteParams }));
        } else if (next.joinable && typeof game.showInviteButton === "function") {
            this.safe(() => game.showInviteButton(inviteParams));
        } else if (typeof game.hideInviteButton === "function") {
            this.safe(() => game.hideInviteButton());
        }
    }

    // ---- Loading and celebration events ----
    loadingStart() {
        if (!this.active || this.loadingReported) return;
        this.loadingReported = true;
        this.safe(() => this.sdk.game.loadingStart());
    }

    loadingStop() {
        if (!this.active || !this.loadingReported || this.loadingDone) return;
        this.loadingDone = true;
        this.safe(() => this.sdk.game.loadingStop());
    }

    // A big win (ranked or online match). CrazyGames asks for this to be used sparingly.
    happytime() {
        if (!this.active) return;
        this.safe(() => this.sdk.game.happytime());
    }

    // A friend accepts an invite while the game is already open. Not every SDK
    // build has this listener, so it is only used when present.
    onJoinRoom(callback) {
        if (!this.active || !this.sdk.game || typeof this.sdk.game.addJoinRoomListener !== "function") return;
        this.safe(() => this.sdk.game.addJoinRoomListener((params) => {
            const code = params && (params[CG_ROOM_PARAM] || params.room);
            if (typeof code === "string" && code) callback(code);
        }));
    }
}

export const crazyGames = new CrazyGamesBridge();
