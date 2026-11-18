'use strict';
const fs = require('fs');
const { btn, sendNative } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const LOGOS = '1917 3druby advancedglow blackpinklogo blood cartoon cemetery clouds darkgreen deleting dragonball effectclouds flag flag3d freecreate frozen galaxy galaxywallpaper glitch glowing gradient halloween horror joker ligatures lighteffects logomaker luxurygold makingneon metal3d multicoloredneon neondevil neonglitch papercut pixelglitch royal sandsummer summerbeach sunset typography underwater watercolor wooden3d write'.split(' ');
const PREF = (ctx) => (ctx && ctx.prefix && String(ctx.prefix).trim()) || (config.prefixes && config.prefixes[0]) || '!';

function head() {
  return ['┏╾═╼°✦•°: | ⊱🎨⊰ | :°•✦°╾═╼┓', '┃ ✧ *𝙈𝙀𝙉𝙐 𝙇𝙊𝙂𝙊* ✧', '┗╾═╼°✦•°: | ⊱🖌️⊰ | :°•✦°╾═╼┛'];
}
function logoText(p) {
  const L = head().concat([
    '╎',
    '├╾═╼･ﾟ✧ﾟ･｡🌌｡･ﾟ✧ﾟ･╾═╼┓',
    '┣━〔 • 𝑳𝒐𝒈𝒐𝒔 𝒆 𝑬𝒇𝒆𝒊𝒕𝒐𝒔 • 〕',
    '├╾═╼･ﾟ✧ﾟ･｡🌌｡･ﾟ✧ﾟ･╾═╼┛',
    '╎',
    '├╾═╼･ﾟ✧ﾟ･｡🪄｡･ﾟ✧ﾟ･╾═╼┓',
    '┃╭╾═╼〔 • ✨ • 〕╾═╼╮'
  ]);
  LOGOS.forEach((n) => L.push('┃╎✧ 🎨 ' + p + n));
  L.push('┃╰╾═╼〔 • ✨ • 〕╾═╼╯', '┗╾═╼･ﾟ✧ﾟ･｡🪄｡･ﾟ✧ﾟ･╾═╼┛');
  return L.join('\n');
}

function media() {
  const r = { image: null, video: null, gif: false };
  try {
    const m = require('../services/commandMedia');
    const info = m.get('menulogo') || m.resolve('menu', ['logo'], ['menu']);
    if (!info) return r;
    const buf = fs.readFileSync(info.file);
    if (info.type === 'image') r.image = buf;
    else if (info.type === 'video' || info.type === 'gif') { r.video = buf; r.gif = info.type === 'gif'; }
  } catch (_) {}
  return r;
}

async function openLogo(ctx, p) {
  const rows = LOGOS.map((n) => ({ header: '🎨', title: p + n, description: 'Criar logo/efeito com seu texto', id: 'lo:run:' + n }));
  const sections = [];
  for (let i = 0; i < rows.length; i += 10) sections.push({ title: '🎨 Logos ' + (i / 10 + 1) + '/' + Math.ceil(rows.length / 10), rows: rows.slice(i, i + 10) });
  const mf = media();
  if (mf.image || mf.video) ctx.__tpMediaUsed = true;
  return sendNative(ctx.sock, ctx.jid, {
    body: head().join('\n') + '\n\n✨ *Logos e Efeitos*\n👇 Toque em *Escolher logo*',
    footer: '© ' + config.botName + ' • escolha a Baixo:',
    image: mf.image, video: mf.video, gifPlayback: mf.gif, onMediaFail: () => { ctx.__tpMediaUsed = false; },
    quoted: ctx.msg, fallback: logoText(p),
    buttons: [btn.list('🎨 Escolher logo', sections), btn.reply('🏠 Menu', 'mn:home'), btn.channel('📢 Canal')]
  });
}

async function menuLogo(ctx) {
  const p = PREF(ctx);
  if (p === '/') return ctx.reply(logoText(p));
  return openLogo(ctx, p);
}

try {
  registry.register({
    name: 'menulogo', aliases: ['menulogos', 'logomenu'], category: 'utilidades',
    description: 'Menu Logo (logos e efeitos)', usage: '!menulogo', handler: menuLogo
  });
} catch (e) { console.error('[logo] registro', e && e.message); }

(function () {
  const e = registry.get('menu');
  if (!e || e.__tpLogo) return;
  const orig = e.handler;
  e.handler = async function (ctx) {
    const a = String((ctx.args && ctx.args[0]) || '').toLowerCase();
    if (a === 'logo' || a === 'logos') return menuLogo(ctx);
    return orig.call(this, ctx);
  };
  e.__tpLogo = true;
})();

router.register('lo', async (ctx, rest, msg, deps) => {
  const p = rest.split(':');
  if (p[0] !== 'run') return;
  const name = p[1];
  if (!registry.get(name)) {
    return ctx.sock.sendMessage(ctx.jid, { text: '🎨 *' + PREF(ctx) + name + '* ainda não está instalado neste bot.\nO menu já está pronto; falta adicionar o gerador de logos.' });
  }
  const o = ctx.msg;
  if (deps && typeof deps.reinject === 'function') {
    const fake = {
      key: { remoteJid: ctx.jid, fromMe: false, id: 'TP' + Date.now().toString(16) + Math.random().toString(16).slice(2, 8).toUpperCase(), participant: o && o.key && o.key.participant },
      message: { conversation: PREF(ctx) + name }, pushName: o && o.pushName, messageTimestamp: Math.floor(Date.now() / 1000)
    };
    if (o && o.key && o.key.participantPn) fake.key.participantPn = o.key.participantPn;
    return deps.reinject(fake);
  }
  const e = registry.get(name); ctx.args = []; return e.handler(ctx);
});

module.exports = { logoText, openLogo, LOGOS };
