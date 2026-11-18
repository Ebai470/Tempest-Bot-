// Aplica o ARCADE (divisões SEGA 2D e NINTENDO 64 3D) no Tempest Bot. Rode na pasta do bot:  node aplicar-arcade-html.js
const fs = require('fs'), path = require('path');
let fail = 0;
const ok = (m) => console.log('OK    ' + m), bad = (m) => { console.log('ERRO  ' + m); fail++; };
for (const f of ['src/interactive/nativeFlow.js', 'src/interactive/router.js', 'src/config.js']) { if (!fs.existsSync(f) && !fs.existsSync(f.replace(/\.js$/, '/index.js'))) bad('não achei ' + f + ' — rode na pasta do bot'); }
if (fail) process.exit(1);
const bk = path.join('data', 'backup-arcade-' + Date.now()); fs.mkdirSync(bk, { recursive: true });
for (const f of ['src/interactive/segaUi.js', 'src/commands/diversao/sega.js', 'src/interactive/menuButtons.js']) { if (fs.existsSync(f)) fs.copyFileSync(f, path.join(bk, f.replace(/[\\/]/g, '__'))); }
ok('backup dos arquivos que mudam em ' + bk);
// menu principal: linha "Arcade Sega" + nova linha "Nintendo 64"
const mb = 'src/interactive/menuButtons.js';
if (fs.existsSync(mb)) {
  const lines = fs.readFileSync(mb, 'utf8').split('\n'), i = lines.findIndex((l) => l.includes("id: 'sgm:menu'"));
  if (i < 0) ok('menuButtons.js: não achei a linha do Arcade (nada alterado; use !sega e !n64)');
  else {
    lines[i] = lines[i].replace(/title: '[^']*'/, "title: 'Arcade Sega'").replace(/description: '[^']*'/, "description: '5 jogos clássicos 2D em tela 16:9'");
    if (!lines.some((l) => l.includes("'n64:menu'"))) lines.splice(i + 1, 0, lines[i].replace(/header: '[^']*'/, "header: '🎮 Nintendo 64'").replace(/title: '[^']*'/, "title: 'Nintendo 64'").replace(/description: '[^']*'/, "description: '10 jogos 3D em tela 16:9'").replace("'sgm:menu'", "'n64:menu'"));
    fs.writeFileSync(mb, lines.join('\n')); ok('menuButtons.js: linhas Arcade Sega e Nintendo 64 prontas');
  }
}
try {
  const { execFileSync } = require('child_process');
  ['src/interactive/arcadeCore.js', 'src/interactive/segaUi.js', 'src/interactive/n64Ui.js', 'src/commands/diversao/sega.js', 'src/commands/diversao/n64.js', 'src/games/arcade/index.js'].forEach((f) => { execFileSync(process.execPath, ['--check', f]); ok('sintaxe ' + f); });
  const a = require(path.resolve('src/games/arcade'));
  a.GAMES.forEach((g) => { const h = a.buildHtml(g.id); if (!h || h.length < 4000) throw new Error('painel vazio: ' + g.id); ok('painel ' + g.id + ' (' + Math.round(h.length / 1024) + ' KB)'); });
  const n2 = a.GAMES.filter((g) => g.k === '2d').length, n3 = a.GAMES.filter((g) => g.k === '3d').length;
  console.log('Sega: ' + n2 + ' jogos • Nintendo 64: ' + n3 + ' jogos');
} catch (e) { bad('verificação: ' + (e && e.message)); }
console.log(fail ? 'FALHOU (' + fail + ')' : 'TUDO_OK — reinicie o bot e use !sega e !n64');
process.exit(fail ? 1 : 0);
