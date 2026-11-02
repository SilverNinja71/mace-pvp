// ==========================================
// UI: menus, panels, the in-game HUD, results and the revive offer.
// The HUD only touches the page when a value actually changes.
// ==========================================

import { CLASSES, CLASS_LEVEL, SPEAR, PARRY, TEAM_COLORS, BOT_LEVELS } from './config.js';
import { SKINS, GLOWS } from './character.js';
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

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class UI {
    constructor() {
        this.game = null;
        this.cache = {};
        this.speed = 0;
        this.bannerT = 0;
        this.duelLevel = 'normal';
        this.brawlLevel = 'normal';
        this.lastStart = { mode: 'quick', level: 'normal' };
        this.panelStack = [];
        this.tags = [];
        this.hintsT = 0;
    }

    bind(game) {
        this.game = game;
        const g = game;
        const click = (el, fn) => el && el.addEventListener('click', (e) => { audio.unlock(); audio.play('click'); fn(e); });

        click($('btn-play'), () => this.start({ mode: 'quick', level: quickLevel() }));
        click($('btn-training'), () => this.start({ mode: 'training' }));
        document.querySelectorAll('[data-panel]').forEach((b) => click(b, () => this.openPanel(b.getAttribute('data-panel'))));
        document.querySelectorAll('.panel-close').forEach((b) => click(b, () => this.closePanel()));
        document.querySelectorAll('[data-start]').forEach((b) => click(b, () => {
            const m = b.getAttribute('data-start');
            this.closeAllPanels();
            this.start({ mode: m, level: m === 'duel' ? this.duelLevel : m === 'brawl' ? this.brawlLevel : m === 'hill' ? this.hillLevel : m === 'stand' ? this.standLevel : 'normal' });
        }));
        this.seg($('duel-level'), 'level', (v) => { this.duelLevel = v; });
        this.seg($('brawl-level'), 'level', (v) => { this.brawlLevel = v; });
        this.hillLevel = 'normal';
        this.seg($('hill-level'), 'level', (v) => { this.hillLevel = v; });
        this.standLevel = 'normal';
        this.seg($('stand-level'), 'level', (v) => { this.standLevel = v; });

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
        this.refreshProfile();
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
        if (name === 'fighter') this.renderFighter();
        if (name === 'settings') this.renderSettings();
        if (name === 'modes') this.renderGauntletBest();
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

    renderGauntletBest() {
        const n = profile.data.arena3d.gauntletBest || 0;
        $('gauntlet-best').innerHTML = tn('modes.best', n, { n: `<b>${n}</b>` });
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
        this.refreshProfile();
    }

    refreshProfile() {
        const p = profile.data;
        if (this.game && this.game.state === 'menu' && (!this.game.showcase || this.shownSkin !== p.skinId)) { this.shownSkin = p.skinId; this.game.refreshShowcase(); }
        $('pc-name').textContent = p.username || 'Fighter';
        $('pc-level').textContent = t('profile.level', { n: p.level });
        $('pc-xp').style.width = (profile.levelProgress() * 100).toFixed(0) + '%';
        $('pc-gold').textContent = p.gold;
        $('pc-wins').innerHTML = tn('profile.wins', p.stats.wins, { n: `<b>${p.stats.wins}</b>` });
        const rp = p.arenaRP || 0;
        const tier = rp >= 2000 ? 'obsidian' : rp >= 1500 ? 'diamond' : rp >= 1000 ? 'gold' : rp >= 500 ? 'silver' : 'bronze';
        $('pc-rp').textContent = `${rp} (${t('tier.' + tier)})`;
        $('pc-class').textContent = `${t('class.' + profile.classId + '.name')} · ${(SKINS[p.skinId] || SKINS.steve).name}`;
        $('missions-card').innerHTML = `<h5>${esc(t('missions.title'))}</h5>` + missions.list().map(m =>
            `<div class="mi${m.done ? ' done' : ''}"><span>${m.done ? '✓ ' : ''}${esc(t('mission.' + m.id))}</span><b>${m.done ? esc(t('missions.done')) : `${m.progress}/${m.goal} · 🪙${m.gold}`}</b></div>`).join('');
    }

    bindFighter() {
        $('name-save').addEventListener('click', () => {
            const ok = profile.setName($('name-input').value);
            $('name-msg').textContent = t(ok ? 'fighter.saved' : (window.GameAccounts && window.GameAccounts.current && window.GameAccounts.current()
                ? 'fighter.nameAccount' : 'fighter.nameRule'));
            this.refreshProfile();
        });
    }

    renderFighter() {
        const p = profile.data;
        const cl = $('class-list');
        cl.innerHTML = '';
        for (const id in CLASSES) {
            const c = CLASSES[id];
            const className = t('class.' + id + '.name');
            const classDesc = t('class.' + id + '.desc');
            const b = document.createElement('button');
            const open = profile.classUnlocked(id);
            b.className = 'pick' + (profile.classId === id ? ' on' : '') + (open ? '' : ' locked');
            b.innerHTML = `<i style="background:${c.color}"></i>${esc(className)}${open ? '' : ` <small>🔒 ${esc(t('profile.level', { n: CLASS_LEVEL[id] }))}</small>`}`;
            b.addEventListener('click', () => {
                if (!open) { this.toast(t('fighter.classLocked', { name: className, n: CLASS_LEVEL[id] })); return; }
                profile.setClass(id); audio.play('click'); this.renderFighter();
            });
            b.addEventListener('mouseenter', () => { $('class-desc').textContent = classDesc + (open ? '' : ' ' + t('fighter.unlocksAt', { n: CLASS_LEVEL[id] })); });
            cl.appendChild(b);
        }
        $('class-desc').textContent = t('class.' + profile.classId + '.desc');
        const sl = $('skin-list');
        sl.innerHTML = '';
        for (const id in SKINS) {
            const s = SKINS[id];
            const owned = p.unlockedSkins.includes(id);
            const b = document.createElement('button');
            b.className = 'pick' + (p.skinId === id ? ' on' : '') + (owned ? '' : ' locked');
            b.innerHTML = `<i style="background:${s.shirt};border:2px solid ${s.skin}"></i>${esc(s.name)}${owned ? '' : ` <small>🪙${SKIN_COST[id]}</small>`}`;
            b.addEventListener('click', () => {
                if (!owned) {
                    const cost = SKIN_COST[id] || 0;
                    if (p.gold < cost) { this.toast(t('fighter.needGold', { n: cost })); return; }
                    p.gold -= cost;
                    p.unlockedSkins.push(id);
                    this.toast(t('fighter.unlockedSkin', { name: s.name }));
                }
                profile.setSkin(id);
                audio.play('click');
                this.renderFighter();
                this.refreshProfile();
            });
            sl.appendChild(b);
        }
        const gl = $('glow-list');
        gl.innerHTML = '';
        for (const id in GLOWS) {
            const G = GLOWS[id];
            const glowName = t('glow.' + id);
            const owned = profile.glows.includes(id);
            const b = document.createElement('button');
            b.className = 'pick' + (profile.glowId === id ? ' on' : '') + (owned ? '' : ' locked');
            b.innerHTML = `<i style="background:#${G.tip.toString(16).padStart(6, '0')};box-shadow:0 0 6px #${G.halo.toString(16).padStart(6, '0')}"></i>${esc(glowName)}${owned ? '' : ` <small>🪙${G.cost}</small>`}`;
            b.addEventListener('click', () => {
                if (!owned) {
                    if (!profile.buyGlow(id, G.cost)) { this.toast(t('fighter.needGold', { n: G.cost })); return; }
                    this.toast(t('fighter.unlockedGlow', { name: glowName }));
                } else profile.setGlow(id);
                audio.play('click');
                this.renderFighter();
                this.refreshProfile();
                this.game.refreshShowcase();
            });
            gl.appendChild(b);
        }
        const al = $('ach-list');
        const earned = ACHIEVEMENTS.filter(a => achievements.has(a.id)).length;
        $('ach-count').textContent = `${earned} / ${ACHIEVEMENTS.length}`;
        al.innerHTML = ACHIEVEMENTS.map(a => `<div class="ach-row${achievements.has(a.id) ? ' got' : ''}"><b>${achievements.has(a.id) ? '🏅' : '🔒'} ${esc(t('ach.' + a.id + '.name'))}</b><span>${esc(t('ach.' + a.id + '.desc'))} · 🪙${a.gold}</span></div>`).join('');
        $('name-input').value = p.username || '';
        $('name-msg').textContent = '';
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
        if (open('panel-fighter')) this.renderFighter();
        if (open('panel-settings')) this.renderSettings();
        if (open('panel-modes')) this.renderGauntletBest();
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
