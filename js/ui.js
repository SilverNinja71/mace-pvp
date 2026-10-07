// ==========================================
// SPEAR-MACE PVP - UI & Menu System
// Manages Home Screen, Mode Selection, Modals, Custom Bot Sandbox,
// Google Sign-In, Username / Profile Page, Armory, Skins,
// Arena Hub (1v1, 2v2, 5v5), and National Obsidian Leaderboard
// ==========================================

import { MODE_METADATA, BOT_SETTINGS } from './config.js';
import { sound } from './audio.js';
import { auth, AVATAR_PRESETS, BLOCK_FACES } from './auth.js';
import { WEAPON_TYPES } from './weapons.js';
import { arena, ARENA_TIERS } from './arena.js';
import { cubeHTML, headImgHTML, presetHeadId, tierPipHTML, weaponIconHTML } from './pixel.js';

export class UIManager {
    constructor(game) {
        this.game = game;

        // Modals
        this.menuOverlay = document.getElementById("menu-overlay");
        this.pauseModal = document.getElementById("pause-modal");
        this.customBotModal = document.getElementById("custom-bot-modal");
        this.statsModal = document.getElementById("stats-modal");
        this.authModal = document.getElementById("auth-modal");
        this.weaponsModal = document.getElementById("weapons-modal");
        this.skinsModal = document.getElementById("skins-modal");
        this.arenaModal = document.getElementById("arena-modal");
        this.leaderboardModal = document.getElementById("leaderboard-modal");
        this.queueModal = document.getElementById("queue-modal");

        // Top Navigation & Action Buttons
        this.muteBtn = document.getElementById("btn-mute");
        this.styleBtn = document.getElementById("btn-style");
        this.homeBtn = document.getElementById("btn-home");
        this.restartBtn = document.getElementById("btn-restart");
        this.pauseBtn = document.getElementById("btn-pause");
        this.statsBtn = document.getElementById("btn-stats");
        this.userProfileBtn = document.getElementById("btn-user-profile");
        this.armoryBtn = document.getElementById("btn-armory");
        this.skinsBtn = document.getElementById("btn-skins");
        this.arenaBtn = document.getElementById("btn-arena");
        this.leaderboardBtn = document.getElementById("btn-leaderboard");
        this.goldDisplay = document.getElementById("gold-display");
        this.downloadBtn = document.getElementById("btn-download");

        this.modeCardsContainer = document.getElementById("mode-cards");
        this.modeCardsVersus = document.getElementById("mode-cards-versus");
        this.carSlide = 0;
        this.touchControls = document.getElementById("touch-controls");

        // Arena Matchmaking State
        this.selectedArenaMode = "2v2"; // "1v1", "2v2", "5v5"
        this.selectedArenaWeapon = "mace";
        this.queueTimer = 0;
        this.queueInterval = null;

        this.init();
    }

    init() {
        this.renderModeCards();
        this.setupCarousel();
        this.setupEventListeners();
        this.setupCustomBotForm();
        this.setupAuthUI();
        this.setupInventoryUI();
        this.setupArmoryUI();
        this.setupSkinsUI();
        this.setupArenaUI();
        this.setupTouchButtons();
        this.detectTouchDevice();
    }

    // Home screen carousel: Home -> Bot Battles -> Versus & Sandbox -> Arena
    setupCarousel() {
        this.carTrack = document.getElementById("car-track");
        this.carSlides = this.carTrack ? this.carTrack.querySelectorAll(".car-slide") : [];
        this.carTitle = document.getElementById("car-title");
        this.carDots = document.getElementById("car-dots");
        const prev = document.getElementById("car-prev");
        const next = document.getElementById("car-next");
        if (!this.carTrack) return;

        if (this.carDots) {
            this.carDots.innerHTML = "";
            this.carSlides.forEach((_, i) => {
                const d = document.createElement("span");
                d.className = "car-dot";
                d.addEventListener("click", () => this.goToSlide(i));
                this.carDots.appendChild(d);
            });
        }

        if (prev) prev.addEventListener("click", () => this.goToSlide(this.carSlide - 1));
        if (next) next.addEventListener("click", () => this.goToSlide(this.carSlide + 1));

        window.addEventListener("keydown", (e) => {
            if (this.menuOverlay.classList.contains("hidden")) return;
            if (document.querySelector(".modal-backdrop:not(.hidden)")) return;
            if (e.key === "ArrowRight") this.goToSlide(this.carSlide + 1);
            else if (e.key === "ArrowLeft") this.goToSlide(this.carSlide - 1);
        });

        this.goToSlide(0, true);
    }

    goToSlide(index, silent = false) {
        if (!this.carTrack) return;
        const max = this.carSlides.length - 1;
        const i = Math.max(0, Math.min(max, index));
        this.carSlide = i;
        this.carTrack.style.transform = `translateX(${-i * 100}%)`;
        if (this.carTitle) this.carTitle.textContent = this.carSlides[i].dataset.title || "";
        if (this.carDots) {
            [...this.carDots.children].forEach((d, k) => d.classList.toggle("active", k === i));
        }
        const prev = document.getElementById("car-prev");
        const next = document.getElementById("car-next");
        if (prev) prev.disabled = i === 0;
        if (next) next.disabled = i === max;
        if (!silent) sound.playClick();
    }

