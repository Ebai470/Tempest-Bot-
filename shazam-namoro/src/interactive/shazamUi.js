'use strict';
// Botoes do Shazam: "Baixar" / "Nao" depois de identificar a musica
const router = require('./router');
const nf = require('./nativeFlow');
const web = require('../utils/webfetch');
const mo = require('../utils/mediaOpt');
const music = require('../services/musicDl');

const sessions = new Map();
const busy = new Set();
const TTL = 30 * 60 * 1000;
setInterval(() => { const n = Date.now(); sessions.forEach((v, k) => { if (n - v.ts > TTL) sessions.delete(k); }); }, 5 * 60 * 1000).unref();

const quote = (lines) => lines.filter(Boolean).map((l) => '> ' + l).join('\n');
const safeName = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'musica';

async function sendCard(ctx, track) {
  const token = Math.random().toString(36).slice(2, 9);
  sessions.set(token, { track: track, owner: ctx.sender, jid: ctx.jid, ts: Date.now() });
  let cover = null;
  if (track.cover) {
    try { const r = await music.coverGet(track.cover); if (r) cover = r; } catch (_) {}
  }
  const body = '🎵 `• MÚSICA IDENTIFICADA`\n\n' +
    quote(['🎶 *' + track.title + '*', track.artist && '🎤 ' + track.artist, track.album && ('💿 ' + track.album + (track.year ? ' (' + track.year + ')' : '')), track.link && ('🔗 ' + track.link)]) +
    '\n\n' + quote(['Quer baixar esta música?']);
  const opts = {
    body: body, footer: '', noFormat: true, noButtonStyle: true,
    buttons: [nf.btn.reply('⬇️ Baixar', 'shz:dl:' + token), nf.btn.reply('❌ Não', 'shz:no:' + token)],
    fallback: body + '\n\nPara baixar: *!play ' + (track.artist ? track.artist + ' - ' : '') + track.title + '*'
  };
  if (cover) { opts.image = cover; }
  return nf.sendNative(ctx.sock, ctx.jid, opts);
}

async function handle(ctx, rest) {
  const p = String(rest).split(':');
  const act = p[0], token = p[1];
  const s = sessions.get(token);
  if (!s) return ctx.reply('⏳ Este pedido expirou. Use *!shazam* de novo.');
  if (act === 'no') { sessions.delete(token); return ctx.reply('👍 Ok, não vou baixar.'); }
  if (act !== 'dl') return;
  if (busy.has(token)) return ctx.reply('⏳ Já estou a baixar esta música...');
  busy.add(token);
  try {
    const t = s.track;
    await ctx.reply('⏳ A baixar *' + t.title + '*' + (t.artist ? ' — ' + t.artist : '') + '...').catch(() => {});
    const r = await music.downloadAudio((t.artist ? t.artist + ' - ' : '') + t.title + ' audio');
    if (!r) return ctx.reply('❌ Não consegui baixar esta música agora. Tenta: *!play ' + (t.artist ? t.artist + ' - ' : '') + t.title + '*');
    await ctx.sock.sendMessage(ctx.jid, { audio: r.buf, mimetype: r.mimetype, fileName: safeName((t.artist ? t.artist + ' - ' : '') + t.title) + r.ext, ptt: false });
  } catch (e) {
    console.error('[shazam dl]', e && e.message);
    return ctx.reply('❌ Falhou o download. Tenta de novo daqui a pouco.');
  } finally { busy.delete(token); }
}

router.register('shz', handle);

module.exports = { sendCard: sendCard, sessions: sessions };
