'use strict';
const registry = require('../commands/registry');

const NF = 'comandonaoencontrado';

function plain(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
}

function isNotFoundKey(k) {
  const p = plain(k);
  if (!p) return false;
  return /^(comando)?(nao)?(encontr|inexist|existe)/.test(p) || /^sugest/.test(p);
}

function canon(k) {
  const key = String(k || '').trim();
  if (!key) return key;
  try { if (registry.get(key) || registry.get(key.split(/\s+/)[0])) return key; } catch (_) {}
  return isNotFoundKey(key) ? NF : key;
}

function special(k) {
  return String(k || '') === NF ? { name: NF, aliases: [], special: true } : null;
}

module.exports = { canon, special, NF };
