import * as THREE from "three";

// Cheerful, kid-friendly motifs painted on occasional walls. They double as
// orientation landmarks ("turn at the star wall"). Deliberately wholesome —
// no skulls, monsters, or anything spooky.
export const ICON_KINDS = [
  "star",
  "sun",
  "moon",
  "flower",
  "heart",
  "fish",
  "butterfly",
  "leaf",
  "mushroom",
  "gem",
  "spiral",
  "paw",
];

const S = 256;
const C = 128;
const OUTLINE = "rgba(30,22,14,0.92)";

function stroke(ctx, w = 9) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w;
  ctx.stroke();
}

// Stable per-kind PRNG so each motif weathers the same way every run.
function kindSeed(kind) {
  let h = 2166136261;
  for (let i = 0; i < kind.length; i++) {
    h ^= kind.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;

const DRAW = {
  star(ctx) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 34 : 84;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const x = C + Math.cos(a) * r,
        y = C + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffd24a";
    ctx.fill();
    stroke(ctx);
  },
  sun(ctx) {
    ctx.strokeStyle = "#ffb43d";
    ctx.lineWidth = 12;
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(C + Math.cos(a) * 52, C + Math.sin(a) * 52);
      ctx.lineTo(C + Math.cos(a) * 84, C + Math.sin(a) * 84);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(C, C, 44, 0, TAU);
    ctx.fillStyle = "#ffc24a";
    ctx.fill();
    stroke(ctx);
    // friendly smile
    ctx.fillStyle = "#7a4a10";
    ctx.beginPath();
    ctx.arc(C - 16, C - 8, 5, 0, TAU);
    ctx.arc(C + 16, C - 8, 5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#7a4a10";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(C, C + 4, 18, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  },
  moon(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(C, C, 78, 0, TAU);
    ctx.fillStyle = "#ffe39a";
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(C + 36, C - 12, 68, 0, TAU);
    ctx.fill();
    ctx.restore();
    // little sparkles
    ctx.fillStyle = "#fff3c8";
    for (const [sx, sy, r] of [
      [C + 44, C + 36, 9],
      [C + 58, C - 4, 6],
    ]) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rr = i % 2 ? r * 0.4 : r;
        const a = (i * Math.PI) / 4;
        const x = sx + Math.cos(a) * rr,
          y = sy + Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  },
  flower(ctx) {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.ellipse(
        C + Math.cos(a) * 42,
        C + Math.sin(a) * 42,
        26,
        40,
        a + Math.PI / 2,
        0,
        TAU,
      );
      ctx.fillStyle = "#ff86b6";
      ctx.fill();
      stroke(ctx, 7);
    }
    ctx.beginPath();
    ctx.arc(C, C, 30, 0, TAU);
    ctx.fillStyle = "#ffd84a";
    ctx.fill();
    stroke(ctx, 7);
  },
  heart(ctx) {
    ctx.beginPath();
    ctx.moveTo(C, C + 64);
    ctx.bezierCurveTo(C - 86, C - 6, C - 54, C - 72, C, C - 28);
    ctx.bezierCurveTo(C + 54, C - 72, C + 86, C - 6, C, C + 64);
    ctx.closePath();
    ctx.fillStyle = "#ff5d7a";
    ctx.fill();
    stroke(ctx);
  },
  fish(ctx) {
    ctx.beginPath();
    ctx.ellipse(C + 10, C, 68, 44, 0, 0, TAU);
    ctx.fillStyle = "#4fd0e0";
    ctx.fill();
    stroke(ctx);
    ctx.beginPath();
    ctx.moveTo(C - 50, C);
    ctx.lineTo(C - 92, C - 34);
    ctx.lineTo(C - 92, C + 34);
    ctx.closePath();
    ctx.fillStyle = "#4fd0e0";
    ctx.fill();
    stroke(ctx);
    ctx.beginPath();
    ctx.arc(C + 46, C - 12, 9, 0, TAU);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(C + 46, C - 12, 4, 0, TAU);
    ctx.fillStyle = "#223";
    ctx.fill();
  },
  butterfly(ctx) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(C + sx * 40, C - 26, 34, 30, 0, 0, TAU);
      ctx.fillStyle = "#b58cff";
      ctx.fill();
      stroke(ctx, 7);
      ctx.beginPath();
      ctx.ellipse(C + sx * 34, C + 34, 28, 26, 0, 0, TAU);
      ctx.fillStyle = "#b58cff";
      ctx.fill();
      stroke(ctx, 7);
    }
    ctx.beginPath();
    ctx.ellipse(C, C, 9, 46, 0, 0, TAU);
    ctx.fillStyle = "#5a3aa0";
    ctx.fill();
    stroke(ctx, 6);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(C, C - 44);
    ctx.lineTo(C - 16, C - 66);
    ctx.moveTo(C, C - 44);
    ctx.lineTo(C + 16, C - 66);
    ctx.stroke();
  },
  leaf(ctx) {
    ctx.beginPath();
    ctx.moveTo(C, C - 80);
    ctx.quadraticCurveTo(C + 62, C, C, C + 80);
    ctx.quadraticCurveTo(C - 62, C, C, C - 80);
    ctx.closePath();
    ctx.fillStyle = "#74cf74";
    ctx.fill();
    stroke(ctx);
    ctx.strokeStyle = "rgba(28,80,28,0.85)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(C, C - 70);
    ctx.lineTo(C, C + 70);
    ctx.stroke();
  },
  mushroom(ctx) {
    ctx.fillStyle = "#f1e2c4";
    ctx.beginPath();
    ctx.roundRect(C - 26, C - 6, 52, 80, 14);
    ctx.fill();
    stroke(ctx, 8);
    ctx.beginPath();
    ctx.moveTo(C - 88, C - 2);
    ctx.quadraticCurveTo(C, C - 112, C + 88, C - 2);
    ctx.closePath();
    ctx.fillStyle = "#ff6b6b";
    ctx.fill();
    stroke(ctx);
    ctx.fillStyle = "#fff";
    for (const [dx, dy, r] of [
      [-40, -32, 12],
      [10, -48, 14],
      [48, -22, 10],
      [-6, -16, 9],
    ]) {
      ctx.beginPath();
      ctx.arc(C + dx, C + dy, r, 0, TAU);
      ctx.fill();
    }
  },
  gem(ctx) {
    ctx.beginPath();
    ctx.moveTo(C, C - 80);
    ctx.lineTo(C + 70, C - 20);
    ctx.lineTo(C + 40, C + 78);
    ctx.lineTo(C - 40, C + 78);
    ctx.lineTo(C - 70, C - 20);
    ctx.closePath();
    ctx.fillStyle = "#58cfc0";
    ctx.fill();
    stroke(ctx);
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(C - 70, C - 20);
    ctx.lineTo(C, C + 18);
    ctx.lineTo(C + 70, C - 20);
    ctx.moveTo(C, C - 80);
    ctx.lineTo(C, C + 18);
    ctx.lineTo(C - 40, C + 78);
    ctx.moveTo(C, C + 18);
    ctx.lineTo(C + 40, C + 78);
    ctx.stroke();
  },
  spiral(ctx) {
    ctx.strokeStyle = "#86b8ff";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.beginPath();
    let first = true;
    for (let t = 0; t < Math.PI * 4; t += 0.18) {
      const r = 6 + t * 9;
      const x = C + Math.cos(t) * r,
        y = C + Math.sin(t) * r;
      first ? ((first = false), ctx.moveTo(x, y)) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  },
  paw(ctx) {
    ctx.fillStyle = "#ffb86b";
    ctx.beginPath();
    ctx.ellipse(C, C + 30, 46, 38, 0, 0, TAU);
    ctx.fill();
    stroke(ctx, 8);
    for (const [dx, dy] of [
      [-46, -30],
      [-16, -52],
      [18, -52],
      [48, -30],
    ]) {
      ctx.beginPath();
      ctx.ellipse(C + dx, C + dy, 18, 22, 0, 0, TAU);
      ctx.fillStyle = "#ffb86b";
      ctx.fill();
      stroke(ctx, 7);
    }
  },
};

export function createIconTexture(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Painted plaque backing so the motif pops against any masonry: a soft
  // dark disc with a pale hand-painted ring.
  ctx.fillStyle = "rgba(22,17,11,0.4)";
  ctx.beginPath();
  ctx.arc(C, C, 118, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(243,233,210,0.75)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(C, C, 108, 0, TAU);
  ctx.stroke();
  (DRAW[kind] || DRAW.star)(ctx);
  // Weather the paint lightly — chalky wash plus a few eroded patches — so
  // it reads as an old painting that is still clearly legible.
  const rnd = mulberry(kindSeed(kind));
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "rgba(226,224,216,0.22)";
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 14; i++) {
    const x = rnd() * S,
      y = rnd() * S,
      r = 7 + rnd() * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${0.25 + rnd() * 0.35})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
