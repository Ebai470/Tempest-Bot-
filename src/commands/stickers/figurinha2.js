/**
 * figurinha2 <nome> <quantidade 1-10>
 * Procura imagens (Pinterest + fallback publico), converte em figurinhas 1:1 e envia.
 * Fontes: Pinterest (endpoint de pesquisa -> HTML) e, se o Pinterest bloquear, Openverse (publico).
 */
const crypto = require('crypto');
const media = require('../../utils/media');

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const MAX_BYTES = 6 * 1024 * 1024, MIN_BYTES = 3000, COOLDOWN_MS = 25000, MAX_TRIES = 35;
const BLOCK = /\b(porn\w*|porno\w*|sex(o|y|ual)?|nu[ad]?s?|nude[s]?|nsfw|xxx|hentai|er[oó]tic\w*|onlyfans|\+?18|gore)\b/i;
const busy = new Set(); const last = new Map();

async function getBuf(url, headers, timeout) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeout || 15000);
  try {
    const r = await fetch(url, { headers: Object.assign({ 'User-Agent': UA }, headers || {}), signal: ac.signal, redirect: 'follow' });
    const len = parseInt(r.headers.get('content-length') || '0', 10); if (len > MAX_BYTES) throw new Error('grande');
    const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > MAX_BYTES) throw new Error('grande');
    return { status: r.status, buf, type: String(r.headers.get('content-type') || '') };
  } finally { clearTimeout(t); }
}
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = (a) => a.filter((u, i) => u && a.indexOf(u) === i);
const uniqUrl = (a) => { const s = new Set(); return a.filter((c) => c && c.url && !s.has(c.url) && s.add(c.url)); };
// imagens quase quadradas primeiro (esticam menos para 1:1); wallpapers muito altos/largos por último
function order(list) {
  const near = [], mid = [], far = [];
  for (const c of list) { const k = c.w > 0 && c.h > 0 ? Math.abs(Math.log(c.w / c.h)) : 0.45; (k <= 0.3 ? near : k <= 0.6 ? mid : far).push(c); }
  return shuffle(near).concat(shuffle(mid), shuffle(far));
}

