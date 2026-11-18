/* HYPER RACER — corrida futurista de hovercrafts em pista suspensa (turbo gasta energia, paredes machucam) */
raceGame({ name: 'HYPER RACER', tc: '#4ae0ff', theme: 'neon', vehicle: 'hover', laps: 3, nAI: 5, w: 15, items: false, wall: true, offk: 1, top: 1.05, acc: 0.028, drag: 0.006, turn: 0.05, grip: 0.14, cam: 7.5, kmh: 420,
  track: (t) => [90 * Math.cos(t) + 22 * Math.cos(3 * t), 62 * Math.sin(t) + 16 * Math.sin(2 * t + 0.5)],
  sky: ['#08021e', '#4a1a7a', '#1a0a3a'], gnd: '#1a0a3a', fogN: 60, fogF: 260, amb: 0.62, road: [hex2('#4a5290'), hex2('#3e4580')], edge: [hex2('#ff3ad0'), hex2('#3ae0ff')], rail: hex2('#6a5aff'),
  help: '← → dirige • A acelera • B turbo (gasta a barra) • não bata nas paredes' });
