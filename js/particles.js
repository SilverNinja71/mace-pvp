// ==========================================
// SPEAR-MACE PVP - Particles & Combat FX
// ==========================================

export class ParticleManager {
    constructor() {
        this.particles = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.cameraShake = { intensity: 0, duration: 0, x: 0, y: 0 };
    }

    reset() {
        this.particles = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.cameraShake = { intensity: 0, duration: 0, x: 0, y: 0 };
    }

    triggerShake(intensity = 8, frames = 12) {
        this.cameraShake.intensity = Math.max(this.cameraShake.intensity, intensity);
        this.cameraShake.duration = Math.max(this.cameraShake.duration, frames);
    }

    addShockwave(x, y, maxRadius = 45, color = "rgba(255, 170, 0, 0.8)", strokeWidth = 3) {
        this.shockwaves.push({
            x,
            y,
            radius: 8,
            maxRadius,
            alpha: 1.0,
            growthRate: (maxRadius - 8) / 12,
            fadeRate: 1.0 / 12,
            color,
            strokeWidth
        });
    }

    addHitSparks(x, y, count = 12, color = "#ffbb00") {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                gravity: 0.2,
                size: 2 + Math.random() * 3,
                alpha: 1.0,
                decay: 0.04 + Math.random() * 0.03,
                color,
                type: "spark"
            });
        }
    }

    addDashTrail(x, y, facing, color = "rgba(200, 240, 255, 0.7)") {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: x + (Math.random() * 10 - 5),
                y: y + (Math.random() * 14 - 7),
                vx: -facing * (1 + Math.random() * 2),
                vy: (Math.random() - 0.5) * 1.5,
                gravity: 0,
                size: 4 + Math.random() * 5,
                alpha: 0.8,
                decay: 0.08,
                color,
                type: "smoke"
            });
        }
    }

    addDust(x, y, count = 6) {
        for (let i = 0; i < count; i++) {
            const vx = (Math.random() - 0.5) * 4;
            const vy = -Math.random() * 2;
            this.particles.push({
                x: x + (Math.random() * 20 - 10),
                y: y,
                vx,
                vy,
                gravity: 0.08,
                size: 2 + Math.random() * 3,
                alpha: 0.6,
                decay: 0.05,
                color: "rgba(180, 180, 180, 0.6)",
                type: "dust"
            });
        }
    }

    addFloatingText(x, y, text, color = "#ffffff", isCrit = false, scale = 1.0) {
        this.floatingTexts.push({
            x: x + (Math.random() * 20 - 10),
            y: y - 10,
            vy: -2.2,
            text,
            color,
            alpha: 1.0,
            life: 45,
            maxLife: 45,
            isCrit,
            scale
        });
    }

    addDamageText(x, y, damage, isSlam = false) {
        let color = "#ffe135"; // normal yellow
        let scale = 1.0;
        let isCrit = false;
        let suffix = "";

        if (damage >= 100) {
            color = "#ff2244"; // massive crit red
            scale = 1.6;
            isCrit = true;
            suffix = " !";
        } else if (damage >= 50) {
            color = "#ff6b1a"; // heavy slam orange
            scale = 1.3;
            isCrit = isSlam;
        } else if (isSlam) {
            color = "#ffaa00";
            scale = 1.15;
        }

        const displayText = `-${damage.toFixed(0)}${suffix}`;
        this.addFloatingText(x, y, displayText, color, isCrit, scale);
    }

    update() {
        // Camera shake
        if (this.cameraShake.duration > 0) {
            this.cameraShake.duration--;
            const amount = this.cameraShake.intensity * (this.cameraShake.duration / 12);
            this.cameraShake.x = (Math.random() * 2 - 1) * amount;
            this.cameraShake.y = (Math.random() * 2 - 1) * amount;
            if (this.cameraShake.duration <= 0) {
                this.cameraShake.intensity = 0;
                this.cameraShake.x = 0;
                this.cameraShake.y = 0;
            }
        } else {
            this.cameraShake.x = 0;
            this.cameraShake.y = 0;
        }

        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;
            if (p.size > 0.5) p.size *= 0.96;

            if (p.alpha <= 0 || p.size <= 0.4) {
                this.particles.splice(i, 1);
            }
        }

        // Shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const s = this.shockwaves[i];
            s.radius += s.growthRate;
            s.alpha -= s.fadeRate;

            if (s.alpha <= 0 || s.radius >= s.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }

        // Floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.y += t.vy;
            t.vy *= 0.94;
            t.life--;
            t.alpha = Math.max(0, t.life / t.maxLife);

            if (t.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        if (this.shockwaves.length === 0 && this.particles.length === 0 && this.floatingTexts.length === 0) {
            return;
        }

        ctx.save();

        // 1. Batched Shockwaves
        for (let i = 0; i < this.shockwaves.length; i++) {
            const s = this.shockwaves[i];
            ctx.globalAlpha = Math.max(0, s.alpha);
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.strokeWidth;
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, s.radius, s.radius * 0.45, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 2. Batched Particles (Zero per-item save/restore!)
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Batched Floating Damage Text
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let i = 0; i < this.floatingTexts.length; i++) {
            const t = this.floatingTexts[i];
            ctx.globalAlpha = Math.max(0, t.alpha);

            const fontSize = Math.round(14 * t.scale);
            ctx.font = `bold ${fontSize}px "Segoe UI", system-ui, -apple-system, sans-serif`;

            ctx.strokeStyle = "#000000";
            ctx.lineWidth = t.isCrit ? 4 : 3;
            ctx.strokeText(t.text, t.x, t.y);

            ctx.fillStyle = t.color;
            ctx.fillText(t.text, t.x, t.y);
        }

        ctx.restore();
    }
}
