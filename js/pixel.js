// ==========================================
// SPEAR-MACE PVP - Pixel Art Helpers
// Procedurally generated Minecraft-style textures:
//  - dirt background tile
//  - 8x8 block heads (Steve, Alex, mobs) + rotating 3D cube avatars
//  - 16x16 weapon icons
// No external image assets are needed.
// ==========================================

const PX_CACHE = {};

function pxCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
}

// Darken / lighten a #rrggbb color by an amount (-1..1)
function pxShade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
    r = f(r); g = f(g); b = f(b);
    return `rgb(${r},${g},${b})`;
}

// Tiny deterministic noise so the textures feel like Minecraft blocks
function pxNoise(x, y, seed = 0) {
    const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return v - Math.floor(v);
}

// ------------------------------------------
// DIRT BACKGROUND WITH TOP GRASS (Minecraft dirt block)
// Clean pixel art without noisy random specks
// ------------------------------------------
export function applyMinecraftBackground() {
    const c = pxCanvas(16, 16);
    const ctx = c.getContext("2d");
    
    // Rich blocky dirt colors (clean Minecraft-style palette)
    ctx.fillStyle = "#866043"; // Main warm brown dirt
    ctx.fillRect(0, 0, 16, 16);
    
    // Blocky dirt patches
    ctx.fillStyle = "#725037";
    ctx.fillRect(1, 4, 3, 3);
    ctx.fillRect(8, 6, 4, 3);
    ctx.fillRect(3, 11, 4, 3);
    ctx.fillRect(11, 12, 3, 3);

    ctx.fillStyle = "#5c3d28";
    ctx.fillRect(2, 5, 2, 2);
    ctx.fillRect(9, 7, 2, 2);
    ctx.fillRect(4, 12, 2, 2);
    ctx.fillRect(12, 13, 2, 2);

    ctx.fillStyle = "#9c7250";
    ctx.fillRect(6, 2, 3, 2);
    ctx.fillRect(13, 5, 2, 2);
    ctx.fillRect(0, 9, 2, 2);
    ctx.fillRect(8, 11, 2, 2);

    // Green grass block top row (2px grass with dangling roots)
    ctx.fillStyle = "#4c9e32";
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillStyle = "#3e8529";
    ctx.fillRect(2, 2, 2, 1);
    ctx.fillRect(7, 2, 2, 2);
    ctx.fillRect(12, 2, 2, 1);

    document.documentElement.style.setProperty("--dirt", `url(${c.toDataURL()})`);
}

