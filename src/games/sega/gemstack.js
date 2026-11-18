'use strict';
// GEM STACK - quebra-cabecas de gemas por turnos (inspirado nos classicos de colunas)
const { rgb, mix, rng } = require('./gfx');

const COLS = 6, ROWS = 12, CELL = 13, X0 = 121, Y0 = 20, MAXP = 14, FALL = 4;
const GEMS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7', '#fb923c'].map(rgb);

function newPiece(s) { return [1 + s.r.int(5), 1 + s.r.int(5), 1 + s.r.int(5)]; }

function init(seed) {
  const r = rng(seed || 9);
  const s = { r: r, board: [], piece: null, next: null, score: 0, placed: 0, chain: 0, flash: [], over: false, won: false, moves: 0, msg: 'Combine 3 ou mais gemas iguais (linha, coluna ou diagonal)!' };
  for (let i = 0; i < ROWS; i++) s.board.push(new Array(COLS).fill(0));
  s.next = newPiece(s);
  spawn(s);
  return s;
}

function fits(s, c, r) {
  if (c < 0 || c >= COLS) return false;
  for (let i = 0; i < 3; i++) { const rr = r + i; if (rr >= ROWS || s.board[rr][c]) return false; }
  return true;
}

function spawn(s) {
  s.placed++;
  if (!fits(s, 2, 0)) { s.over = true; s.piece = null; s.msg = 'A torre chegou ao topo!'; return; }
  s.piece = { c: 2, r: 0, g: s.next };
  s.next = newPiece(s);
}

function findMarks(s) {
  const mark = [];
  for (let i = 0; i < ROWS; i++) mark.push(new Array(COLS).fill(false));
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = s.board[r][c];
    if (!v) continue;
    dirs.forEach((d) => {
      let n = 1;
      while (true) { const rr = r + d[0] * n, cc = c + d[1] * n; if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || s.board[rr][cc] !== v) break; n++; }
      const pr = r - d[0], pc = c - d[1];
      if (n >= 3 && !(pr >= 0 && pr < ROWS && pc >= 0 && pc < COLS && s.board[pr][pc] === v)) for (let k = 0; k < n; k++) mark[r + d[0] * k][c + d[1] * k] = true;
    });
  }
  return mark;
}

function resolve(s) {
  let chain = 0, gained = 0;
  s.flash = [];
  for (;;) {
    const m = findMarks(s);
    let cnt = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (m[r][c]) { cnt++; if (chain === 0) s.flash.push([r, c]); s.board[r][c] = 0; }
    if (!cnt) break;
    chain++; gained += 30 * cnt * chain;
    for (let c = 0; c < COLS; c++) {
      let w = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) if (s.board[r][c]) { const v = s.board[r][c]; s.board[r][c] = 0; s.board[w][c] = v; w--; }
    }
  }
  s.chain = chain; s.score += gained;
  return { chain: chain, gained: gained };
}

function lock(s) {
  const p = s.piece;
  for (let i = 0; i < 3; i++) s.board[p.r + i][p.c] = p.g[i];
  const res = resolve(s);
  s.msg = res.chain ? (res.chain > 1 ? 'CADEIA x' + res.chain + '! ' : '') + '+' + res.gained + ' pontos' : '';
  if (s.placed >= MAXP) { s.piece = null; s.over = true; s.won = s.score >= 500; s.msg += (s.msg ? ' • ' : '') + 'Rodada completa!'; return; }
  spawn(s);
}

function controls() {
  return { main: [{ id: 'left', label: '◀️ Esquerda' }, { id: 'rot', label: '🔄 Girar' }, { id: 'right', label: '▶️ Direita' }], more: [] };
}

function act(s, id) {
  if (s.over || !s.piece) return;
  s.moves++; s.flash = []; s.msg = '';
  const p = s.piece;
  if (id === 'left' && fits(s, p.c - 1, p.r)) p.c--;
  else if (id === 'right' && fits(s, p.c + 1, p.r)) p.c++;
  else if (id === 'rot') p.g = [p.g[2], p.g[0], p.g[1]];
  for (let i = 0; i < FALL; i++) {
    if (fits(s, p.c, p.r + 1)) p.r++; else { lock(s); break; }
  }
}

function caption(s) {
  return (s.msg ? s.msg + '\n' : '') + 'Pontos: ' + s.score + ' • Peça: ' + Math.min(s.placed, MAXP) + '/' + MAXP + ' • Meta: 500 pontos' + (s.over ? '' : '\nA peça cai ' + FALL + ' linhas a cada jogada.');
}

