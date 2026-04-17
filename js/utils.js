// ============================================================
// Utility Functions
// ============================================================

const Utils = {
    // Random number between min and max
    rand(min, max) {
        return Math.random() * (max - min) + min;
    },

    // Random integer
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Random element from array
    randChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    // Distance between two points
    dist(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Distance squared (for fast comparisons)
    distSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },

    // Angle from point 1 to point 2
    angleTo(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    // Normalize angle to [-PI, PI]
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    },

    // Linear interpolation
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // Clamp value between min and max
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    // AABB collision
    rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    },

    // Point in rectangle
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    // Circle-circle collision
    circleOverlap(x1, y1, r1, x2, y2, r2) {
        const d = r1 + r2;
        return Utils.distSq(x1, y1, x2, y2) < d * d;
    },

    // Circle vs AABB collision
    circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
        const closestX = Utils.clamp(cx, rx, rx + rw);
        const closestY = Utils.clamp(cy, ry, ry + rh);
        const dx = cx - closestX;
        const dy = cy - closestY;
        return (dx * dx + dy * dy) < (cr * cr);
    },

    // Oriented bounding box collision (for vehicles)
    obbOverlap(a, b) {
        // a and b are {x, y, width, height, rotation}
        const cornersA = Utils.getOBBCorners(a);
        const cornersB = Utils.getOBBCorners(b);
        const axes = Utils.getOBBAxes(cornersA).concat(Utils.getOBBAxes(cornersB));

        for (const axis of axes) {
            const projA = Utils.projectOBB(cornersA, axis);
            const projB = Utils.projectOBB(cornersB, axis);
            if (projA.max < projB.min || projB.max < projA.min) {
                return false;
            }
        }
        return true;
    },

    getOBBCorners(obj) {
        const cos = Math.cos(obj.rotation);
        const sin = Math.sin(obj.rotation);
        const hw = obj.width / 2;
        const hh = obj.height / 2;
        return [
            { x: obj.x + (-hw * cos - -hh * sin), y: obj.y + (-hw * sin + -hh * cos) },
            { x: obj.x + (hw * cos - -hh * sin), y: obj.y + (hw * sin + -hh * cos) },
            { x: obj.x + (hw * cos - hh * sin), y: obj.y + (hw * sin + hh * cos) },
            { x: obj.x + (-hw * cos - hh * sin), y: obj.y + (-hw * sin + hh * cos) }
        ];
    },

    getOBBAxes(corners) {
        const axes = [];
        for (let i = 0; i < 2; i++) {
            const p1 = corners[i];
            const p2 = corners[i + 1];
            const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
            const len = Math.sqrt(edge.x * edge.x + edge.y * edge.y);
            axes.push({ x: -edge.y / len, y: edge.x / len });
        }
        return axes;
    },

    projectOBB(corners, axis) {
        let min = Infinity, max = -Infinity;
        for (const c of corners) {
            const proj = c.x * axis.x + c.y * axis.y;
            min = Math.min(min, proj);
            max = Math.max(max, proj);
        }
        return { min, max };
    },

    // Seeded random for procedural generation
    seededRandom(seed) {
        let s = seed;
        return function () {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };
    },

    // Color manipulation
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Utils.clamp(Math.round(x), 0, 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    lerpColor(c1, c2, t) {
        const a = Utils.hexToRgb(c1);
        const b = Utils.hexToRgb(c2);
        if (!a || !b) return c1;
        return Utils.rgbToHex(
            Utils.lerp(a.r, b.r, t),
            Utils.lerp(a.g, b.g, t),
            Utils.lerp(a.b, b.b, t)
        );
    },

    darkenColor(hex, amount) {
        const c = Utils.hexToRgb(hex);
        if (!c) return hex;
        return Utils.rgbToHex(c.r * (1 - amount), c.g * (1 - amount), c.b * (1 - amount));
    },

    lightenColor(hex, amount) {
        const c = Utils.hexToRgb(hex);
        if (!c) return hex;
        return Utils.rgbToHex(
            c.r + (255 - c.r) * amount,
            c.g + (255 - c.g) * amount,
            c.b + (255 - c.b) * amount
        );
    },

    // Smooth step
    smoothstep(edge0, edge1, x) {
        const t = Utils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    },

    // Rotate point around origin
    rotatePoint(x, y, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos
        };
    },

    // Format number with commas
    formatMoney(n) {
        return '$' + Math.floor(n).toLocaleString();
    },

    // Simple hash for seeding
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return Math.abs(hash);
    }
};
