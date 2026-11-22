// The train itself: four carriages, their cover, doors, ladders, cameras and
// the Iron Strongbox. All coordinates are in the 1280x800 playfield.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 800;
export const HUD_HEIGHT = 72;
export const TRAIN_LEFT = 36;
export const TRAIN_RIGHT = 1244;
export const TRAIN_TOP = 196;
export const TRAIN_BOTTOM = 724;
export const ROOF_TOP = 128;
export const ROOF_BOTTOM = 196;
export const CARRIAGE_WIDTH = (TRAIN_RIGHT - TRAIN_LEFT) / 4;

export const CARRIAGES = [
  { name: 'SLEEPER', note: 'berths to hide behind', tint: '#2a2438' },
  { name: 'DINING CAR', note: 'tables, waiters, wide sightlines', tint: '#33241f' },
  { name: 'MAIL CAR', note: 'sacks and crates everywhere', tint: '#22331f' },
  { name: 'STRONGBOX CAR', note: 'the Iron Strongbox waits here', tint: '#332f1a' },
];

// Cover blocks sight and movement. {x, y, w, h, label, kind}
export function buildCover() {
  const blocks = [];
  const car = (i) => TRAIN_LEFT + i * CARRIAGE_WIDTH;
  // Sleeper: berths along the top and bottom walls.
  blocks.push({ x: car(0) + 18, y: TRAIN_TOP + 14, w: 96, h: 52, label: 'BERTH', kind: 'berth' });
  blocks.push({ x: car(0) + 150, y: TRAIN_TOP + 14, w: 96, h: 52, label: 'BERTH', kind: 'berth' });
  blocks.push({ x: car(0) + 18, y: TRAIN_BOTTOM - 66, w: 96, h: 52, label: 'BERTH', kind: 'berth' });
  blocks.push({ x: car(0) + 150, y: TRAIN_BOTTOM - 66, w: 96, h: 52, label: 'BERTH', kind: 'berth' });
  // Dining: round tables down the middle.
  blocks.push({ x: car(1) + 30, y: 330, w: 92, h: 92, label: 'TABLE', kind: 'table' });
  blocks.push({ x: car(1) + 170, y: 500, w: 92, h: 92, label: 'TABLE', kind: 'table' });
  blocks.push({ x: car(1) + 36, y: 560, w: 70, h: 44, label: 'BAR', kind: 'table' });
  // Mail: tall crate stacks that make two narrow lanes.
  blocks.push({ x: car(2) + 24, y: TRAIN_TOP + 14, w: 110, h: 120, label: 'CRATES', kind: 'crate' });
  blocks.push({ x: car(2) + 168, y: TRAIN_TOP + 14, w: 110, h: 120, label: 'SACKS', kind: 'crate' });
  blocks.push({ x: car(2) + 24, y: TRAIN_BOTTOM - 134, w: 110, h: 120, label: 'SACKS', kind: 'crate' });
  blocks.push({ x: car(2) + 168, y: TRAIN_BOTTOM - 134, w: 110, h: 120, label: 'CRATES', kind: 'crate' });
  // Strongbox car: a vault cage around the loot, open at the front.
  blocks.push({ x: car(3) + 40, y: TRAIN_TOP + 14, w: 70, h: 150, label: 'VAULT', kind: 'vault' });
  blocks.push({ x: car(3) + 40, y: TRAIN_BOTTOM - 164, w: 70, h: 150, label: 'VAULT', kind: 'vault' });
  blocks.push({ x: car(3) + 190, y: TRAIN_TOP + 14, w: 70, h: 90, label: 'SAFE', kind: 'vault' });
  return blocks;
}

// Doors between carriages: {x, y, w, h, label}. The middle gap is the walkway.
export function buildDoors() {
  const doors = [];
  for (let i = 1; i < 4; i += 1) {
    const x = TRAIN_LEFT + i * CARRIAGE_WIDTH;
    doors.push({ x: x - 9, y: 428, w: 18, h: 104, label: 'DOOR', lockedUntil: 0, id: i });
  }
  // Rear door (the bridge exit, left end) and front cab door (never used, locked).
  doors.push({ x: TRAIN_LEFT - 4, y: 428, w: 18, h: 104, label: 'BRIDGE', lockedUntil: 0, id: 0, exit: true });
  return doors;
}

// Ladders up to the roof, one per carriage boundary.
export function buildLadders() {
  const ladders = [];
  for (let i = 0; i < 4; i += 1) {
    const x = TRAIN_LEFT + i * CARRIAGE_WIDTH + CARRIAGE_WIDTH / 2;
    ladders.push({ x: x - 14, y: TRAIN_TOP - 8, w: 28, h: 34, carriage: i });
  }
  return ladders;
}

// The Iron Strongbox sits inside the vault cage of the last carriage.
export function strongboxPosition() {
  return { x: TRAIN_LEFT + 3 * CARRIAGE_WIDTH + 208, y: 460, r: 20 };
}

// The rendezvous bridge: the exit zone at the rear door, once the loot is taken.
export function bridgePosition() {
  return { x: TRAIN_LEFT + 22, y: 480, w: 70, h: 104 };
}
