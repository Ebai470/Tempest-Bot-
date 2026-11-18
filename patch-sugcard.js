const fs = require('fs');
const p = 'src/interactive/suggest.js';
let s = fs.readFileSync(p, 'utf8');
if (s.indexOf('sugCard') >= 0) { console.log('sugcard: ja aplicado'); process.exit(0); }

const a = s.indexOf('async function sendSuggestion(');
const b = s.indexOf('function pseudo(');
const rk = 'seen[id] = true; res.push(o.c);';
const c1 = "return sendSuggestion(ctx, 'cmd', pref + typed + (rest ? ' ' + rest : ''), texts, shows);";
const r1 = 'if (sc >= min) out.push({ c: c, sc: sc });';
const r2 = 'if (!out.length) return [];';
const r3 = 'if (o.sc < top - 15) break;';
const r4 = 'for (const e of registry.getAll()) {';
const c2 = "return await sendSuggestion(ctx, 'menu', pref + 'menu ' + a, best.map((b) => 'menu ' + b.show), best.map((b) => pref + 'menu ' + b.show));";
if (a < 0 || b < 0 || b < a || s.indexOf(rk) < 0 || s.indexOf(c1) < 0 || s.indexOf(c2) < 0 || s.indexOf(r1) < 0 || s.indexOf(r2) < 0 || s.indexOf(r3) < 0 || s.indexOf(r4) < 0) {
  console.log('ERRO: ancoras do suggest.js nao encontradas'); process.exit(1);
}

const NEWFN =
  'async function sendSuggestion(ctx, kind, typedShown, texts, shows, scores) { // TP_SUGCARD\n' +
  "  return require('./sugCard').send(ctx, { kind: kind, typedShown: typedShown, texts: texts, shows: shows, scores: scores, store: store, btn: btn, sendNative: sendNative, quotedCard: quotedCard, config: config, numOf: numOf });\n" +
  '}\n\n';

s = s.slice(0, a) + NEWFN + s.slice(b);
s = s.replace(rk, 'seen[id] = true; res.push(Object.assign({}, o.c, { sc: o.sc }));');
s = s.replace(c1, "return sendSuggestion(ctx, 'cmd', pref + typed + (rest ? ' ' + rest : ''), texts, shows, best.map((b) => b.sc));");
s = s.replace(c2, "return await sendSuggestion(ctx, 'menu', pref + 'menu ' + a, best.map((b) => 'menu ' + b.show), best.map((b) => pref + 'menu ' + b.show), best.map((b) => b.sc));");
s = s.replace(r1, 'if (sc >= min - 25) out.push({ c: c, sc: sc });');
s = s.replace(r2, 'if (!out.length || out[0].sc < min) return [];');
s = s.replace(r3, 'if (o.sc < top - 25) break;');
s = s.replace(r4, r4 + "\n    if (/hentai|nsfw|porn|[+]18/i.test(String(e.name || '') + ' ' + String(e.category || '') + ' ' + (e.aliases || []).join(' '))) continue;");
fs.writeFileSync(p, s);
console.log('sugcard: patch aplicado');
