'use strict';
/**
 * BOT TOOLS — Lista Negra B (ban automático), Report de bug (com código) e Avaliação do bot.
 * O bot NUNCA inicia conversa: reportes só vão para o chat que o dono definiu com "bugsdestino"
 * (um chat que o próprio dono abriu). Listas/bans só agem em grupos onde o bot é ADM.
 */
const crypto = require('crypto');
const dbm = () => require('../database');
const D = () => dbm().getDb();
const digits = (j) => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');

let inited = false;
function init() {
  if (inited) return;
  D().exec(`
CREATE TABLE IF NOT EXISTS bot_blacklist (id INTEGER PRIMARY KEY AUTOINCREMENT, num TEXT, lid TEXT, reason TEXT, added_by TEXT, ts INTEGER);
CREATE TABLE IF NOT EXISTS bot_reports (code TEXT PRIMARY KEY, reporter TEXT, reporter_num TEXT, chat TEXT, chat_name TEXT, text TEXT, ts INTEGER, status TEXT, note TEXT, done_ts INTEGER);
CREATE TABLE IF NOT EXISTS bot_ratings (user TEXT PRIMARY KEY, stars INTEGER, chat TEXT, ts INTEGER)
`);
  inited = true;
}

// ───────────────────────── Lista Negra B ─────────────────────────
let cache = null;
const rows = () => { init(); if (!cache) cache = D().prepare('SELECT * FROM bot_blacklist').all(); return cache; };
const invalidate = () => { cache = null; };
function same(a, b) { // números iguais (tolera o código do país em falta)
  if (!a || !b) return false; if (a === b) return true;
  if (a.length >= 9 && b.length > a.length && b.endsWith(a)) return true;
  if (b.length >= 9 && a.length > b.length && a.endsWith(b)) return true;
  return false;
}
function findRow(cands) {
  const ds = [...new Set((cands || []).map(digits).filter(Boolean))]; if (!ds.length) return null;
  for (const r of rows()) for (const d of ds) if (same(r.num, d) || (r.lid && r.lid === d)) return r;
  return null;
}
function addEntry({ num, lid, reason, by }) {
  init(); num = digits(num); lid = digits(lid);
  if (!num && !lid) return { err: 'Número inválido.' };
  const cfg = require('../config');
  if ((num && cfg.isOwner(num)) || (lid && cfg.isOwner(lid))) return { err: 'Não posso pôr o dono na lista negra.' };
  const ex = findRow([num, lid]); if (ex) return { err: 'Já está na lista negra.', row: ex };
  D().prepare('INSERT INTO bot_blacklist (num,lid,reason,added_by,ts) VALUES (?,?,?,?,?)').run(num || '', lid || '', String(reason || '').slice(0, 120), by || '', Date.now()); invalidate();
  return { ok: true };
}
function removeEntry(q) { init(); const r = findRow([q]); if (!r) return false; D().prepare('DELETE FROM bot_blacklist WHERE id=?').run(r.id); invalidate(); return true; }
const listEntries = () => rows().slice();
function learnLid(row, lid) { lid = digits(lid); if (row && lid && row.lid !== lid) { D().prepare('UPDATE bot_blacklist SET lid=? WHERE id=?').run(lid, row.id); invalidate(); } }

const partIds = (p) => (typeof p === 'string' ? [p] : [p && p.id, p && p.lid, p && p.phoneNumber, p && p.jid]).filter(Boolean);
function botIsAdmin(sock, meta) {
  const me = sock.user || {}; const ids = [me.id, me.lid].map(digits).filter(Boolean);
  const p = (meta.participants || []).find((x) => partIds(x).some((i) => ids.includes(digits(i))));
  return !!(p && p.admin);
}
const noticeBan = (sock, group, id) => sock.sendMessage(group, { text: '🚫 *LISTA NEGRA B*\n\n👤 @' + digits(id) + ' está na lista negra e foi removido(a) automaticamente.', mentions: [id] }).catch(() => {});

