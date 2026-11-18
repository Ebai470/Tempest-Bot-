// TP_SMENU: o menu numerado antigo foi removido; abre o menu interativo atual
module.exports = {
  name: 'smenu',
  aliases: ['intermenu', 'menui', 'menubotoes'],
  category: 'utilidades',
  description: 'Menu principal (interativo)',
  async handler(ctx) {
    require('../../interactive');
    return require('../../interactive/mainMenu').openMain(ctx);
  }
};
