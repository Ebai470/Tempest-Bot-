'use strict';
let dlContent = null, dlMedia = null;
try { const b = require('@whiskeysockets/baileys'); dlContent = b.downloadContentFromMessage; dlMedia = b.downloadMediaMessage; } catch (_) {}
const W = require('../../utils/webpExif');
let config = {}; try { config = require('../../config'); } catch (_) {}

const OWNER = process.env.TAKE_OWNER || '+258 87 428 8439';
function fraktur(s) {
  let o = '';
  for (const ch of String(s)) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) o += String.fromCodePoint(0x1D56C + c - 65);
    else if (c >= 97 && c <= 122) o += String.fromCodePoint(0x1D586 + c - 97);
    else o += ch;
  }
  return o;
}
async function toBuf(stream) { const c = []; for await (const x of stream) c.push(x); return Buffer.concat(c); }
async function download(ctx, quoted, ci) {
  if (dlContent) {
    try { const b = await toBuf(await dlContent(quoted.stickerMessage, 'sticker')); if (W.isWebp(b)) return b; } catch (e) { console.error('[take] dlContent:', e && e.message); }
  }
  if (dlMedia) {
    try {
      const target = { key: { remoteJid: ctx.jid, id: ci.stanzaId, participant: ci.participant }, message: quoted };
      const b = await dlMedia(target, 'buffer', {}, { reuploadRequest: ctx.sock.updateMediaMessage, logger: undefined });
      if (W.isWebp(b)) return b;
    } catch (e) { console.error('[take] dlMedia:', e && e.message); }
  }
  return null;
}
function describe(b) {
  try {
    const seen = {}; let o = 12;
    while (o + 8 <= b.length) { const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4); seen[id] = (seen[id] || 0) + 1; o += 8 + sz + (sz % 2); }
    return b.length + 'B [' + Object.keys(seen).map((k) => k.trim() + (seen[k] > 1 ? 'x' + seen[k] : '')).join(',') + ']';
  } catch (e) { return b.length + 'B [ilegivel]'; }
}
module.exports = [{
  name: 'take', aliases: ['renomear'], category: 'stickers',
  description: 'Renomeia a figurinha com o seu nome',
  handler: async (ctx) => {
    const m = (ctx.msg && ctx.msg.message) || {};
    const ci = (m.extendedTextMessage && m.extendedTextMessage.contextInfo) || (m.imageMessage && m.imageMessage.contextInfo) || (m.videoMessage && m.videoMessage.contextInfo) || null;
    const quoted = ci && ci.quotedMessage;
    if (!quoted || !quoted.stickerMessage) return ctx.reply('❌ *Responda a uma figurinha* com *take*\nOu: *take Nome Personalizado*');
    const custom = ((ctx.args && ctx.args.length) ? ctx.args.join(' ') : '').trim().slice(0, 30);
    const nome = custom || String(ctx.pushName || (ctx.msg && ctx.msg.pushName) || '').trim().slice(0, 30) || 'Anonimo';
    const botName = String(config.botName || 'TEMPEST BOT');
    try {
      const src = await download(ctx, quoted, ci);
      if (!src) return ctx.reply('❌ Não consegui baixar essa figurinha. Reenvie-a e tente de novo.');
      const pack = fraktur(botName) + ' ♛ ' + fraktur('Dono') + ': ' + OWNER;
      const author = '✦ ' + fraktur('Solicitado por') + ': ' + fraktur(nome);
      const out = W.stickerMeta(src, pack, author);
      console.log('[take] src=' + describe(src) + ' out=' + describe(out));
      if (String((ctx.args && ctx.args[0]) || '').toLowerCase() === 'debug') {
        await ctx.sock.sendMessage(ctx.jid, { text: '🔧 DEBUG TAKE\n1) original sem alterar\n2) com nome\n' + describe(src) + '\n' + describe(out) });
        await ctx.sock.sendMessage(ctx.jid, { sticker: src }, { quoted: ctx.msg });
        await ctx.sock.sendMessage(ctx.jid, { sticker: out }, { quoted: ctx.msg });
        return;
      }
      if (!W.isWebp(out)) return ctx.reply('❌ Não consegui renomear essa figurinha.');
      await ctx.sock.sendMessage(ctx.jid, { sticker: out }, { quoted: ctx.msg });
      const who = ctx.sender;
      const card = ['• 🎭 ' + fraktur('Take Concluido'), '',
        '┃ ' + fraktur('Bot') + ': ' + botName,
        '┃ ' + fraktur('Dono') + ': ' + OWNER, '┃',
        '┃ *' + fraktur('Solicitado por') + ': @' + String(who || '').split('@')[0].split(':')[0] + '*'].join('\n');
      await ctx.sock.sendMessage(ctx.jid, { text: card, mentions: who ? [who] : [] });
    } catch (e) {
      console.error('[take]', e && e.stack ? e.stack : e);
      await ctx.reply('❌ Erro no take: ' + (e && e.message ? e.message : 'desconhecido'));
    }
  }
}];
