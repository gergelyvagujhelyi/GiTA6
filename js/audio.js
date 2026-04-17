// ============================================================
// Audio System - Procedurally generated sounds
// ============================================================

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = true;
        this.initialized = false;
        this.musicPlaying = false;
        this.radioStations = [
            { name: 'Vice FM', bpm: 120, genre: 'synthwave' },
            { name: 'Flash FM', bpm: 130, genre: 'pop' },
            { name: 'Fever 105', bpm: 115, genre: 'funk' },
            { name: 'Radio Espantoso', bpm: 140, genre: 'latin' },
            { name: 'OFF', bpm: 0, genre: 'none' }
        ];
        this.currentStation = 0;
        this.musicOscillators = [];
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            this.enabled = false;
        }
    }

    // Play a generated sound effect
    play(type, volume = 1.0) {
        if (!this.enabled || !this.initialized) return;
        try {
            switch (type) {
                case 'gunshot': this._gunshot(volume); break;
                case 'shotgun': this._shotgun(volume); break;
                case 'smg': this._smg(volume); break;
                case 'rifle': this._rifle(volume); break;
                case 'rocket': this._rocket(volume); break;
                case 'explosion': this._explosion(volume); break;
                case 'punch': this._punch(volume); break;
                case 'hit': this._hit(volume); break;
                case 'car_start': this._carStart(volume); break;
                case 'car_door': this._carDoor(volume); break;
                case 'screech': this._screech(volume); break;
                case 'crash': this._crash(volume); break;
                case 'siren': this._siren(volume); break;
                case 'pickup': this._pickup(volume); break;
                case 'mission_start': this._missionStart(volume); break;
                case 'mission_complete': this._missionComplete(volume); break;
                case 'wasted': this._wasted(volume); break;
                case 'weapon_switch': this._weaponSwitch(volume); break;
                case 'footstep': this._footstep(volume); break;
                case 'horn': this._horn(volume); break;
            }
        } catch (e) { /* ignore audio errors */ }
    }

    _createOsc(type, freq, duration, vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = vol * 0.3;
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.stop(this.ctx.currentTime + duration + 0.01);
    }

    _createNoise(duration, vol) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = vol * 0.3;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        source.connect(gain);
        gain.connect(this.masterGain);
        source.start();
    }

    _gunshot(vol) {
        this._createNoise(0.1, vol * 0.8);
        this._createOsc('square', 150, 0.05, vol * 0.5);
    }

    _shotgun(vol) {
        this._createNoise(0.2, vol);
        this._createOsc('sawtooth', 80, 0.1, vol * 0.6);
    }

    _smg(vol) {
        this._createNoise(0.06, vol * 0.6);
        this._createOsc('square', 200, 0.03, vol * 0.4);
    }

    _rifle(vol) {
        this._createNoise(0.12, vol * 0.9);
        this._createOsc('square', 120, 0.06, vol * 0.5);
    }

    _rocket(vol) {
        this._createNoise(0.3, vol * 0.5);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 100;
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        gain.gain.value = vol * 0.15;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    _explosion(vol) {
        this._createNoise(0.5, vol);
        this._createOsc('sine', 40, 0.4, vol * 0.6);
        this._createOsc('sine', 20, 0.6, vol * 0.4);
    }

    _punch(vol) {
        this._createNoise(0.05, vol * 0.4);
        this._createOsc('sine', 100, 0.08, vol * 0.5);
    }

    _hit(vol) {
        this._createNoise(0.03, vol * 0.5);
        this._createOsc('sine', 300, 0.05, vol * 0.3);
    }

    _carStart(vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 30;
        osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.3);
        osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        gain.gain.value = vol * 0.1;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    _carDoor(vol) {
        this._createNoise(0.08, vol * 0.3);
        this._createOsc('sine', 400, 0.05, vol * 0.2);
    }

    _screech(vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 800;
        osc.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + 0.3);
        gain.gain.value = vol * 0.06;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    _crash(vol) {
        this._createNoise(0.2, vol * 0.8);
        this._createOsc('sine', 60, 0.15, vol * 0.5);
    }

    _siren(vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600;
        osc.frequency.linearRampToValueAtTime(900, this.ctx.currentTime + 0.3);
        osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.6);
        gain.gain.value = vol * 0.08;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
    }

    _pickup(vol) {
        this._createOsc('sine', 523, 0.1, vol * 0.3);
        setTimeout(() => this._createOsc('sine', 659, 0.1, vol * 0.3), 80);
        setTimeout(() => this._createOsc('sine', 784, 0.15, vol * 0.3), 160);
    }

    _missionStart(vol) {
        [523, 659, 784, 1047].forEach((f, i) => {
            setTimeout(() => this._createOsc('sine', f, 0.2, vol * 0.3), i * 120);
        });
    }

    _missionComplete(vol) {
        [523, 659, 784, 1047, 1318].forEach((f, i) => {
            setTimeout(() => this._createOsc('sine', f, 0.3, vol * 0.4), i * 150);
        });
    }

    _wasted(vol) {
        [400, 350, 300, 200].forEach((f, i) => {
            setTimeout(() => this._createOsc('sine', f, 0.5, vol * 0.4), i * 200);
        });
    }

    _weaponSwitch(vol) {
        this._createOsc('sine', 800, 0.05, vol * 0.2);
        setTimeout(() => this._createOsc('sine', 600, 0.05, vol * 0.2), 50);
    }

    _footstep(vol) {
        this._createNoise(0.03, vol * 0.05);
    }

    _horn(vol) {
        this._createOsc('square', 300, 0.3, vol * 0.15);
        this._createOsc('square', 250, 0.3, vol * 0.1);
    }

    // Radio music system
    startRadio() {
        this.stopRadio();
        const station = this.radioStations[this.currentStation];
        if (station.genre === 'none' || !this.initialized) return;

        this.musicPlaying = true;
        this._playRadioLoop(station);
    }

    stopRadio() {
        this.musicPlaying = false;
        this.musicOscillators.forEach(o => {
            try { o.stop(); } catch (e) { }
        });
        this.musicOscillators = [];
    }

    nextStation() {
        this.currentStation = (this.currentStation + 1) % this.radioStations.length;
        this.startRadio();
        return this.radioStations[this.currentStation];
    }

    _playRadioLoop(station) {
        if (!this.musicPlaying) return;

        const now = this.ctx.currentTime;
        const beatLen = 60 / station.bpm;
        const notes = this._generateMelody(station.genre);

        notes.forEach((note, i) => {
            if (note.freq === 0) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = note.type || 'sine';
            osc.frequency.value = note.freq;
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(note.vol * 0.06, now + i * beatLen + 0.01);
            gain.gain.linearRampToValueAtTime(note.vol * 0.04, now + i * beatLen + beatLen * 0.5);
            gain.gain.linearRampToValueAtTime(0, now + i * beatLen + beatLen * note.dur);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * beatLen);
            osc.stop(now + i * beatLen + beatLen * note.dur + 0.01);
            this.musicOscillators.push(osc);
        });

        // Loop
        const loopDuration = notes.length * beatLen;
        setTimeout(() => {
            if (this.musicPlaying) this._playRadioLoop(station);
        }, loopDuration * 1000 - 100);
    }

    _generateMelody(genre) {
        const scales = {
            synthwave: [261, 293, 329, 349, 392, 440, 493, 523, 587, 659],
            pop: [261, 329, 349, 392, 493, 523, 659, 784],
            funk: [196, 220, 261, 293, 329, 392, 440, 523],
            latin: [261, 293, 329, 392, 440, 523, 587, 659]
        };
        const scale = scales[genre] || scales.synthwave;
        const types = genre === 'synthwave' ? ['sawtooth', 'square'] :
            genre === 'funk' ? ['square', 'triangle'] : ['sine', 'triangle'];
        const notes = [];
        for (let i = 0; i < 16; i++) {
            if (Math.random() < 0.15) {
                notes.push({ freq: 0, vol: 0, dur: 1, type: 'sine' });
            } else {
                notes.push({
                    freq: Utils.randChoice(scale),
                    vol: Utils.rand(0.5, 1),
                    dur: Utils.randChoice([0.5, 0.75, 1, 1.5]),
                    type: Utils.randChoice(types)
                });
            }
        }
        return notes;
    }

    // Engine sound for vehicles
    playEngineSound(speed, maxSpeed) {
        // Engine is continuous, handled differently
        // We'll just let it be handled by the game loop
    }

    setVolume(vol) {
        if (this.masterGain) {
            this.masterGain.gain.value = Utils.clamp(vol, 0, 1);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) this.stopRadio();
        return this.enabled;
    }
}
