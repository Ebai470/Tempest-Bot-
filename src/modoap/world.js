'use strict';
/** MODOAP — crimes, partidas/trollagens, mute, comércio e negócios (tudo fictício). */
const K = require('./core');
const { money } = K;
const ITEMS = {
  kit: { n: 'Kit de Ladrão', price: 50000, d: '+15% de sucesso no próximo crime (consumível)' },
  escudo: { n: 'Escudo', price: 200000, d: 'Bloqueia 1 roubo/golpe contra ti (consumível)' },
  advogado: { n: 'Advogado', price: 150000, d: 'Sai da prisão grátis (consumível)' },
  relogio: { n: 'Relógio de Ouro', price: 500000, d: 'Item de coleção' },
  diamante: { n: 'Diamante', price: 2000000, d: 'Item de coleção' },
  coroa: { n: 'Coroa Real', price: 10000000, d: 'Item de coleção raro' }
};
const BIZ = {
  barraca: { n: 'Barraca', price: 100000, inc: 4000 }, padaria: { n: 'Padaria', price: 500000, inc: 22000 },
  loja: { n: 'Loja', price: 2000000, inc: 95000 }, banco: { n: 'Banco Virtual', price: 10000000, inc: 500000 }
};
const findKey = (map, s) => { s = K.strip(s); return Object.keys(map).find(k => k === s || K.strip(map[k].n) === s) || null; };
const qty = (S, item, id) => { const r = K.D().prepare('SELECT qty FROM ap_inv WHERE scope=? AND jid=? AND item=?').get(S.scope, id || S.id, item); return r ? r.qty : 0; };
const addItem = (S, id, item, n) => { K.D().prepare('INSERT INTO ap_inv (scope,jid,item,qty) VALUES (?,?,?,?) ON CONFLICT(scope,jid,item) DO UPDATE SET qty=qty+?').run(S.scope, id, item, n, n); };
const useItem = (S, id, item) => K.D().prepare('UPDATE ap_inv SET qty=qty-1 WHERE scope=? AND jid=? AND item=? AND qty>=1').run(S.scope, id, item).changes > 0;
const tag = (id) => '@' + id; const jidOf = (id) => id + '@s.whatsapp.net';
const num = (a) => a.filter(x => !String(x).startsWith('@'));

function jailLeft(S, id) { const p = K.player(S.scope, id || S.id); return p.jail_until > K.now() ? p.jail_until - K.now() : 0; }
function embargoLeft(S) { const p = K.player(S.scope, S.id); return p.embargo_until > K.now() ? p.embargo_until - K.now() : 0; }
function setJail(S, id, min) { K.D().prepare('UPDATE ap_players SET jail_until=?, jail_count=jail_count+1, wanted=0 WHERE scope=? AND jid=?').run(K.now() + min * 60000, S.scope, id); }

