// ==========================================
// Profile: the same save the 2D game uses (localStorage
// "spear_mace_user_profile"), so name, gold, XP, class, skin and career
// stats carry over both ways. Fields this version doesn't know about are
// left exactly as they are.
// ==========================================

import { CLASSES, CLASS_LEVEL } from './config.js';
import { SKINS } from './character.js';

const KEY = 'spear_mace_user_profile';

// Gold and XP per match against bots, the same scale as the 2D game
const REWARDS = {
    easy:   { winGold: 18,  winXp: 35,  loseGold: 4,  rp: 0 },
    normal: { winGold: 45,  winXp: 70,  loseGold: 10, rp: 10 },
    pro:    { winGold: 140, winXp: 160, loseGold: 20, rp: 20 },
    god:    { winGold: 320, winXp: 300, loseGold: 35, rp: 30 }
};

class Profile {
    constructor() {
        this.data = this.load();
        window.addEventListener('storage', (e) => { if (e.key === KEY && e.newValue) this.data = this.load(); });
    }

    load() {
        let p = null;
        try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { p = null; }
        if (!p || typeof p !== 'object') {
            p = {
                id: 'guest_' + Math.random().toString(36).slice(2, 8),
                username: 'Steve', authProvider: 'guest', level: 1, xp: 0, gold: 300,
                equippedWeapon: 'mace', secondaryWeapon: null, classId: 'normal',
                skinId: 'steve', unlockedSkins: ['steve', 'alex'], arenaRP: 250, isMinor: false,
                stats: { matches: 0, wins: 0, losses: 0, slamsLanded: 0, dashesLanded: 0, maxSlamDamage: 0, kills: 0, damageDealt: 0, currentStreak: 0, bestStreak: 0 }
            };
        }
        if (!p.stats) p.stats = {};
        for (const k of ['matches', 'wins', 'losses', 'slamsLanded', 'dashesLanded', 'maxSlamDamage', 'kills', 'damageDealt', 'currentStreak', 'bestStreak']) {
            if (typeof p.stats[k] !== 'number') p.stats[k] = 0;
        }
        if (!CLASSES[p.classId]) p.classId = 'normal';
        if (!SKINS[p.skinId]) p.skinId = 'steve';
        if (!Array.isArray(p.unlockedSkins)) p.unlockedSkins = ['steve', 'alex'];
        if (typeof p.gold !== 'number') p.gold = 300;
        if (typeof p.xp !== 'number') p.xp = 0;
        if (typeof p.level !== 'number') p.level = 1;
        if (!p.arena3d) p.arena3d = { tutorialDone: false, gauntletBest: 0, settings: {} };
        return p;
    }

