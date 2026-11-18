const modes = require('../../services/modes');

const ON = ['on', 'ligar', 'ativar', '1', 'sim'];
const OFF = ['off', 'desligar', 'desativar', '0', 'nao', 'não'];
const arg0 = (ctx) => String((ctx.args && ctx.args[0]) || '').toLowerCase();

module.exports = [
  {
    name: 'modosugestao',
    aliases: ['modosugestão', 'modosugestoes', 'modosug'],
    category: 'dono',
    description: 'Liga/desliga a sugestão de "comando não encontrado"',
    ownerOnly: true,
    usage: 'modosugestao on/off/status',
    handler: async (ctx) => {
      try {
        if (typeof ctx.isOwner === 'function' && !ctx.isOwner()) return ctx.reply('❌ Só o *dono* do bot pode usar isto.');
      } catch (_) {}
      const a = arg0(ctx);
      if (ON.indexOf(a) >= 0) {
        modes.setSuggest(true);
        return ctx.reply('Modo sugestão\n\n✅ Ativado.\nComandos que não existem mostram a sugestão, com a mídia de "comando não encontrado" (se configurada).\n\nPara definir a mídia: responda uma foto/vídeo com *setmidia comando não encontrado*.');
      }
      if (OFF.indexOf(a) >= 0) {
        modes.setSuggest(false);
        return ctx.reply('Modo sugestão\n\n⚪ Desativado.\nComandos que não existem não recebem resposta.');
      }
      return ctx.reply('Modo sugestão\n\nEstado: ' + (modes.suggestOff() ? '⚪ DESATIVADO' : '🟢 ATIVADO') + '\nMídia do cartão: ' + require('../../interactive/sugMedia').status() + '\n\nUso: modosugestao on | off');
    }
  },
  {
    name: 'modonotificacao',
    aliases: ['modonotificação', 'modonotificacoes', 'modonotif', 'modoaviso'],
    category: 'grupo',
    description: 'Liga/desliga os avisos automáticos (promoção, rebaixamento, aprovação) neste grupo',
    groupOnly: true,
    adminOnly: true,
    usage: 'modonotificacao on/off/status',
    handler: async (ctx) => {
      let ok = false;
      try { ok = (typeof ctx.isOwner === 'function' && ctx.isOwner()) || (typeof ctx.isGroupAdmin === 'function' && (await ctx.isGroupAdmin())); } catch (_) {}
      if (!ok) return ctx.reply('❌ Só *admins* do grupo podem usar isto.');
      const a = arg0(ctx);
      if (ON.indexOf(a) >= 0) {
        modes.setNotif(ctx.jid, true);
        return ctx.reply('Modo notificação\n\n✅ Ativado neste grupo.\nO bot avisa quando alguém é promovido, rebaixado ou aprovado.');
      }
      if (OFF.indexOf(a) >= 0) {
        modes.setNotif(ctx.jid, false);
        return ctx.reply('Modo notificação\n\n⚪ Desativado neste grupo.\nO bot deixa de avisar promoções, rebaixamentos e aprovações.');
      }
      return ctx.reply('Modo notificação\n\nEstado: ' + (modes.notifOn(ctx.jid) ? '🟢 ATIVADO' : '⚪ DESATIVADO') + ' neste grupo\n\nUso: modonotificacao on | off');
    }
  }
];
