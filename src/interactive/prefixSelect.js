// TP_PFXSWAP — rótulos texto/interativo conferem com o comportamento real
/**
 * Mensagem "Prefixo 『 ! 』 ©BOT" com botão LISTA (como no vídeo) para trocar os prefixos.
 *  - lista com 2 seções: prefixo do MENU DE TEXTO e prefixo do MENU INTERATIVO
 *  - handle(): processa o clique e salva no banco (por grupo)
 */
const gp = require('../utils/groupPrefix');

const OPTIONS = ['!', '.', '#', '/', '$', '%', '&', '+', '~', '*', '?', '-'];

function loadBaileys() {
  try { return require('@whiskeysockets/baileys'); } catch (_) { return null; }
}
function botTag() {
  try { return String(require('../config').botName || 'TEMPEST BOT').toUpperCase(); } catch (_) { return 'TEMPEST BOT'; }
}

function bodyText(jid) {
  const t = gp.effectiveText(jid).join('  ');
  const i = gp.effectiveInteractive(jid);
  return 'Prefixo texto 『 ' + i + ' 』\nPrefixo interativo 『 ' + t + ' 』\n©' + botTag();
}

// TP_ATALHOS: lista de atalhos (como no vídeo) antes dos prefixos
function quick() {
  return { title: 'COMANDOS ' + botTag(), rows: [
    { title: '『💮』 MENU', description: 'Abrir o menu principal', id: 'mn:home' },
    { title: '『👤』 PERFIL', description: 'Ver seu perfil', id: 'mn:cmd:perfil' },
    { title: '『📖』 TUTORIAL', description: 'Tutorial básico', id: 'mn:cmd:tutorial' },
    { title: '『🏠』 ALUGAR', description: 'Ver opções de aluguel', id: 'mn:cat:aluguel' },
    { title: '『🛍️』 LOJINHA', description: 'Abrir a lojinha', id: 'mn:cmd:loja' },
    { title: '『👑』 DONO', description: 'Informações do proprietário', id: 'mn:owner' },
    { title: '『📦』 TOTAL CMDS', description: 'Ver total de comandos', id: 'mn:cmd:totalcmds' },
    { title: '『🏓』 PING', description: 'Ver velocidade do bot', id: 'mn:cmd:ping' }
  ] };
}
function sections() {
  const mk = function (type, label) {
    const rows = OPTIONS.map(function (p) {
      return { title: 'Prefixo ' + p, description: 'Ex: ' + p + 'menu', id: 'prefixo:' + type + ':set:' + encodeURIComponent(p) };
    });
    rows.push({ title: 'Restaurar padrão', description: 'Volta ao prefixo original', id: 'prefixo:' + type + ':reset' });
    return { title: label, rows: rows };
  };
  return [quick(), mk('inter', 'MENU DE TEXTO'), mk('text', 'MENU INTERATIVO')];
}

async function sendPrefixListOld(sock, jid) {
  const body = bodyText(jid);
  const secs = sections();
  const baileys = loadBaileys();

  if (baileys && baileys.proto && baileys.generateWAMessageFromContent) {
    try {
      const { proto, generateWAMessageFromContent } = baileys;
      const native = proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: [{
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: '❯❯ LISTA ❮❮',
            sections: secs.map(function (s) {
              return { title: s.title, rows: s.rows.map(function (r) {
                return { header: '', title: r.title, description: r.description, id: r.id };
              }) };
            })
          })
        }]
      });
      const interactive = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({ text: body }),
        header: proto.Message.InteractiveMessage.Header.create({ title: '', hasMediaAttachment: false }),
        nativeFlowMessage: native
      });
      const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: { message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: interactive
        } }
      }, {});
      await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
      return 'nativeFlow';
    } catch (e) {
      console.log('[prefixo] nativeFlow fail:', e && e.message);
    }
  }

  try {
    await sock.sendMessage(jid, {
      text: body,
      footer: '©' + botTag(),
      title: '',
      buttonText: 'LISTA',
      sections: secs.map(function (s) {
        return { title: s.title, rows: s.rows.map(function (r) { return { title: r.title, description: r.description, rowId: r.id }; }) };
      })
    });
    return 'classic';
  } catch (e2) {
    console.log('[prefixo] classic fail:', e2 && e2.message);
  }
  try { await sock.sendMessage(jid, { text: body + '\n\nTrocar: prefixo texto <símbolo> | prefixo inter <símbolo>' }); } catch (_) {}
  return null;
}

