'use strict';
const Jimp = require('jimp');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const W = 980, H = 490, FPS = 30, DUR = 5, N = FPS * DUR;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
function hashStr(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function sprite(w, h) { return { w: w, h: h, d: Buffer.alloc(w * h * 4) }; }
const discCache = new Map(), glowCache = new Map();
function discSprite(diam, rgb, soft) {
  diam = Math.max(2, Math.round(diam));
  const key = diam + '|' + rgb.join(',') + '|' + soft;
  if (discCache.has(key)) return discCache.get(key);
  const s = sprite(diam, diam), r = diam / 2, c = r - 0.5, inner = r * (1 - soft);
  for (let y = 0; y < diam; y++) for (let x = 0; x < diam; x++) {
    const dist = Math.hypot(x - c, y - c);
    let a = dist <= inner ? 1 : dist >= r ? 0 : 1 - (dist - inner) / (r - inner);
    a = a * a * (3 - 2 * a);
    const i = (y * diam + x) * 4; s.d[i] = rgb[0]; s.d[i + 1] = rgb[1]; s.d[i + 2] = rgb[2]; s.d[i + 3] = Math.round(a * 255);
  }
  if (discCache.size > 160) discCache.clear();
  discCache.set(key, s); return s;
}
function glowSprite(diam, rgb) {
  diam = Math.max(2, Math.round(diam));
  const key = diam + '|' + rgb.join(',');
  if (glowCache.has(key)) return glowCache.get(key);
  const s = sprite(diam, diam), r = diam / 2, c = r - 0.5;
  for (let y = 0; y < diam; y++) for (let x = 0; x < diam; x++) {
    const a = Math.pow(clamp(1 - Math.hypot(x - c, y - c) / r, 0, 1), 2.2);
    const i = (y * diam + x) * 4; s.d[i] = rgb[0]; s.d[i + 1] = rgb[1]; s.d[i + 2] = rgb[2]; s.d[i + 3] = Math.round(a * 255);
  }
  if (glowCache.size > 120) glowCache.clear();
  glowCache.set(key, s); return s;
}
function plusSprite(size, rgb) {
  const s = sprite(size, size), c = (size - 1) / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = Math.abs(x - c) / c, dy = Math.abs(y - c) / c;
    const bh = Math.exp(-Math.pow(dy * size / 9, 2)) * Math.pow(clamp(1 - dx, 0, 1), 1.6);
    const bv = Math.exp(-Math.pow(dx * size / 9, 2)) * Math.pow(clamp(1 - dy, 0, 1), 1.6);
    const a = clamp(Math.max(bh, bv), 0, 1);
    const i = (y * size + x) * 4; s.d[i] = rgb[0]; s.d[i + 1] = rgb[1]; s.d[i + 2] = rgb[2]; s.d[i + 3] = Math.round(a * 255);
  }
  return s;
}
function blit(dst, s, x0, y0, alpha, add) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  if (alpha <= 0.002) return;
  const sx0 = Math.max(0, -x0), sy0 = Math.max(0, -y0), ex = Math.min(s.w, W - x0), ey = Math.min(s.h, H - y0);
  for (let y = sy0; y < ey; y++) {
    let si = (y * s.w + sx0) * 4, di = ((y + y0) * W + sx0 + x0) * 4;
    for (let x = sx0; x < ex; x++, si += 4, di += 4) {
      const a = s.d[si + 3] * alpha / 255;
      if (a <= 0.003) continue;
      if (add) { dst[di] += s.d[si] * a; dst[di + 1] += s.d[si + 1] * a; dst[di + 2] += s.d[si + 2] * a; }
      else { dst[di] += (s.d[si] - dst[di]) * a; dst[di + 1] += (s.d[si + 1] - dst[di + 1]) * a; dst[di + 2] += (s.d[si + 2] - dst[di + 2]) * a; }
    }
  }
}

