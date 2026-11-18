'use strict';
/** MODOAP — jogos (texto rápidos + AP GAMES visuais). Resultados calculados no servidor com crypto. */
const K = require('./core');
const R = require('./render');
const { money } = K;
const TITLE = { aviator: 'AP AVIATOR', rocket: 'AP ROCKET', dice: 'AP DICE', mines: 'AP MINES', plinko: 'AP PLINKO', tower: 'AP TOWER' };
const GROWTH = { aviator: 0.08, rocket: 0.11 };
const PL_M = [8, 3, 1.4, 0.7, 0.4, 0.7, 1.4, 3, 8];
const TTL = { aviator: 600, rocket: 600, mines: 300, tower: 300 };

function bet(S, game, arg, ctx) {
  const c = S.cfg.games[game]; const o = K.overState(S.scope, S.id);
  if (o.blocked) { ctx.reply(K.blockMsg(o)); return 0; }
  const v = K.parseAmt(arg, Math.min(o.room, c.max));
  if (!(v > 0)) { ctx.reply('❌ Indica o valor. Ex: *' + ctx.__cmd + ' 5000*'); return 0; }
  if (v < c.min) { ctx.reply('❌ Aposta mínima: ' + money(c.min)); return 0; }
  if (v > c.max) { ctx.reply('❌ Aposta máxima: ' + money(c.max)); return 0; }
  if (v > o.room) { ctx.reply('❌ Limite de crédito: só podes apostar até ' + money(o.room) + ' (carteira ' + money(o.p.wallet) + ').'); return 0; }
  return v;
}
const openGame = (S) => K.D().prepare("SELECT * FROM ap_games WHERE scope=? AND jid=? AND status='open'").get(S.scope, S.id);
function block(S, key, ctx) { const s = K.cdTake(S.scope, S.id, key); if (s) { ctx.reply(K.cdMsg(s)); return true; } return false; }
const bal = (S) => K.player(S.scope, S.id).wallet;
const sw = (win, v, mult) => (win ? '🟢 *GANHOU* +' + money(Math.floor(v * mult) - v) : '🔴 *PERDEU* -' + money(v));

/** jogo instantâneo: validações → recarga → débito → resultado → crédito */
async function instant(ctx, S, game, cmdKey, arg, run) {
  const v = bet(S, game, arg, ctx); if (!v) return; if (block(S, cmdKey, ctx)) return;
  if (!K.betDebit(S.scope, S.id, v, 'jogo:' + game, 'Aposta ' + game)) return ctx.reply('❌ Saldo insuficiente.');
  const r = run(v); const pay = r.win ? Math.floor(v * r.mult) : 0; if (pay > 0) K.credit(S.scope, S.id, pay, 'jogo:' + game, 'Prémio ' + game);
  K.stat(S.scope, S.id, game, pay - v, r.win);
  await ctx.reply('*' + r.head + '*\n' + r.txt + '\n\n' + sw(r.win, v, r.mult) + '\n💼 Carteira: ' + money(bal(S)));
}
const G = {};
G.apostar = (ctx, S, a) => instant(ctx, S, 'apostar', 'apapostar', a[0], () => { const c = S.cfg.games.apostar, w = K.chance(c.p); return { win: w, mult: c.mult, head: '🎲 APOSTA', txt: w ? 'A sorte sorriu-te! x' + c.mult : 'A casa venceu desta vez.' }; });
G.caraoucoroa = (ctx, S, a) => { const pick = /^(cara|coroa)$/.test(K.strip(a[1])) ? K.strip(a[1]) : (K.rnd(0, 1) ? 'cara' : 'coroa');
  return instant(ctx, S, 'caraoucoroa', 'apcaraoucoroa', a[0], () => { const c = S.cfg.games.caraoucoroa, w = K.chance(c.p); const res = w ? pick : (pick === 'cara' ? 'coroa' : 'cara');
    return { win: w, mult: c.mult, head: '🪙 CARA OU COROA', txt: 'Escolheste *' + pick + '* — saiu *' + res + '*' }; }); };
