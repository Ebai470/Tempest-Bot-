set -e
cd "${1:-.}"
[ -f src/index.js ] || { echo "❌ Rode dentro da pasta do bot (onde existe src/index.js)"; exit 1; }
BK="backup-parte1-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"
cp src/index.js "$BK/index.js"; cp src/commands/utilidades/basic.js "$BK/basic.js"
mkdir -p src/interactive
cat > src/interactive/nativeFlow.js <<'__TP_EOF__'
'use strict';
const baileys = require('@whiskeysockets/baileys');
const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = baileys;

const CHANNEL_URL = process.env.CHANNEL_URL || 'https://whatsapp.com/channel/0029Vb6PhNkATRSjN3udCi26';

const btn = {
  url: (text, url) => ({ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: text, url: url, merchant_url: url }) }),
  copy: (text, code) => ({ name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: text, copy_code: code }) }),
  reply: (text, id) => ({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: text, id: id }) }),
  list: (title, sections) => ({ name: 'single_select', buttonParamsJson: JSON.stringify({ title: title, sections: sections }) }),
  channel: (text) => btn.url(text || '📢 Canal Oficial', CHANNEL_URL)
};

function bizNodes(jid) {
  const nodes = [{
    tag: 'biz', attrs: {},
    content: [{
      tag: 'interactive', attrs: { type: 'native_flow', v: '1' },
      content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
    }]
  }];
  if (!String(jid).endsWith('@g.us')) nodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });
  return nodes;
}

async function sendNative(sock, jid, opts) {
  opts = opts || {};
  const I = proto.Message.InteractiveMessage;
  const q = (opts.quoted && opts.quoted.message && !opts.quoted.message.interactiveResponseMessage) ? opts.quoted : undefined;
  try {
    let header = I.Header.create({ title: opts.title || '', subtitle: opts.subtitle || '', hasMediaAttachment: false });
    if (opts.image) {
      try {
        const media = await prepareWAMessageMedia(
          { image: typeof opts.image === 'string' ? { url: opts.image } : opts.image },
          { upload: sock.waUploadToServer }
        );
        header = I.Header.create(Object.assign({ title: opts.title || '', subtitle: opts.subtitle || '', hasMediaAttachment: true }, media));
      } catch (e) { console.log('[native] imagem falhou:', e && e.message); }
    }
    const interactiveMessage = I.create({
      body: I.Body.create({ text: opts.body || ' ' }),
      footer: I.Footer.create({ text: opts.footer || '' }),
      header: header,
      nativeFlowMessage: I.NativeFlowMessage.create({ buttons: opts.buttons || [], messageParamsJson: '' }),
      contextInfo: (opts.mentions && opts.mentions.length) ? { mentionedJid: opts.mentions } : undefined
    });
    const msg = generateWAMessageFromContent(jid, {
      viewOnceMessage: { message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: interactiveMessage
      } }
    }, { quoted: q, userJid: sock.user && sock.user.id });
    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id, additionalNodes: bizNodes(jid) });
    return msg;
  } catch (e) {
    console.log('[native] falhou, usando texto:', e && e.message);
    const t = opts.fallback || opts.body || '';
    return sock.sendMessage(jid, { text: t, mentions: opts.mentions }, { quoted: q });
  }
}

function parseReply(msg) {
  const m = msg && msg.message;
  if (!m) return null;
  const ir = m.interactiveResponseMessage;
  if (ir && ir.nativeFlowResponseMessage) {
    try {
      const p = JSON.parse(ir.nativeFlowResponseMessage.paramsJson || '{}');
      return p.id || p.selectedId || p.rowId || null;
    } catch (_) { return null; }
  }
  if (m.buttonsResponseMessage) return m.buttonsResponseMessage.selectedButtonId || null;
  if (m.templateButtonReplyMessage) return m.templateButtonReplyMessage.selectedId || null;
  if (m.listResponseMessage && m.listResponseMessage.singleSelectReply) return m.listResponseMessage.singleSelectReply.selectedRowId || null;
  return null;
}

module.exports = { btn, sendNative, parseReply, CHANNEL_URL };
__TP_EOF__
cat > src/interactive/router.js <<'__TP_EOF__'
'use strict';
const { parseReply } = require('./nativeFlow');
const handlers = new Map();

function register(prefix, fn) { handlers.set(prefix, fn); }

async function dispatch(sock, msg, deps) {
  const id = parseReply(msg);
  if (!id) return false;
  const i = String(id).indexOf(':');
  if (i < 1) return false;
  const prefix = id.slice(0, i);
  const fn = handlers.get(prefix);
  if (!fn) return false;
  try {
    const Context = require('../utils/context');
    const ctx = new Context(sock, msg, { command: '', args: [], text: '', prefix: '', hasPrefix: false, body: '' });
    if (deps && deps.isBlacklisted && deps.isBlacklisted(ctx.sender)) return true;
    await fn(ctx, id.slice(i + 1), msg);
  } catch (e) { console.error('[router]', id, e && e.message); }
  return true;
}

module.exports = { register, dispatch };
__TP_EOF__
cat > src/interactive/mainMenu.js <<'__TP_EOF__'
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
__TP_EOF__
cat > src/interactive/index.js <<'__TP_EOF__'
'use strict';
require('./mainMenu');
['downloadsUi', 'gamesUi'].forEach(function (m) {
  try { require('./' + m); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') console.error('[interactive]', m, e.message); }
});
module.exports = require('./router');
__TP_EOF__
node - <<'__TP_PATCH__'
const fs = require('fs');
function patch(file, marker, fn) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) { console.log('= ja aplicado:', file); return; }
  const n = fn(s);
  if (n === s) { console.log('❌ ancora nao encontrada em', file); process.exit(2); }
  fs.writeFileSync(file, n); console.log('✔ patch:', file);
}
patch('src/index.js', 'TP_NATIVE_HOOK', (s) => {
  const a = "  if (!msg.message) return;\n  try { msgCache.saveMessage(msg); } catch (_) {}";
  const hook = "  // TP_NATIVE_HOOK\n  try {\n    if (msg && msg.message && !msg.key.fromMe) {\n      require('./interactive');\n      if (await require('./interactive/router').dispatch(sock, msg, { isBlacklisted: isBlacklisted })) return;\n    }\n  } catch (e) { console.error('native hook', e); }\n";
  return s.replace(a, hook + a);
});
patch('src/commands/utilidades/basic.js', 'TP_NATIVE_MENU', (s) => {
  const a = "// /menu → interativo (botoes ou numerado)";
  const add = a + "\n      // TP_NATIVE_MENU\n      try { if (!(ctx.args && ctx.args[0])) { require('../../interactive'); await require('../../interactive/mainMenu').openMain(ctx); return; } } catch (e) { console.error('[menu] native', e); }";
  return s.replace(a, add);
});
__TP_PATCH__
for f in src/index.js src/commands/utilidades/basic.js src/interactive/*.js; do node --check "$f" || { echo "❌ erro de sintaxe em $f - restaurando"; cp "$BK/index.js" src/index.js; cp "$BK/basic.js" src/commands/utilidades/basic.js; exit 3; }; done
echo "✅ Parte 1 instalada. Reinicie o bot e mande: menu"
echo "↩ Backup em: $BK"
