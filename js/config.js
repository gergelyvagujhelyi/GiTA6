// ============================================================
// GiTA6 Configuration
// ============================================================

const CONFIG = {
    // World
    WORLD_WIDTH: 6000,
    WORLD_HEIGHT: 6000,
    TILE_SIZE: 40,
    ROAD_WIDTH: 80,
    SIDEWALK_WIDTH: 16,

    // Player
    PLAYER_SPEED: 160,
    PLAYER_SPRINT_SPEED: 260,
    PLAYER_SIZE: 14,
    PLAYER_MAX_HEALTH: 100,
    PLAYER_MAX_ARMOR: 100,
    START_MONEY: 500,

    // Vehicles
    VEHICLE_ENTER_RANGE: 50,
    VEHICLE_TYPES: {
        sedan: {
            name: 'Sentinel',
            width: 24,
            length: 48,
            maxSpeed: 340,
            acceleration: 180,
            braking: 300,
            handling: 2.8,
            health: 200,
            colors: ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#ecf0f1', '#2c3e50']
        },
        sports: {
            name: 'Infernus',
            width: 22,
            length: 46,
            maxSpeed: 480,
            acceleration: 280,
            braking: 350,
            handling: 3.2,
            health: 150,
            colors: ['#e74c3c', '#f1c40f', '#e67e22', '#ffffff', '#1abc9c']
        },
        muscle: {
            name: 'Sabre',
            width: 26,
            length: 50,
            maxSpeed: 400,
            acceleration: 240,
            braking: 280,
            handling: 2.2,
            health: 250,
            colors: ['#c0392b', '#2c3e50', '#d35400', '#1a5276', '#7d3c98']
        },
        truck: {
            name: 'Mule',
            width: 30,
            length: 60,
            maxSpeed: 220,
            acceleration: 100,
            braking: 200,
            handling: 1.6,
            health: 400,
            colors: ['#bdc3c7', '#95a5a6', '#7f8c8d', '#2c3e50']
        },
        supercar: {
            name: 'Cheetah',
            width: 22,
            length: 44,
            maxSpeed: 560,
            acceleration: 350,
            braking: 400,
            handling: 3.5,
            health: 120,
            colors: ['#e74c3c', '#3498db', '#f39c12', '#1abc9c', '#9b59b6']
        },
        suv: {
            name: 'Cavalcade',
            width: 28,
            length: 52,
            maxSpeed: 300,
            acceleration: 160,
            braking: 260,
            handling: 2.0,
            health: 350,
            colors: ['#2c3e50', '#ecf0f1', '#7f8c8d', '#1a5276']
        },
        police: {
            name: 'Police',
            width: 24,
            length: 48,
            maxSpeed: 420,
            acceleration: 250,
            braking: 340,
            handling: 3.0,
            health: 300,
            colors: ['#1a1a2e']
        }
    },

    // NPC
    MAX_PEDESTRIANS: 60,
    MAX_TRAFFIC: 30,
    NPC_SPEED: 60,
    NPC_SPAWN_RADIUS: 800,
    NPC_DESPAWN_RADIUS: 1200,
    PEDESTRIAN_HEALTH: 30,

    // Police
    WANTED_DECAY_TIME: 15,
    MAX_WANTED_LEVEL: 5,
    POLICE_SPAWN_DELAY: [0, 5, 3, 2, 1.5, 1],
    MAX_POLICE: [0, 2, 5, 8, 12, 20],

    // Weapons - defined separately for clarity
    WEAPON_TYPES: {
        fist: {
            name: 'Fist',
            damage: 10,
            range: 30,
            fireRate: 0.4,
            spread: 0,
            projectileSpeed: 0,
            ammo: Infinity,
            auto: false,
            melee: true,
            icon: 'F'
        },
        pistol: {
            name: '9mm',
            damage: 20,
            range: 500,
            fireRate: 0.3,
            spread: 0.04,
            projectileSpeed: 800,
            ammo: 60,
            auto: false,
            melee: false,
            icon: 'P'
        },
        shotgun: {
            name: 'Shotgun',
            damage: 12,
            range: 250,
            fireRate: 0.8,
            spread: 0.15,
            projectileSpeed: 700,
            pellets: 8,
            ammo: 30,
            auto: false,
            melee: false,
            icon: 'SG'
        },
        smg: {
            name: 'SMG',
            damage: 12,
            range: 400,
            fireRate: 0.08,
            spread: 0.08,
            projectileSpeed: 750,
            ammo: 120,
            auto: true,
            melee: false,
            icon: 'SM'
        },
        rifle: {
            name: 'Rifle',
            damage: 40,
            range: 800,
            fireRate: 0.15,
            spread: 0.02,
            projectileSpeed: 1200,
            ammo: 60,
            auto: true,
            melee: false,
            icon: 'R'
        },
        rocket: {
            name: 'RPG',
            damage: 150,
            range: 600,
            fireRate: 1.5,
            spread: 0.01,
            projectileSpeed: 400,
            ammo: 10,
            auto: false,
            melee: false,
            explosive: true,
            explosionRadius: 80,
            icon: 'RP'
        }
    },

    // Day/Night
    DAY_DURATION: 300,       // 5 min real time = 1 game day
    SUNRISE_HOUR: 6,
    SUNSET_HOUR: 20,

    // Colors - Vice City palette
    COLORS: {
        WATER_DEEP: '#0a4a7a',
        WATER_SHALLOW: '#1a7ab5',
        SAND: '#f4d9a0',
        GRASS: '#3a8c3f',
        GRASS_DARK: '#2d7032',
        ROAD: '#3a3a3a',
        ROAD_LINE: '#f4d942',
        SIDEWALK: '#c8b89a',
        BUILDING_SHADOW: 'rgba(0,0,0,0.3)',

        // Neon
        NEON_PINK: '#ff1493',
        NEON_CYAN: '#00ffff',
        NEON_PURPLE: '#bf00ff',
        NEON_ORANGE: '#ff6600',

        // HUD
        HUD_BG: 'rgba(0,0,0,0.6)',
        HUD_HEALTH: '#e74c3c',
        HUD_ARMOR: '#3498db',
        HUD_WANTED: '#f1c40f',
        HUD_MONEY: '#2ecc71',

        // Sky gradient at different times
        SKY_DAWN: '#ff7e5f',
        SKY_DAY: '#74b9ff',
        SKY_DUSK: '#e056a0',
        SKY_NIGHT: '#0a0a2e'
    },

    // Districts
    DISTRICTS: {
        OCEAN_BEACH: { name: 'Ocean Beach', color: '#ff6ec7' },
        VICE_POINT: { name: 'Vice Point', color: '#00bfff' },
        DOWNTOWN: { name: 'Downtown', color: '#ffd700' },
        LITTLE_HAVANA: { name: 'Little Havana', color: '#ff4500' },
        STARFISH_ISLAND: { name: 'Starfish Island', color: '#32cd32' },
        INDUSTRIAL: { name: 'Vice Port', color: '#8b8b8b' }
    }
};
