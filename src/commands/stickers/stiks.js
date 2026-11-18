'use strict';
/**
 * !stiks            -> responde a imagem/GIF/vídeo (ou a um conjunto enviado junto)
 *                      e envia cada figurinha, uma por uma.
 * !stiks NomePack   -> o mesmo, mas todas as figurinhas levam o mesmo nome/ID de pack
 *                      nos metadados (WhatsApp mostra o pack ao abrir a figurinha).
 *
 * Reutiliza: utils/media (toStickerWebp, videoToAnimatedWebp), utils/webpExif
 * (metadados de pack) e utils/albumIndex (recuperar álbuns).
 *
 * Nota honesta: o Baileys instalado (7.0.0-rc14) não tem envio de "pack nativo"
 * do WhatsApp, por isso o agrupamento é feito pelos metadados (mesmo nome + mesmo ID).
 */

let dlContent = null, dlMedia = null;
try { const b = require('@whiskeysockets/baileys'); dlContent = b.downloadContentFromMessage; dlMedia = b.downloadMediaMessage; } catch (_) {}
const media = require('../../utils/media');
const W = require('../../utils/webpExif');
const albumIndex = require('../../utils/albumIndex');
let config = {}; try { config = require('../../config'); } catch (_) {}

const MAX_ITEMS = 30;           // por execução (protege o telemóvel e o WhatsApp)
const SEND_GAP_MS = 350;        // pausa entre envios (mantém a ordem)
const EDIT_GAP_MS = 1500;       // intervalo mínimo entre edições da barra de progresso
const busy = new Set();         // um !stiks de cada vez por chat

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

/** Lê a mensagem respondida (ou a própria, se tiver mídia) */
function resolveSource(ctx) {
  const msg = ctx.msg || {};
  const m = albumIndex.unwrap(msg.message || {}) || {};
  const ci = (m.extendedTextMessage && m.extendedTextMessage.contextInfo) ||
    (m.imageMessage && m.imageMessage.contextInfo) ||
    (m.videoMessage && m.videoMessage.contextInfo) || null;
  const q = ci && ci.quotedMessage ? albumIndex.unwrap(ci.quotedMessage) : null;

  const pick = (c) => {
    if (!c) return null;
    if (c.imageMessage) return { type: 'image', node: c.imageMessage };
    if (c.videoMessage) return { type: 'video', node: c.videoMessage };
    return null;
  };

  const quotedMedia = pick(q);
  if (quotedMedia) {
    return Object.assign({ from: 'quoted', stanzaId: ci.stanzaId, participant: ci.participant }, quotedMedia);
  }
  if (q && q.albumMessage) {
    return { from: 'album', type: null, node: null, stanzaId: ci.stanzaId, participant: ci.participant };
  }
  const own = pick(m);
  if (own) return Object.assign({ from: 'own', stanzaId: msg.key && msg.key.id }, own);
  return null;
}

function itemFromNode(src, ctx) {
  return {
    id: src.stanzaId || ('single-' + Date.now()),
    type: src.type,
    node: src.node,
    key: { remoteJid: ctx.jid, id: src.stanzaId, participant: src.participant },
    seconds: Number(src.node && src.node.seconds) || 0,
    gif: !!(src.node && src.node.gifPlayback)
  };
}

async function download(item, ctx) {
  if (dlContent) {
    try {
      const buf = await streamToBuffer(await dlContent(item.node, item.type));
      if (buf && buf.length) return buf;
    } catch (e) { console.error('[stiks] dlContent:', e && e.message); }
  }
  if (dlMedia) {
    try {
      const wrapper = { key: item.key, message: { [item.type + 'Message']: item.node } };
      const buf = await dlMedia(wrapper, 'buffer', {}, { reuploadRequest: ctx.sock.updateMediaMessage, logger: undefined });
      if (buf && buf.length) return buf;
    } catch (e) { console.error('[stiks] dlMedia:', e && e.message); }
  }
  return null;
}

/** Converte um item em WebP de figurinha (reutiliza utils/media) */
async function toSticker(item, ctx) {
  const buf = await download(item, ctx);
  if (!buf) throw new Error('não consegui baixar a mídia');
  if (item.type === 'video') {
    if (item.seconds > 99) throw new Error('vídeo demasiado longo (' + item.seconds + 's)');
    const out = await media.videoToAnimatedWebp(buf, 9.9);
    if (!out) throw new Error('falha ao animar (precisa de ffmpeg e libwebp)');
    return out;
  }
  try {
    return await media.toStickerWebp(buf);
  } catch (e) {
    if (e && (e.png || e.message === 'NO_WEBP')) throw new Error('sem conversor WebP (pkg install libwebp ffmpeg)');
    throw e;
  }
}

function cleanPackName(s) {
  return String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
}

function packId(name) {
  const slug = String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'pack';
  return 'tempest.pack.' + slug + '.' + Date.now().toString(36);
}

/** Aplica nome/ID do pack à figurinha. Devolve {buf, ok} */
function applyPack(webp, meta) {
  try {
    const out = W.setExif(webp, W.buildExif(meta));
    if (W.isWebp(out)) return { buf: out, ok: true };
  } catch (e) { console.error('[stiks] exif:', e && e.message); }
  return { buf: webp, ok: false };
}

function bar(done, total) {
  const size = Math.min(total, 12);
  const filled = Math.round((done / total) * size);
  return '▰'.repeat(filled) + '▱'.repeat(size - filled) + ' ' + done + '/' + total;
}

