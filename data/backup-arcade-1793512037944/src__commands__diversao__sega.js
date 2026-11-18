'use strict';
// ARCADE 16:9 — 5 jogos no painel HTML. Menu: !sega
const ui = require('../../interactive/segaUi');
const base = { category: 'jogos' };
const list = [
  Object.assign({}, base, { name: 'sega', aliases: ['arcade', 'jogosega', 'arcade16x9'], description: 'Menu dos jogos de arcade 16:9 (painel)', usage: 'sega', handler: async (ctx) => ui.openMenu(ctx) }),
  Object.assign({}, base, { name: 'superbros', aliases: ['plataforma', 'supertempest'], description: 'Super Tempest Bros (plataforma)', usage: 'superbros', handler: async (ctx) => ui.start(ctx, 'superbros') }),
  Object.assign({}, base, { name: 'bluedash', aliases: ['dashazul', 'corredorazul'], description: 'Blue Dash (corrida veloz)', usage: 'bluedash', handler: async (ctx) => ui.start(ctx, 'bluedash') }),
  Object.assign({}, base, { name: 'streetfury', aliases: ['lutarua', 'lutaderua'], description: 'Street Fury (luta de rua)', usage: 'streetfury', handler: async (ctx) => ui.start(ctx, 'streetfury') }),
  Object.assign({}, base, { name: 'sunsetdrive', aliases: ['corridasol', 'drive3d'], description: 'Sunset Drive (corrida 3D)', usage: 'sunsetdrive', handler: async (ctx) => ui.start(ctx, 'sunsetdrive') }),
  Object.assign({}, base, { name: 'gemstack', aliases: ['gemas', 'colunasgemas'], description: 'Gem Stack (quebra-cabeças)', usage: 'gemstack', handler: async (ctx) => ui.start(ctx, 'gemstack') }),
  Object.assign({}, base, { name: 'sairjogo', aliases: ['sairarcade', 'fimjogo'], description: 'Info sobre fechar o jogo', usage: 'sairjogo', hideFromMenu: true, handler: async (ctx) => ui.stop(ctx) })
];
module.exports = list;
