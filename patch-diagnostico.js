const fs = require('fs');
let fail = 0;
function edit(file, label, a, b, mark) {
  let s;
  try { s = fs.readFileSync(file, 'utf8'); } catch (e) { console.log('ERRO ' + label + ': ficheiro nao encontrado'); fail++; return; }
  if (s.indexOf(mark) >= 0) { console.log(label + ': ja aplicado'); return; }
  if (s.indexOf(a) < 0) { console.log('ERRO ' + label + ': ancora nao encontrada'); fail++; return; }
  fs.writeFileSync(file, s.replace(a, b));
  console.log(label + ': aplicado');
}

edit('src/commands/dono/modosnovos.js', 'modosugestao status',
  "(modes.suggestOff() ? '⚪ DESATIVADO' : '🟢 ATIVADO') + '\\n\\nUso: modosugestao on | off');",
  "(modes.suggestOff() ? '⚪ DESATIVADO' : '🟢 ATIVADO') + '\\nMídia do cartão: ' + require('../../interactive/sugMedia').status() + '\\n\\nUso: modosugestao on | off');",
  'sugMedia');

edit('src/commands/dono/setmedia.js', 'setmedia texto',
  "Testa: *' + target.name + '*'",
  "Testa: *' + (target.special ? 'ative !modosugestao on e digite um comando errado (ex: !meno)' : target.name) + '*'",
  'target.special ?');

console.log(fail ? 'FALHOU (' + fail + ')' : 'TUDO_OK');
process.exit(fail ? 1 : 0);
