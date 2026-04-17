// ============================================================
// Mission System
// ============================================================

class MissionSystem {
    constructor() {
        this.missions = this._defineMissions();
        this.currentMission = null;
        this.currentStep = 0;
        this.completed = [];
        this.available = [0]; // First mission available
        this.missionTimer = 0;
        this.showingBriefing = false;
        this.briefingTimer = 0;
        this.showingComplete = false;
        this.completeTimer = 0;
        this.objectiveText = '';
        this.missionMarkers = [];
        this.failTimer = 0;
        this.showingFail = false;
    }

    _defineMissions() {
        const cx = 3000;
        const cy = 3000;

        return [
            {
                id: 0,
                title: 'Welcome to Vice City',
                briefing: 'Time to get your bearings. Walk to the marked location to meet your contact.',
                reward: 500,
                steps: [
                    {
                        type: 'goto',
                        x: cx + 200, y: cy + 200,
                        radius: 40,
                        text: 'Walk to the marker'
                    },
                    {
                        type: 'goto',
                        x: cx - 300, y: cy + 400,
                        radius: 40,
                        text: 'Head to the second location'
                    },
                    {
                        type: 'dialog',
                        text: 'Nice work. Here, take this piece. You\'ll need it around here.',
                        giveWeapon: 'pistol', giveAmmo: 30
                    }
                ]
            },
            {
                id: 1,
                title: 'Hot Wheels',
                briefing: 'We need a fast ride. Steal a car and bring it to the garage.',
                reward: 1000,
                steps: [
                    {
                        type: 'dialog',
                        text: 'Find any car and steal it. Press F near a vehicle to get in.'
                    },
                    {
                        type: 'enter_vehicle',
                        text: 'Steal a car (press F near one)'
                    },
                    {
                        type: 'goto',
                        x: cx - 400, y: cy - 600,
                        radius: 60,
                        text: 'Drive to the garage',
                        needVehicle: true
                    },
                    {
                        type: 'dialog',
                        text: 'Beautiful ride! Here\'s your cut.'
                    }
                ]
            },
            {
                id: 2,
                title: 'Pest Control',
                briefing: 'Some punks are causing trouble downtown. Take care of them.',
                reward: 2000,
                steps: [
                    {
                        type: 'goto',
                        x: cx - 200, y: cy - 1200,
                        radius: 50,
                        text: 'Head to Downtown'
                    },
                    {
                        type: 'kill',
                        count: 5,
                        text: 'Eliminate the gang members (0/5)',
                        spawnEnemies: true,
                        spawnX: cx - 200, spawnY: cy - 1200
                    },
                    {
                        type: 'dialog',
                        text: 'That\'s how we handle business. Here\'s an upgrade for you.',
                        giveWeapon: 'shotgun', giveAmmo: 20
                    }
                ]
            },
            {
                id: 3,
                title: 'Speed Run',
                briefing: 'Race across the city. Hit every checkpoint before time runs out!',
                reward: 3000,
                steps: [
                    {
                        type: 'enter_vehicle',
                        text: 'Get in a car'
                    },
                    {
                        type: 'checkpoint_race',
                        checkpoints: [
                            { x: cx + 600, y: cy + 200 },
                            { x: cx + 600, y: cy - 800 },
                            { x: cx - 400, y: cy - 800 },
                            { x: cx - 400, y: cy + 600 },
                            { x: cx, y: cy }
                        ],
                        timeLimit: 60,
                        text: 'Race through the checkpoints!'
                    },
                    {
                        type: 'dialog',
                        text: 'That was some driving! You\'ve earned this.',
                        giveWeapon: 'smg', giveAmmo: 60
                    }
                ]
            },
            {
                id: 4,
                title: 'The Big Score',
                briefing: 'Time for a real job. Rob the bank downtown and escape the heat.',
                reward: 10000,
                steps: [
                    {
                        type: 'goto',
                        x: cx - 200, y: cy - 1400,
                        radius: 40,
                        text: 'Go to the bank'
                    },
                    {
                        type: 'dialog',
                        text: 'Alright, the vault is open. Grab the cash! But get ready, the cops are coming.',
                        giveWeapon: 'rifle', giveAmmo: 40
                    },
                    {
                        type: 'survive',
                        duration: 30,
                        wantedLevel: 4,
                        text: 'Survive the police assault! (30s)'
                    },
                    {
                        type: 'goto',
                        x: cx + 800, y: cy + 1000,
                        radius: 80,
                        text: 'Escape to the safe house!'
                    },
                    {
                        type: 'dialog',
                        text: 'We did it! Vice City is ours for the taking. Here\'s something special.',
                        giveWeapon: 'rocket', giveAmmo: 5
                    }
                ]
            }
        ];
    }

    startMission(id, player, audio) {
        const mission = this.missions.find(m => m.id === id);
        if (!mission) return false;

        this.currentMission = mission;
        this.currentStep = 0;
        this.missionTimer = 0;
        this.showingBriefing = true;
        this.briefingTimer = 4;
        this.missionEnemies = [];
        this.checkpointIndex = 0;
        this.raceTimer = 0;

        audio.play('mission_start');
        this._setupStep(player);
        return true;
    }

