'use strict';
/** MODOAP — 10 jogos de painel (HTML/JS). Cada jogo: {title, html, js}. */
const G = {};
const MSG = '<div class="msg" id="msg"></div>';
const setMsg = 'function msg(t,c){var m=$("msg");m.textContent=t;m.className="msg "+(c||"")}';

// 1) AVIATOR 2 — estilo Premier Bet (2 apostas, histórico, curva, retirar)
G.aviator2 = { title: 'AVIATOR 2', html: '<div class="pad"><div class="hist" id="hist"></div><div style="position:relative"><canvas id="c" width="340" height="200"></canvas><div id="mx" style="position:absolute;left:0;right:0;top:70px;text-align:center;font-size:44px;font-weight:bold">1.00x</div><div id="st" style="position:absolute;left:0;right:0;top:128px;text-align:center;color:#8a8a96">...</div></div>' +
  '<div id="slots"></div><div class="lbl">Minhas apostas</div><div id="log" class="lbl"></div></div>', js: String.raw`
var S=[{bet:0,q:0,done:0},{bet:0,q:0,done:0}],ph='wait',t0=Date.now(),crash=2,mm=1,hs=[],cnt=6,log=[];
function gen(){var r=P.rnd();if(r<0.03)return 1;return Math.min(1000,Math.max(1.01,Math.floor(97/(1-r))/100))}
function cls(x){return x<2?'l':x<10?'m':'h'}
function hr(){var h='';for(var i=0;i<hs.length&&i<14;i++)h+='<span class="'+cls(hs[i])+'">'+hs[i].toFixed(2)+'x</span>';$('hist').innerHTML=h}
var sl='';for(var i=0;i<2;i++)sl+='<div class="card"><div class="lbl">Aposta '+(i+1)+'</div>'+P.box('a'+i,i?1000:500)+'<div class="row"><div class="lbl" style="flex:0 0 auto">Retirar auto ×</div><input id="au'+i+'" type="number" step="0.1" placeholder="ex 2.00"></div><button class="big" id="bt'+i+'" onclick="act('+i+')">APOSTAR</button></div>';
$('slots').innerHTML=sl;
for(var i=0;i<14;i++)hs.push(gen());hr();
function lab(){for(var i=0;i<2;i++){var s=S[i],b=$('bt'+i);if(s.bet&&ph==='fly'&&!s.done){b.className='big gold';b.textContent='RETIRAR '+P.fm(s.bet*mm)}else if(s.bet&&ph==='wait'){b.className='big red';b.textContent='CANCELAR '+P.fm(s.bet)}else if(s.q){b.className='big red';b.textContent='CANCELAR (próxima)'}else{b.className='big';b.textContent=ph==='fly'?'APOSTAR (próxima rodada)':'APOSTAR'}}}
function act(i){var s=S[i];if(s.bet&&ph==='fly'&&!s.done){cash(i,mm)}else if(s.bet&&ph==='wait'){P.pay(s.bet);P.won-=s.bet;P.wag-=s.bet;s.bet=0}else if(s.q){P.pay(s.q);P.won-=s.q;P.wag-=s.q;s.q=0}else{var a=P.val('a'+i);if(!P.bet(a))return;if(ph==='wait')s.bet=a;else s.q=a}lab()}
function cash(i,m){var s=S[i];if(!s.bet||s.done)return;s.done=1;var g=Math.floor(s.bet*m);P.pay(g);log.unshift('✅ '+m.toFixed(2)+'x  +'+P.fm(g-s.bet));lg();P.toast('Retirou '+m.toFixed(2)+'x  +'+P.fm(g-s.bet))}
function lg(){$('log').innerHTML=log.slice(0,6).join('<br>')}
function ctx2(){return $('c').getContext('2d')}
function draw(t,m,dead){var c=ctx2(),w=340,h=200;c.clearRect(0,0,w,h);c.strokeStyle='#1d1d26';for(var i=1;i<5;i++){c.beginPath();c.moveTo(0,h*i/5);c.lineTo(w,h*i/5);c.stroke()}
 var mt=Math.max(8,t),mmx=Math.max(2,m);function X(tt){return 14+(w-40)*tt/mt}function Y(v){return h-14-(h-40)*(v-1)/(mmx-1)}
 c.beginPath();c.moveTo(X(0),h-14);for(var k=0;k<=60;k++){var tt=t*k/60;c.lineTo(X(tt),Y(Math.exp(0.07*tt)))}
 c.strokeStyle=dead?'#555':'#e0245e';c.lineWidth=3;c.stroke();c.lineTo(X(t),h-14);c.closePath();c.fillStyle=dead?'rgba(90,90,90,.2)':'rgba(224,36,94,.25)';c.fill();
 c.font='26px serif';c.fillText(dead?'💥':'✈️',Math.min(w-30,X(t)-6),Math.max(24,Y(m)-4))}
function loop(){var now=Date.now();
 if(ph==='wait'){var left=cnt-(now-t0)/1000;$('st').textContent='Próxima rodada em '+Math.max(0,left).toFixed(1)+'s';$('mx').textContent='…';$('mx').style.color='#8a8a96';draw(0.01,1,false);
  if(left<=0){ph='fly';t0=now;crash=gen();for(var i=0;i<2;i++){S[i].done=0;if(S[i].q){S[i].bet=S[i].q;S[i].q=0}}$('st').textContent='';lab()}}
 else if(ph==='fly'){var t=(now-t0)/1000;mm=Math.floor(Math.exp(0.07*t)*100)/100;
  for(var i=0;i<2;i++){var au=parseFloat($('au'+i).value);if(S[i].bet&&!S[i].done&&au>1&&mm>=au)cash(i,au)}
  if(mm>=crash){mm=crash;ph='crash';t0=now;hs.unshift(crash);hr();for(var i=0;i<2;i++){if(S[i].bet&&!S[i].done){log.unshift('❌ caiu '+crash.toFixed(2)+'x  -'+P.fm(S[i].bet));lg()}}$('mx').style.color='#e74c3c';$('mx').textContent=crash.toFixed(2)+'x';$('st').textContent='VOOU LONGE!';draw(t,crash,true);lab()}
  else{$('mx').style.color=mm>=10?'#ff4fa3':mm>=2?'#b678ff':'#fff';$('mx').textContent=mm.toFixed(2)+'x';draw(t,mm,false);lab()}}
 else if(now-t0>2500){ph='wait';t0=now;for(var i=0;i<2;i++){S[i].bet=0;S[i].done=0}lab()}}
setInterval(loop,50);lab();`};

