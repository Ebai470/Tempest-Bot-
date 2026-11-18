'use strict';
/**
 * PAINEL TEMPEST — menu no estilo "gaveta" (bottom sheet).
 *  • Mensagem com cartão de informações e 2 botões à vista: Canal Oficial + Abrir Opções.
 *  • "Abrir Opções" sobe uma gaveta com todas as opções (link, listas, responder, copiar).
 *  • "Menus de Comandos" e "Mini Games" abrem listas com seções, descrição e botão Selecionar.
 * Comando novo e isolado: !painel (aliases: !opcoes, !menu2). O !menu existente NÃO é alterado.
 * Todos os botões usam destinos que o menu atual já trata (mn:*, rp:*).
 */
const fs = require('fs');
const nf = require('../../interactive/nativeFlow');
const config = require('../../config');
const btn = nf.btn;

const DESC = {
  grupo: 'Gerenciar e configurar o grupo', internet: 'Pesquisas, buscas e ferramentas da web', bn: 'Brincadeiras, jogos e interações',
  diversao: 'Zoeiras, frases e diversão', stickers: 'Figurinhas e conversões', imagem: 'Efeitos, banners e logos',
  seguranca: 'Antilink, mute, warn e mais', utilidades: 'Ferramentas e utilitários', rpg: 'Família, casamento e RPG',
  xp: 'Nível, ranking e XP', economia: 'Moedas, loja e trabalhos', aluguel: 'Planos e aluguel do bot',
  admin: 'Moderação e gestão do grupo', dono: 'Controle total do bot'
};
const nice = (t) => String(t || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const reg = () => require('../registry');
const has = (name) => { try { const e = reg().get(name); return !!(e && typeof e.handler === 'function'); } catch (_) { return false; } };

function upt() {
  const s = Math.floor(process.uptime()), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return (d ? d + 'd ' : '') + h + 'h ' + m + 'm ' + (s % 60) + 's';
}
function totalCmds() {
  try { const r = reg(); if (typeof r.all === 'function') return r.all().length; if (r.commands && r.commands.size) return r.commands.size; } catch (_) {}
  return 0;
}
function pkgVersion() { try { return require('../../../package.json').version; } catch (_) { return '1.0'; } }

function subInfo(ctx) {
  if (!ctx.isGroup) return null;
  try {
    const db = require('../../database').getDb();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE group_jid = ?').get(ctx.jid);
    if (!sub) return { active: false, text: 'sem assinatura' };
    const endMs = new Date(sub.end_date).getTime();
    if (sub.status === 'active' && endMs > Date.now()) return { active: true, endMs: endMs, text: 'ativo' };
    return { active: false, text: 'expirada' };
  } catch (_) { return null; }
}

async function menuRows(ctx) {
  const registry = reg();
  const { CATEGORY_META } = require('../../utils/menu');
  const rows = [];
  const row = (emoji, name, desc, id) => rows.push({ header: emoji + ' ' + name, title: name, description: desc, id: id });
  row('📥', 'Downloads', 'Músicas, vídeos, TikTok, Insta e mais', 'mn:cmd:menudownload');
  row('🎮', 'Mini Games', 'Jogos web, velha, ligue 4', 'mn:cmd:menuwebgames');
  row('🎨', 'Menu Logo', 'Logos e efeitos', 'mn:cmd:menulogo');
  row('🔞', 'Menu +18', 'Conteúdo adulto (restrito)', 'mn:cmd:menuhentai');
  row('🕹️', 'Jogos Interativos', 'Velha, Connect 4, PPT, forca e mais', 'rp:games');
  row('🌌', 'RPG Isekai', 'Aventura, personagem, guilda e mais', 'rp:isk:home');
  for (const k of Object.keys(CATEGORY_META)) {
    if (['custom', 'outros', 'jogos', 'admin', 'dono'].indexOf(k) >= 0) continue;
    let n = 0; try { n = registry.getByCategory(k).length; } catch (_) {}
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

function gameSections() {
  const zap = [], web = [];
  if (has('jogoszap')) zap.push({ header: '📱 WhatsApp', title: 'Jogos na conversa', description: '60 jogos abertos dentro do WhatsApp', id: 'mn:cmd:jogoszap' });
  const cel = has('celular4') ? 'celular4' : (has('celular3') ? 'celular3' : null);
  if (cel) zap.push({ header: '📱 WhatsApp', title: 'Mini Celular', description: 'iPhone virtual com apps e jogos', id: 'mn:cmd:' + cel });
  if (has('celular2')) zap.push({ header: '🖼️ Imagem', title: 'Mini Celular (imagem)', description: 'Funciona em qualquer WhatsApp', id: 'mn:cmd:celular2' });
  web.push({ header: '🌐 Navegador', title: 'Jogos de navegador', description: 'Menu com link para jogar no navegador', id: 'mn:cmd:menuwebgames' });
  web.push({ header: '🕹️ Interativos', title: 'Jogos Interativos', description: 'Velha, Connect 4, PPT, forca e mais', id: 'rp:games' });
  web.push({ header: '🌌 RPG', title: 'RPG Isekai', description: 'Aventura, personagem, guilda e mais', id: 'rp:isk:home' });
  const secs = [];
  if (zap.length) { zap[0].highlight_label = 'Novo'; secs.push({ title: '📱 Jogar no WhatsApp', rows: zap }); }
  secs.push({ title: '🌐 Jogar no navegador e RPG', rows: web });
  return secs;
}

async function openPainel(ctx) {
  const pref = (ctx.prefix && ctx.prefix.trim()) || (config.prefixes && config.prefixes[0]) || '!';
  const num = String(ctx.sender || '').split('@')[0].split(':')[0];
  const nome = (ctx.msg && ctx.msg.pushName) || num;
  const dono = nf.getEnv('DONO_EXIBIR') || '+258874288439';
  const sub = subInfo(ctx), n = totalCmds();
  const G = 'ঔৣֳ̤᷈͜͝͡';
  const L = (t) => '*│  ' + G + '✦ ' + t + '*';
  const body =
    '*╭━━✯ ❖ Tempest ❖ ✯━━╮*\n*│*\n' +
    L('Nome: ' + nome) + '\n' + L('Bot: ' + (config.botName || 'Tempest Bot')) + '\n' + L('Versão: ' + pkgVersion()) + '\n' +
    L('Status: Online') + '\n' + L('Uptime: ' + upt()) + '\n' + L('Prefixo: [ ' + pref + ' ]') + '\n' +
    (n ? L('Comandos: ' + n) + '\n' : '') + L('Dono: ' + dono) + '\n' + L('Aluguel: ' + (sub ? sub.text : 'uso privado')) + '\n' +
    '*│*\n*╰━━━ঔৣ͡➳ ✦ ❖ ✦ ➳ঔৣ͡━━━╯*\n\n✦ Toque em *Abrir Opções* ✦';

  let image = null, video = null, gifPlay = false;
  try {
    const media = require('../../services/commandMedia').get('menu');
    if (media) { if (media.type === 'image') image = fs.readFileSync(media.file); else if (media.type === 'video' || media.type === 'gif') { video = fs.readFileSync(media.file); gifPlay = media.type === 'gif'; } }
  } catch (_) {}

  const rows = await menuRows(ctx);
  const buttons = [
    btn.channel('📢 Canal Oficial'),
    btn.list('📂 Menus de Comandos', [
      { title: '📂 Menus de Comandos', rows: rows },
      { title: '⚡ Atalhos', rows: [
        { header: '🏓 Ping', title: 'Ping', description: 'Ver se o bot está online', id: 'mn:cmd:ping' },
        { header: '📝 Texto', title: 'Texto', description: 'Menu em texto', id: 'mn:txt' },
        { header: '🌐 Idioma', title: 'Idioma', description: 'Mudar o idioma do bot', id: 'lg:menu' }] }]),
    btn.list('🎮 Mini Games', gameSections()),
    btn.reply('👑 Dono', 'mn:owner')
  ];
  if (rows.some((r) => r.id === 'mn:cat:aluguel')) buttons.push(btn.reply('💳 Alugar Bot', 'mn:cat:aluguel'));
  buttons.push(btn.copy('📋 Copiar Prefixo [ ' + pref + ' ]', pref));

  const params = {};
  let expMs = null;
  if (sub && sub.active) expMs = sub.endMs;
  else if (!nf.getEnv('MENU_CARD_SO_ALUGUEL')) expMs = Date.now() + (parseInt(nf.getEnv('MENU_CARD_DIAS'), 10) || 30) * 86400000;
  if (expMs) {
    const exp = nf.getEnv('OFFER_SECONDS') ? Math.floor(expMs / 1000) : expMs;
    params.limited_time_offer = { text: '⋆✦⋆ Tempest ⋆✦⋆', url: nf.CHANNEL_URL, copy_code: '© Tempest', expiration_time: exp };
  }
  const dividers = []; for (let i = 1; i < buttons.length; i++) dividers.push(i); dividers.push(999);
  params.bottom_sheet = { in_thread_buttons_limit: 1, divider_indices: dividers, list_title: '✦ Tempest ✦', button_title: '☰ Abrir Opções' };

  return nf.sendNative(ctx.sock, ctx.jid, {
    body: body, footer: '© TEMPEST BOT • toque em Abrir Opções',
    image: image, video: video, gifPlayback: gifPlay, onMediaFail: () => { ctx.__tpMediaUsed = false; },
    messageParams: params, quoted: ctx.msg, buttons: buttons,
    fallback: require('../../utils/menu').generateMainMenu(ctx)
  });
}

module.exports = [{
  name: 'painel', aliases: ['opcoes', 'menu2'], category: 'utilidades', hideFromMenu: false,
  description: 'Painel do Tempest em gaveta (Abrir Opções)', usage: '!painel',
  handler: async (ctx) => {
    try { await openPainel(ctx); }
    catch (e) { console.error('[PAINEL]', e && e.message); await ctx.reply('❌ Não consegui abrir o painel: ' + (e && e.message)); }
  }
}];
