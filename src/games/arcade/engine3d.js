/* MOTOR 3D (software, canvas 2D) — polígonos com sombreamento plano, neblina e ordenação por profundidade.
   Visual "low-poly 64 bits". x = direita, y = cima, z = frente. yaw 0 olha para +z. */
const Cam = { x: 0, y: 5, z: -10, yaw: 0, pitch: 0, fov: 1.15 };
let FOC = (W / 2) / Math.tan(Cam.fov / 2), CY = 1, SY = 0, CP = 1, SP = 0, AMB = 0.5;
const FOG = { n: 60, f: 220, c: [170, 200, 235] };
const SUN = (() => { const v = [0.45, 0.8, 0.35], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
const Q = [[], [], []];
const hex2 = (h) => { h = h.replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function setFov(f) { Cam.fov = f; FOC = (W / 2) / Math.tan(f / 2); }
function camBegin() { CY = Math.cos(Cam.yaw); SY = Math.sin(Cam.yaw); CP = Math.cos(Cam.pitch); SP = Math.sin(Cam.pitch); }
function cm(x, y, z) {
  const dx = x - Cam.x, dy = y - Cam.y, dz = z - Cam.z, x1 = dx * CY - dz * SY, z1 = dx * SY + dz * CY;
  return [x1, dy * CP - z1 * SP, dy * SP + z1 * CP];
}
function proj(x, y, z) { const c = cm(x, y, z); if (c[2] < 0.2) return null; const s = FOC / c[2]; return [W / 2 + c[0] * s, H / 2 - c[1] * s, s, c[2]]; }
/* polígono: vs = [[x,y,z]...], col = [r,g,b], nrm = normal (opcional), layer 0 chão, 1 sombras, 2 objetos, ds = dupla face */
function poly(vs, col, nrm, layer, ds) {
  let nx, ny, nz;
  if (nrm) { nx = nrm[0]; ny = nrm[1]; nz = nrm[2]; }
  else {
    const a = vs[0], b = vs[1], c = vs[2], ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    nx = uy * vz - uz * vy; ny = uz * vx - ux * vz; nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; ds = true;
  }
  const dot = nx * (Cam.x - vs[0][0]) + ny * (Cam.y - vs[0][1]) + nz * (Cam.z - vs[0][2]);
  if (dot < 0) { if (!ds) return; nx = -nx; ny = -ny; nz = -nz; }
  const L = AMB + (1 - AMB) * Math.max(0, nx * SUN[0] + ny * SUN[1] + nz * SUN[2]);
  let c3 = [], n = vs.length;
  for (let i = 0; i < n; i++) c3.push(cm(vs[i][0], vs[i][1], vs[i][2]));
  const o = [];
  for (let i = 0; i < n; i++) {
    const a = c3[i], b = c3[(i + 1) % n];
    if (a[2] >= 0.2) o.push(a);
    if ((a[2] >= 0.2) !== (b[2] >= 0.2)) { const t = (0.2 - a[2]) / (b[2] - a[2]); o.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.2]); }
  }
  if (o.length < 3) return;
  let d = 0, mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9; const p = [];
  for (let i = 0; i < o.length; i++) { const s = FOC / o[i][2], sx = W / 2 + o[i][0] * s, sy = H / 2 - o[i][1] * s; p.push(sx, sy); d += o[i][2]; if (sx < mnx) mnx = sx; if (sx > mxx) mxx = sx; if (sy < mny) mny = sy; if (sy > mxy) mxy = sy; }
  if (mxx < 0 || mnx > W || mxy < 0 || mny > H) return;
  Q[layer || 2].push({ p: p, d: d / o.length, c: col, l: L });
}
/* sprite 2D posicionado no mundo 3D: fn(sx, sy, escala) */
function sprite(x, y, z, fn, layer) { const c = cm(x, y, z); if (c[2] < 0.3) return; const s = FOC / c[2], sx = W / 2 + c[0] * s, sy = H / 2 - c[1] * s; if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) return; Q[layer || 2].push({ d: c[2], fn: fn, a: sx, b: sy, s: s }); }
function shadow(x, y, z, r) { sprite(x, y + 0.03, z, (sx, sy, s) => { X.fillStyle = 'rgba(0,0,0,.35)'; X.beginPath(); X.ellipse(sx, sy, r * s, r * s * 0.35, 0, 0, 7); X.fill(); }, 1); }
function flush() {
  for (let li = 0; li < 3; li++) {
    const L = Q[li]; L.sort((a, b) => b.d - a.d);
    for (let k = 0; k < L.length; k++) {
      const o = L[k]; if (o.fn) { o.fn(o.a, o.b, o.s); continue; }
      const f = clamp((o.d - FOG.n) / (FOG.f - FOG.n), 0, 1), c = o.c, l = o.l;
      const r = (c[0] * l) * (1 - f) + FOG.c[0] * f, g = (c[1] * l) * (1 - f) + FOG.c[1] * f, b = (c[2] * l) * (1 - f) + FOG.c[2] * f;
      const s = 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
      X.fillStyle = s; X.strokeStyle = s; X.lineWidth = 1; X.beginPath(); X.moveTo(o.p[0], o.p[1]);
      for (let i = 2; i < o.p.length; i += 2) X.lineTo(o.p[i], o.p[i + 1]);
      X.closePath(); X.fill(); X.stroke();
    }
    L.length = 0;
  }
}
function sky(top, bot, gnd) {
  const hy = clamp(H / 2 + Math.tan(Cam.pitch) * FOC, -400, 600), t = hex2(top), b = hex2(bot);
  const g = X.createLinearGradient(0, Math.min(0, hy - 120), 0, Math.max(1, hy)); g.addColorStop(0, top); g.addColorStop(1, bot);
  X.fillStyle = g; X.fillRect(0, 0, W, Math.max(0, hy));
  if (hy < H) { X.fillStyle = gnd || bot; X.fillRect(0, Math.max(0, hy), W, H - Math.max(0, hy)); }
  FOG.c = hex2(gnd || bot);
  return hy;
}
/* primitivas */
function box(cx, cy, cz, w, h, d, col, yaw, layer) {
  yaw = yaw || 0; const c = Math.cos(yaw), s = Math.sin(yaw), hx = w / 2, hz = d / 2;
  const P = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c], N = (x, y, z) => [x * c + z * s, y, -x * s + z * c];
  const v = [P(-hx, 0, -hz), P(hx, 0, -hz), P(hx, 0, hz), P(-hx, 0, hz), P(-hx, h, -hz), P(hx, h, -hz), P(hx, h, hz), P(-hx, h, hz)];
  poly([v[4], v[7], v[6], v[5]], col, [0, 1, 0], layer);
  poly([v[3], v[2], v[6], v[7]], col, N(0, 0, 1), layer);
  poly([v[0], v[4], v[5], v[1]], col, N(0, 0, -1), layer);
  poly([v[1], v[5], v[6], v[2]], col, N(1, 0, 0), layer);
  poly([v[0], v[3], v[7], v[4]], col, N(-1, 0, 0), layer);
}
function cyl(cx, cy, cz, r, h, col, n, r2, layer) {
  n = n || 8; r2 = r2 === undefined ? r : r2;
  for (let i = 0; i < n; i++) {
    const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, am = (a0 + a1) / 2;
    const A = [cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r], B = [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r];
    const C = [cx + Math.cos(a1) * r2, cy + h, cz + Math.sin(a1) * r2], D = [cx + Math.cos(a0) * r2, cy + h, cz + Math.sin(a0) * r2];
    const nn = [Math.cos(am), (r - r2) / (h || 1) * 0.5, Math.sin(am)];
    if (r2 > 0.001) poly([A, B, C, D], col, nn, layer); else poly([A, B, D], col, nn, layer);
    if (r2 > 0.001 && h > 0) poly([[cx, cy + h, cz], D, C], col, [0, 1, 0], layer);
  }
}
function sph(cx, cy, cz, r, col, n, layer) {
  n = n || 6; const rings = [];
  for (let j = 0; j <= n; j++) { const t = j / n * Math.PI, ring = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * 6.2832; ring.push([cx + Math.cos(a) * Math.sin(t) * r, cy + Math.cos(t) * r, cz + Math.sin(a) * Math.sin(t) * r]); } rings.push(ring); }
  for (let j = 0; j < n; j++) for (let i = 0; i < n * 2; i++) { const i2 = (i + 1) % (n * 2); poly([rings[j][i], rings[j][i2], rings[j + 1][i2], rings[j + 1][i]], col, null, layer, true); }
}
/* terreno por função de altura; colfn(x,z,h) -> [r,g,b] */
function terrain(fn, cx, cz, range, step, colfn, layer) {
  const fx = Math.sin(Cam.yaw), fz = Math.cos(Cam.yaw), x0 = Math.floor((cx - range) / step) * step, z0 = Math.floor((cz - range) / step) * step;
  for (let x = x0; x < cx + range; x += step) for (let z = z0; z < cz + range; z += step) {
    const mx = x + step / 2 - Cam.x, mz = z + step / 2 - Cam.z; if (mx * fx + mz * fz < -step * 1.6) continue;
    const a = fn(x, z), b = fn(x + step, z), c = fn(x + step, z + step), d = fn(x, z + step);
    poly([[x, a, z], [x, d, z + step], [x + step, c, z + step], [x + step, b, z]], colfn(x + step / 2, z + step / 2, (a + b + c + d) / 4), null, layer || 0, true);
  }
}
function follow(tx, ty, tz, yaw, dist, hgt, k, look) {
  const gx = tx - Math.sin(yaw) * dist, gz = tz - Math.cos(yaw) * dist, gy = ty + hgt;
  Cam.x += (gx - Cam.x) * k; Cam.y += (gy - Cam.y) * k; Cam.z += (gz - Cam.z) * k;
  const dx = tx - Cam.x, dz = tz - Cam.z; let ty2 = Math.atan2(dx, dz), d = ty2 - Cam.yaw; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832;
  Cam.yaw += d * Math.min(1, k * 1.5);
  Cam.pitch = -Math.atan2(Cam.y - (ty + (look || 1)), Math.hypot(dx, dz));
}
const angd = (a, b) => { let d = a - b; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; };
const D2 = (x1, z1, x2, z2) => Math.hypot(x1 - x2, z1 - z2);
function heartsHud(n, max) { for (let i = 0; i < max; i++) T(i < n ? '♥' : '♡', 8 + i * 11, 4, i < n ? '#ff5a6a' : '#7a4a5a', 12); }