// ───────── crimes ─────────
async function crime(ctx, S, key, target) {
  const c = S.cfg.crime[key]; const jl = jailLeft(S); if (jl) return ctx.reply('🔒 Estás preso! Faltam ' + K.dur(jl) + '. Usa *apfugir* ou *apliberdade*.');
  let tid = null;
  if (key === 'aproubar') {
    if (!target) return ctx.reply('❌ Use: *aproubar @user*'); tid = K.pid(target); if (tid === S.id) return ctx.reply('❌ Não podes roubar-te a ti mesmo.');
    if (K.player(S.scope, tid).wallet < c.tmin) return ctx.reply('🙄 Esse jogador está sem dinheiro na carteira (o cofre/banco está protegido).');
    { const l = K.cdLeft(S.scope, S.id, key); if (l) return ctx.reply(K.cdMsg(Math.ceil(l / 1000))); }
    if (K.windowHit(S.scope, 'rob:' + S.id + ':' + tid, S.cfg.troll.maxPerTarget, S.cfg.troll.windowMin)) return ctx.reply('🛑 Já roubaste demasiado essa pessoa. Espera um pouco.');
  }
  const s = K.cdTake(S.scope, S.id, key); if (s) return ctx.reply(K.cdMsg(s));
  let p = c.p; if (useItem(S, S.id, 'kit')) p += 15;
  const names = { apcrime: 'um pequeno crime', aproubar: 'um roubo', apassaltar: 'um assalto', apcontrabando: 'contrabando' };
  if (K.chance(Math.min(90, p))) {
    let gain, extra = '';
    if (key === 'aproubar') {
      if (useItem(S, tid, 'escudo')) { const f = K.take(S.scope, S.id, K.rnd(c.fmin, c.fmax), 'multa', 'Roubo bloqueado'); K.credit(S.scope, tid, f, 'multa', 'Multa de ladrão', true); return ctx.reply('🛡️ O escudo de ' + tag(tid) + ' bloqueou o roubo! Pagaste ' + money(f) + ' de multa.', { mentions: [target] }); }
      gain = K.take(S.scope, tid, Math.min(c.cap, Math.floor(K.player(S.scope, tid).wallet * c.pct / 100 * (0.5 + K.rf() / 2))), 'roubado', 'Roubado por ' + S.id); if (gain < 1) return ctx.reply('🙄 Não conseguiste levar nada.');
      extra = '\n😭 Vítima: ' + tag(tid);
    } else gain = K.rnd(c.min, c.max);
    K.credit(S.scope, S.id, gain, 'crime', key); K.D().prepare('UPDATE ap_players SET wanted=wanted+1 WHERE scope=? AND jid=?').run(S.scope, S.id);
    return ctx.reply('🟢 *SUCESSO!* Fizeste ' + names[key] + ' e ganhaste ' + money(gain) + '! 🤑' + extra + '\n💼 Carteira: ' + money(K.player(S.scope, S.id).wallet), { mentions: target ? [target] : [] });
  }
  const fine = K.take(S.scope, S.id, K.rnd(c.fmin, c.fmax), 'multa', key); if (tid) K.credit(S.scope, tid, Math.floor(fine / 2), 'multa', 'Indemnização', true);
  let t = '🔴 *FALHOU!* A polícia apanhou-te. Multa: ' + money(fine) + '.'; if (K.chance(c.jail)) { setJail(S, S.id, c.jmin); t += '\n🚔 *PRESO* por ' + c.jmin + ' minutos! (*apfugir* / *apliberdade*)'; }
  return ctx.reply(t + '\n💼 Carteira: ' + money(K.player(S.scope, S.id).wallet));
}
async function fugir(ctx, S) {
  const jl = jailLeft(S); if (!jl) return ctx.reply('✅ Não estás preso.'); const s = K.cdTake(S.scope, S.id, 'apfugir'); if (s) return ctx.reply(K.cdMsg(s));
  if (K.chance(S.cfg.crime.apfugir.p)) { K.D().prepare('UPDATE ap_players SET jail_until=0 WHERE scope=? AND jid=?').run(S.scope, S.id); return ctx.reply('🏃💨 *FUGISTE DA PRISÃO!*'); }
  K.D().prepare('UPDATE ap_players SET jail_until=jail_until+60000 WHERE scope=? AND jid=?').run(S.scope, S.id); return ctx.reply('🚨 Fuga falhada! +1 minuto de pena. Faltam ' + K.dur(jl + 60000) + '.');
}
async function liberdade(ctx, S) {
  const jl = jailLeft(S); if (!jl) return ctx.reply('✅ Não estás preso.');
  if (useItem(S, S.id, 'advogado')) { K.D().prepare('UPDATE ap_players SET jail_until=0 WHERE scope=? AND jid=?').run(S.scope, S.id); return ctx.reply('⚖️ O teu *Advogado* livrou-te da prisão!'); }
  const bail = Math.ceil(jl / 60000) * S.cfg.crime.bail; if (!K.debit(S.scope, S.id, bail, 'fianca', 'Fiança')) return ctx.reply('❌ Fiança: ' + money(bail) + '. Não tens saldo.');
  K.D().prepare('UPDATE ap_players SET jail_until=0 WHERE scope=? AND jid=?').run(S.scope, S.id); return ctx.reply('🔓 Pagaste ' + money(bail) + ' de fiança. Estás livre!');
}
async function prisao(ctx, S) {
  const jl = jailLeft(S); const rows = K.D().prepare('SELECT jid, name, jail_until FROM ap_players WHERE scope=? AND jail_until>? ORDER BY jail_until DESC LIMIT 10').all(S.scope, K.now());
  let t = jl ? '🔒 Estás preso por mais ' + K.dur(jl) + '.' : '✅ Estás livre.'; t += '\n\n🚔 *PRESOS*' + (rows.length ? '' : ' — ninguém'); rows.forEach(r => { t += '\n• ' + K.nameOf(r) + ' — ' + K.dur(r.jail_until - K.now()); }); return ctx.reply(t);
}
async function procurado(ctx, S) {
  const rows = K.D().prepare('SELECT jid, name, wanted FROM ap_players WHERE scope=? AND wanted>0 ORDER BY wanted DESC LIMIT 10').all(S.scope);
  return ctx.reply('🚨 *MAIS PROCURADOS*' + (rows.length ? '' : '\nNinguém por enquanto.') + rows.map((r, i) => '\n' + (i + 1) + '. ' + K.nameOf(r) + ' — ⭐ ' + r.wanted).join(''));
}

