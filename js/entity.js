// ============================================================
// Entity System - Player, Vehicles, NPCs
// ============================================================

// --- Base Entity ---
class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.health = 100;
        this.alive = true;
        this.size = 10;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    takeDamage(amount, source) {
        if (!this.alive) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            this.onDeath(source);
        }
    }

    onDeath(source) { }
}

// --- Player ---
class Player extends Entity {
    constructor(x, y) {
        super(x, y);
        this.size = CONFIG.PLAYER_SIZE;
        this.health = CONFIG.PLAYER_MAX_HEALTH;
        this.armor = 0;
        this.money = CONFIG.START_MONEY;
        this.wantedLevel = 0;
        this.wantedTimer = 0;
        this.wantedHeat = 0;

        // Movement
        this.speed = 0;
        this.moveAngle = 0;
        this.footstepTimer = 0;

        // Vehicle
        this.inVehicle = null;
        this.enterCooldown = 0;

        // Weapons
        this.weapons = { fist: { ammo: Infinity } };
        this.currentWeapon = 'fist';
        this.fireTimer = 0;

        // State
        this.state = 'idle'; // idle, walking, running, driving
        this.invincibleTimer = 0;
        this.respawnTimer = 0;
        this.killCount = 0;
    }

    update(dt, input, world, audio) {
        if (!this.alive) {
            return; // respawn timer handled by game.js
        }

        this.enterCooldown = Math.max(0, this.enterCooldown - dt);
        this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
        this.fireTimer = Math.max(0, this.fireTimer - dt);

        if (this.inVehicle) {
            this._updateDriving(dt, input, world, audio);
        } else {
            this._updateOnFoot(dt, input, world, audio);
        }

        // Wanted level decay
        if (this.wantedLevel > 0) {
            this.wantedTimer += dt;
            if (this.wantedTimer > CONFIG.WANTED_DECAY_TIME) {
                this.wantedLevel = Math.max(0, this.wantedLevel - 1);
                this.wantedTimer = 0;
            }
        }

        // Keep on island
        if (!world.isOnIsland(this.x, this.y)) {
            const cx = world.width / 2;
            const cy = world.height / 2;
            const angle = Utils.angleTo(this.x, this.y, cx, cy);
            this.x += Math.cos(angle) * 200 * dt;
            this.y += Math.sin(angle) * 200 * dt;
            if (this.inVehicle) {
                this.inVehicle.x = this.x;
                this.inVehicle.y = this.y;
                this.inVehicle.speed *= 0.9;
            }
        }
    }

    _updateOnFoot(dt, input, world, audio) {
        const move = input.getMovement();
        const sprinting = input.isSprinting();
        const speed = sprinting ? CONFIG.PLAYER_SPRINT_SPEED : CONFIG.PLAYER_SPEED;

        if (move.x !== 0 || move.y !== 0) {
            const targetAngle = Math.atan2(move.y, move.x);
            this.moveAngle = targetAngle;
            this.state = sprinting ? 'running' : 'walking';

            let newX = this.x + move.x * speed * dt;
            let newY = this.y + move.y * speed * dt;

            // Building collision
            if (!world.circleCollidesBuilding(newX, this.y, this.size)) {
                this.x = newX;
            }
            if (!world.circleCollidesBuilding(this.x, newY, this.size)) {
                this.y = newY;
            }

            this.speed = speed;

            // Footsteps
            this.footstepTimer -= dt;
            if (this.footstepTimer <= 0) {
                audio.play('footstep', 0.3);
                this.footstepTimer = sprinting ? 0.25 : 0.4;
            }
        } else {
            this.state = 'idle';
            this.speed = 0;
        }

        // Aim toward mouse
        this.rotation = Utils.angleTo(this.x, this.y, input.mouse.worldX, input.mouse.worldY);
    }

