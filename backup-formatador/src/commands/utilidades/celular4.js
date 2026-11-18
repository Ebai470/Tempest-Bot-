'use strict';
/**
 * MINI CELULAR — nova estrutura de mensagem interativa.
 * Crédito da estrutura (montarMensagem / embedded_screens): TIO INO
 * Comando novo e isolado: !celular4 (os outros comandos não são alterados).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function montarMensagem(html, responseId, titulo) {
  const payload = {
    response_id: responseId,
    sections: [{ view_model: { primitive: { text: '> ' + titulo, __typename: 'GenAIMarkdownTextUXPrimitive' }, __typename: 'GenAISingleLayoutViewModel' } }],
    embedded_screens: [{ title: titulo, content: [{ __typename: 'FOAIDNixelButtonSheets', tabs: [{ id: 'tab_0', tab_header: titulo, sections: [{ __typename: 'GenAIUnifiedResponseSection', view_model: { __typename: 'GenAISingleLayoutViewModel', primitive: { __typename: 'GenAIaeacdsnwHtmlPrimitive', payload: html } } }] }] }] }]
  };
  return {
    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
    botForwardedMessage: { message: { richResponseMessage: {
      messageType: 1,
      submessages: [{ messageType: 2, messageText: titulo }],
      unifiedResponse: { data: Buffer.from(JSON.stringify(payload)).toString('base64') },
      contextInfo: { forwardingScore: 1, isForwarded: true, forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' }, forwardOrigin: 4 }
    } } }
  };
}

function loadHtml() {
  return fs.readFileSync(path.join(__dirname, 'celular_ui4.html'), 'utf8');
}

module.exports = [{
  name: 'celular4',
  aliases: ['celularnovo', 'minicelular4'],
  category: 'utilidades',
  description: 'Mini celular (tamanho ajustado, estrutura por TIO INO)',
  usage: '!celular4',
  handler: async (ctx) => {
    try {
      let html = loadHtml();
      try { html = await require('../../services/celularWp').html(ctx, html); } catch (_) { /* foto de fundo é opcional */ }
      const msg = montarMensagem(html, 'mini-phone-' + crypto.randomUUID(), '📱 MINI PHONE');
      await ctx.sock.relayMessage(ctx.jid, msg, {});
    } catch (e) {
      console.error('[CELULAR3]', e && e.message);
      await ctx.reply('❌ Não consegui abrir o mini celular: ' + (e && e.message));
    }
  }
}];
