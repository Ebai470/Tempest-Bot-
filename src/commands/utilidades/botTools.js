/**
 * listanegrab | reportbug | bugs | bugsdestino | resolvido | avaliar | avaliacoes
 * (usa services/botTools.js)
 */
const S = () => require('../../services/botTools');
const cfg = () => require('../../config');
const dg = (j) => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const argsOf = (ctx) => (Array.isArray(ctx.args) ? ctx.args : String(ctx.text || '').split(/\s+/)).filter(Boolean);
const quotedText = (ctx) => { const q = ctx.quoted || {}; return q.conversation || (q.extendedTextMessage && q.extendedTextMessage.text) || (q.imageMessage && q.imageMessage.caption) || ''; };

// seleção da lista de estrelas -> id "avl:N"
try {
  require('../../interactive/router').register('avl', async (ctx, rest) => {
    const n = parseInt(rest, 10); if (!(n >= 0 && n <= 5)) return;
    const s = S(); s.saveRating(dg(ctx.sender), n, ctx.jid);
    await ctx.reply('⭐ *Obrigado pela avaliação!*\n' + s.stars(n) + ' — *' + s.LABELS[n] + '* (' + n + '/5)', { mentions: [ctx.sender] });
  });
} catch (e) { console.error('[botTools] router:', e.message); }

