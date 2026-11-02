// ==========================================
// Achievements: one-time goals that pay gold, checked after every match.
// ==========================================

import { profile } from './profile.js';

// Names and descriptions are in i18n.js (ach.<id>.name, ach.<id>.desc)
export const ACHIEVEMENTS = [
    { id: 'first_win',   gold: 100, test: (c) => c.win },
    { id: 'first_ko',    gold: 50,  test: (c) => c.stats.kos >= 1 },
    { id: 'big_slam',    gold: 150, test: (c) => c.stats.maxSlamDamage >= 80 },
    { id: 'mega_slam',   gold: 300, test: (c) => c.stats.maxSlamDamage >= 120 },
    { id: 'void_master', gold: 200, test: (c) => c.stats.voidKos >= 3 },
    { id: 'parry_pro',   gold: 200, test: (c) => c.stats.parries >= 5 },
    { id: 'crit_5',      gold: 150, test: (c) => c.stats.crits >= 5 },
    { id: 'flawless',    gold: 250, test: (c) => c.win && (c.mode === 'duel' || c.mode === 'quick') && c.stats.deaths === 0 },
    { id: 'god_slayer',  gold: 500, test: (c) => c.win && c.mode === 'duel' && c.level === 'god' },
    { id: 'hill_king',   gold: 200, test: (c) => c.win && c.mode === 'hill' },
    { id: 'last_one',    gold: 200, test: (c) => c.win && c.mode === 'stand' },
    { id: 'wave_5',      gold: 250, test: (c) => c.wave >= 5 },
    { id: 'wave_10',     gold: 500, test: (c) => c.wave >= 10 },
    { id: 'online_win',  gold: 200, test: (c) => c.win && c.online },
    { id: 'three_class', gold: 300, test: (c) => c.winClasses >= 3 }
];

export const achievements = {
    store() {
        const a = profile.data.arena3d;
        if (!a.ach) a.ach = {};
        if (!Array.isArray(a.winClasses)) a.winClasses = [];
        return a;
    },

    has(id) { return !!this.store().ach[id]; },

    // c: { stats, win, mode, level, online, wave, classId }. Returns the newly earned ones.
    check(c) {
        const a = this.store();
        if (c.win && c.classId && !a.winClasses.includes(c.classId)) a.winClasses.push(c.classId);
        const ctx = { wave: 0, online: false, ...c, winClasses: a.winClasses.length };
        const fresh = [];
        for (const t of ACHIEVEMENTS) {
            if (a.ach[t.id]) continue;
            let ok = false;
            try { ok = !!t.test(ctx); } catch (e) { ok = false; }
            if (!ok) continue;
            a.ach[t.id] = Date.now();
            profile.data.gold += t.gold;
            fresh.push(t);
        }
        profile.save();
        return fresh;
    }
};
