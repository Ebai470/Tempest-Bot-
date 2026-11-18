'use strict';
/** MODOAP — base comum dos painéis HTML (CSS + JS: saldo, aposta, saque por código, copiar). Sem backticks/${ no JS do navegador. */
const CSS = String.raw`
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;padding:10px;background:#07070a;color:#eee;font-family:Arial,Helvetica,sans-serif;font-size:14px}
.app{max-width:480px;margin:auto;background:#0e0e12;border:1px solid #2a2a33;border-radius:16px;overflow:hidden}
.hd{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#14141a;border-bottom:2px solid #f1c40f}
.hd b{color:#f1c40f;letter-spacing:1px}.hd small{color:#8a8a96;display:block;font-size:11px}
.bars{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:6px;padding:8px 10px;background:#101015}
.bars div{background:#17171e;border-radius:10px;padding:6px 8px;font-size:11px;color:#8a8a96}.bars b{display:block;font-size:15px;color:#fff;margin-top:2px}
.g{color:#2ecc71!important}.r{color:#e74c3c!important}.y{color:#f1c40f!important}
.pad{padding:10px}.row{display:flex;gap:6px;align-items:center;margin:6px 0}.row>*{flex:1}
button{border:0;border-radius:10px;padding:11px 8px;font-weight:bold;color:#fff;background:#2a2a35;font-size:14px}
button:active{transform:scale(.97)}button[disabled]{opacity:.4}
.big{width:100%;background:#2ecc71;color:#04210f;font-size:16px;padding:14px}.big.red{background:#e74c3c;color:#fff}.big.gold{background:#f1c40f;color:#251c00}
.chip{padding:7px 4px;font-size:12px;background:#22222c;border-radius:8px}.chip.on{background:#f1c40f;color:#251c00}
input,select{width:100%;background:#17171e;border:1px solid #33333f;border-radius:10px;color:#fff;padding:10px;font-size:15px;text-align:center}
.bx{display:flex;gap:6px}.bx button{flex:0 0 42px}.chips{display:flex;gap:5px;margin-top:5px}.chips button{flex:1}
.card{background:#14141a;border:1px solid #2a2a33;border-radius:12px;padding:10px;margin:8px 0}
.lbl{font-size:11px;color:#8a8a96;margin:4px 0}.msg{text-align:center;min-height:22px;font-weight:bold;margin:6px 0}
.wd{border-top:2px solid #2a2a33;padding:10px;background:#0b0b0f}.wd h3{margin:0 0 6px;font-size:14px;color:#f1c40f}
.code{font-family:monospace;font-size:20px;letter-spacing:2px;text-align:center;background:#000;border:1px dashed #f1c40f;border-radius:10px;padding:12px;margin:6px 0;color:#f1c40f;user-select:all;-webkit-user-select:all;word-break:break-all}
.toast{position:fixed;left:50%;top:14px;transform:translateX(-50%);background:#222;border:1px solid #f1c40f;color:#fff;padding:9px 14px;border-radius:12px;z-index:9;display:none;max-width:90%;text-align:center}
canvas{width:100%;display:block;border-radius:12px;background:#0a0a0e}
.hist{display:flex;gap:5px;overflow:hidden;padding:4px 0}.hist span{padding:3px 8px;border-radius:10px;font-size:12px;font-weight:bold;background:#1b1b24;white-space:nowrap}
.hist .l{color:#4aa8ff}.hist .m{color:#b678ff}.hist .h{color:#ff4fa3}
.grid{display:grid;gap:6px}.grid button{aspect-ratio:1;background:#1a1a22;font-size:20px}
`;
const JS = String.raw`
var $=function(i){return document.getElementById(i)};
function H(str,seed){seed=seed||0;var h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(var i=0,ch;i<str.length;i++){ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return 4294967296*(2097151&h2)+(h1>>>0);}
function pad(s,n){s=String(s);while(s.length<n)s='0'+s;return s}
var P={bal:CFG.deposit,wag:0,won:0,seq:0,codes:[],
 fm:function(n){n=Math.round(n);var s=String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');return (n<0?'-':'')+'$'+s},
 rnd:function(){try{var a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296}catch(e){return Math.random()}},
 int:function(a,b){return a+Math.floor(P.rnd()*(b-a+1))},
 toast:function(m){var t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(P._t);P._t=setTimeout(function(){t.style.display='none'},2600)},
 exp:function(){return Date.now()>CFG.exp},
 upd:function(){$('bal').textContent=P.fm(P.bal);var pl=P.bal-CFG.deposit+P.drawn();var e=$('pl');e.textContent=(pl>=0?'+':'')+P.fm(pl);e.className=pl>=0?'g':'r'},
 drawn:function(){var s=0;for(var i=0;i<P.codes.length;i++)s+=P.codes[i].a;return s},
 bet:function(a){a=Math.floor(a);if(P.exp()){P.toast('Sessão expirada. Saca e abre outro painel.');return false}
  if(!(a>=CFG.min)){P.toast('Aposta mínima '+P.fm(CFG.min));return false}
  if(a>P.bal){P.toast('Saldo do painel insuficiente');return false}
  P.bal-=a;P.wag+=a;P.upd();return true},
 pay:function(a){a=Math.floor(a);if(a>0){P.bal+=a;P.won+=a}P.upd()},
 val:function(id){var v=parseInt($(id).value,10);return isNaN(v)?0:v},
 box:function(id,def){return '<div class="bx"><button onclick="P.adj(\''+id+'\',-1)">−</button><input id="'+id+'" type="number" inputmode="numeric" value="'+def+'"><button onclick="P.adj(\''+id+'\',1)">+</button></div><div class="chips"><button class="chip" onclick="P.set(\''+id+'\',100)">100</button><button class="chip" onclick="P.set(\''+id+'\',500)">500</button><button class="chip" onclick="P.set(\''+id+'\',1000)">1k</button><button class="chip" onclick="P.set(\''+id+'\',5000)">5k</button><button class="chip" onclick="P.mul(\''+id+'\',0.5)">½</button><button class="chip" onclick="P.mul(\''+id+'\',2)">2×</button><button class="chip" onclick="P.set(\''+id+'\',P.bal)">MAX</button></div>'},
 set:function(id,v){$(id).value=Math.max(0,Math.floor(v))},mul:function(id,f){$(id).value=Math.max(CFG.min,Math.floor(P.val(id)*f))},
 adj:function(id,d){var v=P.val(id),s=v>=10000?1000:v>=1000?500:v>=100?100:10;$(id).value=Math.max(CFG.min,v+d*s)},
 mk:function(amount,seq){var b=pad(CFG.sc.toString(36),3)+seq.toString(36)+pad(amount.toString(36),5);var m=H(CFG.key+'|'+CFG.sc+'|'+seq+'|'+amount)%1679616;return (b+pad(m.toString(36),4)).toUpperCase()},
 draw:function(){var a=Math.floor(Number($('wda').value));if(!(a>=CFG.minDraw)){P.toast('Saque mínimo '+P.fm(CFG.minDraw));return}
  if(a>P.bal){P.toast('Saldo do painel insuficiente');return}if(P.seq>=35){P.toast('Máximo de saques desta sessão');return}if(a>60000000){P.toast('Máximo por saque: $60.000.000');return}
  P.bal-=a;var c=P.mk(a,P.seq);P.seq++;P.codes.unshift({c:c,a:a});P.upd();P.showCodes();P.toast('Saque de '+P.fm(a)+' gerado!')},
 showCodes:function(){var h='';for(var i=0;i<P.codes.length;i++){var x=P.codes[i];h+='<div class="card"><div class="lbl">Saque '+P.fm(x.a)+(i===0?' (novo)':'')+'</div><div class="code">'+x.c+'</div><button style="width:100%" onclick="P.copy('+i+')" id="cp'+i+'">📋 Copiar código</button><div class="lbl">No chat envie: <b>resgatarap '+x.c+'</b></div></div>'}$('codes').innerHTML=h},
 copy:function(i){var c=P.codes[i].c,b=$('cp'+i),ok=false;try{var t=document.createElement('textarea');t.value=c;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.focus();t.select();ok=document.execCommand('copy');document.body.removeChild(t)}catch(e){}
  if(!ok&&navigator.clipboard){navigator.clipboard.writeText(c).then(function(){b.textContent='✅ Copiou!'}).catch(function(){b.textContent='Segure o código para copiar'});return}
  b.textContent=ok?'✅ Copiou!':'Segure o código para copiar'},
 wdq:function(f){$('wda').value=Math.floor(P.bal*f)}
};
function boot(){$('who').textContent='👤 '+CFG.name+' · sessão #'+CFG.sid;$('wal').textContent=P.fm(CFG.wallet);P.upd();setInterval(function(){if(P.exp()){$('who').textContent='⌛ Sessão expirada — saca o que tens'}},5000)}
`;
const HTML_TOP = (title) => '<div class="app"><div class="hd"><div><b>TEMPEST BOT</b><small id="who"></small></div><b>' + title + '</b></div>' +
  '<div class="bars"><div>💰 Saldo do painel<b id="bal">0</b></div><div>👛 Carteira (chat)<b id="wal" class="y">0</b></div><div>📈 Lucro<b id="pl">0</b></div></div>';
const HTML_BOTTOM = '<div class="wd"><h3>💸 SAQUE — passar saldo para a carteira</h3><div class="row"><input id="wda" type="number" inputmode="numeric" placeholder="valor do saque (ex: 500)"></div>' +
  '<div class="row"><button class="chip" onclick="P.wdq(0.25)">25%</button><button class="chip" onclick="P.wdq(0.5)">50%</button><button class="chip" onclick="P.wdq(1)">TUDO</button><button class="big gold" style="flex:2" onclick="P.draw()">SACAR</button></div>' +
  '<div class="lbl">O painel gera um código. Copie e envie no chat: <b>resgatarap CÓDIGO</b> (cada código só vale uma vez).</div><div id="codes"></div></div></div><div id="toast" class="toast"></div>';
module.exports = { CSS, JS, HTML_TOP, HTML_BOTTOM };
