// ============================================================
// World Generation - Vice City inspired island
// ============================================================

class World {
    constructor() {
        this.width = CONFIG.WORLD_WIDTH;
        this.height = CONFIG.WORLD_HEIGHT;
        this.roads = [];
        this.buildings = [];
        this.trees = [];
        this.props = [];
        this.waterEdge = [];
        this.bridges = [];
        this.districts = [];
        this.pickups = [];
        this.collisionGrid = {};
        this.gridSize = 200;

        this._generate();
    }

    _generate() {
        this._generateIslandShape();
        this._generateDistricts();
        this._generateRoads();
        this._generateBuildings();
        this._generateTrees();
        this._generateProps();
        this._generatePickups();
        this._buildCollisionGrid();
    }

    _generateIslandShape() {
        // Island shape defined as polygon points
        const cx = this.width / 2;
        const cy = this.height / 2;
        const rng = Utils.seededRandom(42);

        // Main island - irregular shape
        this.islandPoints = [];
        const baseRadius = 2200;
        for (let a = 0; a < Math.PI * 2; a += 0.1) {
            const noise = rng() * 400 - 200;
            // Create bays and peninsulas
            let r = baseRadius + noise;
            // Indent for harbor on east side
            if (a > 1.2 && a < 2.0) r -= 300;
            // Peninsula south
            if (a > 3.5 && a < 4.2) r += 200;
            this.islandPoints.push({
                x: cx + Math.cos(a) * r,
                y: cy + Math.sin(a) * r
            });
        }

        // Beach areas (slightly inside island edge)
        this.beachPoints = this.islandPoints.map(p => ({
            x: cx + (p.x - cx) * 0.95,
            y: cy + (p.y - cy) * 0.95
        }));
    }

