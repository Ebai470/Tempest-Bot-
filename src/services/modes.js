'use strict';
function db() { return require('../database'); }

function suggestOff() {
  try {
    const v = db().getSetting('modo_sugestao', null);
    if (v === '0') return true;
    if (v === '1') return false;
  } catch (_) {}
  try { return String(require('../interactive/nativeFlow').getEnv('SUGESTAO') || '').toLowerCase() === 'off'; } catch (_) { return false; }
}

function setSuggest(on) { db().setSetting('modo_sugestao', on ? '1' : '0'); }

function notifOn(groupJid) {
  try { return String(db().getGroupSetting(groupJid, 'modo_notificacao', '1')) !== '0'; } catch (_) { return true; }
}

function setNotif(groupJid, on) { db().setGroupSetting(groupJid, 'modo_notificacao', on ? '1' : '0'); }

module.exports = { suggestOff, setSuggest, notifOn, setNotif };
