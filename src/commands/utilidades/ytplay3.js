'use strict';
/**
 * ytplay3 — música + painel de letra sincronizada (estilo celular4: balão "Ver detalhes").
 * Comando novo e isolado: não altera nenhum outro comando.
 * Crédito da estrutura da mensagem interativa (montarMensagem / embedded_screens): TIO INO
 *
 * v7: manda SÓ o painel, com a música tocando dentro dele (áudio Opus/MP3 embutido, qualidade pelo limite).
 *     Se a música não couber no limite, volta ao modo antigo (áudio + painel com letra).
 * Uso: !ytplay3 nome da música
 *      !ytplay3 teste          (dono) descobre o tamanho máximo que o seu WhatsApp aceita
 *      !ytplay3 limite [KB]    (dono) mostra/define o tamanho máximo do áudio dentro do painel (mais KB = melhor som)
 *      !ytplay3 codec opus|mp3 (dono) opus = melhor qualidade (Android); mp3 = toca em qualquer aparelho
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { withDownloadLock } = require('../../services/downloadQueue');

const BOT = (function () { try { return require('../../config').botName || 'Tempest Bot'; } catch (_) { return 'Tempest Bot'; } })();
const MAX_SEC = 12 * 60;               // músicas até 12 min
const CFG_FILE = path.join(process.cwd(), 'data', 'ytplay3.json');
const DEF_AUDIO_KB = 700;              // tamanho do áudio dentro do painel (a mensagem fica ~1,8x maior)
const MIN_KBPS = 20;                   // abaixo disso a música fica ruim: usa o modo antigo
function readCfg() { try { const j = JSON.parse(fs.readFileSync(CFG_FILE, 'utf8')); if (j) return { audioKB: (j.audioKB >= 50 ? Math.min(8000, j.audioKB) : DEF_AUDIO_KB), codec: j.codec === 'mp3' ? 'mp3' : 'opus' }; } catch (_) {} return { audioKB: DEF_AUDIO_KB, codec: 'opus' }; }
function writeCfg(c) { try { fs.mkdirSync(path.dirname(CFG_FILE), { recursive: true }); fs.writeFileSync(CFG_FILE, JSON.stringify(c)); return true; } catch (_) { return false; } }
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36';

/* ---------- utilidades ---------- */
function findYtDlp() {
  const list = [path.join(process.env.HOME || '', '.local/bin/yt-dlp'), '/data/data/com.termux/files/usr/bin/yt-dlp'];
  for (const c of list) { try { if (fs.existsSync(c)) return c; } catch (_) {} }
  return 'yt-dlp';
}
function run(args, timeoutMs) {
  return new Promise(function (resolve, reject) {
    const env = Object.assign({}, process.env, { PATH: (process.env.HOME || '') + '/.local/bin:' + (process.env.PATH || '') });
    execFile(findYtDlp(), args, { timeout: timeoutMs || 150000, maxBuffer: 40 * 1024 * 1024, env: env }, function (err, stdout, stderr) {
      if (err) return reject(new Error((stderr || err.message || 'erro').toString().slice(0, 300)));
      resolve(stdout || '');
    });
  });
}
function getBuf(url, depth) {
  return new Promise(function (resolve, reject) {
    const lib = String(url).startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 15000, headers: { 'User-Agent': UA, 'Accept': '*/*' } }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (depth || 0) < 4) {
        res.resume(); return getBuf(new URL(res.headers.location, url).href, (depth || 0) + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const ch = []; res.on('data', function (c) { ch.push(c); }); res.on('end', function () { resolve(Buffer.concat(ch)); });
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(); reject(new Error('timeout')); });
  });
}
async function getJson(url) { return JSON.parse((await getBuf(url)).toString('utf8')); }
const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
const fmt = function (s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const clip = function (s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const secs = function (a) { return ((Date.now() - a) / 1000).toFixed(1) + 's'; };
function withTimeout(p, ms, fallback) {
  return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(fallback); }, ms); })]);
}

/* ---------- título / artista ---------- */
function cleanTitle(t) {
  return String(t || '')
    .replace(/\s*[\(\[][^\)\]]*(official|video|vídeo|lyric|lyrics|audio|áudio|visuali[sz]er|clipe|letra|legendado|tradu|hd|4k|mv|remaster)[^\)\]]*[\)\]]/ig, '')
    .replace(/\s*(official\s*(music\s*)?video|lyric\s*video|lyrics?|letra)\s*$/i, '')
    .replace(/\s+/g, ' ').trim();
}
function guessTrack(info, query) {
  let title = '', artist = '';
  if (info.track) { title = info.track; artist = String(info.artist || '').split(',')[0].trim(); }
  if (!title) {
    const ct = cleanTitle(info.title || query);
    const m = ct.split(/\s[-–—]\s/);
    if (m.length >= 2) { artist = m[0].trim(); title = m.slice(1).join(' - ').trim(); }
    else { title = ct; }
  }
  if (!artist) artist = String(info.uploader || info.channel || '').replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').replace(/\s*Official$/i, '').trim();
  return { title: title || cleanTitle(query), artist: artist };
}