// 2) MINES 2
G.mines2 = { title: 'MINES 2', html: '<div class="pad"><div id="bx"></div><div class="lbl">Número de minas</div><div class="row" id="mc"></div><button class="big" id="go" onclick="start()">COMEÇAR</button><div class="msg" id="msg"></div><div class="grid" id="gr" style="grid-template-columns:repeat(5,1fr)"></div><div class="row"><div class="lbl" id="nx"></div></div><button class="big gold" id="co" onclick="cashout()" disabled>RETIRAR</button></div>', js: String.raw`
` + setMsg + String.raw`
$('bx').innerHTML=P.box('b',500);var mc=3,on=0,mines=[],op=[],bet=0;
var h='';[1,3,5,10,15].forEach(function(n){h+='<button class="chip'+(n===3?' on':'')+'" onclick="pick('+n+')" id="m'+n+'">'+n+'</button>'});$('mc').innerHTML=h;
function pick(n){if(on)return;mc=n;[1,3,5,10,15].forEach(function(k){$('m'+k).className='chip'+(k===n?' on':'')})}
function mult(k){var x=1;for(var i=0;i<k;i++)x*=(25-i)/(25-mc-i);return Math.floor(x*97)/100}
function grid(rev){var g='';for(var i=0;i<25;i++){var o=op.indexOf(i)>=0,m=mines.indexOf(i)>=0;g+='<button onclick="tap('+i+')" style="'+(o?'background:#14502d':rev&&m?'background:#6e1a1a':'')+'">'+(o?'💎':rev&&m?'💣':'')+'</button>'}$('gr').innerHTML=g}
function start(){if(on)return;var a=P.val('b');if(!P.bet(a))return;bet=a;on=1;op=[];mines=[];while(mines.length<mc){var r=P.int(0,24);if(mines.indexOf(r)<0)mines.push(r)}$('go').disabled=true;$('co').disabled=true;grid();msg('Escolhe uma casa','');info()}
function info(){$('nx').textContent='Próximo: '+mult(op.length+1).toFixed(2)+'x · Atual: '+mult(op.length).toFixed(2)+'x';$('co').textContent='RETIRAR '+P.fm(bet*mult(op.length));$('co').disabled=!op.length}
function tap(i){if(!on||op.indexOf(i)>=0)return;if(mines.indexOf(i)>=0){on=0;grid(true);msg('💥 BOOM! Perdeste '+P.fm(bet),'r');$('go').disabled=false;$('co').disabled=true;return}op.push(i);grid();if(op.length>=25-mc){cashout();return}info()}
function cashout(){if(!on||!op.length)return;var g=Math.floor(bet*mult(op.length));P.pay(g);on=0;grid(true);msg('✅ Retirou '+mult(op.length).toFixed(2)+'x  +'+P.fm(g-bet),'g');$('go').disabled=false;$('co').disabled=true}
grid();info();`};