// ------------------------------------------
// BLOCK HEADS
// Pattern legend per skin palette: H hair, S skin, W white, P pupil, M mouth/nose, D dark
// ------------------------------------------
const PX_HEADS = {
    steve: {
        pal: { H: "#3b2a17", S: "#c4936a", W: "#ffffff", P: "#4a3f9e", M: "#7a4d30" },
        hairRows: 3, hair: "#3b2a17", skin: "#c4936a",
        front: ["HHHHHHHH", "HHHHHHHH", "HSSSSSSH", "SSSSSSSS", "SWPSSPWS", "SSSMMSSS", "SSMMMMSS", "SSMSSMSS"]
    },
    alex: {
        pal: { H: "#c9792a", S: "#e6b48f", W: "#ffffff", P: "#3f8a3f", M: "#b9826b" },
        hairRows: 3, hair: "#c9792a", skin: "#e6b48f",
        front: ["HHHHHHHH", "HHHHHHHH", "HHSSSSHH", "HSSSSSSH", "SWPSSPWS", "SSSSSSSS", "SSSMMSSS", "SSSSSSSS"]
    },
    noob: {
        pal: { S: "#f2d21f", D: "#222222" },
        hairRows: 0, skin: "#f2d21f", hair: "#f2d21f",
        front: ["SSSSSSSS", "SSSSSSSS", "SSSSSSSS", "SSDSSDSS", "SSSSSSSS", "SDSSSSDS", "SSDDDDSS", "SSSSSSSS"]
    },
    man_face: {
        pal: { H: "#2d2d2d", S: "#e8c690", D: "#111111" },
        hairRows: 2, hair: "#2d2d2d", skin: "#e8c690",
        front: ["HHHHHHHH", "HHHHHHHH", "SSSSSSSS", "SDDSSDDS", "SSDSSSDS", "SSSSSSSS", "SSSSDDDS", "SSSSSSSS"]
    },
    creeper: {
        pal: { G: "#4fae3c", B: "#1a1a1a", L: "#3d8a2e" },
        hairRows: 0, skin: "#4fae3c", hair: "#4fae3c",
        front: ["GGLGGGLG", "GBBGGBBG", "GBBGGBBG", "GGGBBGGG", "GGBBBBGG", "GLBBBBGG", "GGBGGBGG", "GGGGLGGG"]
    },
    enderman: {
        pal: { K: "#16101c", P: "#e07cff", Q: "#ffffff" },
        hairRows: 0, skin: "#16101c", hair: "#16101c",
        front: ["KKKKKKKK", "KKKKKKKK", "KKKKKKKK", "KKKKKKKK", "KQPKKPQK", "KKKKKKKK", "KKKKKKKK", "KKKKKKKK"]
    },
    skeleton: {
        pal: { S: "#d6d6d6", L: "#bdbdbd", D: "#4a4a4a" },
        hairRows: 0, skin: "#d6d6d6", hair: "#d6d6d6",
        front: ["SSSLSSSS", "SSSSSSLS", "SSSSSSSS", "SDDSSDDS", "SDDSSDDS", "SSSDDSSS", "SDSDSDSD", "SSDSDSDS"]
    },
    zombie: {
        pal: { H: "#2f5f27", S: "#5a9a45", P: "#2a3a8a", M: "#2f5f27", D: "#3d6e32" },
        hairRows: 2, hair: "#2f5f27", skin: "#5a9a45",
        front: ["HHHHHHHH", "HHHHHHHH", "SSSSSSSS", "SSSSSSSS", "SPPSSPPS", "SSSDDSSS", "SSMMMMSS", "SSSSSSSS"]
    },
    diamond_knight: {
        pal: { C: "#3fd6d6", B: "#1d9aa0", V: "#10222b", W: "#d9ffff" },
        hairRows: 0, skin: "#3fd6d6", hair: "#2ab5b8",
        front: ["BBBBBBBB", "BCCCCCCB", "CCCCCCCC", "VVVVVVVV", "VWVVVVWV", "CCCCCCCC", "CBCCCCBC", "BBBBBBBB"]
    }
};

// Avatar presets in auth.js that don't have their own head use these
const PX_PRESET_HEAD = {
    steve: "steve", alex: "alex", mace_knight: "diamond_knight", wind_breeze: "skeleton",
    nether_warrior: "zombie", ender_champion: "enderman", golden_paladin: "noob", shadow_bot: "creeper"
};

function pxDrawTexture(rows, pal, size = 8, seed = 0) {
    const c = pxCanvas(size, size);
    const ctx = c.getContext("2d");
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const ch = rows[y][x];
            const col = pal[ch] || "#ff00ff";
            const n = pxNoise(x, y, seed);
            ctx.fillStyle = pxShade(col, (n - 0.5) * 0.12);
            ctx.fillRect(x, y, 1, 1);
        }
    }
    return c.toDataURL();
}

function pxSolidTexture(col, seed = 0) {
    const rows = Array(8).fill("SSSSSSSS");
    return pxDrawTexture(rows, { S: col }, 8, seed);
}

// Returns { front, back, left, right, top, bottom } data URLs for a head.
export function headTextures(skinId) {
    const id = PX_HEADS[skinId] ? skinId : (PX_PRESET_HEAD[skinId] || "steve");
    const key = "head:" + id;
    if (PX_CACHE[key]) return PX_CACHE[key];

    const h = PX_HEADS[id];
    const front = pxDrawTexture(h.front, h.pal, 8, 1);

    const sideRows = [];
    for (let y = 0; y < 8; y++) sideRows.push((y < h.hairRows ? "H" : "S").repeat(8));
    const sidePal = { H: h.hair, S: h.skin };
    const side = pxDrawTexture(sideRows, sidePal, 8, 2);
    const back = pxSolidTexture(h.hairRows > 0 ? h.hair : h.skin, 4);
    const top = pxSolidTexture(h.hair, 5);
    const bottom = pxSolidTexture(h.skin, 6);

    PX_CACHE[key] = { front, back, left: side, right: side, top, bottom };
    return PX_CACHE[key];
}

