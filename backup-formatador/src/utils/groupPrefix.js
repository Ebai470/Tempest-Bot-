/**
 * Prefixos por grupo (persistentes) — DOIS tipos independentes:
 *   texto       -> menu de texto e todos os comandos normais (lista, ex: ! . #)
 *   interativo  -> menu interativo (lista com botões; padrão: /)
 * Guardado em group_settings (sobrevive a reinício). Sem configuração = comportamento original.
 */
const config = require('../config');

const K_TEXT = 'prefixes_text';
const K_INTER = 'prefix_inter';
const DEF_INTER = '/';
const cache = new Map(); // jid -> { text, inter }

function isGroupJid(jid) { return !!jid && String(jid).endsWith('@g.us'); }
function db() { return require('../database'); }

function defaultText() {
  const l = (config.prefixes || []).filter(function (p) { return p !== DEF_INTER; });
  return l.length ? l : ['!'];
}

function load(jid) {
  if (cache.has(jid)) return cache.get(jid);
  const v = { text: null, inter: null };
  try {
    const raw = db().getGroupSetting(jid, K_TEXT, null);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) v.text = arr.map(String).filter(Boolean);
    }
  } catch (_) {}
  try {
    const r2 = db().getGroupSetting(jid, K_INTER, null);
    if (r2 && String(r2).trim()) v.inter = String(r2).trim();
  } catch (_) {}
  cache.set(jid, v);
  return v;
}

function getText(jid) { return isGroupJid(jid) ? load(jid).text : null; }
function getInteractive(jid) { return isGroupJid(jid) ? load(jid).inter : null; }
function effectiveText(jid) { return getText(jid) || defaultText(); }
function effectiveInteractive(jid) { return getInteractive(jid) || DEF_INTER; }
function displayText(jid) { return effectiveText(jid)[0] || '!'; }
function displayInteractive(jid) { return effectiveInteractive(jid); }

/** 1-3 símbolos, sem letras/números/espaço/@ */
function isValid(p) {
  const s = String(p || '');
  if (!s || s === '@') return false;
  if (!/^[^\p{L}\p{N}\s@]+$/u.test(s)) return false;
  return Array.from(s).length <= 3;
}

function clash(a, b) { return a === b || a.startsWith(b) || b.startsWith(a); }

/** devolve texto do erro, ou null se pode usar */
function conflict(jid, type, list) {
  const other = type === 'text' ? [effectiveInteractive(jid)] : effectiveText(jid);
  for (const a of list) for (const b of other) {
    if (clash(a, b)) {
      return 'O prefixo ' + a + ' conflita com o do outro menu (' + b + '). Escolha outro símbolo.';
    }
  }
  return null;
}

function setText(jid, list) {
  if (!isGroupJid(jid)) return false;
  const arr = Array.from(new Set((list || []).map(String).filter(Boolean)));
  if (!arr.length) return clearText(jid);
  db().setGroupSetting(jid, K_TEXT, JSON.stringify(arr));
  cache.delete(jid);
  return true;
}
function clearText(jid) {
  if (!isGroupJid(jid)) return false;
  db().setGroupSetting(jid, K_TEXT, '[]');
  cache.delete(jid);
  return true;
}
function setInteractive(jid, p) {
  if (!isGroupJid(jid)) return false;
  db().setGroupSetting(jid, K_INTER, String(p));
  cache.delete(jid);
  return true;
}
function clearInteractive(jid) {
  if (!isGroupJid(jid)) return false;
  db().setGroupSetting(jid, K_INTER, '');
  cache.delete(jid);
  return true;
}

/** lista de prefixos para o parser, ou null (= grupo sem personalização -> parser original) */
function forParse(jid) {
  if (!isGroupJid(jid)) return null;
  const v = load(jid);
  if (!v.text && !v.inter) return null;
  const all = (v.text || defaultText()).concat([v.inter || DEF_INTER]);
  return Array.from(new Set(all)).sort(function (a, b) { return b.length - a.length; });
}

/**
 * Parse com os prefixos do grupo. Se a mensagem usou o prefixo do menu interativo,
 * o prefixo é normalizado para "/" (é assim que o menu interativo do bot se reconhece).
 */
function parse(msg, parseMessage) {
  try {
    const jid = msg && msg.key && msg.key.remoteJid;
    const list = forParse(jid);
    if (!list) return parseMessage(msg);
    const p = parseMessage(msg, list);
    const inter = getInteractive(jid);
    if (p && p.hasPrefix && inter && inter !== DEF_INTER && p.prefix === inter) p.prefix = DEF_INTER;
    return p;
  } catch (e) {
    console.error('[groupPrefix] parse', e && e.message);
    return parseMessage(msg);
  }
}

module.exports = {
  DEF_INTER, isGroupJid, isValid, conflict, defaultText,
  getText, effectiveText, displayText, setText, clearText,
  getInteractive, effectiveInteractive, displayInteractive, setInteractive, clearInteractive,
  forParse, parse,
  // nomes antigos (compatibilidade com versões anteriores do patch)
  get: getText, set: setText, clear: clearText, effective: effectiveText, display: displayText
};
