'use strict';
/**
 * welcomeRender — desenha os banners de boas-vindas (sistemas 5 e 6).
 * Usa apenas o Jimp que o projeto já tem (fontes Open Sans embutidas).
 * Nunca altera ficheiros: trabalha sempre numa cópia em memória.
 */
const Jimp = require('jimp');

// 10 combinações: texto (fill), contorno (stroke), destaque (accent) e fundo (bgA→bgB, usado no banner automático)
const PALETTES = [
  { fill: '#FFFFFF', stroke: '#000000', accent: '#FFD84D', bgA: '#0F2027', bgB: '#2C5364' },
  { fill: '#FFF0B3', stroke: '#2B1B00', accent: '#FFFFFF', bgA: '#3A1C71', bgB: '#D76D77' },
  { fill: '#C9F6FF', stroke: '#06223A', accent: '#FFFFFF', bgA: '#093028', bgB: '#237A57' },
  { fill: '#FFD6EA', stroke: '#3A0A24', accent: '#FFFFFF', bgA: '#41295A', bgB: '#2F0743' },
  { fill: '#D4FFE3', stroke: '#06301A', accent: '#FFF3B0', bgA: '#134E5E', bgB: '#71B280' },
  { fill: '#FFE0C2', stroke: '#2A1200', accent: '#FFFFFF', bgA: '#42275A', bgB: '#734B6D' },
  { fill: '#E9DEFF', stroke: '#190B3A', accent: '#FFE7A3', bgA: '#1F1C2C', bgB: '#928DAB' },
  { fill: '#FFF6CC', stroke: '#000000', accent: '#FFFFFF', bgA: '#141E30', bgB: '#243B55' },
  { fill: '#FFD2CB', stroke: '#3A0A08', accent: '#FFFFFF', bgA: '#232526', bgB: '#414345' },
  { fill: '#F2F8FF', stroke: '#0B1B2B', accent: '#9BE7FF', bgA: '#0B486B', bgB: '#F56217' }
];

const fontCache = {};
async function loadFont(size) {
  const k = 'FONT_SANS_' + size + '_WHITE';
  if (!fontCache[k]) fontCache[k] = Jimp.loadFont(Jimp[k]);
  return fontCache[k];
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function hexToInt(hex, a) {
  const c = hexToRgb(hex);
  return Jimp.rgbaToInt(c.r, c.g, c.b, a == null ? 255 : a);
}

/** Só mantém caracteres que as fontes bitmap conseguem desenhar (latim) */
function safeText(s, fallback) {
  const t = String(s == null ? '' : s).normalize('NFC')
    .replace(/[^\u0020-\u007E\u00A0-\u017F]/g, '').replace(/\s+/g, ' ').trim();
  return t || (fallback || '');
}

function tint(img, rgb) {
  const d = img.bitmap.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = rgb.r; d[i + 1] = rgb.g; d[i + 2] = rgb.b; }
  return img;
}

/**
 * Texto com contorno e sombra suave.
 * opts: { px (altura aproximada), maxW, fill, stroke, strokeW }
 */
async function textLayer(text, opts) {
  text = safeText(text);
  if (!text) return null;
  const px = opts.px || 40;
  const strokeW = opts.strokeW == null ? 3 : opts.strokeW;
  const srcSize = px <= 32 ? 32 : (px <= 64 ? 64 : 128);
  const font = await loadFont(srcSize);
  const w = Math.max(4, Jimp.measureText(font, text) + 6);
  const h = Math.max(4, Jimp.measureTextHeight(font, text, w + 40) + 4);

  let mask = new Jimp(w, h, 0x00000000);
  mask.print(font, 2, 0, text);

  let scale = px / srcSize;
  if (opts.maxW && mask.bitmap.width * scale > opts.maxW) scale = opts.maxW / mask.bitmap.width;
  if (Math.abs(scale - 1) > 0.01) {
    mask.resize(Math.max(4, Math.round(mask.bitmap.width * scale)), Jimp.AUTO, Jimp.RESIZE_BICUBIC);
  }

  const pad = strokeW + 6;
  const W = mask.bitmap.width + pad * 2, H = mask.bitmap.height + pad * 2;
  const out = new Jimp(W, H, 0x00000000);

  // sombra discreta
  const shadow = mask.clone(); tint(shadow, { r: 0, g: 0, b: 0 }); shadow.blur(3);
  shadow.opacity(0.55);
  out.composite(shadow, pad, pad + 3);

  // contorno
  const strokeMask = mask.clone(); tint(strokeMask, hexToRgb(opts.stroke || '#000000'));
  for (let dx = -strokeW; dx <= strokeW; dx++) {
    for (let dy = -strokeW; dy <= strokeW; dy++) {
      if (dx * dx + dy * dy <= strokeW * strokeW + 1) out.composite(strokeMask, pad + dx, pad + dy);
    }
  }
  // preenchimento
  tint(mask, hexToRgb(opts.fill || '#FFFFFF'));
  out.composite(mask, pad, pad);
  return out;
}

