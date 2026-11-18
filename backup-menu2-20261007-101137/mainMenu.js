'use strict';
const fs = require('fs');
const { btn, sendNative } = require('./nativeFlow');
const router = require('./router');
const config = require('../config');

const DESC = {
  grupo: 'Gerenciar e configurar o grupo',
  internet: 'Pesquisas, buscas e ferramentas da web',
  bn: 'Brincadeiras, jogos e interações',
  diversao: 'Zoeiras, frases e diversão',
  stickers: 'Figurinhas e conversões',
  imagem: 'Efeitos, banners e logos',
  seguranca: 'Antilink, mute, warn e mais',
  utilidades: 'Ferramentas e utilitários',
  rpg: 'Família, casamento e RPG',
  xp: 'Nível, ranking e XP',
  economia: 'Moedas, loja e trabalhos',
  aluguel: 'Planos e aluguel do bot',
  admin: 'Moderação e gestão do grupo',
  dono: 'Controle total do bot'
};
const IMG_ARG = { admin: 'adm', bn: 'brincadeiras', rpg: 'rpg' };
const GUARD = { admin: 'adm', dono: 'dono' };
const CMD_GUARD = { menuadm: 'adm', menudono: 'dono', menumodos: 'modos' };

function up() {
  const s = Math.floor(process.uptime());
  return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm ' + (s % 60) + 's';
}
function nice(t) { return String(t || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()); }
function quotable(ctx) { return (ctx.msg && ctx.msg.message && !ctx.msg.message.interactiveResponseMessage) ? ctx.msg : undefined; }
function cm() { try { return require('../services/commandMedia'); } catch (_) { return null; } }

async function allowed(ctx, tipo) {
  try {
    const { guardMenu } = require('../utils/menuAccess');
    if (typeof ctx.isGroupAdmin === 'function') { try { ctx.isAdmin = await ctx.isGroupAdmin(); } catch (_) {} }
    return await guardMenu(ctx, tipo);
  } catch (e) { return false; }
}

async function sendMedia(ctx, info, caption) {
  const buf = fs.readFileSync(info.file);
  const q = quotable(ctx);
  const mentions = ctx.sender ? [ctx.sender] : undefined;
  if (info.type === 'video' || info.type === 'gif') {
    return ctx.sock.sendMessage(ctx.jid, { video: buf, caption: caption, gifPlayback: info.type === 'gif', mimetype: info.mimetype || 'video/mp4', mentions: mentions }, { quoted: q });
  }
  return ctx.sock.sendMessage(ctx.jid, { image: buf, caption: caption, mimetype: info.mimetype || 'image/jpeg', mentions: mentions }, { quoted: q });
}

async function runCmd(ctx, name, args) {
  const registry = require('../commands/registry');
  const e = registry.get(name);
  if (!e || typeof e.handler !== 'function') return;
  const g = CMD_GUARD[e.name];
  if (g && !(await allowed(ctx, g))) return;
  ctx.args = args || [];
  ctx.prefix = ctx.prefix || (config.prefixes && config.prefixes[0]) || '!';
  const names = [e.name].concat(e.aliases || []);
  let wrap = null;
  const media = cm();
  try { if (media) wrap = media.wrapContext(ctx, e.name, ctx.args, names); } catch (_) {}
  await e.handler(ctx);
  try {
    const ca = require('../services/commandAudio');
    const a = ca.resolve(e.name, ctx.args, names);
    if (a) await ca.sendAudio(ctx, a);
  } catch (_) {}
  try { if (wrap && wrap.info && !wrap.used && !wrap.hadError) await media.sendOnly(ctx, wrap.info); } catch (_) {}
}

async function buildRows(ctx) {
  const registry = require('../commands/registry');
  const { CATEGORY_META } = require('../utils/menu');
  const rows = [];
  const row = (emoji, name, desc, id) => rows.push({ header: emoji + ' ' + name, title: name, description: desc, id: id });
  row('📥', 'Downloads', 'Músicas, vídeos, TikTok, Insta e mais', 'mn:cmd:menudownload');
  row('🎮', 'Mini Games', 'Jogos web, velha, ligue 4', 'mn:cmd:menuwebgames');
  for (const k of Object.keys(CATEGORY_META)) {
    if (['custom', 'outros', 'jogos', 'admin', 'dono'].indexOf(k) >= 0) continue;
    let n = 0;
    try { n = registry.getByCategory(k).length; } catch (_) {}
    if (n <= 0) continue;
    const m = CATEGORY_META[k];
    row(m.emoji || '📁', nice(String(m.title).replace(/^MENU\s+/i, '')), DESC[k] || 'Comandos de ' + nice(k), 'mn:cat:' + k);
  }
  let owner = false, adm = false;
  try { owner = !!ctx.isOwner(); } catch (_) {}
  try { adm = owner || (ctx.isGroup && (await ctx.isGroupAdmin())); } catch (_) {}
  if (adm) row('🛡️', 'ADM', DESC.admin, 'mn:cat:admin');
  if (owner) row('💠', 'Dono', DESC.dono, 'mn:cat:dono');
  if (rows[0]) rows[0].highlight_label = 'Escolha um';
  return rows;
}

