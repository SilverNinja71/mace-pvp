// ==========================================
// SPEAR-MACE PVP - Game Configuration
// Faithful to the original Khan Academy ProcessingJS game
// ==========================================

// Google Sign-In: paste your OAuth Client ID here (looks like
// "1234567890-abc123.apps.googleusercontent.com"). Create one at
// https://console.cloud.google.com/apis/credentials with your site
// (e.g. https://silverninja71.github.io) as an Authorized JavaScript origin.
// Leave empty to hide Google sign-in.
export const GOOGLE_CLIENT_ID = "";

export const ARENA_CONFIG = {
    width: 800,
    height: 400,
    groundY: 390
};

export const CORE_PHYSICS = {
    gravity: 0.35,
    jumpPower: -8.5,
    coyoteTime: 12,
    groundY: 390,

    slamSpeed: 17,           // Weightier, deliberate downward slam (reduced from 24)
    dashSpeed: 15,           // Controlled, snappy dash (reduced from 24)
    dashTime: 6,
    dashCooldown: 15,        // Quick re-attack cooldown

    slamRadius: 40,
    slamGroundDamage: 25,
    slamAirDamage: 35,

    hitStun: 28,             // Snappy hitstun
    maxHp: 100,

    slamMinDamage: 25,
    slamMaxDamage: 160,
    slamHeightScale: 1,

    dashDamage: 25,          // damage dealt when a dash connects
    hitLaunch: -12,          // upward launch speed for attacker after hit
    runAwayTime: 40          // frames bot runs away after stun ends
};

export const PLATFORMS_CONFIG = [
    { x: 0,   y: 390, w: 800, h: 30, name: "Main Floor" },
    { x: 140, y: 275, w: 150, h: 12, name: "Left Ledge" },
    { x: 510, y: 275, w: 150, h: 12, name: "Right Ledge" }
];

// Bot difficulty settings (originally from the ProcessingJS source, rebalanced so each
// level is clearly harder than the last). damageMult = how hard the bot hits,
// damageTaken / stunMult = how much damage and stun the bot takes.
export const BOT_SETTINGS = {
    dashAttackChance:   { practice: 1,   easy: 8,   normal: 40,  pro: 70,  god: 70 },
    dashAttackRange:    { practice: 180, easy: 250, normal: 300, pro: 450, god: 450 },
    dashAttackHeight:   { practice: 40,  easy: 50,  normal: 60,  pro: 90,  god: 90 },
    randomDashChance:   { practice: 0.1, easy: 2,   normal: 3,   pro: 3,   god: 5 },
    escapeDashChance:   { practice: 10,  easy: 40,  normal: 40,  pro: 65,  god: 65 },
    runAwayChance:      { practice: 70,  easy: 50,  normal: 40,  pro: 15,  god: 15 },
    dodgeChance:        { practice: 8,   easy: 25,  normal: 65,  pro: 85,  god: 95 },
    dodgeRange:         { practice: 50,  easy: 50,  normal: 90,  pro: 140, god: 140 },
    slamChance:         { practice: 20,  easy: 90,  normal: 100, pro: 100, god: 100 },
    slamCooldown:       { practice: 220, easy: 100, normal: 40,  pro: 20,  god: 20 },
    slamRange:          { practice: 50,  easy: 70,  normal: 90,  pro: 120, god: 120 },
    slamLead:           { practice: 0,   easy: 0,   normal: 8,   pro: 14,  god: 14 },
    climbHeight:        { practice: 0,   easy: 0,   normal: 1,   pro: 1,   god: 1 },
    punishChance:       { practice: 0,   easy: 0,   normal: 20,  pro: 65,  god: 75 },
    dashDodgeChance:    { practice: 0,   easy: 0,   normal: 35,  pro: 60,  god: 75 },
    speed:              { practice: 1.5, easy: 2,   normal: 3,   pro: 4,   god: 4.5 },
    runSpeed:           { practice: 3,   easy: 4,   normal: 5.5, pro: 7.5, god: 8.5 },
    jumpChance:         { practice: 40,  easy: 80,  normal: 100, pro: 100, god: 100 },
    doubleJumpChance:   { practice: 20,  easy: 70,  normal: 100, pro: 100, god: 100 },
    damageMult:         { practice: 0.6, easy: 0.85,normal: 1.05,pro: 1.25,god: 1.4 },
    maxHP:              { practice: 1000,easy: 100, normal: 100, pro: 100, god: 100 },
    damageTaken:        { practice: 1,   easy: 1,   normal: 1,   pro: 0.85,god: 0.8 },
    stunMult:           { practice: 1,   easy: 1,   normal: 1,   pro: 0.6, god: 0.5 },
    botDashCooldown:    { practice: 40,  easy: 40,  normal: 40,  pro: 15,  god: 8 },
    dashAIDelay:        { practice: 80,  easy: 80,  normal: 80,  pro: 50,  god: 42 },
    dashSpeed:          { practice: 20,  easy: 20,  normal: 20,  pro: 24,  god: 26 },
    airDashRecharge:    { practice: 0,   easy: 0,   normal: 0,   pro: 0,   god: 1 },
    invisible:          { practice: 0,   easy: 0,   normal: 0,   pro: 0,   god: 1 },
    invisEvery:         { practice: 900, easy: 900, normal: 900, pro: 900, god: 720 },
    invisLength:        { practice: 300, easy: 300, normal: 300, pro: 300, god: 420 },
    regen:              { practice: 0,   easy: 0,   normal: 0,   pro: 0,   god: 0.05 }
};