// 3) PLINKO 2
G.plinko2 = { title: 'PLINKO 2', html: '<div class="pad"><canvas id="c" width="340" height="300"></canvas><div class="row" id="rk"></div><div id="bx"></div><button class="big" onclick="drop()">LANÇAR BOLA</button>' + MSG + '</div>', js: String.raw`
` + setMsg + String.raw`
$('bx').innerHTML=P.box('b',500);
var TB={baixo:[5.6,2,1.4,1.1,1,0.5],medio:[14,3.8,1.7,1.1,0.8,0.5],alto:[35,8,2.8,1.1,0.4,0.2]},rk='medio',balls=[],R=10;
var h='';['baixo','medio','alto'].forEach(function(k){h+='<button class="chip'+(k===rk?' on':'')+'" id="r'+k+'" onclick="setr(\''+k+'\')">'+k.toUpperCase()+'</button>'});$('rk').innerHTML=h;
function setr(k){rk=k;['baixo','medio','alto'].forEach(function(x){$('r'+x).className='chip'+(x===k?' on':'')});draw()}
function mt(){var a=TB[rk],o=[];for(var i=0;i<=R;i++){var d=Math.abs(i-5);o.push(a[5-d])}return o}
function drop(){var a=P.val('b');if(!P.bet(a))return;var p=[],s=0;for(var i=0;i<R;i++){var d=P.rnd()<0.5?0:1;p.push(d);s+=d}balls.push({p:p,s:s,t:0,a:a,rk:rk})}
function draw(){var c=$('c').getContext('2d'),w=340,h=300,dx=28,dy=21,bx=w/2,by=22;c.clearRect(0,0,w,h);c.fillStyle='#777';
 for(var r=1;r<=R;r++)for(var k=0;k<=r;k++){c.beginPath();c.arc(bx+(k-r/2)*dx,by+r*dy,2.5,0,7);c.fill()}
 var m=mt();for(var k=0;k<=R;k++){var x=bx+(k-R/2)*dx,v=m[k];c.fillStyle=v>=10?'#f1c40f':v>=2?'#2ecc71':v>=1?'#3a9d5d':'#c0392b';c.fillRect(x-12,by+(R+1)*dy-4,24,18);c.fillStyle='#000';c.font='bold 9px Arial';c.textAlign='center';c.fillText(v,x,by+(R+1)*dy+9)}
 for(var i=balls.length-1;i>=0;i--){var b=balls[i];b.t+=0.16;var rr=Math.min(R,b.t),f=Math.floor(rr),pos=0;for(var q=0;q<f;q++)pos+=b.p[q];var nx=pos+(f<R?b.p[f]*(rr-f):0);var x=bx+(nx-(rr)/2)*dx,y=by+rr*dy-8;c.fillStyle='#fff';c.beginPath();c.arc(x,y,6,0,7);c.fill();
  if(b.t>=R+0.6){var mu=TB[b.rk][5-Math.abs(b.s-5)],g=Math.floor(b.a*mu);P.pay(g);msg(mu+'x → '+(g>=b.a?'+':'')+P.fm(g-b.a),g>=b.a?'g':'r');balls.splice(i,1)}}}
setInterval(draw,40);draw();`};

