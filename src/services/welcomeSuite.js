'use strict';
/**
 * welcomeSuite — Bem-vindo 3 a 6, independentes por grupo.
 *   3 = apresentação do membro (texto, sem banner)
 *   4 = foto de perfil do membro + saudação simples
 *   5 = banner automático (foto + nome + grupo + nº de membro + mensagem)
 *   6 = banners do administrador (até 10 por grupo), com texto aplicado numa cópia
 *
 * Persistência:
 *   - configurações por grupo  -> tabela group_settings (SQLite), chaves "ws_*"
 *   - apresentações dos membros -> tabela member_intro (SQLite)
 *   - imagens dos banners       -> data/welcome-banners/<grupo>/nX.<ext> (originais intactos)
 * Tudo sobrevive a reinícios do bot/Termux.
 *
 * Os sistemas 1 e 2 (welcomeHook / welcome2Auto) continuam intactos: quando um dos
 * sistemas 3-6 está ativo num grupo, só esse envia; ao desligar, os antigos voltam.
 */
const fs = require('fs');
const path = require('path');
const render = require('./welcomeRender');

const MODES = ['3', '4', '5', '6'];
const MAX_SLOTS = 10;
const BANNERS_ROOT = path.join(__dirname, '../../data/welcome-banners');
const FIELDS = ['nome', 'idade', 'genero', 'cidade', 'provincia', 'hobbies', 'curiosidade', 'espera'];
const FIELD_LIMITS = { nome: 40, idade: 3, genero: 20, cidade: 40, provincia: 40, hobbies: 120, curiosidade: 160, espera: 140 };

const numOf = (j) => String(j || '').split('@')[0].split(':')[0];
const digits = (j) => numOf(j).replace(/\D/g, '');

function getDb() { return require('../database').getDb(); }

/* ------------------------------ configuração por grupo ------------------------------ */
function gget(groupJid, key, def) {
  try {
    const r = getDb().prepare('SELECT value FROM group_settings WHERE group_jid = ? AND key = ?').get(groupJid, 'ws_' + key);
    return r && r.value != null ? r.value : def;
  } catch (_) { return def; }
}
function gset(groupJid, key, value) {
  getDb().prepare('INSERT OR REPLACE INTO group_settings (group_jid, key, value) VALUES (?, ?, ?)').run(groupJid, 'ws_' + key, String(value));
}
function gdel(groupJid, key) {
  getDb().prepare('DELETE FROM group_settings WHERE group_jid = ? AND key = ?').run(groupJid, 'ws_' + key);
}

function getActive(groupJid) { const v = String(gget(groupJid, 'active', '') || ''); return MODES.includes(v) ? v : ''; }
function setActive(groupJid, mode) { if (!mode) gdel(groupJid, 'active'); else gset(groupJid, 'active', mode); }
function getConfig(groupJid) {
  return {
    active: getActive(groupJid),
    msg: gget(groupJid, 'msg', ''),
    bannerLine: gget(groupJid, 'bannerline', ''),
    display: gget(groupJid, 'display', 'nome') === 'numero' ? 'numero' : 'nome'
  };
}

/* ------------------------------ apresentações dos membros ------------------------------ */
let tablesReady = false;
function ensureTables() {
  if (tablesReady) return;
  getDb().exec('CREATE TABLE IF NOT EXISTS member_intro (scope TEXT NOT NULL, user_key TEXT NOT NULL, data TEXT NOT NULL, updated_at INTEGER, PRIMARY KEY (scope, user_key))');
  tablesReady = true;
}

function keysOf(ids) {
  const out = [];
  for (const i of ids || []) { const d = digits(i); if (d && !out.includes(d)) out.push(d); }
  return out;
}

function cleanField(field, value) {
  let v = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  v = v.slice(0, FIELD_LIMITS[field] || 100);
  return v;
}

/** Procura a apresentação: primeiro a deste grupo, depois a "global" (preenchida no privado) */
function getIntro(groupJid, ids) {
  try {
    ensureTables();
    const keys = keysOf(ids);
    for (const scope of [groupJid, 'global']) {
      for (const k of keys) {
        const r = getDb().prepare('SELECT data FROM member_intro WHERE scope = ? AND user_key = ?').get(scope, k);
        if (r) { try { const d = JSON.parse(r.data); if (d && Object.keys(d).length) return d; } catch (_) {} }
      }
    }
  } catch (e) { console.error('[welcomeSuite] getIntro', e.message); }
  return null;
}

