// ==========================================
// SPEAR-MACE PVP - Weapons & Enchantments Engine
// Minecraft-themed arsenal: Mace, Spear, Sword, Fists, and Bow
// ==========================================

export const WEAPON_TYPES = {
    mace: {
        id: "mace",
        name: "Minecraft Mace",
        icon: "",
        category: "Heavy Impact",
        desc: "Signature weapon. Height-scaled slam damage with orbital launches and ground shockwaves.",
        baseCost: 0, // Default starter weapon
        unlockedByDefault: true,
        stats: {
            damage: 20,
            dashSpeed: 14,   // deliberate, slower heavy mace dash (was 20)
            dashDistance: 6, // frames
            dashDamage: 20,
            slamSpeed: 16,   // slower, weightier mace smash descent (was 24)
            slamPower: 1.0,  // height scale multiplier
            slamMaxDmg: 150,
            hitLaunch: -12,
            attackCooldown: 40,
            range: 30
        },
        upgrades: [
            {
                id: "density",
                name: "Density V",
                desc: "Increases slam damage multiplier from greater heights.",
                maxLevel: 5,
                costPerLevel: 300,
                apply: (stats, lvl) => { stats.slamPower += lvl * 0.15; stats.slamMaxDmg += lvl * 15; }
            },
            {
                id: "wind_burst",
                name: "Wind Burst III",
                desc: "Launches you significantly higher into the air after landing a hit.",
                maxLevel: 3,
                costPerLevel: 400,
                apply: (stats, lvl) => { stats.hitLaunch -= lvl * 1.8; }
            },
            {
                id: "breach",
                name: "Breach IV",
                desc: "Ignores a portion of opponent damage reduction and armor.",
                maxLevel: 4,
                costPerLevel: 360,
                apply: (stats, lvl) => { stats.breachArmor = lvl * 0.1; }
            }
        ]
    },

    spear: {
        id: "spear",
        name: "Wind Spear",
        icon: "",
        category: "Wind Charge",
        desc: "Super-fast wind dashes on ground and air. Pierces through incoming attacks.",
        baseCost: 400,
        unlockedByDefault: true,
        stats: {
            damage: 20,
            dashSpeed: 24,
            dashDistance: 8,
            dashDamage: 22,
            slamPower: 0.8,
            slamMaxDmg: 110,
            hitLaunch: -10,
            attackCooldown: 35,
            range: 35
        },
        upgrades: [
            {
                id: "impaling",
                name: "Impaling V",
                desc: "Increases spear dash strike damage.",
                maxLevel: 5,
                costPerLevel: 280,
                apply: (stats, lvl) => { stats.dashDamage += lvl * 4; }
            },
            {
                id: "piercing",
                name: "Piercing IV",
                desc: "Increases dash velocity and distance.",
                maxLevel: 4,
                costPerLevel: 350,
                apply: (stats, lvl) => { stats.dashSpeed += lvl * 2; stats.dashDistance += lvl * 1; }
            },
            {
                id: "feather_light",
                name: "Breeze Agility",
                desc: "Reduces dash cooldown time.",
                maxLevel: 3,
                costPerLevel: 440,
                apply: (stats, lvl) => { stats.attackCooldown -= lvl * 5; }
            }
        ]
    },

    sword: {
        id: "sword",
        name: "Diamond Sword",
        icon: "",
        category: "Blade Slice",
        desc: "Shorter, precision dash slice that deals massive swift slash damage.",
        baseCost: 700,
        unlockedByDefault: false,
        stats: {
            damage: 32,
            dashSpeed: 16,
            dashDistance: 4, // shorter dash
            dashDamage: 38, // higher damage!
            slamPower: 0.85,
            slamMaxDmg: 120,
            hitLaunch: -9,
            attackCooldown: 28, // faster recovery
            range: 28
        },
        upgrades: [
            {
                id: "sharpness",
                name: "Sharpness V",
                desc: "Significantly enhances blade slice damage.",
                maxLevel: 5,
                costPerLevel: 360,
                apply: (stats, lvl) => { stats.dashDamage += lvl * 6; stats.damage += lvl * 5; }
            },
            {
                id: "knockback",
                name: "Knockback II",
                desc: "Sends enemies flying further across the arena.",
                maxLevel: 3,
                costPerLevel: 320,
                apply: (stats, lvl) => { stats.knockbackMult = 1.0 + lvl * 0.35; }
            },
            {
                id: "sweeping_edge",
                name: "Sweeping Edge III",
                desc: "Widens the horizontal hit area of your blade slice.",
                maxLevel: 3,
                costPerLevel: 420,
                apply: (stats, lvl) => { stats.range += lvl * 8; }
            }
        ]
    },

    fists: {
        id: "fists",
        name: "Steve Bare Fists",
        icon: "",
        category: "Martial Brawl",
        desc: "Pure close-quarters Steve punches! Does brutal damage in hand-to-hand combat.",
        baseCost: 300,
        unlockedByDefault: false,
        stats: {
            damage: 42,
            dashSpeed: 14,
            dashDistance: 3, // quick lunge
            dashDamage: 45, // brutal fist strike!
            slamPower: 0.7,
            slamMaxDmg: 100,
            hitLaunch: -11,
            attackCooldown: 22, // ultra fast combo rate
            range: 22
        },
        upgrades: [
            {
                id: "strength",
                name: "Strength II",
                desc: "Potion of Strength power! Heavily boosts fist impact damage.",
                maxLevel: 5,
                costPerLevel: 320,
                apply: (stats, lvl) => { stats.dashDamage += lvl * 7; stats.damage += lvl * 6; }
            },
            {
                id: "haste",
                name: "Haste Beacon",
                desc: "Reduces attack cooldown for rapid-fire punch barrages.",
                maxLevel: 4,
                costPerLevel: 360,
                apply: (stats, lvl) => { stats.attackCooldown -= lvl * 3; }
            },
            {
                id: "iron_grip",
                name: "Heavy Fist Impact",
                desc: "Increases stun duration dealt to struck opponents.",
                maxLevel: 3,
                costPerLevel: 400,
                apply: (stats, lvl) => { stats.stunBonus = lvl * 8; }
            }
        ]
    },

    bow: {
        id: "bow",
        name: "Enchanted Bow",
        icon: "",
        category: "Ranged Marksman",
        desc: "Fires deadly arrows from afar. Dash key shoots arrows with a reload cooldown.",
        baseCost: 1000,
        unlockedByDefault: false,
        stats: {
            damage: 18,
            dashSpeed: 12,
            dashDistance: 3,
            dashDamage: 15,
            arrowDamage: 30,
            arrowSpeed: 16,
            reloadTime: 45, // frames between shots (0.75s)
            slamPower: 0.7,
            slamMaxDmg: 95,
            hitLaunch: -8,
            attackCooldown: 40,
            range: 25
        },
        upgrades: [
            {
                id: "power",
                name: "Power V",
                desc: "Greatly increases arrow projectile damage.",
                maxLevel: 5,
                costPerLevel: 400,
                apply: (stats, lvl) => { stats.arrowDamage += lvl * 7; }
            },
            {
                id: "infinity",
                name: "Infinity / Quick Charge",
                desc: "Dramatically reduces bow reload time between shots.",
                maxLevel: 4,
                costPerLevel: 440,
                apply: (stats, lvl) => { stats.reloadTime = Math.max(18, stats.reloadTime - lvl * 7); }
            },
            {
                id: "punch",
                name: "Punch II",
                desc: "Adds strong knockback to arrows.",
                maxLevel: 3,
                costPerLevel: 360,
                apply: (stats, lvl) => { stats.arrowKnockback = 1.0 + lvl * 0.4; }
            }
        ]
    }
};

