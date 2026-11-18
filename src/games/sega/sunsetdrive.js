'use strict';
// SUNSET DRIVE - corrida em pseudo-3D por turnos (inspirado nos classicos de arcade)
const { rgb, rng } = require('./gfx');

const LEN = 36, Y0 = 72;

function init(seed) {
  const r = rng(seed || 5);
  const cars = {};
  for (let st = 3; st <= LEN; st++) {
    if (r() < 0.7) {
      const a = r.int(3);
      cars[st] = [a];
      if (r() < 0.35) { let b = r.int(3); if (b === a) b = (a + 1) % 3; cars[st].push(b); }
    }
  }
  return { r: r, pos: 0, lane: 1, time: 30, cars: cars, score: 0, moves: 0, crashes: 0, over: false, won: false, crash: false, msg: 'Chegue ao fim antes que o tempo acabe! Desvie dos carros.' };
}

function controls() {
  return { main: [{ id: 'left', label: '⬅️ Esquerda' }, { id: 'straight', label: '⬆️ Reto' }, { id: 'right', label: '➡️ Direita' }], more: [] };
}

function act(s, id) {
  if (s.over) return;
  s.moves++; s.crash = false;
  const nl = Math.max(0, Math.min(2, s.lane + (id === 'left' ? -1 : id === 'right' ? 1 : 0)));
  s.lane = nl;
  s.time -= 1;
  const next = s.pos + 1;
  const hit = s.cars[next] && s.cars[next].indexOf(nl) >= 0;
  let msg = '';
  if (hit) {
    s.crash = true; s.crashes++; s.time -= 4;
    s.cars[next] = s.cars[next].filter((l) => l !== nl);
    msg = 'BATEU! -4 de tempo';
  } else {
    s.pos = next;
    if (s.pos === 12 || s.pos === 24) { s.time += 12; msg = 'CHECKPOINT! +12 de tempo'; }
  }
  if (s.pos >= LEN) {
    s.won = true; s.over = true;
    const b = s.pos * 10 + Math.max(0, s.time) * 25;
    s.score = b; msg = 'CHEGADA! Pontos: ' + b;
  } else if (s.time <= 0) {
    s.time = 0; s.over = true; s.score = s.pos * 10; msg = 'Tempo esgotado!';
  } else s.score = s.pos * 10;
  s.msg = msg;
}

function caption(s) {
  const ahead = [1, 2, 3].map((k) => {
    const c = s.cars[s.pos + k] || [];
    return ['L', 'C', 'R'].map((n, i) => (c.indexOf(i) >= 0 ? '🚗' : '▫️')).join('');
  });
  return (s.msg ? s.msg + '\n' : '') + 'Tempo: ' + s.time + ' • Passos: ' + s.pos + '/' + LEN + ' • Pontos: ' + s.score +
    (s.over ? '' : '\nÀ frente: ' + ahead.join('  '));
}

const C = { white: rgb('#ffffff'), black: rgb('#000000'), red: rgb('#ef4444'), yellow: rgb('#ffe066') };

function carSprite(g, cx, y, w, col, back) {
  const h = Math.max(3, Math.round(w * 0.55));
  g.rect(cx - w / 2, y - h, w, h * 0.7, col);
  g.rect(cx - w * 0.32, y - h - h * 0.35, w * 0.64, h * 0.4, rgb('#1f2937'));
  g.rect(cx - w * 0.3, y - h - h * 0.3, w * 0.6, h * 0.25, rgb('#7dd3fc'));
  g.rect(cx - w / 2, y - h * 0.3, w * 0.22, h * 0.3, rgb('#111111')); g.rect(cx + w * 0.28, y - h * 0.3, w * 0.22, h * 0.3, rgb('#111111'));
  if (back) { g.rect(cx - w / 2 + 1, y - h * 0.85, Math.max(1, w * 0.18), Math.max(1, h * 0.2), rgb('#ff2e2e')); g.rect(cx + w * 0.32, y - h * 0.85, Math.max(1, w * 0.18), Math.max(1, h * 0.2), rgb('#ff2e2e')); }
}

