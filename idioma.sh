set -e
cd "${1:-.}"
[ -f src/interactive/universal.js ] || { echo "❌ Rode dentro da pasta do bot (instale o universal.sh antes)"; exit 1; }
node -e "if (typeof require('./src/interactive/nativeFlow').getEnv !== 'function') process.exit(1)" 2>/dev/null || { echo "❌ nativeFlow.js desatualizado: rode antes o fix-getenv.sh"; exit 1; }
BK="backup-idioma-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"
for f in src/index.js src/interactive/universal.js src/interactive/nativeFlow.js src/interactive/mainMenu.js src/interactive/index.js; do cp "$f" "$BK/$(echo $f | tr / _)"; done
CH="$BK/ux2.chunk"
cat > "$CH" <<'__TP_CHUNK__'
const NEEDS_RE = /\b(respond[aeo]r?|marqu[ea]r?|marc[ae]r?|mencion[ae]r?|cita(r|da|do)?|reply)\b/i;
const TOGGLE_RE = /\bon\s*[\/|]\s*off\b/i;
const tgStore = new Map();
const PREF = (ctx) => (ctx && ctx.prefix && String(ctx.prefix).trim()) || (config.prefixes && config.prefixes[0]) || '!';
function needsTarget(t) { const s = String(t || ''); return s.length <= 700 && NEEDS_RE.test(s); }
function isToggle(e, text) {
  const s = String(text || '');
  if (TOGGLE_RE.test(s) || TOGGLE_RE.test(String(e.usage || ''))) return true;
  return e.category === 'seguranca' && s.length < 500 && /\b(des)?ativad[oa]s?\b/i.test(s) && !isError(s);
}

function pickButtons(ctx, e, text) {
  const nav = [btn.reply('🏠 Menu', 'mn:home'), btn.channel('📢 Canal')];
  if (NAV_ONLY.test(e.name)) return nav;
  if (isToggle(e, text)) {
    const tg = token();
    tgStore.set(tg, { name: e.name, ts: Date.now() });
    if (tgStore.size > 600) tgStore.delete(tgStore.keys().next().value);
    return [btn.reply('✅ Ativar', 'ux:tg:' + tg + ':on'), btn.reply('🚫 Desativar', 'ux:tg:' + tg + ':off')].concat(nav);
  }
  const usage = e.usage || (PREF(ctx) + e.name);
  const wantsTarget = needsTarget(text);
  if (isUsage(text) || wantsTarget) {
    const code = wantsTarget
      ? PREF(ctx) + e.name + (/marq|marc|mencion|@/i.test(text) ? ' @' : '')
      : String(usage).split('\n')[0].replace(/<[^>]*>|\[[^\]]*\]/g, '').trim() + ' ';
    return [btn.copy('📋 Copiar comando', code)].concat(nav);
  }
  const canRepeat = !isError(text) && !NO_REPEAT_CATS.has(e.category) && !e.adminOnly && !e.ownerOnly && !NO_REPEAT_NAME.test(e.name) && ctx.msg && ctx.msg.message;
  if (canRepeat) {
    const tk = token();
    store.set(tk, { msg: ctx.msg, sender: ctx.sender, ts: Date.now() });
    if (store.size > 800) store.delete(store.keys().next().value);
    return [btn.reply('🔁 Repetir', 'ux:rep:' + tk)].concat(nav);
  }
  return nav;
}

// ✅ Ativar / 🚫 Desativar: roda "!comando on|off" com as mesmas checagens do bot (so admin consegue)
async function toggle(ctx, parts, deps) {
  const say = (t) => ctx.sock.sendMessage(ctx.jid, { text: t });
  const j = tgStore.get(parts[1]);
  if (!j) return say('⌛ Esse botão expirou. Use o comando de novo.');
  if (!deps || typeof deps.reinject !== 'function') return say('Use: ' + PREF(ctx) + j.name + ' ' + (parts[2] === 'on' ? 'on' : 'off'));
  const o = ctx.msg;
  const fake = {
    key: { remoteJid: ctx.jid, fromMe: false, id: 'TP' + Date.now().toString(16) + Math.random().toString(16).slice(2, 8).toUpperCase(), participant: o && o.key && o.key.participant },
    message: { conversation: PREF(ctx) + j.name + ' ' + (parts[2] === 'on' ? 'on' : 'off') }, pushName: o && o.pushName, messageTimestamp: Math.floor(Date.now() / 1000)
  };
  if (o && o.key && o.key.participantPn) fake.key.participantPn = o.key.participantPn;
  return deps.reinject(fake);
}

__TP_CHUNK__
cat > src/interactive/idioma.js <<'__TP_EOF__'
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

