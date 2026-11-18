'use strict';
/**
 * MODOAP — Modo de Economia e Atividades Virtuais (dinheiro fictício "$").
 * Módulo independente: só funciona em grupos com *modoap on*. Não altera nenhum outro comando.
 */
const K = require('../../modoap/core');
const Games = require('../../modoap/games');
const W = require('../../modoap/world');
const Panel = require('../../modoap/panel');
const { money } = K;
const G = Games.G;

const lastWarn = new Map();
const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24);
const tag = (id) => '@' + id;

function wrap(fn, o) {
  o = o || {};
  return async (ctx) => {
    try { K.setSock(ctx.sock); K.start(); } catch (_) {}
    if (!ctx.isGroup) return ctx.reply('❌ O MODOAP só funciona em grupos.');
    if (!o.bypass && !K.isOn(ctx.jid)) {
      const t = Date.now(); if (t - (lastWarn.get(ctx.jid) || 0) > 60000) { lastWarn.set(ctx.jid, t); return ctx.reply('🔒 O *MODOAP* está desligado neste grupo. Um admin pode ativar com *modoap on*.'); }
      return;
    }
    if (!o.bypass && !K.economyOn() && !ctx.isOwner()) return ctx.reply('🔒 A economia está temporariamente desligada pelo dono.');
    const scope = K.scopeOf(ctx.jid); const S = { scope, id: K.pid(ctx.sender), name: cleanName(ctx.msg && ctx.msg.pushName), cfg: K.cfg(scope) };
    K.player(scope, S.id, S.name); ctx.__cmd = ctx.commandName || ctx.parsed.command;
    let target = null; try { target = ctx.getMentionedOrQuoted(); } catch (_) {}
    return fn(ctx, S, ctx.args || [], target);
  };
}
const defs = [];
function def(name, fn, o) { defs.push(Object.assign({ name, category: 'modoap', description: 'MODOAP', handler: wrap(fn, o) }, (o && o.reg) || {})); }
const own = { reg: { ownerOnly: true } };
const needTarget = (ctx, t) => { if (!t) { ctx.reply('❌ Marca alguém (@user) ou responde à mensagem.'); return null; } return t; };
const amtArg = (a) => a.filter(x => !String(x).startsWith('@'));

// ───────── ligar/desligar + menu ─────────
defs.push({ name: 'modoap', category: 'modoap', adminOnly: true, groupOnly: true, description: 'Liga/desliga o MODOAP no grupo', usage: 'modoap on|off',
  handler: async (ctx) => {
    const a = K.strip((ctx.args || [])[0]);
    if (a === 'on') { K.setOn(ctx.jid, true); try { K.setSock(ctx.sock); K.start(); } catch (_) {} return ctx.reply('✅ *MODOAP ATIVADO* neste grupo!\n💵 Dinheiro 100% fictício.\nDigite *menuap* para ver os comandos.'); }
    if (a === 'off') { K.setOn(ctx.jid, false); return ctx.reply('⛔ *MODOAP DESATIVADO* neste grupo. Os dados ficam guardados.'); }
    return ctx.reply('🎮 MODOAP está *' + (K.isOn(ctx.jid) ? 'ATIVO ✅' : 'DESLIGADO ⛔') + '*\nUse: *modoap on* ou *modoap off*'); } });
def('menuap', async (ctx, S) => {
  if (!K.isOn(ctx.jid)) return ctx.reply('🔒 MODOAP desligado. Admin: *modoap on*');
  return ctx.reply(`╭━━〔 🎮 *MODOAP* · TEMPEST BOT 〕━━╮
💵 Economia virtual (dinheiro fictício)

💰 *CARTEIRA*
apsaldo · apbanco · apcofre · apdepositar · aplevantar
appagar @u v · apdiario · apmensal · aptrabalhar
apperfil · appatrimonio · apranking · aphistorico

🏦 *DÍVIDAS*
apdivida @u v · appagardivida · apdividas
apemprestimo · apcredito

🎲 *JOGOS RÁPIDOS*
apapostar · apcaraoucoroa v cara|coroa · apdados
aproleta v cor · apparimpar v · apcorrida v 1-4 · apduelo @u v

🕹️ *AP GAMES (com imagem)*
apaviator v → apcashout · aprocket v → apcashout
apdice v 1-6 · applinko v
apmines v → apmines escolher N / retirar
aptower v → aptower escolher 1-3 / retirar

💼 *TRABALHOS* (pagam +50% se estiveres no vermelho)
aptrabalhar · aphoraextra · apbico · apfreela
apentrega · apmendigar · apvadiar

🖥️ *PAINÉIS HTML* (apXXXX valor)
apaviator2 · apmines2 · applinko2 · apdice2 · apmoeda2
apslots2 · aproleta2 · aptower2 · aphilo2 · apblackjack2
resgatarap CÓDIGO · appaineis

🚨 *CRIMES*
apcrime · aproubar @u · apassaltar · apcontrabando
apfugir · apprisao · apliberdade · approcurado

😈 *PARTIDAS*
aptroll @u · apmultar @u v · apgolpe @u
aptribunal @u · apembargo @u · apdesafio @u
apmute @u 1-5 (admin protegido)

🛒 *COMÉRCIO*
aploja · apcomprar · apvender · apinventario
apmercado · appresente @u item · apinvestir v
apnegocio · apempresa

👑 *DONO*
apaddmoney · apremovemoney · apsetmoney · apreset
apeconomia on/off · apmodoeconomia global/grupo
apsetdiario · apsettrabalho · apsetmute
apsetprobabilidade · apsetmultiplicador
apcooldowns · apsetcooldown · apresetcooldown
apcooldownstatus · apconfig · apstats
╰━━━━━━━━━━━━━━━━━━━━╯`); }, { bypass: true });

