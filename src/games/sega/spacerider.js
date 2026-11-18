'use strict';
// SPACE RIDER - tiro em 3D por turnos (inspirado nos classicos de "rail shooter")
const { rgb, mix, rng } = require('./gfx');

const LANES = 5, ZMAX = 6, WAVES = 22, Y0 = 62;

function init(seed) {
  const r = rng(seed || 13);
  return { r: r, cool: 0, lane: 2, enemies: [], boss: null, tick: 0, lives: 4, score: 0, kills: 0, shot: null, boom: [], fire: -1, over: false, won: false, last: '', msg: 'Destrua as naves! Evite as que chegam à sua faixa e o raio vermelho do chefe.' };
}

function controls() {
  return { main: [{ id: 'left', label: '◀️ Esquerda' }, { id: 'shoot', label: '🔫 Atirar' }, { id: 'right', label: '▶️ Direita' }], more: [] };
}

function act(s, id) {
  if (s.over) return;
  s.tick++; s.last = id; s.shot = null; s.boom = [];
  const log = [];
  // 1) o raio do chefe (avisado no turno anterior)
  if (s.fire >= 0) {
    if (s.fire === s.lane && s.lane >= 0) { s.lives--; log.push('Levaste o raio do chefe!'); }
    s.fire = -1;
  }
  // 2) acao do jogador
  if (id === 'left') { s.lane = Math.max(0, s.lane - 1); s.cool = 0; }
  else if (id === 'right') { s.lane = Math.min(LANES - 1, s.lane + 1); s.cool = 0; }
  else if (s.cool > 0) { s.cool = 0; log.push('Recarregando o canhão...'); }
  else {
    s.cool = 1;
    const target = s.enemies.filter((e) => e.lane === s.lane).sort((a, b) => a.z - b.z)[0];
    if (s.boss && s.boss.lane === s.lane && (!target || s.boss.z <= target.z)) {
      s.boss.hp--; s.shot = { lane: s.lane, z: s.boss.z, hit: 'boss' }; s.score += 50; log.push('Acertaste o chefe! (' + Math.max(0, s.boss.hp) + ' de vida)');
      if (s.boss.hp <= 0) { s.boom.push({ lane: s.boss.lane, z: s.boss.z, big: true }); s.score += 1000; s.boss = null; s.won = true; s.over = true; log.push('CHEFE DESTRUÍDO! +1000'); }
    } else if (target) {
      s.enemies.splice(s.enemies.indexOf(target), 1); s.kills++; const pts = 50 + (ZMAX - target.z + 1) * 20;
      s.score += pts; s.shot = { lane: s.lane, z: target.z, hit: 'drone' }; s.boom.push({ lane: target.lane, z: target.z }); log.push('Nave destruída! +' + pts);
    } else { s.shot = { lane: s.lane, z: 0, hit: null }; log.push('Tiro no vazio'); }
  }
  if (!s.over) {
    // 3) naves avancam
    s.enemies.forEach((e) => { e.z--; if (e.z >= 1 && e.lane !== s.lane && s.r() < 0.45) e.lane += e.lane < s.lane ? 1 : -1; });
    const crashed = s.enemies.filter((e) => e.z <= 0);
    crashed.forEach((e) => { if (e.lane === s.lane) { s.lives--; s.boom.push({ lane: e.lane, z: 1 }); log.push('Foste atingido!'); } });
    s.enemies = s.enemies.filter((e) => e.z > 0);
    // 4) novas naves / chefe
    if (s.tick < WAVES) {
      const n = s.r() < 0.35 ? 1 : (s.r() < 0.35 ? 2 : 0);
      const used = {};
      for (let i = 0; i < n; i++) { let l = s.r.int(LANES); if (used[l]) continue; used[l] = true; s.enemies.push({ lane: l, z: ZMAX }); }
    } else if (!s.boss && s.tick === WAVES) {
      s.boss = { lane: 2, z: 4, hp: 5, dir: 1 }; log.push('CHEFE a aproximar-se!');
    }
    if (s.boss) {
      const b = s.boss;
      if (s.r() < 0.45) {
        if (s.r() < 0.3) b.dir = -b.dir;
        b.lane += b.dir;
        if (b.lane < 0) { b.lane = 1; b.dir = 1; } if (b.lane > LANES - 1) { b.lane = LANES - 2; b.dir = -1; }
      }
      s.fire = s.r() < 0.6 ? s.r.int(LANES) : -1;
    }
  }
  if (s.lives <= 0) { s.lives = 0; s.over = true; log.push('Nave destruída!'); }
  s.msg = log.join(' • ');
}

