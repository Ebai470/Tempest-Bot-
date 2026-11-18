'use strict';
// Divisão NINTENDO 64 — jogos 3D low-poly no painel HTML (menu: !n64, botões n64:*)
const core = require('./arcadeCore');
module.exports = core.makeUi({ prefix: 'n64', kind: '3d', cmd: 'n64', emoji: '🎮', title: 'NINTENDO 64', label: 'Nintendo 64', intro: ['Jogos 3D estilo 64 bits: kart, voo, FPS, ação e mais.', 'Painel 16:9 com controles de toque.'] });