// ───────── partidas / trollagens ─────────
function lossOf(S, tid, pct) { const w = K.player(S.scope, tid).wallet; const t = S.cfg.troll; return Math.max(0, Math.min(Math.floor(w * pct / 100), Math.floor(w * t.maxLossPct / 100), t.maxLossAbs)); }
async function troll(ctx, S, key, target, a) {
  if (!target) return ctx.reply('❌ Use: *' + key + ' @user' + (key === 'apmultar' ? ' valor' : '') + '*'); const tid = K.pid(target); if (tid === S.id) return ctx.reply('❌ Escolhe outra pessoa.');
  const price = S.cfg.troll.price[key]; const me = K.player(S.scope, S.id); if (me.wallet < price) return ctx.reply('❌ Esta partida custa ' + money(price) + '. Carteira: ' + money(me.wallet));
  let fineWanted = 0; if (key === 'apmultar') { fineWanted = K.parseAmt(num(a).pop(), 1e12); if (!(fineWanted > 0)) return ctx.reply('❌ Use: *apmultar @user valor*'); }
  if (key === 'apdesafio' && K.player(S.scope, tid).wallet < price) return ctx.reply('❌ O alvo não tem ' + money(price) + ' para o desafio.');
  if (key === 'apembargo' && K.player(S.scope, tid).embargo_until > K.now()) return ctx.reply('❌ Esse jogador já está embargado.');
  { const l = K.cdLeft(S.scope, S.id, key); if (l) return ctx.reply(K.cdMsg(Math.ceil(l / 1000))); }
  if (K.windowHit(S.scope, 'troll:' + S.id + ':' + tid, S.cfg.troll.maxPerTarget, S.cfg.troll.windowMin)) return ctx.reply('🛑 Proteção anti-abuso: já fizeste demasiadas partidas contra essa pessoa. Tenta mais tarde.');
  const s = K.cdTake(S.scope, S.id, key); if (s) return ctx.reply(K.cdMsg(s));
  K.debit(S.scope, S.id, price, 'partida', key); const T = tag(tid), M = tag(S.id); const m = [ctx.sender, target]; let t;
  const shielded = () => ['apgolpe', 'aptroll'].includes(key) && useItem(S, tid, 'escudo');
  if (key === 'aptroll') {
    const ev = K.rnd(1, 5);
    if (ev === 1) { const l = K.take(S.scope, tid, lossOf(S, tid, 2), 'auditoria', 'Auditoria'); t = '🧾 *AUDITORIA BANCÁRIA FICTÍCIA!*\n' + T + ' foi auditado e perdeu ' + money(l) + '.'; }
    else if (ev === 2) { const l = K.take(S.scope, tid, lossOf(S, tid, 3), 'imposto', 'Imposto surpresa'); t = '💸 *IMPOSTO SURPRESA!*\n' + T + ' pagou ' + money(l) + ' ao Tesouro.'; }
    else if (ev === 3) { const g = K.rnd(5000, 30000); K.credit(S.scope, tid, g, 'heranca', 'Herança'); t = '👻 *HERANÇA MISTERIOSA!*\n' + T + ' recebeu ' + money(g) + ' de um tio distante... pago por ' + M + ' (que azar 😂).'; }
    else if (ev === 4) { const l = K.take(S.scope, tid, lossOf(S, tid, 1.5), 'divida', 'Dívida inesperada'); K.credit(S.scope, S.id, l, 'divida', 'Dívida inesperada'); t = '📜 *DÍVIDA INESPERADA!*\n' + T + ' devia ' + money(l) + ' a ' + M + '.'; }
    else { const g = K.rnd(3000, 15000); K.credit(S.scope, tid, g, 'evento', 'Evento'); K.credit(S.scope, S.id, g, 'evento', 'Evento'); t = '🎁 *EVENTO DE RECOMPENSA!*\n' + T + ' e ' + M + ' receberam ' + money(g) + ' cada!'; }
    if (ev <= 2 && shielded()) { K.credit(S.scope, tid, 0); t = '🛡️ ' + T + ' usou o *Escudo* e ignorou a trollagem de ' + M + '!'; }
  } else if (key === 'apmultar') {
    const f = Math.min(fineWanted, lossOf(S, tid, 100)); if (f < 1) t = '👮 ' + T + ' não tem dinheiro para pagar a multa.'; else { K.take(S.scope, tid, f, 'multa', 'Multa de ' + S.id); t = '🚓 *MULTA!* ' + M + ' multou ' + T + ' em ' + money(f) + ' (valor limitado pela proteção anti-abuso).'; }
  } else if (key === 'apgolpe') {
    if (shielded()) t = '🛡️ ' + T + ' tinha *Escudo*! O golpe de ' + M + ' falhou.';
    else if (K.chance(40)) { const g = K.take(S.scope, tid, lossOf(S, tid, 8), 'golpe', 'Golpe'); K.credit(S.scope, S.id, g, 'golpe', 'Golpe'); t = '🎭 *GOLPE PERFEITO!* ' + M + ' levou ' + money(g) + ' de ' + T + '!'; }
    else { const f = K.take(S.scope, S.id, 30000, 'golpe_falhado', 'Golpe falhado'); K.credit(S.scope, tid, f, 'indemnizacao', 'Golpe falhado', true); t = '🚨 *GOLPE FALHADO!* ' + M + ' pagou ' + money(f) + ' a ' + T + '.'; }
  } else if (key === 'aptribunal') {
    if (K.chance(55)) { const g = K.take(S.scope, tid, lossOf(S, tid, 6), 'tribunal', 'Condenado'); K.credit(S.scope, S.id, g, 'tribunal', 'Indemnização'); t = '⚖️ *JULGAMENTO VIRTUAL* — ' + T + ' foi *CULPADO*! Paga ' + money(g) + ' a ' + M + '.'; }
    else { const f = K.take(S.scope, S.id, 25000, 'tribunal', 'Processo perdido'); K.credit(S.scope, tid, f, 'tribunal', 'Indemnização', true); t = '⚖️ *JULGAMENTO VIRTUAL* — ' + T + ' foi *INOCENTE*! ' + M + ' paga ' + money(f) + ' de indemnização.'; }
  } else if (key === 'apembargo') {
    const mn = S.cfg.troll.embargoMin; K.D().prepare('UPDATE ap_players SET embargo_until=? WHERE scope=? AND jid=?').run(K.now() + mn * 60000, S.scope, tid); t = '🚫 *EMBARGO FICTÍCIO!* ' + T + ' não pode pagar, depositar, comprar nem investir por ' + mn + ' min.';
  } else if (key === 'apdesafio') {
    const win = K.rnd(0, 1) ? S.id : tid; const lose = win === S.id ? tid : S.id; const f = Math.floor(price * 0.9); K.take(S.scope, lose, price, 'desafio', 'Desafio'); K.credit(S.scope, win, f, 'desafio', 'Desafio');
    t = '🏆 *DESAFIO ECONÓMICO!* ' + tag(win) + ' venceu e levou ' + money(f) + ' de ' + tag(lose) + '!';
  }
  return ctx.reply(t + '\n💰 Preço pago: ' + money(price), { mentions: m });
}

