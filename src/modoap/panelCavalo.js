'use strict';
/** MODOAP — painel 11: corrida de cavalos (apcavalo). */
const G = {};
G.cavalo2 = { title: 'CAVALOS', html: '<div class="pad"><canvas id="c" width="340" height="230"></canvas><div class="lbl">Escolhe o teu cavalo (a odd = quanto paga)</div><div id="hs"></div><div id="bx"></div><button class="big" id="go" onclick="race()">INICIAR CORRIDA</button><div class="msg" id="msg"></div></div>', js: String.raw`
function msg(t,c){var m=$("msg");m.textContent=t;m.className="msg "+(c||"")}
$('bx').innerHTML=P.box('b',500);
var HS=[['Trovão',30],['Relâmpago',24],['Estrela',18],['Fantasma',14],['Tornado',9],['Zebra',5]],sel=0,busy=0,pos=[0,0,0,0,0,0],win=-1;
function od(i){return Math.floor(95/HS[i][1]*100)/100}
function lst(){var h='';for(var i=0;i<6;i++)h+='<button class="chip'+(i===sel?' on':'')+'" style="width:100%;margin:3px 0;text-align:left;padding:9px" onclick="if(!busy){sel='+i+';lst()}">🐎 '+(i+1)+' · '+HS[i][0]+' — paga '+od(i).toFixed(2)+'x</button>';$('hs').innerHTML=h}
function draw(){var c=$('c').getContext('2d');c.clearRect(0,0,340,230);for(var i=0;i<6;i++){var y=8+i*36;c.fillStyle=i%2?'#14301c':'#10261a';c.fillRect(0,y,340,34);c.fillStyle='#8a8a96';c.font='11px Arial';c.fillText(String(i+1),4,y+20);
  c.save();c.translate(20+pos[i]*268+24,y+26);c.scale(-1,1);c.font='24px serif';c.fillText('🐎',0,0);c.restore();if(i===sel){c.strokeStyle='#f1c40f';c.strokeRect(1,y,338,34)}}
 c.fillStyle='#fff';for(var k=0;k<14;k++){c.fillRect(318,8+k*15,6,7.5);c.fillRect(324,8+k*15+7.5,6,7.5)}}
function race(){if(busy)return;var a=P.val('b');if(!P.bet(a))return;busy=1;msg('','');var r=P.rnd()*100,acc=0;win=0;for(var i=0;i<6;i++){acc+=HS[i][1];if(r<acc){win=i;break}}
 var T=[],W=[],t0=Date.now();for(var i=0;i<6;i++){T.push(i===win?6:6.4+P.rnd()*2);W.push(0.05*(P.rnd()*2-1))}
 var iv=setInterval(function(){var t=(Date.now()-t0)/1000,done=1;for(var i=0;i<6;i++){var f=t/T[i];if(f>=1)pos[i]=1;else{done=0;pos[i]=Math.max(0,Math.min(0.99,f+W[i]*Math.sin(t*4+i)*(1-f)))}}draw();
  if(t>=T[win]){clearInterval(iv);busy=0;if(win===sel){var g=Math.floor(a*od(sel));P.pay(g);msg('🏆 '+HS[win][0]+' venceu! +'+P.fm(g-a),'g')}else msg('Venceu '+HS[win][0]+'. Perdeste '+P.fm(a),'r');setTimeout(function(){pos=[0,0,0,0,0,0];draw()},2500)}},40)}
lst();draw();`};
module.exports = G;
