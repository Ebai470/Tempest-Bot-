'use strict';
/** MODOAP — renderizador local de imagens (PNG puro, sem dependências). Preto/verde/vermelho/dourado. */
const zlib = require('zlib');
const W = 720, H = 400;
const fm = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const C = { bg: [8, 8, 10], panel: [20, 20, 24], line: [45, 45, 52], green: [46, 204, 113], red: [231, 76, 60], gold: [241, 196, 15], white: [236, 236, 240], gray: [140, 140, 150], blue: [52, 152, 219] };
const F = { A: '0E11111F1111', B: '1E11111E111E', C: '0E1110101011E', D: '1C12111112 1C', E: '1F10101E101F', F: '1F10101E1010', G: '0E10101311 0E', H: '11111F111111', I: '0E04040404 0E', J: '0701010111 0E', K: '1112141814 12', L: '10101010101F', M: '111B15111111', N: '11191513 1111', O: '0E1111111 10E', P: '1E11111E1010', Q: '0E111111150 D', R: '1E11111E1211', S: '0F10100E011E', T: '1F04040404 04', U: '11111111110E', V: '11111111 0A04', W: '11111115 1B11', X: '11110A040A11', Y: '1111 0A040404', Z: '1F01020408 1F' };
// fonte 5x7 compacta (linhas em hex de 5 bits)
const G = {};
('A:0E,11,11,1F,11,11,11|B:1E,11,11,1E,11,11,1E|C:0E,11,10,10,10,11,0E|D:1E,11,11,11,11,11,1E|E:1F,10,10,1E,10,10,1F|F:1F,10,10,1E,10,10,10|G:0E,11,10,17,11,11,0F|H:11,11,11,1F,11,11,11|I:0E,04,04,04,04,04,0E|J:07,02,02,02,02,12,0C|K:11,12,14,18,14,12,11|L:10,10,10,10,10,10,1F|M:11,1B,15,15,11,11,11|N:11,19,15,13,11,11,11|O:0E,11,11,11,11,11,0E|P:1E,11,11,1E,10,10,10|Q:0E,11,11,11,15,12,0D|R:1E,11,11,1E,14,12,11|S:0F,10,10,0E,01,01,1E|T:1F,04,04,04,04,04,04|U:11,11,11,11,11,11,0E|V:11,11,11,11,11,0A,04|W:11,11,11,15,15,15,0A|X:11,11,0A,04,0A,11,11|Y:11,11,0A,04,04,04,04|Z:1F,01,02,04,08,10,1F|' +
 '0:0E,11,13,15,19,11,0E|1:04,0C,04,04,04,04,0E|2:0E,11,01,02,04,08,1F|3:1F,02,04,02,01,11,0E|4:02,06,0A,12,1F,02,02|5:1F,10,1E,01,01,11,0E|6:06,08,10,1E,11,11,0E|7:1F,01,02,04,08,08,08|8:0E,11,11,0E,11,11,0E|9:0E,11,11,0F,01,02,0C|' +
 '.:00,00,00,00,00,0C,0C|,:00,00,00,00,0C,04,08|:: 00,0C,0C,00,0C,0C,00|-:00,00,00,1F,00,00,00|+:00,04,04,1F,04,04,00|x:00,11,0A,04,0A,11,00|%:18,19,02,04,08,13,03|$:04,0F,14,0E,05,1E,04|/:01,01,02,04,08,10,10|(:02,04,08,08,08,04,02|):08,04,02,02,02,04,08|!:04,04,04,04,04,00,04|?:0E,11,01,02,04,00,04|\':04,04,08,00,00,00,00|@:0E,11,17,15,17,10,0E|>:08,04,02,01,02,04,08|=:00,00,1F,00,1F,00,00').split('|').forEach(e => { if (!e) return; const k = e[0]; G[k] = e.slice(2).split(',').map(h => parseInt(h.trim(), 16)); });
G[':'] = [0, 12, 12, 0, 12, 12, 0];

