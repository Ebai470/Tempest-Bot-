/**
 * !shazam — responda a um audio / nota de voz / video com o comando para identificar a musica.
 * Depois o bot pergunta (botoes) se quer baixar.
 */
let downloadMediaMessage = null;
try { downloadMediaMessage = require('@whiskeysockets/baileys').downloadMediaMessage; } catch (_) {}
const ident = require('../../services/shazamId');

const last = new Map();

function findMedia(ctx) {
  const m = ctx.msg.message || {};
  const ci = (m.extendedTextMessage && m.extendedTextMessage.contextInfo) || (m.audioMessage && m.audioMessage.contextInfo) ||
    (m.videoMessage && m.videoMessage.contextInfo) || (m.documentMessage && m.documentMessage.contextInfo) || null;
  const q = ci && ci.quotedMessage;
  const pick = (x) => {
    if (!x) return null;
    if (x.audioMessage) return { kind: 'audio', mime: x.audioMessage.mimetype || 'audio/ogg', size: Number(x.audioMessage.fileLength) || 0 };
    if (x.videoMessage) return { kind: 'video', mime: x.videoMessage.mimetype || 'video/mp4', size: Number(x.videoMessage.fileLength) || 0 };
    if (x.ptvMessage) return { kind: 'video', mime: 'video/mp4', size: 0 };
    if (x.documentMessage && /^(audio|video)\//.test(x.documentMessage.mimetype || '')) return { kind: 'doc', mime: x.documentMessage.mimetype, size: Number(x.documentMessage.fileLength) || 0 };
    return null;
  };
  const fromQ = pick(q);
  if (fromQ) return Object.assign({ target: { key: { remoteJid: ctx.jid, id: ci.stanzaId, participant: ci.participant }, message: q } }, fromQ);
  const own = pick(m);
  if (own) return Object.assign({ target: ctx.msg }, own);
  return null;
}

module.exports = {
  name: 'shazam',
  aliases: ['identificarmusica', 'qualmusica', 'whatsong'],
  category: 'utilidades',
  description: 'Identifica uma música a partir de um áudio ou vídeo',
  usage: 'shazam (responda a um áudio/vídeo)',
  handler: async (ctx) => {
    const media = findMedia(ctx);
    if (!media) return ctx.reply('🎵 `• SHAZAM`\n\n> Responda a um *áudio*, *nota de voz* ou *vídeo* com *!shazam*.\n> Eu identifico a música e pergunto se quer baixar.');
    const k = ctx.jid + '|' + ctx.sender;
    if (Date.now() - (last.get(k) || 0) < 15000) return ctx.reply('⏳ Calma! Espere uns segundos antes de identificar outra.');
    last.set(k, Date.now());
    if (media.size > 40 * 1024 * 1024) return ctx.reply('❌ Este ficheiro é muito grande. Envie um trecho mais curto (alguns segundos chegam).');
    await ctx.reply('🎧 A ouvir...').catch(() => {});
    let buf;
    try {
      if (!downloadMediaMessage) throw new Error('sem baileys');
      buf = await downloadMediaMessage(media.target, 'buffer', {}, { logger: console, reuploadRequest: ctx.sock.updateMediaMessage });
    } catch (e) { console.error('[shazam] download:', e && e.message); return ctx.reply('❌ Não consegui abrir esse áudio. Envie-o de novo.'); }
    const r = await ident.identify(buf, media.mime);
    if (r.error === 'noprovider') {
      return ctx.reply('🎵 `• SHAZAM`\n\n> ⚙️ Falta configurar o reconhecimento.\n> Crie um token grátis em *dashboard.audd.io* e ponha no .env:\n> *AUDD_TOKEN=o_seu_token*\n> (reinicie o bot depois)');
    }
    if (r.error === 'noaudio') return ctx.reply('❌ Não consegui extrair áudio. Instale o ffmpeg no Termux: *pkg install ffmpeg*');
    if (r.error === 'provider') return ctx.reply('❌ O serviço de reconhecimento falhou: ' + String(r.detail || '').slice(0, 100));
    if (!r.track) return ctx.reply('🤷 Não consegui identificar esta música.\n> Tente um trecho com música mais clara (10 a 20 segundos, sem muita voz por cima).');
    try { return await require('../../interactive/shazamUi').sendCard(ctx, r.track); }
    catch (e) { console.error('[shazam] card:', e && e.message); return ctx.reply('🎵 ' + r.track.title + ' — ' + r.track.artist); }
  }
};

module.exports.__setDownloader = (f) => { downloadMediaMessage = f; };
