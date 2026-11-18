set -e
cd "${1:-.}"
[ -f src/interactive/universal.js ] || { echo "❌ Rode dentro da pasta do bot (instale o universal.sh antes)"; exit 1; }
[ -f src/isekai/world.js ] || { echo "❌ Modulo do Isekai nao encontrado (src/isekai/world.js)"; exit 1; }
BK="backup-isk-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"
cp src/interactive/universal.js "$BK/universal.js"; [ -f src/interactive/rpgUi.js ] && cp src/interactive/rpgUi.js "$BK/rpgUi.js" || true
cat > src/interactive/iskUi.js <<'__TP_EOF__'
'use strict';
const { btn, sendNative } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const PREFIX = () => (config.prefixes && config.prefixes[0]) || '!';
const mods = () => { try { return { db: require('../isekai/db'), world: require('../isekai/world') }; } catch (_) { return null; } };
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const row = (title, description, id, header) => ({ header: header || '', title: clip(title, 60), description: clip(description, 70), id: id });

const MENU = () => btn.reply('🌌 Menu Isekai', 'rp:isk:home');
const WORLD_CMDS = /^(iskmundo|iskmapa|isklocal|iskcidade|iskviajar|iskexplorar|isknpc|iskfalar|iskeventos|iskfaccoes|iskreputacao|iskrumores)$/;

function player(ctx) {
  const m = mods(); if (!m) return null;
  try {
    const g = m.db.scopeGroup(ctx);
    const d = m.db.getPlayerData(ctx.sender, g);
    if (!d || !d.race) return null;
    m.world.ensureWorld(d);
    return { d: d, m: m };
  } catch (_) { return null; }
}

function exitRows(ctx, text) {
  const p = player(ctx);
  let ids = [];
  if (p) { const here = p.m.world.getPlace(p.d.location); ids = (here && here.links) || []; }
  else if (text) { const m = String(text).match(/Saidas:\s*(.+)/i); if (m) ids = m[1].split(/[,\s]+/).filter(Boolean); }
  return ids.map((id) => {
    const pl = p ? p.m.world.getPlace(id) : null;
    const hidden = pl && pl.secret && p && !(p.d.discovered && p.d.discovered[id]);
    if (!pl) return row(id, 'Viajar para este local', 'is:go:' + id, '🧭');
    return row(hidden ? 'Local desconhecido' : pl.name, hidden ? 'Descubra viajando até lá' : (pl.type + ' • perigo ' + (pl.danger || 1)), 'is:go:' + id, hidden ? '❓' : '📍');
  });
}
function mapRows(text) {
  const out = [];
  String(text).split('\n').forEach((l) => {
    const m = l.match(/^-\s+(.+?)\s+\[([\w]+)\](\s*<<)?\s*$/);
    if (m && !m[3]) out.push(row(m[1], 'Viajar para este local', 'is:go:' + m[2], '📍'));
  });
  return out;
}
function npcRows(text) {
  const out = [];
  String(text).split('\n').forEach((l) => {
    const m = l.match(/^-\s+(.+?)\s+\[([\w]+)\]\s*\((.+)\)/);
    if (m) out.push(row(m[1], m[3], 'is:talk:' + m[2], '💬'));
  });
  return out;
}

function shortcutRows() {
  return [
    row('Criar personagem', 'Começar a aventura agora', 'is:new', '✨'),
    row('Meu status', 'Ver seu personagem', 'is:run:iskstatus', '👤'),
    row('Mundo', 'Local, hora, clima e eventos', 'is:run:iskmundo', '🌍'),
    row('Mapa', 'Ver os locais descobertos', 'is:run:iskmapa', '🗺️'),
    row('Viajar', 'Escolher um destino próximo', 'is:travel', '🧭'),
    row('Explorar', 'Explorar o local onde você está', 'is:run:iskexplorar', '🔎'),
    row('Inventário', 'Seus itens', 'is:run:iskinventario', '🎒')
  ];
}

