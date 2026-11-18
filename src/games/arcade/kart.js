/* TEMPEST KART — kart 3D com 5 rivais, itens (turbo, banana, casco) e 3 voltas */
raceGame({ name: 'TEMPEST KART', tc: '#ff6a3a', theme: 'grass', vehicle: 'kart', laps: 3, nAI: 5, w: 12, items: true, wall: false, offk: 0.5, top: 0.62, acc: 0.014, drag: 0.008, turn: 0.04, grip: 0.35, cam: 6.5, kmh: 190,
  track: (t) => [64 * Math.cos(t) + 13 * Math.cos(2 * t + 1), 46 * Math.sin(t) + 10 * Math.sin(3 * t)],
  sky: ['#3a8bff', '#bfe4ff', '#6fcf6a'], gnd: '#3f9e4a', fogN: 50, fogF: 190, amb: 0.55, road: [hex2('#6a6a78'), hex2('#62626f')], edge: [hex2('#e03030'), hex2('#f4f4f4')],
  help: '← → dirige • A acelera • B usa o item • pegue os cubos' });
