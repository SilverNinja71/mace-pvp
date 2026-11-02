// Checks the string table:  node 3d/tools/check-i18n.mjs
// - every language has exactly the same keys as English, with no empty strings
// - placeholders ({name}) and key caps ([WASD]) match English in every string
// - every key the code and the page use exists, and every id-based key family is complete
// - nothing in the table names another game, or holds an outside address
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const game = join(here, '..');
const { TABLE, LANGS, mapLocale } = await import(join(game, 'src/i18n.js'));
const { CLASSES, BOT_LEVELS } = await import(join(game, 'src/config.js'));

const problems = [];
const en = TABLE.en;
const keys = Object.keys(en);
const holes = (s) => (s.match(/\{\w+\}/g) || []).sort().join(' ');
const caps = (s) => (s.match(/\[[^\]]+\]/g) || []).length;
const BANNED = /minecraft|mojang|creeper|enderman|nether|wind charge|https?:\/\//i;

const ids = LANGS.map(L => L.id);
if (ids.join() !== Object.keys(TABLE).join()) problems.push(`LANGS and TABLE differ: ${ids} / ${Object.keys(TABLE)}`);

const sameAsEnglish = {};
for (const lang of ids) {
    const table = TABLE[lang];
    for (const k of keys) {
        if (!(k in table)) { problems.push(`${lang}: missing ${k}`); continue; }
        if (typeof table[k] !== 'string' || !table[k].trim()) problems.push(`${lang}: empty ${k}`);
        if (holes(table[k]) !== holes(en[k])) problems.push(`${lang}: ${k} placeholders "${holes(table[k])}" vs "${holes(en[k])}"`);
        if (caps(table[k]) !== caps(en[k])) problems.push(`${lang}: ${k} has ${caps(table[k])} key caps, English has ${caps(en[k])}`);
        if (BANNED.test(table[k])) problems.push(`${lang}: ${k} has a banned word: ${table[k]}`);
        if (lang !== 'en' && table[k] === en[k]) (sameAsEnglish[lang] = sameAsEnglish[lang] || []).push(k);
    }
    for (const k in table) if (!(k in en)) problems.push(`${lang}: extra key ${k}`);
}

// keys written out in the code and the page
const used = new Set();
const dir = join(game, 'src');
const sources = readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'i18n.js');
const code = {};
for (const f of sources) {
    const s = code[f] = readFileSync(join(dir, f), 'utf8');
    for (const m of s.matchAll(/\bt\(\s*'([\w.]+)'/g)) used.add(m[1]);
    for (const m of s.matchAll(/\btn\(\s*'([\w.]+)'/g)) { used.add(m[1] + '_one'); used.add(m[1] + '_other'); }
    for (const m of s.matchAll(/\? '((?:ko|res|timer|match|fx|online|sc|hud|fighter)\.\w+)'|: '((?:ko|res|timer|match|fx|online|sc|hud|fighter)\.\w+)'/g)) used.add(m[1] || m[2]);
    for (const m of s.matchAll(/(?:status|closed|onlineStatus)\('((?:online)\.\w+)'/g)) used.add(m[1]);
    for (const m of s.matchAll(/return '(online\.\w+)'/g)) used.add(m[1]);
}
const html = readFileSync(join(game, 'index.html'), 'utf8');
for (const m of html.matchAll(/data-i18n(?:-keys|-placeholder|-aria)?="([\w.]+)"/g)) used.add(m[1]);

// families of keys built from ids
const fam = (prefix, list, suffixes = ['']) => { for (const id of list) for (const s of suffixes) used.add(prefix + id + s); };
fam('class.', Object.keys(CLASSES), ['.name', '.desc']);
fam('bot.', Object.keys(BOT_LEVELS));
fam('mode.', [...code['game.js'].match(/export const MODES = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s+(\w+):/gm)].map(m => m[1]));
fam('map.', [...code['arena.js'].match(/export const LAYOUTS = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s+(\w+):/gm)].map(m => m[1]));
const cosmetics = await import(join(game, 'src/cosmetics.js'));
fam('glow.', Object.keys(cosmetics.GLOW_COLORS));
fam('wskin.', Object.keys(cosmetics.WEAPON_SKINS));
fam('trail.', Object.keys(cosmetics.TRAILS));
fam('modeDesc.', [...code['game.js'].match(/export const MODES = \{([\s\S]*?)\n\};/)[1].matchAll(/^\s+(\w+):/gm)].map(m => m[1]));
fam('map.', ['random']);
fam('howto.', ['moveHigh']);
fam('ctl.', ['move', 'look', 'jump', 'spear', 'mace', 'parry', 'camera', 'pause', 'scores']);
fam('howto.move.', ['spear', 'slam', 'parry', 'high']);
fam('acct.', ['login', 'cgNote', 'cgPrompt', 'sharedNote', 'sharedPrompt', 'guestNote']);
fam('mission.', [...code['missions.js'].matchAll(/\{ id: '(\w+)'/g)].map(m => m[1]));
fam('ach.', [...code['achievements.js'].matchAll(/\{ id: '(\w+)'/g)].map(m => m[1]), ['.name', '.desc']);
fam('tu.', ['move', 'jump', 'spear', 'geyser', 'slam', 'parry', 'pad'], ['.title', '.keys', '.touch', '.text']);
fam('cause.', ['void', 'slam', 'mace', 'burn', 'spear']);
fam('fx.', ['slowed', 'poisoned', 'blinded', 'fire']);
fam('tier.', ['bronze', 'silver', 'gold', 'diamond', 'obsidian']);
fam('qualityNow.', ['high', 'medium', 'low']);
fam('th.', ['fighter', 'hill', 'kos', 'falls', 'damage', 'slams', 'spear', 'bestSlam']);
fam('st.', ['slow', 'poison', 'fire', 'blind', 'stunned', 'shield']);
fam('hints.', ['touch1', 'touch2', 'touch3', 'keys1', 'keys2', 'keys3', 'keys4', 'keys5']);
fam('hl.', ['slam', 'kos', 'crits', 'parries', 'damage']);
fam('key.', ['lmb', 'rmb', 'spc']);

for (const k of used) if (!k.endsWith('.') && !(k in en)) problems.push(`used but not in the table: ${k}`);
// (a key ending in a dot is the start of t('map.' + id): those families are listed above)
const unused = keys.filter(k => !used.has(k));
if (unused.length) problems.push(`in the table but not used: ${unused.join(', ')}`);

// the language mapping
for (const [from, to] of [['pt-PT', 'pt-BR'], ['pt-BR', 'pt-BR'], ['pt', 'pt-BR'], ['es-MX', 'es'], ['es-ES', 'es'], ['de_AT', 'de'], ['fr-CA', 'fr'], ['ru-RU', 'ru'], ['tr-TR', 'tr'], ['pl-PL', 'pl'], ['id-ID', 'id'], ['en-GB', 'en'], ['ja-JP', null], ['', null], [null, null]]) {
    if (mapLocale(from) !== to) problems.push(`mapLocale(${from}) gave ${mapLocale(from)}, expected ${to}`);
}

console.log(`${keys.length} keys, ${ids.length} languages (${ids.join(', ')}), ${[...used].filter(k => !k.endsWith('.')).length} keys used by code and page`);
for (const lang of Object.keys(sameAsEnglish)) console.log(`  ${lang}: ${sameAsEnglish[lang].length} strings the same as English`);
if (problems.length) { console.log(`\n${problems.length} PROBLEMS:\n` + problems.join('\n')); process.exit(1); }
console.log('OK: every key is in every language, placeholders and key caps match.');