function dominant(img) {
  const t = img.clone().resize(24, 24), d = t.bitmap.data;
  const bins = new Array(12).fill(0).map(() => ({ w: 0, r: 0, g: 0, b: 0 }));
  let total = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), df = mx - mn;
    const sat = mx === 0 ? 0 : df / mx;
    if (sat < 0.18 || mx < 0.2) continue;
    let h = df === 0 ? 0 : mx === r ? ((g - b) / df) % 6 : mx === g ? (b - r) / df + 2 : (r - g) / df + 4;
    h = (h * 60 + 360) % 360;
    const w = sat * mx, k = Math.floor(h / 30) % 12;
    bins[k].w += w; bins[k].r += d[i] * w; bins[k].g += d[i + 1] * w; bins[k].b += d[i + 2] * w; total += w;
  }
  if (total < 6) return [214, 218, 228];
  const best = bins.reduce((a, b) => (b.w > a.w ? b : a));
  let [r, g, b] = [best.r / best.w, best.g / best.w, best.b / best.w];
  const mx = Math.max(r, g, b); const f = mx < 190 ? 190 / Math.max(mx, 1) : 1;
  r = clamp(r * f, 0, 255); g = clamp(g * f, 0, 255); b = clamp(b * f, 0, 255);
  return [Math.round(r), Math.round(g), Math.round(b)];
}
const mix = (a, b, t) => [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];

function cleanText(s, fallback) {
  let t = String(s || '').normalize('NFKD').normalize('NFC');
  t = Array.from(t).filter((c) => { const k = c.codePointAt(0); return k >= 32 && k <= 0x24F; }).join('').replace(/\s+/g, ' ').trim();
  return t.length >= 1 ? t : fallback;
}
let fonts = null;
async function loadFonts() {
  if (fonts) return fonts;
  fonts = { f64: await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE), f16: await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE) };
  return fonts;
}
function textSprite(font, text, rgb, maxW, scale) {
  const w = Jimp.measureText(font, text) + 6, h = Jimp.measureTextHeight(font, text, w + 40) + 6;
  let im = new Jimp(w, h, 0x00000000);
  im.print(font, 3, 3, text);
  if (scale && scale !== 1) im = im.resize(Math.round(im.bitmap.width * scale), Jimp.AUTO);
  if (im.bitmap.width > maxW) im = im.resize(maxW, Jimp.AUTO);
  const s = { w: im.bitmap.width, h: im.bitmap.height, d: Buffer.from(im.bitmap.data) };
  for (let i = 0; i < s.d.length; i += 4) { s.d[i] = rgb[0]; s.d[i + 1] = rgb[1]; s.d[i + 2] = rgb[2]; }
  return s;
}

function composeAvatar(img, accent, initial, f128) {
  const D = 440, R = 464;
  const out = new Jimp(R, R, 0x00000000);
  let face;
  if (img) face = img.clone().cover(D, D);
  else {
    face = new Jimp(D, D, Jimp.rgbaToInt(...mix([14, 16, 24], accent, 0.55), 255));
    face.print(f128, 0, 0, { text: initial, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, D, D);
  }
  face.circle();
  const ring = new Jimp(R, R, 0x00000000), c = (R - 1) / 2;
  const light = mix(accent, [255, 255, 255], 0.55);
  ring.scan(0, 0, R, R, function (x, y, idx) {
    const d = Math.hypot(x - c, y - c);
    const a = d >= 224 && d <= 231 ? 1 : d > 231 && d < 233 ? 1 - (d - 231) / 2 : d > 222 && d < 224 ? (d - 222) / 2 : 0;
    this.bitmap.data[idx] = light[0]; this.bitmap.data[idx + 1] = light[1]; this.bitmap.data[idx + 2] = light[2]; this.bitmap.data[idx + 3] = Math.round(a * 255);
  });
  out.composite(ring, 0, 0);
  out.composite(face, (R - D) / 2, (R - D) / 2);
  return out;
}

const KF = [
  [0.00, 490, 245, 30, 0], [0.55, 486, 245, 64, 0.35], [0.95, 440, 250, 118, 0.85], [1.40, 505, 305, 224, 1],
  [2.05, 385, 300, 196, 1], [2.70, 318, 268, 176, 1], [3.30, 270, 245, 160, 1], [5.00, 270, 245, 162, 1]
];
function pos(t) {
  t = clamp(t, 0, DUR);
  for (let i = 0; i < KF.length - 1; i++) {
    const a = KF[i], b = KF[i + 1];
    if (t >= a[0] && t <= b[0]) { const k = ease((t - a[0]) / (b[0] - a[0])); return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k), d: lerp(a[3], b[3], k), a: lerp(a[4], b[4], k) }; }
  }
  const l = KF[KF.length - 1]; return { x: l[1], y: l[2], d: l[3], a: l[4] };
}