G.dados = (ctx, S, a) => instant(ctx, S, 'dados', 'apdados', a[0], () => { let me, bot; do { me = K.rnd(1, 6) + K.rnd(1, 6); bot = K.rnd(1, 6) + K.rnd(1, 6); } while (false);
  const c = S.cfg.games.dados; const tie = me === bot; return { win: me > bot || tie, mult: tie ? 1 : c.mult, head: '🎲 DADOS', tie, txt: 'Tu: *' + me + '*  |  Bot: *' + bot + '*' + (tie ? '\n🤝 Empate — aposta devolvida' : '') }; });
G.roleta = (ctx, S, a) => { const ch = K.strip(a[1]); const n = K.rnd(0, 36); const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const col = n === 0 ? 'verde' : reds.includes(n) ? 'vermelho' : 'preto'; const em = { verde: '🟢', vermelho: '🔴', preto: '⚫' }[col];
  let pick = ch; if (!ch) pick = K.rnd(0, 1) ? 'vermelho' : 'preto'; if (ch === 'red') pick = 'vermelho'; if (ch === 'black') pick = 'preto'; if (ch === 'green') pick = 'verde';
  const okPick = ['vermelho', 'preto', 'verde', 'par', 'impar'].includes(pick) || (/^\d+$/.test(pick) && +pick >= 0 && +pick <= 36);
  if (!okPick) return ctx.reply('❌ Escolhe: vermelho, preto, verde, par, impar ou um número 0-36.');
  return instant(ctx, S, 'roleta', 'aproleta', a[0], () => { const c = S.cfg.games.roleta; let w = false, m = 2;
    if (pick === col) { w = true; m = col === 'verde' ? c.mult : 2; } else if (pick === 'par' && n > 0 && n % 2 === 0) { w = true; } else if (pick === 'impar' && n % 2 === 1) { w = true; } else if (/^\d+$/.test(pick) && +pick === n) { w = true; m = 35; }
    return { win: w, mult: m, head: '🎰 ROLETA', txt: 'Apostaste em *' + pick + '*\nBola: ' + em + ' *' + n + '* (' + col + ')' }; }); };
G.parimpar = (ctx, S, a) => { let pick = K.strip(a[1]); if (pick === 'impar' || pick === 'ímpar') pick = 'impar'; if (pick !== 'par' && pick !== 'impar') pick = K.rnd(0, 1) ? 'par' : 'impar';
  return instant(ctx, S, 'parimpar', 'apparimpar', a[0], () => { const c = S.cfg.games.parimpar; const w = K.chance(c.p); const n = K.rnd(1, 50); let num = n; const wantEven = (pick === 'par') === w; if ((num % 2 === 0) !== wantEven) num++;
    return { win: w, mult: c.mult, head: '🔢 PAR OU ÍMPAR', txt: 'Escolheste *' + pick + '* — saiu *' + num + '* (' + (num % 2 ? 'ímpar' : 'par') + ')' }; }); };
G.corrida = (ctx, S, a) => { let pick = parseInt(a[1], 10); if (!(pick >= 1 && pick <= 4)) pick = K.rnd(1, 4); const names = ['🐎 Trovão', '🐕 Relâmpago', '🐢 Foguete', '🦊 Sombra'];
  return instant(ctx, S, 'corrida', 'apcorrida', a[0], () => { const c = S.cfg.games.corrida; const win = c.p > 0 ? K.chance(c.p) : null; let w = K.rnd(1, 4); if (win === true) w = pick; else if (win === false && w === pick) w = (pick % 4) + 1;
    return { win: w === pick, mult: c.mult, head: '🏁 CORRIDA', txt: 'Escolheste ' + names[pick - 1] + '\n🥇 Vencedor: ' + names[w - 1] }; }); };

