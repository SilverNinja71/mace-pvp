// ==========================================
// SPEAR-MACE PVP - Authentication, Economy & Profile Manager
// Handles Google Sign-In, Gold Currency, Minecraft Weapons Arsenal,
// Block Face Skins (Steve, Alex, Roblox Noob, Man Face), and Arena RP
// ==========================================

const STORAGE_KEY = "spear_mace_user_profile";

export const AVATAR_PRESETS = [
    { id: "steve", name: "Steve", icon: "", bg: "#2ecc71" },
    { id: "alex", name: "Alex", icon: "", bg: "#e67e22" },
    { id: "mace_knight", name: "Mace Knight", icon: "", bg: "#3498db" },
    { id: "wind_breeze", name: "Wind Breeze", icon: "", bg: "#00d2d3" },
    { id: "nether_warrior", name: "Nether Titan", icon: "", bg: "#e74c3c" },
    { id: "ender_champion", name: "Ender Champion", icon: "", bg: "#9b59b6" },
    { id: "golden_paladin", name: "Gold Paladin", icon: "", bg: "#f1c40f" },
    { id: "shadow_bot", name: "Shadow Rogue", icon: "", bg: "#2c3e50" }
];

export const BLOCK_FACES = [
    { id: "steve", name: "Minecraft Steve", icon: "", cost: 0, desc: "Classic Minecraft icon with cyan tee and brown hair." },
    { id: "alex", name: "Minecraft Alex", icon: "", cost: 0, desc: "Classic Minecraft explorer with green tunic and orange hair." },
    { id: "noob", name: "Roblox Noob", icon: "", cost: 100, desc: "The iconic yellow block head with simple smile and blue torso." },
    { id: "man_face", name: "Roblox Man Face", icon: "", cost: 200, desc: "The legendary, unmistakable smirking block face." },
    { id: "creeper", name: "Creeper Face", icon: "", cost: 250, desc: "Pixelated green explosive face with iconic black frown." },
    { id: "enderman", name: "Enderman", icon: "", cost: 300, desc: "Deep dark obsidian head with glowing mystical violet eyes." },
    { id: "skeleton", name: "Skeleton Skull", icon: "", cost: 250, desc: "Bone white archer skull with hollow dark eyes." },
    { id: "zombie", name: "Zombie", icon: "", cost: 200, desc: "Infected undead Steve with necrotic green skin." },
    { id: "diamond_knight", name: "Diamond Helmet", icon: "", cost: 400, desc: "Gleaming enchanted diamond helmet warrior." }
];

export const RANDOM_USERNAMES = [
    "MaceMaster", "WindStriker", "AerialAce", "SlamLord",
    "SkyCrusher", "BreezeDasher", "VortexKnight", "ImpactKing",
    "GravityDiver", "IronHammer", "SpearPhalanx", "ZenithSlammer",
    "HyperMace", "NimbusRider", "AeroDominator", "ApexBreaker",
    "DiamondSlicer", "RobloxianPro", "NetherChampion", "EnderAce"
];

export class AuthManager {
    constructor() {
        this.user = this.loadUser();
        this.listeners = [];
        this.initGoogleClient();
    }

