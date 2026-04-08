import * as THREE from "three";

// Per-level wall themes
export const LEVEL_THEMES = [
  {
    wall: "#5a6a8e",
    rough: 0.8,
    metal: 0.0,
    emissive: "#000000",
    floor: "#3a3a4e",
    pattern: "stone",
  }, // 0: stone
  {
    wall: "#8a5a30",
    rough: 0.9,
    metal: 0.0,
    emissive: "#110500",
    floor: "#4a3020",
    pattern: "brick",
  }, // 1: sandstone brick
  {
    wall: "#2a6a4a",
    rough: 0.8,
    metal: 0.0,
    emissive: "#001a0a",
    floor: "#3a5a48",
    pattern: "mossy",
  }, // 2: mossy dungeon
  {
    wall: "#7a3020",
    rough: 0.6,
    metal: 0.1,
    emissive: "#200500",
    floor: "#3a1808",
    pattern: "crack",
  }, // 3: volcanic
  {
    wall: "#3a3a6a",
    rough: 0.3,
    metal: 0.7,
    emissive: "#000010",
    floor: "#2e2e48",
    pattern: "metal",
  }, // 4: metal fortress
  {
    wall: "#5a3a7a",
    rough: 0.5,
    metal: 0.4,
    emissive: "#1a0a30",
    floor: "#5a4a6e",
    pattern: "crystal",
  }, // 5: arcane crystal
  {
    wall: "#3a6a7a",
    rough: 0.3,
    metal: 0.3,
    emissive: "#001418",
    floor: "#263a42",
    pattern: "ice",
  }, // 6: ice cave
  {
    wall: "#6a5a2a",
    rough: 0.9,
    metal: 0.0,
    emissive: "#100800",
    floor: "#3a3520",
    pattern: "brick",
  }, // 7: ancient ruins
];

// sRGB hex to HSL (avoids THREE.Color's linear-space conversion)
function hexToHSL(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 0xff) / 255;
  const g = ((n >> 8) & 0xff) / 255;
  const b = (n & 0xff) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h, s, l };
}