// ───────── mute ─────────
async function mute(ctx, S, a, target) {
  const mn = parseInt(num(a).pop(), 10); const price = S.cfg.mute[mn];
  if (!target || !(mn >= 1 && mn <= 5) || !price) return ctx.reply('❌ Use: *apmute @user 1-5*\n' + [1, 2, 3, 4, 5].map(i => '• ' + i + ' min — ' + money(S.cfg.mute[i])).join('\n'));
  const tid = K.pid(target); if (tid === S.id) return ctx.reply('❌ Não podes mutar-te a ti mesmo.'); const config = require('../config');
  if (config.isOwner(target) || config.isOwner(tid)) return ctx.reply('🛡️ O proprietário está protegido.');
  let meta; try { meta = await ctx.sock.groupMetadata(ctx.jid); } catch (_) { return ctx.reply('❌ Não consegui ler os dados do grupo.'); }
  const dg = (x) => String(x || '').split('@')[0].split(':')[0].replace(/\D/g, ''); const parts = meta.participants || [];
  const find = (id) => parts.find(p => [p.id, p.phoneNumber, p.lid, p.jid].some(v => v && dg(v) === id));
  const me = ctx.sock.user || {}; const bot = parts.find(p => [dg(me.id), dg(me.lid)].filter(Boolean).some(v => [p.id, p.phoneNumber, p.lid].some(w => w && dg(w) === v)));
  if (!bot || !bot.admin) return ctx.reply('❌ Preciso de ser *administrador* do grupo para mutar.');
  const tp = find(tid); if (!tp) return ctx.reply('❌ Esse utilizador não está no grupo.'); if (tp.admin) return ctx.reply('🛡️ Administradores estão protegidos contra mute.');
  if (bot && dg(bot.id) === tid) return ctx.reply('🤖 Não me podes mutar.');
  const db = require('../database'); const g = db.getGroup(ctx.jid); let list = []; try { list = JSON.parse(g.mutados || '[]'); } catch (_) {}
  if (list.some(x => dg(x) === tid)) return ctx.reply('⚠️ Esse utilizador já está mutado.');
  if (embargoLeft(S)) return ctx.reply('🚫 Estás embargado por mais ' + K.dur(embargoLeft(S)) + '.');
  if (!K.debit(S.scope, S.id, price, 'mute', 'Mute ' + mn + 'min')) return ctx.reply('❌ Preço: ' + money(price) + '. Carteira: ' + money(K.player(S.scope, S.id).wallet));
  list.push(tp.id || target); db.updateGroup(ctx.jid, { mutados: JSON.stringify(list) });
  K.D().prepare("INSERT INTO ap_mutes (chat,target,until,status,paid) VALUES (?,?,?, 'open', ?)").run(ctx.jid, tid, K.now() + mn * 60000, price);
  return ctx.reply('🔇 ' + tag(tid) + ' foi mutado por *' + mn + ' min* (pagou ' + tag(S.id) + ': ' + money(price) + ').\n🔓 Desmute: ' + money(price * 2) + ' (2× o preço) — *apdesmute*.', { mentions: [ctx.sender, target] });
}
async function sweepMutes() {
  const db = require('../database'); const dg = (x) => String(x || '').split('@')[0].split(':')[0].replace(/\D/g, '');
  for (const m of K.D().prepare("SELECT * FROM ap_mutes WHERE status='open' AND until<=?").all(K.now())) {
    if (!K.D().prepare("UPDATE ap_mutes SET status='done' WHERE id=? AND status='open'").run(m.id).changes) continue;
    try { const g = db.getGroup(m.chat); let l = JSON.parse(g.mutados || '[]'); l = l.filter(x => dg(x) !== m.target); db.updateGroup(m.chat, { mutados: JSON.stringify(l) }); K.notice(m.chat, '🔊 O mute de @' + m.target + ' terminou.', [m.target]); } catch (e) { console.error('[MODOAP mute]', e.message); }
  }
}
K.onTick(sweepMutes);

