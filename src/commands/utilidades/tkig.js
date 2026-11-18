/**
 * tk / ig  -> videos em HD (ate 720p) mas leves (H.264, ~1.8 Mbps)
 * tk2 / ig2 -> descarregam as IMAGENS (fotos / carrosseis) do TikTok e do Instagram
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const web = require('../../utils/webfetch');
const mo = require('../../utils/mediaOpt');

let queue = null;
try { queue = require('../../services/downloadQueue'); } catch (_) {}

const net = { get: web.get, run: mo.run };
const YTDLP = process.env.YTDLP_BIN || 'yt-dlp';
const MAX_IMAGES = 10;
const FORMAT = 'b[height<=720][vcodec^=avc1]/bv*[height<=720][vcodec^=avc1]+ba/b[height<=720]/bv*[height<=720]+ba/b/best';

const TK_RE = /https?:\/\/(?:[a-z0-9-]+\.)?tiktok\.com\/[^\s]+/i;
const IG_RE = /https?:\/\/(?:www\.)?instagram\.com\/[^\s]+/i;

function quotedText(ctx) {
  try {
    const ci = ctx.msg.message.extendedTextMessage.contextInfo;
    const q = ci && ci.quotedMessage;
    return q ? (q.conversation || (q.extendedTextMessage && q.extendedTextMessage.text) || '') : '';
  } catch (_) { return ''; }
}
function findUrl(ctx, re) {
  const own = (ctx.args || []).join(' ');
  const m = re.exec(own) || re.exec(quotedText(ctx));
  return m ? m[0].replace(/[)\].,;!?]+$/, '') : null;
}
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

// ---------- yt-dlp ----------
async function ytdlpVideo(url) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpv_'));
  try {
    const r = await net.run(YTDLP, ['-f', FORMAT, '--merge-output-format', 'mp4', '--no-playlist', '--max-filesize', '80M', '--no-warnings', '--no-progress', '-o', path.join(dir, 'v.%(ext)s'), url], 120000);
    const f = fs.readdirSync(dir).find((n) => /^v\./.test(n));
    if (!f) { if (r.err) console.error('[tk/ig] yt-dlp:', String(r.se || r.err.message).split('\n').slice(-2).join(' ')); return null; }
    return fs.readFileSync(path.join(dir, f));
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

async function ytdlpJson(url) {
  const r = await net.run(YTDLP, ['-J', '--no-warnings', '--no-playlist', url], 60000);
  if (r.err) return null;
  try { return JSON.parse(r.so); } catch (_) { return null; }
}

// ---------- TikTok (tikwm) ----------
async function tikwm(url) {
  const r = await net.get('https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(url), { Accept: 'application/json' }, 2 * 1024 * 1024);
  const j = JSON.parse(r.body.toString('utf8'));
  if (!j || !j.data) throw new Error((j && j.msg) || 'tikwm sem dados');
  return j.data;
}
// escolhe o link de video HD mas leve: hdplay so se pesar pouco
function pickTikwmVideo(d) {
  const lim = 12 * 1024 * 1024;
  if (d.hdplay && (!d.hd_size || d.hd_size <= lim)) return d.hdplay;
  return d.play || d.hdplay || null;
}
function tikwmImages(d) {
  const list = Array.isArray(d.images) ? d.images : [];
  return list.map((x) => (typeof x === 'string' ? x : (x && (x.url || x.src)) || null)).filter((u) => u && /^https?:\/\//i.test(u));
}

// ---------- Instagram: imagens ----------
function igCode(url) { const m = /instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i.exec(url); return m ? m[1] : null; }
function unescapeJsonStr(s) { return String(s).replace(/\\u0026/g, '&').replace(/\\u003d/g, '=').replace(/\\\//g, '/').replace(/&amp;/g, '&'); }
function igImagesFromEmbed(html) {
  const out = [];
  const re = /"display_url":"(https:[^"]+)"/g;
  let m;
  while ((m = re.exec(html))) out.push(unescapeJsonStr(m[1]));
  const im = /class="EmbeddedMediaImage"[^>]*\ssrc="([^"]+)"/.exec(html);
  if (im) out.push(unescapeJsonStr(im[1]));
  return out.filter((u, i, a) => a.indexOf(u) === i);
}
function imagesFromYtdlp(info) {
  const out = [];
  const isImg = (u, ext) => u && (/^(jpe?g|png|webp)$/i.test(ext || '') || /\.(jpe?g|png|webp)(\?|$)/i.test(u));
  const add = (e) => {
    if (!e) return;
    if (isImg(e.url, e.ext)) out.push(e.url);
    else if (Array.isArray(e.thumbnails) && e.thumbnails.length && !(e.formats && e.formats.length)) {
      const t = e.thumbnails.slice().sort((a, b) => (b.preference || 0) - (a.preference || 0) || (b.width || 0) - (a.width || 0))[0];
      if (t && t.url) out.push(t.url);
    }
  };
  if (info && Array.isArray(info.entries)) info.entries.forEach(add); else add(info);
  return out.filter((u, i, a) => u && a.indexOf(u) === i);
}

async function igImages(url) {
  const code = igCode(url);
  let urls = [];
  try { const info = await ytdlpJson(url); if (info) urls = imagesFromYtdlp(info); } catch (_) {}
  if (!urls.length && code) {
    try {
      const r = await net.get('https://www.instagram.com/p/' + code + '/embed/captioned/', { 'Accept-Language': 'en-US,en;q=0.9' }, 3 * 1024 * 1024);
      urls = igImagesFromEmbed(r.body.toString('utf8'));
    } catch (e) { console.error('[ig2] embed:', e && e.message); }
  }
  return urls;
}

// ---------- envio ----------
async function sendVideo(ctx, buf, label) {
  const o = await mo.optimizeVideo(buf);
  const out = o.buf;
  if (out.length > 62 * 1024 * 1024) return ctx.reply('❌ O vídeo é demasiado grande para o WhatsApp (' + mb(out.length) + ').');
  const cap = '✅ ' + label + ' • ' + (o.height ? o.height + 'p • ' : 'HD • ') + mb(out.length);
  await ctx.sock.sendMessage(ctx.jid, { video: out, mimetype: 'video/mp4', caption: cap }, { quoted: ctx.msg });
}

async function sendImages(ctx, urls, label) {
  let sent = 0;
  const total = Math.min(urls.length, MAX_IMAGES);
  for (const u of urls.slice(0, MAX_IMAGES)) {
    try {
      const r = await net.get(u, { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' }, 12 * 1024 * 1024);
      if (r.status !== 200 || !mo.isImage(r.body)) continue;
      const b = await mo.prepImage(r.body);
      if (!b) continue;
      await ctx.sock.sendMessage(ctx.jid, { image: b, caption: sent === 0 ? '✅ ' + label + ' • ' + total + (total === 1 ? ' imagem' : ' imagens') : undefined }, { quoted: ctx.msg });
      sent++;
    } catch (e) { console.error('[' + label + '] imagem:', e && e.message); }
  }
  return sent;
}

async function locked(ctx, label, fn) {
  if (queue && queue.tryAcquire) queue.tryAcquire(ctx, label);
  try { return await fn(); } finally { if (queue && queue.release) queue.release(); }
}

// ---------- comandos ----------
const tk = {
  name: 'tk', aliases: ['tiktok', 'ttdl', 'tiktokdl'], category: 'utilidades', description: 'Baixa video do TikTok (HD leve)', usage: 'tk <link>',
  handler: async (ctx) => {
    const url = findUrl(ctx, TK_RE);
    if (!url) return ctx.reply('🎵 `• TIKTOK`\n\n> Uso: *tk* <link do TikTok>\n> Fotos/slides: use *tk2*');
    await ctx.reply('⏳ A baixar o vídeo (HD leve)...').catch(() => {});
    return locked(ctx, 'tk', async () => {
      let buf = null;
      try { buf = await ytdlpVideo(url); } catch (e) { console.error('[tk] ytdlp:', e && e.message); }
      if (!buf) {
        try {
          const d = await tikwm(url);
          const link = pickTikwmVideo(d);
          if (link) { const r = await net.get(link, { Referer: 'https://www.tiktok.com/' }, 80 * 1024 * 1024); if (r.status === 200 && r.body.length > 10000) buf = r.body; }
          if (!buf && tikwmImages(d).length) return ctx.reply('📷 Este link é de *fotos*. Use *tk2* <link>.');
        } catch (e) { console.error('[tk] tikwm:', e && e.message); }
      }
      if (!buf) return ctx.reply('❌ Não consegui baixar este TikTok. Verifica o link (e se o yt-dlp está atualizado).');
      return sendVideo(ctx, buf, 'TikTok');
    });
  }
};

const ig = {
  name: 'ig', aliases: ['instagram', 'igdl', 'reels'], category: 'utilidades', description: 'Baixa video/reel do Instagram (HD leve)', usage: 'ig <link>',
  handler: async (ctx) => {
    const url = findUrl(ctx, IG_RE);
    if (!url) return ctx.reply('📸 `• INSTAGRAM`\n\n> Uso: *ig* <link do Instagram>\n> Fotos/carrossel: use *ig2*');
    await ctx.reply('⏳ A baixar o vídeo (HD leve)...').catch(() => {});
    return locked(ctx, 'ig', async () => {
      let buf = null;
      try { buf = await ytdlpVideo(url); } catch (e) { console.error('[ig] ytdlp:', e && e.message); }
      if (!buf) return ctx.reply('❌ Não consegui baixar este vídeo.\nSe for *foto* ou carrossel, use *ig2* <link>.');
      return sendVideo(ctx, buf, 'Instagram');
    });
  }
};

const tk2 = {
  name: 'tk2', aliases: ['tiktokfoto', 'ttfoto', 'tkimg'], category: 'utilidades', description: 'Baixa as imagens (slides/fotos) do TikTok', usage: 'tk2 <link>',
  handler: async (ctx) => {
    const url = findUrl(ctx, TK_RE);
    if (!url) return ctx.reply('🖼️ `• TIKTOK IMAGENS`\n\n> Uso: *tk2* <link de um TikTok com fotos>');
    await ctx.reply('⏳ A baixar as imagens...').catch(() => {});
    return locked(ctx, 'tk2', async () => {
      let d;
      try { d = await tikwm(url); } catch (e) { console.error('[tk2] tikwm:', e && e.message); return ctx.reply('❌ Não consegui ler este link do TikTok.'); }
      let urls = tikwmImages(d);
      let note = '';
      if (!urls.length) {
        const cover = d.origin_cover || d.cover;
        if (!cover) return ctx.reply('❌ Este TikTok não tem imagens. Se for vídeo, use *tk*.');
        urls = [cover]; note = 'vídeo (capa)';
      }
      const n = await sendImages(ctx, urls, 'TikTok');
      if (!n) return ctx.reply('❌ Encontrei as imagens mas não consegui descarregá-las.');
      if (note) await ctx.reply('ℹ️ Este link é um ' + note + '. Para o vídeo use *tk*.').catch(() => {});
    });
  }
};

const ig2 = {
  name: 'ig2', aliases: ['instafoto', 'igfoto', 'igimg'], category: 'utilidades', description: 'Baixa as imagens (fotos/carrossel) do Instagram', usage: 'ig2 <link>',
  handler: async (ctx) => {
    const url = findUrl(ctx, IG_RE);
    if (!url) return ctx.reply('🖼️ `• INSTAGRAM IMAGENS`\n\n> Uso: *ig2* <link de uma foto/carrossel>');
    await ctx.reply('⏳ A baixar as imagens...').catch(() => {});
    return locked(ctx, 'ig2', async () => {
      const urls = await igImages(url);
      if (!urls.length) return ctx.reply('❌ Não encontrei imagens neste link (a conta pode ser privada). Se for vídeo/reel, use *ig*.');
      const n = await sendImages(ctx, urls, 'Instagram');
      if (!n) return ctx.reply('❌ Encontrei as imagens mas não consegui descarregá-las.');
    });
  }
};

module.exports = [tk, ig, tk2, ig2];
module.exports.net = net;
module.exports.__t = { pickTikwmVideo, tikwmImages, igImagesFromEmbed, imagesFromYtdlp, igCode, findUrl, TK_RE, IG_RE, FORMAT };