/* ---------- letras (LRCLIB; fallback lyrics.ovh) ---------- */
function parseLrc(lrc) {
  const out = [];
  String(lrc || '').split(/\r?\n/).forEach(function (line) {
    const stamps = [];
    const re = /\[(\d+):(\d+(?:[.:]\d+)?)\]/g; let m, last = 0;
    while ((m = re.exec(line))) { stamps.push(parseInt(m[1], 10) * 60 + parseFloat(String(m[2]).replace(':', '.'))); last = re.lastIndex; }
    if (!stamps.length) return;
    const text = line.slice(last).trim();
    stamps.forEach(function (t) { out.push({ t: Math.round(t * 100) / 100, x: text }); });
  });
  out.sort(function (a, b) { return a.t - b.t; });
  return out;
}
function pickLyric(list, dur) {
  list = (list || []).filter(function (x) { return x && (x.syncedLyrics || x.plainLyrics); });
  if (!list.length) return null;
  const near = function (x) { return !dur || !x.duration || Math.abs(x.duration - dur) <= 6; };
  return list.find(function (x) { return x.syncedLyrics && near(x); }) || list.find(function (x) { return x.syncedLyrics; }) ||
    list.find(function (x) { return x.plainLyrics && near(x); }) || list[0];
}
async function findLyrics(title, artist, dur) {
  const q = encodeURIComponent;
  const tries = [];
  if (artist) tries.push('https://lrclib.net/api/search?track_name=' + q(title) + '&artist_name=' + q(artist));
  tries.push('https://lrclib.net/api/search?q=' + q((artist ? artist + ' ' : '') + title));
  tries.push('https://lrclib.net/api/search?q=' + q(title));
  for (let i = 0; i < tries.length; i++) {
    try {
      const hit = pickLyric(await getJson(tries[i]), dur);
      if (hit) {
        const label = (hit.artistName || artist) + ' — ' + (hit.trackName || title);
        if (hit.syncedLyrics) { const l = parseLrc(hit.syncedLyrics); if (l.length) return { synced: true, lines: l, label: label }; }
        if (hit.plainLyrics) return { synced: false, lines: hit.plainLyrics.split(/\r?\n/).map(function (x) { return { t: 0, x: x.trim() }; }), label: label };
      }
    } catch (_) {}
  }
  if (artist) {
    try {
      const j = await getJson('https://api.lyrics.ovh/v1/' + q(artist) + '/' + q(title));
      if (j && j.lyrics) return { synced: false, lines: String(j.lyrics).split(/\r?\n/).map(function (x) { return { t: 0, x: x.trim() }; }), label: artist + ' — ' + title };
    } catch (_) {}
  }
  return null;
}

