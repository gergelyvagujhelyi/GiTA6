// ============================================================
// Input Handler
// ============================================================

class InputHandler {
    constructor() {
        this.keys = {};
        this.keysJustPressed = {};
        this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, justPressed: false };
        this.isMobile = 'ontouchstart' in window && window.innerWidth < 1024;

        this._bindEvents();
        if (this.isMobile) this._bindMobile();
    }

    _bindEvents() {
        window.addEventListener('keydown', e => {
            if (e.repeat) return;
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            this.keysJustPressed[key] = true;
            // Prevent scrolling with game keys
            if (['w', 'a', 's', 'd', ' ', 'tab', 'e', 'f', 'q'].includes(key)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.key.toLowerCase()] = false;
        });

        window.addEventListener('mousedown', e => {
            if (e.button === 0) {
                this.mouse.down = true;
                this.mouse.justPressed = true;
            }
        });

        window.addEventListener('mouseup', e => {
            if (e.button === 0) {
                this.mouse.down = false;
            }
        });

        window.addEventListener('mousemove', e => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        // Prevent right-click menu
        window.addEventListener('contextmenu', e => e.preventDefault());
    }

    _bindMobile() {
        const controls = document.getElementById('mobile-controls');
        if (controls) controls.style.display = 'block';

        // D-pad buttons
        document.querySelectorAll('.dpad-btn').forEach(btn => {
            const key = btn.dataset.key;
            btn.addEventListener('touchstart', e => {
                e.preventDefault();
                this.keys[key] = true;
                this.keysJustPressed[key] = true;
            });
            btn.addEventListener('touchend', e => {
                e.preventDefault();
                this.keys[key] = false;
            });
        });

        // Action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            if (btn.dataset.action === 'shoot') {
                btn.addEventListener('touchstart', e => {
                    e.preventDefault();
                    this.mouse.down = true;
                    this.mouse.justPressed = true;
                });
                btn.addEventListener('touchend', e => {
                    e.preventDefault();
                    this.mouse.down = false;
                });
            } else if (btn.dataset.action === 'enter') {
                btn.addEventListener('touchstart', e => {
                    e.preventDefault();
                    this.keys['f'] = true;
                    this.keysJustPressed['f'] = true;
                });
                btn.addEventListener('touchend', e => {
                    e.preventDefault();
                    this.keys['f'] = false;
                });
            } else if (btn.dataset.key) {
                const key = btn.dataset.key;
                btn.addEventListener('touchstart', e => {
                    e.preventDefault();
                    this.keys[key] = true;
                });
                btn.addEventListener('touchend', e => {
                    e.preventDefault();
                    this.keys[key] = false;
                });
            }
        });
    }

    // Call at end of each frame
    postUpdate() {
        this.keysJustPressed = {};
        this.mouse.justPressed = false;
    }

    isDown(key) {
        return !!this.keys[key];
    }

    justPressed(key) {
        return !!this.keysJustPressed[key];
    }

    // Update mouse world position based on camera
    updateWorldMouse(camera) {
        this.mouse.worldX = (this.mouse.x - camera.screenW / 2) / camera.zoom + camera.x;
        this.mouse.worldY = (this.mouse.y - camera.screenH / 2) / camera.zoom + camera.y;
    }

    // Get movement vector from WASD
    getMovement() {
        let mx = 0, my = 0;
        if (this.keys['w'] || this.keys['arrowup']) my -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) my += 1;
        if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) mx += 1;
        // Normalize diagonal
        if (mx !== 0 && my !== 0) {
            const inv = 1 / Math.SQRT2;
            mx *= inv;
            my *= inv;
        }
        return { x: mx, y: my };
    }

    isSprinting() {
        return this.isDown('shift');
    }
}
