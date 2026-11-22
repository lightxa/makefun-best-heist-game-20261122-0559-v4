// Guards: patrol routes, vision cones, pursuit, and the line-of-sight test
// that decides whether the thief is seen. All angles in radians.
import { TRAIN_TOP, TRAIN_BOTTOM, TRAIN_LEFT, CARRIAGE_WIDTH } from './levels.js';

export const CONE_LENGTH = 185;
export const CONE_HALF_ANGLE = 0.5;
export const GUARD_SPEED = 62;
export const CHASE_SPEED = 128;

export function buildGuards() {
  return [
    {
      name: 'PORTER', x: 260, y: 320, angle: Math.PI / 2, speed: GUARD_SPEED,
      waypoints: [{ x: 260, y: 320 }, { x: 260, y: 600 }, { x: 150, y: 600 }, { x: 150, y: 320 }],
      wp: 0, state: 'patrol', decoyUntil: 0, decoyTarget: null, freezeUntil: 0, pause: 0,
    },
    {
      name: 'CONDUCTOR', x: 560, y: 620, angle: -Math.PI / 2, speed: GUARD_SPEED,
      waypoints: [{ x: 560, y: 620 }, { x: 560, y: 330 }, { x: 470, y: 330 }, { x: 470, y: 620 }],
      wp: 0, state: 'patrol', decoyUntil: 0, decoyTarget: null, freezeUntil: 0, pause: 0,
    },
    {
      name: 'MAIL CLERK', x: 860, y: 330, angle: Math.PI / 2, speed: GUARD_SPEED,
      waypoints: [{ x: 860, y: 330 }, { x: 760, y: 560 }, { x: 950, y: 560 }, { x: 950, y: 330 }],
      wp: 0, state: 'patrol', decoyUntil: 0, decoyTarget: null, freezeUntil: 0, pause: 0,
    },
    {
      name: 'VAULT WARDEN', x: 1120, y: 600, angle: -Math.PI / 2, speed: GUARD_SPEED,
      waypoints: [{ x: 1120, y: 600 }, { x: 1120, y: 340 }, { x: 1000, y: 340 }, { x: 1000, y: 600 }],
      wp: 0, state: 'patrol', decoyUntil: 0, decoyTarget: null, freezeUntil: 0, pause: 0,
    },
  ];
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Is the thief inside this guard's vision cone and not hidden behind cover? */
export function guardSeesThief(guard, thief, cover, smoke, now) {
  if (now < guard.freezeUntil) return false;
  if (thief.onRoof) return false;
  if (smoke.active && smoke.until > now) {
    const dx = thief.x - smoke.x;
    const dy = thief.y - smoke.y;
    if (dx * dx + dy * dy < smoke.r * smoke.r) return false;
  }
  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONE_LENGTH) return false;
  const facing = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(facing, guard.angle)) > CONE_HALF_ANGLE) return false;
  return lineOfSightClear(guard.x, guard.y, thief.x, thief.y, cover);
}

/** True when no cover rectangle blocks the segment between two points. */
export function lineOfSightClear(x0, y0, x1, y1, cover) {
  for (const block of cover) {
    if (segmentHitsRect(x0, y0, x1, y1, block)) return false;
  }
  return true;
}

function segmentHitsRect(x0, y0, x1, y1, r) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let tmin = 0;
  let tmax = 1;
  const axes = [
    { p: x0, d: dx, min: r.x, max: r.x + r.w },
    { p: y0, d: dy, min: r.y, max: r.y + r.h },
  ];
  for (const axis of axes) {
    if (Math.abs(axis.d) < 1e-9) {
      if (axis.p < axis.min || axis.p > axis.max) return false;
    } else {
      let t1 = (axis.min - axis.p) / axis.d;
      let t2 = (axis.max - axis.p) / axis.d;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }
  }
  return true;
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
  return dist - step < 2;
}

/** Advance one guard: patrol, chase the thief, or walk to a decoy whistle. */
export function updateGuard(guard, dt, now, thief, alarm, doors) {
  if (now < guard.freezeUntil) return;
  if (guard.pause > 0) { guard.pause -= dt; return; }
  if (now < guard.decoyUntil && guard.decoyTarget) {
    guard.state = 'decoy';
    if (moveToward(guard, guard.decoyTarget.x, guard.decoyTarget.y, GUARD_SPEED, dt)) {
      guard.decoyUntil = 0;
      guard.state = 'patrol';
    }
    return;
  }
  if (alarm > 50 && !thief.onRoof) {
    guard.state = 'chase';
    // A locked door holds a chasing guard on the far side for a while.
    const blocked = doors.some((d) => now < d.lockedUntil
      && Math.abs(guard.x - d.x) < 46 && Math.abs(thief.x - d.x) < 46
      && Math.sign(guard.x - d.x) !== Math.sign(thief.x - d.x));
    if (!blocked) moveToward(guard, thief.x, thief.y, CHASE_SPEED, dt);
    return;
  }
  guard.state = 'patrol';
  const target = guard.waypoints[guard.wp];
  if (moveToward(guard, target.x, target.y, guard.speed, dt)) {
    guard.wp = (guard.wp + 1) % guard.waypoints.length;
    guard.pause = 0.8;
  }
}

/** The nearest guard inside the train, for the decoy whistle. */
export function nearestGuard(guards, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const guard of guards) {
    const d = Math.hypot(guard.x - x, guard.y - y);
    if (d < bestDist) { bestDist = d; best = guard; }
  }
  return best;
}

export function carriageOf(x) {
  const i = Math.floor((x - TRAIN_LEFT) / CARRIAGE_WIDTH);
  return Math.max(0, Math.min(3, i));
}

export { TRAIN_TOP, TRAIN_BOTTOM };
