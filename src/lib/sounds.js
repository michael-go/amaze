let ctx = null;
let lpf = null;

export function getCtx() {
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

export function isMuted() {
  return localStorage.getItem("amaze:muted") === "true";
}

export function setMuted(val) {
  localStorage.setItem("amaze:muted", val ? "true" : "false");
}

// Magical sparkle: quick rising arpeggio of sine tones
export function playMagicPickup() {
  if (isMuted()) return;
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

// Dull low thud when bumping into a wall
export function playWallBump() {
  if (isMuted()) return;
  const c = getCtx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(90, now);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain).connect(dest());
  osc.start(now);
  osc.stop(now + 0.16);
}

// Quick happy two-note chime for a correct quiz answer
export function playQuizCorrect() {
  if (isMuted()) return;
  const c = getCtx();
  const now = c.currentTime;
  [659, 880].forEach((freq, i) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now + i * 0.09);
    gain.gain.linearRampToValueAtTime(0.25, now + i * 0.09 + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + i * 0.09 + 0.2);
    osc.connect(gain).connect(dest());
    osc.start(now + i * 0.09);
    osc.stop(now + i * 0.09 + 0.22);
  });
}

// Gentle descending "wah" for a wrong quiz answer
export function playQuizWrong() {
  if (isMuted()) return;
  const c = getCtx();
  const now = c.currentTime;
  [330, 262].forEach((freq, i) => {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now + i * 0.16);
    gain.gain.linearRampToValueAtTime(0.2, now + i * 0.16 + 0.03);
    gain.gain.linearRampToValueAtTime(0, now + i * 0.16 + 0.18);
    osc.connect(gain).connect(dest());
    osc.start(now + i * 0.16);
    osc.stop(now + i * 0.16 + 0.2);
  });
}

// Soft tick for each countdown second
export function playCountdownTick() {
  if (isMuted()) return;
  const c = getCtx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 880;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(gain).connect(dest());
  osc.start(now);
  osc.stop(now + 0.08);
}

// Brighter "go!" blip when the countdown ends
export function playCountdownGo() {
  if (isMuted()) return;
  const c = getCtx();
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 1175;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain).connect(dest());
  osc.start(now);
  osc.stop(now + 0.32);
}

// Airy rising whoosh when the fly power kicks in
export function playFlyWhoosh() {
  if (isMuted()) return;
  const c = getCtx();
  const now = c.currentTime;
  const duration = 0.7;
  const bufSize = Math.ceil(c.sampleRate * duration);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bpf = c.createBiquadFilter();
  bpf.type = "bandpass";
  bpf.Q.value = 1.5;
  bpf.frequency.setValueAtTime(300, now);
  bpf.frequency.exponentialRampToValueAtTime(2200, now + duration);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.15);
  gain.gain.linearRampToValueAtTime(0, now + duration);
  src.connect(bpf).connect(gain).connect(dest());
  src.start(now);
}

// Treasure collected: triumphant major chord with shimmer
export function playTreasureWin() {
  if (isMuted()) return;
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
