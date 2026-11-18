'use strict';
// ARCADE SEGA — clássicos 2D no painel HTML. Menu: !sega
const ui = require('../../interactive/segaUi');
const base = { category: 'jogos' };
const EXTRA = { superbros: ['plataforma', 'supertempest'], bluedash: ['dashazul'], streetfury: ['lutarua'], sunsetdrive: ['corridasol'], gemstack: ['gemas'] };
const list = [Object.assign({}, base, { name: 'sega', aliases: ['arcade', 'jogosega', 'arcade16x9'], description: 'Menu dos jogos clássicos 2D (Sega) em painel', usage: 'sega', handler: async (ctx) => ui.openMenu(ctx) })];
ui.GAMES.forEach((g) => list.push(Object.assign({}, base, { name: g.cmd, aliases: (EXTRA[g.id] || []).filter((a) => a !== g.cmd), description: g.name + ' (' + g.tag + ')', usage: g.cmd, handler: async (ctx) => ui.start(ctx, g.id) })));
list.push(Object.assign({}, base, { name: 'sairjogo', aliases: ['sairarcade', 'fimjogo'], description: 'Info sobre fechar o jogo', usage: 'sairjogo', hideFromMenu: true, handler: async (ctx) => ui.stop(ctx) }));
module.exports = list;
