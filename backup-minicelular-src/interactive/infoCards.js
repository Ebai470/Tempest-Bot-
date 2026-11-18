'use strict';
const os = require('os');
const { btn, sendNative, getEnv } = require('./nativeFlow');
const router = require('./router');
const registry = require('../commands/registry');
const config = require('../config');

const nm = () => { const n = String(config.botName || 'Tempest bot').trim(); return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase(); };
const pad = (n) => String(n).padStart(2, '0');
const DONO1 = () => getEnv('DONO_1') || '+258 87 428 8439';
const DONO2 = () => getEnv('DONO_2') || '+258 82 428 8439';
const wa = (n) => 'https://wa.me/' + String(n).replace(/\D/g, '');

let gc = { n: null, ts: 0 };
async function groupsCount(sock) {
  if (gc.n !== null && Date.now() - gc.ts < 300000) return gc.n;
  try { const g = await sock.groupFetchAllParticipating(); gc = { n: Object.keys(g).length, ts: Date.now() }; } catch (_) {}
  return gc.n;
}

function pingText(ms, groups) {
  const s = Math.floor(process.uptime());
  const up = pad(Math.floor(s / 3600)) + ' ʜʀ, ' + pad(Math.floor((s % 3600) / 60)) + ' ᴍɪɴ ᴇ ' + pad(s % 60) + ' ꜱᴇɢ';
  let total = 0; try { total = registry.stats().totalMain; } catch (_) {}
  return [
    '- ⚡ `𝗩𝗘𝗟𝗢𝗖𝗜𝗗𝗔𝗗𝗘 𝗗𝗢 𝗕𝗢𝗧`',
    '> *🤖 • ʙᴏᴛ: ' + nm() + '*',
    '> *🚀 • ᴘɪɴɢ: ' + ms.toFixed(2) + ' ms*',
    '> *👥 • ɢʀᴜᴘᴏs: ' + (groups === null ? '—' : groups) + '*',
    '> *🕒 • ᴜᴘᴛɪᴍᴇ: ' + up + '*',
    '> *💾 • ʀᴀᴍ ʟɪᴠʀᴇ: ' + (os.freemem() / 1048576).toFixed(2) + ' MB*',
    '> *📦 • ʀᴀᴍ ᴛᴏᴛᴀʟ: ' + (os.totalmem() / 1073741824).toFixed(2) + ' GB*',
    '> *🛠️ • ᴄᴏᴍᴀɴᴅᴏs: ' + total + '*',
    '*✦ ' + nm() + ' ✦*'
  ].join('\n');
}
function donoText() {
  return [
    '- 💁‍♂️ `𝗗𝗢𝗡𝗢 𝗗𝗢 𝗕𝗢𝗧`',
    '> *👑 • ᴅᴏɴᴏ: ' + DONO1() + '*',
    '> *👑 • ᴅᴏɴᴏ 2: ' + DONO2() + ' 🙇‍♂️*',
    '> *🤖 • ʙᴏᴛ: ' + nm() + '*',
    '*✦ ' + nm() + ' ✦*'
  ].join('\n');
}

async function pingHandler(ctx) {
  const t0 = process.hrtime.bigint();
  try { if (ctx.msg && ctx.msg.key) await ctx.sock.sendMessage(ctx.jid, { react: { text: '🏓', key: ctx.msg.key } }); } catch (_) {}
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const groups = await groupsCount(ctx.sock);
  return sendNative(ctx.sock, ctx.jid, {
    body: pingText(ms, groups), quoted: ctx.msg, fallback: pingText(ms, groups),
    buttons: [btn.reply('✦ ᴀᴛᴜᴀʟɪᴢᴀʀ ✦', 'pg:again'), btn.reply('✦ ᴀʙʀɪʀ ᴍᴇɴᴜ ✦', 'mn:home'), btn.channel('✦ ᴄᴀɴᴀʟ ᴏꜰɪᴄɪᴀʟ ✦')]
  });
}
async function donoHandler(ctx) {
  return sendNative(ctx.sock, ctx.jid, {
    body: donoText(), quoted: ctx.msg, fallback: donoText(),
    buttons: [btn.url('👑 Contactar Dono', wa(DONO1())), btn.url('👑 Contactar Dono 2', wa(DONO2())), btn.channel('📢 Canal')]
  });
}
function override(name, fn) {
  const e = registry.get(name);
  if (!e || e.__tpInfo) return;
  e.handler = fn; e.__tpInfo = true; e.__tpUx = true;
}
override('ping', pingHandler);
override('owner', donoHandler);   // owner = dono / criador

router.register('pg', async (ctx) => { const e = registry.get('ping'); if (e) return e.handler(ctx); });

module.exports = { pingText, donoText };
