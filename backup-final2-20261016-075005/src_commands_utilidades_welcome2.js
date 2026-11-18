'use strict';
const https = require('https');
const http = require('http');

let busy = false;
const last = new Map();

function fetchBuf(url, depth) {
  return new Promise((resolve, reject) => {
    const lib = String(url).startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (depth || 0) < 3) {
        res.resume(); return fetchBuf(res.headers.location, (depth || 0) + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const ch = []; res.on('data', (c) => ch.push(c)); res.on('end', () => resolve(Buffer.concat(ch)));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}
const numOf = (j) => String(j || '').split('@')[0].split(':')[0];

module.exports = {
  name: 'welcome2',
  aliases: ['boasvindas2', 'bemvindo2', 'wc2'],
  category: 'diversao',
  description: 'Gera o GIF de boas-vindas (foto, nome e grupo)',
  usage: '!welcome2 [@pessoa]',
  async handler(ctx) {
    const sock = ctx.sock;
    if (busy) return ctx.reply('⏳ Já estou gerando um vídeo. Aguarde alguns segundos.');
    const ck = ctx.jid;
    if (last.has(ck) && Date.now() - last.get(ck) < 15000) return ctx.reply('⏳ Aguarde alguns segundos para gerar outro.');
    busy = true;
    try {
      try { if (ctx.msg && ctx.msg.key) await sock.sendMessage(ctx.jid, { react: { text: '🎞️', key: ctx.msg.key } }); } catch (_) {}
      const { renderWelcome } = require('../../services/welcomeCard');
      const target = ctx.getMentionedOrQuoted() || ctx.sender;
      const num = numOf(target);
      let name = target === ctx.sender ? (ctx.msg && ctx.msg.pushName) : '';
      if (!name) name = '+' + num;
      let group = 'Tempest', count = 0;
      if (ctx.isGroup) {
        try {
          const meta = await sock.groupMetadata(ctx.jid);
          group = meta.subject || group;
          const parts = meta.participants || [];
          const idx = parts.findIndex((p) => [p.id, p.jid, p.phoneNumber, p.lid].some((x) => x && numOf(x) === num));
          count = idx >= 0 ? idx + 1 : parts.length;
        } catch (_) {}
      }
      let avatar = null;
      try { const url = await sock.profilePictureUrl(target, 'image'); if (url) avatar = await fetchBuf(url); } catch (_) {}
      const r = await renderWelcome({ avatar: avatar, name: name, group: group, count: count, seed: num });
      await sock.sendMessage(ctx.jid, {
        video: r.video, gifPlayback: true, mimetype: 'video/mp4',
        caption: '👋 Bem-vindo(a) @' + num + ' ao *' + group + '*!', mentions: [target]
      }, { quoted: ctx.msg });
      last.set(ck, Date.now());
    } catch (e) {
      await ctx.reply('❌ Não consegui gerar o vídeo.\n' + String((e && e.message) || e).slice(0, 160) + '\n\nConfira se o ffmpeg está instalado: pkg install ffmpeg');
    } finally { busy = false; }
  }
};