async function openMain(ctx) {
  const pref = (ctx.prefix && ctx.prefix.trim()) || (config.prefixes && config.prefixes[0]) || '!';
  const num = String(ctx.sender || '').split('@')[0].split(':')[0];
  const rows = await buildRows(ctx);
  const body =
    '╭━━━━〔 ⚡ *' + config.botName + '* 〕━━━━╮\n' +
    '┃ 👋 Olá, @' + num + '\n' +
    '┃ ⏱️ Online » *' + up() + '*\n' +
    '┃ 🔰 Prefixo » *[ ' + pref + ' ]*\n' +
    '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +
    '✨ Toque em *Abrir Opções* e escolha um menu.';
  let image = null;
  try { const media = cm(); const info = media && media.get('menu'); if (info && info.type === 'image') image = fs.readFileSync(info.file); } catch (_) {}
  if (image) ctx.__tpMediaUsed = true;

  await sendNative(ctx.sock, ctx.jid, {
    title: '⚡ ' + config.botName,
    body: body,
    footer: '© ' + config.botName + ' • Menu interativo',
    image: image,
    mentions: ctx.sender ? [ctx.sender] : [],
    quoted: ctx.msg,
    buttons: [
      btn.channel('📢 Canal Oficial'),
      btn.list('☰ Abrir Opções', [
        { title: '📂 Menus de Comandos', rows: rows },
        { title: '⚡ Atalhos', rows: [
          { header: '🏓 Ping', title: 'Ping', description: 'Ver se o bot está online', id: 'mn:cmd:ping' },
          { header: '📝 Texto', title: 'Texto', description: 'Menu em texto', id: 'mn:txt' }
        ] }
      ]),
      btn.copy('📋 Copiar Prefixo [ ' + pref + ' ]', pref)
    ],
    fallback: require('../utils/menu').generateMainMenu(ctx)
  });
}

async function openCategory(ctx, cat) {
  if (GUARD[cat] && !(await allowed(ctx, GUARD[cat]))) return;
  const { generateCategoryMenu } = require('../utils/menu');
  const text = generateCategoryMenu(cat, ctx);
  const nav = [btn.reply('🔙 Voltar ao Menu', 'mn:home'), btn.channel('📢 Canal Oficial')];
  let info = null;
  try { const media = cm(); if (media) info = media.resolve('menu', [IMG_ARG[cat] || cat], ['menu', 'help', 'ajuda', 'comandos']); } catch (_) {}
  const foot = '© ' + config.botName;
  if (info && info.type === 'image' && text.length <= 1500) {
    return sendNative(ctx.sock, ctx.jid, { body: text, footer: foot, image: fs.readFileSync(info.file), buttons: nav, mentions: ctx.sender ? [ctx.sender] : [], fallback: text });
  }
  if (info) {
    try { await sendMedia(ctx, info, text); }
    catch (e) { await ctx.sock.sendMessage(ctx.jid, { text: text }, { quoted: quotable(ctx) }); }
    return sendNative(ctx.sock, ctx.jid, { body: '👆 Menu acima. Quer voltar?', footer: foot, buttons: nav });
  }
  if (text.length <= 1800) {
    return sendNative(ctx.sock, ctx.jid, { body: text, footer: foot, buttons: nav, mentions: ctx.sender ? [ctx.sender] : [], fallback: text });
  }
  await ctx.sock.sendMessage(ctx.jid, { text: text }, { quoted: quotable(ctx) });
  return sendNative(ctx.sock, ctx.jid, { body: '👆 Menu acima. Quer voltar?', footer: foot, buttons: nav });
}

router.register('mn', async (ctx, rest) => {
  if (rest === 'home') return openMain(ctx);
  if (rest === 'txt') {
    const { generateMainMenu } = require('../utils/menu');
    const media = cm();
    try { if (media) media.wrapContext(ctx, 'menu', [], ['menu', 'help', 'ajuda', 'comandos']); } catch (_) {}
    await ctx.reply(generateMainMenu(ctx), { mentions: ctx.sender ? [ctx.sender] : undefined });
    return;
  }
  if (rest.startsWith('cat:')) return openCategory(ctx, rest.slice(4));
  if (rest.startsWith('cmd:')) return runCmd(ctx, rest.slice(4), []);
});

module.exports = { openMain, openCategory, runCmd };