// 4) DICE 2
G.dice2 = { title: 'DICE 2', html: '<div class="pad"><div id="rl" style="text-align:center;font-size:56px;font-weight:bold;margin:8px">00.00</div><div class="card"><div class="row"><button class="chip on" id="mu" onclick="mode(0)">ABAIXO</button><button class="chip" id="mo" onclick="mode(1)">ACIMA</button></div><input id="sl" type="range" min="5" max="95" value="50" oninput="upd2()" style="padding:0"><div class="row"><div class="lbl" id="inf"></div></div></div><div id="bx"></div><button class="big" onclick="roll()">LANÇAR</button>' + MSG + '</div>', js: String.raw`
` + setMsg + String.raw`
$('bx').innerHTML=P.box('b',500);var md=0;
function ch(){var t=parseInt($('sl').value,10);return md?100-t:t}
function mu2(){return Math.floor(97/ch()*10000)/10000}
function upd2(){$('inf').textContent=(md?'Sai acima de ':'Sai abaixo de ')+$('sl').value+'  ·  chance '+ch()+'%  ·  paga '+mu2().toFixed(2)+'x'}
function mode(m){md=m;$('mu').className='chip'+(m?'':' on');$('mo').className='chip'+(m?' on':'');upd2()}
function roll(){var a=P.val('b');if(!P.bet(a))return;var t=parseInt($('sl').value,10),v=P.int(0,9999)/100,n=0,e=$('rl');var iv=setInterval(function(){e.textContent=(P.int(0,9999)/100).toFixed(2);e.style.color='#fff';if(++n>12){clearInterval(iv);e.textContent=v.toFixed(2);var w=md?v>t:v<t;e.style.color=w?'#2ecc71':'#e74c3c';if(w){var g=Math.floor(a*mu2());P.pay(g);msg('GANHOU +'+P.fm(g-a),'g')}else msg('Perdeu -'+P.fm(a),'r')}},60)}
upd2();`};

// 5) MOEDA 2 (sequência)
G.moeda2 = { title: 'MOEDA 2', html: '<div class="pad"><div id="co" style="font-size:90px;text-align:center;margin:6px">🪙</div><div id="bx"></div><div class="row"><button class="chip on" id="pc" onclick="pk(0)">CARA</button><button class="chip" id="pk" onclick="pk(1)">COROA</button></div><button class="big" id="go" onclick="flip()">LANÇAR</button><button class="big gold" id="cs" onclick="cash()" disabled>RETIRAR</button>' + MSG + '</div>', js: String.raw`
` + setMsg + String.raw`
$('bx').innerHTML=P.box('b',500);var side=0,on=0,bet=0,st=0,busy=0;
function pk(s){side=s;$('pc').className='chip'+(s?'':' on');$('pk').className='chip'+(s?' on':'')}
function mm(){return Math.floor(Math.pow(1.94,st)*100)/100}
function flip(){if(busy)return;if(!on){var a=P.val('b');if(!P.bet(a))return;bet=a;on=1;st=0}busy=1;var n=0,e=$('co');var iv=setInterval(function(){e.textContent=n%2?'🪙':'⚪';if(++n>8){clearInterval(iv);busy=0;var win=P.rnd()<0.5,res=win?side:1-side;e.textContent=res?'👑':'🙂';
  if(win){st++;msg('Acertou! '+mm().toFixed(2)+'x — retira ou continua','g');$('cs').disabled=false;$('cs').textContent='RETIRAR '+P.fm(bet*mm())}else{on=0;st=0;msg('Errou! -'+P.fm(bet),'r');$('cs').disabled=true;$('cs').textContent='RETIRAR'}}},90)}
function cash(){if(!on||busy||!st)return;var g=Math.floor(bet*mm());P.pay(g);msg('✅ Retirou '+mm().toFixed(2)+'x  +'+P.fm(g-bet),'g');on=0;st=0;$('cs').disabled=true;$('cs').textContent='RETIRAR'}`};

// 6) SLOTS 2
G.slots2 = { title: 'SLOTS 2', html: '<div class="pad"><div class="card" style="text-align:center;font-size:58px;letter-spacing:10px" id="rl">🍒🍒🍒</div><div id="bx"></div><button class="big" onclick="spin()">GIRAR</button>' + MSG + '<div class="lbl">3 iguais: 🍒5x 🍋8x 🔔15x ⭐30x 💎80x 7️⃣200x · 2🍒 1.5x · par de outro 0.5x</div></div>', js: String.raw`
` + setMsg + String.raw`
$('bx').innerHTML=P.box('b',500);var SY=['🍒','🍋','🔔','⭐','💎','7️⃣'],W=[0.30,0.25,0.20,0.13,0.08,0.04],PAY=[5,8,15,30,80,200],busy=0;
function one(){var r=P.rnd(),a=0;for(var i=0;i<6;i++){a+=W[i];if(r<a)return i}return 0}
function spin(){if(busy)return;var a=P.val('b');if(!P.bet(a))return;busy=1;var f=[one(),one(),one()],n=0;var iv=setInterval(function(){$('rl').textContent=SY[P.int(0,5)]+SY[P.int(0,5)]+SY[P.int(0,5)];if(++n>12){clearInterval(iv);busy=0;$('rl').textContent=SY[f[0]]+SY[f[1]]+SY[f[2]];var m=0;
 if(f[0]===f[1]&&f[1]===f[2])m=PAY[f[0]];else{var c=[0,0,0,0,0,0];f.forEach(function(x){c[x]++});if(c[0]===2)m=1.5;else for(var i=1;i<6;i++)if(c[i]===2)m=0.5}
 var g=Math.floor(a*m);if(g)P.pay(g);msg(m?(m+'x  '+(g>=a?'+':'')+P.fm(g-a)):'Perdeu -'+P.fm(a),g>a?'g':g==a?'y':'r')}},70)}`};

