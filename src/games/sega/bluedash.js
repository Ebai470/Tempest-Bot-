'use strict';
// BLUE DASH - corrida veloz por turnos (inspirado nos classicos de velocidade)
const { rgb, pal, rng } = require('./gfx');

const TS = 16, FINISH = 62, GY = 148;
const HP = pal({ B: '#2563eb', L: '#7db2ff', S: '#f5c6a0', W: '#ffffff', K: '#111111', R: '#ef4444', G: '#dddddd' });
const HERO_RUN = [
  '..BB..........', '.BBBB.........', 'BBBBBBB.......', '.BBBBBBBB.....', '.BBBBBBBBBB...', '..BBBWKWWKB...', '..BBBSSSSSB...', '...BBSSKSB....',
  '....BBBBBB....', '...BBBBBBBB...', '..BBLLLLBBB...', '..BBBLLBBB....', '...WBB..BBW...', '..RRRR..RRRR..', '.RRRRR...RRRR.'];
const HERO_RUN2 = HERO_RUN.slice(0, 12).concat(['..WBB....BBW..', '.RRRR.....RRRR', 'RRRRR......RRR']);
const BOT = pal({ G: '#9aa0a6', D: '#5f6368', R: '#ff3b3b', Y: '#ffd23f', K: '#111111' });
const BOTS = ['...GGGG...', '..GGGGGG..', '.GGRRRRGG.', '.GGRKKRGG.', '.GGGRRGGG.', 'DGGGGGGGGD', '.DDGGGGDD.', '..D.DD.D..', '.DD....DD.'];
const SP = pal({ R: '#ef4444', Y: '#ffd23f', D: '#7f1d1d' });
const SPRING = ['..RRRRRR..', '..DDDDDD..', '...YYYY...', '..DDDDDD..', '...YYYY...', '..RRRRRR..'];

function init(seed) {
  const r = rng(seed || 11);
  const obs = [];
  let p = 6;
  while (p < FINISH - 4) {
    const t = r();
    obs.push({ pos: p, type: t < 0.25 ? 'spike' : t < 0.5 ? 'pit' : t < 0.65 ? 'bot' : t < 0.85 ? 'wall' : 'spring' });
    p += 4 + r.int(4);
  }
  const rings = [];
  for (let i = 2; i < FINISH; i++) if (!obs.some((o) => Math.abs(o.pos - i) <= 1) && r() < 0.5) rings.push({ pos: i, got: false });
  return { pos: 0, obs: obs, rings: rings, lives: 3, ringsN: 0, score: 0, moves: 0, bots: 0, over: false, won: false, last: 'run', msg: 'Chegue à meta! Veja o obstáculo à frente e escolha a ação certa.' };
}

function controls() {
  return { main: [{ id: 'run', label: '⚡ Correr' }, { id: 'jump', label: '⤴️ Saltar' }, { id: 'spin', label: '🌀 Girar' }], more: [] };
}

const NAMES = { spike: 'espinhos (saltar)', bot: 'robô (girar)', pit: 'buraco (saltar)', wall: 'parede (girar)', spring: 'mola' };

function act(s, id) {
  if (s.over) return;
  s.moves++; s.last = id;
  const from = s.pos;
  let target = from + (id === 'run' ? 6 : id === 'spin' ? 5 : 4);
  let msg = [];
  let respawn = false;
  const list = s.obs.filter((o) => o.pos > from).sort((a, b) => a.pos - b.pos);
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (o.pos > target) break;
    if (o.type === 'spring') { target += 3; s.score += 50; msg.push('Mola! +3 casas'); continue; }
    if (o.type === 'spike') {
      if (id === 'jump') { msg.push('Saltaste os espinhos'); continue; }
      msg.push('Espinhos!');
    } else if (o.type === 'bot') {
      if (id === 'spin') { s.bots++; s.score += 100; o.pos = -99; msg.push('Robô destruído! +100'); continue; }
      msg.push('Bateste no robô!');
    } else if (o.type === 'wall') {
      if (id === 'spin') { s.score += 50; o.pos = -99; msg.push('Parede partida! +50'); continue; }
      msg.push('Bateste na parede!');
    } else if (o.type === 'pit') {
      if (id === 'jump') { msg.push('Saltaste o buraco'); continue; }
      s.lives--; respawn = true; msg.push('Caíste no buraco!'); break;
    }
    // ferido (espinhos/robo)
    if (s.ringsN > 0) { msg.push('Perdeste ' + s.ringsN + ' anéis'); s.ringsN = 0; } else { s.lives--; respawn = true; msg.push('Sem anéis: perdeste uma vida!'); break; }
  }
  if (respawn) { s.pos = from; if (s.lives <= 0) { s.over = true; msg.push('Fim de jogo!'); } } else {
    s.pos = target;
    s.rings.forEach((rg) => { if (!rg.got && rg.pos > from && rg.pos <= target) { rg.got = true; s.ringsN++; s.score += 10; } });
    if (s.pos >= FINISH) {
      s.pos = FINISH; s.won = true; s.over = true;
      const bonus = 1000 + Math.max(0, 1500 - s.moves * 40);
      s.score += bonus; msg.push('META! Bónus +' + bonus);
    }
  }
  const next = s.obs.filter((o) => o.pos > s.pos).sort((a, b) => a.pos - b.pos)[0];
  if (!s.over && next && next.pos - s.pos <= 8) msg.push('Próximo: ' + NAMES[next.type] + ' a ' + (next.pos - s.pos) + ' casas');
  s.msg = msg.join(' • ');
}

