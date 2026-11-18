/* SKY PILOT — voo 3D: atravesse os anéis sobre as ilhas, contra o relógio */
const hh = (x, z) => Math.max(0, 24 * (Math.sin(x * 0.012 + 0.5) + Math.sin(z * 0.015) + Math.sin((x + z) * 0.008)) / 3 + 14 * Math.sin(x * 0.031) * Math.sin(z * 0.027) - 3);
const rings = (() => { let a = 0, x = 0, z = 60, s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, o = []; for (let i = 0; i < 14; i++) { a += (r() - 0.5) * 1.1; x += Math.sin(a) * 130; z += Math.cos(a) * 130; o.push({ x: x, z: z, y: Math.max(hh(x, z) + 18, 24) + r() * 8, a: a }); } return o; })();
let st = 'title', p, nxt = 0, time = 80, score = 0, msg = '', msgT = 0, tmr = 0, flash = 0, crashes = 0;
function reset() { p = { x: 0, y: 30, z: 0, yaw: 0, pit: 0, roll: 0, spd: 0.9 }; nxt = 0; time = 80; score = 0; flash = 0; crashes = 0; Cam.x = 0; Cam.y = 34; Cam.z = -10; st = 'play'; msg = 'PASSE PELOS ANÉIS!'; msgT = 120; }
function upd() {
  if (st === 'title') { p.yaw += 0.004; if (go()) reset(); return; }
  if (st === 'over' || st === 'win') { tmr++; if (tmr > 70 && go()) st = 'title'; return; }
  if (msgT > 0) msgT--; if (flash > 0) flash--;
  if (frames % 60 === 0 && --time <= 0) { st = 'over'; tmr = 0; saveHi(score); return; }
  const ax = (K.r ? 1 : 0) - (K.l ? 1 : 0), ay = (K.u ? 1 : 0) - (K.d ? 1 : 0);
  p.roll += (ax * 0.7 - p.roll) * 0.08; p.pit += (ay * 0.45 - p.pit) * 0.07; p.yaw += p.roll * 0.028;
  const tg = K.a ? 1.6 : K.b ? 0.55 : 0.95; p.spd += (tg - p.spd) * 0.04;
  const cp = Math.cos(p.pit); p.x += Math.sin(p.yaw) * cp * p.spd; p.z += Math.cos(p.yaw) * cp * p.spd; p.y += Math.sin(p.pit) * p.spd; p.y = Math.min(p.y, 130);
  if (p.y < hh(p.x, p.z) + 1.2 || p.y < 1.2) { time = Math.max(0, time - 6); flash = 14; crashes++; snd(100, 0.5, 'sawtooth', 0.08, 30); const r = rings[Math.max(0, nxt - 1)]; if (nxt > 0) { p.x = r.x; p.z = r.z; p.y = r.y; p.yaw = r.a; } else { p.x = 0; p.z = 0; p.y = 30; p.yaw = 0; } p.pit = 0; p.roll = 0; msg = 'CRASH! -6s'; msgT = 80; }
  const r = rings[nxt]; if (r) { const d = Math.hypot(p.x - r.x, p.y - r.y, p.z - r.z); if (d < 7.5) { nxt++; time += 6; score += 100 + Math.round(p.spd * 40); msg = 'ANEL ' + nxt + '/' + rings.length + '  +6s'; msgT = 70; snd(880, 0.1, 'square', 0.05); snd(1320, 0.2, 'square', 0.05); if (nxt >= rings.length) { st = 'win'; tmr = 0; score += time * 20; saveHi(score); snd(784, 0.8, 'square', 0.07, 1568); } } }
  follow(p.x, p.y, p.z, p.yaw, 9, 2.8 + p.pit * -3, 0.13, 1.5);
}
function plane(x, y, z, yaw, roll, sc) {
  box(x, y - 0.25 * sc, z, 0.9 * sc, 0.55 * sc, 3.4 * sc, hex2('#f4f4f4'), yaw); const c = Math.cos(yaw), s = Math.sin(yaw), P = (a, b) => [x + a * c + b * s, z - a * s + b * c];
  [-1, 1].forEach((k) => { const q = P(k * 1.9 * sc, 0.2 * sc); box(q[0], y - 0.15 * sc + roll * k * -0.5, q[1], 3.4 * sc, 0.12 * sc, 1.3 * sc, hex2('#d83a3a'), yaw); const t = P(k * 0.7 * sc, -1.5 * sc); box(t[0], y + 0.05 * sc, t[1], 1.2 * sc, 0.1 * sc, 0.7 * sc, hex2('#d83a3a'), yaw); });
  const f = P(0, -1.5 * sc); box(f[0], y + 0.1 * sc, f[1], 0.12 * sc, 1 * sc, 0.8 * sc, hex2('#d83a3a'), yaw); const cp = P(0, 0.4 * sc); box(cp[0], y + 0.2 * sc, cp[1], 0.6 * sc, 0.35 * sc, 1 * sc, hex2('#9ad8ff'), yaw);
}
function ring(r, col, big) { const R = 6.5, c = Math.cos(r.a), s = Math.sin(r.a); for (let k = 0; k < 12; k++) { const a0 = k / 12 * 6.2832, a1 = (k + 1) / 12 * 6.2832, pt = (an, rad) => [r.x + Math.cos(an) * rad * c, r.y + Math.sin(an) * rad, r.z - Math.cos(an) * rad * s]; poly([pt(a0, R), pt(a1, R), pt(a1, R - 1.5), pt(a0, R - 1.5)], col, null, 2, true); } }
function drw() {
  camBegin(); FOG.n = 140; FOG.f = 560; AMB = 0.6; sky('#3a7bd5', '#cfeaff', '#cfeaff');
  poly([[Cam.x - 800, 0, Cam.z - 800], [Cam.x - 800, 0, Cam.z + 800], [Cam.x + 800, 0, Cam.z + 800], [Cam.x + 800, 0, Cam.z - 800]], [30 + Math.sin(frames * 0.03) * 6, 110, 200], [0, 1, 0], 0);
  terrain(hh, Cam.x + Math.sin(Cam.yaw) * 120, Cam.z + Math.cos(Cam.yaw) * 120, 190, 12, (x, z, h) => h < 0.6 ? [230, 215, 150] : h < 9 ? [70 + h * 4, 160 - h * 3, 70] : h < 20 ? [120 + h * 3, 110 + h, 90] : [240, 245, 250], 0);
  rings.forEach((r, i) => { if (i < nxt) return; if (Math.hypot(r.x - Cam.x, r.z - Cam.z) > 320) return; ring(r, i === nxt ? ((frames >> 3) & 1 ? [90, 255, 140] : [255, 240, 90]) : [255, 200, 60]); });
  if (st !== 'title') { plane(p.x, p.y, p.z, p.yaw, p.roll, 1); const hg = hh(p.x, p.z); shadow(p.x, hg, p.z, 1.6); } else { plane(p.x, p.y, p.z, p.yaw, 0.3, 1); }
  flush();
  if (st === 'title') { Cam.x = p.x - Math.sin(p.yaw) * 14; Cam.z = p.z - Math.cos(p.yaw) * 14; Cam.y = p.y + 4; Cam.yaw = p.yaw; Cam.pitch = -0.2; }
  if (flash > 0) R(0, 0, W, H, 'rgba(255,60,40,' + flash / 30 + ')');
  if (st !== 'title') {
    T('TEMPO', 8, 4, '#ffe066', 9); T(String(Math.max(0, time)), 8, 14, time <= 10 && blink(12) ? '#ff5a5a' : '#fff', 20); T('ANÉIS ' + nxt + '/' + rings.length, 66, 4, '#fff', 9); T('PONTOS ' + pad6(score), 66, 15, '#cfe0ff', 8);
    T('ALT ' + Math.round(p.y), W - 8, H - 24, '#fff', 9, 'right'); T('VEL ' + Math.round(p.spd * 200), W - 8, H - 14, '#ffe066', 9, 'right');
    const r = rings[nxt]; if (r) { const b = angd(Math.atan2(r.x - p.x, r.z - p.z), p.yaw), ax = W / 2 + clamp(b * 90, -150, 150), up = r.y - p.y; X.fillStyle = '#5aff9a'; X.beginPath(); X.moveTo(ax, 30); X.lineTo(ax - 6, 22); X.lineTo(ax + 6, 22); X.fill(); T(Math.round(Math.hypot(r.x - p.x, r.z - p.z)) + 'm' + (up > 6 ? ' ↑' : up < -6 ? ' ↓' : ''), ax, 33, '#5aff9a', 8, 'center'); }
    R(W / 2 - 1, H / 2 - 1, 3, 3, 'rgba(255,255,255,.5)');
  }
  if (msgT > 0) T(msg, W / 2, 48, '#ffe066', 14, 'center');
  if (st === 'title') { R(0, 36, W, 100, 'rgba(8,16,50,.55)'); T('SKY PILOT', W / 2, 46, '#ffffff', 28, 'center'); if (blink()) T('APERTE A OU START', W / 2, 92, '#ffe066', 12, 'center'); T('↑ ↓ nariz • ← → inclina e curva • A turbo • B freio', W / 2, 114, '#cfe0ff', 8, 'center'); T('passe pelos anéis para ganhar tempo • evite o chão', W / 2, 125, '#cfe0ff', 8, 'center'); }
  if (st === 'over') { R(0, 66, W, 76, 'rgba(0,0,0,.7)'); T('TEMPO ESGOTADO', W / 2, 78, '#ff5a5a', 20, 'center'); T('ANÉIS ' + nxt + '   PONTOS ' + pad6(score), W / 2, 106, '#fff', 10, 'center'); if (tmr > 70 && blink()) T('APERTE A', W / 2, 122, '#ffe066', 10, 'center'); }
  if (st === 'win') { R(0, 66, W, 76, 'rgba(0,0,0,.7)'); T('TODOS OS ANÉIS!', W / 2, 78, '#5aff9a', 20, 'center'); T('PONTOS ' + pad6(score), W / 2, 106, '#fff', 10, 'center'); if (tmr > 70 && blink()) T('APERTE A', W / 2, 122, '#ffe066', 10, 'center'); }
}
p = { x: 0, y: 40, z: 0, yaw: 0, pit: 0, roll: 0, spd: 1 }; run({ update: upd, draw: drw });
