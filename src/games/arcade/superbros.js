/* SUPER TEMPEST BROS — plataforma lateral com fases, inimigos, moedas e bandeira */
const TS = 16, LW = 170, LH = 12, OY = 24, FX = 160;
const M = []; for (let y = 0; y < LH; y++) M.push(new Array(LW).fill(0));
const gaps = [[24, 26], [50, 53], [84, 86], [112, 115], [138, 140]];
for (let x = 0; x < LW; x++) if (!gaps.some((q) => x >= q[0] && x <= q[1])) { M[10][x] = 1; M[11][x] = 1; }
const row = (x, y, n, t) => { for (let i = 0; i < n; i++) M[y][x + i] = t; };
const pipe = (x, h) => { for (let y = 10 - h; y < 10; y++) M[y][x] = M[y][x + 1] = (y === 10 - h ? 7 : 6); };
row(14, 7, 5, 2); M[7][16] = 3; M[7][18] = 3; M[4][17] = 3;
pipe(30, 2); pipe(38, 3); row(42, 7, 3, 2); M[7][43] = 3;
row(56, 7, 4, 2); row(58, 4, 3, 2); M[7][57] = 3; pipe(60, 2); row(66, 7, 2, 2); M[7][66] = 3; pipe(72, 4);
row(90, 7, 6, 2); M[7][92] = 3; M[7][94] = 3; row(93, 4, 3, 2); row(100, 7, 3, 2); M[7][101] = 3; row(120, 7, 5, 2); M[7][122] = 3;
for (let i = 0; i < 8; i++) for (let j = 0; j <= i; j++) M[9 - j][146 + i] = 4;

const coins = [], E = [], pops = [], parts = [];
const C = (x, y) => coins.push({ x: x * TS + 4, y: y * TS + 2, g: 0 });
const arc = (x0, n, base, h) => { for (let i = 0; i < n; i++) C(x0 + i, base - Math.round(Math.sin(Math.PI * (i + 0.5) / n) * h)); };
arc(23, 5, 9, 3); arc(49, 6, 9, 3); arc(83, 5, 9, 3); arc(111, 6, 9, 3); arc(137, 5, 9, 3);
for (let i = 0; i < 5; i++) C(14 + i, 6); for (let i = 0; i < 6; i++) C(90 + i, 6); for (let i = 0; i < 5; i++) C(120 + i, 6); for (let i = 0; i < 3; i++) C(93 + i, 3);
const en = (x, sp) => E.push({ x: x * TS, y: 10 * TS - 14, w: 14, h: 14, vx: -0.5, vy: 0, g: 0, dead: 0, sp: sp || 0 });
[19, 33, 36, 45, 55, 64, 68, 76, 80, 92, 96, 104, 108, 118, 124, 130, 134, 143].forEach((x) => en(x)); [70, 98, 128].forEach((x) => en(x, 1));

const solid = (tx, ty) => tx < 0 ? true : tx >= LW ? true : ty < 0 || ty >= LH ? false : M[ty][tx] > 0;
let st = 'title', p, cam = 0, score = 0, nCoins = 0, lives = 3, time = 300, tmr = 0, cp = 0, flagY = 0, bonus = 0;

