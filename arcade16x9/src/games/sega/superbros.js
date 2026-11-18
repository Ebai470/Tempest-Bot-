'use strict';
// SUPER TEMPEST BROS - plataforma por turnos (inspirado nos classicos de mascote)
const { rgb, pal } = require('./gfx');

const TS = 16, VW = 20, ROWS = 11, OY = 4, L = 72, FLAG = 66;

const P = pal({ P: '#7c3aed', S: '#f5c6a0', K: '#1b1b1b', M: '#c0392b', T: '#14b8a6', B: '#6b3f1d', W: '#ffffff', Y: '#ffd23f', O: '#ffb300' });
const HERO = [
  '....PPPP....', '...PPPPPP...', '..PPPPPPPP..', '..PSSSSSSP..', '..SSKSSKSS..', '..SSSSSSSS..', '...SSMMSS...', '....TTTT....',
  '...TTTTTT...', '..TTTTTTTT..', '..SSTTTTSS..', '..SS.TT.SS..', '....TTTT....', '...TT..TT...', '...BB..BB...', '..BBB..BBB..'];
const SLIME_P = pal({ G: '#6ccf3f', D: '#3a8f1e', W: '#ffffff', K: '#1b1b1b' });
const SLIME = ['....GGGG....', '..GGGGGGGG..', '.GGGGGGGGGG.', '.GWKGGGGWKG.', 'GGGGGGGGGGGG', 'GGGGGGGGGGGG', '.DDDDDDDDDD.', '..DD....DD..'];
const HEART_P = pal({ R: '#ff3b5c', H: '#ffb3c1' });
const HEART = ['.RR.RR.', 'RHRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'];
const COIN_P = pal({ Y: '#ffd23f', O: '#e09a00', W: '#fff6b0' });
const COIN = ['..YYYY..', '.YWYYOY.', 'YYWYYYOY', 'YYWYYYOY', 'YYWYYYOY', 'YYYYYYOY', '.YYYYOY.', '..YYYY..'];

function build() {
  const g = [];
  for (let r = 0; r < ROWS; r++) g.push(new Array(L).fill(' '));
  const gaps = [[17, 19], [36, 38], [52, 53]];
  for (let c = 0; c < L; c++) {
    if (gaps.some((x) => c >= x[0] && c <= x[1])) continue;
    g[9][c] = 'G'; g[10][c] = 'D';
  }
  [[26, 2], [44, 2]].forEach((pp) => {
    for (let dc = 0; dc < 2; dc++) for (let k = 0; k < pp[1]; k++) g[8 - k][pp[0] + dc] = (k === pp[1] - 1 ? 'T' : 'P').toString()[0] === 'T' ? (dc ? 't' : 'T') : (dc ? 'p' : 'P');
  });
  [[7, '?'], [8, 'B'], [9, '?'], [10, 'B'], [11, '?'], [30, 'B'], [31, '?'], [32, 'B'], [48, '?'], [49, 'B'], [50, '?']].forEach((b) => { g[5][b[0]] = b[1]; });
  for (let i = 0; i < 4; i++) for (let k = 0; k <= i; k++) g[8 - k][58 + i] = 'S';
  const coins = [[18, 6], [18, 5], [37, 6], [37, 5], [53, 6], [3, 8], [4, 8], [14, 8], [28, 4], [29, 4], [41, 8], [46, 4], [47, 4], [64, 8]].map((a) => ({ c: a[0], r: a[1], got: false }));
  const enemies = [[13, 6, 15], [31, 28, 34], [41, 40, 43], [48, 46, 51], [56, 55, 57]].map((a) => ({ c: a[0], min: a[1], max: a[2], dir: 1, alive: true }));
  return { grid: g, coins: coins, enemies: enemies };
}

function init() {
  const lv = build();
  return { grid: lv.grid, coins: lv.coins, enemies: lv.enemies, p: { c: 1, r: 8 }, face: 1, lives: 3, score: 0, coinsN: 0, moves: 0, stomps: 0, over: false, won: false, msg: 'Chegue à bandeira! Salte os buracos e pise nos inimigos.' };
}

