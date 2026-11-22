// The thief's tools: each one costs a limited charge, and the brake pull
// costs alarm as well. Tools are the trade-off that makes a route a decision.
import { nearestGuard, carriageOf } from './guards.js';
import { showMessage } from './state.js';
import { TRAIN_LEFT, CARRIAGE_WIDTH } from './levels.js';

export const TOOL_DEFS = [
  { key: 'brake', label: 'BRAKE PULL', hotkey: '1', cost: '1 use · +25 alarm', blurb: 'Halts every patrol for 5s' },
  { key: 'whistle', label: 'DECOY WHISTLE', hotkey: '2', cost: '2 uses', blurb: 'Lures one guard away' },
  { key: 'smoke', label: 'SMOKE PELLET', hotkey: '3', cost: '2 uses', blurb: 'Breaks sight for 4s' },
];

/** Use a tool by key. Returns true when it fired. */
export function useTool(state, key) {
  if (state.screen !== 'play') return false;
  if (state.tools[key] <= 0) {
    showMessage(state, 'That tool is spent — no charges left.', 1.6);
    return false;
  }
  if (key === 'brake') {
    state.tools.brake -= 1;
    state.brakeUntil = state.now + 5;
    state.alarm = Math.min(100, state.alarm + 25);
    state.stats.toolsUsed += 1;
    showMessage(state, 'BRAKE PULL! The train shudders — patrols halt for 5s. Alarm +25.');
    return true;
  }
  if (key === 'whistle') {
    const guard = nearestGuard(state.guards, state.thief.x, state.thief.y);
    if (!guard) return false;
    state.tools.whistle -= 1;
    const otherCar = (carriageOf(state.thief.x) + 2) % 4;
    const tx = TRAIN_LEFT + otherCar * CARRIAGE_WIDTH + CARRIAGE_WIDTH / 2;
    guard.decoyTarget = { x: tx, y: 460 };
    guard.decoyUntil = state.now + 7;
    state.stats.toolsUsed += 1;
    showMessage(state, `${guard.name} heard the whistle and wanders off to check!`);
    return true;
  }
  if (key === 'smoke') {
    state.tools.smoke -= 1;
    state.smoke = { active: true, x: state.thief.x, y: state.thief.y, r: 95, until: state.now + 4 };
    state.stats.toolsUsed += 1;
    showMessage(state, 'SMOKE! No eye can see through it for 4s.');
    return true;
  }
  return false;
}