// 7) ROLETA 2
G.roleta2 = { title: 'ROLETA 2', html: '<div class="pad"><canvas id="c" width="340" height="220"></canvas><div id="bx"></div><div class="row" id="ch"></div><div class="row"><input id="nn" type="number" min="0" max="36" placeholder="ou número 0-36 (paga 36x)"></div><button class="big" onclick="spin()">GIRAR</button>' + MSG + '</div>', js: String.raw`
` + setMsg + String.raw`
$('bx').innerHTML=P.box('b',500);var RD=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],ORD=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
var sel='red',busy=0,ang=0,last=null;var OP=[['red','🔴 2x'],['black','⚫ 2x'],['even','PAR 2x'],['odd','ÍMPAR 2x'],['low','1-18 2x'],['high','19-36 2x'],['green','🟢 0 36x']];
function bt(){var h='';OP.forEach(function(o){h+='<button class="chip'+(o[0]===sel?' on':'')+'" onclick="sel=\''+o[0]+'\';$(\'nn\').value=\'\';bt()">'+o[1]+'</button>'});$('ch').innerHTML=h;$('ch').style.flexWrap='wrap'}
function col(n){return n===0?'#1e8e4a':RD.indexOf(n)>=0?'#c0392b':'#222'}
function wheel(a){var c=$('c').getContext('2d'),cx=110,cy=110;c.clearRect(0,0,340,220);var N=37,s=Math.PI*2/N;for(var i=0;i<N;i++){c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,100,a+i*s,a+(i+1)*s);c.fillStyle=col(ORD[i]);c.fill();c.strokeStyle='#000';c.stroke();c.save();c.translate(cx,cy);c.rotate(a+(i+.5)*s);c.fillStyle='#fff';c.font='9px Arial';c.fillText(ORD[i],70,3);c.restore()}
 c.beginPath();c.arc(cx,cy,30,0,7);c.fillStyle='#0e0e12';c.fill();c.fillStyle='#f1c40f';c.beginPath();c.moveTo(cx+104,cy);c.lineTo(cx+120,cy-8);c.lineTo(cx+120,cy+8);c.fill();
 c.fillStyle='#fff';c.font='bold 44px Arial';c.textAlign='center';c.fillText(last===null?'?':last,262,130)}
function spin(){if(busy)return;var a=P.val('b');if(!P.bet(a))return;busy=1;var nv=$('nn').value,pn=nv===''?-1:parseInt(nv,10);if(pn>36)pn=36;var r=P.int(0,36),idx=ORD.indexOf(r),s=Math.PI*2/37,tgt=-(idx+.5)*s+Math.PI*2*5,st=ang,n=0;
 var iv=setInterval(function(){n++;var k=Math.min(1,n/70),e=1-Math.pow(1-k,3);ang=st+(tgt-st)*e;wheel(ang);if(k>=1){clearInterval(iv);busy=0;last=r;wheel(ang);ang=tgt%(Math.PI*2);var m=0;
  if(pn>=0)m=(pn===r)?36:0;else if(sel==='red')m=RD.indexOf(r)>=0?2:0;else if(sel==='black')m=(r>0&&RD.indexOf(r)<0)?2:0;else if(sel==='even')m=(r>0&&r%2===0)?2:0;else if(sel==='odd')m=r%2===1?2:0;else if(sel==='low')m=(r>=1&&r<=18)?2:0;else if(sel==='high')m=r>=19?2:0;else if(sel==='green')m=r===0?36:0;
  var g=a*m;if(g)P.pay(g);msg('Saiu '+r+(m?'  +'+P.fm(g-a):'  -'+P.fm(a)),m?'g':'r')}},35)}
bt();wheel(0);`};

