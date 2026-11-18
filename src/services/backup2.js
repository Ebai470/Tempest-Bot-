'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { pipeline, Writable } = require('stream');

const ROOT = path.resolve(__dirname, '../..');
const PREFIX = 'tempest-bot/';

const CRC_TABLE = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crcUpdate(prev, buf) {
  let c = (prev ^ 0xFFFFFFFF) >>> 0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosTime(date) {
  const y = Math.max(1980, date.getFullYear());
  return {
    t: ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xFFFF,
    d: (((y - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xFFFF
  };
}

class ZipWriter {
  constructor(file) {
    this.out = fs.createWriteStream(file);
    this.offset = 0;
    this.entries = [];
    this.error = null;
    this.out.on('error', (e) => { this.error = e; });
  }

  write(buf) {
    if (this.error) return Promise.reject(this.error);
    this.offset += buf.length;
    return new Promise((resolve, reject) => {
      const onErr = (e) => reject(e);
      this.out.once('error', onErr);
      if (this.out.write(buf)) { this.out.removeListener('error', onErr); resolve(); }
      else this.out.once('drain', () => { this.out.removeListener('error', onErr); resolve(); });
    });
  }

  async addFile(abs, name, stat) {
    const nameBuf = Buffer.from(name.replace(/\\/g, '/'), 'utf8');
    const tm = dosTime(stat.mtime);
    const localOffset = this.offset;
    if (localOffset > 0xFFFFFFF0) throw new Error('backup maior que 4 GB nao suportado');
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x0808, 6);
    h.writeUInt16LE(8, 8);
    h.writeUInt16LE(tm.t, 10);
    h.writeUInt16LE(tm.d, 12);
    h.writeUInt16LE(nameBuf.length, 26);
    await this.write(Buffer.concat([h, nameBuf]));

    let crc = 0, usize = 0, csize = 0;
    const self = this;
    const src = fs.createReadStream(abs);
    src.on('data', (c) => { crc = crcUpdate(crc, c); usize += c.length; });
    await new Promise((resolve, reject) => {
      pipeline(src, zlib.createDeflateRaw({ level: 6 }), new Writable({
        write(chunk, enc, cb) { csize += chunk.length; self.write(chunk).then(() => cb(), cb); }
      }), (err) => (err ? reject(err) : resolve()));
    });
    if (usize > 0xFFFFFFF0 || csize > 0xFFFFFFF0) throw new Error('ficheiro maior que 4 GB nao suportado: ' + name);

    const dd = Buffer.alloc(16);
    dd.writeUInt32LE(0x08074b50, 0);
    dd.writeUInt32LE(crc, 4);
    dd.writeUInt32LE(csize, 8);
    dd.writeUInt32LE(usize, 12);
    await this.write(dd);
    this.entries.push({ nameBuf: nameBuf, crc: crc, csize: csize, usize: usize, tm: tm, offset: localOffset });
  }

  async finish() {
    if (this.entries.length > 65535) throw new Error('demasiados ficheiros para zip simples');
    const cdStart = this.offset;
    for (const e of this.entries) {
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0);
      c.writeUInt16LE((3 << 8) | 20, 4);
      c.writeUInt16LE(20, 6);
      c.writeUInt16LE(0x0808, 8);
      c.writeUInt16LE(8, 10);
      c.writeUInt16LE(e.tm.t, 12);
      c.writeUInt16LE(e.tm.d, 14);
      c.writeUInt32LE(e.crc, 16);
      c.writeUInt32LE(e.csize, 20);
      c.writeUInt32LE(e.usize, 24);
      c.writeUInt16LE(e.nameBuf.length, 28);
      c.writeUInt32LE(((0o100644 << 16) >>> 0), 38);
      c.writeUInt32LE(e.offset, 42);
      await this.write(Buffer.concat([c, e.nameBuf]));
    }
    const cdSize = this.offset - cdStart;
    const z = Buffer.alloc(22);
    z.writeUInt32LE(0x06054b50, 0);
    z.writeUInt16LE(this.entries.length, 8);
    z.writeUInt16LE(this.entries.length, 10);
    z.writeUInt32LE(cdSize, 12);
    z.writeUInt32LE(cdStart, 16);
    await this.write(z);
    await new Promise((resolve, reject) => { this.out.once('error', reject); this.out.end(resolve); });
  }
}

function destCandidates() {
  const home = os.homedir();
  const list = [];
  if (process.env.BACKUP2_DIR) list.push(process.env.BACKUP2_DIR);
  list.push(path.join(home, 'storage', 'shared', 'TempestBackups'));
  list.push('/storage/emulated/0/TempestBackups');
  list.push('/sdcard/TempestBackups');
  return list;
}

function pickDest() {
  const list = destCandidates();
  for (let i = 0; i < list.length; i++) {
    try {
      fs.mkdirSync(list[i], { recursive: true });
      const probe = path.join(list[i], '.probe-' + process.pid);
      fs.writeFileSync(probe, 'ok');
      fs.unlinkSync(probe);
      return list[i];
    } catch (_) { /* tenta o proximo */ }
  }
  return null;
}

function sessionDir() {
  try { return path.resolve(require('../config').sessionPath); } catch (_) { return path.join(ROOT, 'session-tempest'); }
}

function collect(opts) {
  const out = [];
  const sess = sessionDir();
  const skipDirName = /^(node_modules|\.git|\.npm|\.cache|tmp|temp)$/i;
  function walk(dir, depth) {
    let items;
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const it of items) {
      const abs = path.join(dir, it.name);
      if (it.isSymbolicLink()) continue;
      if (it.isDirectory()) {
        if (skipDirName.test(it.name) || /-tmp$/i.test(it.name)) continue;
        if (depth === 0 && /^backups?/i.test(it.name)) continue;
        if (opts.skipDir && abs.indexOf(opts.skipDir) === 0) continue;
        if (depth === 0 && /(session|sessao|pairing)/i.test(it.name)) {
          if (opts.semSessao || path.resolve(abs) !== sess) continue;
        }
        if (opts.semSessao && path.resolve(abs) === sess) continue;
        walk(abs, depth + 1);
      } else if (it.isFile()) {
        const rel = path.relative(ROOT, abs);
        if (/\.(zip|log)$/i.test(it.name) || /\.tmp-/.test(it.name)) continue;
        if (/^data[\\/]tempest\.db(-wal|-shm)?$/.test(rel)) continue;
        if (opts.semSessao && rel === '.env') continue;
        let st; try { st = fs.statSync(abs); } catch (_) { continue; }
        out.push({ abs: abs, name: PREFIX + rel.split(path.sep).join('/'), stat: st });
      }
    }
  }
  walk(ROOT, 0);
  if (!opts.semSessao && sess.indexOf(ROOT) !== 0 && fs.existsSync(sess)) {
    (function ext(dir) {
      let items; try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
      for (const it of items) {
        const abs = path.join(dir, it.name);
        if (it.isDirectory()) ext(abs);
        else if (it.isFile()) { try { out.push({ abs: abs, name: PREFIX + 'session-tempest/' + path.relative(sess, abs).split(path.sep).join('/'), stat: fs.statSync(abs) }); } catch (_) {} }
      }
    })(sess);
  }
  return out;
}

function snapshotDb(tmpFile) {
  try {
    const db = require('../database').getDb();
    try { fs.unlinkSync(tmpFile); } catch (_) {}
    db.exec("VACUUM INTO '" + tmpFile.replace(/'/g, "''") + "'");
    return fs.existsSync(tmpFile);
  } catch (_) { return false; }
}

let running = false;

async function run(options) {
  const opts = options || {};
  if (running) throw new Error('ja ha um backup em curso');
  running = true;
  const t0 = Date.now();
  let zipPath = null;
  let tmpDb = null;
  try {
    const dir = pickDest();
    if (!dir) {
      const e = new Error('sem acesso ao armazenamento interno');
      e.code = 'NO_STORAGE';
      throw e;
    }
    const d = new Date();
    const p2 = (n) => String(n).padStart(2, '0');
    const stamp = d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds());
    zipPath = path.join(dir, 'tempest-backup-' + stamp + (opts.semSessao ? '-semsessao' : '') + '.zip');

    const files = collect({ semSessao: !!opts.semSessao, skipDir: dir.indexOf(ROOT) === 0 ? dir : null });
    tmpDb = path.join(os.tmpdir(), 'tempest-db-snapshot-' + process.pid + '.db');
    const haveSnap = snapshotDb(tmpDb);
    if (haveSnap) files.push({ abs: tmpDb, name: PREFIX + 'data/tempest.db', stat: fs.statSync(tmpDb) });
    else {
      ['tempest.db', 'tempest.db-wal', 'tempest.db-shm'].forEach((n) => {
        const abs = path.join(ROOT, 'data', n);
        if (fs.existsSync(abs)) files.push({ abs: abs, name: PREFIX + 'data/' + n, stat: fs.statSync(abs) });
      });
    }

    const zw = new ZipWriter(zipPath);
    for (let i = 0; i < files.length; i++) await zw.addFile(files[i].abs, files[i].name, files[i].stat);
    await zw.finish();
    const bytes = fs.statSync(zipPath).size;
    return { file: zipPath, dir: dir, bytes: bytes, files: files.length, ms: Date.now() - t0, snapshot: haveSnap, semSessao: !!opts.semSessao };
  } catch (e) {
    if (zipPath) { try { fs.unlinkSync(zipPath); } catch (_) {} }
    throw e;
  } finally {
    if (tmpDb) { try { fs.unlinkSync(tmpDb); } catch (_) {} }
    running = false;
  }
}

module.exports = { run, pickDest, collect, ZipWriter };
