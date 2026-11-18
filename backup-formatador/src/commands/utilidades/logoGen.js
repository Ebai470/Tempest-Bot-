'use strict';
const { renderLogo, NAMES, cleanText } = require('../../services/logoEngine');
let busy = false;
const last = new Map();
const pref = (ctx) => (ctx.prefix && String(ctx.prefix).trim()) || '!';

function quotedText(ctx) { const q = ctx.quoted; return q ? (q.conversation || (q.extendedTextMessage && q.extendedTextMessage.text) || '') : ''; }

async function usage(ctx, name) {
  const p = pref(ctx), txt = '🎨 *Logo ' + name + '*\nEnvie o texto junto do comando:\n*' + p + name + ' Seu Texto*';
  try {
    const { btn, sendNative } = require('../../interactive/nativeFlow');
    return await sendNative(ctx.sock, ctx.jid, {
      body: txt, footer: '© ' + (require('../../config').botName), quoted: ctx.msg, fallback: txt,
      buttons: [btn.reply('✨ Usar meu nome', 'lg2:me:' + name), btn.copy('📋 Copiar comando', p + name + ' '), btn.reply('🎨 Menu Logo', 'mn:cmd:menulogo')]
    });
  } catch (_) { return ctx.reply(txt); }
}

async function run(ctx, name) {
  const text = cleanText((ctx.args || []).join(' ') || quotedText(ctx));
  if (!text) return usage(ctx, name);
  if (busy) return ctx.reply('⏳ Já estou criando um logo. Aguarde alguns segundos.');
  const who = String(ctx.sender || ctx.jid);
  if (last.has(who) && Date.now() - last.get(who) < 5000) return ctx.reply('⏳ Aguarde alguns segundos para criar outro.');
  last.set(who, Date.now()); busy = true;
  try {
    try { if (ctx.msg && ctx.msg.key) await ctx.sock.sendMessage(ctx.jid, { react: { text: '🎨', key: ctx.msg.key } }); } catch (_) {}
    const img = await renderLogo(name, text);
    await ctx.sock.sendMessage(ctx.jid, { image: img, mimetype: 'image/jpeg', caption: '🎨 *' + name + '* • ' + text }, { quoted: ctx.msg });
  } catch (e) {
    await ctx.reply('❌ Não consegui criar o logo.\n' + String((e && e.message) || e).slice(0, 140));
  } finally { busy = false; }
}

try {
  require('../../interactive/router').register('lg2', async (ctx, rest) => {
    const p = rest.split(':');
    if (p[0] !== 'me') return;
    const e = require('../registry').get(p[1]);
    if (!e) return;
    ctx.args = [String((ctx.msg && ctx.msg.pushName) || '').trim() || 'Tempest'];
    ctx.prefix = ctx.prefix || '!';
    return e.handler(ctx);
  });
} catch (_) {}

module.exports = NAMES.map((name) => ({
  name: name, aliases: [], category: 'logo', description: 'Logo/efeito: ' + name, usage: '!' + name + ' <texto>',
  async handler(ctx) { return run(ctx, name); }
}));