function caption(s) {
  return (s.msg ? s.msg + '\n' : '') + 'Vidas: ' + s.lives + ' • Pontos: ' + s.score + ' • Onda: ' + Math.min(s.tick, WAVES) + '/' + WAVES + (s.boss ? ' • CHEFE: ' + s.boss.hp : '') +
    (s.over ? '' : (s.cool > 0 ? '\n🔫 Canhão a recarregar: mova-se ou espere um turno.' : '') + (s.fire >= 0 ? '\n⚠️ Raio do chefe na faixa ' + (s.fire + 1) + ' — saia dela!' : ''));
}

const C = { white: rgb('#ffffff'), black: rgb('#000000'), yellow: rgb('#ffe066'), red: rgb('#ff4d4d') };
const tOf = (z) => 1 / (1 + 0.6 * z);
const yOf = (t) => Y0 + t * (180 - Y0);
const laneX = (lane, t) => 160 + (lane - 2) * (10 + t * 36);

function drone(g, x, y, sc) {
  const r = Math.max(3, Math.round(6 * sc));
  g.rect(x - r * 1.8, y - r * 0.2, r * 3.6, Math.max(1, r * 0.5), rgb('#7f1d1d'));
  g.circle(Math.round(x), Math.round(y - r * 0.6), r, rgb('#ef4444'));
  g.circle(Math.round(x), Math.round(y - r * 0.6), Math.max(1, Math.round(r * 0.5)), C.white);
  g.circle(Math.round(x), Math.round(y - r * 0.6), Math.max(1, Math.round(r * 0.22)), C.black);
}

function bossShip(g, x, y, sc, hp) {
  const w = 34 * sc;
  g.rect(x - w, y - 18 * sc, w * 2, 9 * sc, rgb('#6d28d9'));
  g.rect(x - w * 0.6, y - 30 * sc, w * 1.2, 14 * sc, rgb('#8b5cf6'));
  g.circle(Math.round(x), Math.round(y - 22 * sc), Math.round(6 * sc), rgb('#fff1a8'));
  g.circle(Math.round(x), Math.round(y - 22 * sc), Math.max(1, Math.round(2.5 * sc)), C.red);
  g.rect(x - w - 3 * sc, y - 14 * sc, 6 * sc, 12 * sc, rgb('#4c1d95')); g.rect(x + w - 3 * sc, y - 14 * sc, 6 * sc, 12 * sc, rgb('#4c1d95'));
  g.rect(x - 16, y - 40 * sc - 4, 32, 5, C.black); g.rect(x - 15, y - 40 * sc - 3, Math.max(0, Math.round(30 * hp / 5)), 3, rgb('#ff6b6b'));
}

