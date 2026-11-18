/* GEM STACK — quebra-cabeça de colunas: alinhe 3+ gemas iguais (linha, coluna ou diagonal) e faça combos */
const CW = 6, CH = 13, CS = 16, OX = 144, OY = 4, COL = ['#e8323c', '#2f8cff', '#2ccf6a', '#ffd23c', '#b04cff', '#ff8a2a'];
let st = 'title', grid, pc, nx, score = 0, level = 1, cleared = 0, dropT = 0, ph = 'fall', ft = 0, combo = 0, marks = null, parts = [], hl = 0, hr = 0, msgT = '', msg = 0, st2 = 0, deco = [];
const newG = () => { const a = []; for (let r = 0; r < CH; r++) a.push(new Array(CW).fill(0)); return a; };
const rg = () => [1 + (Math.random() * 6 | 0), 1 + (Math.random() * 6 | 0), 1 + (Math.random() * 6 | 0)];
const interval = () => Math.max(4, 34 - level * 3);
function reset() { grid = newG(); score = 0; level = 1; cleared = 0; combo = 0; parts = []; nx = rg(); spawn(); st = 'play'; }
function spawn() {
  pc = { x: 2, y: 0, g: nx }; nx = rg(); dropT = 0; ph = 'fall';
  if (grid[0][2] || grid[1][2] || grid[2][2]) { st = 'over'; st2 = 0; saveHi(score); snd(200, 0.8, 'sawtooth', 0.06, 50); }
}
const free = (x, y) => x >= 0 && x < CW && y < CH && (y < 0 || !grid[y][x]);
function findM() {
  const set = new Set(), D = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let r = 0; r < CH; r++) for (let c = 0; c < CW; c++) {
    const v = grid[r][c]; if (!v) continue;
    for (const d of D) {
      const pr = r - d[1], pq = c - d[0]; if (pr >= 0 && pr < CH && pq >= 0 && pq < CW && grid[pr][pq] === v) continue;
      let n = 0; while (r + d[1] * n >= 0 && r + d[1] * n < CH && c + d[0] * n >= 0 && c + d[0] * n < CW && grid[r + d[1] * n][c + d[0] * n] === v) n++;
      if (n >= 3) for (let k = 0; k < n; k++) set.add((r + d[1] * k) * CW + c + d[0] * k);
    }
  }
  return set;
}
function check() {
  const m = findM();
  if (m.size) { combo++; marks = m; ph = 'flash'; ft = 28; snd(520 + combo * 90, 0.12, 'square', 0.05); snd(780 + combo * 110, 0.2, 'square', 0.05); if (combo > 1) { msgT = 'COMBO x' + combo + '!'; msg = 70; } }
  else { combo = 0; spawn(); }
}
function lock() {
  for (let k = 0; k < 3; k++) grid[pc.y + k][pc.x] = pc.g[k];
  snd(160, 0.05, 'square', 0.04); check();
}
function upd() {
  if (st === 'title') { if (frames % 10 === 0) deco.push({ x: rnd(0, W), y: -10, c: 1 + (Math.random() * 6 | 0), v: rnd(0.8, 2) }); deco.forEach((d) => d.y += d.v); deco = deco.filter((d) => d.y < H + 12); if (go()) reset(); return; }
  parts.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.l--; }); parts = parts.filter((p) => p.l > 0);
  if (msg > 0) msg--;
  if (st === 'over') { if (++st2 > 50 && go()) st = 'title'; return; }
  if (ph === 'fall') {
    hl = K.l ? hl + 1 : 0; hr = K.r ? hr + 1 : 0;
    const mvL = P.l || (hl > 12 && hl % 4 === 0), mvR = P.r || (hr > 12 && hr % 4 === 0);
    if (mvL && !K.r && free(pc.x - 1, pc.y + 2)) { pc.x--; snd(300, 0.03, 'square', 0.02); }
    if (mvR && !K.l && free(pc.x + 1, pc.y + 2)) { pc.x++; snd(300, 0.03, 'square', 0.02); }
    if (P.a || P.u) { pc.g = [pc.g[2], pc.g[0], pc.g[1]]; snd(600, 0.04, 'triangle', 0.03); }
    if (P.b) { pc.g = [pc.g[1], pc.g[2], pc.g[0]]; snd(500, 0.04, 'triangle', 0.03); }
    dropT += K.d ? Math.max(1, interval() / 3) : 1;
    if (dropT >= interval()) { dropT = 0; if (free(pc.x, pc.y + 3)) { pc.y++; if (K.d) score += 1; } else lock(); }
  } else if (ph === 'flash') {
    if (--ft <= 0) {
      const n = marks.size; marks.forEach((i) => { const r = (i / CW) | 0, c = i % CW; for (let k = 0; k < 5; k++) parts.push({ x: OX + c * CS + 8, y: OY + r * CS + 8, vx: rnd(-2, 2), vy: rnd(-3, 0.5), l: 34, c: COL[grid[r][c] - 1] }); grid[r][c] = 0; });
      score += n * 30 * combo * level; cleared += n; level = 1 + ((cleared / 24) | 0); ph = 'settle'; ft = 0; marks = null;
    }
  } else if (ph === 'settle') {
    if (++ft % 4 === 0) {
      let moved = 0;
      for (let c = 0; c < CW; c++) for (let r = CH - 2; r >= 0; r--) if (grid[r][c] && !grid[r + 1][c]) { grid[r + 1][c] = grid[r][c]; grid[r][c] = 0; moved = 1; }
      if (!moved) check();
    }
  }
}
function gem(x, y, c, a) {
  const cx = x + 8, cy = y + 8, col = COL[c - 1], sh = (c - 1) % 6; X.save(); X.globalAlpha = a === undefined ? 1 : a; X.beginPath();
  const poly = (n, r, off) => { for (let i = 0; i < n; i++) { const t = off + i * 2 * Math.PI / n; i ? X.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r) : X.moveTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); } X.closePath(); };
  const path = (k) => { X.beginPath(); if (sh === 0) poly(4, 8 * k, -Math.PI / 2); else if (sh === 1) X.arc(cx, cy, 7.2 * k, 0, 7); else if (sh === 2) X.rect(cx - 6.2 * k, cy - 6.2 * k, 12.4 * k, 12.4 * k); else if (sh === 3) { X.moveTo(cx, cy + 7.5 * k); X.lineTo(cx - 8 * k, cy - 6 * k); X.lineTo(cx + 8 * k, cy - 6 * k); X.closePath(); } else if (sh === 4) poly(6, 8 * k, 0); else poly(5, 8 * k, -Math.PI / 2); };
  path(1); X.fillStyle = col; X.fill(); X.lineWidth = 1.5; X.strokeStyle = 'rgba(0,0,0,.65)'; X.stroke();
  path(0.55); X.fillStyle = 'rgba(255,255,255,.28)'; X.fill();
  X.fillStyle = 'rgba(255,255,255,.75)'; X.beginPath(); X.ellipse(cx - 2.5, cy - 3, 2, 1.2, -0.6, 0, 7); X.fill(); X.restore();
}
function drw() {
  GR(0, H, '#140a38', '#3b1a6a');
  for (let i = 0; i < 18; i++) { const sx = (i * 61 + frames * 0.3 * (1 + i % 3)) % (W + 20) - 10; R(sx, (i * 47) % H, 2, 2, 'rgba(255,255,255,.35)'); }
  R(OX - 4, OY - 3, CW * CS + 8, CH * CS + 6, '#0a0620'); R(OX - 2, OY - 1, CW * CS + 4, CH * CS + 2, '#4a3a8a'); R(OX, OY, CW * CS, CH * CS, '#120a30');
  for (let r = 0; r < CH; r++) for (let c = 0; c < CW; c++) if ((r + c) & 1) R(OX + c * CS, OY + r * CS, CS, CS, 'rgba(255,255,255,.04)');
  if (st === 'title') { deco.forEach((d) => gem(d.x, d.y, d.c)); }
  if (grid) {
    for (let r = 0; r < CH; r++) for (let c = 0; c < CW; c++) { const v = grid[r][c]; if (!v) continue; const k = r * CW + c; if (marks && marks.has(k) && (ft >> 2) & 1) { gem(OX + c * CS, OY + r * CS, v, 0.25); continue; } gem(OX + c * CS, OY + r * CS, v); }
    if (ph === 'fall' && pc && st === 'play') { const off = Math.min(CS - 1, (dropT / interval()) * CS * (free(pc.x, pc.y + 3) ? 1 : 0)); for (let k = 0; k < 3; k++) gem(OX + pc.x * CS, OY + (pc.y + k) * CS + off, pc.g[k]); }
  }
  parts.forEach((p) => R(p.x, p.y, 3, 3, p.c));
  T('PONTOS', 12, 40, '#ffe066', 9); T(pad6(score), 12, 52, '#fff', 14); T('NÍVEL', 12, 80, '#ffe066', 9); T(String(level), 12, 92, '#fff', 14);
  T('GEMAS', 12, 120, '#ffe066', 9); T(String(cleared), 12, 132, '#fff', 14); T('RECORDE', 12, 160, '#9fb0e0', 8); T(pad6(hi), 12, 171, '#cfe0ff', 9);
  T('PRÓXIMA', 262, 40, '#ffe066', 9); R(268, 54, 24, 56, '#0a0620'); R(269, 55, 22, 54, '#120a30');
  if (nx && st !== 'title') for (let k = 0; k < 3; k++) gem(272, 57 + k * CS, nx[k]);
  T('A/B giram', 262, 130, '#9fb0e0', 8); T('↓ desce rápido', 262, 142, '#9fb0e0', 8); T('3 iguais somem', 262, 160, '#9fb0e0', 8); T('em qualquer linha', 262, 171, '#9fb0e0', 8);
  if (msg > 0) T(msgT, OX + CW * CS / 2, 90, '#ffe066', 14, 'center');
  if (st === 'title') { R(OX, 70, CW * CS, 70, 'rgba(10,6,32,.8)'); T('GEM', W / 2, 78, '#ffd23c', 20, 'center'); T('STACK', W / 2, 98, '#ff5ac8', 20, 'center'); if (blink()) T('APERTE A', W / 2, 124, '#fff', 10, 'center'); }
  if (st === 'over') { R(OX, 70, CW * CS, 76, 'rgba(10,6,32,.85)'); T('FIM DE', W / 2, 76, '#ff5a5a', 14, 'center'); T('JOGO', W / 2, 92, '#ff5a5a', 14, 'center'); T(pad6(score), W / 2, 112, '#fff', 10, 'center'); if (st2 > 50 && blink()) T('APERTE A', W / 2, 128, '#ffe066', 9, 'center'); }
}
run({ update: upd, draw: drw });
