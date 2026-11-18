'use strict';
/** !selo — testa os estilos de selo (service selos). Novo e isolado. */
const selos = require('../../services/selos');

module.exports = {
  name: 'selo', aliases: ['selos'], category: 'utilidades',
  description: 'Testa os estilos de selo (cartão citado, anúncio, canal)', usage: '!selo <estilo> <texto>',
  handler: async function (ctx) {
    const p = ctx.prefix || '!';
    const args = (ctx.args || []).slice();
    const nome = String(args.shift() || '').toLowerCase();
    if (!nome) {
      return ctx.reply('🏷️ *SELOS*\n\nUso: *' + p + 'selo <estilo> <texto>*\nEx.: ' + p + 'selo dono Olá!\n\nEstilos: ' + selos.NAMES.join(', ') + '\n\n*' + p + 'selo todos* mostra todos de uma vez (só o dono).');
    }
    const S = selos.build(ctx);
    if (nome === 'todos') {
      let ok = false; try { ok = ctx.isOwner(); } catch (_) {}
      if (!ok) return ctx.reply('❌ Só o dono pode usar *' + p + 'selo todos*.');
      for (let i = 0; i < selos.NAMES.length; i++) {
        try { await S[selos.NAMES[i]]('Estilo: ' + selos.NAMES[i]); } catch (e) { console.error('[selo]', selos.NAMES[i], e && e.message); }
        await new Promise(function (r) { setTimeout(r, 700); });
      }
      return;
    }
    if (selos.NAMES.indexOf(nome) < 0) return ctx.reply('❌ Estilo desconhecido: ' + nome + '\nEstilos: ' + selos.NAMES.join(', '));
    const texto = args.join(' ').trim() || ('Estilo: ' + nome);
    try { await S[nome](texto); } catch (e) { console.error('[selo]', nome, e && e.message); return ctx.reply('❌ Não consegui enviar esse estilo.'); }
  }
};