function gem(g, x, y, v, ghost) {
  const base = GEMS[v], hi = mix(base, [255, 255, 255], 0.5), lo = mix(base, [0, 0, 0], 0.4);
  g.rect(x, y, CELL, CELL, lo);
  g.rect(x + 1, y + 1, CELL - 2, CELL - 2, base);
  g.rect(x + 1, y + 1, CELL - 2, 2, hi); g.rect(x + 1, y + 1, 2, CELL - 2, hi);
  g.rect(x + 4, y + 4, CELL - 8, CELL - 8, mix(base, [255, 255, 255], 0.2));
  g.px(x + 3, y + 3, [255, 255, 255]); g.px(x + 4, y + 3, [255, 255, 255]);
  if (ghost) g.rect(x, y, CELL, 1, [255, 255, 255]);
}

function render(g, s) {
  g.gradient(0, 180, rgb('#0b1026'), rgb('#25104a'));
  for (let i = 0; i < 60; i++) g.px((i * 53) % 320, (i * 37) % 180, i % 3 ? rgb('#3a3a6a') : rgb('#6a6aa0'));
  // quadro
  g.rect(X0 - 4, Y0 - 4, COLS * CELL + 8, ROWS * CELL + 8, rgb('#8b5cf6'));
  g.rect(X0 - 2, Y0 - 2, COLS * CELL + 4, ROWS * CELL + 4, rgb('#1b1340'));
  g.rect(X0, Y0, COLS * CELL, ROWS * CELL, rgb('#0e0a26'));
  for (let c = 1; c < COLS; c++) g.rect(X0 + c * CELL, Y0, 1, ROWS * CELL, rgb('#1a1440'));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (s.board[r][c]) gem(g, X0 + c * CELL, Y0 + r * CELL, s.board[r][c]);
  if (s.piece) { for (let i = 0; i < 3; i++) gem(g, X0 + s.piece.c * CELL, Y0 + (s.piece.r + i) * CELL, s.piece.g[i], true); }
  s.flash.forEach((f) => { const x = X0 + f[1] * CELL + 6, y = Y0 + f[0] * CELL + 6; g.line(x - 6, y, x + 6, y, rgb('#ffffff')); g.line(x, y - 6, x, y + 6, rgb('#ffe066')); });
  // paineis
  g.rect(8, 22, 100, 70, rgb('#1b1340')); g.rect(8, 22, 100, 2, rgb('#8b5cf6'));
  g.text('PONTOS', 16, 30, rgb('#c4b5fd'), 2); g.text(String(s.score), 16, 48, rgb('#ffe066'), 3, rgb('#333333'));
  g.text('CADEIA ' + (s.chain || 0), 16, 74, rgb('#7dd3fc'), 1);
  g.rect(8, 100, 100, 70, rgb('#1b1340')); g.rect(8, 100, 100, 2, rgb('#8b5cf6'));
  g.text('PECA', 16, 108, rgb('#c4b5fd'), 2); g.text(Math.min(s.placed, MAXP) + '/' + MAXP, 16, 126, rgb('#ffffff'), 3, rgb('#333333'));
  g.rect(212, 22, 100, 78, rgb('#1b1340')); g.rect(212, 22, 100, 2, rgb('#8b5cf6'));
  g.text('PROXIMA', 220, 30, rgb('#c4b5fd'), 2);
  if (s.next && !s.over) for (let i = 0; i < 3; i++) gem(g, 250, 46 + i * CELL, s.next[i]);
  g.rect(212, 108, 100, 62, rgb('#1b1340')); g.rect(212, 108, 100, 2, rgb('#8b5cf6'));
  g.text('META', 220, 116, rgb('#c4b5fd'), 2); g.text('500', 220, 134, s.score >= 500 ? rgb('#4ade80') : rgb('#ffffff'), 3, rgb('#333333'));
  g.rect(0, 0, 320, 14, rgb('#000000'));
  g.textC('GEM STACK', 160, 3, rgb('#ffffff'), 2, rgb('#4c1d95'));
  if (s.over) {
    g.rect(110, 70, 100, 44, rgb('#000000'));
    g.textC(s.won ? 'VITORIA!' : 'FIM', 160, 76, s.won ? rgb('#ffe066') : rgb('#ff6b6b'), 3, rgb('#333333'));
    g.textC(s.score + ' PTS', 160, 98, rgb('#ffffff'), 2);
  }
}

module.exports = { id: 'gemstack', name: 'GEM STACK', emoji: '💎', tag: 'Quebra-cabeças', desc: 'Encaixe colunas de gemas e faça cadeias de 3 ou mais iguais', init: init, controls: controls, act: act, render: render, caption: caption };
