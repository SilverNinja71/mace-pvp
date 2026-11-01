// ==========================================
// SPEAR-MACE: SKY ARENA - tuning numbers
// Units are metres and seconds. Physics runs at a fixed 120 steps a second.
// ==========================================

export const SIM_HZ = 120;
export const SIM_DT = 1 / SIM_HZ;

export const PHYS = {
    gravity: -28,
    maxFall: -60,
    walkSpeed: 8.2,
    groundAccel: 70,
    groundFriction: 14,     // how fast you slow down with no keys held (per second)
    airAccel: 26,
    airDrag: 0.6,
    jumpVel: 10.2,
    windJumpVel: 12.2,      // the second jump is a wind burst
    coyoteTime: 0.12,
    jumpBuffer: 0.12,
    radius: 0.42,
    height: 1.8,
    stepUp: 0.55,           // ledges this low are walked up without jumping
    glideFall: -3.2,        // hold Space while falling (no jumps left) to glide
    glideSpeed: 11,
    voidY: -34              // falling below this is a void knockout
};

export const SPEAR = {
    speed: 34,              // dash speed along the look direction
    time: 0.22,             // dash length in seconds (about 7.5 m)
    cooldown: 0.85,
    airCharges: 1,          // dashes allowed before touching the ground again
    damage: 18,
    critMult: 1.6,          // landing the hit at full extension (the last third of the dash)
    critWindow: 0.34,       // fraction of the dash, counted from the end, that crits
    hitRadius: 1.15,
    knockback: 12,
    knockUp: 6
};

export const MACE = {
    slamSpeed: -44,         // instant downward speed when a slam starts
    minFall: 1.5,           // below this height a slam does only the minimum damage
    minDamage: 10,
    perMetre: 5.2,          // extra damage for every metre fallen
    maxDamage: 150,
    directRadius: 1.3,      // landing on someone
    shockRadius: 5.5,       // the ground shockwave
    shockMult: 0.55,        // shockwave damage compared with a direct hit (falls off with distance)
    bounceVel: 15,          // a landed hit bounces you back up and resets your fall height
    swingDamage: 12,        // right click on the ground: a short heavy swing
    swingRange: 2.3,
    swingCooldown: 0.65,
    knockback: 9,
    knockUp: 9
};

export const PARRY = {
    window: 0.14,           // the guard is up this long
    cooldown: 0.75,
    attackerStun: 0.4,
    bounce: 11,
    safeTime: 0.2
};

export const HIT = {
    stun: 0.32,
    invuln: 0.25,           // after being hit you can't be hit again straight away
    hitstopPer: 0.0012,     // freeze frames on heavy hits: seconds per point of damage
    hitstopMax: 0.09,
    koCreditTime: 6         // a void fall counts as a KO for whoever hit you in the last 6 s
};

export const MATCH = {
    duelKOs: 3,
    brawlKOs: 7,
    timeLimit: 180,
    respawnTime: 2.4,
    maxHp: 100
};

// The eight classes from the 2D game, reworked for 3D. Times are in seconds.
export const CLASSES = {
    normal: {
        name: "Normal", color: "#9fb6c8", bonusHp: 10,
        desc: "No special ability. Balanced and reliable: a little extra health."
    },
    shadow: {
        name: "Shadow", color: "#6c5ce7",
        desc: "Every 16 s you vanish for 5 s: enemies can barely see you, you move 25% faster and hit 1.2x harder.",
        visibleTime: 16, invisTime: 5, speedMult: 1.25, damageMult: 1.2
    },
    lightning: {
        name: "Lightning", color: "#ffd84a",
        desc: "Mace slams stun longer, and every slam has a 25% chance to call down a bolt for +20 damage.",
        stunBonus: 0.35, boltChance: 0.25, boltDamage: 20
    },
    energy: {
        name: "Energy", color: "#3df5ff",
        desc: "Two spear dashes in the air, a shorter dash cooldown and 1.05x dash damage.",
        airCharges: 2, cooldown: 0.7, dashMult: 1.05
    },
    potion: {
        name: "Potionmaster", color: "#5ce65c",
        desc: "Hits: 35% chance to slow (3 s), 30% to poison (4 s, 2.2 damage a second), 8% to blind (2 s).",
        slowChance: 0.35, slowTime: 3, poisonChance: 0.3, poisonTime: 4, poisonDps: 2.2, blindChance: 0.08, blindTime: 2
    },
    pyro: {
        name: "Pyro", color: "#ff7a2f",
        desc: "Hits have a 24% chance to set enemies on fire for 5 s: 2.5 damage a second.",
        fireChance: 0.24, fireTime: 5, fireDps: 2.5
    },
    void: {
        name: "Void Walker", color: "#b05cff",
        desc: "Every 18-28 s you blink high above a random enemy, ready to slam.",
        minDelay: 18, maxDelay: 28, height: 8
    },
    buddha: {
        name: "Buddha", color: "#ffb347", bonusHp: 15,
        desc: "Press B to grow big or shrink back. Big: 1.3x damage and a higher single jump, but a body twice as big. +15 health.",
        bigScale: 1.8, damageMult: 1.3, jumpMult: 1.3
    }
};
export const CLASS_IDS = Object.keys(CLASSES);
export function classHp(id) { return MATCH.maxHp + ((CLASSES[id] && CLASSES[id].bonusHp) || 0); }

// Player level needed to use each class (bots can use any). Levels come every 200 XP.
export const CLASS_LEVEL = { normal: 1, energy: 1, lightning: 2, pyro: 3, potion: 4, shadow: 5, void: 6, buddha: 7 };

// Bot skill levels. react = seconds before a bot notices a change, aim = how well it leads
// a dash (0-1), dodge/parry = chances to react to an attack aimed at it, interval = least
// seconds between its attacks (the main difficulty knob).
export const BOT_LEVELS = {
    easy:   { name: "Easy",   react: 0.65, aim: 0.3,  dodge: 0.1,  parry: 0.0,  climb: 0.04, aggression: 0.35, speed: 0.74, damage: 0.7,  slamLead: 0.0,  interval: 2.6 },
    normal: { name: "Normal", react: 0.35, aim: 0.6,  dodge: 0.3,  parry: 0.1,  climb: 0.3,  aggression: 0.6,  speed: 0.9,  damage: 0.95, slamLead: 0.5,  interval: 1.3 },
    pro:    { name: "Pro",    react: 0.2,  aim: 0.85, dodge: 0.6,  parry: 0.3,  climb: 0.75, aggression: 0.85, speed: 1.0,  damage: 1.15, slamLead: 0.85, interval: 0.7 },
    god:    { name: "God",    react: 0.12, aim: 0.97, dodge: 0.8,  parry: 0.5,  climb: 0.9,  aggression: 1.0,  speed: 1.06, damage: 1.3,  slamLead: 1.0,  interval: 0.35 }
};

export const BOT_NAMES = [
    "GaleDasher", "VoidKnight", "SlamLord", "SkyCrusher", "NimbusRider", "IronHammer",
    "ZenithSlammer", "AeroAce", "ApexBreaker", "CloudVault", "StormPike", "GravityDiver"
];

export const TEAM_COLORS = ["#4aa3ff", "#ff5a4a", "#5ce65c", "#ffcf3a"];
