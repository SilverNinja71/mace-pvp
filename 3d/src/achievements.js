// ==========================================
// Achievements: one-time goals that pay gold, checked after every match.
// ==========================================

import { profile } from './profile.js';

export const ACHIEVEMENTS = [
    { id: 'first_win',   name: 'First Victory',   desc: 'Win a match',                               gold: 100, test: (c) => c.win },
    { id: 'first_ko',    name: 'Knockout!',       desc: 'Score a knockout',                          gold: 50,  test: (c) => c.stats.kos >= 1 },
    { id: 'big_slam',    name: 'Skyfall',         desc: 'Land a slam for 80+ damage',                gold: 150, test: (c) => c.stats.maxSlamDamage >= 80 },
    { id: 'mega_slam',   name: 'Meteor',          desc: 'Land a slam for 120+ damage',               gold: 300, test: (c) => c.stats.maxSlamDamage >= 120 },
    { id: 'void_master', name: 'Into the Abyss',  desc: 'Knock 3 rivals into the void in one match', gold: 200, test: (c) => c.stats.voidKos >= 3 },
    { id: 'parry_pro',   name: 'Iron Wall',       desc: 'Parry 5 attacks in one match',              gold: 200, test: (c) => c.stats.parries >= 5 },
    { id: 'crit_5',      name: 'Pinpoint',        desc: 'Land 5 critical spear hits in one match',   gold: 150, test: (c) => c.stats.crits >= 5 },
    { id: 'flawless',    name: 'Untouchable',     desc: 'Win a duel without falling once',           gold: 250, test: (c) => c.win && (c.mode === 'duel' || c.mode === 'quick') && c.stats.deaths === 0 },
    { id: 'god_slayer',  name: 'God Slayer',      desc: 'Beat a God bot in a duel',                  gold: 500, test: (c) => c.win && c.mode === 'duel' && c.level === 'god' },
    { id: 'hill_king',   name: 'King of the Hill', desc: 'Win King of the Hill',                     gold: 200, test: (c) => c.win && c.mode === 'hill' },
    { id: 'last_one',    name: 'Last One Standing', desc: 'Win Last Stand',                          gold: 200, test: (c) => c.win && c.mode === 'stand' },
    { id: 'wave_5',      name: 'Survivor',        desc: 'Reach wave 5 in Gauntlet',                  gold: 250, test: (c) => c.wave >= 5 },
    { id: 'wave_10',     name: 'Unbreakable',     desc: 'Reach wave 10 in Gauntlet',                 gold: 500, test: (c) => c.wave >= 10 },
    { id: 'online_win',  name: 'Among Friends',   desc: 'Win an online match',                       gold: 200, test: (c) => c.win && c.online },
    { id: 'three_class', name: 'Versatile',       desc: 'Win with 3 different classes',              gold: 300, test: (c) => c.winClasses >= 3 }
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
