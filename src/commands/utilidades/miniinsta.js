'use strict';
/**
 * MINI INSTA + MENSAGENS — o bot é o servidor (dados em data/miniinsta.json e fotos em data/miniinsta/).
 * Só fotos (sem vídeo, reels ou chamadas). Comandos novos e isolados: !insta e !dm
 */
const fs = require('fs');
const path = require('path');
const baileys = require('@whiskeysockets/baileys');
const nf = require('../../interactive/nativeFlow');
const router = require('../../interactive/router');
const config = require('../../config');
const btn = nf.btn;

const DIR = path.join(__dirname, '..', '..', '..', 'data'), FILE = path.join(DIR, 'miniinsta.json'), PICS = path.join(DIR, 'miniinsta');
const LIM = { posts: 30, postDay: 5, cap: 300, cmt: 140, cmtHour: 30, dm: 300, dmHour: 20, notifyMs: 600000, follow: 300 };
const short = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const now = () => Date.now();
let LK = {};

let D = null;
function db() {
  if (D) return D;
  try { D = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { D = { seq: 0, users: {}, posts: {}, dms: {}, names: {} }; }
  return D;
}
function save() {
  try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(FILE + '.tmp', JSON.stringify(D)); fs.renameSync(FILE + '.tmp', FILE); }
  catch (e) { console.error('[INSTA] salvar:', e && e.message); }
}
const slug = (s) => String(s || 'user').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]/g, '').slice(0, 16) || 'user';
function jidOf(ctx) {
  const pn = ctx.senderPn;
  if (pn) { const s = String(pn); return s.includes('@') ? s : s.split(':')[0] + '@s.whatsapp.net'; }
  return ctx.sender;
}
function me(ctx) {
  const d = db(), k = ctx.sender;
  if (!d.users[k]) {
    const base = slug((ctx.msg && ctx.msg.pushName) || String(k).split('@')[0].split(':')[0]);
    let n = base, i = 1; while (d.names[n]) n = base.slice(0, 13) + (++i);
    d.users[k] = { k: k, n: n, name: (ctx.msg && ctx.msg.pushName) || n, bio: '', jid: jidOf(ctx), fing: [], fers: [], bl: [], dm: 'on', posts: [], t: now(), rl: {}, rd: {}, nt: {} };
    d.names[n] = k; save();
  }
  const u = d.users[k]; const j = jidOf(ctx); if (u.jid !== j) { u.jid = j; save(); }
  return u;
}
const byName = (n) => { const d = db(), k = d.names[String(n || '').replace(/^@/, '').toLowerCase()]; return k ? d.users[k] : null; };
function rate(u, kind, max, win, commit) {
  const a = (u.rl[kind] = (u.rl[kind] || []).filter((t) => now() - t < win));
  if (a.length >= max) return false;
  if (commit) a.push(now());
  return true;
}
const blk = (a, b) => { const d = db(), A = d.users[a], B = d.users[b]; return !!((A && A.bl.indexOf(b) >= 0) || (B && B.bl.indexOf(a) >= 0)); };
function ago(ts) { const m = Math.floor((now() - ts) / 60000); if (m < 1) return 'agora'; if (m < 60) return m + ' min'; if (m < 1440) return Math.floor(m / 60) + ' h'; return Math.floor(m / 1440) + ' d'; }
const FOOT = () => '© ' + config.botName + ' • Mini Insta';
const card = (ctx, o) => nf.sendNative(ctx.sock, ctx.jid, Object.assign({ footer: FOOT(), quoted: ctx.msg, fallback: o.body }, o));
const homeBtn = () => btn.reply('🏠 Início', 'mi:home');

/* fotos: valida o formato real, comprime e limita o tamanho */
const H = {
  async getImage(ctx) {
    const m = (ctx.msg && ctx.msg.message) || {};
    const ci = (m.extendedTextMessage && m.extendedTextMessage.contextInfo) || (m.imageMessage && m.imageMessage.contextInfo) || null;
    const q = ci && ci.quotedMessage, node = (q && q.imageMessage) || m.imageMessage || null;
    if (!node || Number(node.fileLength || 0) > 12 * 1024 * 1024) return null;
    const stream = await baileys.downloadContentFromMessage(node, 'image'), chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
  }
};
async function savePic(buf, id) {
  const Jimp = require('jimp'), im = await Jimp.read(buf);
  im.scaleToFit(720, 720);
  let q = 75, out;
  do { out = await im.quality(q).getBufferAsync(Jimp.MIME_JPEG); q -= 10; } while (out.length > 150000 && q >= 35);
  fs.mkdirSync(PICS, { recursive: true }); fs.writeFileSync(path.join(PICS, id + '.jpg'), out);
}

