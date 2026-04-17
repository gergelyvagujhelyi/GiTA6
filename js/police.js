// ============================================================
// Police / Wanted System
// ============================================================

class PoliceSystem {
    constructor() {
        this.officers = [];
        this.policeVehicles = [];
        this.spawnTimer = 0;
        this.sirenTimer = 0;
    }

    update(dt, player, world, weapons, particles, audio, camera, allNpcs, allVehicles) {
        if (player.wantedLevel <= 0) {
            // Gradually remove police
            this._despawnPolice(dt);
            return;
        }

        // Spawn police based on wanted level
        const maxPolice = CONFIG.MAX_POLICE[player.wantedLevel];
        const spawnDelay = CONFIG.POLICE_SPAWN_DELAY[player.wantedLevel];

        this.spawnTimer += dt;
        if (this.spawnTimer >= spawnDelay && this.officers.length < maxPolice) {
            this.spawnTimer = 0;
            this._spawnPolice(player, world, allVehicles);
        }

        // Siren sound
        this.sirenTimer -= dt;
        if (this.sirenTimer <= 0 && this.officers.length > 0) {
            audio.play('siren', 0.3);
            this.sirenTimer = 1.2;
        }

        // Update police AI
        for (let i = this.officers.length - 1; i >= 0; i--) {
            const cop = this.officers[i];
            if (!cop.alive) {
                this.officers.splice(i, 1);
                continue;
            }

            this._updateCopAI(cop, dt, player, world, weapons, audio);
        }

        // Update police vehicles
        for (let i = this.policeVehicles.length - 1; i >= 0; i--) {
            const pv = this.policeVehicles[i];
            if (pv.exploded) {
                this.policeVehicles.splice(i, 1);
                continue;
            }
            this._updatePoliceVehicle(pv, dt, player, world);
        }
    }

    _spawnPolice(player, world, allVehicles) {
        // Spawn at edge of visible area
        const angle = Math.random() * Math.PI * 2;
        const dist = CONFIG.NPC_SPAWN_RADIUS;
        const sx = player.x + Math.cos(angle) * dist;
        const sy = player.y + Math.sin(angle) * dist;

        if (!world.isOnIsland(sx, sy)) return;

        // Create police officer
        const cop = new Pedestrian(sx, sy);
        cop.isPolice = true;
        cop.health = 80;
        cop.speed = 180;
        cop.shirtColor = '#1a1a6e';
        cop.pantsColor = '#1a1a3e';
        cop.skinColor = Utils.randChoice(['#f4c89a', '#c68642', '#8d5524', '#ffdbac']);
        cop.fireTimer = 0;
        cop.fireRate = 0.6;
        cop.state = 'chasing';
        this.officers.push(cop);

        // Spawn police car if wanted >= 2
        if (player.wantedLevel >= 2 && Math.random() < 0.6) {
            const pv = new TrafficVehicle(sx, sy, 'police', null);
            pv.isPolice = true;
            pv.color = '#1a1a2e';
            pv.targetSpeed = 350;
            pv.speed = 350;
            pv.npcDriver = cop;
            cop.vehicle = pv;
            this.policeVehicles.push(pv);
            allVehicles.push(pv);
        }
    }

    _updateCopAI(cop, dt, player, world, weapons, audio) {
        const distToPlayer = Utils.dist(cop.x, cop.y, player.x, player.y);

        // Despawn if too far
        if (distToPlayer > CONFIG.NPC_DESPAWN_RADIUS * 1.5) {
            cop.alive = false;
            return;
        }

        // If in a vehicle, let the vehicle AI handle movement
        if (cop.vehicle) {
            cop.x = cop.vehicle.x;
            cop.y = cop.vehicle.y;
            cop.rotation = cop.vehicle.rotation;

            // Exit vehicle if close to player
            if (distToPlayer < 100 && cop.vehicle.speed < 20) {
                cop.x = cop.vehicle.x + 30;
                cop.y = cop.vehicle.y;
                cop.vehicle.npcDriver = null;
                cop.vehicle = null;
            }
            return;
        }

        // Chase player
        const angleToPlayer = Utils.angleTo(cop.x, cop.y, player.x, player.y);
        cop.rotation = angleToPlayer;

        if (distToPlayer > 40) {
            const newX = cop.x + Math.cos(angleToPlayer) * cop.speed * dt;
            const newY = cop.y + Math.sin(angleToPlayer) * cop.speed * dt;
            if (!world.circleCollidesBuilding(newX, newY, cop.size)) {
                cop.x = newX;
                cop.y = newY;
            }
        }

        // Shoot at player
        if (distToPlayer < 300 && player.wantedLevel >= 2) {
            cop.fireTimer -= dt;
            if (cop.fireTimer <= 0) {
                weapons.fireNPC(cop, player.x, player.y, audio);
                cop.fireTimer = cop.fireRate;
            }
        }

        // Arrest (melee range)
        if (distToPlayer < 30 && player.wantedLevel === 1) {
            player.takeDamage(5 * dt);
        }
    }

    _updatePoliceVehicle(pv, dt, player, world) {
        if (pv.occupied) return; // Player stole it

        // Chase player
        const angleToPlayer = Utils.angleTo(pv.x, pv.y, player.x, player.y);
        const angleDiff = Utils.normalizeAngle(angleToPlayer - pv.rotation);
        pv.rotation += Utils.clamp(angleDiff, -3 * dt, 3 * dt);

        pv.speed = Utils.lerp(pv.speed, pv.targetSpeed, dt * 2);
        pv.x += Math.cos(pv.rotation) * pv.speed * dt;
        pv.y += Math.sin(pv.rotation) * pv.speed * dt;

        // Avoid buildings
        const ahead = {
            x: pv.x + Math.cos(pv.rotation) * 60,
            y: pv.y + Math.sin(pv.rotation) * 60
        };
        if (world.circleCollidesBuilding(ahead.x, ahead.y, 30)) {
            pv.rotation += Math.PI * 0.5 * dt * 3;
            pv.speed *= 0.8;
        }

        // Ram player's vehicle
        if (player.inVehicle) {
            const dist = Utils.dist(pv.x, pv.y, player.x, player.y);
            if (dist < 60) {
                player.inVehicle.takeDamage(10 * dt);
                pv.speed *= 0.5;
            }
        }

        // Keep on island
        if (!world.isOnIsland(pv.x, pv.y)) {
            const cx = world.width / 2;
            const cy = world.height / 2;
            const toCenter = Utils.angleTo(pv.x, pv.y, cx, cy);
            pv.rotation = toCenter;
        }

        // Siren light state
        pv.sirenPhase = (pv.sirenPhase || 0) + dt * 8;
    }

    _despawnPolice(dt) {
        for (let i = this.officers.length - 1; i >= 0; i--) {
            const cop = this.officers[i];
            cop.despawnTimer = (cop.despawnTimer || 0) + dt;
            if (cop.despawnTimer > 5) {
                cop.alive = false;
                this.officers.splice(i, 1);
            }
        }
        for (let i = this.policeVehicles.length - 1; i >= 0; i--) {
            const pv = this.policeVehicles[i];
            if (!pv.occupied) {
                pv.despawnTimer = (pv.despawnTimer || 0) + dt;
                if (pv.despawnTimer > 8) {
                    pv.alive = false;
                    this.policeVehicles.splice(i, 1);
                }
            }
        }
    }

    getOfficers() {
        return this.officers;
    }
}
