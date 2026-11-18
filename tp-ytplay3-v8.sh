set -e
cd "${1:-$HOME/tempest-bot}"
F=src/commands/utilidades/ytplay3.js
[ -f "$F" ] || { echo "❌ Rode no ~/tempest-bot (não achei $F)"; exit 1; }
grep -q "runCodec" "$F" || { echo "❌ Este ajuste é para o ytplay3 v7 (o que tem .ytplay3 codec)"; exit 1; }
if grep -q TP_V8 "$F"; then echo "= já está na v8"; exit 0; fi
BK="backup-ytplay3-v8-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"; cp "$F" "$BK/"
node - <<'__TP_PATCH__'
const fs = require('fs');
const f = 'src/commands/utilidades/ytplay3.js';
let s = fs.readFileSync(f, 'utf8');
function rep(a, b) { if (!s.includes(a)) { console.log('❌ trecho não encontrado: ' + a.slice(0, 60)); process.exit(2); } s = s.replace(a, function () { return b; }); }

// 1) o áudio nunca passa do limite (o Opus às vezes passa e o painel deixa de abrir)
rep("// capa pequena (quadrada, até ~35 KB) para o painel continuar leve",
`// TP_V8: garante que o áudio final não passe do limite (o Opus/VBR às vezes passa): se passar, recodifica mais baixo
async function fitAudio(inp, outDir, bag, kbps, codec, maxBytes) {
  let e = await encodeAudio(inp, outDir, bag, kbps, codec);
  for (let n = 0; n < 2; n++) {
    const size = fs.statSync(e.file).size;
    if (size <= maxBytes * 1.03) break;
    const k2 = Math.max(16, Math.floor(e.kbps * (maxBytes / size) * 0.94));
    console.log('[ytplay3] áudio passou do limite (' + Math.round(size / 1024) + ' KB); recodificando a ' + k2 + ' kbps');
    e = await encodeAudio(inp, outDir, bag, k2, codec);
  }
  return e;
}
// capa pequena (quadrada, até ~35 KB) para o painel continuar leve`);
rep("const e = await encodeAudio(r[0], outDir, bag, kbps, cfg.codec);", "const e = await fitAudio(r[0], outDir, bag, kbps, cfg.codec, cfg.audioKB * 1024);");

// 2) aviso quando o limite é alto + comando "menor"
rep("A mensagem fica de ~' + Math.round(kb * 1.8) + ' KB.\\nSe o painel parar de abrir, volte para um valor menor.');",
    "A mensagem fica de ~' + Math.round(kb * 1.8) + ' KB.\\nSe o painel parar de abrir (aparece só o nome da música), use *' + (ctx.prefix || '!') + 'ytplay3 menor*.' + (kb > 1000 ? '\\n⚠️ Acima de ~1000 KB o WhatsApp pode não abrir o painel. Confirme com *' + (ctx.prefix || '!') + 'ytplay3 teste*.' : ''));");
rep("async function runCodec(ctx) {",
`async function runMenor(ctx) {
  const cfg = readCfg();
  if (!(await isOwnerCtx(ctx))) return ctx.reply('❌ Só o dono pode usar isto.');
  const kb = Math.max(300, Math.floor(cfg.audioKB * 0.7));
  writeCfg(Object.assign(cfg, { audioKB: kb }));
  return ctx.reply('✅ Diminuí o limite para *' + kb + ' KB* (mensagem de ~' + Math.round(kb * 1.8) + ' KB). Peça a música de novo.\\nSe ainda não abrir, mande *' + (ctx.prefix || '!') + 'ytplay3 menor* outra vez.');
}
async function runCodec(ctx) {`);
rep("    if (first === 'codec') return runCodec(ctx);", "    if (first === 'codec') return runCodec(ctx);\n    if (first === 'menor') return runMenor(ctx);");
rep("_t: { parseLrc: parseLrc,", "_t: { fitAudio: fitAudio, parseLrc: parseLrc,");
fs.writeFileSync(f, s);
console.log('✔ ytplay3 v8');
__TP_PATCH__
node --check "$F" || { echo "❌ erro de sintaxe - restaurando"; cp "$BK/ytplay3.js" "$F"; exit 3; }
echo "✅ ytplay3 v8 pronto. Reinicie o bot."