function feedList(v, mode) {
  const d = db(); let arr = Object.keys(d.posts).map((i) => d.posts[i]).filter((p) => p.by === v.k || !blk(v.k, p.by));
  if (mode === 'f') { const s = new Set(v.fing.concat([v.k])); arr = arr.filter((p) => s.has(p.by)); }
  else if (mode[0] === 'u') { const t = byName(mode.slice(1)); arr = t ? arr.filter((p) => p.by === t.k) : []; }
  return arr.sort((a, b) => b.ts - a.ts);
}
async function sendPost(ctx, p, mode) {
  const d = db(), a = d.users[p.by], v = me(ctx);
  let img = null; try { img = fs.readFileSync(path.join(PICS, p.id + '.jpg')); } catch (_) {}
  const liked = p.lk.indexOf(v.k) >= 0, mine = p.by === v.k;
  const body = '📸 *@' + a.n + '* • ' + ago(p.ts) + '\n' + (p.cap ? p.cap + '\n' : '') + '\n❤️ ' + p.lk.length + '   💬 ' + p.cm.length;
  const rows = [
    { header: '💬', title: 'Ver comentários', description: p.cm.length + ' comentário(s)', id: 'mi:c:' + p.id },
    { header: '✍️', title: 'Como comentar', description: '!insta comentar ' + p.id + ' texto', id: 'mi:hc:' + p.id },
    { header: '👤', title: 'Perfil de @' + a.n, description: 'Ver perfil e posts', id: 'mi:p:' + a.n }];
  if (!mine) rows.push({ header: '➕', title: v.fing.indexOf(a.k) >= 0 ? 'Deixar de seguir' : 'Seguir @' + a.n, description: 'Seguir / deixar de seguir', id: 'mi:fo:' + a.n });
  if (mine) rows.push({ header: '🗑️', title: 'Apagar este post', description: 'Remove a foto e os comentários', id: 'mi:del:' + p.id });
  return card(ctx, { image: img, body: body, buttons: [btn.reply(liked ? '💔 Descurtir' : '❤️ Curtir', 'mi:l:' + p.id + ':' + mode), btn.list('⋯ Mais', [{ title: 'Opções do post', rows: rows }]), btn.reply('➡️ Próximo', 'mi:n:' + mode + ':' + p.id)] });
}
async function openFeed(ctx, mode) {
  const v = me(ctx), list = feedList(v, mode);
  if (!list.length) return card(ctx, { body: mode === 'f' ? '📭 Seu feed está vazio.\nSiga alguém (*!insta seguir @usuario*) ou veja o *Explorar*.' : '📭 Ainda não há fotos.\nSeja o primeiro: responda a uma foto com *!insta postar legenda*.', buttons: [btn.reply('🔎 Explorar', 'mi:e'), homeBtn()] });
  return sendPost(ctx, list[0], mode);
}
async function openProfile(ctx, t) {
  const v = me(ctx), self = t.k === v.k;
  const body = '👤 *@' + t.n + '*' + (t.name && t.name !== t.n ? ' • ' + t.name : '') + '\n' + (t.bio ? t.bio + '\n' : '') + '\n📸 ' + t.posts.length + ' posts   👥 ' + t.fers.length + ' seguidores   ➡️ ' + t.fing.length + ' seguindo' + (self ? '\n\n✏️ *!insta bio texto* • *!insta usuario nome*' : '');
  const buttons = self ? [btn.reply('📸 Meus posts', 'mi:pp:' + t.n), btn.reply('✉️ Mensagens', 'mi:inbox'), homeBtn()]
    : [btn.reply(v.fing.indexOf(t.k) >= 0 ? '✅ Seguindo' : '➕ Seguir', 'mi:fo:' + t.n), btn.reply('📸 Posts', 'mi:pp:' + t.n), btn.reply('✉️ Mensagem', 'mi:r:' + t.n)];
  return card(ctx, { body: body, buttons: buttons });
}
async function openHub(ctx) {
  const v = me(ctx), d = db(); let unread = 0;
  Object.keys(d.dms).forEach((pk) => { if (pk.split('|').indexOf(v.k) < 0) return; unread += d.dms[pk].filter((m) => m.f !== v.k && m.ts > (v.rd[pk] || 0)).length; });
  const body = '📸 *Mini Insta*\n@' + v.n + ' • ' + v.posts.length + ' posts • ' + v.fers.length + ' seguidores • ' + v.fing.length + ' seguindo\n✉️ ' + unread + ' mensagem(ns) não lida(s)\n\nSó fotos. Para postar: responda a uma foto com *!insta postar legenda*.';
  return card(ctx, { body: body, buttons: [btn.list('📸 Abrir', [{ title: 'Mini Insta', rows: [
    { header: '📰', title: 'Feed', description: 'Quem você segue', id: 'mi:feed' },
    { header: '🔎', title: 'Explorar', description: 'Fotos de todo mundo', id: 'mi:e' },
    { header: '👤', title: 'Meu perfil', description: 'Posts, seguidores e bio', id: 'mi:p:' + v.n },
    { header: '✉️', title: 'Mensagens', description: unread + ' não lida(s)', id: 'mi:inbox' },
    { header: '❓', title: 'Ajuda', description: 'Todos os comandos', id: 'mi:help' }] }]), btn.reply('🔎 Explorar', 'mi:e')] });
}
const HELP = '📸 *Mini Insta — comandos*\n• !insta — abre o app\n• !insta postar <legenda> (responda a uma foto)\n• !insta comentar <id> <texto>\n• !insta seguir @usuario / deixar @usuario\n• !insta perfil [@usuario]\n• !insta bio <texto> • !insta usuario <nome>\n• !insta bloquear @usuario / desbloquear @usuario\n• !insta apagar <id>\n• !insta dm on|off — aceitar mensagens\n• !insta msgs — caixa de mensagens\n• !dm @usuario <texto> — enviar mensagem\n\nSó fotos e texto. Sem vídeos nem chamadas.';