// TP_PFXCARD: cartão bonito do prefixo (mesmo envio dos menus: aparece em grupo e no privado)
async function sendPrefixList(sock, jid, quoted) {
  try {
    const nf = require('./nativeFlow');
    const group = gp.isGroupJid(jid);
    const secs = group ? sections() : [quick()];
    let tx = '!'; try { tx = gp.effectiveText(jid)[0] || gp.defaultText()[0] || '!'; } catch (_) { try { tx = gp.defaultText()[0] || '!'; } catch (__) {} }
    let t = ''; try { t = gp.effectiveText(jid).join('  '); } catch (_) { t = gp.defaultText().join('  '); }
    let i = ''; try { i = gp.effectiveInteractive(jid); } catch (_) { i = gp.DEF_INTER; }
    const body = 'Prefixo texto 『 ' + i + ' 』\nPrefixo interativo 『 ' + t + ' 』\n\nExemplo: ' + tx + 'menu\n©' + botTag();
    const sections2 = secs.map(function (s) { return { title: s.title, rows: s.rows.map(function (r) { return { header: '', title: r.title, description: r.description, id: r.id }; }) }; });
    await nf.sendNative(sock, jid, { body: body, footer: '©' + botTag(), quoted: quoted, fallback: body, buttons: [nf.btn.list('❯❯ LISTA ❮❮', sections2)] });
    return 'sendNative';
  } catch (e) {
    console.log('[prefixo] cartão novo falhou, usando o antigo:', e && e.message);
    return sendPrefixListOld(sock, jid);
  }
}

function extractRowId(msg) {
  const m = msg && msg.message;
  if (!m) return '';
  try {
    const l = m.listResponseMessage;
    if (l && l.singleSelectReply && l.singleSelectReply.selectedRowId) return String(l.singleSelectReply.selectedRowId);
  } catch (_) {}
  try {
    const ir = m.interactiveResponseMessage;
    if (ir && ir.nativeFlowResponseMessage && ir.nativeFlowResponseMessage.paramsJson) {
      const p = JSON.parse(ir.nativeFlowResponseMessage.paramsJson);
      return String(p.id || p.selectedId || p.rowId || '');
    }
  } catch (_) {}
  return '';
}

function confirmText(title, jid) {
  return title + '\nPrefixo texto 『 ' + gp.effectiveInteractive(jid) + ' 』\nPrefixo interativo 『 ' + gp.effectiveText(jid).join('  ') + ' 』\n©' + botTag();
}

/** aplica uma alteração; devolve a mensagem para o usuário */
function apply(jid, type, action, value) {
  if (action === 'reset') {
    if (type === 'text') gp.clearText(jid); else gp.clearInteractive(jid);
    return confirmText('✅ Prefixo restaurado ao padrão.', jid);
  }
  const list = (type === 'text') ? value : [value[0]];
  const bad = list.filter(function (p) { return !gp.isValid(p); });
  if (bad.length) return '❌ Prefixo inválido: ' + bad.join(' ') + '\nUse 1 a 3 símbolos (sem letras, números ou @). Ex: $';
  const c = gp.conflict(jid, type, list);
  if (c) return '❌ ' + c;
  if (type === 'text') gp.setText(jid, list); else gp.setInteractive(jid, list[0]);
  return confirmText('✅ Prefixo ' + (type === 'text' ? 'do menu interativo' : 'do menu de texto') + ' alterado.', jid);
}

async function allowed(sock, msg) {
  try {
    const Context = require('../utils/context');
    const ctx = new Context(sock, msg, { body: '', args: [], text: '', command: '', prefix: '', hasPrefix: false });
    return !!(ctx.isOwner() || ctx.isBotAdmin() || (await ctx.isGroupAdmin()));
  } catch (e) {
    console.error('[prefixo] perm', e && e.message);
    return false;
  }
}

/** @returns {Promise<boolean>} true se era um clique do prefixo (já tratado) */
async function handle(sock, msg) {
  const rowId = extractRowId(msg);
  if (!rowId || rowId.indexOf('prefixo:') !== 0) return false;
  const jid = msg.key && msg.key.remoteJid;
  const say = function (t) { return sock.sendMessage(jid, { text: t }, { quoted: msg }); };
  try {
    if (!gp.isGroupJid(jid)) { await say('O prefixo só pode ser alterado em grupos.'); return true; }
    if (!(await allowed(sock, msg))) { await say('❌ Só admins do grupo podem alterar o prefixo.'); return true; }
    const parts = rowId.split(':'); // prefixo:<type>:<set|reset>[:valor]
    const type = parts[1] === 'inter' ? 'inter' : 'text';
    if (parts[2] === 'reset') { await say(apply(jid, type, 'reset')); return true; }
    if (parts[2] === 'set') {
      const v = decodeURIComponent(parts.slice(3).join(':'));
      await say(apply(jid, type, 'set', [v]));
      return true;
    }
  } catch (e) {
    console.error('[prefixo] clique', e && e.message);
    try { await say('❌ Não consegui salvar o prefixo. Tente novamente.'); } catch (_) {}
  }
  return true;
}

module.exports = { sendPrefixList, handle, extractRowId, apply, allowed, confirmText, bodyText, OPTIONS };
