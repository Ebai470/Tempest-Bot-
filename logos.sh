set -e
cd "${1:-.}"
[ -d node_modules/jimp ] || { echo "❌ O pacote jimp nao esta instalado: rode  npm install jimp"; exit 1; }
[ -d src/commands/utilidades ] || { echo "❌ Rode dentro da pasta do bot"; exit 1; }
cat > src/services/logoEngine.js <<'__TP_EOF__'
'use strict';
const Jimp = require('jimp');
const W = 1024, H = 512, NPX = W * H;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rnd(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (a, b) => { let n = (a * 374761393 + b * 668265263 + s * 982451653) | 0; n = Math.imul(n ^ (n >> 13), 1274126177); return ((n ^ (n >> 16)) >>> 0) / 4294967295; };
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}
const fbm = (x, y, s) => (0.5 * vnoise(x, y, s) + 0.25 * vnoise(x * 2, y * 2, s + 1) + 0.125 * vnoise(x * 4, y * 4, s + 2) + 0.0625 * vnoise(x * 8, y * 8, s + 3)) / 0.9375;
function hsv(h, s, v) {
  h = ((h % 360) + 360) % 360; const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c; let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// ---------- mascara do texto ----------
let font = null;
function cleanText(s) {
  let t = String(s || '').normalize('NFKD').normalize('NFC');
  t = Array.from(t).filter((c) => { const k = c.codePointAt(0); return k >= 32 && k <= 0x24F; }).join('').replace(/\s+/g, ' ').trim();
  return t.slice(0, 22);
}
async function textMask(text) {
  if (!font) font = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
  const w = Jimp.measureText(font, text) + 16, h = Jimp.measureTextHeight(font, text, w + 60) + 16;
  let im = new Jimp(w, h, 0x00000000); im.print(font, 8, 8, text);
  const f = Math.min(W * 0.84 / w, H * 0.5 / h, 2.2);
  im = im.resize(Math.max(2, Math.round(w * f)), Math.max(2, Math.round(h * f)), Jimp.RESIZE_BILINEAR);
  const a = new Float32Array(NPX), ox = Math.round((W - im.bitmap.width) / 2), oy = Math.round((H - im.bitmap.height) / 2);
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < im.bitmap.height; y++) for (let x = 0; x < im.bitmap.width; x++) {
    const v = im.bitmap.data[(y * im.bitmap.width + x) * 4 + 3] / 255, X = x + ox, Y = y + oy;
    if (X < 0 || X >= W || Y < 0 || Y >= H) continue;
    a[Y * W + X] = v;
  }
  const sm = blur(a, 1.2); for (let i = 0; i < NPX; i++) { const v = smooth(0.3, 0.7, sm[i]); a[i] = v; if (v > 0.5) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  if (x1 <= x0) { x0 = W * 0.2; x1 = W * 0.8; y0 = H * 0.3; y1 = H * 0.7; }
  return { a: a, bx: { x0: x0, x1: x1, y0: y0, y1: y1 } };
}

// ---------- operacoes em mascaras ----------
function boxPass(src, r, horiz) {
  const out = new Float32Array(NPX), n = horiz ? W : H, m = horiz ? H : W, win = 2 * r + 1;
  for (let k = 0; k < m; k++) {
    let sum = 0; const idx = (i) => (horiz ? k * W + i : i * W + k);
    for (let i = -r; i <= r; i++) sum += src[idx(clamp(i, 0, n - 1))];
    for (let i = 0; i < n; i++) { out[idx(i)] = sum / win; sum += src[idx(clamp(i + r + 1, 0, n - 1))] - src[idx(clamp(i - r, 0, n - 1))]; }
  }
  return out;
}
function blur(a, rad) { rad = Math.max(1, Math.round(rad / 2)); let o = a; for (let i = 0; i < 2; i++) o = boxPass(boxPass(o, rad, true), rad, false); return o; }
function dilate(a, r) {
  const pass = (src, horiz) => { const out = new Float32Array(NPX), n = horiz ? W : H, m = horiz ? H : W;
    for (let k = 0; k < m; k++) for (let i = 0; i < n; i++) { let mx = 0; for (let j = -r; j <= r; j++) { const q = i + j; if (q < 0 || q >= n) continue; const v = src[horiz ? k * W + q : q * W + k]; if (v > mx) mx = v; } out[horiz ? k * W + i : i * W + k] = mx; }
    return out; };
  return pass(pass(a, true), false);
}
function shift(a, dx, dy) { dx = Math.round(dx); dy = Math.round(dy); const o = new Float32Array(NPX); for (let y = 0; y < H; y++) { const sy = y - dy; if (sy < 0 || sy >= H) continue; for (let x = 0; x < W; x++) { const sx = x - dx; if (sx < 0 || sx >= W) continue; o[y * W + x] = a[sy * W + sx]; } } return o; }
function sub(a, b) { const o = new Float32Array(NPX); for (let i = 0; i < NPX; i++) o[i] = Math.max(0, a[i] - b[i]); return o; }
function pixelate(a, s) { const o = new Float32Array(NPX); for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) { const v = a[Math.min(H - 1, y + (s >> 1)) * W + Math.min(W - 1, x + (s >> 1))] > 0.5 ? 1 : 0; for (let j = 0; j < s && y + j < H; j++) for (let i = 0; i < s && x + i < W; i++) o[(y + j) * W + x + i] = v; } return o; }