// ───────── carteira ─────────
const walletTxt = (S, p) => { const od = K.debtOwed(S.scope, S.id); const ov = K.overState(S.scope, S.id); return '💵 Carteira: *' + money(p.wallet) + '*\n🏦 Banco: *' + money(p.bank) + '*' + (od ? '\n⚠️ Saldo em dívida: *-' + money(od) + '* (líquido ' + money(p.wallet + p.bank - od) + ')' : '') + (p.wallet < 0 ? '\n📉 Estás no vermelho. Crédito de aposta disponível: ' + money(ov.room) : '') + (ov.blocked ? '\n🚫 Apostas bloqueadas — faltam ' + money(ov.need) + ' (trabalha: aptrabalhar, aphoraextra, apbico...)' : ''); };
def('apsaldo', (ctx, S) => ctx.reply('💰 *SALDO* — ' + (S.name || '+' + S.id) + '\n' + walletTxt(S, K.player(S.scope, S.id))));
def('apbanco', (ctx, S) => { const p = K.player(S.scope, S.id); return ctx.reply('🏦 *BANCO*\nGuardado: *' + money(p.bank) + '*\nCarteira: ' + money(p.wallet) + '\n_Dinheiro no banco não pode ser roubado. apdepositar / aplevantar_'); });
def('apcofre', (ctx, S) => { const p = K.player(S.scope, S.id); return ctx.reply('🔐 *COFRE* (protegido de roubos, golpes e trollagens)\nTotal: *' + money(p.bank) + '*\n_Nota: cobranças de dívidas vencidas podem usar o cofre._'); });
def('apdepositar', (ctx, S, a) => {
  if (W.blockEmb(ctx, S)) return; const p = K.player(S.scope, S.id); const v = K.parseAmt(a[0], p.wallet); if (!(v > 0)) return ctx.reply('❌ Use: *apdepositar 5000* (ou *tudo*)');
  K.tx(() => { if (!K.D().prepare('UPDATE ap_players SET wallet=wallet-?, bank=bank+? WHERE scope=? AND jid=? AND wallet>=?').run(v, v, S.scope, S.id, v).changes) return ctx.reply('❌ Saldo insuficiente.'); K.hist(S.scope, S.id, 'deposito', 0, 'Depositou ' + v); return ctx.reply('✅ Depositaste ' + money(v) + ' no banco.'); }); });
def('aplevantar', (ctx, S, a) => {
  const p = K.player(S.scope, S.id); const v = K.parseAmt(a[0], p.bank); if (!(v > 0)) return ctx.reply('❌ Use: *aplevantar 5000* (ou *tudo*)');
  K.tx(() => { if (!K.D().prepare('UPDATE ap_players SET bank=bank-?, wallet=wallet+? WHERE scope=? AND jid=? AND bank>=?').run(v, v, S.scope, S.id, v).changes) return ctx.reply('❌ Saldo insuficiente no banco.'); K.hist(S.scope, S.id, 'levantamento', 0, 'Levantou ' + v); return ctx.reply('✅ Levantaste ' + money(v) + ' do banco.'); }); });
