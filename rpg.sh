set -e
cd "${1:-.}"
[ -f src/interactive/mainMenu.js ] || { echo "❌ Rode dentro da pasta do bot"; exit 1; }
BK="backup-rpg-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"; cp src/interactive/mainMenu.js "$BK/"; cp src/interactive/index.js "$BK/interactive-index.js"
cat > src/interactive/rpgUi.js <<'__TP_EOF__'
'use strict';
const fs = require('fs');
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const off = () => String(getEnv('CAT_BUTTONS') || '').toLowerCase() === 'off';
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const PREFIX = () => (config.prefixes && config.prefixes[0]) || '!';
const GUARD = { admin: 'adm', dono: 'dono' };
const IMG_ARG = { admin: 'adm', bn: 'brincadeiras', rpg: 'rpg' };
const ALIAS = { adm: 'admin', admin: 'admin', familia: 'rpg', rank: 'xp', sticker: 'stickers', fig: 'stickers', figurinhas: 'stickers', img: 'imagem', til: 'utilidades', util: 'utilidades' };
const MAX_ALL = 60, PAGE = 50;
const cm = () => { try { return require('../services/commandMedia'); } catch (_) { return null; } };

async function allowed(ctx, tipo) {
  try {
    const { guardMenu } = require('../utils/menuAccess');
    if (typeof ctx.isGroupAdmin === 'function') { try { ctx.isAdmin = await ctx.isGroupAdmin(); } catch (_) {} }
    return await guardMenu(ctx, tipo);
  } catch (e) { return false; }
}

function groupsOf(cat) {
  const th = require('../utils/theme');
  const cmds = registry.getByCategory(cat).filter((c) => !/^[0-9abc]$/i.test(String(c.name || '')));
  let groups = [];
  try { groups = th.groupCommandsBySubsections(cat, cmds) || []; } catch (_) {}
  if (!groups.length && cmds.length) groups = [{ emoji: '📌', title: 'COMANDOS', items: cmds }];
  return groups.map((g) => ({
    emoji: g.emoji || '📌', title: g.title,
    items: g.items.filter((c) => !/^[0-9abc]$/i.test(String(c.name || ''))).sort((a, b) => String(a.name).localeCompare(String(b.name)))
  })).filter((g) => g.items.length);
}
const cmdRow = (c) => ({ header: '', title: clip(PREFIX() + c.name, 60), description: clip(c.description || c.usage || 'Executar comando', 70), id: 'rp:run:' + c.name });
function sectionsFor(title, emoji, items) {
  const out = [];
  const parts = Math.ceil(items.length / 10);
  for (let i = 0; i < items.length; i += 10) {
    const n = i / 10 + 1;
    out.push({ title: emoji + ' ' + title + (parts > 1 ? ' (' + n + '/' + parts + ')' : ''), rows: items.slice(i, i + 10).map(cmdRow) });
  }
  return out;
}
const box = (emoji, title, lines) => '╭━━〔 ' + emoji + ' ' + title + ' 〕━━╮\n' + lines.map((l) => '┃ ' + l).join('\n') + '\n╰━━━━━━━━━━━━━━━━━━╯';
const nav = (extra) => (extra || []).concat([btn.reply('🔙 Voltar ao Menu', 'mn:home'), btn.channel('📢 Canal')]);

function imageFor(cat) {
  try {
    const m = cm(); if (!m) return null;
    const info = m.resolve('menu', [IMG_ARG[cat] || cat], ['menu', 'help', 'ajuda', 'comandos']);
    if (info && info.type === 'image') return fs.readFileSync(info.file);
  } catch (_) {}
  return null;
}

