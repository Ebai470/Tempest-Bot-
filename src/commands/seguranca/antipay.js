'use strict';
/** !antipay on|off|status — liga/desliga a proteção contra mensagens de pagamento neste grupo. */
const antipay = require('../../middlewares/antipay');

module.exports = {
  name: 'antipay', aliases: ['antipagamento', 'antipaymsg'], category: 'seguranca',
  description: 'Bane quem mandar mensagem de pagamento (flood) no grupo', usage: '!antipay on/off/status',
  handler: async function (ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Use este comando dentro de um grupo.');
    let ok = false; try { ok = ctx.isOwner() || (await ctx.isGroupAdmin()); } catch (_) {}
    if (!ok) return ctx.reply('❌ Só admins do grupo podem usar isto.');
    const p = ctx.prefix || '!';
    const arg = String((ctx.args && ctx.args[0]) || 'status').toLowerCase();
    if (['on', 'ligar', 'ativar', '1'].indexOf(arg) >= 0) { antipay.setEnabled(ctx.jid, true); return ctx.reply('💳🚫 *ANTIPAY* ligado neste grupo.\nQuem mandar mensagem de pagamento será banido, e eu pergunto se pode apagar as mensagens.'); }
    if (['off', 'desligar', 'desativar', '0'].indexOf(arg) >= 0) { antipay.setEnabled(ctx.jid, false); return ctx.reply('💳 *ANTIPAY* desligado neste grupo.'); }
    const adm = await antipay.botIsAdmin(ctx.sock, ctx.jid);
    const st = antipay.stats;
    return ctx.reply('💳🚫 *ANTIPAY*\n\nNeste grupo: ' + (antipay.isEnabled(ctx.jid) ? '🟢 ligado' : '⚪ desligado')
      + '\nMonitorando mensagens: ' + (st.attached ? '✅ sim' : '❌ NÃO (reinicie o bot / veja a instalação)')
      + '\nBot é admin aqui: ' + (adm === true ? '✅ sim' : adm === false ? '❌ NÃO — preciso ser admin para banir e apagar' : '❓ não deu para verificar')
      + '\nDetectadas desde que o bot ligou: ' + st.detected + (st.lastAt ? ' (última: ' + st.lastType + ')' : '')
      + '\n\nUso: ' + p + 'antipay on | off');
  }
};
