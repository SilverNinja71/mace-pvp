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

// Skin prices in gold, the same as the 2D game's shop
const SKIN_COST = { steve: 0, alex: 0, noob: 200, man_face: 400, creeper: 500, enderman: 600, skeleton: 500, zombie: 400, diamond_knight: 800 };

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
            if (this.game.remote) {
                // online rematch: back to the same room's lobby
                const r = this.room;
                const connected = r && r.peer && (r.isHost || (r.hostConn && r.hostConn.open));
                g.quitToMenu(connected);
                if (r) {
                    if (!connected) { $('room-info').classList.add('hidden'); $('online-status').textContent = 'The room closed. Make a new room, or join a friend\'s.'; }
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
                if (!ok) { this.toast("The ad couldn't play this time."); return; }
                r.doubled = true;
                profile.data.gold += r.gold;
                profile.save();
                $('res-double').classList.add('hidden');
                this.toast(`+${r.gold} bonus gold!`);
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
            if (!g.pendingGauntlet && g.wave > 1) g.pendingGauntlet = { waves: g.wave - 1 };
            if (g.pendingGauntlet) g.finishGauntlet();
        }
        g.quitToMenu();
    }

    // A midgame ad at the natural break after a match (CrazyGames decides if one shows)
    afterResults(next) {
        const g = this.game;
        if (g.mode === 'gauntlet') {
            const r = g.finishGauntlet();
            if (r) this.toast(`+${r.gold} gold · +${r.xp} XP${r.best ? ' · new best!' : ''}${r.missions && r.missions.length ? ` · mission done: +${r.missions[0].gold} gold` : ''}${r.ach && r.ach.length ? ` · 🏅 ${r.ach.map(a => a.name).join(', ')}` : ''}`);
        }
        $('results').classList.add('hidden');
        crazyGames.showAd('midgame').then(() => next());
    }

    watchRevive() {
        crazyGames.showAd('rewarded').then((ok) => {
            if (ok) this.game.revive();
            else this.toast("The ad couldn't play, so no revive this time.");
        });
    }

    // ---------------- online rooms ----------------
    bindOnline(room) {
        this.room = room;
        const g = this.game;
        const status = (t) => { $('online-status').textContent = t || ''; };
        room.onStatus = status;
        room.onLobby = (list, isHost) => {
            $('room-info').classList.remove('hidden');
            $('room-code').textContent = room.code;
            $('room-link').value = room.inviteLink();
            $('room-players').innerHTML = list.map((n, i) => `${i === 0 ? '👑 ' : ''}${esc(n)}`).join(' · ') + (list.length < 2 ? ' — waiting for a friend…' : '');
            $('btn-room-start').classList.toggle('hidden', !isHost);
            $('room-mode').classList.toggle('hidden', !isHost);
            $('btn-room-start').disabled = list.length < 2;
            if (!isHost) status('Connected! Waiting for the host to start the match.');
        };
        room.onClosed = (reason, wasPlaying) => {
            if (wasPlaying && g.state !== 'menu' && g.state !== 'over') { g.quitToMenu(); }
            $('room-info').classList.add('hidden');
            if (reason) { this.toast(reason); status(reason); }
        };
        $('btn-host').addEventListener('click', () => {
            audio.unlock(); audio.play('click');
            status('Making a room…');
            room.host((code) => {
                status('Room ready! Send your friend the link or the code.');
                crazyGames.showInvite(code);
            });
        });
        const join = () => {
            const code = $('room-input').value.trim().toUpperCase();
            if (code.length < 4) { status('Type the room code your friend sent you.'); return; }
            status('Joining ' + code + '…');
            room.join(code, () => status('Connected! Waiting for the host to start the match.'));
        };
        $('btn-join').addEventListener('click', () => { audio.unlock(); audio.play('click'); join(); });
        $('room-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
        $('btn-copy').addEventListener('click', () => {
            const t = $('room-link');
            t.select();
            const done = () => this.toast('Invite link copied!');
            if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(done, () => { document.execCommand('copy'); done(); });
            else { document.execCommand('copy'); done(); }
        });
        this.roomMode = 'ko';
        this.seg($('room-mode'), 'v', (v) => { this.roomMode = v; });
        $('btn-room-start').addEventListener('click', () => { audio.play('click'); if (!room.startMatch(this.roomMode)) status('Wait for a friend to join first.'); });
        $('online-back').addEventListener('click', () => { if (!room.inMatch) { room.leave(true); $('room-info').classList.add('hidden'); status(''); } });
    }

    joinFromLink(code) {
        this.openPanel('online');
        $('room-input').value = code;
        $('online-status').textContent = 'Joining ' + code + '…';
        this.room.join(code, () => { $('online-status').textContent = 'Connected! Waiting for the host to start the match.'; });
    }

    // ---------------- panels ----------------
    openPanel(name) {
        const el = $('panel-' + name);
        if (!el) return;
        if (name === 'fighter') this.renderFighter();
        if (name === 'settings') this.renderSettings();
        if (name === 'modes') $('gauntlet-best').textContent = profile.data.arena3d.gauntletBest || 0;
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
        this.refreshProfile();
    }

    refreshProfile() {
        const p = profile.data;
        if (this.game && this.game.state === 'menu' && (!this.game.showcase || this.shownSkin !== p.skinId)) { this.shownSkin = p.skinId; this.game.refreshShowcase(); }
        $('pc-name').textContent = p.username || 'Fighter';
        $('pc-level').textContent = 'Lv ' + p.level;
        $('pc-xp').style.width = (profile.levelProgress() * 100).toFixed(0) + '%';
        $('pc-gold').textContent = p.gold;
        $('pc-wins').textContent = p.stats.wins;
        const rp = p.arenaRP || 0;
        const tier = rp >= 2000 ? 'Obsidian' : rp >= 1500 ? 'Diamond' : rp >= 1000 ? 'Gold' : rp >= 500 ? 'Silver' : 'Bronze';
        $('pc-rp').textContent = `${rp} (${tier})`;
        const c = CLASSES[profile.classId];
        $('pc-class').textContent = `${c.name} · ${(SKINS[p.skinId] || SKINS.steve).name}`;
        $('missions-card').innerHTML = '<h5>DAILY MISSIONS</h5>' + missions.list().map(m =>
            `<div class="mi${m.done ? ' done' : ''}"><span>${m.done ? '✓ ' : ''}${esc(m.text)}</span><b>${m.done ? 'done' : `${m.progress}/${m.goal} · 🪙${m.gold}`}</b></div>`).join('');
    }

    bindFighter() {
        $('name-save').addEventListener('click', () => {
            const ok = profile.setName($('name-input').value);
            $('name-msg').textContent = ok ? 'Saved!' : (window.GameAccounts && window.GameAccounts.current && window.GameAccounts.current()
                ? 'Your name is your account name.' : '2-16 letters, numbers, spaces or _.');
            this.refreshProfile();
        });
    }

    renderFighter() {
        const p = profile.data;
        const cl = $('class-list');
        cl.innerHTML = '';
        for (const id in CLASSES) {
            const c = CLASSES[id];
            const b = document.createElement('button');
            const open = profile.classUnlocked(id);
            b.className = 'pick' + (profile.classId === id ? ' on' : '') + (open ? '' : ' locked');
            b.innerHTML = `<i style="background:${c.color}"></i>${esc(c.name)}${open ? '' : ` <small>🔒 Lv ${CLASS_LEVEL[id]}</small>`}`;
            b.addEventListener('click', () => {
                if (!open) { this.toast(`${c.name} unlocks at level ${CLASS_LEVEL[id]}. Play matches to level up!`); return; }
                profile.setClass(id); audio.play('click'); this.renderFighter();
            });
            b.addEventListener('mouseenter', () => { $('class-desc').textContent = c.desc + (open ? '' : ` (Unlocks at level ${CLASS_LEVEL[id]}.)`); });
            cl.appendChild(b);
        }
        $('class-desc').textContent = CLASSES[profile.classId].desc;
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
                    if (p.gold < cost) { this.toast(`You need ${cost} gold. Win matches to earn more!`); return; }
                    p.gold -= cost;
                    p.unlockedSkins.push(id);
                    this.toast(`Unlocked ${s.name}!`);
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
            const owned = profile.glows.includes(id);
            const b = document.createElement('button');
            b.className = 'pick' + (profile.glowId === id ? ' on' : '') + (owned ? '' : ' locked');
            b.innerHTML = `<i style="background:#${G.tip.toString(16).padStart(6, '0')};box-shadow:0 0 6px #${G.halo.toString(16).padStart(6, '0')}"></i>${esc(G.name)}${owned ? '' : ` <small>🪙${G.cost}</small>`}`;
            b.addEventListener('click', () => {
                if (!owned) {
                    if (!profile.buyGlow(id, G.cost)) { this.toast(`You need ${G.cost} gold. Win matches to earn more!`); return; }
                    this.toast(`Unlocked the ${G.name} glow!`);
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
        al.innerHTML = ACHIEVEMENTS.map(a => `<div class="ach-row${achievements.has(a.id) ? ' got' : ''}"><b>${achievements.has(a.id) ? '🏅' : '🔒'} ${esc(a.name)}</b><span>${esc(a.desc)} · 🪙${a.gold}</span></div>`).join('');
        $('name-input').value = p.username || '';
        $('name-msg').textContent = '';
    }

    bindSettings() {
        const g = this.game;
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
            $('quality-note').textContent = 'Graphics changes take effect the next time the game loads.';
        });
    }

    renderSettings() {
        const s = this.game.settings;
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
        $('quality-note').textContent = s.quality === 'auto' ? `Auto adjusts the resolution to keep the game smooth (now ${this.game.qualityName}).` : '';
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
            h.innerHTML = g.input.usingTouch
                ? 'Left thumb: move · Right side: look<br>JUMP twice in the air · SPEAR dashes where you look<br>MACE in the air slams down: higher = harder'
                : '<kbd>WASD</kbd> move · <kbd>Mouse</kbd> look<br><kbd>Space</kbd> jump, again in the air<br><kbd>L-Click</kbd> spear dash where you look<br><kbd>R-Click</kbd>/<kbd>Shift</kbd> in the air: mace slam<br><kbd>F</kbd> parry · <kbd>V</kbd> camera';
            h.classList.remove('hidden', 'fade');
        } else h.classList.add('hidden');
        this.speedLines(0);
    }

    // Name tags over everyone else (rebuilt when Gauntlet brings new bots)
    buildTags(g) {
        const tags = $('tags');
        tags.innerHTML = '';
        this.tags = g.fighters.map((f) => {
            if (f === g.local) return null;
            const el = document.createElement('div');
            el.className = 'tag';
            el.innerHTML = `<div class="tn" style="color:${TEAM_COLORS[f.id % 4]}">${esc(f.name)}${f.botLevel && f.botLevel !== 'dummy' ? ` <small>${BOT_LEVELS[f.botLevel].name}</small>` : ''}</div><div class="tb"><i></i></div>`;
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
        $('hud').classList.add('hidden');
        $('touch').classList.add('hidden');
        $('click-to-play').classList.add('hidden');
        this.speedLines(0);
        const t = $('res-title');
        const rv = $('res-revive');
        if (d.gauntlet) {
            t.textContent = 'RUN OVER';
            t.className = 'lose';
            $('res-sub').textContent = `You cleared ${d.waves} wave${d.waves === 1 ? '' : 's'}. Best: ${Math.max(d.best, d.waves)}.`;
            $('res-table').innerHTML = this.statTable([d.local]);
            $('res-rewards').innerHTML = `<span>🪙 +${d.waves * 25} gold</span><span>✦ +${d.waves * 30 + 10} XP</span>`;
            rv.classList.toggle('hidden', !d.canRevive);
            $('res-double').classList.add('hidden');
            $('res-train').classList.add('hidden');
        } else {
            t.textContent = d.win ? 'VICTORY!' : 'DEFEAT';
            t.className = d.win ? 'win' : 'lose';
            $('res-sub').textContent = d.mode === 'training' ? '' : `${g.modeDef.name}${d.level && !g.remote ? ' · ' + (BOT_LEVELS[d.level] ? BOT_LEVELS[d.level].name : '') : ''}`;
            $('res-table').innerHTML = this.statTable(d.ranked) + this.highlight(d.local);
            const r = d.reward;
            this.lastReward = r;
            $('res-double').classList.toggle('hidden', !(r && r.gold > 0 && crazyGames.adsAvailable));
            $('res-rewards').innerHTML = r ? `<span>🪙 +${r.gold} gold</span><span>✦ +${r.xp} XP</span>${r.rp ? `<span>⚔ ${r.rp > 0 ? '+' : ''}${r.rp} RP</span>` : ''}${r.levelUps ? `<span>⬆ Level ${profile.data.level}! +${r.levelUps * 200} gold</span>` : ''}` : '';
            if (r && r.levelUps && profile.newClasses && profile.newClasses.length) {
                $('res-rewards').innerHTML += `<span>🔓 New class: ${profile.newClasses.map(esc).join(', ')}</span>`;
                profile.newClasses = null;
            }
            $('res-train').classList.toggle('hidden', profile.tutorialDone || g.mode === 'training' || !!g.remote);
            rv.classList.add('hidden');
            for (const m of d.missions || []) $('res-rewards').innerHTML += `<span>✓ Mission: ${esc(m.text)} +${m.gold} gold</span>`;
            for (const a of d.ach || []) $('res-rewards').innerHTML += `<span class="ach">🏅 ${esc(a.name)}: ${esc(a.desc)} +${a.gold} gold</span>`;
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
        if (s.maxSlamDamage >= 60) text = `💥 Biggest slam: ${Math.round(s.maxSlamDamage)} damage`;
        else if (s.kos >= 2) text = `⚔ ${s.kos} knockouts`;
        else if (s.crits >= 2) text = `🎯 ${s.crits} critical spear hits`;
        else if (s.parries >= 2) text = `🛡 ${s.parries} parries`;
        else if (s.damageDealt >= 100) text = `🔥 ${Math.round(s.damageDealt)} damage dealt`;
        return text ? `<div class="highlight">${text}</div>` : '';
    }

    statTable(list) {
        const g = this.game;
        const hill = g.mode === 'hill';
        let h = `<table class="scores"><tr><th>Fighter</th>${hill ? '<th>Hill</th>' : ''}<th>KOs</th><th>Falls</th><th>Damage</th><th>Slams</th><th>Spear hits</th><th>Best slam</th></tr>`;
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
        el.innerHTML = killer ? `${name(killer)}<span class="kc">${cause}</span>${name(victim)}` : `${name(victim)}<span class="kc">fell into the void</span>`;
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
        const t = $('toast');
        t.textContent = text;
        t.classList.add('show');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
    }

    tutorialStep(i, n, title, keys, text) {
        const t = $('tutorial');
        t.classList.remove('hidden', 'pop');
        void t.offsetWidth;
        t.classList.add('pop');
        $('tu-count').textContent = `Step ${i + 1} of ${n}`;
        $('tu-title').textContent = title;
        $('tu-keys').textContent = keys;
        $('tu-text').textContent = text;
        if (i > 0) audio.play('score');
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
            const L = { keys: ['LMB', 'RMB', 'F', 'SPC'], pad: ['RT', 'LT', 'LB', 'A'], touch: ['', '', '', ''] }[scheme];
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
        let cls = CLASSES[me.classId].name;
        if (me.classId === 'shadow') cls += me.invisible ? ` · hidden ${Math.ceil(me.invisT)}s` : ` · vanish in ${Math.ceil(CLASSES.shadow.visibleTime - me.visibleT)}s`;
        else if (me.classId === 'void') cls += ` · blink in ${Math.max(0, Math.ceil(me.voidT))}s`;
        else if (me.classId === 'buddha') cls += me.big ? ' · BIG (B)' : ' · B to grow';
        this.set('hpc', $('hp-class'), 'text', cls);
        let st = '';
        if (me.slowT > 0) st += '<span style="color:#5aa0ff">SLOW</span>';
        if (me.poisonT > 0) st += '<span style="color:#5ce65c">POISON</span>';
        if (me.fireT > 0) st += '<span style="color:#ff7a2f">FIRE</span>';
        if (me.blindT > 0) st += '<span>BLIND</span>';
        if (me.stunT > 0) st += '<span style="color:#ffd54a">STUNNED</span>';
        if (me.spawnShield > 0) st += '<span style="color:#6ff0ff">SHIELD</span>';
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
            sc = `<div class="sc me" style="--c:#ffd54a"><span class="sc-n">WAVE</span><b>${g.wave}</b></div><div class="sc" style="--c:#ff5a4a"><span class="sc-n">Enemies</span><b>${left}</b></div>`;
        } else if (g.mode === 'training') {
            sc = `<div class="sc me" style="--c:#6ff0ff"><span class="sc-n">TRAINING</span></div>`;
        } else {
            const stand = g.mode === 'stand';
            for (const f of g.fighters) sc += `<div class="sc${f === me ? ' me' : ''}" style="--c:${TEAM_COLORS[f.id % 4]};${f.out ? 'opacity:0.4' : ''}"><span class="sc-n">${esc(f.name)}</span><b>${stand ? (f.out ? '✖' : '♥'.repeat(g.modeDef.lives - f.deaths)) : g.score(f)}</b></div>`;
            if (!stand) sc += `<div class="sc" style="--c:#fff"><span class="sc-n">to ${g.mode === 'hill' ? g.modeDef.hill : g.modeDef.kos}</span></div>`;
            if (g.mode === 'hill') sc += `<div class="sc" style="--c:${g.hillZone && g.hillZone.contested ? '#ff5a4a' : '#ffd54a'}"><span class="sc-n">${g.inHill(me) ? (g.hillZone.contested ? 'CONTESTED!' : 'HOLDING THE HILL') : 'GET TO THE HILL'}</span></div>`;
        }
        this.set('sc', $('scorebar'), 'html', sc);
        if (g.modeDef.time) {
            const left = Math.max(0, g.modeDef.time - g.matchT);
            const txt = g.suddenDeath ? 'SUDDEN DEATH' : `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
            this.set('tm', $('timer'), 'text', txt);
            this.set('tmu', $('timer'), 'class:urgent', g.suddenDeath || left < 20);
        } else this.set('tm', $('timer'), 'text', '');

        // revive countdown
        if (!$('revive').classList.contains('hidden')) this.set('rvt', $('rv-timer'), 'text', `Respawning in ${Math.max(0, Math.ceil(me.respawnT))}…`);

        // scoreboard (hold Tab)
        this.set('sb', $('scoreboard'), 'class:hidden', !g.input.showScores);
        if (g.input.showScores) this.set('sbh', $('scoreboard'), 'html', this.statTable(g.fighters.slice().sort((a, b) => b.kos - a.kos)));

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
