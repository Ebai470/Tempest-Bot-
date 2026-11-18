const fs = require('fs');
let fail = 0;
function edit(file, label, fn, optional) {
  let s;
  try { s = fs.readFileSync(file, 'utf8'); } catch (e) { console.log((optional ? 'AVISO ' : 'ERRO ') + label + ': ficheiro nao encontrado (' + file + ')'); if (!optional) fail++; return; }
  const r = fn(s);
  if (r === 'done') { console.log(label + ': ja aplicado'); return; }
  if (r === null) { console.log((optional ? 'AVISO ' : 'ERRO ') + label + ': ancora nao encontrada'); if (!optional) fail++; return; }
  fs.writeFileSync(file, r);
  console.log(label + ': aplicado');
}

edit('src/interactive/index.js', 'index (registar shazamUi e namoroUi)', (s) => {
  if (s.indexOf("'shazamUi'") >= 0) return 'done';
  if (s.indexOf("'segaUi'].forEach") >= 0) return s.replace("'segaUi'].forEach", "'segaUi', 'shazamUi', 'namoroUi'].forEach");
  if (s.indexOf("'infoCards'].forEach") >= 0) return s.replace("'infoCards'].forEach", "'infoCards', 'shazamUi', 'namoroUi'].forEach");
  return null;
});

edit('src/commands/rpg/family.js', 'namorar (5 min + botoes Sim/Nao)', (s) => {
  if (s.indexOf('namoroUi') >= 0) return 'done';
  // 1) expiracao silenciosa: 1 minuto -> 5 minutos
  if (s.indexOf("'-1 minute'") < 0) return null;
  s = s.split("'-1 minute'").join("'-5 minutes'");
  // 2) o aviso do pedido passa a ser a mensagem com botoes
  const exp = s.indexOf('Expira em *1 minuto*');
  if (exp < 0) return null;
  const start = s.lastIndexOf('await ctx.reply(', exp);
  const endMarker = '{ mentions: [ctx.sender, target] }';
  const mi = s.indexOf(endMarker, exp);
  if (start < 0 || mi < 0) return null;
  let end = mi + endMarker.length;
  while (/\s/.test(s[end])) end++;
  if (s[end] !== ')') return null;
  end++;
  if (s[end] === ';') end++;
  s = s.slice(0, start) + "await require('../../interactive/namoroUi').sendRequest(ctx, pedidoId, target);" + s.slice(end);
  // 3) limpeza do pedido apos 5 minutos
  const t = s.indexOf('}, 60 * 1000);', start);
  if (t < 0) return null;
  s = s.slice(0, t) + '}, 5 * 60 * 1000);' + s.slice(t + '}, 60 * 1000);'.length);
  return s;
});

console.log(fail ? 'FALHOU (' + fail + ')' : 'TUDO_OK');
process.exit(fail ? 1 : 0);