function render(g, s) {
  g.gradient(0, Y0, rgb('#0b1026'), rgb('#5b2a86'));
  for (let i = 0; i < 40; i++) g.px((i * 47) % 320, (i * 29) % Y0, i % 4 ? rgb('#8a7ab8') : C.white);
  g.circle(250, 30, 16, rgb('#f59e0b')); g.circle(256, 26, 12, rgb('#fbbf24'));
  g.rect(0, Y0 - 2, 320, 2, rgb('#c084fc'));
  // chao axadrezado em perspectiva
  for (let y = Y0; y < 180; y++) {
    const t = (y - Y0 + 1) / (180 - Y0);
    const d = 1 / t;
    const row = Math.floor(d * 1.2 + s.tick) % 2;
    const w = 10 + t * 36;
    for (let k = -4; k <= 4; k++) {
      const x0 = 160 + (k - 0.5) * w;
      g.rect(x0, y, w, 1, (k + row) % 2 === 0 ? rgb('#3b1d63') : rgb('#24104a'));
    }
    g.rect(0, y, Math.max(0, 160 - 4.5 * w), 1, rgb('#14082b')); g.rect(160 + 4.5 * w, y, 320, 1, rgb('#14082b'));
  }
  // raio do chefe (aviso)
  if (s.fire >= 0 && !s.over) { for (let z = ZMAX; z >= 0; z--) { const t = z === 0 ? 0.97 : tOf(z); g.rect(laneX(s.fire, t) - 3 - t * 8, yOf(t) - 2, 6 + t * 16, 3, (s.tick % 2) ? C.red : rgb('#ff9a9a')); } }
  // inimigos (de tras para a frente)
  const list = s.enemies.map((e) => ({ z: e.z, lane: e.lane, boss: false })).concat(s.boss ? [{ z: s.boss.z, lane: s.boss.lane, boss: true }] : []).sort((a, b) => b.z - a.z);
  list.forEach((e) => {
    const t = tOf(e.z), x = laneX(e.lane, t), y = yOf(t), sc = 0.4 + t * 2.2;
    g.rect(x - 5 * sc, y, 10 * sc, Math.max(1, sc), rgb('#00000060').map((v, i) => (i < 3 ? 15 : v)));
    if (e.boss) bossShip(g, x, y - 6 * sc, sc * 0.9, s.boss.hp); else drone(g, x, y - 6 * sc, sc);
  });
  // tiro
  const px = laneX(s.lane, 0.97);
  if (s.shot) {
    const tt = s.shot.z > 0 ? tOf(s.shot.z) : 0.2;
    g.line(px, 150, laneX(s.lane, tt), yOf(tt) - 8, C.white); g.line(px - 1, 150, laneX(s.lane, tt) - 1, yOf(tt) - 8, rgb('#7dd3fc')); g.line(px + 1, 150, laneX(s.lane, tt) + 1, yOf(tt) - 8, rgb('#7dd3fc'));
  }
  s.boom.forEach((b) => {
    const t = tOf(Math.max(1, b.z)), x = laneX(b.lane, t), y = yOf(t) - 10, rr = (b.big ? 22 : 12) * (0.5 + t);
    for (let i = 0; i < 10; i++) g.line(x, y, x + Math.cos(i * 0.63) * rr, y + Math.sin(i * 0.63) * rr, i % 2 ? C.yellow : C.white);
    g.circle(Math.round(x), Math.round(y), Math.round(rr * 0.35), C.white);
  });
  // nave do jogador
  g.rect(px - 10, 172, 20, 3, rgb('#00000060').map((v, i) => (i < 3 ? 10 : v)));
  g.rect(px - 4, 150, 8, 18, rgb('#e2e8f0')); g.rect(px - 2, 146, 4, 6, rgb('#7dd3fc'));
  g.rect(px - 12, 160, 24, 5, rgb('#38bdf8')); g.rect(px - 14, 163, 6, 5, rgb('#0ea5e9')); g.rect(px + 8, 163, 6, 5, rgb('#0ea5e9'));
  g.rect(px - 2, 168, 4, 4 + (s.tick % 2) * 3, rgb('#fbbf24'));
  // HUD
  g.rect(0, 0, 320, 14, C.black);
  for (let i = 0; i < s.lives; i++) { g.rect(6 + i * 12, 3, 8, 8, rgb('#38bdf8')); g.rect(8 + i * 12, 1, 4, 3, rgb('#e2e8f0')); }
  g.rect(60, 3, 150, 8, rgb('#333344')); g.rect(61, 4, Math.round(148 * Math.min(1, s.tick / WAVES)), 6, s.boss ? rgb('#ff6b6b') : rgb('#4ade80'));
  g.text(String(s.score).padStart(5, '0'), 250, 3, C.yellow, 2, rgb('#333333'));
  if (s.over) {
    g.rect(60, 62, 200, 52, C.black);
    g.textC(s.won ? 'VITORIA!' : 'FIM DE JOGO', 160, 70, s.won ? C.yellow : rgb('#ff6b6b'), 3, rgb('#333333'));
    g.textC('PONTOS ' + s.score, 160, 96, C.white, 2);
  }
}

module.exports = { id: 'spacerider', name: 'SPACE RIDER', emoji: '🚀', tag: 'Tiro 3D', desc: 'Voe sobre o tabuleiro, destrua naves e vença o chefe', init: init, controls: controls, act: act, render: render, caption: caption };
