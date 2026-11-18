'use strict';
const baileys = require('@whiskeysockets/baileys');
const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = baileys;

// le valor do .env (o bot nao carrega o .env em process.env)
let _envCache = null;
function getEnv(key) {
  if (process.env[key]) return process.env[key];
  if (!_envCache) {
    _envCache = {};
    try {
      require('fs').readFileSync(require('path').join(process.cwd(), '.env'), 'utf8').split('\n').forEach((l) => {
        const t = l.trim(); if (!t || t[0] === '#') return;
        const i = t.indexOf('='); if (i > 0) _envCache[t.slice(0, i).trim()] = t.slice(i + 1).trim();
      });
    } catch (_) {}
  }
  return _envCache[key] || '';
}

const CHANNEL_URL = getEnv('CHANNEL_URL') || 'https://whatsapp.com/channel/0029Vb6PhNkATRSjN3udCi26';

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
  try { opts = await require('./idioma').translateUi(jid, opts); } catch (_) {} // TP_I18N
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
      } catch (e) { console.log('[native] imagem falhou:', e && e.message); if (typeof opts.onMediaFail === 'function') { try { opts.onMediaFail(); } catch (_) {} } }
    }
    if (opts.video) { // TP_VIDEO
      try {
        const media = await prepareWAMessageMedia({ video: opts.video, gifPlayback: !!opts.gifPlayback, mimetype: 'video/mp4' }, { upload: sock.waUploadToServer });
        header = I.Header.create(Object.assign({ title: opts.title || '', subtitle: opts.subtitle || '', hasMediaAttachment: true }, media));
      } catch (e) { console.log('[native] video falhou:', e && e.message); if (typeof opts.onMediaFail === 'function') { try { opts.onMediaFail(); } catch (_) {} } }
    }
    const interactiveMessage = I.create({
      body: I.Body.create({ text: opts.body || ' ' }),
      footer: I.Footer.create({ text: opts.footer || '' }),
      header: header,
      nativeFlowMessage: I.NativeFlowMessage.create({ buttons: opts.buttons || [], messageParamsJson: opts.messageParams ? JSON.stringify(opts.messageParams) : '' }),
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

module.exports = { btn, sendNative, parseReply, CHANNEL_URL, getEnv };
