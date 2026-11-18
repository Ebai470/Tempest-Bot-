'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const FILE = path.join(process.cwd(), 'data', 'welcome2.json');
let state = {};
try { state = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { state = {}; }
function save() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(state)); } catch (e) { console.error('[welcome2] salvar', e.message); } }
const isOn = (jid) => !!state[jid];
function setOn(jid, on) { if (on) state[jid] = true; else delete state[jid]; save(); }

const numOf = (j) => String(j || '').split('@')[0].split(':')[0];
function fetchBuf(url, depth) {
  return new Promise((resolve, reject) => {
    const lib = String(url).startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (depth || 0) < 3) { res.resume(); return fetchBuf(res.headers.location, (depth || 0) + 1).then(resolve, reject); }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const ch = []; res.on('data', (c) => ch.push(c)); res.on('end', () => resolve(Buffer.concat(ch)));
    });
    req.on('error', reject); req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// fila unica: um video de cada vez (nao trava o celular)
let chain = Promise.resolve(), pending = 0;
function run(fn) { pending++; const p = chain.then(fn, fn); chain = p.catch(() => {}).then(() => { pending--; }); return p; }

async function buildWelcome(sock, groupJid, memberJid, opts) {
  opts = opts || {};
  const { renderWelcome } = require('./welcomeCard');
  const num = numOf(opts.phone || memberJid);
  let name = opts.name || ('+' + num);
  let group = 'Tempest', count = 0;
  if (String(groupJid).endsWith('@g.us')) {
    try {
      const meta = await sock.groupMetadata(groupJid);
      group = meta.subject || group;
      const parts = meta.participants || [];
      const idx = parts.findIndex((p) => [p.id, p.jid, p.phoneNumber, p.lid].some((x) => x && numOf(x) === numOf(memberJid)));
      count = idx >= 0 ? idx + 1 : parts.length;
    } catch (_) {}
  }
  let avatar = null;
  try { const url = await sock.profilePictureUrl(memberJid, 'image'); if (url) avatar = await fetchBuf(url); } catch (_) {}
  const r = await renderWelcome({ avatar: avatar, name: name, group: group, count: count, seed: num });
  return { video: r.video, caption: '👋 Bem-vindo(a) @' + numOf(memberJid) + ' ao *' + group + '*!', mentions: [memberJid] };
}

async function sendWelcome(sock, groupJid, memberJid, opts, quoted) {
  const w = await buildWelcome(sock, groupJid, memberJid, opts);
  return sock.sendMessage(groupJid, { video: w.video, gifPlayback: true, mimetype: 'video/mp4', caption: w.caption, mentions: w.mentions }, quoted ? { quoted: quoted } : undefined);
}

const recent = new Map();
async function handle(sock, update) {
  if (!update || update.action !== 'add' || !isOn(update.id)) return;
  const me = numOf(sock.user && sock.user.id);
  for (const p of (update.participants || [])) {
    const jid = typeof p === 'string' ? p : (p && (p.id || p.jid));
    const phone = (p && typeof p === 'object') ? (p.phoneNumber || '') : '';
    if (!jid || numOf(jid) === me) continue;
    const key = update.id + '|' + numOf(jid), now = Date.now();
    if (recent.has(key) && now - recent.get(key) < 60000) continue;   // evita duplicado
    recent.set(key, now);
    for (const [k, t] of recent) if (now - t > 120000) recent.delete(k);
    if (pending >= 8) { console.error('[welcome2] fila cheia, pulando', numOf(jid)); continue; }
    run(() => sendWelcome(sock, update.id, jid, { phone: phone })).catch((e) => console.error('[welcome2] auto:', e && e.message));
  }
}

module.exports = { isOn, setOn, handle, run, buildWelcome, sendWelcome, numOf };