    renderModeCards() {
        if (!this.modeCardsContainer) return;
        this.modeCardsContainer.innerHTML = "";
        if (this.modeCardsVersus) this.modeCardsVersus.innerHTML = "";

        const modes = ["practice", "easy", "normal", "pro", "god", "pvp", "custom"];
        const versusModes = ["pvp", "custom"];

        modes.forEach((modeKey) => {
            const meta = MODE_METADATA[modeKey];
            if (!meta) return;

            const card = document.createElement("div");
            card.className = `mode-card mode-${modeKey}`;
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-badge" style="background:${meta.rgb}">${meta.badge}</span>
                    <span class="card-hotkey">[ ${meta.hotkey} ]</span>
                </div>
                <h3 class="card-title">${meta.name}</h3>
                <p class="card-sub">${meta.sub}</p>
                <p class="card-desc">${meta.desc}</p>
                <button class="btn-play-mode" style="border-color:${meta.rgb}">SELECT MODE</button>
            `;

            card.addEventListener("click", () => {
                if (modeKey === "custom") {
                    this.openCustomBotModal();
                } else {
                    this.game.startGame(modeKey);
                }
            });

            const target = (versusModes.includes(modeKey) && this.modeCardsVersus) ? this.modeCardsVersus : this.modeCardsContainer;
            target.appendChild(card);
        });
    }

    setupEventListeners() {
        // Retro button press animation for every button
        document.addEventListener("click", (e) => {
            const b = e.target.closest("button, .btn-ctrl, .mode-card, .home-arena-banner, .home-profile-banner");
            if (!b || b.disabled) return;
            b.classList.remove("mc-press");
            void b.offsetWidth;
            b.classList.add("mc-press");
            setTimeout(() => b.classList.remove("mc-press"), 220);
        });

        // Sound mute toggle
        if (this.muteBtn) {
            this.muteBtn.addEventListener("click", () => {
                const isMuted = sound.toggleMute();
                this.updateMuteButton(isMuted);
            });
            this.updateMuteButton(sound.muted);
        }

        // Theme / Biome Toggle (Overworld -> Nether -> End)
        this.themeBtn = document.getElementById("btn-theme");
        this.currentBiome = "overworld";
        if (this.themeBtn) {
            this.themeBtn.addEventListener("click", () => {
                const biomes = ["overworld", "nether", "end"];
                const nextIdx = (biomes.indexOf(this.currentBiome) + 1) % biomes.length;
                this.currentBiome = biomes[nextIdx];
                const capitalized = this.currentBiome.charAt(0).toUpperCase() + this.currentBiome.slice(1);
                this.themeBtn.textContent = `Theme: ${capitalized}`;
                this.game.renderer.setBiome(this.currentBiome);
                sound.playClick();
            });
        }

        // Inventory [i] triggers & shortcut
        this.inventoryBtn = document.getElementById("btn-inventory");
        this.homeInventoryBtn = document.getElementById("btn-home-inventory");
        this.inventoryModal = document.getElementById("inventory-modal");

        if (this.inventoryBtn) this.inventoryBtn.addEventListener("click", () => this.openInventoryModal());
        if (this.homeInventoryBtn) this.homeInventoryBtn.addEventListener("click", () => this.openInventoryModal());

        window.addEventListener("keydown", (e) => {
            if (e.key === "i" || e.key === "I") {
                const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
                if (activeTag !== "input" && activeTag !== "textarea") {
                    this.toggleInventoryModal();
                }
            }
        });

        // Navigation buttons
        if (this.homeBtn) this.homeBtn.addEventListener("click", () => this.game.goHome());
        if (this.restartBtn) this.restartBtn.addEventListener("click", () => this.game.restartMatch());
        if (this.pauseBtn) this.pauseBtn.addEventListener("click", () => this.game.togglePause());
        if (this.userProfileBtn) this.userProfileBtn.addEventListener("click", () => this.openAuthModal());
        if (this.downloadBtn) this.downloadBtn.addEventListener("click", () => this.downloadGame());
        if (this.leaderboardBtn) this.leaderboardBtn.addEventListener("click", () => this.openLeaderboardModal());

        // Home screen arena banner
        const arenaBanner = document.getElementById("home-arena-banner");
        if (arenaBanner) arenaBanner.addEventListener("click", () => this.openArenaModal());

        // Pause Modal buttons
        const resumeBtn = document.getElementById("btn-resume");
        if (resumeBtn) resumeBtn.addEventListener("click", () => this.game.togglePause());
        const pauseRestartBtn = document.getElementById("btn-pause-restart");
        if (pauseRestartBtn) {
            pauseRestartBtn.addEventListener("click", () => {
                this.pauseModal.classList.add("hidden");
                this.game.restartMatch();
            });
        }
        const pauseHomeBtn = document.getElementById("btn-pause-home");
        if (pauseHomeBtn) {
            pauseHomeBtn.addEventListener("click", () => {
                this.pauseModal.classList.add("hidden");
                this.game.goHome();
            });
        }

        // Generic close modal buttons
        document.querySelectorAll(".btn-close-modal").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const modal = e.target.closest(".modal-backdrop");
                if (modal) modal.classList.add("hidden");
            });
        });

        // Automatically close ANY opened modal when clicking outside the window (on backdrop)
        document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
            backdrop.addEventListener("click", (e) => {
                if (e.target === backdrop || !e.target.closest(".modal-card")) {
                    backdrop.classList.add("hidden");
                    sound.playClick();
                }
            });
        });

        this.setupTouchButtons();
    }

    updateMuteButton(isMuted) {
        if (!this.muteBtn) return;
        this.muteBtn.textContent = isMuted ? "Unmute" : "Sound On";
    }

    // ==========================================
    // USER PROFILE & GOOGLE AUTH SYSTEM
    // ==========================================

    setupAuthUI() {
        auth.onUserChanged((user) => {
            this.updateHeaderProfileBadge(user);
            if (this.goldDisplay) {
                this.goldDisplay.textContent = `Gold: ${user.gold || 0}`;
            }
            this.updateHomeProfile(user);
        });

        const profileBanner = document.getElementById("home-profile-banner");
        if (profileBanner) {
            profileBanner.addEventListener("click", () => this.openAuthModal());
        }
    }

    // Always show Steve's head as the cube avatar
    avatarHeadId(user) {
        return "steve";
    }

    updateHomeProfile(user) {
        const cube = document.getElementById("home-cube");
        if (cube) cube.innerHTML = cubeHTML(this.avatarHeadId(user), 56);
        const name = document.getElementById("hp-name");
        if (name) name.textContent = user.username || "Steve";
    }

    updateHeaderProfileBadge(user) {
        if (!this.userProfileBtn) return;

        const avatarHtml = cubeHTML(this.avatarHeadId(user), 22);
        const isGoogle = user.authProvider === "google";
        const googleTag = isGoogle ? `<span class="google-pill-tag">G</span>` : "";

        this.userProfileBtn.innerHTML = `
            ${avatarHtml}
            <span class="header-username">${user.username || "Steve"}</span>
            ${googleTag}
            <span class="header-level-badge">Lv.${user.level}</span>
        `;
    }

    openAuthModal() {
        if (!this.authModal) return;
        this.renderAuthModalContent();
        this.authModal.classList.remove("hidden");
        sound.playClick();
    }

    renderAuthModalContent() {
        const user = auth.getUser();
        const isGoogle = user.authProvider === "google";
        const rankTitle = auth.getRankTitle();

        // Google Auth Section
        const googleSection = document.getElementById("auth-google-section");
        if (googleSection) {
            if (isGoogle) {
                googleSection.innerHTML = `
                    <div class="google-connected-box">
                        <div class="google-user-info">
                            <span class="google-check-icon">OK</span>
                            <div>
                                <div class="google-name">${user.email ? user.email : "Connected Google Account"}</div>
                                <div class="google-status">Google Account Connected</div>
                            </div>
                        </div>
                        <button id="btn-google-signout" class="btn-ctrl btn-signout">Sign Out</button>
                    </div>
                `;
                document.getElementById("btn-google-signout")?.addEventListener("click", () => {
                    auth.signOut();
                    sound.playClick();
                    this.renderAuthModalContent();
                });
            } else {
                googleSection.innerHTML = `
                    <button id="btn-google-signin" class="btn-google-signin">
                        <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Sign in with Google</span>
                    </button>
                    <p class="google-disclaimer">Link your Google account to sync your profile across devices.</p>
                `;
                document.getElementById("btn-google-signin")?.addEventListener("click", () => {
                    this.triggerGoogleSignInFlow();
                });
            }
        }

        // Username Section
        const usernameInput = document.getElementById("input-username");
        const usernameFeedback = document.getElementById("username-feedback");
        if (usernameInput) usernameInput.value = user.username || "Steve";

        const btnRandom = document.getElementById("btn-random-username");
        if (btnRandom) {
            btnRandom.onclick = () => {
                const randomName = auth.getRandomUsername();
                if (usernameInput) usernameInput.value = randomName;
                sound.playClick();
            };
        }

        const btnSaveUsername = document.getElementById("btn-save-username");
        if (btnSaveUsername) {
            btnSaveUsername.onclick = () => {
                if (!usernameInput) return;
                const result = auth.setUsername(usernameInput.value);
                if (result.success) {
                    if (usernameFeedback) {
                        usernameFeedback.textContent = "Username saved successfully!";
                        usernameFeedback.className = "form-feedback success";
                    }
                    sound.playClick();
                } else {
                    if (usernameFeedback) {
                        usernameFeedback.textContent = result.error;
                        usernameFeedback.className = "form-feedback error";
                    }
                }
            };
        }

        // Avatar Picker - Always Steve's Head
        const avatarPickerContainer = document.getElementById("avatar-picker-grid");
        if (avatarPickerContainer) {
            avatarPickerContainer.innerHTML = `
                <div class="avatar-choice selected" style="cursor:default;" title="Minecraft Steve">
                    ${cubeHTML("steve", 48)}
                </div>
                <div style="display:flex; flex-direction:column; justify-content:center; margin-left:10px;">
                    <span style="font-weight:bold; color:var(--text-primary); font-size:14px;">Steve's Cube Head</span>
                    <span style="font-size:12px; color:var(--text-muted);">Hero Avatar</span>
                </div>
            `;
        }

        // Career Stats
        const statsContainer = document.getElementById("auth-career-stats");
        if (statsContainer) {
            const s = user.stats;
            const winRate = s.matches > 0 ? ((s.wins / s.matches) * 100).toFixed(1) : "0.0";
            const xpInLevel = user.xp % 200;
            const tier = arena.getTier(user.arenaRP || 250);

            statsContainer.innerHTML = `
                <div class="career-header">
                    <div class="career-rank-badge">
                        <span class="rank-name" style="color:${tier.color}">${tierPipHTML(tier)} ${tier.name} Tier</span>
                        <span class="level-pill">Level ${user.level}</span>
                    </div>
                    <div class="xp-bar-wrapper">
                        <div class="xp-label">XP: ${xpInLevel} / 200</div>
                        <div class="xp-track">
                            <div class="xp-fill" style="width: ${(xpInLevel / 200) * 100}%"></div>
                        </div>
                    </div>
                </div>
                <div class="career-stats-grid">
                    <div class="career-stat-card">
                        <span class="cs-val">${user.gold || 0}</span>
                        <span class="cs-label">Gold</span>
                    </div>
                    <div class="career-stat-card">
                        <span class="cs-val" style="color:#00d2d3">${user.arenaRP || 250}</span>
                        <span class="cs-label">Arena RP</span>
                    </div>
                    <div class="career-stat-card">
                        <span class="cs-val" style="color:#2ecc71">${s.wins}</span>
                        <span class="cs-label">Victories</span>
                    </div>
                    <div class="career-stat-card">
                        <span class="cs-val" style="color:#f1c40f">${winRate}%</span>
                        <span class="cs-label">Win Rate</span>
                    </div>
                    <div class="career-stat-card">
                        <span class="cs-val">${s.slamsLanded}</span>
                        <span class="cs-label">Mace Slams</span>
                    </div>
                    <div class="career-stat-card">
                        <span class="cs-val" style="color:#e67e22">${s.maxSlamDamage.toFixed(0)}</span>
                        <span class="cs-label">Max Slam DMG</span>
                    </div>
                </div>
            `;
        }
    }

    triggerGoogleSignInFlow() {
        sound.playClick();
        if (window.google && window.google.accounts && window.GOOGLE_CLIENT_ID) {
            try {
                window.google.accounts.id.prompt();
                return;
            } catch (e) {
                console.warn("GIS prompt fallback:", e);
            }
        }

        const googleMockModal = document.getElementById("google-mock-modal");
        if (googleMockModal) {
            googleMockModal.classList.remove("hidden");
            this.setupGoogleMockOptions();
        }
    }

    setupGoogleMockOptions() {
        const demoAccounts = [
            { name: "Steve Gamer", email: "steve.craft@gmail.com", avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80" },
            { name: "Alex Champion", email: "alex.aerial@gmail.com", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" }
        ];

        const container = document.getElementById("google-account-list");
        if (!container) return;

        container.innerHTML = "";
        demoAccounts.forEach((acc) => {
            const item = document.createElement("div");
            item.className = "google-acc-row";
            item.innerHTML = `
                <img src="${acc.avatar}" alt="${acc.name}" class="google-acc-img">
                <div class="google-acc-text">
                    <div class="google-acc-name">${acc.name}</div>
                    <div class="google-acc-email">${acc.email}</div>
                </div>
            `;
            item.addEventListener("click", () => {
                auth.signInWithGoogleData({
                    id: Math.floor(Math.random() * 1000000).toString(),
                    name: acc.name,
                    email: acc.email,
                    picture: acc.avatar
                });
                document.getElementById("google-mock-modal")?.classList.add("hidden");
                sound.playClick();
                this.renderAuthModalContent();
            });
            container.appendChild(item);
        });

        const customBtn = document.getElementById("btn-custom-google-signin");
        const customInput = document.getElementById("input-custom-google-email");
        if (customBtn && customInput) {
            customBtn.onclick = () => {
                const email = customInput.value.trim() || "player@gmail.com";
                const handle = email.split("@")[0] || "GooglePlayer";
                auth.signInWithGoogleData({
                    id: Math.floor(Math.random() * 1000000).toString(),
                    name: handle,
                    email: email,
                    picture: null
                });
                document.getElementById("google-mock-modal")?.classList.add("hidden");
                sound.playClick();
                this.renderAuthModalContent();
            };
        }
    }

    // ==========================================
    // UNIFIED MINECRAFT INVENTORY, CRAFTING, ARMORY & SKINS
    // ==========================================

    setupInventoryUI() {
        this.tabWeapons = document.getElementById("tab-inv-weapons");
        this.tabCraft = document.getElementById("tab-inv-craft");
        this.tabSkins = document.getElementById("tab-inv-skins");

        this.panelWeapons = document.getElementById("inv-panel-weapons");
        this.panelCraft = document.getElementById("inv-panel-craft");
        this.panelSkins = document.getElementById("inv-panel-skins");

        this.tabWeapons?.addEventListener("click", () => this.switchInventoryTab("weapons"));
        this.tabCraft?.addEventListener("click", () => this.switchInventoryTab("craft"));
        this.tabSkins?.addEventListener("click", () => this.switchInventoryTab("skins"));
    }

    setupArmoryUI() {}
    setupSkinsUI() {}

    switchInventoryTab(tab) {
        [this.tabWeapons, this.tabCraft, this.tabSkins].forEach(t => t?.classList.remove("active"));
        [this.panelWeapons, this.panelCraft, this.panelSkins].forEach(p => p?.classList.add("hidden"));

        if (tab === "craft") {
            this.tabCraft?.classList.add("active");
            this.panelCraft?.classList.remove("hidden");
            this.renderCraftingTabContent();
        } else if (tab === "skins") {
            this.tabSkins?.classList.add("active");
            this.panelSkins?.classList.remove("hidden");
            this.renderSkinsModalContent();
        } else {
            this.tabWeapons?.classList.add("active");
            this.panelWeapons?.classList.remove("hidden");
            this.renderHotbarSlots();
            this.renderWeaponsModalContent();
        }
        sound.playClick();
    }

    openInventoryModal(tab = "weapons") {
        if (!this.inventoryModal) return;
        this.inventoryModal.classList.remove("hidden");
        this.switchInventoryTab(tab);
    }

    toggleInventoryModal() {
        if (!this.inventoryModal) return;
        if (this.inventoryModal.classList.contains("hidden")) {
            this.openInventoryModal("weapons");
        } else {
            this.inventoryModal.classList.add("hidden");
            sound.playClick();
        }
    }

    openWeaponsModal() {
        this.openInventoryModal("weapons");
    }

    openSkinsModal() {
        this.openInventoryModal("skins");
    }

    // Minecraft Hotbar & Blank Inventory Slots
    renderHotbarSlots() {
        const container = document.getElementById("mc-hotbar-slots");
        if (!container) return;
        container.innerHTML = "";

        const user = auth.getUser();
        const unlocked = user.unlockedWeapons || ["mace", "spear"];
        const equipped = user.equippedWeapon || "mace";

        // Render 9 slots (Minecraft standard hotbar)
        for (let i = 0; i < 9; i++) {
            const slot = document.createElement("div");
            slot.className = "mc-slot";
            const weaponId = unlocked[i];

            if (weaponId && WEAPON_TYPES[weaponId]) {
                const w = WEAPON_TYPES[weaponId];
                if (weaponId === equipped) {
                    slot.classList.add("active");
                }
                slot.title = `${w.name} (${weaponId === equipped ? 'Equipped' : 'Click to Equip'})`;
                slot.innerHTML = `
                    ${weaponIconHTML(weaponId, 28)}
                    <span class="mc-slot-num">${i + 1}</span>
                `;
                slot.addEventListener("click", () => {
                    auth.equipWeapon(weaponId);
                    sound.playClick();
                    this.renderHotbarSlots();
                    this.renderWeaponsModalContent();
                });
            } else {
                slot.classList.add("empty");
                slot.title = `Blank Inventory Slot ${i + 1}`;
                slot.innerHTML = `<span class="mc-slot-num" style="opacity:0.35;">${i + 1}</span>`;
            }
            container.appendChild(slot);
        }
    }

    // Minecraft 3x3 Crafting Table & Enchanting Station
    renderCraftingTabContent() {
        const user = auth.getUser();
        const equipped = user.equippedWeapon || "mace";
        const w = WEAPON_TYPES[equipped] || WEAPON_TYPES.mace;

        // Center slot holds the equipped weapon
        const centerSlot = document.getElementById("craft-center-slot");
        if (centerSlot) {
            centerSlot.innerHTML = `${weaponIconHTML(equipped, 32)}`;
            centerSlot.title = `Current Weapon: ${w.name}`;
        }

        // Result slot holds the upgraded / enchanted result
        const resultSlot = document.getElementById("craft-result-slot");
        if (resultSlot) {
            resultSlot.innerHTML = `
                <div style="position:relative; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">
                    ${weaponIconHTML(equipped, 40)}
                    <span style="position:absolute; bottom:2px; right:3px; font-size:10px; color:#55ff55; font-weight:bold; text-shadow:1px 1px 0 #000;">ENCH</span>
                </div>
            `;
            resultSlot.title = `Enchanted ${w.name}`;
        }

        // Populate surrounding crafting slots with authentic Minecraft ingredients
        const craftSlots = document.querySelectorAll(".crafting-3x3 .c-slot:not(.c-slot-center)");
        const ingredients = ["Lapis", "Breeze", "Amethyst", "Diamond", "Gold", "Obsidian", "Netherite", "Emerald"];
        craftSlots.forEach((slot, idx) => {
            if (!slot.innerHTML) {
                const ingName = ingredients[idx % ingredients.length];
                slot.title = `Crafting Catalyst: ${ingName}`;
                slot.innerHTML = `<span style="font-size:9px; color:#aaa; font-family:var(--font-pixel); text-shadow:1px 1px 0 #000;">${ingName[0]}</span>`;
            }
        });

        // Populate Enchantment Upgrades for the equipped weapon
        const container = document.getElementById("crafting-upgrades-container");
        if (!container) return;
        container.innerHTML = "";

        const gold = user.gold || 0;

        const infoCard = document.createElement("div");
        infoCard.className = "weapon-shop-card equipped";
        infoCard.innerHTML = `
            <div class="weapon-shop-header">
                <div class="ws-left">
                    <span class="ws-icon">${weaponIconHTML(w.id, 32)}</span>
                    <div>
                        <div class="ws-title">${w.name} (Active in Crafting Grid)</div>
                        <div class="ws-cat">Tier Upgrades & Enchantments Table</div>
                    </div>
                </div>
                <div class="ws-right">
                    <span class="badge-equipped">IN CRAFTING BENCH</span>
                </div>
            </div>
            <div class="ws-desc">Select enchantments below to upgrade damage, wind propulsion and knockback for this weapon using Gold.</div>
        `;
        container.appendChild(infoCard);

        if (w.upgrades && w.upgrades.length > 0) {
            w.upgrades.forEach(u => {
                const curLvl = user.weaponUpgrades[u.id] || 0;
                const isMax = curLvl >= u.maxLevel;
                const cost = u.costPerLevel * (curLvl + 1);

                const upgCard = document.createElement("div");
                upgCard.className = "weapon-shop-card";
                upgCard.innerHTML = `
                    <div class="weapon-shop-header">
                        <div class="ws-left">
                            <div>
                                <div class="ws-title" style="color:#55ff55;">${u.name}</div>
                                <div class="ws-cat">Tier ${curLvl}/${u.maxLevel}</div>
                            </div>
                        </div>
                        <div class="ws-right">
                            ${isMax ? 
                                `<span class="badge-max">MAX ENCHANTED</span>` : 
                                `<button class="btn-ctrl btn-craft-upgrade" data-upg="${u.id}" data-cost="${cost}" ${gold < cost ? 'disabled' : ''}>
                                    Enchant (${cost} G)
                                </button>`
                            }
                        </div>
                    </div>
                    <div class="ws-desc">${u.desc}</div>
                `;
                container.appendChild(upgCard);
            });

            container.querySelectorAll(".btn-craft-upgrade").forEach(btn => {
                btn.onclick = () => {
                    const res = auth.upgradeWeapon(btn.dataset.upg, parseInt(btn.dataset.cost));
                    if (res.success) {
                        sound.playWin();
                        this.renderCraftingTabContent();
                    } else {
                        alert(res.error);
                    }
                };
            });
        }
    }

    renderWeaponsModalContent() {
        const container = document.getElementById("weapons-list-container");
        if (!container) return;

        const user = auth.getUser();
        const gold = user.gold || 0;
        container.innerHTML = "";

        // Weapons Catalog
        Object.values(WEAPON_TYPES).forEach(w => {
            const isUnlocked = user.unlockedWeapons.includes(w.id);
            const isEquipped = user.equippedWeapon === w.id;

            const card = document.createElement("div");
            card.className = `weapon-shop-card ${isEquipped ? 'equipped' : ''}`;

            card.innerHTML = `
                <div class="weapon-shop-header">
                    <div class="ws-left">
                        <span class="ws-icon">${weaponIconHTML(w.id, 32)}</span>
                        <div>
                            <div class="ws-title">${w.name}</div>
                            <div class="ws-cat">${w.category}</div>
                        </div>
                    </div>
                    <div class="ws-right">
                        ${isEquipped ? 
                            `<span class="badge-equipped">EQUIPPED</span>` :
                            (isUnlocked ? 
                                `<button class="btn-ctrl btn-equip-weap" data-id="${w.id}">Equip</button>` :
                                `<button class="btn-ctrl btn-unlock-weap" data-id="${w.id}" data-cost="${w.baseCost}" ${gold < w.baseCost ? 'disabled' : ''}>
                                    Unlock (${w.baseCost} G)
                                </button>`
                            )
                        }
                    </div>
                </div>
                <div class="ws-desc">${w.desc}</div>
                <div class="ws-stats-row">
                    <span>Base DMG: <b>${w.stats.dashDamage}</b></span>
                    <span>Speed: <b>${w.stats.dashSpeed}</b></span>
                    <span>Recovery: <b>${w.stats.attackCooldown}f</b></span>
                    ${w.stats.arrowDamage ? `<span>Arrow DMG: <b>${w.stats.arrowDamage}</b></span>` : ''}
                </div>
            `;

            container.appendChild(card);
        });

        // Attach Equip / Unlock handlers
        container.querySelectorAll(".btn-equip-weap").forEach(btn => {
            btn.onclick = () => {
                auth.equipWeapon(btn.dataset.id);
                sound.playClick();
                this.renderHotbarSlots();
                this.renderWeaponsModalContent();
            };
        });

        container.querySelectorAll(".btn-unlock-weap").forEach(btn => {
            btn.onclick = () => {
                const res = auth.unlockWeapon(btn.dataset.id, parseInt(btn.dataset.cost));
                if (res.success) {
                    sound.playWin();
                    this.renderHotbarSlots();
                    this.renderWeaponsModalContent();
                } else {
                    alert(res.error);
                }
            };
        });
    }

    renderSkinsModalContent() {
        const container = document.getElementById("skins-grid-container");
        if (!container) return;

        const user = auth.getUser();
        const gold = user.gold || 0;
        container.innerHTML = "";

        BLOCK_FACES.forEach(face => {
            const isUnlocked = user.unlockedSkins.includes(face.id);
            const isEquipped = user.skinId === face.id;

            const card = document.createElement("div");
            card.className = `skin-card ${isEquipped ? 'equipped' : ''}`;
            card.innerHTML = `
                <div class="skin-avatar-preview">${cubeHTML(face.id, 48)}</div>
                <div class="skin-info">
                    <div class="skin-name">${face.name}</div>
                    <div class="skin-desc">${face.desc}</div>
                </div>
                <div class="skin-action">
                    ${isEquipped ?
                        `<span class="badge-equipped">EQUIPPED</span>` :
                        (isUnlocked ?
                            `<button class="btn-ctrl btn-equip-skin" data-id="${face.id}">Equip</button>` :
                            `<button class="btn-ctrl btn-unlock-skin" data-id="${face.id}" data-cost="${face.cost}" ${gold < face.cost ? 'disabled' : ''}>
                                ${face.cost} Gold
                            </button>`
                        )
                    }
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll(".btn-equip-skin").forEach(btn => {
            btn.onclick = () => {
                auth.equipSkin(btn.dataset.id);
                sound.playClick();
                this.renderSkinsModalContent();
            };
        });

        container.querySelectorAll(".btn-unlock-skin").forEach(btn => {
            btn.onclick = () => {
                const res = auth.unlockSkin(btn.dataset.id, parseInt(btn.dataset.cost));
                if (res.success) {
                    sound.playWin();
                    this.renderSkinsModalContent();
                } else {
                    alert(res.error);
                }
            };
        });
    }

    // ==========================================
    // MULTIPLAYER ARENA HUB & LOBBY
    // ==========================================

    setupArenaUI() {
        // Mode pills
        document.querySelectorAll(".arena-mode-pill").forEach(pill => {
            pill.addEventListener("click", () => {
                document.querySelectorAll(".arena-mode-pill").forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
                this.selectedArenaMode = pill.dataset.mode;
                sound.playClick();
            });
        });

        // Weapon select cards in arena
        document.querySelectorAll(".arena-wep-card").forEach(card => {
            card.addEventListener("click", () => {
                document.querySelectorAll(".arena-wep-card").forEach(c => c.classList.remove("selected"));
                card.classList.add("selected");
                this.selectedArenaWeapon = card.dataset.wep;
                sound.playClick();
            });
        });

        // Quick Queue / Find Match button
        const btnQueue = document.getElementById("btn-arena-find-match");
        if (btnQueue) {
            btnQueue.onclick = () => {
                this.startMatchmakingQueue(this.selectedArenaMode, this.selectedArenaWeapon);
            };
        }

        // Host Private Room button
        const btnHost = document.getElementById("btn-host-private");
        if (btnHost) {
            btnHost.onclick = () => {
                const code = arena.generateRoomCode();
                document.getElementById("private-room-code-display").textContent = code;
                document.getElementById("private-room-panel").classList.remove("hidden");
                sound.playClick();
            };
        }

        // Launch Private Match button
        const btnLaunchPrivate = document.getElementById("btn-launch-private");
        if (btnLaunchPrivate) {
            btnLaunchPrivate.onclick = () => {
                this.arenaModal.classList.add("hidden");
                this.game.startArenaTeamMatch(this.selectedArenaMode, this.selectedArenaWeapon);
            };
        }

        // Join Private Room button
        const btnJoin = document.getElementById("btn-join-private");
        const joinInput = document.getElementById("input-join-code");
        if (btnJoin && joinInput) {
            btnJoin.onclick = () => {
                const code = joinInput.value.trim().toUpperCase();
                if (code.length < 5) {
                    alert("Please enter a valid Room Code!");
                    return;
                }
                sound.playWin();
                this.arenaModal.classList.add("hidden");
                this.game.startArenaTeamMatch(this.selectedArenaMode, this.selectedArenaWeapon);
            };
        }
    }

    openArenaModal() {
        if (!this.arenaModal) return;
        this.renderArenaHubContent();
        this.arenaModal.classList.remove("hidden");
        sound.playClick();
    }

    renderArenaHubContent() {
        const user = auth.getUser();
        const tier = arena.getTier(user.arenaRP || 250);

        // Header Rank Banner
        const banner = document.getElementById("arena-rank-banner");
        if (banner) {
            const nextTierRP = tier.id === "obsidian" ? "MAX" : `${tier.maxRP + 1} RP`;
            const currentRP = user.arenaRP || 250;
            const rpProgress = tier.id === "obsidian" ? 100 : Math.min(100, Math.max(0, ((currentRP - tier.minRP) / (tier.maxRP - tier.minRP)) * 100));

            banner.innerHTML = `
                <div class="arb-left">
                    <span class="arb-icon" style="color:${tier.color}">${tierPipHTML(tier)}</span>
                    <div>
                        <div class="arb-tier" style="color:${tier.color}">${tier.name} Division</div>
                        <div class="arb-rp">${currentRP} Rating Points (RP)</div>
                    </div>
                </div>
                <div class="arb-progress">
                    <div class="arb-track">
                        <div class="arb-fill" style="width: ${rpProgress}%; background: ${tier.color};"></div>
                    </div>
                    <div class="arb-next">Next Tier: ${nextTierRP}</div>
                </div>
            `;
        }
    }

    startMatchmakingQueue(matchType, weaponId) {
        if (!this.queueModal) return;
        this.arenaModal.classList.add("hidden");
        this.queueModal.classList.remove("hidden");
        sound.playClick();

        const timerEl = document.getElementById("queue-timer-text");
        const statusEl = document.getElementById("queue-status-text");
        const countEl = document.getElementById("queue-count-text");

        let seconds = 0;
        let count = 1;
        const total = matchType === "5v5" ? 10 : (matchType === "2v2" ? 4 : 2);

        if (statusEl) statusEl.textContent = `Finding players for ${matchType.toUpperCase()}...`;
        if (countEl) countEl.textContent = `1 / ${total} Players`;

        clearInterval(this.queueInterval);
        this.queueInterval = setInterval(() => {
            seconds++;
            if (timerEl) timerEl.textContent = `0:${seconds < 10 ? '0' : ''}${seconds}`;

            // Simulated matchmaking connections
            if (seconds === 1) {
                count = Math.min(total, Math.ceil(total * 0.5));
                if (countEl) countEl.textContent = `${count} / ${total} Players`;
            } else if (seconds === 2) {
                count = Math.min(total, total - 1);
                if (countEl) countEl.textContent = `${count} / ${total} Players`;
            } else if (seconds >= 3) {
                clearInterval(this.queueInterval);
                if (countEl) countEl.textContent = `${total} / ${total} Players`;
                if (statusEl) statusEl.textContent = `MATCH FOUND! Entering Arena...`;
                sound.playWin();

                setTimeout(() => {
                    this.queueModal.classList.add("hidden");
                    this.game.startArenaTeamMatch(matchType, weaponId);
                }, 800);
            }
        }, 800);

        // Cancel queue
        const cancelBtn = document.getElementById("btn-cancel-queue");
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                clearInterval(this.queueInterval);
                this.queueModal.classList.add("hidden");
                this.openArenaModal();
            };
        }
    }