// ── duelo (precisa de aceitação) ──
G.duelo = async (ctx, S, a, target) => {
  if (!target) return ctx.reply('❌ Use: *apduelo @user valor*'); const tid = K.pid(target); if (tid === S.id) return ctx.reply('❌ Não podes duelar contigo.');
  const v = bet(S, 'duelo', a.filter(x => !x.startsWith('@'))[0], ctx); if (!v) return; if (block(S, 'apduelo', ctx)) return;
  if (K.D().prepare("SELECT 1 FROM ap_duels WHERE scope=? AND a=? AND status='open'").get(S.scope, S.id)) return ctx.reply('❌ Já tens um duelo pendente.');
  if (!K.betDebit(S.scope, S.id, v, 'duelo', 'Aposta em duelo')) return ctx.reply('❌ Saldo insuficiente.');
  const id = K.newId('U'); K.D().prepare("INSERT INTO ap_duels VALUES (?,?,?,?,?,?,?, 'open')").run(id, S.scope, ctx.jid, S.id, tid, v, K.now() + 120000);
  await ctx.reply('⚔️ *DUELO* — @' + S.id + ' desafia @' + tid + ' por ' + money(v) + '!\n@' + tid + ', responde *apaceitar* ou *aprecusar* (2 min).', { mentions: [ctx.sender, target] });
};
G.aceitar = async (ctx, S, a, t, accept) => {
  const d = K.D().prepare("SELECT * FROM ap_duels WHERE scope=? AND b=? AND status='open' AND expires>? ORDER BY expires LIMIT 1").get(S.scope, S.id, K.now()); if (!d) return ctx.reply('❌ Sem duelos pendentes para ti.');
  const r = K.D().prepare("UPDATE ap_duels SET status=? WHERE id=? AND status='open'").run(accept ? 'done' : 'refused', d.id); if (!r.changes) return;
  if (!accept || !K.betDebit(S.scope, S.id, d.bet, 'duelo', 'Aposta em duelo')) { K.credit(S.scope, d.a, d.bet, 'duelo', 'Duelo cancelado', true); return ctx.reply(accept ? '❌ Sem saldo para aceitar. Duelo cancelado.' : '🏳️ Duelo recusado. Aposta devolvida.'); }
  const fee = Math.floor(d.bet * 2 * S.cfg.games.duelo.p / 100); const aWins = K.rnd(0, 1) === 1; const win = aWins ? d.a : d.b, lose = aWins ? d.b : d.a;
  K.credit(S.scope, win, d.bet * 2 - fee, 'duelo', 'Venceu duelo'); K.stat(S.scope, win, 'duelo', d.bet - fee, true); K.stat(S.scope, lose, 'duelo', -d.bet, false); K.hist(S.scope, lose, 'duelo', 0, 'Perdeu duelo');
  await ctx.reply('⚔️ *DUELO* — 🏆 @' + win + ' venceu e levou ' + money(d.bet * 2 - fee) + '!\n💀 @' + lose + ' perdeu ' + money(d.bet), { mentions: [win + '@s.whatsapp.net', lose + '@s.whatsapp.net'] });
};

// ── AP GAMES visuais ──
function img(S, row, r) {
  return R.game({ game: row.game, title: TITLE[row.game], name: S.name || row.name || '', bet: money(row.bet), mult: r.mult, win: r.win, delta: r.delta, balance: K.player(row.scope, row.jid).wallet, label: r.label, data: r.data });
}
async function out(ctx, buf, cap, mentions) { return ctx.send({ image: buf, caption: cap, mentions: mentions || [] }); }