function makeProgress(ctx, total, packName) {
  let key = null, last = 0, canEdit = true;
  const head = packName ? '📦 *Criando pack* "' + packName + '"' : '🎨 *Criando figurinhas*';
  const text = (done, extra) => head + '\n' + bar(done, total) + (extra ? '\n' + extra : '');
  return {
    async start() {
      try {
        const sent = await ctx.sock.sendMessage(ctx.jid, { text: text(0) }, { quoted: ctx.msg });
        key = sent && sent.key ? sent.key : null;
      } catch (_) { key = null; }
      if (!key) canEdit = false;
    },
    async update(done, force) {
      if (!canEdit || !key) return;
      const now = Date.now();
      if (!force && now - last < EDIT_GAP_MS) return;
      last = now;
      try { await ctx.sock.sendMessage(ctx.jid, { text: text(done), edit: key }); }
      catch (_) { canEdit = false; }
    }
  };
}

function describeFail(list) {
  return list.map((f) => '#' + f.index + ' (' + String(f.reason).slice(0, 60) + ')').join(', ');
}

module.exports = [{
  name: 'stiks',
  aliases: [],
  category: 'stickers',
  description: 'Figurinhas em lote: responda a imagens/GIFs/vídeos. !stiks NomePack cria um pack',
  usage: '!stiks [NomeDoPack]',
  handler: async (ctx) => {
    if (!media.available()) return ctx.reply('❌ Sem processador de imagem.\nnpm install jimp --legacy-peer-deps');

    const src = resolveSource(ctx);
    if (!src) {
      return ctx.reply(
        '🎴 *STIKS — figurinhas em lote*\n\n' +
        '• *' + (ctx.prefix || '!') + 'stiks* — responda a uma imagem/GIF/vídeo (ou a um conjunto enviado junto) e eu envio cada figurinha.\n' +
        '• *' + (ctx.prefix || '!') + 'stiks NomeDoPack* — o mesmo, mas todas ficam com o mesmo nome de pack.'
      );
    }

    if (busy.has(ctx.jid)) return ctx.reply('⏳ Já estou a criar figurinhas neste chat. Aguarde terminar.');
    busy.add(ctx.jid);
    try {
      const packName = cleanPackName((ctx.args || []).join(' '));

      // Recolher as mídias do lote
      if (src.from === 'own') await sleep(2200); // dá tempo às restantes imagens do álbum chegarem
      const batch = albumIndex.findBatch(ctx.jid, src.stanzaId);
      let items, expected = 0, source = 'single';
      if (batch && batch.items.length) {
        items = batch.items.map((e) => ({ id: e.id, type: e.type, node: e.node, key: e.key, seconds: e.seconds, gif: e.gif }));
        expected = batch.expected || 0;
        source = batch.source;
      } else if (src.from === 'album') {
        return ctx.reply('❌ Não encontrei as mídias desse álbum (foram enviadas antes de o bot ligar). Reenvie as mídias e responda de novo.');
      } else {
        items = [itemFromNode(src, ctx)];
      }

      const notes = [];
      if (expected && items.length < expected) {
        notes.push('O WhatsApp indica ' + expected + ' mídias neste álbum, mas só recuperei ' + items.length + ' (as restantes chegaram antes de o bot as registar ou foram apagadas).');
      }
      if (items.length > MAX_ITEMS) {
        notes.push('Limite de ' + MAX_ITEMS + ' por vez: as primeiras ' + MAX_ITEMS + ' serão processadas.');
        items = items.slice(0, MAX_ITEMS);
      }
      const total = items.length;

      const author = String(ctx.pushName || (ctx.msg && ctx.msg.pushName) || config.botName || 'TEMPEST BOT').slice(0, 30);
      const meta = packName ? {
        'sticker-pack-id': packId(packName),
        'sticker-pack-name': packName,
        'sticker-pack-publisher': author,
        emojis: ['✨']
      } : null;

      const progress = total > 1 ? makeProgress(ctx, total, packName) : null;
      if (progress) await progress.start();

      const fails = [];
      let sent = 0, metaFails = 0;
      for (let i = 0; i < total; i++) {
        const n = i + 1;
        try {
          let webp = await toSticker(items[i], ctx);
          if (meta) {
            const r = applyPack(webp, meta);
            webp = r.buf;
            if (!r.ok) metaFails++;
          }
          await ctx.sock.sendMessage(ctx.jid, { sticker: webp }, i === 0 ? { quoted: ctx.msg } : undefined);
          sent++;
        } catch (e) {
          console.error('[stiks] item ' + n + ':', e && e.message ? e.message : e);
          fails.push({ index: n, reason: (e && e.message) || 'erro' });
        }
        if (progress) await progress.update(n, n === total);
        if (n < total) await sleep(SEND_GAP_MS);
      }

      // Resumo final
      const lines = [];
      if (!sent) {
        lines.push('❌ Não consegui criar nenhuma figurinha.');
      } else if (packName) {
        lines.push('✅ Pack *' + packName + '* — ' + sent + '/' + total + ' figurinhas enviadas (por ordem).');
      } else {
        lines.push('✅ ' + sent + '/' + total + ' figurinhas enviadas.');
      }
      if (fails.length) lines.push('⚠️ Falharam: ' + describeFail(fails));
      if (metaFails) lines.push('⚠️ ' + metaFails + ' figurinha(s) ficaram sem o nome do pack nos metadados.');
      for (const n of notes) lines.push('ℹ️ ' + n);
      if (packName && sent) lines.push('ℹ️ O WhatsApp não permite a este bot criar packs nativos; todas levam o mesmo nome e ID de pack nos metadados.');
      if (total === 1 && !fails.length && !packName) return; // caso simples: só a figurinha
      await ctx.reply(lines.join('\n'));
    } catch (e) {
      console.error('[stiks]', e && e.stack ? e.stack : e);
      await ctx.reply('❌ Erro no stiks: ' + String((e && e.message) || e).slice(0, 160));
    } finally {
      busy.delete(ctx.jid);
    }
  }
}];
