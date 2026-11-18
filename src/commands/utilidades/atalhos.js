'use strict';
/** Atalhos da LISTA do "prefixo": tutorial e totalcmds. Comandos novos e isolados. */
module.exports = [
  {
    name: 'tutorial', aliases: ['comousar'], category: 'utilidades',
    description: 'Tutorial básico do bot', usage: '!tutorial',
    handler: async (ctx) => {
      const p = (ctx.prefix || '!');
      return ctx.reply('📖 *TUTORIAL BÁSICO*\n\n'
        + '1️⃣ Use o prefixo antes do comando. Ex.: *' + p + 'menu*\n'
        + '2️⃣ Mande *prefixo* (sem nada antes) para ver o prefixo do grupo e abrir a *LISTA* de atalhos.\n'
        + '3️⃣ *' + p + 'menu* abre o menu principal com todas as categorias.\n'
        + '4️⃣ *' + p + 'perfil* mostra o seu perfil e *' + p + 'ping* testa a velocidade do bot.\n'
        + '5️⃣ Para baixar vídeos, use *' + p + 'tk*, *' + p + 'ig*, *' + p + 'fb* com o link.\n\n'
        + 'Dúvidas? Fale com o dono: *' + p + 'dono*');
    }
  },
  {
    name: 'totalcmds', aliases: ['totalcomandos', 'totalcmd'], category: 'utilidades',
    description: 'Total de comandos do bot', usage: '!totalcmds',
    handler: async (ctx) => {
      let n = 0;
      try { const r = require('../registry'); n = (r.getMainCommands ? r.getMainCommands() : r.getAll()).length; } catch (_) {}
      return ctx.reply('📦 *TOTAL DE COMANDOS*\n\nO bot tem *' + n + '* comandos disponíveis.\nUse *' + (ctx.prefix || '!') + 'menu* para ver todos.');
    }
  }
];
