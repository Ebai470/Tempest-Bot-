// TP_PFXSWAP — rótulos texto/interativo conferem com o comportamento real
/**
 * prefixo   -> funciona SEM prefixo; mostra os prefixos do grupo + botão LISTA para trocar
 * setprefix1 <símbolo|reset>  -> prefixo do MENU DE TEXTO (do grupo)
 * setprefix2 <símbolo|reset>  -> prefixo do MENU INTERATIVO (do grupo)
 * Os dois ficam salvos no banco e continuam após reiniciar o bot.
 */
const gp = require('../../utils/groupPrefix');
const prefixSelect = require('../../interactive/prefixSelect');

const RESET = ['reset', 'resetar', 'padrao', 'padrão', 'restaurar', 'default'];

async function change(ctx, type) {
  const args = ctx.args || [];
  if (!ctx.isGroup) return ctx.reply('O prefixo só pode ser alterado dentro de um grupo.');
  let ok = false;
  try { ok = ctx.isOwner() || ctx.isBotAdmin() || (await ctx.isGroupAdmin()); } catch (_) {}
  if (!ok) return ctx.reply('❌ Só admins do grupo podem alterar o prefixo.');
  if (!args.length) return prefixSelect.sendPrefixList(ctx.sock, ctx.jid);
  if (RESET.indexOf(String(args[0]).toLowerCase()) >= 0) return ctx.reply(prefixSelect.apply(ctx.jid, type, 'reset'));
  const uniq = Array.from(new Set(args));
  if (uniq.length > 4) return ctx.reply('❌ Use no máximo 4 prefixos.');
  return ctx.reply(prefixSelect.apply(ctx.jid, type, 'set', uniq));
}

module.exports = [
  {
    name: 'prefixo',
    aliases: ['prefixos', 'meuprefixo', 'qualprefixo'],
    category: 'utilidades',
    description: 'Mostra os prefixos do grupo e abre a lista para trocar',
    usage: '!prefixo',
    handler: async (ctx) => {
      const args = ctx.args || [];
      if (!ctx.hasPrefix && args.length) return; // sem prefixo só vale "prefixo" sozinho
      if (args.length) {
        // atalho: prefixo texto $  |  prefixo inter %  |  prefixo reset
        const a0 = String(args[0]).toLowerCase();
        if (['texto', 'text', 'txt'].indexOf(a0) >= 0) { ctx.args = args.slice(1); return change(ctx, 'inter'); }
        if (['inter', 'interativo', 'lista'].indexOf(a0) >= 0) { ctx.args = args.slice(1); return change(ctx, 'text'); }
        return ctx.reply('Use: *prefixo* (abre a lista), *setprefix1 <símbolo>* (menu de texto) ou *setprefix2 <símbolo>* (menu interativo).');
      }
      await prefixSelect.sendPrefixList(ctx.sock, ctx.jid, ctx.msg); // TP_PFXCARD: mesmo cartão bonito em grupo e no privado
    }
  },
  {
    name: 'setprefix1',
    category: 'utilidades',
    description: 'Prefixo do menu de TEXTO neste grupo',
    usage: '!setprefix1 <símbolo | reset>',
    handler: async (ctx) => { if (!ctx.hasPrefix) return; return change(ctx, 'inter'); }
  },
  {
    name: 'setprefix2',
    category: 'utilidades',
    description: 'Prefixo do menu INTERATIVO neste grupo',
    usage: '!setprefix2 <símbolo | reset>',
    handler: async (ctx) => { if (!ctx.hasPrefix) return; return change(ctx, 'text'); }
  }
];
