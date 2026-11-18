const vm = require('../../services/verifiedMode');

module.exports = [
  {
    name: 'modoverificado',
    aliases: ['modoverified', 'modocanal'],
    category: 'dono',
    description: 'Liga/desliga o modo canal (encaminhada de canal)',
    ownerOnly: true,
    usage: 'modoverificado on/off/status',
    handler: async (ctx) => {
      try {
        if (typeof ctx.isOwner === 'function' && !ctx.isOwner()) {
          return ctx.reply('❌ Só o *dono* do bot pode usar isto.');
        }
      } catch (_) {}
      const arg = String((ctx.args && ctx.args[0]) || 'status').toLowerCase();
      const st = vm.status();

      if (arg === 'on' || arg === 'ligar' || arg === 'ativar' || arg === '1') {
        if (!st.usable) {
          return ctx.reply(
            '*Modo verificado*\n\n⚠️ Não foi possível ativar.\n' + st.problem +
            '\n\nO selo azul oficial só é atribuído pelo WhatsApp/Meta e não pode ser criado pelo bot. ' +
            'Configure o *seu* canal no .env para usar o modo canal.'
          );
        }
        vm.setEnabled(true);
        return ctx.reply(
          '*Modo verificado*\n\n✅ Ativado.\nCanal: ' + st.channel.name +
          '\n\nAs mensagens aparecem como encaminhadas do seu canal. O selo azul só aparece se o canal for verificado pelo WhatsApp.'
        );
      }

      if (arg === 'off' || arg === 'desligar' || arg === 'desativar' || arg === '0') {
        vm.setEnabled(false);
        return ctx.reply('*Modo verificado*\n\n⚪ Desativado.');
      }

      return ctx.reply(
        '*Modo verificado*\n\nEstado: ' + (st.enabled ? '🟢 ATIVADO' : '⚪ DESATIVADO') +
        '\nCanal: ' + (st.channel.jid ? st.channel.name : 'não configurado') +
        '\nUsável: ' + (st.usable ? 'sim' : 'não — ' + st.problem) +
        '\n\nUso: !modoverificado on | off | status'
      );
    }
  }
];
