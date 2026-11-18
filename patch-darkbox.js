const fs = require('fs');
const p = 'src/interactive/nativeFlow.js';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('TP_DARKBOX')) { console.log('darkbox: ja aplicado'); process.exit(0); }
const a = "  try { opts = await require('./idioma').translateUi(jid, opts); } catch (_) {} // TP_I18N\n";
if (s.split(a).length !== 2) { console.log('ERRO: ancora do translateUi nao encontrada (ou repetida)'); process.exit(1); }
s = s.replace(a, a + "  try { const _db = require('../utils/darkBox').convert(opts.body); if (_db) opts = Object.assign({}, opts, { body: _db }); } catch (_) {} // TP_DARKBOX\n");
fs.writeFileSync(p, s);
console.log('darkbox: patch aplicado');