def('appagar', (ctx, S, a, t) => {
  if (!needTarget(ctx, t)) return; if (W.blockEmb(ctx, S)) return; const tid = K.pid(t); if (tid === S.id) return ctx.reply('❌ Não podes pagar a ti mesmo.');
  const v = K.parseAmt(amtArg(a)[0], K.player(S.scope, S.id).wallet); if (!(v > 0)) return ctx.reply('❌ Use: *appagar @user 5000*');
  if (W.embargoLeft({ scope: S.scope, id: tid })) return ctx.reply('🚫 O destinatário está embargado.');
  K.player(S.scope, tid); if (!K.transfer(S.scope, S.id, tid, v, 'pagamento', 'Pagamento')) return ctx.reply('❌ Saldo insuficiente.');
  return ctx.reply('💸 ' + tag(S.id) + ' pagou *' + money(v) + '* a ' + tag(tid), { mentions: [ctx.sender, t] }); });
def('apdiario', (ctx, S) => {
  const p = K.player(S.scope, S.id); const left = p.last_daily + 86400000 - K.now(); if (left > 0) return ctx.reply('⏳ Já recebeste o diário. Volta em ' + K.dur(left) + '.');
  if (!K.D().prepare('UPDATE ap_players SET last_daily=? WHERE scope=? AND jid=? AND last_daily=?').run(K.now(), S.scope, S.id, p.last_daily).changes) return;
  K.credit(S.scope, S.id, S.cfg.daily, 'diario', 'Recompensa diária'); return ctx.reply('🎁 *DIÁRIO!* +' + money(S.cfg.daily) + '\n💼 Carteira: ' + money(K.player(S.scope, S.id).wallet)); });
def('apmensal', (ctx, S) => {
  const p = K.player(S.scope, S.id); const left = p.last_monthly + 30 * 86400000 - K.now(); if (left > 0) return ctx.reply('⏳ Já recebeste o mensal. Volta em ' + K.dur(left) + '.');
  if (!K.D().prepare('UPDATE ap_players SET last_monthly=? WHERE scope=? AND jid=? AND last_monthly=?').run(K.now(), S.scope, S.id, p.last_monthly).changes) return;
  K.credit(S.scope, S.id, S.cfg.monthly, 'mensal', 'Recompensa mensal'); return ctx.reply('🎉 *MENSAL!* +' + money(S.cfg.monthly)); });
const JOBS = ['Programador', 'Pedreiro', 'Motorista', 'Chef', 'Mecânico', 'Segurança', 'Designer', 'Pescador', 'Barista', 'Piloto'];
const JT = { aptrabalhar: ['👷 Trabalhaste como *%J%* e recebeste', null], aphoraextra: ['⏰ Fizeste *HORA EXTRA* e recebeste', '😮‍💨 Ficaste exausto e o chefe não pagou a hora extra!'], apbico: ['🔧 Fizeste um *bico* e ganhaste', '🙄 O cliente não pagou o bico.'], apfreela: ['💻 Entregaste um *freela* e recebeste', '📭 O cliente sumiu sem pagar o freela.'], apentrega: ['🛵 Fizeste *entregas* e ganhaste', '🌧️ Choveu e as entregas foram canceladas.'], apmendigar: ['🙏 Pediste ajuda e receberam-te com', null] };
function jobTail(S) { const o = K.overState(S.scope, S.id); const w = o.p.wallet; return '\n💼 Carteira: ' + money(w) + (w < 0 ? '\n📉 Dívida: ' + money(-w) : '') + (o.blocked ? '\n🚫 Faltam ' + money(o.need) + ' para voltar a apostar' : (w < 0 ? '\n✅ Já podes apostar (limite ' + money(o.room) + ')' : '')); }
function jobCmd(key) {
  def(key, (ctx, S) => {
    const j = W.jailLeft(S); if (j) return ctx.reply('🔒 Preso! Faltam ' + K.dur(j) + '.'); const s = K.cdTake(S.scope, S.id, key); if (s) return ctx.reply(K.cdMsg(s));
    const t = JT[key]; const jc = S.cfg.jobs[key]; const lo = key === 'aptrabalhar' ? S.cfg.work[0] : jc.min, hi = key === 'aptrabalhar' ? S.cfg.work[1] : jc.max; const o = K.overState(S.scope, S.id); const boost = o.p.wallet < 0 ? S.cfg.jobBoost : 1;
    if (jc && K.chance(jc.fail)) return ctx.reply(t[1] + jobTail(S));
    const g = Math.floor(K.rnd(lo, hi) * boost); K.credit(S.scope, S.id, g, 'trabalho', key);
    return ctx.reply(t[0].replace('%J%', JOBS[K.rnd(0, JOBS.length - 1)]) + ' *' + money(g) + '*!' + (boost > 1 ? ' (🆙 +50% bónus de recuperação)' : '') + jobTail(S)); });
}
['aptrabalhar', 'aphoraextra', 'apbico', 'apfreela', 'apentrega', 'apmendigar'].forEach(jobCmd);
def('apvadiar', (ctx, S) => {
  const s = K.cdTake(S.scope, S.id, 'apvadiar'); if (s) return ctx.reply(K.cdMsg(s)); const r = K.rnd(1, 100); const jc = S.cfg.jobs.apvadiar;
  if (r <= 45) { const g = K.rnd(jc.min, jc.max); K.credit(S.scope, S.id, g, 'vadiar', 'Achou dinheiro'); return ctx.reply('😎 Foste vadiar e achaste *' + money(g) + '* no chão!' + jobTail(S)); }
  if (r <= 75) return ctx.reply('😴 Vadiaste o dia todo no sofá. Nada aconteceu.' + jobTail(S));
  const f = K.take(S.scope, S.id, K.rnd(1000, 3000), 'multa', 'Vadiagem'); return ctx.reply('👮 A polícia multou-te por vadiagem: -' + money(f) + jobTail(S)); });
