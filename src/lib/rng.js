// Seeded pseudo-random number generator (mulberry32)
// Returns a function that produces deterministic values in [0, 1)

export function createRng(seed) {
  let s = seed | 0;
  const next = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return next;
}
