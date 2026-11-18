/* ENGINE ARCADE 16:9 — roda DENTRO do painel HTML (navegador do WhatsApp).
   Tela interna 384x216 (16:9), ampliada pelo CSS. Loop em 60 fps com passo fixo. */
const $ = (id) => document.getElementById(id);
const cv = $('c'), X = cv.getContext('2d'), W = 384, H = 216;
cv.width = W; cv.height = H; X.imageSmoothingEnabled = false;
const K = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, s: 0 }, P = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, s: 0 };
let AC = null, muted = false, paused = false, frames = 0, G = null;

/* ---------- som (bips estilo 8/16 bits) ---------- */
function snd(f, d, t, v, f2) {
  if (muted || !AC) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain(), n = AC.currentTime;
    o.type = t || 'square'; o.frequency.setValueAtTime(f, n);
    if (f2) o.frequency.linearRampToValueAtTime(f2, n + d);
    g.gain.setValueAtTime(v || 0.04, n); g.gain.linearRampToValueAtTime(0, n + d);
    o.connect(g); g.connect(AC.destination); o.start(n); o.stop(n + d);
  } catch (e) {}
}
function setKey(k, v) {
  v = v ? 1 : 0;
  if (v && !K[k]) P[k] = 1;
  K[k] = v;
  document.querySelectorAll('[data-k="' + k + '"],[data-v="' + k + '"]').forEach((el) => el.classList.toggle('on', !!v));
  if (v && !AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.resume) AC.resume(); } catch (e) {} }
}

/* ---------- controles de toque ---------- */
document.querySelectorAll('.bt').forEach((el) => {
  const k = el.dataset.k;
  const dn = (e) => { e.preventDefault(); setKey(k, 1); };
  const up = (e) => { e.preventDefault(); setKey(k, 0); };
  el.addEventListener('pointerdown', dn); el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
});
const dp = $('dp'); let dpid = null;
function dpSet(e) {
  const r = dp.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), t = r.width * 0.13;
  setKey('l', dx < -t); setKey('r', dx > t); setKey('u', dy < -t); setKey('d', dy > t);
}
dp.addEventListener('pointerdown', (e) => { e.preventDefault(); dpid = e.pointerId; try { dp.setPointerCapture(e.pointerId); } catch (_) {} dpSet(e); });
dp.addEventListener('pointermove', (e) => { if (e.pointerId === dpid) { e.preventDefault(); dpSet(e); } });
const dpUp = (e) => { if (e.pointerId === dpid) { dpid = null; ['l', 'r', 'u', 'd'].forEach((k) => setKey(k, 0)); } };
dp.addEventListener('pointerup', dpUp); dp.addEventListener('pointercancel', dpUp);
dp.addEventListener('contextmenu', (e) => e.preventDefault());

/* ---------- teclado (WhatsApp Web / PC) ---------- */
const KM = { ArrowLeft: 'l', a: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'u', w: 'u', ArrowDown: 'd', s: 'd', z: 'a', ' ': 'a', j: 'a', x: 'b', k: 'b', Enter: 's' };
addEventListener('keydown', (e) => { const k = KM[e.key.length > 1 ? e.key : e.key.toLowerCase()]; if (k) { e.preventDefault(); setKey(k, 1); } });
addEventListener('keyup', (e) => { const k = KM[e.key.length > 1 ? e.key : e.key.toLowerCase()]; if (k) { e.preventDefault(); setKey(k, 0); } });

$('pz').onclick = () => { paused = !paused; $('pz').textContent = paused ? '▶' : '⏸'; };
$('mu').onclick = () => { muted = !muted; $('mu').textContent = muted ? '🔇' : '🔊'; };

/* ---------- desenho ---------- */
const R = (x, y, w, h, c) => { X.fillStyle = c; X.fillRect(x | 0, y | 0, w | 0, h | 0); };
const CI = (x, y, r, c) => { X.fillStyle = c; X.beginPath(); X.arc(x, y, r, 0, 7); X.fill(); };
const T = (s, x, y, c, sz, al) => {
  X.font = 'bold ' + (sz || 10) + 'px monospace'; X.textAlign = al || 'left'; X.textBaseline = 'top';
  X.fillStyle = '#000'; X.fillText(s, (x | 0) + 1, (y | 0) + 1); X.fillStyle = c || '#fff'; X.fillText(s, x | 0, y | 0);
};
const GR = (y0, y1, c0, c1, x0, w) => { const g = X.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); X.fillStyle = g; X.fillRect(x0 || 0, y0, w || W, y1 - y0); };
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const blink = (n) => ((frames / (n || 28)) | 0) & 1;
const go = () => P.a || P.s;

/* ---------- recorde (guardado quando o aparelho permite) ---------- */
let hi = 0; try { hi = +localStorage.getItem('tmp_hi_' + GID) || 0; } catch (e) {}
function saveHi(s) { if (s > hi) { hi = s; try { localStorage.setItem('tmp_hi_' + GID, String(hi)); } catch (e) {} } }
const pad6 = (n) => String(Math.max(0, n | 0)).padStart(6, '0');

/* ---------- loop de 60 passos por segundo ---------- */
function run(g) {
  G = g; let last = 0, acc = 0; const DT = 1000 / 60;
  const step = (t) => {
    const dt = Math.min(100, t - last || 16); last = t;
    if (!paused) { acc += dt; let n = 0; while (acc >= DT && n++ < 5) { G.update(); frames++; for (const k in P) P[k] = 0; acc -= DT; } if (n >= 5) acc = 0; }
    else for (const k in P) P[k] = 0;
    G.draw();
    if (paused) { R(0, 88, W, 40, 'rgba(0,0,0,.65)'); T('PAUSADO', W / 2, 102, '#ffe066', 16, 'center'); }
    (window.requestAnimationFrame || ((f) => setTimeout(() => f(Date.now()), 16)))(step);
  };
  step(0);
}
