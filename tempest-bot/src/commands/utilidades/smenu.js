const { generateMainMenu } = require('../../utils/menu');

module.exports = {
  name: 'smenu',
  aliases: ['intermenu', 'menui'],
  category: 'utilidades',
  description: 'Menu principal (texto)',
  async handler(ctx) {
    return ctx.reply(generateMainMenu(ctx));
  }
};