// ---------- tela ----------
class Cv {
  constructor() { this.d = new Float32Array(NPX * 3); }
  fill(fn) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = fn(x, y), i = (y * W + x) * 3; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; } }
  paint(m, col, k, mode) {
    const fn = typeof col === 'function'; k = k === undefined ? 1 : k;
    for (let i = 0; i < NPX; i++) {
      const a = m[i] * k; if (a <= 0.003) continue;
      const c = fn ? col(i % W, (i / W) | 0) : col, j = i * 3;
      if (mode === 'add') { this.d[j] += c[0] * a; this.d[j + 1] += c[1] * a; this.d[j + 2] += c[2] * a; }
      else if (mode === 'screen') { for (let q = 0; q < 3; q++) this.d[j + q] = 255 - (255 - this.d[j + q]) * (255 - c[q] * a) / 255; }
      else { const aa = Math.min(1, a); this.d[j] += (c[0] - this.d[j]) * aa; this.d[j + 1] += (c[1] - this.d[j + 1]) * aa; this.d[j + 2] += (c[2] - this.d[j + 2]) * aa; }
    }
  }
  toRGBA() { const o = Buffer.alloc(NPX * 4); for (let i = 0; i < NPX; i++) { o[i * 4] = clamp(this.d[i * 3], 0, 255); o[i * 4 + 1] = clamp(this.d[i * 3 + 1], 0, 255); o[i * 4 + 2] = clamp(this.d[i * 3 + 2], 0, 255); o[i * 4 + 3] = 255; } return o; }
}
const vgrad = (stops) => (x, y) => { const t = y / H; for (let i = 0; i < stops.length - 1; i++) { if (t <= stops[i + 1][0]) return mixc(stops[i][1], stops[i + 1][1], (t - stops[i][0]) / Math.max(1e-6, stops[i + 1][0] - stops[i][0])); } return stops[stops.length - 1][1]; };
const radial = (c0, c1) => (x, y) => mixc(c0, c1, clamp(Math.hypot(x - W / 2, y - H / 2) / (W * 0.62), 0, 1));
const faceV = (bx, stops) => (x, y) => { const t = clamp((y - bx.y0) / Math.max(1, bx.y1 - bx.y0), 0, 1); for (let i = 0; i < stops.length - 1; i++) if (t <= stops[i + 1][0]) return mixc(stops[i][1], stops[i + 1][1], (t - stops[i][0]) / Math.max(1e-6, stops[i + 1][0] - stops[i][0])); return stops[stops.length - 1][1]; };
function stars(cv, n, seed, bright) { const R = rnd(seed); for (let i = 0; i < n; i++) { const x = Math.floor(R() * W), y = Math.floor(R() * H), s = R() < 0.1 ? 2 : 1, b = (bright || 1) * (0.4 + R() * 0.6); for (let j = 0; j < s; j++) for (let k = 0; k < s; k++) { const p = ((y + j) * W + x + k) * 3; if (p + 2 < cv.d.length) { cv.d[p] += 255 * b; cv.d[p + 1] += 255 * b; cv.d[p + 2] += 255 * b; } } } }
function circle(cx, cy, r, soft) { const m = new Float32Array(NPX); for (let y = Math.max(0, Math.floor(cy - r - 2)); y < Math.min(H, cy + r + 2); y++) for (let x = Math.max(0, Math.floor(cx - r - 2)); x < Math.min(W, cx + r + 2); x++) { const d = Math.hypot(x - cx, y - cy); m[y * W + x] = clamp((r - d) / (soft || 1.5) + 0.5, 0, 1); } return m; }

