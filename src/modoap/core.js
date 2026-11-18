'use strict';
/**
 * MODOAP — núcleo: banco de dados, carteira, cooldowns, dívidas, avisos e relógio.
 * Módulo independente: só cria tabelas ap_* e nunca toca nas tabelas do bot.
 * Dinheiro 100% fictício ("$"). Todas as operações de saldo são síncronas e atómicas.
 */
const crypto = require('crypto');
const dbm = require('../database');

const D = () => dbm.getDb();
const now = () => Date.now();
let _init = false;
let _sock = null;
const HANDLERS = []; // callbacks do relógio registados por outros ficheiros

// ───────────────────────── tabelas ─────────────────────────
function init() {
  if (_init) return;
  const d = D();
  d.exec(`
CREATE TABLE IF NOT EXISTS ap_players (scope TEXT, jid TEXT, name TEXT, wallet INTEGER DEFAULT 0, bank INTEGER DEFAULT 0, last_daily INTEGER DEFAULT 0, last_monthly INTEGER DEFAULT 0, jail_until INTEGER DEFAULT 0, jail_count INTEGER DEFAULT 0, wanted INTEGER DEFAULT 0, embargo_until INTEGER DEFAULT 0, company TEXT, created INTEGER, PRIMARY KEY (scope, jid));
CREATE TABLE IF NOT EXISTS ap_stats (scope TEXT, jid TEXT, game TEXT, plays INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, net INTEGER DEFAULT 0, PRIMARY KEY (scope, jid, game));
CREATE TABLE IF NOT EXISTS ap_hist (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT, jid TEXT, kind TEXT, amount INTEGER, note TEXT, ts INTEGER);
CREATE INDEX IF NOT EXISTS idx_ap_hist ON ap_hist(scope, jid, id);
CREATE TABLE IF NOT EXISTS ap_cd (scope TEXT, jid TEXT, key TEXT, until INTEGER, n INTEGER DEFAULT 0, PRIMARY KEY (scope, jid, key));
CREATE TABLE IF NOT EXISTS ap_debts (id TEXT PRIMARY KEY, scope TEXT, chat TEXT, creditor TEXT, debtor TEXT, principal INTEGER, created INTEGER, half_at INTEGER, due_at INTEGER, status TEXT, owed INTEGER, remaining INTEGER, closed_at INTEGER);
CREATE TABLE IF NOT EXISTS ap_games (id TEXT PRIMARY KEY, scope TEXT, chat TEXT, jid TEXT, game TEXT, bet INTEGER, state TEXT, status TEXT, created INTEGER, expires INTEGER);
CREATE TABLE IF NOT EXISTS ap_inv (scope TEXT, jid TEXT, item TEXT, qty INTEGER DEFAULT 0, PRIMARY KEY (scope, jid, item));
CREATE TABLE IF NOT EXISTS ap_biz (scope TEXT, jid TEXT, biz TEXT, last_collect INTEGER, PRIMARY KEY (scope, jid, biz));
CREATE TABLE IF NOT EXISTS ap_invest (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT, jid TEXT, amount INTEGER, created INTEGER, matures INTEGER, status TEXT, result INTEGER);
CREATE TABLE IF NOT EXISTS ap_market (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT, seller TEXT, item TEXT, qty INTEGER, price INTEGER, created INTEGER, status TEXT);
CREATE TABLE IF NOT EXISTS ap_mutes (id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT, target TEXT, until INTEGER, status TEXT);
CREATE TABLE IF NOT EXISTS ap_duels (id TEXT PRIMARY KEY, scope TEXT, chat TEXT, a TEXT, b TEXT, bet INTEGER, expires INTEGER, status TEXT);
CREATE TABLE IF NOT EXISTS ap_notice (id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT, text TEXT, mentions TEXT, ts INTEGER);
CREATE TABLE IF NOT EXISTS ap_panel (id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT, jid TEXT, chat TEXT, game TEXT, key TEXT, deposit INTEGER, withdrawn INTEGER DEFAULT 0, created INTEGER, expires INTEGER, status TEXT);
CREATE TABLE IF NOT EXISTS ap_codes (code TEXT PRIMARY KEY, sid INTEGER, jid TEXT, amount INTEGER, ts INTEGER)
`);
  for (const q of ['ALTER TABLE ap_players ADD COLUMN block_lvl INTEGER DEFAULT 0', 'ALTER TABLE ap_players ADD COLUMN blocked INTEGER DEFAULT 0', 'ALTER TABLE ap_players ADD COLUMN unlock_at INTEGER DEFAULT 0', 'ALTER TABLE ap_panel ADD COLUMN last_seq INTEGER DEFAULT -1', 'ALTER TABLE ap_panel ADD COLUMN last_cum INTEGER DEFAULT 0', 'ALTER TABLE ap_panel ADD COLUMN final INTEGER DEFAULT 0', 'ALTER TABLE ap_panel ADD COLUMN act INTEGER DEFAULT 1', 'ALTER TABLE ap_panel ADD COLUMN ah TEXT', 'ALTER TABLE ap_mutes ADD COLUMN paid INTEGER DEFAULT 0']) { try { d.prepare(q).run(); } catch (_) {} }
  _init = true;
}

