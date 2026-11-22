// Boot: wires input to the state, runs the fixed-step loop, and stages
// deterministic ?shot= scenes for screenshots.
import { createGameState, stepGame, interact, showMessage } from './state.js';
import { drawGame } from './render.js';
import { createInput, attachInput } from './input.js';
import { useTool } from './tools.js';
import { createAudio, playPickup, playWhistle, playSmoke, playBrake, playAlarm, playWin, playCaught } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

function fitCanvas() {
  canvas.width = 1280;
  canvas.height = 800;
}

fitCanvas();
const state = createGameState(20261122);
const input = createInput();
const audio = createAudio();
let paused = false;
let lastAlarmSound = 0;

function startGame() {
  if (state.screen === 'title') {
    state.screen = 'play';
    showMessage(state, 'Cross the train. The Iron Strongbox is in the last car.', 4);
  }
}

function restartGame() {
  const fresh = createGameState(20261122);
  Object.assign(state, fresh);
  state.screen = 'play';
  paused = false;
}

attachInput(input, canvas, {
  onInteract: () => {
    if (state.screen === 'title') { startGame(); return; }
    if (state.screen === 'play') {
      const hadLoot = state.thief.hasLoot;
      interact(state);
      if (state.thief.hasLoot && !hadLoot) playPickup(audio);
    }
  },
  onTool: (key) => {
    const before = state.tools[key];
    if (useTool(state, key) && state.tools[key] < before) {
      if (key === 'whistle') playWhistle(audio);
      if (key === 'smoke') playSmoke(audio);
      if (key === 'brake') playBrake(audio);
    }
  },
  onPause: () => { if (state.screen === 'play') paused = !paused; },
  onRestart: () => { if (state.screen !== 'title') restartGame(); },
  onMute: () => { audio.muted = !audio.muted; },
  onStart: () => startGame(),
  onPointer: (x, y) => {
    if (state.screen === 'title') { startGame(); return; }
    if (state.screen !== 'play') return;
    // Click a tool strip button (bottom bar) to fire that tool.
    if (y > 800 - 34) {
      const tools = ['brake', 'whistle', 'smoke'];
      for (let i = 0; i < 3; i += 1) {
        const bx = 760 + i * 165;
        if (x >= bx && x <= bx + 155) {
          const before = state.tools[tools[i]];
          if (useTool(state, tools[i]) && state.tools[tools[i]] < before) {
            if (tools[i] === 'whistle') playWhistle(audio);
            if (tools[i] === 'smoke') playSmoke(audio);
            if (tools[i] === 'brake') playBrake(audio);
          }
          return;
        }
      }
    }
    input.target = { x, y };
  },
});

let lastScreen = state.screen;
function announce() {
  if (state.screen !== lastScreen) {
    if (state.screen === 'win') { playWin(audio); statusEl.textContent = 'Clean getaway! You escaped with the Iron Strongbox.'; }
    if (state.screen === 'caught' || state.screen === 'over') { playCaught(audio); statusEl.textContent = 'Caught. Press R to try again.'; }
    lastScreen = state.screen;
  }
}

if (shotName) {
  // Screenshot mode: stage the scene and draw it once, synchronously.
  stageShot(shotName, state);
  drawGame(ctx, state);
} else {
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused && state.screen === 'play') {
      acc += dt;
      while (acc >= STEP) {
        stepGame(state, STEP, input);
        acc -= STEP;
      }
      if (state.spotted && state.now - lastAlarmSound > 0.6) {
        playAlarm(audio);
        lastAlarmSound = state.now;
      }
    }
    drawGame(ctx, state);
    if (paused && state.screen === 'play') {
      ctx.fillStyle = 'rgba(10,8,18,0.7)';
      ctx.fillRect(0, 0, 1280, 800);
      ctx.font = '700 34px system-ui, sans-serif';
      ctx.fillStyle = '#f5c542';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED — press P to continue', 640, 400);
    }
    announce();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
