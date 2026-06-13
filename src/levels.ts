import { LevelData, TileType } from './types';

// Sparse tile mapping helper to quickly fill blocks of solid tiles
function fillRect(
  tiles: { [key: string]: TileType },
  startX: number,
  startY: number,
  width: number,
  height: number,
  type: TileType
) {
  for (let x = startX; x < startX + width; x++) {
    for (let y = startY; y < startY + height; y++) {
      tiles[`${x},${y}`] = type;
    }
  }
}

// Generate Level Data for all 5 stages
export const LEVELS: LevelData[] = [
  // LEVEL 1: Dawn Meadow (Tutorial)
  {
    id: 1,
    name: "Dawn Meadow",
    subtitle: "A sanctuary of waking light. Learn the dance of Day and Night.",
    difficulty: "Tutorial",
    gridWidth: 40,
    gridHeight: 16,
    startX: 3,
    startY: 10,
    beaconX: 37,
    beaconY: 9,
    baseTimeLimit: 120, // 2 minutes
    tiles: (() => {
      const t: { [key: string]: TileType } = {};
      // Solid Ground
      fillRect(t, 0, 12, 40, 4, 'SOLID_ALWAYS');
      fillRect(t, 10, 9, 4, 3, 'SOLID_ALWAYS'); // small teaching hill
      
      // Floating Solstice platforms (Golden Daylight only solid)
      t['16,8'] = 'SOLID_DAY_ONLY';
      t['18,8'] = 'SOLID_DAY_ONLY';
      t['20,8'] = 'SOLID_DAY_ONLY';

      // Floating Lunar platforms (Violet Night only solid)
      t['24,8'] = 'SOLID_NIGHT_ONLY';
      t['26,8'] = 'SOLID_NIGHT_ONLY';
      
      // Some safe blocks near the end
      fillRect(t, 34, 10, 6, 2, 'SOLID_ALWAYS');

      // Spike trap to teach jumping
      t['30,11'] = 'DEATH_OBSTACLE';
      t['31,11'] = 'DEATH_OBSTACLE';
      
      return t;
    })(),
    switches: [],
    collectibles: [
      { id: "dm-f1", gridX: 7, gridY: 10, type: "SUN_FRAGMENT", collected: false },
      { id: "dm-f2", gridX: 18, gridY: 6, type: "SUN_FRAGMENT", collected: false }, // high in the sun meadow
      { id: "dm-f3", gridX: 25, gridY: 6, type: "STAR_FRAGMENT", collected: false }, // high in the moon beams
      { id: "dm-f4", gridX: 35, gridY: 8, type: "SUN_FRAGMENT", collected: false },
    ],
    npcs: [
      {
        id: "npc-solara",
        name: "Elder Solara",
        gridX: 5,
        gridY: 11,
        dialogueId: "solara-intro",
        avatar: "☀️"
      }
    ],
    tablets: [
      { id: "tab-m1", gridX: 13, gridY: 11, loreId: "m1-lore" },
      { id: "tab-m2", gridX: 28, gridY: 11, loreId: "m2-lore" }
    ],
    loreFallback: {
      "m1-lore": "Daylight is your heartbeat, yet it ebbs with every stride. Flip time to unearth paths woven in shadow.",
      "m2-lore": "Only in absolute shadow do moonlit stones reveal themselves to carry you across the dangerous spikes."
    },
    dialogueFallback: {
      "solara-intro": "Welcome, Keeper of the Solstice Flame. Walk with [A]/[D] (or Arrow Keys), leap with [W]/[SPACE]. Collect fragments to fuel your fire!"
    }
  },

  // LEVEL 2: Mirror Lake (Reflection Puzzles)
  {
    id: 2,
    name: "Mirror Lake",
    subtitle: "Rippling waters hold inverted truths. Watch your footing under twilight.",
    difficulty: "Easy",
    gridWidth: 50,
    gridHeight: 18,
    startX: 3,
    startY: 12,
    beaconX: 47,
    beaconY: 6,
    baseTimeLimit: 150,
    tiles: (() => {
      const t: { [key: string]: TileType } = {};
      // Starting Shore
      fillRect(t, 0, 14, 8, 4, 'SOLID_ALWAYS');
      
      // Mirror Lake Water basin
      fillRect(t, 8, 14, 30, 4, 'WATER'); // Water hazard
      // Spikes at the bottom of the water
      for (let x = 8; x < 38; x++) {
        t[`${x},17`] = 'DEATH_OBSTACLE';
      }

      // Stepping stones and logs
      fillRect(t, 12, 13, 2, 1, 'SOLID_ALWAYS'); 
      fillRect(t, 24, 13, 3, 1, 'SOLID_ALWAYS');
      fillRect(t, 34, 13, 2, 1, 'SOLID_ALWAYS');

      // Day-world stepping leaves (Golden leaves that float)
      t['16,11'] = 'SOLID_DAY_ONLY';
      t['20,11'] = 'SOLID_DAY_ONLY';
      t['30,11'] = 'SOLID_DAY_ONLY';

      // Night-world reflections (Mirrored violet ice block platforms)
      t['18,10'] = 'SOLID_NIGHT_ONLY';
      t['22,10'] = 'SOLID_NIGHT_ONLY';
      t['28,10'] = 'SOLID_NIGHT_ONLY';
      t['32,10'] = 'SOLID_NIGHT_ONLY';

      // Switch pillar and gate
      fillRect(t, 38, 11, 4, 7, 'SOLID_ALWAYS'); // Right land pillar
      t['39,10'] = 'GATE_CLOSED'; // Gate block
      t['39,9'] = 'GATE_CLOSED'; // Gate block

      // Finish Shore
      fillRect(t, 42, 11, 8, 7, 'SOLID_ALWAYS');

      return t;
    })(),
    switches: [
      // Switch on center lake platform that requires Day World to activate
      { id: "lake-s1", gridX: 25, gridY: 12, active: false, targetGateId: "lake-gate", timeMode: 'DAY' }
    ],
    collectibles: [
      { id: "ml-f1", gridX: 16, gridY: 9, type: "SUN_FRAGMENT", collected: false },
      { id: "ml-f2", gridX: 25, gridY: 11, type: "SUN_FRAGMENT", collected: false },
      { id: "ml-f3", gridX: 22, gridY: 7, type: "STAR_FRAGMENT", collected: false },
      { id: "ml-f4", gridX: 32, gridY: 7, type: "STAR_FRAGMENT", collected: false },
      { id: "ml-f5", gridX: 43, gridY: 9, type: "SUN_FRAGMENT", collected: false },
    ],
    npcs: [
      {
        id: "npc-mira",
        name: "Mira the Lake Keeper",
        gridX: 6,
        gridY: 13,
        dialogueId: "mira-lake",
        avatar: "💧"
      }
    ],
    tablets: [
      { id: "tab-l1", gridX: 12, gridY: 12, loreId: "lake-l1" }
    ],
    loreFallback: {
      "lake-l1": "An ancient gate seals the eastern shores. Only pressing the gold lilypad plate during the light of day will release its locks."
    },
    dialogueFallback: {
      "mira-lake": "Listen closely, keeper. Use [SHIFT] or press the 'Time Flip' button to dive between day and night realms. Mind the deep water!"
    }
  },

  // LEVEL 3: Shadow Forest (Moving Obstacles)
  {
    id: 3,
    name: "Shadow Forest",
    subtitle: "Vines curl, structures shift. Spores cushion your descent.",
    difficulty: "Medium",
    gridWidth: 60,
    gridHeight: 18,
    startX: 3,
    startY: 12,
    beaconX: 56,
    beaconY: 5,
    baseTimeLimit: 180,
    tiles: (() => {
      const t: { [key: string]: TileType } = {};
      // Grass Floor
      fillRect(t, 0, 14, 15, 4, 'SOLID_ALWAYS');

      // Bouncy mushroom spring (Day is simple pad, night becomes active bouncer)
      t['10,13'] = 'BOUNCY_MUSHROOM';

      // Upper platform reached by mushroom
      fillRect(t, 14, 9, 8, 2, 'SOLID_ALWAYS');

      // Giant Gorge separating the forest
      fillRect(t, 22, 14, 20, 4, 'SOLID_ALWAYS'); // Platform gorge walls
      fillRect(t, 22, 15, 20, 3, 'EMPTY'); // Empty gorge gap
      for (let x = 22; x < 42; x++) {
        t[`${x},17`] = 'DEATH_OBSTACLE'; // Thorn bottom
      }

      // Inside layout of the gorge: platforming jumps
      // Gold day forest vines (only climbable/solid in day)
      t['25,12'] = 'SOLID_DAY_ONLY';
      t['27,11'] = 'SOLID_DAY_ONLY';
      t['29,10'] = 'SOLID_DAY_ONLY';

      // Night shadowy forest root structures (only solid at night)
      t['31,12'] = 'SOLID_NIGHT_ONLY';
      t['33,11'] = 'SOLID_NIGHT_ONLY';
      t['35,9'] = 'SOLID_NIGHT_ONLY';
      t['37,11'] = 'SOLID_NIGHT_ONLY';

      // Second Bouncy Mushroom to escape gorge
      t['41,13'] = 'BOUNCY_MUSHROOM';

      // Landing site and Gate
      fillRect(t, 42, 12, 18, 6, 'SOLID_ALWAYS');
      t['48,11'] = 'GATE_CLOSED';
      t['48,10'] = 'GATE_CLOSED';

      return t;
    })(),
    switches: [
      { id: "forest-s1", gridX: 35, gridY: 7, active: false, targetGateId: "forest-gate", timeMode: 'NIGHT' }
    ],
    collectibles: [
      { id: "sf-f1", gridX: 10, gridY: 8, type: "SUN_FRAGMENT", collected: false },
      { id: "sf-f2", gridX: 18, gridY: 7, type: "SUN_FRAGMENT", collected: false },
      { id: "sf-f3", gridX: 29, gridY: 8, type: "STAR_FRAGMENT", collected: false },
      { id: "sf-f4", gridX: 35, gridY: 5, type: "STAR_FRAGMENT", collected: false },
      { id: "sf-f5", gridX: 45, gridY: 10, type: "SUN_FRAGMENT", collected: false },
    ],
    npcs: [
      {
        id: "npc-sylvan",
        name: "Sylvan the Squirrel",
        gridX: 6,
        gridY: 13,
        dialogueId: "sylvan-intro",
        avatar: "🐿️"
      }
    ],
    tablets: [
      { id: "tab-f1", gridX: 15, gridY: 8, loreId: "forest-lore" }
    ],
    loreFallback: {
      "forest-lore": "The night forest awakens dark spores. Jump on the iridescent mushrooms to launch yourself skyward!"
    },
    dialogueFallback: {
      "sylvan-intro": "Ah, the light is fading so fast! Quick, jump on that purple mushroom to propel yourself onto the upper forest branches."
    }
  },

  // LEVEL 4: Solstice Tower (Advanced Day-Night Puzzles)
  {
    id: 4,
    name: "Solstice Tower",
    subtitle: "Climb the celestial spire. Align sunrays and starlight to ascending heights.",
    difficulty: "Hard",
    gridWidth: 32,
    gridHeight: 30, // Tall level!
    startX: 4,
    startY: 27,
    beaconX: 27,
    beaconY: 3,
    baseTimeLimit: 200,
    tiles: (() => {
      const t: { [key: string]: TileType } = {};
      // Ground Floor
      fillRect(t, 0, 28, 32, 2, 'SOLID_ALWAYS');
      t['16,28'] = 'DEATH_OBSTACLE'; // gap spikes

      // Left Pillar base
      fillRect(t, 0, 10, 6, 18, 'SOLID_ALWAYS');
      // Right Pillar base
      fillRect(t, 26, 10, 6, 18, 'SOLID_ALWAYS');

      // Escalating platform stairs inside the tower
      // Floor 1 (Y: 24)
      fillRect(t, 10, 24, 12, 1, 'SOLID_DAY_ONLY');
      
      // Floor 2 (Y: 20)
      fillRect(t, 6, 20, 12, 1, 'SOLID_NIGHT_ONLY');
      
      // Floor 3 (Y: 16)
      fillRect(t, 14, 16, 12, 1, 'SOLID_DAY_ONLY');
      
      // Bouncy mushrooms in interior
      t['9,27'] = 'BOUNCY_MUSHROOM';
      t['22,23'] = 'BOUNCY_MUSHROOM';

      // Floor 4 (Y: 12)
      fillRect(t, 6, 12, 5, 1, 'SOLID_ALWAYS');
      fillRect(t, 21, 12, 5, 1, 'SOLID_ALWAYS');

      // Gate at Y: 12 blocking center path
      t['15,12'] = 'GATE_CLOSED';
      t['16,12'] = 'GATE_CLOSED';

      // Top Spires (Y: 4 to 8)
      fillRect(t, 10, 8, 12, 1, 'SOLID_ALWAYS');
      fillRect(t, 14, 4, 4, 4, 'SOLID_ALWAYS');

      return t;
    })(),
    switches: [
      { id: "tower-s1", gridX: 7, gridY: 11, active: false, targetGateId: "tower-gate", timeMode: 'NIGHT' }
    ],
    collectibles: [
      { id: "st-f1", gridX: 16, gridY: 22, type: "SUN_FRAGMENT", collected: false },
      { id: "st-f2", gridX: 12, gridY: 18, type: "STAR_FRAGMENT", collected: false },
      { id: "st-f3", gridX: 20, gridY: 14, type: "SUN_FRAGMENT", collected: false },
      { id: "st-f4", gridX: 15, gridY: 10, type: "STAR_FRAGMENT", collected: false },
      { id: "st-f5", gridX: 15, gridY: 2, type: "SUN_FRAGMENT", collected: false },
    ],
    npcs: [
      {
        id: "npc-vesper",
        name: "Vesper the Owl",
        gridX: 4,
        gridY: 11,
        dialogueId: "vesper-spire",
        avatar: "🦉"
      }
    ],
    tablets: [
      { id: "tab-t1", gridX: 14, gridY: 27, loreId: "tower-t1" }
    ],
    loreFallback: {
      "tower-t1": "The tower responds to the alignment of realms. Mid-air flips will unlock standard gravities."
    },
    dialogueFallback: {
      "vesper-spire": "Hoo! The alignment is sensitive. Activate the lunar seal on this spire under midnight shadows to unlock the tower gate."
    }
  },

  // LEVEL 5: Longest Sunset (Final Challenge)
  {
    id: 5,
    name: "Longest Sunset",
    subtitle: "The final minutes of sunlight. Glide across fast crumbling stars.",
    difficulty: "Expert",
    gridWidth: 65,
    gridHeight: 16,
    startX: 3,
    startY: 11,
    beaconX: 61,
    beaconY: 10,
    baseTimeLimit: 55, // Very short! Drains quick, exciting dash!
    tiles: (() => {
      const t: { [key: string]: TileType } = {};
      // Spawner Floor
      fillRect(t, 0, 13, 8, 3, 'SOLID_ALWAYS');

      // The Deep Fire Chasm
      fillRect(t, 8, 14, 57, 2, 'SOLID_ALWAYS');
      fillRect(t, 8, 14, 57, 2, 'EMPTY');
      for (let x = 8; x < 65; x++) {
        t[`${x},15`] = 'DEATH_OBSTACLE';
      }

      // Alternating series of tiny single-tile stepping stones
      // Requires fast rhythmic flips in mid-air!
      t['12,11'] = 'SOLID_DAY_ONLY';
      t['15,10'] = 'SOLID_NIGHT_ONLY';
      t['18,11'] = 'SOLID_DAY_ONLY';
      t['21,10'] = 'SOLID_NIGHT_ONLY';
      t['24,9'] = 'SOLID_DAY_ONLY';
      
      // Safety sanctuary block
      fillRect(t, 27, 10, 4, 4, 'SOLID_ALWAYS');

      // The Void Bridge
      t['35,10'] = 'SOLID_NIGHT_ONLY';
      t['38,9'] = 'SOLID_DAY_ONLY';
      t['41,8'] = 'SOLID_NIGHT_ONLY';
      t['44,10'] = 'SOLID_DAY_ONLY';
      t['47,9'] = 'SOLID_NIGHT_ONLY';

      // Ending Gate and Switch combo
      fillRect(t, 50, 11, 4, 3, 'SOLID_ALWAYS');
      t['52,10'] = 'GATE_CLOSED';
      t['52,9'] = 'GATE_CLOSED';

      // Final Beacon pedestal
      fillRect(t, 54, 12, 11, 2, 'SOLID_ALWAYS');

      return t;
    })(),
    switches: [
      { id: "sunset-s1", gridX: 29, gridY: 9, active: false, targetGateId: "sunset-gate", timeMode: 'BOTH' }
    ],
    collectibles: [
      { id: "ls-f1", gridX: 12, gridY: 9, type: "SUN_FRAGMENT", collected: false },
      { id: "ls-f2", gridX: 21, gridY: 8, type: "STAR_FRAGMENT", collected: false },
      { id: "ls-f3", gridX: 38, gridY: 7, type: "SUN_FRAGMENT", collected: false },
      { id: "ls-f4", gridX: 47, gridY: 7, type: "STAR_FRAGMENT", collected: false },
      { id: "ls-f5", gridX: 58, gridY: 10, type: "SUN_FRAGMENT", collected: false },
    ],
    npcs: [
      {
        id: "npc-sol",
        name: "Solstice Ember",
        gridX: 6,
        gridY: 12,
        dialogueId: "sol-speech",
        avatar: "🔥"
      }
    ],
    tablets: [
      { id: "tab-s1", gridX: 28, gridY: 9, loreId: "sunset-s1" }
    ],
    loreFallback: {
      "sunset-s1": "The gateway demands proof of absolute solstice courage. Hit the switch here, then brave the Void Bridge."
    },
    dialogueFallback: {
      "sol-speech": "No time to lose! The sun is sinking below the ridge. Every dash is precious. Run, Keeper! Preserve the balance!"
    }
  }
];