function newCrash(c, game) {
  if (K.chance(c.p)) return 1; const r = K.rf(); const cap = Math.max(1.1, c.mult);
  return Math.min(cap, Math.max(1, Math.floor(100 * 0.97 / (1 - r)) / 100));
}
async function startCrash(ctx, S, a, game, cmdKey) {
  const c = S.cfg.games[game]; if (openGame(S)) return ctx.reply('⚠️ Já tens uma partida aberta. Termina com *apcashout* / *apmines retirar* / *aptower retirar*.');
  const raw = a.join(' ').split('|'); const a0 = raw[0].trim().split(/\s+/)[0]; let auto = 0;
  if (raw[1] !== undefined) { auto = parseFloat(String(raw[1]).replace(/[x×]/gi, '').replace(',', '.').trim()); if (!(auto >= 1.01 && auto <= c.mult)) return ctx.reply('❌ Retirada automática inválida. Use: *' + ctx.__cmd + ' 500 | 2* (de 1.01 até ' + c.mult + 'x).'); }
  const v = bet(S, game, a0, ctx); if (!v) return; if (block(S, cmdKey, ctx)) return;
  if (!K.betDebit(S.scope, S.id, v, 'jogo:' + game, 'Aposta ' + game)) return ctx.reply('❌ Saldo insuficiente.');
  const id = K.newId('G'); const st = { crash: newCrash(c, game), k: GROWTH[game], start: K.now(), jid: ctx.sender, name: S.name, auto: auto };
  K.D().prepare("INSERT INTO ap_games VALUES (?,?,?,?,?,?,?, 'open', ?, ?)").run(id, S.scope, ctx.jid, S.id, game, v, JSON.stringify(st), K.now(), K.now() + TTL[game] * 1000);
  if (auto) { const ms = Math.min(Math.log(Math.max(st.crash, 1)), Math.log(auto)) / st.k * 1000 + 400; const tm = setTimeout(() => autoSettle(id), ms); if (tm.unref) tm.unref(); }
  await ctx.reply((game === 'aviator' ? '✈️ *AP AVIATOR*' : '🚀 *AP ROCKET*') + ' — partida *' + id + '*\nAposta: ' + money(v) + '\nO multiplicador está a subir! ' + (auto ? 'Retirada automática em *' + auto.toFixed(2) + 'x* (se cair antes, perdes). Ou digite *apcashout*.' : 'Digite *apcashout* para retirar antes que caia. 📈'));
}
function crashState(row, at) { const st = JSON.parse(row.state); const t = (at - st.start) / 1000; const tc = Math.log(Math.max(st.crash, 1)) / st.k;
  if (t >= tc) return { crashed: true, mult: st.crash, t: tc, st }; return { crashed: false, mult: Math.max(1, Math.floor(Math.exp(st.k * t) * 100) / 100), t, st }; }
