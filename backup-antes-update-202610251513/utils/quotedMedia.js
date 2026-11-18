/**
 * Helper: acha e baixa mídia (áudio / vídeo / figurinha) da mensagem atual
 * ou da mensagem respondida. Usado pelos comandos novos (audio, take, rename).
 * Não altera nenhum módulo existente.
 */
let baileys = null;
try { baileys = require('@whiskeysockets/baileys'); } catch (_) {}

let msgCache = null;
try { msgCache = require('./msgCache'); } catch (_) {}

const silentLogger = {
  level: 'silent',
  trace() {}, debug() {}, info() {}, warn() {}, error() {},
  child() { return silentLogger; }
};

function unwrap(msg) {
  if (!msg || typeof msg !== 'object') return {};
  if (msg.ephemeralMessage && msg.ephemeralMessage.message) return unwrap(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage && msg.viewOnceMessage.message) return unwrap(msg.viewOnceMessage.message);
  if (msg.viewOnceMessageV2 && msg.viewOnceMessageV2.message) return unwrap(msg.viewOnceMessageV2.message);
  if (msg.viewOnceMessageV2Extension && msg.viewOnceMessageV2Extension.message) {
    return unwrap(msg.viewOnceMessageV2Extension.message);
  }
  if (msg.documentWithCaptionMessage && msg.documentWithCaptionMessage.message) {
    return unwrap(msg.documentWithCaptionMessage.message);
  }
  return msg;
}

/** kinds: array com 'audio', 'video', 'sticker', 'image' */
function findNode(message, kinds) {
  const m = unwrap(message || {});
  const want = kinds || ['audio', 'video'];
  if (want.indexOf('audio') >= 0 && m.audioMessage) {
    return { node: m.audioMessage, type: 'audio', message: { audioMessage: m.audioMessage } };
  }
  if (want.indexOf('video') >= 0 && m.videoMessage) {
    return { node: m.videoMessage, type: 'video', message: { videoMessage: m.videoMessage } };
  }
  if (want.indexOf('sticker') >= 0 && m.stickerMessage) {
    return { node: m.stickerMessage, type: 'sticker', message: { stickerMessage: m.stickerMessage } };
  }
  if (want.indexOf('image') >= 0 && m.imageMessage) {
    return { node: m.imageMessage, type: 'image', message: { imageMessage: m.imageMessage } };
  }
  if (m.documentMessage) {
    const mime = String(m.documentMessage.mimetype || '');
    if ((want.indexOf('audio') >= 0 && /audio/i.test(mime)) || (want.indexOf('video') >= 0 && /video/i.test(mime))) {
      return { node: m.documentMessage, type: 'document', message: { documentMessage: m.documentMessage } };
    }
  }
  return null;
}

function getContextInfo(message) {
  const m = unwrap(message || {});
  const keys = [
    'extendedTextMessage', 'audioMessage', 'videoMessage', 'imageMessage',
    'stickerMessage', 'documentMessage', 'buttonsResponseMessage'
  ];
  for (let i = 0; i < keys.length; i++) {
    const n = m[keys[i]];
    if (n && n.contextInfo) return n.contextInfo;
  }
  return null;
}

/**
 * Procura a mídia: 1) respondida, 2) na própria mensagem.
 * Retorna { node, type, targetMsg, src } ou null
 */
function resolve(ctx, kinds) {
  const msg = ctx.msg;
  const out = [];

  try {
    const ci = getContextInfo(msg.message);
    if (ci && ci.quotedMessage) {
      const found = findNode(ci.quotedMessage, kinds);
      if (found) {
        out.push({
          node: found.node,
          type: found.type,
          src: 'quoted',
          targetMsg: {
            key: {
              remoteJid: msg.key.remoteJid,
              id: ci.stanzaId || ('qm_' + Date.now()),
              participant: ci.participant,
              fromMe: false
            },
            message: found.message
          }
        });
      }
    }
  } catch (_) {}

  try {
    if (!out.length && msgCache && msgCache.getQuotedFull) {
      const full = msgCache.getQuotedFull(msg);
      if (full && full.message) {
        const found = findNode(full.message, kinds);
        if (found) out.push({ node: found.node, type: found.type, src: 'cache', targetMsg: full });
      }
    }
  } catch (_) {}

  try {
    if (!out.length) {
      const found = findNode(msg.message, kinds);
      if (found) out.push({ node: found.node, type: found.type, src: 'self', targetMsg: msg });
    }
  } catch (_) {}

  return out[0] || null;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function download(ctx, info) {
  if (!info || !baileys) return null;

  if (baileys.downloadContentFromMessage && info.node) {
    try {
      const dlType = info.type === 'document' ? 'document' : info.type;
      const stream = await baileys.downloadContentFromMessage(info.node, dlType);
      const buf = await streamToBuffer(stream);
      if (buf && buf.length > 100) return buf;
    } catch (e) {
      console.error('[quotedMedia] content', e.message);
    }
  }

  if (baileys.downloadMediaMessage) {
    try {
      const buf = await baileys.downloadMediaMessage(info.targetMsg, 'buffer', {}, {
        logger: silentLogger,
        reuploadRequest: ctx.sock.updateMediaMessage && ctx.sock.updateMediaMessage.bind(ctx.sock)
      });
      if (buf && buf.length > 100) return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
    } catch (e) {
      console.error('[quotedMedia] dmm', e.message);
    }
  }
  return null;
}

module.exports = { resolve, download, findNode, unwrap };
