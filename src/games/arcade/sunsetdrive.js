/* SUNSET DRIVE — corrida em pseudo-3D ao pôr do sol, contra o relógio (estilo arcade clássico) */
const HZ = 86, RW = 160, N = H - HZ, CP_EVERY = 1500, GOAL = 7500, VMAX = 74;
const CX = new Float32Array(H + 2), HW = new Float32Array(H + 2);
let st = 'title', pos = 0, speed = 0, lx = 0, tleft = 60, score = 0, bgx = 0, crash = 0, cars = [], msgT = '', msg = 0, shake = 0, cpn = 0, ready = 0, tick = 0, endT = 0;
const curveAt = (z) => (1.7 * Math.sin(z * 0.012) + 1.1 * Math.sin(z * 0.0043 + 1.3) + 0.6 * Math.sin(z * 0.031)) * Math.min(1, z / 350);
function reset() { pos = 0; speed = 0; lx = 0; tleft = 60; score = 0; crash = 0; cars = []; cpn = 0; msg = 0; ready = 190; endT = 0; st = 'ready'; }
function spawn() {
  for (let k = 0; k < 6; k++) {
    const lane = [-0.66, 0, 0.66][Math.random() * 3 | 0], z = pos + 105 + Math.random() * 60;
    if (cars.some((c) => Math.abs(c.x - lane) < 0.3 && Math.abs(c.z - z) < 22)) continue;
    cars.push({ x: lane + rnd(-0.08, 0.08), z: z, v: 22 + Math.random() * 24, c: ['#2f6fe0', '#f0c020', '#2ac07a', '#a050e0', '#eaeaea', '#ff8a2a'][Math.random() * 6 | 0], hit: 0 }); return;
  }
}
function upd() {
  const dt = 1 / 60; tick++;
  if (st === 'title') { pos += 40 * dt; speed = 40; lx = Math.sin(tick * 0.01) * 0.5; bgx -= curveAt(pos) * 0.15; if (go()) reset(); return; }
  if (st === 'ready') { ready--; bgx -= curveAt(pos) * 0.05; if (ready <= 0) { st = 'play'; msgT = 'VAI!'; msg = 60; snd(900, 0.4, 'square', 0.06, 900); } else if (ready % 60 === 0) snd(500, 0.15, 'square', 0.05); return; }
  if (st === 'over' || st === 'goal') { endT++; speed = Math.max(0, speed - 22 * dt); pos += speed * dt; bgx -= curveAt(pos) * speed * 0.0004; if (endT > 60 && go()) st = 'title'; return; }
  const acc = K.a || K.u, brk = K.b || K.d, off = Math.abs(lx) > 1.08, vmax = off ? 30 : VMAX;
  if (crash > 0) crash--;
  if (acc && crash < 20) speed += (speed < 36 ? 34 : 24) * dt; else speed -= 12 * dt;
  if (brk) speed -= 62 * dt;
  if (off && speed > vmax) speed -= 55 * dt;
  speed = clamp(speed, 0, VMAX + 4);
  const st2 = (K.r ? 1 : 0) - (K.l ? 1 : 0), sf = Math.min(1, speed / 28);
  lx += st2 * 2.3 * sf * dt - curveAt(pos + 2) * 0.82 * (speed / VMAX) * dt;
  lx = clamp(lx, -1.9, 1.9);
  bgx -= curveAt(pos) * speed * 0.0004;
  pos += speed * dt; score = Math.floor(pos * 3);
  if (tick % 60 === 0) { tleft--; if (tleft <= 5 && tleft > 0) snd(1000, 0.08, 'square', 0.04); }
  if (tleft <= 0) { st = 'over'; endT = 0; msgT = 'TEMPO ESGOTADO'; saveHi(score); snd(300, 0.8, 'sawtooth', 0.06, 60); return; }
  if (pos >= (cpn + 1) * CP_EVERY) { cpn++; if (pos >= GOAL) { st = 'goal'; endT = 0; score += tleft * 100; saveHi(score); snd(600, 0.6, 'square', 0.06, 1400); return; } tleft += 24; msgT = 'CHECKPOINT +24s'; msg = 120; snd(784, 0.1, 'square', 0.06); snd(1175, 0.3, 'square', 0.06); }
  if (msg > 0) msg--;
  if (cars.length < 7 && tick % 18 === 0) spawn();
  for (let i = cars.length - 1; i >= 0; i--) {
    const c = cars[i]; c.z += c.v * dt;
    if (c.z < pos - 4 || c.z > pos + 210) { cars.splice(i, 1); continue; }
    const dz = c.z - pos;
    if (!c.hit && dz > 0 && dz < 1.5 && Math.abs(c.x - lx) < 0.44) {
      c.hit = 1; if (speed > c.v) { speed = Math.max(8, c.v * 0.5); crash = 45; shake = 14; lx += (lx >= c.x ? 1 : -1) * 0.25; c.v += 26; snd(120, 0.4, 'sawtooth', 0.08, 40); }
    }
  }
  if (shake > 0) shake--;
}
function mixc() { }
function palm(x, y, s) {
  if (s < 0.015) return; const h = 92 * s, lw = Math.max(1, 6 * s);
  X.strokeStyle = '#5a3820'; X.lineWidth = lw; X.beginPath(); X.moveTo(x, y); X.quadraticCurveTo(x + 7 * s, y - h * 0.5, x + 2 * s, y - h); X.stroke();
  const tx = x + 2 * s, ty = y - h; if (s < 0.06) { R(tx - 1, ty - 1, 3, 2, '#1f9a4a'); return; }
  X.strokeStyle = '#1f9a4a'; X.lineWidth = Math.max(1, 5 * s);
  for (let k = -2; k <= 2; k++) { X.beginPath(); X.moveTo(tx, ty); X.quadraticCurveTo(tx + k * 15 * s, ty - 15 * s, tx + k * 26 * s, ty + Math.abs(k) * 7 * s); X.stroke(); }
}
function car(x, y, w, col, wob) {
  const h = w * 0.6, dk = 'rgba(0,0,0,.3)'; x += wob || 0;
  X.fillStyle = 'rgba(0,0,0,.35)'; X.beginPath(); X.ellipse(x, y, w * 0.55, h * 0.1, 0, 0, 7); X.fill();
  R(x - w * 0.5, y - h * 0.3, w * 0.14, h * 0.3, '#111'); R(x + w * 0.36, y - h * 0.3, w * 0.14, h * 0.3, '#111');
  R(x - w * 0.46, y - h * 0.8, w * 0.92, h * 0.55, col); R(x - w * 0.46, y - h * 0.8, w * 0.92, Math.max(1, h * 0.05), 'rgba(255,255,255,.35)');
  R(x - w * 0.34, y - h, w * 0.68, h * 0.34, col); R(x - w * 0.3, y - h * 0.96, w * 0.6, h * 0.26, '#1c2338'); R(x - w * 0.3, y - h * 0.96, w * 0.6, Math.max(1, h * 0.05), '#46567e');
  R(x - w * 0.44, y - h * 0.52, w * 0.17, h * 0.14, '#ff2a2a'); R(x + w * 0.27, y - h * 0.52, w * 0.17, h * 0.14, '#ff2a2a');
  R(x - w * 0.46, y - h * 0.3, w * 0.92, h * 0.1, dk); R(x - w * 0.12, y - h * 0.46, w * 0.24, h * 0.1, '#eee');
}
function sky() {
  GR(0, HZ + 1, '#1a0840', '#ff9a5a'); X.fillStyle = 'rgba(255,60,130,.35)'; X.fillRect(0, 40, W, 30);
  for (let i = 0; i < 30; i++) R((i * 83) % W, (i * 37) % 40, 1, 1, '#fff');
    X.save(); X.beginPath(); X.rect(0, 0, W, HZ); X.clip();
  const sg = X.createLinearGradient(0, 18, 0, HZ); sg.addColorStop(0, '#ffe36a'); sg.addColorStop(1, '#ff3a8a'); X.fillStyle = sg; X.beginPath(); X.arc(W / 2 + Math.sin(bgx * 0.004) * 70, HZ - 16, 34, 0, 7); X.fill();
  X.fillStyle = '#d8507a'; for (let i = 0; i < 6; i++) X.fillRect(0, HZ - 40 + i * 6, W, 1 + i * 0.5);
  X.restore();
  X.fillStyle = '#3a1450'; X.beginPath(); X.moveTo(0, HZ); for (let x = 0; x <= W; x += 6) X.lineTo(x, HZ - 5 - Math.abs(Math.sin((x - bgx * 1.2) * 0.011)) * 17 - Math.sin((x - bgx * 1.2) * 0.04) * 3); X.lineTo(W, HZ); X.fill();
  X.fillStyle = '#26093a'; X.beginPath(); X.moveTo(0, HZ); for (let x = 0; x <= W; x += 6) X.lineTo(x, HZ - 2 - Math.abs(Math.sin((x - bgx * 2) * 0.02 + 2)) * 8); X.lineTo(W, HZ); X.fill();
}
function drw() {
  X.save(); if (shake > 0) X.translate(rnd(-2, 2), rnd(-2, 2));
  sky();
  let dx = 0, Xc = 0;
  for (let y = H - 1; y > HZ; y--) {
    const p = (y - HZ) / N, dz = 1 / p, del = dz * dz / N;
    dx += curveAt(pos + dz) * del * 0.0105; Xc += dx * del;
    const hw = RW * p, c = W / 2 + (Xc - lx) * hw, seg = pos + dz, b = Math.floor(seg / 5) & 1; CX[y] = c; HW[y] = hw;
    R(0, y, W, 1, b ? '#2b7a4c' : '#236a41');
    R(c - hw * 1.16, y, hw * 2.32, 1, b ? '#e8e8f0' : '#e03a4a');
    R(c - hw, y, hw * 2, 1, b ? '#595570' : '#514d68');
    if (b) { const lw = Math.max(1, hw * 0.025); R(c - hw * 0.333 - lw / 2, y, lw, 1, '#e8e8f0'); R(c + hw * 0.333 - lw / 2, y, lw, 1, '#e8e8f0'); }
    if (seg % 300 < 1.3) R(c - hw, y, hw * 2, 1, '#fff');
  }
  GR(HZ, HZ + 34, 'rgba(255,130,120,.55)', 'rgba(255,130,120,0)');
  /* objetos ordenados do mais longe para o mais perto */
  const sp = [];
  for (let zi = Math.ceil((pos + 2) / 6) * 6; zi < pos + N; zi += 6) { const k = (zi / 6) | 0, side = k & 1 ? 1 : -1; sp.push({ dz: zi - pos, t: 'p', lat: side * (1.6 + (k % 3) * 0.25) }); }
  cars.forEach((c) => { if (c.z - pos > 1.05 && c.z - pos < N) sp.push({ dz: c.z - pos, t: 'c', lat: c.x, col: c.c }); });
  const nc = (cpn + 1) * CP_EVERY; if (nc - pos > 1.2 && nc - pos < N) sp.push({ dz: nc - pos, t: 'k', lat: 0, goal: nc >= GOAL });
  sp.sort((a, b) => b.dz - a.dz);
  sp.forEach((o) => {
    const p = 1 / o.dz, y = Math.floor(HZ + p * N); if (y <= HZ || y >= H) return; const x = CX[y] + o.lat * HW[y], s = p;
    if (o.t === 'p') palm(x, y, s);
    else if (o.t === 'c') car(x, y, 0.42 * HW[y], o.col);
    else { const hw = HW[y]; R(x - hw * 1.2, y - 70 * s, 7 * s, 70 * s, '#ddd'); R(x + hw * 1.2 - 7 * s, y - 70 * s, 7 * s, 70 * s, '#ddd'); for (let i = 0; i < 12; i++) R(x - hw * 1.2 + i * hw * 0.2, y - 74 * s, hw * 0.1, 13 * s, o.goal ? (i & 1 ? '#fff' : '#111') : (i & 1 ? '#ffd23c' : '#222')); if (s > 0.2) T(o.goal ? 'GOAL' : 'CHECK', x, y - 73 * s, '#fff', Math.max(6, 13 * s), 'center'); }
  });
  car(W / 2, H - 6, 82, '#e83a4c', crash > 0 ? rnd(-3, 3) : (K.l ? -1.5 : K.r ? 1.5 : 0));
  if (speed > 50) for (let i = 0; i < 4; i++) R(W / 2 - 60 + i * 40 + rnd(-3, 3), H - 10, 1, 8 + rnd(0, 6), 'rgba(255,255,255,.4)');
  X.restore();
  /* HUD */
  T('TEMPO', 8, 3, '#ffe066', 9); T(String(Math.max(0, tleft)).padStart(2, '0'), 8, 13, tleft <= 10 && blink(14) ? '#ff5a5a' : '#fff', 22);
  T('PONTOS ' + pad6(score), 62, 4, '#fff', 9); T('RECORDE ' + pad6(hi), 62, 15, '#cfe0ff', 8);
  T(String(Math.round(speed * 4)), W - 46, H - 24, '#fff', 20, 'right'); T('KM/H', W - 8, H - 17, '#ffe066', 9, 'right');
  const pr = Math.min(1, pos / GOAL); R(8, H - 12, 120, 5, '#101426'); R(8, H - 12, 120 * pr, 5, '#38e060'); for (let k = 1; k < 5; k++) R(8 + 120 * k / 5, H - 13, 1, 7, '#fff'); R(6 + 120 * pr, H - 15, 6, 10, '#ffd23c');
  if (msg > 0 && st === 'play') T(msgT, W / 2, 50, '#ffe066', 16, 'center');
  if (st === 'ready') T(ready > 130 ? '3' : ready > 70 ? '2' : ready > 10 ? '1' : '', W / 2, 54, '#fff', 44, 'center');
  if (st === 'title') { R(0, 20, W, 80, 'rgba(26,8,64,.55)'); T('SUNSET', W / 2, 26, '#ffe066', 30, 'center'); T('DRIVE', W / 2, 58, '#ff5a9a', 30, 'center'); if (blink()) T('APERTE A OU START', W / 2, 90, '#fff', 11, 'center'); T('segure A para acelerar • ← → dirige • B freia', W / 2, 106, '#cfe0ff', 8, 'center'); }
  if (st === 'over') { R(0, 64, W, 76, 'rgba(0,0,0,.66)'); T(msgT, W / 2, 74, '#ff5a5a', 20, 'center'); T('PONTOS ' + pad6(score), W / 2, 104, '#fff', 11, 'center'); if (endT > 60 && blink()) T('APERTE A', W / 2, 120, '#ffe066', 10, 'center'); }
  if (st === 'goal') { R(0, 64, W, 76, 'rgba(0,0,0,.66)'); T('CHEGOU! 🏁', W / 2, 74, '#38e060', 22, 'center'); T('PONTOS ' + pad6(score), W / 2, 104, '#fff', 11, 'center'); if (endT > 60 && blink()) T('APERTE A', W / 2, 120, '#ffe066', 10, 'center'); }
}
run({ update: upd, draw: drw });