function hslToHex(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (c) =>
    Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

// Ensure floor and wall colors are bright enough and have sufficient contrast
function enforceContrast(theme) {
  const MIN_FLOOR_L = 0.14;
  const MIN_WALL_L = 0.2;
  const MIN_CONTRAST = 0.08; // minimum lightness difference between wall and floor

  const floorHSL = hexToHSL(theme.floor);
  const wallHSL = hexToHSL(theme.wall);

  // Enforce minimum lightness
  floorHSL.l = Math.max(MIN_FLOOR_L, floorHSL.l);
  wallHSL.l = Math.max(MIN_WALL_L, wallHSL.l);

  // Enforce minimum contrast: wall should be noticeably lighter than floor
  if (wallHSL.l - floorHSL.l < MIN_CONTRAST) {
    wallHSL.l = floorHSL.l + MIN_CONTRAST;
  }

  return {
    ...theme,
    floor: hslToHex(floorHSL.h, floorHSL.s, floorHSL.l),
    wall: hslToHex(wallHSL.h, wallHSL.s, wallHSL.l),
  };
}

export function levelTheme(level) {
  const base = LEVEL_THEMES[level % LEVEL_THEMES.length];
  if (level < LEVEL_THEMES.length) return enforceContrast(base);

  // For higher levels, shift the base theme's colors to create unique variations
  const cycle = Math.floor(level / LEVEL_THEMES.length);
  const hueShift = (cycle * 47 + level * 13) % 360;

  const shiftColor = (hex) => {
    const c = new THREE.Color(hex);
    const hsl = {};
    c.getHSL(hsl);
    hsl.h = (hsl.h + hueShift / 360) % 1;
    hsl.s = Math.min(1, hsl.s * (0.8 + (cycle % 3) * 0.2));
    hsl.l = Math.min(0.7, Math.max(0.1, hsl.l + ((cycle % 2) * 0.08 - 0.04)));
    c.setHSL(hsl.h, hsl.s, hsl.l);
    return "#" + c.getHexString();
  };

  return enforceContrast({
    ...base,
    wall: shiftColor(base.wall),
    floor: shiftColor(base.floor),
    emissive: shiftColor(base.emissive),
    rough: Math.min(1, base.rough + ((cycle * 7) % 5) * 0.05 - 0.1),
    metal: Math.min(
      1,
      Math.max(0, base.metal + ((cycle * 3) % 4) * 0.1 - 0.15),
    ),
  });
}

// Seeded pseudo-random so textures are stable across renders
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function createWallTexture(theme) {
  const S = 512;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  const rand = seededRand(
    theme.wall.charCodeAt(1) * 997 + theme.wall.charCodeAt(3) * 31,
  );

  const base = new THREE.Color(theme.wall);
  const css = (r, g, b) => `rgb(${~~r},${~~g},${~~b})`;
  const tint = (f) => css(base.r * 255 * f, base.g * 255 * f, base.b * 255 * f);

  ctx.fillStyle = tint(1);
  ctx.fillRect(0, 0, S, S);

  if (theme.pattern === "brick") {
    const bw = 64,
      bh = 26,
      m = 4;
    for (let row = 0; row * bh < S + bh; row++) {
      const off = (row % 2) * (bw / 2);
      for (let col = -1; col * bw < S + bw; col++) {
        const x = col * bw + off,
          y = row * bh;
        const v = 0.78 + rand() * 0.3;
        ctx.fillStyle = tint(v);
        ctx.fillRect(x + m / 2, y + m / 2, bw - m, bh - m);
      }
    }
    // mortar shadow
    ctx.fillStyle = tint(0.55);
    for (let row = 0; row * bh < S + bh; row++) {
      const off = (row % 2) * (bw / 2);
      for (let col = -1; col * bw < S + bw; col++) {
        const x = col * bw + off,
          y = row * bh;
        ctx.fillRect(x + m / 2, y + bh - m, bw - m, m); // bottom line
        ctx.fillRect(x + bw - m, y + m / 2, m, bh - m); // right line
      }
    }
  } else if (theme.pattern === "stone" || theme.pattern === "mossy") {
    let y = 0;
    while (y < S) {
      const bh = 28 + ~~(rand() * 22);
      let x = 0;
      while (x < S) {
        const bw = 38 + ~~(rand() * 44);
        const v = 0.78 + rand() * 0.32;
        ctx.fillStyle = tint(v);
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        if (theme.pattern === "mossy" && rand() < 0.25) {
          ctx.fillStyle = `rgba(40,${~~(80 + rand() * 80)},40,0.45)`;
          ctx.fillRect(x + 4, y + 4, ~~(bw * 0.6), ~~(bh * 0.5));
        }
        x += bw;
      }
      y += bh;
    }
  } else if (theme.pattern === "metal") {
    const ps = 72;
    for (let py = 0; py * ps < S; py++) {
      for (let px = 0; px * ps < S; px++) {
        const x = px * ps,
          y = py * ps;
        const v = 0.85 + ((px + py) % 2) * 0.18;
        ctx.fillStyle = tint(v);
        ctx.fillRect(x + 3, y + 3, ps - 6, ps - 6);
        // beveled edge highlight
        ctx.fillStyle = tint(1.4);
        ctx.fillRect(x + 3, y + 3, ps - 6, 2);
        ctx.fillRect(x + 3, y + 3, 2, ps - 6);
        ctx.fillStyle = tint(0.5);
        ctx.fillRect(x + 3, y + ps - 5, ps - 6, 2);
        ctx.fillRect(x + ps - 5, y + 3, 2, ps - 6);
        // rivets
        ctx.fillStyle = tint(1.6);
        for (const [rx, ry] of [
          [x + 10, y + 10],
          [x + ps - 10, y + 10],
          [x + 10, y + ps - 10],
          [x + ps - 10, y + ps - 10],
        ]) {
          ctx.beginPath();
          ctx.arc(rx, ry, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = tint(0.6);
          ctx.beginPath();
          ctx.arc(rx + 1, ry + 1, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = tint(1.6);
        }
      }
    }
  } else if (theme.pattern === "crystal") {
    const step = 52;
    for (let i = -S; i < S * 2; i += step) {
      const v = 0.65 + (~~(i / step) % 2) * 0.45;
      ctx.fillStyle = tint(v);
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + S * 0.6, S);
      ctx.lineTo(i + S * 0.6 + step, S);
      ctx.lineTo(i + step, 0);
      ctx.closePath();
      ctx.fill();
    }
    // sparkle lines
    ctx.strokeStyle = tint(2.0);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    for (let i = -S; i < S * 2; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + S * 0.6, S);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (theme.pattern === "crack") {
    // Cracked volcanic rock — dark blocks with glowing fissures
    let y = 0;
    while (y < S) {
      const bh = 24 + ~~(rand() * 18);
      let x = 0;
      while (x < S) {
        const bw = 30 + ~~(rand() * 36);
        ctx.fillStyle = tint(0.7 + rand() * 0.25);
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        x += bw;
      }
      y += bh;
    }
    // glowing cracks
    ctx.strokeStyle = `rgba(255,${~~(80 + rand() * 80)},0,0.85)`;
    ctx.lineWidth = 1.5;
    for (let n = 0; n < 14; n++) {
      let cx = rand() * S,
        cy = rand() * S,
        a = rand() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 4; s++) {
        cx += Math.cos(a) * (14 + rand() * 16);
        cy += Math.sin(a) * (14 + rand() * 16);
        a += (rand() - 0.5) * 1.4;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  } else if (theme.pattern === "ice") {
    // Pale icy sheen
    ctx.fillStyle = tint(1.25);
    ctx.globalAlpha = 0.35;
    ctx.fillRect(0, 0, S, S);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = tint(1.7);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    for (let n = 0; n < 18; n++) {
      let cx = rand() * S,
        cy = rand() * S,
        a = rand() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let s = 0; s < 5; s++) {
        cx += Math.cos(a) * (12 + rand() * 20);
        cy += Math.sin(a) * (12 + rand() * 20);
        a += (rand() - 0.5) * 1.6;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // faint horizontal banding
    for (let row = 0; row < 6; row++) {
      ctx.fillStyle = tint(row % 2 === 0 ? 1.1 : 0.88);
      ctx.globalAlpha = 0.15;
      ctx.fillRect(0, row * (S / 6), S, S / 6);
    }
    ctx.globalAlpha = 1;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 1);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 16;
  return tex;
}
