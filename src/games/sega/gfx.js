'use strict';
// Motor grafico 16:9: tela de 320x180 pixels, ampliada 3x para 960x540 (PNG, sem dependencias).
const zlib = require('zlib');

const W = 320, H = 180, SCALE = 3;

function rgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function pal(obj) { const o = {}; Object.keys(obj).forEach((k) => { o[k] = rgb(obj[k]); }); return o; }
function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }

const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '111101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', ':': '000010000010000', '-': '000000111000000', '!': '010010010000010', '.': '000000000000010',
  '/': '001001010100100', '%': '101001010100101', x: '000101010101000', '+': '000010111010000', '<': '001010100010001',
  '>': '100010001010100', ',': '000000000010100', '?': '110001010000010', '*': '000101010101000', ' ': '000000000000000'
};

class Gfx {
  constructor() { this.w = W; this.h = H; this.buf = new Uint8Array(W * H * 3); }

  clear(c) { for (let i = 0; i < this.buf.length; i += 3) { this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2]; } }

  px(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2];
  }

  rect(x, y, w, h, c) {
    x |= 0; y |= 0; w |= 0; h |= 0;
    const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * W + x0) * 3;
      for (let xx = x0; xx < x1; xx++) { this.buf[i++] = c[0]; this.buf[i++] = c[1]; this.buf[i++] = c[2]; }
    }
  }

  gradient(y0, y1, c0, c1) {
    const n = Math.max(1, y1 - y0);
    for (let y = y0; y < y1; y++) this.rect(0, y, W, 1, mix(c0, c1, (y - y0) / n));
  }

  circle(cx, cy, r, c) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.px(cx + x, cy + y, c);
  }

  line(x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // rows: array de strings; '.' = transparente; p: paleta {char:[r,g,b]}
  sprite(x, y, rows, p, flip, scale) {
    const s = scale || 1;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[flip ? row.length - 1 - c : c];
        if (ch === '.' || ch === ' ') continue;
        const col = p[ch];
        if (col) { if (s === 1) this.px(x + c, y + r, col); else this.rect(x + c * s, y + r * s, s, s, col); }
      }
    }
  }

  textW(str, scale) { return String(str).length * 4 * (scale || 1) - (scale || 1); }

  text(str, x, y, c, scale, shadow) {
    const s = scale || 1;
    str = String(str).toUpperCase();
    for (let i = 0; i < str.length; i++) {
      const g = FONT[str[i]] || FONT['?'];
      for (let k = 0; k < 15; k++) {
        if (g[k] === '1') {
          const gx = x + i * 4 * s + (k % 3) * s, gy = y + ((k / 3) | 0) * s;
          if (shadow) this.rect(gx + s, gy + s, s, s, shadow);
          this.rect(gx, gy, s, s, c);
        }
      }
    }
  }

  textC(str, cx, y, c, scale, shadow) { this.text(str, cx - ((this.textW(str, scale) / 2) | 0), y, c, scale, shadow); }

  png() {
    const rowLen = W * SCALE * 3;
    const raw = Buffer.alloc((rowLen + 1) * H * SCALE);
    const line = Buffer.alloc(rowLen);
    let o = 0;
    for (let y = 0; y < H; y++) {
      let li = 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3;
        for (let k = 0; k < SCALE; k++) { line[li++] = this.buf[i]; line[li++] = this.buf[i + 1]; line[li++] = this.buf[i + 2]; }
      }
      for (let k = 0; k < SCALE; k++) { raw[o++] = 0; line.copy(raw, o); o += rowLen; }
    }
    return encodePng(W * SCALE, H * SCALE, zlib.deflateSync(raw, { level: 4 }));
  }
}

const CRC = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, idat) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// RNG deterministico (mulberry32)
function rng(seed) {
  let a = (seed >>> 0) || 1;
  const f = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (n) => Math.floor(f() * n);
  return f;
}

module.exports = { Gfx, W, H, SCALE, rgb, pal, mix, rng };