def('apperfil', (ctx, S, a, t) => {
  const id = t ? K.pid(t) : S.id; const p = K.player(S.scope, id); const st = K.D().prepare('SELECT COALESCE(SUM(plays),0) pl, COALESCE(SUM(wins),0) w, COALESCE(SUM(losses),0) l, COALESCE(SUM(net),0) n FROM ap_stats WHERE scope=? AND jid=?').get(S.scope, id);
  const rank = K.D().prepare('SELECT COUNT(*)+1 r FROM ap_players WHERE scope=? AND wallet+bank > ?').get(S.scope, p.wallet + p.bank).r;
  return ctx.reply('👤 *PERFIL AP* — ' + K.nameOf(p) + '\n🏆 Ranking: #' + rank + '\n💎 Património: ' + money(K.worth(S.scope, id)) + '\n💵 ' + money(p.wallet) + ' | 🏦 ' + money(p.bank) + (p.company ? '\n🏛️ ' + p.company : '') + '\n🎮 Partidas: ' + st.pl + ' (✅' + st.w + ' ❌' + st.l + ') | Lucro: ' + money(st.n) + '\n🚔 Prisões: ' + p.jail_count + ' | ⭐ Procurado: ' + p.wanted, t ? { mentions: [t] } : {}); });
def('appatrimonio', (ctx, S) => { const p = K.player(S.scope, S.id); const od = K.debtOwed(S.scope, S.id); return ctx.reply('💎 *PATRIMÓNIO*\n💵 Carteira: ' + money(p.wallet) + '\n🏦 Banco: ' + money(p.bank) + '\n🎒 Itens/negócios/investimentos: ' + money(K.worth(S.scope, S.id) - p.wallet - p.bank + od) + (od ? '\n⚠️ Dívidas: -' + money(od) : '') + '\n━━━━━━\n*Total: ' + money(K.worth(S.scope, S.id)) + '*'); });
def('apranking', (ctx, S, a) => {
  const g = K.strip(a[0]); const alias = { aviator: 'aviator', rocket: 'rocket', dice: 'dice', mines: 'mines', plinko: 'plinko', tower: 'tower', apostar: 'apostar', dados: 'dados', roleta: 'roleta', corrida: 'corrida', duelo: 'duelo', parimpar: 'parimpar', caraoucoroa: 'caraoucoroa' };
  if (g && alias[g]) { const r = K.D().prepare('SELECT s.jid, p.name, s.net, s.wins, s.plays FROM ap_stats s LEFT JOIN ap_players p ON p.scope=s.scope AND p.jid=s.jid WHERE s.scope=? AND s.game=? ORDER BY s.net DESC LIMIT 10').all(S.scope, alias[g]);
    return ctx.reply('🏅 *RANKING ' + g.toUpperCase() + '* (lucro)\n' + (r.length ? r.map((x, i) => (i + 1) + '. ' + K.nameOf(x) + ' — ' + money(x.net) + ' (' + x.wins + '/' + x.plays + ')').join('\n') : 'Ainda sem jogadores.')); }
  if (g === 'jogos') { const r = K.D().prepare('SELECT s.jid, p.name, SUM(s.net) n FROM ap_stats s LEFT JOIN ap_players p ON p.scope=s.scope AND p.jid=s.jid WHERE s.scope=? GROUP BY s.jid ORDER BY n DESC LIMIT 10').all(S.scope); return ctx.reply('🎮 *RANKING JOGOS* (lucro total)\n' + (r.length ? r.map((x, i) => (i + 1) + '. ' + K.nameOf(x) + ' — ' + money(x.n)).join('\n') : 'Sem dados.')); }
  const r = K.D().prepare('SELECT jid, name, wallet+bank t FROM ap_players WHERE scope=? ORDER BY t DESC LIMIT 10').all(S.scope); const m = ['🥇', '🥈', '🥉'];
  return ctx.reply('🏆 *RANKING — MAIS RICOS*\n' + r.map((x, i) => (m[i] || (i + 1) + '.') + ' ' + K.nameOf(x) + ' — ' + money(x.t)).join('\n') + '\n_apranking jogos | apranking aviator_'); });
