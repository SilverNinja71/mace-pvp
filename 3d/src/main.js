// ==========================================
// SPEAR-MACE: SKY ARENA - start-up
// ==========================================

import { InputController } from './input.js';
import { UI } from './ui.js';
import { Game } from './game.js';
import { audio } from './audio.js';
import { crazyGames } from './crazygames.js';
import { OnlineRoom, onlineAvailable } from './online.js';
import { profile } from './profile.js';
import { t, initLanguage, setPortalLocale, applyDom } from './i18n.js';

initLanguage({ saved: profile.settings.lang, browser: navigator.language });
applyDom();

const canvas = document.getElementById('game');
const input = new InputController(canvas, document.getElementById('touch'));
const ui = new UI();
let game;
try {
    game = new Game(canvas, ui, input);
} catch (e) {
    console.error(e);
    const msg = document.createElement('div');
    msg.className = 'logo-sub';
    msg.style.letterSpacing = '0.1em';
    msg.textContent = t('err.webgl');
    document.getElementById('loading').replaceChildren(msg);
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

// online rooms (not in the CrazyGames build)
if (onlineAvailable()) {
    const room = new OnlineRoom(game, ui);
    ui.bindOnline(room);
    let code = null;
    try { code = new URLSearchParams(location.search).get('room'); } catch (e) { /* no URL */ }
    if (code && /^[A-Z0-9]{4,8}$/i.test(code)) setTimeout(() => ui.joinFromLink(code.toUpperCase()), 50);
} else {
    document.querySelectorAll('.online-only').forEach((el) => el.classList.add('hidden'));
}

// the portal's language is only known once its SDK has started
crazyGames.init().then(() => { if (setPortalLocale(crazyGames.locale())) ui.applyLanguage(); });
document.getElementById('loading').classList.add('hidden');
ui.showMenu();
window.SMA_READY = true;
crazyGames.loadingStop();
window.__sma = game; // handy for debugging in the browser console
