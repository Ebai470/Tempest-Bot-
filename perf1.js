const fs = require('fs');
function patch(file, edits) {
  let s = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const [label, re, rep] of edits) {
    if (re.test(s)) { s = s.replace(re, rep); n++; console.log('  OK   ' + label); }
    else console.log('  SKIP ' + label + ' (trecho nao encontrado)');
  }
  if (n) fs.writeFileSync(file, s);
  return n;
}
console.log('index.js');
patch('src/index.js', [
  ['remover delay de 2.5-5s no envio',
   /(function beatrizWrapSockSend\(sock\) \{\n)/,
   '$1  return sock; /* PERF1: delay/digitando removidos */\n'],
  ['handleMessage sem bloquear o lote',
   /await handleMessage\(sock, msg\);/,
   'handleMessage(sock, msg).catch(function (e) { console.error("[MSG ERROR]", e); }); /* PERF1 */'],
]);
console.log('utils/sendDelay.js');
patch('src/utils/sendDelay.js', [
  ['envio direto, sem delay/digitando/fila por chat',
   /(async function withDelay\(sock, jid, content, options, sendFn\) \{\n)/,
   '$1  return sendFn(); /* PERF1 */\n'],
]);