def('aphistorico', (ctx, S) => { const r = K.D().prepare('SELECT * FROM ap_hist WHERE scope=? AND jid=? ORDER BY id DESC LIMIT 10').all(S.scope, S.id);
  return ctx.reply('📜 *HISTÓRICO*\n' + (r.length ? r.map(x => (x.amount > 0 ? '🟢 +' : x.amount < 0 ? '🔴 ' : '⚪ ') + (x.amount ? money(x.amount) : '') + ' ' + x.kind + (x.note ? ' · ' + x.note : '')).join('\n') : 'Sem transações.')); });

// ───────── dívidas ─────────
def('apdivida', async (ctx, S, a, t) => {
  if (!needTarget(ctx, t)) return; const v = K.parseAmt(amtArg(a)[0], K.player(S.scope, S.id).wallet); if (!(v > 0)) return ctx.reply('❌ Use: *apdivida @user 100000*'); if (W.blockEmb(ctx, S)) return;
  const tid = K.pid(t); K.player(S.scope, tid); const r = K.createDebt(S.scope, ctx.jid, S.id, tid, v); if (r.err) return ctx.reply('❌ ' + r.err); const c = S.cfg.debt;
  return ctx.reply('🏦 *DÍVIDA CRIADA* — ID *' + r.id + '*\nCredor: ' + tag(S.id) + ' → Devedor: ' + tag(tid) + '\n💰 ' + money(v) + ' entregues.\n⏱️ Até ' + c.halfMin + ' min devolve ' + money(v) + '; depois ' + money(v * 2) + '. Aos ' + c.dueMin + ' min há cobrança automática.\n_Devedor: use *appagardivida*_', { mentions: [ctx.sender, t] }); });
def('appagardivida', (ctx, S, a) => { const r = K.payDebt(S.scope, S.id, a[0]); if (r.err) return ctx.reply('❌ ' + r.err); return ctx.reply('✅ Dívida *' + r.debt.id + '* paga: ' + money(r.paid) + (r.double ? ' (valor dobrado — passaram 30 min)' : ' (valor original)'), { mentions: [] }); });
const dline = (d) => '• *' + d.id + '* ' + money(K.owedNow(d)) + ' · ' + (d.status === 'overdue' ? '⚠️ vencida' : '⏱️ ' + K.dur(Math.max(0, d.due_at - K.now())) + (K.now() < d.half_at ? ' (original até ' + K.dur(d.half_at - K.now()) + ')' : ' (valor dobrado)'));
def('apdividas', (ctx, S) => { const r = K.D().prepare("SELECT * FROM ap_debts WHERE scope=? AND debtor=? AND status IN ('active','overdue') ORDER BY due_at").all(S.scope, S.id); return ctx.reply('📋 *AS TUAS DÍVIDAS*\n' + (r.length ? r.map(dline).join('\n') : 'Sem dívidas ✅')); });
def('apemprestimo', (ctx, S) => { const r = K.D().prepare("SELECT * FROM ap_debts WHERE scope=? AND creditor=? AND status IN ('active','overdue') ORDER BY due_at").all(S.scope, S.id); return ctx.reply('💼 *EMPRÉSTIMOS QUE DESTE*\n' + (r.length ? r.map(d => '• *' + d.id + '* → @' + d.debtor + ' · ' + money(K.owedNow(d)) + ' · ' + (d.status === 'overdue' ? '⚠️ em cobrança' : K.dur(Math.max(0, d.due_at - K.now())))).join('\n') : 'Nenhum ativo.')); });
def('apcredito', (ctx, S) => { const q = (st) => K.D().prepare('SELECT COUNT(*) n FROM ap_debts WHERE scope=? AND debtor=? AND ' + st).get(S.scope, S.id).n;
  const ok = q("status='paid' AND owed=principal"), late = q("status='paid' AND owed>principal"), bad = q("status IN ('overdue','settled')"); const sc = Math.max(300, Math.min(900, 600 + ok * 25 - late * 40 - bad * 60 - K.D().prepare("SELECT COUNT(*) n FROM ap_debts WHERE scope=? AND debtor=? AND status='overdue'").get(S.scope, S.id).n * 40));
  return ctx.reply('📊 *CRÉDITO*\nPontuação: *' + sc + '*/900 ' + (sc >= 750 ? '🟢 Excelente' : sc >= 600 ? '🟡 Bom' : '🔴 Arriscado') + '\n✅ Pagas a tempo: ' + ok + '\n⏰ Pagas com atraso: ' + late + '\n❌ Cobradas: ' + bad + '\nSaldo em dívida: ' + money(K.debtOwed(S.scope, S.id))); });