    _updateDriving(dt, input, world, audio) {
        const v = this.inVehicle;
        const move = input.getMovement();
        const stats = CONFIG.VEHICLE_TYPES[v.type];

        // Throttle and brake
        if (move.y < 0) {
            v.speed += stats.acceleration * dt;
        } else if (move.y > 0) {
            if (v.speed > 10) {
                v.speed -= stats.braking * dt;
            } else {
                v.speed -= stats.acceleration * 0.5 * dt;
            }
        } else {
            // Friction
            v.speed *= (1 - 1.5 * dt);
            if (Math.abs(v.speed) < 5) v.speed = 0;
        }

        v.speed = Utils.clamp(v.speed, -stats.maxSpeed * 0.3, stats.maxSpeed);

        // Steering
        if (Math.abs(v.speed) > 5) {
            const steerFactor = Utils.clamp(Math.abs(v.speed) / 100, 0.3, 1);
            const steerDir = v.speed > 0 ? 1 : -1;
            if (move.x !== 0) {
                v.rotation += move.x * stats.handling * steerFactor * steerDir * dt;
            }
        }

        // Apply velocity
        v.vx = Math.cos(v.rotation) * v.speed;
        v.vy = Math.sin(v.rotation) * v.speed;

        const newX = v.x + v.vx * dt;
        const newY = v.y + v.vy * dt;

        // Building collision — use rotated bounding box
        // length is along movement direction (cos/sin), width is perpendicular
        const cos = Math.abs(Math.cos(v.rotation));
        const sin = Math.abs(Math.sin(v.rotation));
        const aabbW = stats.length * cos + stats.width * sin;
        const aabbH = stats.length * sin + stats.width * cos;
        const hitBuilding = world.collidesWithBuilding(
            newX - aabbW / 2, newY - aabbH / 2,
            aabbW, aabbH
        );

        if (hitBuilding) {
            const impactSpeed = Math.abs(v.speed);
            v.speed *= -0.3;
            v.health -= impactSpeed * 0.1;
            audio.play('crash', 0.5);
        } else {
            v.x = newX;
            v.y = newY;
        }

        // Tire screech on hard turning
        if (Math.abs(move.x) > 0 && Math.abs(v.speed) > 150) {
            v.drifting = true;
            if (!v.screechPlayed) {
                audio.play('screech', 0.3);
                v.screechPlayed = true;
            }
        } else {
            v.drifting = false;
            v.screechPlayed = false;
        }

        // Sync player position with vehicle
        this.x = v.x;
        this.y = v.y;
        this.rotation = v.rotation;
        this.state = 'driving';
    }

    enterVehicle(vehicle, audio) {
        if (this.enterCooldown > 0) return false;
        if (this.inVehicle) return false;

        this.inVehicle = vehicle;
        vehicle.occupied = true;
        vehicle.driver = this;
        this.enterCooldown = 0.5;
        audio.play('car_door');
        audio.play('car_start');

        // If vehicle had an NPC driver, kick them out
        if (vehicle.npcDriver) {
            vehicle.npcDriver.vehicle = null;
            vehicle.npcDriver.x = vehicle.x + 30;
            vehicle.npcDriver.y = vehicle.y + 30;
            vehicle.npcDriver.fleeing = true;
            vehicle.npcDriver = null;
        }

        return true;
    }

    exitVehicle(audio) {
        if (!this.inVehicle || this.enterCooldown > 0) return false;

        const v = this.inVehicle;
        // Place player beside vehicle
        this.x = v.x + Math.cos(v.rotation + Math.PI / 2) * 30;
        this.y = v.y + Math.sin(v.rotation + Math.PI / 2) * 30;
        v.speed *= 0.5;
        v.occupied = false;
        v.driver = null;
        this.inVehicle = null;
        this.enterCooldown = 0.5;
        this.state = 'idle';
        audio.play('car_door');
        return true;
    }

    addWanted(amount) {
        this.wantedHeat += amount;
        const newLevel = Math.min(CONFIG.MAX_WANTED_LEVEL,
            Math.floor(this.wantedHeat / 20) + 1);
        if (newLevel > this.wantedLevel) {
            this.wantedLevel = newLevel;
        }
        this.wantedTimer = 0;
    }

    addWeapon(type, ammo) {
        if (this.weapons[type]) {
            this.weapons[type].ammo += ammo;
        } else {
            this.weapons[type] = { ammo };
        }
    }

    switchWeapon(direction) {
        const available = Object.keys(this.weapons);
        const idx = available.indexOf(this.currentWeapon);
        const newIdx = (idx + direction + available.length) % available.length;
        this.currentWeapon = available[newIdx];
    }

    takeDamage(amount, source) {
        if (this.invincibleTimer > 0) return;
        // Armor absorbs damage first
        if (this.armor > 0) {
            const armorAbsorb = Math.min(this.armor, amount * 0.7);
            this.armor -= armorAbsorb;
            amount -= armorAbsorb;
        }
        super.takeDamage(amount, source);
    }

