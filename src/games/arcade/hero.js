/* HERO Z — ação 3D com mira em alvo: espada, escudo, 3 ondas e um golem gigante */
const AR = 19;
let st = 'title', p, en = [], gems = [], fx = [], wave = 0, score = 0, msg = '', msgT = 0, tmr = 0, wt = 0, shake = 0, tg = null;
const mkP = () => ({ x: 0, z: 11, yaw: Math.PI, hp: 6, sw: 0, cmb: 0, cmbT: 0, sh: 0, vx: 0, vz: 0, inv: 0, hit: [], an: 0 });
const mk = (k, i, n) => { const a = i / n * 6.28 + 0.4, r = 11; return { k: k, x: Math.sin(a) * r, z: -Math.cos(a) * r - 2, yaw: 0, hp: k === 'g' ? 18 : k === 'k' ? 3 : 2, max: k === 'g' ? 18 : k === 'k' ? 3 : 2, s: 'idle', t: 40 + (Math.random() * 40 | 0), vx: 0, vz: 0, inv: 0, dead: 0, stun: 0, hop: 0, an: Math.random() * 6, r: 0 }; };
function spawn() { en = []; if (wave === 0) for (let i = 0; i < 3; i++) en.push(mk('s', i, 3)); else if (wave === 1) { for (let i = 0; i < 2; i++) en.push(mk('s', i, 5)); for (let i = 2; i < 5; i++) en.push(mk('k', i, 5)); } else { const g = mk('g', 0, 1); g.x = 0; g.z = -10; en.push(g); } msg = wave === 2 ? 'O GOLEM DESPERTOU!' : 'ONDA ' + (wave + 1) + '/3'; msgT = 110; }
function reset() { p = mkP(); wave = 0; score = 0; gems = []; fx = []; spawn(); st = 'play'; }
const spark = (x, y, z, c) => fx.push({ x: x, y: y, z: z, l: 12, c: c });
function hurtP(d, ax, az, blockable) {
  if (p.inv > 0) return; const dir = Math.atan2(ax - p.x, az - p.z);
  if (blockable && p.sh && Math.abs(angd(dir, p.yaw)) < 1.3) { p.vx = -Math.sin(dir) * 0.14; p.vz = -Math.cos(dir) * 0.14; spark(p.x + Math.sin(p.yaw), 1.2, p.z + Math.cos(p.yaw), '#9ad8ff'); snd(300, 0.08, 'square', 0.06, 200); return; }
  p.hp -= d; p.inv = 70; shake = 10; p.vx = -Math.sin(dir) * 0.3; p.vz = -Math.cos(dir) * 0.3; snd(110, 0.25, 'sawtooth', 0.07, 40);
  if (p.hp <= 0) { p.hp = 0; st = 'over'; tmr = 0; saveHi(score); }
}
function hitE(e, d) { if (e.dead || e.inv > 0) return; e.hp -= e.stun > 0 ? d * 2 : d; e.inv = 14; const a = Math.atan2(e.x - p.x, e.z - p.z); e.vx = Math.sin(a) * (e.k === 'g' ? 0.05 : 0.28); e.vz = Math.cos(a) * (e.k === 'g' ? 0.05 : 0.28); spark(e.x, 1.2, e.z, '#ffe066'); snd(e.k === 'g' ? 90 : 200, 0.12, 'square', 0.06, 80); if (e.s === 'wind' && e.k !== 'g') { e.s = 'idle'; e.t = 30; }
  if (e.hp <= 0) { e.dead = 40; score += e.k === 'g' ? 1000 : e.k === 'k' ? 150 : 80; snd(120, 0.3, 'sawtooth', 0.06, 40); gems.push({ x: e.x, z: e.z, k: 'g' }); if (Math.random() < 0.3 || e.k === 'g') gems.push({ x: e.x + 0.8, z: e.z, k: 'h' }); } }
