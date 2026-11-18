'use strict';
// Mini apps no chat (resposta rica com HTML). Estrutura da mensagem fornecida pelo dono do bot.
// Desligar: MINIAPP=off no .env. Se a biblioteca nao suportar, devolve false e o bot usa o texto normal.
const fs = require('fs');
const path = require('path');

function montarMensagem(html, responseId, titulo) {
  const payload = { response_id: responseId, sections: [{ view_model: { primitive: { text: `> ${titulo}`, __typename: "GenAIMarkdownTextUXPrimitive" }, __typename: "GenAISingleLayoutViewModel" } }], embedded_screens: [{ title: titulo, content: [{ __typename: "FOAIDNixelButtonSheets", tabs: [{ id: "tab_0", tab_header: titulo, sections: [{ __typename: "GenAIUnifiedResponseSection", view_model: { __typename: "GenAISingleLayoutViewModel", primitive: { __typename: "GenAIaeacdsnwHtmlPrimitive", payload: html } } }] }] }] }] };
  return { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, botForwardedMessage: { message: { richResponseMessage: { messageType: 1, submessages: [{ messageType: 2, messageText: titulo }], unifiedResponse: { data: Buffer.from(JSON.stringify(payload)).toString("base64") }, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" }, forwardOrigin: 4 } } } } };
}
function disabled() { return String(process.env.MINIAPP || '').toLowerCase() === 'off'; }
// Confere se a biblioteca preserva os campos (campos desconhecidos seriam descartados em silencio).
function selfTest() {
  try {
    const { proto } = require('@whiskeysockets/baileys');
    const m = montarMensagem('<p>x</p>', 'teste', 'teste');
    const dec = proto.Message.decode(proto.Message.encode(m).finish());
    const r = dec.botForwardedMessage && dec.botForwardedMessage.message && dec.botForwardedMessage.message.richResponseMessage;
    const ok = !!(r && r.unifiedResponse && r.unifiedResponse.data && r.unifiedResponse.data.length > 10);
    return { ok: ok, why: ok ? 'campos preservados' : 'a biblioteca descartou botForwardedMessage/richResponseMessage' };
  } catch (e) { return { ok: false, why: 'erro: ' + (e && e.message) }; }
}
const cache = {};
function loadHtml(name) {
  if (!cache[name]) cache[name] = fs.readFileSync(path.join(__dirname, '..', 'miniapps', name + '.html'), 'utf8');
  return cache[name];
}
async function sendMini(sock, jid, name, responseId, titulo) {
  if (disabled() || !sock || typeof sock.relayMessage !== 'function') return false;
  if (!selfTest().ok) return false;
  await sock.relayMessage(jid, montarMensagem(loadHtml(name), responseId, titulo), {});
  return true;
}
module.exports = { montarMensagem, selfTest, sendMini, loadHtml, disabled };
