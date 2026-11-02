// ==========================================
// UI: menus, panels, the in-game HUD, results and the revive offer.
// The HUD only touches the page when a value actually changes.
// ==========================================

import { CLASSES, CLASS_LEVEL, SPEAR, PARRY, TEAM_COLORS, BOT_LEVELS } from './config.js';
import { SKINS } from './character.js';
import { WEAPON_SKINS, GLOW_COLORS, TRAILS, styleId, trailColors } from './cosmetics.js';
import { MODES } from './game.js';
import { LAYOUTS } from './arena.js';
import { account } from './account.js';
import { slamDamage } from './combat.js';
import { profile } from './profile.js';
import { audio } from './audio.js';
import { crazyGames } from './crazygames.js';
import { Tutorial } from './tutorial.js';
import { missions } from './missions.js';
import { ACHIEVEMENTS, achievements } from './achievements.js';
import { t, tn, keyHtml, applyDom, LANGS, getLang, setSavedLang } from './i18n.js';

// Skin prices in gold, the same as the 2D game's shop
const SKIN_COST = { steve: 0, alex: 0, noob: 200, man_face: 400, creeper: 500, enderman: 600, skeleton: 500, zombie: 400, diamond_knight: 800 };

// Which difficulties each mode offers (Quick Play picks by itself; Gauntlet ramps up; Training has none)
const MODE_LEVELS = { duel: ['easy', 'normal', 'pro', 'god'], brawl: ['easy', 'normal', 'pro'], hill: ['easy', 'normal', 'pro'], stand: ['easy', 'normal', 'pro'] };
const LOBBY_TABS = ['play', 'fighter', 'weapons', 'quests', 'howto'];

