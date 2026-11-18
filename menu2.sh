set -e
cd "${1:-.}"
[ -f src/interactive/mainMenu.js ] || { echo "❌ Rode dentro da pasta do bot"; exit 1; }
BK="backup-menu2-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"; cp src/interactive/mainMenu.js "$BK/"; cp src/interactive/nativeFlow.js "$BK/"
CH="$BK/openMain.chunk"
cat > "$CH" <<'__TP_CHUNK__'
function tpDateTime() {
  const tz = config.timezone || 'Africa/Maputo';
  const d = new Date();
  try {
    return { date: d.toLocaleDateString('pt-BR', { timeZone: tz }), time: d.toLocaleTimeString('pt-BR', { timeZone: tz, hour12: false }) };
  } catch (_) {
    return { date: d.toLocaleDateString('pt-BR'), time: d.toLocaleTimeString('pt-BR') };
  }
}

// assinatura (aluguel) do grupo: mesma tabela que o bot ja usa para liberar comandos
function tpSubInfo(ctx) {
  if (!ctx.isGroup) return null;
  try {
    const db = require('../database').getDb();
    const sub = db.prepare('SELECT * FROM subscriptions WHERE group_jid = ?').get(ctx.jid);
    if (!sub) return { active: false, text: 'sem assinatura' };
    const end = new Date(sub.end_date);
    const endMs = end.getTime();
    if (sub.status === 'active' && endMs > Date.now()) {
      const days = Math.ceil((endMs - Date.now()) / 86400000);
      return { active: true, endMs: endMs, text: 'até ' + end.toLocaleDateString('pt-BR', { timeZone: config.timezone || 'Africa/Maputo' }) + ' (' + days + (days === 1 ? ' dia)' : ' dias)') };
    }
    return { active: false, text: 'expirada' };
  } catch (_) { return null; }
}

async function openMain(ctx) {
  const nf = require('./nativeFlow');
  const pref = (ctx.prefix && ctx.prefix.trim()) || (config.prefixes && config.prefixes[0]) || '!';
  const num = String(ctx.sender || '').split('@')[0].split(':')[0];
  const nome = (ctx.msg && ctx.msg.pushName) || num;
  const dt = tpDateTime();
  const sub = tpSubInfo(ctx);
  const rows = await buildRows(ctx);
  const G = 'ঔৣֳ̤᷈͜͝͡';
  const L = (t) => '*│  ' + G + '✦ ' + t + '*';
  const body =
    '*╭━━✯ ❖ Tempest ❖ ✯━━╮*\n' +
    '*│*\n' +
    L('Nome: ' + nome) + '\n' +
    L('Data: ' + dt.date) + '\n' +
    L('Hora: ' + dt.time) + '\n' +
    L('Prefixo: [ ' + pref + ' ]') + '\n' +
    L('Dono: ' + (nf.getEnv('DONO_EXIBIR') || '+258874288439')) + '\n' +
    L('Aluguel: ' + (sub ? sub.text : 'uso privado')) + '\n' +
    '*│*\n' +
    '*╰━━━ঔৣ͡➳ ✦ ❖ ✦ ➳ঔৣ͡━━━╯*';
  let image = null;
  try { const media = cm(); const info = media && media.get('menu'); if (info && info.type === 'image') image = fs.readFileSync(info.file); } catch (_) {}
  if (image) ctx.__tpMediaUsed = true;

  // cartao "Termina no dia ..." = vencimento do aluguel do grupo
  let messageParams;
  if (sub && sub.active) {
    const exp = nf.getEnv('OFFER_SECONDS') ? Math.floor(sub.endMs / 1000) : sub.endMs;
    messageParams = { limited_time_offer: { text: '© Tempest', url: nf.CHANNEL_URL, copy_code: '© Tempest', expiration_time: exp } };
  }

  await sendNative(ctx.sock, ctx.jid, {
    body: body,
    footer: '© TEMPEST BOT • escolha a Baixo:',
    image: image,
    messageParams: messageParams,
    quoted: ctx.msg,
    buttons: [
      btn.reply('👑 Dono', 'mn:owner'),
      btn.list('🔰 Ver Menus 🔰', [
        { title: '📂 Menus de Comandos', rows: rows },
        { title: '⚡ Atalhos', rows: [
          { header: '🏓 Ping', title: 'Ping', description: 'Ver se o bot está online', id: 'mn:cmd:ping' },
          { header: '📝 Texto', title: 'Texto', description: 'Menu em texto', id: 'mn:txt' }
        ] }
      ]),
      btn.channel('📢 Canal')
    ],
    fallback: require('../utils/menu').generateMainMenu(ctx)
  });
}

__TP_CHUNK__
CHUNK="$CH" node - <<'__TP_PATCH__'
const fs = require('fs');
// 1) nativeFlow: aceita messageParams (cartao "Termina no dia")
let nf = fs.readFileSync('src/interactive/nativeFlow.js', 'utf8');
if (!nf.includes('opts.messageParams')) {
  const a = "messageParamsJson: ''";
  if (!nf.includes(a)) { console.log('❌ nativeFlow: ancora nao encontrada'); process.exit(2); }
  nf = nf.replace(a, "messageParamsJson: opts.messageParams ? JSON.stringify(opts.messageParams) : ''");
  fs.writeFileSync('src/interactive/nativeFlow.js', nf); console.log('✔ nativeFlow atualizado');
} else console.log('= nativeFlow ja atualizado');
// 2) mainMenu: troca openMain + botao Dono
let mm = fs.readFileSync('src/interactive/mainMenu.js', 'utf8');
if (mm.includes('tpSubInfo')) { console.log('= mainMenu ja atualizado'); }
else {
  const i = mm.indexOf('async function openMain(ctx) {');
  const j = mm.indexOf('async function openCategory(ctx, cat) {');
  if (i < 0 || j < 0 || j < i) { console.log('❌ mainMenu: trecho nao encontrado'); process.exit(2); }
  const chunk = fs.readFileSync(process.env.CHUNK, 'utf8');
  mm = mm.slice(0, i) + chunk + mm.slice(j);
  const r = "if (rest === 'home') return openMain(ctx);";
  if (!mm.includes(r)) { console.log('❌ mainMenu: roteador nao encontrado'); process.exit(2); }
  mm = mm.replace(r, r + "\n  if (rest === 'owner') {\n    const n = String(require('./nativeFlow').getEnv('DONO_EXIBIR') || '+258874288439').replace(/\\D/g, '');\n    const vcard = 'BEGIN:VCARD\\nVERSION:3.0\\nFN:👑 Dono • ' + config.botName + '\\nTEL;type=CELL;type=VOICE;waid=' + n + ':+' + n + '\\nEND:VCARD';\n    await ctx.sock.sendMessage(ctx.jid, { contacts: { displayName: '👑 Dono', contacts: [{ vcard: vcard }] } });\n    return;\n  }");
  fs.writeFileSync('src/interactive/mainMenu.js', mm); console.log('✔ mainMenu atualizado');
}
__TP_PATCH__
for f in src/interactive/nativeFlow.js src/interactive/mainMenu.js; do node --check "$f" || { echo "❌ erro - restaurando"; cp "$BK/mainMenu.js" src/interactive/; cp "$BK/nativeFlow.js" src/interactive/; exit 3; }; done
echo "✅ Menu novo instalado. Reinicie o bot e mande: menu"
