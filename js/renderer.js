// ============================================================
// Main Renderer - Draws the entire game world
// ============================================================

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.waterOffset = 0;
        this.neonPhase = 0;
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    draw(game) {
        const { ctx } = this;
        const { camera, world, player, vehicles, pedestrians, particles,
            weapons, police, missions, hud, audio, gameTime } = game;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Sky / background color based on time
        this._drawSky(ctx, gameTime);

        // World transform
        camera.applyTransform(ctx);

        const bounds = camera.getViewBounds();

        // Water
        this._drawWater(ctx, world, bounds, gameTime);

        // Beach
        this._drawBeach(ctx, world, bounds);

        // Grass (land)
        this._drawLand(ctx, world, bounds);

        // Roads
        this._drawRoads(ctx, world, bounds);

        // Building shadows
        this._drawBuildingShadows(ctx, world, bounds, gameTime);

        // Props (behind entities)
        this._drawProps(ctx, world, bounds, gameTime);

        // Trees (behind buildings)
        this._drawTrees(ctx, world, bounds, gameTime);

        // Pickups
        this._drawPickups(ctx, world, gameTime);

        // Mission markers
        this._drawMissionMarkers(ctx, missions, gameTime);

        // Vehicles (behind player if not in vehicle)
        for (const v of vehicles) {
            if (v.alive && camera.isVisible(v.x, v.y, 80)) {
                this._drawVehicle(ctx, v, gameTime);
            }
        }

        // Exploded vehicles
        for (const v of vehicles) {
            if (v.exploded && camera.isVisible(v.x, v.y, 80)) {
                this._drawExplodedVehicle(ctx, v);
            }
        }

        // Pedestrians
        for (const ped of pedestrians) {
            if (ped.alive && camera.isVisible(ped.x, ped.y)) {
                this._drawPedestrian(ctx, ped);
            }
        }

        // Police officers
        for (const cop of police.getOfficers()) {
            if (cop.alive && camera.isVisible(cop.x, cop.y)) {
                this._drawPedestrian(ctx, cop, true);
            }
        }

        // Player (on foot)
        if (!player.inVehicle && player.alive) {
            this._drawPlayer(ctx, player, gameTime);
        }

        // Projectiles
        this._drawProjectiles(ctx, weapons);

        // Particles
        particles.draw(ctx);

        // Buildings (drawn on top for depth effect)
        this._drawBuildings(ctx, world, bounds, gameTime);

        camera.restoreTransform(ctx);

        // HUD (screen space)
        hud.draw(ctx, player, world, camera, missions, gameTime, audio);

        this.neonPhase += 0.02;
    }

    _drawSky(ctx, gameTime) {
        const hour = gameTime % 24;
        let skyColor;
        if (hour >= 6 && hour < 8) {
            skyColor = Utils.lerpColor(CONFIG.COLORS.SKY_NIGHT, CONFIG.COLORS.SKY_DAWN, (hour - 6) / 2);
        } else if (hour >= 8 && hour < 18) {
            skyColor = Utils.lerpColor(CONFIG.COLORS.SKY_DAWN, CONFIG.COLORS.SKY_DAY, Math.min(1, (hour - 8) / 2));
        } else if (hour >= 18 && hour < 20) {
            skyColor = Utils.lerpColor(CONFIG.COLORS.SKY_DAY, CONFIG.COLORS.SKY_DUSK, (hour - 18) / 2);
        } else if (hour >= 20 && hour < 22) {
            skyColor = Utils.lerpColor(CONFIG.COLORS.SKY_DUSK, CONFIG.COLORS.SKY_NIGHT, (hour - 20) / 2);
        } else {
            skyColor = CONFIG.COLORS.SKY_NIGHT;
        }
        ctx.fillStyle = skyColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    _drawWater(ctx, world, bounds, gameTime) {
        this.waterOffset += 0.3;
        const tileSize = 80;

        for (let x = Math.floor(bounds.left / tileSize) * tileSize; x < bounds.right; x += tileSize) {
            for (let y = Math.floor(bounds.top / tileSize) * tileSize; y < bounds.bottom; y += tileSize) {
                if (world.isOnIsland(x + tileSize / 2, y + tileSize / 2)) continue;

                const wave = Math.sin((x + this.waterOffset) * 0.02) * 0.1 +
                    Math.cos((y + this.waterOffset * 0.7) * 0.03) * 0.1;
                const t = Utils.clamp(0.5 + wave, 0, 1);
                ctx.fillStyle = Utils.lerpColor(CONFIG.COLORS.WATER_DEEP, CONFIG.COLORS.WATER_SHALLOW, t);
                ctx.fillRect(x, y, tileSize + 1, tileSize + 1);

                // Wave highlight
                if (wave > 0.05) {
                    ctx.fillStyle = 'rgba(255,255,255,0.08)';
                    ctx.fillRect(x, y, tileSize + 1, tileSize + 1);
                }
            }
        }
    }

    _drawBeach(ctx, world, bounds) {
        const tileSize = 40;
        for (let x = Math.floor(bounds.left / tileSize) * tileSize; x < bounds.right; x += tileSize) {
            for (let y = Math.floor(bounds.top / tileSize) * tileSize; y < bounds.bottom; y += tileSize) {
                if (world.isOnBeach(x + tileSize / 2, y + tileSize / 2)) {
                    ctx.fillStyle = CONFIG.COLORS.SAND;
                    ctx.fillRect(x, y, tileSize + 1, tileSize + 1);
                }
            }
        }
    }

    _drawLand(ctx, world, bounds) {
        const tileSize = 80;
        for (let x = Math.floor(bounds.left / tileSize) * tileSize; x < bounds.right; x += tileSize) {
            for (let y = Math.floor(bounds.top / tileSize) * tileSize; y < bounds.bottom; y += tileSize) {
                const cx = x + tileSize / 2;
                const cy = y + tileSize / 2;
                if (world._isInsideBeach(cx, cy) && !world.isOnRoad(cx, cy)) {
                    const grassVar = ((x * 7 + y * 13) % 3 === 0) ? CONFIG.COLORS.GRASS_DARK : CONFIG.COLORS.GRASS;
                    ctx.fillStyle = grassVar;
                    ctx.fillRect(x, y, tileSize + 1, tileSize + 1);
                }
            }
        }
    }

    _drawRoads(ctx, world, bounds) {
        for (const road of world.roads) {
            if (!Utils.rectOverlap(road.x, road.y, road.width, road.height,
                bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top)) continue;

            // Road surface
            ctx.fillStyle = CONFIG.COLORS.ROAD;
            ctx.fillRect(road.x, road.y, road.width, road.height);

            // Sidewalks
            const sw = CONFIG.SIDEWALK_WIDTH;
            ctx.fillStyle = CONFIG.COLORS.SIDEWALK;
            if (road.horizontal && !road.ring) {
                ctx.fillRect(road.x, road.y - sw, road.width, sw);
                ctx.fillRect(road.x, road.y + road.height, road.width, sw);
            } else if (!road.ring) {
                ctx.fillRect(road.x - sw, road.y, sw, road.height);
                ctx.fillRect(road.x + road.width, road.y, sw, road.height);
            }

            // Center line
            if (!road.ring) {
                ctx.strokeStyle = CONFIG.COLORS.ROAD_LINE;
                ctx.lineWidth = 2;
                ctx.setLineDash([20, 15]);
                ctx.beginPath();
                if (road.horizontal) {
                    ctx.moveTo(road.x, road.y + road.height / 2);
                    ctx.lineTo(road.x + road.width, road.y + road.height / 2);
                } else {
                    ctx.moveTo(road.x + road.width / 2, road.y);
                    ctx.lineTo(road.x + road.width / 2, road.y + road.height);
                }
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Road edge lines
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            if (road.horizontal && !road.ring) {
                ctx.beginPath();
                ctx.moveTo(road.x, road.y);
                ctx.lineTo(road.x + road.width, road.y);
                ctx.moveTo(road.x, road.y + road.height);
                ctx.lineTo(road.x + road.width, road.y + road.height);
                ctx.stroke();
            } else if (!road.ring) {
                ctx.beginPath();
                ctx.moveTo(road.x, road.y);
                ctx.lineTo(road.x, road.y + road.height);
                ctx.moveTo(road.x + road.width, road.y);
                ctx.lineTo(road.x + road.width, road.y + road.height);
                ctx.stroke();
            }
        }
    }

    _drawBuildingShadows(ctx, world, bounds, gameTime) {
        const hour = gameTime % 24;
        const shadowAngle = ((hour - 6) / 12) * Math.PI;
        const shadowLen = Math.abs(Math.sin(shadowAngle)) * 0.3 + 0.1;

        for (const b of world.buildings) {
            if (!Utils.rectOverlap(b.x, b.y, b.width + 40, b.height + 40,
                bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top)) continue;

            const offsetX = Math.cos(shadowAngle) * b.floors * 3;
            const offsetY = Math.sin(shadowAngle) * b.floors * 3 * shadowLen;

            ctx.fillStyle = CONFIG.COLORS.BUILDING_SHADOW;
            ctx.fillRect(b.x + offsetX, b.y + offsetY, b.width, b.height);
        }
    }

    _drawBuildings(ctx, world, bounds, gameTime) {
        const isNight = gameTime % 24 > 20 || gameTime % 24 < 6;
        const neonGlow = Math.sin(this.neonPhase) * 0.3 + 0.7;

        for (const b of world.buildings) {
            if (!Utils.rectOverlap(b.x - 5, b.y - 5, b.width + 10, b.height + 10,
                bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top)) continue;

            // Building body
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.width, b.height);

            // Roof edge (slightly darker)
            ctx.fillStyle = b.roofColor;
            ctx.fillRect(b.x, b.y, b.width, 3);
            ctx.fillRect(b.x, b.y, 3, b.height);

            // Outline
            ctx.strokeStyle = Utils.darkenColor(b.color, 0.2);
            ctx.lineWidth = 1;
            ctx.strokeRect(b.x, b.y, b.width, b.height);

            // Windows
            if (b.windows) {
                for (const w of b.windows) {
                    if (isNight && w.lit) {
                        ctx.fillStyle = 'rgba(255, 230, 150, 0.8)';
                        ctx.shadowColor = 'rgba(255, 230, 150, 0.5)';
                        ctx.shadowBlur = 3;
                    } else {
                        ctx.fillStyle = isNight ? 'rgba(30, 30, 50, 0.6)' : 'rgba(150, 200, 255, 0.4)';
                        ctx.shadowBlur = 0;
                    }
                    ctx.fillRect(b.x + w.rx, b.y + w.ry, 4, 4);
                }
                ctx.shadowBlur = 0;
            }

            // Neon signs
            if (b.neon && isNight) {
                ctx.save();
                ctx.shadowColor = b.neon.color;
                ctx.shadowBlur = 12 * neonGlow;
                ctx.fillStyle = b.neon.color;
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                if (b.neon.side === 'top') {
                    ctx.fillText(b.neon.text, b.x + b.width / 2, b.y - 4);
                } else {
                    ctx.save();
                    ctx.translate(b.x - 4, b.y + b.height / 2);
                    ctx.rotate(-Math.PI / 2);
                    ctx.fillText(b.neon.text, 0, 0);
                    ctx.restore();
                }
                ctx.restore();
            }
        }
    }

    _drawTrees(ctx, world, bounds, gameTime) {
        const windSway = Math.sin(gameTime * 2) * 3;

        for (const tree of world.trees) {
            if (!Utils.pointInRect(tree.x, tree.y, bounds.left, bounds.top,
                bounds.right - bounds.left, bounds.bottom - bounds.top)) continue;

            ctx.save();
            ctx.translate(tree.x, tree.y);

            if (tree.type === 'palm') {
                // Trunk
                ctx.strokeStyle = '#8B6914';
                ctx.lineWidth = 3;
                const sway = windSway * Math.sin(tree.swayOffset);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(sway, -tree.size, sway * 1.5, -tree.size * 2);
                ctx.stroke();

                // Fronds
                const frondX = sway * 1.5;
                const frondY = -tree.size * 2;
                ctx.fillStyle = '#228B22';
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + sway * 0.05;
                    ctx.beginPath();
                    ctx.ellipse(
                        frondX + Math.cos(angle) * tree.size * 0.5,
                        frondY + Math.sin(angle) * tree.size * 0.3,
                        tree.size * 0.8, tree.size * 0.25,
                        angle, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
            } else {
                // Round tree
                ctx.fillStyle = '#1a6b1a';
                ctx.beginPath();
                ctx.arc(0, 0, tree.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#228B22';
                ctx.beginPath();
                ctx.arc(-2, -2, tree.size * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    _drawProps(ctx, world, bounds, gameTime) {
        const isNight = gameTime % 24 > 20 || gameTime % 24 < 6;

        for (const prop of world.props) {
            if (!Utils.pointInRect(prop.x, prop.y, bounds.left, bounds.top,
                bounds.right - bounds.left, bounds.bottom - bounds.top)) continue;

            switch (prop.type) {
                case 'streetlight':
                    // Pole
                    ctx.fillStyle = '#555';
                    ctx.fillRect(prop.x - 1.5, prop.y - 20, 3, 20);
                    ctx.fillRect(prop.x - 6, prop.y - 22, 12, 4);

                    // Light
                    if (isNight) {
                        ctx.save();
                        ctx.fillStyle = 'rgba(255, 230, 150, 0.15)';
                        ctx.beginPath();
                        ctx.arc(prop.x, prop.y, 50, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#ffeaa7';
                        ctx.shadowColor = '#ffeaa7';
                        ctx.shadowBlur = 8;
                        ctx.beginPath();
                        ctx.arc(prop.x, prop.y - 20, 3, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                    break;

                case 'bench':
                    ctx.fillStyle = '#8B6914';
                    ctx.fillRect(prop.x - 10, prop.y - 3, 20, 6);
                    ctx.fillRect(prop.x - 8, prop.y - 5, 2, 2);
                    ctx.fillRect(prop.x + 6, prop.y - 5, 2, 2);
                    break;

                case 'trashcan':
                    ctx.fillStyle = '#555';
                    ctx.beginPath();
                    ctx.arc(prop.x, prop.y, 5, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'hydrant':
                    ctx.fillStyle = '#e74c3c';
                    ctx.fillRect(prop.x - 3, prop.y - 6, 6, 10);
                    ctx.fillRect(prop.x - 5, prop.y - 3, 10, 3);
                    break;

                case 'mailbox':
                    ctx.fillStyle = '#2c3e50';
                    ctx.fillRect(prop.x - 4, prop.y - 8, 8, 12);
                    ctx.fillStyle = '#3498db';
                    ctx.fillRect(prop.x - 5, prop.y - 10, 10, 4);
                    break;
            }
        }
    }

    _drawPickups(ctx, world, gameTime) {
        const bob = Math.sin(gameTime * 4) * 3;
        const glow = Math.sin(gameTime * 6) * 0.3 + 0.7;

        for (const pickup of world.pickups) {
            if (!pickup.active) continue;

            ctx.save();
            ctx.translate(pickup.x, pickup.y + bob);

            switch (pickup.type) {
                case 'health':
                    ctx.fillStyle = '#e74c3c';
                    ctx.shadowColor = '#e74c3c';
                    ctx.shadowBlur = 10 * glow;
                    ctx.fillRect(-6, -2, 12, 4);
                    ctx.fillRect(-2, -6, 4, 12);
                    break;

                case 'armor':
                    ctx.fillStyle = '#3498db';
                    ctx.shadowColor = '#3498db';
                    ctx.shadowBlur = 10 * glow;
                    ctx.beginPath();
                    ctx.moveTo(0, -8);
                    ctx.lineTo(8, -3);
                    ctx.lineTo(8, 3);
                    ctx.lineTo(0, 8);
                    ctx.lineTo(-8, 3);
                    ctx.lineTo(-8, -3);
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'weapon':
                    ctx.fillStyle = '#f39c12';
                    ctx.shadowColor = '#f39c12';
                    ctx.shadowBlur = 10 * glow;
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const icon = CONFIG.WEAPON_TYPES[pickup.weapon]?.icon || '?';
                    ctx.fillText(icon, 0, 0);
                    break;

                case 'money':
                    ctx.fillStyle = '#2ecc71';
                    ctx.shadowColor = '#2ecc71';
                    ctx.shadowBlur = 10 * glow;
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('$', 0, 0);
                    break;
            }

            ctx.restore();
        }
    }

    _drawMissionMarkers(ctx, missions, gameTime) {
        const bob = Math.sin(gameTime * 3) * 5;
        const pulse = Math.sin(gameTime * 4) * 0.3 + 0.7;

        // Active mission markers
        for (const marker of missions.getActiveMarkers()) {
            ctx.save();
            ctx.translate(marker.x, marker.y);

            // Pulsing circle
            ctx.strokeStyle = `rgba(241, 196, 0, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, marker.radius || 30, 0, Math.PI * 2);
            ctx.stroke();

            // Arrow
            ctx.fillStyle = '#f1c40f';
            ctx.shadowColor = '#f1c40f';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, -20 + bob);
            ctx.lineTo(-8, -30 + bob);
            ctx.lineTo(8, -30 + bob);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        // Mission start markers (pink M)
        for (const marker of missions.getMissionStartMarkers()) {
            ctx.save();
            ctx.translate(marker.x, marker.y);

            ctx.fillStyle = '#ff6ec7';
            ctx.shadowColor = '#ff6ec7';
            ctx.shadowBlur = 15 * pulse;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('M', 0, 1);

            ctx.restore();
        }
    }

    _drawPlayer(ctx, player, gameTime) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.rotation);

        // Invincibility flash
        if (player.invincibleTimer > 0 && Math.sin(gameTime * 20) > 0) {
            ctx.globalAlpha = 0.5;
        }

        // Body
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(0, 0, player.size, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator (head)
        ctx.fillStyle = '#f4c89a';
        ctx.beginPath();
        ctx.arc(5, 0, player.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Weapon
        if (player.currentWeapon !== 'fist') {
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(8, 3);
            ctx.lineTo(18, 3);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawVehicle(ctx, vehicle, gameTime) {
        ctx.save();
        ctx.translate(vehicle.x, vehicle.y);
        ctx.rotate(vehicle.rotation);

        const hw = vehicle.width / 2;
        const hl = vehicle.length / 2;
        const stats = CONFIG.VEHICLE_TYPES[vehicle.type];

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-hw + 3, -hl + 3, vehicle.width, vehicle.length);

        // Body
        ctx.fillStyle = vehicle.color;
        ctx.fillRect(-hw, -hl, vehicle.width, vehicle.length);

        // Windshield
        ctx.fillStyle = 'rgba(150, 200, 255, 0.5)';
        ctx.fillRect(-hw + 3, -hl + 8, vehicle.width - 6, 10);

        // Rear window
        ctx.fillStyle = 'rgba(100, 150, 200, 0.4)';
        ctx.fillRect(-hw + 4, hl - 14, vehicle.width - 8, 8);

        // Headlights
        ctx.fillStyle = '#ffeaa7';
        ctx.fillRect(-hw + 2, -hl, 4, 3);
        ctx.fillRect(hw - 6, -hl, 4, 3);

        // Taillights
        ctx.fillStyle = vehicle.brakeLight ? '#ff0000' : '#8b0000';
        ctx.fillRect(-hw + 2, hl - 3, 4, 3);
        ctx.fillRect(hw - 6, hl - 3, 4, 3);

        // Damage (deterministic scratch positions based on vehicle identity)
        if (vehicle.damaged) {
            if (!vehicle._scratchCache) {
                const s = Utils.seededRandom(vehicle.x * 7 + vehicle.y * 13 + vehicle.health);
                vehicle._scratchCache = [];
                for (let i = 0; i < 3; i++) {
                    vehicle._scratchCache.push({
                        x1: s() * hw * 2 - hw, y1: s() * hl * 2 - hl,
                        x2: s() * hw * 2 - hw, y2: s() * hl * 2 - hl
                    });
                }
            }
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            for (const sc of vehicle._scratchCache) {
                ctx.beginPath();
                ctx.moveTo(sc.x1, sc.y1);
                ctx.lineTo(sc.x2, sc.y2);
                ctx.stroke();
            }
        }

        // Fire (varied colors per blob)
        if (vehicle.onFire) {
            const fireColors = ['#e74c3c', '#f39c12', '#f1c40f'];
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = fireColors[i % 3];
                const fx = Utils.rand(-hw, hw);
                const fy = Utils.rand(-hl, hl);
                ctx.beginPath();
                ctx.arc(fx, fy, Utils.rand(3, 8), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Police livery
        if (vehicle.isPolice) {
            // White stripe
            ctx.fillStyle = '#fff';
            ctx.fillRect(-hw, -5, vehicle.width, 10);

            // Siren lights
            const phase = vehicle.sirenPhase || 0;
            ctx.fillStyle = Math.sin(phase) > 0 ? '#0000ff' : '#ff0000';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(Math.sin(phase) > 0 ? -4 : 4, -hl + 14, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // POLICE text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 6px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('VCPD', 0, 3);
        }

        // Drift marks
        if (vehicle.drifting) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#333';
            ctx.fillRect(-hw, hl - 5, 4, 10);
            ctx.fillRect(hw - 4, hl - 5, 4, 10);
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }

    _drawExplodedVehicle(ctx, vehicle) {
        ctx.save();
        ctx.translate(vehicle.x, vehicle.y);
        ctx.rotate(vehicle.rotation);

        const hw = vehicle.width / 2;
        const hl = vehicle.length / 2;

        // Burnt wreck
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-hw, -hl, vehicle.width, vehicle.length);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(-hw, -hl, vehicle.width, vehicle.length);

        // Smoke wisps
        ctx.fillStyle = 'rgba(50,50,50,0.3)';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(Utils.rand(-hw, hw), Utils.rand(-hl, hl) - 10, Utils.rand(3, 8), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawPedestrian(ctx, ped, isPolice = false) {
        ctx.save();
        ctx.translate(ped.x, ped.y);
        ctx.rotate(ped.rotation);

        // Body
        ctx.fillStyle = isPolice ? '#1a1a6e' : ped.shirtColor;
        ctx.beginPath();
        ctx.arc(0, 0, ped.size, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = ped.skinColor;
        ctx.beginPath();
        ctx.arc(5, 0, ped.size * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Police badge/hat
        if (isPolice) {
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(2, -3, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    _drawProjectiles(ctx, weapons) {
        for (const p of weapons.projectiles) {
            if (p.melee) continue;

            ctx.save();

            if (p.type === 'rocket') {
                ctx.fillStyle = '#e74c3c';
                ctx.shadowColor = '#ff6600';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
                // Trail
                ctx.fillStyle = 'rgba(255, 100, 0, 0.3)';
                ctx.beginPath();
                ctx.arc(p.x - p.vx * 0.01, p.y - p.vy * 0.01, 6, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#f1c40f';
                ctx.shadowColor = '#f1c40f';
                ctx.shadowBlur = 4;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fill();

                // Tracer line
                ctx.strokeStyle = 'rgba(241, 196, 0, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
                ctx.stroke();
            }

            ctx.restore();
        }
    }
}