/** remove da lista negra quem estiver no grupo (se o bot for ADM). `only` = números a verificar (opcional) */
async function scanMeta(sock, meta, only) {
  if (!meta || !rows().length || !botIsAdmin(sock, meta)) return 0; let n = 0;
  for (const p of meta.participants || []) {
    const ids = partIds(p); if (only && !ids.some((i) => only.includes(digits(i)))) continue;
    const row = findRow(ids); if (!row) continue;
    if (p.admin === 'superadmin') continue;
    const target = typeof p === 'string' ? p : p.id; if (/@lid$/.test(target)) learnLid(row, target); else if (p.lid) learnLid(row, p.lid);
    try { await sock.groupParticipantsUpdate(meta.id, [target], 'remove'); n++; await noticeBan(sock, meta.id, target); } catch (e) { console.error('[listanegrab] remover:', e && e.message); }
  }
  return n;
}
async function scanAll(sock) {
  let all = {}; try { all = await sock.groupFetchAllParticipating(); } catch (e) { console.error('[listanegrab] groups:', e && e.message); return { groups: 0, removed: 0 }; }
  let removed = 0; const list = Object.entries(all || {}).map(([k, m]) => (/@g\.us$/.test(String(m && m.id)) ? m : Object.assign({}, m, { id: k })));
  for (const meta of list) { removed += await scanMeta(sock, meta); }
  return { groups: list.length, removed };
}

const adminCache = new Map(); const lastHit = new Map();
async function onParticipants(sock, update) {
  if (!update || !rows().length) return; const gid = update.id;
  if (update.action === 'add' || update.action === 'promote') {
    let meta = null; try { meta = await sock.groupMetadata(gid); } catch (_) { return; }
    if (meta && !/@g\.us$/.test(String(meta.id || ''))) meta.id = gid;
    if (update.action === 'promote') { // o bot virou ADM: varre o grupo
      const me = sock.user || {}; const ids = (update.participants || []).flatMap(partIds).map(digits);
      if (ids.includes(digits(me.id)) || ids.includes(digits(me.lid))) await scanMeta(sock, meta);
      return;
    }
    const added = (update.participants || []).flatMap(partIds).map(digits);
    await scanMeta(sock, meta, added);
  }
}
async function onMessage(sock, msg) {
  const k = msg && msg.key; if (!k || k.fromMe || !k.remoteJid || !k.remoteJid.endsWith('@g.us') || !rows().length) return;
  const sender = k.participant || msg.participant; if (!sender) return;
  const row = findRow([sender, k.participantPn]); if (!row) return;
  if (/@lid$/.test(sender)) learnLid(row, sender);
  const now = Date.now(); if (now - (lastHit.get(sender) || 0) < 60000) return; lastHit.set(sender, now);
  let adm = adminCache.get(k.remoteJid); if (!adm || now - adm.t > 60000) { try { const meta = await sock.groupMetadata(k.remoteJid); adm = { t: now, v: botIsAdmin(sock, meta) }; adminCache.set(k.remoteJid, adm); } catch (_) { return; } }
  if (!adm.v) return;
  try { await sock.groupParticipantsUpdate(k.remoteJid, [sender], 'remove'); await noticeBan(sock, k.remoteJid, sender); } catch (e) { console.error('[listanegrab] msg:', e && e.message); }
}
function install(sock) {
  if (!sock || !sock.ev || sock.__botToolsInstalled) return; sock.__botToolsInstalled = true;
  sock.ev.on('group-participants.update', (u) => { onParticipants(sock, u).catch((e) => console.error('[listanegrab]', e && e.message)); });
  sock.ev.on('messages.upsert', ({ messages, type }) => { if (type && type !== 'notify') return; for (const m of messages || []) onMessage(sock, m).catch(() => {}); });
  const t = setTimeout(() => { if (rows().length) scanAll(sock).catch(() => {}); }, 30000); if (t.unref) t.unref();
}