function saveIntro(scope, ids, data) {
  ensureTables();
  const json = JSON.stringify(data);
  for (const k of keysOf(ids)) {
    getDb().prepare('INSERT OR REPLACE INTO member_intro (scope, user_key, data, updated_at) VALUES (?, ?, ?, ?)').run(scope, k, json, Date.now());
  }
}
function readScopeIntro(scope, ids) {
  ensureTables();
  for (const k of keysOf(ids)) {
    const r = getDb().prepare('SELECT data FROM member_intro WHERE scope = ? AND user_key = ?').get(scope, k);
    if (r) { try { return JSON.parse(r.data) || {}; } catch (_) {} }
  }
  return {};
}
function setIntroFields(scope, ids, fields) {
  const cur = readScopeIntro(scope, ids);
  for (const f of Object.keys(fields)) {
    const v = cleanField(f, fields[f]);
    if (v) cur[f] = v; else delete cur[f];
  }
  saveIntro(scope, ids, cur);
  return cur;
}
function clearIntro(scope, ids, field) {
  ensureTables();
  if (field) {
    const cur = readScopeIntro(scope, ids); delete cur[field]; saveIntro(scope, ids, cur); return;
  }
  for (const k of keysOf(ids)) getDb().prepare('DELETE FROM member_intro WHERE scope = ? AND user_key = ?').run(scope, k);
}

function introLines(intro) {
  if (!intro) return [];
  const L = [];
  if (intro.nome) L.push('🏷️ *Nome:* ' + intro.nome);
  if (intro.idade) L.push('🎂 *Idade:* ' + intro.idade);
  if (intro.genero) L.push('⚧️ *Género:* ' + intro.genero);
  const local = [intro.cidade, intro.provincia].filter(Boolean).join(', ');
  if (local) L.push('📍 *Mora em:* ' + local);
  if (intro.hobbies) L.push('🎯 *Gosta de:* ' + intro.hobbies);
  if (intro.curiosidade) L.push('✨ *Curiosidade:* ' + intro.curiosidade);
  if (intro.espera) L.push('🔎 *Espera encontrar:* ' + intro.espera);
  return L;
}

function introCard(intro, titulo) {
  const L = introLines(intro);
  if (!L.length) return '';
  return ['┏━ 📝 *' + (titulo || 'Apresentação') + '*', ...L.map((l) => '┃ ' + l), '┗━━━━━━━━━━'].join('\n');
}

/* ------------------------------ banners do administrador ------------------------------ */
function groupDir(groupJid) { return path.join(BANNERS_ROOT, String(groupJid).replace(/[^0-9a-zA-Z_-]/g, '_')); }

function sniffExt(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0x42 && buf[1] === 0x4d) return 'bmp';
  if (buf.toString('ascii', 0, 3) === 'GIF') return 'gif';
  return null;
}

function slotFiles(groupJid, slot) {
  const dir = groupDir(groupJid);
  try { return fs.readdirSync(dir).filter((f) => new RegExp('^n' + slot + '\\.(jpg|png|bmp|gif)$').test(f)).map((f) => path.join(dir, f)); }
  catch (_) { return []; }
}

function listBanners(groupJid) {
  const out = [];
  for (let s = 1; s <= MAX_SLOTS; s++) {
    const files = slotFiles(groupJid, s);
    if (!files.length) continue;
    let meta = {};
    try { meta = JSON.parse(gget(groupJid, 'banner' + s, '{}')) || {}; } catch (_) {}
    out.push({ slot: s, file: files[0], meta: meta });
  }
  return out;
}

function saveBanner(groupJid, slot, buf, info) {
  const ext = sniffExt(buf);
  if (!ext) throw new Error('Formato não suportado. Envie uma imagem JPG ou PNG.');
  const dir = groupDir(groupJid);
  fs.mkdirSync(dir, { recursive: true });
  const existed = slotFiles(groupJid, slot).length > 0;
  const target = path.join(dir, 'n' + slot + '.' + ext);
  const tmp = target + '.tmp';
  fs.writeFileSync(tmp, buf);                 // escrita atómica: nunca deixa ficheiro a meio
  for (const f of slotFiles(groupJid, slot)) { try { fs.unlinkSync(f); } catch (_) {} }
  fs.renameSync(tmp, target);
  gset(groupJid, 'banner' + slot, JSON.stringify(Object.assign({ at: Date.now(), bytes: buf.length }, info || {})));
  return { replaced: existed, file: target };
}

function deleteBanner(groupJid, slot) {
  const files = slotFiles(groupJid, slot);
  for (const f of files) { try { fs.unlinkSync(f); } catch (_) {} }
  gdel(groupJid, 'banner' + slot);
  return files.length > 0;
}

/* ------------------------------ dados do membro / grupo ------------------------------ */
function normalizeParticipant(p) {
  if (typeof p === 'string') return { jid: p, ids: [p], phone: '' };
  const o = p || {};
  const jid = o.id || o.jid || o.lid || '';
  const ids = [o.id, o.jid, o.lid, o.phoneNumber, o.participantPn].filter(Boolean);
  let phone = '';
  const pn = o.phoneNumber || o.participantPn || (String(o.jid || '').endsWith('@s.whatsapp.net') ? o.jid : '') || (String(o.id || '').endsWith('@s.whatsapp.net') ? o.id : '');
  if (pn) phone = digits(pn);
  return { jid: jid, ids: ids, phone: phone };
}

