/* TEMPEST 64 — plataforma 3D: colete 5 estrelas numa ilha flutuante */
const S = [], MV = [], coins = [], goombas = [], trees = [];
const GRN = hex2('#52b84e'), STN = hex2('#c9b99a'), WOD = hex2('#b07a4a'), PNK = hex2('#e07ab0'), BLU = hex2('#5aa0e0');
function add(x, y, z, w, h, d, c, mv) { const s = { cx: x, y: y, cz: z, w: w, h: h, d: d, c: c, dx: 0, dz: 0, mv: mv }; S.push(s); if (mv) MV.push(s); return s; }
add(0, -3, 0, 44, 3, 44, GRN);
for (let i = 0; i < 14; i++) { const a = i * 0.55 + 0.6, top = 1.1 * (i + 1); add(Math.cos(a) * 12, top - 0.8, Math.sin(a) * 12, i === 13 ? 6 : 3.6, 0.8, i === 13 ? 6 : 3.6, i % 2 ? STN : PNK); }
[[19, 2, 0, 3], [23, 3.2, 3, 2.6], [27, 4.4, -1, 2.4], [31, 5.6, 2, 2.2], [36, 6.8, 0, 4.5]].forEach((q) => add(q[0], q[1] - 0.6, q[2], q[3], 0.6, q[3], BLU));
add(-25, -0.4, 0, 6, 0.9, 6, STN); add(-33, -0.4, 0, 4, 0.9, 4, WOD, (s, t) => { s.cx = -33 + Math.sin(t * 0.03) * 5; }); add(-43, -0.4, 0, 5, 0.9, 5, STN);
[[0, 0, 22, 4, 1, 2], [0, 0, 25, 4, 2, 2], [0, 0, 28, 4, 3, 2]].forEach((q) => add(q[0], q[1], q[2], q[3], q[4], q[5], STN)); add(0, 2.2, 34, 12, 0.8, 10, PNK);
for (let i = 0; i < 30; i++) { const a = i * 2.4, r = 6 + (i * 7) % 14; if (i < 14) trees.push({ x: Math.cos(a) * (r + 6), z: Math.sin(a) * (r + 6) }); }
const trs = trees.filter((t) => Math.hypot(t.x, t.z) < 19 && Math.hypot(t.x - 12 * Math.cos(0), t.z) > 5);
for (let i = 0; i < 24; i++) { const a = i * 1.9 + 0.5, r = 3 + (i * 5) % 14; coins.push({ x: Math.cos(a) * r, y: 0.9, z: Math.sin(a) * r, g: 0 }); }
for (let i = 0; i < 5; i++) coins.push({ x: 19 + i * 4, y: 3.5 + i * 1.2, z: i % 2 ? 3 : 0, g: 0 });
const STARS = [{ x: Math.cos(13 * 0.55 + 0.6) * 12, y: 16.6, z: Math.sin(13 * 0.55 + 0.6) * 12, g: 0 }, { x: 36, y: 8.4, z: 0, g: 0 }, { x: 0, y: 4.6, z: 34, g: 0 }, { x: -43, y: 1.9, z: 0, g: 0 }, { x: 0, y: 1.6, z: -2, g: 0, hid: 1 }];
[[-3, 34], [3, 35], [-2, 38], [4, 31]].forEach((q) => goombas.push({ x: q[0], y: 3, z: q[1], cx: q[0], cz: q[1], a: q[0], dead: 0 }));
[[-9, 6], [10, -8], [-12, -10]].forEach((q) => goombas.push({ x: q[0], y: 0, z: q[1], cx: q[0], cz: q[1], a: q[0], dead: 0 }));
let st = 'title', p, nStars = 0, nCoins = 0, hp = 3, hit = 0, atk = 0, msg = '', msgT = 0, tmr = 0;
const R0 = 0.45;
function reset() { p = { x: 0, y: 0.1, z: -8, vy: 0, yaw: 0, sp: 0, g: 1, jc: 0, jt: 0, inv: 0, wk: 0, jb: 0 }; Cam.x = 0; Cam.y = 5; Cam.z = -15; Cam.yaw = 0; }
function newGame() { STARS.forEach((s) => { s.g = 0; }); STARS[4].hid = 1; coins.forEach((c) => c.g = 0); goombas.forEach((g) => g.dead = 0); nStars = 0; nCoins = 0; hp = 3; reset(); st = 'play'; }
function note(t) { msg = t; msgT = 120; }
function hurt(kx, kz) { if (p.inv > 0) return; hp--; p.inv = 100; p.vy = 0.3; p.g = 0; const d = Math.hypot(p.x - kx, p.z - kz) || 1; p.x += (p.x - kx) / d * 1.2; p.z += (p.z - kz) / d * 1.2; snd(200, 0.3, 'sawtooth', 0.06, 60); if (hp <= 0) { st = 'over'; tmr = 0; } }
function upd() {
  if (st === 'title') { if (go()) newGame(); return; }
  if (st === 'over' || st === 'win') { if (++tmr > 60 && go()) st = 'title'; return; }
  const t = frames; MV.forEach((s) => { const ox = s.cx, oz = s.cz; s.mv(s, t); s.dx = s.cx - ox; s.dz = s.cz - oz; });
  if (K.l) p.yaw -= 0.06; if (K.r) p.yaw += 0.06;
  const tgt = K.u ? 0.17 : K.d ? -0.08 : 0; p.sp += (tgt - p.sp) * (tgt ? 0.12 : 0.18); if (Math.abs(p.sp) < 0.005) p.sp = 0;
  p.x += Math.sin(p.yaw) * p.sp; p.z += Math.cos(p.yaw) * p.sp; p.wk += Math.abs(p.sp) * 2.2;
  S.forEach((s) => { const top = s.y + s.h; if (p.y + 1.0 <= s.y || p.y >= top - 0.3) return; const hx = s.w / 2 + R0, hz = s.d / 2 + R0, dx = p.x - s.cx, dz = p.z - s.cz; if (Math.abs(dx) < hx && Math.abs(dz) < hz) { const ox = hx - Math.abs(dx), oz = hz - Math.abs(dz); if (ox < oz) p.x = s.cx + (dx < 0 ? -hx : hx); else p.z = s.cz + (dz < 0 ? -hz : hz); } });
  let gy = -99, on = null;
  S.forEach((s) => { const top = s.y + s.h; if (Math.abs(p.x - s.cx) < s.w / 2 + 0.2 && Math.abs(p.z - s.cz) < s.d / 2 + 0.2 && top <= p.y + 0.35 && top > gy) { gy = top; on = s; } });
  if (p.g && on) { p.x += on.dx; p.z += on.dz; }
  p.jb = P.a ? 6 : p.jb - 1; p.jt--;
  if (p.jb > 0 && p.g) { p.jc = p.jt > 0 ? (p.jc + 1) % 3 : 0; p.vy = [0.38, 0.44, 0.56][p.jc]; p.g = 0; p.jt = 30; p.jb = 0; snd(330 + p.jc * 120, 0.2, 'square', 0.05, 800 + p.jc * 200); }
  p.vy -= 0.022; if (K.a && p.vy > 0) p.vy += 0.004; p.y += p.vy; p.g = 0;
  if (p.y <= gy && p.vy <= 0) { p.y = gy; p.vy = 0; p.g = 1; if (p.jt < 0) p.jc = 0; }
  if (p.y < -7) { hp--; if (hp <= 0) { st = 'over'; tmr = 0; } else { reset(); p.inv = 100; snd(150, 0.4, 'sawtooth', 0.06, 50); } }
  if (p.inv > 0) p.inv--; if (atk > 0) atk--;
  if (P.b && atk === 0) { atk = 22; snd(500, 0.1, 'triangle', 0.05, 200); }
  goombas.forEach((g) => {
    if (g.dead) { g.dead--; return; }
    g.a += 0.02; g.x = g.cx + Math.cos(g.a * 1.3) * 3; g.z = g.cz + Math.sin(g.a * 1.3) * 3;
    const d = Math.hypot(p.x - g.x, p.z - g.z);
    if (atk > 8 && d < 2.2) { g.dead = 40; nCoins++; snd(180, 0.12, 'square', 0.06, 700); return; }
    if (d < 0.95 && Math.abs(p.y - g.y) < 1.1) { if (p.vy < -0.05 && p.y > g.y + 0.35) { g.dead = 40; p.vy = 0.34; nCoins++; snd(220, 0.15, 'square', 0.06, 800); } else hurt(g.x, g.z); }
  });
  coins.forEach((c) => { if (!c.g && Math.hypot(p.x - c.x, p.z - c.z) < 1 && Math.abs(p.y + 0.6 - c.y) < 1.2) { c.g = 1; nCoins++; snd(1175, 0.05, 'square', 0.04); snd(1568, 0.12, 'square', 0.04); } });
  if (nCoins >= 20 && STARS[4].hid) { STARS[4].hid = 0; note('UMA ESTRELA APARECEU!'); snd(660, 0.5, 'triangle', 0.07, 1320); }
  STARS.forEach((s) => { if (!s.g && !s.hid && Math.hypot(p.x - s.x, p.z - s.z) < 1.3 && Math.abs(p.y + 0.8 - s.y) < 1.6) { s.g = 1; nStars++; note('ESTRELA ' + nStars + '/5!'); snd(784, 0.1, 'square', 0.06); snd(1047, 0.1, 'square', 0.06); snd(1568, 0.4, 'square', 0.06); if (nStars >= 5) { st = 'win'; tmr = 0; saveHi(1000 + hp * 100 + nCoins); } } });
  if (msgT > 0) msgT--;
  follow(p.x, p.y, p.z, p.yaw, 7.5, 4.2, 0.1, 1.6);
}
function drawPlayer() {
  if (p.inv > 0 && (frames >> 2) & 1) return;
  const y = p.yaw, c = Math.cos(y), s = Math.sin(y), sw = Math.sin(p.wk) * 0.28 * Math.min(1, Math.abs(p.sp) * 8), R = (x, z) => [p.x + x * c + z * s, p.z - x * s + z * c];
  shadow(p.x, Math.max(0, p.g ? p.y : 0), p.z, 0.5);
  [-1, 1].forEach((k) => { const q = R(k * 0.2, k * sw); box(q[0], p.y, q[1], 0.28, 0.4, 0.34, hex2('#2f55d4'), y); box(q[0], p.y, q[1], 0.3, 0.12, 0.42, hex2('#5a2d0c'), y); });
  box(p.x, p.y + 0.4, p.z, 0.7, 0.55, 0.42, hex2('#2f55d4'), y); box(p.x, p.y + 0.72, p.z, 0.7, 0.3, 0.42, hex2('#e52521'), y);
  [-1, 1].forEach((k) => { const q = R(k * 0.45, -k * sw * 0.8); box(q[0], p.y + 0.55, q[1], 0.18, 0.4, 0.2, hex2('#f0c090'), y); });
  sph(p.x, p.y + 1.25, p.z, 0.3, hex2('#f0c090'), 5); const cap = R(0, 0.12); box(cap[0], p.y + 1.42, cap[1], 0.62, 0.2, 0.62, hex2('#e52521'), y); const br = R(0, 0.38); box(br[0], p.y + 1.4, br[1], 0.5, 0.08, 0.3, hex2('#e52521'), y);
  if (atk > 0) { const r = (22 - atk) / 22 * 2.2; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + frames * 0.4; sprite(p.x + Math.cos(a) * r, p.y + 0.6, p.z + Math.sin(a) * r, (sx, sy, sc) => { X.fillStyle = 'rgba(255,255,255,.8)'; X.fillRect(sx - 1.5, sy - 1.5, 3, 3); }); } }
}
function drw() {
  camBegin(); FOG.n = 30; FOG.f = 130; AMB = 0.52; sky('#2f6fd0', '#bfe4ff', '#bfe4ff');
  const lv = 190 + Math.sin(frames * 0.05) * 20; poly([[-120, -8, -120], [-120, -8, 120], [120, -8, 120], [120, -8, -120]], [lv, 70, 20], [0, 1, 0], 0);
  S.forEach((s) => box(s.cx, s.y, s.cz, s.w, s.h, s.d, s.c));
  trs.forEach((t) => { cyl(t.x, 0, t.z, 0.25, 1.6, WOD, 5); cyl(t.x, 1.4, t.z, 1.3, 2.2, hex2('#2e8b3c'), 6, 0); });
  box(0, 0, 14, 2.2, 3.2, 2.2, STN); box(0, 3.2, 14, 3, 0.8, 3, hex2('#c0453a'));
  goombas.forEach((g) => {
    if (g.dead > 0) { cyl(g.x, g.y, g.z, 0.5, 0.15, hex2('#8a4a1a'), 7); return; } if (g.dead < 0) return;
    shadow(g.x, g.y, g.z, 0.5); const w = Math.sin(g.a * 12) * 0.08, ya = Math.atan2(-Math.sin(g.a * 1.3), Math.cos(g.a * 1.3));
    cyl(g.x, g.y + 0.15 + w, g.z, 0.52, 0.5, hex2('#8a4a1a'), 7, 0.36); cyl(g.x, g.y, g.z, 0.34, 0.2, hex2('#3a1d0a'), 6);
    const fx = Math.sin(ya) * 0.35, fz = Math.cos(ya) * 0.35; sprite(g.x + fx, g.y + 0.55, g.z + fz, (sx, sy, s) => { X.fillStyle = '#fff'; X.fillRect(sx - 4 * s * 0.5, sy, 3 * s * 0.5, 3 * s * 0.5); X.fillRect(sx + 1 * s * 0.5, sy, 3 * s * 0.5, 3 * s * 0.5); });
  });
  coins.forEach((c) => { if (c.g) return; shadow(c.x, 0, c.z, 0.2); sprite(c.x, c.y + Math.sin(frames * 0.08 + c.x) * 0.15, c.z, (sx, sy, s) => { const w = Math.abs(Math.cos(frames * 0.1 + c.x)) * 0.28 * s + 1; X.fillStyle = '#ffd23c'; X.beginPath(); X.ellipse(sx, sy, w, 0.38 * s, 0, 0, 7); X.fill(); X.fillStyle = '#f4a800'; X.beginPath(); X.ellipse(sx, sy, w * 0.5, 0.26 * s, 0, 0, 7); X.fill(); }); });
  STARS.forEach((s) => { if (s.g || s.hid) return; sprite(s.x, s.y + Math.sin(frames * 0.07) * 0.25, s.z, (sx, sy, sc) => { const r = 0.7 * sc; X.fillStyle = 'rgba(255,240,120,.3)'; X.beginPath(); X.arc(sx, sy, r * 1.5, 0, 7); X.fill(); X.fillStyle = '#ffe14a'; X.strokeStyle = '#a06a00'; X.lineWidth = 1; X.beginPath(); for (let i = 0; i < 10; i++) { const a = -1.57 + i * 0.628 + frames * 0.03, rr = i % 2 ? r * 0.45 : r; X.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } X.closePath(); X.fill(); X.stroke(); }); });
  if (st !== 'title') drawPlayer();
  flush();
  if (st !== 'title') { heartsHud(hp, 3); T('★ ' + nStars + '/5', 70, 4, '#ffe14a', 11); T('● ' + nCoins, 130, 4, '#ffd23c', 11); T('RECORDE ' + pad6(hi), 8, 18, '#cfe0ff', 8); }
  if (msgT > 0) T(msg, W / 2, 40, '#ffe14a', 14, 'center');
  if (st === 'title') { Cam.yaw += 0.004; Cam.x = Math.sin(Cam.yaw + 3.14) * 20; Cam.z = Math.cos(Cam.yaw + 3.14) * 20; Cam.y = 9; Cam.pitch = -0.25; R(0, 40, W, 110, 'rgba(10,20,60,.55)'); T('TEMPEST 64', W / 2, 52, '#ffe14a', 30, 'center'); if (blink()) T('APERTE A OU START', W / 2, 100, '#fff', 12, 'center'); T('← → gira • ↑ corre • A pula (3 pulos seguidos = pulo mortal)', W / 2, 124, '#cfe0ff', 8, 'center'); T('B ataque giratório • pise nos inimigos', W / 2, 136, '#cfe0ff', 8, 'center'); }
  if (st === 'over') { R(0, 70, W, 70, 'rgba(0,0,0,.7)'); T('FIM DE JOGO', W / 2, 84, '#ff5a5a', 22, 'center'); T('ESTRELAS ' + nStars + '/5', W / 2, 112, '#fff', 11, 'center'); if (tmr > 60 && blink()) T('APERTE A', W / 2, 126, '#ffe066', 10, 'center'); }
  if (st === 'win') { R(0, 70, W, 70, 'rgba(0,0,0,.7)'); T('TODAS AS ESTRELAS!', W / 2, 84, '#ffe14a', 20, 'center'); T('MOEDAS ' + nCoins + '  VIDAS ' + hp, W / 2, 112, '#fff', 11, 'center'); if (tmr > 60 && blink()) T('APERTE A', W / 2, 126, '#fff', 10, 'center'); }
}
reset(); run({ update: upd, draw: drw });
