'use strict';
/**
 * SELOS — estilos de mensagem com "cartão" citado / anúncio / canal, para os comandos usarem.
 * Ideia original: Yato E'xa. Arquivo novo e isolado.
 *
 * Uso dentro de qualquer comando:
 *   const selos = require('../../services/selos').build(ctx);
 *   await selos.dono('texto');        // ou selos.canal, selos.local, selos.grande ...
 * Veja todos os nomes com:  !selo
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('../config');
let verified = null; try { verified = require('./verifiedMode'); } catch (_) {}

function envVal(k) {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const m = raw.split('\n').map(function (l) { return l.trim(); }).find(function (l) { return l.indexOf(k + '=') === 0; });
    return m ? m.slice(k.length + 1).trim() : '';
  } catch (_) { return ''; }
}
const BOT_NAME = config.botName || 'TEMPEST BOT';
const OWNER_NAME = envVal('OWNER_NAME') || 'Dono';
const CANAL_LINK = envVal('CHANNEL_URL') || 'https://whatsapp.com/channel/0029Vb6PhNkATRSjN3udCi26';
const donoDigits = function () { return String(config.ownerDisplay || config.ownerNumber || '').replace(/\D/g, ''); };

let _selo = null;
function seloFile() {
  if (_selo) return _selo;
  const files = [path.join(process.cwd(), 'assets', 'images', 'selo.png'), path.join(process.cwd(), 'assets', 'images', 'selo.jpg')];
  for (let i = 0; i < files.length; i++) { try { _selo = fs.readFileSync(files[i]); return _selo; } catch (_) {} }
  return null;
}
async function fetchBuf(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}

function build(ctx) {
  const sock = ctx.sock, jid = ctx.jid;
  const botJid = function () {
    const id = sock && sock.user && sock.user.id ? String(sock.user.id) : '';
    const num = id ? id.split('@')[0].split(':')[0] : String(config.botNumber || '');
    return num + '@s.whatsapp.net';
  };
  const donoJid = function () { return donoDigits() + '@s.whatsapp.net'; };
  const cache = {};
  const ownerThumb = async function () {
    if (cache.owner) return cache.owner;
    try { cache.owner = await fetchBuf(await sock.profilePictureUrl(donoJid(), 'image')); } catch (_) { cache.owner = null; }
    return cache.owner;
  };
  const seloThumb = async function () {          // selo.png do assets → foto do bot → foto do dono → vazio
    if (cache.selo) return cache.selo;
    let b = seloFile();
    if (!b) { try { b = await fetchBuf(await sock.profilePictureUrl(botJid(), 'image')); } catch (_) { b = null; } }
    if (!b) b = await ownerThumb();
    cache.selo = b || Buffer.alloc(0);
    return cache.selo;
  };
  // O remetente do cartão citado é sempre o próprio bot (não imitamos a conta oficial do WhatsApp).
  const key = function () { return { fromMe: false, participant: botJid(), remoteJid: jid, id: 'TPSELO' + crypto.randomBytes(5).toString('hex').toUpperCase() }; };
  const vcard = function (name, org) {
    return 'BEGIN:VCARD\nVERSION:3.0\nFN:' + name + '\n' + (org ? 'ORG:' + org + '\n' : '') + 'TEL;type=CELL;waid=' + donoDigits() + ':+' + donoDigits() + '\nEND:VCARD';
  };
  const channelInfo = function () {
    try {
      const ch = verified && verified.getChannel && verified.getChannel();
      if (ch && ch.jid && !(verified.channelProblem && verified.channelProblem(ch))) return { newsletterJid: ch.jid, newsletterName: ch.name || BOT_NAME, serverMessageId: 1 };
    } catch (_) {}
    return null;
  };
  const send = function (content, quoted) { return sock.sendMessage(jid, content, quoted ? { quoted: quoted } : {}); };
  const ad = function (thumb, big, attr) {
    return { title: BOT_NAME, body: OWNER_NAME, thumbnail: thumb, sourceUrl: CANAL_LINK, mediaType: 1, renderLargerThumbnail: !!big, showAdAttribution: !!attr };
  };

  const S = {};
  S.oficial = async function (t) { return send({ text: t || '' }, { key: key(), message: { conversation: BOT_NAME } }); };
  S.local = async function (t) { return send({ text: t || '' }, { key: key(), message: { locationMessage: { name: BOT_NAME, jpegThumbnail: await seloThumb() } } }); };
  S.local2 = async function (t) { return send({ text: t || '' }, { key: key(), message: { locationMessage: { name: BOT_NAME, jpegThumbnail: (await ownerThumb()) || (await seloThumb()) } } }); };
  S.dono = async function (t) {
    const th = (await ownerThumb()) || (await seloThumb());
    return send({ text: t || '' }, { key: key(), message: { contactMessage: { displayName: OWNER_NAME + ' • ' + BOT_NAME, vcard: vcard(OWNER_NAME, BOT_NAME), jpegThumbnail: th } } });
  };
  S.dono2 = async function (t) {
    const th = (await ownerThumb()) || (await seloThumb());
    return send({ text: t || '' }, { key: key(), message: { contactMessage: { displayName: OWNER_NAME, vcard: vcard(OWNER_NAME), jpegThumbnail: th } } });
  };
  S.vcard = async function (t) { return send({ text: t || '' }, { key: key(), message: { contactMessage: { displayName: BOT_NAME, vcard: vcard(BOT_NAME), jpegThumbnail: await seloThumb() } } }); };
  S.externo = async function (t) {
    const th = await seloThumb();
    return send({ text: t || '', contextInfo: { externalAdReply: ad(th, false, true) } }, { key: key(), message: { locationMessage: { name: BOT_NAME, jpegThumbnail: th } } });
  };
  S.empresa = async function (t) {
    const th = await seloThumb(), o = (await ownerThumb()) || th;
    return send({ text: t || '', contextInfo: { externalAdReply: ad(th, false, false) } }, { key: key(), message: { contactMessage: { displayName: BOT_NAME, vcard: vcard(OWNER_NAME), jpegThumbnail: o } } });
  };
  S.limpo = async function (t) { return send({ text: t || '', contextInfo: { externalAdReply: Object.assign(ad(await seloThumb(), false, false), { sourceUrl: undefined }) } }); };
  S.canal = async function (t) {
    const th = await seloThumb(), ci = { externalAdReply: ad(th, true, true) }, nl = channelInfo();
    if (nl) ci.forwardedNewsletterMessageInfo = nl;
    return send({ text: t || '', contextInfo: ci }, { key: key(), message: { locationMessage: { name: BOT_NAME, jpegThumbnail: th } } });
  };
  S.anuncio = async function (t) { return send({ text: t || '', contextInfo: { externalAdReply: ad(await seloThumb(), false, false) } }); };
  S.grande = async function (t) { return send({ text: t || '', contextInfo: { externalAdReply: ad(await seloThumb(), true, false) } }); };
  S.contexto = async function (t) {
    const ci = { forwardingScore: 999, isForwarded: true }, nl = channelInfo();
    if (nl) ci.forwardedNewsletterMessageInfo = nl;
    return send({ text: t || '', contextInfo: ci }, { key: key(), message: { conversation: BOT_NAME } });
  };

  // nomes alternativos (os mesmos do código original)
  const ALIAS = {
    selo: 'oficial', seloOficial: 'oficial', seloLocal: 'local', seloLocalizacao: 'local', seloLocal2: 'local2', seloLocalizacao2: 'local2',
    seloDono: 'dono', seloDonoVerificado: 'dono', seloDono2: 'dono2', seloVcard: 'vcard', seloExternal: 'externo', seloExterno: 'externo',
    seloBusiness: 'empresa', seloEmpresa: 'empresa', seloClean: 'limpo', seloLimpo: 'limpo', seloCanal: 'canal', seloChannel: 'canal',
    seloAd: 'anuncio', seloAnuncio: 'anuncio', seloBig: 'grande', seloGrande: 'grande', selocontexto: 'contexto'
  };
  Object.keys(ALIAS).forEach(function (a) { S[a] = S[ALIAS[a]]; });
  return S;
}

const NAMES = ['oficial', 'local', 'local2', 'dono', 'dono2', 'vcard', 'externo', 'empresa', 'limpo', 'canal', 'anuncio', 'grande', 'contexto'];
module.exports = { build: build, NAMES: NAMES };
