'use strict';
const nf = require('./nativeFlow');
const btn = nf.btn;
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const PAGE = 30;
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const off = () => String(nf.getEnv('GAME_BUTTONS') || '').toLowerCase() === 'off';
let origList = null, cache = null;

async function capture(handler, ctx, args) {
  let out = '';
  const c = Object.create(ctx);
  c.args = args || [];
  c.reply = async (t) => { out += (out ? '\n' : '') + String(t); };
  await handler.call(null, c);
  return out;
}
function parseList(text) {
  const out = [];
  String(text).split('\n').forEach((l) => {
    const m = l.match(/`(\d+)`\s*\*(.+?)\*\s*:\s*>?\s*(.*)$/);
    if (m) out.push({ n: parseInt(m[1], 10), nome: m[2], short: (m[3] || '').trim() });
  });
  return out;
}
async function getGames(ctx) {
  if (cache && cache.length) return cache;
  if (!origList) return [];
  cache = parseList(await capture(origList, ctx, []));
  return cache;
}
function listOpts(ctx, games, page, fallback) {
  const start = page * PAGE, slice = games.slice(start, start + PAGE);
  const secs = [];
  for (let i = 0; i < slice.length; i += 10) {
    const part = slice.slice(i, i + 10);
    secs.push({ title: '🎮 Jogos ' + part[0].n + '–' + part[part.length - 1].n, rows: part.map((g) => ({ header: '', title: clip(g.nome, 60), description: clip(g.short, 70), id: 'wj:' + g.n })) });
  }
  const more = start + slice.length < games.length;
  const buttons = [btn.list('🎮 Escolher jogo', secs)];
  if (more) buttons.push(btn.reply('➕ Mais jogos', 'wj:p:' + (page + 1)));
  else if (page > 0) buttons.push(btn.reply('⬅️ Primeiros jogos', 'wj:p:0'));
  buttons.push(btn.reply('🎲 Surpreenda-me', 'wj:r'));
  return {
    body: '╭━━〔 🌐 JOGOS DE NAVEGADOR 〕━━╮\n┃ ' + games.length + ' jogos, sem instalar nada\n┃ 👇 Toque em *Escolher jogo*\n╰━━━━━━━━━━━━━━━━━━╯',
    footer: '© ' + config.botName + ' • Jogos', quoted: ctx.msg, fallback: fallback || '', buttons: buttons
  };
}
async function sendCard(ctx, n) {
  const e = registry.get('jogon' + n);
  if (!e || typeof e.handler !== 'function') return;
  const text = await capture(e.handler, ctx, []);
  const url = (text.match(/https?:\/\/[^\s]+/) || [])[0];
  if (!url) return ctx.sock.sendMessage(ctx.jid, { text: text });
  return nf.sendNative(ctx.sock, ctx.jid, {
    body: text, footer: '© ' + config.botName + ' • Jogos', quoted: ctx.msg, fallback: text,
    buttons: [btn.url('🎮 Jogar agora', url), btn.reply('📋 Ver lista', 'wj:p:0'), btn.reply('🎲 Outro jogo', 'wj:r')]
  });
}
function install() {
  const e = registry.get('jogos');
  if (!e || e.__tpWeb) return;
  const orig = e.handler;
  origList = orig;
  e.handler = async function (ctx) {
    if (off()) return orig.call(this, ctx);
    try {
      const text = await capture(orig, ctx, []);
      const games = parseList(text);
      if (games.length < 2) return orig.call(this, ctx);
      cache = games;
      return await nf.sendNative(ctx.sock, ctx.jid, listOpts(ctx, games, 0, text));
    } catch (err) {
      console.error('[webgames]', err && err.message);
      return orig.call(this, ctx);
    }
  };
  e.__tpWeb = true;
}
install();

router.register('wj', async (ctx, rest) => {
  const p = String(rest).split(':');
  if (p[0] === 'p') {
    const games = await getGames(ctx); if (!games.length) return;
    return nf.sendNative(ctx.sock, ctx.jid, listOpts(ctx, games, Math.max(0, parseInt(p[1], 10) || 0)));
  }
  if (p[0] === 'r') {
    const games = await getGames(ctx); if (!games.length) return;
    return sendCard(ctx, games[Math.floor(Math.random() * games.length)].n);
  }
  const n = parseInt(p[0], 10);
  if (!n || n < 1 || n > 500) return;
  return sendCard(ctx, n);
});

module.exports = { parseList, listOpts, install };
