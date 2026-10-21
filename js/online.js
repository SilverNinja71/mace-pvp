// ==========================================
// SPEAR-MACE PVP - Peer-to-Peer Online Play
// Browsers connect directly with WebRTC (via PeerJS, loaded in index.html).
// The host runs the match simulation and accepts up to 3 friends; guests
// send inputs and draw the snapshots the host streams back.
// ==========================================

// Prefix keeps our room IDs from colliding with other apps on the public PeerJS server
const PEER_ID_PREFIX = "spear-mace-pvp-";
const CONNECT_TIMEOUT_MS = 12000;

class OnlineSession {
    constructor() {
        this.peer = null;
        this.role = null; // "host" | "guest" | null
        this.conns = new Map(); // peerId -> DataConnection (host: guests, guest: just the host)
        this.maxGuests = 1;
        this.onMessage = null; // (msg, fromPeerId) => void
        this.onDisconnect = null; // (reason, peerId) => void
        this.onGuestJoined = null; // (peerId) => void (host only)
        this.connectTimer = null;
    }

    isAvailable() {
        return typeof window !== "undefined" && typeof window.Peer === "function";
    }

    isConnected() {
        for (const c of this.conns.values()) if (c.open) return true;
        return false;
    }

    guestCount() {
        let n = 0;
        for (const c of this.conns.values()) if (c.open) n++;
        return n;
    }

    // Host a room; onReady fires once the room code is registered
    host(roomCode, maxGuests, onReady, onError) {
        this.close();
        if (!this.isAvailable()) {
            onError("Online play couldn't load. Check your internet connection and refresh.");
            return;
        }
        this.role = "host";
        this.maxGuests = maxGuests;
        this.peer = new window.Peer(PEER_ID_PREFIX + roomCode);

        this.peer.on("open", () => onReady());
        this.peer.on("connection", (conn) => {
            if (this.guestCount() >= this.maxGuests) {
                conn.on("open", () => {
                    conn.send({ t: "full" });
                    setTimeout(() => conn.close(), 300);
                });
                return;
            }
            this.attachConnection(conn, () => {
                if (this.onGuestJoined) this.onGuestJoined(conn.peer);
            });
        });
        this.peer.on("error", (err) => onError(this.describeError(err)));
    }

    // Join a friend's room: calls onConnected once the data channel is open
    join(roomCode, onConnected, onError) {
        this.close();
        if (!this.isAvailable()) {
            onError("Online play couldn't load. Check your internet connection and refresh.");
            return;
        }
        this.role = "guest";
        this.peer = new window.Peer();

        this.peer.on("open", () => {
            const conn = this.peer.connect(PEER_ID_PREFIX + roomCode, { reliable: true });
            this.attachConnection(conn, () => {
                clearTimeout(this.connectTimer);
                onConnected();
            });
        });
        this.peer.on("error", (err) => {
            clearTimeout(this.connectTimer);
            onError(this.describeError(err));
        });

        this.connectTimer = setTimeout(() => {
            if (!this.isConnected()) {
                onError("Couldn't reach that room. Make sure your friend's room is still open, then try again.");
                this.close();
            }
        }, CONNECT_TIMEOUT_MS);
    }

    attachConnection(conn, onOpen) {
        this.conns.set(conn.peer, conn);
        conn.on("open", onOpen);
        conn.on("data", (msg) => {
            if (this.onMessage && msg && typeof msg === "object") this.onMessage(msg, conn.peer);
        });
        const lost = (reason) => this.handleDisconnect(conn.peer, reason);
        conn.on("close", () => lost(this.role === "host" ? "A player left the match." : "The host left the match."));
        conn.on("error", () => lost("The connection was lost."));
    }

    handleDisconnect(peerId, reason) {
        if (!this.conns.has(peerId)) return; // already closed on purpose
        this.conns.delete(peerId);
        if (this.onDisconnect) this.onDisconnect(reason, peerId);
    }

    // Host: send to every guest. Guest: send to the host.
    send(msg) {
        for (const c of this.conns.values()) this.sendOn(c, msg);
    }

    sendTo(peerId, msg) {
        const c = this.conns.get(peerId);
        if (c) this.sendOn(c, msg);
    }

    sendOn(conn, msg) {
        if (!conn.open) return;
        try {
            conn.send(msg);
        } catch (e) {
            console.warn("Online send failed:", e);
        }
    }

    close() {
        clearTimeout(this.connectTimer);
        const conns = [...this.conns.values()];
        this.conns.clear(); // closing on purpose: don't report these as disconnects
        conns.forEach(c => {
            try { c.close(); } catch (e) { /* already closed */ }
        });
        if (this.peer) {
            try { this.peer.destroy(); } catch (e) { /* already destroyed */ }
            this.peer = null;
        }
        this.role = null;
    }

    describeError(err) {
        const type = err && err.type;
        if (type === "peer-unavailable") return "Room not found. Check the code, or ask your friend to create the room again.";
        if (type === "unavailable-id") return "That room code is already in use. Create a new room.";
        if (type === "network" || type === "server-error" || type === "socket-error" || type === "socket-closed") {
            return "Couldn't reach the online server. Check your internet connection and try again.";
        }
        if (type === "browser-incompatible") return "This browser doesn't support online play. Try Chrome, Edge, Firefox or Safari.";
        return "Online connection error. Please try again.";
    }
}

export const online = new OnlineSession();
