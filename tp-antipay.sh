set -e
cd "${1:-$HOME/tempest-bot}"
[ -f src/index.js ] && [ -d src/middlewares ] || { echo "❌ Rode no ~/tempest-bot"; exit 1; }
BK="backup-antipay-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"; cp src/index.js "$BK/"
cat > src/middlewares/antipay.js <<'TPEOF'
'use strict';
/**
 * ANTIPAY — protege o grupo contra mensagens de pagamento ("valor indisponível") usadas para flood/lag.
 * Quando alguém (pessoa ou outro bot) manda esse tipo de mensagem no grupo:
 *   1) o bot BANE quem mandou;
 *   2) manda UMA mensagem perguntando se pode apagar as mensagens de pay que ele conseguiu mandar (botões Sim / Não);
 *   3) se um admin tocar em "Sim", apaga todas (e as que ainda chegarem desse mesmo autor).
 * Liga/desliga por grupo com:  !antipay on | off | status   (padrão: ligado)
 * Arquivo novo e isolado (ligado ao index.js por 2 linhas).
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

/* ---------- liga/desliga por grupo ---------- */
function load() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch (_) { return {}; } }
function save(o) { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(o)); } catch (_) {} }
function isEnabled(jid) { const o = load(); return !(o.off && o.off[jid]); }
function setEnabled(jid, on) { const o = load(); o.off = o.off || {}; if (on) delete o.off[jid]; else o.off[jid] = 1; save(o); }

/* ---------- detecção ---------- */
const PAY_KEYS = ['requestPaymentMessage', 'sendPaymentMessage', 'paymentInviteMessage'];
const PAY_BUTTONS = ['review_and_pay', 'payment_info', 'order_details'];
function unwrap(message) {
  let x = message || {};
  for (let i = 0; i < 4; i++) {
    const n = x.ephemeralMessage || x.viewOnceMessage || x.viewOnceMessageV2 || x.viewOnceMessageV2Extension || x.documentWithCaptionMessage || x.editedMessage;
    if (n && n.message) x = n.message; else break;
  }
  return x;
}
function payType(message) {
  const m = unwrap(message);
  for (let i = 0; i < PAY_KEYS.length; i++) if (m[PAY_KEYS[i]]) return PAY_KEYS[i];
  const im = m.interactiveMessage;
  const btns = im && im.nativeFlowMessage && im.nativeFlowMessage.buttons;
  if (Array.isArray(btns)) for (let i = 0; i < btns.length; i++) if (btns[i] && PAY_BUTTONS.indexOf(btns[i].name) >= 0) return 'botão ' + btns[i].name;
  return null;
}

/* ---------- ação ---------- */
const base = function (jid) { return String(jid || '').split('@')[0].split(':')[0]; };
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

async function banUser(sock, jid, sender) {
  const failed = function (res) { return !res || !res[0] || String(res[0].status) !== '200'; };
  try { const r = await sock.groupParticipantsUpdate(jid, [sender], 'remove'); if (!failed(r)) return true; } catch (_) {}
  try {                                   // se for admin, rebaixa e tenta de novo
    await sock.groupParticipantsUpdate(jid, [sender], 'demote');
    const r2 = await sock.groupParticipantsUpdate(jid, [sender], 'remove');
    return !failed(r2);
  } catch (_) { return false; }
}

