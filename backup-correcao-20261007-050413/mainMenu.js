'use strict';
const { btn, sendNative } = require('./nativeFlow');
const router = require('./router');
const config = require('../config');

function up() {
  const s = Math.floor(process.uptime());
  return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm ' + (s % 60) + 's';
}

function cats() {
  const registry = require('../commands/registry');
  const { CATEGORY_META } = require('../utils/menu');
  const out = [];
  for (const k of Object.keys(CATEGORY_META)) {
    if (k === 'custom' || k === 'outros') continue;
    let n = 0;
    try { n = registry.getByCategory(k).length; } catch (_) {}
    if (n > 0) out.push({ id: k, meta: CATEGORY_META[k], n: n });
  }
  return out;
}

function nice(t) { return String(t || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()); }

async function openMain(ctx) {
  const registry = require('../commands/registry');
  const total = (registry.stats() || {}).totalMain || '?';
  const pref = (ctx.prefix && ctx.prefix.trim()) || (config.prefixes && config.prefixes[0]) || '!';
  const num = String(ctx.sender || '').split('@')[0];
  const rows = cats().map((c) => ({
    header: '', id: 'mn:cat:' + c.id,
    title: (c.meta.emoji || '') + ' ' + nice(c.meta.title.replace(/^MENU\s+/i, '')),
    description: c.n + ' comandos'
  }));
  rows.unshift({ header: '', id: 'mn:cmd:menudownload', title: '📥 Downloads', description: 'Músicas, vídeos, TikTok, Insta e mais' });
  rows.push({ header: '', id: 'mn:cmd:menuwebgames', title: '🎮 Mini Games', description: 'Jogos web, velha, ligue 4' });

  const body =
    '╭━━━━〔 ⚡ *' + config.botName + '* 〕━━━━╮\n' +
    '┃ 👋 Olá, @' + num + '\n' +
    '┃ 🧩 Comandos » *' + total + '*\n' +
    '┃ ⏱️ Online » *' + up() + '*\n' +
    '┃ 🔰 Prefixo » *[ ' + pref + ' ]*\n' +
    '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +
    '✨ Toque em *Abrir Opções* e escolha um menu.';

  await sendNative(ctx.sock, ctx.jid, {
    title: '⚡ ' + config.botName,
    body: body,
    footer: '© ' + config.botName + ' • Menu interativo',
    mentions: ctx.sender ? [ctx.sender] : [],
    quoted: ctx.msg,
    buttons: [
      btn.channel('📢 Canal Oficial'),
      btn.list('☰ Abrir Opções', [{ title: '📂 Menus de Comandos', highlight_label: 'Escolha um', rows: rows }]),
      btn.copy('📋 Copiar Prefixo [ ' + pref + ' ]', pref)
    ],
    fallback: require('../utils/menu').generateMainMenu(ctx)
  });
}

async function openCategory(ctx, cat) {
  const { generateCategoryMenu } = require('../utils/menu');
  const text = generateCategoryMenu(cat, ctx);
  const nav = [btn.reply('🔙 Voltar ao Menu', 'mn:home'), btn.channel('📢 Canal Oficial')];
  if (text.length <= 1800) {
    return sendNative(ctx.sock, ctx.jid, { body: text, footer: '© ' + config.botName, buttons: nav, quoted: ctx.msg, fallback: text });
  }
  await ctx.sock.sendMessage(ctx.jid, { text: text }, { quoted: ctx.msg });
  return sendNative(ctx.sock, ctx.jid, { body: '👆 Menu acima. Quer voltar?', footer: '© ' + config.botName, buttons: nav });
}

router.register('mn', async (ctx, rest) => {
  if (rest === 'home') return openMain(ctx);
  if (rest.startsWith('cat:')) return openCategory(ctx, rest.slice(4));
  if (rest.startsWith('cmd:')) {
    const registry = require('../commands/registry');
    const e = registry.get(rest.slice(4));
    if (e && typeof e.handler === 'function') {
      ctx.prefix = ctx.prefix || (config.prefixes[0] || '!');
      return e.handler(ctx);
    }
  }
});

module.exports = { openMain, openCategory };