// ───────── comércio ─────────
const blockEmb = (ctx, S) => { const e = embargoLeft(S); if (e) { ctx.reply('🚫 Estás embargado por mais ' + K.dur(e) + '.'); return true; } return false; };
async function loja(ctx, S) { return ctx.reply('🛒 *LOJA AP*\n' + Object.keys(ITEMS).map(k => '• *' + k + '* — ' + ITEMS[k].n + ' — ' + money(ITEMS[k].price) + '\n   ' + ITEMS[k].d).join('\n') + '\n\nComprar: *apcomprar nome [qtd]*'); }
async function comprar(ctx, S, a) {
  const k = findKey(ITEMS, a[0]); if (!k) return ctx.reply('❌ Item não existe. Veja *aploja*.'); if (blockEmb(ctx, S)) return; const n = Math.max(1, Math.min(99, parseInt(a[1], 10) || 1)); const tot = ITEMS[k].price * n;
  return K.tx(() => { if (!K.debit(S.scope, S.id, tot, 'compra', k + 'x' + n)) return ctx.reply('❌ Custa ' + money(tot) + '. Carteira: ' + money(K.player(S.scope, S.id).wallet)); addItem(S, S.id, k, n); return ctx.reply('✅ Compraste ' + n + 'x *' + ITEMS[k].n + '* por ' + money(tot) + '.'); });
}
async function vender(ctx, S, a) {
  const k = findKey(ITEMS, a[0]); if (!k) return ctx.reply('❌ Use: *apvender nome [qtd]*'); const n = Math.max(1, parseInt(a[1], 10) || 1);
  return K.tx(() => { const r = K.D().prepare('UPDATE ap_inv SET qty=qty-? WHERE scope=? AND jid=? AND item=? AND qty>=?').run(n, S.scope, S.id, k, n); if (!r.changes) return ctx.reply('❌ Não tens ' + n + 'x ' + ITEMS[k].n); const v = Math.floor(ITEMS[k].price * 0.6) * n; K.credit(S.scope, S.id, v, 'venda', k + 'x' + n); return ctx.reply('💰 Vendeste ' + n + 'x ' + ITEMS[k].n + ' por ' + money(v) + '.'); });
}
async function inventario(ctx, S) { const r = K.D().prepare('SELECT item, qty FROM ap_inv WHERE scope=? AND jid=? AND qty>0').all(S.scope, S.id); return ctx.reply('🎒 *INVENTÁRIO*' + (r.length ? r.map(i => '\n• ' + (ITEMS[i.item] ? ITEMS[i.item].n : i.item) + ' x' + i.qty).join('') : '\nVazio. Veja *aploja*.')); }
async function presente(ctx, S, a, target) {
  const k = findKey(ITEMS, num(a)[0]); if (!target || !k) return ctx.reply('❌ Use: *appresente @user item [qtd]*'); const tid = K.pid(target); if (tid === S.id) return ctx.reply('❌ Escolhe outra pessoa.'); const n = Math.max(1, parseInt(num(a)[1], 10) || 1);
  return K.tx(() => { const r = K.D().prepare('UPDATE ap_inv SET qty=qty-? WHERE scope=? AND jid=? AND item=? AND qty>=?').run(n, S.scope, S.id, k, n); if (!r.changes) return ctx.reply('❌ Não tens esse item.'); K.player(S.scope, tid); addItem(S, tid, k, n); return ctx.reply('🎁 ' + tag(S.id) + ' ofereceu ' + n + 'x ' + ITEMS[k].n + ' a ' + tag(tid) + '!', { mentions: [ctx.sender, target] }); });
}
async function mercado(ctx, S, a) {
  const sub = K.strip(a[0]); const d = K.D();
  if (sub === 'vender') { const k = findKey(ITEMS, a[1]); const n = Math.max(1, parseInt(a[2], 10) || 0); const pr = K.parseAmt(a[3], 0); if (!k || !n || !(pr > 0)) return ctx.reply('❌ Use: *apmercado vender item qtd preço*');
    return K.tx(() => { if (!d.prepare('UPDATE ap_inv SET qty=qty-? WHERE scope=? AND jid=? AND item=? AND qty>=?').run(n, S.scope, S.id, k, n).changes) return ctx.reply('❌ Não tens esse item.'); const id = d.prepare("INSERT INTO ap_market (scope,seller,item,qty,price,created,status) VALUES (?,?,?,?,?,?, 'open')").run(S.scope, S.id, k, n, pr, K.now()).lastInsertRowid; return ctx.reply('📦 Anúncio *#' + id + '*: ' + n + 'x ' + ITEMS[k].n + ' por ' + money(pr) + '.'); }); }
  if (sub === 'comprar') { if (blockEmb(ctx, S)) return; const id = parseInt(a[1], 10); const L = d.prepare("SELECT * FROM ap_market WHERE id=? AND scope=? AND status='open'").get(id, S.scope); if (!L) return ctx.reply('❌ Anúncio não encontrado.'); if (L.seller === S.id) return ctx.reply('❌ É o teu anúncio (use *apmercado cancelar ' + id + '*).');
    let res; try { res = K.tx(() => { if (!d.prepare("UPDATE ap_market SET status='sold' WHERE id=? AND status='open'").run(id).changes) return 'Já vendido.'; if (!K.debit(S.scope, S.id, L.price, 'mercado', '#' + id)) throw new Error('nosaldo'); const net = L.price - Math.floor(L.price * S.cfg.market.tax / 100); K.credit(S.scope, L.seller, net, 'mercado', '#' + id); addItem(S, S.id, L.item, L.qty); return null; }); } catch (e) { return ctx.reply('❌ Custa ' + money(L.price) + '. Carteira: ' + money(K.player(S.scope, S.id).wallet)); }
    return ctx.reply(res ? '❌ ' + res : '✅ Compraste ' + L.qty + 'x ' + ITEMS[L.item].n + ' por ' + money(L.price) + '.'); }
  if (sub === 'cancelar') { const id = parseInt(a[1], 10); return K.tx(() => { const L = d.prepare("SELECT * FROM ap_market WHERE id=? AND scope=? AND seller=? AND status='open'").get(id, S.scope, S.id); if (!L) return ctx.reply('❌ Anúncio não é teu/aberto.'); d.prepare("UPDATE ap_market SET status='cancel' WHERE id=?").run(id); addItem(S, S.id, L.item, L.qty); return ctx.reply('↩️ Anúncio cancelado.'); }); }
  const ls = d.prepare("SELECT * FROM ap_market WHERE scope=? AND status='open' ORDER BY id DESC LIMIT 12").all(S.scope);
  return ctx.reply('🏪 *MERCADO*' + (ls.length ? ls.map(l => '\n#' + l.id + ' ' + l.qty + 'x ' + (ITEMS[l.item] ? ITEMS[l.item].n : l.item) + ' — ' + money(l.price)).join('') : '\nSem anúncios.') + '\n\n*apmercado vender item qtd preço* | *comprar id* | *cancelar id*\nTaxa de venda: ' + S.cfg.market.tax + '%');
}
async function investir(ctx, S, a) {
  const c = S.cfg.invest; const d = K.D(); const t = K.now(); let msgs = [];
  for (const iv of d.prepare("SELECT * FROM ap_invest WHERE scope=? AND jid=? AND status='open' AND matures<=?").all(S.scope, S.id, t)) {
    if (!d.prepare("UPDATE ap_invest SET status='done', result=? WHERE id=? AND status='open'").run(0, iv.id).changes) continue;
    const pct = c.lo + K.rf() * (c.hi - c.lo); const ret = Math.max(0, Math.floor(iv.amount * (1 + pct / 100))); d.prepare('UPDATE ap_invest SET result=? WHERE id=?').run(ret, iv.id); K.credit(S.scope, S.id, ret, 'investimento', '#' + iv.id);
    msgs.push((ret >= iv.amount ? '🟢' : '🔴') + ' Investimento #' + iv.id + ': ' + money(iv.amount) + ' → ' + money(ret) + ' (' + pct.toFixed(1) + '%)');
  }
  const v = K.parseAmt(a[0], K.player(S.scope, S.id).wallet);
  if (!(v > 0)) { const open = d.prepare("SELECT * FROM ap_invest WHERE scope=? AND jid=? AND status='open'").all(S.scope, S.id); return ctx.reply('📈 *INVESTIMENTOS*\n' + (msgs.join('\n') || '') + (open.length ? '\n' + open.map(o => '⏳ #' + o.id + ' ' + money(o.amount) + ' — ' + K.dur(o.matures - t)).join('\n') : '\nNenhum em curso.') + '\n\nInvestir: *apinvestir valor* (mín. ' + money(c.min) + ', ' + c.lockMin + ' min, risco de ' + c.lo + '% a +' + c.hi + '%)'); }
  if (blockEmb(ctx, S)) return; if (v < c.min) return ctx.reply('❌ Mínimo: ' + money(c.min));
  if (d.prepare("SELECT COUNT(*) n FROM ap_invest WHERE scope=? AND jid=? AND status='open'").get(S.scope, S.id).n >= c.maxOpen) return ctx.reply('❌ Máximo de ' + c.maxOpen + ' investimentos em curso.');
  return K.tx(() => { if (!K.debit(S.scope, S.id, v, 'investimento', 'Investiu')) return ctx.reply('❌ Saldo insuficiente.'); const id = d.prepare("INSERT INTO ap_invest (scope,jid,amount,created,matures,status) VALUES (?,?,?,?,?, 'open')").run(S.scope, S.id, v, t, t + c.lockMin * 60000).lastInsertRowid; return ctx.reply((msgs.join('\n') + '\n').trimStart() + '📈 Investiste ' + money(v) + ' (#' + id + '). Resultado em ' + c.lockMin + ' min — use *apinvestir* para receber.'); });
}
const incomeOf = (S, id) => { const bs = K.D().prepare('SELECT biz FROM ap_biz WHERE scope=? AND jid=?').all(S.scope, id); const co = K.player(S.scope, id).company; return Math.floor(bs.reduce((s, b) => s + (BIZ[b.biz] ? BIZ[b.biz].inc : 0), 0) * (co ? 1.15 : 1)); };
async function negocio(ctx, S, a) {
  const sub = K.strip(a[0]); const d = K.D();
  if (sub === 'comprar') { const k = findKey(BIZ, a[1]); if (!k) return ctx.reply('❌ Use: *apnegocio comprar nome*'); if (blockEmb(ctx, S)) return; if (d.prepare('SELECT 1 FROM ap_biz WHERE scope=? AND jid=? AND biz=?').get(S.scope, S.id, k)) return ctx.reply('⚠️ Já tens esse negócio.');
    return K.tx(() => { if (!K.debit(S.scope, S.id, BIZ[k].price, 'negocio', k)) return ctx.reply('❌ Custa ' + money(BIZ[k].price)); d.prepare('INSERT INTO ap_biz VALUES (?,?,?,?)').run(S.scope, S.id, k, K.now()); return ctx.reply('🏢 Compraste *' + BIZ[k].n + '*! Rende ' + money(BIZ[k].inc) + '/hora. Colete com *apnegocio coletar*.'); }); }
  if (sub === 'coletar') { let tot = 0; K.tx(() => { for (const b of d.prepare('SELECT * FROM ap_biz WHERE scope=? AND jid=?').all(S.scope, S.id)) { const h = Math.min(6, (K.now() - b.last_collect) / 3600000); const g = Math.floor(BIZ[b.biz].inc * h * (K.player(S.scope, S.id).company ? 1.15 : 1)); if (!d.prepare('UPDATE ap_biz SET last_collect=? WHERE scope=? AND jid=? AND biz=? AND last_collect=?').run(K.now(), S.scope, S.id, b.biz, b.last_collect).changes) continue; tot += g; } if (tot > 0) K.credit(S.scope, S.id, tot, 'negocio', 'Rendimentos'); });
    return ctx.reply(tot > 0 ? '💰 Recolheste ' + money(tot) + ' dos teus negócios!' : '⏳ Nada para coletar (acumula até 6h).'); }
  const own = d.prepare('SELECT biz FROM ap_biz WHERE scope=? AND jid=?').all(S.scope, S.id).map(x => x.biz);
  return ctx.reply('🏢 *NEGÓCIOS*\n' + Object.keys(BIZ).map(k => (own.includes(k) ? '✅' : '▫️') + ' *' + k + '* — ' + money(BIZ[k].price) + ' → ' + money(BIZ[k].inc) + '/h').join('\n') + '\n\nRendimento atual: ' + money(incomeOf(S, S.id)) + '/h\n*apnegocio comprar nome* | *apnegocio coletar*');
}
async function empresa(ctx, S, a) {
  const sub = K.strip(a[0]); const p = K.player(S.scope, S.id);
  if (sub === 'criar') { if (p.company) return ctx.reply('⚠️ Já tens a empresa *' + p.company + '*.'); const nm = a.slice(1).join(' ').replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 20).trim(); if (!nm) return ctx.reply('❌ Use: *apempresa criar Nome*');
    if (!K.debit(S.scope, S.id, 1000000, 'empresa', nm)) return ctx.reply('❌ Criar empresa custa ' + money(1000000)); K.D().prepare('UPDATE ap_players SET company=? WHERE scope=? AND jid=?').run(nm, S.scope, S.id); return ctx.reply('🏛️ Empresa *' + nm + '* criada! Bónus de +15% nos rendimentos dos negócios.'); }
  if (!p.company) return ctx.reply('🏛️ Não tens empresa. Cria uma: *apempresa criar Nome* (' + money(1000000) + ', +15% nos negócios).');
  const n = K.D().prepare('SELECT COUNT(*) n FROM ap_biz WHERE scope=? AND jid=?').get(S.scope, S.id).n; return ctx.reply('🏛️ *' + p.company + '*\nNegócios: ' + n + '\nRendimento: ' + money(incomeOf(S, S.id)) + '/h (com bónus)\nPatrimónio: ' + money(K.worth(S.scope, S.id)));
}
module.exports = { ITEMS, BIZ, crime, fugir, liberdade, prisao, procurado, troll, mute, loja, comprar, vender, inventario, presente, mercado, investir, negocio, empresa, embargoLeft, blockEmb, jailLeft };

// MODOAP_V5
