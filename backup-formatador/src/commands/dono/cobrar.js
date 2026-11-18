'use strict';
let genId = null;
try { genId = require('@whiskeysockets/baileys').generateMessageID; } catch (_) {}

function parseValor(str) {
  let s = String(str || '').trim().replace(/[^\d.,]/g, '');
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

module.exports = [{
  name: 'cobrar',
  aliases: ['cobranca', 'pedirpagamento', 'requestpay'],
  category: 'dono',
  description: 'Envia um pedido de pagamento: cobrar <texto> | <valor>',
  usage: '!cobrar <texto> | <valor>',
  handler: async (ctx) => {
    const ok = (ctx.isOwner && ctx.isOwner()) || (ctx.isBotAdmin && ctx.isBotAdmin());
    if (!ok) return ctx.reply('❌ Apenas o dono ou admins do bot podem usar.');
    const p = ctx.prefix || '!';
    const q = String((ctx.text || '')).trim();
    if (!q) {
      return ctx.reply(
        '💳 *COBRANÇA*\n\n' +
        'Use:\n' + p + 'cobrar <texto> | <valor>\n\n' +
        'Ex:\n' + p + 'cobrar Mensalidade | 50,00\n' + p + 'cobrar Teste'
      );
    }
    try {
      const partes = q.split('|');
      const texto = (partes[0] || '').trim() || 'Pagamento pendente';
      const valor = parseValor(partes[1]);
      const amount1000 = Math.round(valor * 1000);
      let mentions = [];
      if (ctx.isGroup) {
        try { const meta = await ctx.sock.groupMetadata(ctx.jid); mentions = meta.participants.map((x) => x.id); } catch (_) {}
      }
      const me = String((ctx.sock.user && ctx.sock.user.id) || '').split(':')[0].split('@')[0];
      const botJid = me ? me + '@s.whatsapp.net' : '0@s.whatsapp.net';
      const corpo = '> ' + texto + (valor > 0 ? '\n> Valor: R$ ' + valor.toFixed(2) : '');
      const messageId = (typeof ctx.sock.generateMessageTag === 'function' && ctx.sock.generateMessageTag()) ||
        (genId ? genId() : String(Date.now()));
      await ctx.sock.relayMessage(ctx.jid, {
        requestPaymentMessage: {
          currencyCodeIso4217: 'BRL',
          amount1000: amount1000,
          requestFrom: botJid,
          expiryTimestamp: Math.floor(Date.now() / 1000) + 86400,
          noteMessage: {
            extendedTextMessage: { text: corpo, contextInfo: { mentionedJid: mentions } }
          },
          amount: { value: amount1000, offset: 1000, currencyCode: 'BRL' }
        }
      }, { messageId: messageId });
      try { await ctx.react('💳'); } catch (_) {}
    } catch (e) {
      console.error('[cobrar]', e && e.message ? e.message : e);
      await ctx.reply('❌ Erro: ' + String((e && e.message) || e).slice(0, 160));
    }
  }
}];