function makeBackground(accent, seed) {
  const bg = new Uint8ClampedArray(W * H * 4);
  const base = mix([5, 6, 11], accent, 0.045);
  const cx = W / 2, cy = H / 2, md = Math.hypot(cx, cy);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, v = 1 + 0.65 * (1 - Math.hypot(x - cx, y - cy) / md);
    let r = base[0] * v, g = base[1] * v, b = base[2] * v;
    if (x % 49 === 0 || y % 49 === 0) { r += accent[0] * 0.03; g += accent[1] * 0.03; b += accent[2] * 0.03; }
    bg[i] = r; bg[i + 1] = g; bg[i + 2] = b; bg[i + 3] = 255;
  }
  return bg;
}

function ffmpegStart(out) {
  const args = ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', W + 'x' + H, '-r', String(FPS), '-i', '-', '-an',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out];
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; p.stderr.on('data', (d) => { err += d.toString(); });
  const done = new Promise((resolve, reject) => { p.on('error', reject); p.on('close', (c) => (c === 0 ? resolve() : reject(new Error('ffmpeg: ' + err.slice(0, 200))))); });
  p.stdin.on('error', () => {});
  return { p: p, done: done };
}
async function writeFrame(stdin, buf) {
  if (!stdin.write(buf)) await new Promise((r) => stdin.once('drain', r));
}

