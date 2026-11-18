'use strict';
/**
 * ANTI-PAYMENT — portado do bot do amigo (bot-amg) para o TEMPEST BOT.
 * Deteta (1) pedidos de pagamento (requestPaymentMessage) e (2) mensagens indecifráveis repetidas
 * ("cobrança oculta") de membros comuns em grupos onde o recurso está ligado.
 * Ação: fecha o grupo, apaga a mensagem (se visível), remove o membro e reabre o grupo (só se estava aberto).
 * Nunca age contra dono do bot, ADMs do grupo ou o próprio bot. Só avisa/remove se o bot for ADM.
 */
let proto = null;
try { proto = require('@whiskeysockets/baileys').proto; } catch (_) {}
const CIPHERTEXT_STUB = (proto && proto.WebMessageInfo && proto.WebMessageInfo.StubType && proto.WebMessageInfo.StubType.CIPHERTEXT) || 2;

const WINDOW_MS = 2 * 60 * 1000;        // janela de contagem das mensagens indecifráveis
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // intervalo mínimo entre ações para o mesmo membro
const TRACKER_TTL_MS = 10 * 60 * 1000;
const MAX_DEPTH = 8;
const tracker = new Map();
let lastSweep = Date.now();

const db = () => require('../database');
const cfgMod = () => require('../config');
const get = (jid, k, d) => { try { return db().getGroupSetting(jid, k, d); } catch (_) { return d; } };
const set = (jid, k, v) => db().setGroupSetting(jid, k, v);
const isEnabled = (jid) => ['1', 'on', 'true', 1, true].includes(get(jid, 'antipayment', '0'));
const getMode = (jid) => (get(jid, 'antipayment_mode', 'remover') === 'aviso' ? 'aviso' : 'remover');
const getLimit = (jid) => { const n = parseInt(get(jid, 'antipayment_limit', '3'), 10); return n >= 2 && n <= 10 ? n : 3; };
const digits = (j) => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');

/** procura "requestPaymentMessage" em qualquer nível (ignora mensagens citadas) — igual ao paymentMessage.js do amigo */
function canScan(v) { return v && typeof v === 'object' && !(v instanceof ArrayBuffer) && !ArrayBuffer.isView(v); }
function scan(value, depth, seen) {
  if (!canScan(value) || depth > MAX_DEPTH || seen.has(value)) return false;
  seen.add(value);
  for (const [k, child] of Object.entries(value)) {
    if (k === 'quotedMessage') continue;
    if (k === 'requestPaymentMessage' && canScan(child)) return true;
    if (scan(child, depth + 1, seen)) return true;
  }
  return false;
}
const hasPaymentMessage = (msg) => scan(msg && msg.message, 0, new WeakSet());

function sweep(now) {
  if (now - lastSweep < TRACKER_TTL_MS) return; lastSweep = now;
  for (const [k, e] of tracker) if (now - e.windowStart > TRACKER_TTL_MS) tracker.delete(k);
}
function register(key, now) {
  let e = tracker.get(key);
  if (!e || now - e.windowStart > WINDOW_MS) e = { count: 0, windowStart: now, lastAlertAt: 0 };
  e.count += 1; tracker.set(key, e); return e;
}

function findPart(parts, id) {
  const d = digits(id);
  return (parts || []).find((p) => [p.id, p.lid, p.phoneNumber, p.jid].some((x) => x && (x === id || digits(x) === d)));
}
async function exemptInfo(sock, jid, sender) {
  let meta = null; try { meta = await sock.groupMetadata(jid); } catch (_) {}
  const me = sock.user || {}; const meIds = [me.id, me.lid].filter(Boolean);
  const botPart = meta && (meta.participants || []).find((p) => meIds.some((m) => [p.id, p.lid, p.phoneNumber, p.jid].some((x) => x && digits(x) === digits(m))));
  const part = meta && findPart(meta.participants, sender);
  let owner = false; try { const c = cfgMod(); owner = !!(c.isOwner && (c.isOwner(sender) || c.isOwner(part && part.phoneNumber))); } catch (_) {}
  const isBot = meIds.some((m) => digits(m) === digits(sender));
  const isAdmin = !!(part && part.admin) || !!(meta && meta.owner && digits(meta.owner) === digits(sender));
  return { exempt: owner || isBot || isAdmin, botIsAdmin: !!(botPart && botPart.admin), closed: !!(meta && meta.announce), meta };
}

