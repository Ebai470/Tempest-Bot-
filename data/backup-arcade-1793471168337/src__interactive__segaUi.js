'use strict';
/**
 * ARCADE 16:9 — jogos de verdade (tempo real, com animação) dentro do painel HTML da mensagem.
 * Substitui a versão antiga em imagem PNG por turnos. Mantém os mesmos ids de botão (sgm:*),
 * então o menu principal e o comando !sega continuam funcionando sem mexer em mais nada.
 * Crédito da estrutura da mensagem interativa (montarMensagem / embedded_screens): TIO INO
 */
const crypto = require('crypto');
const router = require('./router');
const nf = require('./nativeFlow');
const config = require('../config');
const arcade = require('../games/arcade');
const btn = nf.btn;

const GAMES = arcade.GAMES;
const byId = {};
GAMES.forEach((g) => { byId[g.id] = g; });

/* Estrutura da mensagem interativa — crédito: TIO INO */
function montarMensagem(html, responseId, titulo) {
  const payload = {
    response_id: responseId,
    sections: [{ view_model: { primitive: { text: '> ' + titulo, __typename: 'GenAIMarkdownTextUXPrimitive' }, __typename: 'GenAISingleLayoutViewModel' } }],
    embedded_screens: [{ title: titulo, content: [{ __typename: 'FOAIDNixelButtonSheets', tabs: [{ id: 'tab_0', tab_header: titulo, sections: [{ __typename: 'GenAIUnifiedResponseSection', view_model: { __typename: 'GenAISingleLayoutViewModel', primitive: { __typename: 'GenAIaeacdsnwHtmlPrimitive', payload: html } } }] }] }]
    }]
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

const quote = (lines) => lines.filter(Boolean).map((l) => '> ' + l).join('\n');

async function openMenu(ctx) {
  const body = '🕹️ `• ARCADE 16:9`\n\n' + quote([GAMES.length + ' jogos de verdade, em tempo real, direto na conversa.', 'Painel em tela 16:9 com controles de toque.', 'Escolha um jogo na lista:']);
  const rows = GAMES.map((g) => ({ header: g.emoji + ' ' + g.tag, title: g.name, description: g.desc, id: 'sgm:play:' + g.id }));
  return nf.sendNative(ctx.sock, ctx.jid, {
    body: body, footer: '© ' + config.botName + ' • Arcade', quoted: ctx.msg, noFormat: true, fallback: body,
    buttons: [btn.list('🎮 Escolher jogo', [{ title: 'Jogos', rows: rows }])]
  });
}

const busy = new Set();
async function start(ctx, id) {
  const g = byId[id];
  if (!g) return ctx.reply('Jogo não encontrado. Use *!sega* para ver a lista.');
  const key = ctx.jid + '|' + ctx.sender + '|' + id;
  if (busy.has(key)) return; busy.add(key); setTimeout(() => busy.delete(key), 4000);
  let ok = true;
  try {
    const html = arcade.buildHtml(id);
    await ctx.sock.relayMessage(ctx.jid, montarMensagem(html, 'arcade-' + id + '-' + crypto.randomUUID(), g.emoji + ' ' + g.name.toUpperCase()), {});
  } catch (e) { ok = false; console.error('[ARCADE] painel:', e && e.message); }
  const body = ok
    ? g.emoji + ' `• ' + g.name.toUpperCase() + '`\n\n' + quote([g.desc, '🎮 ' + g.how, 'A tela abriu na mensagem acima.'])
    : '⚠️ Não consegui abrir o painel neste aparelho/versão do WhatsApp.';
  return nf.sendNative(ctx.sock, ctx.jid, {
    body: body, footer: '© ' + config.botName + ' • Arcade', quoted: ctx.msg, noFormat: true, fallback: body,
    buttons: [btn.reply('🕹️ Outros jogos', 'sgm:menu'), btn.reply('🔁 Abrir de novo', 'sgm:play:' + id)]
  });
}

/* Mantido por compatibilidade com o comando antigo !sairjogo (o painel agora é independente). */
async function stop(ctx) { return ctx.reply('🕹️ Os jogos agora abrem em painel: é só fechar a tela. Use *!sega* para jogar outro.'); }

router.register('sgm', async (ctx, rest) => {
  const p = String(rest || '').split(':');
  if (p[0] === 'menu') return openMenu(ctx);
  if (p[0] === 'play') return start(ctx, p[1]);
  if (p[0] === 'do') return ctx.reply('🕹️ Esse botão é de uma versão antiga. Use *!sega* para abrir o jogo no painel novo.'); // botões de mensagens antigas
});

module.exports = { openMenu: openMenu, start: start, stop: stop, GAMES: GAMES, montarMensagem: montarMensagem };
