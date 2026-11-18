/**
 * pint — pesquisa de imagens (Pinterest -> Bing -> DuckDuckGo), por relevancia.
 * Envia poucas imagens (5 por defeito, ate 10) para poupar internet: pint naruto 8
 */
const crypto = require('crypto');
const web = require('../../utils/webfetch');
const mo = require('../../utils/mediaOpt');

const net = { get: web.get };
const DEFAULT_N = 5, MAX_N = 10;
const AH = { 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8' };

const plain = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function decodeEntities(s) { return String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }

async function pinterest(q) {
  const data = JSON.stringify({ options: { query: q, scope: 'pins', rs: 'typed', redux_normalize_feed: true }, context: {} });
  const url = 'https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=' + encodeURIComponent('/search/pins/?q=' + q) + '&data=' + encodeURIComponent(data) + '&_=' + Date.now();
  const r = await net.get(url, Object.assign({ Accept: 'application/json, text/javascript, */*; q=0.01', 'X-Requested-With': 'XMLHttpRequest', 'X-Pinterest-AppState': 'active' }, AH), 3 * 1024 * 1024);
  const j = JSON.parse(r.body.toString('utf8'));
  const res = (((j.resource_response || {}).data || {}).results) || [];
  return res.filter((p) => p && p.images).map((p) => ({
    url: (p.images.orig || p.images['736x'] || {}).url,
    alt: [(p.images['736x'] || {}).url, (p.images['474x'] || {}).url].filter(Boolean),
    text: [p.grid_title, p.title, p.description, p.alt_text].filter(Boolean).join(' ')
  })).filter((x) => x.url);
}

async function bing(q) {
  const url = 'https://www.bing.com/images/async?q=' + encodeURIComponent(q) + '&first=0&count=35&adlt=strict&mmasync=1';
  const r = await net.get(url, AH, 3 * 1024 * 1024);
  const html = r.body.toString('utf8'), out = [];
  const re = /\sm="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    try { const j = JSON.parse(decodeEntities(m[1])); if (j.murl) out.push({ url: j.murl, alt: [j.turl].filter(Boolean), text: (j.t || '') + ' ' + (j.desc || '') }); } catch (_) {}
  }
  return out;
}

async function ddg(q) {
  const enc = encodeURIComponent(q);
  const r1 = await net.get('https://duckduckgo.com/?q=' + enc + '&iax=images&ia=images', AH, 2 * 1024 * 1024);
  const m = /vqd=["']?([\d-]+)["']?/.exec(r1.body.toString('utf8'));
  if (!m) return [];
  const r2 = await net.get('https://duckduckgo.com/i.js?l=wt-wt&o=json&q=' + enc + '&vqd=' + m[1] + '&f=,,,,,&p=1&kp=1', Object.assign({ Referer: 'https://duckduckgo.com/' }, AH), 3 * 1024 * 1024);
  const j = JSON.parse(r2.body.toString('utf8'));
  return (j.results || []).map((x) => ({ url: x.image, alt: [x.thumbnail].filter(Boolean), text: x.title || '' })).filter((x) => x.url);
}

// relevantes primeiro (texto contem alguma palavra da pesquisa); sem texto mantem a ordem da fonte
function rank(list, query) {
  const toks = plain(query).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  if (!toks.length) return list;
  const rel = [], unk = [], other = [];
  list.forEach((c) => {
    const t = plain(c.text);
    if (!t.trim()) unk.push(c); else if (toks.some((k) => t.indexOf(k) >= 0)) rel.push(c); else other.push(c);
  });
  return rel.concat(unk, other); // as que nao falam da pesquisa ficam por ultimo (so entram se faltarem)
}

async function collect(query, want) {
  const sources = [['pinterest', pinterest], ['bing', bing], ['duckduckgo', ddg]];
  let all = [];
  const seen = new Set();
  for (const s of sources) {
    try {
      const got = await s[1](query);
      console.log('[pint] fonte ' + s[0] + ': ' + got.length + ' resultados');
      rank(got, query).forEach((c) => { if (c.url && /^https?:\/\//i.test(c.url) && !seen.has(c.url)) { seen.add(c.url); all.push(c); } });
      if (all.length >= want + 4) break;
    } catch (e) { console.error('[pint] fonte ' + s[0] + ' falhou:', e && e.message); }
  }
  return all;
}

async function fetchImage(c) {
  const urls = [c.url].concat(c.alt || []);
  for (let i = 0; i < urls.length; i++) {
    try {
      const r = await net.get(urls[i], { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8', Referer: 'https://www.pinterest.com/' }, i === 0 ? 3 * 1024 * 1024 : 6 * 1024 * 1024);
      if (r.status !== 200 || !mo.isImage(r.body) || r.body.length < 8 * 1024) continue;
      const b = await mo.prepImage(r.body);
      if (b && b.length >= 8 * 1024) return b;
    } catch (_) { /* tenta a seguinte */ }
  }
  return null;
}

const cmd = {
  name: 'pint',
  aliases: ['pinterest', 'pintimg', 'imgpin'],
  category: 'utilidades',
  description: 'Pesquisa imagens (Pinterest/Bing/DuckDuckGo)',
  usage: 'pint <pesquisa> [quantidade]',
  handler: async (ctx) => {
    const args = (ctx.args || []).slice();
    let want = DEFAULT_N;
    if (args.length > 1 && /^\d{1,2}$/.test(args[args.length - 1])) want = Math.max(1, Math.min(MAX_N, parseInt(args.pop(), 10)));
    const query = args.join(' ').trim();
    if (!query) return ctx.reply('📌 `• PINT`\n\n> Uso: *pint* <pesquisa> [quantidade]\n> Ex: *pint Naruto*  •  *pint Naruto 8*');
    await ctx.reply('🔎 A procurar: *' + query + '* ...').catch(() => {});
    const cands = await collect(query, want);
    if (!cands.length) return ctx.reply('❌ Não encontrei imagens para: *' + query + '*\nTenta outro termo (ex: *pint Naruto Uzumaki*).');
    const sock = ctx.sock;
    let sent = 0;
    const hashes = new Set();
    for (const c of cands) {
      if (sent >= want) break;
      const buf = await fetchImage(c);
      if (!buf) continue;
      const h = crypto.createHash('md5').update(buf).digest('hex');
      if (hashes.has(h)) continue;
      hashes.add(h);
      try {
        await sock.sendMessage(ctx.jid, { image: buf, caption: sent === 0 ? '📌 *' + query + '*' : undefined }, { quoted: ctx.msg });
        sent++;
      } catch (e) { console.error('[pint] envio:', e && e.message); }
    }
    if (!sent) return ctx.reply('❌ Encontrei resultados, mas não consegui descarregar as imagens. Tenta de novo.');
  }
};

module.exports = [cmd];
module.exports.net = net;
module.exports.__t = { pinterest, bing, ddg, rank, collect, decodeEntities };
