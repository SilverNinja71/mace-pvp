// ==========================================
// SPEAR-MACE PVP - Application Bootstrap
// ==========================================

import { Game } from './game.js';
import { UIManager } from './ui.js';
import { applyMinecraftBackground } from './pixel.js';

window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game-canvas");
    if (!canvas) {
        console.error("Game canvas element not found.");
        return;
    }

    applyMinecraftBackground();

    let ui = null;

    // Instantiate game engine
    const game = new Game(canvas, {
        onStateChanged: (state) => {
            if (ui) ui.onStateChanged(state);
        },
        onMuteToggled: (isMuted) => {
            if (ui) ui.updateMuteButton(isMuted);
        },
        onRestartRequested: () => {
            if (ui) ui.triggerMatchmakingRestart();
        },
        onHomeRequested: () => {
            if (ui) ui.handleHomeClick();
        }
    });

    // Instantiate UI and menu manager
    ui = new UIManager(game);

    // Start 60fps game loop
    game.start();

    console.log("Spear-Mace PVP initialized successfully!");
});
