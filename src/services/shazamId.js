'use strict';
// Identificacao de musica: AudD (token gratuito) e/ou Shazam via python "shazamio" (se estiver instalado).
const fs = require('fs');
const os = require('os');
const path = require('path');
const web = require('../utils/webfetch');
const mo = require('../utils/mediaOpt');

const net = { postMultipart: web.postMultipart, run: mo.run };
const SECS = parseInt(process.env.SHAZAM_SAMPLE_SECONDS, 10) || 20;
const tmpf = (ext) => path.join(os.tmpdir(), 'shz_' + process.pid + '_' + Date.now() + '_' + Math.floor(Math.random() * 1e6) + ext);
const rm = (f) => { try { fs.unlinkSync(f); } catch (_) {} };

function getKey(name) {
  try { return String(require('../interactive/nativeFlow').getEnv(name) || '').trim(); } catch (_) { return String(process.env[name] || '').trim(); }
}

// recorta ~20s (mono, 48k) para enviar pouco e identificar rapido
async function prepSample(buf, mime) {
  const ext = /video/.test(mime || '') ? '.mp4' : /ogg|opus/.test(mime || '') ? '.ogg' : /mpeg|mp3/.test(mime || '') ? '.mp3' : /mp4|m4a|aac/.test(mime || '') ? '.m4a' : '.bin';
  const inF = tmpf(ext), outF = tmpf('.mp3');
  try {
    fs.writeFileSync(inF, buf);
    let start = 0;
    const pr = await net.run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', inF], 15000);
    const dur = parseFloat(String(pr.so).trim());
    if (!pr.err && dur > 40) start = 8;
    const r = await net.run('ffmpeg', ['-y', '-ss', String(start), '-i', inF, '-vn', '-ac', '1', '-ar', '22050', '-t', String(SECS), '-b:a', '48k', outF], 60000);
    if (!r.err && fs.existsSync(outF)) { const o = fs.readFileSync(outF); if (o.length > 2000) return { buf: o, name: 'sample.mp3', type: 'audio/mpeg' }; }
    if (/audio/.test(mime || '') && buf.length <= 6 * 1024 * 1024) return { buf: buf, name: 'sample' + (ext === '.bin' ? '.mp3' : ext), type: mime || 'audio/mpeg' };
    return null;
  } finally { rm(inF); rm(outF); }
}

async function identifyAudd(sample) {
  const token = getKey('AUDD_TOKEN');
  if (!token) return { skipped: true };
  const r = await net.postMultipart('https://api.audd.io/', { api_token: token, return: 'apple_music,spotify' }, { field: 'file', name: sample.name, type: sample.type, buf: sample.buf });
  const j = JSON.parse(r.body.toString('utf8'));
  if (j.status && j.status !== 'success') throw new Error((j.error && j.error.error_message) || 'AudD: erro');
  const x = j.result;
  if (!x || !x.title) return { track: null };
  let cover = null;
  if (x.apple_music && x.apple_music.artwork && x.apple_music.artwork.url) cover = String(x.apple_music.artwork.url).replace('{w}', '500').replace('{h}', '500');
  else if (x.spotify && x.spotify.album && x.spotify.album.images && x.spotify.album.images[0]) cover = x.spotify.album.images[0].url;
  return { track: { title: x.title, artist: x.artist || '', album: x.album || '', year: String(x.release_date || '').slice(0, 4), link: x.song_link || '', cover: cover, provider: 'AudD' } };
}

const PY = 'import asyncio,sys,json\nfrom shazamio import Shazam\nasync def m():\n    s=Shazam()\n    f=getattr(s,"recognize",None) or getattr(s,"recognize_song")\n    r=await f(sys.argv[1])\n    print(json.dumps(r))\nasyncio.run(m())\n';
let shazamioOk = null;
async function hasShazamio() {
  if (shazamioOk !== null) return shazamioOk;
  const r = await net.run('python3', ['-c', 'import shazamio'], 15000);
  shazamioOk = !r.err;
  return shazamioOk;
}
async function identifyShazamio(sample) {
  if (!(await hasShazamio())) return { skipped: true };
  const f = tmpf('.mp3');
  try {
    fs.writeFileSync(f, sample.buf);
    const r = await net.run('python3', ['-c', PY, f], 90000);
    if (r.err) throw new Error('shazamio falhou');
    const j = JSON.parse(r.so.trim().split('\n').pop());
    const t = j && j.track;
    if (!t || !t.title) return { track: null };
    let album = '', year = '';
    (t.sections || []).forEach((sec) => (sec.metadata || []).forEach((m) => { if (/album/i.test(m.title)) album = m.text; if (/lan|releas|year/i.test(m.title)) year = String(m.text).slice(-4); }));
    return { track: { title: t.title, artist: t.subtitle || '', album: album, year: year, link: t.url || '', cover: (t.images && (t.images.coverarthq || t.images.coverart)) || null, provider: 'Shazam' } };
  } finally { rm(f); }
}

async function identify(buf, mime) {
  const providers = [['AudD', identifyAudd], ['Shazam', identifyShazamio]];
  const sample = await prepSample(buf, mime);
  if (!sample) return { error: 'noaudio' };
  let configured = 0, lastErr = null;
  for (const p of providers) {
    try {
      const r = await p[1](sample);
      if (r.skipped) continue;
      configured++;
      if (r.track) return { track: r.track };
    } catch (e) { configured++; lastErr = e; console.error('[shazam] ' + p[0] + ':', e && e.message); }
  }
  if (!configured) return { error: 'noprovider' };
  return lastErr && configured === 1 ? { error: 'provider', detail: lastErr.message } : { track: null };
}

module.exports = { identify, prepSample, identifyAudd, net, _resetShazamio: () => { shazamioOk = null; } };
