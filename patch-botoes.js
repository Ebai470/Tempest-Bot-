const fs = require('fs');
const p = 'src/interactive/mainMenu.js';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('TP_MENUBTNS')) { console.log('botoes: ja aplicado'); process.exit(0); }
if (!s.includes('TP_MENUTHEME')) { console.log('ERRO: aplique primeiro o patch-menu.js'); process.exit(1); }
const a = s.indexOf('    buttons: [\n      btn.reply(MT.B.dono(on)');
const endMark = '      btn.channel(MT.B.canal(on))\n    ],\n';
const b = s.indexOf(endMark, a);
const c = '  await sendNative(ctx.sock, ctx.jid, {\n    body: body,';
const ci = s.indexOf(c);
if (a < 0 || b < 0 || ci < 0 || ci > a) { console.log('ERRO: ancoras nao encontradas'); process.exit(1); }
s = s.slice(0, a) + '    buttons: _mb.buttons, // TP_MENUBTNS\n' + s.slice(b + endMark.length);
s = s.replace(c, "  const _mb = require('./menuButtons').build(on, rows, pref); // TP_MENUBTNS\n  messageParams = Object.assign({}, messageParams || {}, _mb.params);\n" + c);
fs.writeFileSync(p, s);
console.log('botoes: patch aplicado');