// ───────── jogos ─────────
def('apapostar', (c, S, a) => G.apostar(c, S, a)); def('apcaraoucoroa', (c, S, a) => G.caraoucoroa(c, S, a)); def('apdados', (c, S, a) => G.dados(c, S, a));
def('aproleta', (c, S, a) => G.roleta(c, S, a)); def('apparimpar', (c, S, a) => G.parimpar(c, S, a)); def('apcorrida', (c, S, a) => G.corrida(c, S, a));
def('apduelo', (c, S, a, t) => G.duelo(c, S, a, t)); def('apaceitar', (c, S, a, t) => G.aceitar(c, S, a, t, true)); def('aprecusar', (c, S, a, t) => G.aceitar(c, S, a, t, false));
def('apaviator', (c, S, a) => G.aviator(c, S, a)); def('aprocket', (c, S, a) => G.rocket(c, S, a)); def('apcashout', (c, S) => G.cashout(c, S));
def('apdice', (c, S, a) => G.dice(c, S, a)); def('applinko', (c, S, a) => G.plinko(c, S, a)); def('apmines', (c, S, a) => G.mines(c, S, a)); def('aptower', (c, S, a) => G.tower(c, S, a));

// ───────── painéis HTML (10 jogos) ─────────
for (const cmd of Object.keys(Panel.LIST)) def(cmd, (c, S, a) => Panel.open(c, S, Panel.LIST[cmd], a));
def('resgatarap', (c, S, a) => Panel.redeem(c, S, a)); def('apresgatar', (c, S, a) => Panel.redeem(c, S, a));
def('appaineis', (c, S) => c.reply('🖥️ *PAINÉIS HTML* — o valor sai da carteira para o painel\n' + Object.keys(Panel.LIST).map(k => '• *' + k + ' [valor]*').join('\n') + '\n\n💸 No painel: SACAR → copiar código → *resgatarap CÓDIGO*'));

// ───────── crimes / partidas / mute ─────────
def('apcrime', (c, S) => W.crime(c, S, 'apcrime')); def('aproubar', (c, S, a, t) => W.crime(c, S, 'aproubar', t)); def('apassaltar', (c, S) => W.crime(c, S, 'apassaltar')); def('apcontrabando', (c, S) => W.crime(c, S, 'apcontrabando'));
def('apfugir', (c, S) => W.fugir(c, S)); def('apprisao', (c, S) => W.prisao(c, S)); def('apliberdade', (c, S) => W.liberdade(c, S)); def('approcurado', (c, S) => W.procurado(c, S));
for (const k of ['aptroll', 'apmultar', 'apgolpe', 'aptribunal', 'apembargo', 'apdesafio']) def(k, (c, S, a, t) => W.troll(c, S, k, t, a));
def('apmute', (c, S, a, t) => W.mute(c, S, a, t));

// ───────── comércio ─────────
def('aploja', (c, S) => W.loja(c, S)); def('apcomprar', (c, S, a) => W.comprar(c, S, a)); def('apvender', (c, S, a) => W.vender(c, S, a)); def('apinventario', (c, S) => W.inventario(c, S));
def('apmercado', (c, S, a) => W.mercado(c, S, a)); def('appresente', (c, S, a, t) => W.presente(c, S, a, t)); def('apinvestir', (c, S, a) => W.investir(c, S, a));
def('apnegocio', (c, S, a) => W.negocio(c, S, a)); def('apempresa', (c, S, a) => W.empresa(c, S, a));

// ───────── administração (dono) ─────────
const moneyAdmin = (kind) => (ctx, S, a, t) => {
  if (!needTarget(ctx, t)) return; const tid = K.pid(t); const p = K.player(S.scope, tid); const v = K.parseAmt(amtArg(a)[0], 0); if (!(v >= 0) || (kind !== 'set' && !(v > 0))) return ctx.reply('❌ Valor inválido.');
  if (kind === 'add') K.credit(S.scope, tid, v, 'admin', 'Dono adicionou', true); else if (kind === 'rem') K.take(S.scope, tid, v, 'admin', 'Dono removeu');
  else { K.D().prepare('UPDATE ap_players SET wallet=? WHERE scope=? AND jid=?').run(v, S.scope, tid); K.hist(S.scope, tid, 'admin', v - p.wallet, 'Dono definiu saldo'); }
  return ctx.reply('✅ ' + tag(tid) + ' agora tem ' + money(K.player(S.scope, tid).wallet), { mentions: [t] }); };
