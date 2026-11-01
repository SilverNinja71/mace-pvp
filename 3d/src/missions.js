// ==========================================
// Daily missions: three small goals a day, picked from a pool by the
// date, each paying gold once. Progress comes from finished matches.
// ==========================================

import { profile } from './profile.js';

const POOL = [
    { id: 'win2',    text: 'Win 2 matches',                 goal: 2, gold: 120, key: 'wins' },
    { id: 'slam5',   text: 'Land 5 mace slams',             goal: 5, gold: 80,  key: 'slamsLanded' },
    { id: 'spear8',  text: 'Land 8 spear hits',             goal: 8, gold: 80,  key: 'dashesLanded' },
    { id: 'big60',   text: 'Land a slam for 60+ damage',    goal: 1, gold: 100, key: 'bigSlams' },
    { id: 'void3',   text: 'Knock 3 rivals into the void',  goal: 3, gold: 100, key: 'voidKos' },
    { id: 'parry3',  text: 'Parry 3 attacks',               goal: 3, gold: 90,  key: 'parries' },
    { id: 'crit3',   text: 'Land 3 critical spear hits',    goal: 3, gold: 90,  key: 'crits' },
    { id: 'wave4',   text: 'Reach wave 4 in Gauntlet',      goal: 4, gold: 150, key: 'wave', best: true },
    { id: 'ko10',    text: 'Score 10 knockouts',            goal: 10, gold: 110, key: 'kos' }
];

function today() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Same three missions for everyone on the same day
function pick(day) {
    let h = 0;
    for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const ids = POOL.map(m => m.id);
    const out = [];
    while (out.length < 3) {
        h = (h * 1103515245 + 12345) >>> 0;
        const id = ids[h % ids.length];
        if (!out.includes(id)) out.push(id);
    }
    return out;
}

export const missions = {
    state() {
        const a = profile.data.arena3d;
        const day = today();
        if (!a.missions || a.missions.day !== day) {
            a.missions = { day, list: pick(day).map(id => ({ id, progress: 0, done: false })) };
            profile.save();
        }
        return a.missions;
    },

    list() {
        return this.state().list.map(m => ({ ...POOL.find(p => p.id === m.id), ...m }));
    },

    // After a match: stats are the local fighter's stats; extra = { win, wave }
    record(stats, extra = {}) {
        const s = this.state();
        const done = [];
        const values = {
            wins: extra.win ? 1 : 0, wave: extra.wave || 0,
            slamsLanded: stats.slamsLanded || 0, dashesLanded: stats.dashesLanded || 0, bigSlams: stats.bigSlams || 0,
            voidKos: stats.voidKos || 0, parries: stats.parries || 0, crits: stats.crits || 0, kos: stats.kos || 0
        };
        for (const m of s.list) {
            if (m.done) continue;
            const def = POOL.find(p => p.id === m.id);
            if (!def) continue;
            m.progress = def.best ? Math.max(m.progress, values[def.key]) : m.progress + values[def.key];
            if (m.progress >= def.goal) {
                m.progress = def.goal;
                m.done = true;
                profile.data.gold += def.gold;
                done.push({ text: def.text, gold: def.gold });
            }
        }
        profile.save();
        return done;
    }
};