const MOTIVO = {
  pagamento: 'enviou um pedido de pagamento (cobranca)',
  oculta: 'tentou enviar cobranca oculta e indecifravel',
  repetida: 'enviou varias mensagens indecifraveis seguidas'
};
function notice(kind, sender, acao) {
  return '🛡️ *ANTI-PAYMENT*\n\n👤 Usuario: @' + digits(sender) + '\n⚙️ Acao: ' + acao + '\n⚠️ Motivo: ' + MOTIVO[kind];
}
async function step(fn, label) { try { await fn(); return true; } catch (e) { console.error('[antipayment] ' + label + ': ' + (e && e.message)); return false; } }

async function restrict(sock, jid, sender, msg, visible, info) {
  const wasClosed = info.closed;
  try {
    if (!wasClosed) await step(() => sock.groupSettingUpdate(jid, 'announcement'), 'fechar grupo');
    if (visible && msg.key) await step(() => sock.sendMessage(jid, { delete: msg.key }), 'apagar mensagem');
    await step(() => sock.groupParticipantsUpdate(jid, [sender], 'remove'), 'remover membro');
  } finally {
    if (!wasClosed) await step(() => sock.groupSettingUpdate(jid, 'not_announcement'), 'reabrir grupo');
  }
}

async function handle(sock, msg) {
  const key = msg && msg.key; if (!key || key.fromMe) return;
  const jid = key.remoteJid; if (!jid || !jid.endsWith('@g.us')) return;
  const visible = hasPaymentMessage(msg);
  const stub = msg.messageStubType === CIPHERTEXT_STUB || !!msg.stealthMeta;
  if (!visible && !stub) return;
  const sender = key.participant || msg.participant; if (!sender) return;
  if (!isEnabled(jid)) return;

  const now = Date.now(); sweep(now);
  const tk = jid + '|' + sender; const entry = register(tk, now);
  let kind = null;
  if (visible) kind = 'pagamento';
  else if (msg.stealthMeta && msg.stealthMeta.decryptFail === 'hide') kind = 'oculta';
  else if (entry.count >= getLimit(jid)) kind = 'repetida';
  if (!kind) return;
  if (entry.lastAlertAt && now - entry.lastAlertAt < ALERT_COOLDOWN_MS) return;

  const info = await exemptInfo(sock, jid, sender);
  if (info.exempt) return;
  entry.lastAlertAt = now; tracker.set(tk, entry);
  console.warn('[antipayment] suspeita (' + kind + ') em ' + jid + ' autor ' + sender + ' ocorrencias=' + entry.count);

  const mode = getMode(jid);
  if (mode === 'remover' && info.botIsAdmin) {
    await restrict(sock, jid, sender, msg, visible, info);
    await step(() => sock.sendMessage(jid, { text: notice(kind, sender, 'Removido'), mentions: [sender] }), 'aviso');
  } else {
    const acao = mode === 'aviso' ? 'Apenas aviso (modo aviso)' : 'Nao removi: o bot nao e ADM do grupo';
    await step(() => sock.sendMessage(jid, { text: notice(kind, sender, acao), mentions: [sender] }), 'aviso');
  }
}

/** liga o detetor a uma ligação do WhatsApp (chamado pelo index.js a cada (re)ligação) */
function install(sock) {
  if (!sock || !sock.ev || sock.__antiPaymentInstalled) return;
  sock.__antiPaymentInstalled = true;
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type && type !== 'notify') return;
    for (const m of messages || []) handle(sock, m).catch((e) => console.error('[antipayment]', e && e.message));
  });
}
async function botIsGroupAdmin(sock, jid) { const i = await exemptInfo(sock, jid, ''); return i.botIsAdmin; }

module.exports = { install, handle, hasPaymentMessage, isEnabled, getMode, getLimit, set, botIsGroupAdmin, _tracker: tracker };
