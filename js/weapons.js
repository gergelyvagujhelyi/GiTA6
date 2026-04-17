// ============================================================
// Weapons & Projectile System
// ============================================================

class WeaponSystem {
    constructor() {
        this.projectiles = [];
    }

    fire(player, input, audio) {
        const weapon = CONFIG.WEAPON_TYPES[player.currentWeapon];
        if (!weapon) return;
        if (player.fireTimer > 0) return;
        if (!weapon.auto && !input.mouse.justPressed) return;
        if (weapon.auto && !input.mouse.down) return;

        // Check ammo
        const playerWeapon = player.weapons[player.currentWeapon];
        if (!playerWeapon || playerWeapon.ammo <= 0) return;

        player.fireTimer = weapon.fireRate;

        if (!weapon.melee) {
            if (playerWeapon.ammo !== Infinity) playerWeapon.ammo--;

            const pellets = weapon.pellets || 1;
            for (let i = 0; i < pellets; i++) {
                const spread = (Math.random() - 0.5) * weapon.spread * 2;
                const angle = player.rotation + spread;

                // Offset spawn from player center
                const spawnDist = player.inVehicle ? 30 : 18;
                const sx = player.x + Math.cos(player.rotation) * spawnDist;
                const sy = player.y + Math.sin(player.rotation) * spawnDist;

                this.projectiles.push({
                    x: sx, y: sy,
                    vx: Math.cos(angle) * weapon.projectileSpeed,
                    vy: Math.sin(angle) * weapon.projectileSpeed,
                    damage: weapon.damage,
                    range: weapon.range,
                    traveled: 0,
                    owner: 'player',
                    explosive: weapon.explosive || false,
                    explosionRadius: weapon.explosionRadius || 0,
                    type: player.currentWeapon
                });
            }

            // Sound
            switch (player.currentWeapon) {
                case 'pistol': audio.play('gunshot'); break;
                case 'shotgun': audio.play('shotgun'); break;
                case 'smg': audio.play('smg'); break;
                case 'rifle': audio.play('rifle'); break;
                case 'rocket': audio.play('rocket'); break;
            }
        } else {
            // Melee attack
            audio.play('punch');
            this.projectiles.push({
                x: player.x + Math.cos(player.rotation) * 25,
                y: player.y + Math.sin(player.rotation) * 25,
                vx: 0, vy: 0,
                damage: weapon.damage,
                range: 0,
                traveled: 0,
                maxTravel: 0,
                owner: 'player',
                melee: true,
                lifetime: 0.1,
                type: 'fist'
            });
        }

        return {
            x: player.x + Math.cos(player.rotation) * 18,
            y: player.y + Math.sin(player.rotation) * 18,
            angle: player.rotation,
            weapon: player.currentWeapon
        };
    }

    fireNPC(npc, targetX, targetY, audio) {
        const angle = Utils.angleTo(npc.x, npc.y, targetX, targetY) + (Math.random() - 0.5) * 0.15;
        const weapon = CONFIG.WEAPON_TYPES.pistol;

        this.projectiles.push({
            x: npc.x + Math.cos(angle) * 15,
            y: npc.y + Math.sin(angle) * 15,
            vx: Math.cos(angle) * weapon.projectileSpeed,
            vy: Math.sin(angle) * weapon.projectileSpeed,
            damage: weapon.damage * 0.5, // NPCs do less damage
            range: weapon.range,
            traveled: 0,
            owner: 'npc',
            type: 'pistol'
        });

        audio.play('gunshot', 0.4);
    }

    update(dt, world, player, npcs, vehicles, particles, audio, camera) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];

            if (p.melee) {
                p.lifetime -= dt;
                if (p.lifetime <= 0) {
                    this.projectiles.splice(i, 1);
                    continue;
                }
            } else {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.traveled += Math.sqrt(p.vx * p.vx + p.vy * p.vy) * dt;

                if (p.traveled >= p.range) {
                    if (p.explosive) {
                        this._explode(p, particles, audio, camera, npcs, vehicles, player);
                    }
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }

            // Building collision
            if (!p.melee && world.circleCollidesBuilding(p.x, p.y, 3)) {
                if (p.explosive) {
                    this._explode(p, particles, audio, camera, npcs, vehicles, player);
                } else {
                    particles.spawn('spark', p.x, p.y, 3);
                }
                this.projectiles.splice(i, 1);
                continue;
            }

            // Hit NPCs (player projectiles)
            if (p.owner === 'player') {
                for (const npc of npcs) {
                    if (!npc.alive) continue;
                    if (Utils.circleOverlap(p.x, p.y, p.melee ? 15 : 4, npc.x, npc.y, npc.size)) {
                        npc.takeDamage(p.damage);
                        audio.play('hit', 0.5);
                        particles.spawn('blood', npc.x, npc.y, 5);

                        if (!npc.alive) {
                            player.money += Utils.randInt(10, 50);
                            player.killCount++;
                            player.addWanted(5);
                        } else {
                            npc.fleeing = true;
                            npc.fleeAngle = Utils.angleTo(player.x, player.y, npc.x, npc.y);
                            player.addWanted(2);
                        }

                        if (!p.melee && !p.explosive) {
                            this.projectiles.splice(i, 1);
                            break;
                        }
                    }
                }

                // Hit vehicles
                for (const v of vehicles) {
                    if (v.exploded || v === player.inVehicle) continue;
                    if (Utils.circleRectOverlap(p.x, p.y, 4,
                        v.x - v.width / 2, v.y - v.length / 2, v.width, v.length)) {
                        v.takeDamage(p.damage);
                        particles.spawn('spark', p.x, p.y, 3);
                        player.addWanted(3);

                        if (!p.melee && !p.explosive) {
                            this.projectiles.splice(i, 1);
                            break;
                        }
                    }
                }
            }

            // Hit player (NPC projectiles)
            if (p.owner === 'npc') {
                if (player.inVehicle) {
                    const v = player.inVehicle;
                    if (Utils.circleRectOverlap(p.x, p.y, 4,
                        v.x - v.width / 2, v.y - v.length / 2, v.width, v.length)) {
                        v.takeDamage(p.damage * 0.5);
                        player.takeDamage(p.damage * 0.3);
                        this.projectiles.splice(i, 1);
                        continue;
                    }
                } else {
                    if (Utils.circleOverlap(p.x, p.y, 4, player.x, player.y, player.size)) {
                        player.takeDamage(p.damage);
                        audio.play('hit', 0.6);
                        particles.spawn('blood', player.x, player.y, 3);
                        this.projectiles.splice(i, 1);
                        continue;
                    }
                }
            }
        }
    }

    _explode(p, particles, audio, camera, npcs, vehicles, player) {
        particles.spawn('explosion', p.x, p.y, 20);
        audio.play('explosion');
        camera.shake(15);

        // Damage nearby
        const r = p.explosionRadius;
        for (const npc of npcs) {
            if (!npc.alive) continue;
            const d = Utils.dist(p.x, p.y, npc.x, npc.y);
            if (d < r) {
                npc.takeDamage(p.damage * (1 - d / r));
                if (!npc.alive) {
                    player.money += Utils.randInt(10, 50);
                    player.killCount++;
                }
            }
        }
        for (const v of vehicles) {
            if (v.exploded) continue;
            const d = Utils.dist(p.x, p.y, v.x, v.y);
            if (d < r) {
                v.takeDamage(p.damage * (1 - d / r));
            }
        }
        // Player damage from own explosions
        const dp = Utils.dist(p.x, p.y, player.x, player.y);
        if (dp < r) {
            player.takeDamage(p.damage * 0.5 * (1 - dp / r));
        }
    }
}
