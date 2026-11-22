// Keyboard and mouse input: WASD or arrows to move, click to walk there,
// E to climb or lock, 1/2/3 for tools, Space to grab, P to pause, R to restart.
export function createInput() {
  return {
    left: false, right: false, up: false, down: false,
    target: null, interactPressed: false, restartPressed: false,
  };
}

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
};

export function attachInput(input, canvas, callbacks) {
  window.addEventListener('keydown', (event) => {
    const dir = KEYMAP[event.code];
    if (dir) { input[dir] = true; event.preventDefault(); return; }
    if (event.code === 'KeyE') callbacks.onInteract();
    if (event.code === 'Space') { callbacks.onInteract(); event.preventDefault(); }
    if (event.code === 'KeyL') callbacks.onInteract();
    if (event.code === 'Digit1') callbacks.onTool('brake');
    if (event.code === 'Digit2') callbacks.onTool('whistle');
    if (event.code === 'Digit3') callbacks.onTool('smoke');
    if (event.code === 'KeyP') callbacks.onPause();
    if (event.code === 'KeyR') callbacks.onRestart();
    if (event.code === 'KeyM') callbacks.onMute();
    if (event.code === 'Enter') callbacks.onStart();
  });
  window.addEventListener('keyup', (event) => {
    const dir = KEYMAP[event.code];
    if (dir) input[dir] = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1280;
    const y = ((event.clientY - rect.top) / rect.height) * 800;
    callbacks.onPointer(x, y);
  });
  window.addEventListener('blur', () => {
    input.left = false; input.right = false; input.up = false; input.down = false;
  });
}
