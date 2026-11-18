set -e
cd "${1:-$HOME/tempest-bot}"
A=src/interactive/mainMenu.js; B=src/interactive/menuButtons.js
[ -f "$A" ] && [ -f "$B" ] || { echo "❌ Rode dentro da pasta do bot (não achei $A)"; exit 1; }
BK="backup-menu-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"; cp "$A" "$B" "$BK/"
node - <<'__TP_PATCH__'
const fs = require('fs');
function edit(file, steps) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('TP_MENUV2')) { console.log('= ' + file + ' já atualizado'); return; }
  steps(function (a, b) {
    if (!s.includes(a)) { console.log('❌ trecho não encontrado em ' + file + ': ' + a.slice(0, 60)); process.exit(2); }
    s = s.replace(a, function () { return b; });
  }, function () { return s; }, function (n) { s = n; });
  fs.writeFileSync(file, s);
  console.log('✔ ' + file);
}

// 1) texto do menu principal
edit('src/interactive/mainMenu.js', function (rep, get, set) {
  const s = get();
  const i1 = s.indexOf('  const W = MT.WINGS;'), i2 = s.indexOf('  let image = null, video = null, gifPlay = false; // TP_VID');
  if (i1 < 0 || i2 < 0 || i2 < i1) { console.log('❌ marcadores do texto não encontrados'); process.exit(2); }
  const novo = [
    "  const W = '𓆩💮𓆪'; // TP_MENUV2",
    "  const F = (k, v) => W + ' ' + S(k) + ' » ' + v;",
    "  const body =",
    "    W + ' ·˚₊✦ ' + S('Temp Bot') + ' ✦₊˚· ' + W + '\\n\\n' +",
    "    F('Usuario', nome) + '\\n' +",
    "    F('Dono', nf.getEnv('DONO_EXIBIR') || '+258874288439') + '\\n' +",
    "    F('Data', dt.date) + '\\n' +",
    "    F('Hora', dt.time) + '\\n' +",
    "    F('Uptime', up()) + '\\n' +",
    "    F('Prefixo', '[ ' + pref + ' ]') + '\\n\\n' +",
    "    '·⁺✧ 💖 ' + S('use o prefixo', 'all') + ' 💖 ✧⁺·\\n' +",
    "    '⍟ ︵˚💮˚︵ ⍟';",
    "  const footer = '·✦· ' + W + ' ' + S('Tempest Bot') + ' ' + W + ' ·✦·';",
    ""
  ].join('\n');
  set(s.slice(0, i1) + novo + s.slice(i2));
});

// 2) botões: Canal e Dono à vista, com a gaveta "Abrir Opções" junto
edit('src/interactive/menuButtons.js', function (rep) {
  rep("    btn.channel(MT.B.canal(on)),\n    btn.list(", "    btn.channel(MT.B.canal(on)),\n    btn.reply(MT.B.dono(on), 'mn:owner'), // TP_MENUV2\n    btn.list(");
  rep("  buttons.push(btn.reply(MT.B.dono(on), 'mn:owner'));\n", "");
  rep("in_thread_buttons_limit: 1,", "in_thread_buttons_limit: 3,");
});
__TP_PATCH__
node --check "$A" && node --check "$B" || { echo "❌ erro de sintaxe - restaurando"; cp "$BK/mainMenu.js" "$A"; cp "$BK/menuButtons.js" "$B"; exit 3; }
echo "✅ Menu principal atualizado. Backup em $BK. Reinicie o bot."
