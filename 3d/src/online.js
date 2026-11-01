// ==========================================
// OnlineRoom: play with up to 3 friends over PeerJS (browser to browser).
// The host's game is the referee: it decides hits, damage, knockouts and
// respawns, and streams the match 30 times a second. Every player moves
// their own fighter on their own screen, so movement feels instant even
// with some lag; the host is told where you are and what you did.
// Room codes and ?room=CODE invite links work like Penguin League's.
// ==========================================

import { SPEAR, PARRY, PHYS, MATCH } from './config.js';
import { profile } from './profile.js';

const PREFIX = 'spear-mace-3d-';
const SEND_HZ = 30;
const INTERP_DELAY = 0.1; // guests draw others 100 ms in the past, between two snapshots
const MOVE_EVENTS = new Set(['jump', 'windJump', 'dash', 'slamStart', 'swing', 'parryUp', 'land', 'pad', 'geyser', 'grow', 'vanish', 'reveal', 'blinkOut', 'blinkIn']);
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function onlineAvailable() {
    return typeof window !== 'undefined' && typeof window.Peer === 'function' && !window.SMA_OFFLINE;
}

export class OnlineRoom {
    constructor(game, ui) {
        this.game = game;
        this.ui = ui;
        this.peer = null;
        this.isHost = false;
        this.code = null;
        this.guests = new Map();      // host: peerId -> { conn, name, classId, skinId, fighterId }
        this.hostConn = null;         // guest: connection to the host
        this.lobby = [];              // names, host first
        this.sendT = 0;
        this.clock = 0;
        this.inMatch = false;
        this.skipPeer = null;         // host: don't echo an event back to the guest who caused it
        this.onLobby = null;          // (lobby list, isHost) => void
        this.onStatus = null;         // (text) => void
        this.onClosed = null;         // (reason) => void
    }

    me() { return { name: profile.name, classId: profile.classId, skinId: profile.skinId }; }

