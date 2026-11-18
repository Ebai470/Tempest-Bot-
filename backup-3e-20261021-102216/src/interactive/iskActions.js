'use strict';
const { btn } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const PREFIX = () => (config.prefixes && config.prefixes[0]) || '!';
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const row = (title, description, id, header) => ({ header: header || '', title: clip(title, 60), description: clip(description, 70), id: id });
const MENU = () => btn.reply('🌌 Menu Isekai', 'rp:isk:home');
const has = (n) => { try { return !!registry.get(n); } catch (_) { return false; } };

function player(ctx) {
  try {
    const db = require('../isekai/db');
    const g = db.scopeGroup(ctx);
    const d = db.getPlayerData(ctx.sender, g);
    if (!d || !d.race) return null;
    return { d: d, g: g };
  } catch (_) { return null; }
}
function sections(title, rows) {
  const out = [];
  for (let i = 0; i < rows.length && out.length < 3; i += 10) out.push({ title: title, rows: rows.slice(i, i + 10) });
  return out;
}
const COMBAT = /^(isklutar|iskboss|iskdungeon|iskatacar|iskusar|iskdefender|iskfugir|iskbatalha)$/;
const AFTER = /^(iskcomprar|iskvender|iskequipar|iskdesequipar|iskconsumir|iskusaritem|iskreparar)$/;