/** fecha uma partida crash (idempotente) — devolve imagem + texto */
function closeCrash(row, at, forceCrash, cashAt) {
  const r = K.D().prepare("UPDATE ap_games SET status='done' WHERE id=? AND status='open'").run(row.id); if (!r.changes) return null;
  const cs = crashState(row, at); const crashed = cashAt ? false : (forceCrash || cs.crashed); const mult = crashed ? 0 : (cashAt || cs.mult); const pay = Math.floor(row.bet * mult);
  if (pay > 0) K.credit(row.scope, row.jid, pay, 'jogo:' + row.game, 'Cashout ' + row.game);
  K.stat(row.scope, row.jid, row.game, pay - row.bet, pay > row.bet); K.hist(row.scope, row.jid, 'jogo:' + row.game, 0, (crashed ? 'Caiu em ' : 'Retirou em ') + (crashed ? cs.st.crash : mult) + 'x');
  const shown = crashed ? cs.st.crash : mult;
  const buf = R.game({ game: row.game, title: TITLE[row.game], name: cs.st.name, bet: money(row.bet), mult: shown, win: !crashed, delta: pay - row.bet, balance: K.player(row.scope, row.jid).wallet, label: crashed ? 'CAIU!' : 'RETIRADO', data: { k: cs.st.k, tEnd: Math.max(cashAt ? Math.log(cashAt) / cs.st.k : cs.t, 1), crashed } });
  return { buf, crashed, mult: shown, pay, jid: cs.st.jid, cap: (crashed ? '💥 Caiu em *' + cs.st.crash.toFixed(2) + 'x*! Perdeu ' + money(row.bet) : '✅ Retirou em *' + mult.toFixed(2) + 'x* — ganhou ' + money(pay - row.bet)) };
}
async function autoSettle(id) {
  try {
    const row = K.D().prepare("SELECT * FROM ap_games WHERE id=? AND status='open'").get(id); if (!row) return; const st = JSON.parse(row.state); if (!st.auto) return;
    const el = (K.now() - st.start) / 1000; if (el < Math.min(Math.log(Math.max(st.crash, 1)), Math.log(st.auto)) / st.k) return;
    const win = st.auto < st.crash; const c = closeCrash(row, K.now(), !win, win ? st.auto : 0); if (!c) return; const sock = K.getSock(); const cap = c.cap + '\n@' + row.jid;
    if (sock) await sock.sendMessage(row.chat, { image: c.buf, caption: cap, mentions: [c.jid] }).catch(() => {}); else K.notice(row.chat, cap, [row.jid]);
  } catch (e) { console.error('[MODOAP auto]', e.message); }
}
G.cashout = async (ctx, S) => {
  const row = K.D().prepare("SELECT * FROM ap_games WHERE scope=? AND jid=? AND status='open' AND game IN ('aviator','rocket')").get(S.scope, S.id); if (!row) return ctx.reply('❌ Não tens partida de Aviator/Rocket aberta.');
  const c = closeCrash(row, K.now()); if (c) await out(ctx, c.buf, c.cap + '\n💼 Carteira: ' + money(bal(S)));
};

G.dice = async (ctx, S, a) => {
  const v = bet(S, 'dice', a[0], ctx); if (!v) return; let pick = parseInt(a[1], 10); if (!(pick >= 1 && pick <= 6)) pick = K.rnd(1, 6); if (block(S, 'apdice', ctx)) return;
  if (!K.betDebit(S.scope, S.id, v, 'jogo:dice', 'Aposta dice')) return ctx.reply('❌ Saldo insuficiente.'); const c = S.cfg.games.dice;
  let roll = K.rnd(1, 6); if (c.p > 0) { roll = K.chance(c.p) ? pick : ((pick + K.rnd(0, 4)) % 6) + 1; } const win = roll === pick; const pay = win ? Math.floor(v * c.mult) : 0;
  if (pay) K.credit(S.scope, S.id, pay, 'jogo:dice', 'Prémio dice'); K.stat(S.scope, S.id, 'dice', pay - v, win);
  const buf = R.game({ game: 'dice', title: TITLE.dice, name: S.name, bet: money(v), mult: win ? c.mult : 0, win, delta: pay - v, balance: bal(S), label: win ? 'GANHOU' : 'PERDEU', data: { roll, pick } });
  await out(ctx, buf, '🎲 AP DICE — saiu *' + roll + '* (palpite ' + pick + ') ' + (win ? '🟢 +' + money(pay - v) : '🔴 -' + money(v)));
};
G.plinko = async (ctx, S, a) => {
  const v = bet(S, 'plinko', a[0], ctx); if (!v) return; if (block(S, 'applinko', ctx)) return;
  if (!K.betDebit(S.scope, S.id, v, 'jogo:plinko', 'Aposta plinko')) return ctx.reply('❌ Saldo insuficiente.'); const sc = S.cfg.games.plinko.mult;
  const path = []; for (let i = 0; i < 8; i++) path.push(K.rnd(0, 1)); const slot = path.reduce((x, y) => x + y, 0); const mults = PL_M.map(m => Math.round(m * sc * 100) / 100); const m = mults[slot];
  const pay = Math.floor(v * m); if (pay) K.credit(S.scope, S.id, pay, 'jogo:plinko', 'Prémio plinko'); K.stat(S.scope, S.id, 'plinko', pay - v, pay > v);
  const buf = R.game({ game: 'plinko', title: TITLE.plinko, name: S.name, bet: money(v), mult: m, win: pay > v, delta: pay - v, balance: bal(S), label: pay > v ? 'GANHOU' : 'PERDEU', data: { path, mults } });
  await out(ctx, buf, '🔴 AP PLINKO — caiu no *' + m + 'x* → ' + (pay >= v ? '🟢 +' : '🔴 -') + money(Math.abs(pay - v)));
};