def('apaddmoney', moneyAdmin('add'), own); def('apremovemoney', moneyAdmin('rem'), own); def('apsetmoney', moneyAdmin('set'), own);
def('apreset', (ctx, S, a, t) => { if (!needTarget(ctx, t)) return; const id = K.pid(t); K.tx(() => { for (const tb of ['ap_players', 'ap_stats', 'ap_hist', 'ap_cd', 'ap_inv', 'ap_biz', 'ap_invest']) K.D().prepare('DELETE FROM ' + tb + ' WHERE scope=? AND jid=?').run(S.scope, id); K.D().prepare("UPDATE ap_games SET status='void' WHERE scope=? AND jid=? AND status='open'").run(S.scope, id); }); return ctx.reply('♻️ Dados MODOAP de ' + tag(id) + ' reiniciados.', { mentions: [t] }); }, own);
def('apeconomia', (ctx, S, a) => { const v = K.strip(a[0]); if (v === 'on' || v === 'off') { K.setEconomy(v === 'on'); return ctx.reply(v === 'on' ? '✅ Economia LIGADA.' : '⛔ Economia DESLIGADA (só o dono usa).'); } return ctx.reply('Economia: ' + (K.economyOn() ? 'ON' : 'OFF') + '\nUse: *apeconomia on|off*'); }, Object.assign({ bypass: true }, own));
def('apmodoeconomia', (ctx, S, a) => { const v = K.strip(a[0]); if (v === 'global' || v === 'grupo') { K.setMode(v); return ctx.reply('✅ Economia *' + (v === 'global' ? 'GLOBAL (saldo igual em todos os grupos)' : 'INDEPENDENTE (cada grupo tem a sua)') + '*.\n⚠️ Os saldos não se misturam: cada modo guarda os seus.'); } return ctx.reply('Modo atual: *' + K.getMode() + '*\nUse: *apmodoeconomia global|grupo*'); }, own);
def('apsetdiario', (ctx, S, a) => { const v = K.parseAmt(a[0], 0); if (!(v > 0)) return ctx.reply('❌ Use: *apsetdiario 25000*'); K.setCfg(S.scope, 'daily', v); return ctx.reply('✅ Diário = ' + money(v)); }, own);
def('apsettrabalho', (ctx, S, a) => { const v = K.parseAmt(a[0], 0); if (!(v > 0)) return ctx.reply('❌ Use: *apsettrabalho 15000*'); K.setCfg(S.scope, 'work', [Math.floor(v * 0.6), Math.floor(v * 1.4)]); return ctx.reply('✅ Salário médio ' + money(v) + ' (' + money(v * 0.6) + ' a ' + money(v * 1.4) + ')'); }, own);
def('apsetmute', (ctx, S, a) => { let m = 1, v; if (a.length >= 2) { m = parseInt(a[0], 10); v = K.parseAmt(a[1], 0); } else v = K.parseAmt(a[0], 0);
  if (!(v > 0) || !(m >= 1 && m <= 5)) return ctx.reply('❌ Use: *apsetmute valor* (preço de 1 min; os outros escalam) ou *apsetmute minutos valor*');
  if (a.length >= 2) K.setCfg(S.scope, 'mute.' + m, v); else { const f = { 1: 1, 2: 1.6, 3: 2.4, 4: 3.2, 5: 4 }; for (let i = 1; i <= 5; i++) K.setCfg(S.scope, 'mute.' + i, Math.floor(v * f[i])); }
  const c = K.cfg(S.scope).mute; return ctx.reply('✅ Preços de mute:\n' + [1, 2, 3, 4, 5].map(i => i + ' min — ' + money(c[i])).join('\n')); }, own);
