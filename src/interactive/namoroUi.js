'use strict';
// Pedido de namoro com botoes Sim/Nao: so quem RECEBEU o pedido pode responder; expira em 5 minutos.
const router = require('./router');
const nf = require('./nativeFlow');
const fs = require('fs');

const EXPIRE_MIN = 5;
const num = (j) => String(j || '').split('@')[0].split(':')[0];
const tag = (j) => '@' + num(j);
const quote = (lines) => lines.filter(Boolean).map((l) => '> ' + l).join('\n');
const getDb = () => require('../database').getDb();

// 1 UTC "agora" menos N minutos, no formato do SQLite
function expireSql(database) {
  try {
    database.prepare("UPDATE relationships SET status = 'ended', ended_at = datetime('now') WHERE status = 'pending' AND type = 'namoro' AND datetime(started_at) < datetime('now', '-" + EXPIRE_MIN + " minutes')").run();
  } catch (_) {}
}

// o clicador e a pessoa que recebeu o pedido? (compara o numero; tenta tambem o mapa id<->lid do grupo)
async function sameUser(ctx, a, b) {
  if (num(a) && num(a) === num(b)) return true;
  try {
    const md = await ctx.sock.groupMetadata(ctx.jid);
    const list = md.participants || [];
    const find = (j) => list.find((p) => num(p.id) === num(j) || (p.lid && num(p.lid) === num(j)));
    const pa = find(a), pb = find(b);
    return !!(pa && pb && pa === pb);
  } catch (_) { return false; }
}

// midia definida com "setmidia namorar": vai no topo do proprio cartao (e nao depois, em separado)
function mediaFor() {
  try {
    const cm = require('../services/commandMedia');
    const cmd = require('../commands/registry').get('namorar');
    const names = cmd ? [cmd.name].concat(cmd.aliases || []) : ['namorar'];
    const info = cm.resolve(names[0], [], names);
    if (!info) return null;
    const buf = fs.readFileSync(info.file);
    if (info.type === 'image') return { image: buf };
    return { video: buf, gifPlayback: info.type === 'gif' };
  } catch (_) { return null; }
}

async function sendRequest(ctx, pedidoId, target) {
  const A = ctx.sender, B = target;
  const lines = [tag(A) + ' pediu ' + tag(B) + ' em namoro! 💕', '⏳ Expira em *' + EXPIRE_MIN + ' minutos*', 'Só ' + tag(B) + ' pode responder pelos botões.'];
  const body = '💍 `• PEDIDO DE NAMORO`\n\n' + quote(lines);
  const media = mediaFor();
  if (media) ctx.__tpMediaUsed = true; // o despachante nao volta a enviar a midia depois
  try {
    await nf.sendNative(ctx.sock, ctx.jid, Object.assign({
      body: body, footer: '', noFormat: true, noButtonStyle: true, mentions: [A, B],
      buttons: [nf.btn.reply('✅ Sim', 'nm:yes:' + pedidoId), nf.btn.reply('❌ Não', 'nm:no:' + pedidoId)],
      fallback: body + '\n\nResponda com *aceitar* ou *recusar*.',
      onMediaFail: () => { ctx.__tpMediaUsed = false; }
    }, media || {}));
  } catch (e) {
    ctx.__tpMediaUsed = false;
    await ctx.reply(body + '\n\nResponda com *aceitar* ou *recusar*.', { mentions: [A, B] });
  }
  // aviso de expiracao (corre um pouco antes do fim para vir antes da limpeza silenciosa)
  const sock = ctx.sock, jid = ctx.jid;
  const t = setTimeout(async () => {
    try {
      const database = getDb();
      const row = database.prepare("SELECT * FROM relationships WHERE id = ? AND status = 'pending'").get(pedidoId);
      if (!row) return;
      database.prepare("UPDATE relationships SET status = 'ended', ended_at = datetime('now') WHERE id = ?").run(pedidoId);
      await sock.sendMessage(jid, { text: '⏳ O pedido de namoro de ' + tag(A) + ' para ' + tag(B) + ' *expirou* (' + EXPIRE_MIN + ' min).', mentions: [A, B] });
    } catch (_) {}
  }, EXPIRE_MIN * 60 * 1000 - 1500);
  if (t.unref) t.unref();
}

async function handle(ctx, rest) {
  const p = String(rest).split(':');
  const act = p[0], id = parseInt(p[1], 10);
  if (!id || (act !== 'yes' && act !== 'no')) return;
  const database = getDb();
  expireSql(database);
  const row = database.prepare('SELECT * FROM relationships WHERE id = ?').get(id);
  if (!row || row.type !== 'namoro') return ctx.reply('❌ Pedido não encontrado.');
  if (row.status !== 'pending') return ctx.reply('⏳ Este pedido já foi respondido ou *expirou*.');
  if (!(await sameUser(ctx, ctx.sender, row.user2_jid))) {
    return ctx.reply('🚫 Só ' + tag(row.user2_jid) + ' pode responder a este pedido.', { mentions: [row.user2_jid] });
  }
  const g = row.group_jid || ctx.jid;
  if (act === 'no') {
    database.prepare("UPDATE relationships SET status = 'ended', ended_at = datetime('now') WHERE id = ?").run(id);
    return ctx.reply('💔 ' + tag(row.user2_jid) + ' *recusou* o pedido de ' + tag(row.user1_jid) + '.', { mentions: [row.user1_jid, row.user2_jid] });
  }
  // sim: confirma que nenhum dos dois ficou comprometido entretanto
  const busy = database.prepare("SELECT id FROM relationships WHERE status = 'accepted' AND type IN ('namoro','casamento') AND group_jid = ? AND id != ? AND (user1_jid IN (?, ?) OR user2_jid IN (?, ?)) LIMIT 1").get(g, id, row.user1_jid, row.user2_jid, row.user1_jid, row.user2_jid);
  if (busy) {
    database.prepare("UPDATE relationships SET status = 'ended', ended_at = datetime('now') WHERE id = ?").run(id);
    return ctx.reply('❌ Um dos dois já está em um relacionamento neste grupo.');
  }
  database.prepare("UPDATE relationships SET status = 'accepted', started_at = datetime('now'), group_jid = ? WHERE id = ?").run(g, id);
  return ctx.reply('💕 Agora ' + tag(row.user1_jid) + ' e ' + tag(row.user2_jid) + ' estão *namorando*! 🎉', { mentions: [row.user1_jid, row.user2_jid] });
}

router.register('nm', handle);

module.exports = { sendRequest: sendRequest, EXPIRE_MIN: EXPIRE_MIN };