const solid = (s, c, r) => {
  if (c < 0) return true;
  if (r < 0) return false;
  if (c >= L || r >= ROWS) return false;
  return s.grid[r][c] !== ' ' && s.grid[r][c] !== 'U' ? true : s.grid[r][c] === 'U';
};

function enemyAt(s, c, r) { return s.enemies.find((e) => e.alive && e.c === c && r === 8); }

function collect(s) {
  s.coins.forEach((k) => { if (!k.got && k.c === s.p.c && k.r === s.p.r) { k.got = true; s.coinsN++; s.score += 100; } });
}

function controls() {
  return {
    main: [{ id: 'run', label: '▶️ Correr' }, { id: 'jump', label: '⤴️ Saltar' }],
    more: [
      { id: 'step', label: '👣 Passo curto', desc: 'Anda 1 casa para a frente' },
      { id: 'hop', label: '⬆️ Pular parado', desc: 'Bate nos blocos de cima' },
      { id: 'back', label: '◀️ Voltar', desc: 'Recua 2 casas' }
    ]
  };
}

function die(s, from, why) {
  s.lives--;
  s.msg = why + ' Vidas: ' + Math.max(0, s.lives);
  if (s.lives <= 0) { s.over = true; s.msg = 'Fim de jogo! ' + why; }
  s.p.c = from.c; s.p.r = from.r;
}

function act(s, id) {
  if (s.over) return;
  s.moves++;
  const from = { c: s.p.c, r: s.p.r };
  s.msg = '';
  let frames;
  let air = false;
  if (id === 'run') frames = [[1, 0], [1, 0], [1, 0]];
  else if (id === 'step') frames = [[1, 0]];
  else if (id === 'back') frames = [[-1, 0], [-1, 0]];
  else if (id === 'jump') { frames = [[1, 1], [1, 2], [1, 2], [1, 1]]; air = true; }
  else { frames = [[0, 1], [0, 2], [0, 3]]; air = true; } // hop
  const r0 = s.p.r;
  if (id === 'run' || id === 'step') s.face = 1; else if (id === 'back') s.face = -1; else if (id === 'jump') s.face = 1;
  let dead = null;
  const touch = (flying) => {
    const e = enemyAt(s, s.p.c, s.p.r);
    if (!e) return;
    if (flying) { e.alive = false; s.score += 200; s.stomps++; s.msg = 'Inimigo derrotado! +200'; } else dead = 'Bateste num inimigo!';
  };
  let cc = s.p.c, base = 0;
  for (let i = 0; i < frames.length && !dead; i++) {
    const dx = frames[i][0], dy = frames[i][1];
    const nc = cc + dx, nr = r0 - dy;
    if (solid(s, nc, nr)) {
      if (id === 'hop' && dx === 0) { // bateu a cabeca num bloco
        const t = s.grid[nr] && s.grid[nr][nc];
        if (t === '?') { s.grid[nr][nc] = 'U'; s.coinsN++; s.score += 100; s.msg = 'Bloco! +100'; } else if (t === 'B') { s.grid[nr][nc] = ' '; s.score += 50; s.msg = 'Tijolo partido! +50'; }
      } else if (!air) s.msg = 'Bateste numa parede!';
      break;
    }
    cc = nc; s.p.c = nc; s.p.r = nr; base = dy;
    if (!air && (s.grid[nr + 1] && !solid(s, nc, nr + 1))) { /* cai ja */ }
    collect(s); touch(air || dy > 0);
    if (!air && !solid(s, s.p.c, s.p.r + 1)) break; // correndo para um buraco
  }
  // gravidade
  while (!dead && s.p.r <= ROWS - 1 && !solid(s, s.p.c, s.p.r + 1)) {
    s.p.r++;
    if (s.p.r >= ROWS - 1) { dead = 'Caíste num buraco!'; break; }
    collect(s); touch(true);
  }
  if (!dead && s.p.r >= ROWS - 1) dead = 'Caíste num buraco!';
  if (dead) die(s, from, dead);
  else {
    s.enemies.forEach((e) => {
      if (!e.alive) return;
      let n = e.c + e.dir;
      if (n < e.min || n > e.max) { e.dir = -e.dir; n = e.c + e.dir; }
      if (!(s.p.c === n && s.p.r === 8)) e.c = n;
    });
    if (s.p.c >= FLAG) {
      s.won = true; s.over = true;
      const bonus = 1000 + Math.max(0, 2500 - s.moves * 50);
      s.score += bonus;
      s.msg = 'BANDEIRA! Bónus +' + bonus;
    }
  }
}

