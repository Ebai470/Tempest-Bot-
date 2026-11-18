/**
 * adddono | deldono | listdono | verlid
 * Até 8 donos extras com todas as funções de dono. Aceita número (qualquer país) ou LID.
 */
const X = () => require('../../services/extraOwners');
const dg = (j) => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const argsOf = (ctx) => (Array.isArray(ctx.args) ? ctx.args : String(ctx.text || '').split(/\s+/)).filter(Boolean);
const mainOwner = (ctx) => { const x = X(); return x.isMain(ctx.sender) || x.isMain(ctx.senderLid) || x.isMain(ctx.senderPn); };
const fmt = (d) => (d.length >= 14 ? 'LID ' + d : '+' + d);

/** procura no grupo os outros IDs (número/LID) da mesma pessoa */
async function related(ctx, d) {
  const out = new Set([d]);
  try {
    if (ctx.isGroup) { const meta = await ctx.sock.groupMetadata(ctx.jid); const p = (meta.participants || []).find((x) => [x.id, x.lid, x.phoneNumber, x.jid].some((v) => dg(v) === d)); if (p) [p.id, p.lid, p.phoneNumber, p.jid].forEach((v) => { const n = dg(v); if (n) out.add(n); }); }
  } catch (_) {}
  try { const lm = ctx.sock.signalRepository && ctx.sock.signalRepository.lidMapping; if (lm) {
    if (d.length <= 13 && lm.getLIDForPN) { const l = await lm.getLIDForPN(d + '@s.whatsapp.net'); if (l) out.add(dg(l)); }
    if (d.length >= 14 && lm.getPNForLID) { const p = await lm.getPNForLID(d + '@lid'); if (p) out.add(dg(p)); } } } catch (_) {}
  return [...out].filter(Boolean);
}

module.exports = [
  {
    name: 'adddono', aliases: ['addowner', 'addono', 'novodono'], category: 'dono', ownerOnly: true,
    description: 'Adiciona um dono extra (ate 8): adddono <numero ou LID> (ou marcar/responder)',
    handler: async (ctx) => {
      const X_ = X(); if (!mainOwner(ctx)) return ctx.reply('🔒 Só o *dono principal* pode adicionar ou remover donos.');
      const a = argsOf(ctx); const t = ctx.getMentionedOrQuoted && ctx.getMentionedOrQuoted(); let base = '';
      if (t) base = dg(t); else if (a[0]) base = X_.norm(a.join(' ')) || X_.norm(a[0]);
      if (!base) return ctx.reply('👑 *ADICIONAR DONO EXTRA*\n\n*adddono 258874288439* (número com código do país)\n*adddono 135055783522320* (LID)\n*adddono* marcando ou respondendo a pessoa\n\n_Até ' + X_.MAX + ' donos extras. Atuais: ' + X_.list().length + '. Veja com *listdono*. Para descobrir o LID: *verlid*._');
      const ids = await related(ctx, base); const r = X_.add(ids, ctx.sender, a.join(' '));
      if (r.err) return ctx.reply('⚠️ ' + r.err);
      let warn = ''; if (!t && base.length <= 13) { try { const q = await ctx.sock.onWhatsApp(base + '@s.whatsapp.net'); if (Array.isArray(q) && q.length && q[0].exists === false) warn = '\n⚠️ Esse número *não parece ter WhatsApp* — confira se digitou certo.'; } catch (_) {} }
      return ctx.reply('✅ *Dono extra adicionado!*\n' + r.entry.ids.map((d) => '• ' + fmt(d)).join('\n') + '\n\nAgora essa pessoa pode usar *todas* as funções de dono (' + X_.list().length + '/' + X_.MAX + ').' + warn + '\n_Se ela usar o bot e não for reconhecida, peça para enviar *verlid* e adicione o LID._');
    }
  },
  {
    name: 'deldono', aliases: ['delowner', 'rmdono', 'removerdono'], category: 'dono', ownerOnly: true,
    description: 'Remove um dono extra: deldono <numero ou LID>',
    handler: async (ctx) => {
      const X_ = X(); if (!mainOwner(ctx)) return ctx.reply('🔒 Só o *dono principal* pode adicionar ou remover donos.');
      const t = ctx.getMentionedOrQuoted && ctx.getMentionedOrQuoted(); const q = t ? dg(t) : X_.norm(argsOf(ctx).join(' '));
      if (!q) return ctx.reply('Use: *deldono 258874288439* (ou LID, ou marque a pessoa). Veja com *listdono*.');
      return ctx.reply(X_.remove(q) ? '✅ Dono extra removido.' : '⚠️ Essa pessoa não está na lista de donos extras.');
    }
  },
  {
    name: 'listdono', aliases: ['donos', 'owners', 'listowner'], category: 'dono', ownerOnly: true,
    description: 'Lista os donos extras',
    handler: async (ctx) => {
      const X_ = X(); const l = X_.list();
      if (!l.length) return ctx.reply('👑 *DONOS EXTRA* (0/' + X_.MAX + ')\nNenhum. Use *adddono <numero>*.');
      return ctx.reply('👑 *DONOS EXTRA* (' + l.length + '/' + X_.MAX + ')\n\n' + l.map((e, i) => (i + 1) + '. ' + e.ids.slice(0, 4).map(fmt).join(' · ')).join('\n') + '\n\n_Remover: deldono <numero ou LID>_');
    }
  },
  {
    name: 'verlid', aliases: ['lid', 'meulid', 'getlid'], category: 'dono',
    description: 'Mostra o LID e o numero: verlid (o teu) ou verlid @pessoa (so donos)',
    handler: async (ctx) => {
      const t = ctx.getMentionedOrQuoted && ctx.getMentionedOrQuoted();
      if (t && !ctx.isOwner()) return ctx.reply('🔒 Só os donos podem ver o LID de outras pessoas. Use *verlid* para ver o seu.');
      const ids = new Set(); const push = (v) => { const d = dg(v); if (d) ids.add(d); };
      if (t) push(t); else { push(ctx.sender); push(ctx.senderLid); push(ctx.senderPn); }
      for (const d of [...ids]) (await related(ctx, d)).forEach((x) => ids.add(x));
      const all = [...ids]; const lids = all.filter((d) => d.length >= 14), nums = all.filter((d) => d.length < 14);
      const who = t ? '@' + dg(t) : 'você';
      return ctx.reply('🆔 *DADOS DE ' + who.toUpperCase() + '*\n\n🔑 LID: ' + (lids.length ? lids.join(', ') : 'não disponível') + '\n📞 Número: ' + (nums.length ? nums.map((n) => '+' + n).join(', ') : 'não disponível (o WhatsApp escondeu)') + '\n\n_Para dar acesso de dono: *adddono ' + (lids[0] || nums[0] || '<id>') + '*_', t ? { mentions: [t] } : {});
    }
  }
];
