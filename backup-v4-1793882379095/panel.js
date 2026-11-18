'use strict';
/** MODOAP — painéis HTML (mini-app dentro do WhatsApp) + saque por código + resgate no chat. */
const crypto = require('crypto');
const K = require('./core');
const B = require('./panelBase');
const GAMES = Object.assign({}, require('./panelGames'), require('./panelCavalo'));
const { money } = K;
const MOD = 46656; // 36^3

function H(str, seed) { seed = seed || 0; let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return 4294967296 * (2097151 & h2) + (h1 >>> 0); }
const mac = (key, sc, sq, amount, cum) => (H(key + '|' + sc + '|' + sq + '|' + amount + '|' + cum) % 1679616).toString(36).padStart(4, '0').toUpperCase();

function build(game, d) {
  const g = GAMES[game]; const cfg = JSON.stringify(d).replace(/</g, '\\u003c');
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>' + B.CSS + '</style></head><body>' +
    B.HTML_TOP(g.title) + g.html + B.HTML_BOTTOM + '<script>var CFG=' + cfg + ';' + B.JS + g.js + '\nboot();</script></body></html>';
}
async function sendHtml(ctx, html, titulo) {
  const mini = require('../services/miniApp');
  if (mini.disabled() || !ctx.sock || typeof ctx.sock.relayMessage !== 'function') return false;
  if (!mini.selfTest().ok) return false;
  await ctx.sock.relayMessage(ctx.jid, mini.montarMensagem(html, crypto.randomUUID(), titulo), {}); return true;
}

async function open(ctx, S, game, a) {
  const o = K.overState(S.scope, S.id); if (o.blocked) return ctx.reply(K.blockMsg(o));
  const c = S.cfg.panel; const load = K.parseAmt(a[0] || String(Math.min(c.defLoad, Math.max(o.room, 0))), Math.min(o.room, c.maxLoad));
  if (!(load >= c.minLoad)) return ctx.reply('❌ Use: *' + ctx.__cmd + ' valor* (mín. ' + money(c.minLoad) + ', máx. ' + money(Math.min(o.room, c.maxLoad)) + ')\nO valor sai da tua carteira para o painel.');
  if (load > o.room) return ctx.reply('❌ Limite de crédito: máximo ' + money(o.room) + '.'); if (load > c.maxLoad) return ctx.reply('❌ Máximo por painel: ' + money(c.maxLoad));
  const s = K.cdTake(S.scope, S.id, 'appainel'); if (s) return ctx.reply(K.cdMsg(s));
  const d = K.D(); const old = d.prepare("SELECT COUNT(*) n FROM ap_panel WHERE scope=? AND jid=? AND status='open' AND expires>?").get(S.scope, S.id, K.now()).n;
  if (!K.betDebit(S.scope, S.id, load, 'painel', 'Carga ' + game)) return ctx.reply('❌ Não foi possível carregar o painel.');
  d.prepare("UPDATE ap_panel SET status='closed' WHERE scope=? AND jid=? AND status='open'").run(S.scope, S.id);
  const key = crypto.randomBytes(8).toString('hex'); const exp = K.now() + c.ttlMin * 60000;
  const sid = d.prepare("INSERT INTO ap_panel (scope,jid,chat,game,key,deposit,created,expires,status) VALUES (?,?,?,?,?,?,?,?, 'open')").run(S.scope, S.id, ctx.jid, game, key, load, K.now(), exp).lastInsertRowid;
  const wallet = K.player(S.scope, S.id).wallet;
  const html = build(game, { sid: Number(sid), sc: Number(sid) % MOD, key, name: (S.name || ('+' + S.id)).replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 18), deposit: load, wallet, exp, min: 100, minDraw: c.minDraw });
  let ok = false; try { ok = await sendHtml(ctx, html, '🎮 ' + GAMES[game].title); } catch (e) { console.error('[MODOAP painel]', e && e.message); }
  if (!ok) { d.prepare("UPDATE ap_panel SET status='void' WHERE id=?").run(sid); K.credit(S.scope, S.id, load, 'painel', 'Painel não abriu (reembolso)', true); K.D().prepare('DELETE FROM ap_cd WHERE scope=? AND jid=? AND key=?').run(S.scope, S.id, 'appainel'); return ctx.reply('❌ O painel não abriu neste aparelho/versão (reembolsado). Use *minitest* para ver o diagnóstico.'); }
  return ctx.reply('🎮 *' + GAMES[game].title + '* aberto com ' + money(load) + ' (sessão #' + sid + ', ' + c.ttlMin + ' min).' + (old ? '\n⚠️ O painel anterior foi fechado — o saldo que não sacaste perdeu-se.' : '') + '\n💸 Para guardar ganhos: *SACAR* no painel → copia o código → *resgatarap CÓDIGO*.');
}