async function gatherMember(sock, groupJid, part) {
  const wb = require('./welcomeBanner');
  let meta = null;
  try { meta = await sock.groupMetadata(groupJid); } catch (_) {}
  const groupName = (meta && meta.subject) || 'Grupo';
  const jids = wb.collectJids ? wb.collectJids(part.jid, meta) : [part.jid];
  for (const i of part.ids) if (i && !jids.includes(i)) jids.push(i);
  if (part.phone && !jids.includes(part.phone + '@s.whatsapp.net')) jids.push(part.phone + '@s.whatsapp.net');

  // número de participação: posição na lista do grupo (só se o membro for encontrado)
  let number = null;
  if (meta && Array.isArray(meta.participants)) {
    const mine = new Set(keysOf(jids));
    const idx = meta.participants.findIndex((x) => keysOf([x.id, x.jid, x.lid, x.phoneNumber, x.participantPn]).some((k) => mine.has(k)));
    if (idx >= 0) number = idx + 1;
  }
  // telefone real (nunca inventado): só se existir um JID @s.whatsapp.net ou phoneNumber
  let phone = part.phone;
  if (!phone) { const pj = jids.find((j) => String(j).endsWith('@s.whatsapp.net')); if (pj) phone = digits(pj); }
  let name = 'Membro';
  try { name = wb.resolveName ? await wb.resolveName(sock, part.jid, meta, jids) : 'Membro'; } catch (_) {}
  return { meta, groupName, jids, number, phone, name };
}

function displayName(cfg, info) {
  if (cfg.display === 'numero' && info.phone) return '+' + info.phone;
  return info.name || 'Membro';
}

function fillTemplate(tpl, v) {
  return String(tpl)
    .replace(/\{user\}|@user/gi, v.tag)
    .replace(/\{nome\}/gi, v.nome)
    .replace(/\{grupo\}|\{group\}/gi, v.grupo)
    .replace(/\{n\}/gi, v.n != null ? String(v.n) : '');
}

function headline(mode, cfg, v) {
  if (cfg.msg) return fillTemplate(cfg.msg, v);
  if (mode === '4') return '👋 Olá ' + v.tag + '! Seja bem-vindo(a) ao *' + v.grupo + '*.';
  if (mode === '3') return '👋 Seja bem-vindo(a) ' + v.tag + ' ao grupo *' + v.grupo + '*!';
  return '🎉 ' + v.tag + ', seja bem-vindo(a) ao *' + v.grupo + '*!';
}

/* ------------------------------ construção e envio ------------------------------ */
async function resolveMention(sock, groupJid, jid) {
  try { const m = require('../utils/mention'); const r = await m.resolveInGroup(sock, groupJid, jid); if (r) return r; } catch (_) {}
  return jid;
}