const $ = (id) => document.getElementById(id);
const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
const icon = (id) => `<svg class="ico"><use href="#i-${id}"/></svg>`;
const coin = '<i class="coin"></i>';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class UI {
    constructor() {
        this.game = null;
        this.cache = {};
        this.speed = 0;
        this.bannerT = 0;
        this.lobbyTab = 'play';
        this.tryOn = null;        // { kind, id }: an unowned look shown on the podium before buying
        this.lastStart = { mode: 'quick', level: 'normal' };
        this.panelStack = [];
        this.tags = [];
        this.hintsT = 0;
    }

    bind(game) {
        this.game = game;
        const g = game;
        const click = (el, fn) => el && el.addEventListener('click', (e) => { audio.unlock(); audio.play('click'); fn(e); });

        click($('btn-play'), () => this.playSelected());
        click($('btn-tutorial'), () => this.start({ mode: 'training' }));
        document.querySelectorAll('[data-panel]').forEach((b) => click(b, () => this.openPanel(b.getAttribute('data-panel'))));
        document.querySelectorAll('.panel-close').forEach((b) => click(b, () => this.closePanel()));
        this.bindLobby(click);

        click($('btn-resume'), () => g.resume());
        click($('btn-quit'), () => { $('pause').classList.add('hidden'); this.leaveMatch(); });
        click($('btn-pause-touch'), () => g.pause());
        click($('click-to-play'), () => { g.input.requestLock(); });
        click($('res-again'), () => this.afterResults(() => {
            if (this.wasOnline) {
                // online rematch: back to the same room's lobby
                const r = this.room;
                const connected = r && r.peer && (r.isHost || (r.hostConn && r.hostConn.open));
                g.quitToMenu(connected);
                if (r) {
                    if (!connected) { $('room-info').classList.add('hidden'); this.onlineStatus('online.roomClosed'); }
                    this.openPanel('online');
                }
                return;
            }
            this.start(this.lastStart);
        }));
        click($('res-menu'), () => this.afterResults(() => g.quitToMenu()));
        click($('res-revive'), () => this.watchRevive());
        click($('res-train'), () => this.afterResults(() => this.start({ mode: 'training' })));
        click($('res-double'), () => {
            const r = this.lastReward;
            if (!r || r.doubled) return;
            crazyGames.showAd('rewarded').then((ok) => {
                if (!ok) { this.toast(t('toast.adFailed')); return; }
                r.doubled = true;
                profile.data.gold += r.gold;
                profile.save();
                $('res-double').classList.add('hidden');
                this.toast(t('toast.bonusGold', { n: r.gold }));
                this.refreshProfile();
            });
        });
        click($('btn-revive'), () => this.watchRevive());
        click($('tu-skip'), () => { if (g.tutorial) g.tutorial.skip(); });
        click($('tu-play'), () => this.start({ mode: 'quick', level: quickLevel() }));
        click($('tu-menu'), () => g.quitToMenu());

        this.bindSettings();
        this.bindFighter();
        account.onChange = () => this.refreshProfile();
        // another tab (or the main page, logging in) changed the save
        window.addEventListener('storage', () => { if (g.state === 'menu') this.refreshProfile(); });
        this.showTab('play');
    }

    seg(root, attr, onPick) {
        if (!root) return;
        root.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => {
            e.preventDefault();
            root.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
            audio.play('click');
            onPick(b.getAttribute('data-' + attr));
        }));
    }

    setSeg(root, attr, v) {
        root.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.getAttribute('data-' + attr) === v));
    }

    start(opts) {
        this.lastStart = opts;
        this.tryOn = null;
        this.closeAllPanels();
        $('results').classList.add('hidden');
        $('pause').classList.add('hidden');
        this.game.startMatch(opts);
        if (opts.mode === 'training') this.game.tutorial = new Tutorial(this.game, this);
    }

    leaveMatch() {
        const g = this.game;
        if (g.mode === 'gauntlet') {
            // leaving mid-run still pays for the waves already cleared
            if (!g.pendingGauntlet && g.wave > 1) g.pendingGauntlet = { waves: g.fighters.slice(1).some(f => f.alive) ? g.wave - 1 : g.wave };
            if (g.pendingGauntlet) g.finishGauntlet();
        }
        g.quitToMenu();
    }

    // A midgame ad at the natural break after a match (CrazyGames decides if one shows)
    afterResults(next) {
        const g = this.game;
        if (g.mode === 'gauntlet') {
            const r = g.finishGauntlet();
            if (r) {
                const parts = [t('res.gold', { n: r.gold }), t('res.xp', { n: r.xp })];
                if (r.best) parts.push(t('toast.newBest'));
                if (r.missions && r.missions.length) parts.push(t('toast.missionDone', { n: r.missions[0].gold }));
                if (r.ach && r.ach.length) parts.push('🏅 ' + r.ach.map(a => t('ach.' + a.id + '.name')).join(', '));
                this.toast(parts.join(' · '));
            }
        }
        $('results').classList.add('hidden');
        crazyGames.showAd('midgame').then(() => next());
    }

    watchRevive() {
        crazyGames.showAd('rewarded').then((ok) => {
            if (ok) this.game.revive();
            else this.toast(t('toast.adNoRevive'));
        });
    }

    // ---------------- online rooms ----------------
    bindOnline(room) {
        this.room = room;
        const g = this.game;
        const status = (key, vars) => this.onlineStatus(key, vars);
        room.onStatus = status;
        room.onLobby = (list, isHost) => {
            $('room-info').classList.remove('hidden');
            $('room-code').textContent = room.code;
            $('room-link').value = room.inviteLink();
            this.lobbyList = list;
            this.renderRoomPlayers();
            $('btn-room-start').classList.toggle('hidden', !isHost);
            $('room-mode').classList.toggle('hidden', !isHost);
            $('btn-room-start').disabled = list.length < 2;
            if (!isHost) status('online.connected');
        };
        room.onClosed = (reason, wasPlaying) => {
            if (wasPlaying && g.state !== 'menu' && g.state !== 'over') { g.quitToMenu(); }
            $('room-info').classList.add('hidden');
            if (reason) { this.toast(t(reason)); status(reason); }
        };
        $('btn-host').addEventListener('click', () => {
            audio.unlock(); audio.play('click');
            status('online.making');
            room.host((code) => {
                status('online.ready');
                crazyGames.showInvite(code);
            });
        });
        const join = () => {
            const code = $('room-input').value.trim().toUpperCase();
            if (code.length < 4) { status('online.typeCode'); return; }
            status('online.joining', { code });
            room.join(code, () => status('online.connected'));
        };
        $('btn-join').addEventListener('click', () => { audio.unlock(); audio.play('click'); join(); });
        $('room-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
        $('btn-copy').addEventListener('click', () => {
            const link = $('room-link');
            link.select();
            const done = () => this.toast(t('online.copied'));
            if (navigator.clipboard) navigator.clipboard.writeText(link.value).then(done, () => { document.execCommand('copy'); done(); });
            else { document.execCommand('copy'); done(); }
        });
        this.roomMode = 'ko';
        this.seg($('room-mode'), 'v', (v) => { this.roomMode = v; });
        $('btn-room-start').addEventListener('click', () => { audio.play('click'); if (!room.startMatch(this.roomMode)) status('online.waitFriend'); });
        $('online-back').addEventListener('click', () => { if (!room.inMatch) { room.leave(true); $('room-info').classList.add('hidden'); this.lobbyList = null; status(null); } });
    }

    // The message under the room buttons: kept as a key so it can follow a language change
    onlineStatus(key, vars) {
        this.statusMsg = key ? { key, vars } : null;
        $('online-status').textContent = key ? t(key, vars) : '';
    }

    renderRoomPlayers() {
        const list = this.lobbyList;
        if (!list) return;
        $('room-players').innerHTML = list.map((n, i) => `${i === 0 ? '👑 ' : ''}${esc(n)}`).join(' · ') + (list.length < 2 ? ' — ' + esc(t('online.waiting')) : '');
    }

    joinFromLink(code) {
        this.openPanel('online');
        $('room-input').value = code;
        this.onlineStatus('online.joining', { code });
        this.room.join(code, () => this.onlineStatus('online.connected'));
    }

    // ---------------- panels ----------------
    openPanel(name) {
        const el = $('panel-' + name);
        if (!el) return;
        if (name === 'settings') this.renderSettings();
        if (name === 'account') this.renderAccount();
        el.classList.remove('hidden');
        this.panelStack.push(el);
    }
    closePanel() {
        const el = this.panelStack.pop();
        if (el) el.classList.add('hidden');
        this.refreshProfile();
    }
    closeAllPanels() {
        while (this.panelStack.length) this.panelStack.pop().classList.add('hidden');
    }

    showMenu() {
        $('hud').classList.add('hidden');
        $('touch').classList.add('hidden');
        $('results').classList.add('hidden');
        $('pause').classList.add('hidden');
        $('click-to-play').classList.add('hidden');
        $('menu').classList.remove('hidden');
        this.speedLines(0);
        $('vignette').style.opacity = 0;
        $('blind').style.opacity = 0;
        // the map you chose stands behind the podium
        if (this.sel && LAYOUTS[this.sel.map] && this.sel.mode !== 'training') this.game.previewMap(this.sel.map);
        this.refreshProfile();
    }

    // The top bar, and anything else that shows your progress
    refreshProfile() {
        const p = profile.data;
        this.syncShowcase();
        $('pc-name').textContent = profile.name;
        $('pc-level-n').textContent = p.level;
        $('pc-level').textContent = t('profile.level', { n: p.level });
        $('pc-xp').style.width = (profile.levelProgress() * 100).toFixed(0) + '%';
        $('pc-gold').textContent = p.gold;
        const rp = p.arenaRP || 0;
        const tier = rp >= 2000 ? 'obsidian' : rp >= 1500 ? 'diamond' : rp >= 1000 ? 'gold' : rp >= 500 ? 'silver' : 'bronze';
        $('pc-tier').textContent = t('tier.' + tier);
        const acc = account.state();
        const canLogIn = !acc.name && acc.kind !== 'local';
        $('account-label').textContent = t(canLogIn ? 'acct.login' : 'acct.account');
        $('btn-account').classList.toggle('can-login', canLogIn);
        $('btn-account').setAttribute('aria-label', t(canLogIn ? 'acct.login' : 'acct.account'));
        const list = missions.list();
        $('quest-badge').textContent = `${list.filter(m => m.done).length}/${list.length}`;
        $('howto-dot').classList.toggle('hidden', profile.tutorialDone);
        $('plate-name').textContent = (SKINS[this.shownLook('skin')] || SKINS.steve).name;
        $('plate-sub').textContent = t('class.' + profile.classId + '.name');
        this.renderTab();
    }

    // The fighter on the podium wears what you own, or what you're trying on
    shownLook(kind) {
        if (this.tryOn && this.tryOn.kind === kind) return this.tryOn.id;
        if (kind === 'skin') return profile.skinId;
        if (kind === 'glow') return profile.glowColor;
        if (kind === 'wskin') return profile.weaponSkin;
        return profile.trailId;
    }

    syncShowcase() {
        const g = this.game;
        if (!g || g.state !== 'menu') return;
        const look = { skinId: this.shownLook('skin'), glowId: styleId(this.shownLook('glow'), this.shownLook('wskin')), trailId: this.shownLook('trail') };
        const sig = `${look.skinId}|${look.glowId}|${look.trailId}`;
        if (g.showcase && this.showSig === sig) return;
        this.showSig = sig;
        g.showcaseLook = look;
        g.refreshShowcase();
    }

    // The free space between the panels, for the lobby's camera
    stageRect() {
        const r = $('stage-frame').getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
    }

    // ---------------- lobby ----------------
    bindLobby(click) {
        const saved = profile.lobby;
        const levels = saved.levels && typeof saved.levels === 'object' ? saved.levels : {};
        this.sel = {
            mode: MODES[saved.mode] && saved.mode !== 'online' ? saved.mode : 'quick',
            map: LAYOUTS[saved.map] ? saved.map : 'random',
            levels: {}
        };
        for (const m in MODE_LEVELS) this.sel.levels[m] = MODE_LEVELS[m].includes(levels[m]) ? levels[m] : 'normal';

        document.querySelectorAll('.nav-tab').forEach((b) => click(b, () => this.showTab(b.getAttribute('data-tab'))));
        click($('player-chip'), () => this.showTab('fighter'));
        click($('btn-account'), () => this.openPanel('account'));
        this.howtoInput = null;
        this.seg($('howto-input'), 'input', (v) => { this.howtoInput = v; this.renderHowto(); });

        // turn the fighter by dragging on the stage, with a mouse or a finger
        const stage = $('stage');
        let lastX = null;
        stage.addEventListener('pointerdown', (e) => {
            lastX = e.clientX;
            stage.classList.add('dragging');
            try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
        });
        stage.addEventListener('pointermove', (e) => {
            if (lastX === null) return;
            const dx = e.clientX - lastX;
            lastX = e.clientX;
            if (dx && this.game) this.game.turnShowcase(dx);
            if (dx) $('plate-hint').classList.add('used');
        });
        const stop = () => { lastX = null; stage.classList.remove('dragging'); };
        stage.addEventListener('pointerup', stop);
        stage.addEventListener('pointercancel', stop);
        window.addEventListener('keydown', (e) => {
            if (!this.game || this.game.state !== 'menu' || (e.target && e.target.tagName === 'INPUT')) return;
            if (e.key === 'Escape' && this.panelStack.length) { this.closePanel(); return; }
            if (this.panelStack.length) return;
            if (e.key === 'ArrowLeft') this.game.turnShowcase(-18);
            if (e.key === 'ArrowRight') this.game.turnShowcase(18);
        });
        // the countdown to the next missions
        setInterval(() => { if (this.lobbyTab === 'quests' && this.game.state === 'menu') this.renderResetTime(); }, 30000);
    }

    showTab(tab) {
        if (!LOBBY_TABS.includes(tab)) tab = 'play';
        this.lobbyTab = tab;
        this.tryOn = null;
        $('menu').setAttribute('data-tab', tab);
        document.querySelectorAll('.nav-tab').forEach((b) => {
            const on = b.getAttribute('data-tab') === tab;
            b.classList.toggle('on', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        for (const id of LOBBY_TABS) $('tab-' + id).classList.toggle('hidden', id !== tab);
        $('play-options').classList.toggle('hidden', tab !== 'play');
        this.refreshProfile();
    }

    // Draws the open tab (the Play button's label is always kept up to date)
    renderTab() {
        this.renderPlaySummary();
        const tab = this.lobbyTab;
        if (tab === 'play') this.renderPlay();
        else if (tab === 'fighter') this.renderFighter();
        else if (tab === 'weapons') this.renderWeapons();
        else if (tab === 'quests') this.renderQuests();
        else if (tab === 'howto') this.renderHowto();
    }

    saveLobby() { profile.setLobby({ mode: this.sel.mode, map: this.sel.map, levels: this.sel.levels }); }

    playSelected() {
        const m = this.sel.mode;
        const level = m === 'quick' ? quickLevel() : (MODE_LEVELS[m] ? this.sel.levels[m] : 'normal');
        // Training always uses the colosseum: the tutorial's steps are written for it
        const layout = m !== 'training' && LAYOUTS[this.sel.map] ? this.sel.map : undefined;
        this.start({ mode: m, level, layout });
    }

    renderPlaySummary() {
        const mode = t('mode.' + this.sel.mode);
        $('play-sub').textContent = this.sel.mode === 'training' ? mode : `${mode} · ${t('map.' + this.sel.map)}`;
    }

    renderPlay() {
        const list = $('mode-list');
        list.innerHTML = '';
        const online = this.room !== undefined;
        for (const id of Object.keys(MODES)) {
            if (id === 'online' && !online) continue;
            const b = document.createElement('button');
            b.className = 'mode-row' + (this.sel.mode === id ? ' on' : '') + (id === 'online' ? ' online-only' : '');
            const best = id === 'gauntlet' ? tn('modes.best', profile.data.arena3d.gauntletBest || 0) : '';
            b.innerHTML = `<span class="mode-ico">${icon(id)}</span><span class="mode-text"><b>${esc(t('mode.' + id))}</b><small>${esc(best || t('modeDesc.' + id))}</small></span>`;
            b.addEventListener('click', () => {
                audio.unlock(); audio.play('click');
                if (id === 'online') { this.openPanel('online'); return; }
                this.sel.mode = id;
                this.saveLobby();
                this.renderPlay();
                this.renderPlaySummary();
            });
            list.appendChild(b);
        }
        const levels = MODE_LEVELS[this.sel.mode];
        const seg = $('level-seg');
        seg.classList.toggle('hidden', !levels);
        if (levels) {
            seg.innerHTML = levels.map(l => `<button data-level="${l}"${this.sel.levels[this.sel.mode] === l ? ' class="on"' : ''}>${esc(t('bot.' + l))}</button>`).join('');
            seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
                audio.play('click');
                this.sel.levels[this.sel.mode] = b.getAttribute('data-level');
                this.saveLobby();
                this.renderPlay();
            }));
        }
        $('level-note').classList.toggle('hidden', this.sel.mode !== 'quick');
        $('level-row').classList.toggle('auto', this.sel.mode === 'quick');
        $('level-row').classList.toggle('hidden', !levels && this.sel.mode !== 'quick');
        const training = this.sel.mode === 'training';
        const maps = $('map-list');
        maps.innerHTML = '';
        $('map-row').classList.toggle('hidden', training);
        for (const id of ['random', ...Object.keys(LAYOUTS)]) {
            const b = document.createElement('button');
            b.className = 'map-tile' + (this.sel.map === id ? ' on' : '');
            b.innerHTML = `${icon(id)}<span>${esc(t('map.' + id))}</span>`;
            b.addEventListener('click', () => {
                audio.play('click');
                this.sel.map = id;
                this.saveLobby();
                if (id !== 'random') this.game.previewMap(id);
                this.renderPlay();
                this.renderPlaySummary();
            });
            maps.appendChild(b);
        }
    }

    // One tile in a list of things to choose
    tile(listEl, { swatch, name, price, on, tried, lockNote, onClick, onHover }) {
        const b = document.createElement('button');
        b.className = 'tile' + (on ? ' on' : '') + (tried ? ' tried' : '') + (price || lockNote ? ' locked' : '');
        b.innerHTML = `<span class="tile-sw">${swatch}</span><span class="tile-body"><span class="tile-name">${esc(name)}</span>`
            + (price ? `<span class="tile-tag tag-price">${coin}${price}</span>` : '')
            + (lockNote ? `<span class="tile-tag tag-lock">${icon('lock')}${esc(lockNote)}</span>` : '')
            + `</span>` + (on ? `<span class="tile-tag tag-on">${icon('check')}</span>` : '');
        b.addEventListener('click', () => { audio.unlock(); audio.play('click'); onClick(); });
        if (onHover) b.addEventListener('mouseenter', onHover);
        listEl.appendChild(b);
    }

    bindFighter() {
        const save = () => {
            const ok = profile.setName($('name-input').value);
            const fixed = profile.externalName || (window.GameAccounts && window.GameAccounts.current && window.GameAccounts.current());
            $('name-msg').textContent = t(ok ? 'fighter.saved' : (fixed ? 'fighter.nameAccount' : 'fighter.nameRule'));
            const typed = $('name-input').value;
            this.refreshProfile();
            if (!ok) $('name-input').value = typed;
        };
        $('name-save').addEventListener('click', () => { audio.play('click'); save(); });
        $('name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { save(); e.target.blur(); } });
    }

    renderFighter() {
        const p = profile.data;
        const cl = $('class-list');
        cl.innerHTML = '';
        for (const id in CLASSES) {
            const c = CLASSES[id];
            const className = t('class.' + id + '.name');
            const classDesc = t('class.' + id + '.desc');
            const open = profile.classUnlocked(id);
            this.tile(cl, {
                swatch: `<i class="sw-dot" style="background:${c.color}"></i>`,
                name: className,
                on: profile.classId === id,
                lockNote: open ? null : t('profile.level', { n: CLASS_LEVEL[id] }),
                onClick: () => {
                    if (!open) { this.toast(t('fighter.classLocked', { name: className, n: CLASS_LEVEL[id] })); $('class-desc').textContent = classDesc + ' ' + t('fighter.unlocksAt', { n: CLASS_LEVEL[id] }); return; }
                    profile.setClass(id);
                    this.refreshProfile();
                },
                onHover: () => { $('class-desc').textContent = classDesc + (open ? '' : ' ' + t('fighter.unlocksAt', { n: CLASS_LEVEL[id] })); }
            });
        }
        $('class-desc').textContent = t('class.' + profile.classId + '.desc');
        const sl = $('skin-list');
        sl.innerHTML = '';
        for (const id in SKINS) {
            const s = SKINS[id];
            const owned = p.unlockedSkins.includes(id);
            this.tile(sl, {
                swatch: `<i class="sw-fig" style="--hair:${s.hair};--skin:${s.skin};--shirt:${s.shirt};--pants:${s.pants}"><b></b><b></b><b></b></i>`,
                name: s.name,
                on: p.skinId === id,
                tried: this.tryOn && this.tryOn.kind === 'skin' && this.tryOn.id === id,
                price: owned ? 0 : SKIN_COST[id],
                onClick: () => {
                    if (owned) { this.tryOn = null; profile.setSkin(id); } else this.tryOn = { kind: 'skin', id };
                    this.refreshProfile();
                }
            });
        }
        this.renderBuyBar($('buy-fighter'));
        const input = $('name-input');
        if (document.activeElement !== input) input.value = profile.name;
        const fixed = !!profile.externalName;
        input.disabled = fixed;
        $('name-save').classList.toggle('hidden', fixed);
        if (fixed) $('name-msg').textContent = t('fighter.nameAccount');
    }

    renderWeapons() {
        const section = (el, kind, items, swatch) => {
            el.innerHTML = '';
            const owned = profile.owned(kind);
            for (const id in items) {
                const has = owned.includes(id);
                this.tile(el, {
                    swatch: swatch(items[id], id),
                    name: t(items[id].name),
                    on: (kind === 'glow' ? profile.glowColor : kind === 'wskin' ? profile.weaponSkin : profile.trailId) === id,
                    tried: this.tryOn && this.tryOn.kind === kind && this.tryOn.id === id,
                    price: has ? 0 : items[id].cost,
                    onClick: () => {
                        if (has) { this.tryOn = null; profile.equip(kind, id); } else this.tryOn = { kind, id };
                        this.refreshProfile();
                    }
                });
            }
        };
        section($('wskin-list'), 'wskin', WEAPON_SKINS, (S) => `<i class="sw-wskin" style="--metal:${hex(S.metal)};--shaft:${hex(S.shaft)}"><b></b><b></b></i>`);
        section($('glow-list'), 'glow', GLOW_COLORS, (G) => `<i class="sw-glow" style="--tip:${hex(G.tip)};--halo:${hex(G.halo)};--rune:${hex(G.rune)}"></i>`);
        const glow = styleId(this.shownLook('glow'), 'steel');
        section($('trail-list'), 'trail', TRAILS, (T, id) => {
            const [a, b] = trailColors(id, glow);
            return `<i class="sw-trail" style="--a:${hex(a)};--b:${hex(b)}"></i>`;
        });
        this.renderBuyBar($('buy-weapons'));
    }

    // Below a list: the look you're trying on and what it costs
    renderBuyBar(bar) {
        const tr = this.tryOn;
        bar.classList.toggle('hidden', !tr);
        if (!tr) { bar.innerHTML = ''; return; }
        const skin = tr.kind === 'skin';
        const def = skin ? null : { glow: GLOW_COLORS, wskin: WEAPON_SKINS, trail: TRAILS }[tr.kind][tr.id];
        const name = skin ? SKINS[tr.id].name : t(def.name);
        const cost = skin ? (SKIN_COST[tr.id] || 0) : def.cost;
        const short = cost - profile.data.gold;
        bar.innerHTML = `<span class="buy-name"><b>${esc(name)}</b>${short > 0 ? `<small>${esc(t('shop.short', { n: short }))}</small>` : ''}</span>`
            + `<button class="btn btn-buy"${short > 0 ? ' disabled' : ''}>${coin}${esc(t('shop.buy', { n: cost }))}</button>`;
        bar.querySelector('button').addEventListener('click', () => {
            audio.unlock(); audio.play('click');
            let ok;
            if (skin) {
                ok = profile.data.gold >= cost && !profile.data.unlockedSkins.includes(tr.id);
                if (ok) { profile.data.gold -= cost; profile.data.unlockedSkins.push(tr.id); profile.setSkin(tr.id); }
            } else ok = profile.buy(tr.kind, tr.id, cost);
            if (!ok) { this.toast(t('fighter.needGold', { n: cost })); return; }
            this.tryOn = null;
            this.toast(t('fighter.unlockedSkin', { name }));
            this.refreshProfile();
        });
    }

    renderResetTime() {
        const now = new Date();
        const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const mins = Math.ceil((next - now) / 60000);
        $('quest-reset').textContent = t('quests.resets', { h: Math.floor(mins / 60), m: mins % 60 });
    }

    renderQuests() {
        this.renderResetTime();
        $('mission-list').innerHTML = missions.list().map((m) => {
            const pct = Math.min(100, (m.progress / m.goal) * 100).toFixed(0);
            return `<div class="quest${m.done ? ' done' : ''}"><div class="quest-top"><span class="quest-name">${m.done ? icon('check') : ''}${esc(t('mission.' + m.id))}</span><span class="tile-tag tag-price">${coin}${m.gold}</span></div>`
                + `<div class="quest-bar"><i style="width:${pct}%"></i><span>${m.done ? esc(t('missions.done')) : `${m.progress} / ${m.goal}`}</span></div></div>`;
        }).join('');
        const earned = ACHIEVEMENTS.filter(a => achievements.has(a.id)).length;
        $('ach-count').textContent = `${earned} / ${ACHIEVEMENTS.length}`;
        // what you've earned first
        const order = ACHIEVEMENTS.slice().sort((a, b) => achievements.has(b.id) - achievements.has(a.id));
        $('ach-list').innerHTML = order.map((a) => {
            const got = achievements.has(a.id);
            return `<div class="quest ach${got ? ' done' : ''}"><span class="ach-ico">${icon(got ? 'check' : 'lock')}</span><span class="ach-text"><b>${esc(t('ach.' + a.id + '.name'))}</b><small>${esc(t('ach.' + a.id + '.desc'))}</small></span><span class="tile-tag tag-price">${coin}${a.gold}</span></div>`;
        }).join('');
    }

    // How to Play: the controls for whichever input you're using, unless you pick another
    currentInput() {
        if (this.howtoInput) return this.howtoInput;
        const I = this.game.input;
        if (I.usingTouch || (window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches)) return 'touch';
        return I.usingPad ? 'pad' : 'keys';
    }

    renderHowto() {
        const input = this.currentInput();
        this.setSeg($('howto-input'), 'input', input);
        const caps = {
            keys: { move: ['WASD'], look: [t('cap.mouse')], jump: [t('cap.space')], spear: [t('cap.lclick')], mace: [t('cap.rclick'), 'Shift'], parry: ['F', 'E'], camera: ['V'], pause: ['P', 'Esc'], scores: ['Tab'] },
            pad: { move: [t('cap.lstick')], look: [t('cap.rstick')], jump: ['A'], spear: ['X', 'RB', 'RT'], mace: ['B', 'LT'], parry: ['LB'], camera: ['Back'], pause: ['Start'] },
            touch: { move: [t('cap.lthumb')], look: [t('cap.rside')], jump: [t('touch.jump')], spear: [t('touch.spear')], mace: [t('touch.mace')], parry: [t('touch.parry')], camera: ['👁'], pause: ['❚❚'] }
        }[input];
        $('control-list').innerHTML = Object.keys(caps).map((k) => `<div class="control"><span class="ctl-name">${esc(t('ctl.' + k))}</span><span class="ctl-keys">${caps[k].map(c => `<kbd>${esc(c)}</kbd>`).join('')}</span></div>`).join('');
        $('move-list').innerHTML = [['spear', 'tu.spear.title'], ['slam', 'tu.slam.title'], ['parry', 'tu.parry.title'], ['high', 'howto.moveHigh']].map(([id, title]) =>
            `<div class="move"><b>${esc(t(title))}</b><span>${esc(t('howto.move.' + id))}</span></div>`).join('');
    }

    // ---------------- account ----------------
    renderAccount() {
        const box = $('account-box');
        const st = account.state();
        const line = (cls, key, vars) => `<p class="${cls}">${esc(t(key, vars))}</p>`;
        let html = `<div class="acct-head">${icon('account')}<b>${esc(st.name ? t('acct.signedIn', { name: st.name }) : t('acct.guest'))}</b></div>`;
        if (st.kind === 'crazygames') {
            html += st.name ? line('desc', 'acct.cgNote') : line('desc', 'acct.cgPrompt') + `<button class="btn btn-go" id="acct-cg" data-go="1">${esc(t('acct.cgBtn'))}</button>`;
        } else if (st.kind === 'shared') {
            html += st.name ? line('desc', 'acct.sharedNote') + `<button class="btn btn-sec" id="acct-logout">${esc(t('acct.logout'))}</button>`
                : line('desc', 'acct.sharedPrompt') + `<a class="btn btn-go btn-link" id="acct-open" href="../">${esc(t('acct.sharedBtn'))}</a>`;
        } else {
            html += line('desc', 'acct.guestNote');
        }
        if (!st.name) html += `<button class="btn btn-sec" id="acct-name">${esc(t('acct.editName'))}</button>`;
        box.innerHTML = html;
        const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', () => { audio.unlock(); audio.play('click'); fn(); }); };
        on('acct-cg', () => account.signInCrazyGames().then((ok) => {
            if (!ok) this.toast(t('acct.failed'));
            this.renderAccount();
            this.refreshProfile();
        }));
        on('acct-logout', () => account.logOutShared());
        on('acct-name', () => { this.closeAllPanels(); this.showTab('fighter'); $('name-input').focus(); });
    }

    bindSettings() {
        const g = this.game;
        const lang = $('set-lang');
        lang.innerHTML = LANGS.map(L => `<option value="${L.id}">${esc(L.name)}</option>`).join('');
        lang.addEventListener('change', () => {
            audio.play('click');
            g.setSetting('lang', lang.value);
            setSavedLang(lang.value);
            lang.blur(); // so game keys can't change the language later
            this.applyLanguage();
        });
        $('set-sound').addEventListener('change', (e) => g.setSetting('sound', e.target.checked));
        $('set-music').addEventListener('change', (e) => g.setSetting('music', e.target.checked));
        for (const [id, key] of [['set-vol-master', 'volMaster'], ['set-vol-sfx', 'volSfx'], ['set-vol-music', 'volMusic']]) {
            $(id).addEventListener('input', (e) => { g.setSetting(key, +e.target.value); $(id + '-v').textContent = Math.round(e.target.value * 100) + '%'; });
            $(id).addEventListener('change', () => audio.play('hit'));
        }
        $('set-sens').addEventListener('input', (e) => { g.setSetting('sens', +e.target.value); $('set-sens-v').textContent = (+e.target.value).toFixed(2); });
        $('set-fov').addEventListener('input', (e) => { g.setSetting('fov', +e.target.value); $('set-fov-v').textContent = e.target.value + '°'; });
        $('set-invert').addEventListener('change', (e) => g.setSetting('invertY', e.target.checked));
        $('set-reduced').addEventListener('change', (e) => g.setSetting('reducedMotion', e.target.checked));
        this.seg($('set-view'), 'v', (v) => { g.setSetting('view', v); g.rig.mode = v; });
        this.seg($('set-quality'), 'v', (v) => {
            g.setSetting('quality', v);
            $('quality-note').textContent = t('set.qualityNext');
        });
    }

    renderSettings() {
        const s = this.game.settings;
        $('set-lang').value = getLang();
        $('set-sound').checked = s.sound;
        $('set-music').checked = s.music !== false;
        for (const [id, key] of [['set-vol-master', 'volMaster'], ['set-vol-sfx', 'volSfx'], ['set-vol-music', 'volMusic']]) {
            $(id).value = s[key]; $(id + '-v').textContent = Math.round(s[key] * 100) + '%';
        }
        $('set-sens').value = s.sens; $('set-sens-v').textContent = (+s.sens).toFixed(2);
        $('set-fov').value = s.fov; $('set-fov-v').textContent = s.fov + '°';
        $('set-invert').checked = s.invertY;
        $('set-reduced').checked = s.reducedMotion;
        this.setSeg($('set-view'), 'v', this.game.rig.mode);
        this.setSeg($('set-quality'), 'v', s.quality);
        $('quality-note').textContent = s.quality === 'auto' ? t('set.qualityAuto', { q: t('qualityNow.' + this.game.qualityName) }) : '';
    }

    // Everything on screen in the new language. Banners and toasts already showing, and the
    // training dummy's name, wait for the next one.
    applyLanguage() {
        applyDom();
        this.refreshProfile();
        const open = (id) => !$(id).classList.contains('hidden');
        if (open('panel-settings')) this.renderSettings();
        if (open('panel-account')) this.renderAccount();
        if (this.statusMsg) this.onlineStatus(this.statusMsg.key, this.statusMsg.vars);
        this.renderRoomPlayers();
        const g = this.game;
        if (g && g.local) {
            this.cache = {}; // the HUD writes everything again on its next frame
            this.buildTags(g);
            if (this.hintsT > 0) this.renderHints();
            if (g.tutorial) g.tutorial.showText(true);
        }
    }

    // ---------------- match lifecycle ----------------
    matchStarted(g) {
        $('menu').classList.add('hidden');
        $('hud').classList.remove('hidden');
        $('results').classList.add('hidden');
        $('revive').classList.add('hidden');
        $('tutorial').classList.add('hidden');
        $('tu-done').classList.add('hidden');
        $('killfeed').innerHTML = '';
        this.cache = {};
        this.buildTags(g);
        $('t-size').classList.toggle('hidden', g.local.classId !== 'buddha');
        // first matches: show the controls for a while
        this.hintsT = (!profile.tutorialDone && g.mode !== 'training') ? 28 : 0;
        const h = $('ctl-hints');
        if (this.hintsT) {
            this.renderHints();
            h.classList.remove('hidden', 'fade');
        } else h.classList.add('hidden');
        this.speedLines(0);
    }

    renderHints() {
        const lines = this.game.input.usingTouch ? ['touch1', 'touch2', 'touch3'] : ['keys1', 'keys2', 'keys3', 'keys4', 'keys5'];
        $('ctl-hints').innerHTML = lines.map(k => keyHtml(t('hints.' + k))).join('<br>');
    }

    // Name tags over everyone else (rebuilt when Gauntlet brings new bots)
    buildTags(g) {
        const tags = $('tags');
        tags.innerHTML = '';
        this.tags = g.fighters.map((f) => {
            if (f === g.local) return null;
            const el = document.createElement('div');
            el.className = 'tag';
            el.innerHTML = `<div class="tn" style="color:${TEAM_COLORS[f.id % 4]}">${esc(f.name)}${f.botLevel && f.botLevel !== 'dummy' ? ` <small>${esc(t('bot.' + f.botLevel))}</small>` : ''}</div><div class="tb"><i></i></div>`;
            tags.appendChild(el);
            return { el, bar: el.querySelector('i'), name: el.querySelector('.tn'), hp: -1, vis: true, f };
        });
    }

    showPause(on) {
        $('pause').classList.toggle('hidden', !on);
        if (!on) { this.closeAllPanels(); }
    }

    offerRevive(on) {
        $('revive').classList.toggle('hidden', !on);
        if (on) this.game.input.exitLock();
    }

    showResults(d) {
        const g = this.game;
        this.wasOnline = !!g.onlineMatch; // even if the host has already left
        $('hud').classList.add('hidden');
        $('touch').classList.add('hidden');
        $('click-to-play').classList.add('hidden');
        this.speedLines(0);
        const title = $('res-title');
        const rv = $('res-revive');
        if (d.gauntlet) {
            title.textContent = t('res.runOver');
            title.className = 'lose';
            $('res-sub').textContent = tn('res.cleared', d.waves, { best: Math.max(d.best, d.waves) });
            $('res-table').innerHTML = this.statTable([d.local]);
            $('res-rewards').innerHTML = `<span>🪙 ${esc(t('res.gold', { n: d.waves * 25 }))}</span><span>✦ ${esc(t('res.xp', { n: d.waves * 30 + 10 }))}</span>`;
            rv.classList.toggle('hidden', !d.canRevive);
            $('res-double').classList.add('hidden');
            $('res-train').classList.add('hidden');
        } else {
            title.textContent = t(d.win ? 'res.victory' : 'res.defeat');
            title.className = d.win ? 'win' : 'lose';
            $('res-sub').textContent = d.mode === 'training' ? '' : `${t('mode.' + g.mode)}${d.level && !g.remote ? ' · ' + (BOT_LEVELS[d.level] ? t('bot.' + d.level) : '') : ''}`;
            $('res-table').innerHTML = this.statTable(d.ranked) + this.highlight(d.local);
            const r = d.reward;
            this.lastReward = r;
            $('res-double').classList.toggle('hidden', !(r && r.gold > 0 && crazyGames.adsAvailable));
            $('res-rewards').innerHTML = r ? `<span>🪙 ${esc(t('res.gold', { n: r.gold }))}</span><span>✦ ${esc(t('res.xp', { n: r.xp }))}</span>${r.rp ? `<span>⚔ ${r.rp > 0 ? '+' : ''}${r.rp} RP</span>` : ''}${r.levelUps ? `<span>⬆ ${esc(t('res.levelUp', { level: profile.data.level, n: r.levelUps * 200 }))}</span>` : ''}` : '';
            if (r && r.levelUps && profile.newClasses && profile.newClasses.length) {
                $('res-rewards').innerHTML += `<span>🔓 ${esc(t('res.newClass', { names: profile.newClasses.map(id => t('class.' + id + '.name')).join(', ') }))}</span>`;
                profile.newClasses = null;
            }
            $('res-train').classList.toggle('hidden', profile.tutorialDone || g.mode === 'training' || !!g.remote);
            rv.classList.add('hidden');
            for (const m of d.missions || []) $('res-rewards').innerHTML += `<span>✓ ${esc(t('res.mission', { text: t('mission.' + m.id), n: m.gold }))}</span>`;
            for (const a of d.ach || []) $('res-rewards').innerHTML += `<span class="ach">🏅 ${esc(t('res.achLine', { name: t('ach.' + a.id + '.name'), desc: t('ach.' + a.id + '.desc'), n: a.gold }))}</span>`;
            if ((d.ach || []).length) audio.play('score');
        }
        $('results').classList.remove('hidden');
        this.refreshProfile();
    }

    hideResults() { $('results').classList.add('hidden'); $('hud').classList.remove('hidden'); }

    // The player's best moment of the match
    highlight(me) {
        const s = me.stats;
        let text = '';
        if (s.maxSlamDamage >= 60) text = '💥 ' + t('hl.slam', { n: Math.round(s.maxSlamDamage) });
        else if (s.kos >= 2) text = '⚔ ' + t('hl.kos', { n: s.kos });
        else if (s.crits >= 2) text = '🎯 ' + t('hl.crits', { n: s.crits });
        else if (s.parries >= 2) text = '🛡 ' + t('hl.parries', { n: s.parries });
        else if (s.damageDealt >= 100) text = '🔥 ' + t('hl.damage', { n: Math.round(s.damageDealt) });
        return text ? `<div class="highlight">${esc(text)}</div>` : '';
    }

    statTable(list) {
        const g = this.game;
        const hill = g.mode === 'hill';
        const th = (k) => `<th>${esc(t('th.' + k))}</th>`;
        let h = `<table class="scores"><tr>${th('fighter')}${hill ? th('hill') : ''}${th('kos')}${th('falls')}${th('damage')}${th('slams')}${th('spear')}${th('bestSlam')}</tr>`;
        list.forEach((f, rank) => {
            const medal = list.length > 1 ? ['🥇', '🥈', '🥉'][rank] || '' : '';
            h += `<tr class="${f === g.local ? 'me' : ''}${rank === 0 && list.length > 1 ? ' first' : ''}"><td>${medal ? `<span class="medal">${medal}</span>` : ''}<span class="swatch" style="background:${TEAM_COLORS[f.id % 4]}"></span>${esc(f.name)}</td>${hill ? `<td>${Math.floor(f.hill || 0)}</td>` : ''}<td>${f.kos}</td><td>${f.deaths}</td><td>${Math.round(f.stats.damageDealt)}</td><td>${f.stats.slamsLanded}</td><td>${f.stats.dashesLanded}</td><td>${Math.round(f.stats.maxSlamDamage)}</td></tr>`;
        });
        return h + '</table>';
    }

    // ---------------- moments ----------------
    banner(title, sub, color, time = 1.5, small = false) {
        const b = $('banner');
        b.querySelector('.b-title').textContent = title;
        b.querySelector('.b-title').style.color = color;
        b.querySelector('.b-sub').textContent = sub;
        b.querySelector('.b-sub').style.color = small ? color : '#fff';
        b.classList.toggle('small', small);
        b.classList.remove('show');
        void b.offsetWidth;
        b.classList.add('show');
        this.bannerT = time;
    }

    countdown(text) {
        const c = $('countdown');
        c.textContent = text;
        c.classList.remove('show');
        void c.offsetWidth;
        c.classList.add('show');
    }

    killfeed(killer, victim, cause) {
        const kf = $('killfeed');
        const el = document.createElement('div');
        const g = this.game;
        el.className = 'kf' + (killer === g.local || victim === g.local ? ' mine' : '');
        const name = (f) => `<b style="color:${TEAM_COLORS[f.id % 4]}">${esc(f.name)}</b>`;
        el.innerHTML = killer ? `${name(killer)}<span class="kc">${esc(t('cause.' + String(cause).toLowerCase()))}</span>${name(victim)}` : `${name(victim)}<span class="kc">${esc(t('kf.fell'))}</span>`;
        kf.prepend(el);
        while (kf.children.length > 4) kf.lastChild.remove();
        setTimeout(() => el.remove(), 6000);
    }

    hitmarker(crit) {
        const h = $('hitmarker');
        h.classList.remove('show');
        h.classList.toggle('crit', !!crit);
        void h.offsetWidth;
        h.classList.add('show');
    }

    // Points a red arc at where the hit came from (angle in radians, 0 = straight ahead)
    damageFrom(angle) {
        const d = $('dmgdir');
        d.style.transform = `rotate(${angle.toFixed(3)}rad)`;
        d.classList.add('show');
        clearTimeout(this.dirTimer);
        this.dirTimer = setTimeout(() => d.classList.remove('show'), 60);
    }

    hurt() {
        const h = $('hurt');
        h.classList.remove('show');
        void h.offsetWidth;
        h.classList.add('show');
    }

    speedLines(v) {
        if (this.game && this.game.settings.reducedMotion) v *= 0.4;
        this.speed = Math.max(this.speed, v);
        if (v === 0) { this.speed = 0; $('speedlines').style.opacity = 0; }
    }

    toast(text) {
        const el = $('toast');
        el.textContent = text;
        el.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
    }

    tutorialStep(i, n, title, keys, text, quiet = false) {
        const card = $('tutorial');
        card.classList.remove('hidden', 'pop');
        void card.offsetWidth;
        card.classList.add('pop');
        $('tu-count').textContent = t('tu.step', { i: i + 1, n });
        $('tu-title').textContent = title;
        $('tu-keys').textContent = keys;
        $('tu-text').textContent = text;
        if (i > 0 && !quiet) audio.play('score');
    }

    tutorialDone() {
        $('tutorial').classList.add('hidden');
        $('tu-done').classList.remove('hidden');
        this.game.input.exitLock();
        audio.play('win');
    }

    // ---------------- per-frame HUD ----------------
    set(key, el, prop, value) {
        if (this.cache[key] === value) return;
        this.cache[key] = value;
        if (prop === 'text') el.textContent = value;
        else if (prop === 'html') el.innerHTML = value;
        else if (prop === 'width') el.style.width = value;
        else if (prop === 'height') el.style.height = value;
        else if (prop === 'opacity') el.style.opacity = value;
        else if (prop.startsWith('class:')) el.classList.toggle(prop.slice(6), value);
    }

    hud(g, dt) {
        const me = g.local;
        if (!me) return;
        if (g.state === 'over') {
            if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) $('banner').classList.remove('show'); }
            return;
        }
        const touch = g.input.usingTouch;
        document.body.classList.toggle('touch', touch);
        this.set('touch', $('touch'), 'class:hidden', !(touch && (g.state === 'play' || g.state === 'intro')));
        const needLock = !touch && !g.input.locked && !g.input.lockFailed && (g.state === 'play' || g.state === 'intro')
            && $('revive').classList.contains('hidden') && $('tu-done').classList.contains('hidden');
        this.set('ctp', $('click-to-play'), 'class:hidden', !needLock);

        // key labels follow the controls being used
        const scheme = touch ? 'touch' : g.input.usingPad ? 'pad' : 'keys';
        if (this.cache.scheme !== scheme) {
            this.cache.scheme = scheme;
            const L = { keys: [t('key.lmb'), t('key.rmb'), 'F', t('key.spc')], pad: ['RT', 'LT', 'LB', 'A'], touch: ['', '', '', ''] }[scheme];
            ['ab-spear', 'ab-mace', 'ab-parry', 'ab-jump'].forEach((id, i) => { $(id).querySelector('.ab-key').textContent = L[i]; });
        }

        // health
        const hp = Math.max(0, Math.round(me.hp));
        const pct = (Math.max(0, me.hp) / me.maxHp * 100).toFixed(1) + '%';
        this.set('hpw', $('hp-fill'), 'width', pct);
        this.set('hpg', $('hp-ghost'), 'width', pct);
        this.set('hpt', $('hp-text'), 'text', String(hp));
        this.set('hpl', $('hp-fill'), 'class:low', me.hp < me.maxHp * 0.3);
        this.set('hpn', $('hp-name'), 'text', me.name);
        let cls = t('class.' + me.classId + '.name');
        if (me.classId === 'shadow') cls += ' · ' + (me.invisible ? t('hud.hidden', { n: Math.ceil(me.invisT) }) : t('hud.vanishIn', { n: Math.ceil(CLASSES.shadow.visibleTime - me.visibleT) }));
        else if (me.classId === 'void') cls += ' · ' + t('hud.blinkIn', { n: Math.max(0, Math.ceil(me.voidT)) });
        else if (me.classId === 'buddha') cls += ' · ' + t(me.big ? 'hud.big' : 'hud.growHint');
        this.set('hpc', $('hp-class'), 'text', cls);
        let st = '';
        if (me.slowT > 0) st += `<span style="color:#5aa0ff">${t('st.slow')}</span>`;
        if (me.poisonT > 0) st += `<span style="color:#5ce65c">${t('st.poison')}</span>`;
        if (me.fireT > 0) st += `<span style="color:#ff7a2f">${t('st.fire')}</span>`;
        if (me.blindT > 0) st += `<span>${t('st.blind')}</span>`;
        if (me.stunT > 0) st += `<span style="color:#ffd54a">${t('st.stunned')}</span>`;
        if (me.spawnShield > 0) st += `<span style="color:#6ff0ff">${t('st.shield')}</span>`;
        this.set('st', $('status-row'), 'html', st);
        this.set('vig', $('vignette'), 'opacity', me.alive && me.hp < 35 ? ((1 - me.hp / 35) * 0.9).toFixed(2) : '0');
        this.set('blind', $('blind'), 'opacity', me.blindT > 0 ? '0.92' : '0');

        // abilities
        const spearCdMax = me.classId === 'energy' ? CLASSES.energy.cooldown : SPEAR.cooldown;
        const spearReady = me.spearCd <= 0 && (me.onGround || me.airDashes > 0);
        this.set('abs', $('ab-spear').querySelector('.ab-cd'), 'height', (me.spearCd / spearCdMax * 100).toFixed(0) + '%');
        this.set('absr', $('ab-spear'), 'class:ready', spearReady);
        this.set('abp', $('ab-spear').querySelector('.ab-pips'), 'html', me.onGround ? '' : pips(me.airDashes, me.maxAirDashes));
        const ground = g.physics.groundAt(me.pos.x, me.pos.z, me.radius * 0.6, me.pos.y + 0.05);
        const airborne = !me.onGround && me.alive;
        const canSlam = airborne && me.pos.y - ground > 1 && !me.slamming;
        this.set('abm', $('ab-mace').querySelector('.ab-cd'), 'height', me.onGround ? (me.swingCd / 0.65 * 100).toFixed(0) + '%' : '0%');
        this.set('abmr', $('ab-mace'), 'class:ready', canSlam);
        this.set('abpa', $('ab-parry').querySelector('.ab-cd'), 'height', (me.parryCd / PARRY.cooldown * 100).toFixed(0) + '%');
        this.set('abj', $('ab-jump').querySelector('.ab-pips'), 'html', me.onGround ? pips(2, 2) : pips(me.jumpsLeft, me.big ? 0 : 1));
        this.set('xh', $('crosshair'), 'class:ready', spearReady);

        // slam meter: what a slam would deal if you landed on the floor below now
        const fall = (ground === -Infinity) ? 0 : me.apexY - ground;
        const showSlam = airborne && fall > 3 && ground !== -Infinity && me.dashT <= 0;
        this.set('slm', $('slam-meter'), 'class:show', showSlam);
        if (showSlam) this.set('sld', $('slam-dmg'), 'text', String(Math.round(slamDamage(fall))));

        // score
        let sc = '';
        if (g.mode === 'gauntlet') {
            const left = g.fighters.filter((f, i) => i > 0 && f.alive).length;
            sc = `<div class="sc me" style="--c:#ffd54a"><span class="sc-n sc-msg">${esc(t('sc.wave'))}</span><b>${g.wave}</b></div><div class="sc" style="--c:#ff5a4a"><span class="sc-n sc-msg">${esc(t('sc.enemies'))}</span><b>${left}</b></div>`;
        } else if (g.mode === 'training') {
            sc = `<div class="sc me" style="--c:#6ff0ff"><span class="sc-n sc-msg">${esc(t('sc.training'))}</span></div>`;
        } else {
            const stand = g.mode === 'stand';
            for (const f of g.fighters) sc += `<div class="sc${f === me ? ' me' : ''}" style="--c:${TEAM_COLORS[f.id % 4]};${f.out ? 'opacity:0.4' : ''}"><span class="sc-n">${esc(f.name)}</span><b>${stand ? (f.out ? '✖' : '♥'.repeat(g.modeDef.lives - f.deaths)) : g.score(f)}</b></div>`;
            if (!stand) sc += `<div class="sc" style="--c:#fff"><span class="sc-n sc-msg">${esc(t('sc.to', { n: g.mode === 'hill' ? g.modeDef.hill : g.modeDef.kos }))}</span></div>`;
            if (g.mode === 'hill') sc += `<div class="sc" style="--c:${g.hillZone && g.hillZone.contested ? '#ff5a4a' : '#ffd54a'}"><span class="sc-n sc-msg">${esc(t(g.inHill(me) ? (g.hillZone.contested ? 'sc.contested' : 'sc.holding') : 'sc.getTo'))}</span></div>`;
        }
        this.set('sc', $('scorebar'), 'html', sc);
        if (g.modeDef.time) {
            const left = Math.max(0, g.modeDef.time - g.matchT);
            const txt = g.suddenDeath ? t(g.mode === 'hill' ? 'timer.overtime' : 'timer.suddenDeath') : `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
            this.set('tm', $('timer'), 'text', txt);
            this.set('tmu', $('timer'), 'class:urgent', g.suddenDeath || left < 20);
        } else this.set('tm', $('timer'), 'text', '');

        // revive countdown
        if (!$('revive').classList.contains('hidden')) this.set('rvt', $('rv-timer'), 'text', t('rv.respawning', { n: Math.max(0, Math.ceil(me.respawnT)) }));

        // scoreboard (hold Tab)
        this.set('sb', $('scoreboard'), 'class:hidden', !g.input.showScores);
        if (g.input.showScores) this.set('sbh', $('scoreboard'), 'html', this.statTable(g.fighters.slice().sort((a, b) => g.score(b) - g.score(a))));

        // name tags over other fighters
        const cam = g.camera, W = g.width, H = g.height;
        for (const t of this.tags) {
            if (!t) continue;
            const f = t.f;
            const visible = f.alive && !(f.invisible && Math.hypot(f.pos.x - me.pos.x, f.pos.z - me.pos.z) > 4);
            let show = false;
            if (visible) {
                const v = this.tmpV || (this.tmpV = cam.position.clone());
                v.set(f.pos.x, f.pos.y + f.height + 0.55, f.pos.z).project(cam);
                if (v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1) {
                    show = true;
                    const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
                    t.el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) translate(-50%, -100%)`;
                    const hpPct = Math.max(0, f.hp) / f.maxHp;
                    if (Math.abs(hpPct - t.hp) > 0.005) { t.hp = hpPct; t.bar.style.width = (hpPct * 100).toFixed(0) + '%'; }
                }
            }
            if (show !== t.vis) { t.vis = show; t.el.style.display = show ? 'block' : 'none'; }
        }

        // timed bits
        if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) $('banner').classList.remove('show'); }
        if (this.hintsT > 0) { this.hintsT -= dt; if (this.hintsT <= 0) $('ctl-hints').classList.add('fade'); }
        if (me.slamming || me.dashT > 0) this.speed = Math.max(this.speed, me.slamming ? 0.55 : 1);
        if (this.speed > 0) {
            this.speed = Math.max(0, this.speed - dt * 2.5);
            $('speedlines').style.opacity = (this.speed * 0.8).toFixed(2);
            $('speedlines').style.transform = `rotate(${(Math.random() * 6).toFixed(1)}deg) scale(${(1 + (1 - this.speed) * 0.15).toFixed(3)})`;
        }
    }
}

// Quick Play grows with you: an easy bot for your first wins, then tougher
function quickLevel() {
    const w = profile.data.stats.wins || 0;
    return w < 2 ? 'easy' : w < 10 ? 'normal' : 'pro';
}

function pips(n, max) {
    let s = '';
    for (let i = 0; i < max; i++) s += `<i class="${i < n ? '' : 'off'}"></i>`;
    return s;
}
