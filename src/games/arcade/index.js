'use strict';
// Monta o painel HTML 16:9 de cada jogo (tela + controles de toque) para a mensagem interativa.
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const ALL = [
  { id: 'superbros', cmd: 'superbros', k: '2d', emoji: '🍄', name: 'Super Tempest Bros', tag: 'Plataforma', desc: 'Corra, pule e pise nos inimigos até a bandeira', a: 'PULAR', b: 'CORRER', how: 'B corre • A pula mais alto se segurar' },
  { id: 'bluedash', cmd: 'bluedash', k: '2d', emoji: '💨', name: 'Blue Dash', tag: 'Velocidade', desc: 'Corra, junte anéis e destrua robôs', a: 'PULAR', b: 'ROLAR', how: 'A pula • B (ou ↓) rola e destrói robôs' },
  { id: 'streetfury', cmd: 'streetfury', k: '2d', emoji: '🥊', name: 'Street Fury', tag: 'Luta', desc: 'Luta 1x1 contra a máquina, melhor de 3', a: 'SOCO', b: 'CHUTE', how: '← → anda • ↑ pula • de costas defende' },
  { id: 'sunsetdrive', cmd: 'sunsetdrive', k: '2d', emoji: '🏎️', name: 'Sunset Drive', tag: 'Corrida 3D', desc: 'Corrida ao pôr do sol contra o relógio', a: 'ACELERA', b: 'FREIO', how: 'Segure A para acelerar • ← → dirige' },
  { id: 'gemstack', cmd: 'gemstack', k: '2d', emoji: '💎', name: 'Gem Stack', tag: 'Quebra-cabeça', desc: 'Alinhe 3 gemas iguais e faça combos', a: 'GIRAR', b: 'GIRAR', how: '← → move • ↓ desce • A/B giram' },
  { id: 't64', cmd: 'tempest64', k: '3d', lib: [], emoji: '⭐', name: 'Tempest 64', tag: 'Plataforma 3D', desc: 'Colete 5 estrelas numa ilha flutuante', a: 'PULAR', b: 'ATAQUE', how: '← → gira • ↑ corre • A pula (combo de 3)' },
  { id: 'kart', cmd: 'kart64', k: '3d', lib: ['race'], emoji: '🏁', name: 'Tempest Kart', tag: 'Kart 3D', desc: 'Campeonato de kart com 5 rivais e itens', a: 'ACELERA', b: 'ITEM', how: '← → dirige • A acelera • B usa item' },
  { id: 'hyper', cmd: 'hyper64', k: '3d', lib: ['race'], emoji: '🚀', name: 'Hyper Racer', tag: 'Hovercraft', desc: 'Corrida futurista em pista suspensa', a: 'ACELERA', b: 'TURBO', how: '← → dirige • A acelera • B turbo (gasta energia)' },
  { id: 'jet', cmd: 'jetski64', k: '3d', lib: ['race'], emoji: '🌊', name: 'Jet Rider', tag: 'Jet ski 3D', desc: 'Passe entre as boias nas ondas', a: 'ACELERA', b: 'TURBO', how: '← → dirige • A acelera • B turbo' },
  { id: 'starsh', cmd: 'startempest', k: '3d', lib: [], emoji: '🛩️', name: 'Star Tempest', tag: 'Tiro 3D', desc: 'Nave nos trilhos: lasers, bombas e chefão', a: 'LASER', b: 'BOMBA', how: 'D-pad move a nave • A atira • B bomba' },
  { id: 'golden', cmd: 'goldentempest', k: '3d', lib: [], emoji: '🔫', name: 'Golden Tempest', tag: 'FPS', desc: 'Infiltre a base e elimine os guardas', a: 'ATIRAR', b: 'LADO', how: '← → gira • ↑↓ anda • B+← → desliza' },
  { id: 'pilot', cmd: 'skypilot', k: '3d', lib: [], emoji: '✈️', name: 'Sky Pilot', tag: 'Voo 3D', desc: 'Voe pelos anéis contra o relógio', a: 'TURBO', b: 'FREIO', how: '↑↓ nariz • ← → inclina • A turbo' },
  { id: 'snow', cmd: 'snowrush', k: '3d', lib: [], emoji: '🏂', name: 'Snow Rush', tag: 'Snowboard 3D', desc: 'Desça a montanha desviando das árvores', a: 'MANOBRA', b: 'FREIO', how: '← → curva • A pula e faz manobra' },
  { id: 'golf', cmd: 'golf64', k: '3d', lib: [], emoji: '⛳', name: 'Golf Tempest', tag: 'Mini golfe 3D', desc: '3 buracos com obstáculos e moinho', a: 'TACADA', b: 'CÂMERA', how: '← → mira • segure A e solte para bater' },
  { id: 'hero', cmd: 'heroz', k: '3d', lib: [], emoji: '🗡️', name: 'Hero Z', tag: 'Ação 3D', desc: 'Espada, escudo e mira em alvo estilo Z', a: 'ESPADA', b: 'ESCUDO', how: '← → circula o alvo • A ataca • B defende' }
];
const dir = __dirname;
const GAMES = ALL.filter((g) => fs.existsSync(path.join(dir, g.id + '.js')));