// ───────────────────────── Reports ─────────────────────────
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode() { init(); for (;;) { let c = ''; for (let i = 0; i < 6; i++) c += ALPHA[crypto.randomInt(ALPHA.length)]; if (!D().prepare('SELECT 1 FROM bot_reports WHERE code=?').get(c)) return c; } }
const normCode = (s) => String(s || '').toUpperCase().replace(/^BUG-?/, '').replace(/[^A-Z0-9]/g, '');
function createReport(o) {
  init(); const now = Date.now(); const rep = o.reporter;
  const last = D().prepare('SELECT ts FROM bot_reports WHERE reporter=? ORDER BY ts DESC LIMIT 1').get(rep);
  if (last && now - last.ts < 60000) return { err: 'Aguarde ' + Math.ceil((60000 - (now - last.ts)) / 1000) + 's antes de enviar outro report.' };
  if (D().prepare('SELECT COUNT(*) n FROM bot_reports WHERE reporter=? AND ts>?').get(rep, now - 86400000).n >= 5) return { err: 'Limite de 5 reports por dia atingido.' };
  const code = newCode();
  D().prepare("INSERT INTO bot_reports (code,reporter,reporter_num,chat,chat_name,text,ts,status) VALUES (?,?,?,?,?,?,?, 'open')").run(code, rep, o.num || '', o.chat, o.chatName || '', String(o.text).slice(0, 600), now);
  return { code, ts: now };
}
const getReport = (c) => { init(); return D().prepare('SELECT * FROM bot_reports WHERE code=?').get(normCode(c)); };
const listReports = (all) => { init(); return D().prepare(all ? 'SELECT * FROM bot_reports ORDER BY ts DESC LIMIT 15' : "SELECT * FROM bot_reports WHERE status='open' ORDER BY ts DESC LIMIT 15").all(); };
function closeReport(code, note) { init(); return D().prepare("UPDATE bot_reports SET status='done', note=?, done_ts=? WHERE code=? AND status='open'").run(String(note || '').slice(0, 400), Date.now(), normCode(code)).changes > 0; }
const destGet = () => { try { return dbm().getSetting('bugs_dest', '') || ''; } catch (_) { return ''; } };
const destSet = (v) => dbm().setSetting('bugs_dest', v || '');
async function notifyOwner(sock, text) { const d = destGet(); if (!d) return false; try { await sock.sendMessage(d, { text }); return true; } catch (e) { console.error('[reportbug] enviar ao dono:', e && e.message); return false; } }
function fmtDate(ts) { const d = new Date(ts), p = (n) => String(n).padStart(2, '0'); return { data: p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear(), hora: p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) }; }

// ───────────────────────── Avaliações ─────────────────────────
const LABELS = { 5: 'Perfeito', 4: 'Muito bom', 3: 'Bom', 2: 'Ruim', 1: 'Muito ruim', 0: 'Péssimo' };
const stars = (n) => '✦'.repeat(n) + '✧'.repeat(5 - n);
function saveRating(user, n, chat) { init(); D().prepare('INSERT INTO bot_ratings (user,stars,chat,ts) VALUES (?,?,?,?) ON CONFLICT(user) DO UPDATE SET stars=excluded.stars, chat=excluded.chat, ts=excluded.ts').run(user, n, chat || '', Date.now()); }
function ratingStats() { init(); const r = D().prepare('SELECT stars, COUNT(*) n FROM bot_ratings GROUP BY stars').all(); const dist = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; let tot = 0, sum = 0; for (const x of r) { dist[x.stars] = x.n; tot += x.n; sum += x.stars * x.n; } return { dist, total: tot, avg: tot ? sum / tot : 0 }; }

module.exports = { install, init, digits, addEntry, removeEntry, listEntries, findRow, scanAll, scanMeta, onParticipants, onMessage, createReport, getReport, listReports, closeReport, normCode, destGet, destSet, notifyOwner, fmtDate, LABELS, stars, saveRating, ratingStats };