// ───────────────────────── transações ─────────────────────────
let _depth = 0;
function tx(fn) {
  init();
  const d = D();
  if (_depth > 0) return fn();
  d.prepare('BEGIN IMMEDIATE').run();
  _depth++;
  try { const r = fn(); d.prepare('COMMIT').run(); return r; }
  catch (e) { try { d.prepare('ROLLBACK').run(); } catch (_) {} throw e; }
  finally { _depth--; }
}

// ───────────────────────── configuração ─────────────────────────
const DEF = {
  start: 10000, daily: 25000, monthly: 500000, work: [8000, 22000], interest: 0,
  cd: {
    apcrime: 90, aproubar: 60, apassaltar: 50, apcontrabando: 90, apfugir: 20, aptroll: 50,
    apgolpe: 60, aptribunal: 90, apembargo: 60, apdesafio: 30, apmultar: 60,
    aptrabalhar: 120, apapostar: 10, apcaraoucoroa: 10, apdados: 10, aproleta: 10, apparimpar: 10,
    apduelo: 30, apcorrida: 15, apaviator: 15, aprocket: 15, apdice: 10, apmines: 15, applinko: 10, aptower: 15,
    apvadiar: 45, aphoraextra: 240, apbico: 90, apfreela: 180, apentrega: 120, apmendigar: 60, appainel: 20
  },
  // crédito de aposta: o saldo pode ficar negativo até ao limite; ao chegar lá bloqueia até recuperar (unlocks)
  over: { limits: [500000, 600000, 700000, 800000, 900000, 1000000], unlocks: [-490000, -400000, -300000, -200000, -100000, -50000] },
  jobBoost: 1.5,
  jobs: { aphoraextra: { min: 40000, max: 90000, fail: 20 }, apbico: { min: 8000, max: 25000, fail: 5 }, apfreela: { min: 25000, max: 60000, fail: 15 }, apentrega: { min: 15000, max: 40000, fail: 10 }, apmendigar: { min: 1000, max: 4000, fail: 0 }, apvadiar: { min: 2000, max: 8000, fail: 25 } },
  panel: { lock: true, act: true, dm: false, minLoad: 1000, maxLoad: 5000000, defLoad: 50000, minDraw: 100, maxCode: 100000000, maxMult: 300, ttlMin: 30, redeemHours: 6 },
  games: {
    apostar: { p: 45, mult: 2, min: 100, max: 5000000 },
    caraoucoroa: { p: 48, mult: 2, min: 100, max: 5000000 },
    dados: { p: 0, mult: 2.3, min: 100, max: 5000000 },
    roleta: { p: 0, mult: 14, min: 100, max: 5000000 },
    parimpar: { p: 48, mult: 2, min: 100, max: 5000000 },
    duelo: { p: 5, mult: 1, min: 100, max: 5000000 },
    corrida: { p: 0, mult: 3.6, min: 100, max: 5000000 },
    aviator: { p: 4, mult: 100, min: 100, max: 5000000 },
    rocket: { p: 4, mult: 100, min: 100, max: 5000000 },
    dice: { p: 0, mult: 5.7, min: 100, max: 5000000 },
    mines: { p: 3, mult: 1, min: 100, max: 5000000 },
    plinko: { p: 0, mult: 1, min: 100, max: 5000000 },
    tower: { p: 3, mult: 1, min: 100, max: 5000000 }
  },
  crime: {
    apcrime: { p: 50, min: 15000, max: 70000, fmin: 8000, fmax: 35000, jail: 20, jmin: 3 },
    aproubar: { p: 45, pct: 12, cap: 150000, tmin: 5000, fmin: 10000, fmax: 30000, jail: 25, jmin: 3 },
    apassaltar: { p: 40, min: 30000, max: 120000, fmin: 20000, fmax: 60000, jail: 30, jmin: 4 },
    apcontrabando: { p: 35, min: 60000, max: 250000, fmin: 40000, fmax: 120000, jail: 35, jmin: 5 },
    apfugir: { p: 35 }, bail: 15000
  },
  troll: {
    price: { aptroll: 20000, apmultar: 15000, apgolpe: 30000, aptribunal: 50000, apembargo: 40000, apdesafio: 10000 },
    maxLossPct: 5, maxLossAbs: 150000, maxPerTarget: 3, windowMin: 60, embargoMin: 3
  },
  mute: { 1: 500000, 2: 800000, 3: 1200000, 4: 1600000, 5: 2000000 },
  debt: { min: 1000, maxActive: 3, halfMin: 30, dueMin: 60 },
  invest: { min: 1000, lockMin: 10, lo: -25, hi: 22, maxOpen: 3 },
  market: { tax: 5 }
};
function deepMerge(a, b) {
  if (Array.isArray(a) || typeof a !== 'object' || a === null) return b === undefined ? a : b;
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b || {})])) o[k] = deepMerge(a[k], b ? b[k] : undefined);
  return o;
}
const GS = () => require('../database');
function scopeOf(chat) { return String(GS().getSetting('ap_mode', 'global')) === 'grupo' ? (chat || 'g') : 'g'; }
function rawCfg(scope) { try { return JSON.parse(GS().getSetting('ap_cfg:' + scope, '{}') || '{}'); } catch (_) { return {}; } }
function cfg(scope) { return deepMerge(DEF, rawCfg(scope)); }
function setCfg(scope, pathStr, value) {
  const o = rawCfg(scope); const ks = pathStr.split('.'); let c = o;
  for (let i = 0; i < ks.length - 1; i++) { c[ks[i]] = c[ks[i]] || {}; c = c[ks[i]]; }
  c[ks[ks.length - 1]] = value;
  GS().setSetting('ap_cfg:' + scope, JSON.stringify(o));
}
function isOn(chat) { const v = String(GS().getGroupSetting(chat, 'modoap', '0')); return v === '1'; }
function setOn(chat, on) { GS().setGroupSetting(chat, 'modoap', on ? '1' : '0'); }
function economyOn() { return String(GS().getSetting('ap_economy', '1')) !== '0'; }
function setEconomy(on) { GS().setSetting('ap_economy', on ? '1' : '0'); }
function getMode() { return String(GS().getSetting('ap_mode', 'global')) === 'grupo' ? 'grupo' : 'global'; }
function setMode(m) { GS().setSetting('ap_mode', m === 'grupo' ? 'grupo' : 'global'); }