async function renderWelcome(opts) {
  const f = await loadFonts();
  const f128 = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
  let photo = null;
  if (opts.avatar) { try { photo = await Jimp.read(opts.avatar); } catch (_) { photo = null; } }
  const accent = photo ? dominant(photo) : mix([120, 140, 255], [255, 255, 255], 0.2);
  const initial = (cleanText(opts.name, '?')[0] || '?').toUpperCase();
  const baseAvatar = composeAvatar(photo, accent, initial, f128);
  const avCache = new Map();
  const avatarAt = (d) => {
    d = Math.max(8, Math.round(d));
    if (avCache.has(d)) return avCache.get(d);
    const im = baseAvatar.clone().resize(d, d, Jimp.RESIZE_BILINEAR);
    const s = { w: d, h: d, d: Buffer.from(im.bitmap.data) };
    if (avCache.size > 120) avCache.clear();
    avCache.set(d, s); return s;
  };
  const light = mix(accent, [255, 255, 255], 0.5), soft = mix(accent, [255, 255, 255], 0.25);
  const seed = hashStr(opts.seed || opts.name || 'x');
  const R = rng(seed);
  const bg = makeBackground(accent, seed);
  const parts = []; for (let i = 0; i < 110; i++) parts.push({ x: R() * W, y: R() * H, s: R() < 0.2 ? 3 : 2, ph: R() * 6.28, sp: 4 + R() * 10, a: 0.35 + R() * 0.65 });
  const bokeh = []; for (let i = 0; i < 7; i++) bokeh.push({ x: R() * W, y: R() * H, d: 36 + R() * 54, sp: 3 + R() * 6, a: 0.05 + R() * 0.06 });
  const name = cleanText(opts.name, 'Novo membro');
  const group = cleanText(opts.group, 'Grupo');
  const sub = (opts.count ? 'Membro n\u00BA ' + opts.count + '  |  ' : '') + group;
  const grayTxt = mix([138, 144, 156], accent, 0.25);
  const sLabel = textSprite(f.f16, 'B E M - V I N D O ( A )', mix([150, 156, 168], accent, 0.35), 260, 0.8);
  const sName = textSprite(f.f64, name, [255, 255, 255], 540);
  const sSub = textSprite(f.f16, sub, grayTxt, 540);
  const plus = plusSprite(170, mix(accent, [255, 255, 255], 0.65));
  const frame = new Uint8ClampedArray(W * H * 4);
  const out = path.join(os.tmpdir(), 'welcome2_' + Date.now() + '_' + Math.floor(Math.random() * 1e5) + '.mp4');
  const ff = ffmpegStart(out);
  try {
    for (let n = 0; n < N; n++) {
      const t = n / FPS;
      frame.set(bg);
      for (const b of bokeh) blit(frame, discSprite(b.d, soft, 0.5), (b.x + t * b.sp) % (W + 80) - 40, (b.y - t * b.sp * 0.6 + H) % H, b.a * (0.7 + 0.3 * Math.sin(t + b.d)), true);
      for (const p of parts) {
        const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.2 + p.ph));
        blit(frame, discSprite(p.s, light, 0.9), p.x, (p.y - t * p.sp + H * 4) % H, p.a * tw * clamp(t * 2, 0, 1), true);
      }
      const P = pos(t);
      const orbA = t < 0.25 ? t / 0.25 : 1 - ease((t - 0.35) / 0.6);
      if (orbA > 0.01) { const od = 22 + t * 26; blit(frame, discSprite(od + 24, soft, 1), 490 - (od + 24) / 2, 245 - (od + 24) / 2, orbA * 0.55, true); blit(frame, discSprite(od, [255, 255, 255], 0.35), 490 - od / 2, 245 - od / 2, orbA, false); }
      const sp = Math.hypot(pos(t).x - pos(t - 0.06).x, pos(t).y - pos(t - 0.06).y);
      const mv = clamp(sp / 9, 0, 1);
      if (mv > 0.02 && P.a > 0.05) for (let k = 1; k <= 9; k++) {
        const q = pos(t - 0.028 * k);
        blit(frame, discSprite(q.d * 0.95, accent, 0.65), q.x - q.d * 0.475, q.y - q.d * 0.475, 0.2 * (1 - k / 10) * mv * P.a, true);
      }
      if (P.a > 0.02) { const gd = P.d * (1.9 + 0.08 * Math.sin(t * 3)); blit(frame, glowSprite(gd, accent), P.x - gd / 2, P.y - gd / 2, 0.42 * P.a, true); }
      const pl = clamp((t - 2.7) / 1.0, 0, 1);
      if (pl > 0 && pl < 1) { const k = Math.sin(Math.PI * pl); blit(frame, plus, 470 - plus.w / 2, 246 - plus.h / 2, 0.9 * k, true); }
      if (P.a > 0.01) { const av = avatarAt(P.d * (1 + (t > 3.3 ? 0.012 * Math.sin((t - 3.3) * 3) : 0))); blit(frame, av, P.x - av.w / 2, P.y - av.h / 2, P.a, false); }
      const ta = ease((t - 2.9) / 0.7);
      if (ta > 0.01) {
        const dx = (1 - ta) * -34, x0 = 404 + dx;
        blit(frame, sLabel, x0, 190, ta * 0.9, false);
        blit(frame, sName, x0 - 2, 214, ta, false);
        blit(frame, sSub, x0, 214 + sName.h + 4, ta * 0.85, false);
      }
      if (t > 4.0) { const k = Math.sin(Math.PI * clamp(t - 4.0, 0, 1)); blit(frame, discSprite(230, mix(accent, [60, 60, 70], 0.4), 0.7), 500 + (t - 4) * 46 - 115, 245 - 115, 0.28 * k, true); }
      await writeFrame(ff.p.stdin, Buffer.from(frame.buffer, frame.byteOffset, frame.byteLength));
    }
    ff.p.stdin.end();
    await ff.done;
    const buf = fs.readFileSync(out);
    return { video: buf, accent: accent };
  } finally { try { fs.unlinkSync(out); } catch (_) {} }
}

module.exports = { renderWelcome, dominant, cleanText };