function pill(w, h, color, alpha) {
  const img = new Jimp(w, h, 0x00000000);
  const c = hexToRgb(color), r = h / 2;
  const d = img.bitmap.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let dx = 0;
      if (x < r) dx = r - x - 0.5; else if (x > w - r) dx = x - (w - r) + 0.5;
      const dy = y + 0.5 - r;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= r) {
        const i = (y * w + x) * 4;
        d[i] = c.r; d[i + 1] = c.g; d[i + 2] = c.b; d[i + 3] = Math.round(alpha * (dist > r - 1 ? (r - dist) : 1));
      }
    }
  }
  return img;
}

function roundRect(w, h, r, color, alpha) {
  const img = new Jimp(w, h, 0x00000000);
  const c = hexToRgb(color), d = img.bitmap.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = x < r ? r : (x > w - r ? w - r : x + 0.5);
      const cy = y < r ? r : (y > h - r ? h - r : y + 0.5);
      const dist = Math.sqrt((x + 0.5 - cx) * (x + 0.5 - cx) + (y + 0.5 - cy) * (y + 0.5 - cy));
      if (dist <= r) {
        const i = (y * w + x) * 4;
        d[i] = c.r; d[i + 1] = c.g; d[i + 2] = c.b;
        d[i + 3] = Math.round(alpha * (dist > r - 1 ? Math.max(0, r - dist) : 1));
      }
    }
  }
  return img;
}

function gradientBg(W, H, a, b) {
  const img = new Jimp(W, H, 0x000000FF);
  const ca = hexToRgb(a), cb = hexToRgb(b), d = img.bitmap.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = Math.min(1, Math.max(0, (x / W) * 0.6 + (y / H) * 0.4));
      const i = (y * W + x) * 4;
      d[i] = Math.round(ca.r + (cb.r - ca.r) * t);
      d[i + 1] = Math.round(ca.g + (cb.g - ca.g) * t);
      d[i + 2] = Math.round(ca.b + (cb.b - ca.b) * t);
      d[i + 3] = 255;
    }
  }
  return img;
}

/** Avatar padrão (inicial do nome) — usado quando não há foto de perfil */
async function defaultAvatar(name, size, palette) {
  const p = palette || PALETTES[0];
  const img = gradientBg(size, size, p.bgB, p.bgA);
  const letter = safeText(name).charAt(0).toUpperCase() || '?';
  const t = await textLayer(letter, { px: Math.round(size * 0.55), fill: '#FFFFFF', stroke: '#000000', strokeW: 2 });
  if (t) img.composite(t, Math.round((size - t.bitmap.width) / 2), Math.round((size - t.bitmap.height) / 2));
  return img;
}

async function loadAvatar(avatarBuf, size, name, palette) {
  if (avatarBuf && avatarBuf.length > 200) {
    try { const a = await Jimp.read(avatarBuf); a.cover(size, size); return a; } catch (_) { /* usa padrão */ }
  }
  return defaultAvatar(name, size, palette);
}

