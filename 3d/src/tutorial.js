// ==========================================
// Tutorial: a short, skippable lesson played inside the Training arena.
// Each step finishes when you actually do the move, against a dummy.
// ==========================================

import { BotBrain } from './bot.js';
import { profile } from './profile.js';
import { t } from './i18n.js';

// The words for each step are in i18n.js (tu.<id>.title, .keys, .touch, .text)
const STEPS = ['move', 'jump', 'spear', 'geyser', 'slam', 'parry', 'pad'].map((id) => ({ id }));

export class Tutorial {
    constructor(game, ui) {
        this.game = game;
        this.ui = ui;
        this.i = 0;
        this.moved = 0;
        this.stepT = 0;
        this.done = false;
        this.show();
    }

    get step() { return STEPS[this.i]; }

    show() {
        const s = this.step;
        if (!s) return;
        this.showText();
        this.stepT = 0;
        if (s.id === 'parry') {
            // wake the dummy up: it attacks gently
            const g = this.game;
            const d = g.fighters[1];
            g.brains[1] = new BotBrain(d, 'easy', g);
            g.brains[1].level = { ...g.brains[1].level, aggression: 1, dodge: 0, parry: 0, climb: 0 };
            d.dmgMult = 0.3;
        }
    }

    // The current step's words (again after a language change, without restarting the step)
    showText(quiet = false) {
        const s = this.step;
        if (!s || this.done) return;
        const p = 'tu.' + s.id + '.';
        this.ui.tutorialStep(this.i, STEPS.length, t(p + 'title'), t(p + (this.game.input.usingTouch ? 'touch' : 'keys')), t(p + 'text'), quiet);
    }

    next() {
        this.i++;
        this.game.fx.text(this.game.local.pos.x, this.game.local.pos.y + 2.4, this.game.local.pos.z, t('fx.nice'), '#6dffb0', true);
        if (this.i >= STEPS.length) return this.finish();
        this.show();
    }

    finish() {
        this.done = true;
        profile.markTutorial();
        const g = this.game;
        // the dummy goes back to standing still for free practice
        g.brains[1] = new BotBrain(g.fighters[1], 'dummy', g);
        this.ui.tutorialDone();
    }

    skip() {
        if (this.done) return;
        this.i = STEPS.length;
        this.finish();
    }

    update(dt, g) {
        if (this.done) return;
        this.stepT += dt;
        const me = g.local;
        if (this.step.id === 'move' && me.onGround) {
            this.moved += Math.hypot(me.vel.x, me.vel.z) * dt;
            if (this.moved > 5) this.next();
        }
        // the parry step can be hard: move on after a while
        if (this.step && this.step.id === 'parry' && this.stepT > 30) this.next();
    }

    event(name, a, b, dmg, kind) {
        if (this.done || !this.step) return;
        const me = this.game.local;
        const id = this.step.id;
        if (id === 'jump' && name === 'windJump' && a === me) this.next();
        else if (id === 'spear' && name === 'hit' && a === me && (kind === 'spear' || kind === 'spearCrit')) this.next();
        else if (id === 'geyser' && name === 'geyser' && a === me) this.next();
        else if (id === 'slam' && name === 'hit' && a === me && (kind === 'slam' || kind === 'shock')) this.next();
        else if (id === 'parry' && name === 'parry' && a === me) this.next();
        else if (id === 'pad' && name === 'pad' && a === me) this.next();
    }
}
