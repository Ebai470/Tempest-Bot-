'use strict';
/**
 * NÚCLEO DO ARCADE — monta o menu e envia o painel HTML (jogos em tempo real) de uma divisão.
 * Usado por segaUi.js (clássicos 2D) e n64Ui.js (3D estilo 64 bits).
 * Crédito da estrutura da mensagem interativa (montarMensagem / embedded_screens): TIO INO
 */
const crypto = require('crypto');
const router = require('./router');
const nf = require('./nativeFlow');
const config = require('../config');
const arcade = require('../games/arcade');
const btn = nf.btn;

const byId = {};
arcade.GAMES.forEach((g) => { byId[g.id] = g; });

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
const busy = new Set();

function makeUi(o) {
  const GAMES = arcade.GAMES.filter((g) => g.k === o.kind);
  const foot = '© ' + config.botName + ' • ' + o.label;
  async function openMenu(ctx) {
    const body = o.emoji + ' `• ' + o.title + '`\n\n' + quote(o.intro.concat(['Escolha o jogo na lista:']));
    const rows = GAMES.map((g) => ({ header: g.emoji + ' ' + g.tag, title: g.name, description: g.desc, id: o.prefix + ':play:' + g.id }));
    return nf.sendNative(ctx.sock, ctx.jid, { body: body, footer: foot, quoted: ctx.msg, noFormat: true, fallback: body, buttons: [btn.list('🎮 Escolher jogo', [{ title: o.label, rows: rows }])] });
  }
  async function start(ctx, id) {
    const g = byId[id];
    if (!g) return ctx.reply('Jogo não encontrado. Use *!' + o.cmd + '* para ver a lista.');
    const key = ctx.jid + '|' + ctx.sender + '|' + id;
    if (busy.has(key)) return; busy.add(key); setTimeout(() => busy.delete(key), 4000);
    let ok = true;
    try {
      const html = arcade.buildHtml(id);
      await ctx.sock.relayMessage(ctx.jid, montarMensagem(html, 'arcade-' + id + '-' + crypto.randomUUID(), g.emoji + ' ' + g.name.toUpperCase()), {});
    } catch (e) { ok = false; console.error('[ARCADE] painel:', e && e.message); }
    const pre = g.k === '3d' ? o.prefix : o.prefix;
    const body = ok ? g.emoji + ' `• ' + g.name.toUpperCase() + '`\n\n' + quote([g.desc, '🎮 ' + g.how, 'A tela abriu na mensagem acima.']) : '⚠️ Não consegui abrir o painel neste aparelho/versão do WhatsApp.';
    return nf.sendNative(ctx.sock, ctx.jid, { body: body, footer: foot, quoted: ctx.msg, noFormat: true, fallback: body, buttons: [btn.reply('🕹️ Outros jogos', o.prefix + ':menu'), btn.reply('🔁 Abrir de novo', o.prefix + ':play:' + id)] });
  }
  async function stop(ctx) { return ctx.reply('🕹️ Os jogos abrem em painel: é só fechar a tela. Use *!' + o.cmd + '* para jogar outro.'); }
  router.register(o.prefix, async (ctx, rest) => {
    const p = String(rest || '').split(':');
    if (p[0] === 'menu') return openMenu(ctx);
    if (p[0] === 'play') return start(ctx, p[1]);
    if (p[0] === 'do') return ctx.reply('🕹️ Esse botão é de uma versão antiga. Use *!' + o.cmd + '* para abrir o jogo no painel novo.');
  });
  return { openMenu: openMenu, start: start, stop: stop, GAMES: GAMES };
}
module.exports = { makeUi: makeUi, montarMensagem: montarMensagem };
