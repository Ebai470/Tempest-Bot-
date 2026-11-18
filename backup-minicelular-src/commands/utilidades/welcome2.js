'use strict';
const svc = require('../../services/welcome2Auto');
const last = new Map();

module.exports = {
  name: 'welcome2',
  aliases: ['boasvindas2', 'bemvindo2', 'wc2'],
  category: 'diversao',
  description: 'GIF de boas-vindas (manual ou automatico: on/off)',
  usage: '!welcome2 [@pessoa]',
  async handler(ctx) {
    const sock = ctx.sock;
    const a = String((ctx.args && ctx.args[0]) || '').toLowerCase();
    if (a === 'on' || a === 'off' || a === 'status') {
      if (!ctx.isGroup) return ctx.reply('❌ Use este comando dentro de um grupo.');
      if (a === 'status') return ctx.reply(svc.isOn(ctx.jid) ? '✅ Boas-vindas automáticas (GIF): *ativadas* neste grupo.' : '⛔ Boas-vindas automáticas (GIF): *desativadas* neste grupo.\nUse *' + (ctx.prefix || '!') + 'welcome2 on* para ativar.');
      let ok = false;
      try { ok = !!((ctx.isOwner && ctx.isOwner()) || (await ctx.isGroupAdmin())); } catch (_) {}
      if (!ok) return ctx.reply('🚫 Só administradores podem ativar ou desativar as boas-vindas automáticas.');
      const was = svc.isOn(ctx.jid);
      if (a === 'on') {
        svc.setOn(ctx.jid, true);
        return ctx.reply(was ? 'ℹ️ As boas-vindas automáticas já estavam *ativadas* neste grupo.' : '✅ Boas-vindas automáticas *ativadas*!\nQuando alguém entrar, o bot envia o GIF sozinho.');
      }
      svc.setOn(ctx.jid, false);
      return ctx.reply(was ? '⛔ Boas-vindas automáticas *desativadas* neste grupo.' : 'ℹ️ As boas-vindas automáticas já estavam *desativadas* neste grupo.');
    }
    // geracao manual
    if (last.has(ctx.jid) && Date.now() - last.get(ctx.jid) < 15000) return ctx.reply('⏳ Aguarde alguns segundos para gerar outro.');
    last.set(ctx.jid, Date.now());
    try { if (ctx.msg && ctx.msg.key) await sock.sendMessage(ctx.jid, { react: { text: '🎞️', key: ctx.msg.key } }); } catch (_) {}
    try {
      const target = ctx.getMentionedOrQuoted() || ctx.sender;
      const name = target === ctx.sender ? (ctx.msg && ctx.msg.pushName) : '';
      await svc.run(() => svc.sendWelcome(sock, ctx.jid, target, { name: name }, ctx.msg));
    } catch (e) {
      await ctx.reply('❌ Não consegui gerar o vídeo.\n' + String((e && e.message) || e).slice(0, 160) + '\n\nConfira se o ffmpeg está instalado: pkg install ffmpeg');
    }
  }
};