class Cv {
  constructor() { this.d = Buffer.alloc(W * H * 4); this.fill(C.bg); }
  fill(c) { for (let i = 0; i < W * H; i++) { this.d[i * 4] = c[0]; this.d[i * 4 + 1] = c[1]; this.d[i * 4 + 2] = c[2]; this.d[i * 4 + 3] = 255; } }
  px(x, y, c, a) {
    x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; if (a === undefined) a = 1; if (a <= 0) return;
    const i = (y * W + x) * 4; const d = this.d; d[i] = d[i] + (c[0] - d[i]) * a; d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * a; d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * a;
  }
  rect(x, y, w, h, c, a) { for (let j = Math.max(0, y | 0); j < Math.min(H, (y + h) | 0); j++) for (let i = Math.max(0, x | 0); i < Math.min(W, (x + w) | 0); i++) this.px(i, j, c, a); }
  frame(x, y, w, h, c, t) { t = t || 2; this.rect(x, y, w, t, c); this.rect(x, y + h - t, w, t, c); this.rect(x, y, t, h, c); this.rect(x + w - t, y, t, h, c); }
  sdf(x0, y0, x1, y1, f, c) { for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(W - 1, Math.ceil(x1)); x++) { const a = 0.5 - f(x + 0.5, y + 0.5); if (a > 0) this.px(x, y, c, Math.min(1, a)); } }
  circle(cx, cy, r, c) { this.sdf(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, (x, y) => Math.hypot(x - cx, y - cy) - r, c); }
  ring(cx, cy, r, t, c) { this.sdf(cx - r - t, cy - r - t, cx + r + t, cy + r + t, (x, y) => Math.abs(Math.hypot(x - cx, y - cy) - r) - t / 2, c); }
  seg(ax, ay, bx, by, t, c) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    this.sdf(Math.min(ax, bx) - t, Math.min(ay, by) - t, Math.max(ax, bx) + t, Math.max(ay, by) + t, (x, y) => { let u = ((x - ax) * dx + (y - ay) * dy) / l2; u = Math.max(0, Math.min(1, u)); return Math.hypot(x - ax - u * dx, y - ay - u * dy) - t / 2; }, c);
  }
  poly(pts, c) { // triângulo/polígono convexo
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    this.sdf(Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1, (x, y) => {
      let m = -1e9; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; const ex = b[0] - a[0], ey = b[1] - a[1]; const l = Math.hypot(ex, ey) || 1; m = Math.max(m, ((x - a[0]) * ey - (y - a[1]) * ex) / l); } return m; }, c);
  }
  rrect(x, y, w, h, r, c) { this.sdf(x - 1, y - 1, x + w + 1, y + h + 1, (px, py) => { const qx = Math.abs(px - x - w / 2) - (w / 2 - r), qy = Math.abs(py - y - h / 2) - (h / 2 - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; }, c); }
  clean(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 .,:\-+x%$\/()!?'@>=]/gi, '').replace(/X/g, 'X'); }
  tw(s, sc) { return this.clean(s).length * 6 * sc - sc; }
  text(s, x, y, sc, c, align) {
    s = this.clean(s); const w = s.length * 6 * sc - sc; if (align === 'c') x -= w / 2; else if (align === 'r') x -= w;
    for (let k = 0; k < s.length; k++) { const g = G[s[k]] || G[s[k].toLowerCase()]; if (g) for (let r = 0; r < 7; r++) for (let q = 0; q < 5; q++) if (g[r] & (16 >> q)) this.rect(x + (k * 6 + q) * sc, y + r * sc, sc, sc, c); }
  }
  png() {
    const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; this.d.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4); }
    const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
    const crc = (b) => { let c = 0xFFFFFFFF; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const ch = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
    const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
  }
}

function frame(cv, title, r) { // moldura + rodapé comum
  for (let y = 0; y < H; y++) { const k = y / H; cv.rect(0, y, W, 1, [8 + k * 6, 8 + k * 8, 10 + k * 10]); }
  cv.frame(6, 6, W - 12, H - 12, C.gold, 2); cv.rect(6, 6, W - 12, 40, C.panel); cv.rect(6, 46, W - 12, 2, C.gold);
  cv.text('TEMPEST BOT', 22, 18, 3, C.gold); cv.text(title, W - 22, 18, 3, C.white, 'r');
  const col = r.win === null ? C.gold : r.win ? C.green : C.red; const big = r.win && r.mult >= 10 ? C.gold : col;
  cv.rect(6, 296, W - 12, H - 302, C.panel); cv.rect(6, 296, W - 12, 2, C.line);
  cv.text(r.name, 22, 308, 2, C.white); cv.text('APOSTA ' + r.bet, 22, 330, 2, C.gray);
  cv.text(r.label, W / 2, 304, 4, big, 'c'); cv.text(r.mult.toFixed(2) + 'X', W - 22, 308, 3, big, 'r');
  cv.text((r.delta >= 0 ? '+' : '-') + '$' + fm(Math.abs(r.delta)), W / 2, 338, 4, col, 'c');
  cv.text('SALDO ' + (r.balance < 0 ? '-' : '') + '$' + fm(Math.abs(r.balance)), 22, 358, 2, C.white);
  const dt = new Date(); const p = (n) => String(n).padStart(2, '0');
  cv.text(p(dt.getDate()) + '/' + p(dt.getMonth() + 1) + '/' + dt.getFullYear() + ' ' + p(dt.getHours()) + ':' + p(dt.getMinutes()), W - 22, 358, 2, C.gray, 'r');
  cv.text('JOGO VIRTUAL - SEM VALOR REAL', W / 2, 380, 1, C.gray, 'c');
}

