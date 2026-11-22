// Game state: the thief, the alarm, the timer, the loot and the win/lose
// rules. One step advances everything by a fixed delta.
import { mulberry32 } from './rng.js';
import {
  buildCover, buildDoors, buildLadders, strongboxPosition, bridgePosition,
  TRAIN_LEFT, TRAIN_RIGHT, TRAIN_TOP, TRAIN_BOTTOM, ROOF_TOP, ROOF_BOTTOM,
} from './levels.js';
import { buildGuards, updateGuard, guardSeesThief } from './guards.js';
import { buildCameras, cameraSeesThief, buildSearchlight, searchlightSeesThief } from './cameras.js';

export const TIME_LIMIT = 150;
export const ALARM_RISE = 46;
export const ALARM_FALL = 13;
export const ALARM_CHASE = 50;
export const CAUGHT_GRACE = 0.9;
export const THIEF_SPEED = 175;
export const THIEF_RADIUS = 12;

export function createGameState(seed = 20261122) {
  const rng = mulberry32(seed);
  const box = strongboxPosition();
  return {
    rng, now: 0, timeLeft: TIME_LIMIT, screen: 'title',
    thief: { x: 120, y: 480, onRoof: false, hasLoot: false, moving: false, face: 1 },
    alarm: 0, spotted: false, graceLeft: 0, graceActive: false,
    guards: buildGuards(), cameras: buildCameras(), searchlight: buildSearchlight(),
    cover: buildCover(), doors: buildDoors(), ladders: buildLadders(),
    strongbox: { x: box.x, y: box.y, r: box.r, taken: false },
    bridge: bridgePosition(),
    smoke: { active: false, x: 0, y: 0, r: 95, until: 0 },
    tools: { brake: 1, whistle: 2, smoke: 2 },
    brakeUntil: 0, message: '', messageUntil: 0, score: 0,
    stats: { spottedTimes: 0, toolsUsed: 0, doorsLocked: 0 },
    swayPhase: 0,
  };
}

/** The whole scene sways with the train: a gentle sideways shift. */
export function swayOffset(state) {
  return Math.sin(state.now * 0.6) * 7;
}

export function showMessage(state, text, seconds = 2.5) {
  state.message = text;
  state.messageUntil = state.now + seconds;
}

