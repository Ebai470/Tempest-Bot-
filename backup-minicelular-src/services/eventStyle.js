const BOLD_U = 0x1D5D4, BOLD_L = 0x1D5EE, BOLD_D = 0x1D7EC;
function bold(s) {
  let o = '';
  for (const ch of String(s)) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) o += String.fromCodePoint(BOLD_U + c - 65);
    else if (c >= 97 && c <= 122) o += String.fromCodePoint(BOLD_L + c - 97);
    else if (c >= 48 && c <= 57) o += String.fromCodePoint(BOLD_D + c - 48);
    else o += ch;
  }
  return o;
}
const SC = 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ';
function small(s) {
  let o = '';
  for (const ch of String(s).toLowerCase()) {
    const c = ch.charCodeAt(0);
    o += (c >= 97 && c <= 122) ? SC[c - 97] : ch;
  }
  return o;
}
function now() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ', ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
function tag(jid) { return '@' + String(jid || '').split('@')[0].split(':')[0]; }
function box(emoji, title, lines) {
  const out = ['• ' + emoji + ' ' + bold(title), ''];
  for (const l of lines) out.push(l === '' ? '┃' : '┃ ' + l);
  return out.join('\n');
}
function aprovada(a) {
  const l = [small('uma solicitacao de entrada'), small('foi aprovada.'), ''];
  if (a) l.push('*' + small('aprovada por:') + ' ' + tag(a) + '*', '');
  l.push('*' + small('data:') + ' ' + now() + '*');
  return box('✅', 'SOLICITACAO APROVADA', l);
}
function promocao(u, a) {
  const l = [small('o usuario') + ' ' + tag(u), small('foi promovido a adm.'), ''];
  if (a) l.push('*' + small('responsavel:') + ' ' + tag(a) + '*', '');
  l.push('*' + small('data:') + ' ' + now() + '*');
  return box('👑', 'ALERTA DE PROMOCAO', l);
}
function rebaixamento(u, a) {
  const l = [small('o usuario') + ' ' + tag(u), small('deixou de ser adm.'), ''];
  if (a) l.push('*' + small('responsavel:') + ' ' + tag(a) + '*', '');
  l.push('*' + small('data:') + ' ' + now() + '*');
  return box('⚠️', 'ALERTA DE REBAIXAMENTO', l);
}
function cargoAtualizado(u, promovido) {
  return box('👑', 'CARGO ATUALIZADO', [small('pronto') + ' ' + tag(u) + small(','), '',
    small(promovido ? 'agora voce e administrador' : 'agora voce e membro comum'), small('do grupo.')]);
}
function idOf(p) { return typeof p === 'string' ? p : (p && p.id) || null; }
function attach(sock) {
  if (String(process.env.EVENT_STYLE || '').toLowerCase() === 'off') return;
  sock.ev.on('group-participants.update', async (u) => {
    try {
      if (!u || !u.id || !String(u.id).endsWith('@g.us')) return;
      if (u.action !== 'promote' && u.action !== 'demote') return;
      const author = u.author || null;
      for (const p of (u.participants || [])) {
        const jid = idOf(p); if (!jid) continue;
        const text = u.action === 'promote' ? promocao(jid, author) : rebaixamento(jid, author);
        await sock.sendMessage(u.id, { text, mentions: [jid].concat(author ? [author] : []) });
      }
    } catch (e) { console.error('[eventStyle promo]', e && e.message ? e.message : e); }
  });
  sock.ev.on('group.join-request', async (u) => {
    try {
      if (!u || !u.id || String(u.action) !== 'approved') return;
      const author = u.author || null;
      await sock.sendMessage(u.id, { text: aprovada(author), mentions: author ? [author] : [] });
    } catch (e) { console.error('[eventStyle join]', e && e.message ? e.message : e); }
  });
}
module.exports = { attach, aprovada, promocao, rebaixamento, cargoAtualizado, bold, small };