// 8) TOWER 2
G.tower2 = { title: 'TOWER 2', html: '<div class="pad"><div id="bx"></div><div class="row" id="df"></div><button class="big" id="go" onclick="start()">COMEÇAR</button><div id="tw"></div><button class="big gold" id="co" onclick="cash()" disabled>RETIRAR</button>' + MSG + '</div>', js: String.raw`
` + setMsg + String.raw`
$('bx').innerHTML=P.box('b',500);var L=8,cols=3,on=0,lv=0,traps=[],bet=0,DF=[['Fácil',4],['Normal',3],['Difícil',2]];
function dfb(){var h='';DF.forEach(function(d){h+='<button class="chip'+(d[1]===cols?' on':'')+'" onclick="if(!on){cols='+d[1]+';dfb()}">'+d[0]+'</button>'});$('df').innerHTML=h}
function mm(n){return Math.floor(Math.pow(cols/(cols-1),n)*97)/100}
function tw(rev){var h='';for(var r=L-1;r>=0;r--){h+='<div class="row">';for(var c=0;c<cols;c++){var st=on&&r===lv?'':'opacity:.55';var tx='',bg='#1a1a22';if(r<lv){if(traps[r]===c)tx='☠️';else{tx='✔';bg='#14502d'}}else if(rev&&traps[r]===c){tx='☠️';bg='#6e1a1a'}h+='<button style="'+st+';background:'+bg+'" onclick="tap('+r+','+c+')">'+(tx||(r===lv&&on?'?':''))+'</button>'}h+='</div>'}$('tw').innerHTML=h}
function start(){if(on)return;var a=P.val('b');if(!P.bet(a))return;bet=a;on=1;lv=0;traps=[];for(var i=0;i<L;i++)traps.push(P.int(0,cols-1));$('go').disabled=true;$('co').disabled=true;msg('Nível 1: escolhe uma casa','');tw()}
function tap(r,c){if(!on||r!==lv)return;if(traps[r]===c){on=0;tw(true);msg('☠️ Armadilha! -'+P.fm(bet),'r');$('go').disabled=false;$('co').disabled=true;$('co').textContent='RETIRAR';return}
 lv++;if(lv>=L){cash();return}tw();$('co').disabled=false;$('co').textContent='RETIRAR '+P.fm(bet*mm(lv));msg('Nível '+(lv+1)+' · '+mm(lv).toFixed(2)+'x','g')}
function cash(){if(!on||!lv)return;var g=Math.floor(bet*mm(lv));P.pay(g);on=0;tw(true);msg('✅ Retirou '+mm(lv).toFixed(2)+'x  +'+P.fm(g-bet),'g');$('go').disabled=false;$('co').disabled=true;$('co').textContent='RETIRAR'}
dfb();tw();`};

// 9) HILO 2
G.hilo2 = { title: 'HI-LO 2', html: '<div class="pad"><div id="cd" style="font-size:80px;text-align:center;margin:6px;font-weight:bold">🂠</div><div id="bx"></div><button class="big" id="go" onclick="start()">COMEÇAR</button><div class="row"><button class="big" id="hi" onclick="guess(1)" disabled>MAIOR</button><button class="big red" id="lo" onclick="guess(0)" disabled>MENOR</button></div><button class="big gold" id="co" onclick="cash()" disabled>RETIRAR</button>' + MSG + '</div>', js: String.raw`
` + setMsg + String.raw`
$('bx').innerHTML=P.box('b',500);var on=0,cur=7,mu=1,bet=0,SU=['♠','♥','♦','♣'],RN=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function show(r){var s=SU[P.int(0,3)];$('cd').innerHTML='<span style="color:'+(s==='♥'||s==='♦'?'#e74c3c':'#fff')+'">'+RN[r-1]+s+'</span>'}
function pr(){var h=(13-cur)/13,l=(cur-1)/13;return[h,l]}
function lbl(){var p=pr();$('hi').textContent=p[0]>0?'MAIOR '+(Math.floor(97/(p[0]*100)*100)/100)+'x':'—';$('lo').textContent=p[1]>0?'MENOR '+(Math.floor(97/(p[1]*100)*100)/100)+'x':'—';$('hi').disabled=!on||p[0]<=0;$('lo').disabled=!on||p[1]<=0;$('co').disabled=!on||mu<=1;$('co').textContent='RETIRAR '+P.fm(bet*mu)}
function start(){if(on)return;var a=P.val('b');if(!P.bet(a))return;bet=a;on=1;mu=1;cur=P.int(1,13);show(cur);$('go').disabled=true;msg('Maior ou menor?','');lbl()}
function guess(h){if(!on)return;var p=pr(),pp=h?p[0]:p[1];var nx=P.int(1,13);var win=h?nx>cur:nx<cur;show(nx);
 if(win){mu=Math.floor(mu*(0.97/pp)*100)/100;cur=nx;msg('Acertou! '+mu.toFixed(2)+'x','g');lbl()}else{on=0;msg('Errou! -'+P.fm(bet),'r');$('go').disabled=false;lbl()}}
function cash(){if(!on||mu<=1)return;var g=Math.floor(bet*mu);P.pay(g);on=0;msg('✅ Retirou '+mu.toFixed(2)+'x  +'+P.fm(g-bet),'g');$('go').disabled=false;lbl()}`};

