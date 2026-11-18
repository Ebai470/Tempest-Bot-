set -e
cd "${1:-.}"
[ -f src/interactive/router.js ] || { echo "❌ Rode dentro da pasta do bot"; exit 1; }
[ -f src/interactive/downloadsUi.js ] || { echo "❌ Instale a parte 2 (parte2.sh) antes"; exit 1; }
[ -f src/interactive/idioma.js ] || { echo "❌ Instale o idioma.sh antes"; exit 1; }
BK="backup-final-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"
for f in src/interactive/downloadsUi.js src/interactive/idioma.js src/interactive/index.js; do cp "$f" "$BK/$(echo $f | tr / _)"; done
cat > "$BK/yt.chunk" <<'__TP_CHUNK__'
// TP_YT: tenta varios clientes do YouTube (idade/login) + cookies.txt
let ytNode = true;
function cookiesArgs() {
  const c = getEnv('YT_COOKIES') || path.join(process.cwd(), 'cookies.txt');
  try { if (fs.existsSync(c)) return ['--cookies', c]; } catch (_) {}
  return [];
}
const YT_TRIES = [[], ['--extractor-args', 'youtube:player_client=tv_embedded'], ['--extractor-args', 'youtube:player_client=android_vr'], ['--extractor-args', 'youtube:player_client=ios'], ['--extractor-args', 'youtube:player_client=mweb']];
const isYt = (u) => /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(String(u || ''));
async function runDl(url, args, timeoutMs, watch) {
  if (!isYt(url)) return run(args, timeoutMs, watch);
  let lastErr = null;
  const base = cookiesArgs();
  for (let i = 0; i < YT_TRIES.length; i++) {
    const extra = (ytNode ? ['--js-runtimes', 'node'] : []).concat(base, YT_TRIES[i]);
    try { return await run(extra.concat(args), timeoutMs, watch); }
    catch (e) {
      lastErr = e;
      const m = String(e.message || '');
      if (/kill|SIGKILL/i.test(m)) throw e;
      if (ytNode && /no such option|unrecognized arguments|js-runtimes/i.test(m)) { ytNode = false; i--; continue; }
      if (/Private video|Video unavailable|has been removed|copyright|not available in your country|members-only/i.test(m) && !/sign in|age/i.test(m)) break;
    }
  }
  const m = String((lastErr && lastErr.message) || '');
  if (/confirm your age|sign in to confirm|not a bot|--cookies/i.test(m)) {
    throw new Error('O YouTube pediu login/idade para este vídeo. Coloque um arquivo cookies.txt do YouTube na pasta do bot e tente de novo (e atualize: pip install -U "yt-dlp[default]").');
  }
  throw lastErr || new Error('Falha ao baixar');
}

