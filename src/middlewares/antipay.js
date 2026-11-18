'use strict';
/**
 * ANTIPAY — protege o grupo contra mensagens de pagamento ("valor indisponível") usadas para flood/lag.
 * Quando alguém (pessoa ou outro bot) manda esse tipo de mensagem no grupo:
 *   1) o bot BANE quem mandou;
 *   2) manda UMA mensagem perguntando se pode apagar as mensagens de pay que ele conseguiu mandar (botões Sim / Não);
 *   3) se um admin tocar em "Sim", apaga todas (e as que ainda chegarem desse mesmo autor).
 * Liga/desliga por grupo com:  !antipay on | off | status   (padrão: ligado)
 * v2: escuta as mensagens do grupo por conta própria (attach), enxerga qualquer tipo de pagamento, tenta banir
 *     pelos dois ids do autor, avisa se o bot não é admin e mostra diagnóstico no  !antipay status.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const nf = require('../interactive/nativeFlow');
const router = require('../interactive/router');

const FILE = path.join(process.cwd(), 'data', 'antipay.json');
const cfg = { askDelay: 3000, ttl: 30 * 60 * 1000 };
const byId = new Map();     // id da pergunta -> incidente
const byUser = new Map();   // grupo|autor    -> incidente
const seen = new Set();     // ids já tratados (evita contar a mesma mensagem duas vezes)
const stats = { attached: false, detected: 0, lastAt: 0, lastType: '' };

/* ---------- liga/desliga por grupo ---------- */
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (_) { return {}; } }
function save(o) { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(o)); } catch (_) {} }
function isEnabled(jid) { const o = load(); return !(o.off && o.off[jid]); }
function setEnabled(jid, on) { const o = load(); o.off = o.off || {}; if (on) delete o.off[jid]; else o.off[jid] = 1; save(o); }

/* ---------- detecção ---------- */
const PAY_BUTTONS = ['review_and_pay', 'payment_info', 'order_details'];
function unwrap(message) {
  let x = message || {};
  for (let i = 0; i < 4; i++) {
    const n = x.ephemeralMessage || x.viewOnceMessage || x.viewOnceMessageV2 || x.viewOnceMessageV2Extension || x.documentWithCaptionMessage || x.editedMessage || x.deviceSentMessage;
    if (n && n.message) x = n.message; else break;
  }
  return x;
}
// qualquer chave com "payment" (pedido, envio, convite, info...) até 3 níveis de profundidade
function findPayKey(o, depth) {
  if (!o || typeof o !== 'object' || depth > 3) return null;
  const ks = Object.keys(o);
  for (let i = 0; i < ks.length; i++) if (/payment|invoice/i.test(ks[i]) && o[ks[i]] != null) return ks[i];
  if (depth >= 2) return null;
  for (let i = 0; i < ks.length; i++) { const v = o[ks[i]]; if (v && typeof v === 'object' && !Buffer.isBuffer(v) && !Array.isArray(v)) { const r = findPayKey(v, depth + 1); if (r) return r; } }
  return null;
}
function payType(message) {
  const m = unwrap(message);
  const k = findPayKey(m, 0);
  if (k) return k;
  const im = m.interactiveMessage;
  const btns = im && im.nativeFlowMessage && im.nativeFlowMessage.buttons;
  if (Array.isArray(btns)) for (let i = 0; i < btns.length; i++) if (btns[i] && PAY_BUTTONS.indexOf(btns[i].name) >= 0) return 'botão ' + btns[i].name;
  return null;
}

/* ---------- ação ---------- */
const base = function (jid) { return String(jid || '').split('@')[0].split(':')[0]; };
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

async function botIsAdmin(sock, jid) {
  try {
    const meta = await sock.groupMetadata(jid);
    const me = [base(sock.user && sock.user.id), base(sock.user && sock.user.lid)].filter(Boolean);
    const p = (meta.participants || []).find(function (x) {
      return [x.id, x.lid, x.phoneNumber, x.jid].some(function (v) { return v && me.indexOf(base(v)) >= 0; });
    });
    return p ? !!p.admin : null;
  } catch (_) { return null; }
}
async function banUser(sock, jid, ids) {
  const ok = function (res) { return Array.isArray(res) && res.length > 0 && res.every(function (r) { return String(r.status) === '200'; }); };
  for (let i = 0; i < ids.length; i++) {
    try { const r = await sock.groupParticipantsUpdate(jid, [ids[i]], 'remove'); console.log('[antipay] remover ' + ids[i] + ' ->', JSON.stringify(r)); if (ok(r)) return true; } catch (e) { console.log('[antipay] remover ' + ids[i] + ' falhou:', e && e.message); }
  }
  for (let i = 0; i < ids.length; i++) {                // se for admin, rebaixa e tenta de novo
    try {
      await sock.groupParticipantsUpdate(jid, [ids[i]], 'demote');
      const r2 = await sock.groupParticipantsUpdate(jid, [ids[i]], 'remove');
      console.log('[antipay] rebaixar+remover ' + ids[i] + ' ->', JSON.stringify(r2));
      if (ok(r2)) return true;
    } catch (_) {}
  }
  return false;
}

