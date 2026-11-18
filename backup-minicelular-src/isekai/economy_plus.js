const economy = require('./economy');
const { getItem } = require('./items');

const REPAIR_RATE = 0.25;

function basePrice(it) {
  if (it.buy != null && it.buy > 0) return it.buy;
  return Math.max(20, Math.round((it.sell || 40) * 2.5));
}
function curDur(data, it) {
  const d = data.itemDur && data.itemDur[it.id];
  return d == null ? it.dur : Math.max(0, Math.min(it.dur, d));
}
function repairCost(data, itemId) {
  const it = getItem(itemId);
  if (!it || it.dur == null) return 0;
  const missing = it.dur - curDur(data, it);
  if (missing <= 0) return 0;
  return Math.max(1, Math.ceil(basePrice(it) * REPAIR_RATE * missing / it.dur));
}
function recalcBonus(data) {
  const b = { atk: 0, def: 0, mag: 0, agi: 0, prec: 0, sorte: 0, hp: 0 };
  const dur = data.itemDur || {};
  Object.keys(data.equipment || {}).forEach(function (slot) {
    const id = data.equipment[slot];
    if (dur[id] != null && dur[id] <= 0) return;
    const it = getItem(id);
    if (!it) return;
    Object.keys(b).forEach(function (k) { if (it[k]) b[k] += it[k]; });
  });
  data.equipBonus = b;
  return b;
}
function targets(data, target) {
  const eq = data.equipment || {};
  const t = String(target || '').toLowerCase();
  if (t === 'tudo' || t === 'all') return Object.keys(eq).map(function (s) { return eq[s]; });
  if (eq[t]) return [eq[t]];
  if (getItem(t) && ((data.inventory && data.inventory[t]) || Object.keys(eq).some(function (s) { return eq[s] === t; }))) return [t];
  return [];
}
function repair(data, target) {
  economy.ensureInv(data);
  const ids = targets(data, target).filter(function (id, i, a) { return a.indexOf(id) === i; });
  if (!ids.length) return { ok: false, msg: 'Nada para reparar. Use: iskreparar <slot|item|tudo>' };
  let total = 0; const list = [];
  ids.forEach(function (id) { const c = repairCost(data, id); if (c > 0) { total += c; list.push(id); } });
  if (!list.length) return { ok: false, msg: 'Nada precisa de reparo.' };
  if (data.iene < total) return { ok: false, msg: 'IENE insuficiente. Reparo custa Y' + total + ' (tens Y' + data.iene + ').' };
  data.iene -= total;
  if (!data.itemDur) data.itemDur = {};
  list.forEach(function (id) { data.itemDur[id] = getItem(id).dur; });
  recalcBonus(data);
  return { ok: true, cost: total, items: list, iene: data.iene };
}
function durabilityReport(data) {
  economy.ensureInv(data);
  const eq = data.equipment || {};
  const lines = [];
  Object.keys(eq).forEach(function (slot) {
    const it = getItem(eq[slot]);
    if (!it || it.dur == null) return;
    const c = repairCost(data, it.id);
    lines.push(slot + ': ' + it.name + ' ' + curDur(data, it) + '/' + it.dur + (c ? ' (reparo Y' + c + ')' : ' (ok)'));
  });
  return lines;
}

const DAY = 24 * 3600 * 1000;
function daily(data, now) {
  economy.ensureInv(data);
  now = now || Date.now();
  const st = data.daily && typeof data.daily === 'object' ? data.daily : { last: 0, streak: 0 };
  if (st.last && now - st.last < DAY) {
    return { ok: false, msg: 'Recompensa diaria ja coletada. Volte em ' + Math.ceil((DAY - (now - st.last)) / 3600000) + 'h.' };
  }
  st.streak = (st.last && now - st.last < 2 * DAY) ? Math.min(30, (st.streak || 0) + 1) : 1;
  st.last = now;
  const lvl = Math.max(1, Math.floor(Number(data.level) || 1));
  const bonusPct = Math.min(0.5, (st.streak - 1) * 0.05);
  const gain = Math.floor((60 + lvl * 15) * (1 + bonusPct));
  data.iene += gain;
  let item = null;
  if (st.streak % 7 === 0) { if (economy.addItem(data, 'pocao_grande', 2)) item = 'pocao_grande x2'; }
  data.daily = st;
  return { ok: true, gain: gain, streak: st.streak, item: item, iene: data.iene };
}
module.exports = { repair, repairCost, recalcBonus, durabilityReport, daily };