// 1) endpoint interno de pesquisa do Pinterest (JSON)
async function pinterestJson(q) {
  const data = JSON.stringify({ options: { query: q, scope: 'pins', page_size: 40, rs: 'typed' }, context: {} });
  const url = 'https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=' + encodeURIComponent('/search/pins/?q=' + q) + '&data=' + encodeURIComponent(data) + '&_=' + Date.now();
  const r = await getBuf(url, { Accept: 'application/json, text/javascript, */*; q=0.01', 'X-Requested-With': 'XMLHttpRequest', 'X-Pinterest-AppState': 'active', 'Accept-Language': 'en-US,en;q=0.9', Referer: 'https://www.pinterest.com/' });
  if (r.status !== 200) throw new Error('HTTP ' + r.status);
  const j = JSON.parse(r.buf.toString('utf8')); const res = (j.resource_response && j.resource_response.data && j.resource_response.data.results) || [];
  return uniqUrl(res.map((x) => { const im = (x && x.images) || {}; const p = im['736x'] || im['564x'] || im['474x'] || im.orig || {}; return { url: p.url, w: p.width, h: p.height }; }));
}
// 2) pagina de pesquisa (HTML) — extrai links i.pinimg.com
async function pinterestHtml(q) {
  const r = await getBuf('https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(q) + '&rs=typed', { Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' });
  if (r.status !== 200) throw new Error('HTTP ' + r.status);
  const m = r.buf.toString('utf8').match(/https:\/\/i\.pinimg\.com\/(?:originals|736x|564x|474x|236x)\/[A-Za-z0-9\/_\-]+\.(?:jpg|jpeg|png)/g) || [];
  return uniqUrl(m.map((u) => ({ url: u.replace(/\/(236x|474x|564x)\//, '/736x/') })));
}
// 3) fallback publico
async function openverse(q) {
  const r = await getBuf('https://api.openverse.org/v1/images/?q=' + encodeURIComponent(q) + '&page_size=20&format=json', { Accept: 'application/json' });
  if (r.status !== 200) throw new Error('HTTP ' + r.status);
  return uniqUrl(((JSON.parse(r.buf.toString('utf8')).results) || []).map((x) => ({ url: x.url || x.thumbnail, w: x.width, h: x.height })).filter((c) => /^https?:\/\//i.test(c.url || '')));
}

async function toSticker(buf, query) {
  let webp = await media.toStickerWebp(buf); // estica para 512x512 (1:1), igual ao comando de figurinha do bot
  try { webp = require('../../utils/webpExif').stickerMeta(webp, String(query).slice(0, 30), 'TEMPEST BOT'); } catch (_) {}
  return webp;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isImg = (b, t) => b && b.length >= MIN_BYTES && !/html|json/i.test(t) && ((b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50) || (b[0] === 0x47 && b[1] === 0x49) || (b[0] === 0x52 && b[1] === 0x49));

module.exports = [{
  name: 'figurinha2', aliases: ['figpin', 'pinfig', 'pinsticker'], category: 'stickers',
  description: 'Figurinhas 1:1 por pesquisa: figurinha2 <nome> <1-10>', usage: 'figurinha2 <nome> <quantidade 1-10>',
  handler: async (ctx) => {
    const a = (ctx.args || []).slice(); let qty = null;
    if (a.length && /^\d+$/.test(a[a.length - 1])) qty = parseInt(a.pop(), 10); else if (a.length > 1 && /^\d+$/.test(a[0])) qty = parseInt(a.shift(), 10);
    const query = a.join(' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!query) return ctx.reply('🎴 *FIGURINHA2*\n\nUso: *figurinha2 <nome> <quantidade 1-10>*\nEx: *figurinha2 naruto 5*\n\n_Procuro as imagens, transformo em figurinhas (1:1) e envio._');
    if (qty === null) qty = 1;
    if (!(qty >= 1 && qty <= 10)) return ctx.reply('❌ A quantidade deve ser de *1 a 10*. Ex: *figurinha2 ' + query + ' 5*');
    if (BLOCK.test(query)) return ctx.reply('🚫 Essa pesquisa não é permitida.');
    if (!media.available()) return ctx.reply('❌ Sem processador de imagem.\nnpm install jimp --legacy-peer-deps');
    const who = String(ctx.sender || ctx.jid); const owner = typeof ctx.isOwner === 'function' && ctx.isOwner();
    if (busy.has(who)) return ctx.reply('⏳ Ainda estou a preparar as tuas figurinhas anteriores.');
    const wait = COOLDOWN_MS - (Date.now() - (last.get(who) || 0)); if (!owner && wait > 0) return ctx.reply('⏳ Aguarde ' + Math.ceil(wait / 1000) + 's para pedir mais figurinhas.');
    busy.add(who); last.set(who, Date.now());
    try {
      await ctx.reply('🔎 A procurar figurinhas *' + query + '* (' + qty + ' figurinha' + (qty > 1 ? 's' : '') + ')...').catch(() => {});
      let urls = [], fromPin = 0;
      for (const f of [pinterestJson, pinterestHtml]) { try { urls = await f(query); if (urls.length) break; } catch (e) { console.error('[figurinha2] ' + f.name + ': ' + e.message); } }
      fromPin = urls.length; urls = order(urls);
      if (urls.length < qty * 3) { try { urls = urls.concat(order(await openverse(query))); } catch (e) { console.error('[figurinha2] openverse: ' + e.message); } }
      urls = uniqUrl(urls).slice(0, MAX_TRIES);
      if (!urls.length) return ctx.reply('❌ Não encontrei imagens para *' + query + '*.\nTenta outro termo (ex: em inglês).');
      let sent = 0, tries = 0, fails = 0; const seen = new Set();
      for (const u of urls) {
        if (sent >= qty || fails >= 6) break; tries++;
        try {
          const r = await getBuf(u.url, { Accept: 'image/*,*/*;q=0.8', Referer: 'https://www.pinterest.com/' }, 15000);
          if (r.status !== 200 || !isImg(r.buf, r.type)) throw new Error('nao e imagem');
          const h = crypto.createHash('md5').update(r.buf).digest('hex'); if (seen.has(h)) continue; seen.add(h);
          const webp = await toSticker(r.buf, query);
          await ctx.sock.sendMessage(ctx.jid, { sticker: webp }, sent === 0 ? { quoted: ctx.msg } : {}); sent++; fails = 0;
          if (sent < qty) await sleep(700);
        } catch (e) { fails++; console.error('[figurinha2] skip: ' + (e && e.message)); }
      }
      if (!sent) return ctx.reply('❌ Encontrei links mas não consegui criar as figurinhas.\nTenta outro termo.');
      if (sent < qty) return ctx.reply('⚠️ Só consegui enviar *' + sent + '* de ' + qty + ' figurinhas' + '.');
    } catch (e) { console.error('[figurinha2]', e); await ctx.reply('❌ Erro ao criar as figurinhas.'); }
    finally { busy.delete(who); }
  }
}];