function render(g, s) {
  g.gradient(0, Y0, rgb('#2d1b69'), rgb('#ffb36b'));
  g.gradient(Y0 - 14, Y0, rgb('#ff6b8b'), rgb('#ffd166'));
  g.circle(160, Y0, 30, rgb('#ffe9a8'));
  for (let i = 0; i < 4; i++) g.rect(130, Y0 - 24 + i * 7, 60, 2 + i, rgb('#ff8a5c'));
  for (let i = 0; i < 12; i++) { const mx = i * 30 - 10; for (let k = 0; k < 34; k++) g.rect(mx + k, Y0 - 3 - Math.max(0, 14 + (i % 3) * 6 - Math.abs(k - 17)), 1, 16 + (i % 3) * 6, rgb('#3b1d63')); }
  const curve = Math.sin(s.pos * 0.45) * 46;
  const roadAt = (t) => ({ hw: 5 + t * 125, cx: 160 + curve * (1 - t) * (1 - t) });
  for (let y = Y0; y < 180; y++) {
    const t = (y - Y0 + 1) / (180 - Y0);
    const d = 1 / t;
    const ph = Math.floor(d * 1.4 + s.pos * 1.5) % 2;
    const r = roadAt(t);
    g.rect(0, y, 320, 1, ph ? rgb('#2f9e44') : rgb('#37b24d'));
    g.rect(r.cx - r.hw, y, r.hw * 2, 1, ph ? rgb('#5a5a72') : rgb('#52526a'));
    const rw = Math.max(1, r.hw * 0.08);
    g.rect(r.cx - r.hw - rw, y, rw, 1, ph ? C.red : C.white); g.rect(r.cx + r.hw, y, rw, 1, ph ? C.red : C.white);
    if (ph) { const lw = Math.max(1, r.hw * 0.025); g.rect(r.cx - r.hw / 3 - lw / 2, y, lw, 1, C.white); g.rect(r.cx + r.hw / 3 - lw / 2, y, lw, 1, C.white); }
  }
  // palmeiras e carros (de tras para a frente)
  for (let k = 8; k >= 1; k--) {
    const t = 1 / (1 + 0.7 * k), y = Y0 + t * (180 - Y0), r = roadAt(t), sc = 0.3 + t * 1.4;
    [-1, 1].forEach((side) => {
      if ((k + s.pos) % 2 === (side > 0 ? 0 : 1)) {
        const x = r.cx + side * (r.hw + 12 * sc + 6);
        g.rect(x - sc, y - 26 * sc, Math.max(1, 3 * sc), 26 * sc, rgb('#6b3f1d'));
        for (let i = 0; i < 5; i++) g.line(x, y - 26 * sc, x + (i - 2) * 9 * sc, y - 20 * sc + Math.abs(i - 2) * 2 * sc, rgb('#1e8a4c'));
      }
    });
    const lanes = s.cars[s.pos + k] || [];
    lanes.forEach((ln) => {
      const x = r.cx + (ln - 1) * r.hw * 0.66;
      carSprite(g, x, y, Math.max(5, r.hw * 0.5), [rgb('#3b82f6'), rgb('#facc15'), rgb('#a855f7')][(s.pos + k + ln) % 3], true);
    });
  }
  // carro do jogador
  const r0 = roadAt(0.93);
  const px = r0.cx + (s.lane - 1) * r0.hw * 0.66 + (s.crash ? ((s.moves % 2) ? 4 : -4) : 0);
  g.rect(px - 22, 174, 44, 3, rgb('#00000070').map((v, i) => (i < 3 ? 20 : v)));
  g.rect(px - 22, 158, 44, 14, rgb('#e11d48')); g.rect(px - 18, 150, 36, 9, rgb('#e11d48')); g.rect(px - 15, 151, 30, 6, rgb('#7dd3fc'));
  g.rect(px - 22, 168, 9, 7, C.black); g.rect(px + 13, 168, 9, 7, C.black); g.rect(px - 20, 160, 6, 3, rgb('#ffeb99')); g.rect(px + 14, 160, 6, 3, rgb('#ffeb99'));
  if (s.crash) { g.textC('BATEU!', 160, 110, rgb('#ffe066'), 3, rgb('#b91c1c')); for (let i = 0; i < 8; i++) g.line(px, 150, px + Math.cos(i) * 24, 150 + Math.sin(i) * 14, rgb('#ffe066')); }
  // HUD
  g.rect(0, 0, 320, 14, C.black);
  g.text('TEMPO ' + String(Math.max(0, s.time)).padStart(2, '0'), 6, 3, s.time <= 8 ? rgb('#ff6b6b') : C.yellow, 2, rgb('#333333'));
  g.rect(130, 3, 120, 8, rgb('#333344')); g.rect(131, 4, Math.round(118 * Math.min(1, s.pos / LEN)), 6, rgb('#4ade80'));
  g.rect(130 + 118 * 12 / LEN, 2, 1, 10, C.white); g.rect(130 + 118 * 24 / LEN, 2, 1, 10, C.white);
  g.text(String(s.score).padStart(4, '0'), 262, 3, C.white, 2, rgb('#333333'));
  if (s.over) {
    g.rect(60, 62, 200, 52, C.black);
    g.textC(s.won ? 'CHEGADA!' : 'FIM DE JOGO', 160, 70, s.won ? C.yellow : rgb('#ff6b6b'), 3, rgb('#333333'));
    g.textC('PONTOS ' + s.score, 160, 96, C.white, 2);
  }
}

module.exports = { id: 'sunsetdrive', name: 'SUNSET DRIVE', emoji: '🏎️', tag: 'Corrida 3D', desc: 'Dirija ao pôr do sol, desvie do trânsito e passe os checkpoints', init: init, controls: controls, act: act, render: render, caption: caption };
