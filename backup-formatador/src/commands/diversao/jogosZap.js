'use strict';
/**
 * JOGOS NO WHATSAPP — comando novo e isolado (não altera o menu !jogos existente).
 *  • Modo 1 (WhatsApp): o bot cria uma tela dentro da mensagem interativa e abre o jogo nela.
 *  • Modo 2 (navegador): botão que abre o mesmo jogo no navegador.
 * Crédito da estrutura da mensagem interativa (montarMensagem / embedded_screens): TIO INO
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nf = require('../../interactive/nativeFlow');
const router = require('../../interactive/router');
const config = require('../../config');
const btn = nf.btn;

const PAGE = 30;
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Lê a lista dos 60 jogos do próprio jogosWeb.js (sem alterá-lo) */
let CACHE = null;
function pick(line, key) {
  const m = line.match(new RegExp(key + ":\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|\"((?:[^\"\\\\]|\\\\.)*)\")"));
  return m ? (m[1] !== undefined ? m[1] : m[2]).replace(/\\'/g, "'") : '';
}
function games() {
  if (CACHE) return CACHE;
  const out = [];
  try {
    const src = fs.readFileSync(path.join(__dirname, 'jogosWeb.js'), 'utf8');
    src.split('\n').forEach((l) => {
      const n = l.match(/^\s*\{\s*n:\s*(\d+)/);
      if (!n) return;
      const url = pick(l, 'url');
      if (!/^https?:\/\//.test(url)) return;
      out.push({ n: parseInt(n[1], 10), nome: pick(l, 'nome'), short: pick(l, 'short'), tipo: pick(l, 'tipo'), multi: pick(l, 'multi'), url: url });
    });
  } catch (e) { console.error('[JOGOSZAP] ler lista:', e && e.message); }
  CACHE = out;
  return out;
}
const byN = (n) => games().find((g) => g.n === n) || null;

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

/* Tela do navegador do jogo (moldura dentro da mensagem) */
function gameHtml(g) {
  const u = esc(g.url), nm = esc(g.nome);
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>'
    + '*{box-sizing:border-box}html,body{margin:0;background:#000;color:#fff;font-family:-apple-system,Roboto,Arial,sans-serif}'
    + '#w{position:relative;height:380px;overflow:hidden;background:#000}'
    + '#bar{position:relative;z-index:2;height:38px;display:flex;align-items:center;gap:8px;padding:0 10px;background:#1c1c1e;font-size:13px}'
    + '#bar b{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '#bar button,#bar a{border:0;background:#3a3a3c;color:#fff;border-radius:8px;padding:6px 10px;font-size:13px;text-decoration:none}'
    + '#msg{position:absolute;left:0;right:0;top:38px;height:342px;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-size:13px;line-height:1.5;color:#aaa}'
    + 'iframe{position:absolute;left:0;top:38px;width:100%;height:342px;border:0;background:transparent;z-index:1}'
    + '</style></head><body><div id="w">'
    + '<div id="bar"><b>🎮 ' + nm + '</b><button id="rl">↻</button><button id="fs">⛶</button><a href="' + u + '" target="_blank" rel="noopener">🌐</a></div>'
    + '<div id="msg"><div>⏳ Carregando o jogo…<br>Se nada aparecer, este site não permite abrir aqui.<br>Use o botão <b>🌐 Abrir no navegador</b> da mensagem.<br><small style="opacity:.6">Estrutura da mensagem: TIO INO</small></div></div>'
    + '<iframe id="f" src="' + u + '" allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope; clipboard-write" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>'
    + '<script>(function(){var f=document.getElementById("f");'
    + 'document.getElementById("rl").onclick=function(){f.src=f.src};'
    + 'document.getElementById("fs").onclick=function(){try{(f.requestFullscreen||f.webkitRequestFullscreen).call(f)}catch(e){}}})();</script></body></html>';
}

const row = (g) => ({ header: '', title: clip(g.nome, 60), description: clip(g.short, 70), id: 'wz:' + g.n });
function menuOpts(ctx, page) {
  const all = games(), start = page * PAGE, slice = all.slice(start, start + PAGE), secs = [];
  for (let i = 0; i < slice.length; i += 10) {
    const part = slice.slice(i, i + 10);
    secs.push({ title: '🎮 Jogos ' + part[0].n + '–' + part[part.length - 1].n, rows: part.map(row) });
  }
  const buttons = [btn.list('🎮 Escolher jogo', secs)];
  if (start + slice.length < all.length) buttons.push(btn.reply('➕ Mais jogos', 'wz:p:' + (page + 1)));
  else if (page > 0) buttons.push(btn.reply('⬅️ Primeiros jogos', 'wz:p:0'));
  buttons.push(btn.reply('🎲 Surpreenda-me', 'wz:r'));
  const body = '╭━━〔 📱 JOGAR NO WHATSAPP 〕━━╮\n┃ ' + all.length + ' jogos na própria conversa\n┃ 👇 Toque em *Escolher jogo*\n┃ (também dá para abrir no navegador)\n╰━━━━━━━━━━━━━━━━━━╯';
  return { body: body, footer: '© ' + config.botName + ' • Jogos no WhatsApp', quoted: ctx.msg, fallback: body, buttons: buttons };
}

const busy = new Set();
async function play(ctx, n) {
  const g = byN(n);
  if (!g) return ctx.reply('❌ Jogo não encontrado. Use *!jogoszap* para ver a lista.');
  const key = ctx.sender + ':' + n;
  if (busy.has(key)) return; busy.add(key); setTimeout(() => busy.delete(key), 4000);
  let sent = true;
  try {
    await ctx.sock.relayMessage(ctx.jid, montarMensagem(gameHtml(g), 'jogo-' + n + '-' + crypto.randomUUID(), '🎮 ' + g.nome), {});
  } catch (e) { sent = false; console.error('[JOGOSZAP] tela:', e && e.message); }
  const body = '🎮 *' + g.nome + '*\n' + g.tipo + ' • Multiplayer: ' + g.multi + '\n\n'
    + (sent ? '📱 A tela do jogo foi aberta na mensagem acima.\n🌐 Se ficar em branco, use *Abrir no navegador*.' : '⚠️ Não consegui abrir a tela aqui. Use *Abrir no navegador*.');
  return nf.sendNative(ctx.sock, ctx.jid, {
    body: body, footer: '© ' + config.botName + ' • Jogos no WhatsApp', quoted: ctx.msg, fallback: body + '\n' + g.url,
    buttons: [btn.url('🌐 Abrir no navegador', g.url), btn.reply('📋 Ver lista', 'wz:p:0'), btn.reply('🎲 Outro jogo', 'wz:r')]
  });
}

router.register('wz', async (ctx, rest) => {
  const p = String(rest || '').split(':');
  if (p[0] === 'p') return nf.sendNative(ctx.sock, ctx.jid, menuOpts(ctx, Math.max(0, parseInt(p[1], 10) || 0)));
  if (p[0] === 'r') { const all = games(); if (!all.length) return; return play(ctx, all[Math.floor(Math.random() * all.length)].n); }
  const n = parseInt(p[0], 10);
  if (n) return play(ctx, n);
});

module.exports = [
  {
    name: 'jogoszap', aliases: ['zapjogos', 'jogoswa'], category: 'jogos', hideFromMenu: false,
    description: 'Menu de jogos para jogar dentro do WhatsApp (e no navegador)', usage: '!jogoszap',
    handler: async (ctx) => {
      if (!games().length) return ctx.reply('❌ Não encontrei a lista de jogos (jogosWeb.js).');
      return nf.sendNative(ctx.sock, ctx.jid, menuOpts(ctx, 0));
    }
  },
  {
    name: 'jogozap', aliases: ['zapjogo'], category: 'jogos', hideFromMenu: true,
    description: 'Abre o jogo N dentro do WhatsApp', usage: '!jogozap 8',
    handler: async (ctx) => {
      const n = parseInt(String((ctx.args && ctx.args[0]) || '').replace(/\D/g, ''), 10);
      if (!n) return ctx.reply('Use: *!jogozap 8* (número de 1 a 60). Lista: *!jogoszap*');
      return play(ctx, n);
    }
  }
];
