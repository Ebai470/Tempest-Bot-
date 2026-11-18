const backup2 = require('../../services/backup2');

function fmtSize(b) {
  if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}

module.exports = {
  name: 'backup2',
  aliases: ['backupzip', 'backupinterno'],
  category: 'dono',
  description: 'Salva os ficheiros do bot num zip no armazenamento interno',
  ownerOnly: true,
  usage: 'backup2 [semsessao]',
  handler: async function (ctx) {
    try {
      if (typeof ctx.isOwner === 'function' && !ctx.isOwner()) return ctx.reply('❌ Só o *dono* do bot pode usar isto.');
    } catch (_) {}
    const semSessao = /^(semsessao|sem-sessao|sem_sessao|leve|safe)$/i.test(String((ctx.args && ctx.args[0]) || ''));
    await ctx.reply('Backup2\n\n⏳ A criar o zip' + (semSessao ? ' (sem a sessão do WhatsApp nem o .env)' : '') + '...\nPode demorar um pouco; o bot continua a funcionar.');
    try {
      const r = await backup2.run({ semSessao: semSessao });
      const lines = [
        'Backup2',
        '',
        '✅ Backup guardado no armazenamento interno.',
        '',
        'Ficheiro: ' + r.file,
        'Tamanho: ' + fmtSize(r.bytes),
        'Ficheiros: ' + r.files,
        'Tempo: ' + (r.ms / 1000).toFixed(1) + 's'
      ];
      if (!r.snapshot) lines.push('', '⚠️ Não consegui criar o snapshot do banco; foi copiado o ficheiro direto.');
      lines.push('', r.semSessao
        ? 'Não inclui a sessão do WhatsApp nem o .env (seguro para partilhar).'
        : '⚠️ Inclui a sessão do WhatsApp e o .env. Guarda este zip num local seguro e não o partilhes.');
      lines.push('Não inclui node_modules: depois de extrair, corre *npm install*.');
      return ctx.reply(lines.join('\n'));
    } catch (e) {
      if (e && e.code === 'NO_STORAGE') {
        return ctx.reply('Backup2\n\n❌ Sem acesso ao armazenamento interno.\n\nNo Termux corre uma vez:\n*termux-setup-storage*\ne aceita a permissão. Depois repete o comando.\n\n(Ou define BACKUP2_DIR no .env com outra pasta.)');
      }
      return ctx.reply('Backup2\n\n❌ Falhou: ' + String((e && e.message) || e).slice(0, 160));
    }
  }
};
