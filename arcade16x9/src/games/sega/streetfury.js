'use strict';
// STREET FURY - luta de rua por turnos (inspirado nos classicos beat'em up)
const { rgb, rng } = require('./gfx');

function mkEnemy(kind, i) {
  const boss = kind === 'boss';
  return { kind: kind, hp: boss ? 130 : 44 + i * 3, max: boss ? 130 : 44 + i * 3, intent: false, stun: 0, name: boss ? 'CHEFE' : 'CAPANGA' };
}
function wave(stage) {
  if (stage === 1) return [mkEnemy('thug', 0), mkEnemy('thug', 1)];
  if (stage === 2) return [mkEnemy('thug', 0), mkEnemy('thug', 1), mkEnemy('thug', 2)];
  return [mkEnemy('boss', 0), mkEnemy('thug', 3)];
}

function init(seed) {
  const r = rng(seed || 3);
  const s = { r: r, stage: 1, hp: 100, meter: 0, score: 0, moves: 0, enemies: wave(1), over: false, won: false, last: '', hit: false, log: [], msg: 'Fase 1! Reparem nos ! vermelhos: são os inimigos que vão atacar.' };
  intents(s);
  return s;
}

function intents(s) {
  s.enemies.forEach((e) => { e.intent = e.hp > 0 && e.stun <= 0 && s.r() < (e.kind === 'boss' ? 0.8 : 0.62); });
}

function controls() {
  return {
    main: [{ id: 'punch', label: '👊 Soco' }, { id: 'kick', label: '🦵 Chute' }],
    more: [{ id: 'special', label: '💥 Especial', desc: 'Atinge todos (gasta 50 de energia)' }, { id: 'guard', label: '🛡️ Defender', desc: 'Reduz 75% do dano e carrega energia' }]
  };
}

const alive = (s) => s.enemies.filter((e) => e.hp > 0);

function act(s, id) {
  if (s.over) return;
  const front = alive(s)[0];
  if (id === 'special' && s.meter < 50) { s.msg = 'Sem energia para o Especial! (precisa de 50, tens ' + s.meter + ')'; s.log = []; return; }
  s.moves++; s.last = id; s.hit = false; s.log = [];
  let guard = false;
  if (id === 'punch') { const d = 12 + s.r.int(8); front.hp -= d; s.meter = Math.min(100, s.meter + 15); s.hit = true; s.log.push('Soco: -' + d); }
  else if (id === 'kick') { const d = 20 + s.r.int(8); front.hp -= d; front.stun = 1; s.meter = Math.min(100, s.meter + 20); s.hit = true; s.log.push('Chute: -' + d + ' e o inimigo fica atordoado'); }
  else if (id === 'special') { s.meter -= 50; alive(s).forEach((e) => { e.hp -= e.kind === 'boss' ? 22 : 32; }); s.hit = true; s.log.push('ESPECIAL em todos os inimigos!'); }
  else if (id === 'guard') { guard = true; s.meter = Math.min(100, s.meter + 12); s.log.push('Defendeste'); }
  s.enemies.forEach((e) => { if (e.hp <= 0 && !e.dead) { e.dead = true; s.score += e.kind === 'boss' ? 500 : 100; s.log.push(e.name + ' derrotado! +' + (e.kind === 'boss' ? 500 : 100)); } });
  let taken = 0;
  alive(s).forEach((e) => {
    if (e.stun > 0) { e.stun--; return; }
    if (!e.intent) return;
    let d = e.kind === 'boss' ? 15 + s.r.int(8) : 9 + s.r.int(6);
    if (guard) d = Math.round(d * 0.25);
    taken += d;
  });
  if (taken) { s.hp -= taken; s.log.push('Levaste -' + taken + ' de dano'); }
  if (s.hp <= 0) { s.hp = 0; s.over = true; s.msg = 'Foste derrotado!'; return; }
  if (!alive(s).length) {
    s.score += 200;
    if (s.stage >= 3) { s.over = true; s.won = true; const b = 1000 + Math.max(0, 1000 - s.moves * 25) + s.hp * 5; s.score += b; s.msg = 'Cidade salva! Bónus +' + b; return; }
    s.stage++; s.hp = Math.min(100, s.hp + 25); s.enemies = wave(s.stage); s.msg = 'Fase ' + s.stage + (s.stage === 3 ? ' — CHEFE!' : '!') + ' Recuperaste 25 de vida.';
  } else s.msg = '';
  intents(s);
}

function caption(s) {
  const l = [];
  if (s.msg) l.push(s.msg);
  if (s.log.length) l.push(s.log.join(' • '));
  l.push('Vida: ' + s.hp + ' • Energia: ' + s.meter + ' • Pontos: ' + s.score + ' • Fase ' + s.stage + '/3');
  l.push('👊 Soco • 🦵 Chute (atordoa) • 💥 Especial (50 energia) • 🛡️ Defender');
  return l.join('\n');
}

const SK = rgb('#f5c6a0'), BK = rgb('#111111'), WH = rgb('#ffffff');
const STYLE = {
  hero: { hair: rgb('#ff4fa3'), top: rgb('#14b8a6'), pants: rgb('#1e293b'), shoe: rgb('#ffffff'), scale: 1 },
  thug: { hair: SK, top: rgb('#dc2626'), pants: rgb('#4b5563'), shoe: rgb('#111111'), scale: 1 },
  thug2: { hair: rgb('#3b2f2f'), top: rgb('#eab308'), pants: rgb('#374151'), shoe: rgb('#111111'), scale: 1 },
  boss: { hair: rgb('#111111'), top: rgb('#111827'), pants: rgb('#1f2937'), shoe: rgb('#b91c1c'), scale: 1.3 }
};

