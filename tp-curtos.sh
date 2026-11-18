set -e
cd "${1:-$HOME/tempest-bot}"
F=src/interactive/downloadsUi.js
[ -f "$F" ] || { echo "❌ Rode dentro da pasta do bot (não achei $F)"; exit 1; }
BK="backup-curtos-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"; cp "$F" "$BK/"
node - <<'__TP_PATCH__'
const fs = require('fs');
const f = 'src/interactive/downloadsUi.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('TP_CURTOS')) { console.log('= já atualizado'); process.exit(0); }

const a1 = "const pending = new Map();";
if (!s.includes(a1)) { console.log('❌ âncora 1 não encontrada'); process.exit(2); }
const labels = [
  "// TP_CURTOS: visual novo só para tk/ig/fb e similares (YouTube e outros ficam como estão)",
  "const SHORT_LABELS = { tk: 'TIK TOK', ig: 'INSTAGRAM', fb: 'FACEBOOK', kw: 'KWAI', pin: 'PINTEREST', vk: 'VK', twitch: 'TWITCH', rumble: 'RUMBLE', vimeo: 'VIMEO', dailymotion: 'DAILYMOTION', twitter: 'TWITTER', likee: 'LIKEE', snap: 'SNAPCHAT', clapper: 'CLAPPER', triller: 'TRILLER', lemon8: 'LEMON8', reddit: 'REDDIT', tumblr: 'TUMBLR', threads: 'THREADS', bilibili: 'BILIBILI', snack: 'SNACK VIDEO', moj: 'MOJ', josh: 'JOSH', chingari: 'CHINGARI', sharechat: 'SHARECHAT', zili: 'ZILI' };",
  ""
].join('\n');
s = s.replace(a1, labels + a1);

const a2 = "  let image = null;\n  if (meta.thumb)";
if (!s.includes(a2)) { console.log('❌ âncora 2 não encontrada'); process.exit(2); }
const body2 = [
  "  const _short = SHORT_LABELS[job.cmd];",
  "  let bodyOut = body;",
  "  if (_short) {",
  "    bodyOut =",
  "      '🍇`' + _short + '`\\n\\n' +",
  "      '> 📌 *Título:* ' + clip(meta.title, 90) + '\\n' +",
  "      '> 💬 *Canal:* ' + clip(meta.channel || '—', 50) + '\\n' +",
  "      '> ⏳ *Duração:* ' + (meta.duration ? fmtDur(meta.duration) : '—') + '\\n' +",
  "      '> 👤 Pedido de: @' + num + '\\n' +",
  "      '> ✨ Escolha a qualidade desejada abaixo!\\n\\n' +",
  "      '> © ' + config.botName + ' • Download Engine';",
  "  }",
  ""
].join('\n');
s = s.replace(a2, body2 + a2);

const a3 = "    body: body,\n    footer: '© ' + config.botName + ' • Download Engine',";
if (!s.includes(a3)) { console.log('❌ âncora 3 não encontrada'); process.exit(2); }
s = s.replace(a3, "    body: bodyOut,\n    footer: _short ? '' : '© ' + config.botName + ' • Download Engine',\n    noFormat: !!_short,");

fs.writeFileSync(f, s);
console.log('✔ downloadsUi atualizado');
__TP_PATCH__
node --check "$F" || { echo "❌ erro de sintaxe - restaurando"; cp "$BK/downloadsUi.js" "$F"; exit 3; }
echo "✅ Pronto! Cards de TikTok/Instagram/Facebook e similares no visual novo."
echo "   Backup em: $BK/downloadsUi.js"
echo "   Reinicie o bot para aplicar."