/* ---------- busca + download ---------- */
let _jsrt = true;
function cookieArgs() {
  const c = path.join(process.cwd(), 'cookies.txt');
  try { if (fs.existsSync(c)) return ['--cookies', c]; } catch (_) {}
  return [];
}
async function ytRun(args, timeoutMs) {
  const base = cookieArgs();
  try { return await run((_jsrt ? ['--js-runtimes', 'node'] : []).concat(base, args), timeoutMs); }
  catch (e) {
    if (_jsrt && /no such option|unrecognized arguments|js-runtimes/i.test(String(e.message))) { _jsrt = false; return run(base.concat(args), timeoutMs); }
    throw e;
  }
}
async function quickSearch(query) {
  const raw = await ytRun(['ytsearch1:' + query, '--flat-playlist', '--dump-json', '--no-warnings', '--no-check-certificates'], 45000);
  const line = raw.split('\n').find(function (l) { return l.trim().startsWith('{'); });
  let i = null; try { i = line ? JSON.parse(line) : null; } catch (_) {}
  if (!i || !i.id) throw new Error('Não encontrei essa música.');
  return { id: i.id, title: i.title || query, uploader: i.channel || i.uploader || '', duration: i.duration || 0 };
}
async function downloadYt(id, outDir, bag, raw) {
  const url = 'https://www.youtube.com/watch?v=' + id;
  const stamp = Date.now();
  const tpl = path.join(outDir, 'y3_' + stamp + '.%(ext)s');
  const base = (raw ? ['-f', 'bestaudio'] : ['-f', 'bestaudio[ext=m4a]/bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '128K'])
    .concat(['--no-playlist', '--no-warnings', '--no-check-certificates', '--retries', '3', '-o', tpl, url]);
  const tries = [[], ['--extractor-args', 'youtube:player_client=tv_embedded']];
  let lastErr = null;
  for (let i = 0; i < tries.length; i++) {
    try { await ytRun(tries[i].concat(base), 100000); lastErr = null; break; } catch (e) { lastErr = e; }
    console.log('[ytplay3] download tentativa ' + (i + 1) + ' falhou: ' + String(lastErr && lastErr.message).slice(0, 160));
  }
  const files = fs.readdirSync(outDir).filter(function (f) { return f.startsWith('y3_' + stamp); }).map(function (f) { return path.join(outDir, f); });
  files.forEach(function (f) { bag.push(f); });
  files.sort(function (x, y) { return fs.statSync(y).size - fs.statSync(x).size; });
  const audio = (!raw && files.find(function (f) { return /\.mp3$/i.test(f); })) || files[0];
  if (!audio || fs.statSync(audio).size < 1000) throw new Error('Não consegui baixar o áudio.' + (lastErr ? ' ' + String(lastErr.message).slice(0, 120) : ''));
  return audio;
}
// converte para o tamanho pedido: Opus (melhor qualidade por KB) ou MP3 (toca em qualquer aparelho)
function encodeAudio(inp, outDir, bag, kbps, codec) {
  const run1 = function (cod) {
    return new Promise(function (resolve, reject) {
      const out = path.join(outDir, 'y3e_' + Date.now() + (cod === 'opus' ? '.ogg' : '.mp3'));
      const k = Math.max(16, Math.min(cod === 'opus' ? 160 : 128, kbps));
      const stereo = k >= (cod === 'opus' ? 40 : 65);
      const args = ['-v', 'error', '-y', '-i', inp, '-vn', '-map_metadata', '-1'].concat(cod === 'opus'
        ? ['-c:a', 'libopus', '-b:a', k + 'k', '-vbr', 'on', '-application', 'audio', '-compression_level', '10', '-ac', stereo ? '2' : '1', '-ar', '48000']
        : ['-c:a', 'libmp3lame', '-b:a', k + 'k', '-ac', stereo ? '2' : '1', '-ar', k < 32 ? '22050' : '44100']).concat([out]);
      execFile('ffmpeg', args, { timeout: 120000 }, function (err) {
        bag.push(out);
        if (err || !fs.existsSync(out) || fs.statSync(out).size < 1000) return reject(err || new Error('ffmpeg sem saída'));
        resolve({ file: out, mime: cod === 'opus' ? 'audio/ogg; codecs=opus' : 'audio/mpeg', codec: cod, kbps: k });
      });
    });
  };
  return run1(codec).catch(function (e) {
    if (codec === 'opus') { console.log('[ytplay3] Opus indisponível (' + String(e && e.message).slice(0, 80) + '), usando MP3'); return run1('mp3'); }
    throw e;
  });
}
// TP_V8: garante que o áudio final não passe do limite (o Opus/VBR às vezes passa): se passar, recodifica mais baixo
async function fitAudio(inp, outDir, bag, kbps, codec, maxBytes) {
  let e = await encodeAudio(inp, outDir, bag, kbps, codec);
  for (let n = 0; n < 2; n++) {
    const size = fs.statSync(e.file).size;
    if (size <= maxBytes * 1.03) break;
    const k2 = Math.max(16, Math.floor(e.kbps * (maxBytes / size) * 0.94));
    console.log('[ytplay3] áudio passou do limite (' + Math.round(size / 1024) + ' KB); recodificando a ' + k2 + ' kbps');
    e = await encodeAudio(inp, outDir, bag, k2, codec);
  }
  return e;
}
// capa pequena (quadrada, até ~35 KB) para o painel continuar leve
async function fetchCover(id) {
  const urls = ['https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg', 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg'];
  let raw = null;
  for (let i = 0; i < urls.length && !raw; i++) { try { const b = await getBuf(urls[i]); if (b && b.length > 500) raw = b; } catch (_) {} }
  if (!raw) return null;
  try {
    const Jimp = require('jimp');
    const img = await Jimp.read(raw);
    img.cover(240, 240);
    let q = 70, out;
    do { out = await img.quality(q).getBufferAsync(Jimp.MIME_JPEG); q -= 10; } while (out.length > 35000 && q >= 20);
    return out;
  } catch (_) { return raw.length <= 40000 ? raw : null; }
}
async function fetchTrack(query, outDir, bag, cfg) {
  fs.mkdirSync(outDir, { recursive: true });
  const T = Date.now();
  const s = await quickSearch(query);
  console.log('[ytplay3] busca ' + secs(T) + ' -> ' + s.title);
  if (s.duration > MAX_SEC) throw new Error('Essa música é longa demais (máx. ' + Math.round(MAX_SEC / 60) + ' min).');
  const g = guessTrack({ title: s.title, uploader: s.uploader }, query);
  const kbps = Math.floor((cfg.audioKB * 1024 * 8) / Math.max(s.duration || 200, 30) / 1000);
  const embed = kbps >= MIN_KBPS;
  console.log('[ytplay3] modo: ' + (embed ? 'painel com áudio dentro (' + cfg.codec + ', ~' + Math.min(160, kbps) + ' kbps)' : 'áudio + painel (música não cabe no limite de ' + cfg.audioKB + ' KB)'));
  const r = await Promise.all([
    downloadYt(s.id, outDir, bag, embed).then(function (a) { console.log('[ytplay3] áudio baixado ' + secs(T)); return a; }),
    fetchCover(s.id),
    withTimeout(findLyrics(g.title, g.artist, s.duration), 20000, null).then(function (l) { console.log('[ytplay3] letra ' + (l ? (l.synced ? 'sincronizada' : 'simples') : 'não achou') + ' ' + secs(T)); return l; })
  ]);
  let audio = r[0], mime = 'audio/mpeg', used = null;
  if (embed) {
    const e = await fitAudio(r[0], outDir, bag, kbps, cfg.codec, cfg.audioKB * 1024);
    audio = e.file; mime = e.mime; used = e.codec + ' ' + e.kbps + ' kbps';
    console.log('[ytplay3] áudio convertido (' + used + ', ' + Math.round(fs.statSync(audio).size / 1024) + ' KB) ' + secs(T));
  }
  return { audio: audio, mime: mime, dur: s.duration, cover: r[1], lyr: r[2], title: g.title, artist: g.artist, embed: embed };
}

/* ---------- painel (HTML) ---------- */
const PANEL_CSS = '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html,body{margin:0;background:#121212;color:#f2f2f2;font-family:-apple-system,Roboto,Arial,sans-serif}body{padding:12px}'
  + '.card{background:#1c1c1c;border:1px solid #2b2b2b;border-radius:20px;padding:14px;margin-bottom:12px}'
  + '.top{display:flex;gap:12px;align-items:center}.cv{width:74px;height:74px;border-radius:12px;background:#2c2c2c;overflow:hidden;flex:none;display:flex;align-items:center;justify-content:center;font-size:30px}.cv img{width:100%;height:100%;object-fit:cover}'
  + '.brand{font-size:11px;color:#9a9a9a}h2{margin:2px 0;font-size:18px;line-height:1.2}.art{color:#a8a8a8;font-size:13px}'
  + '.hint{font-size:11px;color:#9a9a9a;background:#242424;border-radius:10px;padding:8px 10px;margin-top:12px;line-height:1.4}'
  + '.bar{margin-top:12px}input[type=range]{width:100%;accent-color:#e8e8e8;height:18px;margin:0}.tm{display:flex;justify-content:space-between;font-size:11px;color:#9a9a9a;margin-top:2px}'
  + '.ctl{display:flex;align-items:center;justify-content:center;gap:26px;margin:10px 0 2px}.ctl button{border:0;background:none;color:#fff;font-size:22px;padding:6px 8px}.ctl .pp{font-size:28px}.ctl .sm{font-size:12px;background:#2c2c2c;border-radius:10px;padding:8px 10px}'
  + '.vol{display:flex;align-items:center;gap:12px;margin-top:8px}.vol button{border:0;background:#2c2c2c;color:#fff;width:38px;height:38px;border-radius:50%;font-size:16px;flex:none}.vol button.on{background:#4b3fa8}.vol input{flex:1}'
  + 'body.aud .clk{display:none}body:not(.aud) .au{display:none}'
  + '.lh{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.lh b{font-size:11px;letter-spacing:.08em}.lh small{display:block;color:#8d8d8d;font-size:10px;margin-top:2px}'
  + '.badge{font-size:9px;background:#2c2c2c;border-radius:8px;padding:5px 8px;white-space:nowrap}'
  + '#ly{position:relative;height:280px;overflow-y:auto;margin-top:10px}#ly::-webkit-scrollbar{display:none}'
  + '.ln{padding:10px 12px;border-radius:10px;font-size:15px;color:#7d7d7d;line-height:1.35}.ln.on{background:#2a2a2a;color:#fff;font-weight:bold}.ln.pl{color:#d0d0d0}.sp{height:120px}.none{color:#8d8d8d;font-size:13px;padding:30px 10px;text-align:center}';
function shell(css, body, js) {
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>' + css + '</style></head><body' + (js && js.aud ? ' class="aud"' : '') + '>'
    + body + '<script>' + (js ? js.code : '') + '</script></body></html>';
}
function buildHtml(t, lyr, audioB64, mime) {
  const coverUri = t.cover ? 'data:image/jpeg;base64,' + t.cover.toString('base64') : '';
  const hasA = !!audioB64;
  const synced = !!(lyr && lyr.synced);
  const last = lyr && lyr.lines.length ? lyr.lines[lyr.lines.length - 1].t : 0;
  const dur = Math.max(t.dur || 0, last + 5, 1);
  const data = JSON.stringify({ s: synced, d: dur, l: lyr ? lyr.lines : [] }).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '');
  // TP_V6: o áudio fica numa variável JS (base64) e é tocado por dois caminhos: <audio> (via blob) e, se o WhatsApp recusar, Web Audio.
  const js = (hasA ? 'var MIME="' + (mime || 'audio/mpeg') + '";var B64="' + audioB64 + '";' : '')
    + 'var D=__DATA__,S=D.s,DUR=D.d,L=D.l,A=document.getElementById("a"),ly=document.getElementById("ly"),sl=document.getElementById("sl"),pp=document.getElementById("pp"),cu=document.getElementById("cu"),du=document.getElementById("du"),stt=document.getElementById("stt"),cur=-1,els=[],pos=0,run=false,t0=0,ENG=A?"el":"clk",bytes=null,WA={c:null,b:null,s:null,g:null,st:0,off:0,pl:false,loop:false,vol:0.9};'
    + 'function st(m){if(stt)stt.textContent=m||""}'
    + 'function f(s){s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2)}'
    + 'if(A){try{var bin=atob(B64),n=bin.length;bytes=new Uint8Array(n);for(var q=0;q<n;q++)bytes[q]=bin.charCodeAt(q);A.src=URL.createObjectURL(new Blob([bytes],{type:MIME}))}catch(e){ENG="wa";st("modo compatível")}}'
    + 'function waT(){var t=WA.pl?(WA.off+WA.c.currentTime-WA.st):WA.off;return WA.b&&WA.loop&&t>WA.b.duration?t%WA.b.duration:t}'
    + 'function waLoad(cb){if(WA.b){cb();return}try{if(!WA.c){WA.c=new (window.AudioContext||window.webkitAudioContext)();WA.g=WA.c.createGain();WA.g.gain.value=WA.vol;WA.g.connect(WA.c.destination)}try{WA.c.resume()}catch(e){}'
    + 'var ok=function(b){WA.b=b;if(b.duration&&isFinite(b.duration)){DUR=b.duration;du.textContent=f(DUR)}cb()},bad=function(e){st("❌ não consegui decodificar o áudio")};var pr=WA.c.decodeAudioData(bytes.buffer.slice(0),ok,bad);if(pr&&pr.catch)pr.catch(bad)}catch(e){st("❌ sem Web Audio: "+(e&&e.name))}}'
    + 'function waStart(){waLoad(function(){try{WA.c.resume()}catch(e){}var s=WA.c.createBufferSource();s.buffer=WA.b;s.loop=WA.loop;s.connect(WA.g);s.onended=function(){if(WA.s===s&&!WA.loop){WA.pl=false;WA.off=0;pp.textContent="▶"}};s.start(0,Math.min(WA.off,Math.max(0,WA.b.duration-0.05)));WA.s=s;WA.st=WA.c.currentTime;WA.pl=true;pp.textContent="❚❚"})}'
    + 'function waStop(){if(WA.pl){WA.off=waT();WA.pl=false}if(WA.s){var s=WA.s;WA.s=null;s.onended=null;try{s.stop()}catch(e){}}pp.textContent="▶"}'
    + 'function waSeek(p){var was=WA.pl;waStop();WA.off=Math.max(0,Math.min(DUR-0.05,p));if(was)waStart()}'
    + 'function toWA(why,go){if(ENG==="wa")return;ENG="wa";try{A.pause()}catch(e){}st("modo compatível"+(why?" ("+why+")":""));if(go)waStart()}'
    + 'function now(){if(ENG==="el")return A.currentTime||0;if(ENG==="wa")return waT();return run?Math.min(DUR,pos+(Date.now()-t0)/1000):pos}'
    + 'function setPos(p){p=Math.max(0,Math.min(DUR,p));if(ENG==="el"){try{A.currentTime=p}catch(e){}}else if(ENG==="wa")waSeek(p);else{pos=p;t0=Date.now()}tick()}'
    + 'for(var i=0;i<L.length;i++){var d=document.createElement("div");d.className="ln"+(S?"":" pl");d.textContent=L[i].x||(S?"♪":"");(function(i){d.onclick=function(){if(S)setPos(L[i].t)}})(i);ly.appendChild(d);els.push(d)}'
    + 'if(L.length){var sp=document.createElement("div");sp.className="sp";ly.appendChild(sp)}else{ly.innerHTML="<div class=none>Letra não encontrada.</div>"}'
    + 'function hi(t){if(!S)return;var n=-1;for(var i=0;i<L.length;i++){if(L[i].t<=t+0.2)n=i;else break}if(n===cur)return;if(cur>=0&&els[cur])els[cur].classList.remove("on");cur=n;if(n>=0){els[n].classList.add("on");ly.scrollTop=els[n].offsetTop-ly.clientHeight/2+els[n].clientHeight/2}}'
    + 'function tick(){var t=now();if(ENG==="clk"&&run&&t>=DUR){run=false;pos=DUR;pp.textContent="▶"}sl.value=Math.round(t/DUR*1000);cu.textContent=f(t);hi(t)}'
    + 'setInterval(tick,250);'
    + 'if(!S&&!A){var c=document.getElementById("ctl"),b=document.getElementById("bar"),h=document.getElementById("hint");if(c)c.style.display="none";if(b)b.style.display="none";if(h)h.textContent="Letra sem sincronia automática — acompanhe pelo texto."}'
    + 'if(A){A.addEventListener("loadedmetadata",function(){if(ENG==="el"&&A.duration&&isFinite(A.duration)){DUR=A.duration;du.textContent=f(DUR)}});A.addEventListener("play",function(){if(ENG==="el")pp.textContent="❚❚"});A.addEventListener("pause",function(){if(ENG==="el")pp.textContent="▶"});A.addEventListener("ended",function(){if(ENG==="el")pp.textContent="▶"});A.addEventListener("timeupdate",tick);A.addEventListener("error",function(){if(ENG==="el")toWA("player nativo indisponível",false)});A.volume=0.9}'
    + 'pp.onclick=function(){if(ENG==="el"){if(A.paused){var p;try{p=A.play()}catch(e){toWA(e&&e.name,true);return}if(p&&p.catch)p.catch(function(e){toWA(e&&e.name,true)});setTimeout(function(){if(ENG==="el"&&!A.paused&&A.currentTime<=0.01)toWA("sem som",true)},2500)}else A.pause()}'
    + 'else if(ENG==="wa"){if(WA.pl)waStop();else waStart()}else{if(run){pos=now();run=false;pp.textContent="▶"}else{if(pos>=DUR)pos=0;t0=Date.now();run=true;pp.textContent="❚❚"}}tick()};'
    + 'sl.oninput=function(){setPos(sl.value/1000*DUR)};'
    + 'document.getElementById("pv").onclick=function(){setPos(0)};document.getElementById("nx").onclick=function(){setPos(now()+10)};'
    + 'document.getElementById("m5").onclick=function(){setPos(now()-0.5)};document.getElementById("p5").onclick=function(){setPos(now()+0.5)};'
    + 'var rp=document.getElementById("rp");if(rp)rp.onclick=function(){var on=!(A&&A.loop)&&!WA.loop;if(A)A.loop=on;WA.loop=on;if(WA.s)WA.s.loop=on;rp.classList.toggle("on",on)};'
    + 'var vo=document.getElementById("vo");if(vo)vo.oninput=function(){var v=this.value/100;if(A)A.volume=v;WA.vol=v;if(WA.g)WA.g.gain.value=v};tick();';
  const body = '<div class="card"><div class="top"><div class="cv">' + (coverUri ? '<img src="' + coverUri + '">' : '🎵') + '</div>'
    + '<div><div class="brand">' + esc(BOT) + ' Music</div><h2>' + esc(clip(t.title, 50)) + '</h2><div class="art">' + esc(clip(t.artist || 'YouTube', 50)) + '</div></div></div>'
    + '<div class="hint clk" id="hint">▶ Dê play no áudio da conversa e toque em ▶ aqui ao mesmo tempo. Se a letra ficar adiantada ou atrasada, ajuste com −0,5s / +0,5s.</div>'
    + '<div class="bar" id="bar"><input type="range" id="sl" min="0" max="1000" value="0"><div class="tm"><span id="cu">0:00</span><span id="du">' + fmt(dur) + '</span></div></div>'
    + '<div class="ctl" id="ctl"><button class="sm clk" id="m5">−0,5s</button><button id="pv">⏮</button><button class="pp" id="pp">▶</button><button id="nx">⏭</button><button class="sm clk" id="p5">+0,5s</button></div>'
    + '<div class="vol au"><button id="rp">🔁</button><input type="range" id="vo" min="0" max="100" value="90"></div><div id="stt" class="art" style="font-size:11px;margin-top:8px;min-height:14px;text-align:center"></div></div>'
    + '<div class="card"><div class="lh"><div><b>LETRA DA MÚSICA</b><small>' + esc(clip(lyr ? lyr.label : 'Sem letra', 70)) + '</small></div>'
    + '<span class="badge">' + (synced ? 'SINCRONIZADO' : (lyr ? 'SEM SINCRONIA' : 'INDISPONÍVEL')) + '</span></div><div id="ly"></div></div>'
    + (hasA ? '<audio id="a" preload="auto"></audio>' : '');
  return shell(PANEL_CSS, body, { aud: hasA, code: js.replace('__DATA__', function () { return data; }) });
}

/* ---------- painéis de TESTE (descobrir o que o seu WhatsApp aceita) ---------- */
function buildTestSize(kb) {
  const filler = crypto.randomBytes(Math.floor(kb * 1024 * 0.75)).toString('base64');
  const sug = Math.max(100, Math.floor((kb - 80) / 1.34));
  const body = '<div class="card"><h2>🧪 Teste de tamanho</h2><div style="font-size:42px;font-weight:bold;margin:14px 0">' + kb + ' KB</div>'
    + '<div class="art">Se você consegue ler isto, o WhatsApp aceitou uma mensagem deste tamanho.</div>'
    + '<div style="margin-top:14px;font-size:15px;background:#242424;border-radius:12px;padding:12px">Para usar este tamanho, mande:<br><b>.ytplay3 limite ' + sug + '</b></div></div><!--' + filler + '-->';
  return shell(PANEL_CSS, body, null);
}
function buildTestNet() {
  const body = '<div class="card"><h2>🧪 Teste de rede</h2>'
    + '<div id="r1" style="margin:12px 0">🔊 Áudio de um site: testando…</div><audio id="a1" controls preload="auto" style="width:100%" src="https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg"></audio>'
    + '<div id="r2" style="margin:12px 0">🖼️ Imagem de um site: testando…</div><img id="i1" width="100" src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/200px-Wikipedia-logo-v2.svg.png"></div>';
  const js = 'var a=document.getElementById("a1"),i=document.getElementById("i1"),r1=document.getElementById("r1"),r2=document.getElementById("r2");'
    + 'a.addEventListener("loadeddata",function(){r1.textContent="🔊 Áudio de um site: ✅ CARREGOU"});a.addEventListener("error",function(){r1.textContent="🔊 Áudio de um site: ❌ BLOQUEADO"});'
    + 'i.onload=function(){r2.textContent="🖼️ Imagem de um site: ✅ CARREGOU"};i.onerror=function(){r2.textContent="🖼️ Imagem de um site: ❌ BLOQUEADA"};'
    + 'setTimeout(function(){if(r1.textContent.indexOf("testando")>0)r1.textContent="🔊 Áudio de um site: ❌ nada carregou";if(r2.textContent.indexOf("testando")>0)r2.textContent="🖼️ Imagem de um site: ❌ nada carregou"},8000);';
  return shell(PANEL_CSS, body, { code: js });
}

/* Estrutura da mensagem interativa — crédito: TIO INO */
function montarMensagem(html, responseId, titulo) {
  const payload = {
    response_id: responseId,
    sections: [{ view_model: { primitive: { text: '> ' + titulo, __typename: 'GenAIMarkdownTextUXPrimitive' }, __typename: 'GenAISingleLayoutViewModel' } }],
    embedded_screens: [{ title: titulo, content: [{ __typename: 'FOAIDNixelButtonSheets', tabs: [{ id: 'tab_0', tab_header: titulo, sections: [{ __typename: 'GenAIUnifiedResponseSection', view_model: { __typename: 'GenAISingleLayoutViewModel', primitive: { __typename: 'GenAIaeacdsnwHtmlPrimitive', payload: html } } }] }] }] }]
  };
  return {
    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
    botForwardedMessage: { message: { richResponseMessage: {
      messageType: 1,
      submessages: [{ messageType: 2, messageText: titulo }],
      unifiedResponse: { data: Buffer.from(JSON.stringify(payload)).toString('base64') },
      contextInfo: { forwardingScore: 1, isForwarded: true, forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' }, forwardOrigin: 4 }
    } } }
  };
}

/* ---------- comando ---------- */
async function sendPanel(ctx, html, titulo, ms) {
  await withTimeout(ctx.sock.relayMessage(ctx.jid, montarMensagem(html, 'ytplay3-' + crypto.randomUUID(), titulo), {}), ms || 60000, null);
}
async function isOwnerCtx(ctx) { try { return !!ctx.isOwner(); } catch (_) { return false; } }

async function runTeste(ctx) {
  if (!(await isOwnerCtx(ctx))) return ctx.reply('❌ Só o dono pode usar o teste.');
  await ctx.reply('🧪 Mandando painéis de teste (rede + 5 tamanhos). Abra cada um em *Ver detalhes*. O *maior* que abrir mostra o comando de limite para usar (mais KB = som melhor).');
  const jobs = [['🧪 TESTE REDE', buildTestNet()]].concat([800, 1200, 1700, 2300, 3000].map(function (k) { return ['🧪 TESTE ' + k + ' KB', buildTestSize(k)]; }));
  for (let i = 0; i < jobs.length; i++) {
    try { await sendPanel(ctx, jobs[i][1], jobs[i][0], 90000); } catch (e) { console.error('[ytplay3] teste', jobs[i][0], e && e.message); }
    await new Promise(function (r) { setTimeout(r, 800); });
  }
}
async function runLimite(ctx) {
  const cfg = readCfg();
  const v = parseInt((ctx.args || [])[1], 10);
  const p = ctx.prefix || '!';
  const q4 = function (kb) { return Math.min(cfg.codec === 'opus' ? 160 : 128, Math.floor(kb * 8192 / 240 / 1000)); };
  if (!v) return ctx.reply('🎚️ *Limite do áudio no painel:* ' + cfg.audioKB + ' KB (a mensagem fica ~' + Math.round(cfg.audioKB * 1.8) + ' KB)\nCodec: *' + cfg.codec + '*\nMúsica de 4 min = ~' + q4(cfg.audioKB) + ' kbps.\n\nQuanto maior o limite, melhor o som:\n• 700 KB ≈ 24 kbps (básico)\n• 1200 KB ≈ 40 kbps (bom)\n• 1800 KB ≈ 60 kbps (muito bom)\n• 2500 KB ≈ 85 kbps (ótimo)\n\nPara mudar: *' + p + 'ytplay3 limite 1800*\nPara descobrir o máximo que o seu WhatsApp aceita: *' + p + 'ytplay3 teste*');
  if (!(await isOwnerCtx(ctx))) return ctx.reply('❌ Só o dono pode mudar o limite.');
  const kb = Math.max(100, Math.min(8000, v));
  writeCfg(Object.assign(cfg, { audioKB: kb }));
  return ctx.reply('✅ Limite do áudio no painel: *' + kb + ' KB* (~' + q4(kb) + ' kbps numa música de 4 min). A mensagem fica de ~' + Math.round(kb * 1.8) + ' KB.\nSe o painel parar de abrir (aparece só o nome da música), use *' + (ctx.prefix || '!') + 'ytplay3 menor*.' + (kb > 1000 ? '\n⚠️ Acima de ~1000 KB o WhatsApp pode não abrir o painel. Confirme com *' + (ctx.prefix || '!') + 'ytplay3 teste*.' : ''));
}
async function runMenor(ctx) {
  const cfg = readCfg();
  if (!(await isOwnerCtx(ctx))) return ctx.reply('❌ Só o dono pode usar isto.');
  const kb = Math.max(300, Math.floor(cfg.audioKB * 0.7));
  writeCfg(Object.assign(cfg, { audioKB: kb }));
  return ctx.reply('✅ Diminuí o limite para *' + kb + ' KB* (mensagem de ~' + Math.round(kb * 1.8) + ' KB). Peça a música de novo.\nSe ainda não abrir, mande *' + (ctx.prefix || '!') + 'ytplay3 menor* outra vez.');
}
async function runCodec(ctx) {
  const cfg = readCfg();
  const c = String((ctx.args || [])[1] || '').toLowerCase();
  const p = ctx.prefix || '!';
  if (c !== 'opus' && c !== 'mp3') return ctx.reply('🎧 *Codec do áudio:* ' + cfg.codec + '\n\n• *opus* = melhor som no mesmo tamanho (Android)\n• *mp3* = toca em qualquer aparelho, inclusive iPhone\n\nPara mudar: *' + p + 'ytplay3 codec mp3*');
  if (!(await isOwnerCtx(ctx))) return ctx.reply('❌ Só o dono pode mudar o codec.');
  writeCfg(Object.assign(cfg, { codec: c }));
  return ctx.reply('✅ Codec do áudio: *' + c + '*');
}

module.exports = {
  name: 'ytplay3',
  aliases: ['ytletra', 'musicaletra', 'playletra'],
  category: 'utilidades',
  description: 'Música do YouTube tocando num painel com letra sincronizada',
  usage: 'ytplay3 nome da música',
  handler: withDownloadLock('ytplay3', async function (ctx) {
    const args = (ctx.args || []).slice();
    const first = String(args[0] || '').toLowerCase();
    if (first === 'teste' && args.length === 1) return runTeste(ctx);
    if (first === 'limite') return runLimite(ctx);
    if (first === 'codec') return runCodec(ctx);
    if (first === 'menor') return runMenor(ctx);
    const query = args.join(' ').trim();
    if (!query) return ctx.reply('🎵 *ytplay3*\n\nUso: *' + (ctx.prefix || '!') + 'ytplay3 nome da música*\nEx.: ' + (ctx.prefix || '!') + 'ytplay3 sad girl lana del rey');
    if (!ctx.sock || !ctx.jid) return ctx.reply('❌ Chat/socket inválido.');
    const outDir = path.join(process.cwd(), 'tmp', 'ytplay3');
    const bag = [];
    const T0 = Date.now();
    const cfg = readCfg();
    const react = async function (e) { try { if (ctx.msg && ctx.msg.key) await ctx.sock.sendMessage(ctx.jid, { react: { text: e, key: ctx.msg.key } }); } catch (_) {} };
    const sendAudio = function (t) { return ctx.sock.sendMessage(ctx.jid, { audio: fs.readFileSync(t.audio), mimetype: 'audio/mpeg', fileName: clip(t.title, 60) + '.mp3', ptt: false }, { quoted: ctx.msg }); };
    try {
      await react('🎵');
      const t = await fetchTrack(query, outDir, bag, cfg);
      const titulo = '🎵 ' + clip(t.title + (t.artist ? ' — ' + t.artist : ''), 60);
      if (t.embed) {
        // UMA mensagem só: o painel com a música tocando dentro
        const b64 = fs.readFileSync(t.audio).toString('base64');
        const html = buildHtml(t, t.lyr, b64, t.mime);
        console.log('[ytplay3] painel com áudio: ' + Math.round(html.length / 1024) + ' KB de HTML');
        try {
          await sendPanel(ctx, html, titulo, 120000);
          console.log('[ytplay3] ' + secs(T0) + ' painel enviado');
        } catch (e) {
          console.error('[ytplay3] painel grande falhou, mandando áudio normal:', e && e.message);
          await sendAudio(t);
        }
      } else {
        // música que não cabe: áudio + painel com letra (modo antigo)
        await sendAudio(t);
        if (t.lyr && t.lyr.lines.length) { try { await sendPanel(ctx, buildHtml(t, t.lyr, null), titulo, 40000); } catch (e) { console.error('[ytplay3] painel:', e && e.message); } }
      }
      await react('✅');
    } catch (e) {
      console.error('[ytplay3] erro:', e && e.message);
      try { await ctx.reply('❌ ' + String((e && e.message) || 'Erro ao processar.').slice(0, 300)); } catch (_) {}
    } finally {
      for (const f of bag) { try { fs.unlinkSync(f); } catch (_) {} }
    }
  }),
  _t: { fitAudio: fitAudio, parseLrc: parseLrc, cleanTitle: cleanTitle, guessTrack: guessTrack, buildHtml: buildHtml, montarMensagem: montarMensagem, readCfg: readCfg, buildTestSize: buildTestSize, buildTestNet: buildTestNet }
};