async function postar(ctx, v, cap) {
  const d = db();
  if (v.posts.length >= LIM.posts) return ctx.reply('📦 Limite de ' + LIM.posts + ' posts. Apague algum com *!insta apagar <id>*.');
  if (!rate(v, 'p', LIM.postDay, 86400000, false)) return ctx.reply('⏳ Limite de ' + LIM.postDay + ' posts por dia.');
  let buf = null; try { buf = await H.getImage(ctx); } catch (e) { console.error('[INSTA] baixar:', e && e.message); }
  if (!buf) return ctx.reply('📷 Responda a uma *foto* com *!insta postar legenda*. (Só fotos, até 12 MB.)');
  const id = (++d.seq).toString(36) + Math.random().toString(36).slice(2, 5);
  try { await savePic(buf, id); } catch (e) { d.seq--; return ctx.reply('❌ Esse arquivo não é uma foto válida (JPG, PNG ou WebP).'); }
  rate(v, 'p', LIM.postDay, 86400000, true);
  d.posts[id] = { id: id, by: v.k, cap: short(cap, LIM.cap), ts: now(), lk: [], cm: [] };
  v.posts.unshift(id); save();
  return sendPost(ctx, d.posts[id], 'u' + v.n);
}
async function comentar(ctx, v, id, text) {
  const p = db().posts[id];
  if (!p || blk(v.k, p.by)) return ctx.reply('❌ Post não encontrado.');
  text = short(text, LIM.cmt); if (!text) return ctx.reply('Use: *!insta comentar ' + id + ' seu comentário*');
  const lc = p.cm[p.cm.length - 1];
  if (lc && lc.by === v.k && lc.t === text && now() - lc.ts < 60000) return ctx.reply('ℹ️ Comentário repetido ignorado.');
  if (!rate(v, 'c', LIM.cmtHour, 3600000, true)) return ctx.reply('⏳ Muitos comentários seguidos. Tente mais tarde.');
  p.cm.push({ by: v.k, t: text, ts: now() }); if (p.cm.length > 200) p.cm.shift(); save();
  return ctx.reply('💬 Comentário publicado em *@' + db().users[p.by].n + '*.');
}
async function seguir(ctx, v, t, on) {
  if (!t) return ctx.reply('❌ Usuário não encontrado.');
  if (t.k === v.k) return ctx.reply('Você não pode seguir a si mesmo.');
  if (blk(v.k, t.k)) return ctx.reply('❌ Não foi possível.');
  const has = v.fing.indexOf(t.k) >= 0;
  if (on && !has) { if (v.fing.length >= LIM.follow) return ctx.reply('Limite de ' + LIM.follow + ' seguidos.'); v.fing.push(t.k); t.fers.push(v.k); save(); }
  if (!on && has) { v.fing = v.fing.filter((x) => x !== t.k); t.fers = t.fers.filter((x) => x !== v.k); save(); }
  return ctx.reply(on ? '✅ Agora você segue *@' + t.n + '*.' : '👋 Você deixou de seguir *@' + t.n + '*.');
}
async function bloquear(ctx, v, t, on) {
  if (!t || t.k === v.k) return ctx.reply('❌ Usuário não encontrado.');
  if (on) {
    if (v.bl.indexOf(t.k) < 0) v.bl.push(t.k);
    v.fing = v.fing.filter((x) => x !== t.k); v.fers = v.fers.filter((x) => x !== t.k); t.fing = t.fing.filter((x) => x !== v.k); t.fers = t.fers.filter((x) => x !== v.k);
  } else v.bl = v.bl.filter((x) => x !== t.k);
  save(); return ctx.reply(on ? '🚫 *@' + t.n + '* foi bloqueado.' : '✅ *@' + t.n + '* foi desbloqueado.');
}
async function enviarDm(ctx, v, toName, text) {
  const t = byName(toName), d = db();
  if (!t || t.k === v.k) return ctx.reply('Use: *!dm @usuario sua mensagem* (o usuário precisa ter o Mini Insta).');
  if (blk(v.k, t.k) || t.dm === 'off') return ctx.reply('❌ Esse usuário não está recebendo mensagens.');
  text = short(text, LIM.dm); if (!text) return ctx.reply('Use: *!dm @' + t.n + ' sua mensagem*');
  if (!rate(v, 'd', LIM.dmHour, 3600000, true)) return ctx.reply('⏳ Limite de mensagens por hora atingido.');
  const pk = [v.k, t.k].sort().join('|'); (d.dms[pk] = d.dms[pk] || []).push({ f: v.k, t: text, ts: now() }); if (d.dms[pk].length > 100) d.dms[pk].shift();
  const last = t.nt[v.k] || 0, notify = now() - last > LIM.notifyMs; if (notify) t.nt[v.k] = now();
  save();
  if (notify) {
    try { await nf.sendNative(ctx.sock, t.jid, { body: '✉️ *Nova mensagem de @' + v.n + '*\n\n' + text, footer: FOOT(), fallback: '✉️ @' + v.n + ': ' + text, buttons: [btn.reply('📥 Ver conversa', 'mi:t:' + v.n), btn.reply('🚫 Bloquear', 'mi:b:' + v.n)] }); }
    catch (e) { console.error('[INSTA] avisar:', e && e.message); }
  }
  return ctx.reply('✅ Mensagem enviada para *@' + t.n + '*.');
}
async function inbox(ctx, v) {
  const d = db(), rows = [];
  Object.keys(d.dms).forEach((pk) => {
    const ks = pk.split('|'); if (ks.indexOf(v.k) < 0) return;
    const o = d.users[ks[0] === v.k ? ks[1] : ks[0]]; if (!o || blk(v.k, o.k)) return;
    const msgs = d.dms[pk], un = msgs.filter((m) => m.f !== v.k && m.ts > (v.rd[pk] || 0)).length, l = msgs[msgs.length - 1];
    rows.push({ ts: l.ts, row: { header: un ? '🔴 ' + un + ' nova(s)' : '✉️', title: '@' + o.n, description: short(l.t, 60), id: 'mi:t:' + o.n } });
  });
  if (!rows.length) return card(ctx, { body: '📭 Nenhuma conversa ainda.\nEnvie: *!dm @usuario olá*', buttons: [homeBtn()] });
  rows.sort((a, b) => b.ts - a.ts);
  return card(ctx, { body: '✉️ *Mensagens*\nEscolha uma conversa.', buttons: [btn.list('✉️ Conversas', [{ title: 'Caixa de entrada', rows: rows.slice(0, 10).map((r) => r.row) }]), homeBtn()] });
}
async function thread(ctx, v, t) {
  if (!t || blk(v.k, t.k)) return ctx.reply('❌ Conversa indisponível.');
  const d = db(), pk = [v.k, t.k].sort().join('|'), msgs = (d.dms[pk] || []).slice(-10);
  if (!msgs.length) return ctx.reply('Sem mensagens com @' + t.n + '. Envie: *!dm @' + t.n + ' olá*');
  v.rd[pk] = now(); save();
  const body = '✉️ *Conversa com @' + t.n + '*\n\n' + msgs.map((m) => (m.f === v.k ? 'Você' : '@' + t.n) + ' (' + ago(m.ts) + '): ' + m.t).join('\n');
  return card(ctx, { body: body, buttons: [btn.reply('↩️ Responder', 'mi:r:' + t.n), btn.reply('🚫 Bloquear', 'mi:b:' + t.n), btn.reply('📥 Caixa', 'mi:inbox')] });
}
async function apagar(ctx, v, id) {
  const d = db(), p = d.posts[id];
  if (!p || p.by !== v.k) return ctx.reply('❌ Você só pode apagar os seus posts.');
  delete d.posts[id]; v.posts = v.posts.filter((x) => x !== id); save();
  try { fs.unlinkSync(path.join(PICS, id + '.jpg')); } catch (_) {}
  return ctx.reply('🗑️ Post apagado.');
}

