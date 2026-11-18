set -e
cd "${1:-$HOME/tempest-bot}"
F=src/interactive/downloadsUi.js
[ -f "$F" ] || { echo "❌ Rode dentro da pasta do bot (não achei $F)"; exit 1; }
grep -q TP_CURTOS "$F" || { echo "❌ Rode primeiro o patch anterior (tp-curtos.sh)"; exit 1; }
BK="backup-curtos2-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"; cp "$F" "$BK/"
node - <<'__TP_PATCH__'
const fs = require('fs');
const f = 'src/interactive/downloadsUi.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('TP_CURTOS2')) { console.log('= já atualizado'); process.exit(0); }

const a1 = "  let image = null;\n  if (meta.thumb) {";
if (!s.includes(a1)) { console.log('❌ âncora 1 não encontrada'); process.exit(2); }
s = s.replace(a1, "  let image = null; // TP_CURTOS2\n  if (meta.thumb && !_short) {");

const a2 = "    title: '🎛️ ' + config.botName,";
if (!s.includes(a2)) { console.log('❌ âncora 2 não encontrada'); process.exit(2); }
s = s.replace(a2, "    title: _short ? '⋆. 𐙚˚࿔ 𝔗𝔢𝔪𝔭𝔢𝔰𝔱 𝔟𝔬𝔱 𝜗𝜚˚⋆' : '🎛️ ' + config.botName,\n    subtitle: _short ? '⋆｡𖦹°⭒˚｡⋆⋆｡𖦹°⭒˚｡⋆' : '',");

fs.writeFileSync(f, s);
console.log('✔ downloadsUi atualizado');
__TP_PATCH__
node --check "$F" || { echo "❌ erro de sintaxe - restaurando"; cp "$BK/downloadsUi.js" "$F"; exit 3; }
echo "✅ Pronto! Reinicie o bot."