function caption(s) {
  return (s.msg ? s.msg + '\n' : '') + 'Anéis: ' + s.ringsN + ' • Pontos: ' + s.score + ' • Vidas: ' + s.lives + ' • Jogadas: ' + s.moves +
    '\n⚡ Correr (6) • ⤴️ Saltar (4): espinhos e buracos • 🌀 Girar (5): robôs e paredes';
}

const C = {
  s0: rgb('#00a6d6'), s1: rgb('#d8f6ff'), cloud: rgb('#ffffff'), mtn: rgb('#5fb3a1'), mtn2: rgb('#3f8f84'), grass: rgb('#3fbf5f'), grassD: rgb('#2c8f46'),
  c1: rgb('#d98c3f'), c2: rgb('#b5651d'), ring: rgb('#ffd23f'), ringD: rgb('#c98a00'), white: rgb('#ffffff'), black: rgb('#000000'), pit: rgb('#1a1a2e'),
  trunk: rgb('#8b5a2b'), leaf: rgb('#1f9d55'), leaf2: rgb('#2fbf71')
};

function palm(g, x, y) {
  g.rect(x, y - 30, 4, 30, C.trunk);
  for (let i = 0; i < 4; i++) { g.line(x + 2, y - 30, x - 14 + i * 3, y - 24 + i * 2, C.leaf); g.line(x + 2, y - 30, x + 18 - i * 3, y - 24 + i * 2, C.leaf2); }
  g.line(x + 2, y - 30, x + 2, y - 40, C.leaf);
}