// MINES
const MCOLS = 25; const minesMult = (k, m, edge) => { let x = 1; for (let i = 0; i < k; i++) x *= (MCOLS - i) / (MCOLS - m - i); return Math.floor(x * (1 - edge / 100) * 100) / 100; };
function closeInter(row, win, mult) { // mines/tower — idempotente
  const r = K.D().prepare("UPDATE ap_games SET status='done' WHERE id=? AND status='open'").run(row.id); if (!r.changes) return null;
  const pay = win ? Math.floor(row.bet * mult) : 0; if (pay) K.credit(row.scope, row.jid, pay, 'jogo:' + row.game, 'Cashout ' + row.game); K.stat(row.scope, row.jid, row.game, pay - row.bet, win && pay > row.bet);
  K.hist(row.scope, row.jid, 'jogo:' + row.game, 0, win ? 'Retirou ' + mult + 'x' : 'Perdeu'); return pay;
}
function interImg(row, st, over, win, mult, pay, label) {
  return R.game({ game: row.game, title: TITLE[row.game], name: st.name, bet: money(row.bet), mult, win: over ? win : null, delta: over ? pay - row.bet : 0, balance: K.player(row.scope, row.jid).wallet, label, data: Object.assign({}, st, { over }) });
}
G.mines = async (ctx, S, a) => {
  const sub = K.strip(a[0]); const row = K.D().prepare("SELECT * FROM ap_games WHERE scope=? AND jid=? AND status='open' AND game='mines'").get(S.scope, S.id);
  if (sub === 'escolher' || sub === 'e') {
    if (!row) return ctx.reply('❌ Sem partida de Mines. Inicia: *apmines 20000*'); const n = parseInt(a[1], 10); const st = JSON.parse(row.state);
    if (!(n >= 1 && n <= 25)) return ctx.reply('❌ Escolhe uma casa de 1 a 25.'); if (st.picked.includes(n - 1)) return ctx.reply('⚠️ Essa casa já foi aberta.');
    const edge = S.cfg.games.mines.p;
    if (st.mines.includes(n - 1)) { st.picked.push(n - 1); const pay = closeInter(row, false, 0); if (pay === null) return; return out(ctx, interImg(row, st, true, false, 0, 0, '💣 BOOM'), '💥 Bomba! Perdeste ' + money(row.bet)); }
    st.picked.push(n - 1); const m = minesMult(st.picked.length, st.mc, edge);
    if (st.picked.length >= 25 - st.mc) { const pay = closeInter(row, true, m); if (pay === null) return; return out(ctx, interImg(row, st, true, true, m, pay, 'LIMPOU'), '🏆 Limpaste o tabuleiro! +' + money(pay - row.bet)); }
    K.D().prepare('UPDATE ap_games SET state=? WHERE id=?').run(JSON.stringify(st), row.id);
    return out(ctx, interImg(row, Object.assign({}, st, { mines: [] }), false, null, m, 0, 'EM JOGO'), '💎 Seguro! ' + m + 'x (' + money(Math.floor(row.bet * m)) + ')\n*apmines escolher N* ou *apmines retirar*');
  }
  if (sub === 'retirar' || sub === 'r') {
    if (!row) return ctx.reply('❌ Sem partida de Mines.'); const st = JSON.parse(row.state); if (!st.picked.length) return ctx.reply('⚠️ Abre pelo menos uma casa antes de retirar.');
    const m = minesMult(st.picked.length, st.mc, S.cfg.games.mines.p); const pay = closeInter(row, true, m); if (pay === null) return;
    return out(ctx, interImg(row, st, true, true, m, pay, 'RETIRADO'), '✅ Retirou em *' + m + 'x* — +' + money(pay - row.bet) + '\n💼 ' + money(bal(S)));
  }
  if (row) return ctx.reply('⚠️ Já tens uma partida aberta (' + row.id + '). *apmines escolher N* ou *apmines retirar*.');
  if (openGame(S)) return ctx.reply('⚠️ Termina primeiro a tua outra partida aberta.');
  const v = bet(S, 'mines', a[0], ctx); if (!v) return; let mc = parseInt(a[1], 10); if (!(mc >= 1 && mc <= 20)) mc = 3; if (block(S, 'apmines', ctx)) return;
  if (!K.betDebit(S.scope, S.id, v, 'jogo:mines', 'Aposta mines')) return ctx.reply('❌ Saldo insuficiente.');
  const set = new Set(); while (set.size < mc) set.add(K.rnd(0, 24)); const st = { mines: [...set], picked: [], mc, jid: ctx.sender, name: S.name }; const id = K.newId('G');
  K.D().prepare("INSERT INTO ap_games VALUES (?,?,?,?,?,?,?, 'open', ?, ?)").run(id, S.scope, ctx.jid, S.id, 'mines', v, JSON.stringify(st), K.now(), K.now() + TTL.mines * 1000);
  const row2 = { id, scope: S.scope, jid: S.id, game: 'mines', bet: v };
  await out(ctx, interImg(row2, Object.assign({}, st, { mines: [] }), false, null, 1, 0, 'COMECOU'), '💣 *AP MINES* ' + id + ' — ' + mc + ' minas escondidas.\n*apmines escolher 1-25* | *apmines retirar*');
};
// TOWER
G.tower = async (ctx, S, a) => {
  const sub = K.strip(a[0]); const row = K.D().prepare("SELECT * FROM ap_games WHERE scope=? AND jid=? AND status='open' AND game='tower'").get(S.scope, S.id); const L = 8;
  const mOf = (lv) => Math.floor(Math.pow(1.5, lv) * (1 - S.cfg.games.tower.p / 100) * 100) / 100;
  if (sub === 'escolher' || sub === 'e') {
    if (!row) return ctx.reply('❌ Sem partida de Tower. Inicia: *aptower 20000*'); const st = JSON.parse(row.state); const n = parseInt(a[1], 10); if (!(n >= 1 && n <= 3)) return ctx.reply('❌ Escolhe 1, 2 ou 3.');
    st.picks[st.level] = n - 1; if (st.traps[st.level] === n - 1) { const pay = closeInter(row, false, 0); if (pay === null) return; return out(ctx, interImg(row, st, true, false, 0, 0, 'ARMADILHA'), '☠️ Armadilha no nível ' + (st.level + 1) + '! Perdeste ' + money(row.bet)); }
    st.level++; const m = mOf(st.level);
    if (st.level >= L) { const pay = closeInter(row, true, m); if (pay === null) return; return out(ctx, interImg(row, st, true, true, m, pay, 'TOPO!'), '🏆 Chegaste ao topo! ' + m + 'x → +' + money(pay - row.bet)); }
    K.D().prepare('UPDATE ap_games SET state=? WHERE id=?').run(JSON.stringify(st), row.id);
    return out(ctx, interImg(row, Object.assign({}, st, { traps: st.traps.map(() => -1) }), false, null, m, 0, 'NIVEL ' + (st.level + 1)), '🗼 Nível ' + st.level + ' ✅ ' + m + 'x\n*aptower escolher 1-3* | *aptower retirar*');
  }
  if (sub === 'retirar' || sub === 'r') { if (!row) return ctx.reply('❌ Sem partida de Tower.'); const st = JSON.parse(row.state); if (st.level < 1) return ctx.reply('⚠️ Sobe pelo menos um nível.');
    const m = mOf(st.level); const pay = closeInter(row, true, m); if (pay === null) return; return out(ctx, interImg(row, st, true, true, m, pay, 'RETIRADO'), '✅ Retirou em *' + m + 'x* — +' + money(pay - row.bet)); }
  if (row) return ctx.reply('⚠️ Já tens uma Tower aberta (' + row.id + ').'); if (openGame(S)) return ctx.reply('⚠️ Termina primeiro a tua outra partida aberta.');
  const v = bet(S, 'tower', a[0], ctx); if (!v) return; if (block(S, 'aptower', ctx)) return; if (!K.betDebit(S.scope, S.id, v, 'jogo:tower', 'Aposta tower')) return ctx.reply('❌ Saldo insuficiente.');
  const traps = []; for (let i = 0; i < L; i++) traps.push(K.rnd(0, 2)); const st = { traps, picks: [], level: 0, jid: ctx.sender, name: S.name }; const id = K.newId('G');
  K.D().prepare("INSERT INTO ap_games VALUES (?,?,?,?,?,?,?, 'open', ?, ?)").run(id, S.scope, ctx.jid, S.id, 'tower', v, JSON.stringify(st), K.now(), K.now() + TTL.tower * 1000);
  await out(ctx, interImg({ id, scope: S.scope, jid: S.id, game: 'tower', bet: v }, Object.assign({}, st, { traps: traps.map(() => -1) }), false, null, 1, 0, 'NIVEL 1'), '🗼 *AP TOWER* ' + id + ' — 8 níveis, 1 armadilha por nível.\n*aptower escolher 1-3* | *aptower retirar*');
};
G.aviator = (c, S, a) => startCrash(c, S, a, 'aviator', 'apaviator');
G.rocket = (c, S, a) => startCrash(c, S, a, 'rocket', 'aprocket');