/* Minificação segura: tira comentários, indentação, espaços em volta de pontuação. Mantém as quebras de linha. */
function minify(src) {
  let out = '', i = 0, n = src.length, q = null;
  const P = '{}()[];,:?=<>&|*%!';
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (q) { out += c; if (c === '\\') { out += d; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    out += c; i++;
  }
  return out.split('\n').map((l) => l.trim().replace(/[ \t]{2,}/g, ' ')).filter(Boolean).map((l) => {
    let r = '', qq = null;
    for (let k = 0; k < l.length; k++) {
      const c = l[k];
      if (qq) { r += c; if (c === '\\') { r += l[++k] || ''; continue; } if (c === qq) qq = null; continue; }
      if (c === '"' || c === "'" || c === '`') { qq = c; r += c; continue; }
      if (c === ' ') { const a = r[r.length - 1], b = l[k + 1]; if ((a && P.includes(a)) || (b && P.includes(b))) continue; }
      r += c;
    }
    return r;
  }).join('\n');
}
const read = (f) => minify(fs.readFileSync(path.join(dir, f), 'utf8'));
const CSS = `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
#scr,#dp,.bt{touch-action:none}
html,body{margin:0;background:#0a0c14;color:#fff;font-family:Arial,sans-serif;overflow-x:hidden}
#app{max-width:520px;margin:0 auto;padding:4px 6px 8px;display:block}
#scr{position:relative;width:88%;margin:0 auto;aspect-ratio:16/9;background:#000;border-radius:10px;overflow:hidden;border:2px solid #2d3656}
#c{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.tb{position:absolute;top:3px;right:4px;display:flex;gap:4px;z-index:3}
.tb button{width:26px;height:22px;border:0;border-radius:7px;background:rgba(0,0,0,.45);color:#fff;font-size:12px;padding:0}
#pad{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:14px}
#dp{position:relative;width:120px;height:120px;border-radius:50%;background:radial-gradient(#2a3555,#161c30);border:2px solid #3b4a74;flex:none}
#dp i{position:absolute;color:#aab8e8;font-style:normal;font-size:22px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px}
#dp i.on{background:#5144a4;color:#fff}
#dp .u{left:40px;top:3px}#dp .d{left:40px;bottom:3px}#dp .l{left:3px;top:40px}#dp .r{right:3px;top:40px}
.mid{display:flex;flex-direction:column;align-items:center;gap:5px;font-size:9px;line-height:1.15;color:#8fa0cf;text-align:center;flex:1}
.mid .bt{width:72px;height:28px;border-radius:14px;background:#26304a;border:1px solid #46557c;color:#dfe8ff;font-size:11px;font-weight:bold;display:flex;align-items:center;justify-content:center}
.mid .bt.on{background:#5144a4}
.ab{display:flex;gap:8px;align-items:flex-end;flex:none}
.ab .bt{width:64px;height:64px;border-radius:50%;background:radial-gradient(#e0475e,#a01c38);border:2px solid #ff93a5;color:#fff;font-weight:bold;font-size:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}
.ab .bt.b{background:radial-gradient(#3f7be0,#1f3f96);border-color:#93b8ff;margin-bottom:28px}
.ab .bt small{font-size:8px;opacity:.85;font-weight:normal}
.ab .bt.on{filter:brightness(1.4);transform:scale(.94)}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function buildHtml(id) {
  const g = GAMES.find((x) => x.id === id);
  if (!g) return null;
  const body = '<div id="app"><div id="scr"><canvas id="c"></canvas><div class="tb"><button id="mu">🔊</button><button id="pz">⏸</button></div></div>'
    + '<div id="pad"><div id="dp"><i class="u" data-v="u">▲</i><i class="d" data-v="d">▼</i><i class="l" data-v="l">◀</i><i class="r" data-v="r">▶</i></div>'
    + '<div class="mid"><div class="bt" data-k="s">START</div><div>' + esc(g.how) + '</div></div>'
    + '<div class="ab"><div class="bt b" data-k="b">B<small>' + esc(g.b) + '</small></div><div class="bt" data-k="a">A<small>' + esc(g.a) + '</small></div></div></div></div>';
  let script = 'document.head.insertAdjacentHTML("beforeend",' + JSON.stringify('<style>' + CSS.replace(/\n/g, '') + '</style>') + ');document.body.insertAdjacentHTML("afterbegin",' + JSON.stringify(body) + ');\nconst GID=' + JSON.stringify(id) + ';\n' + read('engine.js');
  if (g.k === '3d') script += '\n' + read('engine3d.js');
  (g.lib || []).forEach((l) => { script += '\n' + read(l + '.js'); });
  script += '\n' + read(id + '.js');
  // O código do jogo vai comprimido (deflate) e é descompactado dentro do painel: a mensagem fica ~3x menor.
  const z = zlib.deflateRawSync(Buffer.from(script, 'utf8'), { level: 9 }).toString('base64');
  const boot = 'try{' + fs.readFileSync(path.join(dir, 'inflate.min.js'), 'utf8').replace(/\n/g, '') + 'const b=atob("' + z + '"),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);const s=document.createElement("script");s.textContent=new TextDecoder().decode(inflate(u));document.body.appendChild(s);var l=document.getElementById("ld");if(l)l.remove()}catch(e){document.body.insertAdjacentHTML("afterbegin","<p style=\'color:#fff;padding:8px\'>Erro ao abrir o jogo: "+e+"</p>")}';
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"></head><body><div id="ld" style="color:#9ab;font:13px monospace;padding:10px">Carregando jogo...</div><script>' + boot + '</script></body></html>';
}

module.exports = { GAMES, buildHtml, minify };
