// ============================================================
// Main Game Class - Ties everything together
// ============================================================

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.renderer = new Renderer(this.canvas);
        this.input = new InputHandler();
        this.audio = new AudioSystem();
        this.camera = new Camera(this.canvas);
        this.particles = new ParticleSystem();
        this.weapons = new WeaponSystem();
        this.police = new PoliceSystem();
        this.missions = new MissionSystem();
        this.hud = new HUD();

        this.world = null;
        this.player = null;
        this.vehicles = [];
        this.pedestrians = [];

        // Time
        this.gameTime = 10; // Start at 10 AM
        this.lastTime = 0;
        this.dt = 0;
        this.running = false;
        this.paused = false;

        // Stats
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTimer = 0;

        // Spawn timers
        this.pedSpawnTimer = 0;
        this.trafficSpawnTimer = 0;
        this.engineSoundTimer = 0;

        window._game = this;
    }

    async init() {
        this._updateLoadingBar(10, 'Generating world...');
        await this._delay(100);

        this.world = new World();
        this._updateLoadingBar(40, 'Placing buildings...');
        await this._delay(100);

        this._spawnPlayer();
        this._updateLoadingBar(60, 'Spawning vehicles...');
        await this._delay(100);

        this._spawnInitialVehicles();
        this._updateLoadingBar(80, 'Populating city...');
        await this._delay(100);

        this._spawnInitialPedestrians();
        this._updateLoadingBar(100, 'Ready!');
        await this._delay(300);

        this.renderer.resize();
        this.camera.resize(this.canvas.width, this.canvas.height);

        window.addEventListener('resize', () => {
            this.renderer.resize();
            this.camera.resize(this.canvas.width, this.canvas.height);
        });

        this._bindGameKeys();
        this._showStartScreen();
    }

    _updateLoadingBar(pct, text) {
        const bar = document.getElementById('loading-bar');
        const txt = document.getElementById('loading-text');
        if (bar) bar.style.width = pct + '%';
        if (txt) txt.textContent = text;
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _showStartScreen() {
        const hint = document.getElementById('start-hint');
        const loadText = document.getElementById('loading-text');
        if (hint) hint.style.display = 'block';
        if (loadText) loadText.style.display = 'none';

        const startHandler = () => {
            this.audio.init();
            const screen = document.getElementById('loading-screen');
            if (screen) screen.classList.add('fade-out');
            setTimeout(() => {
                if (screen) screen.style.display = 'none';
            }, 800);
            this.start();
            window.removeEventListener('click', startHandler);
            window.removeEventListener('keydown', startHandler);
        };

        window.addEventListener('click', startHandler);
        window.addEventListener('keydown', startHandler);
    }

    _spawnPlayer() {
        const pos = this.world.getRandomRoadPosition();
        this.player = new Player(pos.x, pos.y);
        this.camera.x = pos.x;
        this.camera.y = pos.y;
    }

    _spawnInitialVehicles() {
        const types = ['sedan', 'sedan', 'sports', 'muscle', 'suv', 'truck', 'sedan', 'sports', 'supercar'];
        for (let i = 0; i < 40; i++) {
            const pos = this.world.getRandomRoadPosition();
            const type = Utils.randChoice(types);
            const v = new TrafficVehicle(pos.x, pos.y, type, pos.road);
            this.vehicles.push(v);
        }
    }

    _spawnInitialPedestrians() {
        for (let i = 0; i < 30; i++) {
            const pos = this.world.getRandomRoadPosition();
            const ped = new Pedestrian(pos.x, pos.y);
            this.pedestrians.push(ped);
        }
    }

    _bindGameKeys() {
        // Weapon switching
        window.addEventListener('keydown', e => {
            if (!this.running) return;
            const key = e.key.toLowerCase();

            if (key === 'q') {
                this.player.switchWeapon(-1);
                this.audio.play('weapon_switch');
            }
            if (key === 'e') {
                this.player.switchWeapon(1);
                this.audio.play('weapon_switch');
            }

            // Enter/exit vehicle
            if (key === 'f') {
                if (this.player.inVehicle) {
                    this.player.exitVehicle(this.audio);
                    this.audio.stopRadio();
                } else {
                    this._tryEnterVehicle();
                }
            }

            // Horn
            if (key === 'h' && this.player.inVehicle) {
                this.audio.play('horn');
            }

            // Radio
            if (key === 'r' && this.player.inVehicle) {
                const station = this.audio.nextStation();
                this.hud.showRadioStation(station.name);
            }

            // Toggle sound
            if (key === 'm') {
                this.audio.toggle();
            }

            // Weapon number keys
            const weaponMap = { '1': 'fist', '2': 'pistol', '3': 'shotgun', '4': 'smg', '5': 'rifle', '6': 'rocket' };
            if (weaponMap[key] && this.player.weapons[weaponMap[key]]) {
                this.player.currentWeapon = weaponMap[key];
                this.audio.play('weapon_switch');
            }

            // Pause
            if (key === 'p' || key === 'escape') {
                this.paused = !this.paused;
            }
        });
    }

    _tryEnterVehicle() {
        if (this.player.enterCooldown > 0) return;

        let closest = null;
        let closestDist = CONFIG.VEHICLE_ENTER_RANGE;

        for (const v of this.vehicles) {
            if (v.exploded || !v.alive) continue;
            const d = Utils.dist(this.player.x, this.player.y, v.x, v.y);
            if (d < closestDist) {
                closest = v;
                closestDist = d;
            }
        }

        if (closest) {
            this.player.enterVehicle(closest, this.audio);
            if (this.player.inVehicle) {
                // Stealing a car adds wanted level
                if (closest.npcControlled && !closest.isPolice) {
                    this.player.addWanted(2);
                }
                if (closest.isPolice) {
                    this.player.addWanted(10);
                }
            }
        }
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    }

    loop(timestamp) {
        if (!this.running) return;

        this.dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        // FPS counter
        this.frameCount++;
        this.fpsTimer += this.dt;
        if (this.fpsTimer >= 1) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = 0;
        }

        if (!this.paused) {
            this.update(this.dt);
        }

        this.render();

        requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        // Game time (day/night cycle)
        this.gameTime += dt * (24 / CONFIG.DAY_DURATION);
        if (this.gameTime >= 24) this.gameTime -= 24;

        // Input
        this.input.updateWorldMouse(this.camera);

        // Player
        if (this.player.alive) {
            this.player.update(dt, this.input, this.world, this.audio);

            // Shooting
            const fireResult = this.weapons.fire(this.player, this.input, this.audio);
            if (fireResult) {
                this.particles.spawn('muzzle_flash', fireResult.x, fireResult.y, 1);
                if (fireResult.weapon === 'shotgun') this.camera.shake(4);
                else if (fireResult.weapon === 'rifle') this.camera.shake(2);
                else if (fireResult.weapon === 'rocket') this.camera.shake(6);
            }
        } else {
            this.player.respawnTimer -= dt;
            if (this.player.respawnTimer <= 0) {
                this.player.respawn(this.world);
                this.audio.stopRadio();
            }
        }

        // Camera
        const vehicleSpeed = this.player.inVehicle ? Math.abs(this.player.inVehicle.speed) : 0;
        this.camera.follow(this.player, dt, !!this.player.inVehicle, vehicleSpeed);

        // Vehicles
        for (const v of this.vehicles) {
            if (v instanceof TrafficVehicle) {
                v.update(dt, this.world, this.vehicles, this.player.x, this.player.y);
                // When occupied, TrafficVehicle.update returns early; run base fire/damage
                if (v.occupied) {
                    Vehicle.prototype.update.call(v, dt, this.world);
                }
            } else {
                v.update(dt, this.world);
            }

            // Tire smoke when drifting
            if (v.drifting && v.occupied) {
                const corners = v.getCorners();
                this.particles.spawn('tire_smoke', corners[2].x, corners[2].y, 1);
                this.particles.spawn('tire_smoke', corners[3].x, corners[3].y, 1);
            }

            // Smoke when damaged
            if (v.onFire) {
                this.particles.spawn('smoke', v.x, v.y, 1);
            }

            // Vehicle explosion — triggered by needsExplosion flag from takeDamage/fire
            if (v.needsExplosion && !v.exploded) {
                v.needsExplosion = false;
                v.explode();
                this.particles.spawn('explosion', v.x, v.y, 25);
                this.audio.play('explosion');
                this.camera.shake(10);
            }
        }

        // Vehicle collision with player on foot
        if (!this.player.inVehicle && this.player.alive) {
            for (const v of this.vehicles) {
                if (v.exploded || !v.alive || Math.abs(v.speed) < 30) continue;
                if (Utils.circleRectOverlap(this.player.x, this.player.y, this.player.size,
                    v.x - v.width / 2, v.y - v.length / 2, v.width, v.length)) {
                    const dmg = Math.abs(v.speed) * 0.3;
                    this.player.takeDamage(dmg);
                    this.audio.play('hit');
                    this.camera.shake(5);
                    // Push player
                    this.player.x += Math.cos(v.rotation) * 30;
                    this.player.y += Math.sin(v.rotation) * 30;
                }
            }
        }

        // Pedestrians
        for (let i = this.pedestrians.length - 1; i >= 0; i--) {
            const ped = this.pedestrians[i];
            ped.update(dt, this.world, this.player.x, this.player.y, this.player.wantedLevel);

            // Despawn if too far
            if (Utils.distSq(ped.x, ped.y, this.player.x, this.player.y) >
                CONFIG.NPC_DESPAWN_RADIUS * CONFIG.NPC_DESPAWN_RADIUS) {
                this.pedestrians.splice(i, 1);
                continue;
            }

            // Vehicle collision with pedestrians
            for (const v of this.vehicles) {
                if (!ped.alive) break; // already dead, stop checking
                if (v.exploded || !v.alive || Math.abs(v.speed) < 20) continue;
                if (Utils.circleRectOverlap(ped.x, ped.y, ped.size,
                    v.x - v.width / 2, v.y - v.length / 2, v.width, v.length)) {
                    ped.takeDamage(Math.abs(v.speed) * 0.5);
                    this.particles.spawn('blood', ped.x, ped.y, 5);
                    if (v.driver === this.player) {
                        this.player.addWanted(5);
                    }
                    if (!ped.alive) {
                        if (v.driver === this.player) {
                            this.player.money += Utils.randInt(5, 30);
                            this.missions.onEnemyKilled();
                        }
                    }
                }
            }

            if (!ped.alive) {
                this.pedestrians.splice(i, 1);
            }
        }

        // Spawn pedestrians
        this.pedSpawnTimer += dt;
        if (this.pedSpawnTimer > 1 && this.pedestrians.length < CONFIG.MAX_PEDESTRIANS) {
            this.pedSpawnTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const dist = CONFIG.NPC_SPAWN_RADIUS * (0.6 + Math.random() * 0.4);
            const sx = this.player.x + Math.cos(angle) * dist;
            const sy = this.player.y + Math.sin(angle) * dist;
            if (this.world.isOnIsland(sx, sy) && !this.world.circleCollidesBuilding(sx, sy, 10)) {
                this.pedestrians.push(new Pedestrian(sx, sy));
            }
        }

        // Spawn traffic
        this.trafficSpawnTimer += dt;
        if (this.trafficSpawnTimer > 2 && this.vehicles.length < CONFIG.MAX_TRAFFIC + 40) {
            this.trafficSpawnTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const dist = CONFIG.NPC_SPAWN_RADIUS;
            const sx = this.player.x + Math.cos(angle) * dist;
            const sy = this.player.y + Math.sin(angle) * dist;
            if (this.world.isOnRoad(sx, sy)) {
                const type = Utils.randChoice(['sedan', 'sedan', 'sports', 'muscle', 'suv', 'truck']);
                const road = { horizontal: Math.random() < 0.5 };
                this.vehicles.push(new TrafficVehicle(sx, sy, type, road));
            }
        }

        // Despawn distant vehicles
        for (let i = this.vehicles.length - 1; i >= 0; i--) {
            const v = this.vehicles[i];
            if (v.occupied) continue;
            if (Utils.distSq(v.x, v.y, this.player.x, this.player.y) >
                CONFIG.NPC_DESPAWN_RADIUS * CONFIG.NPC_DESPAWN_RADIUS * 2) {
                this.vehicles.splice(i, 1);
            }
        }

        // Weapons/projectiles — include police officers so they can be hit
        const allNpcs = this.pedestrians.concat(this.police.getOfficers());
        this.weapons.update(dt, this.world, this.player, allNpcs, this.vehicles,
            this.particles, this.audio, this.camera);

        // Police
        this.police.update(dt, this.player, this.world, this.weapons, this.particles,
            this.audio, this.camera, this.pedestrians, this.vehicles);

        // Missions
        this.missions.update(dt, this.player, this.world, this.audio);

        // Check mission start proximity
        if (!this.missions.currentMission) {
            const markers = this.missions.getMissionStartMarkers();
            for (const m of markers) {
                const d = Utils.dist(this.player.x, this.player.y, m.x, m.y);
                if (d < 30) {
                    this.missions.startMission(m.missionId, this.player, this.audio);
                    break;
                } else if (d < 80) {
                    this.hud.showInteractionHint(`Mission: ${m.title} (walk closer)`);
                }
            }
        }

        // Pickups
        this.world.updatePickups(dt);
        if (this.player.alive) {
            for (const pickup of this.world.pickups) {
                if (!pickup.active) continue;
                if (Utils.dist(this.player.x, this.player.y, pickup.x, pickup.y) < 25) {
                    this._collectPickup(pickup);
                }
            }
        }

        // Vehicle enter hint
        if (!this.player.inVehicle && this.player.alive) {
            let nearVehicle = false;
            for (const v of this.vehicles) {
                if (v.exploded || !v.alive) continue;
                if (Utils.dist(this.player.x, this.player.y, v.x, v.y) < CONFIG.VEHICLE_ENTER_RANGE) {
                    const name = CONFIG.VEHICLE_TYPES[v.type]?.name || v.type;
                    this.hud.showInteractionHint(`Press F to enter ${name}`);
                    nearVehicle = true;
                    break;
                }
            }
        }

        // Particles
        this.particles.update(dt);

        // HUD
        this.hud.update(dt, this.player, this.world, this.camera);

        // Engine sound
        if (this.player.inVehicle) {
            this.engineSoundTimer -= dt;
            if (this.engineSoundTimer <= 0) {
                // Volume based on speed
                const speedRatio = Math.abs(this.player.inVehicle.speed) /
                    CONFIG.VEHICLE_TYPES[this.player.inVehicle.type].maxSpeed;
                this.engineSoundTimer = Utils.lerp(0.15, 0.05, speedRatio);
            }
        }

        // Post-update input
        this.input.postUpdate();
    }

    _collectPickup(pickup) {
        pickup.active = false;
        pickup.timer = 0;

        switch (pickup.type) {
            case 'health':
                this.player.health = Math.min(CONFIG.PLAYER_MAX_HEALTH, this.player.health + 25);
                this.audio.play('pickup');
                break;
            case 'armor':
                this.player.armor = Math.min(CONFIG.PLAYER_MAX_ARMOR, this.player.armor + 25);
                this.audio.play('pickup');
                break;
            case 'weapon':
                this.player.addWeapon(pickup.weapon, CONFIG.WEAPON_TYPES[pickup.weapon]?.ammo || 30);
                this.player.currentWeapon = pickup.weapon;
                this.audio.play('pickup');
                break;
            case 'money':
                this.player.money += pickup.amount;
                this.particles.spawn('money', pickup.x, pickup.y, 3);
                this.audio.play('pickup');
                break;
        }
    }

    render() {
        this.renderer.draw(this);
    }
}

// ============================================================
// Bootstrap
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
