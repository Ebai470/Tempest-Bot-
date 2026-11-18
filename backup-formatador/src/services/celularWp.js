'use strict';
const baileys = require('@whiskeysockets/baileys');
function findImage(ctx) {
  const m = (ctx.msg && ctx.msg.message) || {};
  const ci = (m.extendedTextMessage && m.extendedTextMessage.contextInfo) || (m.imageMessage && m.imageMessage.contextInfo) || null;
  const q = ci && ci.quotedMessage;
  return (q && q.imageMessage) || m.imageMessage || null;
}
async function toDataUri(buf) {
  const Jimp = require('jimp');
  const img = await Jimp.read(buf);
  img.cover(320, 690);
  let q = 60, out;
  do { out = await img.quality(q).getBufferAsync(Jimp.MIME_JPEG); q -= 10; } while (out.length > 45000 && q >= 20);
  return 'data:image/jpeg;base64,' + out.toString('base64');
}
function inject(html, uri) {
  return html.replace('<!--WPIMG-->', () => '<script>window.WPIMG="' + uri + '";</script>');
}
async function html(ctx, base) {
  try {
    const node = findImage(ctx);
    if (!node) return base;
    if (Number(node.fileLength || 0) > 15 * 1024 * 1024) return base;
    const stream = await baileys.downloadContentFromMessage(node, 'image');
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return inject(base, await toDataUri(Buffer.concat(chunks)));
  } catch (e) {
    console.error('[CELULAR-WP]', e && e.message);
    return base;
  }
}
module.exports = { html, toDataUri, inject };
