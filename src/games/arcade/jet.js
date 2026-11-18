/* JET RIDER — corrida de jet ski nas ondas, passando entre as boias */
raceGame({ name: 'JET RIDER', tc: '#ffffff', theme: 'water', vehicle: 'jet', laps: 3, nAI: 5, w: 20, items: false, wall: false, offk: 0.6, top: 0.58, acc: 0.013, drag: 0.006, turn: 0.036, grip: 0.2, cam: 7.5, kmh: 150,
  track: (t) => [80 * Math.cos(t) + 22 * Math.cos(2 * t), 54 * Math.sin(t) + 9 * Math.sin(3 * t)],
  sky: ['#3a8bff', '#d4ecff', '#a8d4ff'], gnd: '#2a78c0', fogN: 50, fogF: 200, amb: 0.6, road: [], edge: [],
  help: '← → dirige • A acelera • B turbo • fique entre as boias' });