    onDeath(source) {
        this.state = 'dead';
        this.money = Math.max(0, this.money - 200);
        if (this.inVehicle) {
            this.inVehicle.occupied = false;
            this.inVehicle.driver = null;
            this.inVehicle = null;
        }
        this.respawnTimer = 5;
    }

    respawn(world) {
        this.alive = true;
        this.health = CONFIG.PLAYER_MAX_HEALTH;
        this.armor = 0;
        this.wantedLevel = 0;
        this.wantedHeat = 0;
        this.wantedTimer = 0;
        this.invincibleTimer = 3;
        this.state = 'idle';
        // Respawn at hospital (center-ish)
        const pos = world.getRandomRoadPosition();
        this.x = pos.x;
        this.y = pos.y;
    }
}

// --- Vehicle ---
class Vehicle extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type;
        const stats = CONFIG.VEHICLE_TYPES[type];
        this.width = stats.width;
        this.length = stats.length;
        this.health = stats.health;
        this.maxHealth = stats.health;
        this.speed = 0;
        this.color = Utils.randChoice(stats.colors);
        this.occupied = false;
        this.driver = null;
        this.npcDriver = null;
        this.drifting = false;
        this.screechPlayed = false;
        this.damaged = false;
        this.onFire = false;
        this.fireTimer = 0;
        this.exploded = false;
        this.brakeLight = false;
        this.headlightsOn = false;
    }

    update(dt, world) {
        // If no driver, decelerate
        if (!this.occupied && !this.npcControlled && Math.abs(this.speed) > 0) {
            this.speed *= (1 - 3 * dt);
            if (Math.abs(this.speed) < 2) this.speed = 0;
            this.x += Math.cos(this.rotation) * this.speed * dt;
            this.y += Math.sin(this.rotation) * this.speed * dt;
        }

        // Fire damage — always runs even when occupied
        if (this.onFire) {
            this.fireTimer += dt;
            this.health -= 20 * dt;
            // Set needsExplosion flag so game.js can add particles/sound
            if (this.health <= 0 && !this.exploded) {
                this.needsExplosion = true;
            }
        }

        // Start fire at low health
        if (this.health < this.maxHealth * 0.2 && !this.onFire && !this.exploded) {
            this.onFire = true;
        }

        this.damaged = this.health < this.maxHealth * 0.5;
    }

    takeDamage(amount) {
        if (!this.alive) return;
        this.health -= amount;
        if (this.health <= 0 && !this.exploded) {
            this.needsExplosion = true;
        }
    }

    explode() {
        if (this.exploded) return;
        this.exploded = true;
        this.alive = false;
        this.speed = 0;
        this.onFire = false;
        if (this.driver) {
            // Exit vehicle before taking damage to avoid state confusion
            if (this.driver === window._game?.player) {
                this.driver.exitVehicle(window._game?.audio);
            }
            this.driver.takeDamage(80);
        }
    }

    getCorners() {
        return Utils.getOBBCorners({
            x: this.x, y: this.y,
            width: this.length, height: this.width,
            rotation: this.rotation
        });
    }
}

// --- NPC (Pedestrian) ---
class Pedestrian extends Entity {
    constructor(x, y) {
        super(x, y);
        this.size = 10;
        this.health = CONFIG.PEDESTRIAN_HEALTH;
        this.speed = CONFIG.NPC_SPEED + Utils.rand(-20, 20);
        this.targetX = x;
        this.targetY = y;
        this.moveTimer = 0;
        this.state = 'walking'; // walking, idle, fleeing, dead
        this.fleeing = false;
        this.fleeAngle = 0;
        this.vehicle = null;
        this.skinColor = Utils.randChoice(['#f4c89a', '#c68642', '#8d5524', '#ffdbac', '#e0ac69']);
        this.shirtColor = Utils.randChoice(['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#34495e']);
        this.pantsColor = Utils.randChoice(['#2c3e50', '#34495e', '#1a5276', '#7b241c', '#1c2833']);
    }