const gname = (s, cfg) => { s = K.strip(s); if (cfg.games[s]) return s; s = s.replace(/^ap/, ''); return cfg.games[s] ? s : null; };
def('apsetprobabilidade', (ctx, S, a) => { const g = gname(a[0], S.cfg); const v = parseFloat(String(a[1]).replace(',', '.')); if (!g || !(v >= 0 && v <= 100)) return ctx.reply('❌ Use: *apsetprobabilidade jogo 0-100*\nJogos: ' + Object.keys(S.cfg.games).join(', ') + '\n(p = % de vitória; no aviator/rocket = % de queda instantânea; mines/tower = % de margem da casa)'); K.setCfg(S.scope, 'games.' + g + '.p', v); return ctx.reply('✅ ' + g + ' → p = ' + v + '%'); }, own);
def('apsetmultiplicador', (ctx, S, a) => { const g = gname(a[0], S.cfg); const v = parseFloat(String(a[1]).replace(',', '.')); if (!g || !(v > 0 && v <= 1000)) return ctx.reply('❌ Use: *apsetmultiplicador jogo valor*\nJogos: ' + Object.keys(S.cfg.games).join(', ') + '\n(aviator/rocket = multiplicador máximo; plinko = escala da tabela)'); K.setCfg(S.scope, 'games.' + g + '.mult', v); return ctx.reply('✅ ' + g + ' → x' + v); }, own);
const cdName = (s, cfg) => { s = K.strip(s); if (!s.startsWith('ap')) s = 'ap' + s; return cfg.cd[s] !== undefined ? s : null; };
def('apcooldowns', (ctx, S) => ctx.reply('⏳ *COOLDOWNS* (' + (K.getMode() === 'grupo' ? 'deste grupo' : 'globais') + ')\n' + Object.keys(S.cfg.cd).map(k => k + ' — ' + K.dur(S.cfg.cd[k] * 1000)).join('\n') + '\n\n_apsetcooldown comando tempo (ex: apsetcooldown apcrime 1m30s)_'), own);
def('apsetcooldown', (ctx, S, a) => { const k = cdName(a[0], S.cfg); const sec = K.parseTime(a[1]); if (!k || !(sec >= 0 && sec <= 86400)) return ctx.reply('❌ Use: *apsetcooldown apcrime 90* (segundos) ou *1m30s*'); K.setCfg(S.scope, 'cd.' + k, sec); return ctx.reply('✅ ' + k + ' = ' + K.dur(sec * 1000)); }, own);
def('apresetcooldown', (ctx, S, a, t) => { if (!needTarget(ctx, t)) return; K.D().prepare('DELETE FROM ap_cd WHERE scope=? AND jid=?').run(S.scope, K.pid(t)); return ctx.reply('✅ Recargas de ' + tag(K.pid(t)) + ' reiniciadas.', { mentions: [t] }); }, own);
def('apcooldownstatus', (ctx, S, a, t) => { const id = t ? K.pid(t) : S.id; const r = Object.keys(S.cfg.cd).map(k => [k, K.cdLeft(S.scope, id, k)]).filter(x => x[1] > 0);
  return ctx.reply('⏳ *RECARGAS* de ' + tag(id) + '\n' + (r.length ? r.map(x => x[0] + ' — ' + K.dur(x[1])).join('\n') : 'Tudo disponível ✅'), { mentions: t ? [t] : [] }); }, own);
def('apconfig', (ctx, S) => { const c = S.cfg; return ctx.reply('⚙️ *CONFIG MODOAP* [' + (K.getMode()) + ']\nEconomia: ' + (K.economyOn() ? 'ON' : 'OFF') + '\nInicial: ' + money(c.start) + ' | Diário: ' + money(c.daily) + ' | Mensal: ' + money(c.monthly) + '\nTrabalho: ' + money(c.work[0]) + '–' + money(c.work[1]) + '\nMute: ' + [1, 2, 3, 4, 5].map(i => i + 'm=' + money(c.mute[i])).join(' · ') + '\nJogos (p%/mult):\n' + Object.keys(c.games).map(g => '• ' + g + ' ' + c.games[g].p + '% x' + c.games[g].mult + ' (máx ' + money(c.games[g].max) + ')').join('\n') + '\nAnti-abuso: máx ' + c.troll.maxPerTarget + ' partidas/' + c.troll.windowMin + 'min por alvo; perda máx ' + c.troll.maxLossPct + '%/' + money(c.troll.maxLossAbs)); }, own);
def('apstats', (ctx, S) => { const q = (s, p) => K.D().prepare(s).get(...p); const pl = q('SELECT COUNT(*) n, COALESCE(SUM(wallet+bank),0) t FROM ap_players WHERE scope=?', [S.scope]);
  return ctx.reply('📊 *STATS MODOAP*\nJogadores: ' + pl.n + '\nDinheiro em circulação: ' + money(pl.t) + '\nDívidas ativas: ' + q("SELECT COUNT(*) n FROM ap_debts WHERE scope=? AND status IN ('active','overdue')", [S.scope]).n + '\nPartidas abertas: ' + q("SELECT COUNT(*) n FROM ap_games WHERE scope=? AND status='open'", [S.scope]).n + '\nTransações: ' + q('SELECT COUNT(*) n FROM ap_hist WHERE scope=?', [S.scope]).n); }, own);

try { K.start(); } catch (_) {}
module.exports = defs;
