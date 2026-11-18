/* STREET FURY — luta 1x1 em tempo real contra a máquina, melhor de 3 rounds */
const FL = 184, ATK = { punch: { s: 4, e: 8, n: 17, dmg: 7, reach: 32, stun: 13, kb: 2.4 }, kick: { s: 9, e: 14, n: 28, dmg: 12, reach: 42, stun: 19, kb: 4.4 }, jp: { s: 3, e: 16, n: 99, dmg: 9, reach: 34, stun: 15, kb: 3 } };
let st = 'title', round = 1, wins = [0, 0], tmr = 0, clock = 60, hs = 0, shake = 0, fxs = [], skill = 0.35, A, B, bA = 0, bB = 0, res = '', pulse = 0;
const mk = (x, dir, pl) => ({ x: x, y: FL, vx: 0, vy: 0, dir: dir, hp: 100, hs: 100, st: 'idle', t: 0, an: 0, cr: 0, blk: 0, at: '', hd: 0, pl: pl, ai: { m: 'approach', t: 20, cd: 0 } });
function resetRound() { A = mk(120, 1, 1); B = mk(264, -1, 0); clock = 60; st = 'intro'; tmr = 0; fxs = []; }
function spark(x, y, c, big) { fxs.push({ x: x, y: y, l: 12, c: c, b: big }); }
function tryHit(f, o, a) {
  const dx = (o.x - f.x) * f.dir;
  if (dx < -4 || dx > a.reach + 8) return;
  if (f.at !== 'jp' && o.y < FL - 30) return;
  f.hd = 1;
  const blocking = (o.st === 'idle' || o.st === 'walk') && o.blk && (f.x - o.x) * o.dir > 0;
  const hy = f.y - 42 + (f.at === 'kick' ? 12 : 0);
  if (blocking) { o.hp = Math.max(1, o.hp - Math.ceil(a.dmg * 0.15)); o.vx = f.dir * a.kb * 0.7; f.vx = -f.dir * 0.8; spark(o.x - o.dir * 6, hy, '#9ad0ff'); snd(160, 0.06, 'square', 0.05); return; }
  o.hp -= a.dmg; o.st = 'hurt'; o.t = a.stun; o.vx = f.dir * a.kb; o.at = ''; if (o.y < FL) o.vy = -3;
  hs = 5; shake = 6; spark(o.x - o.dir * 6, hy, '#ffd23c', 1); snd(f.at === 'kick' ? 90 : 140, 0.12, 'sawtooth', 0.07, 50);
  if (o.hp <= 0) { o.hp = 0; o.st = 'ko'; o.vy = -5; o.vx = f.dir * 3.5; o.t = 0; }
}
function fu(f, o, i) {
  f.an += 0.14;
  if (f.st === 'ko') { f.vy += 0.4; f.y += f.vy; f.x += f.vx; f.vx *= 0.96; if (f.y >= FL) { f.y = FL; f.vy = 0; f.vx *= 0.6; } f.t++; f.x = clamp(f.x, 16, W - 16); return; }
  const air = f.y < FL || f.vy < 0;
  if (air) { f.vy += 0.46; f.y += f.vy; if (f.y >= FL) { f.y = FL; f.vy = 0; if (f.st === 'jump' || (f.st === 'atk' && f.at === 'jp')) { f.st = 'idle'; f.vx = 0; } } }
  f.x += f.vx;
  if (f.st === 'idle' || f.st === 'walk') {
    f.dir = o.x > f.x ? 1 : -1;
    const back = (i.l && o.x > f.x) || (i.r && o.x < f.x);
    f.cr = i.d ? 1 : 0; f.blk = back || i.d ? 1 : 0;
    let m = 0; if (!i.d) { if (i.l) m = -1; if (i.r) m = 1; }
    f.vx = m * (back ? 1.2 : 1.7); f.st = m ? 'walk' : 'idle';
    if (i.u && !f.cr) { f.vy = -8.2; f.vx = m * 2; f.st = 'jump'; f.blk = 0; snd(300, 0.15, 'square', 0.04, 600); }
    else if (i.pa) { f.st = 'atk'; f.at = 'punch'; f.t = 0; f.hd = 0; f.vx = 0; f.blk = 0; if (f.pl) { bA = 0; bB = 0; } snd(500, 0.07, 'triangle', 0.04, 250); }
    else if (i.pb) { f.st = 'atk'; f.at = 'kick'; f.t = 0; f.hd = 0; f.vx = 0; f.blk = 0; if (f.pl) { bA = 0; bB = 0; } snd(380, 0.1, 'triangle', 0.04, 160); }
  } else if (f.st === 'jump') { f.blk = 0; if (i.pa || i.pb) { f.st = 'atk'; f.at = 'jp'; f.t = 0; f.hd = 0; if (f.pl) { bA = 0; bB = 0; } snd(450, 0.08, 'triangle', 0.04, 200); } }
  else if (f.st === 'atk') { f.t++; const a = ATK[f.at]; if (f.at !== 'jp') f.vx *= 0.8; if (f.t >= a.s && f.t <= a.e && !f.hd) tryHit(f, o, a); if (f.at !== 'jp' && f.t >= a.n) f.st = 'idle'; }
  else if (f.st === 'hurt') { f.t--; f.vx *= 0.88; f.blk = 0; if (f.t <= 0) f.st = f.y < FL ? 'jump' : 'idle'; }
  f.x = clamp(f.x, 16, W - 16);
}
function ai(f, o) {
  const i = { l: 0, r: 0, u: 0, d: 0, pa: 0, pb: 0 }, d = f.ai, dx = Math.abs(o.x - f.x), tw = o.x > f.x ? 'r' : 'l', aw = tw === 'r' ? 'l' : 'r';
  if (d.cd > 0) d.cd--;
  if (o.st === 'atk' && dx < 62 && d.m !== 'block' && Math.random() < skill * 0.09) { d.m = 'block'; d.t = 16 + (Math.random() * 10 | 0); }
  if (--d.t <= 0) {
    const r = Math.random();
    if (dx > 78) d.m = r < 0.12 * skill ? 'jumpin' : 'approach';
    else if (dx > 46) d.m = r < 0.45 ? 'approach' : r < 0.45 + 0.3 * skill ? 'kick' : 'wait';
    else d.m = r < 0.5 ? 'punch' : r < 0.5 + 0.2 * skill ? 'kick' : r < 0.82 ? 'retreat' : r < 0.9 ? 'block' : 'jumpin';
    d.t = 8 + (Math.random() * 16 | 0);
    if (d.cd > 0 && (d.m === 'punch' || d.m === 'kick')) d.m = 'wait';
  }
  if (d.m === 'approach') i[tw] = 1; else if (d.m === 'retreat') i[aw] = 1; else if (d.m === 'block') { i[aw] = 1; if (Math.random() < 0.5) i.d = 1; }
  else if (d.m === 'jumpin') { i.u = 1; i[tw] = 1; d.m = 'approach'; }
  else if (d.m === 'punch' && dx < 46) { i.pa = 1; d.cd = Math.max(10, 38 - skill * 26) | 0; d.m = 'wait'; d.t = 10; }
  else if (d.m === 'kick' && dx < 56) { i.pb = 1; d.cd = Math.max(14, 46 - skill * 28) | 0; d.m = 'wait'; d.t = 14; }
  return i;
}
function endRound(txt, w) { st = 'end'; tmr = 0; res = txt; if (w >= 0) wins[w]++; }
function upd() {
  pulse++;
  if (shake > 0) shake--;
  fxs.forEach((s) => s.l--); fxs = fxs.filter((s) => s.l > 0);
  if (st === 'title') { if (go()) { wins = [0, 0]; round = 1; skill = 0.35; resetRound(); } return; }
  if (st === 'mend') { if (++tmr > 50 && go()) st = 'title'; return; }
  if (hs > 0) { hs--; return; }
  bA = P.a ? 8 : bA - 1; bB = P.b ? 8 : bB - 1;
  if (st === 'intro') { tmr++; fu(A, B, { l: 0, r: 0, u: 0, d: 0, pa: 0, pb: 0 }); fu(B, A, { l: 0, r: 0, u: 0, d: 0, pa: 0, pb: 0 }); if (tmr === 52) snd(700, 0.3, 'square', 0.06, 1100); if (tmr > 100) st = 'fight'; return; }
  if (st === 'fight') {
    fu(A, B, { l: K.l, r: K.r, u: K.u, d: K.d, pa: bA > 0, pb: bB > 0 });
    fu(B, A, ai(B, A));
    if (A.y >= FL && B.y >= FL && Math.abs(A.x - B.x) < 22) { const p = (22 - Math.abs(A.x - B.x)) / 2, s = A.x < B.x ? 1 : -1; A.x -= p * s; B.x += p * s; A.x = clamp(A.x, 16, W - 16); B.x = clamp(B.x, 16, W - 16); }
    if (frames % 60 === 0 && --clock <= 0) { clock = 0; if (A.hp > B.hp) endRound('TEMPO!', 0); else if (B.hp > A.hp) endRound('TEMPO!', 1); else endRound('EMPATE', -1); return; }
    if (B.hp <= 0 && A.hp <= 0) endRound('K.O.', -1); else if (B.hp <= 0) endRound('K.O.!', 0); else if (A.hp <= 0) endRound('K.O.!', 1);
    return;
  }
  if (st === 'end') {
    tmr++; fu(A, B, { l: 0, r: 0, u: 0, d: 0, pa: 0, pb: 0 }); fu(B, A, { l: 0, r: 0, u: 0, d: 0, pa: 0, pb: 0 });
    if (tmr > 150) {
      if (wins[0] >= 2 || wins[1] >= 2) { st = 'mend'; tmr = 0; saveHi(wins[0] * 1000 + Math.round(A.hp) * 10); }
      else { round++; skill = Math.min(0.85, skill + 0.14); resetRound(); }
    }
  }
}
function limb(a, b, c, d, w, col) { X.strokeStyle = col; X.lineWidth = w; X.lineCap = 'round'; X.beginPath(); X.moveTo(a, b); X.lineTo(c, d); X.stroke(); }
function drawF(f, pal) {
  const d = f.dir, x = f.x, y = f.y, air = FL - y;
  X.fillStyle = 'rgba(0,0,0,.35)'; X.beginPath(); X.ellipse(x, FL + 3, Math.max(6, 17 - air * 0.12), 4, 0, 0, 7); X.fill();
  X.save(); if (f.st === 'hurt' && (frames >> 1) & 1) X.globalAlpha = 0.7;
  if (f.st === 'ko' && f.y >= FL - 1) {
    const e = -d; limb(x - e * 16, y - 6, x + e * 14, y - 6, 9, pal.gi); limb(x + e * 14, y - 5, x + e * 30, y - 5, 6, pal.pants); limb(x - e * 16, y - 6, x - e * 24, y - 12, 5, pal.skin); CI(x - e * 22, y - 8, 7, pal.skin); R(x - e * 22 - 3, y - 15, 7, 3, pal.hair); X.restore(); return;
  }
  const bob = f.st === 'idle' ? Math.sin(frames * 0.12) * 1.2 : 0, cr = f.cr && y >= FL && f.st !== 'atk';
  const hip = y - (cr ? 15 : 26) + bob * 0.5, sh = hip - 21, lean = f.st === 'hurt' || f.st === 'ko' ? -d * 5 : f.st === 'atk' && f.at === 'punch' ? d * 3 : 0;
  let ffx = x + d * 9, ffy = y, bfx = x - d * 8, bfy = y, fhx = x + d * 15, fhy = sh + 3, bhx = x + d * 7, bhy = sh + 8;
  if (f.st === 'walk') { const s = Math.sin(f.an * 2.2) * 9; ffx = x + s; bfx = x - s; ffy = y - Math.max(0, Math.cos(f.an * 2.2)) * 4; bfy = y - Math.max(0, -Math.cos(f.an * 2.2)) * 4; }
  if (cr) { ffx = x + d * 13; bfx = x - d * 11; }
  if (air > 2) { ffx = x + d * 10; ffy = y - 12; bfx = x - d * 6; bfy = y - 7; }
  if (f.st === 'atk') {
    const a = ATK[f.at], p = f.t < a.s ? f.t / a.s : f.t <= a.e ? 1 : Math.max(0, 1 - (f.t - a.e) / (a.n - a.e > 20 ? 20 : a.n - a.e));
    if (f.at === 'punch' || (f.at === 'jp' && f.t % 2 >= 0 && f.t > 99)) { fhx = x + d * (14 + 24 * p); fhy = sh + 4; }
    else if (f.at === 'kick') { ffx = x + d * (9 + 30 * p); ffy = y - 4 - 24 * p; bhx = x + d * 6; bhy = sh + 6; }
    else { ffx = x + d * (12 + 24 * p); ffy = y - 10 - 8 * p; fhx = x + d * 18; fhy = sh + 2; }
  }
  if (f.blk && (f.st === 'idle' || f.st === 'walk')) { fhx = x + d * 11; fhy = sh - 3; bhx = x + d * 9; bhy = sh + 6; }
  if (f.st === 'hurt') { fhx = x - d * 6; fhy = sh + 12; bhx = x - d * 10; bhy = sh + 10; }
  limb(x - d * 4, hip, bfx, bfy - 3, 7, pal.pants); limb(bfx, bfy - 2, bfx + d * 4, bfy, 5, '#222');
  limb(x + lean - d * 2, sh + 3, bhx, bhy, 5, pal.skin);
  R(x + lean - 7, sh, 14, 22 - (cr ? 3 : 0), pal.gi); R(x + lean - 7, hip - 6, 14, 3, pal.belt); R(x + lean - d * 7 - 1, sh + 2, 2, 16, 'rgba(0,0,0,.18)');
  CI(x + lean + d * 1, sh - 7, 7.5, pal.skin); R(x + lean - 8, sh - 12, 16, 4, pal.hair); R(x + lean - 8, sh - 9, 16, 2, pal.band); R(x + lean - d * 10 - 1, sh - 9, 2, 8, pal.band);
  R(x + lean + d * 4 - 1, sh - 8, 2, 2, '#000'); if (f.st === 'hurt') R(x + lean + d * 2, sh - 3, 4, 2, '#7a1a1a');
  limb(x + d * 4, hip, ffx, ffy - 3, 7.5, pal.pants); limb(ffx, ffy - 2, ffx + d * 5, ffy, 5.5, '#222');
  limb(x + lean + d * 2, sh + 3, fhx, fhy, 5.5, pal.skin); CI(fhx, fhy, f.st === 'atk' && f.at === 'punch' ? 4.5 : 3.5, pal.glove);
  X.restore();
}
const PA = { gi: '#f4f4f4', pants: '#f4f4f4', belt: '#222', skin: '#f0b888', hair: '#3a2410', band: '#e02a2a', glove: '#e02a2a' };
const PB = { gi: '#2f5fd0', pants: '#27479e', belt: '#ffd23c', skin: '#d99a66', hair: '#111', band: '#ffd23c', glove: '#1a1a1a' };
function bg() {
  GR(0, FL - 20, '#150a33', '#6a2a7a'); CI(300, 46, 22, '#ffd9f0'); CI(306, 42, 20, '#150a33');
  for (let i = 0; i < 40; i++) R((i * 97) % W, (i * 53) % 90, 1, 1, i % 3 ? '#8a7ab8' : '#fff');
  for (let i = 0; i < 9; i++) { const bx = i * 46 - 8, bh = 70 + (i * 37) % 50; R(bx, FL - 20 - bh, 40, bh + 20, i % 2 ? '#1c1238' : '#241846'); for (let wy = 0; wy < bh - 8; wy += 12) for (let wx = 0; wx < 34; wx += 10) if (((i * 7 + wy + wx) * 31) % 5 < 2 && !(((frames >> 6) + wx + wy + i) % 17 === 0)) R(bx + 4 + wx, FL - 14 - bh + wy, 5, 6, '#ffd878'); }
  const ng = blink(40) ? '#ff4fd0' : '#ff7ae0'; R(60, 52, 108, 22, 'rgba(0,0,0,.55)'); T('TEMPEST', 114, 56, ng, 15, 'center');
  X.strokeStyle = ng; X.lineWidth = 1; X.strokeRect(61, 53, 106, 20);
  for (let i = 0; i < 22; i++) { const cx = i * 18 + (i % 3) * 4, by = Math.sin(frames * 0.12 + i * 1.7) * 2; CI(cx, FL - 6 + by, 6, i % 2 ? '#0e0720' : '#150a2e'); R(cx - 6, FL - 2 + by, 12, 10, i % 2 ? '#0e0720' : '#150a2e'); }
  for (const lx of [24, 190, 356]) { R(lx, FL - 56, 3, 52, '#3a2a58'); R(lx - 6, FL - 58, 15, 4, '#3a2a58'); CI(lx + 1, FL - 54, 5, 'rgba(255,230,140,.9)'); X.fillStyle = 'rgba(255,230,140,.12)'; X.beginPath(); X.moveTo(lx - 3, FL - 52); X.lineTo(lx + 5, FL - 52); X.lineTo(lx + 22, FL); X.lineTo(lx - 20, FL); X.fill(); }
  R(0, FL, W, H - FL, '#2a2638'); R(0, FL, W, 3, '#4a4468'); for (let i = 0; i < 12; i++) R(i * 36 - 10, FL + 18, 22, 2, '#4a4468');
  GR(FL + 3, H, 'rgba(255,120,220,.12)', 'rgba(0,0,0,0)');
}
function bar(x, w, f, rtl, name) {
  f.hs += (f.hp - f.hs) * 0.06; if (f.hs < f.hp) f.hs = f.hp;
  R(x - 1, 5, w + 2, 12, '#000'); R(x, 6, w, 10, '#401018');
  const ws = w * f.hs / 100, wh = w * f.hp / 100;
  R(rtl ? x + w - ws : x, 6, ws, 10, '#ffd23c'); R(rtl ? x + w - wh : x, 6, wh, 10, f.hp > 30 ? '#38e060' : '#ff4a4a'); R(rtl ? x + w - wh : x, 6, wh, 3, 'rgba(255,255,255,.35)');
  T(name, rtl ? x + w : x, 18, '#fff', 8, rtl ? 'right' : 'left');
}
function drw() {
  X.save(); if (shake > 0) X.translate(rnd(-2, 2), rnd(-1.5, 1.5));
  bg();
  if (st === 'title') { drawF(mk(150, 1, 1), PA); drawF(mk(234, -1, 0), PB); }
  else { drawF(B, PB); drawF(A, PA); }
  fxs.forEach((s) => { const r = (12 - s.l) * (s.b ? 2.2 : 1.4) + 3; X.strokeStyle = s.c; X.lineWidth = 2; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + (s.b ? 0.4 : 0); X.beginPath(); X.moveTo(s.x + Math.cos(a) * r * 0.5, s.y + Math.sin(a) * r * 0.5); X.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); X.stroke(); } });
  X.restore();
  if (st !== 'title') {
    bar(8, 114, A, false, 'VOCÊ'); bar(200, 114, B, true, 'CPU'); R(150, 5, 30, 14, '#000'); T(String(clock).padStart(2, '0'), 165, 6, clock <= 10 ? '#ff6a6a' : '#fff', 12, 'center');
    for (let k = 0; k < 2; k++) { CI(14 + k * 12, 29, 4, wins[0] > k ? '#ffd23c' : '#3a3050'); CI(316 - k * 12, 29, 4, wins[1] > k ? '#ffd23c' : '#3a3050'); }
  }
  if (st === 'intro') { if (tmr < 52) T('ROUND ' + round, W / 2, 80, '#fff', 26, 'center'); else T('LUTE!', W / 2, 80, '#ffd23c', 34, 'center'); }
  if (st === 'end') T(res, W / 2, 70, '#ff5a5a', 34, 'center');
  if (st === 'mend') { R(0, 64, W, 80, 'rgba(0,0,0,.7)'); T(wins[0] >= 2 ? 'VOCÊ VENCEU!' : 'VOCÊ PERDEU', W / 2, 76, wins[0] >= 2 ? '#38e060' : '#ff5a5a', 24, 'center'); T('RODADAS ' + wins[0] + ' x ' + wins[1], W / 2, 108, '#fff', 11, 'center'); if (tmr > 50 && blink()) T('APERTE A', W / 2, 124, '#ffe066', 10, 'center'); }
  if (st === 'title') { R(0, 28, W, 66, 'rgba(8,6,28,.6)'); T('STREET', W / 2 - 52, 34, '#ffd23c', 28, 'center'); T('FURY', W / 2 + 62, 34, '#ff4a4a', 28, 'center'); if (blink()) T('APERTE A OU START', W / 2, 70, '#fff', 11, 'center'); T('A soco • B chute • ← → anda (de costas defende) • ↑ pula', W / 2, 202, '#cfe0ff', 8, 'center'); }
}
run({ update: upd, draw: drw });
