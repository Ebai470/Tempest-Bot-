'use strict';
/** JOGOS X (parte 1): 2048, Campo Minado, Flappy, Quebra-Tijolos, Tetris — todos 2D. */
const { make } = require('../../services/jogosxBase');

module.exports = [

/* ================= 1) 2048 ================= */
make({
  name: 'jogo2048', aliases: ['2048x'], emoji: '🔢', title: '2048', kind: '2D',
  css: '.g2{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#2a334a;padding:8px;border-radius:14px;touch-action:none}'
    + '.t{aspect-ratio:1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:clamp(18px,7vw,30px)}',
  body: String.raw`<div class="bar"><span>Pontos <b id="sc">0</b></span><span>Melhor <b id="bs">0</b></span></div>
<div id="g" class="g2"></div>
<div class="btns"><button id="l">◀</button><button id="u">▲</button><button id="d">▼</button><button id="r">▶</button></div>
<div class="btns"><button class="pri" id="n">↻ Novo jogo</button></div>
<div class="msg" id="m">Deslize na grade ou use os botões</div>`,
  js: String.raw`var b,sc=0,best=0,over=false,won=false;
var COL={2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e'};
function add(){var e=[];for(var i=0;i<16;i++)if(!b[i])e.push(i);if(e.length)b[e[Math.floor(Math.random()*e.length)]]=Math.random()<.9?2:4}
function init(){b=[];for(var i=0;i<16;i++)b.push(0);sc=0;over=false;won=false;add();add();draw();msg('Deslize na grade ou use os botões')}
function line(a){var r=a.filter(Boolean),o=[];for(var i=0;i<r.length;i++){if(r[i]===r[i+1]){o.push(r[i]*2);sc+=r[i]*2;i++}else o.push(r[i])}while(o.length<4)o.push(0);return o}
function canMove(){for(var i=0;i<16;i++){if(!b[i])return true;if(i%4<3&&b[i]===b[i+1])return true;if(i<12&&b[i]===b[i+4])return true}return false}
function move(d){if(over)return;var old=b.join(),nb=b.slice(),oldsc=sc;
 for(var k=0;k<4;k++){var idx=[],j;for(j=0;j<4;j++)idx.push(d<2?k*4+j:j*4+k);
  var a=idx.map(function(i){return nb[i]});if(d===1||d===3)a.reverse();a=line(a);if(d===1||d===3)a.reverse();for(j=0;j<4;j++)nb[idx[j]]=a[j]}
 if(nb.join()===old){sc=oldsc;return}b=nb;add();draw()}
function draw(){var g=$('g');g.innerHTML='';for(var i=0;i<16;i++){var t=document.createElement('div');t.className='t';var v=b[i];t.textContent=v||'';t.style.background=COL[v]||(v?'#3c3a32':'#38435f');t.style.color=v>4?'#fff':'#6b5d50';if(v>=1024)t.style.fontSize='clamp(14px,5.5vw,24px)';g.appendChild(t)}
 best=Math.max(best,sc);$('sc').textContent=sc;$('bs').textContent=best;
 if(!won&&b.indexOf(2048)>=0){won=true;msg('🎉 Chegou no 2048! Continue jogando!')}
 if(!canMove()){over=true;msg('💀 Sem movimentos! Toque em Novo jogo')}}
$('l').onclick=function(){move(0)};$('r').onclick=function(){move(1)};$('u').onclick=function(){move(2)};$('d').onclick=function(){move(3)};$('n').onclick=init;
var sx,sy;$('g').addEventListener('touchstart',function(e){sx=e.touches[0].clientX;sy=e.touches[0].clientY;e.preventDefault()},{passive:false});
$('g').addEventListener('touchend',function(e){var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.max(Math.abs(dx),Math.abs(dy))<24)return;if(Math.abs(dx)>Math.abs(dy))move(dx>0?1:0);else move(dy>0?3:2);e.preventDefault()},{passive:false});
init();`
}),

/* ================= 2) CAMPO MINADO ================= */
make({
  name: 'minas', aliases: ['campominado'], emoji: '💣', title: 'CAMPO MINADO', kind: '2D',
  css: '.mg{display:grid;grid-template-columns:repeat(9,1fr);gap:3px;background:#2a334a;padding:6px;border-radius:12px}'
    + '.c{aspect-ratio:1;border:0;border-radius:6px;background:#4a5778;color:#fff;font-weight:bold;font-size:clamp(13px,4.6vw,20px);padding:0;display:flex;align-items:center;justify-content:center}'
    + '.c.o{background:#1f2638}.c.x{background:#b13b4b}',
  body: String.raw`<div class="bar"><span>💣 <b id="left">10</b></span><span>⏱ <b id="tm">0</b>s</span></div>
<div id="g" class="mg"></div>
<div class="btns"><button id="fm">🚩 Bandeira: OFF</button><button class="pri" id="n">↻ Novo</button></div>
<div class="msg" id="m">Toque para abrir • segure para marcar 🚩</div>`,
  js: String.raw`var W=9,H=9,M=10,mine,open,flag,over,first,fm=false,secs=0,tmr=null,cells=[];
var NC=['','#5fa8ff','#4cd08b','#ff6b6b','#a78bfa','#ff9f43','#2dd4bf','#e5e7eb','#9ca3af'];
function nb(i){var r=[],x=i%W,y=Math.floor(i/W);for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;var a=x+dx,b=y+dy;if(a>=0&&a<W&&b>=0&&b<H)r.push(b*W+a)}return r}
function init(){mine=[];open=[];flag=[];for(var i=0;i<W*H;i++){mine.push(0);open.push(0);flag.push(0)}over=false;first=true;secs=0;clearInterval(tmr);tmr=null;$('tm').textContent=0;
 var g=$('g');g.innerHTML='';cells=[];for(i=0;i<W*H;i++){(function(i){var c=document.createElement('button');c.className='c';var lp=false,t=null;
  c.onpointerdown=function(){lp=false;t=setTimeout(function(){lp=true;toggle(i)},380)};
  c.onpointerup=function(){clearTimeout(t);if(!lp)tap(i)};c.onpointerleave=function(){clearTimeout(t)};c.onpointercancel=function(){clearTimeout(t)};c.oncontextmenu=function(e){e.preventDefault()};
  g.appendChild(c);cells.push(c)})(i)}
 upd();msg('Toque para abrir • segure para marcar 🚩')}
function place(safe){var n=0;while(n<M){var r=Math.floor(Math.random()*W*H);if(mine[r]||r===safe||nb(safe).indexOf(r)>=0)continue;mine[r]=1;n++}}
function cnt(i){var n=0;nb(i).forEach(function(j){n+=mine[j]});return n}
function toggle(i){if(over||open[i])return;flag[i]=flag[i]?0:1;upd()}
function tap(i){if(over)return;if(fm){toggle(i);return}if(flag[i])return;
 if(first){first=false;place(i);tmr=setInterval(function(){secs++;$('tm').textContent=secs},1000)}
 if(open[i]){var f=0;nb(i).forEach(function(j){f+=flag[j]});if(f===cnt(i))nb(i).forEach(function(j){if(!flag[j]&&!open[j])reveal(j)});chk();upd();return}
 reveal(i);chk();upd()}
function reveal(s){var st=[s];while(st.length){var i=st.pop();if(open[i]||flag[i])continue;open[i]=1;if(mine[i]){lose(i);return}if(cnt(i)===0)nb(i).forEach(function(j){if(!open[j])st.push(j)})}}
function lose(i){over=true;clearInterval(tmr);for(var k=0;k<W*H;k++)if(mine[k])open[k]=2;open[i]=3;msg('💥 Boom! Você perdeu.')}
function chk(){if(over)return;var o=0;for(var i=0;i<W*H;i++)if(open[i]===1)o++;if(o===W*H-M){over=true;clearInterval(tmr);for(i=0;i<W*H;i++)if(mine[i])flag[i]=1;msg('🏆 Você venceu em '+secs+'s!')}}
function upd(){var f=0;for(var i=0;i<W*H;i++){var c=cells[i],o=open[i];f+=flag[i];c.className='c'+(o===1?' o':o===3?' x':o===2?' o':'');c.style.color='#fff';
  if(o===1){var n=cnt(i);c.textContent=n||'';c.style.color=NC[n]}else if(o>=2)c.textContent='💣';else c.textContent=flag[i]?'🚩':''}
 $('left').textContent=M-f}
$('fm').onclick=function(){fm=!fm;this.textContent='🚩 Bandeira: '+(fm?'ON':'OFF');this.className=fm?'on':''};$('n').onclick=init;init();`
}),

/* ================= 3) FLAPPY ================= */
make({
  name: 'flappy', aliases: ['passaro'], emoji: '🐤', title: 'VOA PASSARINHO', kind: '2D',
  body: String.raw`<div class="bar"><span>Pontos <b id="sc">0</b></span><span>Melhor <b id="bs">0</b></span></div>
<canvas id="c" width="320" height="480"></canvas>
<div class="btns"><button class="pri" id="f">⬆ VOAR</button></div>
<div class="msg" id="m">Toque na tela para voar</div>`,
  js: String.raw`var cv=$('c'),x=cv.getContext('2d'),W=320,H=480,GH=60,GAP=135;
var st,by,vy,pipes,fr,score,best=0;
function reset(){by=200;vy=0;pipes=[];fr=0;score=0;st=0;$('sc').textContent=0;msg('Toque na tela para voar')}
function flap(){if(st===2){reset();return}if(st===0){st=1;msg('')}vy=-6.4}
function die(){st=2;best=Math.max(best,score);$('bs').textContent=best;msg('💥 Bateu! Toque para tentar de novo')}
function step(){vy+=0.38;by+=vy;fr++;
 if(fr%90===1)pipes.push({x:W,g:70+Math.random()*(H-GH-GAP-100),p:0});
 for(var i=pipes.length-1;i>=0;i--){var p=pipes[i];p.x-=2.3;if(!p.p&&p.x+52<70){p.p=1;score++;$('sc').textContent=score}if(p.x<-60){pipes.splice(i,1);continue}
  if(81>p.x&&59<p.x+52&&(by-11<p.g||by+11>p.g+GAP))die()}
 if(by+11>H-GH||by<-10)die()}
function draw(){var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#5bc0f8');g.addColorStop(1,'#bfe9ff');x.fillStyle=g;x.fillRect(0,0,W,H);
 pipes.forEach(function(p){x.fillStyle='#3fae4a';x.fillRect(p.x,0,52,p.g);x.fillRect(p.x,p.g+GAP,52,H);x.fillStyle='#2e8a3a';x.fillRect(p.x-3,p.g-16,58,16);x.fillRect(p.x-3,p.g+GAP,58,16)});
 x.fillStyle='#d9b25f';x.fillRect(0,H-GH,W,GH);x.fillStyle='#6fbf4a';x.fillRect(0,H-GH,W,10);
 x.save();x.translate(70,by);x.rotate(Math.max(-.5,Math.min(1.1,vy*.08)));x.fillStyle='#ffd23f';x.beginPath();x.arc(0,0,12,0,7);x.fill();x.fillStyle='#fff';x.beginPath();x.arc(5,-4,4.5,0,7);x.fill();x.fillStyle='#222';x.beginPath();x.arc(6.5,-4,2,0,7);x.fill();x.fillStyle='#ff7a33';x.beginPath();x.moveTo(10,1);x.lineTo(20,4);x.lineTo(10,7);x.fill();x.fillStyle='#f4b400';x.beginPath();x.ellipse(-4,3,6,4,0,0,7);x.fill();x.restore();
 x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=4;x.font='bold 40px Arial';x.textAlign='center';x.strokeText(score,W/2,70);x.fillText(score,W/2,70)}
var last=0,acc=0;function loop(t){acc+=Math.min(50,t-last);last=t;while(acc>=16.67){acc-=16.67;if(st===1)step();else if(st===0)by=200+Math.sin(t/200)*6}draw();requestAnimationFrame(loop)}
cv.addEventListener('pointerdown',function(e){e.preventDefault();flap()});$('f').addEventListener('pointerdown',function(e){e.preventDefault();flap()});
reset();requestAnimationFrame(loop);`
}),

/* ================= 4) QUEBRA-TIJOLOS ================= */
make({
  name: 'tijolos', aliases: ['breakout'], emoji: '🧱', title: 'QUEBRA-TIJOLOS', kind: '2D',
  body: String.raw`<div class="bar"><span>Pontos <b id="sc">0</b></span><span>Vidas <b id="lv">3</b></span><span>Fase <b id="fs">1</b></span></div>
<canvas id="c" width="320" height="440"></canvas>
<div class="btns"><button id="bl">◀</button><button id="bt" class="pri">▶ LANÇAR</button><button id="br">▶</button></div>
<div class="msg" id="m">Arraste na tela para mover • toque para lançar</div>`,
  js: String.raw`var cv=$('c'),x=cv.getContext('2d'),W=320,H=440,PW=64,PY=412,R=6;
var px,bx,by,vx,vy,live,sc,lvl,st,bricks,kl=0,kr=0,best=0;
var COLS=['#ff5d73','#ff9f43','#feca57','#1dd1a1','#54a0ff'];
function mk(){bricks=[];for(var r=0;r<5;r++)for(var c=0;c<7;c++)bricks.push({x:9+c*43,y:46+r*20,w:40,h:16,a:1,c:COLS[r]})}
function serve(){bx=px+PW/2;by=PY-R-1;var s=Math.min(7,3.8+lvl*0.4);vx=s*.55*(Math.random()<.5?-1:1);vy=-s*.84;st=0}
function reset(){px=128;live=3;sc=0;lvl=1;mk();serve();ui();msg('Arraste na tela para mover • toque para lançar')}
function ui(){$('sc').textContent=sc;$('lv').textContent=live;$('fs').textContent=lvl}
function go(){if(st===0){st=1;msg('')}else if(st===2)reset()}
function step(dt){px=Math.max(0,Math.min(W-PW,px+(kr-kl)*5*dt));
 if(st===0){bx=px+PW/2;by=PY-R-1;return}if(st!==1)return;
 bx+=vx*dt;by+=vy*dt;if(bx<R){bx=R;vx=Math.abs(vx)}if(bx>W-R){bx=W-R;vx=-Math.abs(vx)}if(by<R){by=R;vy=Math.abs(vy)}
 if(vy>0&&by+R>=PY&&by+R<=PY+14&&bx>=px-4&&bx<=px+PW+4){var h=(bx-(px+PW/2))/(PW/2),s=Math.hypot(vx,vy),a=h*1.0;vx=s*Math.sin(a);vy=-Math.abs(s*Math.cos(a));by=PY-R}
 for(var i=0;i<bricks.length;i++){var k=bricks[i];if(!k.a)continue;if(bx+R>k.x&&bx-R<k.x+k.w&&by+R>k.y&&by-R<k.y+k.h){k.a=0;sc+=10;if(sc>best)best=sc;var ox=Math.min(bx+R-k.x,k.x+k.w-(bx-R)),oy=Math.min(by+R-k.y,k.y+k.h-(by-R));if(ox<oy)vx=-vx;else vy=-vy;ui();break}}
 if(!bricks.some(function(k){return k.a})){lvl++;mk();serve();ui();msg('🎉 Fase '+lvl+'!')}
 if(by>H+10){live--;ui();if(live<=0){st=2;msg('💀 Fim de jogo! Toque para recomeçar')}else serve()}}
function draw(){x.fillStyle='#0b0e16';x.fillRect(0,0,W,H);bricks.forEach(function(k){if(k.a){x.fillStyle=k.c;x.fillRect(k.x,k.y,k.w,k.h)}});
 x.fillStyle='#e8ecff';x.fillRect(px,PY,PW,10);x.beginPath();x.arc(bx,by,R,0,7);x.fillStyle='#fff';x.fill()}
var last=0;function loop(t){var dt=Math.min(2,(t-last)/16.67||1);last=t;step(dt);draw();requestAnimationFrame(loop)}
function mv(e){var r=cv.getBoundingClientRect();px=Math.max(0,Math.min(W-PW,(e.clientX-r.left)/r.width*W-PW/2))}
cv.addEventListener('pointerdown',function(e){e.preventDefault();mv(e);go()});cv.addEventListener('pointermove',function(e){if(e.pressure>0||e.buttons)mv(e)});
function hold(id,f){var el=$(id);el.addEventListener('pointerdown',function(e){e.preventDefault();f(1)});['pointerup','pointerleave','pointercancel'].forEach(function(n){el.addEventListener(n,function(){f(0)})})}
hold('bl',function(v){kl=v});hold('br',function(v){kr=v});$('bt').addEventListener('pointerdown',function(e){e.preventDefault();go()});
reset();requestAnimationFrame(loop);`
}),

/* ================= 5) TETRIS ================= */
make({
  name: 'tetris', aliases: ['blocos'], emoji: '🧩', title: 'TETRIS', kind: '2D',
  body: String.raw`<div class="bar"><span>Pontos <b id="sc">0</b></span><span>Linhas <b id="ln">0</b></span><span>Nível <b id="lv">1</b></span></div>
<canvas id="c" width="290" height="400" style="max-width:300px;margin:auto"></canvas>
<div class="btns"><button id="bl">◀</button><button id="bro">⟳</button><button id="bd">▼</button><button id="br">▶</button><button id="bh" class="pri">⤓</button></div>
<div class="btns"><button id="n">↻ Novo jogo</button></div>
<div class="msg" id="m">Complete linhas para pontuar</div>`,
  js: String.raw`var cv=$('c'),x=cv.getContext('2d'),C=20,CW=10,CH=20;
var COLS=['#000','#00e5ff','#ffd43b','#b388ff','#69f0ae','#ff5252','#448aff','#ffab40'];
var SH=[[[1,1,1,1]],[[2,2],[2,2]],[[0,3,0],[3,3,3]],[[0,4,4],[4,4,0]],[[5,5,0],[0,5,5]],[[6,0,0],[6,6,6]],[[0,0,7],[7,7,7]]];
var g,p,nx,sc,lines,lv,over,acc,best=0;
function cp(m){return m.map(function(r){return r.slice()})}
function rot(m){var r=[];for(var i=0;i<m[0].length;i++){r.push([]);for(var j=m.length-1;j>=0;j--)r[i].push(m[j][i])}return r}
function hit(m,px,py){for(var i=0;i<m.length;i++)for(var j=0;j<m[i].length;j++)if(m[i][j]){var gx=px+j,gy=py+i;if(gx<0||gx>=CW||gy>=CH||(gy>=0&&g[gy][gx]))return true}return false}
function rnd(){return cp(SH[Math.floor(Math.random()*7)])}
function spawn(){var s=nx||rnd();nx=rnd();p={m:s,x:Math.floor((CW-s[0].length)/2),y:0};if(hit(p.m,p.x,p.y)){over=true;best=Math.max(best,sc);msg('💀 Fim! Melhor: '+best)}}
function init(){g=[];for(var i=0;i<CH;i++){g.push([]);for(var j=0;j<CW;j++)g[i].push(0)}sc=0;lines=0;lv=1;over=false;acc=0;nx=null;spawn();ui();msg('Complete linhas para pontuar')}
function ui(){$('sc').textContent=sc;$('ln').textContent=lines;$('lv').textContent=lv}
function lock(){p.m.forEach(function(r,i){r.forEach(function(v,j){if(v&&p.y+i>=0)g[p.y+i][p.x+j]=v})});
 g=g.filter(function(r){return !r.every(Boolean)});var n=CH-g.length;for(var k=0;k<n;k++){var e=[];for(var j=0;j<CW;j++)e.push(0);g.unshift(e)}
 if(n){sc+=[0,100,300,500,800][n]*lv;lines+=n;lv=1+Math.floor(lines/10)}ui();spawn()}
function mvx(d){if(over)return;if(!hit(p.m,p.x+d,p.y))p.x+=d}
function down(){if(over)return;if(!hit(p.m,p.x,p.y+1)){p.y++;return true}lock();return false}
function rotate(){if(over)return;var m=rot(p.m),ks=[0,-1,1,-2,2];for(var i=0;i<ks.length;i++)if(!hit(m,p.x+ks[i],p.y)){p.m=m;p.x+=ks[i];return}}
function hard(){if(over)return;while(!hit(p.m,p.x,p.y+1))p.y++;sc+=2;lock()}
function box(px,py,v,a){x.globalAlpha=a||1;x.fillStyle=COLS[v];x.fillRect(px,py,C-1,C-1);x.globalAlpha=1}
function draw(){x.fillStyle='#0b0e16';x.fillRect(0,0,290,400);x.fillStyle='#141a28';x.fillRect(0,0,200,400);
 for(var i=0;i<CH;i++)for(var j=0;j<CW;j++)if(g[i][j])box(j*C,i*C,g[i][j]);
 if(!over){var gy=p.y;while(!hit(p.m,p.x,gy+1))gy++;p.m.forEach(function(r,i){r.forEach(function(v,j){if(v){box((p.x+j)*C,(gy+i)*C,v,.25);box((p.x+j)*C,(p.y+i)*C,v)}})})}
 x.fillStyle='#b8c4dc';x.font='bold 13px Arial';x.fillText('PRÓXIMA',212,24);nx.forEach(function(r,i){r.forEach(function(v,j){if(v)box(214+j*C,40+i*C,v)})})}
var last=0;function loop(t){var dt=Math.min(100,t-last);last=t;if(!over){acc+=dt;if(acc>Math.max(90,720-lv*60)){acc=0;down()}}draw();requestAnimationFrame(loop)}
function rep(id,f,ms){var el=$(id),tm=null;function stop(){clearInterval(tm);tm=null}el.addEventListener('pointerdown',function(e){e.preventDefault();f();if(ms){stop();tm=setInterval(f,ms)}});['pointerup','pointerleave','pointercancel'].forEach(function(n){el.addEventListener(n,stop)})}
rep('bl',function(){mvx(-1)},120);rep('br',function(){mvx(1)},120);rep('bd',function(){if(down())sc+=1},55);rep('bro',rotate,0);rep('bh',hard,0);$('n').onclick=init;
init();requestAnimationFrame(loop);`
})

];