/** Divide texto longo em até 2 linhas, em espaços */
function splitTwoLines(text, limit) {
  if (text.length <= limit) return [text];
  const words = text.split(' ');
  let a = '';
  while (words.length && (a + ' ' + words[0]).trim().length <= limit) a = (a + ' ' + words.shift()).trim();
  if (!a) { a = text.slice(0, limit); return [a, text.slice(limit, limit * 2 - 1) + (text.length > limit * 2 - 1 ? '...' : '')]; }
  let b = words.join(' ');
  if (b.length > limit + 4) b = b.slice(0, limit + 3) + '...';
  return b ? [a, b] : [a];
}

function vlayout(layers, gap) {
  const valid = layers.filter(Boolean);
  const total = valid.reduce((s, l) => s + l.bitmap.height, 0) + gap * Math.max(0, valid.length - 1);
  return { valid, total };
}

/** Sistema 5 — banner automático (foto + nome + grupo + nº + mensagem) */
async function renderAuto(o) {
  const W = 1024, H = 576;
  const pal = o.palette || PALETTES[0];
  const bg = gradientBg(W, H, pal.bgA, pal.bgB);

  const avatar = await loadAvatar(o.avatarBuf, 300, o.name, pal);

  // fundo: foto muito desfocada (personaliza sem pesar)
  try {
    const blurBg = avatar.clone(); blurBg.resize(W, Jimp.AUTO).blur(22); blurBg.opacity(0.28);
    bg.composite(blurBg, 0, Math.round((H - blurBg.bitmap.height) / 2));
  } catch (_) {}
  // vinheta leve
  bg.composite(new Jimp(W, H, 0x00000038), 0, 0);

  // anel + foto circular (sombra com margem para não cortar o desfoque)
  const D = 300, ring = 8, ax = 90, ay = Math.round((H - D) / 2);
  const SP = 24;
  const sh = new Jimp(D + ring * 2 + SP * 2, D + ring * 2 + SP * 2, 0x00000000);
  const shCore = new Jimp(D + ring * 2, D + ring * 2, 0x000000B0); shCore.circle();
  sh.composite(shCore, SP, SP); sh.blur(9);
  bg.composite(sh, ax - ring - SP, ay - ring - SP + 6);
  const ringImg = new Jimp(D + ring * 2, D + ring * 2, hexToInt(pal.accent)); ringImg.circle();
  bg.composite(ringImg, ax - ring, ay - ring);
  avatar.circle();
  bg.composite(avatar, ax, ay);

  // painel translúcido de cantos arredondados atrás do texto
  const panelX = 440, panelW = W - panelX - 50;
  bg.composite(roundRect(panelW, H - 120, 26, '#000000', 80), panelX, 60);

  const maxW = panelW - 50;
  const L = [];
  L.push(await textLayer(o.line || 'BEM-VINDO(A)', { px: 30, maxW, fill: pal.accent, stroke: pal.stroke, strokeW: 2 }));
  L.push(await textLayer(o.name || 'Membro', { px: 66, maxW, fill: pal.fill, stroke: pal.stroke, strokeW: 3 }));
  L.push(await textLayer('ao grupo', { px: 26, maxW, fill: pal.fill, stroke: pal.stroke, strokeW: 2 }));
  const gparts = splitTwoLines(safeText(o.group, 'Grupo'), 24);
  for (const part of gparts) L.push(await textLayer(part, { px: gparts.length > 1 ? 34 : 40, maxW, fill: pal.accent, stroke: pal.stroke, strokeW: 3 }));
  const { valid, total } = vlayout(L, 6);
  let numberPill = null;
  if (o.number) {
    const t = await textLayer('MEMBRO Nº ' + o.number, { px: 28, maxW: maxW - 40, fill: '#FFFFFF', stroke: '#000000', strokeW: 2 });
    if (t) {
      numberPill = pill(t.bitmap.width + 28, t.bitmap.height + 8, pal.stroke, 190);
      numberPill.composite(t, 14, 4);
    }
  }
  const blockH = total + (numberPill ? numberPill.bitmap.height + 16 : 0);
  let y = Math.round((H - blockH) / 2);
  const x0 = panelX + 28;
  for (const l of valid) { bg.composite(l, x0 - 8, y); y += l.bitmap.height + 6; }
  if (numberPill) bg.composite(numberPill, x0, y + 10);

  return bg.quality(88).getBufferAsync(Jimp.MIME_JPEG);
}