function gtx(text, tl) {
  return new Promise((resolve, reject) => {
    const body = 'q=' + encodeURIComponent(text);
    const req = https.request({ hostname: 'translate.googleapis.com', path: '/translate_a/single?client=gtx&sl=auto&tl=' + tl + '&dt=t', method: 'POST', timeout: 6000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body), 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const ch = []; res.on('data', (c) => ch.push(c));
      res.on('end', () => {
        try { if (res.statusCode !== 200) throw new Error('HTTP ' + res.statusCode); const j = JSON.parse(Buffer.concat(ch).toString('utf8')); resolve(j[0].map((x) => x[0]).join('')); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject); req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body); req.end();
  });
}
async function callTranslate(text, tl) {
  if (Date.now() < pausedUntil) throw new Error('pausado');
  await slot();
  try { const out = await (translator || gtx)(text, tl); fails = 0; return out; }
  catch (e) { fails++; if (fails >= 4) { pausedUntil = Date.now() + 60000; fails = 0; } throw e; }
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
    const res = unmask(out, mk.toks);
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
__TP_EOF__
CHUNK="$CH" node - <<'__TP_PATCH__'
const fs = require('fs');
function edit(file, marker, fn) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) { console.log('= ja aplicado:', file, marker); return; }
  const n = fn(s);
  if (!n || n === s) { console.log('❌ trecho nao encontrado em', file); process.exit(2); }
  fs.writeFileSync(file, n); console.log('✔', file);
}
edit('src/interactive/universal.js', 'TP_UX2', (s) => {
  const i = s.indexOf('function pickButtons(ctx, e, text) {');
  const j = s.indexOf('function plainText(c) {');
  if (i < 0 || j < 0 || j < i) return null;
  s = s.slice(0, i) + '// TP_UX2\n' + fs.readFileSync(process.env.CHUNK, 'utf8') + s.slice(j);
  s = s.replace('|comandos)$/i;', '|comandos|idioma)$/i;');
  return s.replace("if (parts[0] !== 'rep') return;", "if (parts[0] === 'tg') return toggle(ctx, parts, deps);\n  if (parts[0] !== 'rep') return;");
});
edit('src/interactive/nativeFlow.js', 'TP_I18N', (s) => {
  const a = '  opts = opts || {};\n  const I = proto.Message.InteractiveMessage;';
  if (!s.includes(a)) return null;
  return s.replace(a, "  opts = opts || {};\n  try { opts = await require('./idioma').translateUi(jid, opts); } catch (_) {} // TP_I18N\n  const I = proto.Message.InteractiveMessage;");
});
edit('src/index.js', 'TP_LANG', (s) => {
  let n = s;
  const hook = "      require('./interactive');\n";
  if (!n.includes(hook)) return null;
  n = n.replace(hook, "      require('./interactive'); require('./interactive/idioma').attach(sock); // TP_LANG\n");
  const a1 = "let cmd = registry.get(parsed.command);\n  if (!cmd) { try { cmd = require('./interactive/suggest').pseudo(parsed, msg); } catch (_) {} } // TP_SUGGEST";
  const a2 = "const cmd = registry.get(parsed.command);\n  if (!cmd) return;";
  const add = "  if (!cmd) { try { cmd = await require('./interactive/idioma').resolve(parsed, msg); } catch (_) {} } // TP_LANG2\n";
  if (n.includes(a1)) return n.replace(a1, "let cmd = registry.get(parsed.command);\n" + add + "  if (!cmd) { try { cmd = require('./interactive/suggest').pseudo(parsed, msg); } catch (_) {} } // TP_SUGGEST");
  if (n.includes(a2)) return n.replace(a2, "let cmd = registry.get(parsed.command);\n" + add + "  if (!cmd) return;");
  return null;
});
edit('src/interactive/mainMenu.js', "lg:menu", (s) => {
  const a = "{ header: '📝 Texto', title: 'Texto', description: 'Menu em texto', id: 'mn:txt' }";
  if (!s.includes(a)) return null;
  return s.replace(a, a + ",\n          { header: '🌐 Idioma', title: 'Idioma', description: 'Mudar o idioma do bot', id: 'lg:menu' }");
});
edit('src/interactive/index.js', "'idioma'", (s) => {
  const a = ["'suggest']", "'rpgUi']", "'animeUi']", "'gamesUi']"].find((x) => s.includes(x));
  return a ? s.replace(a, a.replace(']', ", 'idioma']")) : null;
});
__TP_PATCH__
for f in src/index.js src/interactive/*.js; do node --check "$f" || { echo "❌ erro de sintaxe em $f - restaurando tudo"; for g in src/index.js src/interactive/universal.js src/interactive/nativeFlow.js src/interactive/mainMenu.js src/interactive/index.js; do cp "$BK/$(echo $g | tr / _)" "$g"; done; rm -f src/interactive/idioma.js; exit 3; }; done
echo "✅ Instalado: Copiar comando, Ativar/Desativar e Idioma. Reinicie o bot."
echo "   Desligar traducao: TRADUCAO=off no .env"