// ---------- estilos ----------
const S = {};
S.neon = (cv, M, p) => {
  cv.fill(p.bg || radial([14, 10, 30], [2, 2, 8]));
  if (p.extra) p.extra(cv, M);
  const col = p.rainbow ? (x) => hsv((x - M.bx.x0) / Math.max(1, M.bx.x1 - M.bx.x0) * 300, 0.85, 1) : p.color;
  cv.paint(blur(M.a, 40), col, 0.9, 'add'); cv.paint(blur(M.a, 14), col, 1.1, 'add');
  const ring = sub(dilate(M.a, 3), M.a);
  if (p.tube) { cv.paint(ring, col, 1, 'over'); cv.paint(sub(dilate(M.a, 1), M.a), [255, 255, 255], 0.9, 'over'); cv.paint(M.a, [8, 8, 14], 0.9, 'over'); }
  else { cv.paint(ring, col, 0.95, 'over'); cv.paint(M.a, typeof col === 'function' ? (x, y) => mixc(col(x, y), [255, 255, 255], 0.8) : mixc(p.color, [255, 255, 255], 0.82), 1, 'over'); }
  if (p.glitch) { cv.paint(shift(M.a, -7, 0), [255, 30, 80], 0.5, 'add'); cv.paint(shift(M.a, 7, 0), [0, 220, 255], 0.5, 'add'); }
};
S.extrude = (cv, M, p) => {
  cv.fill(p.bg || radial([60, 60, 70], [10, 10, 14]));
  if (p.extra) p.extra(cv, M);
  if (p.glow) cv.paint(blur(M.a, 36), p.glow, 0.6, 'add');
  const d = p.depth || 14;
  cv.paint(blur(shift(M.a, d * 0.9, d * 1.2), 12), [0, 0, 0], 0.5, 'over');
  for (let k = d; k >= 1; k--) cv.paint(shift(M.a, k * 0.75, k * 0.75), mixc(p.side[0], p.side[1], k / d), 1, 'over');
  if (p.outline) cv.paint(sub(dilate(M.a, 3), M.a), p.outline, 1, 'over');
  cv.paint(M.a, p.face(M), 1, 'over');
  cv.paint(sub(M.a, shift(M.a, 3, 3)), [255, 255, 255], 0.55, 'add');
  cv.paint(sub(M.a, shift(M.a, -3, -3)), [0, 0, 0], 0.3, 'over');
  if (p.sparkle) stars(cv, 90, 7, 0.9);
};
S.glitch = (cv, M, p) => {
  cv.fill(p.bg || vgrad([[0, [10, 10, 18]], [1, [2, 2, 8]]]));
  const a = p.pixel ? pixelate(M.a, 8) : M.a, sh = p.shift || 10;
  cv.paint(shift(a, -sh, 0), [255, 30, 70], 0.95, 'add'); cv.paint(shift(a, sh, 0), [0, 230, 255], 0.95, 'add'); cv.paint(a, [255, 255, 255], 1, 'over');
  const R = rnd(p.seed || 5);
  for (let b = 0; b < 12; b++) { const y0 = Math.floor(M.bx.y0 + R() * (M.bx.y1 - M.bx.y0)), hh = 4 + Math.floor(R() * 18), dx = Math.floor((R() - 0.5) * 70);
    for (let y = y0; y < Math.min(H, y0 + hh); y++) { const row = new Float32Array(W * 3); for (let x = 0; x < W; x++) { const sx = clamp(x - dx, 0, W - 1); row[x * 3] = cv.d[(y * W + sx) * 3]; row[x * 3 + 1] = cv.d[(y * W + sx) * 3 + 1]; row[x * 3 + 2] = cv.d[(y * W + sx) * 3 + 2]; } cv.d.set(row, y * W * 3); } }
  for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; cv.d[i] *= 0.82; cv.d[i + 1] *= 0.82; cv.d[i + 2] *= 0.82; }
  if (p.strike) { const yy = Math.round((M.bx.y0 + M.bx.y1) / 2); const bar = new Float32Array(NPX); for (let y = yy - 5; y < yy + 5; y++) for (let x = M.bx.x0 - 20; x < M.bx.x1 + 20; x++) bar[y * W + x] = 1; cv.paint(bar, [255, 40, 60], 0.95, 'over'); }
};
S.drip = (cv, M, p) => {
  cv.fill(p.bg || radial([40, 6, 8], [4, 0, 2]));
  if (p.fog) cv.paint(new Float32Array(NPX).map((_, i) => fbm((i % W) / 130, ((i / W) | 0) / 110, 3) * 0.45), [160, 170, 180], 1, 'add');
  if (p.extra) p.extra(cv, M);
  cv.paint(blur(M.a, 36), p.glow || [200, 0, 10], 0.55, 'add');
  const R = rnd(11), dm = new Float32Array(NPX);
  for (let x = Math.round(M.bx.x0); x < M.bx.x1; x += 4) {
    let low = -1; for (let y = Math.round(M.bx.y1) + 4; y > M.bx.y0; y--) if (M.a[y * W + x] > 0.5) { low = y; break; }
    if (low < 0 || R() > 0.32) continue;
    const len = 14 + R() * 90, rad = 2.2 + R() * 3.4, cx = x + R() * 2;
    for (let y = low - 3; y < Math.min(H - 1, low + len); y++) for (let xx = Math.floor(cx - rad - 1); xx <= cx + rad + 1; xx++) { const dd = Math.abs(xx - cx); if (dd <= rad) dm[y * W + xx] = Math.max(dm[y * W + xx], 1 - smooth(rad - 1, rad, dd)); }
    const ball = circle(cx, low + len, rad * 1.5, 1.2); for (let i = 0; i < NPX; i++) if (ball[i] > dm[i]) dm[i] = ball[i];
  }
  const all = new Float32Array(NPX); for (let i = 0; i < NPX; i++) all[i] = Math.max(M.a[i], dm[i]);
  cv.paint(blur(shift(all, 4, 6), 10), [0, 0, 0], 0.6, 'over');
  cv.paint(all, faceV({ y0: M.bx.y0, y1: M.bx.y1 + 90 }, [[0, p.c1 || [220, 10, 20]], [0.6, p.c2 || [120, 0, 8]], [1, [60, 0, 4]]]), 1, 'over');
  cv.paint(sub(all, shift(all, 3, 4)), [255, 160, 150], 0.55, 'add');
};
S.galaxy = (cv, M, p) => {
  const big = p.scale || 1;
  cv.fill((x, y) => { const n1 = fbm(x / (230 * big), y / (200 * big), p.seed || 1), n2 = fbm(x / (160 * big) + 9, y / (140 * big), (p.seed || 1) + 7);
    let c = [5, 4, 16]; c = mixc(c, p.n1 || [90, 30, 150], smooth(0.45, 0.85, n1)); c = mixc(c, p.n2 || [20, 90, 190], smooth(0.5, 0.9, n2) * 0.8); return c; });
  stars(cv, 520, 3, 1);
  cv.paint(blur(M.a, 34), [120, 80, 255], 0.8, 'add');
  cv.paint(M.a, faceV(M.bx, [[0, [120, 240, 255]], [0.5, [190, 140, 255]], [1, [255, 110, 200]]]), 1, 'over');
  cv.paint(sub(M.a, shift(M.a, 3, 3)), [255, 255, 255], 0.6, 'add'); cv.paint(sub(dilate(M.a, 2), M.a), [255, 255, 255], 0.7, 'add');
};
S.flat = (cv, M, p) => { // texto com gradiente, contorno e sombra
  cv.fill(p.bg);
  if (p.extra) p.extra(cv, M);
  if (p.glow) cv.paint(blur(M.a, p.glowR || 30), p.glow, p.glowK || 0.7, 'add');
  if (p.shadow !== false) cv.paint(blur(shift(M.a, 7, 9), 9), p.shadow || [0, 0, 0], 0.55, 'over');
  if (p.outline2) cv.paint(dilate(M.a, p.outline2[1]), p.outline2[0], 1, 'over');
  if (p.outline) cv.paint(dilate(M.a, p.outlineR || 4), p.outline, 1, 'over');
  cv.paint(M.a, p.face(M), 1, 'over');
  if (p.shine) cv.paint(sub(M.a, shift(M.a, 3, 4)), [255, 255, 255], 0.5, 'add');
  if (p.after) p.after(cv, M);
};

