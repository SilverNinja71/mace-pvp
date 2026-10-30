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

class CrazyGamesBridge {
    constructor() {
        this.sdk = null;
        this.active = false; // true only when SDK.environment says we're on CrazyGames
        this.environment = null;
        this.gameplayRunning = false;
        this.wantGameplay = false;
        this.inviteRoom = null; // room code the invite button currently points to
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

    showInviteButton(roomCode) {
        if (!this.active || !roomCode) return;
        this.inviteRoom = roomCode;
        this.safe(() => this.sdk.game.showInviteButton({ [CG_ROOM_PARAM]: roomCode }));
    }

    hideInviteButton() {
        if (!this.active || !this.inviteRoom) return;
        this.inviteRoom = null;
        this.safe(() => this.sdk.game.hideInviteButton());
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