async function open(ctx, cat) {
  if (off()) return false;
  if (GUARD[cat] && !(await allowed(ctx, GUARD[cat]))) return true;
  const { CATEGORY_META } = require('../utils/menu');
  const meta = CATEGORY_META[cat] || { emoji: '📦', title: String(cat).toUpperCase() };
  const groups = groupsOf(cat);
  if (!groups.length) return false;
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const image = imageFor(cat);
  if (image) ctx.__tpMediaUsed = true;
  const title = String(meta.title).replace(/^MENU\s+/i, 'MENU ');
  if (total <= MAX_ALL) {
    const sections = [];
    groups.forEach((g) => sectionsFor(g.title, g.emoji, g.items).forEach((s) => sections.push(s)));
    await sendNative(ctx.sock, ctx.jid, {
      body: box(meta.emoji || '📦', title, ['👇 Toque em *Selecionar Comando*', 'e escolha o que quer usar']),
      footer: '© ' + config.botName + ' • escolha a Baixo:', image: image, quoted: ctx.msg,
      fallback: require('../utils/menu').generateCategoryMenu(cat, ctx),
      buttons: nav([btn.list('📋 Selecionar Comando', sections)])
    });
    return true;
  }
  const rows = groups.map((g, i) => ({ header: '', title: g.emoji + ' ' + g.title, description: 'Ver os comandos deste grupo', id: 'rp:g:' + cat + ':' + i + ':0' }));
  await sendNative(ctx.sock, ctx.jid, {
    body: box(meta.emoji || '📦', title, ['👇 Escolha um grupo em *Escolher Grupo*']),
    footer: '© ' + config.botName + ' • escolha a Baixo:', image: image, quoted: ctx.msg,
    fallback: require('../utils/menu').generateCategoryMenu(cat, ctx),
    buttons: nav([btn.list('📂 Escolher Grupo', [{ title: '📂 Grupos', rows: rows }])])
  });
  return true;
}

async function showGroup(ctx, cat, gi, page) {
  const g = groupsOf(cat)[gi];
  if (!g) return ctx.sock.sendMessage(ctx.jid, { text: '❌ Grupo não encontrado.' });
  const start = page * PAGE, slice = g.items.slice(start, start + PAGE);
  if (!slice.length) return ctx.sock.sendMessage(ctx.jid, { text: '✅ Fim da lista.' });
  const more = start + slice.length < g.items.length;
  const extra = [btn.list('📋 Selecionar Comando', sectionsFor(g.title, g.emoji, slice))];
  if (more) extra.push(btn.reply('➕ Mais comandos', 'rp:g:' + cat + ':' + gi + ':' + (page + 1)));
  extra.push(btn.reply('🔙 Grupos', 'mn:cat:' + cat));
  return sendNative(ctx.sock, ctx.jid, {
    body: box(g.emoji, g.title, ['👇 Toque em *Selecionar Comando*']), footer: '© ' + config.botName,
    buttons: extra.concat([btn.channel('📢 Canal')]).slice(0, 4),
    fallback: slice.map((c) => PREFIX() + c.name).join('\n')
  });
}

async function runAs(ctx, deps, name) {
  const text = PREFIX() + name;
  if (deps && typeof deps.reinject === 'function') {
    const o = ctx.msg;
    const fake = {
      key: { remoteJid: ctx.jid, fromMe: false, id: 'TP' + Date.now().toString(16) + Math.random().toString(16).slice(2, 8).toUpperCase(), participant: o && o.key && o.key.participant },
      message: { conversation: text }, pushName: o && o.pushName, messageTimestamp: Math.floor(Date.now() / 1000)
    };
    if (o && o.key && o.key.participantPn) fake.key.participantPn = o.key.participantPn;
    return deps.reinject(fake);
  }
  const e = registry.get(name);
  if (!e || typeof e.handler !== 'function') return;
  ctx.args = []; ctx.prefix = ctx.prefix || PREFIX();
  return e.handler(ctx);
}