function caption(s) {
  const lines = [];
  if (s.msg) lines.push(s.msg);
  lines.push('Pontos: ' + s.score + ' • Moedas: ' + s.coinsN + ' • Vidas: ' + s.lives + ' • Jogadas: ' + s.moves);
  return lines.join('\n');
}

// ---------- desenho ----------
const COL = {
  sky0: rgb('#4aa8ff'), sky1: rgb('#cdeeff'), hillF: rgb('#8fe3a0'), hillN: rgb('#5cc873'), cloud: rgb('#ffffff'),
  grass: rgb('#4caf50'), grassL: rgb('#7ed957'), dirt: rgb('#8b5a2b'), dirtD: rgb('#6b3f1d'),
  brick: rgb('#cf5a2c'), brickD: rgb('#7a2e12'), qb: rgb('#ffc107'), qbD: rgb('#b87d00'), used: rgb('#8d6e63'),
  pipe: rgb('#2e9e4f'), pipeL: rgb('#78e89f'), pipeD: rgb('#1b6b34'), stone: rgb('#a8a8b3'), stoneL: rgb('#d9d9e3'), stoneD: rgb('#6e6e7a'),
  white: rgb('#ffffff'), black: rgb('#000000'), yellow: rgb('#ffe066'), pole: rgb('#e8e8e8'), flag: rgb('#ff3b5c')
};

function tile(g, ch, x, y) {
  if (ch === 'G') {
    g.rect(x, y, 16, 16, COL.dirt); g.rect(x, y, 16, 5, COL.grass); g.rect(x, y, 16, 2, COL.grassL);
    g.rect(x + 3, y + 8, 2, 2, COL.dirtD); g.rect(x + 11, y + 11, 2, 2, COL.dirtD);
  } else if (ch === 'D') {
    g.rect(x, y, 16, 16, COL.dirt); g.rect(x + 6, y + 3, 2, 2, COL.dirtD); g.rect(x + 12, y + 9, 2, 2, COL.dirtD); g.rect(x + 2, y + 12, 2, 2, COL.dirtD);
  } else if (ch === 'B') {
    g.rect(x, y, 16, 16, COL.brick);
    g.rect(x, y + 5, 16, 1, COL.brickD); g.rect(x, y + 10, 16, 1, COL.brickD); g.rect(x, y + 15, 16, 1, COL.brickD);
    g.rect(x + 7, y, 1, 5, COL.brickD); g.rect(x + 3, y + 6, 1, 4, COL.brickD); g.rect(x + 11, y + 6, 1, 4, COL.brickD); g.rect(x + 7, y + 11, 1, 4, COL.brickD);
  } else if (ch === '?') {
    g.rect(x, y, 16, 16, COL.qbD); g.rect(x + 1, y + 1, 14, 14, COL.qb);
    g.text('?', x + 5, y + 4, COL.white, 2, COL.qbD);
  } else if (ch === 'U') {
    g.rect(x, y, 16, 16, COL.used); g.rect(x + 1, y + 1, 14, 14, rgb('#a1887f'));
  } else if (ch === 'S') {
    g.rect(x, y, 16, 16, COL.stoneD); g.rect(x, y, 15, 15, COL.stone); g.rect(x, y, 15, 2, COL.stoneL); g.rect(x, y, 2, 15, COL.stoneL);
  } else if (ch === 'T' || ch === 't' || ch === 'P' || ch === 'p') {
    const left = ch === 'T' || ch === 'P', top = ch === 'T' || ch === 't';
    g.rect(x, y, 16, 16, COL.pipe);
    g.rect(left ? x + 2 : x + 11, y, 3, 16, left ? COL.pipeL : COL.pipeD);
    g.rect(left ? x : x + 15, y, 1, 16, COL.pipeD);
    if (top) { g.rect(x, y, 16, 4, COL.pipeD); g.rect(x, y + 1, 16, 2, COL.pipe); g.rect(left ? x + 2 : x + 11, y + 1, 3, 2, left ? COL.pipeL : COL.pipeD); }
  }
}