async function pickBanner(groupJid) {
  const list = listBanners(groupJid);
  // baralha e tenta até um carregar (um ficheiro corrompido não bloqueia os restantes)
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

/**
 * Monta e envia a boas-vindas de um membro. `mode` pode ser forçado (pré-visualização).
 * Lança erro só se nem o texto simples conseguir ser enviado.
 */
async function sendWelcomeFor(sock, groupJid, part, mode) {
  const cfg = getConfig(groupJid);
  mode = mode || cfg.active;
  const info = await gatherMember(sock, groupJid, part);
  const mention = await resolveMention(sock, groupJid, part.jid);
  const shown = displayName(cfg, info);
  const vars = { tag: '@' + numOf(mention), nome: shown, grupo: info.groupName, n: info.number };
  const head = headline(mode, cfg, vars);
  const numLine = info.number != null ? '🔢 Membro nº *' + info.number + '*' : '';
  const sendText = (text) => sock.sendMessage(groupJid, { text: text, mentions: [mention] });

  try {
    if (mode === '3') {
      const intro = getIntro(groupJid, info.jids);
      const card = introCard(intro);
      const parts = [head];
      if (numLine) parts.push(numLine);
      parts.push(card || '📝 Quer apresentar-se? Use *!apresentar* (é opcional).');
      return await sendText(parts.join('\n\n'));
    }

    if (mode === '4') {
      const wb = require('./welcomeBanner');
      let pic = null;
      try { pic = await wb.fetchPic(sock, info.jids); } catch (_) {}
      if (!pic) { try { pic = await render.renderDefaultAvatar(shown); } catch (_) { pic = null; } }
      const caption = head + (numLine ? '\n' + numLine : '');
      if (pic) return await sock.sendMessage(groupJid, { image: pic, caption: caption, mentions: [mention] });
      return await sendText(caption);
    }

    if (mode === '5') {
      const wb = require('./welcomeBanner');
      let pic = null;
      try { pic = await wb.fetchPic(sock, info.jids); } catch (_) {}
      const buf = await render.renderAuto({
        avatarBuf: pic, name: shown, group: info.groupName, number: info.number,
        line: cfg.bannerLine || 'BEM-VINDO(A)', palette: render.randomPalette()
      });
      return await sock.sendMessage(groupJid, { image: buf, caption: head, mentions: [mention] });
    }

    if (mode === '6') {
      const list = await pickBanner(groupJid);
      for (const b of list) {
        try {
          const base = fs.readFileSync(b.file);               // leitura apenas; o original não é modificado
          const buf = await render.renderCustom({
            baseBuf: base, name: shown, group: info.groupName, number: info.number,
            line: cfg.bannerLine || 'Seja bem-vindo(a)!', palette: render.randomPalette()
          });
          return await sock.sendMessage(groupJid, { image: buf, caption: head, mentions: [mention] });
        } catch (e) { console.error('[welcomeSuite] banner ' + b.slot + ':', e && e.message); }
      }
      // sem banners configurados (ou todos ilegíveis): mensagem padrão
      return await sendText(head + (numLine ? '\n' + numLine : ''));
    }
  } catch (e) {
    console.error('[welcomeSuite] modo ' + mode + ':', e && e.message ? e.message : e);
  }
  // último recurso: texto simples (nunca deixa o membro sem saudação)
  return await sendText(head);
}

/* ------------------------------ fila + anti-duplicados ------------------------------ */
const recent = new Map();     // grupo|número -> timestamp
const DEDUPE_MS = 90e3;
const QUEUE_MAX = 10;
let chain = Promise.resolve(), pending = 0;

function enqueue(fn) {
  pending++;
  const p = chain.then(fn, fn);
  chain = p.catch(() => {}).then(() => { pending--; });
  return p;
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), ms))]);

/** Ligado ao evento group-participants.update. Devolve true se um sistema 3-6 tratou o evento. */
async function handle(sock, update) {
  if (!update || update.action !== 'add' || !update.id || !String(update.id).endsWith('@g.us')) return false;
  const groupJid = update.id;
  let mode = '';
  try { mode = getActive(groupJid); } catch (e) { console.error('[welcomeSuite] config', e.message); return false; }
  if (!mode) return false;

  const meNum = digits(sock.user && sock.user.id), meLid = digits(sock.user && sock.user.lid);
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > DEDUPE_MS * 2) recent.delete(k);

  const overflow = [];
  for (const raw of (update.participants || [])) {
    const part = normalizeParticipant(raw);
    if (!part.jid) continue;
    const keys = keysOf(part.ids.length ? part.ids : [part.jid]);
    if (keys.includes(meNum) || (meLid && keys.includes(meLid))) continue;     // o próprio bot
    const dkey = groupJid + '|' + (keys[0] || part.jid);
    if (recent.has(dkey) && now - recent.get(dkey) < DEDUPE_MS) continue;       // evita banner duplicado
    recent.set(dkey, now);
    if (pending >= QUEUE_MAX) { overflow.push(part); continue; }
    enqueue(async () => {
      if (getActive(groupJid) !== mode) mode = getActive(groupJid);             // admin pode ter mudado entretanto
      if (!mode) return;
      await withTimeout(sendWelcomeFor(sock, groupJid, part, mode), 90e3);
      await new Promise((r) => setTimeout(r, 800));
    }).catch((e) => console.error('[welcomeSuite] envio:', e && e.message ? e.message : e));
  }
  if (overflow.length) {
    try {
      const jids = [];
      for (const p of overflow) jids.push(await resolveMention(sock, groupJid, p.jid));
      await sock.sendMessage(groupJid, { text: '👋 Bem-vindos! ' + jids.map((j) => '@' + numOf(j)).join(' '), mentions: jids });
    } catch (e) { console.error('[welcomeSuite] overflow:', e.message); }
  }
  return true;
}

/** Pré-visualização para administradores (!welcome3..6 teste) */
function preview(sock, groupJid, memberJid, mode, phone) {
  const part = normalizeParticipant(memberJid);
  if (phone && !part.phone) part.phone = digits(phone);
  return enqueue(() => withTimeout(sendWelcomeFor(sock, groupJid, part, mode), 90e3));
}

module.exports = {
  MODES, MAX_SLOTS, FIELDS, FIELD_LIMITS,
  getActive, setActive, getConfig, gset, gdel, gget,
  getIntro, readScopeIntro, setIntroFields, clearIntro, introCard, introLines, keysOf, cleanField,
  listBanners, saveBanner, deleteBanner, sniffExt,
  handle, preview, sendWelcomeFor, numOf
};