function render(g, s) {
  g.gradient(0, GY, C.s0, C.s1);
  const camX = s.pos * TS - 80;
  for (let i = 0; i < 8; i++) cloudAt(g, ((i * 120 + 30) - camX * 0.3 % 960 + 960) % 960 - 50, 20 + (i % 3) * 12);
  for (let i = 0; i < 6; i++) { const x = i * 100 - (camX * 0.4 % 100) - 30; for (let k = 0; k < 60; k++) g.rect(x + k, GY - 10 - Math.max(0, 40 - Math.abs(k - 30)), 1, 50, C.mtn); }
  for (let i = 0; i < 6; i++) { const x = i * 80 - (camX * 0.6 % 80) - 20; for (let k = 0; k < 44; k++) g.rect(x + k, GY - 4 - Math.max(0, 26 - Math.abs(k - 22)), 1, 30, C.mtn2); }
  for (let i = 0; i < 9; i++) palm(g, i * 64 - (camX * 0.8 % 64) - 10, GY + 2);
  // chao axadrezado
  g.rect(0, GY, 320, 4, C.grass); g.rect(0, GY + 4, 320, 2, C.grassD);
  const off = ((camX % 32) + 32) % 32;
  for (let y = GY + 6, row = 0; y < 180; y += 12, row++) for (let x = -32 + (row % 2) * 16 - off; x < 340; x += 32) { g.rect(x, y, 16, 12, C.c1); g.rect(x + 16, y, 16, 12, C.c2); }
  // buracos / obstaculos
  s.obs.forEach((o) => {
    if (o.pos < 0) return;
    const x = o.pos * TS - camX;
    if (x < -20 || x > 330) return;
    if (o.type === 'pit') { g.rect(x, GY, 16, 32, C.pit); g.rect(x + 2, GY + 22, 3, 6, rgb('#888888')); g.rect(x + 9, GY + 22, 3, 6, rgb('#888888')); }
    else if (o.type === 'spike') for (let i = 0; i < 3; i++) { const sx = x + i * 5; g.rect(sx + 1, GY - 4, 3, 4, rgb('#b8bcc4')); g.rect(sx + 2, GY - 8, 1, 4, rgb('#e6e9ee')); g.px(sx + 2, GY - 9, rgb('#e6e9ee')); }
    else if (o.type === 'wall') { for (let k = 0; k < 2; k++) { g.rect(x, GY - 16 - k * 16, 16, 16, rgb('#8b5a2b')); g.rect(x + 1, GY - 15 - k * 16, 14, 14, rgb('#c68642')); g.line(x + 1, GY - 15 - k * 16, x + 14, GY - 2 - k * 16, rgb('#8b5a2b')); g.line(x + 14, GY - 15 - k * 16, x + 1, GY - 2 - k * 16, rgb('#8b5a2b')); } }
    else if (o.type === 'bot') g.sprite(x + 3, GY - 14 + ((s.moves + o.pos) % 2), BOTS, BOT);
    else if (o.type === 'spring') g.sprite(x + 3, GY - 8, SPRING, SP);
  });
  // aneis
  s.rings.forEach((r) => { if (r.got) return; const x = r.pos * TS - camX + 8; if (x < -10 || x > 330) return; g.circle(x, GY - 20, 5, C.ring); g.circle(x, GY - 20, 3, rgb('#a0e8ff')); g.circle(x, GY - 20, 2, C.s1); });
  // meta
  const fx = FINISH * TS - camX;
  if (fx > -20 && fx < 330) { g.rect(fx, GY - 60, 3, 60, C.white); for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) g.rect(fx + 3 + i * 4, GY - 60 + j * 4, 4, 4, (i + j) % 2 ? C.black : C.white); }
  // heroi
  const hx = 80;
  if (s.last === 'jump' || s.last === 'spin') {
    g.circle(hx + 7, GY - 18 - (s.last === 'jump' ? 8 : 0), 8, rgb('#2563eb')); g.circle(hx + 9, GY - 20 - (s.last === 'jump' ? 8 : 0), 4, rgb('#7db2ff'));
    for (let i = 0; i < 5; i++) { const a = i * 1.25 + s.moves; g.line(hx + 7, GY - 18 - (s.last === 'jump' ? 8 : 0), hx + 7 + Math.cos(a) * 12, GY - 18 - (s.last === 'jump' ? 8 : 0) + Math.sin(a) * 12, rgb('#1e40af')); }
  } else g.sprite(hx, GY - 15, s.moves % 2 ? HERO_RUN : HERO_RUN2, HP);
  g.rect(hx + 1, GY, 12, 2, rgb('#00000040').map((v, i) => (i < 3 ? 30 : v)));
  // HUD
  g.rect(0, 0, 320, 14, C.black);
  g.text('ANEIS ' + String(s.ringsN).padStart(2, '0'), 6, 3, C.ring, 2, rgb('#333333'));
  for (let i = 0; i < s.lives; i++) g.rect(118 + i * 10, 4, 7, 7, rgb('#2563eb'));
  g.rect(176, 3, 140, 8, rgb('#333333')); g.rect(177, 4, Math.round(138 * Math.min(1, s.pos / FINISH)), 6, rgb('#3fbf5f'));
  if (s.over) {
    g.rect(60, 62, 200, 52, C.black);
    g.textC(s.won ? 'META!' : 'FIM DE JOGO', 160, 70, s.won ? C.ring : rgb('#ff6b6b'), 3, rgb('#333333'));
    g.textC('PONTOS ' + s.score, 160, 96, C.white, 2);
  }
}
function cloudAt(g, x, y) { g.rect(x + 4, y + 4, 26, 6, C.cloud); g.rect(x + 9, y, 12, 6, C.cloud); g.rect(x + 18, y + 2, 10, 5, C.cloud); }

module.exports = { id: 'bluedash', name: 'BLUE DASH', emoji: '💨', tag: 'Corrida veloz', desc: 'Corra, salte espinhos e buracos e destrua robôs até à meta', init: init, controls: controls, act: act, render: render, caption: caption };
