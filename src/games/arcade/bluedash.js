/* BLUE DASH — corrida veloz infinita: anéis, ladeiras, buracos, espinhos, molas e robôs */
let st = 'title', px = 0, py = 168, vy = 0, g = 1, roll = 0, speed = 2.8, rings = 0, score = 0, inv = 0, rot = 0, deadT = 0, kills = 0, nextX = 600, shake = 0;
let hills = [], pits = [], ents = [], sparks = [];
const BASE = 168, SX = 110;
function gY(wx) { for (let i = 0; i < hills.length; i++) { const h = hills[i]; if (wx > h.x0 && wx < h.x1) return BASE - Math.sin((wx - h.x0) / (h.x1 - h.x0) * Math.PI) * h.h; } return BASE; }
function inPit(wx) { for (let i = 0; i < pits.length; i++) if (wx > pits[i].x0 && wx < pits[i].x1) return true; return false; }
function reset() { px = 0; py = BASE; vy = 0; g = 1; roll = 0; speed = 3; rings = 0; score = 0; inv = 0; kills = 0; deadT = 0; nextX = 560; hills = []; pits = []; ents = []; sparks = []; }
function ring(x, y) { ents.push({ t: 'r', x: x, y: y }); }
function gen(lim) {
  while (nextX < lim) {
    const x = nextX, k = Math.floor(Math.random() * 7), gap = 150 + Math.random() * 110 - Math.min(60, px / 120);
    if (k === 0) { const n = 6 + (Math.random() * 5 | 0); for (let i = 0; i < n; i++) ring(x + i * 18, BASE - 14); nextX = x + n * 18 + gap; }
    else if (k === 1) { const len = 170 + Math.random() * 60, h = 28 + Math.random() * 22; hills.push({ x0: x, x1: x + len, h: h }); for (let i = 0; i < 8; i++) { const wx = x + 14 + i * (len - 28) / 7; ring(wx, gY(wx) - 14); } nextX = x + len + gap * 0.6; }
    else if (k === 2) { ents.push({ t: 'b', x: x + 40, vx: -0.7, a: 1 }); for (let i = 0; i < 5; i++) ring(x + 14 + i * 16, BASE - 46 + Math.abs(i - 2) * 6); nextX = x + 120 + gap; }
    else if (k === 3) { const n = 1 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) ents.push({ t: 's', x: x + 40 + i * 14 }); for (let i = 0; i < 5; i++) ring(x + 20 + i * 14, BASE - 26 - Math.sin(i / 4 * Math.PI) * 30); nextX = x + 110 + gap; }
    else if (k === 4) { const w = 70 + Math.random() * 40; pits.push({ x0: x + 30, x1: x + 30 + w }); for (let i = 0; i < 7; i++) ring(x + 24 + i * (w + 20) / 6, BASE - 30 - Math.sin(i / 6 * Math.PI) * 40); nextX = x + w + 90 + gap; }
    else if (k === 5) { ents.push({ t: 'p', x: x + 40, c: 0 }); for (let i = 0; i < 9; i++) ring(x + 60 + i * 20, BASE - 100 - Math.sin(i / 8 * Math.PI) * 30); nextX = x + 300 + gap * 0.3; }
    else { ents.push({ t: 'b', x: x + 30, vx: -0.7, a: 1 }); ents.push({ t: 'b', x: x + 110, vx: -0.7, a: 1 }); nextX = x + 190 + gap; }
  }
}
function hurt() {
  if (inv > 0) return;
  if (rings > 0) { for (let i = 0; i < Math.min(12, rings); i++) sparks.push({ x: px, y: py - 10, vx: rnd(-3, 3), vy: rnd(-5, -1), l: 90 }); rings = 0; inv = 100; vy = -3.5; g = 0; speed = Math.max(2.6, speed * 0.6); shake = 8; snd(200, 0.3, 'sawtooth', 0.07, 70); }
  else { st = 'dead'; deadT = 0; vy = -6; g = 0; shake = 10; saveHi(score); snd(400, 0.6, 'square', 0.06, 60); }
}
function upd() {
  if (st === 'title') { px += 3.2; py = BASE; if (go()) { reset(); st = 'play'; } return; }
  if (st === 'over') { deadT++; if (deadT > 40 && go()) { reset(); st = 'play'; } return; }
  if (st === 'dead') { deadT++; vy += 0.35; py += vy; px += 0.5; if (deadT > 80) { st = 'over'; deadT = 0; } return; }
  gen(px + W + 400);
  const target = 3.1 + Math.min(3.3, px / 4200);
  const sl = g ? (gY(px + 4) - gY(px - 4)) / 8 : 0;
  speed += (target - speed) * 0.012 + sl * 0.05; speed = clamp(speed, 2.2, 9);
  roll = g && (K.d || K.b) ? 1 : 0; if (roll) speed = Math.min(9, speed + 0.012);
  px += speed; rot += speed * 0.18; if (inv > 0) inv--; if (shake > 0) shake--;
  if (P.a && g) { vy = -6.3; g = 0; roll = 0; snd(350, 0.2, 'square', 0.05, 800); }
  if (g) { py = gY(px); if (inPit(px)) { g = 0; vy = 0; } }
  else { vy += K.a && vy < 0 ? 0.2 : 0.42; vy = Math.min(vy, 9); py += vy; if (vy >= 0 && !inPit(px) && py >= gY(px)) { py = gY(px); g = 1; vy = 0; } if (py > H + 40) { st = 'dead'; deadT = 0; vy = 0; shake = 6; saveHi(score); snd(300, 0.7, 'square', 0.06, 50); } }
  score = Math.floor(px / 10) + rings * 5 + kills * 100 + (score % 1 ? 0 : 0);
  const atk = !g || roll;
  for (let i = ents.length - 1; i >= 0; i--) {
    const e = ents[i];
    if (e.x < px - 200) { ents.splice(i, 1); continue; }
    if (e.t === 'b' && e.a) { e.x += e.vx; if (inPit(e.x)) { ents.splice(i, 1); continue; } }
    const dx = Math.abs(e.x - px);
    if (e.t === 'r' && !e.c) { if (dx < 11 && Math.abs((py - 9) - e.y) < 14) { ents.splice(i, 1); rings++; score += 0; snd(1319, 0.06, 'square', 0.03); snd(1760, 0.1, 'square', 0.03); } }
    else if (e.t === 's') { if (dx < 9 && py > gY(e.x) - 11) hurt(); }
    else if (e.t === 'b' && e.a) { if (dx < 15 && Math.abs((py - 8) - (gY(e.x) - 8)) < 15) { if (atk) { e.a = 0; kills++; if (!g) vy = -4; for (let j = 0; j < 8; j++) sparks.push({ x: e.x, y: gY(e.x) - 8, vx: rnd(-3, 3), vy: rnd(-4, 0), l: 30, c: '#ff9a3c' }); snd(180, 0.15, 'square', 0.06, 700); } else hurt(); } }
    else if (e.t === 'p') { if (e.c > 0) e.c--; if (dx < 14 && py >= gY(e.x) - 8 && vy >= 0) { vy = -11.5; g = 0; e.c = 12; snd(300, 0.3, 'square', 0.06, 1400); } }
  }
  sparks.forEach((s) => { s.x += s.vx; s.y += s.vy; s.vy += 0.3; s.l--; });
  sparks = sparks.filter((s) => s.l > 0);
}
function ringDraw(x, y) { const w = Math.abs(Math.cos(frames * 0.15 + x * 0.05)) * 4.5 + 0.8; X.strokeStyle = '#ffd23c'; X.lineWidth = 2.4; X.beginPath(); X.ellipse(x, y, w, 5.5, 0, 0, 7); X.stroke(); }
function drawPlayer(sx, fy) {
  if (inv > 0 && (frames >> 2) & 1 && st === 'play') return;
  const ball = !g || roll || st === 'dead';
  if (ball) {
    const cy = fy - 8; CI(sx, cy, 8, '#2a63f0'); CI(sx - 2, cy - 2, 4, '#5c8cff');
    for (let i = 0; i < 4; i++) { const a = rot + i * Math.PI / 2; X.strokeStyle = '#17389c'; X.lineWidth = 2; X.beginPath(); X.moveTo(sx, cy); X.lineTo(sx + Math.cos(a) * 8, cy + Math.sin(a) * 8); X.stroke(); }
    CI(sx + 3, cy + 1, 2.5, '#ffd2a0'); return;
  }
  const fast = speed > 5.2, w = (frames >> 2) & 1;
  X.fillStyle = '#1f4fd8'; for (let i = 0; i < 3; i++) { X.beginPath(); X.moveTo(sx - 4, fy - 18 + i * 4); X.lineTo(sx - 15 - w, fy - 15 + i * 4); X.lineTo(sx - 4, fy - 12 + i * 4); X.fill(); }
  CI(sx, fy - 12, 7.5, '#2a63f0'); CI(sx + 3, fy - 16, 6.5, '#2a63f0'); R(sx + 5, fy - 14, 6, 4, '#ffd2a0'); R(sx + 10, fy - 15, 2, 2, '#000');
  R(sx + 2, fy - 20, 4, 5, '#fff'); R(sx + 4, fy - 19, 2, 3, '#000'); R(sx - 3, fy - 21, 3, 3, '#1f4fd8');
  if (fast) { CI(sx, fy - 3, 5, '#e0302f'); X.strokeStyle = '#fff'; X.lineWidth = 1; X.beginPath(); X.arc(sx, fy - 3, 4, frames * 0.8, frames * 0.8 + 2.2); X.stroke(); }
  else { R(sx - 4 + (w ? 3 : 0), fy - 5, 6, 3, '#e0302f'); R(sx - 3 + (w ? 0 : 4), fy - 4, 6, 4, '#e0302f'); R(sx + (w ? 3 : -2), fy - 2, 5, 2, '#fff'); }
}
function drw() {
  const cam = px - SX; X.save(); if (shake > 0) X.translate(rnd(-2, 2), rnd(-2, 2));
  GR(0, 170, '#2f7cff', '#b8e4ff');
  CI(310, 38, 16, '#fff7c2');
  for (let i = 0; i < 6; i++) { const cx = (((i * 120 - cam * 0.08) % 640) + 640) % 640 - 70; CI(cx, 34 + (i % 3) * 18, 8, '#fff'); CI(cx + 11, 30 + (i % 3) * 18, 11, '#fff'); CI(cx + 24, 35 + (i % 3) * 18, 8, '#fff'); R(cx, 36 + (i % 3) * 18, 24, 7, '#fff'); }
  X.fillStyle = '#2a8a58'; X.beginPath(); X.moveTo(0, 170); for (let x = 0; x <= W; x += 8) X.lineTo(x, 118 - Math.abs(Math.sin((x + cam * 0.2) * 0.012)) * 40 - Math.sin((x + cam * 0.2) * 0.031) * 8); X.lineTo(W, 170); X.fill();
  X.fillStyle = '#37b36a'; X.beginPath(); X.moveTo(0, 170); for (let x = 0; x <= W; x += 8) X.lineTo(x, 140 - Math.abs(Math.sin((x + cam * 0.45) * 0.02)) * 26); X.lineTo(W, 170); X.fill();
  for (let i = 0; i < 5; i++) { const tx = (((i * 140 - cam * 0.6) % 700) + 700) % 700 - 50; R(tx, 118, 4, 36, '#6b4a2a'); for (let k = 0; k < 4; k++) { X.strokeStyle = '#22a04a'; X.lineWidth = 3; X.beginPath(); X.moveTo(tx + 2, 118); X.quadraticCurveTo(tx + 2 + (k - 1.5) * 12, 106, tx + 2 + (k - 1.5) * 18, 122); X.stroke(); } }
  R(0, 168, W, 48, '#21140a');
  for (let sx = 0; sx < W; sx += 2) {
    const wx = cam + sx; if (inPit(wx)) continue; const y = gY(wx);
    R(sx, y, 2, 5, '#3ec43e'); R(sx, y + 5, 2, 1, '#2a9a2a');
    for (let yy = y + 6, r = 0; yy < H; yy += 16, r++) R(sx, yy, 2, Math.min(16, H - yy), ((Math.floor(wx / 16) + r) & 1) ? '#b8641c' : '#8e4a10');
  }
  ents.forEach((e) => {
    const sx = e.x - cam; if (sx < -20 || sx > W + 20) return;
    if (e.t === 'r') ringDraw(sx, e.y);
    else if (e.t === 's') { const y = gY(e.x); X.fillStyle = '#c8c8dc'; X.beginPath(); X.moveTo(sx - 7, y); X.lineTo(sx, y - 13); X.lineTo(sx + 7, y); X.fill(); X.fillStyle = '#7a7a96'; X.beginPath(); X.moveTo(sx, y - 13); X.lineTo(sx + 7, y); X.lineTo(sx, y); X.fill(); }
    else if (e.t === 'b' && e.a) { const y = gY(e.x), w = (frames >> 3) & 1; CI(sx, y - 8, 8, '#d63a2a'); R(sx - 8, y - 8, 16, 1, '#a02418'); R(sx - 4, y - 12, 3, 3, '#1a1a1a'); R(sx + 2, y - 11, 3, 3, '#1a1a1a'); CI(sx - 5, y - 2, 3, '#222'); CI(sx + 5, y - 2, 3, '#222'); R(sx - 9 - w, y - 9, 3, 3, '#ffe9a0'); }
    else if (e.t === 'p') { const y = gY(e.x), c = e.c > 0 ? 5 : 0; R(sx - 8, y - 4, 16, 4, '#8888a0'); R(sx - 7, y - 12 + c, 14, 8 - c, '#e0302f'); R(sx - 7, y - 12 + c, 14, 2, '#ff8080'); R(sx - 5, y - 6 + c / 2, 10, 2, '#ffd23c'); }
  });
  sparks.forEach((s) => { if (s.c) R(s.x - cam, s.y, 3, 3, s.c); else ringDraw(s.x - cam, s.y); });
  if (speed > 5.6 && st === 'play') for (let i = 0; i < 5; i++) R((((i * 97 - frames * 14) % W) + W) % W, 40 + i * 28, 30, 1, 'rgba(255,255,255,.55)');
  drawPlayer(SX, py);
  X.restore();
  T('PONTOS ' + pad6(score), 8, 4, '#ffe066', 9); T('ANÉIS ' + String(rings).padStart(3, '0'), 8, 15, rings ? '#ffe066' : '#ff6a6a', 9); T('RECORDE ' + pad6(hi), 8, 26, '#d8e8ff', 8);
  if (st === 'title') { R(0, 52, W, 108, 'rgba(8,16,60,.55)'); T('BLUE DASH', W / 2, 66, '#ffffff', 30, 'center'); T('BLUE DASH', W / 2 - 1, 65, '#4da3ff', 30, 'center'); if (blink()) T('APERTE A OU START', W / 2, 112, '#ffe066', 12, 'center'); T('A pula  •  B / ↓ rola e destrói robôs', W / 2, 140, '#cfe0ff', 8, 'center'); }
  else if (st === 'over') { R(0, 70, W, 70, 'rgba(0,0,0,.65)'); T('FIM DE JOGO', W / 2, 80, '#ff5a5a', 22, 'center'); T('PONTOS ' + pad6(score) + '   ANÉIS ' + rings, W / 2, 110, '#fff', 10, 'center'); if (deadT > 40 && blink()) T('APERTE A PARA TENTAR DE NOVO', W / 2, 124, '#ffe066', 9, 'center'); }
}
run({ update: upd, draw: drw });