    loadUser() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                // Schema backfills
                if (parsed.gold === undefined) parsed.gold = 500;
                if (!parsed.equippedWeapon) parsed.equippedWeapon = "mace";
                if (!parsed.unlockedWeapons) parsed.unlockedWeapons = ["mace", "spear"];
                if (!parsed.weaponUpgrades) parsed.weaponUpgrades = {};
                if (!parsed.skinId) parsed.skinId = "steve";
                if (!parsed.unlockedSkins) parsed.unlockedSkins = ["steve", "alex"];
                if (parsed.arenaRP === undefined) parsed.arenaRP = 250;
                return parsed;
            }
        } catch (e) {
            console.error("Failed to load user profile:", e);
        }

        // Default User
        return {
            id: "guest_" + Math.random().toString(36).substring(2, 8),
            username: "Steve",
            email: null,
            avatarType: "preset",
            avatarVal: "steve",
            avatarUrl: null,
            authProvider: "guest", // "guest" | "google"
            level: 1,
            xp: 0,
            gold: 500, // 500 starter gold
            equippedWeapon: "mace",
            unlockedWeapons: ["mace", "spear"],
            weaponUpgrades: {},
            skinId: "steve",
            unlockedSkins: ["steve", "alex"],
            arenaRP: 250,
            stats: {
                matches: 0,
                wins: 0,
                losses: 0,
                slamsLanded: 0,
                dashesLanded: 0,
                maxSlamDamage: 0,
                currentStreak: 0,
                bestStreak: 0
            }
        };
    }

    saveUser() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.user));
            this.notifyListeners();
        } catch (e) {
            console.error("Failed to save user profile:", e);
        }
    }

    onUserChanged(callback) {
        this.listeners.push(callback);
        callback(this.user);
    }

    notifyListeners() {
        for (const cb of this.listeners) {
            cb(this.user);
        }
    }

    getUser() {
        return this.user;
    }

    getUsername() {
        return this.user.username || "Steve";
    }

    setUsername(newUsername) {
        const trimmed = (newUsername || "").trim();
        if (trimmed.length < 2) {
            return { success: false, error: "Username must be at least 2 characters." };
        }
        if (trimmed.length > 16) {
            return { success: false, error: "Username must be 16 characters or less." };
        }
        if (!/^[a-zA-Z0-9_ ]+$/.test(trimmed)) {
            return { success: false, error: "Username can only contain letters, numbers, spaces, and underscores." };
        }

        this.user.username = trimmed;
        this.saveUser();
        return { success: true, username: trimmed };
    }

    setAvatar(type, val, url = null) {
        this.user.avatarType = type;
        this.user.avatarVal = val;
        this.user.avatarUrl = url;
        this.saveUser();
    }

    getRandomUsername() {
        const base = RANDOM_USERNAMES[Math.floor(Math.random() * RANDOM_USERNAMES.length)];
        const num = Math.floor(Math.random() * 90 + 10);
        return `${base}_${num}`;
    }

    // ==========================================
    // ECONOMY & WEAPONS & SKINS
    // ==========================================

    addGold(amount) {
        this.user.gold = (this.user.gold || 0) + amount;
        this.saveUser();
    }

    spendGold(amount) {
        if ((this.user.gold || 0) >= amount) {
            this.user.gold -= amount;
            this.saveUser();
            return true;
        }
        return false;
    }

    unlockWeapon(weaponId, cost) {
        if (!this.user.unlockedWeapons.includes(weaponId)) {
            if (this.spendGold(cost)) {
                this.user.unlockedWeapons.push(weaponId);
                this.user.equippedWeapon = weaponId;
                this.saveUser();
                return { success: true };
            }
            return { success: false, error: "Not enough gold!" };
        }
        return { success: false, error: "Weapon already unlocked." };
    }

    equipWeapon(weaponId) {
        if (this.user.unlockedWeapons.includes(weaponId)) {
            this.user.equippedWeapon = weaponId;
            this.saveUser();
            return true;
        }
        return false;
    }

    upgradeWeapon(upgradeId, cost, maxLevel = 5) {
        const curLvl = this.user.weaponUpgrades[upgradeId] || 0;
        if (curLvl >= maxLevel) {
            return { success: false, error: "Already at maximum upgrade tier!" };
        }
        if (this.spendGold(cost)) {
            this.user.weaponUpgrades[upgradeId] = curLvl + 1;
            this.saveUser();
            return { success: true, newLevel: curLvl + 1 };
        }
        return { success: false, error: "Not enough gold!" };
    }

    unlockSkin(skinId, cost) {
        if (!this.user.unlockedSkins.includes(skinId)) {
            if (this.spendGold(cost)) {
                this.user.unlockedSkins.push(skinId);
                this.user.skinId = skinId;
                this.saveUser();
                return { success: true };
            }
            return { success: false, error: "Not enough gold!" };
        }
        return { success: false, error: "Skin already unlocked." };
    }

    equipSkin(skinId) {
        if (this.user.unlockedSkins.includes(skinId)) {
            this.user.skinId = skinId;
            this.saveUser();
            return true;
        }
        return false;
    }

    // ==========================================
    // GOOGLE IDENTITY SERVICES
    // ==========================================

    initGoogleClient() {
        if (typeof window !== "undefined" && window.google && window.google.accounts) {
            try {
                const clientId = window.GOOGLE_CLIENT_ID || null;
                if (clientId) {
                    window.google.accounts.id.initialize({
                        client_id: clientId,
                        callback: (response) => this.handleGoogleCredentialResponse(response)
                    });
                }
            } catch (e) {
                console.warn("Google Identity Services initialization warning:", e);
            }
        }
    }

    parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    handleGoogleCredentialResponse(response) {
        if (!response || !response.credential) return;
        const payload = this.parseJwt(response.credential);
        if (!payload) return;

        this.signInWithGoogleData({
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.given_name || "Google Player",
            picture: payload.picture
        });
    }

    signInWithGoogleData({ id, email, name, picture }) {
        this.user.id = `g_${id}`;
        this.user.email = email;
        this.user.authProvider = "google";
        
        if (!this.user.username || this.user.username === "Player" || this.user.username === "Steve") {
            const suggested = (name || "Player").replace(/[^a-zA-Z0-9_]/g, "").substring(0, 14);
            this.user.username = suggested || "GooglePlayer";
        }

        // Always keep Steve's head as avatar
        this.user.avatarType = "preset";
        this.user.avatarVal = "steve";
        this.user.avatarUrl = null;

        this.saveUser();
        return this.user;
    }

    signOut() {
        this.user.email = null;
        this.user.authProvider = "guest";
        this.user.avatarType = "preset";
        this.user.avatarVal = "steve";
        this.user.avatarUrl = null;
        this.saveUser();
    }

    // ==========================================
    // PROGRESSION & COMBAT RESULTS
    // ==========================================

    recordMatchResult(isWin, mode = "normal", matchStats = null) {
        const s = this.user.stats;
        s.matches++;

        let goldEarned = 0;
        let xpEarned = 0;

        if (isWin) {
            s.wins++;
            s.currentStreak++;
            if (s.currentStreak > s.bestStreak) {
                s.bestStreak = s.currentStreak;
            }

            // Defeating bots creates gold & XP scaled by difficulty!
            if (mode === "god") {
                goldEarned = 350;
                xpEarned = 300;
            } else if (mode === "pro") {
                goldEarned = 180;
                xpEarned = 160;
            } else if (mode === "normal") {
                goldEarned = 100;
                xpEarned = 90;
            } else if (mode === "easy") {
                goldEarned = 50;
                xpEarned = 50;
            } else {
                goldEarned = 25; // practice
                xpEarned = 25;
            }
        } else {
            s.losses++;
            s.currentStreak = 0;
            goldEarned = 20; // consolation
            xpEarned = 35;
        }

        if (matchStats) {
            s.slamsLanded += (matchStats.slamsLanded || 0);
            s.dashesLanded += (matchStats.dashesLanded || 0);
            if (matchStats.maxSlamDamage > s.maxSlamDamage) {
                s.maxSlamDamage = matchStats.maxSlamDamage;
            }
        }

        this.addGold(goldEarned);
        this.addXP(xpEarned);
        this.saveUser();

        return { isWin, goldEarned, xpEarned };
    }

    // Ranked Arena Match Outcome
    recordArenaMatchResult(isWin, matchType = "1v1") {
        const s = this.user.stats;
        s.matches++;

        let rpDelta = 0;
        let goldEarned = 0;
        let xpEarned = 0;

        if (isWin) {
            s.wins++;
            s.currentStreak++;
            if (s.currentStreak > s.bestStreak) {
                s.bestStreak = s.currentStreak;
            }

            rpDelta = matchType === "5v5" ? 45 : (matchType === "2v2" ? 35 : 30);
            goldEarned = matchType === "5v5" ? 280 : (matchType === "2v2" ? 200 : 160);
            xpEarned = 150;

            this.user.arenaRP = (this.user.arenaRP || 250) + rpDelta;
        } else {
            s.losses++;
            s.currentStreak = 0;
            rpDelta = -12;
            goldEarned = 40;
            xpEarned = 50;

            this.user.arenaRP = Math.max(0, (this.user.arenaRP || 250) + rpDelta);
        }

        this.addGold(goldEarned);
        this.addXP(xpEarned);
        this.saveUser();

        return { isWin, rpDelta, goldEarned, xpEarned, newRP: this.user.arenaRP };
    }

    addXP(amount) {
        this.user.xp += amount;
        // Level progression: each level requires 200 XP
        const nextLevel = Math.floor(this.user.xp / 200) + 1;
        if (nextLevel > this.user.level) {
            const levelGained = nextLevel - this.user.level;
            this.user.level = nextLevel;
            // Level progression generates Gold! (200 Gold per level)
            const bonusGold = levelGained * 200;
            this.user.gold = (this.user.gold || 0) + bonusGold;
        }
    }

    getRankTitle() {
        const wins = this.user.stats.wins;
        if (wins >= 50) return "Grand Mace Master";
        if (wins >= 25) return "Sky Champion";
        if (wins >= 10) return "Aerial Duelist";
        if (wins >= 3) return "Arena Fighter";
        return "Novice Recruit";
    }
}

export const auth = new AuthManager();
