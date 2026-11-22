// Sound: tiny WebAudio blips made on the spot — no audio files, no network.
// A low whistle for the decoy, a hiss for smoke, a klaxon for the alarm.
export function createAudio() {
  return { ctx: null, muted: false, alarmOsc: null };
}

function ensureContext(audio) {
  if (audio.ctx) return audio.ctx;
  try {
    audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (err) {
    audio.ctx = null;
  }
  return audio.ctx;
}

function blip(audio, freq, seconds, type = 'sine', gain = 0.08) {
  if (audio.muted) return;
  const ctx = ensureContext(audio);
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
  osc.connect(amp).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + seconds);
}

export function playPickup(audio) {
  blip(audio, 880, 0.12, 'sine', 0.09);
  window.setTimeout(() => blip(audio, 1318, 0.18, 'sine', 0.09), 90);
}

export function playWhistle(audio) {
  blip(audio, 2200, 0.25, 'sine', 0.06);
  window.setTimeout(() => blip(audio, 1800, 0.3, 'sine', 0.06), 160);
}

export function playSmoke(audio) {
  blip(audio, 320, 0.4, 'sawtooth', 0.03);
}

export function playBrake(audio) {
  blip(audio, 140, 0.5, 'sawtooth', 0.08);
  window.setTimeout(() => blip(audio, 90, 0.5, 'sawtooth', 0.08), 200);
}

export function playAlarm(audio) {
  blip(audio, 660, 0.16, 'square', 0.05);
  window.setTimeout(() => blip(audio, 440, 0.16, 'square', 0.05), 180);
}

export function playWin(audio) {
  [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => blip(audio, f, 0.25, 'sine', 0.09), i * 130));
}

export function playCaught(audio) {
  [330, 262, 196].forEach((f, i) => window.setTimeout(() => blip(audio, f, 0.3, 'sawtooth', 0.07), i * 150));
}
