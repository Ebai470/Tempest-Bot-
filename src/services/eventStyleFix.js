'use strict';
function install(es) {
  const small = es.small;
  const bold = es.bold;
  const noted = new Map();

  function num(j) { return String(j || '').split('@')[0].split(':')[0]; }
  function tag(j) { return '@' + num(j); }
  function idOf(p) { return typeof p === 'string' ? p : (p && p.id) || null; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function now() {
    const d = new Date();
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function box(emoji, title, lines) {
    const out = ['• ' + emoji + ' ' + bold(title), ''];
    lines.forEach((l) => out.push(l === '' ? '┃' : '┃ ' + l));
    return out.join('\n');
  }

  es.noteActor = function (group, target, actor) {
    if (!group || !actor) return;
    noted.set(group + '|' + num(target), { actor: actor, ts: Date.now() });
    noted.set(group + '|last', { actor: actor, ts: Date.now() });
  };
  function lookup(group, participant) {
    const exact = noted.get(group + '|' + num(participant));
    if (exact && Date.now() - exact.ts < 60000) return exact.actor;
    const last = noted.get(group + '|last');
    if (last && Date.now() - last.ts < 30000) return last.actor;
    return null;
  }

  es.promocao = function (u, a) {
    const l = [small('o usuario') + ' ' + tag(u), small('foi promovido a adm.'), ''];
    if (a) l.push(small('responsavel:') + ' ' + tag(a), '');
    l.push('*' + small('data:') + ' ' + now() + '*');
    return box('👑', 'ALERTA DE PROMOCAO', l);
  };
  es.rebaixamento = function (u, a) {
    const l = [small('o usuario') + ' ' + tag(u), small('deixou de ser adm.'), ''];
    if (a) l.push(small('responsavel:') + ' ' + tag(a), '');
    l.push('*' + small('data:') + ' ' + now() + '*');
    return box('⚠️', 'ALERTA DE REBAIXAMENTO', l);
  };
  es.aprovada = function (a) {
    const l = [small('uma solicitacao de entrada'), small('foi aprovada.'), ''];
    if (a) l.push(small('aprovada por:') + ' ' + tag(a), '');
    l.push('*' + small('data:') + ' ' + now() + '*');
    return box('✅', 'SOLICITACAO APROVADA', l);
  };

  es.attach = function (sock) {
    if (String(process.env.EVENT_STYLE || '').toLowerCase() === 'off') return;
    const modes = require('./modes');
    const meIds = () => {
      const u = sock.user || {};
      return [num(u.id), num(u.lid)].filter(Boolean);
    };
    const isMe = (j) => !!j && meIds().indexOf(num(j)) >= 0;

    sock.ev.on('group-participants.update', async (u) => {
      try {
        if (!u || !u.id || !String(u.id).endsWith('@g.us')) return;
        if (u.action !== 'promote' && u.action !== 'demote') return;
        if (!modes.notifOn(u.id)) return;
        for (const p of (u.participants || [])) {
          const jid = idOf(p);
          if (!jid) continue;
          let author = u.author || null;
          if (isMe(author)) author = lookup(u.id, jid);
          const text = u.action === 'promote' ? es.promocao(jid, author) : es.rebaixamento(jid, author);
          await sock.sendMessage(u.id, { text: text, mentions: [jid].concat(author ? [author] : []) });
        }
      } catch (e) { console.error('[eventStyle promo]', e && e.message ? e.message : e); }
    });

    sock.ev.on('group.join-request', async (u) => {
      try {
        if (!u || !u.id || String(u.action) !== 'approved') return;
        if (!modes.notifOn(u.id)) return;
        let author = u.author || null;
        if (isMe(author)) author = null;
        await sock.sendMessage(u.id, { text: es.aprovada(author), mentions: author ? [author] : [] });
      } catch (e) { console.error('[eventStyle join]', e && e.message ? e.message : e); }
    });
  };
}

module.exports = { install };
