set -e
cd "${1:-.}"
[ -f src/interactive/downloadsUi.js ] || { echo "❌ Rode dentro da pasta do bot (instale a parte 2 e 3 antes)"; exit 1; }
BK="backup-dl2-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"; cp src/interactive/downloadsUi.js "$BK/"
node - <<'__TP_PATCH__'
const fs = require('fs');
const f = 'src/interactive/downloadsUi.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('TP_DL2')) { console.log('= ja atualizado'); process.exit(0); }
const a = s.indexOf('const SEARCH_CMDS =');
const b = s.indexOf('\n', s.indexOf('const URL_CMDS ='));
if (a < 0 || b < 0) { console.log('❌ trecho das listas nao encontrado'); process.exit(2); }
const block = [
  "// TP_DL2: todos os comandos que baixam midia",
  "const SEARCH_CMDS = { ytplay: { asDoc: false }, ytplay2: { asDoc: true }, yt: { asDoc: false }, play: { asDoc: false } };",
  "const URL_CMDS = { ytd: 'video', yta: 'audio' };",
  "['tk', 'ig', 'fb', 'kw', 'pin', 'vk', 'twitch', 'rumble', 'vimeo', 'dailymotion', 'twitter', 'likee', 'snap', 'clapper', 'triller', 'lemon8', 'reddit', 'tumblr', 'threads', 'bilibili', 'snack', 'moj', 'josh', 'chingari', 'sharechat', 'zili'].forEach(function (n) { URL_CMDS[n] = 'both'; });"
].join('\n');
s = s.slice(0, a) + block + s.slice(b);
// 'play' usa o YouTube com escolha de qualidade; PLAY_YT=off mantem o Audius original
const g = "if (!ctx.sock || !ctx.jid) return false;";
if (!s.includes(g)) { console.log('❌ intercept nao encontrado'); process.exit(2); }
s = s.replace(g, g + "\n  if (name === 'play' && String(getEnv('PLAY_YT') || '').toLowerCase() === 'off') return false;");
fs.writeFileSync(f, s);
console.log('✔ downloadsUi atualizado');
__TP_PATCH__
node --check src/interactive/downloadsUi.js || { echo "❌ erro de sintaxe - restaurando"; cp "$BK/downloadsUi.js" src/interactive/downloadsUi.js; exit 3; }
echo "✅ Escolha de qualidade ativa em todos os comandos de download. Reinicie o bot."
echo "   Para 'play' voltar ao Audius original: PLAY_YT=off no .env"
