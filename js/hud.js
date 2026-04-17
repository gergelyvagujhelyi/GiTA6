// ============================================================
// HUD - Health, Armor, Wanted, Money, Minimap, Weapons
// ============================================================

class HUD {
    constructor() {
        this.districtFadeTimer = 0;
        this.currentDistrict = '';
        this.showControls = true;
        this.controlsFadeTimer = 10;
        this.radioDisplayTimer = 0;
        this.radioStationName = '';
        this.showInteraction = '';
        this.interactionTimer = 0;
    }

    update(dt, player, world, camera) {
        // District name display
        const district = world.getDistrict(player.x, player.y);
        if (district.name !== this.currentDistrict) {
            this.currentDistrict = district.name;
            this.districtFadeTimer = 3;
            this.districtColor = district.color;
        }
        if (this.districtFadeTimer > 0) this.districtFadeTimer -= dt;

        // Controls hint fade
        if (this.controlsFadeTimer > 0) this.controlsFadeTimer -= dt;

        // Radio display
        if (this.radioDisplayTimer > 0) this.radioDisplayTimer -= dt;

        // Interaction hints
        if (this.interactionTimer > 0) this.interactionTimer -= dt;
    }

    showRadioStation(name) {
        this.radioStationName = name;
        this.radioDisplayTimer = 3;
    }

    showInteractionHint(text) {
        this.showInteraction = text;
        this.interactionTimer = 0.5;
    }

    draw(ctx, player, world, camera, missions, gameTime, audio) {
        const W = camera.screenW;
        const H = camera.screenH;

        ctx.save();

        // === Top-right: Health, Armor, Wanted ===
        this._drawHealthArmor(ctx, W, player);
        this._drawWanted(ctx, W, player);
        this._drawMoney(ctx, W, player);
        this._drawWeapon(ctx, W, H, player);
        this._drawMinimap(ctx, W, H, player, world, missions, camera);
        this._drawDistrict(ctx, W, H);
        this._drawMissionHUD(ctx, W, H, missions, player);
        this._drawRadio(ctx, W, H, audio);
        this._drawInteraction(ctx, W, H);
        this._drawGameTime(ctx, W, gameTime, player);

        // Controls hint
        if (this.controlsFadeTimer > 0) {
            this._drawControls(ctx, W, H);
        }

        // Wasted screen
        if (!player.alive) {
            this._drawWasted(ctx, W, H, player);
        }

        ctx.restore();
    }

    _drawHealthArmor(ctx, W, player) {
        const barW = 180;
        const barH = 14;
        const x = W - barW - 20;
        let y = 18;

        // Health bar
        ctx.fillStyle = CONFIG.COLORS.HUD_BG;
        ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barW, barH);
        const healthPct = player.health / CONFIG.PLAYER_MAX_HEALTH;
        ctx.fillStyle = healthPct > 0.3 ? CONFIG.COLORS.HUD_HEALTH : '#ff0000';
        ctx.fillRect(x, y, barW * healthPct, barH);

        // Health icon
        ctx.fillStyle = CONFIG.COLORS.HUD_HEALTH;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('+', x - 6, y + 12);

