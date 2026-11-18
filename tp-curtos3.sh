set -e
cd "${1:-$HOME/tempest-bot}"
F=src/interactive/downloadsUi.js
[ -f "$F" ] || { echo "❌ Rode dentro da pasta do bot (não achei $F)"; exit 1; }
grep -q TP_CURTOS2 "$F" || { echo "❌ Rode primeiro os patches anteriores (tp-curtos.sh e tp-curtos2.sh)"; exit 1; }
BK="backup-curtos3-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"; cp "$F" "$BK/"
node - <<'__TP_PATCH__'
const fs = require('fs');
const f = 'src/interactive/downloadsUi.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('TP_CURTOS3')) { console.log('= já atualizado'); process.exit(0); }

const a1 = "  await sendNative(ctx.sock, ctx.jid, {\n    title: _short";
if (!s.includes(a1)) { console.log('❌ âncora 1 não encontrada'); process.exit(2); }
const code = [
  "  let _vid = null; // TP_CURTOS3: usa a mídia do setmidia dentro do card",
  "  if (_short) {",
  "    try {",
  "      const _cm = require('../services/commandMedia');",
  "      const _inf = _cm.resolve(job.cmd, [], [job.cmd]);",
  "      if (_inf && _inf.file) {",
  "        const _buf = fs.readFileSync(_inf.file);",
  "        if (_inf.type === 'video' || _inf.type === 'gif') _vid = { v: _buf, gif: _inf.type === 'gif' }; else image = _buf;",
  "        ctx.__tpMediaUsed = true;",
  "      }",
  "    } catch (_) {}",
  "  }",
  ""
].join('\n');
s = s.replace(a1, code + a1);

const a2 = "    noFormat: !!_short,";
if (!s.includes(a2)) { console.log('❌ âncora 2 não encontrada'); process.exit(2); }
s = s.replace(a2, a2 + "\n    video: _vid ? _vid.v : undefined,\n    gifPlayback: _vid ? _vid.gif : false,");

fs.writeFileSync(f, s);
console.log('✔ downloadsUi atualizado');
__TP_PATCH__
node --check "$F" || { echo "❌ erro de sintaxe - restaurando"; cp "$BK/downloadsUi.js" "$F"; exit 3; }
echo "✅ Pronto! Reinicie o bot."