    // ---------------- rooms ----------------
    host(onReady) {
        this.leave(true);
        this.isHost = true;
        let code = '';
        for (let i = 0; i < 5; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
        this.code = code;
        this.peer = new window.Peer(PREFIX + code);
        this.peer.on('open', () => { this.lobby = [this.me().name]; this.pushLobby(); onReady(code); });
        this.peer.on('connection', (conn) => this.acceptGuest(conn));
        this.peer.on('error', (e) => this.status(describe(e)));
    }

    acceptGuest(conn) {
        conn.on('open', () => {
            if (this.guests.size >= 3 || this.inMatch) {
                conn.send({ t: 'full', why: this.inMatch ? 'The match already started.' : 'The room is full (4 players).' });
                setTimeout(() => conn.close(), 300);
                return;
            }
            this.guests.set(conn.peer, { conn, name: 'Friend', classId: 'normal', skinId: 'steve', fighterId: -1 });
        });
        conn.on('data', (m) => this.onHostMessage(conn.peer, m));
        conn.on('close', () => this.guestLeft(conn.peer));
        conn.on('error', () => this.guestLeft(conn.peer));
    }

    join(code, onJoined) {
        this.leave(true);
        this.isHost = false;
        this.code = String(code || '').trim().toUpperCase();
        this.peer = new window.Peer();
        const timer = setTimeout(() => { if (!this.hostConn || !this.hostConn.open) this.status("Couldn't reach that room. Check the code and that your friend's room is still open."); }, 12000);
        this.peer.on('open', () => {
            const conn = this.peer.connect(PREFIX + this.code, { reliable: true });
            this.hostConn = conn;
            conn.on('open', () => { clearTimeout(timer); conn.send({ t: 'hello', ...this.me() }); onJoined(); });
            conn.on('data', (m) => this.onGuestMessage(m));
            conn.on('close', () => this.closed('The host left the room.'));
            conn.on('error', () => this.closed('The connection to the host was lost.'));
        });
        this.peer.on('error', (e) => { clearTimeout(timer); this.status(describe(e)); });
    }

    leave(quiet = false) {
        const g = this.game;
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) { /* gone */ }
        }
        this.peer = null;
        this.guests.clear();
        this.hostConn = null;
        this.inMatch = false;
        if (g.remote === this) g.remote = null;
        if (!quiet && this.onClosed) this.onClosed(null);
    }

    closed(reason) {
        const wasPlaying = this.inMatch;
        this.leave(true);
        if (this.onClosed) this.onClosed(reason, wasPlaying);
    }

    status(t) { if (this.onStatus) this.onStatus(t); }

    pushLobby() {
        this.lobby = [this.me().name, ...[...this.guests.values()].map(g => g.name)];
        if (this.onLobby) this.onLobby(this.lobby, this.isHost);
        this.broadcast({ t: 'lobby', p: this.lobby });
    }

    broadcast(m, except = null) {
        for (const [id, g] of this.guests) if (id !== except && g.conn.open) { try { g.conn.send(m); } catch (e) { /* closed */ } }
    }

    toHost(m) { if (this.hostConn && this.hostConn.open) { try { this.hostConn.send(m); } catch (e) { /* closed */ } } }

    guestLeft(peerId) {
        const g = this.guests.get(peerId);
        if (!g) return;
        this.guests.delete(peerId);
        if (this.inMatch && g.fighterId >= 0) {
            const f = this.game.fighters[g.fighterId];
            if (f) {
                f.alive = false; f.respawnT = Infinity; f.pos.y = -999; f.left = true;
                if (this.game.models[f.id]) this.game.models[f.id].root.visible = false;
                this.ui.toast(`${f.name} left the match.`);
                this.broadcast({ t: 'left', i: f.id });
                if (this.guests.size === 0) this.game.endMatch();
            }
        } else this.pushLobby();
    }

    // ---------------- starting ----------------
    startMatch() {
        if (!this.isHost || this.guests.size === 0) return false;
        const roster = [{ ...this.me() }];
        let i = 1;
        for (const g of this.guests.values()) { g.fighterId = i++; roster.push({ name: g.name, classId: g.classId, skinId: g.skinId }); }
        const kos = roster.length === 2 ? MATCH.duelKOs : MATCH.brawlKOs;
        const layout = Math.random() < 0.5 ? 'colosseum' : 'ruins';
        const theme = ['sunset', 'sunset', 'night', 'storm'][Math.floor(Math.random() * 4)];
        for (const [, g] of this.guests) g.conn.send({ t: 'start', roster, you: g.fighterId, kos, layout, theme });
        this.begin(roster, 0, kos, layout, theme);
        return true;
    }

    begin(roster, you, kos, layout, theme) {
        this.inMatch = true;
        this.clock = 0;
        this.spawnSeq = 0;
        this.buffers = roster.map(() => []);
        this.lastState = roster.map(() => 0);
        this.ui.closeAllPanels();
        this.game.startMatch({ mode: 'online', roster, localIndex: you, kos, remote: this,
            layout: layout === 'ruins' ? 'ruins' : 'colosseum', theme: ['sunset', 'night', 'storm'].includes(theme) ? theme : 'sunset' });
    }

    // ---------------- per frame ----------------
    update(dt) {
        if (!this.inMatch) return;
        this.clock += dt;
        this.sendT += dt;
        if (this.sendT < 1 / SEND_HZ) return;
        this.sendT = 0;
        const g = this.game;
        if (this.isHost) this.broadcast(this.snapshot());
        else if (g.local && g.local.alive) this.toHost({ t: 'st', s: packSelf(g.local, this.spawnSeq) });
    }

    snapshot() {
        const g = this.game;
        const f = g.fighters.map((x) => [
            x.id, r2(x.pos.x), r2(x.pos.y), r2(x.pos.z), r2(x.vel.x), r2(x.vel.y), r2(x.vel.z), r2(x.yaw), r2(x.pitch),
            Math.round(x.hp), x.alive ? 1 : 0, x.kos, x.deaths, flags(x), Math.round(x.maxHp)
        ]);
        return { t: 'snap', c: r2(this.clock), m: [r2(g.matchT), g.suddenDeath ? 1 : 0], f };
    }

    // Host: move a guest's fighter between their updates (and run its dash, which decides hits)
    advance(f, dt) {
        const g = this.game;
        f.prevPos.x = f.pos.x; f.prevPos.y = f.pos.y; f.prevPos.z = f.pos.z;
        f.prevYaw = f.yaw;
        if (!f.alive) return;
        f.invulnT = Math.max(0, f.invulnT - dt);
        f.stunT = Math.max(0, f.stunT - dt);
        f.parryT = Math.max(0, f.parryT - dt);
        f.spawnShield = Math.max(0, f.spawnShield - dt);
        f.swingT = Math.max(0, f.swingT - dt);
        f.slowT = Math.max(0, f.slowT - dt);
        f.blindT = Math.max(0, f.blindT - dt);
        f.tickStatus(dt, g); // burn and poison damage, decided here
        if (!f.alive) return;
        if (f.dashT > 0) {
            f.pos.x += f.dashDir.x * SPEAR.speed * dt; f.pos.y += f.dashDir.y * SPEAR.speed * dt; f.pos.z += f.dashDir.z * SPEAR.speed * dt;
            f.dashT -= dt;
        } else if (this.clock - this.lastState[f.id] < 0.2) {
            f.pos.x += f.vel.x * dt; f.pos.y += f.vel.y * dt; f.pos.z += f.vel.z * dt;
            const ground = g.physics.groundAt(f.pos.x, f.pos.z, f.radius * 0.6, f.prevPos.y + 0.06);
            if (f.pos.y < ground) { f.pos.y = ground; f.vel.y = 0; }
        }
        if (f.pos.y < PHYS.voidY) g.knockOut(f, 'void');
    }

    // Guest: everyone else is drawn from the host's snapshots, a little in the past
    interpolate(f) {
        f.prevPos.x = f.pos.x; f.prevPos.y = f.pos.y; f.prevPos.z = f.pos.z;
        f.prevYaw = f.yaw;
        const buf = this.buffers[f.id];
        if (!buf || !buf.length) return;
        const t = this.clock - INTERP_DELAY;
        let a = buf[0], b = buf[buf.length - 1];
        for (let i = 0; i < buf.length - 1; i++) if (buf[i].t <= t && buf[i + 1].t >= t) { a = buf[i]; b = buf[i + 1]; break; }
        const span = b.t - a.t;
        const k = span > 0 ? Math.max(0, Math.min(1, (t - a.t) / span)) : 1;
        if (Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 8) { f.pos.x = b.x; f.pos.y = b.y; f.pos.z = b.z; f.prevPos.x = b.x; f.prevPos.y = b.y; f.prevPos.z = b.z; }
        else { f.pos.x = a.x + (b.x - a.x) * k; f.pos.y = a.y + (b.y - a.y) * k; f.pos.z = a.z + (b.z - a.z) * k; }
        let dy = b.yaw - a.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        f.yaw = a.yaw + dy * k;
        f.pitch = a.pitch + (b.pitch - a.pitch) * k;
    }

    // ---------------- host: messages from guests ----------------
    onHostMessage(peerId, m) {
        const gu = this.guests.get(peerId);
        if (!gu || !m || typeof m !== 'object') return;
        const g = this.game;
        if (m.t === 'hello') {
            gu.name = cleanName(m.name); gu.classId = String(m.classId || 'normal'); gu.skinId = String(m.skinId || 'steve');
            this.pushLobby();
            return;
        }
        if (!this.inMatch || gu.fighterId < 0) return;
        const f = g.fighters[gu.fighterId];
        if (!f) return;
        if (m.t === 'st' && Array.isArray(m.s)) {
            // ignore reports sent before the guest heard about their latest respawn
            if ((m.s[13] | 0) !== (f.spawnSeq | 0)) return;
            unpackSelf(f, m.s);
            this.lastState[f.id] = this.clock;
        } else if (m.t === 'ev' && MOVE_EVENTS.has(m.n)) {
            const a = m.a || [];
            if (m.n === 'dash') {
                f.dashDir.x = +a[0] || 0; f.dashDir.y = +a[1] || 0; f.dashDir.z = +a[2] || 0;
                f.dashT = SPEAR.time; f.hitMask = 0;
            } else if (m.n === 'slamStart') f.slamming = true;
            else if (m.n === 'parryUp') f.parryT = PARRY.window + 0.12; // a little extra for the trip over the internet
            else if (m.n === 'swing') { f.swingT = 0.3; g.combat.checkSwing(f, g.fighters); }
            this.skipPeer = peerId;
            g.emit(m.n, f, m.n === 'pad' ? g.arena.pads[a[0] | 0] : a[0]);
            this.skipPeer = null;
        } else if (m.t === 'slam') {
            // the guest's slam hit the floor: shockwave damage, decided here
            f.pos.x = +m.x; f.pos.y = +m.y; f.pos.z = +m.z; f.apexY = +m.apex;
            f.slamming = false;
            this.skipPeer = peerId;
            g.combat.slamLand(f);
            this.skipPeer = null;
        }
    }

    // ---------------- host: telling guests things ----------------
    guestOf(f) {
        for (const [id, g] of this.guests) if (g.fighterId === f.id) return { id, g };
        return null;
    }
    isGuestFighter(f) { return this.isHost && !!this.guestOf(f); }

    relayEvent(name, a, b, c, d, e, f2) {
        if (!this.inMatch) return;
        const enc = (x) => (x && typeof x === 'object' && 'pos' in x && 'id' in x) ? { F: x.id } : (x && typeof x === 'object' && 'vx' in x && 'to' in x) ? { P: this.game.arena.pads.indexOf(x) } : x;
        const msg = { t: 'fx', n: name, a: [enc(a), enc(b), enc(c), enc(d), enc(e), enc(f2)] };
        // the guest who did a move already showed it on their screen
        const skip = (MOVE_EVENTS.has(name) || name === 'shockwave') ? this.skipPeer : null;
        this.broadcast(msg, skip);
    }

    // A guest's fighter was hit, parried or bounced here: send them the result
    sendBody(f, kind) {
        const gq = this.guestOf(f);
        if (!gq) return;
        gq.g.conn.send({ t: 'kb', k: kind, v: [r2(f.vel.x), r2(f.vel.y), r2(f.vel.z)], s: r2(f.stunT), i: r2(f.invulnT),
            fx: [r2(f.slowT), r2(f.poisonT), r2(f.blindT), r2(f.fireT)] });
    }

    relayKO(f, killer, cause) {
        this.broadcast({ t: 'ko', v: f.id, k: killer ? killer.id : -1, c: cause });
    }

    relaySpawn(f) {
        f.spawnSeq = (f.spawnSeq | 0) + 1;
        this.broadcast({ t: 'spawn', i: f.id, q: f.spawnSeq, p: [r2(f.pos.x), r2(f.pos.y), r2(f.pos.z), r2(f.yaw)] });
    }

    relayEnd(ranked) {
        this.broadcast({ t: 'end', o: ranked.map(f => f.id) });
        this.inMatch = false;
    }

    // ---------------- guest: messages from the host ----------------
    onGuestMessage(m) {
        if (!m || typeof m !== 'object') return;
        const g = this.game;
        if (m.t === 'lobby') { this.lobby = m.p || []; if (this.onLobby) this.onLobby(this.lobby, false); return; }
        if (m.t === 'full') { this.status(m.why || 'That room is full.'); this.leave(true); return; }
        if (m.t === 'start') { this.begin(m.roster, m.you | 0, m.kos | 0, m.layout, m.theme); return; }
        if (!this.inMatch) return;
        const me = g.local;
        if (m.t === 'snap') {
            g.matchT = m.m[0]; g.suddenDeath = !!m.m[1];
            for (const s of m.f) {
                const f = g.fighters[s[0]];
                if (!f) continue;
                f.hp = s[9]; f.kos = s[11]; f.deaths = s[12]; f.maxHp = s[14] || f.maxHp;
                if (f === me) continue;
                const buf = this.buffers[f.id];
                buf.push({ t: this.clock, x: s[1], y: s[2], z: s[3], yaw: s[7], pitch: s[8] });
                if (buf.length > 12) buf.shift();
                f.vel.x = s[4]; f.vel.y = s[5]; f.vel.z = s[6];
                applyFlags(f, s[13]);
                const alive = !!s[10];
                if (alive !== f.alive) {
                    f.alive = alive;
                    if (g.models[f.id]) g.models[f.id].root.visible = alive;
                    if (alive) { buf.length = 0; buf.push({ t: this.clock, x: s[1], y: s[2], z: s[3], yaw: s[7], pitch: s[8] }); f.pos.x = s[1]; f.pos.y = s[2]; f.pos.z = s[3]; }
                }
            }
        } else if (m.t === 'fx') {
            const dec = (x) => (x && typeof x === 'object') ? ('F' in x ? g.fighters[x.F] : 'P' in x ? g.arena.pads[x.P] : x) : x;
            const a = (m.a || []).map(dec);
            if (a[0] === undefined) return;
            g.emit(m.n, a[0], a[1], a[2], a[3], a[4], a[5]);
        } else if (m.t === 'kb' && me) {
            me.cancelActions();
            me.vel.x = m.v[0]; me.vel.y = m.v[1]; me.vel.z = m.v[2];
            me.stunT = m.s; me.invulnT = m.i;
            // statuses show on our screen; the host deals the burn and poison damage
            if (Array.isArray(m.fx)) { me.slowT = +m.fx[0] || 0; me.poisonT = +m.fx[1] || 0; me.blindT = +m.fx[2] || 0; me.fireT = +m.fx[3] || 0; }
            me.onGround = false; me.padFlight = false; me.apexY = me.pos.y;
            if (m.k === 'bounce') { g.combat.bounce(me); me.stunT = 0; }
        } else if (m.t === 'ko') {
            const v = g.fighters[m.v], k = m.k >= 0 ? g.fighters[m.k] : null;
            if (v) g.koEffects(v, k, m.c);
        } else if (m.t === 'spawn') {
            const f = g.fighters[m.i];
            if (!f) return;
            const p = m.p;
            if (f === me) {
                this.spawnSeq = m.q | 0;
                f.reset({ x: p[0], y: p[1] - 0.05, z: p[2], yaw: p[3] });
                g.look.yaw = p[3]; g.look.pitch = f.pitch;
            } else {
                f.alive = true;
                this.buffers[f.id].length = 0;
            }
            if (g.models[f.id]) g.models[f.id].root.visible = f !== me || g.rig.mode !== 'first';
        } else if (m.t === 'left') {
            const f = g.fighters[m.i];
            if (f) { f.alive = false; f.left = true; if (g.models[f.id]) g.models[f.id].root.visible = false; this.ui.toast(`${f.name} left the match.`); }
        } else if (m.t === 'end') {
            this.inMatch = false;
            g.endMatchRemote(m.o || []);
        }
    }

    // Guest: tell the host about a move we just made
    sendEvent(name, f, b) {
        let a = [];
        if (name === 'dash') a = [r3(f.dashDir.x), r3(f.dashDir.y), r3(f.dashDir.z)];
        else if (name === 'pad') a = [this.game.arena.pads.indexOf(b)];
        else if (typeof b === 'number') a = [r2(b)];
        this.toHost({ t: 'ev', n: name, a });
        if (name !== 'swing' && name !== 'dash' && f.alive) this.toHost({ t: 'st', s: packSelf(f, this.spawnSeq) });
    }

    sendSlam(f) {
        this.toHost({ t: 'st', s: packSelf(f, this.spawnSeq) });
        this.toHost({ t: 'slam', x: r2(f.pos.x), y: r2(f.pos.y), z: r2(f.pos.z), apex: r2(f.apexY) });
    }

    inviteLink() {
        const u = new URL(location.href);
        u.hash = '';
        u.search = '';
        u.searchParams.set('room', this.code);
        return u.toString();
    }
}