function newP() { p = { x: cp ? 80 * TS : 2 * TS, y: 9 * TS - 1, w: 12, h: 15, vx: 0, vy: 0, g: 0, dir: 1, dead: 0, jb: 0, cy: 0, an: 0 }; cam = Math.max(0, p.x - 130); time = 300; }
function mv(e, isP) {
  e.x += e.vx; let hit = 0;
  let x0 = Math.floor(e.x / TS), x1 = Math.floor((e.x + e.w - 0.01) / TS), y0 = Math.floor(e.y / TS), y1 = Math.floor((e.y + e.h - 0.01) / TS);
  for (let ty = y0; ty <= y1; ty++) {
    if (e.vx > 0 && solid(x1, ty)) { e.x = x1 * TS - e.w; hit = 1; break; }
    if (e.vx < 0 && solid(x0, ty)) { e.x = (x0 + 1) * TS; hit = 1; break; }
  }
  e.y += e.vy; e.g = 0;
  x0 = Math.floor(e.x / TS); x1 = Math.floor((e.x + e.w - 0.01) / TS); y0 = Math.floor(e.y / TS); y1 = Math.floor((e.y + e.h - 0.01) / TS);
  if (e.vy >= 0) { for (let tx = x0; tx <= x1; tx++) if (solid(tx, y1)) { e.y = y1 * TS - e.h; e.vy = 0; e.g = 1; break; } }
  else {
    for (let tx = x0; tx <= x1; tx++) if (solid(tx, y0)) {
      e.y = (y0 + 1) * TS; e.vy = 0; if (isP) bump(tx, y0); break;
    }
  }
  return hit;
}
function bump(tx, ty) {
  const t = M[ty][tx];
  if (t === 3) { M[ty][tx] = 5; nCoins++; score += 50; pops.push({ x: tx * TS + 4, y: ty * TS - 4, vy: -3, l: 28 }); snd(988, 0.08, 'square', 0.05); snd(1319, 0.2, 'square', 0.05); }
  else if (t === 2) { M[ty][tx] = 0; score += 20; snd(120, 0.15, 'sawtooth', 0.06, 60); for (let i = 0; i < 6; i++) parts.push({ x: tx * TS + 8, y: ty * TS + 8, vx: rnd(-2, 2), vy: rnd(-4, -1), l: 40 }); }
  else snd(150, 0.06, 'square', 0.04);
  E.forEach((e) => { if (!e.dead && Math.abs((e.x + 7) - (tx * TS + 8)) < 12 && Math.abs(e.y + e.h - ty * TS) < 3) { e.dead = 30; score += 100; } });
}
function die() { if (p.dead) return; p.dead = 1; p.vy = -5; p.vx = 0; tmr = 0; snd(500, 0.5, 'square', 0.06, 80); }

function upd() {
  if (st === 'title') { cam = (cam + 0.6) % 900; if (go()) { st = 'play'; lives = 3; score = 0; nCoins = 0; cp = 0; newP(); E.forEach((e, i) => { }); resetWorld(); } return; }
  if (st === 'over') { if (++tmr > 40 && go()) st = 'title'; return; }
  if (st === 'clear') {
    tmr++; if (flagY < 120) flagY += 2;
    if (p.y < 10 * TS - p.h) { p.y += 2; } else if (p.x < (FX + 4) * TS) { p.x += 1.2; p.an += 0.3; }
    if (time > 0 && tmr > 40 && tmr % 2 === 0) { time -= 3; if (time < 0) time = 0; score += 30; snd(800, 0.03, 'square', 0.03); }
    if (tmr > 160 && time <= 0 && go()) { saveHi(score); st = 'title'; } return;
  }
  /* jogando */
  if (p.dead) {
    p.vy += 0.3; p.y += p.vy; if (++tmr > 90) { lives--; if (lives <= 0) { st = 'over'; tmr = 0; saveHi(score); } else newP(); } return;
  }
  if (frames % 30 === 0 && --time <= 0) { time = 0; die(); }
  const run = K.b, max = run ? 2.3 : 1.4, acc = 0.11;
  if (K.l && !K.r) { p.vx -= acc * (p.vx > 0 ? 2.4 : 1); p.dir = -1; }
  else if (K.r && !K.l) { p.vx += acc * (p.vx < 0 ? 2.4 : 1); p.dir = 1; }
  else { p.vx *= p.g ? 0.8 : 0.98; if (Math.abs(p.vx) < 0.05) p.vx = 0; }
  p.vx = clamp(p.vx, -max, max);
  p.jb = P.a ? 7 : p.jb - 1; p.cy = p.g ? 6 : p.cy - 1;
  if (p.jb > 0 && p.cy > 0) { p.vy = -4.5 - Math.abs(p.vx) * 0.25; p.g = 0; p.cy = 0; p.jb = 0; snd(330, 0.18, 'square', 0.05, 760); }
  p.vy = Math.min(6, p.vy + (K.a && p.vy < 0 ? 0.15 : 0.36));
  if (p.x + p.vx < cam) p.vx = Math.max(p.vx, 0);
  mv(p, 1); p.an += Math.abs(p.vx) * 0.12;
  if (p.y > LH * TS + 10) die();
  if (p.x > cp * 0 + 82 * TS) cp = 1;
  cam = clamp(Math.max(cam, p.x - 140), 0, LW * TS - W);
  if (p.x + p.w >= FX * TS + 4) { st = 'clear'; tmr = 0; flagY = 0; p.vx = 0; p.x = FX * TS - 6; snd(600, 0.6, 'square', 0.06, 1200); }
  coins.forEach((c) => { if (!c.g && p.x < c.x + 8 && p.x + p.w > c.x && p.y < c.y + 12 && p.y + p.h > c.y) { c.g = 1; nCoins++; score += 50; snd(1175, 0.06, 'square', 0.04); snd(1568, 0.14, 'square', 0.04); if (nCoins % 25 === 0) { lives++; snd(880, 0.4, 'triangle', 0.07, 1760); } } });
  E.forEach((e) => {
    if (e.dead) { e.dead--; return; }
    if (e.x > cam + W + 40 || e.x < cam - 60) return;
    e.vy = Math.min(6, e.vy + 0.3);
    if (mv(e)) e.vx = -e.vx;
    if (e.g && !solid(Math.floor((e.x + (e.vx > 0 ? e.w + 1 : -1)) / TS), Math.floor((e.y + e.h + 1) / TS))) e.vx = -e.vx;
    if (e.y > LH * TS + 20) { e.dead = 1; return; }
    if (p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
      if (p.vy > 0.5 && p.y + p.h - e.y < 11 && !e.sp) { e.dead = 30; p.vy = K.a ? -4.8 : -3.2; score += 100; snd(220, 0.12, 'square', 0.06, 90); }
      else die();
    }
  });
  pops.forEach((o) => { o.vy += 0.25; o.y += o.vy; o.l--; });
  parts.forEach((o) => { o.vy += 0.3; o.x += o.vx; o.y += o.vy; o.l--; });
}
function resetWorld() {
  for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) { if (M[y][x] === 5) M[y][x] = 3; }
  coins.forEach((c) => c.g = 0); E.forEach((e) => { e.dead = 0; e.vx = -0.5; e.vy = 0; e.y = 10 * TS - 14; });
  const xs = [19, 33, 36, 45, 55, 64, 68, 76, 80, 92, 96, 104, 108, 118, 124, 130, 134, 143, 70, 98, 128]; E.forEach((e, i) => e.x = xs[i] * TS);
  /* tijolos quebrados voltam */
  const br = [[7, 14, 5], [7, 42, 3], [7, 56, 4], [4, 58, 3], [7, 66, 2], [7, 90, 6], [4, 93, 3], [7, 100, 3], [7, 120, 5]];
  br.forEach((b) => row(b[1], b[0], b[2], 2));
  [[7, 16], [7, 18], [4, 17], [7, 43], [7, 57], [7, 66], [7, 92], [7, 94], [7, 101], [7, 122]].forEach((q) => { M[q[0]][q[1]] = 3; });
}

