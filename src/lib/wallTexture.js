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
    fog: "#3a3a52",
    fogDensity: 0.025,
  }, // 0: stone
  {
    wall: "#8a5a30",
    rough: 0.9,
    metal: 0.0,
    emissive: "#110500",
    floor: "#4a3020",
    pattern: "brick",
    fog: "#463422",
    fogDensity: 0.025,
  }, // 1: sandstone brick
  {
    wall: "#2a6a4a",
    rough: 0.8,
    metal: 0.0,
    emissive: "#001a0a",
    floor: "#3a5a48",
    pattern: "mossy",
    fog: "#22382c",
    fogDensity: 0.03,
  }, // 2: mossy dungeon
  {
    wall: "#7a3020",
    rough: 0.6,
    metal: 0.1,
    emissive: "#200500",
    floor: "#3a1808",
    pattern: "crack",
    fog: "#2a1208",
    fogDensity: 0.04,
  }, // 3: volcanic
  {
    wall: "#3a3a6a",
    rough: 0.3,
    metal: 0.7,
    emissive: "#000010",
    floor: "#2e2e48",
    pattern: "metal",
    fog: "#222238",
    fogDensity: 0.022,
  }, // 4: metal fortress
  {
    wall: "#5a3a7a",
    rough: 0.5,
    metal: 0.4,
    emissive: "#1a0a30",
    floor: "#5a4a6e",
    pattern: "crystal",
    fog: "#2a1e3e",
    fogDensity: 0.028,
  }, // 5: arcane crystal
  {
    wall: "#3a6a7a",
    rough: 0.3,
    metal: 0.3,
    emissive: "#001418",
    floor: "#263a42",
    pattern: "ice",
    fog: "#2c4450",
    fogDensity: 0.035,
  }, // 6: ice cave
  {
    wall: "#6a5a2a",
    rough: 0.9,
    metal: 0.0,
    emissive: "#100800",
    floor: "#3a3520",
    pattern: "brick",
    fog: "#33301e",
    fogDensity: 0.028,
  }, // 7: ancient ruins
  {
    wall: "#6b6358",
    rough: 0.95,
    metal: 0.0,
    emissive: "#000000",
    floor: "#403c36",
    pattern: "cobble",
    fog: "#363330",
    fogDensity: 0.03,
  }, // 8: cobblestone cavern
  {
    wall: "#7a5230",
    rough: 0.85,
    metal: 0.0,
    emissive: "#0a0400",
    floor: "#43301d",
    pattern: "wood",
    fog: "#352618",
    fogDensity: 0.03,
  }, // 9: timbered mine
  {
    wall: "#454a64",
    rough: 0.8,
    metal: 0.1,
    emissive: "#0a1638",
    floor: "#2a2d3c",
    pattern: "runes",
    fog: "#20242f",
    fogDensity: 0.03,
  }, // 10: runic sanctum
  {
    wall: "#3e5a5e",
    rough: 0.35,
    metal: 0.6,
    emissive: "#001014",
    floor: "#283a3c",
    pattern: "hex",
    fog: "#213032",
    fogDensity: 0.024,
  }, // 11: hex foundry
  {
    wall: "#a89e86",
    rough: 0.25,
    metal: 0.1,
    emissive: "#0a0805",
    floor: "#5e5847",
    pattern: "marble",
    fog: "#46412f",
    fogDensity: 0.022,
  }, // 12: marble temple
  {
    wall: "#3a6a8e",
    rough: 0.4,
    metal: 0.15,
    emissive: "#001018",
    floor: "#284a5e",
    pattern: "tile",
    fog: "#223f4d",
    fogDensity: 0.028,
  }, // 13: azure mosaic
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
  const MIN_FLOOR_L = 0.2;
  const MIN_WALL_L = 0.3;
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
    fog: shiftColor(base.fog),
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

