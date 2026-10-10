// ==========================================
// SPEAR-MACE PVP - Canvas Renderer
// Supports Minecraft weapons (Mace, Spear, Sword, Fists, Bow),
// Block Face skins (Steve, Alex, Roblox Noob, Roblox Man Face, etc.),
// and multi-fighter 1v1, 2v2, 5v5 team arena matches
// ==========================================

import { ARENA_CONFIG, PLATFORMS_CONFIG, CLASSES, GAME_SPEED } from './config.js';
import { weaponIconURL } from './pixel.js';

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
        this.canvas.style.width = "100%";
        this.canvas.style.height = "auto";
        this.ctx.scale(this.dpr, this.dpr);
    }

    setBiome(biome) {
        this.biome = biome || "space";
    }

    drawBackground() {
        const ctx = this.ctx;
        this.frameCount++;
        const biome = this.biome || "space";

        if (biome === "space") {
            if (!this.spaceLayer) this.spaceLayer = this.buildSpaceLayer();
            ctx.drawImage(this.spaceLayer, 0, 0, this.width, this.height);

            // Twinkling stars
            for (let i = 0; i < 36; i++) {
                if ((Math.floor(this.frameCount / 18) + i * 7) % 6 === 0) continue;
                ctx.fillStyle = i % 5 === 0 ? "#ffffff" : (i % 2 ? "#9fb4ff" : "#cfe0ff");
                const sz = i % 7 === 0 ? 3 : 2;
                ctx.fillRect((i * 131 + 37) % this.width, (i * 71 + 13) % 330, sz, sz);
            }
            // Occasional shooting star
            const t = this.frameCount % 600;
            if (t < 40) {
                const sx = 120 + t * 9;
                const sy = 40 + t * 3;
                for (let k = 0; k < 6; k++) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 - k * 0.15})`;
                    ctx.fillRect(Math.round(sx - k * 9), Math.round(sy - k * 3), 4, 2);
                }
            }
        } else if (biome === "nether") {
            if (!this.netherLayer) this.netherLayer = this.buildNetherLayer();
            ctx.drawImage(this.netherLayer, 0, 0, this.width, this.height);

            // Lava surface shimmer (moving bright pixels)
            ctx.fillStyle = "#ffb43a";
            for (let i = 0; i < 24; i++) {
                const lx = (i * 37 + this.frameCount * (0.3 + (i % 3) * 0.15)) % this.width;
                ctx.fillRect(Math.round(lx), 352 + (i % 4) * 8, 6, 2);
            }
            // Rising embers
            for (let i = 0; i < 18; i++) {
                const ax = (i * 47 + Math.sin(this.frameCount * 0.02 + i) * 20 + this.width) % this.width;
                const ay = 380 - ((this.frameCount * (0.35 + (i % 4) * 0.1) + i * 53) % 380);
                ctx.fillStyle = i % 3 ? "#ff7b25" : "#ffd36b";
                ctx.fillRect(Math.round(ax), Math.round(ay), 2, 2);
            }
        } else if (biome === "end") {
            if (!this.endLayer) this.endLayer = this.buildEndLayer();
            ctx.drawImage(this.endLayer, 0, 0, this.width, this.height);

            // Twinkling stars
            for (let i = 0; i < 40; i++) {
                if ((Math.floor(this.frameCount / 20) + i) % 5 === 0) continue;
                ctx.fillStyle = i % 4 ? "#d8c8ff" : "#ffffff";
                ctx.fillRect((i * 97) % this.width, (i * 53) % 200, 2, 2);
            }
            // End crystals pulsing on the obsidian pillars
            const pulse = Math.sin(this.frameCount * 0.08) > 0;
            for (const [cx, cy] of [[112, 128], [345, 78], [628, 148]]) {
                ctx.fillStyle = pulse ? "#ff8cff" : "#c04ad8";
                ctx.fillRect(cx - 7, cy - 7, 14, 14);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(cx - 2, cy - 2, 4, 4);
            }
                } else {
            // Overworld: static layers are painted once and cached
            if (!this.overworldLayer) this.overworldLayer = this.buildOverworldLayer();
            ctx.drawImage(this.overworldLayer, 0, 0, this.width, this.height);

            // Drifting blocky clouds (two-tone, pixel-snapped)
            for (const cloud of this.clouds) {
                cloud.x += cloud.speed;
                if (cloud.x > this.width + 100) cloud.x = -150;

                const cx = Math.round(cloud.x / 8) * 8;
                const cy = Math.round(cloud.y / 8) * 8;
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(cx, cy, cloud.w, 16);
                ctx.fillRect(cx + 16, cy - 8, Math.round(cloud.w * 0.6 / 8) * 8, 8);
                ctx.fillStyle = "#dfe9ff";
                ctx.fillRect(cx, cy + 16, cloud.w, 6);
            }
        }
    }

    // Draws an isometric pixel cube from 8x8 face maps (top vertex at cx, ty; half = half-width)
    drawIsoCube(g, cx, ty, half, faces, palette, shades) {
        const k = 0.577 * half;
        const mats = {
            top: [half, -k, half, k, cx - half, ty + k],
            left: [half, k, 0, 2 * k, cx - half, ty + k],
            right: [half, -k, 0, 2 * k, cx, ty + 2 * k]
        };
        const shade = (hex, f) => {
            const n = parseInt(hex.slice(1), 16);
            const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
            return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
        };
        for (const side of ["left", "right", "top"]) {
            const grid = faces[side];
            g.save();
            g.transform(...mats[side]);
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    g.fillStyle = shade(palette[grid[r][c]], shades[side]);
                    g.fillRect(c / 8, r / 8, 1 / 8 + 0.004, 1 / 8 + 0.004);
                }
            }
            g.restore();
        }
        // bright front edges
        g.strokeStyle = "rgba(232, 254, 255, 0.85)";
        g.lineWidth = Math.max(1.5, half / 26);
        g.beginPath();
        g.moveTo(cx - half, ty + k);
        g.lineTo(cx, ty + 2 * k);
        g.lineTo(cx + half, ty + k);
        g.stroke();
    }

    // Space backdrop matching the logo: starfield, cube globe planet with atmosphere, cube moon
    buildSpaceLayer() {
        const c = document.createElement("canvas");
        c.width = this.width;
        c.height = this.height;
        const g = c.getContext("2d");
        const W = this.width;

        const bands = ["#060a1f", "#08102a", "#0b1535", "#0e1a42", "#121f4f", "#16255c"];
        const bandH = Math.ceil(this.height / bands.length);
        bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bandH, W, bandH + 1); });

        // Pixel nebula clouds
        const neb = [[40, 60, 120, 18, "#1d2a6a"], [70, 78, 80, 12, "#24327a"], [430, 300, 160, 16, "#1a2660"],
            [470, 316, 90, 10, "#22307a"], [250, 40, 90, 10, "#1a2660"]];
        for (const [x, y, w, h, col] of neb) { g.fillStyle = col; g.fillRect(x, y, w, h); }

        // Static stars
        for (let i = 0; i < 70; i++) {
            g.fillStyle = i % 3 === 0 ? "#6f86d6" : (i % 3 === 1 ? "#9fb4ff" : "#ffffff");
            g.fillRect((i * 97 + 11) % W, (i * 53 + 29) % 360, 1 + (i % 4 === 0 ? 1 : 0), 1 + (i % 4 === 0 ? 1 : 0));
        }

        // Atmosphere glow behind the planet
        const pcx = 610, pty = 74, half = 62;
        const glow = g.createRadialGradient(pcx, pty + 72, 10, pcx, pty + 72, 150);
        glow.addColorStop(0, "rgba(95, 208, 255, 0.45)");
        glow.addColorStop(0.5, "rgba(58, 157, 255, 0.15)");
        glow.addColorStop(1, "rgba(58, 157, 255, 0)");
        g.fillStyle = glow;
        g.fillRect(pcx - 160, pty - 80, 320, 320);

        // Cube globe planet (same maps as the logo)
        const palette = { w: "#2f7de1", W: "#1f5fc0", l: "#5bbf3a", f: "#3a8f2a", s: "#e8d27a", m: "#9696a0", i: "#ecf4ff", c: "#ffffff" };
        const faces = {
            top: ["Wwwllwww", "wcclllfw", "wcllffll", "wwlllsww", "wwwswcWw", "Wwwwwclw", "lwcwlffl", "llwwwllw"],
            left: ["wwlllwwW", "wllfflcc", "wwllswww", "Wwwwwwll", "lcwwwlfl", "llwWwwll", "slwwwwww", "iiiiwiii"],
            right: ["wwwwllww", "Wwwlffll", "llwccllw", "flwwwwwW", "llwwwmlw", "scwwlllw", "wwWwwlww", "iiwiiiii"]
        };
        this.drawIsoCube(g, pcx, pty, half, faces, palette, { top: 1.12, left: 0.88, right: 0.62 });

        // Cube moon
        const moonFaces = {
            top: Array(8).fill("gggggggg").map((r, i) => (i === 2 ? "ggdggggg" : i === 5 ? "gggggdgg" : r)),
            left: Array(8).fill("gggggggg").map((r, i) => (i === 3 ? "gdgggggg" : r)),
            right: Array(8).fill("gggggggg").map((r, i) => (i === 4 ? "ggggdggg" : r))
        };
        this.drawIsoCube(g, 712, 52, 16, moonFaces, { g: "#e3e0d5", d: "#b8b4a8" }, { top: 1.05, left: 0.82, right: 0.62 });

        // Faint distant planet-cube on the left
        g.globalAlpha = 0.55;
        const redFaces = { top: Array(8).fill("rrrRrrrr"), left: Array(8).fill("rRrrrrRr"), right: Array(8).fill("rrrrRrrr") };
        this.drawIsoCube(g, 92, 120, 20, redFaces, { r: "#c2553a", R: "#9a3f2a" }, { top: 1.1, left: 0.85, right: 0.6 });
        g.globalAlpha = 1;
        return c;
    }

    // Moon-rock floor: pale grey blocks with craters
    drawMoonFloor(ctx, p) {
        const B = 16;
        for (let bx = p.x; bx < p.x + p.w; bx += B) {
            const n = (bx / B) | 0;
            ctx.fillStyle = n % 2 ? "#c9c6bb" : "#c2bfb3";
            ctx.fillRect(bx, p.y, B, p.h);
            ctx.fillStyle = "#a9a598";
            ctx.fillRect(bx + ((n * 5) % 10) + 2, p.y + 12, 5, 4);
            ctx.fillRect(bx + ((n * 7 + 3) % 11), p.y + 30, 4, 3);
            ctx.fillStyle = "#918d80";
            ctx.fillRect(bx + ((n * 5) % 10) + 3, p.y + 13, 3, 2);
            ctx.fillStyle = "#dedbd0";
            ctx.fillRect(bx + ((n * 3 + 9) % 13), p.y + 22, 2, 2);
            ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
            ctx.fillRect(bx, p.y, 1, p.h);
        }
        // Lighter dusty top edge
        ctx.fillStyle = "#e6e3d8";
        ctx.fillRect(p.x, p.y, p.w, 3);
        ctx.fillStyle = "#b3afa2";
        ctx.fillRect(p.x, p.y + 3, p.w, 1);
    }

    // Glowing crystal ledge (sea-lantern style)
    drawCrystalLedge(ctx, p) {
        ctx.fillStyle = "rgba(95, 208, 255, 0.18)";
        ctx.fillRect(p.x - 4, p.y - 3, p.w + 8, p.h + 10);
        ctx.fillStyle = "#3e9fd6";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        for (let bx = p.x; bx < p.x + p.w; bx += 12) {
            ctx.fillStyle = ((bx - p.x) / 12) % 2 ? "#5fc4ee" : "#4cb3e4";
            ctx.fillRect(bx + 1, p.y + 2, 10, p.h - 4);
            ctx.fillStyle = "#c8f4ff";
            ctx.fillRect(bx + 3, p.y + 4, 2, 2);
        }
        ctx.fillStyle = "#e8fbff";
        ctx.fillRect(p.x, p.y, p.w, 2);
        ctx.fillStyle = "#245e8c";
        ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
    }

    // Nether backdrop: crimson cave ceiling, glowstone, netherrack cliffs, lava sea
    buildNetherLayer() {
        const c = document.createElement("canvas");
        c.width = this.width;
        c.height = this.height;
        const g = c.getContext("2d");
        const W = this.width;
        const ground = ARENA_CONFIG.groundY;

        const bands = ["#2a0606", "#350909", "#410c0b", "#4f110e", "#5f1711", "#712015"];
        const bandH = Math.ceil(ground / bands.length);
        bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bandH, W, bandH + 1); });

        // Jagged cave ceiling with hanging netherrack
        g.fillStyle = "#3b0b0b";
        for (let x = 0; x < W; x += 8) {
            const h = 24 + Math.round((Math.sin(x * 0.02) * 14 + Math.sin(x * 0.07 + 2) * 8) / 8) * 8;
            g.fillRect(x, 0, 8, h);
        }
        // Glowstone clusters on the ceiling
        for (const [gx, gy] of [[90, 30], [300, 22], [520, 34], [700, 26]]) {
            g.fillStyle = "#c79a3c"; g.fillRect(gx, gy, 24, 16);
            g.fillStyle = "#ffe08a"; g.fillRect(gx + 4, gy + 4, 8, 6); g.fillRect(gx + 14, gy + 8, 6, 5);
        }
        // Far cliffs
        g.fillStyle = "#5a1414";
        for (let x = 0; x < W; x += 8) {
            const h = 210 + Math.round((Math.sin(x * 0.013 + 1) * 30 + Math.sin(x * 0.041) * 12) / 8) * 8;
            g.fillRect(x, h, 8, ground - h);
        }
        // Near cliffs with crimson nylium tops
        g.fillStyle = "#7a1e1e";
        for (let x = 0; x < W; x += 8) {
            const h = 270 + Math.round((Math.sin(x * 0.019 + 3) * 22 + Math.sin(x * 0.05) * 8) / 8) * 8;
            g.fillRect(x, h, 8, ground - h);
            g.fillStyle = "#b02a3e"; g.fillRect(x, h, 8, 3); g.fillStyle = "#7a1e1e";
        }
        // Lava sea in front of the cliffs
        g.fillStyle = "#e05a12";
        g.fillRect(0, 346, W, ground - 346);
        g.fillStyle = "#f58a1f";
        g.fillRect(0, 346, W, 4);
        // Lavafalls pouring from the cliffs
        for (const lx of [160, 430, 690]) {
            g.fillStyle = "#e86a14"; g.fillRect(lx, 230, 10, 120);
            g.fillStyle = "#ffb43a"; g.fillRect(lx + 3, 230, 3, 120);
        }
        return c;
    }

    // End backdrop: void sky, distant end islands, obsidian pillars
    buildEndLayer() {
        const c = document.createElement("canvas");
        c.width = this.width;
        c.height = this.height;
        const g = c.getContext("2d");
        const W = this.width;
        const ground = ARENA_CONFIG.groundY;

        const bands = ["#07040d", "#0b0614", "#10081c", "#160b25", "#1d0f30", "#24133b"];
        const bandH = Math.ceil(ground / bands.length);
        bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * bandH, W, bandH + 1); });

        // Distant floating end islands
        for (const [ix, iy, iw] of [[40, 230, 120], [520, 200, 150], [300, 260, 90], [690, 250, 90]]) {
            g.fillStyle = "#a9a46e"; g.fillRect(ix, iy, iw, 10);
            g.fillStyle = "#8a8550"; g.fillRect(ix + 8, iy + 10, iw - 16, 8); g.fillRect(ix + 20, iy + 18, iw - 40, 6);
        }
        // Obsidian pillars with iron-bar cages at the top
        for (const [px, py, pw] of [[90, 140, 44], [320, 90, 50], [605, 160, 46]]) {
            g.fillStyle = "#15111f"; g.fillRect(px, py, pw, ground - py);
            g.fillStyle = "#231b33";
            for (let y = py + 6; y < ground; y += 16) g.fillRect(px + 4, y, pw - 8, 2);
            g.fillStyle = "#3a3346"; g.fillRect(px + pw / 2 - 1, py - 18, 2, 18);
            g.fillRect(px + 4, py - 18, 2, 18); g.fillRect(px + pw - 6, py - 18, 2, 18);
        }
        // Void haze near the floor
        g.fillStyle = "#2c1748";
        g.fillRect(0, 352, W, ground - 352);
        return c;
    }

    // Paints the Overworld backdrop (sky bands, sun, mountains, hills, trees) to an offscreen canvas
    buildOverworldLayer() {
        const c = document.createElement("canvas");
        c.width = this.width;
        c.height = this.height;
        const g = c.getContext("2d");
        const W = this.width;
        const ground = ARENA_CONFIG.groundY;

        // Sky in flat bands (lighter toward the horizon), no gradients
        const bands = ["#5b8dff", "#6597ff", "#70a1ff", "#7cabff", "#89b5ff", "#97c0ff"];
        const bandH = Math.ceil(ground / bands.length);
        bands.forEach((col, i) => {
            g.fillStyle = col;
            g.fillRect(0, i * bandH, W, bandH + 1);
        });

        // Square Minecraft sun with a soft halo ring
        g.fillStyle = "#fff6b3";
        g.fillRect(636, 36, 56, 56);
        g.fillStyle = "#fffde6";
        g.fillRect(648, 48, 32, 32);

        // Far mountains (blue-grey), stepped like blocks
        const far = [[0, 210], [60, 190], [120, 175], [170, 195], [230, 160], [290, 180], [350, 200],
            [400, 170], [460, 150], [520, 175], [580, 195], [640, 165], [700, 185], [760, 200]];
        g.fillStyle = "#8aa3c8";
        far.forEach(([x, y], i) => {
            const w = (far[i + 1] ? far[i + 1][0] : W) - x;
            g.fillRect(x, y, w, ground - y);
        });
        g.fillStyle = "#e8eef8"; // snow caps
        far.forEach(([x, y], i) => {
            const w = (far[i + 1] ? far[i + 1][0] : W) - x;
            if (y < 185) g.fillRect(x, y, w, 8);
        });

        // Near hills (green), stepped 8px blocks, reaching all the way down to the floor
        g.fillStyle = "#4f8a3c";
        for (let x = 0; x < W; x += 8) {
            const h = 250 + Math.round((Math.sin(x * 0.011) * 22 + Math.sin(x * 0.031 + 1.7) * 10) / 8) * 8;
            g.fillRect(x, h, 8, ground - h);
        }
        g.fillStyle = "#5d9c46"; // sunlit top edge
        for (let x = 0; x < W; x += 8) {
            const h = 250 + Math.round((Math.sin(x * 0.011) * 22 + Math.sin(x * 0.031 + 1.7) * 10) / 8) * 8;
            g.fillRect(x, h, 8, 4);
        }

        // Rows of pixel oak trees in the mid-ground
        const tree = (x, base, s) => {
            g.fillStyle = "#6b4a2b";
            g.fillRect(x + 3 * s, base - 6 * s, 2 * s, 6 * s);
            g.fillStyle = "#2f6b2a";
            g.fillRect(x, base - 12 * s, 8 * s, 6 * s);
            g.fillRect(x + 2 * s, base - 14 * s, 4 * s, 2 * s);
            g.fillStyle = "#3d8436";
            g.fillRect(x + s, base - 12 * s, 3 * s, 2 * s);
        };
        [[30, 330], [130, 345], [250, 325], [360, 340], [470, 330], [585, 345], [700, 335]].forEach(([x, b]) => tree(x, b, 3));
        g.fillStyle = "#3f7330"; // darker meadow band behind the arena floor
        g.fillRect(0, 350, W, ground - 350);
        [[80, 386], [200, 388], [420, 386], [540, 388], [660, 386], [760, 388]].forEach(([x, b]) => tree(x, b, 4));

        return c;
    }

    // Grass block top, dirt middle, stone with ores at the bottom (16px Minecraft blocks)
    drawGrassFloor(ctx, p) {
        const B = 16;
        const dirtEnd = p.y + 30;
        for (let bx = p.x; bx < p.x + p.w; bx += B) {
            const n = (bx / B) | 0;
            // Dirt
            ctx.fillStyle = "#866043";
            ctx.fillRect(bx, p.y, B, dirtEnd - p.y);
            ctx.fillStyle = "#6f4e35";
            ctx.fillRect(bx + ((n * 5) % 11), p.y + 12, 3, 3);
            ctx.fillRect(bx + ((n * 7 + 4) % 12), p.y + 20, 2, 2);
            ctx.fillStyle = "#9b7653";
            ctx.fillRect(bx + ((n * 3 + 8) % 13), p.y + 16, 2, 2);
            // Stone
            ctx.fillStyle = "#7f7f7f";
            ctx.fillRect(bx, dirtEnd, B, p.y + p.h - dirtEnd);
            ctx.fillStyle = "#6a6a6a";
            ctx.fillRect(bx + ((n * 5 + 2) % 12), dirtEnd + 4, 4, 2);
            ctx.fillRect(bx + ((n * 3) % 10), dirtEnd + 11, 3, 2);
            if (n % 7 === 3) { // coal ore
                ctx.fillStyle = "#2b2b2b";
                ctx.fillRect(bx + 4, dirtEnd + 6, 3, 3);
                ctx.fillRect(bx + 9, dirtEnd + 10, 2, 2);
            } else if (n % 13 === 8) { // iron ore
                ctx.fillStyle = "#d8af93";
                ctx.fillRect(bx + 5, dirtEnd + 5, 3, 2);
                ctx.fillRect(bx + 10, dirtEnd + 11, 2, 2);
            }
            ctx.fillStyle = "rgba(0, 0, 0, 0.18)"; // block seams
            ctx.fillRect(bx, p.y, 1, p.h);
        }
        // Grass top with ragged edge
        ctx.fillStyle = "#5da83e";
        ctx.fillRect(p.x, p.y, p.w, 5);
        ctx.fillStyle = "#7cc958";
        ctx.fillRect(p.x, p.y, p.w, 2);
        ctx.fillStyle = "#5da83e";
        for (let gx = p.x; gx < p.x + p.w; gx += 4) {
            if (((gx / 4) | 0) % 3 !== 0) ctx.fillRect(gx, p.y + 5, 4, ((gx / 4) | 0) % 2 ? 3 : 2);
        }
        // Darker band where dirt meets stone
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(p.x, dirtEnd, p.w, 2);
    }

    // Floating oak-plank ledge with a grass carpet and hanging vines
    drawOakLedge(ctx, p) {
        // Soft shadow under the ledge
        ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
        ctx.fillRect(p.x + 4, p.y + p.h, p.w - 8, 4);
        // Planks
        ctx.fillStyle = "#a4844f";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = "#8b6d3d";
        ctx.fillRect(p.x, p.y + Math.floor(p.h / 2), p.w, 1);
        for (let bx = p.x; bx < p.x + p.w; bx += 16) {
            const off = (((bx - p.x) / 16) | 0) % 2 ? 8 : 0;
            ctx.fillRect(bx + off, p.y, 1, Math.floor(p.h / 2));
            ctx.fillRect(bx + 8 - off, p.y + Math.floor(p.h / 2), 1, p.h - Math.floor(p.h / 2));
        }
        ctx.fillStyle = "#6e5430";
        ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
        // Grass carpet
        ctx.fillStyle = "#5da83e";
        ctx.fillRect(p.x, p.y, p.w, 4);
        ctx.fillStyle = "#7cc958";
        ctx.fillRect(p.x, p.y, p.w, 1);
        // Hanging vines
        ctx.fillStyle = "#3f7d2a";
        for (let vx = p.x + 10; vx < p.x + p.w - 6; vx += 23) {
            const len = 6 + ((vx * 7) % 10);
            ctx.fillRect(vx, p.y + p.h, 2, len);
            ctx.fillRect(vx + 2, p.y + p.h + len - 3, 2, 3);
        }
    }

    // Shadow on the surface beneath a fighter (shrinks as they rise)
    drawFighterShadow(f) {
        if (f.hp <= 0) return;
        const feet = f.y + f.h;
        let surface = ARENA_CONFIG.groundY;
        for (const p of PLATFORMS_CONFIG) {
            if (p.y >= feet - 1 && p.y < surface && f.x + f.w > p.x && f.x < p.x + p.w) surface = p.y;
        }
        const gap = Math.max(0, surface - feet);
        const scale = Math.max(0.3, 1 - gap / 220);
        const w = Math.round((f.w + 6) * scale);
        const ctx = this.ctx;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.32 * scale})`;
        ctx.fillRect(Math.round(f.x + f.w / 2 - w / 2), surface - 2, w, 3);
    }

    // Full-screen white flash for heavy hits and KOs
    drawFlash(alpha) {
        if (alpha <= 0) return;
        this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.6, alpha)})`;
        this.ctx.fillRect(-20, -20, this.width + 40, this.height + 40);
    }

    drawPlatforms() {
        const ctx = this.ctx;
        const biome = this.biome || "space";

        for (const p of PLATFORMS_CONFIG) {
            const isFloor = p.y >= 380;

            if (biome === "space") {
                if (isFloor) this.drawMoonFloor(ctx, p);
                else this.drawCrystalLedge(ctx, p);
            } else if (biome === "nether") {
                // ==========================================
                // NETHER: AUTHENTIC NETHERRACK BLOCKS
                // ==========================================
                // Base Netherrack rock body
                ctx.fillStyle = "#681b22";
                ctx.fillRect(p.x, p.y, p.w, p.h);

                // Porous dark crevices and cracks (tiled 16x16)
                ctx.fillStyle = "#3e0e13";
                for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                    for (let by = p.y; by < p.y + p.h; by += 16) {
                        ctx.fillRect(bx + 2, by + 4, 3, 3);
                        ctx.fillRect(bx + 9, by + 7, 4, 3);
                        ctx.fillRect(bx + 4, by + 12, 3, 2);
                    }
                }

                // Dark red pitted pores
                ctx.fillStyle = "#4e141a";
                for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                    for (let by = p.y; by < p.y + p.h; by += 16) {
                        ctx.fillRect(bx + 3, by + 5, 2, 2);
                        ctx.fillRect(bx + 10, by + 8, 2, 2);
                        ctx.fillRect(bx + 13, by + 3, 2, 2);
                    }
                }

                // Fiery red highlights & glowing ember specks
                ctx.fillStyle = "#932630";
                for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                    for (let by = p.y; by < p.y + p.h; by += 16) {
                        ctx.fillRect(bx + 7, by + 2, 3, 2);
                        ctx.fillRect(bx + 1, by + 10, 2, 2);
                        ctx.fillRect(bx + 12, by + 11, 2, 2);
                    }
                }
                ctx.fillStyle = "#bd313c";
                for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                    ctx.fillRect(bx + 6, p.y + (p.h > 14 ? 8 : 4), 1, 1);
                    ctx.fillRect(bx + 14, p.y + 2, 1, 1);
                }

                // Block grid mortar lines
                ctx.fillStyle = "#2c080b";
                for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                    ctx.fillRect(bx, p.y, 1, p.h);
                }
                ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);

                // Crimson Nylium turf top carpet & hanging roots
                ctx.fillStyle = "#9e1a31";
                ctx.fillRect(p.x, p.y, p.w, 5);
                ctx.fillStyle = "#cc2746";
                ctx.fillRect(p.x, p.y, p.w, 2);
                ctx.fillStyle = "#751022";
                for (let gx = p.x; gx < p.x + p.w; gx += 8) {
                    ctx.fillRect(gx, p.y + 5, 3, 3);
                    ctx.fillRect(gx + 4, p.y + 5, 2, 2);
                }
            } else if (biome === "end") {
                // ==========================================
                // THE END: AUTHENTIC END STONE BLOCKS
                // ==========================================
                // Base pale creamy End Stone
                ctx.fillStyle = "#ded99f";
                ctx.fillRect(p.x, p.y, p.w, p.h);

                // Dark sulfur crater pits (tiled 16x16)
                ctx.fillStyle = "#b5ad6e";
                for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                    for (let by = p.y; by < p.y + p.h; by += 16) {
                        ctx.fillRect(bx + 2, by + 4, 4, 3);
                        ctx.fillRect(bx + 9, by + 8, 4, 3);
                        ctx.fillRect(bx + 4, by + 12, 3, 2);
                    }
                }

                // Deep crater pores
                ctx.fillStyle = "#8a8349";
                for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                    for (let by = p.y; by < p.y + p.h; by += 16) {
                        ctx.fillRect(bx + 3, by + 5, 2, 2);
                        ctx.fillRect(bx + 10, by + 9, 2, 2);
                    }
                }

                // Pale creamy highlights
                ctx.fillStyle = "#f3efcb";
                for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                    for (let by = p.y; by < p.y + p.h; by += 16) {
                        ctx.fillRect(bx + 7, by + 2, 3, 2);
                        ctx.fillRect(bx + 1, by + 10, 2, 2);
                        ctx.fillRect(bx + 13, by + 11, 2, 2);
                    }
                }

                // Block seams
                ctx.fillStyle = "#706a38";
                for (let bx = p.x; bx < p.x + p.w; bx += 16) {
                    ctx.fillRect(bx, p.y, 1, p.h);
                }
                ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);

                if (isFloor) {
                    // End Stone Bricks border at top of floor
                    ctx.fillStyle = "#eae6ba";
                    ctx.fillRect(p.x, p.y, p.w, 3);
                    ctx.fillStyle = "#948c4f";
                    for (let bx = p.x; bx < p.x + p.w; bx += 32) {
                        ctx.fillRect(bx, p.y, 2, 6);
                    }
                } else {
                    // Purpur block top cap on floating ledges
                    ctx.fillStyle = "#995a94";
                    ctx.fillRect(p.x, p.y, p.w, 5);
                    ctx.fillStyle = "#b870b2";
                    ctx.fillRect(p.x, p.y, p.w, 2);
                    ctx.fillStyle = "#6d3b6a";
                    for (let gx = p.x; gx < p.x + p.w; gx += 8) {
                        ctx.fillRect(gx, p.y + 5, 3, 2);
                    }
                    // Obsidian brackets on ledge corners
                    ctx.fillStyle = "#1b1424";
                    ctx.fillRect(p.x, p.y, 4, p.h);
                    ctx.fillRect(p.x + p.w - 4, p.y, 4, p.h);
                }
            } else {
                // ==========================================
                // OVERWORLD: GRASS BLOCKS, DIRT, STONE & OAK LEDGES
                // ==========================================
                if (isFloor) {
                    this.drawGrassFloor(ctx, p);
                } else {
                    this.drawOakLedge(ctx, p);
                }
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
    // alpha < 1 draws a faint ghost (an invisible Shadow seen by its own team)
    drawFighter(f, fallbackColor = [120, 40, 190], showOverheadBar = false, alpha = 1.0) {
        if (f.hp <= 0) return;

        const ctx = this.ctx;
        const centerX = f.x + f.w / 2;
        const centerY = f.y + f.h / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(f.squashX || 1.0, f.squashY || 1.0);
        ctx.translate(-centerX, -centerY);

        // Skins are drawn at 25px; a big Buddha is the same art scaled up
        const scale = f.w / 25;
        const df = scale !== 1 ? { ...f, w: 25, h: 25 } : f;
        ctx.save();
        if (scale !== 1) {
            ctx.translate(f.x, f.y);
            ctx.scale(scale, scale);
            ctx.translate(-f.x, -f.y);
        }

        // Draw weapon
        this.drawWeapons(df, alpha);

        // Draw skin / block face
        this.drawSkin(df, alpha);
        ctx.restore(); // outlines below use the real (possibly big) size
        ctx.globalAlpha = alpha;

        // Team highlight border and aura (Blue vs Red)
        if (f.team) {
            const isBlue = f.team === "blue";
            const teamColor = isBlue ? "#1e90ff" : "#ff4757";
            const teamAura = isBlue ? "rgba(30, 144, 255, 0.28)" : "rgba(255, 71, 87, 0.28)";

            // Soft highlight aura around character
            ctx.fillStyle = teamAura;
            ctx.fillRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6);

            // Crisp 2px team outline
            ctx.strokeStyle = teamColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(f.x - 1, f.y - 1, f.w + 2, f.h + 2);

            // Team corner pips for a blocky retro badge look
            ctx.fillStyle = teamColor;
            ctx.fillRect(f.x - 2, f.y - 2, 3, 3);
            ctx.fillRect(f.x + f.w - 1, f.y - 2, 3, 3);
            ctx.fillRect(f.x - 2, f.y + f.h - 1, 3, 3);
            ctx.fillRect(f.x + f.w - 1, f.y + f.h - 1, 3, 3);
        }

        // WHITE HIGHLIGHT ON PLAYER
        if (f.isPlayer) {
            // Radiant white aura
            ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
            ctx.fillRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6);

            // Crisp 2px solid white outline
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.strokeRect(f.x - 1, f.y - 1, f.w + 2, f.h + 2);

            // Blocky white corner brackets
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(f.x - 2, f.y - 2, 3, 3);
            ctx.fillRect(f.x + f.w - 1, f.y - 2, 3, 3);
            ctx.fillRect(f.x - 2, f.y + f.h - 1, 3, 3);
            ctx.fillRect(f.x + f.w - 1, f.y + f.h - 1, 3, 3);

            // Floating white indicator arrow above player's head
            const bob = Math.sin(this.frameCount * 0.15) * 2;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            const tipY = f.y - 8 + bob;
            ctx.moveTo(centerX, tipY);
            ctx.lineTo(centerX - 4, tipY - 5);
            ctx.lineTo(centerX + 4, tipY - 5);
            ctx.closePath();
            ctx.fill();
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

    // Health bars use team colors; nearly-dead fighters blink lighter
    teamBarColor(team, ratio) {
        const low = ratio <= 0.25 && Math.floor(this.frameCount / 12) % 2 === 0;
        if (team === "red") return low ? "#ffa8b0" : "#ff4757";
        if (team === "blue") return low ? "#a8d0ff" : "#2f86ff";
        return low ? "#a8f0c0" : "#2ecc71";
    }

    drawOverheadBar(f) {
        if (f.hp <= 0) return;
        const ctx = this.ctx;
        ctx.save();

        const barW = 46;
        const barH = 5;
        const barX = Math.round(f.x + f.w / 2 - barW / 2);
        const barY = Math.round(f.y - 18);

        // Name tag background & text
        let nameText = f.name || (f.team ? f.team.toUpperCase() : "PLAYER");
        if (f.isBot && !nameText.startsWith("[BOT]")) {
            nameText = `[BOT] ${nameText}`;
        }
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        // Small name tag backing
        const nameWidth = ctx.measureText(nameText).width;
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(Math.round(f.x + f.w / 2 - nameWidth / 2 - 3), barY - 12, nameWidth + 6, 11);

        // Name text
        ctx.fillStyle = f.team === "red" ? "#ff7675" : (f.team === "blue" ? "#74b9ff" : "#55ff55");
        ctx.fillText(nameText, Math.round(f.x + f.w / 2), barY - 2);

        // Health bar frame
        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // Ghost HP
        const ghostRatio = Math.max(0, Math.min(1, (f.ghostHp || f.hp) / f.maxHp));
        ctx.fillStyle = "#e8e8e8"; // recent damage
        ctx.fillRect(barX, barY, Math.round(barW * ghostRatio), barH);

        // Current HP fill in team color
        const ratio = Math.max(0, Math.min(1, f.hp / f.maxHp));
        ctx.fillStyle = this.teamBarColor(f.team, ratio);
        ctx.fillRect(barX, barY, Math.round(barW * ratio), barH);

        // Exact HP text below bar
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`${Math.max(0, Math.ceil(f.hp))} HP`, Math.round(f.x + f.w / 2), barY + barH + 1);

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
    // Glows for status effects: burning (pulsing red), poisoned (green), slowed (blue)
    drawStatusEffects(f) {
        if (f.hp <= 0) return;
        const ctx = this.ctx;
        const pulse = 0.5 + 0.5 * Math.sin(this.frameCount * 0.35);
        ctx.save();
        if (f.fireT > 0) {
            ctx.fillStyle = `rgba(255, ${80 + Math.round(pulse * 60)}, 20, ${0.25 + pulse * 0.25})`;
            ctx.fillRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6);
            ctx.fillStyle = "#ffb43a";
            for (let i = 0; i < 3; i++) {
                const fx = f.x + ((this.frameCount * 3 + i * 9) % f.w);
                ctx.fillRect(Math.round(fx), Math.round(f.y - 4 - ((this.frameCount + i * 7) % 8)), 3, 3);
            }
        }
        if (f.poisonT > 0) {
            ctx.strokeStyle = "rgba(80, 220, 80, 0.85)";
            ctx.lineWidth = 2;
            ctx.strokeRect(f.x - 4, f.y - 4, f.w + 8, f.h + 8);
        }
        if (f.slowT > 0) {
            ctx.fillStyle = "rgba(90, 160, 255, 0.3)";
            ctx.fillRect(f.x, f.y + f.h - 6, f.w, 6);
        }
        ctx.restore();
    }

    // Blocky Minecraft-style lightning bolt from the sky down to (x, y)
    drawLightningBolt(bolt) {
        const ctx = this.ctx;
        const alpha = Math.min(1, bolt.life / 12);
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.25 * alpha})`;
        ctx.fillRect(-20, -20, this.width + 40, this.height + 40);
        let x = bolt.x;
        for (let y = 0; y < bolt.y; y += 12) {
            const nx = bolt.x + (((y * 37 + bolt.x * 13) % 21) - 10);
            ctx.fillStyle = `rgba(255, 250, 160, ${alpha})`;
            ctx.fillRect(Math.round(Math.min(x, nx)) - 3, y, Math.abs(nx - x) + 6, 14);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(Math.round(nx) - 1, y, 3, 14);
            x = nx;
        }
        ctx.restore();
    }

    // Class name + ability status for the local player, above the weapon hotbar
    drawClassStatus(f) {
        if (!f || f.hp <= 0) return;
        const ctx = this.ctx;
        const secs = (frames) => (frames / (60 * GAME_SPEED)).toFixed(1);
        let text = f.classId && f.classId !== "normal" ? CLASSES[f.classId].name.toUpperCase() : "";
        let color = "#ffffff";
        if (f.classId === "shadow") {
            const cls = CLASSES.shadow;
            const t = f.shadowTimer % cls.invisCycle;
            if (f.invis) {
                text += ` · INVISIBLE ${secs(cls.invisCycle - t)}s`;
                color = "#c8a8ff";
            } else {
                text += ` · invisible in ${secs(cls.invisCycle - cls.invisTime - t)}s`;
            }
        } else if (f.classId === "lightning") {
            text += " · slams stun longer";
            color = "#ffe14a";
        } else if (f.classId === "energy") {
            text += ` · speed +${Math.round((f.energyBoost || 0) * 100)}%`;
            color = "#7ff0ff";
        } else if (f.classId === "potion") {
            text += " · hits slow, poison, blind";
            color = "#9ae66e";
        } else if (f.classId === "pyro") {
            text += " · hits can burn";
            color = "#ff8a3a";
        } else if (f.classId === "void") {
            text += " · teleports above enemies";
            color = "#c08cff";
        } else if (f.classId === "buddha") {
            text += f.big ? " · BIG (B to shrink)" : " · B to grow";
            color = "#ffd27a";
        }
        // Status effects on you
        const status = [];
        if (f.slowT > 0) status.push("SLOWED");
        if (f.poisonT > 0) status.push("POISONED");
        if (f.fireT > 0) status.push("ON FIRE");
        if (f.blindT > 0) status.push("BLIND");
        ctx.save();
        ctx.font = "16px VT323, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        const lines = [];
        if (status.length) lines.push([status.join(", "), "#ff7675"]);
        if (text) lines.push([text, color]);
        lines.reverse().forEach(([line, col], i) => {
            const y = this.height - 58 - i * 16;
            ctx.strokeText(line, 14, y);
            ctx.fillStyle = col;
            ctx.fillText(line, 14, y);
        });
        ctx.restore();
    }

    // Minecraft-style 2-slot hotbar for the local player's loadout (bottom-left)
    drawLoadoutHotbar(f) {
        if (!f || !f.loadout || f.loadout.length < 2) return;
        const ctx = this.ctx;
        if (!this.iconCache) this.iconCache = {};
        const size = 30;
        const x0 = 14;
        const y0 = this.height - size - 14;
        ctx.save();
        f.loadout.forEach((id, i) => {
            const x = x0 + i * (size + 4);
            const active = i === f.activeSlot;
            ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
            ctx.fillRect(x, y0, size, size);
            ctx.strokeStyle = active ? "#ffffff" : "#555555";
            ctx.lineWidth = active ? 3 : 2;
            ctx.strokeRect(x, y0, size, size);
            let img = this.iconCache[id];
            if (!img) {
                img = new Image();
                img.src = weaponIconURL(id);
                this.iconCache[id] = img;
            }
            if (img.complete) {
                ctx.imageSmoothingEnabled = false;
                ctx.globalAlpha = active ? 1 : 0.55;
                ctx.drawImage(img, x + 3, y0 + 3, size - 6, size - 6);
                ctx.globalAlpha = 1;
            }
        });
        ctx.font = "16px VT323, monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText("Q: swap", x0 + 2 * (size + 4) + 4, y0 + size / 2);
        ctx.fillText("Q: swap", x0 + 2 * (size + 4) + 4, y0 + size / 2);
        ctx.restore();
    }

    drawHUD(player, bot, botColor, modeLabel, p1Label = "YOU", p2Label = "BOT", scoreRed = 0, scoreBlue = 0, isTiebreaker = false, tiebreakerTimer = 0, redDmg = 0, blueDmg = 0, isTeamMatch = false) {
        const ctx = this.ctx;
        ctx.save();

        const barW = 200;
        const barH = 18;

        // Name on the left (shortened to fit), HP number on the right, inside the bar
        const barLabel = (x, label, hp, maxHp) => {
            ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
            ctx.textBaseline = "middle";
            const hpText = `${Math.max(0, Math.ceil(hp))}/${maxHp}`;
            ctx.textAlign = "right";
            ctx.fillStyle = "#ffffff";
            ctx.fillText(hpText, x + barW - 5, 27);
            const room = barW - 14 - ctx.measureText(hpText).width;
            let name = label;
            ctx.textAlign = "left";
            while (name.length > 1 && ctx.measureText(name).width > room) name = name.slice(0, -1);
            if (name !== label) name = name.slice(0, -1) + "…";
            ctx.fillText(name, x + 5, 27);
        };

        // Player 1 HP
        ctx.fillStyle = "rgba(30, 30, 30, 0.85)";
        ctx.fillRect(20, 18, barW, barH);

        const p1GhostRatio = Math.max(0, player.ghostHp / player.maxHp);
        ctx.fillStyle = "#e8e8e8";
        ctx.fillRect(20, 18, barW * p1GhostRatio, barH);

        const p1Ratio = Math.max(0, player.hp / player.maxHp);
        ctx.fillStyle = this.teamBarColor(player.team || "blue", p1Ratio);
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

        barLabel(20, p1Label, player.hp, player.maxHp);

        // Bot / Player 2 HP
        const bX = this.width - 20 - barW;
        ctx.fillStyle = "rgba(30, 30, 30, 0.85)";
        ctx.fillRect(bX, 18, barW, barH);

        const bGhostRatio = Math.max(0, bot.ghostHp / bot.maxHp);
        ctx.fillStyle = "#e8e8e8";
        ctx.fillRect(bX, 18, barW * bGhostRatio, barH);

        const bRatio = Math.max(0, bot.hp / bot.maxHp);
        ctx.fillStyle = this.teamBarColor(bot.team || "red", bRatio);
        ctx.fillRect(bX, 18, barW * bRatio, barH);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.strokeRect(bX, 18, barW, barH);

        const bDashRatio = bot.dashCooldown > 0 ? (1 - bot.dashCooldown / 40) : 1;
        ctx.fillStyle = bot.dashReady && bot.dashCooldown <= 0 ? "#00d2d3" : "#576574";
        ctx.fillRect(bX, 38, barW * bDashRatio, 4);

        barLabel(bX, p2Label, bot.hp, bot.maxHp);

        // Center Scoreboard (First to 11 in team arena, or 1v1 duel banner)
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(this.width / 2 - 80, 8, 160, 32);
        ctx.strokeStyle = isTiebreaker ? "#f1c40f" : "#000000";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.width / 2 - 80, 8, 160, 32);

        if (isTiebreaker) {
            ctx.fillStyle = "#f1c40f";
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`⚔️ TIEBREAKER: ${(Math.max(0, tiebreakerTimer) / 60).toFixed(1)}s`, this.width / 2, 18);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 9px monospace";
            ctx.fillText(`BLUE: ${Math.round(blueDmg)} | RED: ${Math.round(redDmg)} DMG`, this.width / 2, 30);
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 13px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${scoreBlue}  -  ${scoreRed}`, this.width / 2, 19);
            ctx.fillStyle = "#f1c40f";
            ctx.font = "bold 9px monospace";
            const subBadge = isTeamMatch ? "FIRST TO 11 KILLS" : `${(modeLabel || "1v1 DUEL").toUpperCase()}`;
            ctx.fillText(subBadge, this.width / 2, 31);
        }

        ctx.restore();
    }

    // Team Arena 1v1, 2v2 and 5v5 HUD displaying every person and their exact health
    drawTeamArenaHUD(redTeam, blueTeam, matchType, scoreRed = 0, scoreBlue = 0, isTiebreaker = false, tiebreakerTimer = 0, redDmg = 0, blueDmg = 0) {
        const ctx = this.ctx;
        ctx.save();

        const redAlive = redTeam.filter(f => f.hp > 0).length;
        const blueAlive = blueTeam.filter(f => f.hp > 0).length;

        // Center Match Score & Type Badge
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(this.width / 2 - 80, 8, 160, 32);
        ctx.strokeStyle = isTiebreaker ? "#f1c40f" : "#000000";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.width / 2 - 80, 8, 160, 32);

        if (isTiebreaker) {
            ctx.fillStyle = "#f1c40f";
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`⚔️ TIEBREAKER: ${(Math.max(0, tiebreakerTimer) / 60).toFixed(1)}s`, this.width / 2, 18);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 9px monospace";
            ctx.fillText(`BLUE: ${Math.round(blueDmg)} | RED: ${Math.round(redDmg)} DMG`, this.width / 2, 30);
        } else {
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 13px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`BLUE ${scoreBlue} : ${scoreRed} RED`, this.width / 2, 19);
            ctx.fillStyle = "#f1c40f";
            ctx.font = "bold 9px monospace";
            ctx.fillText(`ARENA ${matchType.toUpperCase()} • FIRST TO 11`, this.width / 2, 31);
        }

        // --- BLUE TEAM ROSTER (Left Side - YOUR TEAM) ---
        ctx.fillStyle = "rgba(41, 128, 185, 0.95)";
        ctx.fillRect(16, 10, 160, 24);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.strokeRect(16, 10, 160, 24);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`BLUE TEAM (${blueAlive}/${blueTeam.length})`, 96, 22);

        const rItemH = matchType === "5v5" ? 18 : 22;
        blueTeam.forEach((f, idx) => {
            const itemY = 38 + idx * (rItemH + 4);
            const isAlive = f.hp > 0;
            const hpRatio = Math.max(0, Math.min(1, f.hp / f.maxHp));
            const ghostRatio = Math.max(0, Math.min(1, (f.ghostHp || f.hp) / f.maxHp));

            // Card background
            ctx.fillStyle = isAlive ? "rgba(20, 20, 20, 0.85)" : "rgba(20, 30, 40, 0.6)";
            ctx.fillRect(16, itemY, 160, rItemH);
            ctx.strokeStyle = f.isPlayer ? "#ffffff" : (isAlive ? "#2980b9" : "#555");
            ctx.lineWidth = f.isPlayer ? 2 : 1;
            ctx.strokeRect(16, itemY, 160, rItemH);

            // Fighter Name
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillStyle = f.isPlayer ? "#ffffff" : (isAlive ? "#74b9ff" : "#888888");
            const name = (f.name || `Blue ${idx + 1}`).substring(0, 10);
            ctx.fillText(name, 22, itemY + rItemH / 2);

            // HP Bar inside card
            const barX = 90;
            const barW = 80;
            const barH = rItemH - 8;
            const barY = itemY + 4;

            ctx.fillStyle = "#111";
            ctx.fillRect(barX, barY, barW, barH);

            if (isAlive) {
                ctx.fillStyle = "#e8e8e8";
                ctx.fillRect(barX, barY, barW * ghostRatio, barH);
                ctx.fillStyle = this.teamBarColor(f.team, hpRatio);
                ctx.fillRect(barX, barY, barW * hpRatio, barH);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 9px monospace";
                ctx.textAlign = "center";
                ctx.fillText(`${Math.max(0, Math.ceil(f.hp))} HP`, barX + barW / 2, itemY + rItemH / 2);
            } else {
                ctx.fillStyle = "#e74c3c";
                ctx.font = "bold 9px monospace";
                ctx.textAlign = "center";
                ctx.fillText("ELIMINATED", barX + barW / 2, itemY + rItemH / 2);
            }
        });

        // --- RED TEAM ROSTER (Right Side - OPPONENTS) ---
        const bStartX = this.width - 176;
        ctx.fillStyle = "rgba(231, 76, 60, 0.95)";
        ctx.fillRect(bStartX, 10, 160, 24);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
        ctx.strokeRect(bStartX, 10, 160, 24);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`RED TEAM (${redAlive}/${redTeam.length})`, bStartX + 80, 22);

        redTeam.forEach((f, idx) => {
            const itemY = 38 + idx * (rItemH + 4);
            const isAlive = f.hp > 0;
            const hpRatio = Math.max(0, Math.min(1, f.hp / f.maxHp));
            const ghostRatio = Math.max(0, Math.min(1, (f.ghostHp || f.hp) / f.maxHp));

            ctx.fillStyle = isAlive ? "rgba(20, 20, 20, 0.85)" : "rgba(40, 20, 20, 0.6)";
            ctx.fillRect(bStartX, itemY, 160, rItemH);
            ctx.strokeStyle = isAlive ? "#c0392b" : "#555";
            ctx.lineWidth = 1;
            ctx.strokeRect(bStartX, itemY, 160, rItemH);

            ctx.font = "bold 10px monospace";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillStyle = isAlive ? "#ff7675" : "#888888";
            const name = (f.name || `Red ${idx + 1}`).substring(0, 10);
            ctx.fillText(name, bStartX + 6, itemY + rItemH / 2);

            const barX = bStartX + 74;
            const barW = 80;
            const barH = rItemH - 8;
            const barY = itemY + 4;

            ctx.fillStyle = "#111";
            ctx.fillRect(barX, barY, barW, barH);

            if (isAlive) {
                ctx.fillStyle = "#e8e8e8";
                ctx.fillRect(barX, barY, barW * ghostRatio, barH);
                ctx.fillStyle = this.teamBarColor(f.team, hpRatio);
                ctx.fillRect(barX, barY, barW * hpRatio, barH);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 9px monospace";
                ctx.textAlign = "center";
                ctx.fillText(`${Math.max(0, Math.ceil(f.hp))} HP`, barX + barW / 2, itemY + rItemH / 2);
            } else {
                ctx.fillStyle = "#e74c3c";
                ctx.font = "bold 9px monospace";
                ctx.textAlign = "center";
                ctx.fillText("ELIMINATED", barX + barW / 2, itemY + rItemH / 2);
            }
        });

        ctx.restore();
    }

    drawControlsHint(isPvP = false, matchFrames = 0) {
        const ctx = this.ctx;
        // Smoothly fade out after ~5 seconds (240 frames) so combat arena remains completely clean
        let alpha = 1.0;
        if (matchFrames > 200) {
            alpha = Math.max(0, 1.0 - (matchFrames - 200) / 70);
        }
        if (alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = alpha;

        // On the ground strip at the bottom, right of the weapon hotbar, so it never covers the HUD
        const bannerX = 170;
        const bannerW = this.width - bannerX - 14;
        const bannerH = 18;
        const bannerY = this.height - 34;

        ctx.fillStyle = "rgba(10, 12, 18, 0.72)";
        ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px 'Segoe UI', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        if (isPvP) {
            ctx.fillText("P1: WASD = MOVE/JUMP | SPACE = DASH/ATTACK | S = SLAM   ••   P2: ARROWS | ENTER = ATTACK | DOWN = SLAM", this.width / 2, bannerY + bannerH / 2);
        } else {
            ctx.fillText("WASD / ARROWS = MOVE • SPACE / CLICK = ATTACK • S / DOWN = SLAM • Q = SWAP WEAPON • ESC = PAUSE", this.width / 2, bannerY + bannerH / 2);
        }

        ctx.restore();
    }

}
