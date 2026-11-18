'use strict';
// NINTENDO 64 — jogos 3D estilo 64 bits no painel HTML. Menu: !n64
const ui = require('../../interactive/n64Ui');
const base = { category: 'jogos' };
const EXTRA = { t64: ['tempest3d'], kart: ['kart', 'tempestkart'], hyper: ['hyperracer'], jet: ['jetrider', 'jet'], starsh: ['startempest3d'], golden: ['golden'], pilot: ['voo', 'pilot'], snow: ['snowboard'], golf: ['golfe'], hero: ['hero'] };
const list = [Object.assign({}, base, { name: 'n64', aliases: ['nintendo64', 'nintendo', 'jogos3d'], description: 'Menu dos jogos 3D estilo Nintendo 64 em painel', usage: 'n64', handler: async (ctx) => ui.openMenu(ctx) })];
ui.GAMES.forEach((g) => list.push(Object.assign({}, base, { name: g.cmd, aliases: (EXTRA[g.id] || []).filter((a) => a !== g.cmd), description: g.name + ' (' + g.tag + ')', usage: g.cmd, handler: async (ctx) => ui.start(ctx, g.id) })));
module.exports = list;