// Flat 2D head icon (just the face) as an <img>
export function headImgHTML(skinId, size = 32, cls = "") {
    const t = headTextures(skinId);
    return `<img class="px-head ${cls}" src="${t.front}" width="${size}" height="${size}" alt="" style="width:${size}px;height:${size}px">`;
}

// Rotating 3D cube whose faces are the Minecraft head textures
export function cubeHTML(skinId, size = 40) {
    const t = headTextures(skinId);
    const faces = ["front", "back", "left", "right", "top", "bottom"]
        .map(f => `<span class="cube-face cube-${f}" style="background-image:url(${t[f]})"></span>`)
        .join("");
    return `<span class="cube-wrap" style="--s:${size}px"><span class="cube">${faces}</span></span>`;
}

export function presetHeadId(presetId) {
    return PX_PRESET_HEAD[presetId] || "steve";
}

// Small colored square used in place of tier medals
export function tierPipHTML(tier) {
    return `<span class="tier-pip" style="background:${tier.color}"></span>`;
}

// ------------------------------------------
// WEAPON ICONS (16x16 sprites)
// ------------------------------------------
function pxWeaponSprite(id) {
    const c = pxCanvas(16, 16);
    const ctx = c.getContext("2d");
    const px = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); };
    const rect = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    const wood = "#8a5a2b", woodD = "#5e3b1c";

    if (id === "sword") {
        for (let i = 0; i < 10; i++) { px(5 + i, 10 - i, "#f0f0f0"); px(6 + i, 10 - i, "#aeb7bd"); }
        for (let k = 0; k < 5; k++) px(3 + k, 9 + k, woodD);
        px(4, 12, wood); px(3, 13, wood); px(2, 14, woodD);
    } else if (id === "spear") {
        for (let i = 0; i < 12; i++) { px(1 + i, 14 - i, wood); px(2 + i, 14 - i, woodD); }
        rect(12, 2, 2, 2, "#cfd6db"); px(14, 1, "#f0f0f0"); px(15, 0, "#f0f0f0"); px(11, 3, "#aeb7bd"); px(13, 1, "#aeb7bd");
    } else if (id === "fists") {
        rect(2, 6, 5, 6, "#d9a577"); rect(2, 10, 5, 2, "#b8855a");
        rect(9, 4, 5, 6, "#d9a577"); rect(9, 8, 5, 2, "#b8855a");
        rect(2, 6, 5, 1, "#f0c79d"); rect(9, 4, 5, 1, "#f0c79d");
    } else if (id === "bow") {
        [[9, 1], [10, 2], [11, 3], [11, 4], [12, 5], [12, 6], [12, 7], [12, 8], [12, 9], [11, 10], [11, 11], [10, 12], [9, 13]]
            .forEach(([x, y]) => px(x, y, wood));
        for (let y = 1; y <= 13; y++) px(8, y, "#e8e8e8");
        for (let x = 2; x <= 10; x++) px(x, 7, "#9aa3a8");
        px(1, 7, "#d9d9d9"); px(1, 6, "#d9d9d9"); px(1, 8, "#d9d9d9");
    } else { // mace
        for (let i = 0; i < 10; i++) { px(2 + i, 14 - i, wood); px(3 + i, 14 - i, woodD); }
        rect(9, 1, 6, 6, "#5a5f66");
        rect(10, 2, 4, 4, "#8a9199");
        rect(10, 2, 2, 2, "#c1c8cf");
        rect(8, 3, 1, 2, "#3a3d42"); rect(15, 3, 1, 2, "#3a3d42");
        rect(11, 0, 2, 1, "#3a3d42"); rect(11, 7, 2, 1, "#3a3d42");
    }
    return c.toDataURL();
}

export function weaponIconHTML(id, size = 32) {
    const key = "wep:" + id;
    if (!PX_CACHE[key]) PX_CACHE[key] = pxWeaponSprite(id);
    return `<img class="px-icon" src="${PX_CACHE[key]}" width="${size}" height="${size}" alt="" style="width:${size}px;height:${size}px">`;
}