async function handleNew(sock, inc) {
  const isAdm = await botIsAdmin(sock, inc.jid);
  const banned = isAdm === false ? false : await banUser(sock, inc.jid, inc.ids);
  await sleep(cfg.askDelay);                         // junta as mensagens do flood antes de perguntar
  const tag = '@' + base(inc.sender);
  const falha = isAdm === false ? '⚠️ Detectei mensagem de pagamento de ' + tag + ', mas eu *não sou admin* do grupo: não consigo banir nem apagar. Me promova a *admin*.'
    : '⚠️ Detectei mensagem de pagamento de ' + tag + ', mas *não consegui banir* (veja o Termux para o motivo).';
  const body = '🚨 *ANTIPAY*\n\n'
    + (banned ? tag + ' foi *banido* por mandar mensagem de pagamento no grupo.' : falha)
    + '\n💳 Mensagens de pay recebidas: *' + inc.keys.length + '*\n\n' + (isAdm === false ? 'Mesmo assim, quer que eu tente apagar as mensagens?' : 'Posso apagar as mensagens de pay que ele conseguiu mandar?');
  try {
    await nf.sendNative(sock, inc.jid, {
      title: '🚨 ANTIPAY', body: body, footer: '© ' + (config.botName || 'TEMPEST BOT'), mentions: [inc.sender],
      buttons: [nf.btn.reply('✅ Sim', 'ap:del:' + inc.id), nf.btn.reply('❌ Não', 'ap:keep:' + inc.id)]
    });
  } catch (e) {
    console.error('[antipay] pergunta:', e && e.message);
    try { await sock.sendMessage(inc.jid, { text: body + '\n\n_(botões indisponíveis agora)_', mentions: [inc.sender] }); } catch (_) {}
  }
}

async function check(sock, msg) {
  try {
    const jid = msg && msg.key && msg.key.remoteJid;
    if (!jid || !jid.endsWith('@g.us') || msg.key.fromMe) return false;
    const tipo = payType(msg.message);
    if (!tipo) return false;
    const sender = msg.key.participant || msg.key.participantPn || '';
    if (!sender) return false;
    if (!isEnabled(jid)) return false;
    if (config.isOwner(sender) || (msg.key.participantPn && config.isOwner(msg.key.participantPn))) return false;
    const mid = jid + '|' + msg.key.id;
    if (seen.has(mid)) return true;                   // já tratada (o bot pode chamar duas vezes)
    seen.add(mid); if (seen.size > 3000) seen.clear();
    stats.detected++; stats.lastAt = Date.now(); stats.lastType = tipo;

    const k = jid + '|' + base(sender);
    let inc = byUser.get(k);
    if (inc && inc.autoDelete) {                      // admin já aprovou apagar: apaga na hora as novas
      try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
      return true;
    }
    if (!inc) {
      inc = { id: crypto.randomBytes(4).toString('hex'), jid: jid, sender: sender, ids: Array.from(new Set([msg.key.participant, msg.key.participantPn].filter(Boolean))), keys: [], done: false, autoDelete: false };
      byUser.set(k, inc); byId.set(inc.id, inc);
      const t = setTimeout(function () { byUser.delete(k); byId.delete(inc.id); }, cfg.ttl); if (t.unref) t.unref();
      if (inc.keys.length < 300) inc.keys.push(msg.key);
      console.log('[antipay] ' + tipo + ' de ' + base(sender) + ' em ' + jid);
      handleNew(sock, inc).catch(function (e) { console.error('[antipay]', e && e.message); });
    } else if (inc.keys.length < 300) inc.keys.push(msg.key);
    return true;                                      // consome a mensagem (não vai para comandos)
  } catch (e) { console.error('[antipay]', e && e.message); return false; }
}

/* ---------- botões Sim / Não ---------- */
async function onClick(ctx, rest) {
  const parts = String(rest || '').split(':'); const act = parts[0], id = parts[1];
  let ok = false; try { ok = ctx.isOwner() || (ctx.isGroup && (await ctx.isGroupAdmin())); } catch (_) {}
  if (!ok) return ctx.reply('❌ Só admins do grupo podem responder isso.');
  const inc = byId.get(id);
  if (!inc || inc.jid !== ctx.jid) return ctx.reply('⌛ Essa pergunta já foi respondida ou expirou.');
  if (inc.done) return ctx.reply('✅ Essa pergunta já foi respondida.');
  inc.done = true;
  if (act === 'del') {
    inc.autoDelete = true;
    let n = 0;
    for (let i = 0; i < inc.keys.length; i++) {
      try { await ctx.sock.sendMessage(inc.jid, { delete: inc.keys[i] }); n++; } catch (_) {}
      await sleep(250);
    }
    return ctx.reply('🧹 Apaguei *' + n + '* mensagem(ns) de pay.');
  }
  return ctx.reply('✅ Ok, mantive as mensagens.');
}
router.register('ap', onClick);

// escuta as mensagens do grupo por conta própria (não depende do resto do index.js)
function attach(sock) {
  if (!sock || !sock.ev || sock.__antipayAttached) return;
  sock.__antipayAttached = true; stats.attached = true;
  sock.ev.on('messages.upsert', async function (up) {
    const list = (up && up.messages) || [];
    for (let i = 0; i < list.length; i++) {
      try {
        const m = list[i];
        let ts = m && m.messageTimestamp; if (ts && typeof ts === 'object') ts = ts.toNumber ? ts.toNumber() : Number(ts.low);
        if (ts && Date.now() / 1000 - Number(ts) > 300) continue;        // ignora histórico antigo
        await check(sock, m);
      } catch (_) {}
    }
  });
  console.log('[antipay] monitorando mensagens de grupo');
}

module.exports = { check: check, attach: attach, isEnabled: isEnabled, setEnabled: setEnabled, payType: payType, onClick: onClick, botIsAdmin: botIsAdmin, stats: stats, _cfg: cfg, _state: { byId: byId, byUser: byUser } };
