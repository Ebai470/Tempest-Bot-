'use strict';
const CIRC = ['①', '②', '③'];

function bar(pct) {
  const n = Math.max(0, Math.min(10, Math.floor(pct / 10)));
  return '▰'.repeat(n) + '▱'.repeat(10 - n);
}

async function send(ctx, p) {
  const tok = Math.random().toString(36).slice(2, 8);
  p.store.set(tok, { texts: p.texts, sender: ctx.sender, ts: Date.now() });
  const num = p.numOf(ctx.sender);
  const q = (s) => (s ? '> ┊ ' + s : '> ┊');
  const title = '❌`𖤐 ' + (p.kind === 'menu' ? 'OPÇÃO NÃO ENCONTRADA' : 'NÃO ENCONTRADO') + '`';
  const lines = [
    title,
    '',
    q('👤 @' + num),
    q('⌨️ Digitou: ' + p.typedShown),
    q(''),
    q('୨୧ Talvez quis dizer: ' + p.shows[0]),
    q(''),
    q('𖤐 SUGESTÕES'),
    q('')
  ];
  p.shows.forEach((s, i) => {
    const pct = Math.max(1, Math.min(99, Math.round((p.scores && p.scores[i]) || 0)));
    lines.push(q((CIRC[i] || '•') + ' "' + s + '" — ' + pct + '%'));
    lines.push(q(bar(pct)));
  });
  lines.push(q(''));
  lines.push('> ╰┈ ⛧ ' + String((p.config && p.config.botName) || 'Tempest Bot').toUpperCase());
  const buttons = p.shows.map((s, i) => p.btn.reply('✅ Usar ' + s, 'sg:run:' + tok + ':' + i));
  const body = lines.join('\n');
  return p.sendNative(ctx.sock, ctx.jid, Object.assign({
    body: body,
    footer: '',
    mentions: ctx.sender ? [ctx.sender] : [],
    quoted: p.quotedCard(ctx.sock, ctx.jid),
    buttons: buttons,
    fallback: body
  }, require('./sugMedia').opts()));
}

module.exports = { send, bar };
