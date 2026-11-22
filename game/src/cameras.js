// Cameras inside the carriages and the searchlight sweeping the roof.
// A camera's cone swings on a sine; being caught in it raises the alarm.
import { TRAIN_TOP, CARRIAGE_WIDTH, TRAIN_LEFT } from './levels.js';
import { lineOfSightClear } from './guards.js';

export const CAMERA_CONE_LENGTH = 210;
export const CAMERA_HALF_ANGLE = 0.42;

export function buildCameras() {
  return [
    { x: TRAIN_LEFT + 0.5 * CARRIAGE_WIDTH, y: TRAIN_TOP + 6, base: Math.PI / 2, sweep: 0.7, speed: 0.55, phase: 0 },
    { x: TRAIN_LEFT + 1.5 * CARRIAGE_WIDTH, y: TRAIN_TOP + 6, base: Math.PI / 2, sweep: 0.85, speed: 0.45, phase: 1.6 },
    { x: TRAIN_LEFT + 2.5 * CARRIAGE_WIDTH, y: TRAIN_TOP + 6, base: Math.PI / 2, sweep: 0.7, speed: 0.6, phase: 3.1 },
    { x: TRAIN_LEFT + 3.5 * CARRIAGE_WIDTH, y: TRAIN_TOP + 6, base: Math.PI / 2, sweep: 0.6, speed: 0.5, phase: 4.7 },
  ];
}

export function cameraAngle(camera, now) {
  return camera.base + Math.sin(now * camera.speed + camera.phase) * camera.sweep;
}

/** Is the thief inside this camera's sweeping cone? */
export function cameraSeesThief(camera, now, thief, cover, smoke) {
  if (thief.onRoof) return false;
  if (smoke.active && smoke.until > now) {
    const dx = thief.x - smoke.x;
    const dy = thief.y - smoke.y;
    if (dx * dx + dy * dy < smoke.r * smoke.r) return false;
  }
  const dx = thief.x - camera.x;
  const dy = thief.y - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA_CONE_LENGTH) return false;
  let diff = Math.atan2(dy, dx) - cameraAngle(camera, now);
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > CAMERA_HALF_ANGLE) return false;
  return lineOfSightClear(camera.x, camera.y, thief.x, thief.y, cover);
}

// The roof searchlight: a wide beam that sweeps the carriage roofs. It can
// only see the thief while the thief is up on the roof.
export function buildSearchlight() {
  return { x: 640, y: 96, base: Math.PI / 2, sweep: 1.1, speed: 0.35, phase: 0, length: 260 };
}

export function searchlightAngle(light, now) {
  return light.base + Math.sin(now * light.speed + light.phase) * light.sweep;
}

export function searchlightSeesThief(light, now, thief) {
  if (!thief.onRoof) return false;
  const dx = thief.x - light.x;
  const dy = thief.y - light.y;
  const dist = Math.hypot(dx, dy);
  if (dist > light.length) return false;
  let diff = Math.atan2(dy, dx) - searchlightAngle(light, now);
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < 0.45;
}
