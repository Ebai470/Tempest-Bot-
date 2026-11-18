const vm = require('../../services/verifiedMode');

module.exports = [
  {
    name: 'setcanal',
    aliases: ['definircanal', 'canaljid'],
    category: 'dono',
    description: 'Define o canal usado no modo verificado a partir do link',
    ownerOnly: true,
    usage: 'setcanal https://whatsapp.com/channel/XXXX',
    handler: async (ctx) => {
      try {
        if (typeof ctx.isOwner === 'function' && !ctx.isOwner()) {
          return ctx.reply('❌ Só o *dono* do bot pode usar isto.');
        }
      } catch (_) {}
      const arg = String((ctx.args && ctx.args[0]) || '').trim();
      const m = /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i.exec(arg);
      if (!m) {
        return ctx.reply('*Definir canal*\n\nUso: !setcanal https://whatsapp.com/channel/XXXX');
      }
      if (typeof ctx.sock.newsletterMetadata !== 'function') {
        return ctx.reply('⚠️ Esta versão do Baileys não suporta consultar canais.');
      }
      let meta;
      try {
        meta = await ctx.sock.newsletterMetadata('invite', m[1]);
      } catch (e) {
        return ctx.reply('⚠️ Não consegui ler o canal: ' + (e && e.message ? e.message : 'erro'));
      }
      const jid = meta && meta.id;
      const name = String((meta && (meta.name || (meta.thread_metadata && meta.thread_metadata.name && meta.thread_metadata.name.text))) || 'Tempest Bot').trim();
      const problem = vm.channelProblem({ jid: jid || '', name: name });
      if (problem) return ctx.reply('⚠️ ' + problem);
      vm.setChannel(jid, name);
      return ctx.reply('*Canal definido*\n\n✅ Nome: ' + name + '\nJID: ' + jid + '\n\nAgora use: !modoverificado on');
    }
  }
];
