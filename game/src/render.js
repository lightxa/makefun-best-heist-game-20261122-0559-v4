// Rendering: everything the player sees — the night train, the cones, the
// cameras, the loot, the alarm meter and the title/win/caught screens.
// Canvas 2D only, drawn from the state, nothing pre-baked.
import {
  VIEW_WIDTH, VIEW_HEIGHT, HUD_HEIGHT, TRAIN_LEFT, TRAIN_RIGHT, TRAIN_TOP,
  TRAIN_BOTTOM, ROOF_TOP, ROOF_BOTTOM, CARRIAGE_WIDTH, CARRIAGES,
} from './levels.js';
import { CONE_LENGTH, CONE_HALF_ANGLE } from './guards.js';
import { CAMERA_CONE_LENGTH, CAMERA_HALF_ANGLE, cameraAngle, searchlightAngle } from './cameras.js';
import { swayOffset } from './state.js';
import { TOOL_DEFS } from './tools.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_OVER = 'over';

function conePath(ctx, x, y, angle, length, half) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, length, angle - half, angle + half);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, length, half, fill, stroke) {
  conePath(ctx, x, y, angle, length, half);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function label(ctx, text, x, y, size, color, align = 'center', bold = true) {
  ctx.font = `${bold ? '700' : '400'} ${size}px system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#0d0b16';
  ctx.fillRect(0, 0, VIEW_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(0, HUD_HEIGHT - 3, VIEW_WIDTH, 3);
  label(ctx, 'THE IRON VAULT EXPRESS', 20, 26, 22, '#f5c542', 'left');
  label(ctx, 'a night-train heist  •  steal the Iron Strongbox, jump at the bridge', 20, 52, 13, '#b9b3c9', 'left', false);
  // Alarm meter: big, labelled, impossible to miss.
  const ax = 560;
  label(ctx, 'ALARM', ax, 20, 13, '#ff8a7a', 'left');
  ctx.fillStyle = '#241a1a';
  ctx.fillRect(ax, 30, 220, 20);
  const frac = state.alarm / 100;
  ctx.fillStyle = state.alarm > 70 ? '#ff3b30' : state.alarm > 40 ? '#ff9f2e' : '#f5c542';
  ctx.fillRect(ax, 30, 220 * frac, 20);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ax, 30, 220, 20);
  label(ctx, `${Math.round(state.alarm)}%`, ax + 230, 40, 15, '#ffffff', 'left');
  if (state.spotted) label(ctx, 'SPOTTED!', ax, 62, 14, '#ff3b30', 'left');
  // Timer to the terminus.
  const t = Math.max(0, Math.ceil(state.timeLeft));
  label(ctx, 'TO TERMINUS', 900, 20, 13, '#b9b3c9', 'left');
  label(ctx, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, 900, 44, 24, t < 30 ? '#ff3b30' : '#ffffff', 'left');
  // Loot status.
  label(ctx, state.thief.hasLoot ? 'LOOT: IRON STRONGBOX ✔' : 'LOOT: IRON STRONGBOX', 1060, 26, 14, state.thief.hasLoot ? '#7ee787' : '#f5c542', 'left');
  label(ctx, state.thief.onRoof ? 'ON THE ROOF' : 'INSIDE THE TRAIN', 1060, 52, 13, '#b9b3c9', 'left', false);
  // Tool strip.
  let tx = 20;
  ctx.fillStyle = '#14121f';
  ctx.fillRect(0, VIEW_HEIGHT - 34, VIEW_WIDTH, 34);
  label(ctx, 'WASD/arrows move  •  click to walk  •  E ladder / lock door  •  Space grab', 20, VIEW_HEIGHT - 17, 13, '#b9b3c9', 'left', false);
  TOOL_DEFS.forEach((def, i) => {
    const x = 760 + i * 165;
    ctx.fillStyle = '#241f33';
    ctx.fillRect(x, VIEW_HEIGHT - 29, 155, 24);
    ctx.strokeStyle = '#4a4360';
    ctx.strokeRect(x, VIEW_HEIGHT - 29, 155, 24);
    label(ctx, `[${def.hotkey}] ${def.label} ×${state.tools[def.key]}`, x + 78, VIEW_HEIGHT - 17, 12, '#ffffff');
    tx += 0;
  });
  void tx;
}

function drawTrain(ctx, state) {
  const sway = swayOffset(state);
  ctx.save();
  ctx.translate(sway, Math.sin(state.now * 0.9) * 2);
  // Night sky and mountains rushing past.
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(-20, HUD_HEIGHT, VIEW_WIDTH + 40, VIEW_HEIGHT - HUD_HEIGHT);
  ctx.fillStyle = '#131a30';
  for (let i = 0; i < 8; i += 1) {
    const mx = ((i * 317 + state.now * -38) % 1400 + 1400) % 1400 - 60;
    ctx.beginPath();
    ctx.moveTo(mx, ROOF_TOP);
    ctx.lineTo(mx + 90, ROOF_TOP - 46);
    ctx.lineTo(mx + 180, ROOF_TOP);
    ctx.closePath();
    ctx.fill();
  }
  // Moon.
  ctx.fillStyle = '#e8e4c8';
  ctx.beginPath();
  ctx.arc(1180, 108, 22, 0, Math.PI * 2);
  ctx.fill();
  // Roof strip.
  ctx.fillStyle = '#1d1a26';
  ctx.fillRect(TRAIN_LEFT, ROOF_TOP, TRAIN_RIGHT - TRAIN_LEFT, ROOF_BOTTOM - ROOF_TOP);
  ctx.fillStyle = '#3a3348';
  for (let x = TRAIN_LEFT + 20; x < TRAIN_RIGHT; x += 60) ctx.fillRect(x, ROOF_TOP + 8, 34, 6);
  label(ctx, 'ROOF — fast, camera-free, but the searchlight sweeps here', TRAIN_LEFT + 10, ROOF_TOP + 46, 12, '#8f86a8', 'left', false);
  // Carriages.
  CARRIAGES.forEach((car, i) => {
    const x = TRAIN_LEFT + i * CARRIAGE_WIDTH;
    ctx.fillStyle = car.tint;
    ctx.fillRect(x, TRAIN_TOP, CARRIAGE_WIDTH, TRAIN_BOTTOM - TRAIN_TOP);
    ctx.strokeStyle = '#574f6e';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, TRAIN_TOP, CARRIAGE_WIDTH, TRAIN_BOTTOM - TRAIN_TOP);
  });
  // Cover.
  for (const block of state.cover) {
    ctx.fillStyle = block.kind === 'vault' ? '#4a3f22' : block.kind === 'crate' ? '#4a3520' : '#3d3350';
    ctx.fillRect(block.x, block.y, block.w, block.h);
    ctx.strokeStyle = '#6b5f8a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(block.x, block.y, block.w, block.h);
    label(ctx, block.label, block.x + block.w / 2, block.y + block.h / 2, 11, '#d8cfe8');
  }
  // Carriage names last, so cover never paints over them.
  CARRIAGES.forEach((car, i) => {
    const x = TRAIN_LEFT + i * CARRIAGE_WIDTH;
    ctx.fillStyle = 'rgba(11,10,20,0.72)';
    ctx.fillRect(x + 8, TRAIN_TOP + 6, CARRIAGE_WIDTH - 16, 40);
    label(ctx, car.name, x + CARRIAGE_WIDTH / 2, TRAIN_TOP + 18, 14, '#e8e0ff');
    label(ctx, car.note, x + CARRIAGE_WIDTH / 2, TRAIN_TOP + 36, 10, '#a89ec4', 'center', false);
  });
  // Doors and ladders.
  for (const door of state.doors) {
    const locked = state.now < door.lockedUntil;
    ctx.fillStyle = door.exit ? '#1f4d2e' : locked ? '#5a1f1f' : '#241f33';
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.strokeStyle = door.exit ? '#7ee787' : locked ? '#ff6b5e' : '#8f86a8';
    ctx.lineWidth = 2;
    ctx.strokeRect(door.x, door.y, door.w, door.h);
    label(ctx, door.exit ? 'BRIDGE' : locked ? 'LOCKED' : 'DOOR', door.x + 9, door.y + door.h / 2, 10, '#ffffff');
  }
  for (const ladder of state.ladders) {
    ctx.fillStyle = '#c9a227';
    for (let r = 0; r < 4; r += 1) ctx.fillRect(ladder.x, ladder.y + r * 8, ladder.w, 3);
    label(ctx, 'LADDER ▲', ladder.x + 14, TRAIN_TOP - 14, 10, '#f5c542');
  }
  // Bridge exit glow once the loot is taken.
  if (state.thief.hasLoot) {
    const b = state.bridge;
    ctx.fillStyle = 'rgba(126,231,135,0.25)';
    ctx.fillRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
    ctx.strokeStyle = '#7ee787';
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16);
    label(ctx, '★ JUMP AT THE BRIDGE ★', b.x + 120, b.y - 22, 14, '#7ee787');
  }
  // The Iron Strongbox.
  if (!state.strongbox.taken) {
    const b = state.strongbox;
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245,197,66,0.25)';
    ctx.fill();
    ctx.fillStyle = '#8a6d1f';
    ctx.fillRect(b.x - 18, b.y - 14, 36, 28);
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(b.x - 18, b.y - 14, 36, 8);
    ctx.strokeStyle = '#fff2b0';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 18, b.y - 14, 36, 28);
    label(ctx, 'IRON STRONGBOX', b.x, b.y - 36, 13, '#ffe98a');
  }
  // Smoke cloud.
  if (state.smoke.active && state.smoke.until > state.now) {
    ctx.fillStyle = 'rgba(200,200,210,0.55)';
    ctx.beginPath();
    ctx.arc(state.smoke.x, state.smoke.y, state.smoke.r, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'SMOKE', state.smoke.x, state.smoke.y, 12, '#3a3348');
  }
  // Camera cones, then cameras.
  for (const camera of state.cameras) {
    const a = cameraAngle(camera, state.now);
    drawCone(ctx, camera.x, camera.y, a, CAMERA_CONE_LENGTH, CAMERA_HALF_ANGLE, 'rgba(255,80,60,0.13)', 'rgba(255,80,60,0.35)');
  }
  // Searchlight cone on the roof.
  const la = searchlightAngle(state.searchlight, state.now);
  drawCone(ctx, state.searchlight.x, state.searchlight.y, la, 260, 0.45, 'rgba(255,240,160,0.20)', 'rgba(255,240,160,0.5)');
  // Guard cones, then guards.
  for (const guard of state.guards) {
    const frozen = state.now < guard.freezeUntil;
    const col = guard.state === 'chase' ? 'rgba(255,59,48,0.30)' : 'rgba(255,159,46,0.18)';
    drawCone(ctx, guard.x, guard.y, guard.angle, CONE_LENGTH, CONE_HALF_ANGLE, col, guard.state === 'chase' ? 'rgba(255,59,48,0.6)' : 'rgba(255,159,46,0.45)');
    ctx.fillStyle = frozen ? '#7a86a8' : guard.state === 'chase' ? '#ff3b30' : '#ff9f2e';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, guard.name, guard.x, guard.y - 26, 11, '#ffffff');
    if (frozen) label(ctx, 'FROZEN', guard.x, guard.y + 26, 10, '#b9c6e8');
    if (guard.state === 'decoy') label(ctx, 'LURED!', guard.x, guard.y + 26, 10, '#7ee787');
  }
  // Cameras.
  for (const camera of state.cameras) {
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(camera.x - 12, camera.y - 6, 24, 12);
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y + 8, 4, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'CAM', camera.x, camera.y + 24, 10, '#ff8a7a');
  }
  // Searchlight housing.
  ctx.fillStyle = '#3a3348';
  ctx.fillRect(state.searchlight.x - 14, state.searchlight.y - 8, 28, 14);
  label(ctx, 'SEARCHLIGHT', state.searchlight.x, state.searchlight.y - 18, 10, '#ffe98a');
  // The thief.
  const t = state.thief;
  ctx.fillStyle = '#2f6df6';
  ctx.beginPath();
  ctx.arc(t.x, t.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(t.x + t.face * 5, t.y - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, 'YOU — THE THIEF', t.x, t.y - 28, 12, '#ffffff');
  if (t.hasLoot) label(ctx, '💰 STRONGBOX', t.x, t.y + 28, 11, '#ffe98a');
  ctx.restore();
  // Caught grace flash.
  if (state.graceActive) {
    const blink = Math.floor(state.now * 8) % 2 === 0;
    if (blink) {
      ctx.fillStyle = 'rgba(255,59,48,0.18)';
      ctx.fillRect(0, HUD_HEIGHT, VIEW_WIDTH, VIEW_HEIGHT - HUD_HEIGHT);
    }
    label(ctx, `CAUGHT IN ${state.graceLeft.toFixed(1)}s — BREAK LINE OF SIGHT!`, 640, 120, 22, '#ff3b30');
  }
  if (state.spotted && !state.graceActive) {
    label(ctx, '⚠ SPOTTED — get out of the cones!', 640, 120, 18, '#ff9f2e');
  }
  if (state.now < state.brakeUntil) {
    label(ctx, 'BRAKE PULL — patrols halted!', 640, 150, 16, '#7ec8ff');
  }
  if (state.message && state.now < state.messageUntil) {
    ctx.fillStyle = 'rgba(13,11,22,0.85)';
    ctx.fillRect(320, VIEW_HEIGHT - 74, 640, 30);
    label(ctx, state.message, 640, VIEW_HEIGHT - 59, 14, '#ffffff', 'center', false);
  }
}

function drawPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10,8,18,0.88)';
  ctx.fillRect(240, 150, 800, 500);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(240, 150, 800, 500);
  label(ctx, title, 640, 210, 34, accent);
  lines.forEach((line, i) => {
    label(ctx, line.text, 640, 270 + i * 34, line.size || 16, line.color || '#e8e0ff', 'center', line.bold !== false);
  });
}

export function drawGame(ctx, state) {
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  if (state.screen === 'title') {
    drawTrain(ctx, state);
    drawHud(ctx, state);
    drawPanel(ctx, 'THE IRON VAULT EXPRESS', [
      { text: 'A heist on a moving night train. Cross four carriages,', size: 17 },
      { text: 'steal the Iron Strongbox, and jump at the rendezvous bridge', size: 17 },
      { text: 'before the train reaches the terminus.', size: 17 },
      { text: 'Read the cones. Use the roof. Lock doors behind you.', size: 15, color: '#f5c542' },
      { text: 'Tools cost charges — brake pull also raises the alarm.', size: 15, color: '#b9b3c9' },
      { text: 'Press ENTER or click to begin', size: 18, color: '#7ee787' },
    ], '#f5c542');
    return;
  }
  if (state.screen === 'win') {
    drawTrain(ctx, state);
    drawHud(ctx, state);
    drawPanel(ctx, 'CLEAN GETAWAY!', [
      { text: 'You leapt from the train at the bridge, strongbox in hand.', size: 17 },
      { text: `Score: ${state.score}   •   Time to spare: ${Math.max(0, Math.ceil(state.timeLeft))}s`, size: 17, color: '#f5c542' },
      { text: `Spotted ${state.stats.spottedTimes} times  •  tools used ${state.stats.toolsUsed}  •  doors locked ${state.stats.doorsLocked}`, size: 14, color: '#b9b3c9' },
      { text: 'Press R to run it again — faster, quieter.', size: 16, color: '#7ee787' },
    ], '#7ee787');
    return;
  }
  if (state.screen === 'caught' || state.screen === 'over') {
    drawTrain(ctx, state);
    drawHud(ctx, state);
    const terminus = state.screen === 'over';
    drawPanel(ctx, terminus ? 'TOO LATE — TERMINUS' : 'CAUGHT!', [
      { text: terminus ? 'The train rolled into the terminus with you aboard.' : 'The alarm tripped and the guards closed in.', size: 17 },
      { text: state.thief.hasLoot ? 'You had the strongbox — so close. The bridge was behind you.' : 'The Iron Strongbox is still in the vault car. Try another route.', size: 15, color: '#b9b3c9' },
      { text: 'Tip: watch a cone sweep twice before you cross it.', size: 15, color: '#f5c542' },
      { text: 'Press R to try again', size: 18, color: '#7ee787' },
    ], '#ff3b30');
    return;
  }
  drawTrain(ctx, state);
  drawHud(ctx, state);
}
