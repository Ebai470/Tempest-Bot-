'use strict';
/** Busca de vídeos para o app YouTube do mini celular (usa o yt-dlp que o bot já tem). */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

function bin() {
  const list = [path.join(process.env.HOME || '', '.local/bin/yt-dlp'), '/data/data/com.termux/files/usr/bin/yt-dlp'];
  for (const p of list) { try { if (fs.existsSync(p)) return p; } catch (_) {} }
  return 'yt-dlp';
}
function dur(s) {
  s = Math.round(+s || 0); if (!s) return '';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + x).slice(-2);
}
function search(q) {
  return new Promise((resolve, reject) => {
    execFile(bin(), ['ytsearch8:' + q, '--flat-playlist', '--dump-json', '--no-warnings', '--no-check-certificates'], { timeout: 45000, maxBuffer: 8 * 1024 * 1024 }, (e, out) => {
      if (e && !out) return reject(e);
      const r = String(out || '').split('\n').filter((l) => l.trim().startsWith('{')).map((l) => { try { return JSON.parse(l); } catch (_) { return null; } })
        .filter((x) => x && /^[\w-]{11}$/.test(x.id || '')).slice(0, 8)
        .map((x) => ({ i: x.id, t: String(x.title || x.id).slice(0, 100), c: String(x.channel || x.uploader || 'YouTube').slice(0, 40), d: dur(x.duration) }));
      resolve(r);
    });
  });
}
const LAST = new Map();
let busy = false;
async function inject(ctx, html) {
  const A = ctx.args || [];
  if (String(A[0] || '').toLowerCase() !== 'yt') return html;
  const q = A.slice(1).join(' ').trim().slice(0, 80);
  let res = [];
  if (q) {
    const k = ctx.sender, t = Date.now();
    if (LAST.get(k) && t - LAST.get(k) < 15000) { await ctx.reply('⏳ Aguarde alguns segundos entre buscas.'); return html; }
    if (busy) { await ctx.reply('⏳ Já estou buscando outro vídeo. Tente em instantes.'); return html; }
    busy = true; LAST.set(k, t);
    try { res = await module.exports.search(q); } catch (e) { console.error('[CELULAR-YT]', e && e.message); } finally { busy = false; }
    if (!res.length) await ctx.reply('⚠️ Não consegui buscar agora. Abri o YouTube sem resultados: cole um link nele.');
  }
  const data = 'window.YTRES=' + JSON.stringify(res).replace(/</g, '\\u003c') + ';window.OPENAPP="yt";';
  return html.replace('<!--WPIMG-->', () => '<script>' + data + '</script><!--WPIMG-->');
}
module.exports = { inject, search };