const ISK = [
  ['personagem', '🌌', 'Status, atributos e habilidades'], ['aventura', '⚔️', 'Lutar, boss e dungeon'], ['inventario', '🎒', 'Itens, equipar e craft'],
  ['economia', '💰', 'Saldo, loja e compras'], ['profissoes', '🌾', 'Fazenda, pesca e mineração'], ['guilda', '🏰', 'Guilda, quests e ranking'],
  ['mundo', '🗺️', 'Mapa, cidades e viagens'], ['npcs', '👥', 'Falar e relações'], ['social', '❤️', 'Namoro, casamento e família'],
  ['party', '⚔️', 'Grupo de aventura'], ['vida', '☠️', 'Ferimentos, cura e morte'], ['magia', '✨', 'Magias e escolas'],
  ['divino', '🙏', 'Deuses, orações e pactos'], ['destino', '👑', 'Destino, herói e vilão'], ['ranking', '🏆', 'Ranking e nível'],
  ['assistente', '🧠', 'Ajuda e dicas'], ['sistema', '⚙️', 'Iniciar e modos']
];
async function presentIsk(ctx, text) {
  if (/^╭──〔 [A-Z]+ 〕──╮/.test(text)) {
    const key = (text.match(/^╭──〔 ([A-Z]+) 〕──╮/) || [])[1];
    const names = (text.match(/◈┃ (\S+)/g) || []).map((l) => l.replace('◈┃ ', '').trim()).filter(Boolean);
    if (!names.length) throw new Error('sem comandos');
    const rows = names.map((n) => { const e = registry.get(n); return { header: '', title: clip(PREFIX() + n, 60), description: clip((e && e.description) || 'Executar comando', 70), id: 'rp:run:' + n }; });
    const sections = []; for (let i = 0; i < rows.length; i += 10) sections.push({ title: '🌌 ' + key + (rows.length > 10 ? ' (' + (i / 10 + 1) + ')' : ''), rows: rows.slice(i, i + 10) });
    return sendNative(ctx.sock, ctx.jid, { body: box('🌌', 'ISEKAI • ' + key, ['👇 Toque em *Selecionar Comando*']), footer: '© ' + config.botName + ' • escolha a Baixo:', fallback: text,
      buttons: [btn.list('📋 Selecionar Comando', sections), btn.reply('🔙 Menu Isekai', 'rp:isk:home'), btn.channel('📢 Canal')] });
  }
  const rows = ISK.map((c) => ({ header: c[1] + ' ' + c[0][0].toUpperCase() + c[0].slice(1), title: c[0][0].toUpperCase() + c[0].slice(1), description: c[2], id: 'rp:isk:' + c[0] }));
  return sendNative(ctx.sock, ctx.jid, { body: box('🌌', 'MODO ISEKAI', ['Sistema de aventura', '👇 Escolha uma categoria']), footer: '© ' + config.botName + ' • escolha a Baixo:', fallback: text,
    image: imageFor('rpg'),
    buttons: [btn.list('🌌 Escolher Categoria', [{ title: '🗂️ Categorias', rows: rows }]), btn.reply('🔙 Voltar ao Menu', 'mn:home'), btn.channel('📢 Canal')] });
}
function wrapIsk() {
  const e = registry.get('iskmenu');
  if (!e || e.__tpIsk) return;
  const orig = e.handler;
  e.handler = async function (ctx) {
    if (off() || typeof ctx.reply !== 'function') return orig.call(this, ctx);
    const had = Object.prototype.hasOwnProperty.call(ctx, 'reply');
    const prev = ctx.reply, origReply = prev.bind(ctx), held = [];
    ctx.reply = async function (text, opts) {
      if (typeof text === 'string' && (/^╭──〔 [A-Z]+ 〕──╮/.test(text) || (text.indexOf('𝐈𝐒𝐄𝐊𝐀𝐈') >= 0 && text.indexOf('◈┃') >= 0))) { held.push({ text: text, opts: opts }); return; }
      return origReply(text, opts);
    };
    try { await orig.call(this, ctx); } finally { if (had) ctx.reply = prev; else delete ctx.reply; }
    for (const h of held) { try { await presentIsk(ctx, h.text); } catch (err) { console.error('[isk-ui]', err && err.message); await origReply(h.text, h.opts); } }
  };
  e.__tpIsk = true; e.__tpUx = true;
}