module.exports = [
  {
    name: 'listanegrab', aliases: ['lnb', 'blacklistb', 'listanegra'], category: 'admin', ownerOnly: true,
    description: 'Lista Negra B: bane automaticamente em todos os grupos onde o bot e ADM',
    handler: async (ctx) => {
      const s = S(); const a = argsOf(ctx); const sub = String(a[0] || '').toLowerCase();
      if (sub === 'add' || sub === 'adicionar') {
        let num = '', lid = ''; const t = ctx.getMentionedOrQuoted && ctx.getMentionedOrQuoted();
        if (t) { if (/@lid$/.test(t)) lid = dg(t); else num = dg(t); if (ctx.senderPn && t === ctx.sender) num = dg(ctx.senderPn); }
        let rest = a.slice(1);
        if (!t) { num = dg(rest[0]); rest = rest.slice(1); } else rest = rest.filter((x) => !x.startsWith('@') && !/^\+?\d{6,}$/.test(x));
        if (num && (num.length < 8 || num.length > 15)) return ctx.reply('❌ Número inválido. Use com o código do país, ex: *listanegrab add 258871234567*');
        const r = s.addEntry({ num, lid, reason: rest.join(' '), by: dg(ctx.sender) });
        if (r.err) return ctx.reply('⚠️ ' + r.err);
        await ctx.reply('✅ Adicionado à *Lista Negra B*. A varrer os grupos onde sou ADM...');
        const res = await s.scanAll(ctx.sock);
        return ctx.reply('🚫 Varredura concluída: ' + res.groups + ' grupos verificados, *' + res.removed + '* removido(s).\nA partir de agora, se entrar em qualquer grupo onde eu seja ADM, é banido na hora.');
      }
      if (['remove', 'rem', 'del', 'remover'].includes(sub)) {
        const t = ctx.getMentionedOrQuoted && ctx.getMentionedOrQuoted(); const q = t ? dg(t) : dg(a[1]);
        if (!q) return ctx.reply('Use: *listanegrab remove numero*');
        return ctx.reply(s.removeEntry(q) ? '✅ Removido da Lista Negra B.' : '⚠️ Esse número não está na lista.');
      }
      if (sub === 'list' || sub === 'lista') {
        const l = s.listEntries(); if (!l.length) return ctx.reply('📋 *Lista Negra B* vazia.');
        return ctx.reply('🚫 *LISTA NEGRA B* (' + l.length + ')\n\n' + l.slice(0, 40).map((r, i) => (i + 1) + '. ' + (r.num ? '+' + r.num : 'ID ' + r.lid) + (r.reason ? ' — ' + r.reason : '')).join('\n'));
      }
      if (sub === 'scan' || sub === 'varrer') { const res = await s.scanAll(ctx.sock); return ctx.reply('🔎 ' + res.groups + ' grupos verificados, *' + res.removed + '* removido(s).'); }
      return ctx.reply('🚫 *LISTA NEGRA B*\n\n*listanegrab add 258871234567 [motivo]* (ou @marcar / responder)\n*listanegrab remove numero*\n*listanegrab list*\n*listanegrab scan*\n\n_Quem estiver na lista é banido na hora em qualquer grupo onde eu seja ADM._');
    }
  },
  {
    name: 'reportbug', aliases: ['reportarbug', 'bugreport', 'reportbot'], category: 'utilidades', groupOnly: true,
    description: 'Reportar um bug ao dono (gera um codigo)',
    handler: async (ctx) => {
      const s = S(); const text = argsOf(ctx).join(' ').trim();
      if (text.length < 10) return ctx.reply('🐞 *REPORTAR BUG*\n\nEscreva o problema depois do comando:\n*reportbug o menu de jogos não abre*\n\n_Mínimo 10 caracteres. Máx. 5 reports por dia._');
      if (text.length > 500) return ctx.reply('❌ Texto muito longo (máx. 500 caracteres).');
      let name = ''; try { name = (await ctx.sock.groupMetadata(ctx.jid)).subject || ''; } catch (_) {}
      const num = dg(ctx.senderPn || ctx.sender);
      const r = s.createReport({ reporter: ctx.sender, num, chat: ctx.jid, chatName: name, text });
      if (r.err) return ctx.reply('⏳ ' + r.err);
      const f = s.fmtDate(r.ts);
      const sent = await s.notifyOwner(ctx.sock, '🐞 *NOVO REPORT DE BUG*\n\n👤 Número: +' + num + '\n👥 Grupo: ' + (name || ctx.jid) + '\n📅 Data: ' + f.data + '\n🕒 Hora: ' + f.hora + '\n🔖 Código: *' + r.code + '*\n\n📝 Problema:\n' + text + '\n\n_Para avisar que foi resolvido:_ *resolvido ' + r.code + ' mensagem*');
      return ctx.reply('✅ *Report enviado!*\n🔖 Código: *' + r.code + '*\n' + (sent ? 'O dono já foi avisado.' : 'Ficou registado para o dono.') + ' Vou te marcar aqui quando for resolvido.', { mentions: [ctx.sender] });
    }
  },
  {
    name: 'bugsdestino', aliases: ['reportdestino'], category: 'admin', ownerOnly: true,
    description: 'Define o chat que recebe os reports (use no teu privado com o bot)',
    handler: async (ctx) => {
      const s = S(); const a = String(argsOf(ctx)[0] || '').toLowerCase();
      if (a === 'off') { s.destSet(''); return ctx.reply('⛔ Reports deixam de ser enviados a um chat (use *bugs* para ver).'); }
      s.destSet(ctx.jid); return ctx.reply('✅ Os reports de bug serão enviados *para este chat*.\n_Dica: use isto no privado com o bot. O bot só escreve num chat que tu já abriste._');
    }
  },
  {
    name: 'bugs', aliases: ['reports', 'listabugs'], category: 'admin', ownerOnly: true,
    description: 'Lista os reports de bug',
    handler: async (ctx) => {
      const s = S(); const all = String(argsOf(ctx)[0] || '').toLowerCase() === 'todos'; const l = s.listReports(all);
      if (!l.length) return ctx.reply(all ? '📭 Sem reports.' : '✅ Nenhum report em aberto.');
      return ctx.reply('🐞 *REPORTS' + (all ? '' : ' EM ABERTO') + '*\n\n' + l.map((r) => (r.status === 'open' ? '🔴' : '🟢') + ' *' + r.code + '* · +' + r.reporter_num + ' · ' + s.fmtDate(r.ts).data + '\n   ' + r.text.slice(0, 80)).join('\n\n') + '\n\n_resolvido CODIGO mensagem_');
    }
  },
  {
    name: 'resolvido', aliases: ['bugresolvido', 'resolverbug', 'resolvidobug'], category: 'admin', ownerOnly: true,
    description: 'Marca um bug como resolvido e avisa quem reportou',
    handler: async (ctx) => {
      const s = S(); let a = argsOf(ctx); let rep = a[0] ? s.getReport(a[0]) : null;
      if (rep) a = a.slice(1);
      else { const m = quotedText(ctx).match(/C[oó]digo:\s*\*?([A-Z0-9]{6})/i); if (m) rep = s.getReport(m[1]); }
      if (!rep) return ctx.reply('❌ Informe o código do report: *resolvido CODIGO problema resolvido!*\n(ou responda à mensagem do report). Veja os abertos com *bugs*.');
      if (rep.status !== 'open') return ctx.reply('⚠️ O report *' + rep.code + '* já estava resolvido.');
      const msg = a.join(' ').trim() || 'O problema que você reportou foi resolvido. Obrigado por avisar!';
      try { await ctx.sock.sendMessage(rep.chat, { text: '✅ *BUG RESOLVIDO*\n\n@' + dg(rep.reporter) + '\n\n' + msg + '\n\n🔖 Código: ' + rep.code, mentions: [rep.reporter] }); }
      catch (e) { return ctx.reply('❌ Não consegui avisar o grupo (talvez eu não esteja mais lá): ' + (e && e.message)); }
      s.closeReport(rep.code, msg); return ctx.reply('✅ Report *' + rep.code + '* resolvido e o grupo foi avisado.');
    }
  },
  {
    name: 'avaliar', aliases: ['avaliarbot', 'avalie', 'ratebot'], category: 'utilidades', groupOnly: true,
    description: 'Avaliar o bot de 0 a 5 estrelas',
    handler: async (ctx) => {
      const s = S(); const n = parseInt(argsOf(ctx)[0], 10);
      if (n >= 0 && n <= 5) { s.saveRating(dg(ctx.sender), n, ctx.jid); return ctx.reply('⭐ *Obrigado pela avaliação!*\n' + s.stars(n) + ' — *' + s.LABELS[n] + '* (' + n + '/5)', { mentions: [ctx.sender] }); }
      const fallback = '⭐ *AVALIE O BOT*\n\nEnvie: *avaliar 0-5*\n' + [5, 4, 3, 2, 1, 0].map((k) => s.stars(k) + ' ' + s.LABELS[k] + ' → avaliar ' + k).join('\n');
      try {
        const nf = require('../../interactive/nativeFlow');
        const rows = [5, 4, 3, 2, 1, 0].map((k) => ({ header: s.stars(k), title: s.LABELS[k], description: '', id: 'avl:' + k }));
        return await nf.sendNative(ctx.sock, ctx.jid, { body: 'Avalie o bot de 0-5', footer: '© TEMPEST BOT', buttons: [nf.btn.list('⟦ AVALIE ⟧', [{ title: 'Avalie o bot de 0-5', rows }])], quoted: ctx.msg, fallback });
      } catch (e) { return ctx.reply(fallback); }
    }
  },
  {
    name: 'avaliacoes', aliases: ['avaliacoesbot', 'ratings'], category: 'admin', ownerOnly: true,
    description: 'Ver as avaliacoes do bot',
    handler: async (ctx) => {
      const s = S(); const st = s.ratingStats(); if (!st.total) return ctx.reply('⭐ Ainda sem avaliações.');
      const bar = (n) => '█'.repeat(Math.round((n / st.total) * 10)).padEnd(10, '░');
      return ctx.reply('⭐ *AVALIAÇÕES DO BOT*\n\nMédia: *' + st.avg.toFixed(2) + '/5* (' + st.total + ' avaliações)\n\n' + [5, 4, 3, 2, 1, 0].map((k) => s.stars(k) + ' ' + bar(st.dist[k]) + ' ' + st.dist[k]).join('\n'));
    }
  }
];