    _setupStep(player) {
        if (!this.currentMission) return;
        const step = this.currentMission.steps[this.currentStep];
        if (!step) return;

        this.objectiveText = step.text;
        this.missionMarkers = [];
        this.killCount = 0;

        if (step.type === 'goto') {
            this.missionMarkers.push({ x: step.x, y: step.y, radius: step.radius });
        } else if (step.type === 'dialog') {
            if (step.giveWeapon) {
                player.addWeapon(step.giveWeapon, step.giveAmmo);
                player.currentWeapon = step.giveWeapon;
            }
            this.briefingTimer = 3;
            this.showingBriefing = true;
        } else if (step.type === 'checkpoint_race') {
            this.checkpointIndex = 0;
            this.raceTimer = step.timeLimit;
            const cp = step.checkpoints[0];
            this.missionMarkers.push({ x: cp.x, y: cp.y, radius: 50 });
        } else if (step.type === 'survive') {
            this.surviveTimer = step.duration;
            if (step.wantedLevel) {
                player.wantedLevel = step.wantedLevel;
                player.wantedHeat = step.wantedLevel * 20;
            }
        } else if (step.type === 'kill') {
            this.killCount = 0;
            this.killTarget = step.count;
        }
    }

    update(dt, player, world, audio) {
        if (!this.currentMission) return;
        if (!player.alive) {
            this.failMission('WASTED', audio);
            return;
        }

        this.missionTimer += dt;

        // Briefing display
        if (this.showingBriefing) {
            this.briefingTimer -= dt;
            if (this.briefingTimer <= 0) {
                this.showingBriefing = false;
                // Auto-advance dialog steps
                const step = this.currentMission.steps[this.currentStep];
                if (step && step.type === 'dialog') {
                    this._advanceStep(player, audio);
                }
            }
            return;
        }

        // Complete display
        if (this.showingComplete) {
            this.completeTimer -= dt;
            if (this.completeTimer <= 0) {
                this.showingComplete = false;
            }
            return;
        }

        // Fail display
        if (this.showingFail) {
            this.failTimer -= dt;
            if (this.failTimer <= 0) {
                this.showingFail = false;
                this.currentMission = null;
            }
            return;
        }

        const step = this.currentMission.steps[this.currentStep];
        if (!step) return;

        // Check step completion
        switch (step.type) {
            case 'goto': {
                const dist = Utils.dist(player.x, player.y, step.x, step.y);
                if (step.needVehicle && !player.inVehicle) {
                    this.objectiveText = step.text + ' (need a car!)';
                    break;
                }
                if (dist < step.radius) {
                    this._advanceStep(player, audio);
                }
                break;
            }

            case 'enter_vehicle':
                if (player.inVehicle) {
                    this._advanceStep(player, audio);
                }
                break;

            case 'kill':
                // Count is tracked via killCount on enemies dying
                this.objectiveText = step.text.replace(/\d+\/\d+/, `${this.killCount}/${step.count}`);
                if (this.killCount >= step.count) {
                    this._advanceStep(player, audio);
                }
                break;

            case 'checkpoint_race': {
                this.raceTimer -= dt;
                if (this.raceTimer <= 0) {
                    this.failMission('TIME\'S UP!', audio);
                    return;
                }
                this.objectiveText = `Checkpoint ${this.checkpointIndex + 1}/${step.checkpoints.length} - ${Math.ceil(this.raceTimer)}s`;
                const cp = step.checkpoints[this.checkpointIndex];
                const dist = Utils.dist(player.x, player.y, cp.x, cp.y);
                if (dist < 50) {
                    this.checkpointIndex++;
                    audio.play('pickup');
                    if (this.checkpointIndex >= step.checkpoints.length) {
                        this._advanceStep(player, audio);
                    } else {
                        const nextCp = step.checkpoints[this.checkpointIndex];
                        this.missionMarkers = [{ x: nextCp.x, y: nextCp.y, radius: 50 }];
                    }
                }
                break;
            }

            case 'survive':
                this.surviveTimer -= dt;
                this.objectiveText = `Survive! ${Math.ceil(this.surviveTimer)}s`;
                if (this.surviveTimer <= 0) {
                    this._advanceStep(player, audio);
                }
                break;
        }
    }

    _advanceStep(player, audio) {
        this.currentStep++;
        if (this.currentStep >= this.currentMission.steps.length) {
            this._completeMission(player, audio);
        } else {
            this._setupStep(player);
            audio.play('pickup');
        }
    }

    _completeMission(player, audio) {
        player.money += this.currentMission.reward;
        this.completed.push(this.currentMission.id);
        this.showingComplete = true;
        this.completeTimer = 4;
        audio.play('mission_complete');

        // Unlock next mission
        const nextId = this.currentMission.id + 1;
        if (nextId < this.missions.length && !this.available.includes(nextId)) {
            this.available.push(nextId);
        }

        player.wantedLevel = 0;
        player.wantedHeat = 0;
        this.currentMission = null;
        this.missionMarkers = [];
    }

    failMission(reason, audio) {
        this.showingFail = true;
        this.failTimer = 3;
        this.failReason = reason;
        this.missionMarkers = [];
        audio.play('wasted');
    }

    onEnemyKilled() {
        if (this.currentMission) {
            this.killCount = (this.killCount || 0) + 1;
        }
    }

    // Get mission start markers for the HUD/world
    getMissionStartMarkers() {
        const markers = [];
        for (const id of this.available) {
            if (this.completed.includes(id) || this.currentMission) continue;
            const mission = this.missions[id];
            if (!mission) continue;
            // Place marker near first step location or near player start
            const step = mission.steps[0];
            if (step && step.x) {
                markers.push({
                    x: step.x, y: step.y,
                    missionId: id,
                    title: mission.title
                });
            } else {
                // Default position near center
                markers.push({
                    x: 3000 + id * 100, y: 3000 + id * 50,
                    missionId: id,
                    title: mission.title
                });
            }
        }
        return markers;
    }

    getActiveMarkers() {
        return this.missionMarkers;
    }
}
