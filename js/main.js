// ==========================================
// SPEAR-MACE PVP - Application Bootstrap
// ==========================================

import { Game } from './game.js';
import { UIManager } from './ui.js';
import { applyPageBackground } from './pixel.js';
import { crazyGames } from './crazygames.js';

window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("game-canvas");
    if (!canvas) {
        console.error("Game canvas element not found.");
        return;
    }

    applyPageBackground("space");

    let ui = null;

    // Instantiate game engine
    const game = new Game(canvas, {
        onStateChanged: (state) => {
            if (ui) ui.onStateChanged(state);
            // CrazyGames gameplay tracking: only while a match is actually being played
            crazyGames.setGameplay(state === "play");
            // CrazyGames "happytime": celebrate winning a ranked or online match
            if (state === "gameover" && (game.mode === "arena" || game.mode === "online")) {
                const me = game.localFighter || game.player;
                if (me && game.winnerTeam === me.team) crazyGames.happytime();
            }
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

    // CrazyGames SDK: loads in the background and never delays the game.
    // Off CrazyGames it resolves to false and nothing changes.
    crazyGames.init().then((active) => {
        if (active) ui.setupCrazyGames();
    });

    console.log("Spear-Mace PVP initialized successfully!");
});