    save() {
        try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* private mode: play without saving */ }
        try { if (window.GameAccounts && window.GameAccounts.trophies) window.GameAccounts.trophies.check(); } catch (e) { /* no accounts */ }
    }

    get name() { return this.data.username || 'Steve'; }
    // The class used in 3D matches: the saved one if your level has unlocked it, else Normal
    // (the saved choice is left alone, since the 2D game shares this save)
    get classId() { return this.classUnlocked(this.data.classId) ? this.data.classId : 'normal'; }
    get skinId() { return this.data.skinId; }
    get gold() { return this.data.gold; }
    get level() { return this.data.level; }
    get settings() { return this.data.arena3d.settings; }
    get glowId() { return this.data.arena3d.glow || 'sun'; }
    get glows() { return this.data.arena3d.glows || ['sun']; }
    setGlow(id) { if (this.glows.includes(id)) { this.data.arena3d.glow = id; this.save(); } }
    buyGlow(id, cost) {
        if (this.glows.includes(id) || this.data.gold < cost) return false;
        this.data.gold -= cost;
        this.data.arena3d.glows = [...this.glows, id];
        this.data.arena3d.glow = id;
        this.save();
        return true;
    }
    get tutorialDone() { return !!this.data.arena3d.tutorialDone; }

    classUnlocked(id) { return (this.data.level || 1) >= (CLASS_LEVEL[id] || 1); }
    setClass(id) { if (CLASSES[id] && this.classUnlocked(id)) { this.data.classId = id; this.save(); } }
    setSkin(id) { if (this.data.unlockedSkins.includes(id)) { this.data.skinId = id; this.save(); } }
    setName(n) {
        if (window.GameAccounts && window.GameAccounts.current && window.GameAccounts.current()) return false;
        const t = String(n || '').trim();
        if (t.length < 2 || t.length > 16 || !/^[a-zA-Z0-9_ ]+$/.test(t)) return false;
        this.data.username = t; this.save(); return true;
    }
    setSetting(k, v) { this.data.arena3d.settings[k] = v; this.save(); }
    markTutorial() { this.data.arena3d.tutorialDone = true; this.save(); }

    // Same rule as the 2D game: XP keeps adding up, every 200 XP is a level, and each
    // new level pays 200 gold
    addXp(x) {
        const p = this.data;
        p.xp += x;
        const next = Math.floor(p.xp / 200) + 1;
        const ups = Math.max(0, next - p.level);
        if (ups) {
            const before = p.level;
            p.level = next; p.gold += ups * 200;
            // classes this level-up unlocked, for the results screen
            this.newClasses = Object.keys(CLASS_LEVEL).filter(id => CLASS_LEVEL[id] > before && CLASS_LEVEL[id] <= next).map(id => CLASSES[id].name);
        }
        return ups;
    }
    levelProgress() { return (this.data.xp % 200) / 200; }

    // One finished match. level: bot level (easy/normal/pro/god) or 'online'
    recordMatch(win, level, st) {
        const p = this.data, s = p.stats;
        const r = REWARDS[level] || REWARDS.normal;
        s.matches++;
        let gold, xp, rp = 0;
        if (win) {
            s.wins++; s.currentStreak++;
            if (s.currentStreak > s.bestStreak) s.bestStreak = s.currentStreak;
            gold = level === 'online' ? 90 : r.winGold;
            xp = level === 'online' ? 100 : r.winXp;
            rp = level === 'online' ? 30 : r.rp;
        } else {
            s.losses++; s.currentStreak = 0;
            gold = level === 'online' ? 20 : r.loseGold;
            xp = 25;
            rp = level === 'online' ? -14 : (r.rp ? -5 : 0);
        }
        if (st) {
            s.slamsLanded += st.slamsLanded || 0;
            s.dashesLanded += st.dashesLanded || 0;
            s.kills += st.kos || 0;
            s.damageDealt += Math.round(st.damageDealt || 0);
            if ((st.maxSlamDamage || 0) > s.maxSlamDamage) s.maxSlamDamage = Math.round(st.maxSlamDamage);
        }
        p.gold += gold;
        p.arenaRP = Math.max(0, (p.arenaRP || 250) + rp);
        const ups = this.addXp(xp);
        this.save();
        return { gold, xp, rp, levelUps: ups };
    }

    recordGauntlet(waves, st) {
        const a = this.data.arena3d;
        const best = waves > a.gauntletBest;
        if (best) a.gauntletBest = waves;
        const gold = waves * 25;
        this.data.gold += gold;
        const ups = this.addXp(waves * 30 + 10);
        if (st) {
            const s = this.data.stats;
            s.slamsLanded += st.slamsLanded || 0; s.dashesLanded += st.dashesLanded || 0; s.kills += st.kos || 0;
            s.damageDealt += Math.round(st.damageDealt || 0);
            if ((st.maxSlamDamage || 0) > s.maxSlamDamage) s.maxSlamDamage = Math.round(st.maxSlamDamage);
        }
        this.save();
        return { gold, xp: waves * 30 + 10, best, levelUps: ups };
    }
}

export const profile = new Profile();
