const isekaiDb = require('../../isekai/db');
const economy = require('../../isekai/economy');
const plus = require('../../isekai/economy_plus');

function need(ctx) {
  const g = isekaiDb.scopeGroup(ctx);
  const d = isekaiDb.getPlayerData(ctx.sender, g);
  if (!d || !d.race) return { ok: false, msg: 'Cria personagem: iskiniciar Nome' };
  economy.ensureInv(d);
  return { ok: true, data: d, group: g };
}
function argsOf(ctx) {
  if (ctx.args && ctx.args.length) return ctx.args.map(String);
  const t = String(ctx.text || '').trim();
  return t ? t.split(/\s+/).filter(Boolean) : [];
}
module.exports = [
  { name: 'iskreparar', aliases: ['iskrepair'], category: 'isekai', description: 'Repara equipamentos gastos',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const target = (argsOf(ctx)[0] || '').toLowerCase();
      if (!target) {
        const rep = plus.durabilityReport(n.data);
        return ctx.reply('FERREIRO\n\n' + (rep.length ? rep.join('\n') : '(nada equipado)') + '\n\nReparar: iskreparar <slot|item|tudo>\nSaldo: Y' + n.data.iene);
      }
      const r = plus.repair(n.data, target);
      if (!r.ok) return ctx.reply(r.msg);
      isekaiDb.savePlayerData(ctx.sender, n.group, n.data);
      await ctx.reply('Reparo OK (' + r.items.length + ' item(ns))\n-Y' + r.cost + '\nSaldo: Y' + r.iene);
    } },
  { name: 'iskdiario', aliases: ['iskdaily'], category: 'isekai', description: 'Recompensa diaria com sequencia',
    handler: async (ctx) => {
      const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
      const r = plus.daily(n.data);
      if (!r.ok) return ctx.reply(r.msg);
      isekaiDb.savePlayerData(ctx.sender, n.group, n.data);
      await ctx.reply('RECOMPENSA DIARIA\n\n+Y' + r.gain + '\nSequencia: ' + r.streak + ' dia(s)' + (r.item ? '\nBonus: ' + r.item : '') + '\nSaldo: Y' + r.iene);
    } }
];
