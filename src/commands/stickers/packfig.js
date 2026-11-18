'use strict';
/**
 * packfig <termo> [quantidade] — procura imagens (Pinterest, Bing, Openverse), sorteia, transforma
 * em figurinhas e manda UM pacote nativo do WhatsApp ("Ver pacote de figurinhas").
 * Comando novo e isolado: não altera nenhum outro comando.
 *
 * Ex.: !packfig sasuke        (35 figurinhas)
 *      !packfig sasuke 50     (até 60)
 */
const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { URL } = require('url');
const media = require('../../utils/media');
const { withDownloadLock } = require('../../services/downloadQueue');

let BOT = 'TEMPEST BOT';
try { BOT = require('../../config').botName || BOT; } catch (_) {}

const DEF_QTY = 35, MAX_QTY = 60, MIN_QTY = 3, WORKERS = 10;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/* ---------- rede ---------- */
function get(urlStr, headers, timeoutMs, maxBytes, depth) {
  return new Promise(function (resolve, reject) {
    let u; try { u = new URL(urlStr); } catch (e) { return reject(new Error('URL inválida')); }
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, method: 'GET', timeout: timeoutMs || 15000,
      headers: Object.assign({ 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' }, headers || {})
    }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (depth || 0) < 4) {
        res.resume();
        return get(new URL(res.headers.location, urlStr).href, headers, timeoutMs, maxBytes, (depth || 0) + 1).then(resolve, reject);
      }
      const ch = []; let n = 0;
      res.on('data', function (c) { n += c.length; if (maxBytes && n > maxBytes) { req.destroy(); return reject(new Error('arquivo grande demais')); } ch.push(c); });
      res.on('end', function () { resolve({ status: res.statusCode, buf: Buffer.concat(ch), headers: res.headers }); });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}
const withTimeout = function (p, ms, fb) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(fb); }, ms); })]); };
function raceTimeout(p, ms, msg) { return new Promise(function (res, rej) { const t = setTimeout(function () { rej(new Error(msg)); }, ms); p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); }); }); }
const shuffle = function (a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

/* ---------- fontes de imagem ---------- */
function parsePinterest(j) {
  const resp = (j && j.resource_response) || {};
  const results = (resp.data && (resp.data.results || (Array.isArray(resp.data) ? resp.data : []))) || [];
  const urls = [];
  results.forEach(function (x) {
    const im = x && x.images; if (!im) return;
    const pick = im['564x'] || im['736x'] || im['474x'] || im.orig || im['236x'];
    if (pick && pick.url && !/\.gif($|\?)/i.test(pick.url)) urls.push(pick.url);
  });
  const bm = resp.bookmark || (j && j.resource && j.resource.options && j.resource.options.bookmarks && j.resource.options.bookmarks[0]) || null;
  return { urls: urls, bookmark: bm };
}
async function srcPinterest(q, want) {
  const out = []; let bookmark = null;
  for (let page = 0; page < 8 && out.length < want; page++) {
    const options = { isPrefetch: false, query: q, scope: 'pins', no_fetch_context_on_resource: false, page_size: 50 };
    if (bookmark) options.bookmarks = [bookmark];
    const src = '/search/pins/?q=' + encodeURIComponent(q) + '&rs=typed';
    const url = 'https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=' + encodeURIComponent(src)
      + '&data=' + encodeURIComponent(JSON.stringify({ options: options, context: {} })) + '&_=' + Date.now();
    let r;
    try {
      r = await get(url, { 'Accept': 'application/json, text/javascript, */*, q=0.01', 'X-Requested-With': 'XMLHttpRequest', 'X-Pinterest-AppState': 'active',
        'X-Pinterest-Source-Url': src, 'X-APP-VERSION': 'c9e7a5d', 'Referer': 'https://www.pinterest.com/' }, 12000, 6e6);
    } catch (_) { break; }
    if (r.status !== 200) break;
    let j; try { j = JSON.parse(r.buf.toString('utf8')); } catch (_) { break; }
    const p = parsePinterest(j);
    p.urls.forEach(function (u) { out.push(u); });
    if (!p.bookmark || p.bookmark === '-end-') break;
    bookmark = p.bookmark;
  }
  return out;
}
function parseBing(html) {
  const out = []; const re = /murl&quot;:&quot;(https?:[^&]*?(?:&amp;[^&]*?)*?)&quot;/g; let m;
  while ((m = re.exec(html))) { const u = m[1].replace(/&amp;/g, '&'); if (!/\.(gif|svg)($|\?)/i.test(u)) out.push(u); }
  return out;
}
async function srcBing(q, want) {
  const out = [];
  for (let first = 0; first < 280 && out.length < want; first += 35) {
    const url = 'https://www.bing.com/images/async?q=' + encodeURIComponent(q) + '&first=' + first + '&count=35&mmasync=1&adlt=strict&setlang=pt-BR';
    let r; try { r = await get(url, { 'Accept': 'text/html,*/*' }, 12000, 4e6); } catch (_) { break; }
    if (r.status !== 200) break;
    const got = parseBing(r.buf.toString('utf8'));
    if (!got.length) break;
    got.forEach(function (u) { out.push(u); });
  }
  return out;
}
async function srcOpenverse(q, want) {
  const out = [];
  for (let page = 1; page <= 3 && out.length < want; page++) {
    try {
      const r = await get('https://api.openverse.org/v1/images/?q=' + encodeURIComponent(q) + '&page_size=50&page=' + page + '&mature=false', { 'Accept': 'application/json' }, 12000, 3e6);
      if (r.status !== 200) break;
      const j = JSON.parse(r.buf.toString('utf8'));
      (j.results || []).forEach(function (x) { const u = x.thumbnail || x.url; if (u && !/\.(gif|svg)($|\?)/i.test(u)) out.push(u); });
      if (!(j.results || []).length) break;
    } catch (_) { break; }
  }
  return out;
}
const SOURCES = [srcPinterest, srcBing, srcOpenverse];

async function collect(q, qty, sources) {
  const seen = {}; const all = []; const need = Math.max(qty * 2, 80);   // basta ter o dobro do pedido
  for (let i = 0; i < sources.length && all.length < need; i++) {
    let list = []; try { list = await withTimeout(sources[i](q, need), 25000, []); } catch (_) {}
    list.forEach(function (u) { if (u && !seen[u]) { seen[u] = 1; all.push(u); } });
  }
  return all;
}

/* ---------- imagem -> figurinha (ffmpeg direto = rápido) ---------- */
function isImage(b) {
  if (!b || b.length < 2000) return false;
  const h = b.slice(0, 12);
  return (h[0] === 0xff && h[1] === 0xd8) || (h[0] === 0x89 && h.toString('ascii', 1, 4) === 'PNG') || (h.toString('ascii', 0, 4) === 'RIFF' && h.toString('ascii', 8, 12) === 'WEBP');
}
let ffOk = true;
function ff(args) {
  return new Promise(function (resolve, reject) {
    execFile('ffmpeg', ['-v', 'error', '-y'].concat(args), { timeout: 25000 }, function (err) {
      if (err) { if (err.code === 'ENOENT') ffOk = false; return reject(err); }
      resolve();
    });
  });
}
const tmpf = function (ext) { return path.join(os.tmpdir(), 'pf_' + crypto.randomBytes(6).toString('hex') + '.' + ext); };
const FIT = 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000';
async function toStickerFF(buf) {
  const inF = tmpf('img'), outF = tmpf('webp');
  try {
    fs.writeFileSync(inF, buf);
    await ff(['-i', inF, '-vf', FIT, '-c:v', 'libwebp', '-quality', '68', '-compression_level', '3', '-an', outF]);
    let out = fs.readFileSync(outF);
    if (out.length > 95000) { await ff(['-i', inF, '-vf', FIT, '-c:v', 'libwebp', '-quality', '40', '-an', outF]); out = fs.readFileSync(outF); }
    return out;
  } finally { try { fs.unlinkSync(inF); } catch (_) {} try { fs.unlinkSync(outF); } catch (_) {} }
}
async function toStickerJimp(buf) {
  const Jimp = require('jimp');
  const img = await Jimp.read(buf);
  img.contain(512, 512, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
  const png = await img.getBufferAsync(Jimp.MIME_PNG);
  const webp = await media.pngToWebp(png);
  if (!webp) throw new Error('sem conversor webp');
  return webp;
}
async function toSticker(buf) {
  if (ffOk) { try { return await toStickerFF(buf); } catch (e) { if (ffOk) throw e; } }
  return toStickerJimp(buf);
}
async function toCover(buf, fallback) {
  if (!ffOk) return fallback;
  const inF = tmpf('img'), outF = tmpf('png');
  try {
    fs.writeFileSync(inF, buf);
    await ff(['-i', inF, '-vf', 'scale=252:252:force_original_aspect_ratio=increase,crop=252:252', outF]);
    return fs.readFileSync(outF);
  } catch (_) { return fallback; }
  finally { try { fs.unlinkSync(inF); } catch (_) {} try { fs.unlinkSync(outF); } catch (_) {} }
}
const impl = { convert: toSticker, cover: toCover, generate: null };

async function makeOne(url) {
  const r = await get(url, { 'Accept': 'image/*,*/*', 'Referer': 'https://www.google.com/' }, 9000, 6e6);
  if (r.status !== 200 || !isImage(r.buf)) throw new Error('imagem inválida');
  const webp = await impl.convert(r.buf);
  if (!webp || webp.length < 100) throw new Error('falha na conversão');
  return { src: r.buf, webp: webp };
}
async function buildStickers(urls, qty) {
  const stickers = []; let first = null, idx = 0; const T = Date.now();
  async function worker() {
    while (stickers.length < qty && Date.now() - T < 100000) {
      const i = idx++; if (i >= urls.length) return;
      try { const r = await makeOne(urls[i]); if (stickers.length < qty) { stickers.push(r.webp); if (!first) first = r.src; } } catch (_) {}
    }
  }
  const ws = []; for (let i = 0; i < Math.min(WORKERS, urls.length); i++) ws.push(worker());
  await Promise.all(ws);
  return { stickers: stickers, first: first };
}

/* ---------- envio do pacote (UMA mensagem) ---------- */
async function defaultGenerate(ctx, content) {
  const B = require('@whiskeysockets/baileys');
  const sock = ctx.sock;
  if (!B.proto || !B.proto.Message || !B.proto.Message.StickerPackMessage) throw new Error('esta versão do Baileys não tem pacote de figurinhas (atualize: npm i @whiskeysockets/baileys@latest)');
  if (typeof B.generateWAMessage !== 'function') throw new Error('generateWAMessage indisponível');
  const full = await B.generateWAMessage(ctx.jid, content, { logger: sock.logger, userJid: sock.user && sock.user.id, upload: sock.waUploadToServer, quoted: ctx.msg });
  await sock.relayMessage(ctx.jid, full.message, { messageId: full.key.id });
}
async function sendPack(ctx, name, stickers, cover) {
  const gen = impl.generate || defaultGenerate;
  const packId = crypto.randomBytes(8).toString('hex');
  const shapes = ['data', 'sticker'];
  const errs = [];
  for (let s = 0; s < shapes.length; s++) {
    const key = shapes[s];
    const content = { stickerPack: {
      name: name, publisher: BOT, packId: packId, description: 'Pack criado por ' + BOT, cover: cover,
      stickers: stickers.map(function (b) { const o = { emojis: ['✨'], accessibilityLabel: name, isAnimated: false }; o[key] = b; return o; })
    } };
    try { await raceTimeout(gen(ctx, content), 240000, 'o envio demorou demais'); return true; }
    catch (e) { errs.push(String((e && e.message) || e)); console.error('[packfig] formato "' + key + '":', e && e.message); }
  }
  const err = new Error(errs[0]); err.all = errs; throw err;
}

/* ---------- comando ---------- */
/* TP_PACKCHECK: confere se o Baileys instalado sabe MONTAR pacote de figurinhas (antes de baixar qualquer coisa) */
function packSupport() {
  try {
    const B = require('@whiskeysockets/baileys'), fs2 = require('fs'), path2 = require('path');
    let ver = '?'; try { ver = require('@whiskeysockets/baileys/package.json').version; } catch (_) {}
    if (!B.proto || !B.proto.Message || !B.proto.Message.StickerPackMessage || typeof B.generateWAMessage !== 'function') return { ok: false, ver: ver };
    const base = path2.dirname(require.resolve('@whiskeysockets/baileys'));
    for (const rel of ['Utils/messages.js', 'Utils/messages.mjs', '../lib/Utils/messages.js']) {
      const f = path2.join(base, rel);
      if (fs2.existsSync(f)) return { ok: /stickerPack/.test(fs2.readFileSync(f, 'utf8')), ver: ver };
    }
    return { ok: true, ver: ver };
  } catch (e) { return { ok: true, ver: '?' }; }
}
function packSupportMsg(sup) {
  return '❌ O Baileys do bot (versão ' + sup.ver + ') não sabe montar pacote de figurinhas.\n\nAtualize no Termux:\ncd ~/tempest-bot\nnpm i @whiskeysockets/baileys@latest\n\nDepois reinicie o bot.';
}

async function run(ctx, sources) {
  const args = (ctx.args || []).slice(); let qty = DEF_QTY;
  if (args.length > 1 && /^\d{1,3}$/.test(args[args.length - 1])) qty = parseInt(args.pop(), 10);
  qty = Math.max(MIN_QTY, Math.min(MAX_QTY, qty));
  const term = args.join(' ').trim();
  const p = ctx.prefix || '!';
  if (!term) return ctx.reply('📦 *PACKFIG*\n\nCria um pacote de figurinhas com imagens da internet.\n\nUso: *' + p + 'packfig nome*\nEx.: ' + p + 'packfig sasuke\nEx.: ' + p + 'packfig sasuke 50 _(até ' + MAX_QTY + ')_');
  if (!media.available() && !ffOk) return ctx.reply('❌ Sem processador de imagem.\npkg install ffmpeg');

  { const _sup = packSupport(); if (!_sup.ok) return ctx.reply(packSupportMsg(_sup)); } // TP_PACKCHECK
  await ctx.reply('📦 *Gerando seu pack de figurinhas, mestre...*');   // única mensagem de texto
  const T = Date.now();
  const urls = await collect(term, qty, sources || SOURCES);
  if (!urls.length) return ctx.reply('❌ Não encontrei imagens para *' + term + '*. Tente outro nome.');
  const built = await buildStickers(shuffle(urls), qty);
  console.log('[packfig] ' + built.stickers.length + '/' + qty + ' figurinhas em ' + ((Date.now() - T) / 1000).toFixed(1) + 's');
  if (built.stickers.length < MIN_QTY) return ctx.reply('❌ Só consegui ' + built.stickers.length + ' figurinha(s). Tente outro nome.');
  const cover = await impl.cover(built.first, built.stickers[0]);
  try { await sendPack(ctx, term, built.stickers, cover); }
  catch (e) { if (/Invalid media type/i.test(String(e && e.message))) return ctx.reply(packSupportMsg({ ver: packSupport().ver })); return ctx.reply('❌ Não consegui montar o pacote: ' + String(e.message).slice(0, 160)); }
}

module.exports = {
  name: 'packfig', aliases: ['figpack', 'packfigurinhas', 'pacotefig'], category: 'stickers',
  description: 'Cria um pacote de figurinhas a partir de uma pesquisa de imagens', usage: 'packfig <nome> [quantidade]',
  handler: withDownloadLock('packfig', function (ctx) {
    return run(ctx, null).catch(function (e) {
      console.error('[packfig] erro:', e && e.message);
      return ctx.reply('❌ Erro ao criar o pack: ' + String((e && e.message) || e).slice(0, 200)).catch(function () {});
    });
  }),
  _t: { run: run, parsePinterest: parsePinterest, parseBing: parseBing, impl: impl, isImage: isImage }
};
