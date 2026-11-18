const isekaiDb = require('../../isekai/db');
const economy = require('../../isekai/economy');
const items = require('../../isekai/items');
const story = require('../../isekai/story');
const world = require('../../isekai/world');
const registry = require('../registry');

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
function delegate(target) {
  return async function (ctx) {
    const c = registry.get(target);
    if (!c || typeof c.handler !== 'function') return ctx.reply('Comando indisponivel no momento.');
    return c.handler(ctx);
  };
}
async function consumir(ctx) {
  const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
  const id = (argsOf(ctx)[0] || '').toLowerCase();
  if (!id) {
    const list = Object.keys(n.data.inventory || {}).filter(function (k) {
      const it = items.getItem(k); return it && (it.consumable || it.heal != null || it.mana != null);
    });
    if (!list.length) return ctx.reply('Nao tens itens consumiveis.');
    return ctx.reply('CONSUMIVEIS\n\n' + list.map(function (k) {
      const it = items.getItem(k); return '- ' + k + ' (' + it.name + ') x' + n.data.inventory[k];
    }).join('\n') + '\n\nUsar: iskconsumir <item>');
  }
  const r = economy.useConsumable(n.data, id);
  if (!r.ok) return ctx.reply(r.msg);
  isekaiDb.savePlayerData(ctx.sender, n.group, n.data);
  await ctx.reply('Usaste ' + r.item.name + '\n' + r.effects.join(' | ') + '\nHP ' + r.hp + '/' + (n.data.hpMax || 100) + ' | Mana ' + r.mana + '/' + (n.data.manaMax || 50));
}
async function historia(ctx) {
  const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
  const s = story.storyStatus(n.data);
  isekaiDb.savePlayerData(ctx.sender, n.group, n.data);
  const lines = ['HISTORIA', '', 'Capitulo ' + s.chapter.id + ': ' + s.chapter.name];
  lines.push(s.next ? 'Proximo: ' + s.next.name : 'Ultimo capitulo alcancado.');
  if (s.log && s.log.length) { lines.push('', 'Ultimos eventos:'); s.log.forEach(function (l) { lines.push('- ' + (typeof l === 'string' ? l : (l.text || JSON.stringify(l)))); }); }
  await ctx.reply(lines.join('\n'));
}
async function reinos(ctx) {
  const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
  story.ensureStory(n.data);
  const rep = n.data.kingdomRep || {};
  const lines = ['REINOS', ''];
  Object.keys(story.KINGDOMS).forEach(function (k) {
    const r = story.KINGDOMS[k];
    lines.push(r.name + ' (' + r.gov + ')\n  Seguranca ' + r.safety + ' | Riqueza ' + r.wealth + ' | Reputacao ' + (rep[k] || 0));
  });
  await ctx.reply(lines.join('\n'));
}
async function descobrir(ctx) {
  const n = need(ctx); if (!n.ok) return ctx.reply(n.msg);
  const known = n.data.discovered || { vila_inicial: true };
  const ids = Object.keys(world.PLACES);
  const got = ids.filter(function (id) { return known[id]; });
  const lines = ['LUGARES DESCOBERTOS (' + got.length + '/' + ids.length + ')', ''];
  got.forEach(function (id) { lines.push('- ' + world.PLACES[id].name); });
  const missing = ids.length - got.length;
  if (missing > 0) lines.push('', missing + ' lugar(es) ainda por descobrir. Use iskexplorar.');
  await ctx.reply(lines.join('\n'));
}
module.exports = [
  { name: 'iskconsumir', aliases: ['iskusaritem'], category: 'isekai', description: 'Usa pocao ou comida fora do combate', handler: consumir },
  { name: 'iskhistoria', category: 'isekai', description: 'Capitulo atual da historia', handler: historia },
  { name: 'iskreinos', category: 'isekai', description: 'Reinos e reputacao', handler: reinos },
  { name: 'iskdescobrir', category: 'isekai', description: 'Lugares descobertos', handler: descobrir },
  { name: 'iskpainel', category: 'isekai', description: 'Painel do Isekai', handler: delegate('iskmenu') },
  { name: 'iskeventomundo', category: 'isekai', description: 'Eventos do mundo', handler: delegate('iskeventos') },
  { name: 'iskdestino_log', category: 'isekai', description: 'Historico do destino', handler: delegate('iskhistorico') }
];