const bgSky = vgrad([[0, [40, 120, 220]], [1, [170, 215, 255]]]);
function cloudsBg(cv, k) { cv.fill(bgSky); const n = new Float32Array(NPX); for (let i = 0; i < NPX; i++) n[i] = smooth(0.5, 0.82, fbm((i % W) / 160, ((i / W) | 0) / 90, 21)) * (k || 0.9); cv.paint(n, [255, 255, 255], 1, 'over'); }
const waterBg = (x, y) => { const t = y / H; let c = mixc([10, 90, 150], [2, 25, 70], t); const cau = Math.sin(x / 38 + Math.sin(y / 21) * 2) * Math.sin(y / 27 + x / 90); return mixc(c, [90, 200, 230], clamp(cau * 0.25 + 0.08, 0, 0.3)); };
const sandBg = (x, y) => mixc([218, 188, 130], [190, 150, 95], fbm(x / 18, y / 18, 4));
const paperBg = (x, y) => mixc([250, 244, 228], [232, 222, 198], fbm(x / 40, y / 40, 8) * 0.8);
const GOLD = [[0, [255, 240, 170]], [0.35, [240, 190, 60]], [0.55, [150, 95, 15]], [0.75, [250, 205, 80]], [1, [170, 110, 25]]];
const CHROME = [[0, [245, 248, 255]], [0.4, [120, 130, 150]], [0.52, [30, 34, 44]], [0.62, [180, 190, 210]], [1, [240, 245, 255]]];
const RUBY = [[0, [255, 150, 160]], [0.35, [235, 20, 50]], [0.7, [140, 0, 20]], [1, [220, 30, 60]]];
const PURPLE_GOLD = GOLD;

