const fs = require('fs');
const p = 'src/interactive/nativeFlow.js';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('TP_BTNSTYLE')) { console.log('visual: ja aplicado'); process.exit(0); }
const re = /^.*TP_DARKBOX.*\n/m;
if (!re.test(s)) { console.log('ERRO: linha TP_DARKBOX nao encontrada (aplique o patch-darkbox.js primeiro)'); process.exit(1); }
const NEW =
  "  try { const _db = require('../utils/darkBox').convert(opts.body); if (_db) opts = Object.assign({}, opts, { body: _db + (opts.footer ? '\\n\\n> ' + opts.footer : ''), footer: '' }); } catch (_) {} // TP_DARKBOX\n" +
  "  try { opts = Object.assign({}, opts, { buttons: require('../utils/buttonStyle').style(opts.buttons, require('./menuTheme').langOn(jid), opts.noButtonStyle) }); } catch (_) {} // TP_BTNSTYLE\n";
s = s.replace(re, NEW);
fs.writeFileSync(p, s);
console.log('visual: patch aplicado');