function buttonsFor(ctx, e, text, flags) {
  const t = String(text || '');
  const name = e.name;
  if (/Cria personagem:\s*iskiniciar|Sem personagem/i.test(t)) {
    return [btn.reply('✨ Criar com meu nome', 'is:new'), btn.copy('📋 Criar com outro nome', PREFIX() + 'iskiniciar '), MENU()];
  }
  if (name === 'iskviajar' && /Uso:\s*iskviajar/i.test(t)) {
    const rows = exitRows(ctx, t);
    if (rows.length) return [btn.list('🧭 Escolher destino', [{ title: '🧭 Destinos', rows: rows }]), btn.reply('🗺️ Mapa', 'is:run:iskmapa'), MENU()];
  }
  if (name === 'iskmapa' && /^MAPA/i.test(t)) {
    const rows = mapRows(t);
    const b = [];
    if (rows.length) b.push(btn.list('🧭 Viajar para…', [{ title: '🧭 Locais', rows: rows }]));
    else b.push(btn.reply('🧭 Viajar', 'is:travel'));
    b.push(btn.reply('🔎 Explorar', 'is:run:iskexplorar'), MENU());
    return b;
  }
  if (name === 'isknpc') {
    const rows = npcRows(t);
    if (rows.length) return [btn.list('💬 Falar com…', [{ title: '💬 NPCs aqui', rows: rows }]), btn.reply('🗺️ Mapa', 'is:run:iskmapa'), MENU()];
  }
  if (/^Viajaste para/i.test(t)) return [btn.reply('🔎 Explorar', 'is:run:iskexplorar'), btn.reply('🧭 Viajar', 'is:travel'), btn.reply('🗺️ Mapa', 'is:run:iskmapa'), MENU()];
  if (name === 'iskexplorar') {
    const b = [btn.reply('🔎 Explorar de novo', 'is:run:iskexplorar')];
    if (/monstro|isklutar|lutar|encontro perigoso/i.test(t)) b.push(btn.reply('⚔️ Lutar', 'is:run:isklutar'));
    b.push(btn.reply('🧭 Viajar', 'is:travel'), MENU());
    return b;
  }
  if (name === 'iskmundo' || WORLD_CMDS.test(name)) return [btn.reply('🗺️ Mapa', 'is:run:iskmapa'), btn.reply('🧭 Viajar', 'is:travel'), btn.reply('🔎 Explorar', 'is:run:iskexplorar'), MENU()];
  if (flags && flags.usage) return null;
  const first = name === 'iskstatus' ? btn.reply('🎒 Inventário', 'is:run:iskinventario') : btn.reply('👤 Status', 'is:run:iskstatus');
  return [first, btn.reply('🌍 Mundo', 'is:run:iskmundo'), MENU()];
}

async function runAs(ctx, deps, text) {
  if (deps && typeof deps.reinject === 'function') {
    const o = ctx.msg;
    const fake = {
      key: { remoteJid: ctx.jid, fromMe: false, id: 'TP' + Date.now().toString(16) + Math.random().toString(16).slice(2, 8).toUpperCase(), participant: o && o.key && o.key.participant },
      message: { conversation: PREFIX() + text }, pushName: o && o.pushName, messageTimestamp: Math.floor(Date.now() / 1000)
    };
    if (o && o.key && o.key.participantPn) fake.key.participantPn = o.key.participantPn;
    return deps.reinject(fake);
  }
  const first = text.split(/\s+/)[0];
  const e = registry.get(first);
  if (!e) return;
  ctx.args = text.split(/\s+/).slice(1); ctx.prefix = ctx.prefix || PREFIX();
  return e.handler(ctx);
}