// definicao de cada logo -> (estilo, parametros)
const L = {
  '1917': (cv, M) => S.flat(cv, M, { bg: (x, y) => { const v = 1 - 0.55 * Math.pow(Math.hypot(x - W / 2, y - H / 2) / (W * 0.6), 2); return mixc([60, 42, 25], mixc([225, 205, 160], [190, 165, 120], fbm(x / 22, y / 22, 6)), clamp(v, 0, 1)); }, face: (M2) => (x, y) => mixc([60, 30, 15], [120, 70, 35], fbm(x / 8, y / 8, 9)), shadow: [60, 40, 20] }),
  '3druby': (cv, M) => S.extrude(cv, M, { bg: radial([70, 8, 20], [6, 0, 4]), face: (m) => faceV(m.bx, RUBY), side: [[60, 0, 12], [150, 10, 30]], depth: 18, glow: [255, 30, 70], sparkle: true }),
  advancedglow: (cv, M) => S.neon(cv, M, { color: [90, 160, 255], bg: radial([20, 12, 60], [3, 2, 14]) }),
  blackpinklogo: (cv, M) => S.neon(cv, M, { color: [255, 50, 150], bg: (x, y) => ((x + y) % 90 < 28 ? [30, 8, 22] : [6, 4, 8]) }),
  blood: (cv, M) => S.drip(cv, M, {}),
  cartoon: (cv, M) => S.flat(cv, M, { bg: vgrad([[0, [120, 200, 255]], [1, [255, 240, 190]]]), outline2: [[0, 0, 0], 11], outline: [255, 255, 255], outlineR: 6, face: (m) => faceV(m.bx, [[0, [255, 240, 60]], [1, [255, 140, 20]]]), shine: true }),
  cemetery: (cv, M) => S.flat(cv, M, { bg: (x, y) => { let c = mixc([10, 14, 30], [30, 38, 60], y / H); const m = Math.hypot(x - 820, y - 110); c = mixc(c, [230, 235, 255], smooth(52, 46, m)); c = mixc(c, [60, 70, 100], smooth(110, 40, m) * 0.25); return mixc(c, [150, 160, 180], smooth(0.5, 0.9, fbm(x / 120, y / 60, 13)) * 0.35 * (y / H)); }, glow: [120, 150, 220], face: (m) => faceV(m.bx, [[0, [225, 230, 240]], [1, [120, 130, 150]]]), shine: true }),
  clouds: (cv, M) => S.flat(cv, M, { bg: bgSky, extra: (c) => cloudsBg(c), face: () => [255, 255, 255], shadow: [20, 60, 130], glow: [255, 255, 255], glowR: 20, glowK: 0.5 }),
  darkgreen: (cv, M) => S.neon(cv, M, { color: [30, 255, 100], bg: () => [0, 6, 2], extra: (c) => { const R = rnd(4); for (let i = 0; i < 70; i++) { const x = Math.floor(R() * W), y0 = Math.floor(R() * H), len = 60 + R() * 220; for (let y = y0; y < Math.min(H, y0 + len); y++) { const p = (y * W + x) * 3; c.d[p + 1] += 90 * (1 - (y - y0) / len); } } } }),
  deleting: (cv, M) => S.glitch(cv, M, { strike: true, seed: 9 }),
  dragonball: (cv, M) => S.extrude(cv, M, { bg: (x, y) => { const a = Math.atan2(y - H / 2, x - W / 2); return mixc([255, 150, 20], [255, 225, 90], 0.5 + 0.5 * Math.sin(a * 14)); }, face: (m) => faceV(m.bx, [[0, [255, 240, 120]], [1, [255, 130, 10]]]), side: [[120, 40, 0], [220, 90, 0]], outline: [30, 10, 0], depth: 12 }),
  effectclouds: (cv, M) => S.flat(cv, M, { bg: bgSky, extra: (c) => cloudsBg(c, 0.6), face: (m) => (x, y) => mixc([255, 255, 255], [190, 215, 245], fbm(x / 26, y / 20, 17)), shadow: [20, 60, 130], glow: [255, 255, 255], glowR: 26, glowK: 0.6 }),
  flag: (cv, M) => S.flat(cv, M, { bg: flagBg, face: () => [255, 255, 255], outline: [10, 40, 20], outlineR: 5, shine: false }),
  flag3d: (cv, M) => { S.flat(cv, M, { bg: flagBg, face: () => [255, 255, 255], outline: [10, 40, 20], outlineR: 5 }); wave(cv); },
  freecreate: (cv, M) => S.flat(cv, M, { bg: radial([50, 30, 90], [8, 6, 24]), face: (m) => faceV(m.bx, [[0, [255, 120, 200]], [1, [255, 190, 70]]]), outline: [255, 255, 255], outlineR: 3, glow: [255, 120, 200], shine: true }),
  frozen: (cv, M) => S.extrude(cv, M, { bg: vgrad([[0, [10, 40, 90]], [1, [90, 170, 230]]]), face: (m) => faceV(m.bx, [[0, [255, 255, 255]], [0.5, [170, 225, 255]], [1, [90, 170, 235]]]), side: [[40, 100, 170], [120, 190, 240]], depth: 10, glow: [120, 220, 255], sparkle: true }),
  galaxy: (cv, M) => S.galaxy(cv, M, { seed: 2 }),
  galaxywallpaper: (cv, M) => S.galaxy(cv, M, { seed: 8, scale: 2, n1: [150, 40, 120], n2: [30, 120, 200] }),
  glitch: (cv, M) => S.glitch(cv, M, { seed: 3 }),
  glowing: (cv, M) => S.neon(cv, M, { color: [255, 210, 60], bg: radial([36, 22, 6], [4, 2, 0]) }),
  gradient: (cv, M) => S.flat(cv, M, { bg: vgrad([[0, [20, 20, 60]], [1, [60, 20, 90]]]), face: (m) => (x, y) => hsv(200 + (x - m.bx.x0) / Math.max(1, m.bx.x1 - m.bx.x0) * 160, 0.75, 1), shine: true }),
  halloween: (cv, M) => S.extrude(cv, M, { bg: (x, y) => { let c = mixc([40, 10, 60], [5, 0, 12], y / H); return mixc(c, [255, 190, 90], smooth(120, 80, Math.hypot(x - 820, y - 120)) * 0.9); }, face: (m) => faceV(m.bx, [[0, [255, 200, 60]], [1, [255, 100, 0]]]), side: [[70, 25, 0], [190, 70, 0]], depth: 14, glow: [255, 120, 0] }),
  horror: (cv, M) => S.drip(cv, M, { fog: true, bg: radial([22, 22, 26], [0, 0, 0]), glow: [140, 0, 0], c1: [190, 10, 10], c2: [90, 0, 0] }),
  joker: (cv, M) => S.flat(cv, M, { bg: (x, y) => { const dot = (Math.sin(x / 7) * Math.sin(y / 7) > 0.55); return mixc([70, 20, 120], [24, 6, 48], y / H).map((v, i) => v + (dot ? [30, 40, 20][i] : 0)); }, face: (m) => faceV(m.bx, [[0, [190, 255, 60]], [1, [60, 200, 30]]]), outline: [60, 10, 100], outlineR: 6, glow: [140, 255, 60], shine: true }),
  ligatures: (cv, M) => S.flat(cv, M, { bg: paperBg, face: () => [40, 28, 24], shadow: [120, 100, 80], after: (c, m) => { const yy = Math.round(m.bx.y1 + 28), ln = new Float32Array(NPX); for (let x = m.bx.x0; x < m.bx.x1; x++) { const t = (x - m.bx.x0) / (m.bx.x1 - m.bx.x0), th = 2.5 * Math.sin(Math.PI * t); for (let y = Math.floor(yy - th); y <= yy + th; y++) ln[y * W + x] = 1; } c.paint(ln, [140, 30, 40], 0.9, 'over'); } }),
  lighteffects: (cv, M) => S.neon(cv, M, { color: [255, 240, 200], bg: () => [3, 3, 8], extra: (c) => { const R = rnd(21); const ray = new Float32Array(NPX); for (let i = 0; i < NPX; i++) { const x = i % W - W / 2, y = ((i / W) | 0) - H / 2; const a = Math.atan2(y, x); ray[i] = Math.pow(Math.max(0, Math.sin(a * 11 + 1) * 0.5 + 0.5), 6) * Math.max(0, 1 - Math.hypot(x, y) / 560) * 0.5; } c.paint(ray, [255, 230, 170], 1, 'add'); } }),
  logomaker: (cv, M) => S.flat(cv, M, { bg: radial([40, 90, 160], [8, 20, 50]), face: (m) => faceV(m.bx, [[0, [255, 255, 255]], [1, [150, 210, 255]]]), outline: [10, 30, 70], outlineR: 5, glow: [120, 200, 255], shine: true }),
  luxurygold: (cv, M) => S.extrude(cv, M, { bg: radial([22, 18, 12], [0, 0, 0]), face: (m) => faceV(m.bx, GOLD), side: [[70, 45, 5], [190, 130, 30]], depth: 14, glow: [255, 190, 60], sparkle: true }),
  makingneon: (cv, M) => S.neon(cv, M, { color: [255, 70, 190], tube: true, bg: (x, y) => mixc([28, 24, 36], [16, 14, 22], fbm(x / 20, y / 20, 3)) }),
  metal3d: (cv, M) => S.extrude(cv, M, { bg: radial([70, 74, 84], [12, 13, 18]), face: (m) => faceV(m.bx, CHROME), side: [[30, 32, 40], [120, 126, 140]], depth: 16 }),
  multicoloredneon: (cv, M) => S.neon(cv, M, { rainbow: true, bg: radial([14, 8, 28], [2, 2, 8]) }),
  neondevil: (cv, M) => S.neon(cv, M, { color: [255, 30, 40], bg: radial([34, 4, 8], [2, 0, 2]) }),
  neonglitch: (cv, M) => S.neon(cv, M, { color: [60, 255, 220], glitch: true, bg: radial([8, 20, 28], [2, 4, 8]) }),
  papercut: (cv, M) => { cv.fill(vgrad([[0, [240, 240, 245]], [1, [200, 205, 215]]])); const cols = [[240, 90, 110], [250, 170, 70], [90, 190, 150], [70, 130, 230]]; const rs = [18, 12, 6, 0]; rs.forEach((r, i) => { const m = r ? dilate(M.a, r) : M.a; cv.paint(blur(shift(m, 3, 5), 7), [0, 0, 0], 0.35, 'over'); cv.paint(m, cols[i], 1, 'over'); }); },
  pixelglitch: (cv, M) => S.glitch(cv, M, { pixel: true, seed: 12, shift: 12 }),
  royal: (cv, M) => S.extrude(cv, M, { bg: radial([70, 20, 120], [10, 2, 28]), face: (m) => faceV(m.bx, PURPLE_GOLD), side: [[60, 40, 5], [180, 125, 30]], depth: 13, glow: [200, 120, 255], sparkle: true }),
  sandsummer: (cv, M) => S.flat(cv, M, { bg: sandBg, shadow: false, face: () => [150, 112, 66], after: (c, m) => { c.paint(sub(shift(m.a, 3, 3), m.a), [255, 245, 215], 0.8, 'over'); c.paint(sub(shift(m.a, -3, -3), m.a), [90, 62, 30], 0.5, 'over'); } }),
  summerbeach: (cv, M) => S.flat(cv, M, { bg: (x, y) => { const t = y / H; if (t < 0.52) return mixc([40, 150, 235], [170, 225, 255], t / 0.52); if (t < 0.72) return mixc([20, 190, 200], [60, 215, 210], (t - 0.52) / 0.2); return sandBg(x, y); }, face: () => [255, 255, 255], outline: [20, 110, 150], outlineR: 5, shadow: [60, 40, 10] }),
  sunset: (cv, M) => S.flat(cv, M, { bg: (x, y) => { let c = vgrad([[0, [60, 20, 110]], [0.45, [240, 90, 90]], [0.75, [255, 190, 90]], [1, [30, 10, 40]]])(x, y); const d = Math.hypot(x - W / 2, y - 300); return mixc(c, [255, 245, 190], smooth(130, 110, d)); }, face: () => [25, 8, 36], glow: [255, 140, 70], glowR: 40, glowK: 0.5, shadow: false }),
  typography: (cv, M) => S.flat(cv, M, { bg: (x, y) => ((x * 0.5 + y) % 26 < 2 ? [34, 34, 38] : [14, 14, 16]), face: () => [255, 255, 255], shadow: false, after: (c, m) => { c.paint(shift(m.a, 7, 7), [230, 40, 60], 0.9, 'over'); c.paint(m.a, [255, 255, 255], 1, 'over'); } }),
  underwater: (cv, M) => S.flat(cv, M, { bg: waterBg, extra: (c) => { const R = rnd(31); for (let i = 0; i < 26; i++) c.paint(circle(R() * W, R() * H, 6 + R() * 22, 2), [170, 235, 255], 0.14, 'add'); }, face: (m) => faceV(m.bx, [[0, [220, 255, 255]], [1, [90, 200, 230]]]), glow: [60, 190, 255], shine: true }),
  watercolor: (cv, M) => S.flat(cv, M, { bg: paperBg, shadow: false, face: (m) => (x, y) => { const n = fbm(x / 70, y / 50, 14); return n < 0.4 ? mixc([240, 90, 130], [250, 160, 70], n / 0.4) : n < 0.65 ? mixc([250, 160, 70], [90, 170, 220], (n - 0.4) / 0.25) : mixc([90, 170, 220], [150, 90, 200], (n - 0.65) / 0.35); }, after: (c, m) => { const R = rnd(14); for (let i = 0; i < 14; i++) c.paint(circle(R() * W, R() * H, 20 + R() * 60, 12), hsv(R() * 360, 0.5, 1), 0.12, 'over'); } }),
  wooden3d: (cv, M) => S.extrude(cv, M, { bg: (x, y) => mixc([120, 78, 40], [70, 42, 20], fbm(x / 160, y / 14, 15)), face: () => (x, y) => mixc([210, 150, 85], [150, 95, 45], fbm(x / 120, y / 10, 16)), side: [[70, 40, 15], [140, 90, 45]], depth: 15 }),
  write: (cv, M) => S.flat(cv, M, { bg: (x, y) => (y % 46 < 2 ? [150, 185, 235] : (x > 70 && x < 74 ? [230, 120, 120] : paperBg(x, y))), shadow: [150, 150, 170], face: () => [20, 40, 140] })
};
function flagBg(x, y) {
  const inD = Math.abs(x - W / 2) / 420 + Math.abs(y - H / 2) / 210 < 1, d = Math.hypot(x - W / 2, y - H / 2);
  if (d < 130) return mixc([0, 40, 130], [0, 70, 170], y / H);
  return inD ? [250, 215, 20] : [0, 140, 60];
}
function wave(cv) {
  const src = Float32Array.from(cv.d);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sy = clamp(Math.round(y + 14 * Math.sin(x / 75)), 0, H - 1), sh = 0.88 + 0.16 * Math.cos(x / 75), i = (y * W + x) * 3, j = (sy * W + x) * 3;
    cv.d[i] = src[j] * sh; cv.d[i + 1] = src[j + 1] * sh; cv.d[i + 2] = src[j + 2] * sh;
  }
}

