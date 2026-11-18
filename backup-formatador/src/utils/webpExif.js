'use strict';
function u24(b, o) { return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16); }
function w24(b, o, v) { b[o] = v & 255; b[o + 1] = (v >> 8) & 255; b[o + 2] = (v >> 16) & 255; }
function chunk(fourcc, payload) {
  const pad = payload.length % 2;
  const out = Buffer.alloc(8 + payload.length + pad);
  out.write(fourcc, 0, 'ascii'); out.writeUInt32LE(payload.length, 4); payload.copy(out, 8);
  return out;
}
function isWebp(b) { return Buffer.isBuffer(b) && b.length > 20 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'; }
function parseChunks(b) {
  const list = []; let o = 12;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4);
    if (o + 8 + sz > b.length) throw new Error('webp truncado');
    list.push({ id: id, data: b.slice(o + 8, o + 8 + sz) });
    o += 8 + sz + (sz % 2);
  }
  return list;
}
function buildExif(meta) {
  const json = Buffer.from(JSON.stringify(meta), 'utf8');
  const head = Buffer.from([0x49,0x49,0x2A,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
  const out = Buffer.concat([head, json]); out.writeUInt32LE(json.length, 14); // tamanho do JSON vai no offset 14 (formato WhatsApp)
  return out;
}
function setExif(webp, exif) {
  if (!isWebp(webp)) throw new Error('nao e webp');
  let chunks = parseChunks(webp).filter((c) => c.id !== 'EXIF');
  const first = chunks[0];
  if (!first) throw new Error('webp vazio');
  if (first.id === 'VP8X') {
    const d = Buffer.from(first.data); d[0] |= 0x08; first.data = d;
  } else {
    let w, h, alpha = 0;
    if (first.id === 'VP8 ') {
      const d = first.data;
      if (d.length < 10 || d[3] !== 0x9d || d[4] !== 0x01 || d[5] !== 0x2a) throw new Error('VP8 invalido');
      w = d.readUInt16LE(6) & 0x3fff; h = d.readUInt16LE(8) & 0x3fff;
    } else if (first.id === 'VP8L') {
      const d = first.data;
      if (d.length < 5 || d[0] !== 0x2f) throw new Error('VP8L invalido');
      const bits = d.readUInt32LE(1);
      w = (bits & 0x3fff) + 1; h = ((bits >> 14) & 0x3fff) + 1; alpha = (bits >> 28) & 1;
    } else throw new Error('formato webp nao suportado: ' + first.id);
    const x = Buffer.alloc(10);
    x[0] = 0x08 | (alpha ? 0x10 : 0);
    w24(x, 4, w - 1); w24(x, 7, h - 1);
    chunks.unshift({ id: 'VP8X', data: x });
  }
  chunks.push({ id: 'EXIF', data: exif });
  const body = Buffer.concat(chunks.map((c) => chunk(c.id, c.data)));
  const out = Buffer.alloc(12 + body.length);
  out.write('RIFF', 0, 'ascii'); out.writeUInt32LE(4 + body.length, 4); out.write('WEBP', 8, 'ascii');
  body.copy(out, 12);
  return out;
}
function stickerMeta(webp, packname, author) {
  return setExif(webp, buildExif({
    'sticker-pack-id': 'tempest.take.' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    'sticker-pack-name': packname, 'sticker-pack-publisher': author, emojis: ['✨']
  }));
}
module.exports = { isWebp, setExif, buildExif, stickerMeta };
