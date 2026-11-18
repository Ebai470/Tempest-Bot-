/* MOTOR DE CORRIDA 3D — pista fechada, 6 corredores, voltas, posição, itens/turbo (usado por Kart, Hover e Jet ski) */
function raceGame(cfg) {
  const N = 200, C = [], tr = cfg.track, WD = cfg.w, rs = [], hz = [], shells = [], boxes = [], deco = [];
  for (let i = 0; i < N; i++) { const t = i / N * 6.2832, a = tr(t), b = tr(t + 0.012); C.push({ x: a[0], z: a[1], h: Math.atan2(b[0] - a[0], b[1] - a[1]) }); }
  C.forEach((c, i) => { c.nx = -Math.cos(c.h); c.nz = Math.sin(c.h); const d = C[(i + 8) % N]; c.cv = 0; });
  C.forEach((c, i) => { const n = C[(i + 9) % N]; c.cv = Math.abs(angd(n.h, c.h)); });
  let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9; C.forEach((c) => { mnx = Math.min(mnx, c.x); mxx = Math.max(mxx, c.x); mnz = Math.min(mnz, c.z); mxz = Math.max(mxz, c.z); });
  const rnd0 = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < N; i += cfg.theme === 'neon' ? 9 : 3) for (const sd of [-1, 1]) { const c = C[i], o = (WD / 2 + 5 + rnd0() * 9) * sd; deco.push({ x: c.x + c.nx * o, z: c.z + c.nz * o, k: rnd0(), i: i }); }
  for (let i = 25; i < N; i += 50) [-3.5, 0, 3.5].forEach((l) => boxes.push({ i: i, l: l, t: 0 }));
  const PADS = [60, 140];
  const COLS = ['#e8323c', '#2f8cff', '#2ccf6a', '#ffd23c', '#b04cff', '#ff8a2a'], NAMES = ['VOCÊ', 'RAIO', 'LUNA', 'TURBO', 'NINA', 'REX'];
  let st = 'title', cnt = 0, fin = 0, place = 0, shake = 0, msg = '', msgT = 0, tmr = 0;
  function reset() {
    rs.length = 0; hz.length = 0; shells.length = 0; boxes.forEach((b) => b.t = 0);
    for (let k = 0; k <= cfg.nAI; k++) { const i = N - 3 - ((k / 2) | 0) * 3, c = C[i], l = (k % 2 ? 2.4 : -2.4); rs.push({ k: k, y: cfg.theme === 'neon' ? 3 : 0, x: c.x + c.nx * l, z: c.z + c.nz * l, h: c.h, v: 0, vx: 0, vz: 0, idx: i, lat: l, lap: 0, prog: 0, last: i, item: null, spin: 0, bst: 0, mt: 100, hp: 100, skill: 0.9 + rnd0() * 0.12, off: (rnd0() - 0.5) * WD * 0.5, it: 0, fin: 0, col: hex2(COLS[k]) }); }
    cnt = 190; st = 'ready'; fin = 0; Cam.x = rs[0].x - Math.sin(rs[0].h) * 8; Cam.z = rs[0].z - Math.cos(rs[0].h) * 8; Cam.y = 4; Cam.yaw = rs[0].h;
  }
  function near(r) {
    let best = r.idx, bd = 1e9;
    for (let k = -5; k <= 12; k++) { const i = (r.idx + k + N) % N, d = (r.x - C[i].x) ** 2 + (r.z - C[i].z) ** 2; if (d < bd) { bd = d; best = i; } }
    r.last = r.idx; r.idx = best; const c = C[best]; r.lat = (r.x - c.x) * c.nx + (r.z - c.z) * c.nz;
    if (r.last > N * 0.75 && r.idx < N * 0.25) { r.lap++; if (r.k === 0 && r.lap <= cfg.laps) { msg = r.lap === cfg.laps ? 'ÚLTIMA VOLTA!' : 'VOLTA ' + r.lap; msgT = 90; snd(880, 0.15, 'square', 0.05); } }
    else if (r.last < N * 0.25 && r.idx > N * 0.75) r.lap--;
    r.prog = r.lap * N + r.idx + (1 - Math.min(1, Math.hypot(r.x - C[(r.idx + 1) % N].x, r.z - C[(r.idx + 1) % N].z) / 3)) * 0.5;
  }
  function phys(r, steer, thr, boost) {
    const top = cfg.top * (r.bst > 0 ? 1.4 : 1) * (boost ? 1 : 1), off = Math.abs(r.lat) > WD / 2;
    let lim = top; if (off && !cfg.wall) lim = top * cfg.offk;
    if (r.bst > 0) r.bst--;
    if (thr > 0) r.v += cfg.acc * (r.bst > 0 ? 2 : 1) * thr; else r.v -= cfg.drag;
    if (r.v > lim) r.v -= cfg.acc * 2.5; r.v = Math.max(0, r.v);
    if (r.spin > 0) { r.spin--; r.h += 0.3; r.v *= 0.95; }
    else r.h += steer * cfg.turn * (0.3 + 0.7 * Math.min(1, r.v / cfg.top)) * (r.v > 0.02 ? 1 : 0);
    const fx = Math.sin(r.h) * r.v, fz = Math.cos(r.h) * r.v, g = cfg.grip; r.vx += (fx - r.vx) * g; r.vz += (fz - r.vz) * g; r.x += r.vx; r.z += r.vz;
    near(r);
    if (cfg.wall && Math.abs(r.lat) > WD / 2) { const c = C[r.idx], s = Math.sign(r.lat), ex = Math.abs(r.lat) - WD / 2; r.x -= c.nx * s * (ex + 0.05); r.z -= c.nz * s * (ex + 0.05); r.vx *= 0.8; r.vz *= 0.8; r.v *= 0.9; if (r.k === 0 && r.it < 1) { r.hp -= 2 + r.v * 6; r.it = 12; shake = 6; snd(110, 0.1, 'sawtooth', 0.06, 50); } }
    if (!cfg.wall && Math.abs(r.lat) > WD / 2 + 10) { const c = C[r.idx], s = Math.sign(r.lat), ex = Math.abs(r.lat) - WD / 2 - 10; r.x -= c.nx * s * ex; r.z -= c.nz * s * ex; r.v *= 0.9; }
    if (r.it > 0) r.it--;
    PADS.forEach((pi) => { if (Math.abs(r.idx - pi) < 2 && Math.abs(r.lat) < WD / 2 && r.bst < 20) { r.bst = 55; r.mt = Math.min(100, r.mt + 30); if (r.k === 0) snd(500, 0.4, 'sawtooth', 0.06, 1300); } });
  }
  function ai(r, pl) {
    const li = (r.idx + 7) % N, c = C[li], tx = c.x + c.nx * r.off, tz = c.z + c.nz * r.off, dh = angd(Math.atan2(tx - r.x, tz - r.z), r.h);
    const rb = clamp(1 + (pl.prog - r.prog) * 0.0012, 0.88, 1.1), cvs = C[(r.idx + 4) % N].cv;
    r.thrM = cvs > 0.2 && r.v > cfg.top * 0.82 ? 0 : 1; if (cfg.top * r.skill * rb < r.v) r.thrM = 0;
    phys(r, clamp(dh * 2.2, -1, 1), r.thrM, 0);
    if (cfg.items && r.item && frames % 90 === 0) useItem(r); if (!cfg.items && r.mt > 60 && Math.random() < 0.003) { r.bst = 50; r.mt -= 40; }
  }
  function useItem(r) {
    const it = r.item; r.item = null; if (!it) return;
    if (it === 'boost') { r.bst = 80; if (r.k === 0) snd(500, 0.5, 'sawtooth', 0.06, 1400); }
    else if (it === 'banana') hz.push({ x: r.x - Math.sin(r.h) * 2.2, z: r.z - Math.cos(r.h) * 2.2, y: 0 });
    else { const ahead = rs.filter((o) => o !== r && o.prog > r.prog).sort((a, b) => a.prog - b.prog)[0]; shells.push({ x: r.x + Math.sin(r.h) * 2, z: r.z + Math.cos(r.h) * 2, h: r.h, tg: ahead || null, life: 300, own: r }); if (r.k === 0) snd(300, 0.3, 'square', 0.05, 900); }
  }
  function upd() {
    const pl = rs[0];
    if (st === 'title') { if (go()) reset(); return; }
    if (st === 'ready') { cnt--; rs.forEach((r) => near(r)); follow(pl.x, pl.y, pl.z, pl.h, cfg.cam, 2.8, 0.2, 1); if (cnt === 130 || cnt === 70 || cnt === 10) snd(520, 0.2, 'square', 0.05); if (cnt <= 0) { st = 'race'; snd(1040, 0.5, 'square', 0.06); } return; }
    if (msgT > 0) msgT--; if (shake > 0) shake--;
    const racing = st === 'race' || st === 'fin';
    /* jogador */
    if (st === 'race') {
      const steer = (K.r ? 1 : 0) - (K.l ? 1 : 0); let boostOn = 0;
      if (cfg.items) { if (P.b) useItem(pl); } else if (K.b && pl.mt > 0) { boostOn = 1; pl.bst = Math.max(pl.bst, 3); pl.mt = Math.max(0, pl.mt - 1); } else pl.mt = Math.min(100, pl.mt + 0.12);
      phys(pl, steer, K.a || K.u ? 1 : 0, boostOn);
      if (K.d) pl.v = Math.max(0, pl.v - cfg.drag * 3);
      if (pl.hp <= 0) { st = 'wreck'; tmr = 0; place = 0; snd(80, 1, 'sawtooth', 0.08, 30); }
      if (pl.lap > cfg.laps && !pl.fin) { pl.fin = 1; st = 'fin'; tmr = 0; place = 1 + rs.filter((o) => o.k && o.fin).length; snd(784, 0.2, 'square', 0.06); snd(1175, 0.5, 'square', 0.06); saveHi(Math.max(0, 7 - place) * 100 + Math.round(pl.hp)); }
    } else if (st === 'fin' || st === 'wreck') { tmr++; if (st === 'fin') ai(pl, pl); if (tmr > 100 && go()) st = 'title'; }
    rs.forEach((r) => { if (r.k) { if (!r.fin && r.lap > cfg.laps) r.fin = 1; ai(r, pl); } });
    /* colisão entre corredores */
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b = rs[j], d = Math.hypot(a.x - b.x, a.z - b.z); if (d < 1.6 && d > 0.01) { const nx = (a.x - b.x) / d, nz = (a.z - b.z) / d, p = (1.6 - d) / 2; a.x += nx * p; a.z += nz * p; b.x -= nx * p; b.z -= nz * p; if (i === 0 && d < 1.4) { shake = 3; } } }
    /* itens */
    if (cfg.items) {
      boxes.forEach((b) => { if (b.t > 0) { b.t--; return; } const c = C[b.i], bx = c.x + c.nx * b.l, bz = c.z + c.nz * b.l; rs.forEach((r) => { if (!r.item && Math.hypot(r.x - bx, r.z - bz) < 2) { r.item = ['boost', 'banana', 'shell', 'boost'][Math.random() * 4 | 0]; b.t = 300; if (r.k === 0) snd(900, 0.15, 'triangle', 0.06, 1400); } }); });
      hz.forEach((h) => rs.forEach((r) => { if (!h.dead && Math.hypot(r.x - h.x, r.z - h.z) < 1.2) { h.dead = 1; r.spin = 40; if (r.k === 0) { shake = 8; snd(150, 0.4, 'sawtooth', 0.06, 50); } } })); for (let i = hz.length - 1; i >= 0; i--) if (hz[i].dead) hz.splice(i, 1);
      for (let i = shells.length - 1; i >= 0; i--) {
        const s = shells[i]; s.life--; const tg = s.tg; if (tg) { const dh = angd(Math.atan2(tg.x - s.x, tg.z - s.z), s.h); s.h += clamp(dh, -0.12, 0.12); } else { const c = C[near2(s)]; s.h += clamp(angd(c.h, s.h), -0.1, 0.1); }
        s.x += Math.sin(s.h) * cfg.top * 1.5; s.z += Math.cos(s.h) * cfg.top * 1.5;
        let hit = 0; rs.forEach((r) => { if (r !== s.own && Math.hypot(r.x - s.x, r.z - s.z) < 1.5) { r.spin = 60; r.v *= 0.3; hit = 1; if (r.k === 0) { shake = 10; snd(120, 0.5, 'sawtooth', 0.07, 40); } } });
        if (hit || s.life <= 0) shells.splice(i, 1);
      }
    }
    if (st === 'race' || st === 'fin') follow(pl.x, pl.y, pl.z, pl.h, cfg.cam, 2.8, 0.13, 1);
  }
  function near2(s) { let b = 0, bd = 1e9; for (let i = 0; i < N; i += 2) { const d = (s.x - C[i].x) ** 2 + (s.z - C[i].z) ** 2; if (d < bd) { bd = d; b = i; } } return b; }
  const wave = (x, z) => Math.sin(x * 0.18 + frames * 0.05) * 0.35 + Math.cos(z * 0.22 + frames * 0.065) * 0.3;
  function vehicle(r, me) {
    const y0 = cfg.theme === 'water' ? wave(r.x, r.z) + 0.1 : cfg.theme === 'neon' ? 3.05 + Math.sin(frames * 0.2 + r.k) * 0.04 : 0, h = r.h, c = Math.cos(h), s = Math.sin(h), col = r.col, P = (x, z) => [r.x + x * c + z * s, r.z - x * s + z * c];
    const spin = r.spin > 0 ? Math.sin(frames * 0.6) * 0.3 : 0;
    shadow(r.x, y0, r.z, 1.1);
    if (cfg.vehicle === 'kart') {
      [[-0.7, 0.8], [0.7, 0.8], [-0.7, -0.8], [0.7, -0.8]].forEach((w) => { const q = P(w[0], w[1]); box(q[0], y0, q[1], 0.32, 0.5, 0.5, hex2('#222'), h); });
      box(r.x, y0 + 0.2, r.z, 1.3, 0.35, 2.1, col, h); const nose = P(0, 1.1); box(nose[0], y0 + 0.25, nose[1], 0.8, 0.25, 0.5, col, h);
      const sp = P(0, -1.0); box(sp[0], y0 + 0.5, sp[1], 1.4, 0.1, 0.35, hex2('#222'), h); const dr = P(0, -0.1); box(dr[0], y0 + 0.5, dr[1], 0.6, 0.55, 0.5, hex2('#f0f0f0'), h); sph(dr[0], y0 + 1.2, dr[1], 0.32, hex2('#f0c090'), 5); box(dr[0], y0 + 1.38, dr[1], 0.5, 0.18, 0.5, col, h);
    } else if (cfg.vehicle === 'hover') {
      box(r.x, y0 + 0.1, r.z, 1.5, 0.35, 3.0, col, h); const nose = P(0, 1.7); box(nose[0], y0 + 0.12, nose[1], 0.7, 0.22, 1.2, col, h);
      [-1, 1].forEach((k) => { const q = P(k * 0.95, -0.9); box(q[0], y0 + 0.05, q[1], 0.5, 0.6, 1.2, hex2('#222a44'), h); const e = P(k * 0.95, -1.7); sprite(e[0], y0 + 0.3, e[1], (sx, sy, sc) => { X.fillStyle = r.bst > 0 ? '#ffe066' : '#5ac8ff'; X.beginPath(); X.arc(sx, sy, 0.35 * sc, 0, 7); X.fill(); }); });
      const cp = P(0, 0.1); box(cp[0], y0 + 0.45, cp[1], 0.7, 0.3, 1.0, hex2('#9ad8ff'), h);
    } else {
      const tilt = Math.sin(frames * 0.1 + r.k) * 0.05; box(r.x, y0, r.z, 1.1, 0.45, 2.6, col, h); const nose = P(0, 1.5); box(nose[0], y0 + 0.05, nose[1], 0.6, 0.3, 0.9, hex2('#f4f4f4'), h);
      const rd = P(0, -0.2); box(rd[0], y0 + 0.45, rd[1], 0.5, 0.7, 0.4, hex2('#222a44'), h); sph(rd[0], y0 + 1.3, rd[1], 0.28, hex2('#f0c090'), 5);
      const bk = P(0, -1.5); sprite(bk[0], y0 + 0.2, bk[1], (sx, sy, sc) => { X.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 5; i++) { X.fillRect(sx + (i - 2) * 0.35 * sc + Math.sin(frames * 0.5 + i) * 2, sy - ((frames * 3 + i * 7) % 10) * 0.12 * sc, 2, 2); } });
    }
    if (me) { const hx = r.x, hz2 = r.z; }
  }
  function drw() {
    const pl = rs[0] || { x: 0, z: 0, idx: 0, h: 0, k: 0 };
    camBegin();
    X.save(); if (shake > 0) X.translate(rnd(-2, 2), rnd(-2, 2));
    FOG.n = cfg.fogN; FOG.f = cfg.fogF; AMB = cfg.amb; sky(cfg.sky[0], cfg.sky[1], cfg.sky[2]);
    if (cfg.theme === 'neon') for (let i = 0; i < 40; i++) R((i * 97 + Cam.yaw * 60) % W, (i * 53) % 90, 1, 1, '#fff');
    /* chão */
    const gc = hex2(cfg.gnd), gy = cfg.theme === 'neon' ? -30 : cfg.theme === 'water' ? -0.6 : -0.04;
    if (cfg.theme === 'water') terrain((x, z) => wave(x, z), Cam.x + Math.sin(Cam.yaw) * 30, Cam.z + Math.cos(Cam.yaw) * 30, 70, 7, (x, z, h) => [40 + h * 40, 120 + h * 50, 190 + h * 30]);
    else poly([[Cam.x - 500, gy, Cam.z - 500], [Cam.x - 500, gy, Cam.z + 500], [Cam.x + 500, gy, Cam.z + 500], [Cam.x + 500, gy, Cam.z - 500]], gc, [0, 1, 0], 0);
    /* pista */
    const hw = WD / 2, ty = cfg.theme === 'neon' ? 3 : cfg.theme === 'water' ? 0 : 0.02;
    for (let k = -8; k < 46; k++) {
      const i = (pl.idx + k + N * 4) % N, a = C[i], b = C[(i + 1) % N], st2 = (i >> 2) & 1;
      if (cfg.theme !== 'water') {
        const col = cfg.road[st2]; poly([[a.x + a.nx * hw, ty, a.z + a.nz * hw], [b.x + b.nx * hw, ty, b.z + b.nz * hw], [b.x - b.nx * hw, ty, b.z - b.nz * hw], [a.x - a.nx * hw, ty, a.z - a.nz * hw]], col, [0, 1, 0], 0);
        [-1, 1].forEach((s) => { const e = cfg.edge[st2]; poly([[a.x + a.nx * (hw * s), ty + 0.01, a.z + a.nz * hw * s], [b.x + b.nx * hw * s, ty + 0.01, b.z + b.nz * hw * s], [b.x + b.nx * (hw + 1) * s, ty + 0.01, b.z + b.nz * (hw + 1) * s], [a.x + a.nx * (hw + 1) * s, ty + 0.01, a.z + a.nz * (hw + 1) * s]], e, [0, 1, 0], 0, true);
          if (cfg.wall && (i & 1)) box(a.x + a.nx * (hw + 0.5) * s, ty, a.z + a.nz * (hw + 0.5) * s, 1, 0.9, 3.4, cfg.rail, a.h); });
      } else if ((i & 3) === 0) { [-1, 1].forEach((s) => { const bx = a.x + a.nx * hw * s, bz = a.z + a.nz * hw * s, by = wave(bx, bz); sph(bx, by + 0.4, bz, 0.7, (i >> 2) & 1 ? hex2('#ff3a3a') : hex2('#ffffff'), 4); }); }
      if (i === 0) { for (let q = 0; q < 8; q++) { const t0 = -hw + q * hw / 4; poly([[a.x + a.nx * t0, ty + 0.02, a.z + a.nz * t0], [a.x + a.nx * (t0 + hw / 4), ty + 0.02, a.z + a.nz * (t0 + hw / 4)], [a.x + a.nx * (t0 + hw / 4) + Math.sin(a.h) * 1.4, ty + 0.02, a.z + a.nz * (t0 + hw / 4) + Math.cos(a.h) * 1.4], [a.x + a.nx * t0 + Math.sin(a.h) * 1.4, ty + 0.02, a.z + a.nz * t0 + Math.cos(a.h) * 1.4]], q & 1 ? [250, 250, 250] : [20, 20, 20], [0, 1, 0], 0, true); } }
      PADS.forEach((pi) => { if (i === pi) { const ar = [[a.x + a.nx * 2, ty + 0.03, a.z + a.nz * 2], [a.x - a.nx * 2, ty + 0.03, a.z - a.nz * 2], [a.x - a.nx * 2 + Math.sin(a.h) * 5, ty + 0.03, a.z - a.nz * 2 + Math.cos(a.h) * 5], [a.x + a.nx * 2 + Math.sin(a.h) * 5, ty + 0.03, a.z + a.nz * 2 + Math.cos(a.h) * 5]]; poly(ar, (frames >> 3) & 1 ? [255, 230, 60] : [255, 140, 30], [0, 1, 0], 0, true); } });
    }
    /* cenário */
    deco.forEach((d) => {
      const dd = Math.min(Math.abs(d.i - pl.idx), N - Math.abs(d.i - pl.idx)); if (dd > 40) return;
      if (cfg.theme === 'grass') { cyl(d.x, 0, d.z, 0.35, 2, hex2('#8a5a2a'), 5); cyl(d.x, 1.6, d.z, 2 + d.k, 3.4 + d.k * 2, hex2(d.k > 0.5 ? '#2e8b3c' : '#3aa04a'), 6, 0); }
      else if (cfg.theme === 'neon') { box(d.x, -30, d.z, 6 + d.k * 6, 40 + d.k * 60, 6 + d.k * 6, hex2(d.k > 0.5 ? '#2a1a6a' : '#1a2a6a')); box(d.x, 10 + d.k * 40, d.z, 6.2 + d.k * 6, 0.6, 6.2 + d.k * 6, hex2(d.k > 0.5 ? '#ff4ad0' : '#4ae0ff')); }
      else { cyl(d.x, wave(d.x, d.z) - 0.5, d.z, 3 + d.k * 3, 3 + d.k * 4, hex2('#7a6a5a'), 6, 1); }
    });
    if (cfg.items) { boxes.forEach((b) => { if (b.t > 0) return; const c = C[b.i]; if (Math.abs(b.i - pl.idx) > 45 && Math.abs(b.i - pl.idx) < N - 45) return; box(c.x + c.nx * b.l, 0.9 + Math.sin(frames * 0.1) * 0.15, c.z + c.nz * b.l, 0.9, 0.9, 0.9, hex2((frames >> 3) & 1 ? '#ffd23c' : '#ff8a2a'), frames * 0.05); }); hz.forEach((h) => { box(h.x, 0, h.z, 0.7, 0.35, 0.7, hex2('#ffe14a'), 0.4); }); shells.forEach((s) => sph(s.x, 0.6, s.z, 0.45, hex2('#2ccf6a'), 4)); }
    rs.forEach((r) => vehicle(r, r.k === 0));
    flush(); X.restore();
    /* HUD */
    const rk = rs.slice().sort((a, b) => b.prog - a.prog), pos = rk.indexOf(rs[0]) + 1, nn = rs.length;
    if (st !== 'title') {
      T(String(pos), 8, 3, pos === 1 ? '#ffe066' : '#fff', 24); T('/' + nn, 28, 14, '#cfe0ff', 10); T('VOLTA ' + Math.min(cfg.laps, Math.max(1, rs[0].lap)) + '/' + cfg.laps, 8, 30, '#fff', 10);
      T(String(Math.round(rs[0].v * cfg.kmh)), 8, H - 26, '#fff', 18); T('KM/H', 52, H - 16, '#ffe066', 8);
      if (cfg.items) { R(8, H - 48, 22, 18, 'rgba(0,0,0,.5)'); T(rs[0].item ? { boost: '⚡', banana: '🍌', shell: '🐢' }[rs[0].item] : '·', 19, H - 47, '#fff', 14, 'center'); }
      else { R(8, H - 40, 70, 6, '#101426'); R(8, H - 40, 70 * rs[0].mt / 100, 6, rs[0].bst > 0 ? '#ffe066' : '#38e0ff'); T('TURBO', 82, H - 42, '#cfe0ff', 7); if (cfg.wall) { R(8, H - 50, 70, 6, '#101426'); R(8, H - 50, 70 * Math.max(0, rs[0].hp) / 100, 6, rs[0].hp > 30 ? '#38e060' : '#ff4a4a'); T('ESCUDO', 82, H - 52, '#cfe0ff', 7); } }
      const mw = 56, mh = 36, mx = W - mw - 6, my = H - mh - 6, sc = Math.min((mw - 4) / (mxx - mnx), (mh - 4) / (mxz - mnz)); R(mx - 2, my - 2, mw + 4, mh + 4, 'rgba(0,0,0,.45)');
      X.strokeStyle = '#cfe0ff'; X.lineWidth = 1.5; X.beginPath(); C.forEach((c, i) => { const px = mx + 2 + (c.x - mnx) * sc, py = my + mh - 2 - (c.z - mnz) * sc; i ? X.lineTo(px, py) : X.moveTo(px, py); }); X.closePath(); X.stroke();
      rs.forEach((r) => { R(mx + 2 + (r.x - mnx) * sc - 1, my + mh - 2 - (r.z - mnz) * sc - 1, r.k ? 2 : 3, r.k ? 2 : 3, r.k ? COLS[r.k] : '#fff'); });
    }
    if (msgT > 0 && st === 'race') T(msg, W / 2, 34, '#ffe066', 16, 'center');
    if (st === 'ready') T(cnt > 130 ? '3' : cnt > 70 ? '2' : cnt > 10 ? '1' : 'VAI!', W / 2, 50, '#fff', 40, 'center');
    if (st === 'fin') { R(0, 56, W, 90, 'rgba(0,0,0,.72)'); T(place + 'º LUGAR!', W / 2, 66, place === 1 ? '#ffe066' : '#fff', 26, 'center'); T(place === 1 ? 'CAMPEÃO!' : place <= 3 ? 'NO PÓDIO!' : 'BOA CORRIDA!', W / 2, 98, '#cfe0ff', 11, 'center'); if (tmr > 100 && blink()) T('APERTE A', W / 2, 120, '#ffe066', 10, 'center'); }
    if (st === 'wreck') { R(0, 56, W, 80, 'rgba(0,0,0,.72)'); T('DESTRUÍDO!', W / 2, 70, '#ff5a5a', 26, 'center'); if (tmr > 100 && blink()) T('APERTE A', W / 2, 106, '#ffe066', 10, 'center'); }
    if (st === 'title') {
      Cam.yaw += 0.006; const c = C[(frames >> 1) % N]; Cam.x = c.x - Math.sin(c.h) * 10; Cam.z = c.z - Math.cos(c.h) * 10; Cam.y = 4; Cam.yaw = c.h; Cam.pitch = -0.1; pl.idx = (frames >> 1) % N;
      R(0, 34, W, 100, 'rgba(8,10,40,.6)'); T(cfg.name, W / 2, 44, cfg.tc || '#ffe066', 26, 'center'); if (blink()) T('APERTE A OU START', W / 2, 90, '#fff', 12, 'center'); T(cfg.help, W / 2, 112, '#cfe0ff', 8, 'center');
    }
  }
  reset(); st = 'title'; rs.forEach((r) => near(r));
  run({ update: upd, draw: drw });
}