/** Sistema 6 — texto aplicado numa CÓPIA da imagem do administrador */
async function renderCustom(o) {
  const base = await Jimp.read(o.baseBuf);             // cópia em memória; o ficheiro original não é tocado
  const MAX = 1280, MIN = 800;
  if (base.bitmap.width > MAX || base.bitmap.height > MAX) base.scaleToFit(MAX, MAX);
  if (base.bitmap.width < MIN) base.resize(MIN, Jimp.AUTO, Jimp.RESIZE_BICUBIC);
  const W = base.bitmap.width, H = base.bitmap.height;
  const pal = o.palette || PALETTES[0];

  // escurecimento progressivo na parte de baixo (legibilidade discreta)
  const grad = new Jimp(W, H, 0x00000000), gd = grad.bitmap.data;
  const startY = Math.round(H * 0.42);
  for (let y = startY; y < H; y++) {
    const a = Math.round(150 * Math.pow((y - startY) / (H - startY), 1.4));
    for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; gd[i + 3] = a; }
  }
  base.composite(grad, 0, 0);

  const u = H / 576;                                   // unidade proporcional
  const maxW = Math.round(W * 0.86);
  const mk = (t, px, fill, sw) => textLayer(t, { px: Math.round(px * u), maxW, fill, stroke: pal.stroke, strokeW: Math.max(2, Math.round(sw * u)) });
  const L = [];
  L.push(await mk(o.line || 'Seja bem-vindo(a)!', 32, pal.accent, 2));
  L.push(await mk(o.name || 'Membro', 62, pal.fill, 3));
  L.push(await mk(o.group || 'Grupo', 36, pal.fill, 2));
  if (o.number) L.push(await mk('Membro Nº ' + o.number, 28, pal.accent, 2));
  const { valid, total } = vlayout(L, Math.round(2 * u));
  let y = Math.min(H - total - Math.round(24 * u), Math.round(H * 0.58));
  y = Math.max(Math.round(H * 0.30), y);
  for (const l of valid) {
    base.composite(l, Math.round((W - l.bitmap.width) / 2), y);
    y += l.bitmap.height + Math.round(2 * u);
  }
  return base.quality(88).getBufferAsync(Jimp.MIME_JPEG);
}

/** Sistema 4 — imagem de saudação quando não há foto de perfil */
async function renderDefaultAvatar(name) {
  const img = await defaultAvatar(name, 512, PALETTES[Math.floor(Math.random() * PALETTES.length)]);
  return img.quality(88).getBufferAsync(Jimp.MIME_JPEG);
}

/** Colagem miniatura dos banners configurados (para !listbannern) */
async function renderCollage(slots) {
  const cols = 5, tw = 240, th = 135, gap = 10, label = 26;
  const rows = Math.ceil(slots.length / cols);
  const W = cols * tw + (cols + 1) * gap, H = rows * (th + label) + (rows + 1) * gap;
  const img = new Jimp(W, H, 0x14181FFF);
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const x = gap + (i % cols) * (tw + gap), y = gap + Math.floor(i / cols) * (th + label + gap);
    try {
      const t = await Jimp.read(s.buf); t.cover(tw, th);
      img.composite(t, x, y);
    } catch (_) { img.composite(new Jimp(tw, th, 0x333333FF), x, y); }
    const lab = await textLayer('Banner ' + s.slot, { px: 20, maxW: tw, fill: '#FFFFFF', stroke: '#000000', strokeW: 1 });
    if (lab) img.composite(lab, x, y + th - 2);
  }
  return img.quality(80).getBufferAsync(Jimp.MIME_JPEG);
}

function randomPalette() { return PALETTES[Math.floor(Math.random() * PALETTES.length)]; }

module.exports = { PALETTES, randomPalette, safeText, renderAuto, renderCustom, renderDefaultAvatar, renderCollage, textLayer };
