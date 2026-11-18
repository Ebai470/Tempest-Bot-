set -e
cd "${1:-.}"
[ -f src/interactive/mainMenu.js ] || { echo "❌ Rode dentro da pasta do bot (instale as partes antes)"; exit 1; }
BK="backup-logo-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"
for f in src/interactive/nativeFlow.js src/interactive/mainMenu.js src/interactive/rpgUi.js src/interactive/index.js src/utils/theme.js; do [ -f "$f" ] && cp "$f" "$BK/$(echo $f | tr / _)" || true; done
cat > src/interactive/logoMenu.js <<'__TP_EOF__'
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
__TP_EOF__
node - <<'__TP_PATCH__'
const fs = require('fs');
function edit(file, marker, fn, optional) {
  if (!fs.existsSync(file)) { console.log(optional ? 'ℹ️ pulado (nao instalado): ' + file : '❌ nao encontrado: ' + file); if (!optional) process.exit(2); return; }
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) { console.log('= ja aplicado:', file, marker); return; }
  const n = fn(s);
  if (!n || n === s) { console.log(optional ? '⚠️ trecho nao encontrado (pulado): ' + file : '❌ trecho nao encontrado em ' + file); if (!optional) process.exit(2); return; }
  fs.writeFileSync(file, n); console.log('✔', file, marker);
}
// 1) GIF/video no cabecalho da mensagem interativa
edit('src/interactive/nativeFlow.js', 'TP_VIDEO', (s) => {
  const a = '    const interactiveMessage = I.create({';
  if (!s.includes(a)) return null;
  const add = "    if (opts.video) { // TP_VIDEO\n      try {\n        const media = await prepareWAMessageMedia({ video: opts.video, gifPlayback: !!opts.gifPlayback, mimetype: 'video/mp4' }, { upload: sock.waUploadToServer });\n        header = I.Header.create(Object.assign({ title: opts.title || '', subtitle: opts.subtitle || '', hasMediaAttachment: true }, media));\n      } catch (e) { console.log('[native] video falhou:', e && e.message); if (typeof opts.onMediaFail === 'function') { try { opts.onMediaFail(); } catch (_) {} } }\n    }\n";
  let n = s.replace(a, add + a);
  n = n.replace("console.log('[native] imagem falhou:', e && e.message); }", "console.log('[native] imagem falhou:', e && e.message); if (typeof opts.onMediaFail === 'function') { try { opts.onMediaFail(); } catch (_) {} } }");
  return n;
});
// 2) menu principal: GIF/video vem junto + linha Menu Logo
edit('src/interactive/mainMenu.js', 'TP_VID', (s) => {
  const a = "  let image = null;\n  try { const media = cm(); const info = media && media.get('menu'); if (info && info.type === 'image') image = fs.readFileSync(info.file); } catch (_) {}\n  if (image) ctx.__tpMediaUsed = true;\n";
  const b = "    image: image,\n    messageParams: messageParams,";
  if (!s.includes(a) || !s.includes(b)) return null;
  s = s.replace(a, "  let image = null, video = null, gifPlay = false; // TP_VID\n  try { const media = cm(); const info = media && media.get('menu'); if (info) { if (info.type === 'image') image = fs.readFileSync(info.file); else if (info.type === 'video' || info.type === 'gif') { video = fs.readFileSync(info.file); gifPlay = info.type === 'gif'; } } } catch (_) {}\n  if (image || video) ctx.__tpMediaUsed = true;\n");
  return s.replace(b, "    image: image, video: video, gifPlayback: gifPlay, onMediaFail: () => { ctx.__tpMediaUsed = false; },\n    messageParams: messageParams,");
});
edit('src/interactive/mainMenu.js', "'mn:cmd:menulogo'", (s) => {
  const a = "row('🎮', 'Mini Games', 'Jogos web, velha, ligue 4', 'mn:cmd:menuwebgames');";
  if (!s.includes(a)) return null;
  return s.replace(a, a + "\n  row('🎨', 'Menu Logo', 'Logos e efeitos', 'mn:cmd:menulogo');");
});
// 3) menus por categoria (bn, imagem...): GIF/video tambem vem junto
edit('src/interactive/rpgUi.js', 'TP_VID', (s) => {
  const a = "  const image = imageFor(cat);\n  if (image) ctx.__tpMediaUsed = true;\n";
  const f = 'async function open(ctx, cat) {';
  if (!s.includes(a) || !s.includes(f)) return null;
  const mf = "// TP_VID\nfunction mediaFor(cat) {\n  const r = { image: null, video: null, gif: false };\n  try {\n    const m = cm(); if (!m) return r;\n    const info = m.resolve('menu', [IMG_ARG[cat] || cat], ['menu', 'help', 'ajuda', 'comandos']);\n    if (!info) return r;\n    const buf = fs.readFileSync(info.file);\n    if (info.type === 'image') r.image = buf; else if (info.type === 'video' || info.type === 'gif') { r.video = buf; r.gif = info.type === 'gif'; }\n  } catch (_) {}\n  return r;\n}\n\n";
  s = s.replace(f, mf + f);
  s = s.replace(a, "  const mf = mediaFor(cat);\n  const image = mf.image;\n  if (mf.image || mf.video) ctx.__tpMediaUsed = true;\n");
  return s.split('image: image, quoted: ctx.msg,').join('image: image, video: mf.video, gifPlayback: mf.gif, onMediaFail: () => { ctx.__tpMediaUsed = false; }, quoted: ctx.msg,');
}, true);
// 4) menu de texto principal lista o Menu Logo
edit('src/utils/theme.js', "'menulogo'", (s) => {
  const a = "'menumodos','iskmenu']";
  if (!s.includes(a)) return null;
  return s.replace(a, "'menumodos','iskmenu','menulogo']");
});
// 5) carregar o modulo
edit('src/interactive/index.js', "'logoMenu'", (s) => {
  const a = ["'hentaiUi']", "'filmeUi']", "'idioma']", "'suggest']", "'rpgUi']", "'animeUi']", "'gamesUi']"].find((x) => s.includes(x));
  return a ? s.replace(a, a.replace(']', ", 'logoMenu']")) : null;
});
__TP_PATCH__
for f in src/utils/theme.js src/interactive/*.js; do node --check "$f" || { echo "❌ erro de sintaxe em $f - restaurando"; for g in nativeFlow mainMenu rpgUi index; do [ -f "$BK/src_interactive_$g.js" ] && cp "$BK/src_interactive_$g.js" "src/interactive/$g.js"; done; [ -f "$BK/src_utils_theme.js" ] && cp "$BK/src_utils_theme.js" src/utils/theme.js; rm -f src/interactive/logoMenu.js; exit 3; }; done
echo "✅ Instalado: GIF/video junto do menu + Menu Logo (texto e interativo). Reinicie o bot."