function tile(t, x, y, ty) {
  if (t === 1) { R(x, y, 16, 16, '#c8763c'); R(x, y, 16, ty === 10 ? 4 : 0, '#4cc04c'); R(x, y + (ty === 10 ? 4 : 0), 16, 1, '#8a4a20'); R(x + 7, y + 8, 1, 8, '#9a5a28'); R(x + 3, y + 11, 6, 1, '#9a5a28'); }
  else if (t === 2) { R(x, y, 16, 16, '#d0622c'); R(x, y + 5, 16, 1, '#6e2a0c'); R(x, y + 10, 16, 1, '#6e2a0c'); R(x + 7, y, 1, 5, '#6e2a0c'); R(x + 3, y + 6, 1, 4, '#6e2a0c'); R(x + 11, y + 6, 1, 4, '#6e2a0c'); R(x + 7, y + 11, 1, 5, '#6e2a0c'); R(x, y, 16, 1, '#f08a50'); }
  else if (t === 3) { const s = blink(18) ? '#ffd23c' : '#f4a800'; R(x, y, 16, 16, s); R(x, y, 16, 1, '#fff0a0'); R(x, y + 15, 16, 1, '#a06000'); R(x + 1, y + 1, 1, 1, '#000'); R(x + 14, y + 1, 1, 1, '#000'); T('?', x + 8, y + 3, '#7a3a00', 11, 'center'); }
  else if (t === 4) { R(x, y, 16, 16, '#9a9ab0'); R(x, y, 16, 2, '#d8d8ee'); R(x, y, 2, 16, '#d8d8ee'); R(x, y + 14, 16, 2, '#5a5a74'); R(x + 14, y, 2, 16, '#5a5a74'); }
  else if (t === 5) { R(x, y, 16, 16, '#8a6a44'); R(x + 1, y + 1, 14, 14, '#a8855a'); R(x + 3, y + 3, 10, 10, '#8a6a44'); }
  else if (t === 6) { R(x, y, 16, 16, '#1f9d3a'); R(x + 3, y, 3, 16, '#6ee07e'); R(x + 13, y, 3, 16, '#0f6a24'); }
  else if (t === 7) { R(x - (x % 32 === 0 ? 1 : 0), y, 16, 16, '#1f9d3a'); R(x, y, 16, 3, '#6ee07e'); R(x + 3, y + 3, 3, 13, '#6ee07e'); R(x + 13, y, 3, 16, '#0f6a24'); R(x, y + 15, 16, 1, '#0f6a24'); }
}
function drawP() {
  const x = Math.round(p.x), y = Math.round(p.y) + 1, d = p.dir, f = (ox, w) => d > 0 ? ox : 12 - ox - w;
  if (p.dead) { R(x + 2, y, 8, 3, '#e52521'); R(x + 3, y + 3, 7, 5, '#ffc49a'); R(x + 2, y + 8, 8, 8, '#2f55d4'); R(x - 2, y + 4, 4, 3, '#ffc49a'); R(x + 10, y + 4, 4, 3, '#ffc49a'); return; }
  const air = !p.g, w = Math.sin(p.an * 2) > 0, mov = Math.abs(p.vx) > 0.2;
  R(x + f(2, 3), y + 13 + (air ? 0 : 0), 4, 3, '#5a2d0c'); R(x + f(6, 4), y + 13, 4, 3, '#5a2d0c');
  if (!air && mov) { R(x + f(w ? 1 : 3, 4), y + 11, 4, 3, '#2f55d4'); R(x + f(w ? 7 : 5, 4), y + 11, 4, 3, '#2f55d4'); R(x + f(w ? 0 : 3, 4), y + 14, 5, 2, '#5a2d0c'); R(x + f(w ? 7 : 5, 4), y + 14, 5, 2, '#5a2d0c'); }
  else if (air) { R(x + f(1, 4), y + 11, 4, 3, '#2f55d4'); R(x + f(8, 4), y + 10, 4, 3, '#2f55d4'); R(x + f(0, 5), y + 13, 5, 3, '#5a2d0c'); R(x + f(9, 5), y + 12, 5, 3, '#5a2d0c'); }
  else { R(x + f(2, 3), y + 11, 3, 3, '#2f55d4'); R(x + f(7, 3), y + 11, 3, 3, '#2f55d4'); }
  R(x + f(2, 8), y + 7, 8, 5, '#2f55d4'); R(x + f(1, 10), y + 6, 10, 3, '#e52521');
  R(x + f(0, 3), y + 7 + (air ? -2 : 0), 3, 3, '#ffc49a');
  R(x + f(3, 7), y + 2, 7, 5, '#ffc49a'); R(x + f(2, 8), y, 8, 3, '#e52521'); R(x + f(7, 5), y + 2, 5, 1, '#e52521');
  R(x + f(8, 1), y + 3, 1, 2, '#000'); R(x + f(5, 5), y + 6, 5, 1, '#5a2d0c');
}
function drawE(e) {
  const x = Math.round(e.x), y = Math.round(e.y);
  if (e.dead) { if (e.sp) { R(x, y + 9, 14, 5, '#2a9d3f'); } else { R(x, y + 10, 14, 4, '#b5651d'); R(x + 2, y + 9, 10, 2, '#e0a060'); } return; }
  const w = ((frames >> 3) & 1);
  if (e.sp) { R(x, y + 3, 14, 9, '#2a9d3f'); R(x + 3, y + 5, 3, 3, '#7be08e'); R(x + 8, y + 5, 3, 3, '#7be08e'); for (let i = 0; i < 3; i++) { R(x + 1 + i * 5, y, 2, 3, '#fff'); R(x + 2 + i * 5, y - 2, 1, 2, '#fff'); } R(x + (e.vx < 0 ? -2 : 12), y + 6, 4, 5, '#ffd9a0'); R(x + 1, y + 12, 4, 2 - w, '#2a2a2a'); R(x + 9, y + 12, 4, 1 + w, '#2a2a2a'); }
  else { R(x + 2, y, 10, 3, '#a85a18'); R(x, y + 3, 14, 6, '#b5651d'); R(x + 3, y + 9, 8, 3, '#f0c8a0'); R(x + 2, y + 4, 4, 4, '#fff'); R(x + 8, y + 4, 4, 4, '#fff'); R(x + 4, y + 5, 2, 2, '#000'); R(x + 8, y + 5, 2, 2, '#000'); R(x + 1 + w, y + 11, 5, 3, '#3a1d0a'); R(x + 8 - w, y + 11, 5, 3, '#3a1d0a'); }
}
function cloud(x, y, s) { const c = '#ffffff'; CI(x, y, 7 * s, c); CI(x + 9 * s, y - 3 * s, 9 * s, c); CI(x + 19 * s, y, 7 * s, c); R(x, y, 19 * s, 7 * s, c); }
function drw() {
  GR(0, H, '#5c94fc', '#b8e6ff');
  for (let i = 0; i < 7; i++) cloud(((i * 150 - cam * 0.25) % (W + 160) + W + 160) % (W + 160) - 60, 40 + (i * 37) % 50, 1 + (i % 2) * 0.4);
  for (let i = 0; i < 6; i++) { const hx = ((i * 190 - cam * 0.5) % (W + 220) + W + 220) % (W + 220) - 90, hh = 34 + (i % 3) * 14; X.fillStyle = '#4fb85a'; X.beginPath(); X.ellipse(hx, 184, 70, hh, 0, Math.PI, 0); X.fill(); X.fillStyle = '#3d9a48'; X.beginPath(); X.ellipse(hx + 22, 184, 24, hh * 0.5, 0, Math.PI, 0); X.fill(); }
  X.save(); X.translate(-Math.floor(cam), OY);
  const t0 = Math.floor(cam / TS), t1 = t0 + 25;
  for (let ty = 0; ty < LH; ty++) for (let tx = t0; tx <= t1 && tx < LW; tx++) { const t = M[ty][tx]; if (t) tile(t, tx * TS, ty * TS, ty); }
  /* bandeira */
  R(FX * TS + 7, 2 * TS, 2, 8 * TS, '#e8e8e8'); CI(FX * TS + 8, 2 * TS - 2, 3, '#ffd23c');
  X.fillStyle = '#e52521'; X.beginPath(); X.moveTo(FX * TS + 7, 2 * TS + 2 + flagY); X.lineTo(FX * TS - 9, 2 * TS + 8 + flagY); X.lineTo(FX * TS + 7, 2 * TS + 14 + flagY); X.fill();
  coins.forEach((c) => { if (c.g || c.x < cam - 10 || c.x > cam + W) return; const w = Math.abs(Math.cos(frames * 0.12 + c.x)) * 4 + 1; R(c.x + 4 - w, c.y, w * 2, 12, '#ffd23c'); R(c.x + 4 - w + 1, c.y + 1, Math.max(1, w * 2 - 3), 10, '#f4a800'); });
  E.forEach((e) => { if (e.x > cam - 20 && e.x < cam + W + 20) drawE(e); });
  pops.forEach((o) => { if (o.l > 0) { const w = Math.abs(Math.cos(o.l * 0.5)) * 4 + 1; R(o.x + 4 - w, o.y, w * 2, 12, '#ffd23c'); } });
  parts.forEach((o) => { if (o.l > 0) R(o.x, o.y, 5, 5, '#d0622c'); });
  if (st !== 'title' && p) drawP();
  X.restore();
  /* HUD */
  R(0, 0, W, OY, '#101426'); R(0, OY - 1, W, 1, '#3b4a74');
  T('TEMPEST x' + lives, 8, 4, '#fff', 9); T('MOEDAS ' + String(nCoins).padStart(2, '0'), 84, 4, '#ffd23c', 9); T('PONTOS ' + pad6(score), 160, 4, '#fff', 9); T('TEMPO ' + String(time).padStart(3, '0'), 250, 4, '#fff', 9);
  T('RECORDE ' + pad6(hi), 8, 14, '#8fa0cf', 8);
  if (st === 'title') {
    R(0, OY, W, H - OY, 'rgba(10,12,40,.45)');
    T('SUPER', W / 2, 60, '#ffe066', 30, 'center'); T('TEMPEST BROS', W / 2, 92, '#ff5a5a', 26, 'center');
    if (blink()) T('APERTE A OU START', W / 2, 150, '#fff', 12, 'center');
    T('A pula  •  B corre  •  pise nos inimigos', W / 2, 176, '#cfe0ff', 8, 'center');
  } else if (st === 'over') { R(0, 70, W, 70, 'rgba(0,0,0,.7)'); T('FIM DE JOGO', W / 2, 84, '#ff5a5a', 22, 'center'); T('PONTOS ' + pad6(score), W / 2, 112, '#fff', 11, 'center'); if (tmr > 40 && blink()) T('APERTE A', W / 2, 126, '#ffe066', 10, 'center'); }
  else if (st === 'clear') { T('FASE COMPLETA!', W / 2, 70, '#ffe066', 20, 'center'); if (tmr > 160 && time <= 0 && blink()) T('APERTE A PARA CONTINUAR', W / 2, 98, '#fff', 10, 'center'); }
}
newP(); run({ update: upd, draw: drw });