const NAMES = Object.keys(L);
async function renderLogo(name, text) {
  const t = cleanText(text);
  if (!t) throw new Error('texto vazio');
  const M = await textMask(t);
  const cv = new Cv();
  L[name](cv, M);
  const img = new Jimp({ data: cv.toRGBA(), width: W, height: H });
  return await img.quality(90).getBufferAsync(Jimp.MIME_JPEG);
}
module.exports = { renderLogo, NAMES, cleanText };
__TP_EOF__
cat > src/commands/utilidades/logoGen.js <<'__TP_EOF__'
'use strict';
const { renderLogo, NAMES, cleanText } = require('../../services/logoEngine');
let busy = false;
const last = new Map();
const pref = (ctx) => (ctx.prefix && String(ctx.prefix).trim()) || '!';

function quotedText(ctx) { const q = ctx.quoted; return q ? (q.conversation || (q.extendedTextMessage && q.extendedTextMessage.text) || '') : ''; }

async function usage(ctx, name) {
  const p = pref(ctx), txt = '🎨 *Logo ' + name + '*\nEnvie o texto junto do comando:\n*' + p + name + ' Seu Texto*';
  try {
    const { btn, sendNative } = require('../../interactive/nativeFlow');
    return await sendNative(ctx.sock, ctx.jid, {
      body: txt, footer: '© ' + (require('../../config').botName), quoted: ctx.msg, fallback: txt,
      buttons: [btn.reply('✨ Usar meu nome', 'lg2:me:' + name), btn.copy('📋 Copiar comando', p + name + ' '), btn.reply('🎨 Menu Logo', 'mn:cmd:menulogo')]
    });
  } catch (_) { return ctx.reply(txt); }
}

