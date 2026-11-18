'use strict';
/**
 * seloverificado on/off/status — liga/desliga o modo verificado (mensagens como encaminhadas do seu canal).
 * Usa o mesmo estado do "modoverificado": os dois comandos ficam sempre em sincronia.
 * Comando novo e isolado.
 */
const vm = require('../../services/verifiedMode');

module.exports = {
  name: 'seloverificado', aliases: ['seloverif', 'selov'], category: 'dono',
  description: 'Liga/desliga o selo verificado (mensagens encaminhadas do seu canal)',
  ownerOnly: true, usage: 'seloverificado on/off/status',
  handler: async function (ctx) {
    try { if (typeof ctx.isOwner === 'function' && !ctx.isOwner()) return ctx.reply('❌ Só o *dono* do bot pode usar isto.'); } catch (_) {}
    const p = ctx.prefix || '!';
    const arg = String((ctx.args && ctx.args[0]) || 'status').toLowerCase();
    const st = vm.status();

    if (['on', 'ligar', 'ativar', 'ligado', '1'].indexOf(arg) >= 0) {
      if (!st.usable) {
        return ctx.reply('*Selo verificado*\n\n⚠️ Não foi possível ativar.\n' + st.problem + '\n\nConfigure o *seu* canal no .env (TEMPEST_NEWSLETTER_JID) ou use *' + p + 'setcanal*.');
      }
      vm.setEnabled(true);
      return ctx.reply('*Selo verificado*\n\n✅ Ligado.\nCanal: ' + st.channel.name + '\n\nAs mensagens do bot passam a aparecer como encaminhadas do seu canal.');
    }
    if (['off', 'desligar', 'desativar', 'desligado', '0'].indexOf(arg) >= 0) {
      vm.setEnabled(false);
      return ctx.reply('*Selo verificado*\n\n⚪ Desligado.');
    }
    return ctx.reply('*Selo verificado*\n\nEstado: ' + (st.enabled ? '🟢 LIGADO' : '⚪ DESLIGADO')
      + '\nCanal: ' + (st.channel.jid ? st.channel.name : 'não configurado')
      + '\nUsável: ' + (st.usable ? 'sim' : 'não — ' + st.problem)
      + '\n\nUso: ' + p + 'seloverificado on | off | status');
  }
};