// ---------------- packing ----------------
function r2(v) { return Math.round(v * 100) / 100; }
function r3(v) { return Math.round(v * 1000) / 1000; }

function flags(f) {
    return (f.dashT > 0 ? 1 : 0) | (f.slamming ? 2 : 0) | (f.onGround ? 4 : 0) | (f.parryT > 0 ? 8 : 0) | (f.invisible ? 16 : 0)
        | (f.big ? 32 : 0) | (f.glide ? 64 : 0) | (f.stunT > 0 ? 128 : 0) | (f.spawnShield > 0 ? 256 : 0) | (f.fireT > 0 ? 512 : 0);
}

function applyFlags(f, b) {
    f.dashT = b & 1 ? Math.max(f.dashT, 0.05) : 0;
    f.slamming = !!(b & 2);
    f.onGround = !!(b & 4);
    f.parryT = b & 8 ? 0.05 : 0;
    f.invisT = b & 16 ? 1 : 0;
    if (!!(b & 32) !== f.big) f.setBig(!!(b & 32));
    f.glide = !!(b & 64);
    f.stunT = b & 128 ? 0.05 : 0;
    f.spawnShield = b & 256 ? 0.3 : 0;
    f.fireT = b & 512 ? 0.5 : 0;
}

function packSelf(f, seq) {
    return [r2(f.pos.x), r2(f.pos.y), r2(f.pos.z), r2(f.vel.x), r2(f.vel.y), r2(f.vel.z), r2(f.yaw), r2(f.pitch), flags(f), r2(f.apexY),
        r3(f.dashDir.x), r3(f.dashDir.y), r3(f.dashDir.z), seq | 0];
}

