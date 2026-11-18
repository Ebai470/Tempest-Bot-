'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const core = require('../../interactive/arcadeCore');
const arcade = require('../../games/arcade');
const INF = fs.readFileSync(path.join(__dirname, '../../games/arcade/inflate.min.js'), 'utf8').replace(/\n/g, '');
const real = arcade.buildHtml('kart');
const M = real.match(/atob\("([^"]+)"\)/);
const TEXT = zlib.inflateRawSync(Buffer.from(M[1], 'base64')).toString('utf8');
const HEAD = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"></head>';
const PRE = '<body style="margin:0;background:#0a0c14"><pre id=o style="color:#5aff9a;font:11px monospace;white-space:pre-wrap;padding:6px;margin:0"></pre>';
const LOG = 'var OO=document.getElementById("o");function LG(t){OO.textContent+=t+"\\n"}window.addEventListener("error",function(e){LG("ERRO: "+e.message)});';
function staged(label, compressed) {
  const data = compressed ? 'var DD="' + M[1] + '";' : 'var TX=' + JSON.stringify(TEXT) + ';';
  const stage2 = compressed
    ? 'var t0=Date.now(),b=atob(DD),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);LG("2 atob ok "+b.length+" bytes "+(Date.now()-t0)+"ms");setTimeout(function(){t0=Date.now();var out=new TextDecoder().decode(inflate(u));LG("3 inflate ok "+out.length+" chars "+(Date.now()-t0)+"ms");setTimeout(function(){inj(out)},60)},60);'
    : 'LG("2 (sem compressao) codigo "+TX.length+" chars");setTimeout(function(){inj(TX)},60);';
  const js = (compressed ? INF : '') + LOG + data + 'LG("DIAG ' + label + ' - 1 script ok");function inj(c){var s=document.createElement("script");s.textContent=c;document.body.appendChild(s);LG("4 jogo injetado (se chegou aqui, o codigo inicial rodou)");setTimeout(function(){LG("5 apos 1.5s: run="+typeof run+" frames="+(typeof frames!=="undefined"?frames:"?")+" canvas="+!!document.getElementById("c"))},1500)}setTimeout(function(){' + stage2 + '},60);';
  return HEAD + PRE + '<script>' + js + '</script></body></html>';
}
function variantH() {
  const t = TEXT.replace('html,body{margin:0;height:100%;', 'html,body{margin:0;').replace('min-height:100vh;display:flex;flex-direction:column;justify-content:space-between;gap:5px', 'display:block');
  return real.replace(M[1], zlib.deflateRawSync(Buffer.from(t, 'utf8'), { level: 9 }).toString('base64'));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = [{ name: 'diag64', aliases: ['diagpainel'], category: 'jogos', description: 'Diagnóstico dos painéis HTML', usage: 'diag64', hideFromMenu: true,
  handler: async (ctx) => {
    const tests = [['E', staged('E', true)], ['F', staged('F', false)], ['G', arcade.buildHtml('superbros')], ['H', variantH()]];
    await ctx.reply('🔧 Enviando 4 painéis (E, F, G, H). Abra cada um e espere uns 3 segundos.');
    for (const t of tests) { await ctx.sock.relayMessage(ctx.jid, core.montarMensagem(t[1], 'diag-' + t[0] + '-' + crypto.randomUUID(), '🔧 DIAG ' + t[0]), {}); await sleep(1500); }
  } }];