const GAMES = [
  ['jogodavelha', '⭕', 'Jogo da Velha (contra o bot)', 'Começa já, você contra o bot'],
  ['@velha', '👥', 'Jogo da Velha (desafiar alguém)', 'Marque uma pessoa para jogar'],
  ['connect4', '🔴', 'Connect 4 (contra o bot)', 'Ligue 4 peças em linha'],
  ['@c4', '👥', 'Connect 4 (desafiar alguém)', 'Marque uma pessoa para jogar'],
  ['ppt', '✊', 'Pedra, Papel e Tesoura', 'Escolha com os botões'],
  ['advinha', '🔢', 'Adivinhe o número', 'Escolha de 1 a 10'],
  ['forca', '🔤', 'Forca', 'Adivinhe a palavra'],
  ['trivia', '🧠', 'Trivia', 'Perguntas e respostas'],
  ['verdadeoudesafio', '❓', 'Verdade ou Desafio', 'Sorteia uma pergunta ou desafio'],
  ['dado', '🎲', 'Dado', 'Rola um dado'],
  ['moeda', '🪙', 'Cara ou Coroa', 'Joga a moeda'],
  ['rankingtrivia', '🏆', 'Ranking da Trivia', 'Quem mais acertou']
];
async function openGames(ctx) {
  const rows = GAMES.filter((g) => g[0][0] === '@' || registry.get(g[0])).map((g) => ({
    header: g[1] + ' ' + g[2], title: g[2], description: g[3], id: g[0][0] === '@' ? 'rp:hint:' + g[0].slice(1) : 'rp:run:' + g[0] }));
  return sendNative(ctx.sock, ctx.jid, {
    body: box('🕹️', 'JOGOS', ['Velha, Connect 4, PPT e mais', '👇 Toque em *Escolher Jogo*']), footer: '© ' + config.botName + ' • escolha a Baixo:',
    quoted: ctx.msg, fallback: 'Jogos: ' + PREFIX() + 'jogodavelha, ' + PREFIX() + 'connect4, ' + PREFIX() + 'ppt',
    buttons: [btn.list('🎮 Escolher Jogo', [{ title: '🎮 Jogos', rows: rows }]), btn.reply('🔙 Voltar ao Menu', 'mn:home'), btn.channel('📢 Canal')]
  });
}

function catFromName(s) {
  const { CATEGORY_META } = require('../utils/menu');
  const k = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (CATEGORY_META[k] && !['custom', 'outros'].includes(k)) return k;
  return ALIAS[k] || null;
}
function wrapMenus() {
  for (const e of registry.getAll()) {
    if (!e || e.__tpCat || typeof e.handler !== 'function') continue;
    const n = String(e.name || '');
    if (n === 'menu') {
      const orig = e.handler;
      e.handler = async function (ctx) {
        const cat = ctx.args && ctx.args[0] ? catFromName(ctx.args[0]) : null;
        if (cat) { try { if (await open(ctx, cat)) return; } catch (err) { console.error('[catUi]', err && err.message); } }
        return orig.call(this, ctx);
      };
      e.__tpCat = true; e.__tpUx = true;
    } else if (/^menu./.test(n)) {
      const cat = catFromName(n.slice(4));
      if (!cat) continue;
      const orig = e.handler;
      e.handler = async function (ctx) {
        try { if (await open(ctx, cat)) return; } catch (err) { console.error('[catUi]', err && err.message); }
        return orig.call(this, ctx);
      };
      e.__tpCat = true; e.__tpUx = true;
    }
  }
}
wrapIsk();
wrapMenus();