/**
 * Computes effective weapon stats taking into account user upgrade levels
 */
export function getComputedWeaponStats(weaponId, upgradeLevels = {}) {
    const base = WEAPON_TYPES[weaponId] || WEAPON_TYPES.mace;
    const computed = { ...base.stats };

    if (base.upgrades && Array.isArray(base.upgrades)) {
        base.upgrades.forEach(upg => {
            const currentLvl = upgradeLevels[upg.id] || 0;
            if (currentLvl > 0 && upg.apply) {
                upg.apply(computed, currentLvl);
            }
        });
    }

    return computed;
}

/**
 * Arrow projectile manager
 */
export class ArrowManager {
    constructor() {
        this.arrows = [];
    }

    reset() {
        this.arrows = [];
    }

    spawnArrow(x, y, facing, ownerId, ownerTeam, damage = 30, speed = 16, knockbackMult = 1.0) {
        this.arrows.push({
            x,
            y,
            vx: facing * speed,
            vy: -1.2, // slight upward arc
            gravity: 0.15,
            facing,
            ownerId,
            ownerTeam,
            damage,
            knockbackMult,
            life: 180,
            stuck: false
        });
    }

    update(platforms, fighters, onHitCallback = null) {
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const a = this.arrows[i];

            if (a.stuck) {
                a.life--;
                if (a.life <= 0) {
                    this.arrows.splice(i, 1);
                }
                continue;
            }

            a.x += a.vx;
            a.y += a.vy;
            a.vy += a.gravity;
            a.life--;

            // Platform collision (arrows stick into ground)
            for (const p of platforms) {
                if (
                    a.x >= p.x && a.x <= p.x + p.w &&
                    a.y >= p.y && a.y <= p.y + p.h
                ) {
                    a.stuck = true;
                    a.vx = 0;
                    a.vy = 0;
                    a.life = 60; // disappear in 1s
                    break;
                }
            }

            if (a.stuck) continue;

            // Fighter collision
            for (const f of fighters) {
                if (f.hp <= 0) continue;
                if (f.id === a.ownerId) continue; // don't shoot yourself
                if (a.ownerTeam && f.team === a.ownerTeam) continue; // friendly fire disabled in team matches

                if (
                    a.x >= f.x && a.x <= f.x + f.w &&
                    a.y >= f.y && a.y <= f.y + f.h &&
                    f.hitCooldown <= 0
                ) {
                    // Hit fighter!
                    f.hp -= a.damage;
                    f.stats.damageTaken += a.damage;
                    f.hitCooldown = 20;
                    f.stun = 25;
                    f.xVel = a.facing * 7 * (a.knockbackMult || 1.0);
                    f.yVel = -5;

                    const shooter = fighters.find(fl => fl.id === a.ownerId);
                    if (shooter) f.lastHitBy = shooter;
                    if (shooter) {
                        shooter.stats.arrowsHit++;
                        shooter.stats.damageDealt += a.damage;
                    }

                    if (onHitCallback) {
                        onHitCallback(f, a, a.damage);
                    }

                    this.arrows.splice(i, 1);
                    break;
                }
            }

            // Boundary removal
            if (a.y > 450 || a.x < -50 || a.x > 850 || a.life <= 0) {
                this.arrows.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        for (const a of this.arrows) {
            ctx.save();
            ctx.translate(a.x, a.y);
            const angle = Math.atan2(a.vy, a.vx);
            ctx.rotate(angle);

            // Arrow shaft
            ctx.fillStyle = "#8d6e63";
            ctx.fillRect(-12, -1.5, 20, 3);

            // Feathers (fletching)
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-14, -3.5, 5, 7);

            // Arrowhead (flint / iron tip)
            ctx.fillStyle = "#78909c";
            ctx.beginPath();
            ctx.moveTo(8, -4);
            ctx.lineTo(16, 0);
            ctx.lineTo(8, 4);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
        ctx.restore();
    }
}
