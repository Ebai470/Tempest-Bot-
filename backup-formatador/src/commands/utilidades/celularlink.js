'use strict';
const nf = require('../../interactive/nativeFlow');
const config = require('../../config');

module.exports = [
  {
    name: 'celularlink',
    aliases: [],
    category: 'utilidades',
    description: 'Abre o mini celular estilo iPhone 17',
    usage: '!celular',
    handler: async (ctx) => {
      const url = nf.getEnv('CELULAR_URL');
      if (!url) {
        return ctx.reply('📱 Mini celular ainda não configurado.\nO dono precisa definir CELULAR_URL no .env.');
      }
      try {
        await nf.sendNative(ctx.sock, ctx.jid, {
          body: '📱 *MINI PHONE*\nCalculadora, notas, calendário, jogos e mais.\n👇 Toque para abrir',
          footer: '© ' + config.botName + ' • Mini Phone',
          quoted: ctx.msg,
          fallback: '📱 Mini celular: ' + url,
          buttons: [nf.btn.url('📱 Abrir celular', url)]
        });
      } catch (e) {
        console.error('[CELULAR]', e && e.message);
        await ctx.reply('📱 Mini celular: ' + url);
      }
    }
  }
];
