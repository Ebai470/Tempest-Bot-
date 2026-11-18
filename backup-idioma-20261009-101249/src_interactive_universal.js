'use strict';
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const NO_REPEAT_CATS = new Set(['dono', 'admin', 'seguranca', 'aluguel', 'economia']);
const NO_REPEAT_NAME = /^(j[1-9]|[1-9]|aceitar.*|recusar.*|cancelar.*|menu.*|help|ajuda|comandos)$/i;
const NAV_ONLY = /^(menu.*|help|ajuda|comandos)$/i;
const MAX_TEXT = 1800;

const store = new Map();
const TTL = 30 * 60 * 1000;
setInterval(() => { const n = Date.now(); for (const [k, v] of store) if (n - v.ts > TTL) store.delete(k); }, 60000).unref();
const numOf = (j) => String(j || '').split('@')[0].split(':')[0];
const token = () => Math.random().toString(36).slice(2, 9);

function off() { return String(getEnv('UX_BUTTONS') || '').toLowerCase() === 'off'; }

function isUsage(t) {
  const s = String(t || '');
  if (s.length > 450) return false;
  return /^\s*[^\wÀ-ÿ]{0,6}\*?\s*(uso|use|usage|exemplo|como usar)\b/i.test(s) || /\b(uso|use|exemplo)\s*:/i.test(s);
}
function isError(t) { return /^\s*[❌⚠🚫⛔🔒]/.test(String(t || '')); }

function pickButtons(ctx, e, text) {
  const nav = [btn.reply('🏠 Menu', 'mn:home'), btn.channel('📢 Canal')];
  if (NAV_ONLY.test(e.name)) return nav;
  const usage = e.usage || ((ctx.prefix || (config.prefixes && config.prefixes[0]) || '!') + e.name);
  if (isUsage(text)) return [btn.copy('📋 Copiar comando', String(usage).split('\n')[0].replace(/<[^>]*>|\[[^\]]*\]/g, '').trim() + ' ')].concat(nav);
  const canRepeat = !isError(text) && !NO_REPEAT_CATS.has(e.category) && !e.adminOnly && !e.ownerOnly && !NO_REPEAT_NAME.test(e.name) && ctx.msg && ctx.msg.message;
  if (canRepeat) {
    const tk = token();
    store.set(tk, { msg: ctx.msg, sender: ctx.sender, ts: Date.now() });
    if (store.size > 800) store.delete(store.keys().next().value);
    return [btn.reply('🔁 Repetir', 'ux:rep:' + tk)].concat(nav);
  }
  return nav;
}

function plainText(c) {
  const keys = Object.keys(c).filter((k) => c[k] !== undefined);
  const okKeys = ['text', 'mentions', 'contextInfo'];
  if (keys.some((k) => okKeys.indexOf(k) < 0)) return false;
  if (typeof c.text !== 'string' || !c.text.trim() || c.text.length > MAX_TEXT) return false;
  if (c.contextInfo && Object.keys(c.contextInfo).some((k) => k !== 'mentionedJid')) return false;
  return true;
}
function imageCaption(c) {
  if (!c.image || !Buffer.isBuffer(c.image)) return false;
  if (c.image.length > 5 * 1024 * 1024) return false;
  if (c.viewOnce || c.gifPlayback || c.ptv) return false;
  if (typeof c.caption !== 'string' || !c.caption.trim() || c.caption.length > 1500) return false;
  const bad = Object.keys(c).filter((k) => ['image', 'caption', 'mimetype', 'mentions', 'contextInfo', 'jpegThumbnail'].indexOf(k) < 0);
  return bad.length === 0;
}

function makeProxy(real, ctx, e, state) {
  return new Proxy(real, {
    get(t, p) {
      if (p === 'sendMessage') {
        return async function (jid, content, options) {
          try {
            if (!state.done && !off() && jid === ctx.jid && content && typeof content === 'object') {
              const isText = plainText(content), isImg = !isText && imageCaption(content);
              if (isText || isImg) {
                state.done = true;
                const body = isText ? content.text : content.caption;
                const mentions = content.mentions || (content.contextInfo && content.contextInfo.mentionedJid) || [];
                const quoted = options && options.quoted;
                await sendNative(real, jid, {
                  body: body, footer: '© ' + config.botName, mentions: mentions, quoted: quoted,
                  image: isImg ? content.image : undefined,
                  buttons: pickButtons(ctx, e, body), fallback: body
                });
                return;
              }
            }
          } catch (err) { console.error('[ux]', e.name, err && err.message); }
          return t.sendMessage(jid, content, options);
        };
      }
      const v = Reflect.get(t, p, t);
      return typeof v === 'function' ? v.bind(t) : v;
    }
  });
}

function wrapEntry(e) {
  if (!e || e.__tpUx || typeof e.handler !== 'function') return false;
  const orig = e.handler;
  e.handler = async function (ctx) {
    if (off() || !ctx || !ctx.sock) return orig.call(this, ctx);
    const real = ctx.sock;
    const state = { done: false };
    let proxied = false;
    try { ctx.sock = makeProxy(real, ctx, e, state); proxied = true; } catch (_) {}
    try { return await orig.call(this, ctx); }
    finally { if (proxied) ctx.sock = real; }
  };
  e.__tpUx = true;
  return true;
}

function wrapAll() {
  let n = 0, total = 0;
  try { const all = registry.getAll(); total = all.length; all.forEach((e) => { if (wrapEntry(e)) n++; }); } catch (err) { console.error('[ux] wrapAll', err && err.message); }
  console.log('[ux] botoes ativos em ' + n + ' de ' + total + ' comandos');
  return { wrapped: n, total: total };
}

router.register('ux', async (ctx, rest, msg, deps) => {
  const parts = rest.split(':');
  if (parts[0] !== 'rep') return;
  const say = (t) => ctx.sock.sendMessage(ctx.jid, { text: t });
  const job = store.get(parts[1]);
  if (!job) return say('⌛ Esse botão expirou. Mande o comando de novo.');
  if (numOf(ctx.sender) !== numOf(job.sender)) return say('🚫 Só quem usou o comando pode repetir.');
  if (!deps || typeof deps.reinject !== 'function') return say('❌ Não deu para repetir agora.');
  const orig = job.msg;
  const fake = {
    key: { remoteJid: orig.key.remoteJid, fromMe: false, id: 'TP' + Date.now().toString(16) + Math.random().toString(16).slice(2, 8).toUpperCase(), participant: orig.key.participant },
    message: orig.message, pushName: orig.pushName, messageTimestamp: Math.floor(Date.now() / 1000)
  };
  if (orig.key.participantPn) fake.key.participantPn = orig.key.participantPn;
  await deps.reinject(fake);
});

module.exports = { wrapAll, wrapEntry, makeProxy };
