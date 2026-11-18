'use strict';
/** JOGOS X (parte 2): Forca, Genius, Ligue 4, Invasores (2D) e Labirinto 3D (o único 3D) + menu !jogosx */
const { make, LIST } = require('../../services/jogosxBase');

module.exports = [

/* ================= 6) FORCA ================= */
make({
  name: 'forcajogo', aliases: ['forcax'], emoji: '🪢', title: 'FORCA', kind: '2D',
  css: '.kb{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:10px}.kb button{border:0;border-radius:9px;padding:10px 0;background:#384766;color:#fff;font-weight:bold;font-size:15px}.kb button:disabled{opacity:.3}'
    + '.w{text-align:center;font-size:clamp(22px,8vw,34px);letter-spacing:.12em;font-weight:bold;margin:10px 0 2px;min-height:42px}.cat{text-align:center;color:#b8c4dc;font-size:13px}',
  body: String.raw`<div class="bar"><span>❤ <b id="lf">6</b></span><span>Vitórias <b id="wn">0</b></span></div>
<canvas id="c" width="220" height="170" style="max-width:240px;margin:auto"></canvas>
<div class="cat" id="cat"></div><div class="w" id="w"></div><div class="kb" id="kb"></div>
<div class="btns"><button class="pri" id="n">↻ Nova palavra</button></div><div class="msg" id="m"></div>`,
  js: String.raw`var WORDS=[['Animal','ELEFANTE'],['Animal','GIRAFA'],['Animal','CACHORRO'],['Animal','BORBOLETA'],['Animal','TARTARUGA'],['Animal','GOLFINHO'],['Fruta','MORANGO'],['Fruta','ABACAXI'],['Fruta','LARANJA'],['Fruta','MELANCIA'],['Fruta','GOIABA'],['País','BRASIL'],['País','PORTUGAL'],['País','ARGENTINA'],['País','JAPAO'],['País','CANADA'],['Objeto','TELEFONE'],['Objeto','GELADEIRA'],['Objeto','COMPUTADOR'],['Objeto','VIOLAO'],['Objeto','TRAVESSEIRO'],['Profissão','MEDICO'],['Profissão','PROFESSOR'],['Profissão','BOMBEIRO'],['Profissão','ENGENHEIRO'],['Tecnologia','WHATSAPP'],['Tecnologia','TECLADO'],['Tecnologia','CELULAR'],['Tecnologia','INTERNET'],['Esporte','FUTEBOL'],['Esporte','BASQUETE'],['Esporte','NATACAO'],['Comida','PIZZA'],['Comida','HAMBURGUER'],['Comida','BRIGADEIRO'],['Comida','FEIJOADA']];
var cv=$('c'),x=cv.getContext('2d'),word,cat,got,miss,over,wins=0,last=-1;
function init(){var i;do{i=Math.floor(Math.random()*WORDS.length)}while(i===last);last=i;cat=WORDS[i][0];word=WORDS[i][1];got={};miss=0;over=false;$('cat').textContent='Dica: '+cat;msg('');
 var k=$('kb');k.innerHTML='';'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function(L){var b=document.createElement('button');b.textContent=L;b.onclick=function(){pick(L,b)};k.appendChild(b)});draw()}
function pick(L,b){if(over)return;b.disabled=true;if(word.indexOf(L)>=0)got[L]=1;else miss++;draw();
 var ok=word.split('').every(function(c){return got[c]});if(ok){over=true;wins++;msg('🏆 Acertou! A palavra era '+word);}else if(miss>=6){over=true;msg('💀 Perdeu! Era: '+word)}
 if(over)lock()}
function lock(){var bs=document.querySelectorAll('#kb button');for(var i=0;i<bs.length;i++)bs[i].disabled=true;draw()}
function draw(){x.clearRect(0,0,220,170);x.strokeStyle='#8fa0c8';x.lineWidth=4;x.beginPath();x.moveTo(20,160);x.lineTo(120,160);x.moveTo(50,160);x.lineTo(50,15);x.lineTo(130,15);x.lineTo(130,35);x.stroke();
 x.strokeStyle='#ffd166';x.lineWidth=3;if(miss>0){x.beginPath();x.arc(130,48,13,0,7);x.stroke()}if(miss>1){x.beginPath();x.moveTo(130,61);x.lineTo(130,105);x.stroke()}
 if(miss>2){x.beginPath();x.moveTo(130,70);x.lineTo(110,92);x.stroke()}if(miss>3){x.beginPath();x.moveTo(130,70);x.lineTo(150,92);x.stroke()}
 if(miss>4){x.beginPath();x.moveTo(130,105);x.lineTo(112,135);x.stroke()}if(miss>5){x.beginPath();x.moveTo(130,105);x.lineTo(148,135);x.stroke()}
 $('w').textContent=word.split('').map(function(c){return got[c]||over&&miss>=6?c:'_'}).join(' ');$('lf').textContent=6-miss;$('wn').textContent=wins}
$('n').onclick=init;init();`
}),

/* ================= 7) GENIUS ================= */
make({
  name: 'genius', aliases: ['simon'], emoji: '🎨', title: 'GENIUS', kind: '2D',
  css: '.pd{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}.p{aspect-ratio:1.4;border:0;border-radius:18px;opacity:.45;transition:opacity .08s,transform .08s}.p.lit{opacity:1;transform:scale(1.04);box-shadow:0 0 22px currentColor}',
  body: String.raw`<div class="bar"><span>Rodada <b id="sc">0</b></span><span>Melhor <b id="bs">0</b></span></div>
<div class="pd"><button class="p" id="p0" style="background:#2ecc71;color:#2ecc71"></button><button class="p" id="p1" style="background:#ff4d5e;color:#ff4d5e"></button><button class="p" id="p2" style="background:#ffd43b;color:#ffd43b"></button><button class="p" id="p3" style="background:#3b82f6;color:#3b82f6"></button></div>
<div class="btns"><button class="pri" id="n">▶ Começar</button></div><div class="msg" id="m">Memorize a sequência e repita!</div>`,
  js: String.raw`var seq=[],pi=0,busy=true,score=0,best=0,AC=null,F=[330,262,392,196];
function beep(f){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();var o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;g.gain.value=.12;o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+.2)}catch(e){}}
function flash(i,ms){var e=$('p'+i);e.classList.add('lit');beep(F[i]);setTimeout(function(){e.classList.remove('lit')},ms||280)}
function next(){seq.push(Math.floor(Math.random()*4));busy=true;pi=0;msg('Observe…');var sp=Math.max(260,520-seq.length*18);
 seq.forEach(function(v,k){setTimeout(function(){flash(v,sp*.6)},700+k*sp)});setTimeout(function(){busy=false;msg('Sua vez!')},700+seq.length*sp)}
function start(){seq=[];score=0;$('sc').textContent=0;$('n').textContent='↻ Reiniciar';next()}
function press(i){if(busy)return;flash(i,180);if(i!==seq[pi]){busy=true;best=Math.max(best,score);$('bs').textContent=best;msg('💥 Errou! Você fez '+score+' rodada(s).');$('n').textContent='▶ Jogar de novo';return}
 pi++;if(pi===seq.length){score++;$('sc').textContent=score;busy=true;msg('✔ Muito bem!');setTimeout(next,800)}}
for(var i=0;i<4;i++)(function(i){$('p'+i).addEventListener('pointerdown',function(e){e.preventDefault();press(i)})})(i);$('n').onclick=start;`
}),

/* ================= 8) LIGUE 4 ================= */
make({
  name: 'ligue4', aliases: ['quatroemlinha'], emoji: '🔴', title: 'LIGUE 4', kind: '2D',
  css: '.bd{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;background:#2f4fb3;padding:8px;border-radius:14px}.h{aspect-ratio:1;border-radius:50%;background:#0f1420}.h.r{background:#ff4d5e}.h.y{background:#ffd43b}.h.w{box-shadow:0 0 0 3px #fff inset}'
    + '.md{display:flex;gap:8px;margin:10px 0}.md button{flex:1;border:1px solid #53617b;border-radius:11px;padding:10px 6px;background:#202a3d;color:#dce5f6;font-weight:bold}.md button.a{background:#5144a4;border-color:#8f83ff;color:#fff}',
  body: String.raw`<div class="md"><button id="mb" class="a">🤖 Contra a máquina</button><button id="m2">👥 2 jogadores</button></div>
<div class="bar"><span id="st">Sua vez — 🔴</span></div><div id="bd" class="bd"></div>
<div class="btns"><button class="pri" id="n">↻ Nova partida</button></div><div class="msg" id="m">Toque numa coluna para soltar a peça</div>`,
  js: String.raw`var R=6,C=7,b,turn,over,mode='bot',busy=false,ORD=[3,2,4,1,5,0,6];
function wl(a){var D=[[0,1],[1,0],[1,1],[1,-1]];for(var r=0;r<R;r++)for(var c=0;c<C;c++){var p=a[r*C+c];if(!p)continue;for(var d=0;d<4;d++){var cells=[r*C+c],k;for(k=1;k<4;k++){var rr=r+D[d][0]*k,cc=c+D[d][1]*k;if(rr<0||rr>=R||cc<0||cc>=C||a[rr*C+cc]!==p)break;cells.push(rr*C+cc)}if(k===4)return cells}}return null}
function drop(a,c,p){for(var r=R-1;r>=0;r--)if(!a[r*C+c]){a[r*C+c]=p;return r}return -1}
function full(a){for(var c=0;c<C;c++)if(!a[c])return false;return true}
function heur(a){var s=0,r,c,k,d;for(r=0;r<R;r++)if(a[r*C+3]===2)s+=3;var D=[[0,1],[1,0],[1,1],[1,-1]];
 for(r=0;r<R;r++)for(c=0;c<C;c++)for(d=0;d<4;d++){var n1=0,n2=0,e=0,ok=true;for(k=0;k<4;k++){var rr=r+D[d][0]*k,cc=c+D[d][1]*k;if(rr<0||rr>=R||cc<0||cc>=C){ok=false;break}var v=a[rr*C+cc];if(v===2)n2++;else if(v===1)n1++;else e++}
  if(!ok)continue;if(n2&&!n1){if(n2===3)s+=6;else if(n2===2)s+=2}if(n1&&!n2){if(n1===3)s-=8;else if(n1===2)s-=2}}return s}
function mm(a,dep,al,be,max){var w=wl(a);if(w)return a[w[0]]===2?100000+dep:-100000-dep;if(full(a))return 0;if(!dep)return heur(a);
 var best=max?-1e9:1e9;for(var i=0;i<7;i++){var c=ORD[i];if(a[c])continue;var r=drop(a,c,max?2:1),v=mm(a,dep-1,al,be,!max);a[r*C+c]=0;
  if(max){if(v>best)best=v;if(best>al)al=best}else{if(v<best)best=v;if(best<be)be=best}if(al>=be)break}return best}
function ai(){var bestc=-1,bv=-1e9,opts=[];for(var i=0;i<7;i++){var c=ORD[i];if(b[c])continue;var r=drop(b,c,2),v=mm(b,4,-1e9,1e9,false);b[r*C+c]=0;if(v>bv){bv=v;opts=[c]}else if(v===bv)opts.push(c)}return opts[Math.floor(Math.random()*opts.length)]}
function init(){b=[];for(var i=0;i<R*C;i++)b.push(0);turn=1;over=false;busy=false;draw(null);upd()}
function upd(){$('st').textContent=over?$('st').textContent:(mode==='bot'?(turn===1?'Sua vez — 🔴':'A máquina pensa…'):'Vez de '+(turn===1?'🔴':'🟡'))}
function draw(w){var el=$('bd');el.innerHTML='';for(var i=0;i<R*C;i++){var h=document.createElement('div');h.className='h'+(b[i]===1?' r':b[i]===2?' y':'')+(w&&w.indexOf(i)>=0?' w':'');(function(c){h.onpointerdown=function(e){e.preventDefault();play(c)}})(i%C);el.appendChild(h)}}
function end(){var w=wl(b);if(w){over=true;draw(w);$('st').textContent=(b[w[0]]===1?'🔴':'🟡')+' venceu! '+(mode==='bot'?(b[w[0]]===1?'🎉 Você ganhou':'🤖 A máquina ganhou'):'');return true}if(full(b)){over=true;$('st').textContent='🤝 Empate!';return true}return false}
function play(c){if(over||busy||b[c])return;if(mode==='bot'&&turn!==1)return;drop(b,c,turn);draw(null);if(end())return;turn=turn===1?2:1;upd();
 if(mode==='bot'&&turn===2){busy=true;setTimeout(function(){var m=ai();drop(b,m,2);draw(null);busy=false;if(end())return;turn=1;upd()},60)}}
function setMode(m){mode=m;$('mb').className=m==='bot'?'a':'';$('m2').className=m==='two'?'a':'';init()}
$('mb').onclick=function(){setMode('bot')};$('m2').onclick=function(){setMode('two')};$('n').onclick=init;init();`
}),

/* ================= 9) INVASORES ================= */
make({
  name: 'invasores', aliases: ['invaders'], emoji: '👾', title: 'INVASORES', kind: '2D',
  body: String.raw`<div class="bar"><span>Pontos <b id="sc">0</b></span><span>Vidas <b id="lv">3</b></span><span>Onda <b id="wv">1</b></span></div>
<canvas id="c" width="320" height="440"></canvas>
<div class="btns"><button id="bl">◀</button><button id="bt" class="pri">▶ INICIAR</button><button id="br">▶</button></div>
<div class="msg" id="m">Arraste na tela ou use ◀ ▶ • o tiro é automático</div>`,
  js: String.raw`var cv=$('c'),x=cv.getContext('2d'),W=320,H=440;
var sx,ens,ed,es,eb,pb,live,sc,wave,st,kl=0,kr=0,fire=0,eshoot=0,best=0;
function wave_(){ens=[];for(var r=0;r<4;r++)for(var c=0;c<7;c++)ens.push({x:24+c*38,y:50+r*30,r:r,a:1});ed=1;es=0.35+wave*0.08;eb=[];pb=[]}
function reset(){sx=W/2;live=3;sc=0;wave=1;wave_();st=0;ui();msg('Arraste na tela ou use ◀ ▶ • o tiro é automático')}
function ui(){$('sc').textContent=sc;$('lv').textContent=live;$('wv').textContent=wave}
function go(){if(st===0||st===2){if(st===2)reset();st=1;msg('')}}
function step(dt){sx=Math.max(16,Math.min(W-16,sx+(kr-kl)*4.2*dt));if(st!==1)return;
 fire-=dt;if(fire<=0){pb.push({x:sx,y:392});fire=16}
 var al=ens.filter(function(e){return e.a}),sp=es*(1+(28-al.length)*0.05)*dt,edge=false;
 al.forEach(function(e){e.x+=ed*sp;if(e.x<12||e.x>W-34)edge=true});if(edge){ed=-ed;al.forEach(function(e){e.y+=14;e.x+=ed*sp*2})}
 eshoot-=dt;if(eshoot<=0&&al.length){var s=al[Math.floor(Math.random()*al.length)];eb.push({x:s.x+11,y:s.y+20});eshoot=Math.max(14,50-wave*4)}
 pb.forEach(function(b){b.y-=7*dt});pb=pb.filter(function(b){return b.y>-10});
 eb.forEach(function(b){b.y+=(2.6+wave*.2)*dt});eb=eb.filter(function(b){return b.y<H+10});
 pb.forEach(function(b){for(var i=0;i<al.length;i++){var e=al[i];if(e.a&&b.x>e.x-2&&b.x<e.x+24&&b.y>e.y&&b.y<e.y+20){e.a=0;b.y=-99;sc+=10+(3-e.r)*5;ui();break}}});
 eb.forEach(function(b){if(b.y>396&&b.y<418&&Math.abs(b.x-sx)<16){b.y=H+99;live--;ui();if(live<=0){st=2;best=Math.max(best,sc);msg('💀 Fim! Pontos: '+sc+' • toque para recomeçar')}}});
 if(!al.some(function(e){return e.a})){wave++;wave_();ui();msg('🌊 Onda '+wave+'!')}
 al.forEach(function(e){if(e.a&&e.y>385){live=0;ui();st=2;msg('💀 Eles chegaram! Toque para recomeçar')}})}
var COL=['#ff5d73','#ff9f43','#feca57','#1dd1a1'];
function draw(){x.fillStyle='#0b0e16';x.fillRect(0,0,W,H);ens.forEach(function(e){if(!e.a)return;x.fillStyle=COL[e.r];x.fillRect(e.x+4,e.y,14,14);x.fillRect(e.x,e.y+4,22,8);x.fillRect(e.x+2,e.y+14,4,5);x.fillRect(e.x+16,e.y+14,4,5);x.fillStyle='#0b0e16';x.fillRect(e.x+6,e.y+5,3,3);x.fillRect(e.x+13,e.y+5,3,3)});
 x.fillStyle='#7df9ff';pb.forEach(function(b){x.fillRect(b.x-1,b.y,3,9)});x.fillStyle='#ff6b6b';eb.forEach(function(b){x.fillRect(b.x-1,b.y,3,9)});
 x.fillStyle='#e8ecff';x.fillRect(sx-15,408,30,8);x.fillRect(sx-5,400,10,8);x.fillRect(sx-1,394,2,6);
 if(st===0||st===2){x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,170,W,70);x.fillStyle='#fff';x.font='bold 20px Arial';x.textAlign='center';x.fillText(st===0?'Toque para iniciar':'Fim de jogo',W/2,212)}}
var last=0;function loop(t){var dt=Math.min(2,(t-last)/16.67||1);last=t;step(dt);draw();requestAnimationFrame(loop)}
function mv(e){var r=cv.getBoundingClientRect();sx=Math.max(16,Math.min(W-16,(e.clientX-r.left)/r.width*W))}
cv.addEventListener('pointerdown',function(e){e.preventDefault();mv(e);go()});cv.addEventListener('pointermove',function(e){if(e.pressure>0||e.buttons)mv(e)});
function hold(id,f){var el=$(id);el.addEventListener('pointerdown',function(e){e.preventDefault();f(1);go()});['pointerup','pointerleave','pointercancel'].forEach(function(n){el.addEventListener(n,function(){f(0)})})}
hold('bl',function(v){kl=v});hold('br',function(v){kr=v});$('bt').addEventListener('pointerdown',function(e){e.preventDefault();go()});
reset();requestAnimationFrame(loop);`
}),

/* ================= 10) LABIRINTO 3D (o único 3D) ================= */
make({
  name: 'labirinto3d', aliases: ['maze3d'], emoji: '🧭', title: 'LABIRINTO 3D', kind: '3D',
  css: '.cw{position:relative}#mm{position:absolute;left:6px;top:6px;width:68px;height:68px;border-radius:8px;opacity:.9;background:#0b0e16;touch-action:none}',
  body: String.raw`<div class="bar"><span>⏱ <b id="tm">0.0</b>s</span><span>Melhor <b id="bs">--</b></span></div>
<div class="cw"><canvas id="c" width="320" height="220"></canvas><canvas id="mm" width="68" height="68"></canvas></div>
<div class="btns"><button id="bl">⟲</button><button id="bu">▲</button><button id="bd">▼</button><button id="br">⟳</button></div>
<div class="btns"><button class="pri" id="n">↻ Novo labirinto</button></div><div class="msg" id="m">Ache a parede 🟩 verde • arraste na tela para olhar</div>`,
  js: String.raw`var cv=$('c'),x=cv.getContext('2d'),mmc=$('mm'),mx=mmc.getContext('2d'),N=17,W=160,H=220,map,px,py,ang,gx,gy,t0,done,best=0,key={l:0,r:0,u:0,d:0},tdone=0;
function gen(){map=[];var i,j;for(i=0;i<N*N;i++)map.push(1);var st=[[1,1]];map[N+1]=0;
 while(st.length){var c=st[st.length-1],ds=[[2,0],[-2,0],[0,2],[0,-2]].sort(function(){return Math.random()-.5}),mv=false;
  for(i=0;i<4;i++){var a=c[0]+ds[i][0],b=c[1]+ds[i][1];if(a>0&&a<N-1&&b>0&&b<N-1&&map[b*N+a]){map[(c[1]+ds[i][1]/2)*N+c[0]+ds[i][0]/2]=0;map[b*N+a]=0;st.push([a,b]);mv=true;break}}
  if(!mv)st.pop()}
 var dist={},q=[[1,1]];dist[N+1]=0;var far=-1,fd=-1;
 while(q.length){var p=q.shift(),dd=dist[p[1]*N+p[0]],nn=0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){var a=p[0]+d[0],b=p[1]+d[1],k=b*N+a;if(!map[k]){nn++;if(dist[k]===undefined){dist[k]=dd+1;q.push([a,b])}}});
  if(nn===1&&(p[0]!==1||p[1]!==1)&&p[0]%2===1&&p[1]%2===1&&dd>fd){fd=dd;far=p[1]*N+p[0]}}
 map[far]=2;gx=far%N+.5;gy=Math.floor(far/N)+.5}
function init(){gen();px=1.5;py=1.5;ang=map[N+2]?Math.PI/2:0;done=false;t0=Date.now();$('tm').textContent='0.0';msg('Ache a parede 🟩 verde • arraste na tela para olhar')}
function free(a,b){return !map[Math.floor(b)*N+Math.floor(a)]}
function step(dt){if(done)return;ang+=(key.r-key.l)*2.1*dt;var mv=(key.u-key.d)*2.3*dt;
 if(mv){var dx=Math.cos(ang),dy=Math.sin(ang),tx=px+dx*mv,ty=py+dy*mv,m=.22;if(free(tx+(dx*mv>0?m:-m),py))px=tx;if(free(px,ty+(dy*mv>0?m:-m)))py=ty}
 var tt=(Date.now()-t0)/1000;$('tm').textContent=tt.toFixed(1);
 if(Math.hypot(px-gx,py-gy)<1.3){done=true;tdone=tt;if(!best||tt<best){best=tt;$('bs').textContent=tt.toFixed(1)}msg('🎉 Saída encontrada em '+tt.toFixed(1)+'s!')}}
var gc=null,gf=null;function bg(){gc=x.createLinearGradient(0,0,0,H/2);gc.addColorStop(0,'#05070d');gc.addColorStop(1,'#1a2036');gf=x.createLinearGradient(0,H/2,0,H);gf.addColorStop(0,'#10131f');gf.addColorStop(1,'#2b2f45')}
function render(){if(!gc)bg();x.fillStyle=gc;x.fillRect(0,0,320,H/2);x.fillStyle=gf;x.fillRect(0,H/2,320,H/2);
 var dx=Math.cos(ang),dy=Math.sin(ang),plx=-dy*.66,ply=dx*.66;
 for(var i=0;i<W;i++){var cam=2*i/W-1,rx=dx+plx*cam,ry=dy+ply*cam,mxx=Math.floor(px),myy=Math.floor(py),ddx=Math.abs(1/rx),ddy=Math.abs(1/ry),sx,sy,sdx,sdy,side=0,hit=0;
  if(rx<0){sx=-1;sdx=(px-mxx)*ddx}else{sx=1;sdx=(mxx+1-px)*ddx}if(ry<0){sy=-1;sdy=(py-myy)*ddy}else{sy=1;sdy=(myy+1-py)*ddy}
  var guard=0;while(!hit&&guard++<64){if(sdx<sdy){sdx+=ddx;mxx+=sx;side=0}else{sdy+=ddy;myy+=sy;side=1}hit=map[myy*N+mxx]||0}
  var d=side?sdy-ddy:sdx-ddx;if(d<.05)d=.05;var lh=H/d,y0=(H-lh)/2,wx=side?px+d*rx:py+d*ry;wx-=Math.floor(wx);
  var sh=Math.max(.14,1-d*.1);if(wx<.05||wx>.95)sh*=.78;var c=hit===2?[60,235,140]:(side?[110,124,214]:[78,92,176]);
  x.fillStyle='rgb('+Math.round(c[0]*sh)+','+Math.round(c[1]*sh)+','+Math.round(c[2]*sh)+')';x.fillRect(i*2,y0,2,lh)}
 mx.fillStyle='#0b0e16';mx.fillRect(0,0,68,68);for(var r=0;r<N;r++)for(var q=0;q<N;q++){var v=map[r*N+q];if(v){mx.fillStyle=v===2?'#3ceb8c':'#39407a';mx.fillRect(q*4,r*4,4,4)}}
 mx.fillStyle='#ffd43b';mx.beginPath();mx.arc(px*4,py*4,2.4,0,7);mx.fill();mx.strokeStyle='#ffd43b';mx.beginPath();mx.moveTo(px*4,py*4);mx.lineTo(px*4+dx*6,py*4+dy*6);mx.stroke()}
var last=0;function loop(t){var dt=Math.min(.05,(t-last)/1000||.016);last=t;step(dt);render();requestAnimationFrame(loop)}
function hold(id,k){var el=$(id);el.addEventListener('pointerdown',function(e){e.preventDefault();key[k]=1});['pointerup','pointerleave','pointercancel'].forEach(function(n){el.addEventListener(n,function(){key[k]=0})})}
hold('bl','l');hold('br','r');hold('bu','u');hold('bd','d');$('n').onclick=init;
var dragx=null;cv.addEventListener('pointerdown',function(e){e.preventDefault();dragx=e.clientX});cv.addEventListener('pointermove',function(e){if(dragx!==null){ang+=(e.clientX-dragx)*.012;dragx=e.clientX}});['pointerup','pointerleave','pointercancel'].forEach(function(n){cv.addEventListener(n,function(){dragx=null})});
init();requestAnimationFrame(loop);`
}),

/* ================= MENU ================= */
{
  name: 'jogosx', aliases: ['jogos10', 'jogospainel'], category: 'jogos',
  description: '10 jogos no painel interativo (9 em 2D + 1 em 3D)', usage: '!jogosx',
  handler: async function (ctx) {
    const p = (ctx.prefix || '!');
    const lines = LIST.map(function (g, i) { return (i + 1) + '. ' + g.emoji + ' *' + g.title + '* — ' + g.kind + ' → ' + p + g.name; });
    return ctx.reply('🎮 *JOGOS NO PAINEL*\n\n' + lines.join('\n') + '\n\nToque em *Ver detalhes* na mensagem do jogo para jogar.');
  }
}

];
