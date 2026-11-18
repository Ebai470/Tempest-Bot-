'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const BASE = 'https://vembaixarfilmes.net';
const SESS_DIR = path.join(__dirname, '../../data/filme-sessions');
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const off = () => String(getEnv('FILME_BUTTONS') || '').toLowerCase() === 'off';
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const emoji = (t) => (t === 'serie' ? '📺' : '🎥');
const kind = (t) => (t === 'serie' ? 'Série' : 'Filme');

function sessFile(ctx) { return path.join(SESS_DIR, Buffer.from(String(ctx.jid || '') + '|' + String(ctx.sender || '')).toString('hex').slice(0, 48) + '.json'); }
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
  if (covers.size > 40) covers.delete(covers.keys().next().value);
  covers.set(pageUrl, buf);
  return buf;
}

const box = (lines) => '╭━━━〔 🎬 FILME / SÉRIE 〕━━━╮\n' + lines.map((l) => (l === '' ? '┃' : '┃ ' + l)).join('\n') + '\n╰━━━━━━━━━━━━━━━━━━━━━━╯';
const QUAL = [['f1', '360p', 'Menor tamanho'], ['f2', '480p', 'Qualidade padrão'], ['f3', '720p', 'HD'], ['f4', 'HD / Melhor', 'Melhor qualidade disponível']];
const qualSection = () => ({ title: '⬇️ Baixar (qualidade)', rows: QUAL.map((q, i) => ({ header: '', title: q[1], description: q[2], id: 'fm:q:' + (i + 1) })) });

function classify(t) {
  if (/✅ \*Resultados\*/.test(t) && /N1/.test(t)) return 'results';
  if (/✅ \*Selecionado\*/.test(t)) return 'selected';
  if (/Link recebido/.test(t) && /F1/.test(t)) return 'dwlink';
  if (/Nenhum resultado para/.test(t)) return 'none';
  return null;
}

async function present(ctx, text, stage) {
  const foot = '© ' + config.botName;
  if (stage === 'none') {
    const m = text.split('Nenhum resultado para:')[1] || '';
    const q = ((m.match(/\*([^*]+)\*/) || [])[1] || '').trim();
    return sendNative(ctx.sock, ctx.jid, { body: box(['❌ Nenhum resultado para:', '*' + q + '*', '', 'Tente outro nome ou procure no site.']), footer: foot, quoted: ctx.msg, fallback: text,
      buttons: [btn.url('🌐 Abrir busca no site', BASE + '/?s=' + encodeURIComponent(q)), btn.reply('🏠 Menu', 'mn:home')] });
  }
  if (stage === 'dwlink') {
    return sendNative(ctx.sock, ctx.jid, { body: box(['⬇️ *Link recebido*', '', '👇 Escolha a qualidade']), footer: foot, quoted: ctx.msg, fallback: text,
      buttons: [btn.list('⬇️ Escolher qualidade', [qualSection()]), btn.reply('🏠 Menu', 'mn:home')] });
  }
  const s = loadSession(ctx);
  if (!s) throw new Error('sem sessao');
  if (stage === 'results') {
    const res = s.results || [];
    if (!res.length) throw new Error('sem resultados');
    const rows = res.map((r, i) => ({ header: emoji(r.type) + ' N' + (i + 1), title: clip(r.title, 60), description: kind(r.type) + ' • ' + (r.source || 'Pobreflix'), id: 'fm:pick:' + (i + 1) }));
    const image = await findCover(res[0].link);
    return sendNative(ctx.sock, ctx.jid, {
      body: box(['✅ *Resultados* (' + res.length + ')', '🔎 ' + s.query]) + '\n\n👇 Toque em *Escolher título*', footer: foot, image: image, quoted: ctx.msg, fallback: text,
      buttons: [btn.list('🎬 Escolher título', [{ title: '🎬 Resultados', rows: rows }]), btn.url('🌐 Abrir busca no site', BASE + '/?s=' + encodeURIComponent(s.query)), btn.reply('🏠 Menu', 'mn:home')]
    });
  }
  if (stage === 'selected') {
    const it = s.selected;
    if (!it) throw new Error('sem selecao');
    const others = [];
    (s.results || []).forEach((r, i) => { if (r.link !== it.link && others.length < 7) others.push({ header: emoji(r.type) + ' N' + (i + 1), title: clip(r.title, 60), description: kind(r.type) + ' • Ver este', id: 'fm:pick:' + (i + 1) }); });
    const sections = [qualSection()];
    if (others.length) sections.push({ title: '🔎 Outros resultados', rows: others });
    const image = await findCover(it.link);
    return sendNative(ctx.sock, ctx.jid, {
      body: box(['✅ *Selecionado*', emoji(it.type) + ' *' + it.title + '*', '🌐 ' + (it.source || 'Pobreflix'), '📂 ' + kind(it.type)]) + '\n\n👇 Assista online ou escolha uma opção', footer: foot, image: image, quoted: ctx.msg, fallback: text,
      buttons: [btn.url('▶️ Assistir online', it.link), btn.list('📋 Baixar / Outros', sections), btn.reply('🏠 Menu', 'mn:home')]
    });
  }
  throw new Error('etapa desconhecida');
}

function wrap(name) {
  const e = registry.get(name);
  if (!e || e.__tpFilme) return;
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
      catch (err) { console.error('[filme-ui]', err && err.message); await origReply(h.text, h.opts); }
    }
  };
  e.__tpFilme = true; e.__tpUx = true;
}
['filme', 'serie', 'fs', 'dwfilme', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'f1', 'f2', 'f3', 'f4'].forEach(wrap);

router.register('fm', async (ctx, rest) => {
  const p = rest.split(':');
  const name = p[0] === 'pick' ? 'n' + p[1] : (p[0] === 'q' ? 'f' + p[1] : null);
  const e = name && registry.get(name);
  if (!e) return;
  ctx.args = []; ctx.prefix = ctx.prefix || (config.prefixes && config.prefixes[0]) || '!';
  return e.handler(ctx);
});

module.exports = { classify, present };
