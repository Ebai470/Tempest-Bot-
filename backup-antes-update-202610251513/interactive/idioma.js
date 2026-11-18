'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const DATA = path.join(__dirname, '../../data');
const F_LANG = path.join(DATA, 'idiomas.json');
const F_CACHE = path.join(DATA, 'traducoes.json');

const LANGS = {
  pt: { flag: '🇧🇷', name: 'Português', note: 'principal' },
  en: { flag: '🇺🇸', name: 'English', note: 'Inglês' },
  es: { flag: '🇪🇸', name: 'Español', note: 'Espanhol' },
  ja: { flag: '🇯🇵', name: '日本語', note: 'Japonês' },
  ar: { flag: '🇸🇦', name: 'العربية', note: 'Árabe' },
  fr: { flag: '🇫🇷', name: 'Français', note: 'Francês' },
  it: { flag: '🇮🇹', name: 'Italiano', note: 'Italiano' }
};
const LANG_WORDS = {
  pt: ['pt', 'ptbr', 'portugues', 'português', 'brasil', 'portuguese'], en: ['en', 'ingles', 'inglês', 'english', 'eng'],
  es: ['es', 'espanhol', 'espanol', 'español', 'spanish'], ja: ['ja', 'jp', 'japones', 'japonês', 'japanese', '日本語', '日本'],
  ar: ['ar', 'arabe', 'árabe', 'arabic', 'العربية', 'عربي'], fr: ['fr', 'frances', 'francês', 'french', 'français', 'francais'],
  it: ['it', 'italiano', 'italian']
};
const off = () => String(getEnv('TRADUCAO') || '').toLowerCase() === 'off';
const norm = (s) => String(s || '').normalize('NFC').toLowerCase().trim();
const strip = (s) => norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const numOf = (j) => String(j || '').split('@')[0].split(':')[0];

let langs = {}, cache = {}, dirty = false;
try { langs = JSON.parse(fs.readFileSync(F_LANG, 'utf8')); } catch (_) {}
try { cache = JSON.parse(fs.readFileSync(F_CACHE, 'utf8')); } catch (_) {}
function saveSoon() {
  if (dirty) return; dirty = true;
  setTimeout(() => {
    dirty = false;
    try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(F_LANG, JSON.stringify(langs)); const k = Object.keys(cache); if (k.length > 6000) k.slice(0, 1500).forEach((x) => delete cache[x]); fs.writeFileSync(F_CACHE, JSON.stringify(cache)); } catch (_) {}
  }, 15000).unref();
}
const getLang = (jid) => (langs[jid] && LANGS[langs[jid]]) ? langs[jid] : 'pt';
function setLang(jid, code) { if (code === 'pt') delete langs[jid]; else langs[jid] = code; saveSoon(); }

let translator = null;
let fails = 0, pausedUntil = 0, active = 0;
const waiters = [];
const slot = () => new Promise((r) => { if (active < 4) { active++; r(); } else waiters.push(r); });
const free = () => { const n = waiters.shift(); if (n) n(); else active--; };

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

async function callTranslate(text, tl) {
  if (Date.now() < pausedUntil) throw new Error('pausado');
  await slot();
  try { const out = await (translator || gtx)(text, tl); fails = 0; return out; }
  catch (e) { fails++; if (Date.now() - lastLog > 30000) { lastLog = Date.now(); console.error('[idioma] traducao falhou:', e && e.message); } if (fails >= 4) { pausedUntil = Date.now() + 60000; fails = 0; } throw e; }
  finally { free(); }
}

