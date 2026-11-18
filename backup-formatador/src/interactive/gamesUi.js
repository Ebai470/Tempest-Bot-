'use strict';
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const CELLS = ['↖️ Cima esquerda', '⬆️ Cima meio', '↗️ Cima direita', '⬅️ Meio esquerda', '⏺️ Centro', '➡️ Meio direita', '↙️ Baixo esquerda', '⬇️ Baixo meio', '↘️ Baixo direita'];

function accept(text, mentions, aceitar, recusar) {
  return {
    body: text,
    mentions: mentions,
    buttons: [btn.reply('✅ Aceitar', 'gm:cmd:' + aceitar), btn.reply('🚫 Recusar', 'gm:cmd:' + recusar), btn.channel('📢 Canal')]
  };
}

const RULES = {
  velha: [
    { test: (t) => /aceitarvelha/i.test(t),
      build: (t, m) => accept(t.replace(/[^\n]*aceitarvelha[^\n]*\n?[^\n]*recusarvelha[^\n]*/i, '👇 *Toque em um botão abaixo*'), m, 'aceitarvelha', 'recusarvelha') },
    { test: (t) => /j1/i.test(t) && /j9/i.test(t) && !/venceu|empate/i.test(t),
      build: (t, m) => ({
        body: t.replace(/\*?(Digite|digite) \*?j1\*?(-| até )\*?j9\*?\*?/g, '👇 *Escolha uma casa*'),
        mentions: m,
        buttons: [
          btn.list('🎯 Escolher casa', [{ title: '⭕ Jogo da Velha', rows: CELLS.map((c, i) => ({ header: '', title: 'Casa ' + (i + 1), description: c, id: 'gm:cmd:j' + (i + 1) })) }]),
          btn.reply('🚫 Cancelar jogo', 'gm:cmd:cancelarvelha')
        ]
      }) }
  ],
  c4: [
    { test: (t) => /aceitar4/i.test(t),
      build: (t, m) => accept(t.replace(/[^\n]*aceitar4[^\n]*\n?[^\n]*recusar4[^\n]*/i, '👇 *Toque em um botão abaixo*'), m, 'aceitar4', 'recusar4') },
    { test: (t) => /(vez de|partida iniciada|digita)/i.test(t) && !/FIM DE JOGO|EMPATE|venceu|cancelado/i.test(t),
      build: (t, m) => ({
        body: t.replace(/\n\n> [^\n]*(\n> [^\n]*)?/g, ''),
        mentions: m,
        buttons: [
          btn.list('🔴 Escolher coluna', [{ title: '🔴 Connect 4', rows: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ header: '', title: 'Coluna ' + n, description: 'Soltar a peça na coluna ' + n, id: 'gm:cmd:' + n })) }]),
          btn.reply('🚫 Cancelar jogo', 'gm:cmd:cancelar4')
        ]
      }) }
  ],
  ppt: [
    { test: (t) => /PPT/.test(t) && /Bot:/.test(t),
      build: (t, m) => ({ body: t, mentions: m, buttons: [btn.reply('🔁 Jogar de novo', 'gm:cmd:ppt')] }) }
  ]
};

function hook(ctx, rules) {
  const orig = ctx.reply.bind(ctx);
  ctx.reply = async function (text, opts) {
    try {
      if (String(getEnv('GAME_BUTTONS') || '').toLowerCase() !== 'off' && typeof text === 'string') {
        for (const r of rules) {
          if (r.test(text)) {
            const m = (opts && opts.mentions) || [];
            const b = r.build(text, m);
            return await sendNative(ctx.sock, ctx.jid, Object.assign({ footer: '© ' + config.botName + ' • Jogos', quoted: ctx.msg, fallback: text }, b));
          }
        }
      }
    } catch (e) { console.error('[game-ui]', e && e.message); }
    return orig(text, opts);
  };
  return function restore() { delete ctx.reply; };
}

function wrap(name, rules) {
  const e = registry.get(name);
  if (!e || e.__tpGame) return;
  const orig = e.handler;
  e.handler = async function (ctx) {
    const restore = hook(ctx, rules);
    try { return await orig.call(this, ctx); } finally { restore(); }
  };
  e.__tpGame = true;
}

['jogodavelha', 'aceitarvelha', 'j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7', 'j8', 'j9'].forEach((n) => wrap(n, RULES.velha));
['connect4', 'aceitar4', '1', '2', '3', '4', '5', '6', '7'].forEach((n) => wrap(n, RULES.c4));

(function () {
  const e = registry.get('ppt');
  if (!e || e.__tpGame) return;
  const orig = e.handler;
  e.handler = async function (ctx) {
    if (!(ctx.args && ctx.args[0]) && String(getEnv('GAME_BUTTONS') || '').toLowerCase() !== 'off') {
      return sendNative(ctx.sock, ctx.jid, {
        title: '✊ PPT', body: '✊📄✂️ *Pedra, Papel ou Tesoura*\n\n👇 Escolha sua jogada:', footer: '© ' + config.botName + ' • Jogos',
        quoted: ctx.msg, fallback: 'Use: ppt pedra | ppt papel | ppt tesoura',
        buttons: [btn.reply('🪨 Pedra', 'gm:arg:ppt:pedra'), btn.reply('📄 Papel', 'gm:arg:ppt:papel'), btn.reply('✂️ Tesoura', 'gm:arg:ppt:tesoura')]
      });
    }
    const restore = hook(ctx, RULES.ppt);
    try { return await orig.call(this, ctx); } finally { restore(); }
  };
  e.__tpGame = true;
})();

(function () {
  const e = registry.get('advinha');
  if (!e || e.__tpGame) return;
  const orig = e.handler;
  e.handler = async function (ctx) {
    if (!(ctx.args && ctx.args[0]) && String(getEnv('GAME_BUTTONS') || '').toLowerCase() !== 'off') {
      return sendNative(ctx.sock, ctx.jid, {
        title: '🔢 ADVINHA', body: '🔢 *Adivinhe o número*\n\nEstou pensando em um número de 1 a 10…', footer: '© ' + config.botName + ' • Jogos',
        quoted: ctx.msg, fallback: 'Escolha um número de 1 a 10.\nEx: advinha 7',
        buttons: [btn.list('🎲 Escolher número', [{ title: 'Números', rows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ header: '', title: String(n), description: 'Apostar no número ' + n, id: 'gm:arg:advinha:' + n })) }])]
      });
    }
    return orig.call(this, ctx);
  };
  e.__tpGame = true;
})();

router.register('gm', async (ctx, rest) => {
  const parts = rest.split(':');
  const kind = parts[0];
  let name, args = [];
  if (kind === 'cmd') name = parts[1];
  else if (kind === 'arg') { name = parts[1]; args = [parts[2]]; }
  else return;
  const e = registry.get(name);
  if (!e || typeof e.handler !== 'function') return;
  ctx.args = args;
  ctx.prefix = ctx.prefix || (config.prefixes[0] || '!');
  return e.handler(ctx);
});

module.exports = { RULES };
