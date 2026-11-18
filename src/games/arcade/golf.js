/* GOLF TEMPEST — mini golfe 3D com 3 buracos, paredes, obstáculos e moinho */
const HOLES = [
  { par: 3, tee: [0, 3], cup: [0, 28], fl: [[-5, 0, 5, 32]], w: [[-5.5, 16, 1, 33], [5.5, 16, 1, 33], [0, 32.5, 12, 1], [0, -0.5, 12, 1], [-2.4, 14, 2.6, 1.2], [2.6, 20, 2.6, 1.2]] },
  { par: 4, tee: [0, 3], cup: [24, 19], fl: [[-5, 0, 5, 22], [5, 14, 28, 24]], w: [[-5.5, 11.25, 1, 23.5], [0, -0.5, 12, 1], [5.5, 6.5, 1, 14], [16.5, 13.5, 24, 1], [0, 22.5, 12, 1], [16.5, 24.5, 24, 1], [28.5, 19, 1, 12], [14, 19, 1.6, 3.6]] },
  { par: 3, tee: [0, 3], cup: [0, 35], fl: [[-4, 0, 4, 38]], w: [[-4.5, 19, 1, 39], [4.5, 19, 1, 39], [0, 38.5, 10, 1], [0, -0.5, 10, 1], [0, 19, 1.4, 1.4]], mill: [0, 19] }
];
const BR = 0.26, FR = 0.987;
let st = 'title', hi_ = 0, hole = 0, b, aim = 0, pw = 0, pd = 1, charge = 0, strokes = 0, scores = [], tmr = 0, tv = 0, msg = '', msgT = 0, sunk = 0;
function load() { const h = HOLES[hole]; b = { x: h.tee[0], z: h.tee[1], vx: 0, vz: 0 }; aim = 0; strokes = 0; st = 'aim'; sunk = 0; Cam.x = b.x; Cam.z = b.z - 12; Cam.y = 6; Cam.yaw = 0; }
function mill(t) { const h = HOLES[hole]; if (!h.mill) return []; const o = [], a = t * 0.022; for (const r of [-4, -3, -2, -1, 1, 2, 3, 4]) o.push({ x: h.mill[0] + Math.cos(a) * r, z: h.mill[1] + Math.sin(a) * r, vx: -Math.sin(a) * r * 0.022, vz: Math.cos(a) * r * 0.022 }); return o; }
function step() {
  const h = HOLES[hole], sp = Math.hypot(b.vx, b.vz), n = Math.max(1, Math.ceil(sp / 0.12));
  for (let i = 0; i < n; i++) {
    b.x += b.vx / n; b.z += b.vz / n;
    h.w.forEach((w) => { const hx = w[2] / 2, hz = w[3] / 2, cx = clamp(b.x, w[0] - hx, w[0] + hx), cz = clamp(b.z, w[1] - hz, w[1] + hz); let dx = b.x - cx, dz = b.z - cz, d = Math.hypot(dx, dz); if (d < BR) { if (d < 1e-6) { dx = b.x - w[0]; dz = b.z - w[1]; d = Math.hypot(dx, dz) || 1; } const nx = dx / d, nz = dz / d; b.x = cx + nx * BR * 1.01; b.z = cz + nz * BR * 1.01; const vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= 1.85 * vn * nx; b.vz -= 1.85 * vn * nz; if (sp > 0.05) snd(300, 0.04, 'square', 0.04, 150); } } });
    mill(frames).forEach((c) => { const dx = b.x - c.x, dz = b.z - c.z, d = Math.hypot(dx, dz); if (d < BR + 0.5) { const nx = dx / d, nz = dz / d; b.x = c.x + nx * (BR + 0.52); b.z = c.z + nz * (BR + 0.52); const vn = (b.vx - c.vx) * nx + (b.vz - c.vz) * nz; if (vn < 0) { b.vx -= 1.9 * vn * nx; b.vz -= 1.9 * vn * nz; snd(220, 0.06, 'square', 0.04, 120); } } });
  }
  b.vx *= FR; b.vz *= FR;
  const cd = Math.hypot(b.x - h.cup[0], b.z - h.cup[1]), s2 = Math.hypot(b.vx, b.vz);
  if (cd < 0.5 && s2 < 0.32) { sunk = 1; st = 'sunk'; tmr = 0; b.x = h.cup[0]; b.z = h.cup[1]; b.vx = b.vz = 0; scores[hole] = strokes; msg = strokes === 1 ? 'HOLE IN ONE!' : strokes < h.par ? 'BIRDIE!' : strokes === h.par ? 'PAR!' : 'NA CAÇAPA!'; msgT = 140; snd(660, 0.1, 'triangle', 0.06); snd(990, 0.3, 'triangle', 0.06); }
  else if (s2 < 0.006) { b.vx = b.vz = 0; if (strokes >= 7) { scores[hole] = 7; st = 'sunk'; tmr = 0; msg = 'LIMITE DE 7 TACADAS'; msgT = 120; } else st = 'aim'; }
}
function upd() {
  if (st === 'title') { if (go()) { hole = 0; scores = []; load(); } return; }
  if (st === 'final') { if (++tmr > 70 && go()) st = 'title'; return; }
  if (msgT > 0) msgT--;
  if (st === 'sunk') { if (++tmr > 140) { hole++; if (hole >= HOLES.length) { st = 'final'; tmr = 0; const tot = scores.reduce((a, c) => a + c, 0), par = HOLES.reduce((a, c) => a + c.par, 0); saveHi(Math.max(0, 100 - (tot - par) * 10)); } else load(); } return; }
  if (P.b) tv = 1 - tv;
  if (st === 'aim') {
    const ax = (K.r ? 1 : 0) - (K.l ? 1 : 0); aim += ax * (0.012 + Math.min(0.02, charge * 0.0003)); charge = ax ? charge + 1 : 0;
    if (K.a) { pw += 0.018 * pd; if (pw >= 1) { pw = 1; pd = -1; } if (pw <= 0.04) { pw = 0.04; pd = 1; } }
    else if (pw > 0) { b.vx = Math.sin(aim) * (0.06 + pw * 0.8); b.vz = Math.cos(aim) * (0.06 + pw * 0.8); strokes++; st = 'roll'; snd(500, 0.12, 'triangle', 0.07, 200); pw = 0; pd = 1; }
  } else if (st === 'roll') step();
  const k = Math.hypot(b.vx, b.vz); if (st === 'roll' && k > 0.02) { /* câmera mantém a mira */ }
  if (tv) { Cam.x += (b.x - Cam.x) * 0.1; Cam.z += (b.z - 4 - Cam.z) * 0.1; Cam.y += (36 - Cam.y) * 0.1; Cam.yaw += angd(0, Cam.yaw) * 0.1; Cam.pitch = -1.25; }
  else follow(b.x + Math.sin(aim) * 3, 0, b.z + Math.cos(aim) * 3, aim, 11, 5.4, 0.1, 0.4);
}
function drw() {
  camBegin(); FOG.n = 40; FOG.f = 170; AMB = 0.58; sky('#4a9aef', '#cfeaff', '#4ea850'); const h = HOLES[hole] || HOLES[0];
  poly([[Cam.x - 300, -0.05, Cam.z - 300], [Cam.x - 300, -0.05, Cam.z + 300], [Cam.x + 300, -0.05, Cam.z + 300], [Cam.x + 300, -0.05, Cam.z - 300]], [64, 150, 70], [0, 1, 0], 0);
  h.fl.forEach((f) => { for (let z = f[1]; z < f[3]; z += 2) for (let x = f[0]; x < f[2]; x += 2) poly([[x, 0, z], [x, 0, Math.min(z + 2, f[3])], [Math.min(x + 2, f[2]), 0, Math.min(z + 2, f[3])], [Math.min(x + 2, f[2]), 0, z]], ((x + z) / 2 & 1) ? [92, 200, 96] : [84, 190, 88], [0, 1, 0], 0); });
  h.w.forEach((w) => box(w[0], 0, w[1], w[2], 0.9, w[3], hex2('#b8824a')));
  if (h.mill) { box(h.mill[0], 0, h.mill[1], 1.4, 3.2, 1.4, hex2('#e8e0d0')); mill(frames).forEach((c, i) => box(c.x, 2.6 + (c.x - h.mill[0]) * 0.0, c.z, 1.1, 0.5, 1.1, hex2(i % 2 ? '#e03030' : '#f4f4f4'))); }
  const cx = h.cup[0], cz = h.cup[1]; for (let i = 0; i < 8; i++) { const a0 = i / 8 * 6.28, a1 = (i + 1) / 8 * 6.28; poly([[cx, 0.02, cz], [cx + Math.cos(a0) * 0.5, 0.02, cz + Math.sin(a0) * 0.5], [cx + Math.cos(a1) * 0.5, 0.02, cz + Math.sin(a1) * 0.5]], [15, 20, 15], [0, 1, 0], 1, true); }
  box(cx, 0, cz, 0.08, 3, 0.08, hex2('#f4f4f4')); poly([[cx, 3, cz], [cx + 1.3, 2.6, cz], [cx, 2.2, cz]], [230, 40, 50], null, 2, true);
  for (let i = 0; i < 14; i++) { const tx = (i % 2 ? 1 : -1) * (12 + (i * 7) % 9) + (hole === 1 ? 14 : 0), tz = i * 3.2; cyl(tx, 0, tz, 0.3, 2, hex2('#7a5a3a'), 5); cyl(tx, 1.6, tz, 1.9, 3.4, hex2('#2e8b3c'), 6, 0); }
  if (b && st !== 'title') { sph(b.x, BR, b.z, BR, hex2('#ffffff'), 4); shadow(b.x, 0, b.z, 0.3);
    if (st === 'aim') { const len = 2 + pw * 7; for (let i = 1; i <= 8; i++) { const d = i * len / 8; sprite(b.x + Math.sin(aim) * (0.8 + d), 0.1, b.z + Math.cos(aim) * (0.8 + d), (sx, sy, s) => { X.fillStyle = 'rgba(255,240,120,.9)'; X.fillRect(sx - 1.5, sy - 1.5, 3, 3); }); } } }
  flush();
  if (st !== 'title') { T('BURACO ' + (hole + 1) + '/' + HOLES.length, 8, 4, '#fff', 10); T('PAR ' + h.par + '   TACADAS ' + strokes, 8, 16, '#ffe066', 9); T('TOTAL ' + scores.reduce((a, c) => a + (c || 0), 0), 8, 27, '#cfe0ff', 8);
    if (st === 'aim') { R(W / 2 - 52, H - 16, 104, 8, '#101426'); R(W / 2 - 51, H - 15, 102 * pw, 6, pw < 0.5 ? '#38e060' : pw < 0.8 ? '#ffd23c' : '#ff4a4a'); T('SEGURE A E SOLTE', W / 2, H - 28, '#fff', 8, 'center'); } }
  if (msgT > 0) T(msg, W / 2, 50, '#ffe066', 18, 'center');
  if (st === 'title') { Cam.yaw = 0.3; Cam.x = -8; Cam.z = -12; Cam.y = 7; Cam.pitch = -0.2; R(0, 40, W, 100, 'rgba(10,50,20,.55)'); T('GOLF TEMPEST', W / 2, 50, '#ffffff', 26, 'center'); if (blink()) T('APERTE A OU START', W / 2, 96, '#ffe066', 12, 'center'); T('← → mira • segure A e solte para bater • B muda a câmera', W / 2, 118, '#e0ffe0', 8, 'center'); T('3 buracos: obstáculos e um moinho giratório', W / 2, 129, '#e0ffe0', 8, 'center'); }
  if (st === 'final') { const tot = scores.reduce((a, c) => a + c, 0), par = HOLES.reduce((a, c) => a + c.par, 0); R(0, 56, W, 96, 'rgba(0,0,0,.7)'); T('RESULTADO', W / 2, 66, '#5aff9a', 20, 'center'); scores.forEach((s, i) => T('Buraco ' + (i + 1) + ': ' + s + ' (par ' + HOLES[i].par + ')', W / 2, 92 + i * 11, '#fff', 9, 'center')); T('TOTAL ' + tot + ' • ' + (tot - par === 0 ? 'NO PAR' : tot - par < 0 ? (par - tot) + ' ABAIXO' : (tot - par) + ' ACIMA'), W / 2, 128, '#ffe066', 10, 'center'); if (tmr > 70 && blink()) T('APERTE A', W / 2, 142, '#ffe066', 9, 'center'); }
}
b = { x: 0, z: 3, vx: 0, vz: 0 }; run({ update: upd, draw: drw });
