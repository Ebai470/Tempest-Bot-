'use strict';
// Divisão SEGA — clássicos 2D no painel HTML (menu: !sega, botões sgm:*)
const core = require('./arcadeCore');
module.exports = Object.assign(core.makeUi({ prefix: 'sgm', kind: '2d', cmd: 'sega', emoji: '🕹️', title: 'ARCADE SEGA', label: 'Arcade Sega', intro: ['Clássicos 2D de verdade, em tempo real, direto na conversa.', 'Painel 16:9 com controles de toque.'] }), { montarMensagem: core.montarMensagem });
require('./n64Ui'); // registra a divisão Nintendo 64 junto (não precisa mexer no index.js)