function extra(ctx, e, text, flags) {
  const name = e && e.name;
  if (!name || String(name).indexOf('isk') !== 0) return null;
  const p = player(ctx); if (!p) return null;

  if (COMBAT.test(name)) {
    let inBattle = false;
    try { inBattle = !!require('../isekai/combat').getBattle(ctx.sender, p.g); } catch (_) {}
    if (inBattle) {
      const b = [btn.reply('⚔️ Atacar', 'is:run:iskatacar'), btn.reply('🛡️ Defender', 'is:run:iskdefender'), btn.reply('🏃 Fugir', 'is:run:iskfugir')];
      const sk = (p.d.skills || []).filter((s) => s && s.id && /^[\w.-]+$/.test(String(s.id)));
      if (sk.length) b.push(btn.list('✨ Habilidades', sections('✨ Habilidades', sk.slice(0, 30).map((s) => row(s.name || s.id, s.desc || 'Usar em combate', 'ia:c:iskusar ' + s.id, '✨')))));
      return b;
    }
    if (flags && flags.usage) return null;
    const b = [btn.reply('⚔️ Lutar de novo', 'is:run:isklutar'), btn.reply('👹 Boss', 'is:run:iskboss'), btn.reply('🏰 Dungeon', 'is:run:iskdungeon')];
    if (has('iskconsumir')) b.push(btn.reply('🧪 Consumir', 'is:run:iskconsumir'));
    else b.push(btn.reply('🎒 Inventário', 'is:run:iskinventario'));
    return b;
  }
  if (flags && flags.usage && name !== 'iskcraft') return null;

  let items; try { items = require('../isekai/items'); } catch (_) { return null; }

  if (name === 'iskloja') {
    const rows = Object.keys(items.SHOP_CATS).filter((k) => has('iskloja_' + k)).map((k) => row(items.SHOP_CATS[k].title, 'Ver itens à venda', 'is:run:iskloja_' + k, '🛒'));
    if (!rows.length) return null;
    return [btn.list('🛒 Categorias', [{ title: '🛒 Loja', rows: rows }]), btn.reply('💰 Saldo', 'is:run:isksaldo'), btn.reply('🎒 Inventário', 'is:run:iskinventario'), MENU()];
  }
  if (name.indexOf('iskloja_') === 0) {
    const list = items.listShop(name.slice(8)) || [];
    if (!list.length) return null;
    const rows = list.slice(0, 30).map((it) => row(it.name, 'Y' + it.buy + ' • ' + (it.rarity || ''), 'ia:c:iskcomprar ' + it.id + ' 1', '🛒'));
    return [btn.list('🛒 Comprar item', sections('🛒 Itens', rows)), btn.reply('🏪 Lojas', 'is:run:iskloja'), btn.reply('🎒 Inventário', 'is:run:iskinventario'), MENU()];
  }
  if (name === 'iskinventario') {
    const inv = p.d.inventory || {};
    const ids = Object.keys(inv).filter((k) => items.getItem(k));
    const eq = ids.filter((k) => items.getItem(k).slot).slice(0, 10).map((k) => row(items.getItem(k).name + ' x' + inv[k], 'Equipar este item', 'ia:c:iskequipar ' + k, '🛡️'));
    const use = has('iskconsumir') ? ids.filter((k) => { const it = items.getItem(k); return it.consumable || it.heal != null || it.mana != null; }).slice(0, 10).map((k) => row(items.getItem(k).name + ' x' + inv[k], 'Usar agora', 'ia:c:iskconsumir ' + k, '🧪')) : [];
    const sell = ids.filter((k) => !items.getItem(k).slot && (items.getItem(k).sell || 0) > 0).slice(0, 10).map((k) => row(items.getItem(k).name + ' x' + inv[k], 'Vender 1 por Y' + items.getItem(k).sell, 'ia:c:iskvender ' + k + ' 1', '💰'));
    const secs = [];
    if (eq.length) secs.push({ title: '🛡️ Equipar', rows: eq });
    if (use.length) secs.push({ title: '🧪 Usar', rows: use });
    if (sell.length) secs.push({ title: '💰 Vender', rows: sell });
    if (!secs.length) return null;
    return [btn.list('🎒 Ações do item', secs), btn.reply('🛒 Loja', 'is:run:iskloja'), btn.reply('🔨 Craft', 'is:run:iskcraft'), MENU()];
  }
  if (name === 'iskcraft') {
    const rows = Object.keys(items.RECIPES).slice(0, 30).map((k) => {
      const r = items.RECIPES[k]; const it = items.getItem(r.result);
      const need = Object.keys(r.need).map((m) => m + ' x' + r.need[m]).join(', ');
      return row(it ? it.name : k, need + ' • nv ' + (r.level || 1), 'ia:c:iskcraft ' + k, '🔨');
    });
    if (!rows.length) return null;
    return [btn.list('🔨 Escolher receita', sections('🔨 Receitas', rows)), btn.reply('🎒 Inventário', 'is:run:iskinventario'), MENU()];
  }
  if (AFTER.test(name)) {
    const b = [btn.reply('🛒 Loja', 'is:run:iskloja'), btn.reply('🎒 Inventário', 'is:run:iskinventario')];
    if (name === 'iskreparar' && has('iskreparar')) b.unshift(btn.reply('🔧 Reparar tudo', 'ia:c:iskreparar tudo'));
    else b.push(btn.reply('💰 Saldo', 'is:run:isksaldo'));
    b.push(MENU());
    return b.slice(0, 4);
  }
  if (name === 'iskdiario') return [btn.reply('🎒 Inventário', 'is:run:iskinventario'), btn.reply('⚔️ Lutar', 'is:run:isklutar'), MENU()];
  return null;
}

async function runAs(ctx, deps, text) {
  if (deps && typeof deps.reinject === 'function') {
    const o = ctx.msg;
    const fake = {
      key: { remoteJid: ctx.jid, fromMe: false, id: 'TP' + Date.now().toString(16) + Math.random().toString(16).slice(2, 8).toUpperCase(), participant: o && o.key && o.key.participant },
      message: { conversation: PREFIX() + text }, pushName: o && o.pushName, messageTimestamp: Math.floor(Date.now() / 1000)
    };
    if (o && o.key && o.key.participantPn) fake.key.participantPn = o.key.participantPn;
    return deps.reinject(fake);
  }
  const first = text.split(/\s+/)[0];
  const e = registry.get(first);
  if (!e) return;
  ctx.args = text.split(/\s+/).slice(1); ctx.prefix = ctx.prefix || PREFIX();
  return e.handler(ctx);
}

router.register('ia', async (ctx, rest, msg, deps) => {
  if (String(rest).slice(0, 2) !== 'c:') return;
  const text = String(rest).slice(2).trim();
  if (!/^isk\w+( [\w.-]{1,40}){0,3}$/.test(text)) return;
  if (!has(text.split(' ')[0])) return;
  return runAs(ctx, deps, text);
});

module.exports = { extra };
