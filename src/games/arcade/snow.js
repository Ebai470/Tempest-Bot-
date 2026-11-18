/* SNOW RUSH — snowboard 3D: desça a montanha, passe pelas bandeiras, pule rampas e desvie das árvores */
const SL = 0.24, GOAL = 2400;
const hs = (x, z) => -z * SL + Math.sin(x * 0.2 + z * 0.05) * 0.25 + Math.max(0, Math.abs(x) - 24) * 1.1;
let st = 'title', p, trees = [], gates = [], ramps = [], nz = 0, score = 0, time = 0, tmr = 0, stun = 0, msg = '', msgT = 0, trick = 0, tricks = 0, combo = 0, flash = 0, rot = 0;
const rr = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
function reset() { p = { x: 0, z: 0, vx: 0, vz: 0.5, oy: 0, vy: 0, air: 0 }; trees = []; gates = []; ramps = []; nz = 20; score = 0; time = 0; stun = 0; combo = 0; tricks = 0; Cam.x = 0; Cam.z = -10; Cam.y = 6; Cam.yaw = 0; st = 'play'; }
function gen() { while (nz < p.z + 170) { for (let i = 0; i < 2; i++) if (rr() < 0.8) { const x = (rr() - 0.5) * 50; if (Math.abs(x) > 3.5 || nz > 60) trees.push({ x: x, z: nz + rr() * 10, s: 0.8 + rr() }); } if (((nz / 10) | 0) % 7 === 0) gates.push({ x: (rr() - 0.5) * 16, z: nz, ok: 0, done: 0 }); if (((nz / 10) | 0) % 12 === 5) ramps.push({ x: (rr() - 0.5) * 14, z: nz, used: 0 }); nz += 10; } }
function note(t) { msg = t; msgT = 70; }
function upd() {
  if (st === 'title') { if (go()) reset(); return; }
  if (st === 'over' || st === 'win') { if (++tmr > 70 && go()) st = 'title'; return; }
  gen(); time++; if (msgT > 0) msgT--; if (flash > 0) flash--; if (stun > 0) stun--;
  const ax = (K.r ? 1 : 0) - (K.l ? 1 : 0);
  if (!stun) { p.vx += ax * (p.air ? 0.006 : 0.03); }
  p.vx *= p.air ? 0.99 : 0.93; const cap = K.b ? 0.5 : 1.35; p.vz += ((stun ? 0.3 : cap) - p.vz) * (K.b ? 0.05 : 0.012);
  p.x = clamp(p.x + p.vx, -27, 27); p.z += p.vz;
  if (p.air) { p.vy -= 0.026; p.oy += p.vy; if (K.a && !trick) { trick = 1; } if (trick) rot += 0.3; if (p.oy <= 0) { p.oy = 0; p.air = 0; if (trick && rot > 5) { tricks++; score += 200 + combo * 50; note('MANOBRA! +' + (200 + combo * 50)); snd(900, 0.2, 'square', 0.06, 1500); } else if (trick) { stun = 25; note('QUEDA!'); snd(120, 0.3, 'sawtooth', 0.06, 50); } trick = 0; rot = 0; } }
  else if (P.a) { p.air = 1; p.vy = 0.22; p.oy = 0.01; snd(400, 0.12, 'square', 0.04, 700); }
  trees.forEach((t) => { if (!t.hit && Math.abs(t.x - p.x) < 1.2 * t.s && Math.abs(t.z - p.z) < 1 && p.oy < 2) { t.hit = 1; stun = 40; p.vz *= 0.3; combo = 0; flash = 10; snd(110, 0.3, 'sawtooth', 0.07, 40); } });
  ramps.forEach((r) => { if (!r.used && Math.abs(r.x - p.x) < 3.4 && p.z > r.z && p.z < r.z + 3 && !p.air) { r.used = 1; p.air = 1; p.vy = 0.3 + p.vz * 0.12; p.oy = 0.01; snd(300, 0.3, 'triangle', 0.06, 900); } });
  gates.forEach((g) => { if (!g.done && p.z > g.z) { g.done = 1; if (Math.abs(p.x - g.x) < 4.2) { combo++; score += 50 + combo * 10; note('PORTAL x' + combo); snd(700 + combo * 40, 0.1, 'square', 0.04); } else combo = 0; } });
  trees = trees.filter((t) => t.z > p.z - 20); gates = gates.filter((g) => g.z > p.z - 20); ramps = ramps.filter((r) => r.z > p.z - 20);
  score += p.vz * 0.15; if (p.z >= GOAL) { st = 'win'; tmr = 0; score = Math.round(score + Math.max(0, 9000 - time) * 0.2); saveHi(score); snd(784, 0.8, 'square', 0.07, 1568); }
  follow(p.x * 0.8, hs(p.x, p.z) + p.oy, p.z, 0, 8.5, 3.4, 0.14, 1.2);
}
function board(x, y, z, lean) {
  const yw = lean * 0.6 + (trick ? rot : 0); box(x, y, z, 0.5, 0.12, 1.7, hex2('#e8523a'), yw); box(x, y + 0.12, z, 0.45, 0.6, 0.3, hex2('#2a5ad0'), yw); box(x, y + 0.72, z, 0.55, 0.65, 0.35, hex2('#2a5ad0'), yw);
  sph(x, y + 1.35, z, 0.27, hex2('#f0c090'), 5); box(x, y + 1.5, z, 0.5, 0.22, 0.5, hex2('#e8d33a'), yw); [-1, 1].forEach((k) => box(x + Math.cos(yw) * 0.4 * k, y + 0.8 + (trick ? 0.25 : 0), z - Math.sin(yw) * 0.4 * k, 0.14, 0.5, 0.14, hex2('#2a5ad0'), yw));
}
function drw() {
  camBegin(); FOG.n = 40; FOG.f = 170; AMB = 0.62; sky('#6aa8ff', '#eaf4ff', '#eaf4ff');
  terrain(hs, Cam.x, Cam.z + 70, 90, 8, (x, z, h) => { const c = ((Math.floor(x / 8) + Math.floor(z / 8)) & 1) ? 244 : 232; return Math.abs(x) > 25 ? [150 + (h % 7) * 4, 160, 175] : [c, c + 4, 255]; }, 0);
  trees.forEach((t) => { if (t.z < Cam.z - 4 || t.z > Cam.z + 120) return; const y = hs(t.x, t.z); cyl(t.x, y, t.z, 0.25 * t.s, 1.2 * t.s, hex2('#6a4a2a'), 5); [0, 1.2, 2.2].forEach((o, i) => cyl(t.x, y + 1 * t.s + o * t.s * 0.8, t.z, (1.5 - i * 0.4) * t.s, 1.4 * t.s, hex2(i % 2 ? '#2a7a4a' : '#1f6a3c'), 6, 0.05)); shadow(t.x, y, t.z, 1.2 * t.s); });
  gates.forEach((g) => { if (g.z < Cam.z || g.z > Cam.z + 120) return; [-1, 1].forEach((k) => { const x = g.x + k * 3.6, y = hs(x, g.z); box(x, y, g.z, 0.2, 2.6, 0.2, hex2('#333')); box(x + 0.5, y + 1.6, g.z, 1, 0.8, 0.1, g.done ? hex2('#888') : hex2(k < 0 ? '#e03030' : '#3060e0')); }); });
  ramps.forEach((r) => { if (r.z < Cam.z - 4 || r.z > Cam.z + 120) return; const y = hs(r.x, r.z); poly([[r.x - 3, y, r.z], [r.x + 3, y, r.z], [r.x + 3, y + 1.4, r.z + 3], [r.x - 3, y + 1.4, r.z + 3]], [190, 210, 240], null, 2, true); box(r.x - 3, y, r.z, 0.3, 1.4, 3, hex2('#8a9ac0')); box(r.x + 2.7, y, r.z, 0.3, 1.4, 3, hex2('#8a9ac0')); });
  if (p) { const y = hs(p.x, p.z) + p.oy; board(p.x, y, p.z, p.vx * 2); shadow(p.x, hs(p.x, p.z), p.z, 0.8); if (p.z < GOAL && GOAL - p.z < 150) { [-6, 6].forEach((k) => box(k, hs(k, GOAL), GOAL, 0.5, 6, 0.5, hex2('#222'))); box(-6, hs(0, GOAL) + 5, GOAL, 12.5, 1.2, 0.4, hex2('#e03030')); } }
  flush();
  if (flash > 0) R(0, 0, W, H, 'rgba(255,255,255,' + flash / 14 + ')');
  if (st !== 'title') { T('PONTOS ' + pad6(score), 8, 4, '#1a2a50', 10); T('TEMPO ' + (time / 60).toFixed(1), 8, 15, '#1a2a50', 9); T('COMBO x' + combo, 8, 26, combo ? '#c03000' : '#4a5a80', 9); const pr = Math.min(1, p.z / GOAL); R(W - 14, 30, 6, 130, 'rgba(0,0,0,.3)'); R(W - 14, 30 + 126 * (1 - pr), 6, 4, '#ff5a3a'); T(Math.round(p.vz * 55) + ' km/h', W - 8, H - 12, '#1a2a50', 9, 'right'); }
  if (msgT > 0) T(msg, W / 2, 44, '#c03000', 14, 'center');
  if (st === 'title') { Cam.x = 0; Cam.y = 6; Cam.z = 0; Cam.yaw = 0; Cam.pitch = -0.25; R(0, 40, W, 100, 'rgba(10,30,80,.5)'); T('SNOW RUSH', W / 2, 50, '#ffffff', 28, 'center'); if (blink()) T('APERTE A OU START', W / 2, 96, '#ffe066', 12, 'center'); T('← → curva • A pula (segure no ar = manobra) • B freia', W / 2, 118, '#e0f0ff', 8, 'center'); T('passe entre as bandeiras e desvie das árvores', W / 2, 129, '#e0f0ff', 8, 'center'); }
  if (st === 'win') { R(0, 66, W, 76, 'rgba(0,0,0,.65)'); T('CHEGADA!', W / 2, 78, '#5aff9a', 22, 'center'); T('PONTOS ' + pad6(score) + '  MANOBRAS ' + tricks, W / 2, 106, '#fff', 10, 'center'); if (tmr > 70 && blink()) T('APERTE A', W / 2, 122, '#ffe066', 10, 'center'); }
}
p = { x: 0, z: 0, vx: 0, vz: 0.5, oy: 0, vy: 0, air: 0 }; run({ update: upd, draw: drw });
