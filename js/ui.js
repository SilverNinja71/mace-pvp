// ==========================================
// SPEAR-MACE PVP - UI & Menu System
// Manages Home Screen, Mode Selection, Modals, Custom Bot Sandbox,
// Google Sign-In, Username / Profile Page, Armory, Skins,
// Arena Hub (1v1, 2v2, 5v5), and National Obsidian Leaderboard
// ==========================================

import { MODE_METADATA, BOT_SETTINGS, CLASSES } from './config.js';
import { sound } from './audio.js';
import { auth, AVATAR_PRESETS, BLOCK_FACES } from './auth.js';
import { WEAPON_TYPES } from './weapons.js';
import { arena, ARENA_TIERS } from './arena.js';
import { online } from './online.js';
import { cubeHTML, headImgHTML, presetHeadId, tierPipHTML, weaponIconHTML, applyMinecraftBackground } from './pixel.js';

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
        this.socialModal = document.getElementById("social-modal");
        this.resignModal = document.getElementById("resign-modal");
        this.matchmakingModal = document.getElementById("matchmaking-modal");

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
        this.socialBtn = document.getElementById("btn-social");
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
        this.matchmakingInterval = null;

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
        this.setupResultsUI();
        this.handleInviteLinkOnLoad();
        this.setupSocialUI();
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
                    this.launchMatchWithLoading(modeKey);
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
        // Settings dropdown in the header
        const settingsBtn = document.getElementById("btn-settings");
        const settingsMenu = document.getElementById("settings-menu");
        if (settingsBtn && settingsMenu) {
            const setOpen = (open) => {
                settingsMenu.classList.toggle("hidden", !open);
                settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
            };
            settingsBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                setOpen(settingsMenu.classList.contains("hidden"));
            });
            document.addEventListener("click", (e) => {
                if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) setOpen(false);
            });
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape") setOpen(false);
            });
        }

        this.themeBtn = document.getElementById("btn-theme");
        this.currentBiome = "space";
        if (this.themeBtn) {
            this.themeBtn.addEventListener("click", () => {
                const biomes = ["space", "overworld", "nether", "end"];
                const nextIdx = (biomes.indexOf(this.currentBiome) + 1) % biomes.length;
                this.currentBiome = biomes[nextIdx];
                const capitalized = this.currentBiome.charAt(0).toUpperCase() + this.currentBiome.slice(1);
                this.themeBtn.textContent = `Theme: ${capitalized}`;
                this.game.renderer.setBiome(this.currentBiome);
                applyMinecraftBackground(this.currentBiome);
                sound.playClick();
            });
        }

        // Screen Size Toggle (Big Screen / Maximum)
        const arenaContainer = document.getElementById("arena-container") || document.querySelector(".arena-container");
        this.screenSizeBtn = document.getElementById("btn-screen-size");
        this.hudScreenBtn = document.getElementById("btn-hud-screen");
        let isScreenMax = false;
        const toggleScreenSize = () => {
            isScreenMax = !isScreenMax;
            if (arenaContainer) {
                arenaContainer.classList.toggle("screen-max", isScreenMax);
            }
            if (this.screenSizeBtn) {
                this.screenSizeBtn.textContent = isScreenMax ? "Screen: Max" : "Screen: Big";
            }
            if (this.hudScreenBtn) {
                this.hudScreenBtn.textContent = isScreenMax ? "⛶ Standard" : "⛶ Max";
            }
            this.game.renderer.setupDPI();
            sound.playClick();
        };
        if (this.screenSizeBtn) this.screenSizeBtn.addEventListener("click", toggleScreenSize);
        if (this.hudScreenBtn) this.hudScreenBtn.addEventListener("click", toggleScreenSize);

        // Arena Top Quick Action Buttons
        const hudHomeBtn = document.getElementById("btn-hud-home");
        const hudPauseBtn = document.getElementById("btn-hud-pause");
        const hudRestartBtn = document.getElementById("btn-hud-restart");

        if (hudHomeBtn) {
            hudHomeBtn.addEventListener("click", () => {
                this.handleHomeClick();
            });
        }
        if (hudPauseBtn) {
            hudPauseBtn.addEventListener("click", () => {
                this.game.togglePause();
            });
        }
        if (hudRestartBtn) {
            hudRestartBtn.addEventListener("click", () => {
                this.triggerMatchmakingRestart();
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
        if (this.homeBtn) this.homeBtn.addEventListener("click", () => this.handleHomeClick());
        if (this.restartBtn) this.restartBtn.addEventListener("click", () => this.triggerMatchmakingRestart());
        if (this.pauseBtn) this.pauseBtn.addEventListener("click", () => this.game.togglePause());
        if (this.userProfileBtn) this.userProfileBtn.addEventListener("click", () => this.openAuthModal());
        if (this.socialBtn) this.socialBtn.addEventListener("click", () => this.openSocialModal());
        if (this.downloadBtn) this.downloadBtn.addEventListener("click", () => this.downloadGame());
        if (this.leaderboardBtn) this.leaderboardBtn.addEventListener("click", () => this.openLeaderboardModal());

        // Multiplayer resignation modal buttons
        const cancelResignBtn = document.getElementById("btn-cancel-resign");
        if (cancelResignBtn) cancelResignBtn.addEventListener("click", () => {
            if (this.resignModal) this.resignModal.classList.add("hidden");
        });
        const confirmResignBtn = document.getElementById("btn-confirm-resign");
        if (confirmResignBtn) confirmResignBtn.addEventListener("click", () => this.confirmResign());

        // Matchmaking queue modal buttons
        const cancelMatchmakingBtn = document.getElementById("btn-cancel-matchmaking");
        if (cancelMatchmakingBtn) cancelMatchmakingBtn.addEventListener("click", () => this.cancelMatchmaking());

        // Stats modal action buttons
        const statsPlayAgainBtn = document.getElementById("btn-stats-play-again");
        if (statsPlayAgainBtn) statsPlayAgainBtn.addEventListener("click", () => this.triggerMatchmakingRestart());
        const statsHomeBtn = document.getElementById("btn-stats-home");
        if (statsHomeBtn) statsHomeBtn.addEventListener("click", () => {
            if (this.statsModal) this.statsModal.classList.add("hidden");
            this.game.goHome();
        });

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
                this.triggerMatchmakingRestart();
            });
        }
        const pauseHomeBtn = document.getElementById("btn-pause-home");
        if (pauseHomeBtn) {
            pauseHomeBtn.addEventListener("click", () => {
                this.pauseModal.classList.add("hidden");
                this.handleHomeClick();
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
                // Ignore clicks on buttons that were re-rendered (removed from the page) mid-click
                if (e.target === backdrop || (e.target.isConnected && !e.target.closest(".modal-card"))) {
                    backdrop.classList.add("hidden");
                    sound.playClick();
                }
            });
        });

        this.setupTouchButtons();

        // Wire game callbacks to ui
        if (this.game) {
            this.game.uiCallbacks = this.game.uiCallbacks || {};
            this.game.uiCallbacks.onStartModeRequested = (mode) => this.launchMatchWithLoading(mode);
            this.game.uiCallbacks.onRestartRequested = () => this.triggerMatchmakingRestart();
            this.game.uiCallbacks.onHomeRequested = () => this.handleHomeClick();
        }
    }

    updateMuteButton(isMuted) {
        if (!this.muteBtn) return;
        this.muteBtn.textContent = isMuted ? "Sound: Off" : "Sound: On";
    }

    // ==========================================
    // USER PROFILE & GOOGLE AUTH SYSTEM
    // ==========================================

    setupAuthUI() {
        // Refresh the profile screen after Google's sign-in popup finishes
        auth.onGoogleSignIn = () => {
            sound.playClick();
            if (this.authModal && !this.authModal.classList.contains("hidden")) this.renderAuthModalContent();
        };

        auth.onUserChanged((user) => {
            this.updateHeaderProfileBadge(user);
            if (this.goldDisplay) {
                this.goldDisplay.textContent = `Gold: ${user.gold || 0}`;
            }
            this.updateHomeProfile(user);

            // Dynamically refresh open inventory tab so buy buttons update to gold
            if (this.inventoryModal && !this.inventoryModal.classList.contains("hidden")) {
                if (this.tabCraft && this.tabCraft.classList.contains("active")) {
                    this.renderCraftingTabContent();
                } else if (this.tabSkins && this.tabSkins.classList.contains("active")) {
                    this.renderSkinsModalContent();
                } else {
                    this.renderWeaponsModalContent();
                }
            }
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
                if (auth.isGoogleConfigured()) {
                    googleSection.innerHTML = `
                        <div id="google-signin-button" class="google-signin-button">Loading Google sign-in...</div>
                        <p class="google-disclaimer">Sign in with your Google account. Your progress is saved in this browser.</p>
                    `;
                    auth.renderGoogleButton(document.getElementById("google-signin-button"));
                } else {
                    googleSection.innerHTML = `
                        <p class="google-disclaimer">Google sign-in isn't set up yet.</p>
                    `;
                }
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
                        <span class="cs-val">${s.matches || 0}</span>
                        <span class="cs-label">Matches</span>
                    </div>
                    <div class="career-stat-card">
                        <span class="cs-val" style="color:#ff7675">${s.kills || 0}</span>
                        <span class="cs-label">Total KOs</span>
                    </div>
                    <div class="career-stat-card">
                        <span class="cs-val">${Math.round(s.damageDealt || 0)}</span>
                        <span class="cs-label">Damage Dealt</span>
                    </div>
                    <div class="career-stat-card">
                        <span class="cs-val">${s.bestStreak || 0}</span>
                        <span class="cs-label">Best Win Streak</span>
                    </div>
                    <div class="career-stat-card">
                        <span class="cs-val">${s.slamsLanded || 0}</span>
                        <span class="cs-label">Slams Landed</span>
                    </div>
                    <div class="career-stat-card">
                        <span class="cs-val" style="color:#e67e22">${Math.round(s.maxSlamDamage || 0)}</span>
                        <span class="cs-label">Max Slam DMG</span>
                    </div>
                </div>
            `;
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
                } else if (weaponId === user.secondaryWeapon) {
                    slot.classList.add("secondary");
                }
                slot.title = `${w.name}: ${weaponId === equipped ? 'Slot 1' : (weaponId === user.secondaryWeapon ? 'Slot 2' : 'click = Slot 1, right-click = Slot 2')}`;
                slot.innerHTML = `
                    ${weaponIconHTML(weaponId, 28)}
                    <span class="mc-slot-num">${i + 1}</span>
                `;
                slot.addEventListener("click", () => {
                    auth.equipWeapon(weaponId, 1);
                    sound.playClick();
                    this.renderHotbarSlots();
                    this.renderWeaponsModalContent();
                });
                slot.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    auth.equipWeapon(weaponId, 2);
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
                                `<button class="btn-ctrl btn-craft-upgrade ${gold >= cost ? 'btn-can-buy' : ''}" data-upg="${u.id}" data-cost="${cost}" ${gold < cost ? 'disabled' : ''}>
                                    ${gold >= cost ? '⭐ ' : ''}Enchant (${cost} G)
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

    // Class picker (Normal / Shadow / Lightning / Energy) at the top of the Inventory
    renderClassPicker() {
        const box = document.getElementById("class-picker");
        const desc = document.getElementById("class-desc");
        if (!box) return;
        const current = auth.getUser().classId || "normal";
        box.innerHTML = Object.entries(CLASSES).map(([id, c]) =>
            `<button type="button" class="btn-ctrl class-btn class-${id} ${id === current ? "selected" : ""}" role="radio" aria-checked="${id === current}" data-class="${id}">${c.name}</button>`
        ).join("");
        if (desc) desc.textContent = CLASSES[current].desc;
        box.querySelectorAll(".class-btn").forEach(btn => {
            btn.onclick = () => {
                auth.setClass(btn.dataset.class);
                sound.playClick();
                this.renderClassPicker();
            };
        });
    }

    renderWeaponsModalContent() {
        const container = document.getElementById("weapons-list-container");
        if (!container) return;
        this.renderClassPicker();

        const user = auth.getUser();
        const gold = user.gold || 0;
        container.innerHTML = "";

        // Weapons Catalog
        Object.values(WEAPON_TYPES).forEach(w => {
            const isUnlocked = user.unlockedWeapons.includes(w.id);
            const inSlot1 = user.equippedWeapon === w.id;
            const inSlot2 = user.secondaryWeapon === w.id;
            const isEquipped = inSlot1 || inSlot2;

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
                        ${inSlot1 ?
                            `<span class="badge-equipped">SLOT 1</span>` :
                          inSlot2 ?
                            `<span class="badge-equipped badge-slot2">SLOT 2</span>
                             <button class="btn-ctrl btn-clear-slot2" title="Remove from slot 2">Unequip</button>` :
                            (isUnlocked ?
                                `<button class="btn-ctrl btn-equip-weap" data-id="${w.id}" data-slot="1" title="Main weapon">Slot 1</button>
                                 <button class="btn-ctrl btn-equip-weap" data-id="${w.id}" data-slot="2" title="Second weapon (press Q in a match to swap)">Slot 2</button>` :
                                `<button class="btn-ctrl btn-unlock-weap ${gold >= w.baseCost ? 'btn-can-buy' : ''}" data-id="${w.id}" data-cost="${w.baseCost}" ${gold < w.baseCost ? 'disabled' : ''}>
                                    ${gold >= w.baseCost ? '⭐ ' : ''}Unlock (${w.baseCost} G)
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
        container.querySelectorAll(".btn-clear-slot2").forEach(btn => {
            btn.onclick = () => {
                auth.clearSecondaryWeapon();
                sound.playClick();
                this.renderHotbarSlots();
                this.renderWeaponsModalContent();
            };
        });

        container.querySelectorAll(".btn-equip-weap").forEach(btn => {
            btn.onclick = () => {
                auth.equipWeapon(btn.dataset.id, parseInt(btn.dataset.slot) || 1);
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
                            `<button class="btn-ctrl btn-unlock-skin ${gold >= face.cost ? 'btn-can-buy' : ''}" data-id="${face.id}" data-cost="${face.cost}" ${gold < face.cost ? 'disabled' : ''}>
                                ${gold >= face.cost ? '⭐ ' : ''}${face.cost} Gold
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
                const linkInput = document.getElementById("private-room-link");
                if (linkInput) linkInput.value = this.buildRoomLink(code);
                const status = document.getElementById("copy-link-status");
                if (status) status.textContent = "";
                document.getElementById("private-room-panel").classList.remove("hidden");
                sound.playClick();
                this.hostOnlineRoom(code);
            };
        }

        // Copy Invite Link button
        const btnCopyLink = document.getElementById("btn-copy-room-link");
        const linkInput = document.getElementById("private-room-link");
        if (btnCopyLink && linkInput) {
            btnCopyLink.onclick = () => this.copyRoomLink(linkInput);
            // Clicking the link field selects all of it for easy manual copying
            linkInput.addEventListener("focus", () => linkInput.select());
            linkInput.addEventListener("click", () => linkInput.select());
        }

        // Join Private Room button
        const btnJoin = document.getElementById("btn-join-private");
        const joinInput = document.getElementById("input-join-code");
        if (btnJoin && joinInput) {
            btnJoin.onclick = () => {
                const code = this.parseRoomCode(joinInput.value);
                if (!code) {
                    alert("Please enter a valid Room Code or paste an invite link!");
                    return;
                }
                joinInput.value = code;
                sound.playClick();
                this.joinOnlineRoom(code);
            };
        }

        online.onMessage = (msg, peer) => this.handleOnlineMessage(msg, peer);
        online.onDisconnect = (reason, peer) => this.handleOnlineDisconnect(reason, peer);

        const btnOnlineStart = document.getElementById("btn-online-start");
        if (btnOnlineStart) btnOnlineStart.onclick = () => this.hostStartOnlineMatch();
    }

    // ==========================================
    // ONLINE (PEER-TO-PEER) LOBBY
    // ==========================================

    setOnlineStatus(text, isError = false) {
        const el = document.getElementById("online-status");
        if (!el) return;
        el.textContent = text;
        el.classList.toggle("error", isError);
    }

    myOnlineInfo() {
        const user = auth.getUser();
        return {
            name: (user.username || "Player").slice(0, 20),
            skin: user.skinId || "steve",
            weapon: this.selectedArenaWeapon || user.equippedWeapon || "mace",
            weapon2: (user.secondaryWeapon && user.secondaryWeapon !== (this.selectedArenaWeapon || user.equippedWeapon))
                ? user.secondaryWeapon
                : (user.equippedWeapon !== this.selectedArenaWeapon ? user.equippedWeapon : null),
            upgrades: user.weaponUpgrades || {},
            cls: user.classId || "normal"
        };
    }

    // ---- Host lobby: up to 4 players. Join order fills Blue, Red, Blue, Red. ----

    hostOnlineRoom(code) {
        let matchType = this.selectedArenaMode === "1v1" ? "1v1" : "2v2";
        this.lobby = { matchType, players: [{ peer: "host", info: this.myOnlineInfo() }] };
        const note = this.selectedArenaMode === "5v5" ? " (online rooms go up to 2v2)" : "";
        this.setOnlineStatus("Opening room...");
        online.host(code, matchType === "1v1" ? 1 : 3, () => {
            this.setOnlineStatus(matchType === "1v1"
                ? "Room open (1v1). Waiting for your friend to join..."
                : `Room open (2v2)${note}. Invite up to 3 friends, then press Start. Empty spots become bots.`);
            this.renderOnlineLobby();
        }, (err) => this.setOnlineStatus(err, true));
    }

    joinOnlineRoom(code) {
        this.lobby = null;
        this.renderOnlineLobby();
        this.setOnlineStatus("Connecting to your friend's room...");
        online.join(code, () => {
            this.setOnlineStatus("Connected! Waiting for the host...");
            online.send({ t: "hello", info: this.myOnlineInfo() });
        }, (err) => this.setOnlineStatus(err, true));
    }

    lobbyTeam(index) {
        return index % 2 === 0 ? "blue" : "red";
    }

    // Lobby list shown to everyone; the host also gets the Start button (2v2)
    renderOnlineLobby(players = null, matchType = null) {
        const box = document.getElementById("online-lobby");
        const list = document.getElementById("online-lobby-list");
        const startBtn = document.getElementById("btn-online-start");
        if (!box || !list) return;
        const isHost = online.role === "host" && this.lobby;
        const shown = players || (isHost ? this.lobby.players.map((p, i) => ({ name: p.info.name, team: this.lobbyTeam(i) })) : null);
        const type = matchType || (this.lobby && this.lobby.matchType);
        if (!shown || type !== "2v2") {
            box.classList.add("hidden");
            return;
        }
        box.classList.remove("hidden");
        const escapeHTML = (str) => String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
        const col = (team) => {
            const names = shown.filter(p => p.team === team).map(p => `<li>${escapeHTML(p.name)}</li>`);
            while (names.length < 2) names.push(`<li class="lobby-bot">Bot (empty spot)</li>`);
            return `<div class="lobby-team lobby-${team}"><div class="lobby-team-name">${team === "blue" ? "Blue" : "Red"} Team</div><ul>${names.join("")}</ul></div>`;
        };
        list.innerHTML = col("blue") + col("red");
        if (startBtn) startBtn.classList.toggle("hidden", !isHost);
    }

    broadcastLobby() {
        if (!this.lobby) return;
        online.send({
            t: "lobby",
            matchType: this.lobby.matchType,
            players: this.lobby.players.map((p, i) => ({ name: p.info.name, team: this.lobbyTeam(i) }))
        });
        this.renderOnlineLobby();
    }

    // Builds the match slots (Blue first, then Red); empty 2v2 spots become bots
    buildOnlineSetup() {
        const lobby = this.lobby;
        this.lobby.players[0].info = this.myOnlineInfo(); // host may have changed weapons
        const botInfo = (n) => ({
            name: n,
            skin: ["alex", "zombie", "skeleton", "creeper"][Math.floor(Math.random() * 4)],
            weapon: ["mace", "spear", "sword"][Math.floor(Math.random() * 3)],
            weapon2: null,
            upgrades: {}
        });
        const slotFor = (player, team, botName) => player
            ? { ...player.info, team, peer: player.peer }
            : { ...botInfo(botName), team, peer: null };
        const p = lobby.players;
        if (lobby.matchType === "1v1") {
            return { matchType: "1v1", slots: [slotFor(p[0], "blue"), slotFor(p[1], "red", "Rival Bot")] };
        }
        return {
            matchType: "2v2",
            slots: [
                slotFor(p[0], "blue"), slotFor(p[2], "blue", "Ally Bot"),
                slotFor(p[1], "red", "Rival Bot"), slotFor(p[3], "red", "Rival Bot 2")
            ]
        };
    }

    startOnlineFromMessage(role, setup, you) {
        if (this.arenaModal) this.arenaModal.classList.add("hidden");
        if (this.statsModal) this.statsModal.classList.add("hidden");
        this.hideResultsScreen();
        this.setOnlineStatus("");
        this.game.startOnlineMatch(role, setup, you);
    }

    hostStartOnlineMatch() {
        if (!this.lobby || online.role !== "host") return;
        if (this.lobby.matchType === "1v1" && this.lobby.players.length < 2) return;
        const setup = this.buildOnlineSetup();
        setup.slots.forEach((slot, i) => {
            if (slot.peer && slot.peer !== "host") online.sendTo(slot.peer, { t: "start", setup, you: i });
        });
        this.startOnlineFromMessage("host", setup, 0);
    }

    handleOnlineMessage(msg, peer) {
        if (msg.t === "hello" && online.role === "host" && this.lobby) {
            if (this.lobby.players.some(p => p.peer === peer)) return;
            this.lobby.players.push({ peer, info: msg.info || { name: "Player" } });
            if (this.lobby.matchType === "1v1") {
                this.setOnlineStatus("Friend connected! Starting...");
                this.hostStartOnlineMatch();
            } else {
                this.setOnlineStatus(`${(msg.info && msg.info.name) || "A friend"} joined. Press Start when everyone's in.`);
                this.broadcastLobby();
            }
        } else if (msg.t === "lobby" && online.role === "guest") {
            this.setOnlineStatus("You're in! Waiting for the host to start...");
            this.renderOnlineLobby(msg.players, msg.matchType);
        } else if (msg.t === "full" && online.role === "guest") {
            this.setOnlineStatus("That room is full.", true);
        } else if (msg.t === "start" && online.role === "guest") {
            this.startOnlineFromMessage("guest", msg.setup, msg.you);
        } else if (msg.t === "rematch" && online.role === "host") {
            if (this.game.state === "gameover") this.hostStartOnlineMatch();
        } else {
            this.game.handleNetMessage(msg, peer);
        }
    }

    handleOnlineDisconnect(reason, peer) {
        const inMatch = this.game.mode === "online" && this.game.state !== "menu";
        if (online.role === "host" && this.lobby) {
            const leaving = this.lobby.players.find(p => p.peer === peer);
            this.lobby.players = this.lobby.players.filter(p => p.peer !== peer);
            const name = leaving ? leaving.info.name : "A player";
            if (inMatch && this.game.isTeamMatch) {
                // 2v2 keeps going: a bot takes over their fighter
                this.game.replaceWithBot(peer);
                this.showToast(`${name} left. A bot took over.`);
                return;
            }
            if (!inMatch) {
                this.setOnlineStatus(`${name} left the room.`);
                this.broadcastLobby();
                return;
            }
        }
        if (inMatch) {
            if (this.statsModal) this.statsModal.classList.add("hidden");
            this.game.goHome();
            this.showToast(reason);
        } else {
            this.setOnlineStatus(reason, true);
            this.renderOnlineLobby();
        }
    }

    onlineRematch() {
        if (this.game.state !== "gameover") return;
        if (online.role === "host") {
            this.hostStartOnlineMatch();
        } else if (online.isConnected()) {
            online.send({ t: "rematch" });
            const btn = document.getElementById("btn-results-again");
            if (btn) btn.textContent = "Waiting for host...";
        }
    }

    showToast(text) {
        let toast = document.getElementById("game-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "game-toast";
            toast.className = "game-toast";
            toast.setAttribute("role", "status");
            const container = document.getElementById("arena-container") || document.body;
            container.appendChild(toast);
        }
        toast.textContent = text;
        toast.classList.add("show");
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
    }

    // Shareable invite link for a private room, e.g. https://site/index.html?room=MACE-ABCD-123
    buildRoomLink(code) {
        const base = window.location.href.split(/[?#]/)[0];
        return `${base}?room=${encodeURIComponent(code)}`;
    }

    // Accepts a bare room code or a full pasted invite link and returns the code (or null)
    parseRoomCode(text) {
        let raw = (text || "").trim();
        if (!raw) return null;
        const match = raw.match(/[?&#]room=([^&#\s]+)/i);
        if (match) raw = decodeURIComponent(match[1]);
        const code = raw.toUpperCase().replace(/\s+/g, "");
        return /^[A-Z0-9-]{5,}$/.test(code) ? code : null;
    }

    copyRoomLink(linkInput) {
        const status = document.getElementById("copy-link-status");
        const text = linkInput.value;
        const done = (ok) => {
            if (status) status.textContent = ok ? "Link copied! Send it to a friend." : "Select the link and press Ctrl/Cmd+C to copy.";
            sound.playClick();
        };
        const fallback = () => {
            linkInput.focus();
            linkInput.select();
            let ok = false;
            try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
            done(ok);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => done(true), fallback);
        } else {
            fallback();
        }
    }

    // If the page was opened from an invite link (?room=CODE), open the arena hub with the code filled in
    handleInviteLinkOnLoad() {
        let code = null;
        try {
            code = this.parseRoomCode(window.location.search);
        } catch (e) {
            code = null;
        }
        if (!code) return;
        const joinInput = document.getElementById("input-join-code");
        if (joinInput) joinInput.value = code;
        this.openArenaModal();
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

    // Ranked arena vs bots: go straight to the VS screen (there is no online queue)
    startMatchmakingQueue(matchType, weaponId) {
        if (this.arenaModal) this.arenaModal.classList.add("hidden");
        sound.playClick();
        this.launchArenaMatchWithLoading(matchType, weaponId);
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

        if (!leaderboardData || leaderboardData.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:28px 10px; color:var(--text-muted); font-size:13px; border:2px dashed #444; border-radius:4px; margin:10px 0;">
                    <div style="font-size:26px; margin-bottom:6px;">🛡️</div>
                    <b style="color:#fff;">No ranked players on this device yet</b><br>
                    <span>Play Ranked vs Bots in the Arena to earn RP. Only profiles that have played on this device appear here.</span>
                </div>
            `;
            return;
        }

        leaderboardData.forEach(entry => {
            const isUser = !!entry.isUser;
            const tierObj = ARENA_TIERS[entry.tier] || ARENA_TIERS.obsidian;

            const row = document.createElement("div");
            row.className = `leaderboard-row ${isUser ? 'user-highlight' : ''} ${entry.rank <= 3 ? 'top-three' : ''}`;

            let rankBadge = `#${entry.rank}`;
            if (entry.rank === 1) rankBadge = "👑 #1";
            else if (entry.rank === 2) rankBadge = "🥈 #2";
            else if (entry.rank === 3) rankBadge = "🥉 #3";

            row.innerHTML = `
                <div class="lb-rank">${rankBadge}</div>
                <div class="lb-player">
                    <span class="lb-flag">${headImgHTML(entry.skin || "steve", 22)}</span>
                    <span class="lb-name">${entry.name} ${isUser ? '<span style="color:#55ff55; font-size:10px; margin-left:4px; font-weight:bold;">(YOU)</span>' : ''}</span>
                </div>
                <div class="lb-tier" style="color:${tierObj.color}">
                    <span>${tierPipHTML(tierObj)} ${tierObj.name}</span>
                </div>
                <div class="lb-rp"><b>${entry.rp}</b> RP</div>
                <div class="lb-weapon">${WEAPON_TYPES[entry.weapon]?.name || entry.weapon}</div>
                <div class="lb-winrate">${entry.winRate || '0%'} Win</div>
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
            this.launchMatchWithLoading("custom", customOverrides);
        });
    }

    openCustomBotModal() {
        if (this.customBotModal) {
            this.customBotModal.classList.remove("hidden");
        }
    }

    handleHomeClick() {
        const inMatch = (this.game.state === "play" || this.game.state === "paused");
        const isMultiplayer = this.game.isTeamMatch || this.game.mode === "pvp" || this.game.mode === "online";

        if (inMatch && isMultiplayer) {
            if (this.resignModal) {
                this.resignModal.classList.remove("hidden");
                sound.playClick();
                return;
            }
        }

        this.game.goHome();
    }

    confirmResign() {
        if (this.resignModal) this.resignModal.classList.add("hidden");
        if (this.game.isTeamMatch) {
            auth.recordArenaMatchResult(false, this.game.matchType);
        }
        sound.playLoss();
        this.game.goHome();
    }

    triggerMatchmakingRestart() {
        if (this.game.mode === "online") {
            this.onlineRematch();
            return;
        }
        sound.playClick();
        this.hideResultsScreen();
        if (this.statsModal) this.statsModal.classList.add("hidden");
        if (this.pauseModal) this.pauseModal.classList.add("hidden");

        if (this.game.isTeamMatch) {
            this.launchArenaMatchWithLoading(this.game.matchType, this.game.player.weaponId);
        } else {
            this.launchMatchWithLoading(this.game.mode);
        }
    }

    cancelMatchmaking() {
        if (this.matchmakingInterval) {
            clearInterval(this.matchmakingInterval);
            this.matchmakingInterval = null;
        }
        if (this.matchmakingModal) this.matchmakingModal.classList.add("hidden");
        this.game.goHome();
    }

    // ==========================================
    // MATCHUP LOADING / VS SCREEN (Who vs Who & Ranks)
    // ==========================================
    showMatchLoadingScreen(matchConfig, onStartCallback) {
        const modal = document.getElementById("match-loading-modal");
        if (!modal) {
            onStartCallback();
            return;
        }

        // Close all other overlays so loading stage is pristine
        document.querySelectorAll(".overlay, .modal-backdrop").forEach(m => m.classList.add("hidden"));
        modal.classList.remove("hidden");
        sound.playClick();

        const badgeEl = document.getElementById("ml-match-badge");
        const countEl = document.getElementById("ml-countdown-num");
        const fillEl = document.getElementById("ml-progress-fill");
        const blueRosterEl = document.getElementById("ml-blue-roster");
        const redRosterEl = document.getElementById("ml-red-roster");
        const skipBtn = document.getElementById("btn-skip-loading");

        if (badgeEl) badgeEl.textContent = matchConfig.title || "ARENA MATCH";

        const renderRoster = (fighters, container) => {
            if (!container) return;
            container.innerHTML = fighters.map(f => {
                const weaponData = WEAPON_TYPES[f.weaponId] || WEAPON_TYPES.mace;
                const tierColor = f.tierColor || "#f1c40f";
                const rankText = f.rank || "Bronze I";
                return `
                    <div class="ml-fighter-item ${f.isPlayer ? 'is-player-item' : ''}">
                        <div class="ml-avatar-box">
                            ${headImgHTML(f.skinId || 'steve', 32)}
                        </div>
                        <div class="ml-info-box">
                            <div class="ml-name-row">
                                <span class="ml-fighter-name">${f.name || 'Fighter'}</span>
                                ${f.isPlayer ? '<span class="ml-you-badge">YOU</span>' : ''}
                            </div>
                            <div class="ml-detail-row">
                                <span class="ml-weapon-tag">${weaponIconHTML(f.weaponId || 'mace', 16)} ${weaponData.name}</span>
                                <span class="ml-rank-pill" style="border-color:${tierColor}; background:rgba(0,0,0,0.45);">
                                    <span class="tier-pip" style="background:${tierColor}"></span> ${rankText}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }).join("");
        };

        renderRoster(matchConfig.blueTeam || [], blueRosterEl);
        renderRoster(matchConfig.redTeam || [], redRosterEl);

        let countdown = 3;
        let progress = 0;
        if (countEl) countEl.textContent = countdown;
        if (fillEl) fillEl.style.width = "0%";

        let isFinished = false;
        let timerInterval = null;
        let progressInterval = null;

        const finishLoading = () => {
            if (isFinished) return;
            isFinished = true;
            if (timerInterval) clearInterval(timerInterval);
            if (progressInterval) clearInterval(progressInterval);
            modal.classList.add("hidden");
            sound.playDoubleJump();
            onStartCallback();
        };

        if (skipBtn) {
            skipBtn.onclick = () => finishLoading();
        }

        progressInterval = setInterval(() => {
            progress += 3;
            if (fillEl) fillEl.style.width = `${Math.min(100, progress)}%`;
        }, 50);

        timerInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                if (countEl) countEl.textContent = countdown;
                sound.playClick();
            } else {
                if (countEl) countEl.textContent = "FIGHT!";
                sound.playDash();
                setTimeout(() => finishLoading(), 350);
            }
        }, 750);
    }

    launchMatchWithLoading(modeKey, customOverrides = null) {
        const user = auth.getUser();
        const userTier = arena.getTier(user.arenaRP || 250);
        const botMeta = MODE_METADATA[modeKey] || { name: "Bot" };

        const blueTeam = [{
            name: user.username || "Steve",
            skinId: user.skinId || "steve",
            weaponId: user.equippedWeapon || "mace",
            rank: `${userTier.name} (${user.arenaRP || 250} RP)`,
            tierColor: userTier.color,
            isPlayer: true
        }];

        let botSkin = "alex";
        let botWeapon = "spear";
        let botRank = "Bronze II (450 RP)";
        let botTierColor = "#cd7f32";

        if (modeKey === "practice") {
            botSkin = "steve"; botWeapon = "mace"; botRank = "Training Ring"; botTierColor = "#95a5a6";
        } else if (modeKey === "easy") {
            botSkin = "alex"; botWeapon = "spear"; botRank = "Bronze II (450 RP)"; botTierColor = "#cd7f32";
        } else if (modeKey === "normal") {
            botSkin = "noob"; botWeapon = "sword"; botRank = "Gold I (1,280 RP)"; botTierColor = "#f1c40f";
        } else if (modeKey === "pro") {
            botSkin = "diamond_knight"; botWeapon = "sword"; botRank = "Diamond II (1,840 RP)"; botTierColor = "#00d2d3";
        } else if (modeKey === "god") {
            botSkin = "enderman"; botWeapon = "mace"; botRank = "Obsidian Grandmaster (2,950 RP)"; botTierColor = "#9b59b6";
        } else if (modeKey === "pvp") {
            botSkin = "alex"; botWeapon = "spear"; botRank = "Challenger Red"; botTierColor = "#e74c3c";
        } else if (modeKey === "custom") {
            botSkin = "man_face"; botWeapon = "mace"; botRank = "Custom Bot"; botTierColor = "#e67e22";
        }

        const redTeam = [{
            name: (modeKey === "pvp") ? "Player 2" : `[BOT] ${botMeta.name}`,
            skinId: botSkin,
            weaponId: botWeapon,
            rank: botRank,
            tierColor: botTierColor,
            isPlayer: false
        }];

        this.showMatchLoadingScreen({
            title: `${botMeta.name.toUpperCase()} • 1v1 MATCH`,
            blueTeam,
            redTeam
        }, () => {
            this.game.startGame(modeKey, customOverrides);
        });
    }

    launchArenaMatchWithLoading(matchType, weaponId) {
        const user = auth.getUser();
        const roster = arena.generateTeamRoster(matchType, user, weaponId);

        const blueTeam = roster.blueTeam.map(f => {
            const tier = f.tierId ? ARENA_TIERS[f.tierId] : arena.getTier(f.rp || 250);
            return {
                name: f.name,
                skinId: f.skinId,
                weaponId: f.weaponId,
                rank: `${tier.name} (${f.rp || 250} RP)`,
                tierColor: tier.color,
                isPlayer: f.isPlayer
            };
        });

        const redTeam = roster.redTeam.map(f => {
            const tier = f.tierId ? ARENA_TIERS[f.tierId] : arena.getTier(f.rp || 250);
            return {
                name: f.name,
                skinId: f.skinId,
                weaponId: f.weaponId,
                rank: `${tier.name} (${f.rp || 250} RP)`,
                tierColor: tier.color,
                isPlayer: false
            };
        });

        this.showMatchLoadingScreen({
            title: `ARENA ${matchType.toUpperCase()} RANKED MATCH`,
            blueTeam,
            redTeam
        }, () => {
            this.game.startArenaTeamMatch(matchType, weaponId);
        });
    }

    // ==========================================
    // FRIENDS, MAILBOX & CHILD/MINOR SAFETY UI
    // ==========================================
    setupSocialUI() {
        const modal = this.socialModal;
        if (!modal) return;

        // Tab switching
        const tabBtns = modal.querySelectorAll(".social-tab-btn");
        const tabPanes = modal.querySelectorAll(".tab-pane");
        tabBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                sound.playClick();
                const target = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.toggle("active", b === btn));
                tabPanes.forEach(p => p.classList.toggle("active", p.id === `tab-${target}`));
            });
        });

        // Add friend
        const addBtn = document.getElementById("btn-add-friend");
        const addInput = document.getElementById("input-add-friend");
        const addMsg = document.getElementById("add-friend-msg");
        if (addBtn && addInput) {
            addBtn.addEventListener("click", () => {
                sound.playClick();
                const res = auth.addFriend(addInput.value);
                if (res.success) {
                    addInput.value = "";
                    if (addMsg) {
                        addMsg.style.color = "#2ecc71";
                        addMsg.textContent = `Added ${res.friend.name} to friends!`;
                        setTimeout(() => { if (addMsg) addMsg.textContent = ""; }, 3000);
                    }
                    this.renderFriendsList();
                } else {
                    if (addMsg) {
                        addMsg.style.color = "#e74c3c";
                        addMsg.textContent = res.error || "Could not add friend.";
                    }
                }
            });
        }

        // Send mail & gifts
        const sendBtn = document.getElementById("btn-send-mail");
        const mailTo = document.getElementById("input-mail-to");
        const mailGift = document.getElementById("input-mail-gift");
        const mailText = document.getElementById("input-mail-text");
        const sendMsg = document.getElementById("send-mail-msg");
        if (sendBtn) {
            sendBtn.addEventListener("click", () => {
                sound.playClick();
                const to = mailTo ? mailTo.value : "";
                const gift = mailGift ? parseInt(mailGift.value) || 0 : 0;
                const text = mailText ? mailText.value : "";

                const res = auth.sendMail(to, "Letter from Arena", text, gift);
                if (res.success) {
                    if (mailTo) mailTo.value = "";
                    if (mailGift) mailGift.value = "";
                    if (mailText) mailText.value = "";
                    if (sendMsg) {
                        sendMsg.style.color = "#2ecc71";
                        sendMsg.textContent = "Mail sent successfully!";
                        setTimeout(() => { if (sendMsg) sendMsg.textContent = ""; }, 3000);
                    }
                    this.renderMailbox();
                } else {
                    if (sendMsg) {
                        sendMsg.style.color = "#e74c3c";
                        sendMsg.textContent = res.error || "Failed to send mail.";
                    }
                }
            });
        }

        // Minor safety toggle
        const minorToggle = document.getElementById("toggle-minor-mode");
        if (minorToggle) {
            minorToggle.checked = !!auth.getUser().isMinor;
            minorToggle.addEventListener("change", () => {
                sound.playClick();
                auth.toggleMinorMode(minorToggle.checked);
                this.updateSafetyBadge();
                this.renderMailbox();
            });
        }

        this.renderFriendsList();
        this.renderMailbox();
        this.updateSafetyBadge();
    }

    openSocialModal() {
        if (!this.socialModal) return;
        sound.playClick();
        this.renderFriendsList();
        this.renderMailbox();
        this.updateSafetyBadge();
        this.socialModal.classList.remove("hidden");
    }

    renderFriendsList() {
        const list = document.getElementById("friends-list");
        const countSpan = document.getElementById("friends-count");
        if (!list) return;

        const friends = auth.getFriends();
        if (countSpan) countSpan.textContent = friends.length;

        if (friends.length === 0) {
            list.innerHTML = `<p style="color:var(--text-muted); padding:10px;">No friends added yet. Add players by username above!</p>`;
            return;
        }

        list.innerHTML = friends.map(f => `
            <div class="friend-item">
                <div class="friend-name-col">
                    <span class="friend-status-dot status-${f.status || 'offline'}" title="${f.status}"></span>
                    <strong style="color:#fff;">${f.name}</strong>
                    <span style="font-size:14px; color:var(--text-muted);">(${f.status || 'offline'})</span>
                </div>
                <div class="friend-actions">
                    <button class="btn-ctrl btn-sm-ctrl btn-mail-friend" data-name="${f.name}">Mail / Gift</button>
                    <button class="btn-ctrl btn-sm-ctrl btn-remove-friend" data-id="${f.id}" style="color:#e74c3c;">✕</button>
                </div>
            </div>
        `).join("");

        list.querySelectorAll(".btn-mail-friend").forEach(b => {
            b.addEventListener("click", () => {
                sound.playClick();
                const name = b.dataset.name;
                const mailTo = document.getElementById("input-mail-to");
                if (mailTo) mailTo.value = name;
                const mailboxTabBtn = this.socialModal?.querySelector(".social-tab-btn[data-tab='mailbox']");
                if (mailboxTabBtn) mailboxTabBtn.click();
            });
        });

        list.querySelectorAll(".btn-remove-friend").forEach(b => {
            b.addEventListener("click", () => {
                sound.playClick();
                auth.removeFriend(b.dataset.id);
                this.renderFriendsList();
            });
        });
    }

    renderMailbox() {
        const list = document.getElementById("mail-list");
        const countSpan = document.getElementById("mail-count");
        if (!list) return;

        const mail = auth.getMail();
        if (countSpan) countSpan.textContent = mail.length;

        if (mail.length === 0) {
            list.innerHTML = `<p style="color:var(--text-muted); padding:10px;">Your mailbox is empty.</p>`;
            return;
        }

        list.innerHTML = mail.map(m => {
            const hasGift = (m.giftGold || 0) > 0;
            const giftHtml = hasGift 
                ? (m.claimed 
                    ? `<span style="color:#2ecc71; font-weight:bold; font-size:15px;">Claimed ✓ (+${m.giftGold} G)</span>` 
                    : `<button class="btn-ctrl btn-sm-ctrl btn-claim-gift" data-id="${m.id}" style="background:#f1c40f; color:#000; font-weight:bold;">Claim ${m.giftGold} Gold 🎁</button>`)
                : ``;

            return `
                <div class="mail-item ${hasGift && !m.claimed ? 'has-gift' : ''}">
                    <div class="mail-top-line">
                        <span class="mail-from">From: ${m.from}</span>
                        <span class="mail-date">${m.date || 'Today'}</span>
                    </div>
                    <div class="mail-text ${m.isRestricted ? 'restricted' : ''}">
                        ${m.text}
                    </div>
                    <div class="mail-footer">
                        <div>${giftHtml}</div>
                        <button class="btn-ctrl btn-sm-ctrl btn-del-mail" data-id="${m.id}" style="color:#e74c3c;">Delete</button>
                    </div>
                </div>
            `;
        }).join("");

        list.querySelectorAll(".btn-claim-gift").forEach(b => {
            b.addEventListener("click", () => {
                const res = auth.claimMailGift(b.dataset.id);
                if (res.success) {
                    sound.playWin();
                    this.renderMailbox();
                }
            });
        });

        list.querySelectorAll(".btn-del-mail").forEach(b => {
            b.addEventListener("click", () => {
                sound.playClick();
                auth.deleteMail(b.dataset.id);
                this.renderMailbox();
            });
        });
    }

    updateSafetyBadge() {
        const badge = document.getElementById("safety-status-badge");
        const toggle = document.getElementById("toggle-minor-mode");
        const isMinor = auth.getUser().isMinor;

        if (toggle) toggle.checked = !!isMinor;
        if (badge) {
            if (isMinor) {
                badge.className = "safety-badge active-minor";
                badge.textContent = "Active: Minor Protection Active (Text Mail Hidden, Loot Only)";
            } else {
                badge.className = "safety-badge";
                badge.textContent = "Active: Standard Account (All Mail & Messages Allowed)";
            }
        }
    }

    openStatsModal() {
        if (!this.statsModal) return;

        const p1 = this.game.player;
        // In team matches the head-to-head compares you with the best opponent
        const p2 = this.game.isTeamMatch
            ? this.game.redTeam.slice().sort((a, b) => (b.stats.kills - a.stats.kills) || (b.stats.damageDealt - a.stats.damageDealt))[0]
            : this.game.bot;
        const statsBody = document.getElementById("stats-body");
        if (!statsBody) return;

        const highest = this.game.highestJumper || p1;
        const isTiebreaker = this.game.isTiebreaker;
        const isPlayerWin = this.game.winnerTeam === (this.game.localFighter || p1).team;
        let winner = this.game.winnerTeam === "blue" ? (p1.name || "Steve") : (p2.name || "Opponent");
        if (this.game.isTeamMatch) winner = this.game.winnerTeam === "blue" ? "Blue Team" : "Red Team";
        const rewardInfo = this.game.lastRewardInfo;

        // Calculate Combat Performance Rating (S+, S, A, B, C, D)
        const calcGrade = (fighter, won) => {
            let score = (won ? 50 : 20);
            score += (fighter.stats.kills || 0) * 25;
            score += Math.min(40, (fighter.stats.damageDealt || 0) / 3.5);
            const slams = fighter.stats.slamsLanded || 0;
            const slamAtt = slams + (fighter.stats.slamsMissed || 0);
            if (slamAtt > 0) score += (slams / slamAtt) * 20;
            const dashes = fighter.stats.dashesLanded || 0;
            const dashAtt = dashes + (fighter.stats.dashesMissed || 0);
            if (dashAtt > 0) score += (dashes / dashAtt) * 15;
            if (score >= 95) return { grade: "S+", color: "#f1c40f" };
            if (score >= 80) return { grade: "S", color: "#f39c12" };
            if (score >= 65) return { grade: "A", color: "#00d2d3" };
            if (score >= 50) return { grade: "B", color: "#2ecc71" };
            if (score >= 35) return { grade: "C", color: "#e67e22" };
            return { grade: "D", color: "#e74c3c" };
        };

        const p1Grade = calcGrade(p1, isPlayerWin);
        const p2Grade = calcGrade(p2, !isPlayerWin);

        const p1SlamsLanded = p1.stats.slamsLanded || 0;
        const p1SlamsMissed = Math.max(0, (p1.stats.slamsAttempted || 0) - p1SlamsLanded);
        const p1SlamAcc = (p1SlamsLanded + p1SlamsMissed > 0) 
            ? Math.round((p1SlamsLanded / (p1SlamsLanded + p1SlamsMissed)) * 100) : 0;

        const p2SlamsLanded = p2.stats.slamsLanded || 0;
        const p2SlamsMissed = Math.max(0, (p2.stats.slamsAttempted || 0) - p2SlamsLanded);
        const p2SlamAcc = (p2SlamsLanded + p2SlamsMissed > 0) 
            ? Math.round((p2SlamsLanded / (p2SlamsLanded + p2SlamsMissed)) * 100) : 0;

        const p1DashesLanded = p1.stats.dashesLanded || 0;
        const p1DashesMissed = Math.max(0, (p1.stats.dashesAttempted || 0) - p1DashesLanded);
        const p1DashAcc = (p1DashesLanded + p1DashesMissed > 0)
            ? Math.round((p1DashesLanded / (p1DashesLanded + p1DashesMissed)) * 100) : 0;

        const p2DashesLanded = p2.stats.dashesLanded || 0;
        const p2DashesMissed = Math.max(0, (p2.stats.dashesAttempted || 0) - p2DashesLanded);
        const p2DashAcc = (p2DashesLanded + p2DashesMissed > 0)
            ? Math.round((p2DashesLanded / (p2DashesLanded + p2DashesMissed)) * 100) : 0;

        const p1Dmg = Math.round(p1.stats.damageDealt || 0);
        const p2Dmg = Math.round(p2.stats.damageDealt || 0);
        const totalDmg = Math.max(1, p1Dmg + p2Dmg);
        const p1DmgPct = Math.round((p1Dmg / totalDmg) * 100);

        const p1Alt = Math.round(p1.stats.maxHeight || 0);
        const p2Alt = Math.round(p2.stats.maxHeight || 0);
        const totalAlt = Math.max(1, p1Alt + p2Alt);
        const p1AltPct = Math.round((p1Alt / totalAlt) * 100);

        const p1Wep = WEAPON_TYPES[p1.weaponId] || WEAPON_TYPES.mace;
        const p2Wep = WEAPON_TYPES[p2.weaponId] || WEAPON_TYPES.mace;

        let rewardPills = "";
        if (rewardInfo) {
            rewardPills = `
                <div class="stats-rewards-bar">
                    <span class="reward-pill">+${rewardInfo.goldEarned} Gold</span>
                    <span class="reward-pill xp">+${rewardInfo.xpEarned} XP</span>
                    ${rewardInfo.rpDelta ? `<span class="reward-pill rp">${rewardInfo.rpDelta > 0 ? '+' : ''}${rewardInfo.rpDelta} RP</span>` : ''}
                </div>
            `;
        }

        // Subtitle text
        let subTitle = "";
        if (this.game.isTeamMatch) {
            subTitle = isTiebreaker 
                ? '⚔️ 10-10 Sudden Death Tiebreaker (Highest Damage Won)' 
                : `Final Score: Blue ${this.game.scoreBlue} - Red ${this.game.scoreRed} (First to 11 Kills)`;
        } else {
            const modeMeta = MODE_METADATA[this.game.mode] || {};
            const modeName = modeMeta.name || "Bot";
            subTitle = isPlayerWin ? `1v1 Duel • [${modeName.toUpperCase()}] ELIMINATED!` : `1v1 Duel • DEFEATED BY [${modeName.toUpperCase()}]`;
        }

        const hasBowInvolved = (p1.weaponId === "bow" || p2.weaponId === "bow" || (p1.stats.arrowsHit || 0) > 0 || (p2.stats.arrowsHit || 0) > 0);

        statsBody.innerHTML = `
            <div class="stats-winner-banner ${isPlayerWin ? 'victory' : 'defeat'}">
                <div class="stats-winner-title">👑 ${winner.toUpperCase()} ${isPlayerWin ? 'VICTORY!' : 'WINS!'}</div>
                <div class="stats-score-line">${subTitle}</div>
                ${rewardPills}
            </div>

            <!-- Head-to-Head Combat Cards -->
            <div class="h2h-duel-container">
                <!-- Blue Fighter (YOU) -->
                <div class="h2h-fighter-card h2h-card-blue">
                    <div class="h2h-avatar-box">
                        ${headImgHTML(p1.skinId || 'steve', 40)}
                    </div>
                    <div class="h2h-info-box">
                        <div class="h2h-name-row">
                            <span class="h2h-name">${p1.name || 'You'}</span>
                            <span class="h2h-tag">YOU</span>
                        </div>
                        <div class="h2h-wep-row">
                            ${weaponIconHTML(p1.weaponId || 'mace', 16)} ${p1Wep.name}
                        </div>
                    </div>
                    <div class="h2h-grade-badge" style="border-color:${p1Grade.color}; color:${p1Grade.color};">
                        ${p1Grade.grade}
                    </div>
                </div>

                <div class="h2h-vs-divider">VS</div>

                <!-- Red Fighter (OPPONENT / BOT) -->
                <div class="h2h-fighter-card h2h-card-red">
                    <div class="h2h-avatar-box">
                        ${headImgHTML(p2.skinId || 'alex', 40)}
                    </div>
                    <div class="h2h-info-box">
                        <div class="h2h-name-row">
                            <span class="h2h-tag">FOE</span>
                            <span class="h2h-name">${p2.name || 'Bot'}</span>
                        </div>
                        <div class="h2h-wep-row">
                            ${weaponIconHTML(p2.weaponId || 'spear', 16)} ${p2Wep.name}
                        </div>
                    </div>
                    <div class="h2h-grade-badge" style="border-color:${p2Grade.color}; color:${p2Grade.color};">
                        ${p2Grade.grade}
                    </div>
                </div>
            </div>

            <!-- Head-to-Head Comparative Metric Gauges -->
            <div class="h2h-stats-list">
                <!-- Damage Dealt -->
                <div class="h2h-stat-line">
                    <div class="h2h-stat-left ${p1Dmg >= p2Dmg ? 'winner-stat' : ''}">${p1Dmg} DMG</div>
                    <div class="h2h-stat-center">
                        <span class="h2h-stat-label">Damage Dealt</span>
                        <div class="h2h-bar-track">
                            <div class="h2h-bar-left" style="width: ${p1DmgPct}%;"></div>
                            <div class="h2h-bar-right" style="width: ${100 - p1DmgPct}%;"></div>
                        </div>
                    </div>
                    <div class="h2h-stat-right ${p2Dmg >= p1Dmg ? 'winner-stat' : ''}">${p2Dmg} DMG</div>
                </div>

                <!-- Kills -->
                <div class="h2h-stat-line">
                    <div class="h2h-stat-left ${p1.stats.kills >= p2.stats.kills ? 'winner-stat' : ''}">${p1.stats.kills || 0} Kills</div>
                    <div class="h2h-stat-center">
                        <span class="h2h-stat-label">Eliminations</span>
                    </div>
                    <div class="h2h-stat-right ${p2.stats.kills >= p1.stats.kills ? 'winner-stat' : ''}">${p2.stats.kills || 0} Kills</div>
                </div>

                <!-- Mace Ground Slams -->
                <div class="h2h-stat-line">
                    <div class="h2h-stat-left ${p1SlamsLanded >= p2SlamsLanded ? 'winner-stat' : ''}">
                        ${p1SlamsLanded} <span style="font-size:12px; color:#ff7675;">(${p1SlamsMissed} miss)</span>
                    </div>
                    <div class="h2h-stat-center">
                        <span class="h2h-stat-label">Mace Slams (${p1SlamAcc}% vs ${p2SlamAcc}%)</span>
                    </div>
                    <div class="h2h-stat-right ${p2SlamsLanded >= p1SlamsLanded ? 'winner-stat' : ''}">
                        ${p2SlamsLanded} <span style="font-size:12px; color:#ff7675;">(${p2SlamsMissed} miss)</span>
                    </div>
                </div>

                <!-- Dashes & Attacks -->
                <div class="h2h-stat-line">
                    <div class="h2h-stat-left ${p1DashesLanded >= p2DashesLanded ? 'winner-stat' : ''}">
                        ${p1DashesLanded} <span style="font-size:12px; color:#ff7675;">(${p1DashesMissed} miss)</span>
                    </div>
                    <div class="h2h-stat-center">
                        <span class="h2h-stat-label">Weapon Attacks (${p1DashAcc}% vs ${p2DashAcc}%)</span>
                    </div>
                    <div class="h2h-stat-right ${p2DashesLanded >= p1DashesLanded ? 'winner-stat' : ''}">
                        ${p2DashesLanded} <span style="font-size:12px; color:#ff7675;">(${p2DashesMissed} miss)</span>
                    </div>
                </div>

                <!-- Bow Arrows (if used) -->
                ${hasBowInvolved ? `
                <div class="h2h-stat-line">
                    <div class="h2h-stat-left ${ (p1.stats.arrowsHit || 0) >= (p2.stats.arrowsHit || 0) ? 'winner-stat' : ''}">
                        ${p1.stats.arrowsHit || 0} Hits <span style="font-size:12px; color:#ff7675;">(${p1.stats.arrowsMissed || 0} miss)</span>
                    </div>
                    <div class="h2h-stat-center">
                        <span class="h2h-stat-label">Bow Arrows</span>
                    </div>
                    <div class="h2h-stat-right ${ (p2.stats.arrowsHit || 0) >= (p1.stats.arrowsHit || 0) ? 'winner-stat' : ''}">
                        ${p2.stats.arrowsHit || 0} Hits <span style="font-size:12px; color:#ff7675;">(${p2.stats.arrowsMissed || 0} miss)</span>
                    </div>
                </div>
                ` : ''}

                <!-- Max Single Slam Hit -->
                <div class="h2h-stat-line">
                    <div class="h2h-stat-left ${ (p1.stats.maxSlamDamage || 0) >= (p2.stats.maxSlamDamage || 0) ? 'winner-stat' : ''}">
                        ${Math.round(p1.stats.maxSlamDamage || 0)} DMG
                    </div>
                    <div class="h2h-stat-center">
                        <span class="h2h-stat-label">Max Slam Impact</span>
                    </div>
                    <div class="h2h-stat-right ${ (p2.stats.maxSlamDamage || 0) >= (p1.stats.maxSlamDamage || 0) ? 'winner-stat' : ''}">
                        ${Math.round(p2.stats.maxSlamDamage || 0)} DMG
                    </div>
                </div>

                <!-- Peak Jump Altitude -->
                <div class="h2h-stat-line">
                    <div class="h2h-stat-left ${p1Alt >= p2Alt ? 'winner-stat' : ''}">${p1Alt} px</div>
                    <div class="h2h-stat-center">
                        <span class="h2h-stat-label">Peak Altitude</span>
                        <div class="h2h-bar-track">
                            <div class="h2h-bar-left" style="width: ${p1AltPct}%;"></div>
                            <div class="h2h-bar-right" style="width: ${100 - p1AltPct}%;"></div>
                        </div>
                    </div>
                    <div class="h2h-stat-right ${p2Alt >= p1Alt ? 'winner-stat' : ''}">${p2Alt} px</div>
                </div>
            </div>

            <!-- Altitude Champion Crown -->
            <div class="altitude-champion-box">
                <div class="altitude-crown">👑</div>
                <div class="altitude-info">
                    <h4>ALTITUDE CHAMPION</h4>
                    <p><strong>${highest.name}</strong> dominated the aerial heights at <strong>${Math.round(highest.stats?.maxHeight || 0)} px</strong> peak altitude!</p>
                </div>
            </div>
        `;

        // If team arena match with 3+ players, also append full team roster table
        if (this.game.allFighters && this.game.allFighters.length > 2) {
            let tableRows = "";
            this.game.allFighters.forEach(f => {
                const st = f.stats || {};
                const slamsMissed = Math.max(0, (st.slamsAttempted || 0) - (st.slamsLanded || 0));
                const dashesMissed = Math.max(0, (st.dashesAttempted || 0) - (st.dashesLanded || 0));
                const teamBadge = f.team ? ` [${f.team.toUpperCase()}]` : "";
                tableRows += `
                    <tr>
                        <td><strong>${f.name}${teamBadge}</strong></td>
                        <td style="color:#2ecc71; font-weight:bold;">${st.kills || 0}</td>
                        <td>${st.slamsLanded || 0} <span style="color:#ff7675;">(${slamsMissed}m)</span></td>
                        <td>${st.dashesLanded || 0} <span style="color:#ff7675;">(${dashesMissed}m)</span></td>
                        <td>${Math.round(st.damageDealt || 0)}</td>
                        <td style="color:#00d2d3; font-weight:bold;">${Math.round(st.maxHeight || 0)} px</td>
                    </tr>
                `;
            });
            const tableHtml = `
                <div class="stats-table-container">
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>Squad Member</th>
                                <th>Kills</th>
                                <th>Slams</th>
                                <th>Dashes</th>
                                <th>Damage</th>
                                <th>Peak</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;
            statsBody.insertAdjacentHTML("beforeend", tableHtml);
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

        // A / D are Player 1's keys in every mode (arrows belong to Player 2 in local PvP)
        bindButton("touch-left",
            () => { this.game.keys["KeyA"] = true; },
            () => { this.game.keys["KeyA"] = false; }
        );
        bindButton("touch-right",
            () => { this.game.keys["KeyD"] = true; },
            () => { this.game.keys["KeyD"] = false; }
        );
        bindButton("touch-jump", () => this.game.localAction("jump"), () => {});
        bindButton("touch-dash", () => this.game.localAttack(), () => {});
        bindButton("touch-slam", () => this.game.localAction("slam"), () => {});
        bindButton("touch-swap", () => this.game.localAction("swap"), () => {});
    }

    detectTouchDevice() {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isTouch && this.touchControls) {
            this.touchControls.classList.remove("hidden");
        }
    }

    onStateChanged(state) {
        if (state !== "gameover") this.hideResultsScreen();
        if (state === "menu") {
            if (this.menuOverlay) this.menuOverlay.classList.remove("hidden");
            if (this.pauseModal) this.pauseModal.classList.add("hidden");
            if (this.statsModal) this.statsModal.classList.add("hidden");
        } else if (state === "play") {
            if (this.menuOverlay) this.menuOverlay.classList.add("hidden");
            if (this.pauseModal) this.pauseModal.classList.add("hidden");
            if (this.statsModal) this.statsModal.classList.add("hidden");
        } else if (state === "paused") {
            if (this.pauseModal) this.pauseModal.classList.remove("hidden");
        } else if (state === "gameover") {
            this.openResultsScreen();
        }
    }

    // ==========================================
    // SMASH-STYLE RESULTS SCREEN
    // ==========================================

    setupResultsUI() {
        this.resultsScreen = document.getElementById("results-screen");
        this.resultsTimer = null;

        const again = document.getElementById("btn-results-again");
        if (again) again.addEventListener("click", () => this.triggerMatchmakingRestart());
        const details = document.getElementById("btn-results-details");
        if (details) details.addEventListener("click", () => this.openStatsModal());
        const home = document.getElementById("btn-results-home");
        if (home) home.addEventListener("click", () => this.handleHomeClick());
    }

    hideResultsScreen() {
        if (this.resultsTimer) {
            clearTimeout(this.resultsTimer);
            this.resultsTimer = null;
        }
        if (this.resultsScreen) this.resultsScreen.classList.add("hidden");
    }

    openResultsScreen() {
        const screen = this.resultsScreen;
        if (!screen) {
            this.openStatsModal();
            return;
        }
        const g = this.game;
        const isPlayerWin = g.winnerTeam === "blue";

        // Winner name in the big banner
        let winnerName;
        if (g.isTeamMatch) {
            winnerName = isPlayerWin ? "BLUE TEAM" : "RED TEAM";
        } else if (g.mode === "pvp") {
            winnerName = isPlayerWin ? "PLAYER 1" : "PLAYER 2";
        } else if (g.mode === "online") {
            winnerName = isPlayerWin ? (g.player.name || "HOST") : (g.bot.name || "GUEST");
        } else {
            winnerName = isPlayerWin ? (g.player.name || "YOU") : (g.bot.name || "BOT");
        }
        const nameEl = document.getElementById("results-winner-name");
        nameEl.textContent = winnerName;
        screen.dataset.winner = g.winnerTeam || "blue";

        const subEl = document.getElementById("results-subtitle");
        if (g.isTeamMatch) {
            subEl.textContent = g.isTiebreaker
                ? `Sudden Death • Blue ${g.scoreBlue} - Red ${g.scoreRed}`
                : `${g.matchType.toUpperCase()} • Blue ${g.scoreBlue} - Red ${g.scoreRed}`;
        } else {
            const modeMeta = MODE_METADATA[g.mode] || {};
            subEl.textContent = g.mode === "pvp" ? "Local 1v1 Duel"
                : g.mode === "online" ? (g.winnerTeam === g.localFighter.team ? "Online 1v1 • You won!" : "Online 1v1 • Good game!")
                : `1v1 vs ${modeMeta.name || "Bot"}`;
        }

        // Placement order: winning team first, then by KOs, then damage dealt
        const fighters = (g.allFighters || [g.player, g.bot]).slice();
        const teamOf = (f) => f.team || (f === g.player ? "blue" : "red");
        fighters.sort((a, b) => {
            const aw = teamOf(a) === g.winnerTeam ? 0 : 1;
            const bw = teamOf(b) === g.winnerTeam ? 0 : 1;
            if (aw !== bw) return aw - bw;
            const ak = (a.stats && a.stats.kills) || 0;
            const bk = (b.stats && b.stats.kills) || 0;
            if (ak !== bk) return bk - ak;
            return ((b.stats && b.stats.damageDealt) || 0) - ((a.stats && a.stats.damageDealt) || 0);
        });

        const ordinal = (n) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
        const compact = fighters.length > 4;
        const escapeHTML = (str) => String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

        const cards = fighters.map((f, i) => {
            const st = f.stats || {};
            // Teams share a placement (whole winning team is 1st), solo duels rank individually
            const place = g.isTeamMatch ? (teamOf(f) === g.winnerTeam ? 1 : 2) : i + 1;
            const team = teamOf(f);
            const isYou = f === (g.localFighter || g.player);
            const wep = WEAPON_TYPES[f.weaponId] || WEAPON_TYPES.mace;
            return `
                <div class="rs-card rs-${team} ${place === 1 ? "rs-first" : ""} ${isYou ? "rs-you" : ""}" style="animation-delay:${0.15 + i * 0.08}s">
                    <div class="rs-place">${ordinal(place)}</div>
                    <div class="rs-portrait">${headImgHTML(f.skinId || (team === "blue" ? "steve" : "alex"), compact ? 32 : 72)}</div>
                    <div class="rs-name">${escapeHTML(f.name || "Fighter")}${isYou ? ' <span class="rs-you-tag">YOU</span>' : ""}</div>
                    <div class="rs-wep">${weaponIconHTML(f.weaponId || "mace", 16)} ${escapeHTML(wep.name)}</div>
                    ${f.classId && f.classId !== "normal" ? `<div class="rs-class rs-class-${f.classId}">${CLASSES[f.classId].name}</div>` : ""}
                    <div class="rs-stats">
                        <div><span>KOs</span><b>${st.kills || 0}</b></div>
                        <div><span>Falls</span><b>${st.deaths || 0}</b></div>
                        <div><span>Damage</span><b>${Math.round(st.damageDealt || 0)}</b></div>
                    </div>
                </div>
            `;
        }).join("");

        const againBtn = document.getElementById("btn-results-again");
        if (againBtn) againBtn.textContent = g.mode === "online" ? "Rematch (R)" : "Play Again (R)";

        const fightersEl = document.getElementById("results-fighters");
        fightersEl.classList.toggle("compact", compact);
        // One row per team in team matches (winners on top)
        fightersEl.style.setProperty("--rs-cols", g.isTeamMatch ? Math.ceil(fighters.length / 2) : fighters.length);
        fightersEl.innerHTML = cards;

        const rewardsEl = document.getElementById("results-rewards");
        const r = g.lastRewardInfo;
        rewardsEl.innerHTML = r ? `
            <span class="reward-pill">+${r.goldEarned} Gold</span>
            <span class="reward-pill xp">+${r.xpEarned} XP</span>
            ${r.rpDelta ? `<span class="reward-pill rp">${r.rpDelta > 0 ? "+" : ""}${r.rpDelta} RP</span>` : ""}
        ` : "";

        // Phase 1: "GAME!" splash over the arena, Phase 2: slide in the results panel
        this.hideResultsScreen();
        screen.classList.remove("hidden", "show-panel");
        // Restart CSS animations
        void screen.offsetWidth;
        this.resultsTimer = setTimeout(() => {
            this.resultsTimer = null;
            if (this.game.state === "gameover") screen.classList.add("show-panel");
        }, 1400);
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
