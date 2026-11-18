'use strict';
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

// TP_DL2: todos os comandos que baixam midia
const SEARCH_CMDS = { ytplay: { asDoc: false }, ytplay2: { asDoc: true }, yt: { asDoc: false }, play: { asDoc: false } };
const URL_CMDS = { ytd: 'video', yta: 'audio' };
['tk', 'ig', 'fb', 'kw', 'pin', 'vk', 'twitch', 'rumble', 'vimeo', 'dailymotion', 'twitter', 'likee', 'snap', 'clapper', 'triller', 'lemon8', 'reddit', 'tumblr', 'threads', 'bilibili', 'snack', 'moj', 'josh', 'chingari', 'sharechat', 'zili'].forEach(function (n) { URL_CMDS[n] = 'both'; });

// TP_CURTOS: visual novo só para tk/ig/fb e similares (YouTube e outros ficam como estão)
const SHORT_LABELS = { tk: 'TIK TOK', ig: 'INSTAGRAM', fb: 'FACEBOOK', kw: 'KWAI', pin: 'PINTEREST', vk: 'VK', twitch: 'TWITCH', rumble: 'RUMBLE', vimeo: 'VIMEO', dailymotion: 'DAILYMOTION', twitter: 'TWITTER', likee: 'LIKEE', snap: 'SNAPCHAT', clapper: 'CLAPPER', triller: 'TRILLER', lemon8: 'LEMON8', reddit: 'REDDIT', tumblr: 'TUMBLR', threads: 'THREADS', bilibili: 'BILIBILI', snack: 'SNACK VIDEO', moj: 'MOJ', josh: 'JOSH', chingari: 'CHINGARI', sharechat: 'SHARECHAT', zili: 'ZILI' };
const pending = new Map();
const TTL = 15 * 60 * 1000;
setInterval(() => { const n = Date.now(); for (const [k, v] of pending) if (n - v.ts > TTL) pending.delete(k); }, 60000).unref();

function findYtDlp() {
  const list = [path.join(process.env.HOME || '', '.local/bin/yt-dlp'), '/data/data/com.termux/files/usr/bin/yt-dlp'];
  for (const c of list) { try { if (fs.existsSync(c)) return c; } catch (_) {} }
  return 'yt-dlp';
}

function run(args, timeoutMs, watchCancel) {
  return new Promise((resolve, reject) => {
    const env = Object.assign({}, process.env, { PATH: (process.env.HOME || '') + '/.local/bin:' + (process.env.PATH || '') });
    const child = execFile(findYtDlp(), args, { timeout: timeoutMs || 120000, maxBuffer: 40 * 1024 * 1024, env: env }, (err, stdout, stderr) => {
      if (iv) clearInterval(iv);
      if (err) return reject(new Error((stderr || err.message || 'erro').toString().slice(0, 300)));
      resolve(stdout || '');
    });
    let iv = null;
    if (watchCancel) {
      iv = setInterval(() => {
        try { if (require('../services/downloadQueue').isCancelled()) { child.kill('SIGKILL'); } } catch (_) {}
      }, 2000);
    }
  });
}

