// ============================================================
// Camera System
// ============================================================

class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.rotation = 0;
        this.screenW = canvas.width;
        this.screenH = canvas.height;

        // Shake
        this.shakeIntensity = 0;
        this.shakeDecay = 5;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        // Smooth follow
        this.followSpeed = 4;
        this.leadAmount = 60;
    }

    follow(entity, dt, isInVehicle, vehicleSpeed) {
        // Lead the camera in the direction the player is moving/looking
        let leadX = 0, leadY = 0;

        if (isInVehicle && vehicleSpeed > 50) {
            const angle = entity.rotation;
            const lead = Utils.clamp(vehicleSpeed / 3, 0, 150);
            leadX = Math.cos(angle) * lead;
            leadY = Math.sin(angle) * lead;
        }

        this.targetX = entity.x + leadX;
        this.targetY = entity.y + leadY;

        // Zoom out when driving fast
        if (isInVehicle) {
            this.targetZoom = Utils.lerp(1.0, 0.6, Utils.clamp(vehicleSpeed / 500, 0, 1));
        } else {
            this.targetZoom = 1.0;
        }

        // Smooth interpolation
        const t = 1 - Math.exp(-this.followSpeed * dt);
        this.x = Utils.lerp(this.x, this.targetX, t);
        this.y = Utils.lerp(this.y, this.targetY, t);
        this.zoom = Utils.lerp(this.zoom, this.targetZoom, t * 0.5);

        // Update shake
        if (this.shakeIntensity > 0) {
            this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeIntensity -= this.shakeDecay * dt;
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
        }
    }

    shake(intensity) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    }

    resize(w, h) {
        this.screenW = w;
        this.screenH = h;
    }

    // Convert world coords to screen coords
    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom + this.screenW / 2 + this.shakeOffsetX,
            y: (wy - this.y) * this.zoom + this.screenH / 2 + this.shakeOffsetY
        };
    }

    // Convert screen coords to world coords
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.screenW / 2 - this.shakeOffsetX) / this.zoom + this.x,
            y: (sy - this.screenH / 2 - this.shakeOffsetY) / this.zoom + this.y
        };
    }

    // Get visible world bounds
    getViewBounds() {
        const hw = (this.screenW / 2) / this.zoom + 100;
        const hh = (this.screenH / 2) / this.zoom + 100;
        return {
            left: this.x - hw,
            right: this.x + hw,
            top: this.y - hh,
            bottom: this.y + hh
        };
    }

    // Check if a world point is visible
    isVisible(wx, wy, margin = 50) {
        const bounds = this.getViewBounds();
        return wx > bounds.left - margin && wx < bounds.right + margin &&
            wy > bounds.top - margin && wy < bounds.bottom + margin;
    }

    // Apply camera transform to canvas context
    applyTransform(ctx) {
        ctx.save();
        ctx.translate(
            this.screenW / 2 + this.shakeOffsetX,
            this.screenH / 2 + this.shakeOffsetY
        );
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }

    // Restore canvas context
    restoreTransform(ctx) {
        ctx.restore();
    }
}