router.register('is', async (ctx, rest, msg, deps) => {
  const p = rest.split(':');
  const say = (t) => ctx.sock.sendMessage(ctx.jid, { text: t });
  if (p[0] === 'run') return runAs(ctx, deps, p[1]);
  if (p[0] === 'go') return runAs(ctx, deps, 'iskviajar ' + p[1]);
  if (p[0] === 'talk') return runAs(ctx, deps, 'iskfalar ' + p[1]);
  if (p[0] === 'new') {
    const raw = (ctx.msg && ctx.msg.pushName) || '';
    const nome = String(raw).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 14);
    if (nome.length < 2) return say('✍️ Escolha um nome: copie e envie\n' + PREFIX() + 'iskiniciar SeuNome');
    return runAs(ctx, deps, 'iskiniciar ' + nome);
  }
  if (p[0] === 'travel') {
    const pl = player(ctx);
    if (!pl) return sendNative(ctx.sock, ctx.jid, { body: '🌌 Você ainda não tem personagem.\n👇 Crie um para viajar', footer: '© ' + config.botName,
      buttons: [btn.reply('✨ Criar com meu nome', 'is:new'), btn.copy('📋 Criar com outro nome', PREFIX() + 'iskiniciar '), MENU()] });
    const rows = exitRows(ctx);
    const here = pl.m.world.getPlace(pl.d.location);
    return sendNative(ctx.sock, ctx.jid, {
      body: '╭━━〔 🧭 VIAJAR 〕━━╮\n┃ 📍 Você está em: *' + (here ? here.name : pl.d.location) + '*\n┃ 👇 Toque em *Escolher destino*\n╰━━━━━━━━━━━━━━━━━━╯', footer: '© ' + config.botName,
      fallback: 'Use: ' + PREFIX() + 'iskviajar <id>',
      buttons: [btn.list('🧭 Escolher destino', [{ title: '🧭 Destinos', rows: rows }]), btn.reply('🗺️ Mapa', 'is:run:iskmapa'), MENU()]
    });
  }
});

function withShortcuts(sections) { try { return [{ title: '🚀 Começar e Atalhos', rows: shortcutRows() }].concat(sections); } catch (_) { return sections; } }

module.exports = { buttonsFor, shortcutRows, withShortcuts, exitRows, mapRows, npcRows };
__TP_EOF__
node - <<'__TP_PATCH__'
const fs = require('fs');
let u = fs.readFileSync('src/interactive/universal.js', 'utf8');
if (u.includes('TP_ISK')) console.log('= universal ja atualizado');
else {
  const a = "  if (NAV_ONLY.test(e.name)) return nav;\n";
  if (!u.includes(a)) { console.log('❌ universal.js: trecho nao encontrado (rode o idioma.sh/universal.sh antes)'); process.exit(2); }
  const add = "  if (e.category === 'isekai') { try { const r = require('./iskUi').buttonsFor(ctx, e, text, { usage: isUsage(text) || (typeof needsTarget === 'function' && needsTarget(text)) }); if (r && r.length) return r; } catch (_) {} } // TP_ISK\n";
  fs.writeFileSync('src/interactive/universal.js', u.replace(a, a + add)); console.log('✔ universal atualizado');
}
if (fs.existsSync('src/interactive/rpgUi.js')) {
  let r = fs.readFileSync('src/interactive/rpgUi.js', 'utf8');
  if (r.includes('withShortcuts')) console.log('= menu isekai ja atualizado');
  else {
    const b = "[{ title: '🗂️ Categorias', rows: rows }]";
    if (!r.includes(b)) console.log('⚠️ menu isekai: trecho nao encontrado (pulado)');
    else { fs.writeFileSync('src/interactive/rpgUi.js', r.replace(b, "require('./iskUi').withShortcuts(" + b + ")")); console.log('✔ menu isekai atualizado'); }
  }
} else console.log('ℹ️ rpgUi.js nao instalado: atalhos so nos botoes das respostas (rode rpg.sh para o menu)');
__TP_PATCH__
for f in src/interactive/*.js; do node --check "$f" || { echo "❌ erro de sintaxe em $f - restaurando"; cp "$BK/universal.js" src/interactive/universal.js; [ -f "$BK/rpgUi.js" ] && cp "$BK/rpgUi.js" src/interactive/rpgUi.js; rm -f src/interactive/iskUi.js; exit 3; }; done
echo "✅ Assistente do Isekai instalado. Reinicie o bot."
