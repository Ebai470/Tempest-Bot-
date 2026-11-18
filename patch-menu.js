const fs = require('fs');
const p = 'src/interactive/mainMenu.js';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('TP_MENUTHEME')) { console.log('menu: ja aplicado'); process.exit(0); }

const A1 = "const config = require('../config');\n";
const A2 = 'async function openMain(ctx) {';
const A3 = 'async function openCategory(ctx, cat) {';
const A4 = "  const nav = [btn.reply('🔙 Voltar ao Menu', 'mn:home'), btn.channel('📢 Canal Oficial')];\n";
const i2 = s.indexOf(A2), i3 = s.indexOf(A3);
if (!s.includes(A1) || i2 < 0 || i3 < 0 || i3 < i2 || !s.includes(A4)) { console.log('ERRO: ancoras do mainMenu.js nao encontradas'); process.exit(1); }

const NEW_OPEN = `async function openMain(ctx) { // TP_MENUTHEME
  const nf = require('./nativeFlow');
  const MT = require('./menuTheme');
  const on = MT.langOn(ctx.jid);
  const S = (t, m) => MT.sc(t, m || 'title', on);
  const pref = (ctx.prefix && ctx.prefix.trim()) || (config.prefixes && config.prefixes[0]) || '!';
  const num = String(ctx.sender || '').split('@')[0].split(':')[0];
  const nome = (ctx.msg && ctx.msg.pushName) || num;
  const dt = tpDateTime();
  const sub = tpSubInfo(ctx);
  const rows = await buildRows(ctx);
  const W = MT.WINGS;
  const F = (k, v) => W + ' ' + S(k) + ' » ' + v;
  const body =
    W + ' ·˚₊✦ ' + S('Tempest Bot') + ' ✦₊˚· ' + W + '\\n\\n' +
    F('Usuario', nome) + '\\n' +
    F('Dono', nf.getEnv('DONO_EXIBIR') || '+258874288439') + '\\n' +
    F('Data', dt.date) + '\\n' +
    F('Hora', dt.time) + '\\n' +
    F('Aluguel', sub ? sub.text : 'uso privado') + '\\n' +
    F('Uptime', up()) + '\\n' +
    F('Prefixo', '[ ' + pref + ' ]') + '\\n\\n' +
    '·⁺✧ ' + MT.FRUIT + ' ' + S('use o prefixo', 'all') + ' ' + MT.FRUIT + ' ✧⁺·\\n' +
    '⍟ ︵˚' + MT.HEART + '˚︵ ⍟';
  const footer = '·✦· ' + W + ' ' + S('Tempest Bot') + ' ' + W + ' ·✦·';
  let image = null, video = null, gifPlay = false; // TP_VID
  try { const media = cm(); const info = media && media.get('menu'); if (info) { if (info.type === 'image') image = fs.readFileSync(info.file); else if (info.type === 'video' || info.type === 'gif') { video = fs.readFileSync(info.file); gifPlay = info.type === 'gif'; } } } catch (_) {}
  if (image || video) ctx.__tpMediaUsed = true;

  // cartao "Termina no dia ..." (TP_CARD2): vencimento do aluguel; sem aluguel ativo usa data de reserva
  let expMs = null;
  if (sub && sub.active) expMs = sub.endMs;
  else if (!nf.getEnv('MENU_CARD_SO_ALUGUEL')) expMs = Date.now() + (parseInt(nf.getEnv('MENU_CARD_DIAS'), 10) || 30) * 86400000;
  let messageParams;
  if (expMs) {
    const exp = nf.getEnv('OFFER_SECONDS') ? Math.floor(expMs / 1000) : expMs;
    messageParams = { limited_time_offer: { text: '⋆✦⋆ Tempest ⋆✦⋆', url: nf.CHANNEL_URL, copy_code: '© Tempest', expiration_time: exp } };
  }

  await sendNative(ctx.sock, ctx.jid, {
    body: body,
    footer: footer,
    noFormat: true,
    image: image, video: video, gifPlayback: gifPlay, onMediaFail: () => { ctx.__tpMediaUsed = false; },
    messageParams: messageParams,
    quoted: ctx.msg,
    buttons: [
      btn.reply(MT.B.dono(on), 'mn:owner'),
      btn.list(MT.B.list(on), MT.styleSections([
        { title: 'Menus de Comandos', rows: rows },
        { title: 'Atalhos', rows: [
          { header: '🏓 Ping', title: 'Ping', description: 'Ver se o bot está online', id: 'mn:cmd:ping' },
          { header: '📝 Texto', title: 'Texto', description: 'Menu em texto', id: 'mn:txt' },
          { header: '🌐 Idioma', title: 'Idioma', description: 'Mudar o idioma do bot', id: 'lg:menu' }
        ] }
      ], on)),
      btn.channel(MT.B.canal(on))
    ],
    fallback: require('../utils/menu').generateMainMenu(ctx)
  });
}

`;
s = s.slice(0, i2) + NEW_OPEN + s.slice(i3);
s = s.replace(A4, "  const nav = require('./menuTheme').nav(require('./menuTheme').langOn(ctx.jid));\n");
fs.writeFileSync(p, s);
console.log('menu: patch aplicado');