function fighter(g, x, y, st, pose, dir) {
  const k = st.scale;
  const R = (dx, dy, w, h, c) => { const px = dir > 0 ? x + dx * k : x - dx * k - w * k; g.rect(Math.round(px), Math.round(y + dy * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)), c); };
  R(-9, -2, 18, 2, rgb('#00000055').map((v, i) => (i < 3 ? 20 : v)));
  if (pose === 'kick') { R(-7, -16, 5, 14, st.pants); R(0, -22, 18, 6, st.pants); R(16, -23, 5, 8, st.shoe); }
  else { R(-7, -16, 6, 14, st.pants); R(1, -16, 6, 14, st.pants); R(-8, -3, 8, 3, st.shoe); R(1, -3, 8, 3, st.shoe); }
  R(-8, -32, 16, 17, st.top);
  if (pose === 'punch') { R(5, -29, 18, 5, st.top); R(21, -30, 6, 7, SK); R(-11, -29, 4, 12, st.top); }
  else { R(-11, -30, 4, 13, st.top); R(7, -30, 4, 13, st.top); R(-11, -18, 4, 4, SK); R(7, -18, 4, 4, SK); }
  R(-5, -43, 11, 11, SK); R(-6, -45, 13, 5, st.hair);
  if (st === STYLE.boss) R(-1, -40, 8, 3, BK); else { R(2, -40, 2, 2, BK); }
}

function bar(g, x, y, w, v, max, col) {
  g.rect(x, y, w, 7, rgb('#000000')); g.rect(x + 1, y + 1, w - 2, 5, rgb('#333344'));
  g.rect(x + 1, y + 1, Math.max(0, Math.round((w - 2) * Math.max(0, v) / max)), 5, col);
}

function star(g, x, y) {
  const cy = rgb('#ffe066'), w = WH;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.line(x, y, x + Math.cos(a) * 12, y + Math.sin(a) * 12, i % 2 ? w : cy); }
  g.circle(x, y, 4, w);
}

function render(g, s) {
  g.gradient(0, 130, rgb('#1b1035'), rgb('#6b2f8a'));
  g.circle(262, 30, 14, rgb('#fff2c6')); g.circle(268, 27, 12, rgb('#6b2f8a'));
  const rr = rng(77);
  for (let i = 0; i < 9; i++) {
    const bx = i * 38 - 6, bh = 50 + rr.int(50), bw = 30 + rr.int(8);
    g.rect(bx, 130 - bh, bw, bh, rgb('#2a1a4a'));
    for (let wy = 130 - bh + 6; wy < 124; wy += 9) for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) if (rr() < 0.55) g.rect(wx, wy, 4, 5, rr() < 0.5 ? rgb('#ffd166') : rgb('#7bdff2'));
  }
  g.rect(196, 46, 56, 18, rgb('#111111')); g.rect(198, 48, 52, 14, rgb('#ff2e93')); g.textC('BAR', 224, 51, WH, 2);
  g.rect(0, 130, 320, 14, rgb('#4a4a62')); g.rect(0, 130, 320, 2, rgb('#6d6d8a'));
  g.rect(0, 144, 320, 36, rgb('#25253a'));
  for (let x = 6; x < 320; x += 40) g.rect(x, 168, 22, 3, rgb('#d9d9e8'));
  const alv = alive(s);
  const px = 66, base = 156;
  const hurt = s.log.some((l) => /Levaste/.test(l)) ? 2 : 0;
  fighter(g, px - hurt, base, STYLE.hero, s.last === 'punch' ? 'punch' : s.last === 'kick' ? 'kick' : 'idle', 1);
  if (s.last === 'guard') { g.rect(px + 10, base - 38, 4, 30, rgb('#7dd3fc')); g.rect(px + 12, base - 36, 2, 26, WH); }
  const xs = [166, 214, 262];
  alv.forEach((e, i) => {
    const x = xs[i] + (e.stun > 0 ? 6 : 0);
    const st = e.kind === 'boss' ? STYLE.boss : (i % 2 ? STYLE.thug2 : STYLE.thug);
    fighter(g, x, base, st, 'idle', -1);
    bar(g, x - 14, base - (e.kind === 'boss' ? 64 : 54), 28, e.hp, e.max, e.kind === 'boss' ? rgb('#ff6b6b') : rgb('#ffb347'));
    if (e.intent && e.stun <= 0) g.textC('!', x, base - (e.kind === 'boss' ? 82 : 72), rgb('#ff2e2e'), 3, BK);
    if (e.stun > 0) g.textC('*', x, base - 72, rgb('#ffe066'), 3, BK);
  });
  if (s.hit && alv[0]) star(g, xs[0] - 14, base - 28);
  // HUD
  g.rect(0, 0, 320, 14, BK);
  g.text('TU', 4, 4, WH, 1); bar(g, 16, 3, 90, s.hp, 100, rgb('#4ade80'));
  g.text('EN', 112, 4, rgb('#ffe066'), 1); bar(g, 126, 3, 50, s.meter, 100, rgb('#ffe066'));
  g.text('FASE ' + s.stage, 190, 3, WH, 2);
  g.text(String(s.score).padStart(5, '0'), 262, 3, rgb('#ffe066'), 2);
  if (s.over) {
    g.rect(60, 62, 200, 52, BK);
    g.textC(s.won ? 'VITORIA!' : 'DERROTA', 160, 70, s.won ? rgb('#ffe066') : rgb('#ff6b6b'), 3, rgb('#333333'));
    g.textC('PONTOS ' + s.score, 160, 96, WH, 2);
  }
}

module.exports = { id: 'streetfury', name: 'STREET FURY', emoji: '🥊', tag: 'Luta de rua', desc: 'Enfrente gangues em 3 fases: soco, chute, especial e defesa', init: init, controls: controls, act: act, render: render, caption: caption };
