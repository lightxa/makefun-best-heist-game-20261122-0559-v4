// Seeded random numbers: every run of the train uses the same seed, so the
// patrols, the sway and the loot placement are identical every time you play.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one item from `list` using the seeded generator. */
export function pickRandom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
