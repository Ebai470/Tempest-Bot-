#!/usr/bin/env node
'use strict';
/**
 * Aplica as 3 pequenas ligações do update (index.js e welcomeBanner.js).
 * - Faz backup dos ficheiros alterados antes de mexer.
 * - Idempotente: se já foi aplicado, não faz nada.
 * - Verifica a sintaxe no fim; se falhar, restaura o backup.
 * Uso (na raiz do projeto, depois de extrair o zip por cima):  node aplicar-update.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(process.argv[2] || process.cwd());
const files = {
  index: path.join(root, 'src', 'index.js'),
  banner: path.join(root, 'src', 'services', 'welcomeBanner.js')
};
for (const f of Object.values(files)) {
  if (!fs.existsSync(f)) { console.error('❌ Não encontro ' + f + '\n   Execute na raiz do projeto (a pasta que tem src/ e package.json).'); process.exit(1); }
}
for (const need of ['src/utils/albumIndex.js', 'src/commands/stickers/stiks.js', 'src/services/welcomeRender.js', 'src/services/welcomeSuite.js', 'src/commands/utilidades/welcomeSuite.js']) {
  if (!fs.existsSync(path.join(root, need))) { console.error('❌ Falta o ficheiro novo ' + need + ' — extraia o zip do update na raiz do projeto primeiro.'); process.exit(1); }
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const bakDir = path.join(root, 'backup-welcome3a6-' + stamp);
const original = {};
const edits = [];

function plan(key, name, marker, find, replace) {
  const src = fs.readFileSync(files[key], 'utf8');
  if (original[key] === undefined) original[key] = src;
  const cur = edits.filter((e) => e.key === key).reduce((s, e) => e.out, src);
  if (cur.includes(marker)) { console.log('• ' + name + ': já aplicado'); return; }
  const n = cur.split(find).length - 1;
  if (n !== 1) { console.error('❌ ' + name + ': ponto de ligação não encontrado de forma única (' + n + ' ocorrências).\n   O ficheiro foi alterado desde a versão analisada. Nada foi modificado.'); process.exit(2); }
  edits.push({ key, name, out: cur.replace(find, () => replace) });
}

// 1) welcomeBanner.js — exporta helpers que já existiam (alteração aditiva)
plan('banner', 'welcomeBanner exports', 'TP_WSUITE',
  'module.exports = { buildWelcomeMedia, generateBanner, rememberName };',
  'module.exports = { buildWelcomeMedia, generateBanner, rememberName, collectJids, fetchPic, resolveName }; // TP_WSUITE: helpers reutilizados pelos boas-vindas 3-6');

// 2) index.js — boas-vindas 3-6 antes dos antigos (quando ativos num grupo, pausam os antigos)
plan('index', 'index: boas-vindas 3-6', 'TP_WSUITE',
  "  sock.ev.on('group-participants.update', async (update) => {\n    try {\n      const g0 = getGroup(update.id);\n      await welcomeHook.handleAdd(sock, update, g0);\n    } catch (e) { console.error('[welcomeHook]', e.message); }\n    try { await require('./services/welcome2Auto').handle(sock, update); } catch (e) { console.error('[welcome2]', e.message); } // TP_W2AUTO\n",
  "  sock.ev.on('group-participants.update', async (update) => {\n    let _wsDone = false; // TP_WSUITE: boas-vindas 3-6; quando ativas num grupo pausam as antigas (1 e 2)\n    try { _wsDone = await require('./services/welcomeSuite').handle(sock, update); } catch (e) { console.error('[welcomeSuite]', e.message); }\n    try {\n      const g0 = getGroup(update.id);\n      if (!_wsDone) await welcomeHook.handleAdd(sock, update, g0);\n    } catch (e) { console.error('[welcomeHook]', e.message); }\n    try { if (!_wsDone) await require('./services/welcome2Auto').handle(sock, update); } catch (e) { console.error('[welcome2]', e.message); } // TP_W2AUTO\n");

// 3) index.js — regista álbuns para o !stiks (ao lado do cache de mensagens)
plan('index', 'index: índice de álbuns', 'TP_STIKS',
  'try { msgCache.saveMessage(msg); } catch (_) {}',
  "try { msgCache.saveMessage(msg); } catch (_) {}\n  try { require('./utils/albumIndex').record(msg); } catch (_) {} // TP_STIKS: álbuns para o !stiks");

if (!edits.length) { console.log('\n✅ Nada a fazer: o update já estava aplicado.'); process.exit(0); }

fs.mkdirSync(bakDir, { recursive: true });
for (const [k, v] of Object.entries(original)) fs.writeFileSync(path.join(bakDir, path.basename(files[k])), v);
const finalText = {};
for (const e of edits) finalText[e.key] = e.out;
for (const [k, v] of Object.entries(finalText)) fs.writeFileSync(files[k], v);

try {
  for (const f of [files.index, files.banner, ...['src/utils/albumIndex.js', 'src/commands/stickers/stiks.js', 'src/services/welcomeRender.js', 'src/services/welcomeSuite.js', 'src/commands/utilidades/welcomeSuite.js'].map((x) => path.join(root, x))]) {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  }
} catch (e) {
  for (const [k, v] of Object.entries(original)) fs.writeFileSync(files[k], v);
  console.error('❌ Erro de sintaxe após aplicar — alterações revertidas.\n' + String(e.stderr || e.message).slice(0, 400));
  process.exit(3);
}
for (const e of edits) console.log('✔ ' + e.name);
console.log('\n✅ Update aplicado. Backup dos ficheiros originais em: ' + path.relative(root, bakDir));
console.log('   Reinicie o bot para carregar os novos comandos.');
