/**
 * antipayment on|off|status|modo aviso|remover|limite N
 * Protecao contra cobrancas/pedidos de pagamento ocultos (portado do bot do amigo).
 */
const svc = () => require('../../services/antiPayment');

module.exports = [
  {
    name: 'antipayment',
    aliases: ['antipagamento', 'anticobranca', 'antipay'],
    category: 'admin',
    description: 'Anti-payment: remove quem envia cobranca/pagamento oculto',
    groupOnly: true,
    handler: async (ctx) => {
      if (!ctx.isGroup) return ctx.reply('❌ So em grupos.');
      const isStaff = (typeof ctx.isOwner === 'function' && ctx.isOwner()) || (typeof ctx.isGroupAdmin === 'function' && (await ctx.isGroupAdmin()));
      if (!isStaff) return ctx.reply('❌ Apenas Owner ou ADM do grupo.');
      const S = svc(); const jid = ctx.jid;
      const args = String(ctx.args && ctx.args.join ? ctx.args.join(' ') : (ctx.text || '')).trim().toLowerCase().split(/\s+/).filter(Boolean);
      const a = args[0] || 'status';
      const status = async () => {
        let adm = null; try { adm = await S.botIsGroupAdmin(ctx.sock, jid); } catch (_) {}
        return '🛡️ *ANTI-PAYMENT: ' + (S.isEnabled(jid) ? 'LIGADO ✅' : 'DESLIGADO ⛔') + '*\nModo: *' + S.getMode(jid) + '*\nLimite de msgs indecifraveis: *' + S.getLimit(jid) + '* em 2 min\nBot e ADM do grupo: ' + (adm === null ? '?' : adm ? 'sim ✅' : 'NAO ❌ (necessario para remover)');
      };
      if (a === 'status') return ctx.reply(await status());
      if (['on', 'ligar', '1', 'ativar'].includes(a)) { S.set(jid, 'antipayment', '1'); return ctx.reply('🛡️ *ANTI-PAYMENT LIGADO*\n\n' + (await status()) + '\n\n_ADMs e dono nunca sao afetados._'); }
      if (['off', 'desligar', '0', 'desativar'].includes(a)) { S.set(jid, 'antipayment', '0'); return ctx.reply('⛔ *ANTI-PAYMENT DESLIGADO*'); }
      if (a === 'modo') {
        const m = args[1];
        if (m !== 'aviso' && m !== 'remover') return ctx.reply('Uso: *antipayment modo aviso* (so avisa) ou *antipayment modo remover* (remove o membro)');
        S.set(jid, 'antipayment_mode', m); return ctx.reply('✅ Modo do anti-payment: *' + m + '*');
      }
      if (a === 'limite') {
        const n = parseInt(args[1], 10);
        if (!(n >= 2 && n <= 10)) return ctx.reply('Uso: *antipayment limite 2-10* (quantas mensagens indecifraveis seguidas, em 2 min, ate agir)');
        S.set(jid, 'antipayment_limit', String(n)); return ctx.reply('✅ Limite: *' + n + '* mensagens indecifraveis em 2 min');
      }
      return ctx.reply('Uso:\n*antipayment on* | *off* | *status*\n*antipayment modo aviso|remover*\n*antipayment limite 2-10*');
    }
  }
];