    // ==========================================
    // NATIONAL OBSIDIAN LEADERBOARD
    // ==========================================

    setupLeaderboardUI() {
        // Will render on open
    }

    openLeaderboardModal() {
        if (!this.leaderboardModal) return;
        this.renderLeaderboardContent();
        this.leaderboardModal.classList.remove("hidden");
        sound.playClick();
    }

    renderLeaderboardContent() {
        const container = document.getElementById("leaderboard-list-container");
        if (!container) return;

        const user = auth.getUser();
        const leaderboardData = arena.getLeaderboard(user);
        container.innerHTML = "";

        leaderboardData.forEach(entry => {
            const isUser = !!entry.isUser;
            const tierObj = ARENA_TIERS[entry.tier] || ARENA_TIERS.obsidian;

            const row = document.createElement("div");
            row.className = `leaderboard-row ${isUser ? 'user-highlight' : ''} ${entry.rank <= 3 ? 'top-three' : ''}`;

            let rankBadge = `#${entry.rank}`;
            if (entry.rank === 1) rankBadge = "#1";
            else if (entry.rank === 2) rankBadge = "#2";
            else if (entry.rank === 3) rankBadge = "#3";

            row.innerHTML = `
                <div class="lb-rank">${rankBadge}</div>
                <div class="lb-player">
                    <span class="lb-flag">${headImgHTML(entry.skin || "steve", 22)}</span>
                    <span class="lb-name">${entry.name}</span>
                </div>
                <div class="lb-tier" style="color:${tierObj.color}">
                    <span>${tierPipHTML(tierObj)} ${tierObj.name}</span>
                </div>
                <div class="lb-rp"><b>${entry.rp}</b> RP</div>
                <div class="lb-weapon">${WEAPON_TYPES[entry.weapon]?.name || entry.weapon}</div>
                <div class="lb-winrate">${entry.winRate} Win</div>
            `;
            container.appendChild(row);
        });
    }

