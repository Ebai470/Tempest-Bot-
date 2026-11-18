const fs = require('fs');
let fail = 0;

function edit(file, label, fn) {
  let s;
  try { s = fs.readFileSync(file, 'utf8'); } catch (e) { console.log('ERRO ' + label + ': ficheiro nao encontrado (' + file + ')'); fail++; return; }
  const r = fn(s);
  if (r === 'done') { console.log(label + ': ja aplicado'); return; }
  if (r === null) { console.log('ERRO ' + label + ': ancora nao encontrada'); fail++; return; }
  fs.writeFileSync(file, r);
  console.log(label + ': aplicado');
}

edit('src/services/commandMedia.js', 'commandMedia', (s) => {
  if (s.indexOf('commandMediaFix') >= 0) return 'done';
  const a = '  const info = resolve(commandName, args, aliases);';
  if (s.indexOf(a) < 0) return null;
  s = s.replace(a, '  const info = module.exports.resolve(commandName, args, aliases);');
  return s + "\ntry { require('./commandMediaFix').install(module.exports); } catch (e) { console.error('[commandMedia fix]', e && e.message); }\n";
});

edit('src/services/eventStyle.js', 'eventStyle', (s) => {
  if (s.indexOf('eventStyleFix') >= 0) return 'done';
  if (s.indexOf('module.exports') < 0) return null;
  return s + "\ntry { require('./eventStyleFix').install(module.exports); } catch (e) { console.error('[eventStyleFix]', e && e.message); }\n";
});

edit('src/commands/dono/setmedia.js', 'setmedia', (s) => {
  if (s.indexOf('mediaKeys') >= 0) return 'done';
  const a = 'const mediaKey = parseMediaKey(ctx);';
  const b = "if (!target) return ctx.reply('Comando ' + parts[0] + ' nao existe.');";
  if (s.indexOf(a) < 0 || s.indexOf(b) < 0) return null;
  s = s.split(a).join("const mediaKey = require('../../services/mediaKeys').canon(parseMediaKey(ctx));");
  s = s.replace(b, "if (!target) target = require('../../services/mediaKeys').special(mediaKey);\n      " + b);
  return s;
});

edit('src/interactive/suggest.js', 'suggest', (s) => {
  if (s.indexOf('sugMedia') >= 0) return 'done';
  const a = "const off = () => String(getEnv('SUGESTAO') || '').toLowerCase() === 'off';";
  const b = '    quoted: quotedCard(ctx.sock, ctx.jid), buttons: buttons,';
  if (s.indexOf(a) < 0 || s.indexOf(b) < 0) return null;
  s = s.replace(a, "const off = () => require('../services/modes').suggestOff();");
  s = s.replace(b, b + " ...require('./sugMedia').opts(),");
  return s;
});

edit('src/commands/admin/moderation.js', 'moderation', (s) => {
  if (s.indexOf('noteActor') >= 0) return 'done';
  const a = "        await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'promote');";
  const b = "        await ctx.sock.groupParticipantsUpdate(ctx.jid, [target], 'demote');";
  if (s.indexOf(a) < 0 || s.indexOf(b) < 0) return null;
  const note = "        try { require('../../services/eventStyle').noteActor(ctx.jid, target, ctx.sender); } catch (_) {}\n";
  s = s.replace(a, note + a);
  s = s.replace(b, note + b);
  return s;
});

console.log(fail ? 'FALHOU (' + fail + ')' : 'TUDO_OK');
process.exit(fail ? 1 : 0);
