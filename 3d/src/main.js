// ==========================================
// SPEAR-MACE: SKY ARENA - start-up
// ==========================================

import { InputController } from './input.js';
import { UI } from './ui.js';
import { Game } from './game.js';
import { audio } from './audio.js';
import { crazyGames } from './crazygames.js';

const canvas = document.getElementById('game');
const input = new InputController(canvas, document.getElementById('touch'));
const ui = new UI();
let game;
try {
    game = new Game(canvas, ui, input);
} catch (e) {
    console.error(e);
    document.getElementById('loading').innerHTML = '<div class="logo-sub" style="letter-spacing:0.1em">This browser can\'t run 3D graphics (WebGL). Try Chrome, Edge, Firefox or Safari.</div>';
    throw e;
}
ui.bind(game);
input.onUnlock = () => {
    // Esc (or leaving fullscreen) releases the mouse: pause, unless a menu took it on purpose
    if (game.state === 'play' || game.state === 'intro') {
        if (!document.getElementById('revive').classList.contains('hidden')) return;
        if (!document.getElementById('tu-done').classList.contains('hidden')) return;
        game.pause();
    }
};
// pause when the tab is hidden
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play' && !window.__noAutoPause) game.pause(); });
// audio may only start after the first click or key
const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// online rooms are added by online.js when it's present
document.querySelectorAll('.online-only').forEach((el) => el.classList.add('hidden'));

crazyGames.init();
document.getElementById('loading').classList.add('hidden');
ui.showMenu();
window.__sma = game; // handy for debugging in the browser console
