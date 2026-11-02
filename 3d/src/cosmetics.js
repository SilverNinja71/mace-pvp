// ==========================================
// Weapon cosmetics: every look you can buy for the spear and the mace.
// This file imports nothing, so anything in the game can read it.
//
// A weapon's look has two independent parts, and one trail on top:
//   WEAPON_SKINS  the metal and the shaft
//   GLOW_COLORS   the spear tip, its halo, the mace runes and the default trail colour
//   TRAILS        the streak left behind a dash
//
// GLOWS is what fighters and weapon models read. It holds one style for every
// glow on every skin, each with { name, tip, halo, rune, metal, shaft, trail, cost },
// and a fighter's glowId is a key of it: 'frost' is Frost on the plain Steel skin (so
// old saves keep working), and 'frost.obsidian' is Frost on the Obsidian skin.
// Names are in i18n.js: glow.<id>, wskin.<id>, trail.<id>.
// ==========================================

export const WEAPON_SKINS = {
    steel:    { name: 'wskin.steel',    metal: 0x8c96a3, shaft: 0xdfe6ee, cost: 0 },
    copper:   { name: 'wskin.copper',   metal: 0xb8683a, shaft: 0x8a5a36, cost: 250 },
    bone:     { name: 'wskin.bone',     metal: 0xd8d2bd, shaft: 0xb9a98a, cost: 350 },
    gilded:   { name: 'wskin.gilded',   metal: 0xd9a520, shaft: 0xfff0c0, cost: 500 },
    obsidian: { name: 'wskin.obsidian', metal: 0x2b2d3a, shaft: 0x4a4d63, cost: 600 },
    crystal:  { name: 'wskin.crystal',  metal: 0x9fdcff, shaft: 0xe6f7ff, cost: 800 }
};

export const GLOW_COLORS = {
    sun:     { name: 'glow.sun',     tip: 0xffd54a, halo: 0xffe28a, rune: 0x5ff3ff, trail: 0xfff3b0, cost: 0 },
    frost:   { name: 'glow.frost',   tip: 0x9ff4ff, halo: 0xc8fbff, rune: 0x9fd8ff, trail: 0xc8fbff, cost: 300 },
    ember:   { name: 'glow.ember',   tip: 0xff7a2f, halo: 0xffb070, rune: 0xff9a3a, trail: 0xffb070, cost: 450 },
    verdant: { name: 'glow.verdant', tip: 0x6dff8e, halo: 0xb4ffc4, rune: 0x6dffb0, trail: 0xb4ffc4, cost: 450 },
    rose:    { name: 'glow.rose',    tip: 0xff6fb5, halo: 0xffb8da, rune: 0xff8fc8, trail: 0xffb8da, cost: 550 },
    storm:   { name: 'glow.storm',   tip: 0x5c8dff, halo: 0xa8c4ff, rune: 0xffe45c, trail: 0xa8c4ff, cost: 600 },
    void:    { name: 'glow.void',    tip: 0xc77dff, halo: 0xe2c2ff, rune: 0xb48cff, trail: 0xe2c2ff, cost: 700 }
};

// 'glow' follows whichever glow you have on. color2 fades along the streak.
export const TRAILS = {
    glow:   { name: 'trail.glow',   color: null,     color2: null,     cost: 0 },
    cloud:  { name: 'trail.cloud',  color: 0xffffff, color2: 0xbfd8ff, cost: 150 },
    cinder: { name: 'trail.cinder', color: 0xffc14a, color2: 0xff4a1c, cost: 300 },
    spark:  { name: 'trail.spark',  color: 0xfff27a, color2: 0x4aa8ff, cost: 300 },
    petal:  { name: 'trail.petal',  color: 0xffa8d8, color2: 0xff5fa0, cost: 400 },
    shadow: { name: 'trail.shadow', color: 0x9a6bff, color2: 0x241048, cost: 500 },
    prism:  { name: 'trail.prism',  color: 0x4afff0, color2: 0xff4ad8, cost: 900 }
};

// The key in GLOWS for a glow on a skin
export function styleId(glowId, skinId) {
    const g = GLOW_COLORS[glowId] ? glowId : 'sun';
    return !skinId || skinId === 'steel' || !WEAPON_SKINS[skinId] ? g : `${g}.${skinId}`;
}

export const GLOWS = {};
for (const g in GLOW_COLORS) {
    for (const s in WEAPON_SKINS) {
        const G = GLOW_COLORS[g], S = WEAPON_SKINS[s];
        GLOWS[styleId(g, s)] = { name: G.name, tip: G.tip, halo: G.halo, rune: G.rune, metal: S.metal, shaft: S.shaft, trail: G.trail, cost: G.cost + S.cost };
    }
}

// The colours a fighter's trail should be: [start, end]
export function trailColors(trailId, glowId) {
    const T = TRAILS[trailId];
    if (T && T.color !== null) return [T.color, T.color2];
    const G = GLOWS[glowId] || GLOWS.sun;
    return [G.trail, G.tip];
}
