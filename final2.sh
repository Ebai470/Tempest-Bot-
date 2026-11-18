set -e
cd "${1:-.}"
[ -f src/services/welcomeCard.js ] || { echo "❌ Instale antes o welcome2.sh (gerador do video)"; exit 1; }
[ -f src/interactive/router.js ] || { echo "❌ Rode dentro da pasta do bot (instale a parte 1 antes)"; exit 1; }
BK="backup-final2-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"
for f in src/index.js src/services/welcomeCard.js src/interactive/index.js src/commands/utilidades/welcome2.js; do [ -f "$f" ] && cp "$f" "$BK/$(echo $f | tr / _)" || true; done
cat > src/services/welcome2Auto.js <<'__TP_EOF__'
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const FILE = path.join(process.cwd(), 'data', 'welcome2.json');
let state = {};
try { state = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { state = {}; }
function save() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(state)); } catch (e) { console.error('[welcome2] salvar', e.message); } }
const isOn = (jid) => !!state[jid];
function setOn(jid, on) { if (on) state[jid] = true; else delete state[jid]; save(); }

const numOf = (j) => String(j || '').split('@')[0].split(':')[0];
function fetchBuf(url, depth) {
  return new Promise((resolve, reject) => {
    const lib = String(url).startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (depth || 0) < 3) { res.resume(); return fetchBuf(res.headers.location, (depth || 0) + 1).then(resolve, reject); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const ch = []; res.on('data', (c) => ch.push(c)); res.on('end', () => resolve(Buffer.concat(ch)));
    });
    req.on('error', reject); req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// fila unica: um video de cada vez (nao trava o celular)
let chain = Promise.resolve(), pending = 0;
function run(fn) { pending++; const p = chain.then(fn, fn); chain = p.catch(() => {}).then(() => { pending--; }); return p; }

async function buildWelcome(sock, groupJid, memberJid, opts) {
  opts = opts || {};
  const { renderWelcome } = require('./welcomeCard');
  const num = numOf(opts.phone || memberJid);
  let name = opts.name || ('+' + num);
  let group = 'Tempest', count = 0;
  if (String(groupJid).endsWith('@g.us')) {
    try {
      const meta = await sock.groupMetadata(groupJid);
      group = meta.subject || group;
      const parts = meta.participants || [];
      const idx = parts.findIndex((p) => [p.id, p.jid, p.phoneNumber, p.lid].some((x) => x && numOf(x) === numOf(memberJid)));
      count = idx >= 0 ? idx + 1 : parts.length;
    } catch (_) {}
  }
  let avatar = null;
  try { const url = await sock.profilePictureUrl(memberJid, 'image'); if (url) avatar = await fetchBuf(url); } catch (_) {}
  const r = await renderWelcome({ avatar: avatar, name: name, group: group, count: count, seed: num });
  return { video: r.video, caption: '👋 Bem-vindo(a) @' + numOf(memberJid) + ' ao *' + group + '*!', mentions: [memberJid] };
}

async function sendWelcome(sock, groupJid, memberJid, opts, quoted) {
  const w = await buildWelcome(sock, groupJid, memberJid, opts);
  return sock.sendMessage(groupJid, { video: w.video, gifPlayback: true, mimetype: 'video/mp4', caption: w.caption, mentions: w.mentions }, quoted ? { quoted: quoted } : undefined);
}

const recent = new Map();
async function handle(sock, update) {
  if (!update || update.action !== 'add' || !isOn(update.id)) return;
  const me = numOf(sock.user && sock.user.id);
  for (const p of (update.participants || [])) {
    const jid = typeof p === 'string' ? p : (p && (p.id || p.jid));
    const phone = (p && typeof p === 'object') ? (p.phoneNumber || '') : '';
    if (!jid || numOf(jid) === me) continue;
    const key = update.id + '|' + numOf(jid), now = Date.now();
    if (recent.has(key) && now - recent.get(key) < 60000) continue;   // evita duplicado
    recent.set(key, now);
    for (const [k, t] of recent) if (now - t > 120000) recent.delete(k);
    if (pending >= 8) { console.error('[welcome2] fila cheia, pulando', numOf(jid)); continue; }
    run(() => sendWelcome(sock, update.id, jid, { phone: phone })).catch((e) => console.error('[welcome2] auto:', e && e.message));
  }
}

module.exports = { isOn, setOn, handle, run, buildWelcome, sendWelcome, numOf };
__TP_EOF__
cat > src/commands/utilidades/welcome2.js <<'__TP_EOF__'
'use strict';
const svc = require('../../services/welcome2Auto');
const last = new Map();

module.exports = {
  name: 'welcome2',
  aliases: ['boasvindas2', 'bemvindo2', 'wc2'],
  category: 'diversao',
  description: 'GIF de boas-vindas (manual ou automatico: on/off)',
  usage: '!welcome2 [@pessoa]',
  async handler(ctx) {
    const sock = ctx.sock;
    const a = String((ctx.args && ctx.args[0]) || '').toLowerCase();
    if (a === 'on' || a === 'off' || a === 'status') {
      if (!ctx.isGroup) return ctx.reply('❌ Use este comando dentro de um grupo.');
      if (a === 'status') return ctx.reply(svc.isOn(ctx.jid) ? '✅ Boas-vindas automáticas (GIF): *ativadas* neste grupo.' : '⛔ Boas-vindas automáticas (GIF): *desativadas* neste grupo.\nUse *' + (ctx.prefix || '!') + 'welcome2 on* para ativar.');
      let ok = false;
      try { ok = !!((ctx.isOwner && ctx.isOwner()) || (await ctx.isGroupAdmin())); } catch (_) {}
      if (!ok) return ctx.reply('🚫 Só administradores podem ativar ou desativar as boas-vindas automáticas.');
      const was = svc.isOn(ctx.jid);
      if (a === 'on') {
        svc.setOn(ctx.jid, true);
        return ctx.reply(was ? 'ℹ️ As boas-vindas automáticas já estavam *ativadas* neste grupo.' : '✅ Boas-vindas automáticas *ativadas*!\nQuando alguém entrar, o bot envia o GIF sozinho.');
      }
      svc.setOn(ctx.jid, false);
      return ctx.reply(was ? '⛔ Boas-vindas automáticas *desativadas* neste grupo.' : 'ℹ️ As boas-vindas automáticas já estavam *desativadas* neste grupo.');
    }
    // geracao manual
    if (last.has(ctx.jid) && Date.now() - last.get(ctx.jid) < 15000) return ctx.reply('⏳ Aguarde alguns segundos para gerar outro.');
    last.set(ctx.jid, Date.now());
    try { if (ctx.msg && ctx.msg.key) await sock.sendMessage(ctx.jid, { react: { text: '🎞️', key: ctx.msg.key } }); } catch (_) {}
    try {
      const target = ctx.getMentionedOrQuoted() || ctx.sender;
      const name = target === ctx.sender ? (ctx.msg && ctx.msg.pushName) : '';
      await svc.run(() => svc.sendWelcome(sock, ctx.jid, target, { name: name }, ctx.msg));
    } catch (e) {
      await ctx.reply('❌ Não consegui gerar o vídeo.\n' + String((e && e.message) || e).slice(0, 160) + '\n\nConfira se o ffmpeg está instalado: pkg install ffmpeg');
    }
  }
};
__TP_EOF__
cat > src/interactive/infoCards.js <<'__TP_EOF__'
'use strict';
const os = require('os');
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const nm = () => { const n = String(config.botName || 'Tempest bot').trim(); return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase(); };
const pad = (n) => String(n).padStart(2, '0');
const DONO1 = () => getEnv('DONO_1') || '+258 87 428 8439';
const DONO2 = () => getEnv('DONO_2') || '+258 82 428 8439';
const wa = (n) => 'https://wa.me/' + String(n).replace(/\D/g, '');

let gc = { n: null, ts: 0 };
async function groupsCount(sock) {
  if (gc.n !== null && Date.now() - gc.ts < 300000) return gc.n;
  try { const g = await sock.groupFetchAllParticipating(); gc = { n: Object.keys(g).length, ts: Date.now() }; } catch (_) {}
  return gc.n;
}

function pingText(ms, groups) {
  const s = Math.floor(process.uptime());
  const up = pad(Math.floor(s / 3600)) + ' ʜʀ, ' + pad(Math.floor((s % 3600) / 60)) + ' ᴍɪɴ ᴇ ' + pad(s % 60) + ' ꜱᴇɢ';
  let total = 0; try { total = registry.stats().totalMain; } catch (_) {}
  return [
    '- ⚡ `𝗩𝗘𝗟𝗢𝗖𝗜𝗗𝗔𝗗𝗘 𝗗𝗢 𝗕𝗢𝗧`',
    '> *🤖 • ʙᴏᴛ: ' + nm() + '*',
    '> *🚀 • ᴘɪɴɢ: ' + ms.toFixed(2) + ' ms*',
    '> *👥 • ɢʀᴜᴘᴏs: ' + (groups === null ? '—' : groups) + '*',
    '> *🕒 • ᴜᴘᴛɪᴍᴇ: ' + up + '*',
    '> *💾 • ʀᴀᴍ ʟɪᴠʀᴇ: ' + (os.freemem() / 1048576).toFixed(2) + ' MB*',
    '> *📦 • ʀᴀᴍ ᴛᴏᴛᴀʟ: ' + (os.totalmem() / 1073741824).toFixed(2) + ' GB*',
    '> *🛠️ • ᴄᴏᴍᴀɴᴅᴏs: ' + total + '*',
    '*✦ ' + nm() + ' ✦*'
  ].join('\n');
}
function donoText() {
  return [
    '- 💁‍♂️ `𝗗𝗢𝗡𝗢 𝗗𝗢 𝗕𝗢𝗧`',
    '> *👑 • ᴅᴏɴᴏ: ' + DONO1() + '*',
    '> *👑 • ᴅᴏɴᴏ 2: ' + DONO2() + ' 🙇‍♂️*',
    '> *🤖 • ʙᴏᴛ: ' + nm() + '*',
    '*✦ ' + nm() + ' ✦*'
  ].join('\n');
}

async function pingHandler(ctx) {
  const t0 = process.hrtime.bigint();
  try { if (ctx.msg && ctx.msg.key) await ctx.sock.sendMessage(ctx.jid, { react: { text: '🏓', key: ctx.msg.key } }); } catch (_) {}
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const groups = await groupsCount(ctx.sock);
  return sendNative(ctx.sock, ctx.jid, {
    body: pingText(ms, groups), quoted: ctx.msg, fallback: pingText(ms, groups),
    buttons: [btn.reply('✦ ᴀᴛᴜᴀʟɪᴢᴀʀ ✦', 'pg:again'), btn.reply('✦ ᴀʙʀɪʀ ᴍᴇɴᴜ ✦', 'mn:home'), btn.channel('✦ ᴄᴀɴᴀʟ ᴏꜰɪᴄɪᴀʟ ✦')]
  });
}
async function donoHandler(ctx) {
  return sendNative(ctx.sock, ctx.jid, {
    body: donoText(), quoted: ctx.msg, fallback: donoText(),
    buttons: [btn.url('👑 Contactar Dono', wa(DONO1())), btn.url('👑 Contactar Dono 2', wa(DONO2())), btn.channel('📢 Canal')]
  });
}
function override(name, fn) {
  const e = registry.get(name);
  if (!e || e.__tpInfo) return;
  e.handler = fn; e.__tpInfo = true; e.__tpUx = true;
}
override('ping', pingHandler);
override('owner', donoHandler);   // owner = dono / criador

router.register('pg', async (ctx) => { const e = registry.get('ping'); if (e) return e.handler(ctx); });

module.exports = { pingText, donoText };
__TP_EOF__
node - <<'__TP_PATCH__'
const fs = require('fs');
function edit(file, marker, fn, optional) {
  if (!fs.existsSync(file)) { console.log(optional ? 'ℹ️ pulado (nao instalado): ' + file : '❌ nao encontrado: ' + file); if (!optional) process.exit(2); return; }
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) { console.log('= ja aplicado:', file, marker); return; }
  const n = fn(s);
  if (!n || n === s) { console.log(optional ? '⚠️ trecho nao encontrado (pulado): ' + file : '❌ trecho nao encontrado em ' + file); if (!optional) process.exit(2); return; }
  fs.writeFileSync(file, n); console.log('✔', file, marker);
}
// 1) GIF de 3 segundos, mais leve
edit('src/services/welcomeCard.js', 'OUT_DUR', (s) => {
  const a = 'FPS = 30, DUR = 5, N = FPS * DUR;', b = 'const t = n / FPS;', c = 'for (let i = 0; i < 110; i++) parts.push', d = "'-preset', 'veryfast', '-crf', '23',";
  if (![a, b, c, d].every((x) => s.includes(x))) return null;
  return s.replace(a, 'FPS = 30, DUR = 5, OUT_DUR = 3, N = FPS * OUT_DUR;').replace(b, 'const t = (n / FPS) * (DUR / OUT_DUR);').replace(c, 'for (let i = 0; i < 70; i++) parts.push').replace(d, "'-preset', 'veryfast', '-tune', 'animation', '-crf', '26', '-g', '30',");
});
// 2) envio automatico quando entra membro (usa o mesmo evento que o bot ja tem)
edit('src/index.js', 'TP_W2AUTO', (s) => {
  const a = "    } catch (e) { console.error('[welcomeHook]', e.message); }\n";
  if (!s.includes(a)) return null;
  return s.replace(a, a + "    try { await require('./services/welcome2Auto').handle(sock, update); } catch (e) { console.error('[welcome2]', e.message); } // TP_W2AUTO\n");
});
// 3) ping e dono no formato novo
edit('src/interactive/index.js', "'infoCards'", (s) => {
  const a = ["'logoMenu']", "'hentaiUi']", "'filmeUi']", "'idioma']", "'suggest']", "'rpgUi']", "'animeUi']", "'gamesUi']"].find((x) => s.includes(x));
  return a ? s.replace(a, a.replace(']', ", 'infoCards']")) : null;
});
__TP_PATCH__
for f in src/index.js src/services/welcomeCard.js src/services/welcome2Auto.js src/commands/utilidades/welcome2.js src/interactive/*.js; do node --check "$f" || { echo "❌ erro de sintaxe em $f - restaurando"; for g in src/index.js src/services/welcomeCard.js src/interactive/index.js src/commands/utilidades/welcome2.js; do [ -f "$BK/$(echo $g | tr / _)" ] && cp "$BK/$(echo $g | tr / _)" "$g"; done; rm -f src/services/welcome2Auto.js src/interactive/infoCards.js; exit 3; }; done
echo "✅ Instalado: welcome2 on/off + automatico + GIF de 3s, ping e dono novos. Reinicie o bot."
