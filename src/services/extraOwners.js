'use strict';
/**
 * DONOS EXTRA (até 8) — guardados na base de dados (setting "extra_owners").
 * Cada dono extra é um conjunto de IDs (número e/ou LID) comparados por igualdade EXACTA de dígitos
 * (nunca por sufixo), para ninguém herdar poderes de dono por coincidência.
 */
const MAX = 8;
const dbm = () => require('../database');
const cfg = () => require('../config');
const digits = (j) => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');
let cache = null, cacheAt = 0;

function load() {
  const now = Date.now(); if (cache && now - cacheAt < 10000) return cache;
  let v = []; try { v = JSON.parse(dbm().getSetting('extra_owners', '[]') || '[]'); } catch (_) {}
  cache = Array.isArray(v) ? v : []; cacheAt = now; return cache;
}
function save(v) { dbm().setSetting('extra_owners', JSON.stringify(v)); cache = v; cacheAt = Date.now(); }

/** número digitado em qualquer formato (+258 87..., 00258..., (258)87-...) -> só dígitos, ou '' se inválido */
function norm(input) {
  let d = digits(String(input || '').split('@')[0]); if (d.startsWith('00')) d = d.slice(2);
  return d.length >= 8 && d.length <= 16 ? d : '';
}
/** variantes conhecidas em que o WhatsApp usa outro formato para o MESMO número (Brasil, México, Argentina) */
function variants(d) {
  const s = new Set([d]);
  if (/^55\d{2}9\d{8}$/.test(d)) s.add(d.slice(0, 4) + d.slice(5)); else if (/^55\d{2}[6-9]\d{7}$/.test(d)) s.add(d.slice(0, 4) + '9' + d.slice(4));
  if (/^521\d{10}$/.test(d)) s.add('52' + d.slice(3)); else if (/^52\d{10}$/.test(d)) s.add('521' + d.slice(2));
  if (/^549\d{10}$/.test(d)) s.add('54' + d.slice(3)); else if (/^54\d{10}$/.test(d)) s.add('549' + d.slice(2));
  return [...s];
}
function matches(jid) { const d = digits(jid); if (d.length < 8) return false; return load().some((e) => e.ids.includes(d)); }

/** dono principal (mesma regra do config.isOwner original) */
function isMain(jid) {
  if (!jid) return false; const raw = String(jid), d = raw.replace(/\D/g, ''), c = cfg();
  const owner = String(c.ownerNumber || '').replace(/\D/g, ''), lid = String(c.ownerLid || '').replace(/\D/g, '');
  if (lid && (d === lid || raw.includes(lid))) return true;
  return !!(owner && (d === owner || d.endsWith(owner) || d.slice(-9) === owner.slice(-9)));
}
const list = () => load().map((e) => Object.assign({}, e, { ids: e.ids.slice() }));
function add(rawIds, by, label) {
  const ids = [...new Set((rawIds || []).map(norm).filter(Boolean).flatMap(variants))];
  if (!ids.length) return { err: 'Número/LID inválido. Use o número com código do país, ex: 258874288439.' };
  if (ids.some((d) => isMain(d))) return { err: 'Esse já é o dono principal.' };
  const cur = load(); if (cur.some((e) => e.ids.some((d) => ids.includes(d)))) return { err: 'Essa pessoa já é dono extra.' };
  if (cur.length >= MAX) return { err: 'Limite de ' + MAX + ' donos extras atingido. Remova um com *deldono*.' };
  const e = { ids, label: String(label || '').slice(0, 40), by: digits(by), ts: Date.now() }; save(cur.concat([e])); return { ok: true, entry: e };
}
function remove(input) {
  const d = norm(input); if (!d) return false; const vs = variants(d), cur = load(); const i = cur.findIndex((e) => e.ids.some((x) => vs.includes(x)));
  if (i < 0) return false; const n = cur.slice(); n.splice(i, 1); save(n); return true;
}
/** quando um dono extra fala, aprende os outros IDs dele (ex: número + LID) para reconhecê-lo em qualquer grupo */
function learn(idsIn) {
  const ds = [...new Set((idsIn || []).map(digits).filter((d) => d.length >= 8 && d.length <= 16))]; if (!ds.length) return;
  const cur = load(); const e = cur.find((x) => x.ids.some((d) => ds.includes(d))); if (!e) return;
  const add = ds.flatMap(variants).filter((d) => !e.ids.includes(d) && !isMain(d) && !cur.some((o) => o !== e && o.ids.includes(d)));
  if (!add.length) return; const n = cur.map((x) => (x === e ? Object.assign({}, x, { ids: x.ids.concat([...new Set(add)]) }) : x)); save(n);
}
module.exports = { MAX, digits, norm, variants, matches, isMain, list, add, remove, learn };