async function redeem(ctx, S, a) {
  const raw = String(a.join('') || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); const d = K.D(); const fk = 'rfail:' + S.id;
  const fr = d.prepare('SELECT until, n FROM ap_cd WHERE scope=? AND jid=? AND key=?').get(S.scope, 'w', fk); if (fr && fr.until > K.now() && fr.n >= 5) return ctx.reply('🛑 Muitas tentativas inválidas. Tenta daqui a ' + K.dur(fr.until - K.now()) + '.');
  const bad = (m) => { K.windowHit(S.scope, fk, 99, 10); return ctx.reply('❌ ' + m); };
  if (raw.length !== 18) return ctx.reply('❌ Use: *resgatarap CÓDIGO* (18 caracteres, gerado no painel ao SACAR).');
  const sc = parseInt(raw.slice(0, 3), 36), sq = parseInt(raw[3], 36), amount = parseInt(raw.slice(4, 9), 36), cum = parseInt(raw.slice(9, 14), 36), m = raw.slice(14); const seq = sq >> 1, fin = sq & 1;
  const ses = d.prepare('SELECT * FROM ap_panel WHERE scope=? AND jid=? AND (id % ?) = ? ORDER BY id DESC LIMIT 1').get(S.scope, S.id, MOD, sc);
  if (!ses || ses.status === 'void') return bad('Código inválido (ou não é teu).'); if (mac(ses.key, sc, sq, amount, cum) !== m) return bad('Código inválido.');
  const c = S.cfg.panel; if (ses.status === 'final') return ctx.reply('⚠️ Essa sessão já foi encerrada (saque total resgatado).'); if (ses.status !== 'open') return ctx.reply('⚠️ Esse painel foi fechado (abriste outro). Resgata sempre antes de abrir um novo.');
  if (K.now() > ses.expires + c.redeemHours * 3600000) return bad('Código expirado.'); if (!(amount >= 1) || amount > c.maxCode) return bad('Valor inválido.');
  if (seq <= ses.last_seq) return ctx.reply('⚠️ Este código já foi resgatado (saldo desgastado).');
  if (cum - ses.last_cum !== amount) return ctx.reply('⚠️ Código fora de ordem. Resgata primeiro os saques anteriores deste painel.');
  if (ses.withdrawn + amount > ses.deposit * c.maxMult) return bad('Limite de ganho do painel excedido (máx. ' + c.maxMult + '× a carga).');
  return K.tx(() => {
    if (!d.prepare('INSERT OR IGNORE INTO ap_codes (code, sid, jid, amount, ts) VALUES (?,?,?,?,?)').run(raw, ses.id, S.id, amount, K.now()).changes) return ctx.reply('⚠️ Este código já foi resgatado (saldo desgastado).');
    d.prepare('UPDATE ap_panel SET withdrawn=withdrawn+?, last_seq=?, last_cum=?, final=?, status=? WHERE id=?').run(amount, seq, cum, fin, fin ? 'final' : 'open', ses.id); K.credit(S.scope, S.id, amount, 'painel', 'Saque painel #' + ses.id);
    return ctx.reply('✅ *CÓDIGO RESGATADO!* +' + money(amount) + (fin ? '\n🔒 Sessão encerrada.' : '') + '\n💼 Carteira: ' + money(K.player(S.scope, S.id).wallet) + '\n_Código consumido — não pode ser usado de novo._');
  });
}
const LIST = { apaviator2: 'aviator2', apmines2: 'mines2', applinko2: 'plinko2', apdice2: 'dice2', apmoeda2: 'moeda2', apslots2: 'slots2', aproleta2: 'roleta2', aptower2: 'tower2', aphilo2: 'hilo2', apblackjack2: 'blackjack2', apcavalo: 'cavalo2', apcavaleo: 'cavalo2' };
module.exports = { open, redeem, build, LIST, GAMES, mac };

// MODOAP_V3
