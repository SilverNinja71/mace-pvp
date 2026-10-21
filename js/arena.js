// ==========================================
// SPEAR-MACE PVP - Arena System & National Leaderboard
// Handles 1v1, 2v2, 5v5 Matches, Public Queuing, Private Rooms,
// Competitive Tiers (Bronze to Obsidian), and National Leaderboard
// ==========================================

export const ARENA_TIERS = {
    bronze: {
        id: "bronze",
        name: "Bronze",
        minRP: 0,
        maxRP: 499,
        color: "#cd7f32",
        icon: "",
        badge: "BRONZE"
    },
    silver: {
        id: "silver",
        name: "Silver",
        minRP: 500,
        maxRP: 999,
        color: "#bdc3c7",
        icon: "",
        badge: "SILVER"
    },
    gold: {
        id: "gold",
        name: "Gold",
        minRP: 1000,
        maxRP: 1499,
        color: "#f1c40f",
        icon: "",
        badge: "GOLD"
    },
    diamond: {
        id: "diamond",
        name: "Diamond",
        minRP: 1500,
        maxRP: 1999,
        color: "#00d2d3",
        icon: "",
        badge: "DIAMOND"
    },
    obsidian: {
        id: "obsidian",
        name: "Obsidian",
        minRP: 2000,
        maxRP: Infinity,
        color: "#9b59b6",
        icon: "",
        badge: "OBSIDIAN"
    }
};

// National Leaderboard Seed: Completely empty to ensure ONLY real people are featured on the leaderboard
export const NATIONAL_LEADERBOARD_SEED = [];

export class ArenaManager {
    constructor() {
        this.queueStatus = "idle"; // "idle" | "queuing" | "matched"
        this.queueTimer = 0;
        this.queueInterval = null;
        this.currentLobby = null;
    }

    getTier(rp = 0) {
        if (rp >= 2000) return ARENA_TIERS.obsidian;
        if (rp >= 1500) return ARENA_TIERS.diamond;
        if (rp >= 1000) return ARENA_TIERS.gold;
        if (rp >= 500)  return ARENA_TIERS.silver;
        return ARENA_TIERS.bronze;
    }

    generateRoomCode() {
        const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const code = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
        const num = Math.floor(Math.random() * 900 + 100);
        return `MACE-${code}-${num}`;
    }

    // Creates random AI fighters to fill team slots in 2v2 and 5v5
    generateTeamRoster(matchType = "1v1", userProfile, selectedWeaponId = "mace") {
        const totalPerTeam = matchType === "5v5" ? 5 : (matchType === "2v2" ? 2 : 1);
        const redTeam = [];
        const blueTeam = [];

        const userRP = userProfile.arenaRP || 250;
        const userTier = this.getTier(userRP);

        // User is ALWAYS Captain of Blue Team (User is always Blue against opponents)
        blueTeam.push({
            id: "player_user",
            name: userProfile.username || "Player",
            isPlayer: true,
            team: "blue",
            weaponId: selectedWeaponId,
            skinId: userProfile.skinId || "steve",
            maxHp: 100,
            x: 120,
            y: 300,
            facing: 1,
            rank: userTier.name,
            tierId: userTier.id,
            rp: userRP
        });

        const botNames = [
            "SkyCrusher", "BladeStorm", "VortexStriker", "ArrowFlurry",
            "ObsidianGuard", "MaceBrawler", "WindStalker", "IronGolem",
            "NetherReaper", "DiamondFighter"
        ];
        const weaponPool = ["mace", "spear", "sword", "fists", "bow"];
        const skinPool = ["steve", "alex", "noob", "man_face", "creeper", "enderman"];
        const botTiers = ["bronze", "silver", "gold", "diamond", "obsidian"];

        // Fill remaining Blue Team slots (Allies) if 2v2 or 5v5
        for (let i = 1; i < totalPerTeam; i++) {
            const bName = botNames[i % botNames.length];
            const wep = weaponPool[Math.floor(Math.random() * weaponPool.length)];
            const skin = skinPool[Math.floor(Math.random() * skinPool.length)];
            const tierKey = botTiers[Math.min(botTiers.length - 1, Math.floor(Math.random() * botTiers.length))];
            const tierObj = ARENA_TIERS[tierKey];
            blueTeam.push({
                id: `bot_blue_${i}`,
                name: `[BOT] ${bName}`,
                isPlayer: false,
                team: "blue",
                weaponId: wep,
                skinId: skin,
                maxHp: 100,
                x: 100 + i * 45,
                y: 300,
                facing: 1,
                rank: tierObj.name,
                tierId: tierObj.id,
                rp: Math.floor(tierObj.minRP + Math.random() * 400)
            });
        }

        // Fill Red Team slots (Opponents)
        for (let i = 0; i < totalPerTeam; i++) {
            const bName = botNames[(i + 4) % botNames.length];
            const wep = weaponPool[Math.floor(Math.random() * weaponPool.length)];
            const skin = skinPool[Math.floor(Math.random() * skinPool.length)];
            const tierKey = botTiers[Math.min(botTiers.length - 1, Math.floor(Math.random() * botTiers.length))];
            const tierObj = ARENA_TIERS[tierKey];
            redTeam.push({
                id: `bot_red_${i}`,
                name: `[BOT] ${bName}`,
                isPlayer: false,
                team: "red",
                weaponId: wep,
                skinId: skin,
                maxHp: 100,
                x: 680 - i * 45,
                y: 300,
                facing: -1,
                rank: tierObj.name,
                tierId: tierObj.id,
                rp: Math.floor(tierObj.minRP + Math.random() * 400)
            });
        }

        return { redTeam, blueTeam, matchType };
    }

