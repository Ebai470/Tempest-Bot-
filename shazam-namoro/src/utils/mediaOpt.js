'use strict';
// Otimizacao de media: video HD (720p) leve e conversao de WebP -> JPEG (usa ffmpeg se existir)
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const run = (cmd, args, ms) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: ms || 60000, maxBuffer: 8 * 1024 * 1024 }, (err, so, se) => resolve({ err: err, so: String(so || ''), se: String(se || '') }));
});
const tmpf = (ext) => path.join(os.tmpdir(), 'tp_' + process.pid + '_' + Date.now() + '_' + Math.floor(Math.random() * 1e6) + ext);
const rm = (f) => { try { fs.unlinkSync(f); } catch (_) {} };

const cfg = () => ({
  maxH: parseInt(process.env.VIDEO_MAX_HEIGHT, 10) || 720,
  maxBytes: (parseInt(process.env.VIDEO_MAX_MB, 10) || 8) * 1024 * 1024,
  crf: parseInt(process.env.VIDEO_CRF, 10) || 27,
  maxrate: process.env.VIDEO_MAXRATE || '1800k'
});

async function probe(file) {
  const r = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height,codec_name', '-of', 'json', file], 15000);
  if (r.err) return null;
  try { const s = (JSON.parse(r.so).streams || [])[0] || {}; return { height: s.height || 0, codec: s.codec_name || '' }; } catch (_) { return null; }
}

/** Devolve um video em no maximo 720p, H.264 e leve. Se nao houver ffmpeg/ffprobe devolve o original. */
async function optimizeVideo(buf) {
  const c = cfg();
  const inF = tmpf('.mp4'), outF = tmpf('_o.mp4');
  try {
    fs.writeFileSync(inF, buf);
    const p = await probe(inF);
    if (!p) return { buf: buf, changed: false, note: 'sem ffprobe' };
    if (p.height && p.height <= c.maxH && p.codec === 'h264' && buf.length <= c.maxBytes) return { buf: buf, changed: false, height: p.height };
    const bufsize = String(parseInt(c.maxrate, 10) * 2) + 'k';
    const r = await run('ffmpeg', ['-y', '-i', inF, '-vf', "scale=-2:'min(" + c.maxH + ",ih)'", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(c.crf), '-maxrate', c.maxrate, '-bufsize', bufsize, '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', outF], 180000);
    if (r.err || !fs.existsSync(outF)) return { buf: buf, changed: false, note: 'ffmpeg falhou' };
    const nb = fs.readFileSync(outF);
    if (nb.length > 1024 && (nb.length < buf.length || buf.length > c.maxBytes)) return { buf: nb, changed: true, height: Math.min(p.height || c.maxH, c.maxH) };
    return { buf: buf, changed: false, height: p.height };
  } catch (e) {
    return { buf: buf, changed: false, note: e && e.message };
  } finally { rm(inF); rm(outF); }
}

const isWebp = (b) => b && b.length > 12 && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP';
const isJpeg = (b) => b && b.length > 3 && b[0] === 0xFF && b[1] === 0xD8;
const isPng = (b) => b && b.length > 8 && b[0] === 0x89 && b.slice(1, 4).toString() === 'PNG';
const isImage = (b) => isJpeg(b) || isPng(b) || isWebp(b);

async function webpToJpeg(buf) {
  const inF = tmpf('.webp'), outF = tmpf('.jpg');
  try {
    fs.writeFileSync(inF, buf);
    const r = await run('ffmpeg', ['-y', '-i', inF, '-q:v', '3', outF], 30000);
    if (r.err || !fs.existsSync(outF)) return null;
    return fs.readFileSync(outF);
  } catch (_) { return null; } finally { rm(inF); rm(outF); }
}

/** Prepara uma imagem para enviar: WebP -> JPEG e reduz imagens muito pesadas (poupa internet). */
async function prepImage(buf) {
  let b = buf;
  if (isWebp(b)) { const j = await webpToJpeg(b); if (!j) return null; b = j; }
  if (b.length > 1.3 * 1024 * 1024) {
    try {
      const Jimp = require('jimp');
      const img = await Jimp.read(b);
      if (Math.max(img.bitmap.width, img.bitmap.height) > 1600) img.scaleToFit(1600, 1600);
      const out = await img.quality(82).getBufferAsync(Jimp.MIME_JPEG);
      if (out.length < b.length) b = out;
    } catch (_) {}
  }
  return b;
}

module.exports = { optimizeVideo, prepImage, webpToJpeg, isImage, isWebp, isJpeg, isPng, run };
