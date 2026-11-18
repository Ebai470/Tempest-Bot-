const { openMainMenu } = require('../../interactive/slashMenu');
module.exports = {
  name: 'smenu',
  aliases: ['intermenu', 'menui', 'menubotoes'],
  category: 'utilidades',
  description: 'Menu interativo (botoes)',
  async handler(ctx) {
    return openMainMenu(ctx);
  }
};
