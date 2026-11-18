'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const BASE = 'https://animeshentai.biz';
const SESSION_DIR = path.join(process.cwd(), 'data', 'hentai-sessions');
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const off = () => String(getEnv('HENTAI_BUTTONS') || '').toLowerCase() === 'off';
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const PREF = (ctx) => (ctx && ctx.prefix && String(ctx.prefix).trim()) || (config.prefixes && config.prefixes[0]) || '!';

function sessFile(ctx) {
  const who = String(ctx.sender || '').replace(/\D/g, '').slice(-12);
  const jid = String(ctx.jid || 'pv');
  return path.join(SESSION_DIR, jid.replace(/[^a-zA-Z0-9._-]/g, '_') + '_' + who + '.json');
}
function loadSession(ctx) { try { return JSON.parse(fs.readFileSync(sessFile(ctx), 'utf8')); } catch (_) { return null; } }

const covers = new Map();
function getBuf(url, depth) {
  return new Promise((resolve, reject) => {
    let u; try { u = new URL(url); } catch (e) { return reject(e); }
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get(url, { headers: { 'User-Agent': UA, Accept: '*/*' }, timeout: 10000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (depth || 0) < 4) {
        res.resume(); return getBuf(new URL(res.headers.location, url).href, (depth || 0) + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const ch = []; let n = 0;
      res.on('data', (c) => { n += c.length; if (n > 8 * 1024 * 1024) req.destroy(); else ch.push(c); });
      res.on('end', () => resolve(Buffer.concat(ch)));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}
async function findCover(pageUrl) {
  if (!pageUrl) return null;
  if (covers.has(pageUrl)) return covers.get(pageUrl);
  let buf = null;
  try {
    const html = (await getBuf(pageUrl)).toString('utf8');
    let m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    let img = m && m[1];
    if (!img) { m = html.match(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png)[^"']*)["']/i); img = m && m[1]; }
    if (img && !/\.webp(\?|$)/i.test(img)) { const raw = await getBuf(new URL(img, pageUrl).href); if (raw.length > 2000) buf = raw; }
  } catch (_) {}
  if (covers.size > 30) covers.delete(covers.keys().next().value);
  covers.set(pageUrl, buf);
  return buf;
}

const box = (lines) => '╭──〔 🔥 MENU +18 〕──╮\n' + lines.map((l) => (l === '' ? '│' : '│ ' + l)).join('\n') + '\n╰──〔 18+ 〕──╯';

function classify(t) {
  if (/Conteudo 18\+/.test(t) && /mhadm/.test(t)) return 'menu';
  if (/Escolhe: \*h1\*/.test(t)) return 'results';
  if (/✅ \*Selecionado\*/.test(t)) return 'selected';
  if (/Episodios: \*\d+\*/.test(t)) return 'eps';
  if (/Nenhum resultado para/.test(t)) return 'none';
  return null;
}

async function present(ctx, text, stage) {
  const foot = '© ' + config.botName + ' • +18';
  const p = PREF(ctx);
  if (stage === 'menu') {
    return sendNative(ctx.sock, ctx.jid, {
      body: box(['⚠️ *Conteúdo 18+*', '', '🔎 Pesquise por nome e escolha na lista', '🎞️ Veja os episódios e assista no navegador', '', '_Fonte: animeshentai.biz_']), footer: foot, quoted: ctx.msg, fallback: text,
      buttons: [btn.copy('🔎 Pesquisar (copiar)', p + 'hentai '), btn.reply('🔒 Só ADM/Owner', 'hn:mh:on'), btn.reply('🔓 Liberar grupo', 'hn:mh:off'), btn.reply('🏠 Menu', 'mn:home')]
    });
  }
  if (stage === 'none') {
    const q = ((text.split('Nenhum resultado para:')[1] || '').match(/"([^"]+)"/) || [])[1] || '';
    return sendNative(ctx.sock, ctx.jid, { body: box(['❌ Nenhum resultado para:', '"' + q + '"']), footer: foot, quoted: ctx.msg, fallback: text,
      buttons: [btn.url('🌐 Abrir busca no site', BASE + '/search/' + encodeURIComponent(q)), btn.reply('🏠 Menu', 'mn:home')] });
  }
  const s = loadSession(ctx);
  if (!s) throw new Error('sem sessao');
  if (stage === 'results') {
    const res = s.results || [];
    if (!res.length) throw new Error('sem resultados');
    const rows = res.slice(0, 8).map((r, i) => ({ header: '🔥 H' + (i + 1), title: clip(r.title, 60), description: 'Escolher este título', id: 'hn:pick:' + (i + 1) }));
    return sendNative(ctx.sock, ctx.jid, {
      body: box(['🔎 *' + s.query + '*', '✅ ' + res.length + ' resultados', '', '👇 Toque em *Escolher título*']), footer: foot, image: await findCover(res[0].url), quoted: ctx.msg, fallback: text,
      buttons: [btn.list('🔥 Escolher título', [{ title: '🔥 Resultados', rows: rows }]), btn.url('🌐 Abrir busca no site', BASE + '/search/' + encodeURIComponent(s.query)), btn.reply('🏠 Menu', 'mn:home')]
    });
  }
  if (stage === 'selected') {
    const it = s.selected;
    if (!it) throw new Error('sem selecao');
    const others = [];
    (s.results || []).forEach((r, i) => { if (r.url !== it.url && others.length < 7) others.push({ header: '🔥 H' + (i + 1), title: clip(r.title, 60), description: 'Ver este', id: 'hn:pick:' + (i + 1) }); });
    const b = [btn.reply('🎞️ Ver episódios', 'hn:cmd:hep'), btn.url('▶️ Abrir no navegador', it.url)];
    if (others.length) b.push(btn.list('🔎 Outros resultados', [{ title: '🔎 Outros', rows: others }]));
    b.push(btn.reply('🏠 Menu', 'mn:home'));
    return sendNative(ctx.sock, ctx.jid, {
      body: box(['✅ *Selecionado*', '🎬 *' + it.title + '*', '', '👇 Veja os episódios ou abra no navegador']), footer: foot, image: await findCover(it.url), quoted: ctx.msg, fallback: text, buttons: b
    });
  }
  if (stage === 'eps') {
    const it = s.selected, eps = s.eps || [];
    if (!it || !eps.length) throw new Error('sem episodios');
    const b = [];
    if (eps.length === 1 && /^Abrir pagina$/i.test(eps[0].title)) b.push(btn.url('▶️ Abrir no navegador', eps[0].url));
    else {
      const sections = [];
      for (let i = 0; i < Math.min(eps.length, 30); i += 10) {
        const part = eps.slice(i, i + 10);
        sections.push({ title: '🎞️ EP ' + (i + 1) + ' – ' + (i + part.length), rows: part.map((e, k) => ({ header: '', title: 'Episódio ' + (i + k + 1), description: clip(e.title, 70), id: 'hn:ep:' + (i + k) })) });
      }
      b.push(btn.list('🎞️ Ver Episódios', sections), btn.url('🌐 Abrir no navegador', it.url));
    }
    b.push(btn.reply('🏠 Menu', 'mn:home'));
    return sendNative(ctx.sock, ctx.jid, {
      body: box(['🎬 *' + it.title + '*', '🎞️ Episódios: *' + eps.length + '*', '', '👇 Escolha e assista no navegador']), footer: foot, image: await findCover(it.url), quoted: ctx.msg, fallback: text, buttons: b
    });
  }
  throw new Error('etapa desconhecida');
}

function wrap(name) {
  const e = registry.get(name);
  if (!e || e.__tpHentai) return;
  const orig = e.handler;
  e.handler = async function (ctx) {
    if (off() || typeof ctx.reply !== 'function') return orig.call(this, ctx);
    const had = Object.prototype.hasOwnProperty.call(ctx, 'reply');
    const prev = ctx.reply, origReply = prev.bind(ctx), held = [];
    ctx.reply = async function (text, opts) {
      if (typeof text === 'string' && classify(text)) { held.push({ text: text, opts: opts }); return; }
      return origReply(text, opts);
    };
    try { await orig.call(this, ctx); } finally { if (had) ctx.reply = prev; else delete ctx.reply; }
    for (const h of held) {
      try { await present(ctx, h.text, classify(h.text)); }
      catch (err) { console.error('[hentai-ui]', err && err.message); await origReply(h.text, h.opts); }
    }
  };
  e.__tpHentai = true; e.__tpUx = true;
}
['menuhentai', 'hentai', 'hep', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8'].forEach(wrap);

router.register('hn', async (ctx, rest) => {
  const p = rest.split(':');
  const say = (t) => ctx.sock.sendMessage(ctx.jid, { text: t });
  if (p[0] === 'ep') {
    const s = loadSession(ctx);
    const ep = s && s.eps && s.eps[parseInt(p[1], 10)];
    if (!ep) return say('⌛ Essa lista é de outra busca ou expirou. Use *hentai <nome>*.');
    return sendNative(ctx.sock, ctx.jid, {
      body: box(['🎬 *' + ((s.selected && s.selected.title) || 'Título') + '*', '▶️ *Episódio ' + (parseInt(p[1], 10) + 1) + '*', '', '👇 Toque no botão para assistir no navegador']), footer: '© ' + config.botName + ' • +18',
      image: await findCover(s.selected && s.selected.url), fallback: ep.url, buttons: [btn.url('▶️ Assistir EP ' + (parseInt(p[1], 10) + 1), ep.url)]
    });
  }
  let name = null, args = [];
  if (p[0] === 'pick') name = 'h' + p[1];
  else if (p[0] === 'cmd') name = p[1];
  else if (p[0] === 'mh') { name = 'mhadm'; args = [p[1]]; }
  const e = name && registry.get(name);
  if (!e || typeof e.handler !== 'function') return;
  ctx.args = args; ctx.prefix = ctx.prefix || (config.prefixes && config.prefixes[0]) || '!';
  return e.handler(ctx);
});

module.exports = { classify, present };
