/**
 * 40 efeitos de imagem (Jimp, sem APIs externas): responda a uma foto/sticker com o comando.
 */
let downloadMediaMessage = null;
try { downloadMediaMessage = require('@whiskeysockets/baileys').downloadMediaMessage; } catch (_) {}
let Jimp = null;
try { Jimp = require('jimp'); } catch (_) {}

async function getImageBuffer(ctx) {
  const msg = ctx.msg;
  const ci = msg.message && msg.message.extendedTextMessage && msg.message.extendedTextMessage.contextInfo;
  const quoted = ci && ci.quotedMessage;
  let target = msg;
  if (quoted && (quoted.imageMessage || quoted.stickerMessage)) {
    target = { key: { remoteJid: ctx.jid, id: ci.stanzaId, participant: ci.participant }, message: quoted };
  }
  if (!target.message || !(target.message.imageMessage || target.message.stickerMessage)) return null;
  try {
    if (!downloadMediaMessage) return null;
    return await downloadMediaMessage(target, 'buffer', {}, { logger: console, reuploadRequest: ctx.sock.updateMediaMessage });
  } catch (_) { return null; }
}

// ---------- utilitarios de pixel ----------
const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function map(img, fn) { const b = img.bitmap, d = b.data; for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) { const i = (y * b.width + x) * 4; const o = fn(d[i], d[i + 1], d[i + 2], x, y, b.width, b.height); d[i] = cl(o[0]); d[i + 1] = cl(o[1]); d[i + 2] = cl(o[2]); } return img; }
function grad(stops, t) { t = Math.max(0, Math.min(1, t)) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(t)), f = t - i; const a = stops[i], b = stops[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
function convolve(img, k, div, bias) {
  const b = img.bitmap, w = b.width, h = b.height, src = Buffer.from(b.data), d = b.data;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    let r = 0, g = 0, bl = 0, n = 0;
    for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++) { const j = ((y + ky) * w + (x + kx)) * 4, kv = k[n++]; r += src[j] * kv; g += src[j + 1] * kv; bl += src[j + 2] * kv; }
    const i = (y * w + x) * 4; d[i] = cl(r / div + bias); d[i + 1] = cl(g / div + bias); d[i + 2] = cl(bl / div + bias);
  }
  return img;
}
function sobel(img) { // devolve mapa de magnitude (Float32Array) da luminancia
  const b = img.bitmap, w = b.width, h = b.height, d = b.data, L = new Float32Array(w * h), M = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const p = y * w + x;
    const gx = -L[p - w - 1] - 2 * L[p - 1] - L[p + w - 1] + L[p - w + 1] + 2 * L[p + 1] + L[p + w + 1];
    const gy = -L[p - w - 1] - 2 * L[p - w] - L[p - w + 1] + L[p + w - 1] + 2 * L[p + w] + L[p + w + 1];
    M[p] = Math.sqrt(gx * gx + gy * gy);
  }
  return M;
}
function blockAvg(img, size) {
  const b = img.bitmap, w = b.width, h = b.height, d = b.data;
  for (let by = 0; by < h; by += size) for (let bx = 0; bx < w; bx += size) {
    let r = 0, g = 0, bl = 0, n = 0;
    for (let y = by; y < Math.min(h, by + size); y++) for (let x = bx; x < Math.min(w, bx + size); x++) { const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++; }
    r /= n; g /= n; bl /= n;
    for (let y = by; y < Math.min(h, by + size); y++) for (let x = bx; x < Math.min(w, bx + size); x++) { const i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = bl; }
  }
  return img;
}
function vignette(img, strength) { return map(img, (r, g, b, x, y, w, h) => { const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2); const f = 1 - Math.min(1, (dx * dx + dy * dy) / 2) * strength; return [r * f, g * f, b * f]; }); }
function grain(img, amt, seed) { const r = rng(seed || 7); return map(img, (R, G, B) => { const n = (r() - 0.5) * amt; return [R + n, G + n, B + n]; }); }
function posterize(img, levels) { const s = 255 / (levels - 1); return map(img, (r, g, b) => [Math.round(r / s) * s, Math.round(g / s) * s, Math.round(b / s) * s]); }
function sepiaPx(r, g, b) { return [0.393 * r + 0.769 * g + 0.189 * b, 0.349 * r + 0.686 * g + 0.168 * b, 0.272 * r + 0.534 * g + 0.131 * b]; }
function mirrorX(img) { const b = img.bitmap, w = b.width, d = b.data; for (let y = 0; y < b.height; y++) for (let x = 0; x < w / 2; x++) { const i = (y * w + x) * 4, j = (y * w + (w - 1 - x)) * 4; d[j] = d[i]; d[j + 1] = d[i + 1]; d[j + 2] = d[i + 2]; } return img; }
function mirrorY(img) { const b = img.bitmap, w = b.width, h = b.height, d = b.data; for (let y = 0; y < h / 2; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, j = ((h - 1 - y) * w + x) * 4; d[j] = d[i]; d[j + 1] = d[i + 1]; d[j + 2] = d[i + 2]; } return img; }
const THERMAL = [[0, 0, 80], [0, 90, 255], [0, 220, 220], [60, 220, 60], [250, 230, 0], [255, 120, 0], [255, 20, 20], [255, 255, 255]];

