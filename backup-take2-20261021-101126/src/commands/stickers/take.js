let downloadContentFromMessage = null;
try { downloadContentFromMessage = require('@whiskeysockets/baileys').downloadContentFromMessage; } catch (_) {}
async function streamToBuffer(stream){const c=[];for await(const x of stream)c.push(x);return Buffer.concat(c);}
async function writeExif(webp, packname, author){
  const { Image } = require('node-webpmux');
  const img = new Image(); await img.load(webp);
  const json = {'sticker-pack-id':'tempest.take.'+Date.now()+'.'+Math.random().toString(36).slice(2,8),'sticker-pack-name':packname,'sticker-pack-publisher':author,emojis:['✨']};
  const jb = Buffer.from(JSON.stringify(json),'utf8');
  const head = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
  const len = Buffer.alloc(4); len.writeUInt32LE(jb.length,0);
  img.exif = Buffer.concat([head,len,jb]);
  const out = await img.save(null);
  return out && out.length > 100 ? out : null;
}
module.exports = [{
  name: 'take', aliases: ['renomear'], category: 'stickers',
  description: 'Renomeia a figurinha com o nome de quem fez o take',
  handler: async (ctx) => {
    const m = (ctx.msg && ctx.msg.message) || {};
    const ci = (m.extendedTextMessage && m.extendedTextMessage.contextInfo) || (m.imageMessage && m.imageMessage.contextInfo) || (m.videoMessage && m.videoMessage.contextInfo) || null;
    const q = ci && ci.quotedMessage;
    if (!q || !q.stickerMessage) return ctx.reply('❌ *Responda a uma figurinha* com *take*\nOu: *take Nome Personalizado*');
    if (!downloadContentFromMessage) return ctx.reply('❌ Biblioteca de mídia indisponível.');
    const custom = ((ctx.args && ctx.args.length) ? ctx.args.join(' ') : '').trim().slice(0,40);
    const nome = custom || String(ctx.pushName || (ctx.msg && ctx.msg.pushName) || '').trim() || 'TEMPEST';
    try {
      const buf = await streamToBuffer(await downloadContentFromMessage(q.stickerMessage,'sticker'));
      if (!buf || buf.length < 100) return ctx.reply('❌ Não consegui baixar a figurinha.');
      const out = await writeExif(buf, nome, nome);
      if (!out) return ctx.reply('❌ Não consegui renomear essa figurinha.');
      await ctx.sock.sendMessage(ctx.jid, { sticker: out }, { quoted: ctx.msg });
    } catch (e) { console.error('[take]', e && e.message ? e.message : e); await ctx.reply('❌ Erro no take.'); }
  }
}];