// A zone occupies a region of the maze. Each zone gets a distinct-but-cohesive
// texture variant so the player can tell regions apart and orient themselves:
// brightness shifts north<->south, warmth/hue shifts east<->west, and the
// block layout (seed) differs so the masonry itself looks different per zone.
export function zoneVariant(zx, zz, zonesX, zonesZ) {
  const nx = zonesX > 1 ? zx / (zonesX - 1) : 0.5;
  const nz = zonesZ > 1 ? zz / (zonesZ - 1) : 0.5;
  return {
    hueShift: (nx - 0.5) * 0.12, // east-west hue drift (~±11°, keeps theme identity)
    lightMul: 1 + (nz - 0.5) * 0.5, // north-south brightness (0.75–1.25)
    satMul: 1 + (nx - 0.5) * 0.4, // east-west saturation
    seedSalt: (zx * 101 + zz * 263) | 0, // different masonry layout per zone
  };
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// Per-pattern bump strength for the derived normal map. Hard masonry should
// catch the light strongly; smooth surfaces (ice, crystal) only subtly.
const NORMAL_STRENGTH = {
  brick: 3.2,
  stone: 3.0,
  mossy: 2.6,
  crack: 3.0,
  metal: 2.2,
  crystal: 1.4,
  ice: 1.0,
  cobble: 3.4,
  wood: 2.0,
  runes: 2.6,
  hex: 2.4,
  marble: 0.8,
  tile: 2.2,
};

// Fine per-pixel grain — tiles seamlessly (pure noise) and feeds micro-detail
// into the normal map.
function addGrain(ctx, S, rand, amount) {
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < S * S; i++) {
    const n = (rand() - 0.5) * amount;
    d[i * 4] = clamp255(d[i * 4] + n);
    d[i * 4 + 1] = clamp255(d[i * 4 + 1] + n);
    d[i * 4 + 2] = clamp255(d[i * 4 + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

// Low-frequency weathering blotches. Drawn at toroidal offsets so they wrap
// across the tile seam and never show a hard repeat edge.
function addStains(ctx, S, rand) {
  for (let n = 0; n < 12; n++) {
    const x = rand() * S,
      y = rand() * S,
      r = 40 + rand() * 90,
      a = 0.07 + rand() * 0.11;
    for (const ox of [0, -S, S]) {
      for (const oy of [0, -S, S]) {
        const g = ctx.createRadialGradient(
          x + ox,
          y + oy,
          0,
          x + ox,
          y + oy,
          r,
        );
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }
}

function finalizeTex(canvas, anisotropy = 16) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = anisotropy;
  return tex;
}

// Downscale a canvas (used to build the derived maps at lower resolution —
// relief and roughness don't need full albedo res, and it cuts both the
// per-pixel generation cost and GPU texture bandwidth).
function downscale(src, size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  c.getContext("2d").drawImage(src, 0, 0, size, size);
  return c;
}

// Derive a tangent-space normal map from the albedo's luminance treated as a
// height field (brighter = raised). A 3x3 blur first so per-pixel grain becomes
// gentle micro-relief rather than noise. Sampling wraps for seamless tiling.
function buildNormalMap(srcCanvas, strength) {
  const S = srcCanvas.width;
  const data = srcCanvas.getContext("2d").getImageData(0, 0, S, S).data;
  const lum = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    lum[i] =
      (0.299 * data[i * 4] +
        0.587 * data[i * 4 + 1] +
        0.114 * data[i * 4 + 2]) /
      255;
  }
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += lum[((y + dy + S) % S) * S + ((x + dx + S) % S)];
        }
      }
      h[y * S + x] = sum / 9;
    }
  }
  const out = document.createElement("canvas");
  out.width = out.height = S;
  const octx = out.getContext("2d");
  const img = octx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const xm = (x - 1 + S) % S,
        xp = (x + 1) % S,
        ym = (y - 1 + S) % S,
        yp = (y + 1) % S;
      let nx = (h[y * S + xm] - h[y * S + xp]) * strength;
      let ny = (h[ym * S + x] - h[yp * S + x]) * strength;
      const len = Math.hypot(nx, ny, 1);
      const idx = (y * S + x) * 4;
      img.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[idx + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[idx + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return finalizeTex(out, 4);
}

// Bake surface roughness from luminance: recessed/dark mortar and cracks read
// rougher than the brighter, smoother block faces.
function buildRoughnessMap(srcCanvas, baseRough) {
  const S = srcCanvas.width;
  const data = srcCanvas.getContext("2d").getImageData(0, 0, S, S).data;
  const out = document.createElement("canvas");
  out.width = out.height = S;
  const octx = out.getContext("2d");
  const img = octx.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const lum =
      (0.299 * data[i * 4] +
        0.587 * data[i * 4 + 1] +
        0.114 * data[i * 4 + 2]) /
      255;
    const r = clamp255(baseRough * (1.15 - lum * 0.4) * 255);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = r;
    img.data[i * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return finalizeTex(out, 4);
}

// Generate the full PBR map set (albedo, normal, roughness) for a theme and an
// optional zone variant. Returns { map, normalMap, roughnessMap }.
export function createWallMaps(theme, variant = {}) {
  const { hueShift = 0, lightMul = 1, satMul = 1, seedSalt = 0 } = variant;
  const S = 512;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  const rand = seededRand(
    theme.wall.charCodeAt(1) * 997 +
      theme.wall.charCodeAt(3) * 31 +
      seedSalt * 5779,
  );

  const base = new THREE.Color(theme.wall);
  if (hueShift !== 0 || lightMul !== 1 || satMul !== 1) {
    const hsl = {};
    base.getHSL(hsl);
    hsl.h = (((hsl.h + hueShift) % 1) + 1) % 1;
    hsl.s = Math.min(1, Math.max(0, hsl.s * satMul));
    hsl.l = Math.min(0.9, Math.max(0.05, hsl.l * lightMul));
    base.setHSL(hsl.h, hsl.s, hsl.l);
  }
  const css = (r, g, b) => `rgb(${~~r},${~~g},${~~b})`;
  const tint = (f) => css(base.r * 255 * f, base.g * 255 * f, base.b * 255 * f);

  ctx.fillStyle = tint(1);
  ctx.fillRect(0, 0, S, S);

  if (theme.pattern === "brick") {
    const bw = 64,
      bh = 26,
      m = 4;
    // deep mortar recess behind everything
    ctx.fillStyle = tint(0.42);
    ctx.fillRect(0, 0, S, S);
    for (let row = 0; row * bh < S + bh; row++) {
      const off = (row % 2) * (bw / 2);
      for (let col = -1; col * bw < S + bw; col++) {
        const x = col * bw + off,
          y = row * bh;
        const v = 0.68 + rand() * 0.44; // wider tonal range per brick
        ctx.fillStyle = tint(v);
        ctx.fillRect(x + m / 2, y + m / 2, bw - m, bh - m);
        // lit top edge, shadowed bottom edge → reads as raised
        ctx.fillStyle = tint(v * 1.3);
        ctx.fillRect(x + m / 2, y + m / 2, bw - m, 2);
        ctx.fillStyle = tint(v * 0.55);
        ctx.fillRect(x + m / 2, y + bh - m - 2, bw - m, 2);
      }
    }
  } else if (theme.pattern === "stone" || theme.pattern === "mossy") {
    ctx.fillStyle = tint(0.4); // dark joints behind the blocks
    ctx.fillRect(0, 0, S, S);
    let y = 0;
    while (y < S) {
      const bh = 26 + ~~(rand() * 24);
      let x = 0;
      while (x < S) {
        const bw = 34 + ~~(rand() * 48);
        const v = 0.7 + rand() * 0.42;
        ctx.fillStyle = tint(v);
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        // beveled block: lit top-left, shadowed bottom-right
        ctx.fillStyle = tint(v * 1.32);
        ctx.fillRect(x + 2, y + 2, bw - 4, 2);
        ctx.fillRect(x + 2, y + 2, 2, bh - 4);
        ctx.fillStyle = tint(v * 0.55);
        ctx.fillRect(x + 2, y + bh - 4, bw - 4, 2);
        ctx.fillRect(x + bw - 4, y + 2, 2, bh - 4);
        if (theme.pattern === "mossy" && rand() < 0.3) {
          ctx.fillStyle = `rgba(40,${~~(80 + rand() * 90)},45,0.5)`;
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
  } else if (theme.pattern === "cobble") {
    // Rounded cobblestones bedded in dark mortar.
    ctx.fillStyle = tint(0.32);
    ctx.fillRect(0, 0, S, S);
    const cs = 44;
    for (let gy = -1; gy * cs < S + cs; gy++) {
      for (let gx = -1; gx * cs < S + cs; gx++) {
        const cx = gx * cs + cs / 2 + (gy % 2) * (cs / 2) + (rand() - 0.5) * 10;
        const cy = gy * cs + cs / 2 + (rand() - 0.5) * 10;
        const rx = cs * 0.42 + rand() * 6,
          ry = cs * 0.38 + rand() * 6;
        const v = 0.7 + rand() * 0.35;
        ctx.fillStyle = tint(v);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, (rand() - 0.5) * 0.7, 0, Math.PI * 2);
        ctx.fill();
        // lit crown, offset up-left
        ctx.fillStyle = tint(v * 1.32);
        ctx.beginPath();
        ctx.ellipse(
          cx - rx * 0.2,
          cy - ry * 0.3,
          rx * 0.5,
          ry * 0.4,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  } else if (theme.pattern === "wood") {
    // Vertical planks with grain streaks and knots.
    const pw = 72;
    for (let px = 0; px * pw < S; px++) {
      const x = px * pw;
      const v = 0.8 + rand() * 0.25;
      ctx.fillStyle = tint(v);
      ctx.fillRect(x, 0, pw, S);
      ctx.fillStyle = tint(0.45); // gap shadow
      ctx.fillRect(x, 0, 2, S);
      ctx.fillStyle = tint(v * 1.2); // lit edge of next plank
      ctx.fillRect(x + 2, 0, 2, S);
      ctx.strokeStyle = tint(v * 0.76);
      ctx.lineWidth = 1;
      for (let g = 0; g < 5; g++) {
        const gx = x + 8 + rand() * (pw - 16);
        ctx.beginPath();
        for (let yy = 0; yy <= S; yy += 14) {
          const wob =
            Math.sin(yy * 0.04 + g * 1.7) * 2.2 + (rand() - 0.5) * 1.5;
          yy === 0 ? ctx.moveTo(gx + wob, yy) : ctx.lineTo(gx + wob, yy);
        }
        ctx.stroke();
      }
      if (rand() < 0.5) {
        const ky = rand() * S,
          kx = x + pw * 0.5;
        ctx.strokeStyle = tint(v * 0.6);
        for (let r = 3; r < 11; r += 2) {
          ctx.beginPath();
          ctx.ellipse(kx, ky, r, r * 0.7, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  } else if (theme.pattern === "runes") {
    // Stone blocks carved with glowing runic glyphs.
    ctx.fillStyle = tint(0.42);
    ctx.fillRect(0, 0, S, S);
    const b = 70;
    for (let ry = 0; ry * b < S; ry++) {
      for (let rx = 0; rx * b < S; rx++) {
        const x = rx * b,
          y = ry * b,
          v = 0.7 + rand() * 0.22;
        ctx.fillStyle = tint(v);
        ctx.fillRect(x + 3, y + 3, b - 6, b - 6);
        ctx.fillStyle = tint(v * 1.25);
        ctx.fillRect(x + 3, y + 3, b - 6, 2);
      }
    }
    ctx.strokeStyle = `rgba(${~~(120 + rand() * 60)},${~~(170 + rand() * 70)},255,0.9)`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    for (let ry = 0; ry * b < S; ry++) {
      for (let rx = 0; rx * b < S; rx++) {
        if (rand() > 0.45) continue;
        const x = rx * b + b / 2,
          y = ry * b + b / 2,
          sc = b * 0.28;
        ctx.beginPath();
        ctx.moveTo(x, y - sc);
        ctx.lineTo(x, y + sc);
        const o1 = -sc + rand() * sc * 2;
        ctx.moveTo(x, y + o1);
        ctx.lineTo(x + (rand() < 0.5 ? sc : -sc), y + o1 + (rand() - 0.5) * sc);
        const o2 = -sc + rand() * sc * 2;
        ctx.moveTo(x, y + o2);
        ctx.lineTo(x + (rand() < 0.5 ? sc : -sc), y + o2);
        ctx.stroke();
      }
    }
    ctx.lineCap = "butt";
  } else if (theme.pattern === "hex") {
    // Beveled hexagonal tech panels.
    ctx.fillStyle = tint(0.4);
    ctx.fillRect(0, 0, S, S);
    const r = 34,
      hw = Math.sqrt(3) * r,
      vh = 1.5 * r;
    for (let row = -1; row * vh < S + r; row++) {
      for (let col = -1; col * hw < S + hw; col++) {
        const cx = col * hw + (row % 2) * (hw / 2),
          cy = row * vh;
        const v = 0.76 + ((row + col) % 2) * 0.12 + rand() * 0.06;
        const pts = [];
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 180) * (60 * k - 90);
          pts.push([cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2)]);
        }
        ctx.fillStyle = tint(v);
        ctx.beginPath();
        pts.forEach((p, k) =>
          k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]),
        );
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = tint(v * 1.45);
        ctx.beginPath();
        ctx.moveTo(pts[5][0], pts[5][1]);
        ctx.lineTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.stroke();
        ctx.strokeStyle = tint(v * 0.58);
        ctx.beginPath();
        ctx.moveTo(pts[2][0], pts[2][1]);
        ctx.lineTo(pts[3][0], pts[3][1]);
        ctx.lineTo(pts[4][0], pts[4][1]);
        ctx.stroke();
        ctx.fillStyle = tint(v * 1.5);
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (theme.pattern === "marble") {
    // Polished marble: soft tonal pools and meandering veins.
    ctx.fillStyle = tint(1.08);
    ctx.fillRect(0, 0, S, S);
    for (let n = 0; n < 6; n++) {
      const x = rand() * S,
        y = rand() * S,
        rr = 80 + rand() * 120;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, tint(1.18));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }
    for (let n = 0; n < 11; n++) {
      const dark = rand() < 0.6;
      ctx.strokeStyle = dark ? tint(0.55) : tint(1.35);
      ctx.lineWidth = dark ? 1.6 : 1;
      ctx.globalAlpha = 0.5;
      let x = rand() * S,
        y = rand() * S,
        a = rand() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 14; s++) {
        x += Math.cos(a) * 22;
        y += Math.sin(a) * 22;
        a += (rand() - 0.5) * 1.1;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (theme.pattern === "tile") {
    // Glazed mosaic tiles in a grout grid.
    const ts = 48,
      g = 4;
    ctx.fillStyle = tint(0.4);
    ctx.fillRect(0, 0, S, S);
    for (let ty = 0; ty * ts < S; ty++) {
      for (let tx = 0; tx * ts < S; tx++) {
        const x = tx * ts,
          y = ty * ts,
          v = 0.78 + rand() * 0.38;
        ctx.fillStyle = tint(v);
        ctx.fillRect(x + g / 2, y + g / 2, ts - g, ts - g);
        ctx.fillStyle = tint(v * 1.3); // glaze highlight
        ctx.fillRect(x + g / 2, y + g / 2, ts - g, 2);
        ctx.fillStyle = tint(v * 0.65);
        ctx.fillRect(x + g / 2, y + ts - g - 1, ts - g, 2);
      }
    }
  }

  // Shared weathering: low-frequency stains then fine grain. Both add the
  // surface irregularity that reads as "real" and feed the normal map.
  addStains(ctx, S, rand);
  addGrain(ctx, S, rand, 16);

  const map = finalizeTex(canvas);
  const strength = NORMAL_STRENGTH[theme.pattern] ?? 2.4;
  const half = downscale(canvas, S / 2); // derived maps at half res
  return {
    map,
    normalMap: buildNormalMap(half, strength),
    roughnessMap: buildRoughnessMap(half, theme.rough),
  };
}