async function handleNew(sock, inc) {
  const banned = await banUser(sock, inc.jid, inc.sender);
  await sleep(cfg.askDelay);                         // junta as mensagens do flood antes de perguntar
  const tag = '@' + base(inc.sender);
  const body = '🚨 *ANTIPAY*\n\n'
    + (banned ? tag + ' foi *banido* por mandar mensagem de pagamento no grupo.' : '⚠️ Detectei mensagem de pagamento de ' + tag + ', mas *não consegui banir* (o bot precisa ser *admin*).')
    + '\n💳 Mensagens de pay recebidas: *' + inc.keys.length + '*\n\nPosso apagar as mensagens de pay que ele conseguiu mandar?';
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
    const sender = msg.key.participant || '';
    if (!sender) return false;
    if (!isEnabled(jid)) return false;
    if (config.isOwner(sender)) return false;

    const k = jid + '|' + base(sender);
    let inc = byUser.get(k);
    if (inc && inc.autoDelete) {                      // admin já aprovou apagar: apaga na hora as novas
      try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
      return true;
    }
    if (!inc) {
      inc = { id: crypto.randomBytes(4).toString('hex'), jid: jid, sender: sender, keys: [], done: false, autoDelete: false };
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

module.exports = { check: check, isEnabled: isEnabled, setEnabled: setEnabled, payType: payType, onClick: onClick, _cfg: cfg, _state: { byId: byId, byUser: byUser } };
TPEOF
cat > src/commands/seguranca/antipay.js <<'TPEOF'
'use strict';
/** !antipay on|off|status — liga/desliga a proteção contra mensagens de pagamento neste grupo. */
const antipay = require('../../middlewares/antipay');

module.exports = {
  name: 'antipay', aliases: ['antipagamento', 'antipaymsg'], category: 'seguranca',
  description: 'Bane quem mandar mensagem de pagamento (flood) no grupo', usage: '!antipay on/off/status',
  handler: async function (ctx) {
    if (!ctx.isGroup) return ctx.reply('❌ Use este comando dentro de um grupo.');
    let ok = false; try { ok = ctx.isOwner() || (await ctx.isGroupAdmin()); } catch (_) {}
    if (!ok) return ctx.reply('❌ Só admins do grupo podem usar isto.');
    const p = ctx.prefix || '!';
    const arg = String((ctx.args && ctx.args[0]) || 'status').toLowerCase();
    if (['on', 'ligar', 'ativar', '1'].indexOf(arg) >= 0) { antipay.setEnabled(ctx.jid, true); return ctx.reply('💳🚫 *ANTIPAY* ligado neste grupo.\nQuem mandar mensagem de pagamento será banido, e eu pergunto se pode apagar as mensagens.'); }
    if (['off', 'desligar', 'desativar', '0'].indexOf(arg) >= 0) { antipay.setEnabled(ctx.jid, false); return ctx.reply('💳 *ANTIPAY* desligado neste grupo.'); }
    return ctx.reply('💳🚫 *ANTIPAY:* ' + (antipay.isEnabled(ctx.jid) ? '🟢 ligado' : '⚪ desligado') + '\n\nUso: ' + p + 'antipay on | off');
  }
};
TPEOF
cat > .tphook.tmp <<'TPEOF'
const fs = require('fs');
const f = 'src/index.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('TP_ANTIPAY')) { console.log('= index.js já atualizado'); process.exit(0); }
const a1 = "const { checkSecurity, checkSubscription } = require('./middlewares/security');";
const a2 = "    const blocked = await checkSecurity(sock, msg);\n    if (blocked) return;";
if (!s.includes(a1) || !s.includes(a2)) { console.log('❌ trechos do index.js não encontrados'); process.exit(2); }
s = s.replace(a1, function () { return a1 + "\nconst antipay = require('./middlewares/antipay'); // TP_ANTIPAY"; });
s = s.replace(a2, function () { return "    try { if (await antipay.check(sock, msg)) return; } catch (_) {} // TP_ANTIPAY\n" + a2; });
fs.writeFileSync(f, s);
console.log('✔ index.js atualizado');
TPEOF
node .tphook.tmp
rm -f .tphook.tmp
node --check src/middlewares/antipay.js && node --check src/commands/seguranca/antipay.js && node --check src/index.js || { echo "❌ erro de sintaxe - restaurando"; cp "$BK/index.js" src/index.js; rm -f src/middlewares/antipay.js src/commands/seguranca/antipay.js; exit 3; }
echo "✅ ANTIPAY instalado. Reinicie o bot. (backup do index.js em $BK)"
