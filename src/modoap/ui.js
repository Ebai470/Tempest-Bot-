'use strict';
/** MODOAP — botões nativos (usa o sendNative do bot; se falhar, cai no texto normal). */
function attach(ctx, name, args) {
  let nf; try { nf = require('../interactive/nativeFlow'); } catch (_) { return; }
  const R = (t, id) => nf.btn.reply(t, id), cmd = (c) => 'gm:cmd:' + c, arg = (c, a) => 'gm:arg:' + c + ':' + a;
  const first = String((args || [])[0] || '').split('|')[0].trim();
  const REP = ['apapostar', 'apcaraoucoroa', 'apdados', 'aproleta', 'apparimpar', 'apcorrida', 'apdice', 'applinko'];
  const rule = (t) => {
    t = String(t || '');
    if (/apcashout/.test(t) && /(AVIATOR|ROCKET|multiplicador)/i.test(t) && !/Retirou|Caiu|caiu/.test(t)) return [R('💸 CASHOUT', cmd('apcashout'))];
    if (/apmines retirar/.test(t) && /(MINES|💎|💣)/.test(t)) return [R('💸 Retirar', arg('apmines', 'retirar')), R('🎲 Casa aleatória', arg('apmn', '0'))];
    if (/aptower retirar/.test(t) && /(TOWER|🗼)/.test(t)) return [nf.btn.list('🗼 Escolher casa', [{ title: 'Tower', rows: [1, 2, 3].map(n => ({ header: '', title: 'Casa ' + n, description: 'Subir pela casa ' + n, id: arg('aptw', n) })) }]), R('💸 Retirar', arg('aptower', 'retirar'))];
    if (/foi mutado/.test(t) && /apdesmute/.test(t)) { const m = t.match(/@(\d+)/), p = t.match(/Desmute: (\$[\d.]+)/); if (m) return [R('🔓 Desmutar ' + (p ? p[1] : ''), arg('apdsm', m[1])), R('🎁 Pagar por ele', arg('apdesmute', m[1]))]; }
    if (/apaceitar/.test(t) && /DUELO/.test(t)) return [R('✅ Aceitar', cmd('apaceitar')), R('🚫 Recusar', cmd('aprecusar'))];
    if (/appagardivida/.test(t)) return [R('💸 Pagar dívida', cmd('appagardivida'))];
    if (REP.includes(name) && /(GANHOU|PERDEU|🟢|🔴)/.test(t) && /^\d+$/.test(first)) return [R('🔁 Repetir ' + first, arg(name, first))];
    return null;
  };
  const sendB = (b, o) => nf.sendNative(ctx.sock, ctx.jid, Object.assign({ footer: '© TEMPEST BOT • MODOAP', quoted: ctx.msg }, o, { buttons: b }));
  const oReply = ctx.reply.bind(ctx), oSend = ctx.send.bind(ctx);
  ctx.reply = async function (text, opts) { try { const b = typeof text === 'string' && rule(text); if (b) return await sendB(b, { body: text, fallback: text, mentions: (opts && opts.mentions) || [] }); } catch (e) { console.error('[MODOAP ui]', e && e.message); } return oReply(text, opts); };
  ctx.send = async function (content, opts) { try { if (content && content.image && content.caption) { const b = rule(content.caption); if (b) return await sendB(b, { image: content.image, body: content.caption, fallback: content.caption, mentions: content.mentions || [] }); } } catch (e) { console.error('[MODOAP ui]', e && e.message); } return oSend(content, opts); };
}
module.exports = { attach };

// MODOAP_V5