// ---------- os 40 efeitos ----------
const FX = [
  ['sepia', [], 'Tom sépia antigo', (i) => map(i, (r, g, b) => sepiaPx(r, g, b))],
  ['solarizar', [], 'Solarização (inverte os tons claros)', (i) => map(i, (r, g, b) => [r > 128 ? 255 - r : r, g > 128 ? 255 - g : g, b > 128 ? 255 - b : b])],
  ['posterizar', ['poster'], 'Poucas cores, estilo cartaz', (i) => posterize(i, 4)],
  ['vinheta', ['vignette'], 'Cantos escurecidos', (i) => vignette(i, 0.9)],
  ['nitidez', ['sharpen'], 'Mais nitidez', (i) => convolve(i, [0, -1, 0, -1, 5, -1, 0, -1, 0], 1, 0)],
  ['relevo', ['emboss'], 'Efeito de relevo', (i) => { convolve(map(i, (r, g, b) => { const l = lum(r, g, b); return [l, l, l]; }), [-2, -1, 0, -1, 1, 1, 0, 1, 2], 1, 128); return i; }],
  ['bordas', ['edges'], 'Contornos brancos em fundo preto', (i) => { const M = sobel(i), d = i.bitmap.data; for (let p = 0; p < M.length; p++) { const v = cl(M[p] * 1.2); d[p * 4] = v; d[p * 4 + 1] = v; d[p * 4 + 2] = v; } return i; }],
  ['esboco', ['sketch', 'lapis'], 'Desenho a lápis', (i) => { const g = map(i.clone(), (r, g2, b) => { const l = lum(r, g2, b); return [l, l, l]; }); const inv = g.clone(); map(inv, (r) => [255 - r, 255 - r, 255 - r]); inv.blur(6); const d = i.bitmap.data, a = g.bitmap.data, bl = inv.bitmap.data; for (let p = 0; p < d.length; p += 4) { const v = bl[p] >= 255 ? 255 : cl((a[p] * 255) / (255 - bl[p])); d[p] = d[p + 1] = d[p + 2] = v; } return i; }],
  ['quadrinhos', ['comic'], 'Estilo banda desenhada', (i) => { const M = sobel(i.clone()); posterize(i, 5); map(i, (r, g, b) => { const l = lum(r, g, b); return [l + (r - l) * 1.5, l + (g - l) * 1.5, l + (b - l) * 1.5]; }); const d = i.bitmap.data; for (let p = 0; p < M.length; p++) if (M[p] > 110) { d[p * 4] = 0; d[p * 4 + 1] = 0; d[p * 4 + 2] = 0; } return i; }],
  ['termico', ['thermal'], 'Câmara térmica', (i) => map(i, (r, g, b) => grad(THERMAL, lum(r, g, b) / 255))],
  ['neon', [], 'Contornos néon', (i) => { const M = sobel(i.clone()), b = i.bitmap, d = b.data; for (let y = 0; y < b.height; y++) for (let x = 0; x < b.width; x++) { const p = y * b.width + x, e = Math.min(1, M[p] / 160), hue = ((x + y) / (b.width + b.height)) * 6.28; const c = [127 + 127 * Math.sin(hue), 127 + 127 * Math.sin(hue + 2.09), 127 + 127 * Math.sin(hue + 4.18)]; d[p * 4] = cl(d[p * 4] * 0.12 + c[0] * e); d[p * 4 + 1] = cl(d[p * 4 + 1] * 0.12 + c[1] * e); d[p * 4 + 2] = cl(d[p * 4 + 2] * 0.12 + c[2] * e); } return i; }],
  ['vaporwave', ['vapor'], 'Estilo vaporwave rosa e ciano', (i) => map(i, (r, g, b) => grad([[40, 10, 100], [190, 60, 190], [255, 120, 200], [120, 245, 255]], lum(r, g, b) / 255))],
  ['falhadigital', ['glitchfx'], 'Falha digital (glitch)', (i) => { const b = i.bitmap, w = b.width, h = b.height, src = Buffer.from(b.data), d = b.data, r = rng(w * 31 + h); for (let n = 0; n < 12; n++) { const y0 = Math.floor(r() * h), hh = 3 + Math.floor(r() * h * 0.06), sh = Math.floor((r() - 0.5) * w * 0.12); for (let y = y0; y < Math.min(h, y0 + hh); y++) for (let x = 0; x < w; x++) { const sx = Math.min(w - 1, Math.max(0, x + sh)), p = (y * w + x) * 4, q = (y * w + sx) * 4; d[p] = src[q]; d[p + 1] = src[q + 1]; d[p + 2] = src[q + 2]; } } const off = Math.max(3, Math.round(w / 90)), cp = Buffer.from(d); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = (y * w + x) * 4; d[p] = cp[(y * w + Math.max(0, x - off)) * 4]; d[p + 2] = cp[(y * w + Math.min(w - 1, x + off)) * 4 + 2]; } return i; }],
  ['rgbsplit', ['aberracao'], 'Aberração cromática (RGB separado)', (i) => { const b = i.bitmap, w = b.width, h = b.height, src = Buffer.from(b.data), d = b.data, off = Math.max(3, Math.round(w / 100)); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = (y * w + x) * 4; d[p] = src[(y * w + Math.max(0, x - off)) * 4]; d[p + 2] = src[(y * w + Math.min(w - 1, x + off)) * 4 + 2]; } return i; }],
  ['tvantiga', ['crt'], 'TV antiga com linhas', (i) => { map(i, (r, g, b, x, y) => { const f = y % 3 === 0 ? 0.55 : 1; return [r * f, g * f * 1.04, b * f]; }); grain(i, 28, 5); return vignette(i, 0.6); }],
  ['ruido', ['grain'], 'Grão de filme', (i) => grain(i, 60, 9)],
  ['mosaico', ['mosaic'], 'Mosaico de blocos grandes', (i) => blockAvg(i, Math.max(8, Math.round(Math.max(i.bitmap.width, i.bitmap.height) / 22)))],
  ['pixelart', [], 'Arte em pixels', (i) => posterize(blockAvg(i, Math.max(5, Math.round(i.bitmap.width / 80))), 6)],
  ['duotom', ['duotone'], 'Duas cores: roxo e laranja', (i) => map(i, (r, g, b) => grad([[27, 11, 58], [190, 60, 120], [255, 179, 71]], lum(r, g, b) / 255))],
  ['tomfrio', ['cold'], 'Tom frio azulado', (i) => map(i, (r, g, b) => [r * 0.85, g * 0.98, b * 1.18 + 8])],
  ['tomquente', ['warm'], 'Tom quente alaranjado', (i) => map(i, (r, g, b) => [r * 1.15 + 8, g * 1.02, b * 0.82])],
  ['canalvermelho', ['soredvermelho'], 'Só o canal vermelho', (i) => map(i, (r) => [r, 0, 0])],
  ['canalverde', [], 'Só o canal verde', (i) => map(i, (r, g) => [0, g, 0])],
  ['canalazul', [], 'Só o canal azul', (i) => map(i, (r, g, b) => [0, 0, b])],
  ['limiar', ['threshold'], 'Preto e branco puro', (i) => map(i, (r, g, b) => { const v = lum(r, g, b) > 128 ? 255 : 0; return [v, v, v]; })],
  ['redondo', ['circulo'], 'Recorte em círculo', (i) => { const b = i.bitmap, s = Math.min(b.width, b.height); i.crop(Math.floor((b.width - s) / 2), Math.floor((b.height - s) / 2), s, s); const d = i.bitmap.data, c = s / 2; for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) if ((x - c) * (x - c) + (y - c) * (y - c) > c * c) { const p = (y * s + x) * 4; d[p] = d[p + 1] = d[p + 2] = 255; } return i; }],
  ['polaroid', [], 'Moldura de foto instantânea', (i) => { const b = i.bitmap, pad = Math.round(Math.max(b.width, b.height) * 0.05), W = b.width + pad * 2, H = b.height + pad * 2 + Math.round(pad * 2.6); const c = new Jimp(W, H, 0xf7f4efff); c.composite(i, pad, pad); return c; }],
  ['moldura', ['borda'], 'Moldura roxa', (i) => { const b = i.bitmap, p = Math.round(Math.max(b.width, b.height) * 0.04); const c = new Jimp(b.width + p * 2, b.height + p * 2, 0x7c3aedff); const inner = new Jimp(b.width + Math.round(p * 0.5), b.height + Math.round(p * 0.5), 0xffffffff); c.composite(inner, p - Math.round(p * 0.25), p - Math.round(p * 0.25)); c.composite(i, p, p); return c; }],
  ['espelhoh', ['espelhodir'], 'Espelha a metade esquerda', (i) => mirrorX(i)],
  ['espelhov', ['espelhobaixo'], 'Espelha a metade de cima', (i) => mirrorY(i)],
  ['caleidoscopio', ['kaleido'], 'Efeito caleidoscópio', (i) => mirrorY(mirrorX(i))],
  ['zoom', ['ampliar'], 'Amplia o centro (2x)', (i) => { const b = i.bitmap, w = b.width, h = b.height; i.crop(Math.floor(w / 4), Math.floor(h / 4), Math.floor(w / 2), Math.floor(h / 2)); i.resize(w, h); return i; }],
  ['esticar', ['largo'], 'Estica na largura', (i) => { i.resize(Math.min(1600, Math.round(i.bitmap.width * 1.6)), i.bitmap.height); return i; }],
  ['estreitar', ['fino'], 'Estreita na largura', (i) => { i.resize(Math.round(i.bitmap.width * 0.6), i.bitmap.height); return i; }],
  ['brilho', ['clarear'], 'Mais brilho', (i) => map(i, (r, g, b) => [r * 1.25 + 12, g * 1.25 + 12, b * 1.25 + 12])],
  ['escurecer', ['dark'], 'Imagem mais escura', (i) => map(i, (r, g, b) => [r * 0.62, g * 0.62, b * 0.62])],
  ['contraste', ['contrast'], 'Mais contraste', (i) => map(i, (r, g, b) => [(r - 128) * 1.45 + 128, (g - 128) * 1.45 + 128, (b - 128) * 1.45 + 128])],
  ['saturar', ['vivo'], 'Cores mais vivas', (i) => map(i, (r, g, b) => { const l = lum(r, g, b); return [l + (r - l) * 1.9, l + (g - l) * 1.9, l + (b - l) * 1.9]; })],
  ['pastel', [], 'Cores suaves em pastel', (i) => map(i, (r, g, b) => { const l = lum(r, g, b); return [(l + (r - l) * 0.6) * 0.72 + 70, (l + (g - l) * 0.6) * 0.72 + 70, (l + (b - l) * 0.6) * 0.72 + 70]; })],
  ['vintage', ['retro'], 'Filme antigo desbotado', (i) => { map(i, (r, g, b) => { const s = sepiaPx(r, g, b); return [(r * 0.4 + s[0] * 0.6) * 0.86 + 26, (g * 0.4 + s[1] * 0.6) * 0.86 + 22, (b * 0.4 + s[2] * 0.6) * 0.86 + 16]; }); grain(i, 30, 3); return vignette(i, 0.7); }]
];

