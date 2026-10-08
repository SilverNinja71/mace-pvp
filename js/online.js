// ==========================================
// SPEAR-MACE PVP - Peer-to-Peer Online Play
// Two browsers connect directly with WebRTC (via PeerJS, loaded in index.html).
// The host runs the match simulation; the guest sends inputs and draws the
// snapshots the host streams back.
// ==========================================

// Prefix keeps our room IDs from colliding with other apps on the public PeerJS server
const PEER_ID_PREFIX = "spear-mace-pvp-";
const CONNECT_TIMEOUT_MS = 12000;

class OnlineSession {
    constructor() {
        this.peer = null;
        this.conn = null;
        this.role = null; // "host" | "guest" | null
        this.onMessage = null; // (msg) => void
        this.onDisconnect = null; // (reason) => void
        this.connectTimer = null;
    }

    isAvailable() {
        return typeof window !== "undefined" && typeof window.Peer === "function";
    }

    isConnected() {
        return !!(this.conn && this.conn.open);
    }

    // Host a room: resolves when the room is registered, calls onGuestJoined when a friend connects
    host(roomCode, onGuestJoined, onError) {
        this.close();
        if (!this.isAvailable()) {
            onError("Online play couldn't load. Check your internet connection and refresh.");
            return;
        }
        this.role = "host";
        this.peer = new window.Peer(PEER_ID_PREFIX + roomCode);

        this.peer.on("connection", (conn) => {
            // Only one opponent per room
            if (this.conn && this.conn.open) {
                conn.on("open", () => conn.close());
                return;
            }
            this.attachConnection(conn, () => onGuestJoined());
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
        this.conn = conn;
        conn.on("open", onOpen);
        conn.on("data", (msg) => {
            if (this.onMessage && msg && typeof msg === "object") this.onMessage(msg);
        });
        conn.on("close", () => this.handleDisconnect("Your opponent left the match."));
        conn.on("error", () => this.handleDisconnect("The connection to your opponent was lost."));
    }

    handleDisconnect(reason) {
        if (!this.conn) return;
        this.conn = null;
        if (this.onDisconnect) this.onDisconnect(reason);
    }

    send(msg) {
        if (this.conn && this.conn.open) {
            try {
                this.conn.send(msg);
            } catch (e) {
                console.warn("Online send failed:", e);
            }
        }
    }

    close() {
        clearTimeout(this.connectTimer);
        const conn = this.conn;
        this.conn = null; // closing on purpose: don't report it as a disconnect
        if (conn) {
            try { conn.close(); } catch (e) { /* already closed */ }
        }
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
