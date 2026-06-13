export type GameState = 'MENU' | 'LEVEL_SELECT' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

export type TimeState = 'DAY' | 'NIGHT';

export interface Position {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  jumpCount: number;
  flameIntensity: number; // visual scale of solstice flame
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'flame' | 'star' | 'wind' | 'collect';
}

export interface Tile {
  x: number; // grid coordinate x
  y: number; // grid coordinate y
  type: TileType;
}

export type TileType = 
  | 'EMPTY'
  | 'SOLID_ALWAYS'     // Solid in both Day and Night
  | 'SOLID_DAY_ONLY'    // Solid only in Day (e.g., golden barrier or sun leaves)
  | 'SOLID_NIGHT_ONLY'  // Solid only in Night (e.g., violet crystal or star shadow)
  | 'DEATH_OBSTACLE'    // Spike, instant death/damage
  | 'BOUNCY_MUSHROOM'   // Super jump mushroom (day platform, night spring)
  | 'GATE_CLOSED'       // Blocks path until active
  | 'GATE_OPEN'         // Open state
  | 'WATER';            // Hazards/Swimming mechanics if desired

export interface Switch {
  id: string;
  gridX: number;
  gridY: number;
  active: boolean;
  targetGateId: string;
  timeMode: TimeState | 'BOTH'; // active only in day, night, or both
}

export interface Collectible {
  id: string;
  gridX: number;
  gridY: number;
  type: 'SUN_FRAGMENT' | 'STAR_FRAGMENT';
  collected: boolean;
}

export interface NPC {
  id: string;
  name: string;
  gridX: number;
  gridY: number;
  dialogueId: string;
  avatar: string; // visual emoji or styling key
}

export interface Tablet {
  id: string;
  gridX: number;
  gridY: number;
  loreId: string;
}

export interface LevelData {
  id: number;
  name: string;
  subtitle: string;
  difficulty: string;
  gridWidth: number;
  gridHeight: number;
  startX: number; // grid starting coordinates
  startY: number;
  beaconX: number; // grid finish coordinates
  beaconY: number;
  tiles: { [key: string]: TileType }; // "x,y" format keys
  switches: Switch[];
  collectibles: Collectible[];
  npcs: NPC[];
  tablets: Tablet[];
  loreFallback: { [key: string]: string };
  dialogueFallback: { [key: string]: string };
  baseTimeLimit: number; // in seconds
}

export interface AIResponse {
  text: string;
  mood: string;
  tradition?: string;
}