// ── gráficos por jogo ──
function curve(cv, k, tEnd, crashed, kind) {
  const x0 = 40, y0 = 270, x1 = 680, y1 = 70; const m = (t) => Math.exp(k * t); const top = Math.max(2, m(tEnd) * 1.15);
  for (let i = 0; i < 5; i++) cv.rect(x0, y0 - (y0 - y1) * i / 4, x1 - x0, 1, C.line, 0.7);
  const X = (t) => x0 + (x1 - x0) * (t / Math.max(tEnd, 0.001)) * 0.92, Y = (v) => y0 - (y0 - y1) * ((v - 1) / (top - 1));
  let px = X(0), py = Y(1); const col = crashed ? C.red : C.green;
  for (let i = 1; i <= 80; i++) { const t = tEnd * i / 80, x = X(t), y = Y(m(t)); cv.seg(px, py, x, y, 4, col); for (let yy = Math.round(y); yy < y0; yy += 3) cv.px(Math.round(x), yy, col, 0.12); px = x; py = y; }
  const ang = Math.atan2(py - Y(m(tEnd * 0.97)), px - X(tEnd * 0.97));
  if (crashed) { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; cv.seg(px, py, px + Math.cos(a) * 26, py + Math.sin(a) * 26, 3, i % 2 ? C.gold : C.red); } cv.circle(px, py, 10, C.red); }
  else if (kind === 'rocket') { const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux; cv.poly([[px + ux * 30, py + uy * 30], [px + nx * 9, py + ny * 9], [px - nx * 9, py - ny * 9]], C.white); cv.poly([[px - ux * 6 + nx * 9, py - uy * 6 + ny * 9], [px - ux * 20 + nx * 17, py - uy * 20 + ny * 17], [px - ux * 6, py - uy * 6]], C.red); cv.poly([[px - ux * 6 - nx * 9, py - uy * 6 - ny * 9], [px - ux * 20 - nx * 17, py - uy * 20 - ny * 17], [px - ux * 6, py - uy * 6]], C.red); cv.poly([[px - ux * 8 + nx * 4, py - uy * 8 + ny * 4], [px - ux * 28, py - uy * 28], [px - ux * 8 - nx * 4, py - uy * 8 - ny * 4]], C.gold); }
  else { const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux; cv.poly([[px + ux * 28, py + uy * 28], [px + nx * 7, py + ny * 7], [px - ux * 16 + nx * 5, py - uy * 16 + ny * 5], [px - ux * 16 - nx * 5, py - uy * 16 - ny * 5], [px - nx * 7, py - ny * 7]], C.white); cv.poly([[px + nx * 4, py + ny * 4], [px - ux * 10 + nx * 26, py - uy * 10 + ny * 26], [px - ux * 10, py - uy * 10]], C.gray); cv.poly([[px - nx * 4, py - ny * 4], [px - ux * 10 - nx * 26, py - uy * 10 - ny * 26], [px - ux * 10, py - uy * 10]], C.gray); }
}
function dice(cv, cx, cy, n, c) { cv.rrect(cx - 50, cy - 50, 100, 100, 14, c || C.white); const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }; for (const p of P[n]) cv.circle(cx + p[0] * 26, cy + p[1] * 26, 9, C.bg); }
function mines(cv, st, over) {
  const s = 40, ox = (W - 5 * (s + 6)) / 2 + 3, oy = 58;
  for (let i = 0; i < 25; i++) { const x = ox + (i % 5) * (s + 6), y = oy + Math.floor(i / 5) * (s - 1 + 5) * 0.97 + 0; const pk = st.picked.includes(i), mn = st.mines.includes(i);
    if (pk) { cv.rrect(x, y, s, s - 4, 6, [20, 90, 50]); cv.poly([[x + s / 2, y + 6], [x + s - 8, y + 16], [x + s / 2, y + s - 12], [x + 8, y + 16]], C.green); }
    else if (over && mn) { cv.rrect(x, y, s, s - 4, 6, [110, 25, 25]); cv.circle(x + s / 2, y + 17, 9, C.white); for (let a = 0; a < 6; a++) cv.seg(x + s / 2, y + 17, x + s / 2 + Math.cos(a) * 15, y + 17 + Math.sin(a) * 15, 2, C.gold); }
    else { cv.rrect(x, y, s, s - 4, 6, C.panel); cv.text(String(i + 1), x + s / 2, y + 12, 1, C.gray, 'c'); } }
}
function tower(cv, st, over) {
  const L = st.traps.length, h = 24, ow = 3; const ox = 250, oy = 54;
  for (let l = 0; l < L; l++) { const y = oy + (L - 1 - l) * (h + 2); for (let c = 0; c < 3; c++) { const x = ox + c * 76; const done = l < st.level; const trap = st.traps[l] === c;
    let col = C.panel; if (done && st.picks[l] === c) col = [20, 110, 60]; else if ((over || done) && trap && (over || l < st.level)) col = [120, 30, 30]; if (l === st.level && !over) col = [35, 35, 45];
    cv.rrect(x, y, 70, h, 5, col); if (done && st.picks[l] === c) cv.text('OK', x + 35, y + 8, 1, C.green, 'c'); else if ((over) && trap) cv.text('X', x + 35, y + 8, 1, C.red, 'c'); } cv.text('N' + (l + 1), ox - 14, y + 8, 1, C.gray, 'r'); }
}
function plinko(cv, st, mults) {
  const rows = st.path.length, bx = W / 2, by = 62, dx = 34, dy = 25; let pos = 0;
  for (let r = 0; r <= rows; r++) for (let k = 0; k <= r; k++) if (r > 0) cv.circle(bx + (k - r / 2) * dx, by + r * dy, 3, C.gray);
  let px = bx, py = by - 6; for (let r = 0; r < rows; r++) { pos += st.path[r]; const x = bx + (pos - (r + 1) / 2) * dx, y = by + (r + 1) * dy - 10; cv.seg(px, py, x, y, 3, C.gold); px = x; py = y; }
  const sw = dx - 3; for (let k = 0; k <= rows; k++) { const x = bx + (k - rows / 2) * dx; const m = mults[k]; const hit = k === pos; const col = m >= 3 ? C.gold : m >= 1 ? C.green : C.red;
    cv.rrect(x - sw / 2, by + (rows + 1) * dy - 6, sw, 22, 4, hit ? col : [30, 30, 36]); cv.text(String(m), x, by + (rows + 1) * dy + 2, 1, hit ? C.bg : col, 'c'); }
  cv.circle(px, py + 2, 8, C.white);
}
function simple(cv, kind, d) { // jogos de decisão rápida (apostar, roleta…) — painel central
  if (kind === 'text') { cv.text(d.big || '', W / 2, 120, 6, d.col || C.white, 'c'); cv.text(d.sub || '', W / 2, 200, 3, C.gray, 'c'); }
}

/** r = { game, name, bet, mult, win, delta, balance, label, data } */
function game(r) {
  const cv = new Cv(); const title = r.title; frame(cv, title, r); const d = r.data || {};
  if (r.game === 'aviator' || r.game === 'rocket') curve(cv, d.k, d.tEnd, d.crashed, r.game);
  else if (r.game === 'dice') { dice(cv, W / 2 - 90, 160, d.roll, d.roll === d.pick ? C.green : C.white); cv.text('PALPITE', W / 2 + 80, 110, 2, C.gray, 'c'); dice(cv, W / 2 + 80, 175, d.pick, C.gold); cv.circle(0, 0, 0, C.bg); }
  else if (r.game === 'mines') mines(cv, d, d.over);
  else if (r.game === 'tower') tower(cv, d, d.over);
  else if (r.game === 'plinko') plinko(cv, d, d.mults);
  else simple(cv, 'text', d);
  return cv.png();
}
module.exports = { game, Cv, C };