function rectsOverlapCircle(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function tryMoveThief(state, dx, dy) {
  const t = state.thief;
  const nx = t.x + dx;
  const ny = t.y + dy;
  const top = t.onRoof ? ROOF_TOP + 14 : TRAIN_TOP + 14;
  const bottom = t.onRoof ? ROOF_BOTTOM - 12 : TRAIN_BOTTOM - 14;
  const clampedX = Math.max(TRAIN_LEFT + 14, Math.min(TRAIN_RIGHT - 14, nx));
  const clampedY = Math.max(top, Math.min(bottom, ny));
  // Cover blocks movement, but only inside the train (the roof is clear).
  if (!t.onRoof) {
    for (const block of state.cover) {
      if (rectsOverlapCircle(clampedX, clampedY, THIEF_RADIUS, block)) return;
    }
  }
  // Carriage walls: the thief crosses only through a door gap.
  if (!t.onRoof) {
    for (const door of state.doors) {
      // nothing: doors are gaps in the wall list, handled by wall checks below
    }
    const wallXs = [TRAIN_LEFT + 302, TRAIN_LEFT + 604, TRAIN_LEFT + 906];
    for (const wx of wallXs) {
      const crossing = (t.x < wx) !== (clampedX < wx);
      if (crossing && (clampedY < 428 || clampedY > 532)) return;
    }
  }
  t.x = clampedX;
  t.y = clampedY;
  t.moving = dx !== 0 || dy !== 0;
  if (dx !== 0) t.face = dx > 0 ? 1 : -1;
}

/** Climb up or down at a ladder (E), or lock a door behind you (L). */
export function interact(state) {
  const t = state.thief;
  for (const ladder of state.ladders) {
    if (Math.abs(t.x - ladder.x) < 34 && t.y > TRAIN_TOP - 30 && t.y < TRAIN_TOP + 60) {
      t.onRoof = !t.onRoof;
      t.y = t.onRoof ? (ROOF_TOP + ROOF_BOTTOM) / 2 : TRAIN_TOP + 60;
      showMessage(state, t.onRoof ? 'ON THE ROOF — the searchlight sweeps here!' : 'Back inside the train.');
      return;
    }
  }
  if (!t.onRoof) {
    for (const door of state.doors) {
      if (door.exit) continue;
      if (Math.abs(t.x - door.x) < 44 && t.y > 420 && t.y < 540) {
        door.lockedUntil = state.now + 6;
        state.stats.doorsLocked += 1;
        showMessage(state, 'Door locked behind you — pursuit stalls for 6s.');
        return;
      }
    }
  }
  showMessage(state, 'Nothing to use here. Stand by a ladder (E) or a door (L).', 1.6);
}

/** Pick up the Iron Strongbox when close enough. */
export function tryPickup(state) {
  const t = state.thief;
  if (state.strongbox.taken || t.onRoof) return;
  const dx = t.x - state.strongbox.x;
  const dy = t.y - state.strongbox.y;
  if (dx * dx + dy * dy < (state.strongbox.r + 26) * (state.strongbox.r + 26)) {
    state.strongbox.taken = true;
    t.hasLoot = true;
    state.score += 500;
    showMessage(state, 'IRON STRONGBOX TAKEN! Run to the rendezvous bridge at the rear door!', 4);
  }
}

export function stepGame(state, dt, input) {
  if (state.screen !== 'play') return;
  state.now += dt;
  state.timeLeft -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.screen = 'over';
    state.overReason = 'terminus';
    return;
  }
  // Movement: keyboard, or a mouse click target.
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (mx === 0 && my === 0 && input.target) {
    const dx = input.target.x - state.thief.x;
    const dy = input.target.y - state.thief.y;
    if (Math.hypot(dx, dy) > 8) {
      mx = dx / Math.hypot(dx, dy);
      my = dy / Math.hypot(dx, dy);
    } else {
      input.target = null;
    }
  }
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my) || 1;
    tryMoveThief(state, (mx / len) * THIEF_SPEED * dt, (my / len) * THIEF_SPEED * dt);
  } else {
    state.thief.moving = false;
  }
  tryPickup(state);
  // Guards and cameras.
  const frozen = state.now < state.brakeUntil;
  for (const guard of state.guards) {
    if (frozen) guard.freezeUntil = state.brakeUntil;
    updateGuard(guard, dt, state.now, state.thief, state.alarm, state.doors);
  }
  // Detection.
  let seen = false;
  for (const guard of state.guards) {
    if (guardSeesThief(guard, state.thief, state.cover, state.smoke, state.now)) { seen = true; break; }
  }
  if (!seen) {
    for (const camera of state.cameras) {
      if (cameraSeesThief(camera, state.now, state.thief, state.cover, state.smoke)) { seen = true; break; }
    }
  }
  if (!seen && searchlightSeesThief(state.searchlight, state.now, state.thief)) seen = true;
  if (seen && !state.spotted) state.stats.spottedTimes += 1;
  state.spotted = seen;
  if (seen) {
    state.alarm = Math.min(100, state.alarm + ALARM_RISE * dt);
  } else {
    state.alarm = Math.max(0, state.alarm - ALARM_FALL * dt);
    state.graceActive = false;
  }
  // Fair caught moment: a short warning flash before the alarm trips.
  if (state.alarm >= 100) {
    if (!state.graceActive) { state.graceActive = true; state.graceLeft = CAUGHT_GRACE; }
    state.graceLeft -= dt;
    if (state.graceLeft <= 0) {
      state.screen = 'caught';
      state.overReason = 'caught';
      return;
    }
  }
  // A chasing guard that touches the thief catches them outright.
  for (const guard of state.guards) {
    if (guard.state === 'chase' && Math.hypot(guard.x - state.thief.x, guard.y - state.thief.y) < 24) {
      state.screen = 'caught';
      state.overReason = 'caught';
      return;
    }
  }
  // Getaway: with the loot, reach the bridge at the rear door.
  if (state.thief.hasLoot && !state.thief.onRoof) {
    const b = state.bridge;
    if (state.thief.x >= b.x - 10 && state.thief.x <= b.x + b.w + 10 && state.thief.y >= b.y - 4 && state.thief.y <= b.y + b.h) {
      state.screen = 'win';
      state.score += Math.round(state.timeLeft) * 10;
      return;
    }
  }
}
