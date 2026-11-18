const fs = require('fs');
let ok = true;

let p = 'src/services/verifiedMode.js', s = fs.readFileSync(p, 'utf8');
if (s.includes('function channelContext')) {
  console.log('verifiedMode: ja tinha channelContext');
} else if (!s.includes('function decorate(')) {
  console.log('ERRO: function decorate( nao encontrada em verifiedMode.js'); ok = false;
} else {
  s = s.replace('function decorate(', `function channelContext() {
  if (!isOn()) return null;
  const ch = getChannel();
  if (channelProblem(ch)) return null;
  return {
    isForwarded: true,
    forwardingScore: 1,
    forwardedNewsletterMessageInfo: { newsletterJid: ch.jid, newsletterName: ch.name, serverMessageId: -1 }
  };
}

function decorate(`);
  s = s.replace(/module\.exports = \{\s*/, 'module.exports = { channelContext, ');
  fs.writeFileSync(p, s);
  console.log('verifiedMode: patch aplicado');
}

p = 'src/interactive/nativeFlow.js'; s = fs.readFileSync(p, 'utf8');
if (s.includes('TP_FORMATTER')) {
  console.log('nativeFlow: ja aplicado');
} else {
  const a = "  try { opts = await require('./idioma').translateUi(jid, opts); } catch (_) {} // TP_I18N\n";
  const b = "      contextInfo: (opts.mentions && opts.mentions.length) ? { mentionedJid: opts.mentions } : undefined\n";
  if (!s.includes(a) || !s.includes(b) || !s.includes('async function sendNative(')) {
    console.log('ERRO: ancoras do nativeFlow nao encontradas'); ok = false;
  } else {
    s = s.replace(a, a + `  // TP_FORMATTER
  try {
    const _fmt = require('../utils/formatter');
    if (_fmt.enabled() && !opts.noFormat && typeof opts.body === 'string') {
      const _nb = _fmt.formatText(opts.body, { footer: false });
      if (_nb) opts = Object.assign({}, opts, { body: _nb });
    }
  } catch (_) {}
`);
    s = s.replace(b, "      contextInfo: _tpCtx(opts)\n");
    s = s.replace('async function sendNative(', `function _tpCtx(opts) {
  let ci = (opts.mentions && opts.mentions.length) ? { mentionedJid: opts.mentions } : undefined;
  try {
    const v = require('../services/verifiedMode').channelContext();
    if (v && !opts.noVerified) ci = Object.assign({}, ci || {}, v);
  } catch (_) {}
  return ci;
}

async function sendNative(`);
    fs.writeFileSync(p, s);
    console.log('nativeFlow: patch aplicado');
  }
}
console.log(ok ? 'TUDO_OK' : 'FALHOU');
process.exit(ok ? 0 : 1);
