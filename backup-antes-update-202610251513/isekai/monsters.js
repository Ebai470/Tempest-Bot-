const MONSTERS = [
  { id:'slime', name:'Slime', emoji:'🟢', rarity:'comum', level:1, hp:30, atk:6, def:2, spd:5, xp:8, iene:[3,7] },
  { id:'lobo', name:'Lobo', emoji:'🐺', rarity:'comum', level:2, hp:45, atk:10, def:4, spd:12, xp:14, iene:[4,10] },
  { id:'goblin', name:'Goblin', emoji:'👺', rarity:'comum', level:3, hp:50, atk:12, def:5, spd:10, xp:18, iene:[6,14] },
  { id:'esqueleto', name:'Esqueleto', emoji:'💀', rarity:'incomum', level:4, hp:60, atk:14, def:8, spd:8, xp:25, iene:[8,18] },
  { id:'orc', name:'Orc', emoji:'🪓', rarity:'incomum', level:5, hp:90, atk:18, def:12, spd:6, xp:35, iene:[12,26] },
  { id:'aranha', name:'Aranha Gigante', emoji:'🕷️', rarity:'incomum', level:4, hp:55, atk:15, def:6, spd:14, xp:28, iene:[8,16] },
  { id:'mago_sombrio', name:'Mago Sombrio', emoji:'🧙', rarity:'rara', level:7, hp:70, atk:22, def:8, spd:11, xp:50, iene:[18,36] },
  { id:'golem', name:'Golem de Pedra', emoji:'🗿', rarity:'rara', level:8, hp:140, atk:16, def:22, spd:3, xp:55, iene:[22,42] },
  { id:'wyvern', name:'Wyvern', emoji:'🐉', rarity:'epica', level:12, hp:200, atk:28, def:18, spd:16, xp:100, iene:[40,80] },
  { id:'lich', name:'Lich', emoji:'☠️', rarity:'lendaria', level:15, hp:250, atk:32, def:20, spd:12, xp:150, iene:[60,120] },
  { id:'harpia', name:'Harpia', emoji:'🦅', rarity:'incomum', level:6, hp:80, atk:19, def:7, spd:18, xp:40, iene:[14,28] },
  { id:'cavaleiro_negro', name:'Cavaleiro Negro', emoji:'🛡️', rarity:'rara', level:9, hp:150, atk:24, def:20, spd:9, xp:65, iene:[28,50] },
  { id:'troll', name:'Troll', emoji:'🧌', rarity:'rara', level:10, hp:220, atk:26, def:16, spd:5, xp:80, iene:[32,58] },
  { id:'elemental_fogo', name:'Elemental de Fogo', emoji:'🔥', rarity:'epica', level:13, hp:180, atk:34, def:14, spd:14, xp:110, iene:[45,85] },
  { id:'quimera', name:'Quimera', emoji:'🦁', rarity:'epica', level:16, hp:280, atk:36, def:22, spd:13, xp:140, iene:[60,110] },
  { id:'demonio_menor', name:'Demonio Menor', emoji:'😈', rarity:'lendaria', level:18, hp:320, atk:38, def:24, spd:14, xp:175, iene:[75,135] }
];
const BOSSES = [
  { id:'rei_goblin', name:'Rei Goblin', emoji:'👑', level:6, hp:180, atk:20, def:14, spd:9, xp:80, iene:[50,100],
    phases:[{ at:0.5, msg:'O Rei Goblin enlouquece!', atkMod:1.4 }] },
  { id:'dragao_menor', name:'Dragao Menor', emoji:'🔥', level:14, hp:400, atk:35, def:25, spd:14, xp:200, iene:[110,200],
    phases:[{ at:0.6, msg:'O dragao cospe fogo!', atkMod:1.3 },{ at:0.3, msg:'Furia draconica!', atkMod:1.6 }] },
  { id:'senhor_trevas', name:'Senhor das Trevas', emoji:'🌑', level:18, hp:500, atk:40, def:28, spd:15, xp:300, iene:[150,280],
    phases:[{ at:0.5, msg:'As trevas engolem o campo!', atkMod:1.5 }] },
  { id:'rainha_aranha', name:'Rainha Aranha', emoji:'🕸️', level:10, hp:300, atk:28, def:18, spd:13, xp:140, iene:[70,130],
    phases:[{ at:0.5, msg:'A Rainha Aranha invoca suas crias!', atkMod:1.4 }] },
  { id:'colosso_gelo', name:'Colosso de Gelo', emoji:'🧊', level:16, hp:520, atk:38, def:30, spd:8, xp:260, iene:[130,240],
    phases:[{ at:0.6, msg:'O gelo racha e o colosso ruge!', atkMod:1.3 },{ at:0.3, msg:'Tempestade de gelo!', atkMod:1.6 }] }
];
function pickMonster(playerLevel) {
  const lv = playerLevel || 1;
  const pool = MONSTERS.filter(function (m) { return m.level <= lv + 3; });
  const list = pool.length ? pool : MONSTERS.slice(0, 3);
  return JSON.parse(JSON.stringify(list[Math.floor(Math.random() * list.length)]));
}
function pickBoss(playerLevel) {
  const lv = playerLevel || 1;
  let list = BOSSES.filter(function (b) { return b.level <= lv + 6; });
  if (!list.length) list = BOSSES;
  return JSON.parse(JSON.stringify(list[Math.floor(Math.random() * list.length)]));
}
module.exports = { MONSTERS, BOSSES, pickMonster, pickBoss };