    isOnIsland(x, y) {
        // Ray casting point-in-polygon test
        let inside = false;
        const pts = this.islandPoints;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = pts[i].x, yi = pts[i].y;
            const xj = pts[j].x, yj = pts[j].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    isOnBeach(x, y) {
        return this.isOnIsland(x, y) && !this._isInsideBeach(x, y);
    }

    _isInsideBeach(x, y) {
        let inside = false;
        const pts = this.beachPoints;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = pts[i].x, yi = pts[i].y;
            const xj = pts[j].x, yj = pts[j].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    _generateDistricts() {
        const cx = this.width / 2;
        const cy = this.height / 2;
        this.districts = [
            { name: 'Ocean Beach', cx: cx, cy: cy + 1400, radius: 800, color: CONFIG.DISTRICTS.OCEAN_BEACH.color },
            { name: 'Vice Point', cx: cx + 1000, cy: cy - 400, radius: 900, color: CONFIG.DISTRICTS.VICE_POINT.color },
            { name: 'Downtown', cx: cx - 200, cy: cy - 1200, radius: 1000, color: CONFIG.DISTRICTS.DOWNTOWN.color },
            { name: 'Little Havana', cx: cx - 1200, cy: cy + 200, radius: 800, color: CONFIG.DISTRICTS.LITTLE_HAVANA.color },
            { name: 'Starfish Island', cx: cx, cy: cy, radius: 500, color: CONFIG.DISTRICTS.STARFISH_ISLAND.color },
            { name: 'Vice Port', cx: cx + 1200, cy: cy + 800, radius: 700, color: CONFIG.DISTRICTS.INDUSTRIAL.color }
        ];
    }

    getDistrict(x, y) {
        let closest = null;
        let closestDist = Infinity;
        for (const d of this.districts) {
            const dist = Utils.dist(x, y, d.cx, d.cy);
            if (dist < d.radius && dist < closestDist) {
                closest = d;
                closestDist = dist;
            }
        }
        return closest || { name: 'Vice City', color: '#ffffff' };
    }

    _generateRoads() {
        const cx = this.width / 2;
        const cy = this.height / 2;
        const RW = CONFIG.ROAD_WIDTH;

        // Main avenues (horizontal)
        const hRoads = [-1600, -1000, -400, 200, 800, 1400];
        hRoads.forEach(offsetY => {
            this.roads.push({
                x: cx - 2000, y: cy + offsetY - RW / 2,
                width: 4000, height: RW,
                horizontal: true, major: Math.abs(offsetY) < 500
            });
        });

        // Main streets (vertical)
        const vRoads = [-1600, -1000, -400, 200, 800, 1400];
        vRoads.forEach(offsetX => {
            this.roads.push({
                x: cx + offsetX - RW / 2, y: cy - 2000,
                width: RW, height: 4000,
                horizontal: false, major: Math.abs(offsetX) < 500
            });
        });

        // Coastal road (approximate ring road)
        const ringSegments = 32;
        const ringRadius = 1800;
        for (let i = 0; i < ringSegments; i++) {
            const a1 = (i / ringSegments) * Math.PI * 2;
            const a2 = ((i + 1) / ringSegments) * Math.PI * 2;
            const x1 = cx + Math.cos(a1) * ringRadius;
            const y1 = cy + Math.sin(a1) * ringRadius;
            const x2 = cx + Math.cos(a2) * ringRadius;
            const y2 = cy + Math.sin(a2) * ringRadius;
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const length = Utils.dist(x1, y1, x2, y2);

            this.roads.push({
                x: Math.min(x1, x2) - 10,
                y: Math.min(y1, y2) - 10,
                width: Math.abs(x2 - x1) + RW,
                height: Math.abs(y2 - y1) + RW,
                horizontal: true, major: true,
                ring: true, angle,
                sx: x1, sy: y1, ex: x2, ey: y2
            });
        }

        // Filter roads to only include segments on the island
        this.roads = this.roads.filter(r => {
            const midX = r.x + r.width / 2;
            const midY = r.y + r.height / 2;
            return this.isOnIsland(midX, midY);
        });
    }

    isOnRoad(x, y) {
        for (const road of this.roads) {
            if (Utils.pointInRect(x, y, road.x, road.y, road.width, road.height)) {
                return true;
            }
        }
        return false;
    }

    isOnSidewalk(x, y) {
        const sw = CONFIG.SIDEWALK_WIDTH;
        for (const road of this.roads) {
            if (Utils.pointInRect(x, y,
                road.x - sw, road.y - sw,
                road.width + sw * 2, road.height + sw * 2) &&
                !Utils.pointInRect(x, y, road.x, road.y, road.width, road.height)) {
                return true;
            }
        }
        return false;
    }

    _generateBuildings() {
        const rng = Utils.seededRandom(123);
        const cx = this.width / 2;
        const cy = this.height / 2;

        // Place buildings along roads
        for (const road of this.roads) {
            if (road.ring) continue;

            const spacing = 70;
            if (road.horizontal) {
                for (let x = road.x; x < road.x + road.width; x += spacing + rng() * 40) {
                    // Buildings on both sides of road
                    for (const side of [-1, 1]) {
                        const by = road.y + (side === -1 ? -60 - rng() * 40 : road.height + 20);
                        const bx = x + rng() * 20;
                        this._tryPlaceBuilding(bx, by, rng, cx, cy);
                    }
                }
            } else {
                for (let y = road.y; y < road.y + road.height; y += spacing + rng() * 40) {
                    for (const side of [-1, 1]) {
                        const bx = road.x + (side === -1 ? -60 - rng() * 40 : road.width + 20);
                        const by = y + rng() * 20;
                        this._tryPlaceBuilding(bx, by, rng, cx, cy);
                    }
                }
            }
        }
    }

    _tryPlaceBuilding(x, y, rng, cx, cy) {
        if (!this._isInsideBeach(x, y)) return;

        const district = this.getDistrict(x, y);
        let w, h, floors, color, style;

        if (district.name === 'Downtown') {
            w = 40 + rng() * 50;
            h = 40 + rng() * 50;
            floors = 5 + Math.floor(rng() * 20);
            color = Utils.randChoice(['#34495e', '#2c3e50', '#5d6d7e', '#4a6fa5', '#283747']);
            style = 'skyscraper';
        } else if (district.name === 'Ocean Beach') {
            w = 30 + rng() * 30;
            h = 30 + rng() * 30;
            floors = 2 + Math.floor(rng() * 5);
            color = Utils.randChoice(['#f8c8d8', '#d5f5e3', '#d6eaf8', '#fdebd0', '#fadbd8']);
            style = 'artdeco';
        } else if (district.name === 'Little Havana') {
            w = 25 + rng() * 30;
            h = 25 + rng() * 25;
            floors = 1 + Math.floor(rng() * 3);
            color = Utils.randChoice(['#f39c12', '#e74c3c', '#f1c40f', '#e67e22', '#d35400']);
            style = 'residential';
        } else if (district.name === 'Vice Port') {
            w = 50 + rng() * 60;
            h = 40 + rng() * 80;
            floors = 1 + Math.floor(rng() * 2);
            color = Utils.randChoice(['#95a5a6', '#7f8c8d', '#bdc3c7', '#707b7c']);
            style = 'industrial';
        } else if (district.name === 'Starfish Island') {
            w = 50 + rng() * 40;
            h = 40 + rng() * 30;
            floors = 2 + Math.floor(rng() * 3);
            color = Utils.randChoice(['#ecf0f1', '#fdebd0', '#d5f5e3', '#ebdef0']);
            style = 'mansion';
        } else {
            w = 30 + rng() * 40;
            h = 30 + rng() * 40;
            floors = 2 + Math.floor(rng() * 8);
            color = Utils.randChoice(['#2c3e50', '#34495e', '#5d6d7e', '#aeb6bf']);
            style = 'residential';
        }

        // Check no overlap with roads or other buildings
        const margin = 10;
        for (const road of this.roads) {
            if (Utils.rectOverlap(x, y, w, h, road.x - margin, road.y - margin, road.width + margin * 2, road.height + margin * 2)) {
                return;
            }
        }
        for (const b of this.buildings) {
            if (Utils.rectOverlap(x, y, w, h, b.x - 5, b.y - 5, b.width + 10, b.height + 10)) {
                return;
            }
        }

        // Generate windows
        const windows = [];
        const winSpacing = 10;
        const winSize = 4;
        for (let wx = 4; wx < w - 4; wx += winSpacing) {
            for (let wy = 4; wy < h - 4; wy += winSpacing) {
                if (rng() < 0.7) {
                    windows.push({ rx: wx, ry: wy, lit: rng() < 0.5 });
                }
            }
        }

        // Neon signs for certain buildings
        let neon = null;
        if (style === 'artdeco' && rng() < 0.3) {
            neon = {
                color: Utils.randChoice([CONFIG.COLORS.NEON_PINK, CONFIG.COLORS.NEON_CYAN, CONFIG.COLORS.NEON_PURPLE]),
                text: Utils.randChoice(['BAR', 'HOTEL', 'CLUB', 'CAFE', 'SHOP', 'GYM', '24/7']),
                side: rng() < 0.5 ? 'top' : 'left'
            };
        } else if (style === 'skyscraper' && rng() < 0.2) {
            neon = {
                color: Utils.randChoice([CONFIG.COLORS.NEON_PINK, CONFIG.COLORS.NEON_CYAN]),
                text: Utils.randChoice(['VC BANK', 'TOWER', 'INC', 'CORP']),
                side: 'top'
            };
        }

        this.buildings.push({
            x, y, width: w, height: h, floors, color, style,
            windows, neon,
            shadowColor: Utils.darkenColor(color, 0.3),
            roofColor: Utils.darkenColor(color, 0.15)
        });
    }

    _generateTrees() {
        const rng = Utils.seededRandom(789);

        // Palm trees along beaches and roads
        for (let i = 0; i < 500; i++) {
            const x = rng() * this.width;
            const y = rng() * this.height;

            if (!this.isOnIsland(x, y)) continue;
            if (this.isOnRoad(x, y)) continue;

            // Check not inside buildings
            let inBuilding = false;
            for (const b of this.buildings) {
                if (Utils.pointInRect(x, y, b.x - 5, b.y - 5, b.width + 10, b.height + 10)) {
                    inBuilding = true;
                    break;
                }
            }
            if (inBuilding) continue;

            const isBeach = this.isOnBeach(x, y);
            const isPalm = isBeach || rng() < 0.4;

            this.trees.push({
                x, y,
                type: isPalm ? 'palm' : 'round',
                size: 8 + rng() * 8,
                swayOffset: rng() * Math.PI * 2,
                shade: rng() < 0.5
            });
        }
    }

    _generateProps() {
        const rng = Utils.seededRandom(456);

        // Street lights along roads
        for (const road of this.roads) {
            if (road.ring) continue;
            const spacing = 150;
            if (road.horizontal) {
                for (let x = road.x; x < road.x + road.width; x += spacing) {
                    this.props.push({ type: 'streetlight', x: x, y: road.y - 12 });
                    this.props.push({ type: 'streetlight', x: x, y: road.y + road.height + 12 });
                }
            } else {
                for (let y = road.y; y < road.y + road.height; y += spacing) {
                    this.props.push({ type: 'streetlight', x: road.x - 12, y: y });
                    this.props.push({ type: 'streetlight', x: road.x + road.width + 12, y: y });
                }
            }
        }

        // Benches, trash cans, etc. on sidewalks
        for (let i = 0; i < 200; i++) {
            const x = rng() * this.width;
            const y = rng() * this.height;
            if (!this.isOnSidewalk(x, y)) continue;

            const type = Utils.randChoice(['bench', 'trashcan', 'hydrant', 'mailbox']);
            this.props.push({ type, x, y });
        }
    }

    _generatePickups() {
        const rng = Utils.seededRandom(321);

        // Health pickups
        for (let i = 0; i < 15; i++) {
            const pos = this._randomRoadPosition(rng);
            if (pos) {
                this.pickups.push({
                    type: 'health', x: pos.x, y: pos.y,
                    active: true, respawnTime: 30, timer: 0
                });
            }
        }

        // Armor pickups
        for (let i = 0; i < 8; i++) {
            const pos = this._randomRoadPosition(rng);
            if (pos) {
                this.pickups.push({
                    type: 'armor', x: pos.x, y: pos.y,
                    active: true, respawnTime: 45, timer: 0
                });
            }
        }

        // Weapon pickups
        const weaponTypes = ['pistol', 'shotgun', 'smg', 'rifle', 'rocket'];
        for (let i = 0; i < 20; i++) {
            const pos = this._randomRoadPosition(rng);
            if (pos) {
                this.pickups.push({
                    type: 'weapon',
                    weapon: weaponTypes[i % weaponTypes.length],
                    x: pos.x, y: pos.y,
                    active: true, respawnTime: 60, timer: 0
                });
            }
        }

        // Money pickups
        for (let i = 0; i < 25; i++) {
            const pos = this._randomRoadPosition(rng);
            if (pos) {
                this.pickups.push({
                    type: 'money', x: pos.x, y: pos.y,
                    amount: Utils.randInt(50, 500),
                    active: true, respawnTime: 90, timer: 0
                });
            }
        }
    }

    _randomRoadPosition(rng) {
        for (let attempt = 0; attempt < 20; attempt++) {
            const road = this.roads[Math.floor(rng() * this.roads.length)];
            if (road.ring) continue;
            const x = road.x + rng() * road.width;
            const y = road.y + rng() * road.height;
            if (this.isOnIsland(x, y)) return { x, y };
        }
        return null;
    }

    _buildCollisionGrid() {
        // Spatial hash for buildings
        this.collisionGrid = {};
        for (const b of this.buildings) {
            const minGX = Math.floor(b.x / this.gridSize);
            const maxGX = Math.floor((b.x + b.width) / this.gridSize);
            const minGY = Math.floor(b.y / this.gridSize);
            const maxGY = Math.floor((b.y + b.height) / this.gridSize);
            for (let gx = minGX; gx <= maxGX; gx++) {
                for (let gy = minGY; gy <= maxGY; gy++) {
                    const key = `${gx},${gy}`;
                    if (!this.collisionGrid[key]) this.collisionGrid[key] = [];
                    this.collisionGrid[key].push(b);
                }
            }
        }
    }

    getBuildingsNear(x, y, radius) {
        const results = new Set();
        const minGX = Math.floor((x - radius) / this.gridSize);
        const maxGX = Math.floor((x + radius) / this.gridSize);
        const minGY = Math.floor((y - radius) / this.gridSize);
        const maxGY = Math.floor((y + radius) / this.gridSize);
        for (let gx = minGX; gx <= maxGX; gx++) {
            for (let gy = minGY; gy <= maxGY; gy++) {
                const key = `${gx},${gy}`;
                if (this.collisionGrid[key]) {
                    for (const b of this.collisionGrid[key]) {
                        results.add(b);
                    }
                }
            }
        }
        return Array.from(results);
    }

    collidesWithBuilding(x, y, w, h) {
        const buildings = this.getBuildingsNear(x + w / 2, y + h / 2, Math.max(w, h));
        for (const b of buildings) {
            if (Utils.rectOverlap(x, y, w, h, b.x, b.y, b.width, b.height)) {
                return b;
            }
        }
        return null;
    }

    circleCollidesBuilding(cx, cy, r) {
        const buildings = this.getBuildingsNear(cx, cy, r + 60);
        for (const b of buildings) {
            if (Utils.circleRectOverlap(cx, cy, r, b.x, b.y, b.width, b.height)) {
                return b;
            }
        }
        return null;
    }

    // Get a random position on a road
    getRandomRoadPosition() {
        for (let i = 0; i < 100; i++) {
            const road = Utils.randChoice(this.roads);
            if (road.ring) continue;
            const x = road.x + Math.random() * road.width;
            const y = road.y + Math.random() * road.height;
            if (this.isOnIsland(x, y)) return { x, y, road };
        }
        return { x: this.width / 2, y: this.height / 2, road: this.roads[0] };
    }

    // Get road direction at position
    getRoadDirection(x, y) {
        for (const road of this.roads) {
            if (Utils.pointInRect(x, y, road.x, road.y, road.width, road.height)) {
                return road.horizontal ? 0 : Math.PI / 2;
            }
        }
        return 0;
    }

    updatePickups(dt) {
        for (const p of this.pickups) {
            if (!p.active) {
                p.timer += dt;
                if (p.timer >= p.respawnTime) {
                    p.active = true;
                    p.timer = 0;
                }
            }
        }
    }
}