router.register('rp', async (ctx, rest, msg, deps) => {
  const p = rest.split(':');
  if (p[0] === 'run') return runAs(ctx, deps, p[1]);
  if (p[0] === 'g') return showGroup(ctx, p[1], parseInt(p[2], 10) || 0, parseInt(p[3], 10) || 0);
  if (p[0] === 'games') return openGames(ctx);
  if (p[0] === 'isk') {
    const e = registry.get('iskmenu'); if (!e) return;
    ctx.args = p[1] && p[1] !== 'home' ? [p[1]] : []; ctx.prefix = ctx.prefix || PREFIX();
    return e.handler(ctx);
  }
  if (p[0] === 'hint') {
    const cmd = p[1] === 'c4' ? 'connect4' : 'jogodavelha';
    return sendNative(ctx.sock, ctx.jid, {
      body: box('👥', 'DESAFIAR ALGUÉM', ['Copie o comando, cole no chat', 'e marque a pessoa no final', '', '*' + PREFIX() + cmd + ' @pessoa*']), footer: '© ' + config.botName,
      fallback: PREFIX() + cmd + ' @pessoa',
      buttons: [btn.copy('📋 Copiar comando', PREFIX() + cmd + ' @'), btn.reply('🔙 Jogos', 'rp:games'), btn.channel('📢 Canal')]
    });
  }
});

module.exports = { open, openGames, presentIsk, groupsOf };
__TP_EOF__
node - <<'__TP_PATCH__'
const fs = require('fs');
// 1) carrega o rpgUi
let ix = fs.readFileSync('src/interactive/index.js', 'utf8');
if (ix.includes("'rpgUi'")) console.log('= index ja atualizado');
else {
  const a = ix.includes("'animeUi']") ? "'animeUi']" : "'gamesUi']";
  if (!ix.includes(a)) { console.log('❌ index.js: trecho nao encontrado'); process.exit(2); }
  fs.writeFileSync('src/interactive/index.js', ix.replace(a, a.replace(']', ", 'rpgUi']"))); console.log('✔ index atualizado');
}
// 2) menu principal: categorias abrem em lista selecionavel + novas opcoes
let mm = fs.readFileSync('src/interactive/mainMenu.js', 'utf8');
let changed = false;
if (!mm.includes("require('./rpgUi').open")) {
  const a = 'async function openCategory(ctx, cat) {\n';
  if (!mm.includes(a)) { console.log('❌ mainMenu: openCategory nao encontrado'); process.exit(2); }
  mm = mm.replace(a, a + "  try { if (await require('./rpgUi').open(ctx, cat)) return; } catch (e) { console.error('[catUi]', e && e.message); }\n");
  changed = true;
}
if (!mm.includes('TP_ROWS2')) {
  const b = "row('🎮', 'Mini Games', 'Jogos web, velha, ligue 4', 'mn:cmd:menuwebgames');";
  if (!mm.includes(b)) { console.log('❌ mainMenu: linha Mini Games nao encontrada'); process.exit(2); }
  mm = mm.replace(b, b + "\n  row('🕹️', 'Jogos Interativos', 'Velha, Connect 4, PPT, forca e mais', 'rp:games'); // TP_ROWS2\n  row('🌌', 'RPG Isekai', 'Aventura, personagem, guilda e mais', 'rp:isk:home');");
  changed = true;
}
if (changed) { fs.writeFileSync('src/interactive/mainMenu.js', mm); console.log('✔ mainMenu atualizado'); } else console.log('= mainMenu ja atualizado');
__TP_PATCH__
for f in src/interactive/rpgUi.js src/interactive/index.js src/interactive/mainMenu.js; do node --check "$f" || { echo "❌ erro de sintaxe em $f - restaurando"; cp "$BK/mainMenu.js" src/interactive/mainMenu.js; cp "$BK/interactive-index.js" src/interactive/index.js; rm -f src/interactive/rpgUi.js; exit 3; }; done
echo "✅ Menus interativos instalados. Reinicie o bot."
echo "   Desligar: CAT_BUTTONS=off no .env"