function cloud(g, x, y) {
  g.rect(x + 4, y + 4, 24, 6, COL.cloud); g.rect(x + 8, y, 12, 6, COL.cloud); g.rect(x + 16, y + 2, 10, 5, COL.cloud);
}

function render(g, s) {
  g.gradient(0, 180, COL.sky0, COL.sky1);
  const camX = Math.max(0, Math.min(L * TS - 320, s.p.c * TS - 120));
  // nuvens e colinas com parallax
  for (let i = 0; i < 10; i++) cloud(g, ((i * 90 + 20) - camX * 0.4 % 900 + 900) % 900 - 40, 18 + (i % 3) * 14);
  for (let i = 0; i < 8; i++) { const hx = i * 110 - ((camX * 0.25) % 110) - 20; g.circle(hx + 40, 150, 34, COL.hillF); }
  for (let i = 0; i < 8; i++) { const hx = i * 80 - ((camX * 0.5) % 80) - 10; g.circle(hx + 30, 160, 24, COL.hillN); }
  // tiles
  const c0 = Math.floor(camX / TS), c1 = Math.min(L - 1, c0 + VW + 1);
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
    const ch = s.grid[r][c];
    if (ch !== ' ') tile(g, ch, c * TS - camX, OY + r * TS);
  }
  // bandeira
  const fx = FLAG * TS - camX;
  if (fx > -20 && fx < 330) {
    g.rect(fx + 7, OY + 2 * TS, 2, 7 * TS, COL.pole); g.circle(fx + 8, OY + 2 * TS - 2, 3, COL.yellow);
    g.rect(fx + 9, OY + 2 * TS + 2, 12, 8, COL.flag); g.rect(fx + 9, OY + 2 * TS + 10, 6, 2, COL.flag);
    g.rect(fx, OY + 9 * TS - 6, 16, 6, COL.stoneD);
  }
  // moedas
  s.coins.forEach((k) => { if (!k.got) { const x = k.c * TS - camX + 4, y = OY + k.r * TS + 4 + ((s.moves + k.c) % 2); if (x > -10 && x < 330) g.sprite(x, y, COIN, COIN_P); } });
  // inimigos
  s.enemies.forEach((e) => { if (e.alive) { const x = e.c * TS - camX + 2; if (x > -16 && x < 330) g.sprite(x, OY + 8 * TS + 6, SLIME, SLIME_P, (s.moves + e.c) % 2 === 0); } });
  // jogador
  g.sprite(s.p.c * TS - camX + 2, OY + s.p.r * TS, HERO, P, s.face < 0);
  // HUD
  g.rect(0, 0, 320, 14, rgb('#00000066').map((v, i) => (i < 3 ? 0 : v)));
  g.text('PONTOS ' + String(s.score).padStart(5, '0'), 6, 3, COL.white, 2, COL.black);
  g.sprite(150, 3, COIN, COIN_P);
  g.text('X' + String(s.coinsN).padStart(2, '0'), 162, 3, COL.yellow, 2, COL.black);
  for (let i = 0; i < s.lives; i++) g.sprite(228 + i * 10, 3, HEART, HEART_P);
  g.text('1-1', 292, 3, COL.white, 2, COL.black);
  if (s.over) {
    g.rect(60, 62, 200, 52, rgb('#000000'));
    g.textC(s.won ? 'VITORIA!' : 'FIM DE JOGO', 160, 70, s.won ? COL.yellow : rgb('#ff6b6b'), 3, rgb('#333333'));
    g.textC('PONTOS ' + s.score, 160, 96, COL.white, 2);
  }
}

module.exports = { id: 'superbros', name: 'SUPER TEMPEST BROS', emoji: '🍄', tag: 'Plataforma', desc: 'Corra, salte buracos e pise nos inimigos até à bandeira', init: init, controls: controls, act: act, render: render, caption: caption };