__TP_CHUNK__
cat > "$BK/net.chunk" <<'__TP_CHUNK__'
// TP_NET2: 3 servicos de traducao (GET), com motivo da falha no log
function getJson(host, pathq) {
  return new Promise((resolve, reject) => {
    const req = https.get({ hostname: host, path: pathq, timeout: 7000, headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36', Accept: '*/*' } }, (res) => {
      const ch = []; res.on('data', (c) => ch.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(host + ' HTTP ' + res.statusCode));
        try { resolve(JSON.parse(Buffer.concat(ch).toString('utf8'))); } catch (e) { reject(new Error(host + ' resposta invalida')); }
      });
    });
    req.on('error', (e) => reject(new Error(host + ' ' + (e && e.code || e.message))));
    req.on('timeout', () => { req.destroy(); reject(new Error(host + ' timeout')); });
  });
}
async function gtx(text, tl) {
  const errs = [], q = encodeURIComponent(text);
  try { const j = await getJson('translate.googleapis.com', '/translate_a/single?client=gtx&sl=auto&tl=' + tl + '&dt=t&q=' + q); const t = j[0].map((x) => x[0]).join(''); if (t) return t; } catch (e) { errs.push(e.message); }
  try {
    const j = await getJson('clients5.google.com', '/translate_a/t?client=dict-chrome-ex&sl=auto&tl=' + tl + '&q=' + q);
    const t = (j && j.sentences) ? j.sentences.map((x) => x.trans).join('') : (Array.isArray(j) ? (Array.isArray(j[0]) ? j[0][0] : j[0]) : '');
    if (t && typeof t === 'string') return t;
  } catch (e) { errs.push(e.message); }
  try { const j = await getJson('api.mymemory.translated.net', '/get?q=' + q + '&langpair=pt|' + tl); const t = j && j.responseData && j.responseData.translatedText; if (t && Number(j.responseStatus) === 200) return t; errs.push('mymemory ' + (j && j.responseStatus)); } catch (e) { errs.push(e.message); }
  throw new Error(errs.join(' | '));
}
let lastLog = 0;

// fallback: traduz so os pedacos de texto e mantem comandos/links/@ como estao
async function trSegments(core, lang) {
  const re = /(https?:\/\/\S+|@\d{5,}|`[^`]*`|(?:^|\s)[!.\/#][\p{L}\p{N}_]{2,}|tempest(?: bot)?)/giu;
  const parts = core.split(re);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i % 2 === 1 || !/\p{L}/u.test(p || '')) { out.push(p || ''); continue; }
    const lead = p.match(/^\s*/)[0], trail = p.match(/\s*$/)[0];
    const t = await callTranslate(p.trim(), lang);
    out.push(lead + String(t).trim() + trail);
  }
  return out.join('');
}

async function testTranslate(ctx) {
  pausedUntil = 0; fails = 0;
  const send = (ctx.sock.__rawSend || ctx.sock.sendMessage).bind(ctx.sock);
  const to = getLang(ctx.jid) === 'pt' ? 'en' : getLang(ctx.jid);
  try {
    const t = await callTranslate('Olá, tudo bem?', to);
    return send(ctx.jid, { text: '✅ Tradução funcionando (' + to + ')\nOlá, tudo bem? → ' + t });
  } catch (e) {
    return send(ctx.jid, { text: '❌ A tradução falhou.\nMotivo: ' + String(e.message).slice(0, 300) + '\n\nConfira a internet do Termux e tente de novo.' });
  }
}

__TP_CHUNK__
cat > src/interactive/filmeUi.js <<'__TP_EOF__'
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
__TP_EOF__
BKD="$BK" node - <<'__TP_PATCH__'
const fs = require('fs');
const BKD = process.env.BKD;
function edit(file, marker, fn) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) { console.log('= ja aplicado:', file, marker); return; }
  const n = fn(s);
  if (!n || n === s) { console.log('❌ trecho nao encontrado em', file); process.exit(2); }
  fs.writeFileSync(file, n); console.log('✔', file, marker);
}
edit('src/interactive/downloadsUi.js', 'TP_YT', (s) => {
  const a = 'async function infoFromUrl(url) {';
  const i = s.indexOf('async function download(');
  const j = s.indexOf('async function handleChoice(');
  if (s.indexOf(a) < 0 || i < 0 || j < 0) return null;
  let n = s.replace(a, fs.readFileSync(BKD + '/yt.chunk', 'utf8') + a);
  n = n.replace("const raw = await run([url, '--dump-json'", "const raw = await runDl(url, [url, '--dump-json'");
  const i2 = n.indexOf('async function download('), j2 = n.indexOf('async function handleChoice(');
  n = n.slice(0, i2) + n.slice(i2, j2).replace(/await run\(\[/g, 'await runDl(job.url, [') + n.slice(j2);
  return n;
});
edit('src/interactive/idioma.js', 'TP_NET2', (s) => {
  const i = s.indexOf('function gtx(text, tl) {');
  const j = s.indexOf('async function callTranslate(text, tl) {');
  if (i < 0 || j < 0 || j < i) return null;
  let n = s.slice(0, i) + fs.readFileSync(BKD + '/net.chunk', 'utf8') + s.slice(j);
  const c1 = "catch (e) { fails++; if (fails >= 4) { pausedUntil = Date.now() + 60000; fails = 0; } throw e; }";
  if (!n.includes(c1)) return null;
  n = n.replace(c1, "catch (e) { fails++; if (Date.now() - lastLog > 30000) { lastLog = Date.now(); console.error('[idioma] traducao falhou:', e && e.message); } if (fails >= 4) { pausedUntil = Date.now() + 60000; fails = 0; } throw e; }");
  const c2 = "    const res = unmask(out, mk.toks);\n    if (!res) return line;";
  if (!n.includes(c2)) return null;
  n = n.replace(c2, "    let res = unmask(out, mk.toks);\n    if (!res) res = await trSegments(core, lang);\n    if (!res) return line;");
  const c3 = "  const a = ctx.args && ctx.args[0];\n  if (!a) return openList(ctx);";
  if (!n.includes(c3)) return null;
  n = n.replace(c3, "  const a = ctx.args && ctx.args[0];\n  if (a && /^(teste|test|status)$/i.test(a)) return testTranslate(ctx);\n  if (!a) return openList(ctx);");
  const c4 = "const orig = sock.sendMessage.bind(sock);\n  sock.sendMessage = async function";
  if (!n.includes(c4)) return null;
  n = n.replace(c4, "const orig = sock.sendMessage.bind(sock);\n  sock.__rawSend = orig;\n  sock.sendMessage = async function");
  return n;
});
edit('src/interactive/index.js', "'filmeUi'", (s) => {
  const a = ["'idioma']", "'suggest']", "'rpgUi']", "'animeUi']", "'gamesUi']"].find((x) => s.includes(x));
  return a ? s.replace(a, a.replace(']', ", 'filmeUi']")) : null;
});
__TP_PATCH__
for f in src/interactive/*.js; do node --check "$f" || { echo "❌ erro de sintaxe em $f - restaurando"; for g in src/interactive/downloadsUi.js src/interactive/idioma.js src/interactive/index.js; do cp "$BK/$(echo $g | tr / _)" "$g"; done; rm -f src/interactive/filmeUi.js; exit 3; }; done
echo "✅ Finalizado: filmes/series com botoes, YouTube corrigido e idioma corrigido. Reinicie o bot."
echo "   Teste a traducao com:  !idioma teste"
echo "   YouTube com restricao de idade: coloque cookies.txt na pasta do bot"
