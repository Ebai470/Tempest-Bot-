'use strict';
const MAX_TARGETS = 10;
const digits = (j) => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');

module.exports = [{
  name: 'ban2',
  aliases: [],
  category: 'admin',
  description: 'Remove vários membros de uma vez (máx. 10): ban2 @user @user ...',
  usage: '!ban2 @user @user @user',
  groupOnly: true,
  adminOnly: true,
  handler: async (ctx) => {
    if (!ctx.isGroup) return ctx.reply('❌ Apenas em grupos.');
    const okAdmin = (await ctx.isGroupAdmin()) || ctx.isOwner() || ctx.isBotAdmin();
    if (!okAdmin) return ctx.reply('❌ Apenas administradores.');
    const found = [];
    for (const j of (ctx.mentioned || [])) found.push(j);
    const args = ctx.args || [];
    for (const a of args) { if (/^@?\+?\d{8,15}$/.test(a)) found.push(a.replace(/\D/g, '') + '@s.whatsapp.net'); }
    if (!found.length) {
      try { const q = ctx.getMentionedOrQuoted(); if (q) found.push(q); } catch (_) {}
    }
    if (!found.length) return ctx.reply('❌ Marque quem quer banir.\nEx: *' + (ctx.prefix || '!') + 'ban2 @user @user @user* (máx. ' + MAX_TARGETS + ')');
    const seen = new Set(), unique = [];
    for (const j of found) { const d = digits(j); if (d && !seen.has(d)) { seen.add(d); unique.push(j); } }
    if (unique.length > MAX_TARGETS) {
      return ctx.reply('❌ Máximo de *' + MAX_TARGETS + '* pessoas por vez (marcou ' + unique.length + ').');
    }
    let meta = null;
    try { meta = await ctx.sock.groupMetadata(ctx.jid); } catch (_) {}
    if (!meta || !Array.isArray(meta.participants)) return ctx.reply('❌ Não consegui ler os membros do grupo. Tente de novo.');
    const meIds = [ctx.sock.user && ctx.sock.user.id, ctx.sock.user && ctx.sock.user.lid].map(digits).filter(Boolean);
    const senderIds = [ctx.sender, ctx.senderPn].map(digits).filter(Boolean);
    const config = require('../../config');
    const toRemove = [], skipped = [];
    for (const j of unique) {
      const d = digits(j);
      const p = meta.participants.find((x) => [x.id, x.jid, x.lid, x.phoneNumber, x.participantPn].some((v) => digits(v) === d));
      if (!p) { skipped.push({ jid: j, why: 'não está no grupo' }); continue; }
      if (meIds.includes(d) || meIds.includes(digits(p.id))) { skipped.push({ jid: p.id, why: 'sou eu' }); continue; }
      if (senderIds.includes(d) || senderIds.includes(digits(p.id))) { skipped.push({ jid: p.id, why: 'é você' }); continue; }
      let isOwner = false; try { isOwner = config.isOwner(p.id) || config.isOwner(p.jid) || config.isOwner(p.phoneNumber); } catch (_) {}
      if (isOwner) { skipped.push({ jid: p.id, why: 'é o dono do bot' }); continue; }
      if (p.admin === 'admin' || p.admin === 'superadmin') { skipped.push({ jid: p.id, why: 'é admin (rebaixe primeiro)' }); continue; }
      toRemove.push(p.id);
    }
    const removed = [], failed = [];
    if (toRemove.length) {
      let results = null;
      try { results = await ctx.sock.groupParticipantsUpdate(ctx.jid, toRemove, 'remove'); } catch (_) { results = null; }
      if (Array.isArray(results) && results.length) {
        for (const id of toRemove) {
          const r = results.find((x) => digits(x.jid || x.id) === digits(id));
          if (!r || String(r.status) === '200') removed.push(id); else failed.push({ jid: id, why: 'status ' + r.status });
        }
      } else {
        for (const id of toRemove) {
          try { await ctx.sock.groupParticipantsUpdate(ctx.jid, [id], 'remove'); removed.push(id); }
          catch (_) { failed.push({ jid: id, why: 'falhou (o bot é admin?)' }); }
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }
    const tag = (j) => '@' + String(j).split('@')[0].split(':')[0];
    const reason = args.filter((a) => !/^@/.test(a) && !/^\+?\d{8,15}$/.test(a)).join(' ').trim();
    const lines = [];
    if (removed.length) {
      lines.push('🔨 *BAN MÚLTIPLO* — ' + removed.length + ' removido(s):');
      for (const j of removed) lines.push('🚫 ' + tag(j));
    } else {
      lines.push('⚠️ Ninguém foi removido.');
    }
    if (reason && removed.length) lines.push('📝 Motivo: *' + reason.slice(0, 120) + '*');
    for (const s of skipped.concat(failed)) lines.push('⚠️ ' + tag(s.jid) + ' — ' + s.why);
    const mentions = removed.concat(skipped.map((s) => s.jid), failed.map((s) => s.jid));
    return ctx.reply(lines.join('\n'), { mentions: mentions });
  }
}];