export const MODE_METADATA = {
    practice: {
        id: "practice",
        name: "Practice Mode",
        hotkey: "T",
        sub: "1000 HP each, gentle bot",
        desc: "Safe sparring ring. Learn mace drop timing and air dashes with 10x health.",
        color: [40, 120, 130],
        rgb: "rgb(40, 120, 130)",
        difficultyLabel: "Gentle",
        badge: "TRAINING"
    },
    easy: {
        id: "easy",
        name: "Easy Mode",
        hotkey: "E",
        sub: "Relaxed bot, standard HP",
        desc: "Relaxed bot behavior. Good for practicing slam bounce chains.",
        color: [150, 0, 0],
        rgb: "rgb(150, 0, 0)",
        difficultyLabel: "Easy",
        badge: "NOVICE"
    },
    normal: {
        id: "normal",
        name: "Normal Mode",
        hotkey: "N",
        sub: "Full challenge, predictive bot",
        desc: "The standard experience. Bot leads slams, dodges, and punishes stun.",
        color: [120, 40, 190],
        rgb: "rgb(120, 40, 190)",
        difficultyLabel: "Standard",
        badge: "BALANCED"
    },
    pro: {
        id: "pro",
        name: "Pro Mode",
        hotkey: "P",
        sub: "Ruthless bot, double jump climbs",
        desc: "Fast, ruthless bot that climbs high for maximum slam velocity and dodges dashes.",
        color: [230, 180, 20],
        rgb: "rgb(230, 180, 20)",
        difficultyLabel: "Hard",
        badge: "VETERAN"
    },
    god: {
        id: "god",
        name: "God Mode",
        hotkey: "G",
        sub: "Near-black entity with invisibility & regen",
        desc: "Nightmare boss bot: stealth camouflage, instant air dash recharge, and health regen.",
        color: [35, 35, 35],
        rgb: "rgb(35, 35, 35)",
        difficultyLabel: "Boss",
        badge: "MYTHIC"
    },
    pvp: {
        id: "pvp",
        name: "Local 2-Player",
        hotkey: "2",
        sub: "Head-to-head duel on one keyboard",
        desc: "Player 1 uses WASD + Space (Dash) + S (Slam). Player 2 uses Arrows + Shift/Enter + Down.",
        color: [255, 90, 30],
        rgb: "rgb(255, 90, 30)",
        difficultyLabel: "Versus",
        badge: "PVP"
    },
    custom: {
        id: "custom",
        name: "Custom Sandbox",
        hotkey: "C",
        sub: "Tweak any of the 31 bot AI parameters",
        desc: "Full sandbox mode. Customize bot speed, slam multiplier, stealth, and regen to your liking.",
        color: [0, 180, 216],
        rgb: "rgb(0, 180, 216)",
        difficultyLabel: "Sandbox",
        badge: "CUSTOM"
    }
};

/**
 * Creates a bot parameter dictionary for a given mode.
 */
export function getBotParamsForMode(mode, customOverrides = null) {
    const params = {};
    const baseMode = (mode === "pvp" || mode === "custom") ? "normal" : mode;
    
    for (const key in BOT_SETTINGS) {
        params[key] = BOT_SETTINGS[key][baseMode] ?? BOT_SETTINGS[key].normal;
    }

    if (mode === "custom" && customOverrides) {
        Object.assign(params, customOverrides);
    }

    return params;
}