    // ==========================================
    // CUSTOM BOT SANDBOX FORM
    // ==========================================

    setupCustomBotForm() {
        const form = document.getElementById("custom-bot-form");
        if (!form) return;

        const sliders = [
            { id: "custom-speed", key: "speed", min: 1, max: 10, step: 0.5, defaultVal: 3.5, label: "Walk Speed" },
            { id: "custom-run-speed", key: "runSpeed", min: 2, max: 14, step: 0.5, defaultVal: 6, label: "Flee Speed" },
            { id: "custom-dash-speed", key: "dashSpeed", min: 15, max: 35, step: 1, defaultVal: 22, label: "Dash Speed" },
            { id: "custom-dash-cooldown", key: "botDashCooldown", min: 0, max: 60, step: 5, defaultVal: 20, label: "Dash Cooldown (frames)" },
            { id: "custom-dash-chance", key: "dashAttackChance", min: 0, max: 100, step: 5, defaultVal: 50, label: "Dash Attack Chance (%)" },
            { id: "custom-dodge-chance", key: "dodgeChance", min: 0, max: 100, step: 5, defaultVal: 80, label: "Slam Dodge Chance (%)" },
            { id: "custom-dash-dodge-chance", key: "dashDodgeChance", min: 0, max: 100, step: 5, defaultVal: 60, label: "Dash Dodge Chance (%)" },
            { id: "custom-slam-chance", key: "slamChance", min: 0, max: 100, step: 5, defaultVal: 95, label: "Mace Slam Chance (%)" },
            { id: "custom-damage-mult", key: "damageMult", min: 0.5, max: 3.0, step: 0.1, defaultVal: 1.5, label: "Damage Dealt Multiplier" },
            { id: "custom-damage-taken", key: "damageTaken", min: 0.2, max: 1.5, step: 0.1, defaultVal: 0.8, label: "Damage Taken Multiplier" },
            { id: "custom-hp", key: "maxHP", min: 50, max: 1500, step: 50, defaultVal: 150, label: "Max HP" }
        ];

        const container = document.getElementById("custom-bot-fields");
        if (container) {
            container.innerHTML = "";
            sliders.forEach((s) => {
                const group = document.createElement("div");
                group.className = "control-group";
                group.innerHTML = `
                    <div class="control-label">
                        <span>${s.label}</span>
                        <span id="${s.id}-val" class="control-value">${s.defaultVal}</span>
                    </div>
                    <input type="range" id="${s.id}" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.defaultVal}" class="slider">
                `;
                container.appendChild(group);

                const input = group.querySelector("input");
                const valDisplay = group.querySelector(".control-value");
                input.addEventListener("input", () => {
                    valDisplay.textContent = input.value;
                });
            });

            const extrasGroup = document.createElement("div");
            extrasGroup.className = "control-group-toggles";
            extrasGroup.innerHTML = `
                <label class="toggle-label">
                    <input type="checkbox" id="custom-air-dash" data-key="airDashRecharge">
                    <span>Instant Air Dash Recharge</span>
                </label>
                <label class="toggle-label">
                    <input type="checkbox" id="custom-climb-height" data-key="climbHeight" checked>
                    <span>Double Jump Climb Height (Higher Slams)</span>
                </label>
                <label class="toggle-label">
                    <input type="checkbox" id="custom-invisible" data-key="invisible">
                    <span>Stealth Camouflage (Periodic Invisibility)</span>
                </label>
            `;
            container.appendChild(extrasGroup);
        }

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const customOverrides = {};

            container.querySelectorAll("input[type=range]").forEach((input) => {
                customOverrides[input.dataset.key] = parseFloat(input.value);
            });

            const airDash = document.getElementById("custom-air-dash");
            if (airDash) customOverrides.airDashRecharge = airDash.checked ? 1 : 0;

            const climb = document.getElementById("custom-climb-height");
            if (climb) customOverrides.climbHeight = climb.checked ? 1 : 0;

            const invis = document.getElementById("custom-invisible");
            if (invis) {
                customOverrides.invisible = invis.checked ? 1 : 0;
                customOverrides.invisEvery = 600;
                customOverrides.invisLength = 240;
            }

            this.customBotModal.classList.add("hidden");
            this.game.startGame("custom", customOverrides);
        });
    }

    openCustomBotModal() {
        if (this.customBotModal) {
            this.customBotModal.classList.remove("hidden");
        }
    }

    openStatsModal() {
        if (!this.statsModal) return;

        const p1 = this.game.player.stats;
        const p2 = this.game.bot.stats;

        const statsBody = document.getElementById("stats-body");
        if (statsBody) {
            statsBody.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-col">
                        <h4>${this.game.playerName || 'PLAYER 1'} (MATCH)</h4>
                        <p>Total Damage Dealt: <b>${p1.damageDealt.toFixed(0)}</b></p>
                        <p>Mace Slams Landed: <b>${p1.slamsLanded}</b></p>
                        <p>Weapon Dashes Landed: <b>${p1.dashesLanded}</b></p>
                        <p>Hardest Mace Slam: <b>${p1.maxSlamDamage.toFixed(0)} DMG</b></p>
                        <p>Peak Altitude: <b>${Math.round(p1.maxHeight)} px</b></p>
                    </div>
                    <div class="stat-col">
                        <h4>${this.game.mode === 'pvp' ? 'PLAYER 2' : 'BOT'}</h4>
                        <p>Total Damage Dealt: <b>${p2.damageDealt.toFixed(0)}</b></p>
                        <p>Mace Slams Landed: <b>${p2.slamsLanded}</b></p>
                        <p>Weapon Dashes Landed: <b>${p2.dashesLanded}</b></p>
                        <p>Hardest Mace Slam: <b>${p2.maxSlamDamage.toFixed(0)} DMG</b></p>
                        <p>Peak Altitude: <b>${Math.round(p2.maxHeight)} px</b></p>
                    </div>
                </div>
            `;
        }

        this.statsModal.classList.remove("hidden");
    }

    setupTouchButtons() {
        const bindButton = (id, onDown, onUp) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const start = (e) => {
                e.preventDefault();
                sound.ensureContext();
                onDown();
            };
            const end = (e) => {
                e.preventDefault();
                onUp();
            };

            btn.addEventListener("touchstart", start, { passive: false });
            btn.addEventListener("touchend", end, { passive: false });
            btn.addEventListener("mousedown", start);
            btn.addEventListener("mouseup", end);
        };

        bindButton("touch-left", 
            () => { this.game.keys["ArrowLeft"] = true; },
            () => { this.game.keys["ArrowLeft"] = false; }
        );
        bindButton("touch-right", 
            () => { this.game.keys["ArrowRight"] = true; },
            () => { this.game.keys["ArrowRight"] = false; }
        );
        bindButton("touch-jump", 
            () => { this.game.player.jump(); },
            () => {}
        );
        bindButton("touch-dash", 
            () => { this.game.player.dash(null, true, null, this.game.arrowManager); },
            () => {}
        );
        bindButton("touch-slam", 
            () => { this.game.player.slam(); },
            () => {}
        );
    }

    detectTouchDevice() {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isTouch && this.touchControls) {
            this.touchControls.classList.remove("hidden");
        }
    }

    onStateChanged(state) {
        if (state === "menu") {
            if (this.menuOverlay) this.menuOverlay.classList.remove("hidden");
            if (this.pauseModal) this.pauseModal.classList.add("hidden");
        } else if (state === "play") {
            if (this.menuOverlay) this.menuOverlay.classList.add("hidden");
            if (this.pauseModal) this.pauseModal.classList.add("hidden");
        } else if (state === "paused") {
            if (this.pauseModal) this.pauseModal.classList.remove("hidden");
        }
    }

    downloadGame() {
        sound.playClick();
        // Fetch pre-built standalone HTML file or trigger direct download
        fetch("spear-mace-pvp.html")
            .then(res => {
                if (!res.ok) throw new Error("Fetch failed");
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "spear-mace-pvp.html";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            })
            .catch(() => {
                const a = document.createElement("a");
                a.href = "spear-mace-pvp.html";
                a.download = "spear-mace-pvp.html";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
    }
}