router.register('mi', async (ctx, rest) => {
  const p = String(rest || '').split(':'), a = p[0], v = me(ctx), d = db();
  if (a === 'home') return openHub(ctx);
  if (a === 'help') return ctx.reply(HELP);
  if (a === 'feed') return openFeed(ctx, 'f');
  if (a === 'e') return openFeed(ctx, 'e');
  if (a === 'p') { const t = byName(p[1]); return t && !blk(v.k, t.k) ? openProfile(ctx, t) : ctx.reply('❌ Perfil não encontrado.'); }
  if (a === 'pp') { const t = byName(p[1]); if (!t || blk(v.k, t.k)) return ctx.reply('❌ Perfil não encontrado.'); return openFeed(ctx, 'u' + t.n); }
  if (a === 'l') {
    const q = d.posts[p[1]]; if (!q || blk(v.k, q.by)) return ctx.reply('❌ Post não encontrado.');
    const kk = v.k + '|' + q.id; if (LK[kk] && now() - LK[kk] < 1500) return; LK[kk] = now(); if (Object.keys(LK).length > 500) LK = {};
    const i = q.lk.indexOf(v.k); if (i >= 0) q.lk.splice(i, 1); else q.lk.push(v.k); save();
    return ctx.reply((i >= 0 ? '💔 Curtida removida' : '❤️ Curtiu') + ' • total ' + q.lk.length);
  }
  if (a === 'n') {
    const list = feedList(v, p[1] || 'e'), i = list.findIndex((x) => x.id === p[2]), nx = list[i + 1];
    if (!nx) return card(ctx, { body: '🏁 Você viu tudo por aqui.', buttons: [btn.reply('🔄 Recomeçar', p[1] === 'f' ? 'mi:feed' : 'mi:e'), homeBtn()] });
    return sendPost(ctx, nx, p[1]);
  }
  if (a === 'c') {
    const q = d.posts[p[1]]; if (!q || blk(v.k, q.by)) return ctx.reply('❌ Post não encontrado.');
    const t = q.cm.slice(-8).map((c) => '@' + ((d.users[c.by] || {}).n || '?') + ': ' + c.t).join('\n');
    return ctx.reply('💬 *Comentários*\n' + (t || 'Nenhum ainda.') + '\n\n✍️ *!insta comentar ' + q.id + ' texto*');
  }
  if (a === 'hc') return ctx.reply('✍️ Para comentar: *!insta comentar ' + p[1] + ' seu comentário*');
  if (a === 'fo') { const t = byName(p[1]); return seguir(ctx, v, t, !!t && v.fing.indexOf(t.k) < 0); }
  if (a === 'del') return card(ctx, { body: '🗑️ Apagar este post?', buttons: [btn.reply('✅ Sim, apagar', 'mi:dely:' + p[1]), homeBtn()] });
  if (a === 'dely') return apagar(ctx, v, p[1]);
  if (a === 'inbox') return inbox(ctx, v);
  if (a === 't') return thread(ctx, v, byName(p[1]));
  if (a === 'r') { const t = byName(p[1]); return ctx.reply(t ? '↩️ Para responder: *!dm @' + t.n + ' sua mensagem*' : '❌ Usuário não encontrado.'); }
  if (a === 'b') return bloquear(ctx, v, byName(p[1]), true);
});