async function run(ctx, name) {
  const text = cleanText((ctx.args || []).join(' ') || quotedText(ctx));
  if (!text) return usage(ctx, name);
  if (busy) return ctx.reply('⏳ Já estou criando um logo. Aguarde alguns segundos.');
  const who = String(ctx.sender || ctx.jid);
  if (last.has(who) && Date.now() - last.get(who) < 5000) return ctx.reply('⏳ Aguarde alguns segundos para criar outro.');
  last.set(who, Date.now()); busy = true;
  try {
    try { if (ctx.msg && ctx.msg.key) await ctx.sock.sendMessage(ctx.jid, { react: { text: '🎨', key: ctx.msg.key } }); } catch (_) {}
    const img = await renderLogo(name, text);
    await ctx.sock.sendMessage(ctx.jid, { image: img, mimetype: 'image/jpeg', caption: '🎨 *' + name + '* • ' + text }, { quoted: ctx.msg });
  } catch (e) {
    await ctx.reply('❌ Não consegui criar o logo.\n' + String((e && e.message) || e).slice(0, 140));
  } finally { busy = false; }
}

try {
  require('../../interactive/router').register('lg2', async (ctx, rest) => {
    const p = rest.split(':');
    if (p[0] !== 'me') return;
    const e = require('../registry').get(p[1]);
    if (!e) return;
    ctx.args = [String((ctx.msg && ctx.msg.pushName) || '').trim() || 'Tempest'];
    ctx.prefix = ctx.prefix || '!';
    return e.handler(ctx);
  });
} catch (_) {}

module.exports = NAMES.map((name) => ({
  name: name, aliases: [], category: 'logo', description: 'Logo/efeito: ' + name, usage: '!' + name + ' <texto>',
  async handler(ctx) { return run(ctx, name); }
}));
__TP_EOF__
for f in src/services/logoEngine.js src/commands/utilidades/logoGen.js; do node --check "$f" || { echo "❌ erro de sintaxe em $f"; rm -f src/services/logoEngine.js src/commands/utilidades/logoGen.js; exit 3; }; done
echo "✅ Gerador de logos instalado (44 comandos). Reinicie o bot e teste:  !blood Tempest"
