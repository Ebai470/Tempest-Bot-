/* STAR TEMPEST — tiro 3D nos trilhos: lasers, bombas, inimigos, obstáculos e chefão */
const RSP = 0.9;
let st = 'title', rz = 0, sx = 0, sy = 0, vx = 0, vy = 0, hp = 100, bombs = 3, score = 0, t = 0, en = [], bl = [], eb = [], ob = [], fx = [], boss = null, fire = 0, inv = 0, shake = 0, tmr = 0, msg = '', msgT = 0, flash = 0;
function reset() { rz = 0; sx = 0; sy = 0; vx = 0; vy = 0; hp = 100; bombs = 3; score = 0; t = 0; en = []; bl = []; eb = []; ob = []; fx = []; boss = null; fire = 0; inv = 0; shake = 0; st = 'play'; msg = 'VAMOS!'; msgT = 90; }
const boom = (x, y, z, s) => fx.push({ x: x, y: y, z: z, l: 22, s: s || 1 });
function hurtP(d) { if (inv > 0) return; hp -= d; inv = 50; shake = 12; flash = 8; snd(110, 0.3, 'sawtooth', 0.07, 40); if (hp <= 0) { hp = 0; st = 'over'; tmr = 0; boom(sx, sy, rz, 3); saveHi(score); } }
function spawnEnemy(x, y, z, k) { en.push({ x: x, y: y, z: z, k: k, hp: k === 'f' ? 2 : 1, t: Math.random() * 6, sh: 60 + (Math.random() * 60 | 0) }); }
function shootAt(x, y, z, sp) { const dx = sx - x, dy = sy - y, dz = rz - z + 6, d = Math.hypot(dx, dy, dz) || 1; eb.push({ x: x, y: y, z: z, vx: dx / d * sp, vy: dy / d * sp, vz: dz / d * sp + RSP }); }
function upd() {
  if (st === 'title') { if (go()) reset(); return; }
  if (st === 'over' || st === 'win') { tmr++; rz += RSP * 0.5; fx.forEach((f) => f.l--); fx = fx.filter((f) => f.l > 0); if (tmr > 80 && go()) st = 'title'; return; }
  t++; rz += RSP; if (inv > 0) inv--; if (shake > 0) shake--; if (msgT > 0) msgT--; if (flash > 0) flash--;
  const ax = (K.r ? 1 : 0) - (K.l ? 1 : 0), ay = (K.u ? 1 : 0) - (K.d ? 1 : 0);
  vx += (ax * 0.34 - vx) * 0.15; vy += (ay * 0.26 - vy) * 0.15; sx = clamp(sx + vx, -10, 10); sy = clamp(sy + vy, -4.5, 5);
  fire--; if (K.a && fire <= 0) { fire = 7; const tg = en.concat(boss ? [boss] : []).filter((e) => e.z > rz + 4 && e.z < rz + 90).sort((a, b) => Math.hypot(a.x - sx, a.y - sy) - Math.hypot(b.x - sx, b.y - sy))[0]; let bx = 0, by = 0; if (tg) { const dz = tg.z - rz; bx = clamp((tg.x - sx) / dz * 2.6, -0.5, 0.5); by = clamp((tg.y - sy) / dz * 2.6, -0.4, 0.4); } bl.push({ x: sx, y: sy, z: rz + 2, vx: bx, vy: by }); snd(900, 0.08, 'square', 0.03, 400); }
  if (P.b && bombs > 0) { bombs--; flash = 14; snd(100, 0.7, 'sawtooth', 0.08, 30); en.forEach((e) => { if (e.z - rz < 100) { score += 100; boom(e.x, e.y, e.z, 2); e.hp = 0; } }); eb = []; if (boss) { boss.hp -= 8; boom(boss.x, boss.y, boss.z, 3); } }
  /* roteiro da fase */
  if (!boss && t % 150 === 60) { const f = Math.random(), x0 = rnd(-6, 6), y0 = rnd(-2, 3); if (f < 0.5) for (let i = -2; i <= 2; i++) spawnEnemy(x0 + i * 2.6, y0 + Math.abs(i) * 0.8, rz + 130 + Math.abs(i) * 6, 'f'); else for (let i = 0; i < 4; i++) spawnEnemy(rnd(-8, 8), rnd(-3, 4), rz + 120 + i * 14, 'd'); }
  if (!boss && t % 70 === 0 && t > 120) { const low = Math.random() < 0.5; ob.push({ x: rnd(-8, 8), z: rz + 150, top: low ? -2.5 : 9, w: 3 + Math.random() * 2 }); }
  if (t === 3600) { boss = { x: 0, y: 0, z: rz + 70, hp: 60, mx: 60, k: 'b', sh: 40, hit: 0 }; msg = 'CUIDADO: CHEFÃO!'; msgT = 140; snd(200, 1, 'sawtooth', 0.07, 100); }
  /* inimigos */
  en.forEach((e) => {
    e.t += 0.05;
    if (e.k === 'f') { e.z -= 0.28; e.x += Math.sin(e.t * 1.3) * 0.08; e.y += Math.cos(e.t) * 0.04; if (--e.sh <= 0 && e.z - rz > 18 && e.z - rz < 70) { e.sh = 90 + (Math.random() * 50 | 0); shootAt(e.x, e.y, e.z, 0.9); } }
    else { const dz = e.z - rz; if (dz < 70) { e.x += clamp(sx - e.x, -0.14, 0.14); e.y += clamp(sy - e.y, -0.1, 0.1); } e.z -= 0.42; }
    if (Math.hypot(e.x - sx, e.y - sy) < 1.9 && Math.abs(e.z - rz) < 2) { e.hp = 0; boom(e.x, e.y, e.z); hurtP(18); }
  });
  bl.forEach((b) => { b.x += b.vx; b.y += b.vy; b.z += RSP + 2.4; en.forEach((e) => { if (e.hp > 0 && Math.abs(b.z - e.z) < 3 && Math.hypot(b.x - e.x, b.y - e.y) < 1.8) { e.hp--; b.z = 1e9; snd(200, 0.1, 'square', 0.05, 80); if (e.hp <= 0) { score += 100; boom(e.x, e.y, e.z); snd(120, 0.3, 'sawtooth', 0.06, 40); } } });
    if (boss && Math.abs(b.z - boss.z) < 4 && Math.abs(b.x - boss.x) < 6 && Math.abs(b.y - boss.y) < 3) { boss.hp--; boss.hit = 5; b.z = 1e9; score += 10; snd(160, 0.06, 'square', 0.05, 90); } });
  bl = bl.filter((b) => b.z < rz + 130); en = en.filter((e) => e.hp > 0 && e.z > rz - 8);
  eb.forEach((b) => { b.x += b.vx; b.y += b.vy; b.z += b.vz; if (Math.hypot(b.x - sx, b.y - sy) < 1.1 && Math.abs(b.z - rz) < 2) { b.z = -1e9; hurtP(10); } }); eb = eb.filter((b) => b.z > rz - 6 && b.z < rz + 140);
  ob.forEach((o) => { if (Math.abs(o.x - sx) < o.w / 2 + 1 && Math.abs(o.z - rz) < 2 && sy - 0.8 < o.top) { hurtP(25); o.z = -1e9; } }); ob = ob.filter((o) => o.z > rz - 8);
  if (boss) {
    boss.x = Math.sin(t * 0.02) * 8; boss.y = Math.sin(t * 0.031) * 3 + 0.5; boss.z = rz + 70; if (boss.hit > 0) boss.hit--;
    if (--boss.sh <= 0) { boss.sh = boss.hp < 30 ? 38 : 62; for (let i = -1; i <= 1; i++) { const d = Math.hypot(sx - boss.x + i * 5, sy - boss.y, 70); eb.push({ x: boss.x + i * 3, y: boss.y, z: boss.z - 4, vx: (sx - boss.x - i * 3 + i * 4) / d * 1.1, vy: (sy - boss.y) / d * 1.1, vz: -70 / d * 1.1 + RSP }); } snd(250, 0.2, 'sawtooth', 0.05, 120); }
    if (boss.hp <= 0) { for (let i = 0; i < 8; i++) boom(boss.x + rnd(-5, 5), boss.y + rnd(-2, 2), boss.z + rnd(-3, 3), 3); score += 2000; saveHi(score); st = 'win'; tmr = 0; boss = null; snd(784, 0.8, 'square', 0.07, 1500); }
  }
  fx.forEach((f) => f.l--); fx = fx.filter((f) => f.l > 0);
}
function ship(x, y, z, roll, c1, c2, sc) {
  sc = sc || 1; box(x, y - 0.15 * sc, z, 0.8 * sc, 0.4 * sc, 3 * sc, c1);
  box(x - 1.2 * sc, y - 0.15 * sc + roll * 1.1, z - 0.4 * sc, 1.8 * sc, 0.12 * sc, 1.6 * sc, c2); box(x + 1.2 * sc, y - 0.15 * sc - roll * 1.1, z - 0.4 * sc, 1.8 * sc, 0.12 * sc, 1.6 * sc, c2);
  box(x, y + 0.2 * sc, z + 0.5 * sc, 0.4 * sc, 0.3 * sc, 1 * sc, hex2('#9ad8ff'));
}
function drw() {
  camBegin(); FOG.n = 50; FOG.f = 170; AMB = 0.55;
  Cam.x = sx * 0.55 + (shake ? rnd(-0.2, 0.2) : 0); Cam.y = sy * 0.55 + 3.2 + (shake ? rnd(-0.2, 0.2) : 0); Cam.z = rz - 11; Cam.yaw = vx * -0.05;
  Cam.pitch = -Math.atan2(Cam.y - (sy * 0.6 + 0.5), 45); sky('#2a5aa8', '#ffcf9a', '#e8b890');
  terrain((x, z) => -9 + Math.max(0, Math.abs(x) - 17) * 0.9 + Math.sin(z * 0.07 + x * 0.3) * 1.2 + Math.sin(x * 0.5) * 0.6, Cam.x, Cam.z + 90, 95, 10, (x, z, h) => { const k = (h + 9) / 18; return [150 + k * 60, 100 + k * 50, 70 + k * 40]; });
  ob.forEach((o) => { box(o.x, -9, o.z, o.w, o.top + 9, o.w, hex2('#a0623a')); box(o.x, o.top, o.z, o.w + 0.6, 0.5, o.w + 0.6, hex2('#7a4a2a')); });
  en.forEach((e) => { if (e.k === 'f') ship(e.x, e.y, e.z, Math.sin(e.t) * 0.3, hex2('#c0303a'), hex2('#3a3a4a'), 1.1); else { sph(e.x, e.y, e.z, 0.9, hex2('#e07a2a'), 4); box(e.x - 1.1, e.y - 0.1, e.z, 2.2, 0.15, 0.5, hex2('#444')); } shadow(e.x, -8.7, e.z, 1.2); });
  if (boss) { const f = boss.hit > 0, c = f ? hex2('#ffffff') : hex2('#7a2a8a'); box(boss.x, boss.y - 1, boss.z, 9, 2.4, 6, c); box(boss.x, boss.y + 1, boss.z - 1, 4, 1.6, 4, f ? c : hex2('#a03ab0')); box(boss.x - 7, boss.y - 0.6, boss.z, 5, 0.5, 4, f ? c : hex2('#4a1a5a')); box(boss.x + 7, boss.y - 0.6, boss.z, 5, 0.5, 4, f ? c : hex2('#4a1a5a')); [-3, 3].forEach((k) => box(boss.x + k, boss.y - 0.4, boss.z - 3.5, 0.9, 0.9, 2.4, hex2('#222'))); sph(boss.x, boss.y + 0.6, boss.z - 3.2, 0.9, (frames >> 2) & 1 ? hex2('#ff4a4a') : hex2('#ffd23c'), 4); }
  bl.forEach((b) => { sprite(b.x, b.y, b.z, (sx2, sy2, s) => { X.fillStyle = '#5affc0'; X.fillRect(sx2 - 1, sy2 - 4 * s * 0.4, 2, 8 * s * 0.4 + 2); X.fillStyle = '#fff'; X.fillRect(sx2 - 0.5, sy2 - 2, 1, 4); }); });
  eb.forEach((b) => { sprite(b.x, b.y, b.z, (sx2, sy2, s) => { X.fillStyle = '#ff5a3a'; X.beginPath(); X.arc(sx2, sy2, Math.max(2, 0.45 * s), 0, 7); X.fill(); X.fillStyle = '#ffe066'; X.beginPath(); X.arc(sx2, sy2, Math.max(1, 0.2 * s), 0, 7); X.fill(); }); });
  fx.forEach((f) => { sprite(f.x, f.y, f.z, (sx2, sy2, s) => { const r = (22 - f.l) / 22 * 2.6 * f.s * s; X.fillStyle = 'rgba(255,' + (200 - (22 - f.l) * 7) + ',60,' + f.l / 26 + ')'; X.beginPath(); X.arc(sx2, sy2, r, 0, 7); X.fill(); }); });
  if (st !== 'over' && !(inv > 0 && (frames >> 2) & 1)) { ship(sx, sy, rz, -vx * 1.8, hex2('#dfe8ff'), hex2('#3a6ad0'), 1); shadow(sx, -8.7, rz, 1.1); sprite(sx, sy - 0.1, rz - 1.6, (a, b, s) => { X.fillStyle = 'rgba(120,220,255,.8)'; X.beginPath(); X.arc(a, b, (0.35 + Math.random() * 0.1) * s, 0, 7); X.fill(); }); }
  flush();
  if (flash > 0) R(0, 0, W, H, 'rgba(255,255,255,' + flash / 20 + ')');
  if (st !== 'title') {
    R(8, 6, 92, 8, '#101426'); R(8, 6, 92 * hp / 100, 8, hp > 30 ? '#38e060' : '#ff4a4a'); T('ESCUDO', 8, 16, '#cfe0ff', 7); T('BOMBAS ' + '●'.repeat(bombs), 8, 26, '#ffd23c', 8); T('PONTOS ' + pad6(score), 120, 6, '#fff', 9);
    if (boss) { R(80, H - 14, 224, 8, '#101426'); R(80, H - 14, 224 * Math.max(0, boss.hp) / boss.mx, 8, '#c03ad0'); T('CHEFÃO', W / 2, H - 25, '#ffd2ff', 8, 'center'); } else { R(8, H - 10, 368, 3, '#101426'); R(8, H - 10, 368 * Math.min(1, t / 3600), 3, '#5aa0ff'); }
    R(W / 2 - 1, H / 2 - 12, 2, 2, 'rgba(255,255,255,.6)');
  }
  if (msgT > 0) T(msg, W / 2, 40, '#ffe066', 16, 'center');
  if (st === 'title') { R(0, 40, W, 100, 'rgba(8,10,40,.6)'); T('STAR TEMPEST', W / 2, 52, '#8ad0ff', 26, 'center'); if (blink()) T('APERTE A OU START', W / 2, 98, '#fff', 12, 'center'); T('D-pad move a nave • A atira (segure) • B bomba', W / 2, 120, '#cfe0ff', 8, 'center'); T('desvie dos pilares e derrote o chefão', W / 2, 131, '#cfe0ff', 8, 'center'); }
  if (st === 'over') { R(0, 66, W, 76, 'rgba(0,0,0,.7)'); T('NAVE DESTRUÍDA', W / 2, 78, '#ff5a5a', 20, 'center'); T('PONTOS ' + pad6(score), W / 2, 106, '#fff', 11, 'center'); if (tmr > 80 && blink()) T('APERTE A', W / 2, 122, '#ffe066', 10, 'center'); }
  if (st === 'win') { R(0, 66, W, 76, 'rgba(0,0,0,.7)'); T('MISSÃO CUMPRIDA!', W / 2, 78, '#5aff9a', 20, 'center'); T('PONTOS ' + pad6(score), W / 2, 106, '#fff', 11, 'center'); if (tmr > 80 && blink()) T('APERTE A', W / 2, 122, '#ffe066', 10, 'center'); }
}
run({ update: upd, draw: drw });
