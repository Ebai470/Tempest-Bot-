set -e
cd "${1:-$HOME/tempest-bot}"
F=src/commands/utilidades/ytplay3.js
[ -f "$F" ] || { echo "❌ não achei $F (rode no ~/tempest-bot)"; exit 1; }
grep -q quickSearch "$F" || { echo "❌ rode antes o patch v2"; exit 1; }
cp "$F" "$F.bak-v2"
node - <<'__TP_PATCH__'
const fs = require('fs');
const f = 'src/commands/utilidades/ytplay3.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('TP_V3')) { console.log('= já está na v3'); process.exit(0); }
function rep(a, b) { if (!s.includes(a)) { console.log('❌ trecho não encontrado: ' + a.slice(0, 50)); process.exit(2); } s = s.replace(a, function () { return b; }); }

rep("youtube:player_client=android_vr", "youtube:player_client=tv_embedded");

rep("      console.log('[ytplay3] ' + secs(T0) + ' painel de ' + Math.round(html.length / 1024) + ' KB, enviando…');",
    "      console.log('[ytplay3] ' + secs(T0) + ' painel de ' + Math.round(html.length / 1024) + ' KB, enviando…'); // TP_V3\n" +
    "      try { await ctx.reply('📦 Painel pronto em ' + secs(T0) + ' (' + (html.length / 1048576).toFixed(1) + ' MB) • letra: ' + (t.lyr ? (t.lyr.synced ? 'sincronizada' : 'simples') : 'não achada') + '\\n📤 Enviando o painel…'); } catch (_) {}");

rep("        console.log('[ytplay3] ' + secs(T0) + ' painel enviado');",
    "        console.log('[ytplay3] ' + secs(T0) + ' painel enviado');\n" +
    "        try { await ctx.reply('✅ Painel enviado ao WhatsApp em ' + secs(T0) + '.\\n🎧 Mandando o áudio normal também, por garantia.'); } catch (_) {}\n" +
    "        try { await ctx.sock.sendMessage(ctx.jid, { audio: fs.readFileSync(t.audio), mimetype: 'audio/mpeg', fileName: clip(t.title, 60) + '.mp3', ptt: false }, { quoted: ctx.msg }); } catch (_) {}");
fs.writeFileSync(f, s);
console.log('✔ ytplay3 atualizado para v3');
__TP_PATCH__
node --check "$F" || { echo "❌ erro de sintaxe - restaurando"; cp "$F.bak-v2" "$F"; exit 3; }
echo "✅ Pronto! Reinicie o bot."