    // Get verified national leaderboard with ONLY real human players (zero bots)
    getLeaderboard(userProfile) {
        const REAL_LEADERBOARD_KEY = "spear_mace_real_leaderboard";
        let board = [];
        try {
            const raw = localStorage.getItem(REAL_LEADERBOARD_KEY);
            if (raw) {
                board = JSON.parse(raw);
            }
        } catch (e) {
            board = [];
        }

        // Strictly purge any bots from the leaderboard
        board = board.filter(entry => entry && !entry.isBot && !(entry.name && entry.name.startsWith("[BOT]")));

        // Upsert current active real player
        if (userProfile && userProfile.username) {
            const userRP = userProfile.arenaRP || 250;
            const userTier = this.getTier(userRP);
            const userWins = userProfile.stats?.wins || 0;
            const matches = userProfile.stats?.matches || 0;
            const userWinRate = matches > 0 ? `${Math.round((userWins / matches) * 100)}%` : "0%";

            const existingIdx = board.findIndex(p => 
                (p.id && p.id === userProfile.id) || 
                (p.name && p.name.toLowerCase() === userProfile.username.toLowerCase())
            );

            const playerEntry = {
                id: userProfile.id || "current_user",
                name: userProfile.username || 'You',
                rp: userRP,
                tier: userTier.id,
                wins: userWins,
                matches: matches,
                winRate: userWinRate,
                weapon: userProfile.equippedWeapon || "mace",
                flag: "",
                skin: userProfile.skinId || "steve",
                isUser: true,
                isBot: false,
                lastActive: Date.now()
            };

            if (existingIdx >= 0) {
                board[existingIdx] = playerEntry;
            } else {
                board.push(playerEntry);
            }

            try {
                localStorage.setItem(REAL_LEADERBOARD_KEY, JSON.stringify(board));
            } catch (e) {}
        }

        // Sort descending by RP, then by wins
        board.sort((a, b) => {
            if (b.rp !== a.rp) return b.rp - a.rp;
            return (b.wins || 0) - (a.wins || 0);
        });

        // Re-index ranks
        return board.map((entry, idx) => ({
            ...entry,
            rank: idx + 1,
            isUser: entry.id === userProfile?.id || entry.name?.toLowerCase() === userProfile?.username?.toLowerCase()
        }));
    }
}

export const arena = new ArenaManager();
