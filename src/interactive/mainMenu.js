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
  row('🎨', 'Menu Logo', 'Logos e efeitos', 'mn:cmd:menulogo');
  row('🔞', 'Menu +18', 'Conteúdo adulto (restrito)', 'mn:cmd:menuhentai');
  row('🕹️', 'Jogos Interativos', 'Velha, Connect 4, PPT, forca e mais', 'rp:games'); // TP_ROWS2
  row('🌌', 'RPG Isekai', 'Aventura, personagem, guilda e mais', 'rp:isk:home');
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

function tpDateTime() {
  const tz = config.timezone || 'Africa/Maputo';
  const d = new Date();
  try {
    return { date: d.toLocaleDateString('pt-BR', { timeZone: tz }), time: d.toLocaleTimeString('pt-BR', { timeZone: tz, hour12: false }) };
  } catch (_) {
    return { date: d.toLocaleDateString('pt-BR'), time: d.toLocaleTimeString('pt-BR') };
  }
}

// assinatura (aluguel) do grupo: mesma tabela que o bot ja usa para liberar comandos
function tpSubInfo(ctx) {
  if (!ctx.isGroup) return null;
  try {
    const db = require('../database').getDb();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE group_jid = ?').get(ctx.jid);
    if (!sub) return { active: false, text: 'sem assinatura' };
    const end = new Date(sub.end_date);
    const endMs = end.getTime();
    if (sub.status === 'active' && endMs > Date.now()) {
      const days = Math.ceil((endMs - Date.now()) / 86400000);
      return { active: true, endMs: endMs, text: 'até ' + end.toLocaleDateString('pt-BR', { timeZone: config.timezone || 'Africa/Maputo' }) + ' (' + days + (days === 1 ? ' dia)' : ' dias)') };
    }
    return { active: false, text: 'expirada' };
  } catch (_) { return null; }
}

async function openMain(ctx) { // TP_MENUTHEME
  const nf = require('./nativeFlow');
  const MT = require('./menuTheme');
  const on = MT.langOn(ctx.jid);
  const S = (t, m) => MT.sc(t, m || 'title', on);
  const pref = (ctx.prefix && ctx.prefix.trim()) || (config.prefixes && config.prefixes[0]) || '!';
  const num = String(ctx.sender || '').split('@')[0].split(':')[0];
  const nome = (ctx.msg && ctx.msg.pushName) || num;
  const dt = tpDateTime();
  const sub = tpSubInfo(ctx);
  const rows = await buildRows(ctx);
  const W = '𓆩💮𓆪'; // TP_MENUV2
  const F = (k, v) => W + ' ' + S(k) + ' » ' + v;
  const body =
    W + ' ·˚₊✦ ' + S('Temp Bot') + ' ✦₊˚· ' + W + '\n\n' +
    F('Usuario', nome) + '\n' +
    F('Dono', nf.getEnv('DONO_EXIBIR') || '+258874288439') + '\n' +
    F('Data', dt.date) + '\n' +
    F('Hora', dt.time) + '\n' +
    F('Uptime', up()) + '\n' +
    F('Prefixo', '[ ' + pref + ' ]') + '\n\n' +
    '·⁺✧ 💖 ' + S('use o prefixo', 'all') + ' 💖 ✧⁺·\n' +
    '⍟ ︵˚💮˚︵ ⍟';
  const footer = '·✦· ' + W + ' ' + S('Tempest Bot') + ' ' + W + ' ·✦·';
  let image = null, video = null, gifPlay = false; // TP_VID
  try { const media = cm(); const info = media && media.get('menu'); if (info) { if (info.type === 'image') image = fs.readFileSync(info.file); else if (info.type === 'video' || info.type === 'gif') { video = fs.readFileSync(info.file); gifPlay = info.type === 'gif'; } } } catch (_) {}
  if (image || video) ctx.__tpMediaUsed = true;

  // cartao "Termina no dia ..." (TP_CARD2): vencimento do aluguel; sem aluguel ativo usa data de reserva
  let expMs = null;
  if (sub && sub.active) expMs = sub.endMs;
  else if (!nf.getEnv('MENU_CARD_SO_ALUGUEL')) expMs = Date.now() + (parseInt(nf.getEnv('MENU_CARD_DIAS'), 10) || 30) * 86400000;
  let messageParams;
  if (expMs) {
    const exp = nf.getEnv('OFFER_SECONDS') ? Math.floor(expMs / 1000) : expMs;
    messageParams = { limited_time_offer: { text: '⋆✦⋆ Tempest ⋆✦⋆', url: nf.CHANNEL_URL, copy_code: '© Tempest', expiration_time: exp } };
  }

  const _mb = require('./menuButtons').build(on, rows, pref); // TP_MENUBTNS
  messageParams = Object.assign({}, messageParams || {}, _mb.params);
  await sendNative(ctx.sock, ctx.jid, {
    body: body,
    footer: footer,
    noFormat: true,
    image: image, video: video, gifPlayback: gifPlay, onMediaFail: () => { ctx.__tpMediaUsed = false; },
    messageParams: messageParams,
    quoted: ctx.msg,
    buttons: _mb.buttons, // TP_MENUBTNS
    fallback: require('../utils/menu').generateMainMenu(ctx)
  });
}

async function openCategory(ctx, cat) {
  try { if (await require('./rpgUi').open(ctx, cat)) return; } catch (e) { console.error('[catUi]', e && e.message); }
  if (GUARD[cat] && !(await allowed(ctx, GUARD[cat]))) return;
  const { generateCategoryMenu } = require('../utils/menu');
  const text = generateCategoryMenu(cat, ctx);
  const nav = require('./menuTheme').nav(require('./menuTheme').langOn(ctx.jid));
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
  if (rest === 'owner') {
    const n = String(require('./nativeFlow').getEnv('DONO_EXIBIR') || '+258874288439').replace(/\D/g, '');
    const vcard = 'BEGIN:VCARD\nVERSION:3.0\nFN:👑 Dono • ' + config.botName + '\nTEL;type=CELL;type=VOICE;waid=' + n + ':+' + n + '\nEND:VCARD';
    await ctx.sock.sendMessage(ctx.jid, { contacts: { displayName: '👑 Dono', contacts: [{ vcard: vcard }] } });
    return;
  }
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
