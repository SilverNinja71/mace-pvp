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

export const NATIONAL_LEADERBOARD_SEED = [
    { rank: 1, name: "xX_MaceGod_Xx", rp: 2840, tier: "obsidian", wins: 342, winRate: "89%", weapon: "mace", flag: "", skin: "steve" },
    { rank: 2, name: "SkySniper_Pro", rp: 2715, tier: "obsidian", wins: 298, winRate: "84%", weapon: "bow", flag: "", skin: "alex" },
    { rank: 3, name: "DiamondSlicer", rp: 2640, tier: "obsidian", wins: 285, winRate: "82%", weapon: "sword", flag: "", skin: "man_face" },
    { rank: 4, name: "BreezeTitan", rp: 2580, tier: "obsidian", wins: 260, winRate: "80%", weapon: "spear", flag: "", skin: "steve" },
    { rank: 5, name: "NoobDestroyer99", rp: 2490, tier: "obsidian", wins: 245, winRate: "79%", weapon: "fists", flag: "", skin: "noob" },
    { rank: 6, name: "ApexSlammer", rp: 2410, tier: "obsidian", wins: 231, winRate: "77%", weapon: "mace", flag: "", skin: "creeper" },
    { rank: 7, name: "EnderValkyrie", rp: 2350, tier: "obsidian", wins: 219, winRate: "76%", weapon: "spear", flag: "", skin: "enderman" },
    { rank: 8, name: "NetherKnight", rp: 2280, tier: "obsidian", wins: 208, winRate: "75%", weapon: "sword", flag: "", skin: "steve" },
    { rank: 9, name: "GravityGhost", rp: 2190, tier: "obsidian", wins: 195, winRate: "74%", weapon: "mace", flag: "", skin: "skeleton" },
    { rank: 10, name: "BowLegend_Infinity", rp: 2120, tier: "obsidian", wins: 184, winRate: "73%", weapon: "bow", flag: "", skin: "alex" }
];

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

        // User is always Captain of Red Team
        redTeam.push({
            id: "player_user",
            name: userProfile.username || "Player",
            isPlayer: true,
            team: "red",
            weaponId: selectedWeaponId,
            skinId: userProfile.skinId || "steve",
            maxHp: 100,
            x: 120,
            y: 300,
            facing: 1
        });

        const botNames = [
            "SkyCrusher", "BladeStorm", "VortexStriker", "ArrowFlurry",
            "ObsidianGuard", "MaceBrawler", "WindStalker", "IronGolem",
            "NetherReaper", "DiamondFighter"
        ];
        const weaponPool = ["mace", "spear", "sword", "fists", "bow"];
        const skinPool = ["steve", "alex", "noob", "man_face", "creeper", "enderman"];

        // Fill remaining Red Team slots if 2v2 or 5v5
        for (let i = 1; i < totalPerTeam; i++) {
            const bName = botNames[i % botNames.length];
            const wep = weaponPool[Math.floor(Math.random() * weaponPool.length)];
            const skin = skinPool[Math.floor(Math.random() * skinPool.length)];
            redTeam.push({
                id: `bot_red_${i}`,
                name: `[BOT] ${bName}`,
                isPlayer: false,
                team: "red",
                weaponId: wep,
                skinId: skin,
                maxHp: 100,
                x: 100 + i * 45,
                y: 300,
                facing: 1
            });
        }

        // Fill Blue Team slots
        for (let i = 0; i < totalPerTeam; i++) {
            const bName = botNames[(i + 4) % botNames.length];
            const wep = weaponPool[Math.floor(Math.random() * weaponPool.length)];
            const skin = skinPool[Math.floor(Math.random() * skinPool.length)];
            blueTeam.push({
                id: `bot_blue_${i}`,
                name: `[BOT] ${bName}`,
                isPlayer: false,
                team: "blue",
                weaponId: wep,
                skinId: skin,
                maxHp: 100,
                x: 680 - i * 45,
                y: 300,
                facing: -1
            });
        }

        return { redTeam, blueTeam, matchType };
    }

    // Get national leaderboard with player inserted at their appropriate rank
    getLeaderboard(userProfile) {
        const board = [...NATIONAL_LEADERBOARD_SEED];
        const userRP = userProfile.arenaRP || 250;
        const userTier = this.getTier(userRP);
        const userWins = userProfile.stats?.wins || 0;
        const matches = userProfile.stats?.matches || 0;
        const userWinRate = matches > 0 ? `${Math.round((userWins / matches) * 100)}%` : "0%";

        const playerEntry = {
            rank: 999,
            name: `${userProfile.username || 'You'} (YOU)`,
            rp: userRP,
            tier: userTier.id,
            wins: userWins,
            winRate: userWinRate,
            weapon: userProfile.equippedWeapon || "mace",
            flag: "",
            skin: userProfile.skinId || "steve",
            isUser: true
        };

        // Determine user rank based on RP
        let inserted = false;
        for (let i = 0; i < board.length; i++) {
            if (userRP >= board[i].rp) {
                board.splice(i, 0, playerEntry);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            board.push(playerEntry);
        }

        // Re-index ranks
        board.forEach((entry, idx) => {
            entry.rank = idx + 1;
        });

        return board;
    }
}

export const arena = new ArenaManager();