module.exports = Object.assign([
  {
    name: 'insta', aliases: ['minsta', 'miniinsta'], category: 'utilidades', hideFromMenu: false,
    description: 'Mini Insta: fotos, seguidores, comentários e mensagens', usage: '!insta',
    handler: async (ctx) => {
      try {
        const v = me(ctx), A = ctx.args || [], sub = String(A[0] || '').toLowerCase(), rest = A.slice(1).join(' ').trim();
        if (!sub || sub === 'home') return openHub(ctx);
        if (sub === 'ajuda' || sub === 'help') return ctx.reply(HELP);
        if (sub === 'feed') return openFeed(ctx, 'f');
        if (sub === 'explorar') return openFeed(ctx, 'e');
        if (sub === 'postar') return postar(ctx, v, rest);
        if (sub === 'comentar') return comentar(ctx, v, A[1], A.slice(2).join(' '));
        if (sub === 'seguir') return seguir(ctx, v, byName(A[1]), true);
        if (sub === 'deixar') return seguir(ctx, v, byName(A[1]), false);
        if (sub === 'bloquear') return bloquear(ctx, v, byName(A[1]), true);
        if (sub === 'desbloquear') return bloquear(ctx, v, byName(A[1]), false);
        if (sub === 'perfil') { const t = A[1] ? byName(A[1]) : v; return t && !blk(v.k, t.k) ? openProfile(ctx, t) : ctx.reply('❌ Perfil não encontrado.'); }
        if (sub === 'bio') { v.bio = short(rest, 120); save(); return openProfile(ctx, v); }
        if (sub === 'usuario') {
          const n = slug(rest), d = db();
          if (!rest || n.length < 3) return ctx.reply('Use: *!insta usuario nome* (3 a 16 letras, números ou _).');
          if (d.names[n] && d.names[n] !== v.k) return ctx.reply('❌ Esse nome já está em uso.');
          delete d.names[v.n]; v.n = n; d.names[n] = v.k; save(); return openProfile(ctx, v);
        }
        if (sub === 'dm') { v.dm = String(A[1] || '').toLowerCase() === 'off' ? 'off' : 'on'; save(); return ctx.reply(v.dm === 'on' ? '✅ Você está recebendo mensagens.' : '🔕 Mensagens desativadas.'); }
        if (sub === 'msgs') return inbox(ctx, v);
        if (sub === 'apagar') return apagar(ctx, v, A[1]);
        return ctx.reply(HELP);
      } catch (e) { console.error('[INSTA]', e && e.stack); await ctx.reply('❌ Erro no Mini Insta: ' + (e && e.message)); }
    }
  },
  {
    name: 'dm', aliases: ['mensagem', 'mdm'], category: 'utilidades', hideFromMenu: true,
    description: 'Enviar mensagem a um usuário do Mini Insta', usage: '!dm @usuario texto',
    handler: async (ctx) => {
      try { const v = me(ctx), A = ctx.args || []; return enviarDm(ctx, v, A[0], A.slice(1).join(' ')); }
      catch (e) { console.error('[INSTA]', e && e.stack); await ctx.reply('❌ Erro: ' + (e && e.message)); }
    }
  }
], { open: openHub, inbox: (ctx) => inbox(ctx, me(ctx)), H: H });
