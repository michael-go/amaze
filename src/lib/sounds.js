let ctx = null;
let lpf = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 2000;
    lpf.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function dest() {
  getCtx();
  return lpf;
}

// Magical sparkle: quick rising arpeggio of sine tones
export function playMagicPickup() {
  const c = getCtx();
  const now = c.currentTime;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.03);
    gain.gain.linearRampToValueAtTime(0, now + i * 0.08 + 0.2);
    osc.connect(gain).connect(dest());
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.25);
  });
}

// Treasure collected: triumphant major chord with shimmer
export function playTreasureWin() {
  const c = getCtx();
  const now = c.currentTime;
  // Staggered major chord: C4, E4, G4, C5
  const notes = [262, 330, 392, 523];
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now + i * 0.06);
    gain.gain.linearRampToValueAtTime(0.3, now + i * 0.06 + 0.05);
    gain.gain.linearRampToValueAtTime(0.15, now + i * 0.06 + 0.4);
    gain.gain.linearRampToValueAtTime(0, now + i * 0.06 + 1.0);
    osc.connect(gain).connect(dest());
    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 1.0);
  });
  // Shimmer on top
  const shimmer = c.createOscillator();
  shimmer.type = "sine";
  shimmer.frequency.value = 1047;
  const sGain = c.createGain();
  sGain.gain.setValueAtTime(0, now + 0.3);
  sGain.gain.linearRampToValueAtTime(0.15, now + 0.4);
  sGain.gain.linearRampToValueAtTime(0, now + 1.2);
  shimmer.connect(sGain).connect(dest());
  shimmer.start(now + 0.3);
  shimmer.stop(now + 1.2);
}