        // Armor bar
        if (player.armor > 0) {
            y += barH + 6;
            ctx.fillStyle = CONFIG.COLORS.HUD_BG;
            ctx.fillRect(x - 2, y - 2, barW + 4, barH + 4);
            ctx.fillStyle = '#333';
            ctx.fillRect(x, y, barW, barH);
            const armorPct = player.armor / CONFIG.PLAYER_MAX_ARMOR;
            ctx.fillStyle = CONFIG.COLORS.HUD_ARMOR;
            ctx.fillRect(x, y, barW * armorPct, barH);

            ctx.fillStyle = CONFIG.COLORS.HUD_ARMOR;
            ctx.fillText('S', x - 6, y + 12);
        }
    }

    _drawWanted(ctx, W, player) {
        const y = player.armor > 0 ? 56 : 42;
        const x = W - 200;

        for (let i = 0; i < CONFIG.MAX_WANTED_LEVEL; i++) {
            const starX = x + i * 22;
            ctx.save();
            ctx.translate(starX + 8, y + 8);

            if (i < player.wantedLevel) {
                ctx.fillStyle = CONFIG.COLORS.HUD_WANTED;
                ctx.shadowColor = CONFIG.COLORS.HUD_WANTED;
                ctx.shadowBlur = 6;
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
            }

            // Draw star
            ctx.beginPath();
            for (let j = 0; j < 5; j++) {
                const angle = (j * 4 * Math.PI / 5) - Math.PI / 2;
                const r = 8;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    _drawMoney(ctx, W, player) {
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = CONFIG.COLORS.HUD_MONEY;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(Utils.formatMoney(player.money), W - 20, player.armor > 0 ? 90 : 76);
        ctx.shadowBlur = 0;
    }

    _drawWeapon(ctx, W, H, player) {
        const weapon = CONFIG.WEAPON_TYPES[player.currentWeapon];
        if (!weapon) return;

        const boxW = 120;
        const boxH = 60;
        const x = W - boxW - 15;
        const y = H - boxH - 130;

        // Background
        ctx.fillStyle = CONFIG.COLORS.HUD_BG;
        ctx.fillRect(x, y, boxW, boxH);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, boxW, boxH);

        // Weapon name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(weapon.name, x + boxW / 2, y + 20);

        // Ammo
        const ammo = player.weapons[player.currentWeapon]?.ammo;
        ctx.font = '18px "Courier New", monospace';
        ctx.fillStyle = ammo < 10 ? '#e74c3c' : '#fff';
        ctx.fillText(ammo === Infinity ? 'INF' : ammo, x + boxW / 2, y + 46);
    }

    _drawMinimap(ctx, W, H, player, world, missions, camera) {
        const mapSize = 160;
        const margin = 15;
        const x = margin;
        const y = H - mapSize - margin;
        const mapScale = mapSize / 1600;

        // Background circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + mapSize / 2, y + mapSize / 2, mapSize / 2, 0, Math.PI * 2);
        ctx.clip();

        // Dark background
        ctx.fillStyle = 'rgba(0,20,40,0.85)';
        ctx.fillRect(x, y, mapSize, mapSize);

        // Draw roads on minimap
        ctx.fillStyle = 'rgba(100,100,100,0.6)';
        for (const road of world.roads) {
            const rx = x + (road.x - player.x + 800) * mapScale;
            const ry = y + (road.y - player.y + 800) * mapScale;
            const rw = road.width * mapScale;
            const rh = road.height * mapScale;
            ctx.fillRect(rx, ry, rw, rh);
        }

        // Buildings on minimap
        ctx.fillStyle = 'rgba(150,150,150,0.4)';
        const nearBuildings = world.getBuildingsNear(player.x, player.y, 800);
        for (const b of nearBuildings) {
            const bx = x + (b.x - player.x + 800) * mapScale;
            const by = y + (b.y - player.y + 800) * mapScale;
            ctx.fillRect(bx, by, b.width * mapScale, b.height * mapScale);
        }

        // Mission markers
        const missionMarkers = missions.getActiveMarkers();
        for (const m of missionMarkers) {
            const mx = x + (m.x - player.x + 800) * mapScale;
            const my = y + (m.y - player.y + 800) * mapScale;
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(mx, my, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mission start markers
        const startMarkers = missions.getMissionStartMarkers();
        for (const m of startMarkers) {
            const mx = x + (m.x - player.x + 800) * mapScale;
            const my = y + (m.y - player.y + 800) * mapScale;
            ctx.fillStyle = '#ff6ec7';
            ctx.beginPath();
            ctx.arc(mx, my, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Player marker
        const pcx = x + mapSize / 2;
        const pcy = y + mapSize / 2;
        ctx.save();
        ctx.translate(pcx, pcy);
        ctx.rotate(player.rotation);
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-5, -4);
        ctx.lineTo(-5, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Border
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + mapSize / 2, y + mapSize / 2, mapSize / 2, 0, Math.PI * 2);
        ctx.stroke();

        // North indicator
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('N', x + mapSize / 2, y + 12);
    }

    _drawDistrict(ctx, W, H) {
        if (this.districtFadeTimer <= 0) return;

        const alpha = Math.min(1, this.districtFadeTimer);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.districtColor || '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 8;
        ctx.fillText(this.currentDistrict, W / 2, H - 200);
        ctx.restore();
    }

    _drawMissionHUD(ctx, W, H, missions) {
        // Objective text
        if (missions.currentMission && missions.objectiveText) {
            ctx.save();
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            const textW = ctx.measureText(missions.objectiveText).width + 20;
            ctx.fillRect(W / 2 - textW / 2, 70, textW, 30);
            ctx.fillStyle = '#fff';
            ctx.fillText(missions.objectiveText, W / 2, 90);
            ctx.restore();
        }

        // Briefing overlay
        if (missions.showingBriefing && missions.currentMission) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(W / 2 - 250, H / 2 - 60, 500, 120);
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 2;
            ctx.strokeRect(W / 2 - 250, H / 2 - 60, 500, 120);

            ctx.fillStyle = '#f1c40f';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(missions.currentMission.title, W / 2, H / 2 - 30);

            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            const step = missions.currentMission.steps[missions.currentStep];
            const text = step?.type === 'dialog' ? step.text : missions.currentMission.briefing;
            this._wrapText(ctx, text, W / 2, H / 2, 460, 18);
            ctx.restore();
        }

        // Mission complete
        if (missions.showingComplete) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, missions.completeTimer);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(W / 2 - 200, H / 2 - 40, 400, 80);
            ctx.fillStyle = '#2ecc71';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('MISSION COMPLETE', W / 2, H / 2);
            ctx.fillStyle = '#fff';
            ctx.font = '18px Arial';
            ctx.fillText('Reward: ' + Utils.formatMoney(missions.completed.length > 0 ?
                missions.missions[missions.completed[missions.completed.length - 1]]?.reward || 0 : 0), W / 2, H / 2 + 28);
            ctx.restore();
        }

        // Mission failed
        if (missions.showingFail) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, missions.failTimer);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(W / 2 - 200, H / 2 - 30, 400, 60);
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('MISSION FAILED', W / 2, H / 2 + 8);
            ctx.restore();
        }

        // Mission start markers in world (handled in renderer)
    }

    _drawRadio(ctx, W, H, audio) {
        if (this.radioDisplayTimer <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, this.radioDisplayTimer);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(W / 2 - 120, 20, 240, 40);
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff6ec7';
        ctx.fillText('RADIO: ' + this.radioStationName, W / 2, 45);
        ctx.restore();
    }

    _drawInteraction(ctx, W, H) {
        if (this.interactionTimer <= 0) return;
        ctx.save();
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(this.showInteraction, W / 2, H / 2 + 60);
        ctx.restore();
    }

    _drawGameTime(ctx, W, gameTime, player) {
        const hours = Math.floor(gameTime);
        const minutes = Math.floor((gameTime - hours) * 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(timeStr, W - 20, player.armor > 0 ? 110 : 96);
    }

    _drawWasted(ctx, W, H, player) {
        const alpha = Utils.clamp(1 - player.respawnTimer / 5, 0, 1);
        ctx.save();

        // Red overlay
        ctx.fillStyle = `rgba(150, 0, 0, ${alpha * 0.4})`;
        ctx.fillRect(0, 0, W, H);

        // WASTED text
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c0392b';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        ctx.fillText('WASTED', W / 2, H / 2);

        // Money lost
        ctx.font = '20px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Hospital bill: -$200', W / 2, H / 2 + 50);

        ctx.restore();
    }

    _drawControls(ctx, W, H) {
        const alpha = Utils.clamp(this.controlsFadeTimer / 2, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(W / 2 - 180, H - 65, 360, 55);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('WASD: Move | SHIFT: Sprint | F: Enter/Exit Vehicle', W / 2, H - 45);
        ctx.fillText('MOUSE: Aim & Shoot | Q/E: Switch Weapon | R: Radio | M: Sound', W / 2, H - 25);
        ctx.restore();
    }

    _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let lineY = y;
        for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth) {
                ctx.fillText(line, x, lineY);
                line = word + ' ';
                lineY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, lineY);
    }
}