// ───────────────────────── utilitários ─────────────────────────
const pid = (jid) => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
function money(n) { n = Math.round(Number(n) || 0); const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '-$' : '$') + s; }
function dur(ms) {
  let s = Math.max(1, Math.ceil(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); s = s % 60;
  const p = []; if (h) p.push(h + (h > 1 ? ' horas' : ' hora')); if (m) p.push(m + (m > 1 ? ' minutos' : ' minuto'));
  if (s && !h) p.push(s + (s > 1 ? ' segundos' : ' segundo')); return p.join(' e ') || '1 segundo';
}
function parseAmt(str, max) {
  let s = String(str == null ? '' : str).toLowerCase().replace(/[$\s]/g, '');
  if (['all', 'tudo', 'todo', 'max'].includes(s)) return Math.floor(max || 0);
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');
  const m = s.match(/^(\d+(?:[.,]\d+)?)(k|mil|m|mi|b)?$/); if (!m) return NaN;
  const mul = { k: 1e3, mil: 1e3, m: 1e6, mi: 1e6, b: 1e9 }[m[2]] || 1;
  const v = Math.floor(parseFloat(m[1].replace(',', '.')) * mul); return v > 0 && v < 1e13 ? v : NaN;
}
function parseTime(str) { // "90", "90s", "2m", "1m30s" -> segundos
  const s = String(str || '').toLowerCase().replace(/\s/g, ''); if (!s) return NaN;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const m = s.match(/^(?:(\d+)m(?:in)?)?(?:(\d+)s(?:eg)?)?$/); if (!m || (!m[1] && !m[2])) return NaN;
  return (parseInt(m[1] || 0, 10) * 60) + parseInt(m[2] || 0, 10);
}
const rnd = (a, b) => crypto.randomInt(Math.floor(a), Math.floor(b) + 1);
const rf = () => crypto.randomInt(0, 1e9) / 1e9;
const chance = (p) => rf() * 100 < p;
const newId = (pre) => pre + crypto.randomBytes(3).toString('hex').toUpperCase();
const strip = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ───────────────────────── jogadores ─────────────────────────
function player(scope, jid, name) {
  init(); const d = D(); const id = pid(jid);
  d.prepare('INSERT OR IGNORE INTO ap_players (scope, jid, wallet, created) VALUES (?, ?, ?, ?)').run(scope, id, cfg(scope).start, now());
  if (name) d.prepare('UPDATE ap_players SET name = ? WHERE scope = ? AND jid = ?').run(String(name).slice(0, 30), scope, id);
  return d.prepare('SELECT * FROM ap_players WHERE scope = ? AND jid = ?').get(scope, id);
}
const nameOf = (p) => (p && p.name) || ('+' + (p ? p.jid : '?'));
function hist(scope, jid, kind, amount, note) {
  D().prepare('INSERT INTO ap_hist (scope, jid, kind, amount, note, ts) VALUES (?,?,?,?,?,?)').run(scope, pid(jid), kind, Math.round(amount), String(note || '').slice(0, 80), now());
}
function debtOwed(scope, jid) {
  const r = D().prepare("SELECT COALESCE(SUM(remaining),0) AS t FROM ap_debts WHERE scope=? AND debtor=? AND status='overdue'").get(scope, pid(jid));
  return r ? r.t : 0;
}
/** credita carteira; dívidas vencidas do jogador são descontadas primeiro (penhora). raw=true ignora a penhora */
function credit(scope, jid, amt, kind, note, raw) {
  amt = Math.floor(amt); if (!(amt > 0)) return 0; const id = pid(jid); player(scope, id);
  return tx(() => {
    let left = amt;
    if (!raw) {
      const ds = D().prepare("SELECT * FROM ap_debts WHERE scope=? AND debtor=? AND status='overdue' ORDER BY due_at").all(scope, id);
      for (const dd of ds) {
        if (left <= 0) break; const pay = Math.min(left, dd.remaining); left -= pay;
        const rem = dd.remaining - pay;
        D().prepare('UPDATE ap_debts SET remaining=?, status=?, closed_at=? WHERE id=?').run(rem, rem <= 0 ? 'settled' : 'overdue', rem <= 0 ? now() : null, dd.id);
        credit(scope, dd.creditor, pay, 'divida_recebida', 'Cobrança ' + dd.id, true); hist(scope, id, 'penhora', -pay, 'Dívida ' + dd.id);
        notice(dd.chat, '🏦 Cobrança contínua da dívida *' + dd.id + '*: ' + money(pay) + ' recuperados' + (rem > 0 ? ' (falta ' + money(rem) + ')' : ' — dívida quitada ✅'));
      }
    }
    if (left > 0) { D().prepare('UPDATE ap_players SET wallet = wallet + ? WHERE scope=? AND jid=?').run(left, scope, id); hist(scope, id, kind || 'ganho', left, note); }
    return left;
  });
}
function debit(scope, jid, amt, kind, note) {
  amt = Math.floor(amt); if (!(amt > 0)) return false; const id = pid(jid); player(scope, id);
  return tx(() => {
    const r = D().prepare('UPDATE ap_players SET wallet = wallet - ? WHERE scope=? AND jid=? AND wallet >= ?').run(amt, scope, id, amt);
    if (!r.changes) return false; hist(scope, id, kind || 'gasto', -amt, note); return true;
  });
}
/** tira até `amt` da carteira (o que existir) — devolve quanto foi retirado */
const limOf = (scope, n) => { const L = cfg(scope).over.limits; return L[Math.min(n, L.length - 1)]; };
/** estado de crédito/bloqueio (atualiza desbloqueio e reabilitação) */
function overState(scope, jid) {
  const id = pid(jid); const p = player(scope, id);
  if (p.blocked && p.wallet >= p.unlock_at) { D().prepare('UPDATE ap_players SET blocked=0 WHERE scope=? AND jid=?').run(scope, id); p.blocked = 0; }
  if (!p.blocked && p.wallet >= 0 && p.block_lvl > 0) { D().prepare('UPDATE ap_players SET block_lvl=0 WHERE scope=? AND jid=?').run(scope, id); p.block_lvl = 0; }
  let limit = limOf(scope, p.block_lvl);
  if (!p.blocked && p.wallet + limit < 100) { // sem margem para a aposta mínima: bloqueia (mesma regra do esgotamento)
    const U = cfg(scope).over.unlocks; const un = U[Math.min(p.block_lvl, U.length - 1)];
    D().prepare('UPDATE ap_players SET blocked=1, unlock_at=?, block_lvl=block_lvl+1 WHERE scope=? AND jid=?').run(un, scope, id); p.blocked = 1; p.unlock_at = un; p.block_lvl++; limit = limOf(scope, p.block_lvl);
  }
  return { p, blocked: !!p.blocked, limit, room: Math.max(0, p.wallet + limit), need: p.blocked ? Math.max(0, p.unlock_at - p.wallet) : 0 };
}
function blockMsg(o) {
  return '🚫 *APOSTAS BLOQUEADAS* — estás no vermelho (' + money(o.p.wallet) + ').\nRecupera ' + money(o.need) + ' para voltar a apostar. Ganha dinheiro com *aptrabalhar*, *aphoraextra*, *apbico*, *apfreela*, *apentrega*, *apmendigar* ou *apdiario*.\n_Quem está em dívida ganha +50% nos trabalhos._';
}
/** débito de aposta: permite saldo negativo até ao limite de crédito; bloqueia ao esgotar */
function betDebit(scope, jid, amt, kind, note) {
  amt = Math.floor(amt); if (!(amt > 0)) return false; const id = pid(jid);
  return tx(() => {
    const o = overState(scope, id); if (o.blocked || amt > o.room) return false;
    D().prepare('UPDATE ap_players SET wallet = wallet - ? WHERE scope=? AND jid=?').run(amt, scope, id); hist(scope, id, kind || 'aposta', -amt, note);
    const nw = o.p.wallet - amt;
    if (nw + o.limit < 100) { const U = cfg(scope).over.unlocks; const un = U[Math.min(o.p.block_lvl, U.length - 1)]; D().prepare('UPDATE ap_players SET blocked=1, unlock_at=?, block_lvl=block_lvl+1 WHERE scope=? AND jid=?').run(un, scope, id); }
    return true;
  });
}
function take(scope, jid, amt, kind, note) {
  const p = player(scope, jid); const v = Math.min(Math.floor(amt), p.wallet); if (v > 0) debit(scope, jid, v, kind, note); return Math.max(0, v);
}
function transfer(scope, from, to, amt, kind, note) {
  return tx(() => { if (!debit(scope, from, amt, kind || 'transf', note)) return false; credit(scope, to, amt, kind || 'transf', note); return true; });
}
function stat(scope, jid, game, delta, won) {
  const id = pid(jid); D().prepare('INSERT OR IGNORE INTO ap_stats (scope,jid,game) VALUES (?,?,?)').run(scope, id, game);
  D().prepare('UPDATE ap_stats SET plays=plays+1, wins=wins+?, losses=losses+?, net=net+? WHERE scope=? AND jid=? AND game=?')
    .run(won ? 1 : 0, won ? 0 : 1, Math.round(delta), scope, id, game);
}
function worth(scope, jid) { // património total
  const p = player(scope, jid), d = D(), id = pid(jid); let t = p.wallet + p.bank;
  const inv = d.prepare('SELECT item, qty FROM ap_inv WHERE scope=? AND jid=?').all(scope, id);
  const ITEMS = require('./world').ITEMS; for (const i of inv) if (ITEMS[i.item]) t += Math.floor(ITEMS[i.item].price * 0.6) * i.qty;
  const BIZ = require('./world').BIZ; for (const b of d.prepare('SELECT biz FROM ap_biz WHERE scope=? AND jid=?').all(scope, id)) if (BIZ[b.biz]) t += Math.floor(BIZ[b.biz].price * 0.5);
  t += (d.prepare("SELECT COALESCE(SUM(amount),0) a FROM ap_invest WHERE scope=? AND jid=? AND status='open'").get(scope, id).a);
  t += (d.prepare("SELECT COALESCE(SUM(owed),0) a FROM ap_debts WHERE scope=? AND creditor=? AND status='active'").get(scope, id).a ? 0 : 0);
  return t - debtOwed(scope, id);
}

// ───────────────────────── cooldowns ─────────────────────────
/** devolve segundos em falta (>0 = bloqueado) ou 0 e arma a recarga. Síncrono: mensagens simultâneas não contornam. */
function cdTake(scope, jid, key) {
  init(); const id = pid(jid); const t = now();
  const r = D().prepare('SELECT until FROM ap_cd WHERE scope=? AND jid=? AND key=?').get(scope, id, key);
  if (r && r.until > t) return Math.ceil((r.until - t) / 1000);
  const sec = cfg(scope).cd[key]; if (!sec) return 0;
  D().prepare('INSERT INTO ap_cd (scope,jid,key,until) VALUES (?,?,?,?) ON CONFLICT(scope,jid,key) DO UPDATE SET until=excluded.until').run(scope, id, key, t + sec * 1000);
  return 0;
}
function cdLeft(scope, jid, key) { const r = D().prepare('SELECT until FROM ap_cd WHERE scope=? AND jid=? AND key=?').get(scope, pid(jid), key); return r && r.until > now() ? r.until - now() : 0; }
function cdMsg(sec) { return '⏳ Aguarde! Esta ação ainda está em recarga. Tente novamente daqui a ' + dur(sec * 1000).replace(/^1 segundo$/, '1 segundo') + '.'; }
/** contador com janela (anti-abuso). devolve true se já atingiu o limite */
function windowHit(scope, key, max, minutes) {
  const t = now(); const r = D().prepare('SELECT until, n FROM ap_cd WHERE scope=? AND jid=? AND key=?').get(scope, 'w', key);
  if (!r || r.until <= t) { D().prepare('INSERT OR REPLACE INTO ap_cd (scope,jid,key,until,n) VALUES (?,?,?,?,1)').run(scope, 'w', key, t + minutes * 60000); return false; }
  if (r.n >= max) return true;
  D().prepare('UPDATE ap_cd SET n=n+1 WHERE scope=? AND jid=? AND key=?').run(scope, 'w', key); return false;
}

// ───────────────────────── dívidas ─────────────────────────
function createDebt(scope, chat, A, B, amt) {
  const c = cfg(scope).debt; const a = pid(A), b = pid(B);
  if (a === b) return { err: 'Não podes criar dívida contigo mesmo.' };
  if (amt < c.min) return { err: 'Valor mínimo: ' + money(c.min) };
  const act = D().prepare("SELECT COUNT(*) n FROM ap_debts WHERE scope=? AND debtor=? AND status IN ('active','overdue')").get(scope, b).n;
  if (act >= c.maxActive) return { err: 'Esse jogador já tem ' + c.maxActive + ' dívidas ativas.' };
  return tx(() => {
    if (!debit(scope, a, amt, 'emprestimo', 'Empréstimo concedido')) return { err: 'Saldo insuficiente na carteira.' };
    credit(scope, b, amt, 'emprestimo', 'Empréstimo recebido', true);
    const id = newId('D'); const t = now();
    D().prepare("INSERT INTO ap_debts (id,scope,chat,creditor,debtor,principal,created,half_at,due_at,status,owed,remaining) VALUES (?,?,?,?,?,?,?,?,?,'active',?,?)")
      .run(id, scope, chat, a, b, amt, t, t + c.halfMin * 60000, t + c.dueMin * 60000, amt, amt);
    return { id, due: t + c.dueMin * 60000, half: t + c.halfMin * 60000 };
  });
}
function owedNow(d) { return d.status === 'overdue' ? d.remaining : (now() < d.half_at ? d.principal : d.principal * 2); }
function payDebt(scope, jid, id) {
  const b = pid(jid); const ds = D().prepare("SELECT * FROM ap_debts WHERE scope=? AND debtor=? AND status IN ('active','overdue') ORDER BY due_at").all(scope, b);
  if (!ds.length) return { err: 'Não tens dívidas ativas.' };
  const d = id ? ds.find(x => x.id.toLowerCase() === String(id).toLowerCase()) : ds[0];
  if (!d) return { err: 'Dívida não encontrada. Veja apdividas.' };
  const owed = owedNow(d); const p = player(scope, b);
  if (p.wallet < owed) return { err: 'Precisas de ' + money(owed) + ' na carteira (tens ' + money(p.wallet) + ').' };
  return tx(() => {
    const r = D().prepare("UPDATE ap_debts SET status='paid', remaining=0, owed=?, closed_at=? WHERE id=? AND status IN ('active','overdue')").run(owed, now(), d.id);
    if (!r.changes) return { err: 'Dívida já processada.' };
    debit(scope, b, owed, 'pagou_divida', 'Dívida ' + d.id); credit(scope, d.creditor, owed, 'divida_recebida', 'Dívida ' + d.id, true);
    return { debt: d, paid: owed, double: owed > d.principal };
  });
}
/** cobrança automática (idempotente: só 'active' -> 'overdue' uma vez) */
function collectDue() {
  init(); const out = [];
  for (const d of D().prepare("SELECT * FROM ap_debts WHERE status='active' AND due_at <= ?").all(now())) {
    tx(() => {
      const r = D().prepare("UPDATE ap_debts SET status='overdue' WHERE id=? AND status='active'").run(d.id); if (!r.changes) return;
      const owed = d.principal * 2; const p = player(d.scope, d.debtor);
      const fromW = Math.min(p.wallet, owed); const fromB = Math.min(p.bank, owed - fromW); const got = fromW + fromB;
      if (fromW) D().prepare('UPDATE ap_players SET wallet=wallet-? WHERE scope=? AND jid=?').run(fromW, d.scope, d.debtor);
      if (fromB) D().prepare('UPDATE ap_players SET bank=bank-? WHERE scope=? AND jid=?').run(fromB, d.scope, d.debtor);
      if (got) { hist(d.scope, d.debtor, 'cobranca', -got, 'Dívida ' + d.id); credit(d.scope, d.creditor, got, 'divida_recebida', 'Cobrança ' + d.id, true); }
      const rem = owed - got;
      D().prepare('UPDATE ap_debts SET owed=?, remaining=?, status=?, closed_at=? WHERE id=?').run(owed, rem, rem > 0 ? 'overdue' : 'settled', rem > 0 ? null : now(), d.id);
      notice(d.chat, '🏦 *COBRANÇA AUTOMÁTICA* — dívida *' + d.id + '*\n@' + d.debtor + ' devia ' + money(owed) + '. Recuperado: ' + money(got) + (rem > 0 ? '\n⚠️ Saldo em dívida: -' + money(rem) + ' (será descontado dos próximos ganhos)' : '\n✅ Quitada.') + '\nCredor: @' + d.creditor, [d.debtor, d.creditor]);
    });
  }
  return out;
}

// ───────────────────────── avisos e relógio ─────────────────────────
function notice(chat, text, ments) {
  if (!chat) return; init();
  D().prepare('INSERT INTO ap_notice (chat,text,mentions,ts) VALUES (?,?,?,?)').run(chat, text, JSON.stringify(ments || []), now());
}
async function flushNotices() {
  if (!_sock) return; const rows = D().prepare('SELECT * FROM ap_notice ORDER BY id LIMIT 20').all();
  for (const r of rows) {
    D().prepare('DELETE FROM ap_notice WHERE id=?').run(r.id);
    let m = []; try { m = JSON.parse(r.mentions || '[]').map(x => x.includes('@') ? x : x + '@s.whatsapp.net'); } catch (_) {}
    try { if (String(r.chat).endsWith('@g.us')) await _sock.sendMessage(r.chat, { text: r.text, mentions: m }); } catch (e) { console.error('[MODOAP notice]', e.message); }
  }
}
function dmOk() { try { return economyOn() && getMode() === 'global' && !!D().prepare("SELECT 1 FROM group_settings WHERE key='modoap' AND value='1' LIMIT 1").get(); } catch (_) { return false; } }
function onTick(fn) { HANDLERS.push(fn); }
let _timer = null;
async function tick() {
  try { init(); collectDue(); for (const h of HANDLERS) { try { await h(_sock); } catch (e) { console.error('[MODOAP tick]', e.message); } } await flushNotices(); }
  catch (e) { console.error('[MODOAP tick]', e.message); }
}
function start() { if (_timer) return; _timer = setInterval(tick, 10000); if (_timer.unref) _timer.unref(); setTimeout(tick, 3000); }
function setSock(s) { if (s) _sock = s; }
const getSock = () => _sock;

module.exports = { dmOk, init, tx, DEF, cfg, setCfg, rawCfg, scopeOf, isOn, setOn, economyOn, setEconomy, getMode, setMode, pid, money, dur, parseAmt, parseTime, rnd, rf, chance, newId, strip,
  player, nameOf, hist, credit, debit, betDebit, overState, blockMsg, take, transfer, stat, worth, debtOwed, cdTake, cdLeft, cdMsg, windowHit, createDebt, payDebt, owedNow, collectDue, notice, flushNotices, onTick, tick, start, setSock, getSock, D, now };

// MODOAP_V3

// MODOAP_V4

// MODOAP_V5

// MODOAP_V6

// MODOAP_V8

// MODOAP_V7

// MODOAP_V9