function upd() {
  if (st === 'title') { if (go()) reset(); return; }
  if (st === 'over' || st === 'win') { if (++tmr > 70 && go()) st = 'title'; fx.forEach((f) => f.l--); return; }
  if (msgT > 0) msgT--; if (shake > 0) shake--; p.an++; wt++; fx.forEach((f) => f.l--); fx = fx.filter((f) => f.l > 0);
  const alive = en.filter((e) => !e.dead);
  tg = alive.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0] || null;
  const ax = (K.r ? 1 : 0) - (K.l ? 1 : 0), ay = (K.u ? 1 : 0) - (K.d ? 1 : 0); p.sh = K.b && p.sw === 0 ? 1 : 0; const sp = p.sh ? 0.055 : 0.11;
  let mx = 0, mz = 0;
  if (tg) { const dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz) || 1, fx2 = dx / d, fz2 = dz / d; p.yaw += angd(Math.atan2(dx, dz), p.yaw) * 0.25; mx = (fz2 * ax + fx2 * ay) * sp; mz = (-fx2 * ax + fz2 * ay) * sp; }
  else { p.yaw += ax * 0.06; mx = Math.sin(p.yaw) * ay * sp; mz = Math.cos(p.yaw) * ay * sp; }
  p.x += mx + p.vx; p.z += mz + p.vz; p.vx *= 0.85; p.vz *= 0.85; const rr = Math.hypot(p.x, p.z); if (rr > AR - 1) { p.x *= (AR - 1) / rr; p.z *= (AR - 1) / rr; }
  if (p.inv > 0) p.inv--; if (p.cmbT > 0) p.cmbT--;
  if (P.a && p.sw === 0 && !p.sh) { p.cmb = p.cmbT > 0 && p.cmb === 1 ? 2 : 1; p.sw = 1; p.hit = []; snd(400 + p.cmb * 150, 0.12, 'triangle', 0.06, 150); }
  if (p.sw > 0) { p.sw++; if (p.sw > 5 && p.sw < 12) en.forEach((e) => { if (!e.dead && !p.hit.includes(e)) { const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < (e.k === 'g' ? 3.6 : 2.7) && Math.abs(angd(Math.atan2(e.x - p.x, e.z - p.z), p.yaw)) < 1.2) { p.hit.push(e); hitE(e, p.cmb === 2 ? 2 : 1); } } }); if (p.sw > 20) { p.sw = 0; p.cmbT = 24; } }
  en.forEach((e) => {
    e.an += 0.1; if (e.inv > 0) e.inv--; if (e.dead) { e.dead--; return; }
    e.x += e.vx; e.z += e.vz; e.vx *= 0.8; e.vz *= 0.8; const d = Math.hypot(p.x - e.x, p.z - e.z), a = Math.atan2(p.x - e.x, p.z - e.z); if (e.s !== 'charge') e.yaw = a;
    if (e.stun > 0) { e.stun--; return; }
    if (e.k === 's') {
      if (e.s === 'idle') { if (--e.t <= 0) { e.s = 'hop'; e.hop = 0; e.t = 26; e.ha = a; } }
      else { e.hop++; const k = Math.sin(e.hop / 26 * Math.PI); e.x += Math.sin(e.ha) * 0.1; e.z += Math.cos(e.ha) * 0.1; e.r = k * 1.2; if (e.hop >= 26) { e.s = 'idle'; e.t = 35 + (Math.random() * 40 | 0); e.r = 0; } if (d < 1.1 && e.r < 0.7) hurtP(1, e.x, e.z, true); }
    } else if (e.k === 'k') {
      if (e.s === 'idle') { if (d > 2.6) { e.x += Math.sin(a) * 0.055; e.z += Math.cos(a) * 0.055; } else { e.s = 'wind'; e.t = 28; } }
      else if (e.s === 'wind') { if (--e.t <= 0) { e.s = 'swing'; e.t = 10; } }
      else if (e.s === 'swing') { if (e.t === 8 && d < 3 && Math.abs(angd(a, Math.atan2(p.x - e.x, p.z - e.z))) < 1) hurtP(1, e.x, e.z, true); if (--e.t <= 0) { e.s = 'rec'; e.t = 36; snd(250, 0.1, 'sawtooth', 0.04, 100); } }
      else if (e.s === 'rec') { e.x -= Math.sin(a) * 0.025; e.z -= Math.cos(a) * 0.025; if (--e.t <= 0) e.s = 'idle'; }
    } else {
      if (e.s === 'idle') { if (d > 3) { e.x += Math.sin(a) * 0.035; e.z += Math.cos(a) * 0.035; } if (--e.t <= 0) { e.s = Math.random() < 0.5 ? 'wind' : 'swing'; e.t = e.s === 'wind' ? 50 : 42; e.ha = a; snd(150, 0.5, 'sawtooth', 0.05, 100); } }
      else if (e.s === 'wind') { if (--e.t <= 0) { e.s = 'charge'; e.t = 40; e.ha = a; } }
      else if (e.s === 'charge') { e.x += Math.sin(e.ha) * 0.3; e.z += Math.cos(e.ha) * 0.3; e.yaw = e.ha; if (d < 2.4) hurtP(2, e.x, e.z, true); if (Math.hypot(e.x, e.z) > AR - 2 || --e.t <= 0) { if (Math.hypot(e.x, e.z) > AR - 2) { e.stun = 110; shake = 14; snd(70, 0.6, 'sawtooth', 0.08, 30); } e.s = 'idle'; e.t = 80; } }
      else if (e.s === 'swing') { if (--e.t <= 0) { e.s = 'slam'; e.r = 0; e.t = 30; shake = 12; snd(60, 0.5, 'sawtooth', 0.08, 30); } }
      else if (e.s === 'slam') { e.r += 0.3; const dd = Math.hypot(p.x - e.x, p.z - e.z); if (Math.abs(dd - e.r) < 1.1) hurtP(1, e.x, e.z, true); if (--e.t <= 0) { e.s = 'idle'; e.t = 70; e.r = 0; } }
    }
    if (d < 1.0) { const q = (1 - d) / 2; p.x += Math.sin(a) * q; p.z += Math.cos(a) * q; }
  });
  gems.forEach((g) => { if (!g.got && Math.hypot(g.x - p.x, g.z - p.z) < 1.3) { g.got = 1; if (g.k === 'g') { score += 20; snd(1175, 0.06, 'square', 0.04); snd(1568, 0.1, 'square', 0.04); } else if (p.hp < 6) { p.hp = Math.min(6, p.hp + 2); snd(700, 0.2, 'triangle', 0.06, 1200); } else g.got = 0; } }); gems = gems.filter((g) => !g.got);
  if (!alive.length && en.every((e) => e.dead <= 1)) { if (wave >= 2) { st = 'win'; tmr = 0; score += p.hp * 100; saveHi(score); snd(784, 0.8, 'square', 0.07, 1568); } else if (en.length && en.every((e) => e.dead <= 1)) { wave++; spawn(); } }
  const pv = tg ? { x: p.x + (tg.x - p.x) * 0.25, z: p.z + (tg.z - p.z) * 0.25 } : { x: p.x + Math.sin(p.yaw) * 3, z: p.z + Math.cos(p.yaw) * 3 };
  follow(pv.x, 0, pv.z, p.yaw, 9, 5.2, 0.09, 0.8);
}
function drawP() {
  if (p.inv > 0 && (frames >> 2) & 1) return; const y = p.yaw, c = Math.cos(y), s = Math.sin(y), P = (a, b) => [p.x + a * c + b * s, p.z - a * s + b * c], mv = Math.hypot(K.l - K.r, K.u - K.d) ? Math.sin(p.an * 0.4) * 0.3 : 0;
  shadow(p.x, 0, p.z, 0.7); [-1, 1].forEach((k) => { const q = P(k * 0.22, k * mv); box(q[0], 0, q[1], 0.28, 0.7, 0.34, hex2('#e8d8a8'), y); box(q[0], 0, q[1], 0.3, 0.2, 0.4, hex2('#6a4a2a'), y); });
  box(p.x, 0.7, p.z, 0.8, 0.8, 0.45, hex2('#2f9a3c'), y); box(p.x, 0.95, p.z, 0.85, 0.1, 0.5, hex2('#8a5a2a'), y); sph(p.x, 1.8, p.z, 0.3, hex2('#f0c090'), 5); const cp = P(0, -0.15); cyl(cp[0], 1.95, cp[1], 0.34, 0.9, hex2('#2f9a3c'), 6, 0.02);
  const sh = p.sh ? P(0.1, 0.65) : P(-0.55, 0.1); box(sh[0], 0.65, sh[1], 0.9, 0.9, 0.12, hex2('#3a6ad0'), p.sh ? y : y + 1.2); box(sh[0], 0.95, sh[1], 0.3, 0.3, 0.14, hex2('#ffd23c'), p.sh ? y : y + 1.2);
  const sa = p.sw > 0 ? -1.3 + Math.min(1, p.sw / 14) * 2.6 * (p.cmb === 2 ? -1 : 1) : 0.2, hd = P(0.5, 0.2), ba = y + sa; box(hd[0], 0.9, hd[1], 0.15, 0.7, 0.15, hex2('#e8e8f0'), ba); const bt = [hd[0] + Math.sin(ba) * 0.9, hd[1] + Math.cos(ba) * 0.9]; box(bt[0], 0.9, bt[1], 0.16, 0.6, 1.3, hex2('#e8e8f0'), ba);
  if (p.sw > 4 && p.sw < 13) for (let i = 0; i < 6; i++) { const aa = y - 1.2 + (p.sw - 4) / 9 * 2.4 * (p.cmb === 2 ? -1 : 1) + (i - 3) * 0.12 * (p.cmb === 2 ? -1 : 1); sprite(p.x + Math.sin(aa) * 1.9, 1.1, p.z + Math.cos(aa) * 1.9, (sx, sy) => { X.fillStyle = 'rgba(255,255,255,.7)'; X.fillRect(sx - 1.5, sy - 1.5, 3, 3); }); }
}
function drawE(e) {
  if (e.dead && (frames >> 1) & 1) return; const f = e.inv > 0, y = e.yaw, c = Math.cos(y), s = Math.sin(y), P = (a, b) => [e.x + a * c + b * s, e.z - a * s + b * c], W2 = (k) => f ? hex2('#ffffff') : hex2(k);
  shadow(e.x, 0, e.z, e.k === 'g' ? 2.4 : 0.8);
  if (e.k === 's') { const h = e.r; sph(e.x, 0.55 + h, e.z, 0.65 - h * 0.1, f ? hex2('#fff') : hex2('#4ac86a'), 5); const ey = P(0, 0.45); [-1, 1].forEach((k) => { const q = P(k * 0.22, 0.45); sprite(q[0], 0.85 + h, q[1], (sx, sy, sc) => { X.fillStyle = '#fff'; X.fillRect(sx - 2, sy - 2, 4, 4); X.fillStyle = '#000'; X.fillRect(sx - 1, sy - 1, 2, 3); }); }); }
  else if (e.k === 'k') { const sw = e.s === 'swing' ? 1 : e.s === 'wind' ? -1 : 0, mv = e.s === 'idle' ? Math.sin(e.an * 3) * 0.2 : 0; [-1, 1].forEach((k) => { const q = P(k * 0.2, k * mv); box(q[0], 0, q[1], 0.2, 0.8, 0.2, W2('#e8e8d8'), y); }); box(e.x, 0.8, e.z, 0.7, 0.8, 0.3, W2('#e8e8d8'), y); sph(e.x, 1.9, e.z, 0.3, W2('#f4f4e8'), 5); const ar = P(0.55, 0.3 + sw * 0.4); box(ar[0], 0.9 + (sw < 0 ? 0.7 : 0), ar[1], 0.12, 1.3, 0.12, W2('#9aa'), y + (sw > 0 ? 0.6 : 0)); const sh = P(-0.5, 0.2); box(sh[0], 0.8, sh[1], 0.7, 0.8, 0.1, W2('#7a4a2a'), y); if (e.s === 'wind') sprite(e.x, 2.8, e.z, (sx, sy) => T('!', sx, sy - 6, '#ff5a3a', 12, 'center')); }
  else { const sc = e.stun > 0 ? Math.sin(frames) * 0.1 : 0, bc = e.s === 'wind' || e.s === 'swing' ? ((frames >> 2) & 1 ? '#ff5a3a' : '#6a4a8a') : '#6a4a8a'; box(e.x + sc, 0, e.z, 2.4, 1.6, 1.6, W2('#5a3a7a'), y); box(e.x + sc, 1.6, e.z, 3.4, 2.2, 2.2, W2(bc), y); sph(e.x + sc, 4.1, e.z, 0.9, W2('#8a6aaa'), 5); [-1, 1].forEach((k) => { const a = P(k * 2.2, 0.4); box(a[0], e.s === 'slam' || e.s === 'swing' ? 2.4 : 0.6, a[1], 1.1, 2.4, 1.1, W2('#4a2a6a'), y); }); const ey = P(0, 1.0); [-0.4, 0.4].forEach((k) => { const q = P(k, 1.0); sprite(q[0], 4.2, q[1], (sx, sy) => { X.fillStyle = '#ff5a3a'; X.fillRect(sx - 2, sy - 1, 4, 2); }); }); if (e.stun > 0) sprite(e.x, 5.6, e.z, (sx, sy) => T('★ ★ ★', sx, sy - 6, '#ffe14a', 10, 'center')); if (e.s === 'slam' && e.r > 0) for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; sprite(e.x + Math.sin(a) * e.r, 0.3, e.z + Math.cos(a) * e.r, (sx, sy) => { X.fillStyle = 'rgba(255,220,140,.8)'; X.fillRect(sx - 2, sy - 2, 4, 4); }); } }
}
function drw() {
  camBegin(); FOG.n = 35; FOG.f = 130; AMB = 0.55; sky('#3a6ad0', '#e8d8b8', '#7a9a5a');
  for (let i = 0; i < 24; i++) { const a0 = i / 24 * 6.28, a1 = (i + 1) / 24 * 6.28, c = i & 1 ? [112, 172, 88] : [102, 160, 80]; poly([[0, 0, 0], [Math.sin(a0) * AR, 0, Math.cos(a0) * AR], [Math.sin(a1) * AR, 0, Math.cos(a1) * AR]], c, [0, 1, 0], 0, true); }
  poly([[Cam.x - 300, -0.1, Cam.z - 300], [Cam.x - 300, -0.1, Cam.z + 300], [Cam.x + 300, -0.1, Cam.z + 300], [Cam.x + 300, -0.1, Cam.z - 300]], [90, 120, 70], [0, 1, 0], 0);
  for (let i = 0; i < 28; i++) { const a = i / 28 * 6.28; box(Math.sin(a) * (AR + 0.7), 0, Math.cos(a) * (AR + 0.7), 3.2, 2 + (i % 3) * 0.4, 1.4, hex2(i % 2 ? '#9a9486' : '#8a8478'), a); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.5; cyl(Math.sin(a) * 13, 0, Math.cos(a) * 13, 0.8, 3.4, hex2('#b0a898'), 7); cyl(Math.sin(a) * 13, 3.4, Math.cos(a) * 13, 1, 0.4, hex2('#8a8478'), 7); }
  gems.forEach((g) => { sprite(g.x, 0.7 + Math.sin(frames * 0.1 + g.x) * 0.15, g.z, (sx, sy, sc) => { X.fillStyle = g.k === 'g' ? '#3ae07a' : '#ff4a6a'; X.beginPath(); if (g.k === 'g') { X.moveTo(sx, sy - 0.4 * sc); X.lineTo(sx + 0.3 * sc, sy); X.lineTo(sx, sy + 0.4 * sc); X.lineTo(sx - 0.3 * sc, sy); } else { X.arc(sx - 0.15 * sc, sy, 0.2 * sc, 0, 7); X.arc(sx + 0.15 * sc, sy, 0.2 * sc, 0, 7); } X.fill(); }); });
  en.forEach(drawE); if (st !== 'title') drawP();
  if (tg && st === 'play') sprite(tg.x, (tg.k === 'g' ? 6.4 : 2.9) + Math.sin(frames * 0.15) * 0.15, tg.z, (sx, sy, sc) => { X.fillStyle = '#ffe14a'; X.beginPath(); X.moveTo(sx, sy + 0.35 * sc); X.lineTo(sx - 0.3 * sc, sy - 0.2 * sc); X.lineTo(sx + 0.3 * sc, sy - 0.2 * sc); X.fill(); });
  fx.forEach((f) => sprite(f.x, f.y, f.z, (sx, sy, sc) => { const r = (12 - f.l) * 0.12 * sc + 2; X.strokeStyle = f.c; X.lineWidth = 2; X.beginPath(); for (let i = 0; i < 6; i++) { const a = i * 1.047; X.moveTo(sx + Math.cos(a) * r * 0.4, sy + Math.sin(a) * r * 0.4); X.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } X.stroke(); }));
  flush();
  if (st !== 'title') { for (let i = 0; i < 6; i++) T(i < p.hp ? '♥' : '♡', 8 + i * 11, 4, i < p.hp ? '#ff5a6a' : '#7a4a5a', 12); T('PONTOS ' + pad6(score), 8, 18, '#fff', 8); T('ONDA ' + (wave + 1) + '/3', 8, 28, '#ffe066', 8); const g = en.find((e) => e.k === 'g' && !e.dead); if (g) { R(80, H - 14, 224, 8, '#101426'); R(80, H - 14, 224 * g.hp / g.max, 8, g.stun > 0 ? '#ffe14a' : '#c03ad0'); T('GOLEM', W / 2, H - 25, '#ffd2ff', 8, 'center'); } }
  if (msgT > 0) T(msg, W / 2, 44, '#ffe066', 15, 'center');
  if (st === 'title') { Cam.yaw += 0.006; Cam.x = Math.sin(Cam.yaw + 3.14) * 17; Cam.z = Math.cos(Cam.yaw + 3.14) * 17; Cam.y = 8; Cam.pitch = -0.28; R(0, 36, W, 104, 'rgba(10,20,60,.55)'); T('HERO Z', W / 2, 46, '#7aff9a', 30, 'center'); if (blink()) T('APERTE A OU START', W / 2, 92, '#fff', 12, 'center'); T('← → circula o alvo • ↑ ↓ aproxima/afasta • A espada (2 golpes)', W / 2, 112, '#cfe0ff', 8, 'center'); T('B segura o escudo • o golem fica atordoado se bater na parede', W / 2, 123, '#cfe0ff', 8, 'center'); }
  if (st === 'over') { R(0, 66, W, 76, 'rgba(0,0,0,.7)'); T('VOCÊ CAIU', W / 2, 78, '#ff5a5a', 22, 'center'); T('PONTOS ' + pad6(score), W / 2, 106, '#fff', 10, 'center'); if (tmr > 70 && blink()) T('APERTE A', W / 2, 122, '#ffe066', 10, 'center'); }
  if (st === 'win') { R(0, 66, W, 76, 'rgba(0,0,0,.7)'); T('VITÓRIA!', W / 2, 78, '#5aff9a', 22, 'center'); T('PONTOS ' + pad6(score), W / 2, 106, '#fff', 10, 'center'); if (tmr > 70 && blink()) T('APERTE A', W / 2, 122, '#ffe066', 10, 'center'); }
}
p = mkP(); run({ update: upd, draw: drw });
