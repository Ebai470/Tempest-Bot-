'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execFile } = require('child_process');
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const SESSION_DIR = path.join(__dirname, '../../data/anime-sessions');
const TMP_DIR = path.join(__dirname, '../../data/anime-tmp');
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const PAGE = 30;

const off = () => String(getEnv('ANIME_BUTTONS') || '').toLowerCase() === 'off';
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

function sessionFile(ctx) {
  const u = String(ctx.sender || '').split('@')[0];
  const g = ctx.isGroup ? String(ctx.jid) : 'pv';
  return path.join(SESSION_DIR, (g + '__' + u).replace(/[^\w.@-]/g, '_') + '.json');
}
function loadSession(ctx) { try { return JSON.parse(fs.readFileSync(sessionFile(ctx), 'utf8')); } catch (_) { return null; } }

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
function toJpeg(buf) {
  const isWebp = buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  if (!isWebp) return Promise.resolve(buf);
  return new Promise((resolve) => {
    try {
      fs.mkdirSync(TMP_DIR, { recursive: true });
      const a = path.join(TMP_DIR, 'cv_' + Date.now() + '.webp'), b = a.replace('.webp', '.jpg');
      fs.writeFileSync(a, buf);
      execFile('ffmpeg', ['-y', '-loglevel', 'error', '-i', a, b], { timeout: 15000 }, (err) => {
        let out = buf;
        try { if (!err && fs.existsSync(b)) out = fs.readFileSync(b); } catch (_) {}
        try { fs.unlinkSync(a); } catch (_) {} try { fs.unlinkSync(b); } catch (_) {}
        resolve(out);
      });
    } catch (_) { resolve(buf); }
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
    if (!img) { m = html.match(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i); img = m && m[1]; }
    if (img) { const raw = await getBuf(new URL(img, pageUrl).href); if (raw.length > 2000) buf = await toJpeg(raw); }
  } catch (_) {}
  if (covers.size > 40) covers.delete(covers.keys().next().value);
  covers.set(pageUrl, buf);
  return buf;
}

const simStore = new Map();
const newTok = () => Math.random().toString(36).slice(2, 8);
setInterval(() => { const n = Date.now(); for (const [k, v] of simStore) if (n - v.ts > 20 * 60 * 1000) simStore.delete(k); }, 60000).unref();

function classify(t) {
  if (/Anime encontrado/.test(t)) return 'found';
  if (/Nao achei \*exacto\*/.test(t) && /Parecidos/.test(t)) return 'similar';
  if (/\*Temporada \d+\*/.test(t) && /D1/.test(t)) return 'lang';
  if (/EPs:/.test(t) && /ANIME/.test(t)) return 'episodes';
  return null;
}
function headerLines(text) {
  const out = [];
  for (const raw of String(text).split('\n')) {
    if (!raw.startsWith('┃')) continue;
    const c = raw.replace(/^┃\s?/, '');
    if (!c.trim()) { if (out.length) break; else continue; }
    out.push(c);
  }
  return out;
}
const box = (lines) => '╭━━━〔 🎌 ANIME 〕━━━╮\n' + lines.map((l) => '┃ ' + l).join('\n') + '\n╰━━━━━━━━━━━━━━━━━━╯';
function altList(s) {
  const out = [], seen = {};
  const cur = String((s.anime && s.anime.title) || '').toLowerCase().trim();
  for (const r of (s.all || [])) {
    const t = String(r.title || '').trim(), k = t.toLowerCase().replace(/\s+/g, ' ');
    if (!t || seen[k] || k === cur) continue;
    seen[k] = true; out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}
const altRows = (titles, idFn) => titles.map((t, i) => ({ header: '', title: clip(t, 60), description: 'Pesquisar este anime', id: idFn(i) }));

async function present(ctx, text, stage) {
  const q = ctx.msg;
  const foot = '© ' + config.botName;
  if (stage === 'similar') {
    const titles = String(text).split('\n').filter((l) => /^┃ > /.test(l)).map((l) => l.replace(/^┃ > /, '').trim()).filter(Boolean).slice(0, 10);
    if (!titles.length) throw new Error('sem parecidos');
    const tok = newTok(); simStore.set(tok, { titles: titles, ts: Date.now() });
    return sendNative(ctx.sock, ctx.jid, { body: box(['❌ Não achei o nome exato', '', '🔍 *Parecidos:*']) + '\n\n👇 Escolha um abaixo', footer: foot, quoted: q, fallback: text,
      buttons: [btn.list('🔎 Ver parecidos', [{ title: '🔍 Parecidos', rows: altRows(titles, (i) => 'an:sim:' + tok + ':' + i) }])] });
  }
  const s = loadSession(ctx);
  if (!s || !s.anime) throw new Error('sem sessao');
  const link = s.anime.link;
  const image = await findCover(link);
  const lines = headerLines(text);
  const alts = altList(s);
  const buttons = [];

  if (stage === 'found' || stage === 'lang') {
    if (s.step === 'choose_season' && Array.isArray(s.seasons)) {
      const rows = [];
      for (const n of s.seasons) {
        if (!registry.get('t' + n)) continue;
        const c = ((s.seasonMap && s.seasonMap[n]) || []).length;
        rows.push({ header: '', title: 'Temporada ' + n, description: c ? c + ' links encontrados' : 'Escolher esta temporada', id: 'an:cmd:t' + n });
      }
      const sections = [{ title: '📺 Temporadas', rows: rows }];
      if (alts.length) sections.push({ title: '🔎 Outros parecidos', rows: altRows(alts, (i) => 'an:alt:' + i) });
      buttons.push(btn.list('📺 Escolher Temporada', sections));
    } else {
      if (s.hasDub !== false) buttons.push(btn.reply('🎙️ Dublado', 'an:cmd:d1'));
      if (s.hasLeg !== false) buttons.push(btn.reply('🈯 Legendado', 'an:cmd:l2'));
      if (alts.length) buttons.push(btn.list('🔎 Outros parecidos', [{ title: '🔎 Outros parecidos', rows: altRows(alts, (i) => 'an:alt:' + i) }]));
    }
    if (link) buttons.push(btn.url('🌐 Ver no navegador', link));
    return sendNative(ctx.sock, ctx.jid, { body: box(lines) + '\n\n👇 Escolha uma opção abaixo', footer: foot, image: image, quoted: q, fallback: text, buttons: buttons });
  }

  if (stage === 'episodes') {
    const eps = s.episodes || [];
    const page = s.epPage || 0, start = page * PAGE, slice = eps.slice(start, start + PAGE);
    if (!slice.length) throw new Error('sem episodios');
    const sections = [];
    for (let i = 0; i < slice.length; i += 10) {
      const part = slice.slice(i, i + 10);
      sections.push({ title: '🎞️ EP ' + part[0].num + ' – ' + part[part.length - 1].num, rows: part.map((e) => ({ header: '', title: 'Episódio ' + e.num, description: clip(e.title, 70), id: 'an:ep:' + e.num })) });
    }
    buttons.push(btn.list('🎞️ Ver Episódios', sections));
    if (link) buttons.push(btn.url('🌐 Abrir no navegador', link));
    if (start + slice.length < eps.length) buttons.push(btn.reply('➕ Mais episódios', 'an:cmd:maiseps'));
    return sendNative(ctx.sock, ctx.jid, { body: box(lines) + '\n\n👇 Toque em *Ver Episódios*, escolha e assista no navegador', footer: foot, image: image, quoted: q, fallback: text, buttons: buttons });
  }
  throw new Error('etapa desconhecida');
}

function wrapAnime(name) {
  const e = registry.get(name);
  if (!e || e.__tpAnime) return;
  const orig = e.handler;
  e.handler = async function (ctx) {
    if (off() || typeof ctx.reply !== 'function') return orig.call(this, ctx);
    const had = Object.prototype.hasOwnProperty.call(ctx, 'reply');
    const prev = ctx.reply;
    const origReply = prev.bind(ctx);
    const held = [];
    ctx.reply = async function (text, opts) {
      if (typeof text === 'string' && classify(text)) { held.push({ text: text, opts: opts }); return; }
      return origReply(text, opts);
    };
    try { await orig.call(this, ctx); }
    finally { if (had) ctx.reply = prev; else delete ctx.reply; }
    for (const h of held) {
      try { await present(ctx, h.text, classify(h.text)); }
      catch (err) { console.error('[anime-ui]', err && err.message); await origReply(h.text, h.opts); }
    }
  };
  e.__tpAnime = true;
  e.__tpUx = true;
}

['anime', 'dub', 'leg', 'maiseps', 'd1', 'l2', 't1', 't2', 't3', 't4', 't5'].forEach(wrapAnime);

async function run(ctx, name, args) {
  const e = registry.get(name);
  if (!e || typeof e.handler !== 'function') return;
  ctx.args = args || [];
  ctx.prefix = ctx.prefix || (config.prefixes && config.prefixes[0]) || '!';
  return e.handler(ctx);
}

router.register('an', async (ctx, rest) => {
  const p = rest.split(':');
  const say = (t) => ctx.sock.sendMessage(ctx.jid, { text: t });
  if (p[0] === 'cmd') return run(ctx, p[1], []);
  if (p[0] === 'alt') {
    const s = loadSession(ctx);
    if (!s) return say('⌛ Essa busca expirou. Use *anime <nome>* de novo.');
    const t = altList(s)[parseInt(p[1], 10)];
    if (!t) return say('❌ Opção inválida.');
    return run(ctx, 'anime', t.split(/\s+/));
  }
  if (p[0] === 'sim') {
    const j = simStore.get(p[1]);
    const t = j && j.titles[parseInt(p[2], 10)];
    if (!t) return say('⌛ Essa lista expirou. Use *anime <nome>* de novo.');
    return run(ctx, 'anime', t.split(/\s+/));
  }
  if (p[0] === 'ep') {
    const s = loadSession(ctx);
    if (!s || !s.episodes) return say('⌛ Essa lista é de outra busca ou expirou. Use *anime <nome>*.');
    const ep = s.episodes.find((x) => String(x.num) === String(p[1]));
    if (!ep) return say('❌ Episódio não encontrado.');
    return sendNative(ctx.sock, ctx.jid, {
      body: box(['🎬 *' + ((s.anime && s.anime.title) || 'Anime') + '*', '▶️ *Episódio ' + ep.num + '*']) + '\n\n👇 Toque no botão para assistir no navegador',
      footer: '© ' + config.botName, image: await findCover(s.anime && s.anime.link), fallback: 'EP ' + ep.num + ': ' + ep.link,
      buttons: [btn.url('▶️ Assistir EP ' + ep.num, ep.link)]
    });
  }
});

module.exports = { classify, present, headerLines, findCover, _covers: covers };
