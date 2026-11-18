'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function plain(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function install(exp) {
  const ROOT = exp.ROOT;
  const FILES = exp.FILES;
  const META = path.join(ROOT, 'meta.json');
  const BAK = META + '.bak';
  const norm = exp.normKey;

  function parseFile(p) {
    try {
      if (!fs.existsSync(p)) return null;
      const t = fs.readFileSync(p, 'utf8');
      if (!t.trim()) return null;
      const o = JSON.parse(t);
      return o && typeof o === 'object' ? o : null;
    } catch (_) { return null; }
  }

  function readMeta() {
    const main = parseFile(META);
    if (main) return main;
    const bak = parseFile(BAK);
    if (bak) {
      console.error('[commandMedia] meta.json invalido; recuperado do backup');
      try { fs.copyFileSync(BAK, META); } catch (_) {}
      return bak;
    }
    if (fs.existsSync(META)) { try { fs.copyFileSync(META, META + '.corrupt-' + Date.now()); } catch (_) {} }
    return {};
  }

  function writeMeta(meta) {
    fs.mkdirSync(ROOT, { recursive: true });
    const cur = parseFile(META);
    if (cur && Object.keys(cur).length) { try { fs.copyFileSync(META, BAK); } catch (_) {} }
    const tmp = META + '.tmp-' + process.pid;
    fs.writeFileSync(tmp, JSON.stringify(meta, null, 2));
    fs.renameSync(tmp, META);
  }

  function findKey(meta, key) {
    if (meta[key]) return key;
    const p = plain(key);
    const ks = Object.keys(meta);
    for (let i = 0; i < ks.length; i++) if (plain(ks[i]) === p) return ks[i];
    return null;
  }

  function refCount(meta, file, exceptKey) {
    return Object.keys(meta).filter((k) => k !== exceptKey && meta[k] && meta[k].file === file).length;
  }

  function get(commandName) {
    const key = norm(commandName);
    if (!key) return null;
    const meta = readMeta();
    const k = findKey(meta, key);
    if (!k) return null;
    const entry = meta[k];
    if (!entry || !entry.file) return null;
    const full = path.join(FILES, entry.file);
    if (!fs.existsSync(full)) return null;
    return { command: k, file: full, type: entry.type || 'image', mimetype: entry.mimetype || 'image/jpeg', name: entry.file };
  }

  function list() {
    const meta = readMeta();
    return Object.keys(meta).sort().map((k) => ({ command: k, type: meta[k].type, file: meta[k].file }));
  }

  function set(commandName, buffer, type, mimetype) {
    const key = norm(commandName);
    if (!key || !buffer || !Buffer.isBuffer(buffer)) throw new Error('dados invalidos');
    const mt = String(mimetype || '').toLowerCase();
    const ext = (type === 'video' || type === 'gif') ? '.mp4' : (mt.indexOf('png') >= 0 ? '.png' : (mt.indexOf('webp') >= 0 ? '.webp' : '.jpg'));
    const slug = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').slice(0, 40) || 'media';
    const hash = crypto.createHash('sha1').update(key).digest('hex').slice(0, 6);
    const fileName = slug + '_' + hash + ext;
    const full = path.join(FILES, fileName);
    fs.mkdirSync(FILES, { recursive: true });
    const tmp = full + '.tmp-' + process.pid;
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, full);
    const meta = readMeta();
    const old = meta[key] && meta[key].file;
    meta[key] = { file: fileName, type: type || 'image', mimetype: mimetype || 'image/jpeg', updatedAt: new Date().toISOString() };
    writeMeta(meta);
    if (old && old !== fileName && refCount(meta, old, key) === 0) {
      try { fs.unlinkSync(path.join(FILES, old)); } catch (_) {}
    }
    return { key: key, entry: meta[key] };
  }

  function remove(commandName) {
    const meta = readMeta();
    const key = findKey(meta, norm(commandName));
    if (!key) return false;
    const old = meta[key].file;
    delete meta[key];
    writeMeta(meta);
    if (old && refCount(meta, old, null) === 0) {
      try { fs.unlinkSync(path.join(FILES, old)); } catch (_) {}
    }
    return true;
  }

  const MENTION = /^@\d{5,}$/;
  function isMenuFamily(name, extra) {
    return [name].concat(extra).some((n) => /^(menu|smenu|help|ajuda|comandos)/.test(n));
  }

  function resolve(commandName, args, aliases) {
    const name = norm(commandName);
    const a = (args || []).map((x) => norm(x)).filter(Boolean).filter((x) => !MENTION.test(x));
    const extra = (aliases || []).map((x) => norm(x)).filter(Boolean);
    if (a.length) {
      const cand = [name + ' ' + a.join(' '), name + a.join(''), name + ' ' + a[0]];
      extra.forEach((e) => { cand.push(e + ' ' + a.join(' ')); cand.push(e + ' ' + a[0]); });
      for (let i = 0; i < cand.length; i++) {
        const info = get(cand[i]);
        if (info) return info;
      }
      if (isMenuFamily(name, extra)) return null;
    }
    const keys = [name].concat(extra);
    for (let i = 0; i < keys.length; i++) {
      if (!keys[i]) continue;
      const info = get(keys[i]);
      if (info) return info;
    }
    return null;
  }

  exp.get = get;
  exp.list = list;
  exp.set = set;
  exp.remove = remove;
  exp.resolve = resolve;

  try {
    if (!fs.existsSync(BAK) && parseFile(META)) fs.copyFileSync(META, BAK);
    const meta = readMeta();
    const ks = Object.keys(meta);
    let miss = 0;
    ks.forEach((k) => { if (!meta[k] || !meta[k].file || !fs.existsSync(path.join(FILES, meta[k].file))) miss++; });
    console.log('[commandMedia] ' + ks.length + ' chaves; ' + miss + ' com ficheiro em falta');
  } catch (_) {}
}

module.exports = { install };