function mask(core) {
  const toks = [];
  const keep = (m) => { toks.push(m); return 'QZ' + (toks.length - 1) + 'ZQ'; };
  let s = core;
  s = s.replace(/https?:\/\/\S+/g, keep);
  s = s.replace(/@\d{5,}/g, keep);
  s = s.replace(/`[^`]*`/g, keep);
  s = s.replace(/(^|\s)([!.\/#][\p{L}\p{N}_]{2,})/gu, (m, a, b) => a + keep(b));
  const bn = String(config.botName || 'Tempest');
  s = s.replace(new RegExp(bn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '|tempest', 'gi'), keep);
  return { s: s, toks: toks };
}
function unmask(out, toks) {
  let missing = false;
  const r = out.replace(/Q\s*Z\s*(\d+)\s*Z\s*Q/gi, (m, i) => { if (toks[+i] === undefined) { missing = true; return m; } return toks[+i]; });
  if (missing || /QZ\d/i.test(r)) return null;
  for (let i = 0; i < toks.length; i++) if (out.search(new RegExp('Q\\s*Z\\s*' + i + '\\s*Z\\s*Q', 'i')) < 0) return null;
  return r;
}

async function trLine(line, lang) {
  const m = line.match(/^([^\p{L}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u);
  if (!m || !m[2] || !/\p{L}/u.test(m[2])) return line;
  let pre = m[1], core = m[2];
  if (/[!.\/#]$/.test(pre) && /^[\p{L}\p{N}_]/u.test(core)) { core = pre.slice(-1) + core; pre = pre.slice(0, -1); }
  const key = lang + '\u0001' + core;
  if (cache[key]) return pre + cache[key] + m[3];
  const mk = mask(core);
  if (!/\p{L}/u.test(mk.s.replace(/QZ\d+ZQ/g, ''))) return line;
  try {
    const out = await callTranslate(mk.s, lang);
    let res = unmask(out, mk.toks);
    if (!res) res = await trSegments(core, lang);
    if (!res) return line;
    cache[key] = res.trim(); saveSoon();
    return pre + cache[key] + m[3];
  } catch (_) { return line; }
}
async function trText(text, lang) {
  if (off() || lang === 'pt' || typeof text !== 'string' || !text) return text;
  return (await Promise.all(text.split('\n').map((l) => trLine(l, lang)))).join('\n');
}

async function translateUi(jid, opts) {
  const lang = getLang(jid);
  if (off() || lang === 'pt' || !opts) return opts;
  const o = Object.assign({}, opts);
  const T = (s) => trText(s, lang);
  const jobs = [];
  for (const k of ['title', 'subtitle', 'body', 'footer']) if (typeof o[k] === 'string') jobs.push(T(o[k]).then((v) => { o[k] = v; }));
  if (Array.isArray(o.buttons)) {
    o.buttons = await Promise.all(o.buttons.map(async (b) => {
      try {
        const p = JSON.parse(b.buttonParamsJson);
        const j2 = [];
        if (p.display_text) j2.push(T(p.display_text).then((v) => { p.display_text = v; }));
        if (p.title) j2.push(T(p.title).then((v) => { p.title = v; }));
        for (const s of (p.sections || [])) {
          if (s.title) j2.push(T(s.title).then((v) => { s.title = v; }));
          for (const r of (s.rows || [])) for (const k of ['header', 'title', 'description']) if (r[k]) j2.push(T(r[k]).then((v) => { r[k] = v; }));
        }
        await Promise.all(j2);
        return { name: b.name, buttonParamsJson: JSON.stringify(p) };
      } catch (_) { return b; }
    }));
  }
  await Promise.all(jobs);
  return o;
}

function attach(sock) {
  if (!sock || sock.__tpLang || typeof sock.sendMessage !== 'function') return;
  sock.__tpLang = true;
  const orig = sock.sendMessage.bind(sock);
  sock.__rawSend = orig;
  sock.sendMessage = async function (jid, content, options) {
    try {
      const lang = getLang(jid);
      if (!off() && lang !== 'pt' && content && typeof content === 'object' && !content.react && !content.delete && !content.forward) {
        const c = Object.assign({}, content);
        if (typeof c.text === 'string') c.text = await trText(c.text, lang);
        if (typeof c.caption === 'string') c.caption = await trText(c.caption, lang);
        content = c;
      }
    } catch (_) {}
    return orig(jid, content, options);
  };
}

const DICT = {
  menu: ['メニュー', 'ヘルプ', 'コマンド', 'قائمة', 'القائمة', 'مساعدة', 'المساعدة', 'aide', 'menù', 'comandi'],
  ping: ['ピング', 'بينغ', 'بنج'],
  sticker: ['ステッカー', 'スタンプ', 'ملصق', 'ملصقات', 'autocollant', 'adesivo', 'pegatina', 'etiqueta'],
  play: ['再生', '音楽', 'تشغيل', 'موسيقى', 'jouer', 'musique', 'riproduci', 'reproducir'],
  rank: ['ランキング', 'ترتيب', 'classement', 'classifica', 'clasificacion', 'clasificación'],
  perfil: ['プロフィール', 'الملف', 'profil', 'profilo', 'profile'],
  saldo: ['残高', 'رصيد', 'solde', 'balance'],
  dado: ['サイコロ', 'نرد', 'dé', 'dice'],
  moeda: ['コイン', 'عملة', 'pièce', 'moneta', 'moneda', 'coin']
};
const dictMap = {};
for (const k of Object.keys(DICT)) for (const w of DICT[k]) dictMap[strip(w)] = k;
const wordCache = {};

async function resolve(parsed, msg) {
  if (!parsed || !parsed.command) return null;
  const typed = String(parsed.command);
  let target = dictMap[strip(typed)];
  let e = target && registry.get(target);
  if (!e && !off() && typed.length >= 2 && typed.length <= 24 && /^[\p{L}\p{N}_]+$/u.test(typed)) {
    const chat = msg && msg.key && msg.key.remoteJid;
    const nonLatin = /[^\x00-\u024F]/.test(typed);
    if (nonLatin || getLang(chat) !== 'pt') {
      const k = strip(typed);
      if (!(k in wordCache)) {
        let found = '';
        for (const tl of ['pt', 'en']) {
          try {
            const out = strip(await callTranslate(typed, tl)).replace(/[^a-z0-9_]/g, '');
            if (out && registry.get(out)) { found = out; break; }
          } catch (_) { break; }
        }
        wordCache[k] = found;
      }
      if (wordCache[k]) e = registry.get(wordCache[k]);
    }
  }
  if (e) { parsed.command = e.name; return e; }
  return null;
}

function langFromWord(w) {
  const k = strip(w);
  for (const c of Object.keys(LANG_WORDS)) if (LANG_WORDS[c].some((x) => strip(x) === k)) return c;
  return null;
}
async function canChange(ctx) {
  if (!ctx.isGroup) return true;
  try { if (ctx.isOwner && ctx.isOwner()) return true; } catch (_) {}
  try { return !!(await ctx.isGroupAdmin()); } catch (_) { return false; }
}
async function openList(ctx) {
  const cur = getLang(ctx.jid);
  const rows = Object.keys(LANGS).map((c) => ({ header: LANGS[c].flag + ' ' + LANGS[c].name, title: LANGS[c].name + (c === 'pt' ? ' (principal)' : ''), description: c === cur ? '✅ Idioma atual' : LANGS[c].note, id: 'lg:set:' + c }));
  return sendNative(ctx.sock, ctx.jid, {
    body: '╭━━〔 🌐 IDIOMA 〕━━╮\n┃ Idioma atual: ' + LANGS[cur].flag + ' ' + LANGS[cur].name + '\n┃ 👇 Toque em *Escolher Idioma*\n╰━━━━━━━━━━━━━━━━━━╯',
    footer: '© ' + config.botName, quoted: ctx.msg, fallback: 'Idiomas: pt, en, es, ja, ar, fr, it. Use: !idioma en',
    buttons: [btn.list('🌐 Escolher Idioma', [{ title: '🌐 Idiomas', rows: rows }]), btn.reply('🏠 Menu', 'mn:home'), btn.channel('📢 Canal')]
  });
}
async function applyLang(ctx, code) {
  if (!LANGS[code]) return ctx.sock.sendMessage(ctx.jid, { text: '❌ Idioma inválido. Use: pt, en, es, ja, ar, fr, it' });
  if (!(await canChange(ctx))) return ctx.sock.sendMessage(ctx.jid, { text: '🚫 Só admins podem mudar o idioma deste grupo.' });
  setLang(ctx.jid, code);
  return ctx.sock.sendMessage(ctx.jid, { text: '✅ Idioma alterado para *' + LANGS[code].name + '* ' + LANGS[code].flag + '\nO bot entende comandos em Português e no idioma escolhido.' });
}
async function langHandler(ctx) {
  const a = ctx.args && ctx.args[0];
  if (a && /^(teste|test|status)$/i.test(a)) return testTranslate(ctx);
  if (!a) return openList(ctx);
  const code = langFromWord(a);
  if (!code) return ctx.sock.sendMessage(ctx.jid, { text: '❌ Idioma inválido. Use: pt, en, es, ja, ar, fr, it' });
  return applyLang(ctx, code);
}
try {
  registry.register({
    name: 'idioma', category: 'utilidades', description: 'Muda o idioma do bot neste chat', usage: '!idioma [pt|en|es|ja|ar|fr|it]',
    aliases: ['idiomas', 'language', 'lang', 'langue', 'lingua', 'língua', 'lingue', 'sprache', '言語', '语言', 'لغة', 'اللغة'],
    handler: langHandler
  });
} catch (e) { console.error('[idioma] registro', e && e.message); }

router.register('lg', async (ctx, rest) => {
  const p = rest.split(':');
  if (p[0] === 'menu') return openList(ctx);
  if (p[0] === 'set') return applyLang(ctx, p[1]);
});

module.exports = { attach, translateUi, trText, resolve, getLang, setLang, LANGS, _setTranslator: (f) => { translator = f; pausedUntil = 0; } };
