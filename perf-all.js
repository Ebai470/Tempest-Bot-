const fs = require('fs');
function patch(file, edits) {
  console.log(file);
  if (!fs.existsSync(file)) { console.log('  SKIP arquivo nao existe'); return; }
  let s = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [label, re, rep] of edits) {
    if (re.test(s)) { s = s.replace(re, rep); n++; console.log('  OK   ' + label); }
    else console.log('  SKIP ' + label + ' (trecho nao encontrado)');
  }
  if (n) fs.writeFileSync(file, s);
}
patch('src/index.js', [
  ['envio sem delay de 2.5-5s / digitando', /(function beatrizWrapSockSend\(sock\) \{\n)/, '$1  return sock; /* PERF */\n'],
  ['mensagens sem bloquear o lote', /await handleMessage\(sock, msg\);/, 'handleMessage(sock, msg).catch(function (e) { console.error("[MSG ERROR]", e); }); /* PERF */'],
  ['sem bloqueio busy por usuario', /if \(global\.__userBusy\[who\]\) \{/, 'if (false && global.__userBusy[who]) { /* PERF */'],
]);
patch('src/utils/sendDelay.js', [
  ['envio direto sem delay', /(async function withDelay\(sock, jid, content, options, sendFn\) \{\n)/, '$1  return sendFn(); /* PERF */\n'],
]);
patch('src/middlewares/mediaRateLimit.js', [
  ['sem limite de comandos de midia', /(function checkAndConsume\(userKey, role\) \{\n)/, '$1  return { ok: true, bypass: true }; /* PERF */\n'],
]);
patch('src/commands/stickers/pack.js', [
  ['sem pausa entre stickers', /await new Promise\(\(r\) => setTimeout\(r, 600\)\);/, '/* PERF */'],
  ['pack completo (30)', /const MAX_SEND = 15;/, 'const MAX_SEND = 30;'],
]);
patch('src/commands/utilidades/pint.js', [
  ['sem pausa entre imagens', /await new Promise\(\(r\) => setTimeout\(r, 800\)\);/, '/* PERF */'],
]);
patch('src/services/welcomeBanner.js', [
  ['sem espera antes do banner', /await new Promise\(\(r\) => setTimeout\(r, 800\)\);/, '/* PERF */'],
]);
for (const f of ['src/commands/utilidades/ytplay.js', 'src/commands/utilidades/youtube.js', 'src/commands/utilidades/ytd.js']) {
  patch(f, [['yt-dlp com 4 fragmentos paralelos', /'--no-playlist',/g, "'--no-playlist', '--concurrent-fragments', '4',"]]);
}
