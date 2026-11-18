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

edit('src/interactive/nativeFlow.js', 'nativeFlow (imagem PNG)', (s) => {
  if (s.indexOf('imageMime') >= 0) return 'done';
  const a = "{ image: typeof opts.image === 'string' ? { url: opts.image } : opts.image },";
  if (s.indexOf(a) < 0) return null;
  return s.replace(a, "Object.assign({ image: typeof opts.image === 'string' ? { url: opts.image } : opts.image }, opts.imageMime ? { mimetype: opts.imageMime } : {}),");
});

edit('src/interactive/index.js', 'index (registar segaUi)', (s) => {
  if (s.indexOf("'segaUi'") >= 0) return 'done';
  const a = "'infoCards'].forEach";
  if (s.indexOf(a) < 0) return null;
  return s.replace(a, "'infoCards', 'segaUi'].forEach");
});

edit('src/interactive/menuButtons.js', 'menu principal (linha Arcade)', (s) => {
  if (s.indexOf('sgm:menu') >= 0) return 'done';
  const i = s.indexOf("title: 'Jogos Interativos'");
  if (i < 0) return null;
  const ls = s.lastIndexOf('\n', i) + 1;
  return s.slice(0, ls) + "      { header: '🕹️ Arcade', title: 'Arcade 16:9', description: '6 jogos de arcade em tela 16:9', id: 'sgm:menu' },\n" + s.slice(ls);
}, true);

console.log(fail ? 'FALHOU (' + fail + ')' : 'TUDO_OK');
process.exit(fail ? 1 : 0);