// Host: a guest's own report of where they are
function unpackSelf(f, s) {
    if (!f.alive) return;
    const n = (i) => (Number.isFinite(+s[i]) ? +s[i] : 0);
    f.pos.x = n(0); f.pos.y = n(1); f.pos.z = n(2);
    f.vel.x = n(3); f.vel.y = n(4); f.vel.z = n(5);
    f.yaw = n(6); f.pitch = n(7);
    const b = s[8] | 0;
    f.slamming = !!(b & 2);
    f.onGround = !!(b & 4);
    if (b & 8) f.parryT = Math.max(f.parryT, 0.05);
    f.invisT = b & 16 ? 1 : 0;
    if (!!(b & 32) !== f.big) f.setBig(!!(b & 32));
    f.glide = !!(b & 64);
    f.apexY = n(9);
    if (b & 1) { f.dashDir.x = n(10); f.dashDir.y = n(11); f.dashDir.z = n(12); }
}

function cleanName(n) {
    const t = String(n || '').replace(/[^a-zA-Z0-9_ ]/g, '').trim().slice(0, 16);
    return t.length >= 2 ? t : 'Friend';
}

function describe(err) {
    const type = err && err.type;
    if (type === 'peer-unavailable') return 'Room not found. Check the code, or ask your friend to make the room again.';
    if (type === 'unavailable-id') return 'That room code is taken. Make a new room.';
    if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed') return "Couldn't reach the online server. Check your internet connection.";
    if (type === 'browser-incompatible') return "This browser can't play online. Try Chrome, Edge, Firefox or Safari.";
    return 'Online connection error. Please try again.';
}