function fetchBuf(url, depth) {
  return new Promise((resolve, reject) => {
    const lib = String(url).startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 12000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (depth || 0) < 3) {
        res.resume(); return fetchBuf(res.headers.location, (depth || 0) + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const ch = []; res.on('data', (c) => ch.push(c)); res.on('end', () => resolve(Buffer.concat(ch)));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const fmtDur = (s) => { s = Math.max(0, parseInt(s, 10) || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
const fmtSize = (b) => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const safeName = (s) => String(s || 'media').replace(/[\/\\?%*:|"<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70) || 'media';
const clip = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const numOf = (jid) => String(jid || '').split('@')[0].split(':')[0];
const extractUrl = (t) => { const m = String(t || '').match(/https?:\/\/[^\s<>"']+/i); return m ? m[0].replace(/[)\].,;]+$/, '') : null; };

function quotedText(ctx) {
  const q = ctx.quoted;
  if (!q) return '';
  return q.conversation || (q.extendedTextMessage && q.extendedTextMessage.text) || '';
}

function newToken() { return Math.random().toString(36).slice(2, 8); }

function buildSections(job, heights, similar) {
  const sections = [];
  if (job.mode !== 'video') {
    sections.push({ title: '🎵 Opções de Áudio (MP3)', rows: [
      { header: '', title: 'Áudio Padrão (128kbps)', description: 'Qualidade padrão recomendada', id: 'dl:' + job.token + ':a128' },
      { header: '', title: 'Áudio Boa Qualidade (192kbps)', description: 'Qualidade intermediária otimizada', id: 'dl:' + job.token + ':a192' },
      { header: '', title: 'Áudio Máxima Qualidade (320kbps)', description: 'Melhor qualidade de áudio disponível', id: 'dl:' + job.token + ':a320' }
    ] });
  }
  if (job.mode !== 'audio') {
    const opts = [[360, 'Vídeo 360p', 'Baixar em resolução 360p'], [720, 'Vídeo 720p (HD)', 'Baixar em resolução HD'], [1080, 'Vídeo 1080p (Full HD)', 'Baixar em resolução Full HD']];
    const maxH = heights && heights.length ? Math.max.apply(null, heights) : 0;
    const rows = [];
    for (const o of opts) if (!maxH || o[0] <= maxH || o[0] === 360) rows.push({ header: '', title: o[1], description: o[2], id: 'dl:' + job.token + ':v' + o[0] });
    if (!maxH || rows.length < 2) rows.push({ header: '', title: 'Vídeo (melhor qualidade)', description: 'Melhor qualidade disponível', id: 'dl:' + job.token + ':vbest' });
    sections.push({ title: '🎬 Opções de Vídeo (MP4)', rows: rows });
  }
  if (similar && similar.length) {
    sections.push({ title: '🔎 Vídeos Similares', rows: similar.map((s, i) => ({
      header: '', title: clip(s.title, 60), description: '⏱️ ' + fmtDur(s.duration) + ' • ' + clip(s.channel, 40), id: 'dl:' + job.token + ':s' + i
    })) });
  }
  return sections;
}

async function sendChoice(ctx, job, meta, similar) {
  job.token = job.token || newToken();
  job.ts = Date.now();
  job.similar = similar || [];
  pending.set(job.token, job);
  const num = numOf(job.requester);
  const body =
    '┌─〔 ' + (job.mode === 'audio' ? '🎵' : '📥') + ' *' + String(config.botName).toUpperCase() + ' • DOWNLOAD* 〕─┐\n' +
    '│\n' +
    '│ 📌 *Título:* ' + clip(meta.title, 90) + '\n' +
    (meta.channel ? '│ 💬 *Canal:* ' + clip(meta.channel, 50) + '\n' : '') +
    (meta.duration ? '│ ⏳ *Duração:* ' + fmtDur(meta.duration) + '\n' : '') +
    (meta.source ? '│ 🌐 *Fonte:* ' + meta.source + '\n' : '') +
    '│ 👤 *Pedido de:* @' + num + '\n' +
    '│\n' +
    '│ ✨ Escolha a qualidade desejada abaixo!\n' +
    '└──────────────────┘';
  const _short = SHORT_LABELS[job.cmd];
  let bodyOut = body;
  if (_short) {
    bodyOut =
      '🍇`' + _short + '`\n\n' +
      '> 📌 *Título:* ' + clip(meta.title, 90) + '\n' +
      '> 💬 *Canal:* ' + clip(meta.channel || '—', 50) + '\n' +
      '> ⏳ *Duração:* ' + (meta.duration ? fmtDur(meta.duration) : '—') + '\n' +
      '> 👤 Pedido de: @' + num + '\n' +
      '> ✨ Escolha a qualidade desejada abaixo!\n\n' +
      '> © ' + config.botName + ' • Download Engine';
  }
  let image = null; // TP_CURTOS2
  if (meta.thumb && !_short) { try { image = await fetchBuf(meta.thumb); if (!image || image.length < 500) image = null; } catch (_) { image = null; } }
  let _vid = null; // TP_CURTOS3: usa a mídia do setmidia dentro do card
  if (_short) {
    try {
      const _cm = require('../services/commandMedia');
      const _inf = _cm.resolve(job.cmd, [], [job.cmd]);
      if (_inf && _inf.file) {
        const _buf = fs.readFileSync(_inf.file);
        if (_inf.type === 'video' || _inf.type === 'gif') _vid = { v: _buf, gif: _inf.type === 'gif' }; else image = _buf;
        ctx.__tpMediaUsed = true;
      }
    } catch (_) {}
  }
  await sendNative(ctx.sock, ctx.jid, {
    title: _short ? '⋆. 𐙚˚࿔ 𝔗𝔢𝔪𝔭𝔢𝔰𝔱 𝔟𝔬𝔱 𝜗𝜚˚⋆' : '🎛️ ' + config.botName,
    subtitle: _short ? '⋆｡𖦹°⭒˚｡⋆⋆｡𖦹°⭒˚｡⋆' : '',
    body: bodyOut,
    footer: _short ? '' : '© ' + config.botName + ' • Download Engine',
    noFormat: !!_short,
    video: _vid ? _vid.v : undefined,
    gifPlayback: _vid ? _vid.gif : false,
    image: image,
    mentions: job.requester ? [job.requester] : [],
    quoted: ctx.msg,
    buttons: [
      btn.list('🎛️ Escolher Qualidade', buildSections(job, meta.heights, job.similar)),
      btn.channel('📢 Canal'),
      btn.copy('📋 Copiar link', job.url)
    ],
    fallback: '📥 ' + meta.title + '\n\nUse: ' + (ctx.prefix || '!') + 'ytd ' + job.url
  });
}

// TP_YT: tenta varios clientes do YouTube (idade/login) + cookies.txt
let ytNode = true;
function cookiesArgs() {
  const c = getEnv('YT_COOKIES') || path.join(process.cwd(), 'cookies.txt');
  try { if (fs.existsSync(c)) return ['--cookies', c]; } catch (_) {}
  return [];
}
const YT_TRIES = [[], ['--extractor-args', 'youtube:player_client=tv_embedded'], ['--extractor-args', 'youtube:player_client=android_vr'], ['--extractor-args', 'youtube:player_client=ios'], ['--extractor-args', 'youtube:player_client=mweb']];
const isYt = (u) => /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(String(u || ''));
async function runDl(url, args, timeoutMs, watch) {
  if (!isYt(url)) return run(args, timeoutMs, watch);
  let lastErr = null;
  const base = cookiesArgs();
  for (let i = 0; i < YT_TRIES.length; i++) {
    const extra = (ytNode ? ['--js-runtimes', 'node'] : []).concat(base, YT_TRIES[i]);
    try { return await run(extra.concat(args), timeoutMs, watch); }
    catch (e) {
      lastErr = e;
      const m = String(e.message || '');
      if (/kill|SIGKILL/i.test(m)) throw e;
      if (ytNode && /no such option|unrecognized arguments|js-runtimes/i.test(m)) { ytNode = false; i--; continue; }
      if (/Private video|Video unavailable|has been removed|copyright|not available in your country|members-only/i.test(m) && !/sign in|age/i.test(m)) break;
    }
  }
  const m = String((lastErr && lastErr.message) || '');
  if (/confirm your age|sign in to confirm|not a bot|--cookies/i.test(m)) {
    throw new Error('O YouTube pediu login/idade para este vídeo. Coloque um arquivo cookies.txt do YouTube na pasta do bot e tente de novo (e atualize: pip install -U "yt-dlp[default]").');
  }
  throw lastErr || new Error('Falha ao baixar');
}

async function infoFromUrl(url) {
  const raw = await runDl(url, [url, '--dump-json', '--no-playlist', '--skip-download', '--no-warnings', '--no-check-certificates'], 60000);
  const line = raw.split('\n').find((l) => l.trim().startsWith('{')) || raw;
  const i = JSON.parse(line);
  const heights = (i.formats || []).map((f) => f.height).filter((h) => h && h > 0);
  return { title: i.title || i.fulltitle || 'Mídia', channel: i.uploader || i.channel || '', duration: i.duration || 0, thumb: i.thumbnail || null, source: i.extractor_key || i.extractor || '', heights: heights };
}

async function searchYt(q, n) {
  const raw = await run(['ytsearch' + n + ':' + q, '--flat-playlist', '--dump-json', '--no-warnings', '--no-check-certificates'], 50000);
  return raw.split('\n').filter((l) => l.trim().startsWith('{')).map((l) => { try { return JSON.parse(l); } catch (_) { return null; } }).filter((x) => x && x.id)
    .map((x) => ({ id: x.id, title: x.title || x.id, duration: x.duration || 0, channel: x.channel || x.uploader || 'YouTube', url: 'https://www.youtube.com/watch?v=' + x.id }));
}

async function intercept(ctx, name) {
  if (String(getEnv('DL_BUTTONS') || '').toLowerCase() === 'off') return false;
  if (!ctx.sock || !ctx.jid) return false;
  if (name === 'play' && String(getEnv('PLAY_YT') || '').toLowerCase() === 'off') return false;
  const text = (ctx.args || []).join(' ').trim();
  if (SEARCH_CMDS[name]) {
    if (!text) return false;
    const direct = extractUrl(text);
    try { if (ctx.msg && ctx.msg.key) await ctx.sock.sendMessage(ctx.jid, { react: { text: '🔎', key: ctx.msg.key } }); } catch (_) {}
    const job = { cmd: name, mode: 'both', asDoc: SEARCH_CMDS[name].asDoc, requester: ctx.sender, chat: ctx.jid };
    if (direct) {
      const meta = await infoFromUrl(direct);
      job.url = direct; job.title = meta.title;
      await sendChoice(ctx, job, meta, []);
      return true;
    }
    const res = await searchYt(text, 6);
    if (!res.length) return false;
    const main = res[0];
    job.url = main.url; job.title = main.title;
    await sendChoice(ctx, job, { title: main.title, channel: main.channel, duration: main.duration, thumb: 'https://i.ytimg.com/vi/' + main.id + '/hqdefault.jpg', source: 'YouTube', heights: [] }, res.slice(1));
    return true;
  }
  if (URL_CMDS[name]) {
    const url = extractUrl(text) || extractUrl(quotedText(ctx));
    if (!url) return false;
    try { if (ctx.msg && ctx.msg.key) await ctx.sock.sendMessage(ctx.jid, { react: { text: '🔎', key: ctx.msg.key } }); } catch (_) {}
    const meta = await infoFromUrl(url);
    await sendChoice(ctx, { cmd: name, mode: URL_CMDS[name], asDoc: false, requester: ctx.sender, chat: ctx.jid, url: url, title: meta.title }, meta, []);
    return true;
  }
  return false;
}

let busy = 0;
async function download(job, choice, onStatus) {
  const outDir = path.join(process.cwd(), 'tmp', 'dlui');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now() + '_' + Math.floor(Math.random() * 1000);
  const tpl = path.join(outDir, 'ui_' + stamp + '.%(ext)s');
  const isAudio = choice[0] === 'a';
  const common = ['--no-playlist', '--no-warnings', '--no-check-certificates', '-N', '8', '--retries', '3', '-o', tpl, job.url];
  if (isAudio) {
    const kb = parseInt(choice.slice(1), 10) || 128;
    await runDl(job.url, ['-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', kb + 'K'].concat(common), 180000, true);
  } else {
    const h = parseInt(choice.slice(1), 10);
    const fmt = h ? 'bv*[height<=' + h + ']+ba/b[height<=' + h + ']/bv*+ba/b' : 'bv*+ba/b';
    try { await runDl(job.url, ['-f', fmt, '--merge-output-format', 'mp4'].concat(common), 240000, true); }
    catch (e) { if (/kill|SIGKILL/i.test(e.message)) throw e; await runDl(job.url, ['-f', 'best'].concat(common), 240000, true); }
  }
  const files = fs.readdirSync(outDir).filter((f) => f.startsWith('ui_' + stamp)).map((f) => path.join(outDir, f));
  const file = files.find((f) => /\.(mp3|mp4|m4a|webm|mkv|opus)$/i.test(f)) || files[0];
  if (!file) throw new Error('Arquivo não encontrado após o download.');
  return { file: file, files: files, size: fs.statSync(file).size, isAudio: isAudio };
}

async function handleChoice(ctx, rest) {
  const i = rest.indexOf(':');
  const token = rest.slice(0, i), choice = rest.slice(i + 1);
  const job = pending.get(token);
  const say = (t, o) => ctx.sock.sendMessage(ctx.jid, Object.assign({ text: t }, o || {}));
  if (!job) return say('⌛ Esse menu expirou. Peça o download de novo.');
  if (numOf(ctx.sender) !== numOf(job.requester) && ctx.sender !== job.requester) {
    return say('🚫 Só quem pediu o download pode escolher.', { mentions: [job.requester] });
  }
  if (choice[0] === 's') {
    const s = job.similar[parseInt(choice.slice(1), 10)];
    if (!s) return say('❌ Opção inválida.');
    const nj = { cmd: job.cmd, mode: job.mode, asDoc: job.asDoc, requester: job.requester, chat: job.chat, url: s.url, title: s.title };
    return sendChoice(ctx, nj, { title: s.title, channel: s.channel, duration: s.duration, thumb: 'https://i.ytimg.com/vi/' + s.id + '/hqdefault.jpg', source: 'YouTube', heights: [] }, []);
  }
  if (job.running) return say('⏳ Esse download já está em andamento.');
  job.running = true;
  const label = choice[0] === 'a' ? 'áudio ' + choice.slice(1) + 'kbps' : (choice === 'vbest' ? 'vídeo (melhor)' : 'vídeo ' + choice.slice(1) + 'p');
  const dq = (() => { try { return require('../services/downloadQueue'); } catch (_) { return null; } })();
  let files = [];
  let got = false;
  try {
    if (busy >= 2) await say('⏳ Muitos downloads agora. Seu pedido vai entrar na fila…');
    while (busy >= 2) await new Promise((r) => setTimeout(r, 2000));
    busy++; got = true;
    if (dq) dq.tryAcquire(ctx, 'download ' + label);
    await say('⬇️ Baixando *' + clip(job.title, 60) + '* em *' + label + '*… aguarde.');
    const r = await download(job, choice);
    files = r.files;
    if (r.size > 150 * 1024 * 1024) throw new Error('Arquivo grande demais (' + fmtSize(r.size) + '). Escolha uma qualidade menor.');
    const fileName = safeName(job.title) + (r.isAudio ? '.mp3' : '.mp4');
    const caption = '✅ *' + clip(job.title, 80) + '*\n📦 ' + fmtSize(r.size) + ' • ' + label + '\n\n© ' + config.botName;
    const asDoc = job.asDoc || r.size > 60 * 1024 * 1024;
    if (r.isAudio && !asDoc) {
      await ctx.sock.sendMessage(ctx.jid, { audio: { url: r.file }, mimetype: 'audio/mpeg', fileName: fileName, ptt: false });
    } else if (!r.isAudio && !asDoc) {
      await ctx.sock.sendMessage(ctx.jid, { video: { url: r.file }, mimetype: 'video/mp4', fileName: fileName, caption: caption });
    } else {
      await ctx.sock.sendMessage(ctx.jid, { document: { url: r.file }, mimetype: r.isAudio ? 'audio/mpeg' : 'video/mp4', fileName: fileName, caption: caption });
    }
    pending.delete(token);
  } catch (e) {
    job.running = false;
    await say('❌ Não consegui baixar.\n' + clip(e && e.message, 200));
  } finally {
    if (got) { busy = Math.max(0, busy - 1); if (dq) dq.release(); }
    for (const f of files) { try { fs.unlinkSync(f); } catch (_) {} }
  }
}

function wrapCommand(name) {
  const e = registry.get(name);
  if (!e || e.__tpDl) return;
  const orig = e.handler;
  e.handler = async function (ctx) {
    let shown = false;
    try { shown = await intercept(ctx, name); } catch (err) { console.error('[dl-ui]', name, err && err.message); }
    if (shown) return;
    return orig.call(this, ctx);
  };
  e.__tpDl = true;
}

Object.keys(SEARCH_CMDS).concat(Object.keys(URL_CMDS)).forEach(wrapCommand);
router.register('dl', handleChoice);

module.exports = { intercept, wrapCommand };
