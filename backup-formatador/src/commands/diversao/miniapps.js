'use strict';
const mini = require('../../services/miniApp');
async function open(ctx, name, id, titulo) {
  let ok = false;
  try { ok = await mini.sendMini(ctx.sock, ctx.jid, name, id, titulo); }
  catch (e) { console.error('[miniapp]', e && e.message); }
  if (!ok) await ctx.reply('❌ O mini app nao abriu neste aparelho/versao. Use *minitest* para ver o diagnostico, ou *jogodavelha* para o modo texto.');
}
module.exports = [
  { name: 'minivelha', aliases: ['velhamini', 'minijogodavelha'], category: 'jogos', description: 'Jogo da velha no mini celular', handler: (ctx) => open(ctx, 'velha', 'jogo-da-velha', '⭕ JOGO DA VELHA') },
  { name: 'minitest', aliases: ['miniteste'], category: 'jogos', description: 'Diagnostico dos mini apps', handler: async (ctx) => {
    const t = mini.selfTest();
    await ctx.reply('🔧 *MINI APPS*\nBiblioteca: ' + (t.ok ? '✅ suporta' : '❌ nao suporta') + '\nDetalhe: ' + t.why + '\nRecurso: ' + (mini.disabled() ? 'desligado (MINIAPP=off)' : 'ligado') + '\nTeste: *minivelha*');
  } }
];