    update(dt, world, playerX, playerY, playerWanted) {
        if (!this.alive) return;

        // Flee from player when wanted
        const distToPlayer = Utils.dist(this.x, this.y, playerX, playerY);
        if (playerWanted > 0 && distToPlayer < 200) {
            this.fleeing = true;
            this.fleeAngle = Utils.angleTo(playerX, playerY, this.x, this.y);
        }

        if (this.fleeing) {
            this.x += Math.cos(this.fleeAngle) * this.speed * 2.5 * dt;
            this.y += Math.sin(this.fleeAngle) * this.speed * 2.5 * dt;
            this.rotation = this.fleeAngle;
            this.state = 'fleeing';

            // Stop fleeing after distance
            if (distToPlayer > 400) {
                this.fleeing = false;
            }
            return;
        }

        // Normal wandering
        this.moveTimer -= dt;
        if (this.moveTimer <= 0) {
            // Pick new target
            if (Math.random() < 0.3) {
                this.state = 'idle';
                this.moveTimer = Utils.rand(1, 4);
            } else {
                this.targetX = this.x + Utils.rand(-200, 200);
                this.targetY = this.y + Utils.rand(-200, 200);
                this.state = 'walking';
                this.moveTimer = Utils.rand(2, 6);
            }
        }

        if (this.state === 'walking') {
            const angle = Utils.angleTo(this.x, this.y, this.targetX, this.targetY);
            const dist = Utils.dist(this.x, this.y, this.targetX, this.targetY);

            if (dist > 5) {
                const newX = this.x + Math.cos(angle) * this.speed * dt;
                const newY = this.y + Math.sin(angle) * this.speed * dt;

                if (!world.circleCollidesBuilding(newX, newY, this.size)) {
                    this.x = newX;
                    this.y = newY;
                }
                this.rotation = angle;
            } else {
                this.state = 'idle';
                this.moveTimer = Utils.rand(1, 3);
            }
        }
    }

    onDeath(source) {
        this.state = 'dead';
    }
}

// --- Traffic Vehicle (NPC-driven) ---
class TrafficVehicle extends Vehicle {
    constructor(x, y, type, road) {
        super(x, y, type);
        this.road = road;
        this.targetSpeed = CONFIG.VEHICLE_TYPES[type].maxSpeed * 0.4;
        this.speed = this.targetSpeed;
        this.npcControlled = true;
        this.braking = false;
        this.turnTimer = 0;

        // Set initial rotation based on road direction
        if (road) {
            this.rotation = road.horizontal ? 0 : Math.PI / 2;
            // Randomize direction
            if (Math.random() < 0.5) this.rotation += Math.PI;
        }
    }

    update(dt, world, vehicles, playerX, playerY) {
        if (this.exploded || !this.alive) return;
        if (this.occupied) return; // Player is driving — game.js calls Vehicle.update

        // Fire/damage logic from parent (without the deceleration/movement)
        if (this.onFire) {
            this.fireTimer += dt;
            this.health -= 20 * dt;
            if (this.health <= 0 && !this.exploded) {
                this.needsExplosion = true;
            }
        }
        if (this.health < this.maxHealth * 0.2 && !this.onFire && !this.exploded) {
            this.onFire = true;
        }
        this.damaged = this.health < this.maxHealth * 0.5;

        // AI driving
        this.speed = Utils.lerp(this.speed, this.targetSpeed, dt * 2);

        // Move forward
        this.x += Math.cos(this.rotation) * this.speed * dt;
        this.y += Math.sin(this.rotation) * this.speed * dt;

        // Avoid buildings
        const ahead = {
            x: this.x + Math.cos(this.rotation) * 60,
            y: this.y + Math.sin(this.rotation) * 60
        };
        if (world.circleCollidesBuilding(ahead.x, ahead.y, 30)) {
            this.rotation += Math.PI * 0.5 * dt * 3;
            this.speed *= 0.8;
        }

        // Stay on roads (try to)
        if (!world.isOnRoad(this.x, this.y)) {
            // Turn toward nearest road
            const cx = world.width / 2;
            const cy = world.height / 2;
            const toCenter = Utils.angleTo(this.x, this.y, cx, cy);
            const angleDiff = Utils.normalizeAngle(toCenter - this.rotation);
            this.rotation += Utils.clamp(angleDiff, -2 * dt, 2 * dt);
        }

        // Turn at intersections
        this.turnTimer -= dt;
        if (this.turnTimer <= 0 && world.isOnRoad(this.x, this.y)) {
            if (Math.random() < 0.02) {
                this.rotation += Utils.randChoice([-Math.PI / 2, Math.PI / 2]);
                this.turnTimer = 3;
            }
        }

        // Keep on island
        if (!world.isOnIsland(this.x, this.y)) {
            this.rotation += Math.PI;
            this.x += Math.cos(this.rotation) * 50;
            this.y += Math.sin(this.rotation) * 50;
        }

        // Brake lights
        this.brakeLight = this.speed < this.targetSpeed * 0.5;
    }
}