/** relógio: fecha partidas que caíram/expiraram e devolve duelos expirados */
async function sweep(sock) {
  const d = K.D(); const t = K.now();
  for (const row of d.prepare("SELECT * FROM ap_games WHERE status='open'").all()) {
    try {
      if (row.game === 'aviator' || row.game === 'rocket') {
        if (JSON.parse(row.state).auto) { await autoSettle(row.id); continue; }
        const cs = crashState(row, t); if (!cs.crashed) continue; const c = closeCrash(row, t, true); if (!c) continue;
        if (sock) await sock.sendMessage(row.chat, { image: c.buf, caption: c.cap + '\n@' + row.jid, mentions: [c.jid] }).catch(() => {}); else K.notice(row.chat, c.cap + '\n@' + row.jid, [row.jid]);
      } else if (row.expires <= t) {
        const st = JSON.parse(row.state); const prog = row.game === 'mines' ? st.picked.length : st.level; const cfgp = K.cfg(row.scope).games[row.game].p;
        let m = 1; if (prog > 0) m = row.game === 'mines' ? minesMult(prog, st.mc, cfgp) : Math.floor(Math.pow(1.5, prog) * (1 - cfgp / 100) * 100) / 100;
        const pay = closeInter(row, true, prog > 0 ? m : 1); if (pay !== null) K.notice(row.chat, '⌛ Partida *' + row.id + '* (' + row.game + ') expirou — retirada automática: ' + money(pay) + ' para @' + row.jid, [row.jid]);
      }
    } catch (e) { console.error('[MODOAP sweep]', e.message); }
  }
  for (const du of d.prepare("SELECT * FROM ap_duels WHERE status='open' AND expires<=?").all(t)) {
    const r = d.prepare("UPDATE ap_duels SET status='expired' WHERE id=? AND status='open'").run(du.id); if (r.changes) { K.credit(du.scope, du.a, du.bet, 'duelo', 'Duelo expirado', true); K.notice(du.chat, '⌛ Duelo expirado — aposta devolvida a @' + du.a, [du.a]); }
  }
}
K.onTick(sweep);
module.exports = { G, sweep };

// MODOAP_V3
