'use strict';
// Descarrega uma musica pelo nome (yt-dlp + ffmpeg), leve: MP3 96k, ate 15 min.
const fs = require('fs');
const os = require('os');
const path = require('path');
const mo = require('../utils/mediaOpt');

const net = { run: mo.run };

function findYtDlp() {
  const list = [path.join(process.env.HOME || '', '.local/bin/yt-dlp'), '/data/data/com.termux/files/usr/bin/yt-dlp', 'yt-dlp'];
  for (const c of list) { try { if (c === 'yt-dlp' || fs.existsSync(c)) return c; } catch (_) {} }
  return 'yt-dlp';
}

async function downloadAudio(query) {
  const bin = process.env.YTDLP_BIN || findYtDlp();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpm_'));
  const read = () => { const f = fs.readdirSync(dir).filter((n) => /\.(mp3|m4a|opus|webm|ogg)$/i.test(n))[0]; return f ? path.join(dir, f) : null; };
  try {
    const base = ['ytsearch3:' + query, '--match-filter', 'duration>45 & duration<900 & !is_live', '--max-downloads', '1', '--no-warnings', '--no-check-certificates', '--max-filesize', '40M', '--concurrent-fragments', '4', '-o', path.join(dir, 'a.%(ext)s')];
    await net.run(bin, base.concat(['-f', 'bestaudio[ext=m4a]/bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '96K']), 180000);
    let f = read();
    if (!f) { await net.run(bin, base.concat(['-f', 'bestaudio[ext=m4a]/bestaudio']), 180000); f = read(); }
    if (!f) return null;
    const buf = fs.readFileSync(f);
    if (buf.length < 5000) return null;
    return { buf: buf, ext: path.extname(f).toLowerCase(), mimetype: /m4a/i.test(f) ? 'audio/mp4' : /opus|ogg|webm/i.test(f) ? 'audio/ogg' : 'audio/mpeg' };
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {} }
}

// capa pequena (so se for uma imagem de ate 1,5 MB)
async function coverGet(url) {
  const web = require('../utils/webfetch');
  const r = await web.get(url, {}, 1.5 * 1024 * 1024);
  return (r.status === 200 && mo.isImage(r.body)) ? r.body : null;
}

module.exports = { downloadAudio, coverGet, net };
