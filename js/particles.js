// ============================================================
// Particle System
// ============================================================

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }

    spawn(type, x, y, count = 1) {
        for (let i = 0; i < count; i++) {
            if (this.particles.length >= this.maxParticles) {
                this.particles.shift();
            }

            let p;
            switch (type) {
                case 'blood':
                    p = {
                        x, y,
                        vx: Utils.rand(-80, 80), vy: Utils.rand(-80, 80),
                        life: Utils.rand(0.3, 0.8), maxLife: 0.8,
                        size: Utils.rand(2, 5),
                        color: Utils.randChoice(['#c0392b', '#e74c3c', '#a93226']),
                        type: 'circle', gravity: 100, shrink: true
                    };
                    break;

                case 'spark':
                    p = {
                        x, y,
                        vx: Utils.rand(-150, 150), vy: Utils.rand(-150, 150),
                        life: Utils.rand(0.1, 0.3), maxLife: 0.3,
                        size: Utils.rand(1, 3),
                        color: '#f1c40f',
                        type: 'circle', gravity: 0, shrink: true
                    };
                    break;

                case 'explosion':
                    p = {
                        x: x + Utils.rand(-20, 20), y: y + Utils.rand(-20, 20),
                        vx: Utils.rand(-200, 200), vy: Utils.rand(-200, 200),
                        life: Utils.rand(0.3, 1.0), maxLife: 1.0,
                        size: Utils.rand(8, 30),
                        color: Utils.randChoice(['#e74c3c', '#f39c12', '#f1c40f', '#e67e22', '#333']),
                        type: 'circle', gravity: -50, shrink: true, glow: true
                    };
                    break;

                case 'smoke':
                    p = {
                        x: x + Utils.rand(-5, 5), y: y + Utils.rand(-5, 5),
                        vx: Utils.rand(-20, 20), vy: Utils.rand(-40, -10),
                        life: Utils.rand(0.5, 1.5), maxLife: 1.5,
                        size: Utils.rand(5, 15),
                        color: 'rgba(100,100,100,0.5)',
                        type: 'circle', gravity: -20, shrink: false, fade: true
                    };
                    break;

                case 'tire_smoke':
                    p = {
                        x: x + Utils.rand(-3, 3), y: y + Utils.rand(-3, 3),
                        vx: Utils.rand(-15, 15), vy: Utils.rand(-15, 15),
                        life: Utils.rand(0.2, 0.5), maxLife: 0.5,
                        size: Utils.rand(4, 8),
                        color: 'rgba(200,200,200,0.4)',
                        type: 'circle', gravity: -10, shrink: false, fade: true
                    };
                    break;

                case 'muzzle_flash':
                    p = {
                        x, y,
                        vx: 0, vy: 0,
                        life: 0.05, maxLife: 0.05,
                        size: Utils.rand(8, 14),
                        color: '#f1c40f',
                        type: 'circle', gravity: 0, shrink: false, glow: true
                    };
                    break;

                case 'money':
                    p = {
                        x, y,
                        vx: Utils.rand(-30, 30), vy: Utils.rand(-80, -40),
                        life: 1.0, maxLife: 1.0,
                        size: 8,
                        color: '#2ecc71',
                        type: 'text', text: '$', gravity: 60, fade: true
                    };
                    break;

                case 'water_splash':
                    p = {
                        x, y,
                        vx: Utils.rand(-40, 40), vy: Utils.rand(-60, -20),
                        life: Utils.rand(0.3, 0.6), maxLife: 0.6,
                        size: Utils.rand(2, 4),
                        color: '#74b9ff',
                        type: 'circle', gravity: 120, shrink: true
                    };
                    break;

                case 'star':
                    p = {
                        x, y,
                        vx: Utils.rand(-50, 50), vy: Utils.rand(-80, -30),
                        life: Utils.rand(0.5, 1.0), maxLife: 1.0,
                        size: Utils.rand(3, 6),
                        color: '#f1c40f',
                        type: 'star', gravity: 40, fade: true
                    };
                    break;

                default:
                    p = {
                        x, y,
                        vx: Utils.rand(-50, 50), vy: Utils.rand(-50, 50),
                        life: 0.5, maxLife: 0.5,
                        size: 3, color: '#fff',
                        type: 'circle', gravity: 0, shrink: true
                    };
            }

            this.particles.push(p);
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += (p.gravity || 0) * dt;

            if (p.shrink) {
                p.size *= (1 - 2 * dt);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            const alpha = p.fade ? (p.life / p.maxLife) : 1;

            ctx.save();
            ctx.globalAlpha = alpha;

            if (p.glow) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = p.size;
            }

            if (p.type === 'circle') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'text') {
                ctx.fillStyle = p.color;
                ctx.font = `bold ${p.size * 2}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else if (p.type === 'star') {
                ctx.fillStyle = p.color;
                this._drawStar(ctx, p.x, p.y, p.size);
            }

            ctx.restore();
        }
    }

    _drawStar(ctx, x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }
}
