// ==========================================
// Who is playing: a CrazyGames account (through their SDK), a shared account
// (GameAccounts, from the main site), or a guest with a save in this browser.
// All of this is optional, and nothing here ever asks for a password:
// logging in to a shared account happens on the main Spear-Mace page.
// ==========================================

import { crazyGames } from './crazygames.js';
import { profile } from './profile.js';

function sharedApi() {
    const A = window.GameAccounts;
    return A && typeof A.current === 'function' ? A : null;
}

export const account = {
    cgUser: null,
    onChange: null,

    // After the portal SDK has started
    start() {
        if (!crazyGames.accountsAvailable) return Promise.resolve();
        crazyGames.onAuthChange((user) => this.setCgUser(user));
        return crazyGames.getUser().then((user) => this.setCgUser(user));
    },

    setCgUser(user) {
        this.cgUser = user || null;
        const name = user && typeof user.username === 'string' ? user.username.trim().slice(0, 24) : '';
        profile.externalName = name || null;
        if (this.onChange) this.onChange();
    },

    // kind: 'crazygames' | 'shared' | 'local'; name: the signed-in name, or null for a guest
    state() {
        if (crazyGames.accountsAvailable) return { kind: 'crazygames', name: profile.externalName || null };
        const A = sharedApi();
        if (A) {
            let cur = null;
            try { cur = A.current(); } catch (e) { cur = null; }
            return { kind: 'shared', name: cur ? cur.username : null };
        }
        return { kind: 'local', name: null };
    },

    // CrazyGames' own sign-in window. Resolves true if the player signed in.
    signInCrazyGames() {
        return crazyGames.showAuthPrompt().then((user) => {
            if (user) this.setCgUser(user);
            return !!user;
        });
    },

    // Shared accounts: the page reloads so the right save is used
    logOutShared() {
        const A = sharedApi();
        if (!A || typeof A.logOut !== 'function') return;
        try { A.logOut(); } catch (e) { return; }
        location.reload();
    }
};
