set -e
cd "${1:-$HOME/tempest-bot}"
F=src/commands/utilidades/ytplay3.js
[ -f "$F" ] || { echo "❌ Rode no ~/tempest-bot (não achei $F)"; exit 1; }
grep -q "painéis de TESTE" "$F" || { echo "❌ Este patch é para o ytplay3 v5 (o que tem .ytplay3 teste)"; exit 1; }
if grep -q TP_V6 "$F"; then echo "= já está na v6"; exit 0; fi
cp "$F" "$F.bak-v5"
cat > .tp6.tmp <<'TPNEW'
function buildHtml(t, lyr, audioB64) {
  const coverUri = t.cover ? 'data:image/jpeg;base64,' + t.cover.toString('base64') : '';
  const hasA = !!audioB64;
  const synced = !!(lyr && lyr.synced);
  const last = lyr && lyr.lines.length ? lyr.lines[lyr.lines.length - 1].t : 0;
  const dur = Math.max(t.dur || 0, last + 5, 1);
  const data = JSON.stringify({ s: synced, d: dur, l: lyr ? lyr.lines : [] }).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '');
  // TP_V6: o áudio fica numa variável JS (base64) e é tocado por dois caminhos: <audio> (via blob) e, se o WhatsApp recusar, Web Audio.
  const js = (hasA ? 'var B64="' + audioB64 + '";' : '')
    + 'var D=__DATA__,S=D.s,DUR=D.d,L=D.l,A=document.getElementById("a"),ly=document.getElementById("ly"),sl=document.getElementById("sl"),pp=document.getElementById("pp"),cu=document.getElementById("cu"),du=document.getElementById("du"),stt=document.getElementById("stt"),cur=-1,els=[],pos=0,run=false,t0=0,ENG=A?"el":"clk",bytes=null,WA={c:null,b:null,s:null,g:null,st:0,off:0,pl:false,loop:false,vol:0.9};'
    + 'function st(m){if(stt)stt.textContent=m||""}'
    + 'function f(s){s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2)}'
    + 'if(A){try{var bin=atob(B64),n=bin.length;bytes=new Uint8Array(n);for(var q=0;q<n;q++)bytes[q]=bin.charCodeAt(q);A.src=URL.createObjectURL(new Blob([bytes],{type:"audio/mpeg"}))}catch(e){ENG="wa";st("modo compatível")}}'
    + 'function waT(){var t=WA.pl?(WA.off+WA.c.currentTime-WA.st):WA.off;return WA.b&&WA.loop&&t>WA.b.duration?t%WA.b.duration:t}'
    + 'function waLoad(cb){if(WA.b){cb();return}try{if(!WA.c){WA.c=new (window.AudioContext||window.webkitAudioContext)();WA.g=WA.c.createGain();WA.g.gain.value=WA.vol;WA.g.connect(WA.c.destination)}try{WA.c.resume()}catch(e){}'
    + 'var ok=function(b){WA.b=b;if(b.duration&&isFinite(b.duration)){DUR=b.duration;du.textContent=f(DUR)}cb()},bad=function(e){st("❌ não consegui decodificar o áudio")};var pr=WA.c.decodeAudioData(bytes.buffer.slice(0),ok,bad);if(pr&&pr.catch)pr.catch(bad)}catch(e){st("❌ sem Web Audio: "+(e&&e.name))}}'
    + 'function waStart(){waLoad(function(){try{WA.c.resume()}catch(e){}var s=WA.c.createBufferSource();s.buffer=WA.b;s.loop=WA.loop;s.connect(WA.g);s.onended=function(){if(WA.s===s&&!WA.loop){WA.pl=false;WA.off=0;pp.textContent="▶"}};s.start(0,Math.min(WA.off,Math.max(0,WA.b.duration-0.05)));WA.s=s;WA.st=WA.c.currentTime;WA.pl=true;pp.textContent="❚❚"})}'
    + 'function waStop(){if(WA.pl){WA.off=waT();WA.pl=false}if(WA.s){var s=WA.s;WA.s=null;s.onended=null;try{s.stop()}catch(e){}}pp.textContent="▶"}'
    + 'function waSeek(p){var was=WA.pl;waStop();WA.off=Math.max(0,Math.min(DUR-0.05,p));if(was)waStart()}'
    + 'function toWA(why,go){if(ENG==="wa")return;ENG="wa";try{A.pause()}catch(e){}st("modo compatível"+(why?" ("+why+")":""));if(go)waStart()}'
    + 'function now(){if(ENG==="el")return A.currentTime||0;if(ENG==="wa")return waT();return run?Math.min(DUR,pos+(Date.now()-t0)/1000):pos}'
    + 'function setPos(p){p=Math.max(0,Math.min(DUR,p));if(ENG==="el"){try{A.currentTime=p}catch(e){}}else if(ENG==="wa")waSeek(p);else{pos=p;t0=Date.now()}tick()}'
    + 'for(var i=0;i<L.length;i++){var d=document.createElement("div");d.className="ln"+(S?"":" pl");d.textContent=L[i].x||(S?"♪":"");(function(i){d.onclick=function(){if(S)setPos(L[i].t)}})(i);ly.appendChild(d);els.push(d)}'
    + 'if(L.length){var sp=document.createElement("div");sp.className="sp";ly.appendChild(sp)}else{ly.innerHTML="<div class=none>Letra não encontrada.</div>"}'
    + 'function hi(t){if(!S)return;var n=-1;for(var i=0;i<L.length;i++){if(L[i].t<=t+0.2)n=i;else break}if(n===cur)return;if(cur>=0&&els[cur])els[cur].classList.remove("on");cur=n;if(n>=0){els[n].classList.add("on");ly.scrollTop=els[n].offsetTop-ly.clientHeight/2+els[n].clientHeight/2}}'
    + 'function tick(){var t=now();if(ENG==="clk"&&run&&t>=DUR){run=false;pos=DUR;pp.textContent="▶"}sl.value=Math.round(t/DUR*1000);cu.textContent=f(t);hi(t)}'
    + 'setInterval(tick,250);'
    + 'if(!S&&!A){var c=document.getElementById("ctl"),b=document.getElementById("bar"),h=document.getElementById("hint");if(c)c.style.display="none";if(b)b.style.display="none";if(h)h.textContent="Letra sem sincronia automática — acompanhe pelo texto."}'
    + 'if(A){A.addEventListener("loadedmetadata",function(){if(ENG==="el"&&A.duration&&isFinite(A.duration)){DUR=A.duration;du.textContent=f(DUR)}});A.addEventListener("play",function(){if(ENG==="el")pp.textContent="❚❚"});A.addEventListener("pause",function(){if(ENG==="el")pp.textContent="▶"});A.addEventListener("ended",function(){if(ENG==="el")pp.textContent="▶"});A.addEventListener("timeupdate",tick);A.addEventListener("error",function(){if(ENG==="el")toWA("player nativo indisponível",false)});A.volume=0.9}'
    + 'pp.onclick=function(){if(ENG==="el"){if(A.paused){var p;try{p=A.play()}catch(e){toWA(e&&e.name,true);return}if(p&&p.catch)p.catch(function(e){toWA(e&&e.name,true)});setTimeout(function(){if(ENG==="el"&&!A.paused&&A.currentTime<=0.01)toWA("sem som",true)},2500)}else A.pause()}'
    + 'else if(ENG==="wa"){if(WA.pl)waStop();else waStart()}else{if(run){pos=now();run=false;pp.textContent="▶"}else{if(pos>=DUR)pos=0;t0=Date.now();run=true;pp.textContent="❚❚"}}tick()};'
    + 'sl.oninput=function(){setPos(sl.value/1000*DUR)};'
    + 'document.getElementById("pv").onclick=function(){setPos(0)};document.getElementById("nx").onclick=function(){setPos(now()+10)};'
    + 'document.getElementById("m5").onclick=function(){setPos(now()-0.5)};document.getElementById("p5").onclick=function(){setPos(now()+0.5)};'
    + 'var rp=document.getElementById("rp");if(rp)rp.onclick=function(){var on=!(A&&A.loop)&&!WA.loop;if(A)A.loop=on;WA.loop=on;if(WA.s)WA.s.loop=on;rp.classList.toggle("on",on)};'
    + 'var vo=document.getElementById("vo");if(vo)vo.oninput=function(){var v=this.value/100;if(A)A.volume=v;WA.vol=v;if(WA.g)WA.g.gain.value=v};tick();';
  const body = '<div class="card"><div class="top"><div class="cv">' + (coverUri ? '<img src="' + coverUri + '">' : '🎵') + '</div>'
    + '<div><div class="brand">' + esc(BOT) + ' Music</div><h2>' + esc(clip(t.title, 50)) + '</h2><div class="art">' + esc(clip(t.artist || 'YouTube', 50)) + '</div></div></div>'
    + '<div class="hint clk" id="hint">▶ Dê play no áudio da conversa e toque em ▶ aqui ao mesmo tempo. Se a letra ficar adiantada ou atrasada, ajuste com −0,5s / +0,5s.</div>'
    + '<div class="bar" id="bar"><input type="range" id="sl" min="0" max="1000" value="0"><div class="tm"><span id="cu">0:00</span><span id="du">' + fmt(dur) + '</span></div></div>'
    + '<div class="ctl" id="ctl"><button class="sm clk" id="m5">−0,5s</button><button id="pv">⏮</button><button class="pp" id="pp">▶</button><button id="nx">⏭</button><button class="sm clk" id="p5">+0,5s</button></div>'
    + '<div class="vol au"><button id="rp">🔁</button><input type="range" id="vo" min="0" max="100" value="90"></div><div id="stt" class="art" style="font-size:11px;margin-top:8px;min-height:14px;text-align:center"></div></div>'
    + '<div class="card"><div class="lh"><div><b>LETRA DA MÚSICA</b><small>' + esc(clip(lyr ? lyr.label : 'Sem letra', 70)) + '</small></div>'
    + '<span class="badge">' + (synced ? 'SINCRONIZADO' : (lyr ? 'SEM SINCRONIA' : 'INDISPONÍVEL')) + '</span></div><div id="ly"></div></div>'
    + (hasA ? '<audio id="a" preload="auto"></audio>' : '');
  return shell(PANEL_CSS, body, { aud: hasA, code: js.replace('__DATA__', function () { return data; }) });
}
TPNEW
node - <<'__TP_PATCH__'
const fs = require('fs');
const f = 'src/commands/utilidades/ytplay3.js';
let s = fs.readFileSync(f, 'utf8');
const a = s.indexOf('function buildHtml(t, lyr, audioB64) {'), b = s.indexOf('/* ---------- painéis de TESTE');
if (a < 0 || b < 0 || b < a) { console.log('❌ marcadores não encontrados'); process.exit(2); }
s = s.slice(0, a) + fs.readFileSync('.tp6.tmp', 'utf8') + '\n' + s.slice(b);
fs.writeFileSync(f, s);
console.log('✔ player atualizado');
__TP_PATCH__
rm -f .tp6.tmp
node --check "$F" || { echo "❌ erro de sintaxe - restaurando"; cp "$F.bak-v5" "$F"; exit 3; }
echo "✅ ytplay3 v6 pronto. Reinicie o bot."
