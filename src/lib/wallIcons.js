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
  "rainbow",
  "tree",
  "boat",
  "kite",
  "crown",
  "rocket",
  "snail",
  "ladybug",
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
  rainbow(ctx) {
    const bands = [
      "#ff5d5d",
      "#ff9d3d",
      "#ffd84a",
      "#6ecf6e",
      "#5aa8ff",
      "#a97ee8",
    ];
    ctx.lineCap = "butt";
    bands.forEach((col, i) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.arc(C, C + 52, 92 - i * 13, Math.PI, 0);
      ctx.stroke();
    });
    ctx.lineCap = "round";
    // fluffy clouds at both ends
    ctx.fillStyle = "#f4f4f0";
    for (const ex of [-84, 84]) {
      for (const [dx, dy, r] of [
        [-14, 0, 15],
        [8, -8, 17],
        [22, 4, 13],
      ]) {
        ctx.beginPath();
        ctx.arc(C + ex + dx, C + 54 + dy, r, 0, TAU);
        ctx.fill();
      }
    }
  },
  tree(ctx) {
    ctx.fillStyle = "#8a5a30";
    ctx.beginPath();
    ctx.roundRect(C - 12, C + 8, 24, 72, 8);
    ctx.fill();
    stroke(ctx, 7);
    ctx.fillStyle = "#5db85d";
    for (const [dx, dy, r] of [
      [-34, -18, 34],
      [34, -18, 34],
      [0, -48, 38],
      [0, -8, 36],
    ]) {
      ctx.beginPath();
      ctx.arc(C + dx, C + dy, r, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(C - 34, C - 18, 34, 0, TAU);
    ctx.arc(C + 34, C - 18, 34, 0, TAU);
    ctx.arc(C, C - 48, 38, 0, TAU);
    stroke(ctx, 7);
    // apples
    ctx.fillStyle = "#ff5d5d";
    for (const [dx, dy] of [
      [-30, -34],
      [24, -8],
      [4, -52],
    ]) {
      ctx.beginPath();
      ctx.arc(C + dx, C + dy, 8, 0, TAU);
      ctx.fill();
    }
  },
  boat(ctx) {
    // waves
    ctx.strokeStyle = "#5aa8ff";
    ctx.lineWidth = 8;
    for (const [wy, ph] of [
      [C + 66, 0],
      [C + 82, 24],
    ]) {
      ctx.beginPath();
      for (let x = -90; x <= 90; x += 6) {
        const y = wy + Math.sin((x + ph) / 16) * 5;
        x === -90 ? ctx.moveTo(C + x, y) : ctx.lineTo(C + x, y);
      }
      ctx.stroke();
    }
    // hull
    ctx.fillStyle = "#b06a32";
    ctx.beginPath();
    ctx.moveTo(C - 62, C + 40);
    ctx.lineTo(C + 62, C + 40);
    ctx.lineTo(C + 40, C + 66);
    ctx.lineTo(C - 40, C + 66);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 8);
    // mast + sail
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(C, C + 38);
    ctx.lineTo(C, C - 78);
    ctx.stroke();
    ctx.fillStyle = "#ff8a50";
    ctx.beginPath();
    ctx.moveTo(C + 8, C - 74);
    ctx.lineTo(C + 62, C + 28);
    ctx.lineTo(C + 8, C + 28);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 7);
    ctx.fillStyle = "#f4f4f0";
    ctx.beginPath();
    ctx.moveTo(C - 8, C - 70);
    ctx.lineTo(C - 52, C + 28);
    ctx.lineTo(C - 8, C + 28);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 7);
  },
  kite(ctx) {
    // tail with bows
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(C, C + 26);
    ctx.quadraticCurveTo(C - 30, C + 60, C - 44, C + 88);
    ctx.stroke();
    for (const [bx, by, a] of [
      [C - 16, C + 48, 0.5],
      [C - 34, C + 72, 0.9],
    ]) {
      ctx.fillStyle = "#ffd84a";
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(
          bx + s * 8 * Math.cos(a),
          by + s * 8 * Math.sin(a),
          10,
          6,
          a,
          0,
          TAU,
        );
        ctx.fill();
      }
      stroke(ctx, 4);
    }
    // diamond
    ctx.fillStyle = "#ff86b6";
    ctx.beginPath();
    ctx.moveTo(C, C - 84);
    ctx.lineTo(C + 46, C - 28);
    ctx.lineTo(C, C + 30);
    ctx.lineTo(C - 46, C - 28);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 8);
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(C, C - 84);
    ctx.lineTo(C, C + 30);
    ctx.moveTo(C - 46, C - 28);
    ctx.lineTo(C + 46, C - 28);
    ctx.stroke();
  },
  crown(ctx) {
    ctx.fillStyle = "#ffcf3d";
    ctx.beginPath();
    ctx.moveTo(C - 70, C + 44);
    ctx.lineTo(C - 78, C - 34);
    ctx.lineTo(C - 36, C - 2);
    ctx.lineTo(C, C - 58);
    ctx.lineTo(C + 36, C - 2);
    ctx.lineTo(C + 78, C - 34);
    ctx.lineTo(C + 70, C + 44);
    ctx.closePath();
    ctx.fill();
    stroke(ctx);
    // band
    ctx.fillStyle = "#ffb43d";
    ctx.beginPath();
    ctx.roundRect(C - 72, C + 34, 144, 26, 8);
    ctx.fill();
    stroke(ctx, 7);
    // jewels
    for (const [dx, col] of [
      [-44, "#ff5d7a"],
      [0, "#58cfc0"],
      [44, "#5aa8ff"],
    ]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(C + dx, C + 47, 9, 0, TAU);
      ctx.fill();
      stroke(ctx, 4);
    }
    ctx.fillStyle = "#fff3c8";
    for (const dx of [-78, 0, 78]) {
      ctx.beginPath();
      ctx.arc(C + dx, dx === 0 ? C - 62 : C - 38, 8, 0, TAU);
      ctx.fill();
      stroke(ctx, 4);
    }
  },
  rocket(ctx) {
    // flame
    ctx.fillStyle = "#ff9d3d";
    ctx.beginPath();
    ctx.moveTo(C - 16, C + 52);
    ctx.quadraticCurveTo(C, C + 96, C + 16, C + 52);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd84a";
    ctx.beginPath();
    ctx.moveTo(C - 8, C + 52);
    ctx.quadraticCurveTo(C, C + 78, C + 8, C + 52);
    ctx.closePath();
    ctx.fill();
    // fins
    ctx.fillStyle = "#ff5d5d";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(C + s * 24, C + 10);
      ctx.lineTo(C + s * 52, C + 56);
      ctx.lineTo(C + s * 24, C + 50);
      ctx.closePath();
      ctx.fill();
      stroke(ctx, 6);
    }
    // body
    ctx.fillStyle = "#e8ecf5";
    ctx.beginPath();
    ctx.moveTo(C, C - 88);
    ctx.bezierCurveTo(C + 34, C - 52, C + 26, C + 20, C + 22, C + 52);
    ctx.lineTo(C - 22, C + 52);
    ctx.bezierCurveTo(C - 26, C + 20, C - 34, C - 52, C, C - 88);
    ctx.closePath();
    ctx.fill();
    stroke(ctx);
    // nose cone
    ctx.fillStyle = "#ff5d5d";
    ctx.beginPath();
    ctx.moveTo(C, C - 88);
    ctx.bezierCurveTo(C + 20, C - 68, C + 26, C - 52, C + 28, C - 40);
    ctx.lineTo(C - 28, C - 40);
    ctx.bezierCurveTo(C - 26, C - 52, C - 20, C - 68, C, C - 88);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 7);
    // porthole
    ctx.fillStyle = "#5aa8ff";
    ctx.beginPath();
    ctx.arc(C, C - 6, 16, 0, TAU);
    ctx.fill();
    stroke(ctx, 7);
  },
  snail(ctx) {
    // body
    ctx.fillStyle = "#a3d977";
    ctx.beginPath();
    ctx.moveTo(C - 78, C + 56);
    ctx.quadraticCurveTo(C - 88, C + 22, C - 58, C + 14);
    ctx.lineTo(C - 48, C + 40);
    ctx.lineTo(C + 62, C + 40);
    ctx.quadraticCurveTo(C + 84, C + 44, C + 78, C + 56);
    ctx.closePath();
    ctx.fill();
    stroke(ctx, 7);
    // antennae
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(C - 66, C + 18);
    ctx.lineTo(C - 78, C - 10);
    ctx.moveTo(C - 56, C + 16);
    ctx.lineTo(C - 52, C - 12);
    ctx.stroke();
    ctx.fillStyle = "#a3d977";
    for (const [ax, ay] of [
      [C - 78, C - 14],
      [C - 52, C - 16],
    ]) {
      ctx.beginPath();
      ctx.arc(ax, ay, 6, 0, TAU);
      ctx.fill();
      stroke(ctx, 4);
    }
    // spiral shell
    ctx.fillStyle = "#ffb86b";
    ctx.beginPath();
    ctx.arc(C + 22, C + 4, 46, 0, TAU);
    ctx.fill();
    stroke(ctx, 8);
    ctx.strokeStyle = "#b06a32";
    ctx.lineWidth = 7;
    ctx.beginPath();
    let first = true;
    for (let t = 0; t < Math.PI * 3.4; t += 0.2) {
      const r = 4 + t * 3.8;
      const x = C + 22 + Math.cos(t + 2) * r,
        y = C + 4 + Math.sin(t + 2) * r;
      first ? ((first = false), ctx.moveTo(x, y)) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  },
  ladybug(ctx) {
    // head
    ctx.fillStyle = "#33302c";
    ctx.beginPath();
    ctx.arc(C, C - 52, 26, 0, TAU);
    ctx.fill();
    stroke(ctx, 6);
    // antennae
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(C - 14, C - 72);
    ctx.quadraticCurveTo(C - 26, C - 88, C - 38, C - 86);
    ctx.moveTo(C + 14, C - 72);
    ctx.quadraticCurveTo(C + 26, C - 88, C + 38, C - 86);
    ctx.stroke();
    // body
    ctx.fillStyle = "#ff5d5d";
    ctx.beginPath();
    ctx.ellipse(C, C + 14, 62, 68, 0, 0, TAU);
    ctx.fill();
    stroke(ctx);
    // wing split
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(C, C - 52);
    ctx.lineTo(C, C + 80);
    ctx.stroke();
    // dots
    ctx.fillStyle = "#33302c";
    for (const [dx, dy, r] of [
      [-30, -12, 11],
      [30, -12, 11],
      [-24, 34, 9],
      [24, 34, 9],
      [-40, 12, 7],
      [40, 12, 7],
    ]) {
      ctx.beginPath();
      ctx.arc(C + dx, C + 14 + dy, r, 0, TAU);
      ctx.fill();
    }
  },
};

export function createIconTexture(kind) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // A soft shadow under every paint stroke lifts the drawing off the masonry
  // without framing it.
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 14;
  (DRAW[kind] || DRAW.star)(ctx);
  ctx.shadowBlur = 0;
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
