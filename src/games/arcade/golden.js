/* GOLDEN TEMPEST — FPS de infiltração: elimine os guardas e chegue ao elevador */
const MAP = [
  '####################',
  '#P...#........#...E#',
  '#....#...E....#....#',
  '#....#........#..h.#',
  '#.........##.......#',
  '####.#######.#######',
  '#..E.........E.....#',
  '#...a..............#',
  '#......###..###....#',
  '####.###......###.##',
  '#..........E.......#',
  '#..###..........##.#',
  '#..#h...........#E.#',
  '#..#....####....#..#',
  '#.......#..#....#..#',
  '#...E...#..#....####',
  '#.......#aa#.......#',
  '####.####..####....#',
  '#.................X#',
  '####################'
];
const CS = 2.6, WH = 3.2, MW = 20, MH = MAP.length;
const solid = (cx, cz) => cx < 0 || cz < 0 || cx >= MW || cz >= MH || MAP[cz][cx] === '#' || (MAP[cz][cx] === 'X' && foes > 0);
let st = 'title', px, pz, yaw, hp, ammo, foes, gs = [], pk = [], fire = 0, recoil = 0, flash = 0, hurtF = 0, msg = '', msgT = 0, tmr = 0, kills = 0, bob = 0;
function reset() {
  gs = []; pk = []; foes = 0; kills = 0; hp = 100; ammo = 50; yaw = 0; fire = 0; flash = 0; hurtF = 0;
  for (let z = 0; z < MH; z++) for (let x = 0; x < MW; x++) { const c = MAP[z][x], wx = (x + 0.5) * CS, wz = (z + 0.5) * CS;
    if (c === 'P') { px = wx; pz = wz; yaw = 0.6; } else if (c === 'E') { gs.push({ x: wx, z: wz, hp: 3, a: Math.random() * 6, st: 'idle', sh: 60, ly: wz, lx: wx, dead: 0, t: 0, col: hex2(['#3a4a6a', '#6a3a3a', '#3a5a3a', '#5a4a2a'][gs.length % 4]) }); foes++; }
    else if (c === 'h' || c === 'a') pk.push({ x: wx, z: wz, k: c, got: 0 }); }
  st = 'play'; msg = 'ELIMINE OS GUARDAS'; msgT = 140;
}
function los(x0, z0, x1, z1) { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.35); for (let i = 1; i < n; i++) { const t = i / n; if (solid(Math.floor((x0 + (x1 - x0) * t) / CS), Math.floor((z0 + (z1 - z0) * t) / CS))) return false; } return true; }
function mvE(o, dx, dz, r) { const nx = o.x + dx, nz = o.z + dz; if (!solid(Math.floor((nx + Math.sign(dx) * r) / CS), Math.floor(o.z / CS)) && !solid(Math.floor((nx + Math.sign(dx) * r) / CS), Math.floor((o.z + r) / CS)) && !solid(Math.floor((nx + Math.sign(dx) * r) / CS), Math.floor((o.z - r) / CS))) o.x = nx; if (!solid(Math.floor(o.x / CS), Math.floor((nz + Math.sign(dz) * r) / CS)) && !solid(Math.floor((o.x + r) / CS), Math.floor((nz + Math.sign(dz) * r) / CS)) && !solid(Math.floor((o.x - r) / CS), Math.floor((nz + Math.sign(dz) * r) / CS))) o.z = nz; }
function upd() {
  if (st === 'title') { if (go()) reset(); return; }
  if (st === 'over' || st === 'win') { if (++tmr > 70 && go()) st = 'title'; return; }
  if (msgT > 0) msgT--; if (recoil > 0) recoil--; if (flash > 0) flash--; if (hurtF > 0) hurtF--;
  const turn = (K.r ? 1 : 0) - (K.l ? 1 : 0), fw = (K.u ? 1 : 0) - (K.d ? 1 : 0);
  let mx = 0, mz = 0;
  if (K.b) { mx += Math.cos(yaw) * turn * 0.07; mz -= Math.sin(yaw) * turn * 0.07; } else yaw += turn * 0.045;
  mx += Math.sin(yaw) * fw * 0.075; mz += Math.cos(yaw) * fw * 0.075; if (fw || (K.b && turn)) bob += 0.2;
  mvE({ get x() { return px; }, set x(v) { px = v; }, get z() { return pz; }, set z(v) { pz = v; } }, mx, mz, 0.4);
  fire--; if (K.a && fire <= 0 && ammo > 0) {
    fire = 13; ammo--; recoil = 8; flash = 3; snd(120, 0.1, 'sawtooth', 0.07, 40); snd(900, 0.04, 'square', 0.04, 200);
    let best = null, bd = 1e9; gs.forEach((g) => { if (g.dead) return; const dx = g.x - px, dz = g.z - pz, d = dx * Math.sin(yaw) + dz * Math.cos(yaw), l = Math.abs(dx * Math.cos(yaw) - dz * Math.sin(yaw)); if (d > 0.4 && l < 0.6 && d < bd && los(px, pz, g.x, g.z)) { bd = d; best = g; } });
    if (best) { best.hp--; best.st = 'fight'; best.lx = px; best.lz = pz; snd(200, 0.1, 'square', 0.05, 80); if (best.hp <= 0) { best.dead = 1; foes--; kills++; snd(100, 0.4, 'sawtooth', 0.06, 40); if (foes === 0) { msg = 'ELEVADOR LIBERADO!'; msgT = 160; snd(660, 0.5, 'triangle', 0.06, 1320); } } }
  } else if (K.a && fire <= 0 && ammo <= 0) { fire = 20; snd(100, 0.05, 'square', 0.03); }
  gs.forEach((g) => {
    if (g.dead) { g.t++; return; }
    const dx = px - g.x, dz = pz - g.z, d = Math.hypot(dx, dz), see = d < 16 && los(g.x, g.z, px, pz);
    if (see) { if (g.st === 'idle') { g.st = 'fight'; snd(300, 0.1, 'square', 0.04, 200); } g.lx = px; g.lz = pz; }
    if (g.st === 'fight') {
      g.a = Math.atan2(dx, dz);
      if (see) { if (d > 7) mvE(g, Math.sin(g.a) * 0.045, Math.cos(g.a) * 0.045, 0.4); else if (d < 4) mvE(g, -Math.sin(g.a) * 0.03, -Math.cos(g.a) * 0.03, 0.4); else mvE(g, Math.cos(g.a) * Math.sin(frames * 0.03 + g.sh) * 0.04, -Math.sin(g.a) * Math.sin(frames * 0.03 + g.sh) * 0.04, 0.4);
        if (--g.sh <= 0) { g.sh = 55 + (Math.random() * 45 | 0); g.fl = 4; snd(160, 0.08, 'square', 0.05, 60); if (Math.random() < clamp(0.62 - d * 0.03, 0.15, 0.6)) { hp -= 7; hurtF = 14; snd(90, 0.2, 'sawtooth', 0.07, 40); if (hp <= 0) { hp = 0; st = 'over'; tmr = 0; saveHi(kills * 100 + ammo); } } } }
      else { const ex = g.lx - g.x, ez = g.lz - g.z, ed = Math.hypot(ex, ez); if (ed > 1) mvE(g, ex / ed * 0.045, ez / ed * 0.045, 0.4); }
      if (g.fl > 0) g.fl--;
    }
  });
  pk.forEach((p) => { if (!p.got && Math.hypot(p.x - px, p.z - pz) < 1.1) { if (p.k === 'h' && hp < 100) { p.got = 1; hp = Math.min(100, hp + 35); snd(700, 0.15, 'triangle', 0.05, 1200); } else if (p.k === 'a') { p.got = 1; ammo += 20; snd(500, 0.1, 'square', 0.04, 900); } } });
  if (foes === 0 && MAP[Math.floor(pz / CS)][Math.floor(px / CS)] === 'X') { st = 'win'; tmr = 0; saveHi(kills * 100 + ammo + hp * 10); snd(784, 0.8, 'square', 0.07, 1500); }
}
function face(x0, z0, x1, z1, nx, nz, col) { poly([[x0, 0, z0], [x1, 0, z1], [x1, WH, z1], [x0, WH, z0]], col, [nx, 0, nz], 2); }
function drw() {
  camBegin(); R(0, 0, W, H, '#14161e'); FOG.n = 8; FOG.f = 28; FOG.c = [20, 22, 30]; AMB = 0.45;
  Cam.x = px; Cam.z = pz; Cam.y = 1.55 + Math.sin(bob) * 0.04; Cam.yaw = yaw; Cam.pitch = 0;
  poly([[px - 60, 0, pz - 60], [px - 60, 0, pz + 60], [px + 60, 0, pz + 60], [px + 60, 0, pz - 60]], [86, 90, 98], [0, 1, 0], 0);
  poly([[px - 60, WH, pz - 60], [px - 60, WH, pz + 60], [px + 60, WH, pz + 60], [px + 60, WH, pz - 60]], [58, 62, 74], [0, -1, 0], 0);
  const cx0 = Math.floor(px / CS), cz0 = Math.floor(pz / CS), fx = Math.sin(yaw), fz = Math.cos(yaw);
  for (let z = Math.max(0, cz0 - 11); z < Math.min(MH, cz0 + 12); z++) for (let x = Math.max(0, cx0 - 11); x < Math.min(MW, cx0 + 12); x++) {
    const c = MAP[z][x]; if (c !== '#' && !(c === 'X')) continue; const dx = (x + 0.5) * CS - px, dz = (z + 0.5) * CS - pz; if (dx * fx + dz * fz < -CS * 1.5 && dx * dx + dz * dz > 9) continue;
    const x0 = x * CS, z0 = z * CS, x1 = x0 + CS, z1 = z0 + CS, v = ((x * 7 + z * 13) % 3), col = c === 'X' ? (foes ? [200, 60, 60] : [60, 200, 90]) : v === 0 ? [140, 146, 160] : v === 1 ? [126, 134, 150] : [150, 150, 140];
    if (z > 0 && MAP[z - 1][x] !== '#') face(x0, z0, x1, z0, 0, -1, col); if (z < MH - 1 && MAP[z + 1][x] !== '#') face(x0, z1, x1, z1, 0, 1, col);
    if (x > 0 && MAP[z][x - 1] !== '#') face(x0, z0, x0, z1, -1, 0, col); if (x < MW - 1 && MAP[z][x + 1] !== '#') face(x1, z0, x1, z1, 1, 0, col);
  }
  pk.forEach((p) => { if (p.got) return; if (p.k === 'h') { box(p.x, 0.3, p.z, 0.5, 0.35, 0.5, hex2('#f4f4f4'), frames * 0.03); box(p.x, 0.5, p.z, 0.4, 0.05, 0.12, hex2('#e02a2a'), frames * 0.03); } else box(p.x, 0.2, p.z, 0.5, 0.3, 0.35, hex2('#4a7a3a'), frames * 0.03); });
  gs.forEach((g) => {
    if (g.dead) { if (g.t < 200) { box(g.x, 0, g.z, 1.4, 0.35, 0.6, g.col, g.a); box(g.x + Math.sin(g.a) * 0.9, 0, g.z + Math.cos(g.a) * 0.9, 0.4, 0.3, 0.4, hex2('#e0b090'), g.a); } return; }
    const w = Math.sin(frames * 0.25 + g.sh) * (g.st === 'fight' ? 0.18 : 0), c = Math.cos(g.a), s = Math.sin(g.a), P = (xx, zz) => [g.x + xx * c + zz * s, g.z - xx * s + zz * c];
    [-1, 1].forEach((k) => { const q = P(k * 0.2, k * w); box(q[0], 0, q[1], 0.28, 0.8, 0.3, hex2('#1a1a24'), g.a); });
    box(g.x, 0.8, g.z, 0.8, 0.85, 0.42, g.col, g.a); sph(g.x, 1.95, g.z, 0.26, hex2('#e0b090'), 5); box(g.x, 2.05, g.z, 0.5, 0.18, 0.5, hex2('#222'), g.a);
    const gu = P(0.5, 0.35); box(gu[0], 1.25, gu[1], 0.14, 0.14, 0.7, hex2('#222'), g.a); const arm = P(-0.5, 0); box(arm[0], 1.0, arm[1], 0.18, 0.6, 0.2, g.col, g.a);
    if (g.fl > 0) sprite(gu[0] + Math.sin(g.a) * 0.4, 1.25, gu[1] + Math.cos(g.a) * 0.4, (a, b, sc) => { X.fillStyle = '#ffe066'; X.beginPath(); X.arc(a, b, 0.3 * sc, 0, 7); X.fill(); });
  });
  flush();
  /* arma */
  const rc = recoil * 1.5, bx = W / 2 + 40 + Math.sin(bob) * 2, by = H - 8 + rc + Math.abs(Math.cos(bob)) * 1.5;
  R(bx - 8, by - 36 + rc * 0.3, 12, 36, '#2a2d38'); R(bx - 9, by - 40 + rc * 0.3, 14, 12, '#4a4f60'); R(bx - 6, by - 38 + rc * 0.3, 3, 8, '#7a8098'); R(bx - 12, by - 14, 20, 16, '#c08a60'); R(bx - 4, by - 22, 8, 10, '#2a2d38');
  if (flash > 0) { X.fillStyle = '#ffe066'; X.beginPath(); X.arc(bx - 2, by - 46, 9, 0, 7); X.fill(); X.fillStyle = '#fff'; X.beginPath(); X.arc(bx - 2, by - 46, 4, 0, 7); X.fill(); }
  R(W / 2 - 5, H / 2, 4, 1, '#fff'); R(W / 2 + 2, H / 2, 4, 1, '#fff'); R(W / 2, H / 2 - 5, 1, 4, '#fff'); R(W / 2, H / 2 + 2, 1, 4, '#fff');
  if (hurtF > 0) { R(0, 0, W, H, 'rgba(220,0,0,' + hurtF / 40 + ')'); }
  if (st !== 'title') { R(8, 6, 80, 8, '#101426'); R(8, 6, 80 * hp / 100, 8, hp > 35 ? '#38e060' : '#ff4a4a'); T('SAÚDE', 8, 16, '#cfe0ff', 7); T('MUNIÇÃO ' + ammo, 8, H - 14, ammo ? '#ffe066' : '#ff5a5a', 9); T('ALVOS ' + foes, 112, 6, '#ff8a8a', 9);
    const mw = 40, mh = 40, ox = W - mw - 4, oy = H - mh - 4, sc = mw / (MW * CS); R(ox - 1, oy - 1, mw + 2, mh + 2, 'rgba(0,0,0,.5)'); for (let z = 0; z < MH; z++) for (let x = 0; x < MW; x++) if (MAP[z][x] === '#') R(ox + x * CS * sc, oy + z * CS * sc, CS * sc + 0.5, CS * sc + 0.5, 'rgba(160,170,200,.6)'); gs.forEach((g) => { if (!g.dead) R(ox + g.x * sc - 1, oy + g.z * sc - 1, 2, 2, '#ff5a5a'); }); R(ox + px * sc - 1, oy + pz * sc - 1, 3, 3, '#5aff9a'); }
  if (msgT > 0) T(msg, W / 2, 34, '#ffe066', 13, 'center');
  if (st === 'title') { R(0, 40, W, 100, 'rgba(8,10,20,.65)'); T('GOLDEN TEMPEST', W / 2, 50, '#ffd23c', 24, 'center'); if (blink()) T('APERTE A OU START', W / 2, 92, '#fff', 12, 'center'); T('← → gira • ↑ ↓ anda • A atira • B + ← → desliza', W / 2, 114, '#cfe0ff', 8, 'center'); T('elimine todos os guardas e vá ao elevador verde', W / 2, 125, '#cfe0ff', 8, 'center'); }
  if (st === 'over') { R(0, 66, W, 76, 'rgba(0,0,0,.7)'); T('MISSÃO FALHOU', W / 2, 78, '#ff5a5a', 20, 'center'); T('GUARDAS ELIMINADOS ' + kills, W / 2, 106, '#fff', 10, 'center'); if (tmr > 70 && blink()) T('APERTE A', W / 2, 122, '#ffe066', 10, 'center'); }
  if (st === 'win') { R(0, 66, W, 76, 'rgba(0,0,0,.7)'); T('MISSÃO CUMPRIDA!', W / 2, 78, '#5aff9a', 20, 'center'); T('SAÚDE ' + hp + '  MUNIÇÃO ' + ammo, W / 2, 106, '#fff', 10, 'center'); if (tmr > 70 && blink()) T('APERTE A', W / 2, 122, '#ffe066', 10, 'center'); }
}
px = 5; pz = 5; yaw = 0; hp = 100; ammo = 0; foes = 0; run({ update: upd, draw: drw });
