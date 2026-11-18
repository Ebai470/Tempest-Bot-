'use strict';
/**
 * PREFIXO+ e CITA
 * 1) "prefixo" (e variações) funciona SEM prefixo nos grupos, mesmo com o modoprefixo ativo.
 * 2) !cita — cita (reposta) uma mensagem respondida, ou decora um texto como citação.
 * Carregado sozinho pelo loader de comandos.
 */
const gp = require('../../utils/groupPrefix');

const ALIAS = new Set(['prefixos', 'meuprefixo', 'qualprefixo', 'prefix', 'prefixes']);
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const ASK = /^(?:(?:qual|quais|cade|como|me diz|me diga|me fala|me fale|me manda|me mande|diz|fala|manda|mostra)\s+)?(?:e\s+)?(?:o\s+|os\s+|a\s+)?(?:meu\s+|nosso\s+)?(?:prefixos?|prefix(?:es)?)(?:\s+(?:do|da|de)\s+(?:bot|grupo|gp|aqui))?(?:\s+(?:aqui|pf|pfv|por favor|gente|galera|mano|ne))?$/;
function isAsk(body) { const t = norm(body); return !!t && t.split(' ').length <= 7 && ASK.test(t); }

if (!gp.__prefixoPlus) {
  gp.__prefixoPlus = true;
  const orig = gp.parse;
  gp.parse = function (msg, parseMessage) {
    const p = orig.call(gp, msg, parseMessage);
    try {
      if (p && !p.isPayment) {
        if (!p.hasPrefix && isAsk(p.body)) return Object.assign({}, p, { command: 'prefixo', args: [], text: '', prefix: '', hasPrefix: false });
        if (p.command && ALIAS.has(p.command)) p.command = 'prefixo';
      }
    } catch (_) { /* nunca quebra o parser */ }
    return p;
  };
}

const num = (j) => String(j || '').split('@')[0].split(':')[0];
function unwrap(m) {
  m = m || {};
  for (let i = 0; i < 5; i++) { const w = m.ephemeralMessage || m.viewOnceMessage || m.viewOnceMessageV2 || m.viewOnceMessageV2Extension || m.documentWithCaptionMessage; if (w && w.message) m = w.message; else break; }
  return m;
}
function ctxInfo(msg) {
  const m = unwrap(msg && msg.message);
  for (const k of Object.keys(m)) { const v = m[k]; if (v && typeof v === 'object' && v.contextInfo) return v.contextInfo; }
  return null;
}
function textOf(q) {
  const m = unwrap(q);
  return String(m.conversation || (m.extendedTextMessage && m.extendedTextMessage.text) || (m.imageMessage && m.imageMessage.caption) || (m.videoMessage && m.videoMessage.caption) || (m.documentMessage && m.documentMessage.caption) || '').trim();
}
function labelOf(q) {
  const m = unwrap(q);
  if (m.imageMessage) return '🖼️ imagem'; if (m.videoMessage) return '🎬 vídeo'; if (m.audioMessage) return '🎵 áudio';
  if (m.stickerMessage) return '🎴 figurinha'; if (m.documentMessage) return '📄 documento'; if (m.locationMessage) return '📍 localização';
  if (m.contactMessage || m.contactsArrayMessage) return '👤 contato'; if (m.pollCreationMessage || m.pollCreationMessageV3) return '📊 enquete';
  return '💬 mensagem';
}
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const cita = {
  name: 'cita',
  aliases: ['citar', 'cotar', 'citacao', 'citação'],
  category: 'utilidades',
  description: 'Cita uma mensagem (responda a ela com !cita)',
  usage: '!cita (responda uma mensagem)  |  !cita texto',
  handler: async (ctx) => {
    const ci = ctxInfo(ctx.msg), q = ci && ci.quotedMessage, text = String(ctx.text || '').trim();
    if (!q) {
      if (!text) return ctx.reply('📌 *CITA*\n\nResponda uma mensagem com *!cita* para citá-la.\nOu use: *!cita seu texto*');
      return ctx.sock.sendMessage(ctx.jid, { text: '❝ ' + clip(text, 1500) + ' ❞\n\n— @' + num(ctx.sender), mentions: [ctx.sender] }, { quoted: ctx.msg });
    }
    const who = ci.participant || (ctx.isGroup ? null : ctx.jid);
    const me = num(ctx.sock && ctx.sock.user && ctx.sock.user.id);
    const quoted = { key: { remoteJid: ctx.jid, fromMe: !!(who && me && num(who) === me), id: ci.stanzaId, participant: ctx.isGroup ? who || undefined : undefined }, message: q };
    const body = textOf(q) || labelOf(q);
    const lines = ['❝ ' + clip(body, 1500) + ' ❞', '', '— ' + (who ? '@' + num(who) : 'autor')];
    const mentions = who ? [who] : [];
    if (text) { lines.push('', '💬 @' + num(ctx.sender) + ': ' + clip(text, 400)); mentions.push(ctx.sender); }
    return ctx.sock.sendMessage(ctx.jid, { text: lines.join('\n'), mentions: mentions }, { quoted: quoted });
  }
};

module.exports = [cita];
