// Screenshot scenes: deterministic staged states built from the real game
// state, so each shot is a genuine render of the game's own code.
// cover — the full heist in one frame: thief, guard cones, cameras, the
//   Iron Strongbox and the alarm meter all visible.
// roof — the thief on the roof under the sweeping searchlight.
// tool — a smoke pellet breaking line of sight mid-dining-car.
// win — the getaway: loot taken, the thief at the bridge.
import { createGameState } from './state.js';

function baseState() {
  const state = createGameState(20261122);
  state.screen = 'play';
  state.now = 24;
  state.timeLeft = 126;
  return state;
}

export function stageShot(name, state) {
  const fresh = baseState();
  Object.assign(state, fresh);
  if (name === 'roof') {
    state.thief.x = 640;
    state.thief.y = 162;
    state.thief.onRoof = true;
    state.now = 31;
    state.alarm = 18;
    state.guards[1].x = 560;
    state.guards[1].y = 430;
    state.guards[1].angle = Math.PI / 2;
    return { screen: 'play' };
  }
  if (name === 'tool') {
    state.thief.x = 520;
    state.thief.y = 470;
    state.now = 48;
    state.timeLeft = 102;
    state.alarm = 58;
    state.spotted = true;
    state.smoke = { active: true, x: 520, y: 470, r: 95, until: state.now + 4 };
    state.tools.smoke = 1;
    state.tools.whistle = 1;
    state.guards[1].x = 600;
    state.guards[1].y = 400;
    state.guards[1].angle = Math.PI;
    state.guards[1].state = 'chase';
    return { screen: 'play' };
  }
  if (name === 'win') {
    state.thief.x = 70;
    state.thief.y = 480;
    state.now = 96;
    state.timeLeft = 54;
    state.alarm = 12;
    state.thief.hasLoot = true;
    state.strongbox.taken = true;
    state.score = 500 + 54 * 10;
    state.screen = 'win';
    return { screen: 'win' };
  }
  // cover (default)
  state.thief.x = 470;
  state.thief.y = 430;
  state.thief.face = 1;
  state.alarm = 34;
  state.spotted = true;
  state.guards[0].x = 260;
  state.guards[0].y = 380;
  state.guards[0].angle = 0.6;
  state.guards[1].x = 560;
  state.guards[1].y = 560;
  state.guards[1].angle = -1.2;
  state.guards[2].x = 880;
  state.guards[2].y = 430;
  state.guards[2].angle = Math.PI;
  state.guards[3].x = 1130;
  state.guards[3].y = 560;
  state.guards[3].angle = -1.4;
  return { screen: 'play' };
}
