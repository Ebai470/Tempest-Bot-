'use strict';
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const off = () => require('../services/modes').suggestOff();
const numOf = (j) => String(j || '').split('@')[0].split(':')[0];
const PREFIX = () => (config.prefixes && config.prefixes[0]) || '!';
const BOT_LABEL = 'Tempest Bot';
const cooldown = new Map();
const store = new Map();
setInterval(() => { const n = Date.now(); for (const [k, v] of store) if (n - v.ts > 20 * 60 * 1000) store.delete(k); for (const [k, v] of cooldown) if (n - v > 60000) cooldown.delete(k); }, 60000).unref();

function sim(a, b) {
  a = String(a || '').toLowerCase(); b = String(b || '').toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 100;
  const m = a.length, n = b.length;
  const d = [];
  for (let i = 0; i <= m; i++) { d[i] = [i]; }
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return Math.round((1 - d[m][n] / Math.max(m, n)) * 100);
}
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function rank(typed, candidates, min) {
  const t = norm(typed);
  const out = [];
  for (const c of candidates) {
    let sc = sim(t, norm(c.key));
    if (t.length >= 3 && norm(c.key).startsWith(t)) sc = Math.max(sc, 88);
    if (sc >= min - 25) out.push({ c: c, sc: sc });
  }
  out.sort((x, y) => y.sc - x.sc);
  if (!out.length || out[0].sc < min) return [];
  const top = out[0].sc, seen = {}, res = [];
  for (const o of out) {
    if (o.sc < top - 25) break;
    const id = o.c.show;
    if (seen[id]) continue;
    seen[id] = true; res.push(Object.assign({}, o.c, { sc: o.sc }));
    if (res.length >= 3) break;
  }
  return res;
}

function cmdCandidates() {
  const out = [];
  for (const e of registry.getAll()) {
    if (/hentai|nsfw|porn|[+]18/i.test(String(e.name || '') + ' ' + String(e.category || '') + ' ' + (e.aliases || []).join(' '))) continue;
    const names = [e.name].concat(e.aliases || []);
    for (const n of names) {
      const s = String(n || '');
      if (s.length < 3 || /^[0-9_]+$/.test(s) || /^(smenu|intermenu|menui|menubotoes)$/.test(s)) continue;
      out.push({ key: s, show: e.name, desc: e.description || '' });
    }
  }
  return out;
}

const MENU_ARGS = ['adm', 'admin', 'dono', 'grupo', 'internet', 'bn', 'diversao', 'sticker', 'stickers', 'imagem', 'seguranca', 'utilidades', 'rpg', 'familia',
  'xp', 'rank', 'economia', 'aluguel', 'jogos', 'games', 'download', 'downloads', 'baixar', 'modos', 'webgames'];

function quotedCard(sock, jid) {
  const me = String((sock.user && sock.user.id) || '').replace(/:\d+@/, '@');
  return { key: { remoteJid: jid, fromMe: false, id: 'TP' + Date.now().toString(16) + Math.random().toString(16).slice(2, 8).toUpperCase(), participant: me }, message: { conversation: 'Enviado por ' + BOT_LABEL } };
}

async function sendSuggestion(ctx, kind, typedShown, texts, shows, scores) { // TP_SUGCARD
  return require('./sugCard').send(ctx, { kind: kind, typedShown: typedShown, texts: texts, shows: shows, scores: scores, store: store, btn: btn, sendNative: sendNative, quotedCard: quotedCard, config: config, numOf: numOf });
}

function pseudo(parsed, msg) {
  if (off() || !parsed || !parsed.command) return null;
  const typed = String(parsed.command);
  if (typed.length < 3 || typed.length > 24 || !/^[a-zA-ZÀ-ÿ0-9_]+$/.test(typed) || /^[0-9_]+$/.test(typed)) return null;
  const chat = msg && msg.key && msg.key.remoteJid;
  const who = (msg && msg.key && (msg.key.participant || msg.key.remoteJid)) || '';
  const ck = chat + '|' + numOf(who);
  if (cooldown.has(ck) && Date.now() - cooldown.get(ck) < 8000) return null;
  const best = rank(typed, cmdCandidates(), 70);
  if (!best.length) return null;
  cooldown.set(ck, Date.now());
  const pref = String(parsed.prefix || PREFIX());
  const rest = (parsed.args || []).join(' ');
  return {
    name: 'sugestao', aliases: [], category: 'utilidades', description: 'Sugestao de comando', usage: '',
    handler: async (ctx) => {
      const texts = best.map((b) => b.show + (rest ? ' ' + rest : ''));
      const shows = best.map((b) => pref + b.show + (rest ? ' ' + rest : ''));
      return sendSuggestion(ctx, 'cmd', pref + typed + (rest ? ' ' + rest : ''), texts, shows, best.map((b) => b.sc));
    }
  };
}

function wrapMenu() {
  const e = registry.get('menu');
  if (!e || e.__tpSug) return;
  const orig = e.handler;
  e.handler = async function (ctx) {
    try {
      const a = ctx.args && ctx.args[0];
      if (a && !off()) {
        const k = norm(a);
        if (MENU_ARGS.indexOf(k) < 0 && !(registry.get('menu' + k))) {
          const best = rank(k, MENU_ARGS.map((x) => ({ key: x, show: x })), 55);
          if (best.length) {
            const pref = (ctx.prefix && String(ctx.prefix).trim()) || PREFIX();
            return await sendSuggestion(ctx, 'menu', pref + 'menu ' + a, best.map((b) => 'menu ' + b.show), best.map((b) => pref + 'menu ' + b.show), best.map((b) => b.sc));
          }
        }
      }
    } catch (err) { console.error('[sugestao]', err && err.message); }
    return orig.call(this, ctx);
  };
  e.__tpSug = true;
}
wrapMenu();

router.register('sg', async (ctx, rest, msg, deps) => {
  const p = rest.split(':');
  const say = (t) => ctx.sock.sendMessage(ctx.jid, { text: t });
  const j = store.get(p[1]);
  if (!j) return say('⌛ Essa sugestão expirou. Digite o comando de novo.');
  if (numOf(ctx.sender) !== numOf(j.sender)) return say('🚫 Só quem digitou o comando pode usar essa sugestão.');
  const text = j.texts[parseInt(p[2], 10)];
  if (!text) return;
  if (!deps || typeof deps.reinject !== 'function') return say('Digite: ' + PREFIX() + text);
  const o = ctx.msg;
  const fake = {
    key: { remoteJid: ctx.jid, fromMe: false, id: 'TP' + Date.now().toString(16) + Math.random().toString(16).slice(2, 8).toUpperCase(), participant: o && o.key && o.key.participant },
    message: { conversation: PREFIX() + text }, pushName: o && o.pushName, messageTimestamp: Math.floor(Date.now() / 1000)
  };
  if (o && o.key && o.key.participantPn) fake.key.participantPn = o.key.participantPn;
  return deps.reinject(fake);
});

module.exports = { pseudo, sim, rank };
