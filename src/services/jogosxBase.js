'use strict';
/**
 * JOGOS X — base dos jogos no painel interativo do WhatsApp.
 * Crédito da estrutura da mensagem interativa (montarMensagem / embedded_screens): TIO INO
 * Arquivos novos e isolados: não altera nenhum outro comando.
 */
const crypto = require('crypto');
const LIST = [];

const CSS = '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}'
  + 'body{margin:0;padding:12px;background:#10131c;color:#f5f7ff;font-family:Arial,sans-serif}'
  + '.app{max-width:440px;margin:auto;background:#1a2030;border:1px solid #36415b;border-radius:22px;padding:14px}'
  + 'h1{text-align:center;font-size:22px;margin:2px 0 6px}'
  + '.bar{display:flex;gap:8px;margin:8px 0;font-weight:bold;font-size:14px}.bar span{flex:1;background:#252f45;border-radius:10px;padding:8px 6px;text-align:center}'
  + 'canvas{display:block;width:100%;background:#0b0e16;border-radius:14px;touch-action:none}'
  + '.btns{display:flex;gap:8px;margin-top:10px}.btns button{flex:1;border:0;border-radius:12px;padding:13px 4px;background:#384766;color:#fff;font-size:16px;font-weight:bold;touch-action:none}'
  + '.btns button.pri{background:#5144a4}.btns button.on{background:#2f8f6b}'
  + '.msg{text-align:center;font-size:13px;color:#b8c4dc;margin-top:9px;min-height:18px}';

function page(title, body, js, css) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>'
    + CSS + (css || '') + '</style></head><body><div class="app"><h1>' + title + '</h1>' + body + '</div><script>'
    + 'function $(i){return document.getElementById(i)}function msg(t){var m=$("m");if(m)m.textContent=t}' + js + '</script></body></html>';
}

/* Estrutura da mensagem interativa — crédito: TIO INO */
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

function make(g) {
  g.html = page(g.emoji + ' ' + g.title, g.body, g.js, g.css);
  LIST.push(g);
  return {
    name: g.name, aliases: g.aliases || [], category: 'jogos',
    description: g.emoji + ' ' + g.title + ' (' + g.kind + ')', usage: '!' + g.name,
    handler: async function (ctx) {
      try {
        await ctx.sock.relayMessage(ctx.jid, montarMensagem(g.html, 'jogox-' + g.name + '-' + crypto.randomUUID(), g.emoji + ' ' + g.title.toUpperCase()), {});
      } catch (e) {
        console.error('[JOGOSX]', g.name, e && e.message);
        try { await ctx.reply('❌ Não consegui abrir o jogo: ' + (e && e.message)); } catch (_) {}
      }
    }
  };
}
module.exports = { make: make, LIST: LIST, page: page, montarMensagem: montarMensagem };