// 10) BLACKJACK 2
G.blackjack2 = { title: 'BLACKJACK 2', html: '<div class="pad"><div class="card"><div class="lbl">Banca <span id="dt"></span></div><div id="dh" style="font-size:30px;min-height:40px"></div></div><div class="card"><div class="lbl">Tu <span id="pt"></span></div><div id="ph" style="font-size:30px;min-height:40px"></div></div><div id="bx"></div><button class="big" id="go" onclick="deal()">DISTRIBUIR</button><div class="row"><button class="big" id="hit" onclick="hit()" disabled>PEDIR</button><button class="big gold" id="sd" onclick="stand()" disabled>PARAR</button><button class="big red" id="dd" onclick="dbl()" disabled>DOBRAR</button></div>' + MSG + '</div>', js: String.raw`
` + setMsg + String.raw`
$('bx').innerHTML=P.box('b',500);var on=0,ph=[],dh=[],bet=0,SU=['♠','♥','♦','♣'],RN=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
function cd(){return{r:P.int(1,13),s:SU[P.int(0,3)]}}
function val(h){var t=0,a=0;h.forEach(function(c){t+=c.r>10?10:c.r===1?11:c.r;if(c.r===1)a++});while(t>21&&a>0){t-=10;a--}return t}
function hs(h,hide){return h.map(function(c,i){if(hide&&i===1)return '🂠';return '<span style="color:'+(c.s==='♥'||c.s==='♦'?'#e74c3c':'#fff')+'">'+RN[c.r-1]+c.s+'</span>'}).join(' ')}
function rd(hide){$('ph').innerHTML=hs(ph);$('dh').innerHTML=hs(dh,hide);$('pt').textContent='('+val(ph)+')';$('dt').textContent=hide?'':'('+val(dh)+')'}
function bt(a){$('hit').disabled=!a;$('sd').disabled=!a;$('dd').disabled=!a||ph.length!==2;$('go').disabled=!!a}
function deal(){if(on)return;var a=P.val('b');if(!P.bet(a))return;bet=a;on=1;ph=[cd(),cd()];dh=[cd(),cd()];rd(true);msg('','');if(val(ph)===21){fin()}else bt(1)}
function hit(){if(!on)return;ph.push(cd());rd(true);if(val(ph)>21)fin();else{bt(1);$('dd').disabled=true}}
function stand(){if(on)fin()}
function dbl(){if(!on||ph.length!==2)return;if(!P.bet(bet)){return}bet*=2;ph.push(cd());fin()}
function fin(){on=0;bt(0);if(val(ph)<=21){while(val(dh)<17)dh.push(cd())}rd(false);var p=val(ph),d=val(dh),bj=ph.length===2&&p===21,m=0,t;
 if(p>21){t='Estourou! -'+P.fm(bet)}else if(bj&&!(dh.length===2&&d===21)){m=2.5;t='BLACKJACK!'}else if(d>21||p>d){m=2;t='Ganhaste!'}else if(p===d){m=1;t='Empate (devolvido)'}else t='Banca ganhou -'+P.fm(bet);
 if(m)P.pay(bet*m);msg(t+(m>1?'  +'+P.fm(bet*m-bet):''),m>1?'g':m===1?'y':'r')}`};

module.exports = G;