function build() {
  return FX.map((f) => ({
    name: f[0],
    aliases: f[1],
    category: 'imagem',
    description: f[2],
    usage: f[0] + ' (responda a uma imagem)',
    handler: async (ctx) => {
      if (!Jimp) return ctx.reply('❌ Sem processador de imagem.\nnpm install jimp --legacy-peer-deps');
      const buf = await getImageBuffer(ctx);
      if (!buf) return ctx.reply('🖼️ `• ' + f[0].toUpperCase() + '`\n\n> Envie ou responda a uma *imagem* com *!' + f[0] + '*\n> ' + f[2]);
      try {
        let img = await Jimp.read(buf);
        if (Math.max(img.bitmap.width, img.bitmap.height) > 1024) img.scaleToFit(1024, 1024);
        const out = f[3](img) || img;
        const png = await out.quality(86).getBufferAsync(Jimp.MIME_JPEG);
        await ctx.sock.sendMessage(ctx.jid, { image: png, caption: '✨ ' + f[0][0].toUpperCase() + f[0].slice(1) }, { quoted: ctx.msg });
      } catch (e) {
        console.error('[efeito ' + f[0] + ']', e && e.message);
        await ctx.reply('❌ Não consegui aplicar o efeito. Tenta outra imagem.');
      }
    }
  }));
}

const cmds = build();
cmds.FX = FX;
cmds.__setDownloader = (fn) => { downloadMediaMessage = fn; };
// texto do menu de imagem (lista tudo o que esta registado na categoria)
cmds.menuText = function (ctx, media) {
  const registry = require('../registry');
  const list = registry.getByCategory('imagem').filter((c) => c.name !== 'imagemmenu').map((c) => c.name).sort();
  const prefix = (ctx && ctx.prefix) || '!';
  return '🖼️ `• MENU IMAGEM`\n\n' +
    '> Responda a uma foto com o comando.\n> ' + list.length + ' efeitos disponíveis' + (media && media.engineName ? ' (motor: ' + media.engineName() + ')' : '') + '\n\n' +
    list.map((n) => prefix + n).join('  •  ');
};
module.exports = cmds;
