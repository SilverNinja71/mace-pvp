// ==========================================
// SPEAR-MACE PVP - Canvas Renderer
// Supports Minecraft weapons (Mace, Spear, Sword, Fists, Bow),
// Block Face skins (Steve, Alex, Roblox Noob, Roblox Man Face, etc.),
// and multi-fighter 1v1, 2v2, 5v5 team arena matches
// ==========================================

import { ARENA_CONFIG, PLATFORMS_CONFIG } from './config.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = ARENA_CONFIG.width;
        this.height = ARENA_CONFIG.height;
        this.dpr = window.devicePixelRatio || 1;

        this.graphicStyle = "enhanced"; // "enhanced" or "classic"
        this.frameCount = 0;

        // Clouds for background ambiance
        this.clouds = [
            { x: 50,  y: 60,  w: 90,  speed: 0.25 },
            { x: 320, y: 110, w: 120, speed: 0.18 },
            { x: 620, y: 70,  w: 80,  speed: 0.3 }
        ];

        this.setupDPI();
    }

    setupDPI() {
        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.scale(this.dpr, this.dpr);
    }

    setStyle(style) {
        this.graphicStyle = style;
    }

    drawBackground() {
        const ctx = this.ctx;
        this.frameCount++;

        if (this.graphicStyle === "classic") {
            ctx.fillStyle = "rgb(135, 206, 235)";
            ctx.fillRect(0, 0, this.width, this.height);
            return;
        }

        // Flat Minecraft sky (no gradient)
        ctx.fillStyle = "#79a6ff";
        ctx.fillRect(0, 0, this.width, this.height);

        // Blocky distant hills (stepped, flat colors)
        ctx.fillStyle = "#5f8f4f";
        const hills = [[0, 320], [80, 296], [160, 272], [240, 296], [320, 320], [400, 296], [480, 264], [560, 288], [640, 312], [720, 288]];
        for (const [hx, hy] of hills) {
            ctx.fillRect(hx, hy, 80, this.height - hy);
        }

        // Drifting blocky clouds
        ctx.fillStyle = "#ffffff";
        for (const cloud of this.clouds) {
            cloud.x += cloud.speed;
            if (cloud.x > this.width + 100) cloud.x = -150;

            const cx = Math.round(cloud.x / 8) * 8;
            const cy = Math.round(cloud.y / 8) * 8;
            ctx.fillRect(cx, cy, cloud.w, 16);
            ctx.fillRect(cx + 16, cy - 8, Math.round(cloud.w * 0.6 / 8) * 8, 8);
            ctx.fillStyle = "#dfe9ff";
            ctx.fillRect(cx, cy + 16, cloud.w, 4);
            ctx.fillStyle = "#ffffff";
        }
    }

    drawPlatforms() {
        const ctx = this.ctx;

        for (const p of PLATFORMS_CONFIG) {
            if (this.graphicStyle === "classic") {
                ctx.fillStyle = "rgb(70, 70, 70)";
                ctx.fillRect(p.x, p.y, p.w, p.h);
                continue;
            }

            // Stone block platform with pixel brick lines
            ctx.fillStyle = "#7d7d7d";
            ctx.fillRect(p.x, p.y, p.w, p.h);
            ctx.fillStyle = "#5f5f5f";
            for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                ctx.fillRect(bx, p.y, 2, p.h);
            }
            ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
            if (p.h > 12) ctx.fillRect(p.x, p.y + Math.floor(p.h / 2), p.w, 2);

            // Grass top (ground) or lighter stone cap (floating)
            ctx.fillStyle = p.y >= 380 ? "#5da83e" : "#a4a4a4";
            ctx.fillRect(p.x, p.y, p.w, 6);
            ctx.fillStyle = p.y >= 380 ? "#3f7d2a" : "#808080";
            for (let gx = p.x; gx < p.x + p.w; gx += 8) {
                ctx.fillRect(gx, p.y + 6, 4, 2);
            }
        }
    }

    // ==========================================
    // MINECRAFT WEAPONS RENDERING
    // ==========================================
    drawWeapons(f, alpha = 1.0) {
        const ctx = this.ctx;
        const centerX = f.x + f.w / 2;
        const centerY = f.y + f.h / 2;
        const weaponId = f.weaponId || "mace";

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(centerX, centerY);
        ctx.scale(f.facing, 1);

        if (weaponId === "mace") {
            if (f.slamming) {
                // Mace swing downwards
                ctx.rotate(Math.PI * 0.45);
                ctx.translate(14, 0);
                ctx.fillStyle = "#6d4c41";
                ctx.fillRect(-2, -18, 4, 22);
                ctx.fillStyle = "#455a64";
                ctx.fillRect(-7, -26, 14, 10);
                ctx.fillStyle = "#78909c";
                ctx.fillRect(-5, -24, 10, 6);
                ctx.fillStyle = "#ffb300";
                ctx.fillRect(-2, -22, 4, 3);
            } else {
                // Idle Mace on back
                ctx.rotate(-0.4);
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(-2, -14, 3, 16);
                ctx.fillStyle = "#455a64";
                ctx.fillRect(-6, -20, 10, 7);
            }
        } else if (weaponId === "spear") {
            if (f.dashing) {
                // Spear forward thrust
                ctx.translate(12, 0);
                ctx.fillStyle = "#8d6e63";
                ctx.fillRect(-10, -2, 24, 4);
                ctx.fillStyle = "#00e5ff";
                ctx.beginPath();
                ctx.moveTo(14, -5);
                ctx.lineTo(26, 0);
                ctx.lineTo(14, 5);
                ctx.closePath();
                ctx.fill();
                // Wind swirl
                ctx.fillStyle = "rgba(0, 229, 255, 0.4)";
                ctx.beginPath();
                ctx.arc(20, 0, 8, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Idle Spear upright
                ctx.rotate(-0.25);
                ctx.fillStyle = "#8d6e63";
                ctx.fillRect(0, -22, 3, 24);
                ctx.fillStyle = "#00e5ff";
                ctx.beginPath();
                ctx.moveTo(-1, -22);
                ctx.lineTo(1.5, -29);
                ctx.lineTo(4, -22);
                ctx.closePath();
                ctx.fill();
            }
        } else if (weaponId === "sword") {
            // DIAMOND SWORD
            if (f.dashing) {
                // Slash posture forward
                ctx.rotate(0.3);
                ctx.translate(10, 2);
                // Handle & Crossguard
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(-6, -2, 6, 4);
                ctx.fillStyle = "#2c3e50";
                ctx.fillRect(0, -6, 3, 12);
                // Diamond Blade
                ctx.fillStyle = "#00d2d3";
                ctx.fillRect(3, -3, 18, 6);
                ctx.fillStyle = "#54a0ff";
                ctx.fillRect(4, -1.5, 16, 3);
                // Tip
                ctx.fillStyle = "#00d2d3";
                ctx.beginPath();
                ctx.moveTo(21, -3);
                ctx.lineTo(26, 0);
                ctx.lineTo(21, 3);
                ctx.closePath();
                ctx.fill();
            } else {
                // Idle Sword at side
                ctx.rotate(-0.35);
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(4, -4, 4, 3);
                ctx.fillStyle = "#2c3e50";
                ctx.fillRect(2, -7, 8, 3);
                ctx.fillStyle = "#00d2d3";
                ctx.fillRect(4, -22, 4, 15);
            }
        } else if (weaponId === "fists") {
            // STEVE BARE FISTS
            if (f.dashing) {
                // Dual punching fists lunging forward
                ctx.fillStyle = "#d35400";
                ctx.fillRect(12, -7, 8, 6);
                ctx.fillStyle = "#e67e22";
                ctx.fillRect(16, 1, 8, 6);
            } else {
                // Raised boxer guard hands
                ctx.fillStyle = "#d35400";
                ctx.fillRect(6, -6, 5, 5);
                ctx.fillRect(8, 0, 5, 5);
            }
        } else if (weaponId === "bow") {
            // ENCHANTED BOW
            ctx.translate(10, 0);
            ctx.strokeStyle = "#8d6e63";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 10, -Math.PI * 0.45, Math.PI * 0.45);
            ctx.stroke();

            // Bowstring
            ctx.strokeStyle = "#ecf0f1";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(4, -9);
            ctx.lineTo(-2, 0); // drawn string
            ctx.lineTo(4, 9);
            ctx.stroke();

            // Nocked arrow
            ctx.fillStyle = "#78909c";
            ctx.fillRect(-2, -1.5, 14, 3);
        }

        ctx.restore();
    }

    // ==========================================
    // BLOCK FACE SKINS RENDERING
    // ==========================================
    drawSkin(f, alpha = 1.0) {
        const ctx = this.ctx;
        const skin = f.skinId || "steve";
        const facing = f.facing || 1;
        const x = f.x;
        const y = f.y;
        const w = f.w;
        const h = f.h;

        ctx.save();
        ctx.globalAlpha = alpha;

        if (skin === "alex") {
            // Minecraft Alex: Orange hair, olive green shirt, brown pants
            ctx.fillStyle = "#e67e22"; // Orange Hair
            ctx.fillRect(x, y, w, 8);
            ctx.fillStyle = "#27ae60"; // Olive green tunic
            ctx.fillRect(x, y + 8, w, 10);
            ctx.fillStyle = "#795548"; // Pants
            ctx.fillRect(x, y + 18, w, 7);
            // Face
            ctx.fillStyle = "#f5cd79";
            ctx.fillRect(x + (facing > 0 ? 6 : 2), y + 4, 16, 8);
            // Green Eyes
            ctx.fillStyle = "#2ecc71";
            ctx.fillRect(x + (facing > 0 ? 15 : 4), y + 7, 4, 4);
        } else if (skin === "noob") {
            // Roblox Classic Noob: Yellow head, royal blue torso, lime green legs
            ctx.fillStyle = "#ffeb3b"; // Yellow head
            ctx.fillRect(x, y, w, 10);
            ctx.fillStyle = "#1976d2"; // Blue torso
            ctx.fillRect(x, y + 10, w, 8);
            ctx.fillStyle = "#4caf50"; // Green legs
            ctx.fillRect(x, y + 18, w, 7);
            // Cute Noob Face
            ctx.fillStyle = "#212121";
            const eyeX = facing > 0 ? x + 15 : x + 5;
            ctx.fillRect(eyeX, y + 4, 3, 3);
            ctx.fillRect(eyeX + (facing > 0 ? 4 : -4), y + 4, 3, 3);
            // Smile
            ctx.fillRect(x + (facing > 0 ? 14 : 4), y + 8, 6, 2);
        } else if (skin === "man_face") {
            // Roblox Iconic Man Face (The Smirk)
            ctx.fillStyle = "#ffeaa7"; // Skin
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = "#2d3436"; // Hair
            ctx.fillRect(x, y, w, 5);
            // Man Face Smirk & Eyes
            ctx.fillStyle = "#000000";
            const mfX = facing > 0 ? x + 10 : x + 2;
            // Smug raised eyebrow & sharp eye
            ctx.fillRect(mfX, y + 6, 5, 2);
            ctx.fillRect(mfX + 6, y + 5, 5, 2);
            ctx.fillRect(mfX + 1, y + 9, 3, 2);
            ctx.fillRect(mfX + 7, y + 8, 3, 2);
            // Iconic smirk line
            ctx.fillRect(mfX + 2, y + 15, 8, 2);
            ctx.fillRect(mfX + 8, y + 13, 3, 3);
            // Shirt trim
            ctx.fillStyle = "#e74c3c";
            ctx.fillRect(x, y + 19, w, 6);
        } else if (skin === "creeper") {
            // Creeper Face: Mottled green with black frown
            ctx.fillStyle = "#2ecc71";
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = "#27ae60";
            ctx.fillRect(x + 2, y + 2, 8, 8);
            ctx.fillRect(x + 14, y + 14, 8, 8);
            // Black Creeper Mouth
            ctx.fillStyle = "#000000";
            ctx.fillRect(x + 4, y + 6, 5, 5);  // Eye L
            ctx.fillRect(x + 16, y + 6, 5, 5); // Eye R
            ctx.fillRect(x + 9, y + 12, 7, 4); // Mouth top
            ctx.fillRect(x + 7, y + 16, 4, 7); // Mouth bottom L
            ctx.fillRect(x + 14, y + 16, 4, 7);// Mouth bottom R
        } else if (skin === "enderman") {
            // Enderman: Pitch black with purple glowing eyes
            ctx.fillStyle = "#1e1e1e";
            ctx.fillRect(x, y, w, h);
            // Glowing purple eyes
            ctx.fillStyle = "#a855f7";
            const eEyeX = facing > 0 ? x + 14 : x + 3;
            ctx.fillRect(eEyeX, y + 9, 7, 3);
            ctx.fillStyle = "#d8b4fe";
            ctx.fillRect(eEyeX + (facing > 0 ? 3 : 0), y + 9, 4, 3);
        } else if (skin === "skeleton") {
            // Skeleton: White bone with hollow gray eyes
            ctx.fillStyle = "#ecf0f1";
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = "#57606f";
            const sEyeX = facing > 0 ? x + 14 : x + 4;
            ctx.fillRect(sEyeX, y + 7, 5, 5);
            // Grin
            ctx.fillStyle = "#2f3542";
            ctx.fillRect(x + (facing > 0 ? 10 : 3), y + 17, 10, 2);
        } else if (skin === "zombie") {
            // Zombie: Necrotic green face with blue shirt
            ctx.fillStyle = "#55efc4";
            ctx.fillRect(x, y, w, 12);
            ctx.fillStyle = "#00cec9";
            ctx.fillRect(x, y + 12, w, 13);
            ctx.fillStyle = "#2d3436";
            ctx.fillRect(x, y, w, 4); // Hair
            // Hollow eyes
            ctx.fillStyle = "#2d3436";
            const zEyeX = facing > 0 ? x + 15 : x + 4;
            ctx.fillRect(zEyeX, y + 6, 4, 4);
        } else if (skin === "diamond_knight") {
            // Diamond Helmet Hero
            ctx.fillStyle = "#00d2d3";
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = "#54a0ff";
            ctx.fillRect(x + 2, y + 2, w - 4, 6);
            // Dark visor slit
            ctx.fillStyle = "#090d13";
            ctx.fillRect(x + (facing > 0 ? 10 : 2), y + 9, 13, 4);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(x + (facing > 0 ? 18 : 4), y + 10, 3, 2);
        } else {
            // Default: Minecraft Steve
            ctx.fillStyle = "#5d4037"; // Dark brown hair
            ctx.fillRect(x, y, w, 6);
            ctx.fillStyle = "#f5cd79"; // Skin
            ctx.fillRect(x, y + 6, w, 7);
            ctx.fillStyle = "#00d2d3"; // Cyan tee
            ctx.fillRect(x, y + 13, w, 7);
            ctx.fillStyle = "#2980b9"; // Blue pants
            ctx.fillRect(x, y + 20, w, 5);
            // Blue eyes
            ctx.fillStyle = "#2980b9";
            const stEyeX = facing > 0 ? x + 15 : x + 4;
            ctx.fillRect(stEyeX, y + 8, 4, 4);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(stEyeX + (facing > 0 ? 2 : 0), y + 8, 2, 2);
        }

        ctx.restore();
    }

    // ==========================================
    // DRAW FIGHTER (Single, 2v2, or 5v5)
    // ==========================================
    drawFighter(f, fallbackColor = [120, 40, 190], showOverheadBar = false) {
        if (f.hp <= 0) return;

        const ctx = this.ctx;
        const centerX = f.x + f.w / 2;
        const centerY = f.y + f.h / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(f.squashX || 1.0, f.squashY || 1.0);
        ctx.translate(-centerX, -centerY);

        if (this.graphicStyle === "classic") {
            ctx.fillStyle = f.isPlayer ? "rgb(0, 255, 0)" : `rgb(${fallbackColor[0]}, ${fallbackColor[1]}, ${fallbackColor[2]})`;
            ctx.fillRect(f.x, f.y, f.w, f.h);
            if (f.slamming) {
                ctx.strokeStyle = "rgb(255, 150, 0)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(centerX, centerY, 17.5, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
            return;
        }

        // Shadow on ground
        if (f.onGround) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
            ctx.beginPath();
            ctx.ellipse(centerX, f.y + f.h + 1, f.w * 0.6, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw weapon
        this.drawWeapons(f, 1.0);

        // Draw skin / block face
        this.drawSkin(f, 1.0);

        // Team glow border (Red vs Blue in arena)
        if (f.team) {
            ctx.strokeStyle = f.team === "red" ? "#ff4757" : "#1e90ff";
            ctx.lineWidth = 2;
            ctx.strokeRect(f.x - 1, f.y - 1, f.w + 2, f.h + 2);
        }

        // Slamming effect ring
        if (f.slamming) {
            ctx.strokeStyle = "rgb(255, 160, 0)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
            ctx.stroke();

            // Downward air trail
            ctx.fillStyle = "rgba(255, 180, 0, 0.4)";
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            ctx.lineTo(f.x + f.w, f.y);
            ctx.lineTo(f.x + f.w / 2, f.y - 18);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();

        // Overhead health bar & name for 2v2 and 5v5 matches
        if (showOverheadBar) {
            this.drawOverheadBar(f);
        }
    }

    drawOverheadBar(f) {
        const ctx = this.ctx;
        ctx.save();

        const barW = 34;
        const barH = 4;
        const barX = f.x + f.w / 2 - barW / 2;
        const barY = f.y - 12;

        // Background
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // HP fill
        const ratio = Math.max(0, f.hp / f.maxHp);
        ctx.fillStyle = f.team === "red" ? "#ff4757" : (f.team === "blue" ? "#3498db" : "#2ecc71");
        ctx.fillRect(barX, barY, barW * ratio, barH);

        // Name tag
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px 'Segoe UI', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(f.name || (f.team ? f.team.toUpperCase() : "P"), f.x + f.w / 2, barY - 2);

        ctx.restore();
    }

    // Off-screen indicator
    drawOffscreenIndicator(character, r, g, b, label = "") {
        if (character.y + character.h >= 0 || character.hp <= 0) return;

        const ctx = this.ctx;
        const cx = Math.max(12, Math.min(this.width - 12, character.x + character.w / 2));
        const heightAbove = -(character.y + character.h);
        const size = Math.max(6, Math.min(16, 16 - heightAbove / 40));

        ctx.save();
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(cx, 5);
        ctx.lineTo(cx - size / 2, 5 + size);
        ctx.lineTo(cx + size / 2, 5 + size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#000000";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`${Math.round(heightAbove)}px`, cx, 8 + size);

        ctx.restore();
    }

    // Standard 1v1 HUD
    drawHUD(player, bot, botColor, modeLabel, p1Label = "YOU", p2Label = "BOT") {
        const ctx = this.ctx;
        ctx.save();

        const barW = 160;
        const barH = 18;

        // Player 1 HP
        ctx.fillStyle = "rgba(30, 30, 30, 0.85)";
        ctx.fillRect(20, 18, barW, barH);

        const p1GhostRatio = Math.max(0, player.ghostHp / player.maxHp);
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(20, 18, barW * p1GhostRatio, barH);

        const p1Ratio = Math.max(0, player.hp / player.maxHp);
        ctx.fillStyle = "#2ecc71";
        ctx.fillRect(20, 18, barW * p1Ratio, barH);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 18, barW, barH);

        // Player 1 Dash / Bow cooldown meter
        const p1CooldownMax = player.weaponId === "bow" ? (player.weaponStats.reloadTime || 45) : 40;
        const curCooldown = player.weaponId === "bow" ? player.arrowCooldown : player.dashCooldown;
        const p1DashRatio = curCooldown > 0 ? (1 - curCooldown / p1CooldownMax) : 1;
        ctx.fillStyle = curCooldown <= 0 ? "#00d2d3" : "#576574";
        ctx.fillRect(20, 38, barW * p1DashRatio, 4);

        ctx.fillStyle = "#000000";
        ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`${p1Label}: ${Math.max(0, player.hp).toFixed(1)}`, 24, 27);

        // Bot / Player 2 HP
        const bX = this.width - 20 - barW;
        ctx.fillStyle = "rgba(30, 30, 30, 0.85)";
        ctx.fillRect(bX, 18, barW, barH);

        const bGhostRatio = Math.max(0, bot.ghostHp / bot.maxHp);
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(bX, 18, barW * bGhostRatio, barH);

        const bRatio = Math.max(0, bot.hp / bot.maxHp);
        ctx.fillStyle = `rgb(${botColor[0]}, ${botColor[1]}, ${botColor[2]})`;
        ctx.fillRect(bX, 18, barW * bRatio, barH);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.strokeRect(bX, 18, barW, barH);

        const bDashRatio = bot.dashCooldown > 0 ? (1 - bot.dashCooldown / 40) : 1;
        ctx.fillStyle = bot.dashReady && bot.dashCooldown <= 0 ? "#00d2d3" : "#576574";
        ctx.fillRect(bX, 38, barW * bDashRatio, 4);

        ctx.fillStyle = (botColor[0] + botColor[1] + botColor[2] < 200) ? "#ffffff" : "#000000";
        ctx.fillText(`${p2Label}: ${Math.max(0, bot.hp).toFixed(1)}`, bX + 6, 27);

        // Mode Label (Centered top)
        ctx.fillStyle = "#1e272e";
        ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(modeLabel.toUpperCase() + " MODE", this.width / 2, 26);

        ctx.restore();
    }

    // Team Arena 2v2 and 5v5 HUD
    drawTeamArenaHUD(redTeam, blueTeam, matchType) {
        const ctx = this.ctx;
        ctx.save();

        const redAlive = redTeam.filter(f => f.hp > 0).length;
        const blueAlive = blueTeam.filter(f => f.hp > 0).length;

        // Red Banner (Left)
        ctx.fillStyle = "rgba(231, 76, 60, 0.85)";
        ctx.fillRect(20, 16, 140, 26);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 16, 140, 26);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`RED TEAM (${redAlive}/${redTeam.length})`, 90, 29);

        // Blue Banner (Right)
        ctx.fillStyle = "rgba(41, 128, 185, 0.85)";
        ctx.fillRect(this.width - 160, 16, 140, 26);
        ctx.strokeRect(this.width - 160, 16, 140, 26);
        ctx.fillStyle = "#fff";
        ctx.fillText(`BLUE TEAM (${blueAlive}/${blueTeam.length})`, this.width - 90, 29);

        // Center Match Type Badge
        ctx.fillStyle = "#1e272e";
        ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(`ARENA ${matchType.toUpperCase()}`, this.width / 2, 29);

        ctx.restore();
    }

    drawControlsHint(isPvP = false) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
        ctx.textAlign = "left";

        if (isPvP) {
            ctx.fillText("P1: WASD = MOVE/JUMP | SPACE = ATTACK/DASH/BOW | S = SLAM", 14, this.height - 18);
            ctx.textAlign = "right";
            ctx.fillText("P2: ARROWS = MOVE/JUMP | ENTER = ATTACK/DASH/BOW | DOWN = SLAM", this.width - 14, this.height - 18);
        } else {
            ctx.fillText("ARROWS / WASD = MOVE   •   UP = JUMP / DOUBLE JUMP", 14, this.height - 24);
            ctx.fillText("SPACE = WEAPON ATTACK / DASH / SHOOT BOW   •   DOWN / S = MACE SLAM", 14, this.height - 10);
            ctx.textAlign = "right";
            ctx.fillText("ESC = PAUSE  •  M = MUTE  •  R = RESTART  •  H = HOME", this.width - 14, this.height - 10);
        }

        ctx.restore();
    }

    drawGameOver(winnerName, statsP1, statsP2, rewardInfo = null) {
        const ctx = this.ctx;
        ctx.save();

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = "bold 38px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText(`${winnerName} WINS!`, this.width / 2, this.height / 2 - 45);

        // Reward information pill (Gold & XP & RP earned)
        if (rewardInfo) {
            ctx.font = "bold 15px 'Segoe UI', system-ui, sans-serif";
            ctx.fillStyle = "#f1c40f";
            let rewText = `+${rewardInfo.goldEarned} Gold   •   +${rewardInfo.xpEarned} XP`;
            if (rewardInfo.rpDelta) {
                const rpSign = rewardInfo.rpDelta > 0 ? `+${rewardInfo.rpDelta}` : `${rewardInfo.rpDelta}`;
                rewText += `   •   ${rpSign} RP`;
            }
            ctx.fillText(rewText, this.width / 2, this.height / 2 - 5);
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "15px 'Segoe UI', system-ui, sans-serif";
        ctx.fillText("Press R to restart match", this.width / 2, this.height / 2 + 35);
        ctx.font = "13px 'Segoe UI', system-ui, sans-serif";
        ctx.fillStyle = "#bdc3c7";
        ctx.fillText("Press H for home screen", this.width / 2, this.height / 2 + 60);

        ctx.restore();
    }
}
