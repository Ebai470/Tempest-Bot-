const ITEMS = {
  espada_ferro: { id:'espada_ferro', name:'Espada de Ferro', cat:'arma', rarity:'comum', buy:80, sell:32, slot:'arma', atk:8, dur:100 },
  espada_aco: { id:'espada_aco', name:'Espada de Aco', cat:'arma', rarity:'incomum', buy:160, sell:64, slot:'arma', atk:14, dur:120 },
  espada_magica: { id:'espada_magica', name:'Espada Magica', cat:'arma', rarity:'raro', buy:320, sell:128, slot:'arma', atk:18, mag:6, dur:110 },
  katana: { id:'katana', name:'Katana', cat:'arma', rarity:'raro', buy:280, sell:110, slot:'arma', atk:20, dur:100 },
  lanca_ferro: { id:'lanca_ferro', name:'Lanca de Ferro', cat:'arma', rarity:'comum', buy:70, sell:28, slot:'arma', atk:9, def:1, dur:100 },
  machado: { id:'machado', name:'Machado de Guerra', cat:'arma', rarity:'incomum', buy:150, sell:60, slot:'arma', atk:16, dur:90 },
  adaga: { id:'adaga', name:'Adaga', cat:'arma', rarity:'comum', buy:45, sell:18, slot:'arma', atk:6, agi:2, dur:80 },
  arco: { id:'arco', name:'Arco Simples', cat:'arma', rarity:'comum', buy:60, sell:24, slot:'arma', atk:7, prec:3, dur:90 },
  cajado: { id:'cajado', name:'Cajado de Aprendiz', cat:'arma', rarity:'comum', buy:55, sell:22, slot:'arma', atk:2, mag:10, dur:100 },
  grimorio: { id:'grimorio', name:'Grimorio Basico', cat:'arma', rarity:'incomum', buy:140, sell:56, slot:'arma', mag:14, dur:100 },
  capacete_couro: { id:'capacete_couro', name:'Capacete de Couro', cat:'armadura', rarity:'comum', buy:40, sell:16, slot:'cabeca', def:3, dur:80 },
  peitoral_couro: { id:'peitoral_couro', name:'Peitoral de Couro', cat:'armadura', rarity:'comum', buy:70, sell:28, slot:'peito', def:6, dur:90 },
  peitoral_ferro: { id:'peitoral_ferro', name:'Peitoral de Ferro', cat:'armadura', rarity:'incomum', buy:150, sell:60, slot:'peito', def:12, dur:120 },
  peitoral_aco: { id:'peitoral_aco', name:'Peitoral de Aco', cat:'armadura', rarity:'raro', buy:300, sell:120, slot:'peito', def:18, dur:140 },
  botas_couro: { id:'botas_couro', name:'Botas de Couro', cat:'armadura', rarity:'comum', buy:35, sell:14, slot:'pes', def:2, agi:1, dur:80 },
  luvas_ferro: { id:'luvas_ferro', name:'Luvas de Ferro', cat:'armadura', rarity:'incomum', buy:55, sell:22, slot:'maos', def:4, atk:1, dur:90 },
  escudo_madeira: { id:'escudo_madeira', name:'Escudo de Madeira', cat:'armadura', rarity:'comum', buy:50, sell:20, slot:'escudo', def:5, dur:70 },
  escudo_ferro: { id:'escudo_ferro', name:'Escudo de Ferro', cat:'armadura', rarity:'incomum', buy:120, sell:48, slot:'escudo', def:10, dur:110 },
  anel_forca: { id:'anel_forca', name:'Anel da Forca', cat:'acessorio', rarity:'incomum', buy:100, sell:40, slot:'anel', atk:3 },
  anel_magia: { id:'anel_magia', name:'Anel da Magia', cat:'acessorio', rarity:'incomum', buy:100, sell:40, slot:'anel', mag:3 },
  amuleto_vida: { id:'amuleto_vida', name:'Amuleto da Vida', cat:'acessorio', rarity:'raro', buy:200, sell:80, slot:'amuleto', hp:25 },
  colar_sorte: { id:'colar_sorte', name:'Colar da Sorte', cat:'acessorio', rarity:'raro', buy:180, sell:72, slot:'colar', sorte:5 },
  pocao: { id:'pocao', name:'Pocao de Cura', cat:'pocao', rarity:'comum', buy:25, sell:10, heal:40, consumable:true },
  pocao_grande: { id:'pocao_grande', name:'Pocao Grande', cat:'pocao', rarity:'incomum', buy:55, sell:22, heal:90, consumable:true },
  mana_pocao: { id:'mana_pocao', name:'Pocao de Mana', cat:'pocao', rarity:'comum', buy:30, sell:12, mana:35, consumable:true },
  antidoto: { id:'antidoto', name:'Antidoto', cat:'pocao', rarity:'incomum', buy:40, sell:16, consumable:true },
  pao: { id:'pao', name:'Pao', cat:'comida', rarity:'comum', buy:8, sell:3, heal:10, consumable:true },
  carne: { id:'carne', name:'Carne Assada', cat:'comida', rarity:'comum', buy:15, sell:6, heal:20, consumable:true },
  sopa: { id:'sopa', name:'Sopa Nutritiva', cat:'comida', rarity:'incomum', buy:22, sell:9, heal:30, mana:10, consumable:true },
  couro: { id:'couro', name:'Couro', cat:'material', rarity:'comum', buy:12, sell:6 },
  osso: { id:'osso', name:'Osso', cat:'material', rarity:'comum', buy:8, sell:4 },
  presa: { id:'presa', name:'Presa', cat:'material', rarity:'incomum', buy:20, sell:10 },
  pena: { id:'pena', name:'Pena', cat:'material', rarity:'comum', buy:6, sell:3 },
  ferro: { id:'ferro', name:'Minerio de Ferro', cat:'material', rarity:'comum', buy:15, sell:7 },
  cristal: { id:'cristal', name:'Cristal Magico', cat:'material', rarity:'raro', buy:50, sell:25 },
  nucleo: { id:'nucleo', name:'Nucleo Magico', cat:'material', rarity:'epico', buy:120, sell:60 },
  escama: { id:'escama', name:'Escama de Dragao', cat:'material', rarity:'lendario', buy:400, sell:200 },
  erva: { id:'erva', name:'Erva Medicinal', cat:'material', rarity:'comum', buy:10, sell:5 },
  agua_magica: { id:'agua_magica', name:'Agua Magica', cat:'material', rarity:'incomum', buy:18, sell:9 },
  madeira: { id:'madeira', name:'Madeira', cat:'material', rarity:'comum', buy:5, sell:2 },
  picareta: { id:'picareta', name:'Picareta', cat:'ferramenta', rarity:'comum', buy:45, sell:18 },
  vara_pesca: { id:'vara_pesca', name:'Vara de Pesca', cat:'ferramenta', rarity:'comum', buy:40, sell:16 },
  enxada: { id:'enxada', name:'Enxada', cat:'ferramenta', rarity:'comum', buy:35, sell:14 },
  pergaminho: { id:'pergaminho', name:'Pergaminho em Branco', cat:'magia', rarity:'comum', buy:20, sell:8 },
  chave_simples: { id:'chave_simples', name:'Chave Simples', cat:'util', rarity:'comum', buy:15, sell:5 },
  arco_longo: { id:'arco_longo', name:'Arco Longo', cat:'arma', rarity:'incomum', buy:200, sell:80, slot:'arma', atk:12, prec:6, dur:100 },
  adagas_gemeas: { id:'adagas_gemeas', name:'Adagas Gemeas', cat:'arma', rarity:'raro', buy:300, sell:120, slot:'arma', atk:13, agi:5, dur:90 },
  besta: { id:'besta', name:'Besta Pesada', cat:'arma', rarity:'raro', buy:360, sell:144, slot:'arma', atk:19, prec:8, dur:110 },
  martelo_guerra: { id:'martelo_guerra', name:'Martelo de Guerra', cat:'arma', rarity:'raro', buy:380, sell:152, slot:'arma', atk:22, dur:140 },
  espada_prata: { id:'espada_prata', name:'Espada de Prata', cat:'arma', rarity:'raro', buy:420, sell:168, slot:'arma', atk:24, dur:130 },
  cajado_arcano: { id:'cajado_arcano', name:'Cajado Arcano', cat:'arma', rarity:'raro', buy:380, sell:152, slot:'arma', atk:2, mag:22, dur:120 },
  lamina_runica: { id:'lamina_runica', name:'Lamina Runica', cat:'arma', rarity:'epico', buy:900, sell:360, slot:'arma', atk:28, mag:10, dur:150 },
  grimorio_negro: { id:'grimorio_negro', name:'Grimorio Negro', cat:'arma', rarity:'epico', buy:950, sell:380, slot:'arma', mag:28, dur:130 },
  cajado_cristal: { id:'cajado_cristal', name:'Cajado de Cristal', cat:'arma', rarity:'epico', buy:1000, sell:400, slot:'arma', atk:2, mag:30, dur:140 },
  espada_dragao: { id:'espada_dragao', name:'Espada do Dragao', cat:'arma', rarity:'lendario', sell:1000, slot:'arma', atk:38, dur:200 },
  capacete_ferro: { id:'capacete_ferro', name:'Capacete de Ferro', cat:'armadura', rarity:'incomum', buy:90, sell:36, slot:'cabeca', def:6, dur:100 },
  capacete_aco: { id:'capacete_aco', name:'Capacete de Aco', cat:'armadura', rarity:'raro', buy:220, sell:88, slot:'cabeca', def:10, dur:130 },
  elmo_dragao: { id:'elmo_dragao', name:'Elmo do Dragao', cat:'armadura', rarity:'epico', sell:500, slot:'cabeca', def:16, dur:160 },
  botas_ferro: { id:'botas_ferro', name:'Botas de Ferro', cat:'armadura', rarity:'incomum', buy:80, sell:32, slot:'pes', def:4, agi:1, dur:100 },
  botas_vento: { id:'botas_vento', name:'Botas do Vento', cat:'armadura', rarity:'raro', buy:240, sell:96, slot:'pes', def:4, agi:5, dur:100 },
  luvas_aco: { id:'luvas_aco', name:'Luvas de Aco', cat:'armadura', rarity:'raro', buy:160, sell:64, slot:'maos', def:6, atk:2, dur:110 },
  escudo_aco: { id:'escudo_aco', name:'Escudo de Aco', cat:'armadura', rarity:'raro', buy:260, sell:104, slot:'escudo', def:15, dur:140 },
  escudo_dragao: { id:'escudo_dragao', name:'Escudo do Dragao', cat:'armadura', rarity:'epico', sell:450, slot:'escudo', def:22, dur:190 },
  peitoral_mithril: { id:'peitoral_mithril', name:'Peitoral de Mithril', cat:'armadura', rarity:'epico', buy:1100, sell:440, slot:'peito', def:26, dur:180 },
  armadura_dragao: { id:'armadura_dragao', name:'Armadura do Dragao', cat:'armadura', rarity:'lendario', sell:1200, slot:'peito', def:34, dur:220 },
  anel_agilidade: { id:'anel_agilidade', name:'Anel da Agilidade', cat:'acessorio', rarity:'incomum', buy:100, sell:40, slot:'anel', agi:3 },
  anel_precisao: { id:'anel_precisao', name:'Anel da Precisao', cat:'acessorio', rarity:'incomum', buy:110, sell:44, slot:'anel', prec:4 },
  anel_sabio: { id:'anel_sabio', name:'Anel do Sabio', cat:'acessorio', rarity:'raro', buy:260, sell:104, slot:'anel', mag:6 },
  anel_titan: { id:'anel_titan', name:'Anel do Titan', cat:'acessorio', rarity:'raro', buy:280, sell:112, slot:'anel', atk:6 },
  amuleto_guardiao: { id:'amuleto_guardiao', name:'Amuleto Guardiao', cat:'acessorio', rarity:'raro', buy:320, sell:128, slot:'amuleto', def:5, hp:20 },
  colar_vitalidade: { id:'colar_vitalidade', name:'Colar da Vitalidade', cat:'acessorio', rarity:'epico', buy:700, sell:280, slot:'colar', hp:60 },
  amuleto_dragao: { id:'amuleto_dragao', name:'Amuleto do Dragao', cat:'acessorio', rarity:'lendario', sell:900, slot:'amuleto', atk:6, mag:6, hp:40 },
  elixir_vida: { id:'elixir_vida', name:'Elixir da Vida', cat:'pocao', rarity:'raro', buy:160, sell:64, heal:150, consumable:true },
  elixir_mana: { id:'elixir_mana', name:'Elixir de Mana', cat:'pocao', rarity:'raro', buy:120, sell:48, mana:70, consumable:true },
  elixir_supremo: { id:'elixir_supremo', name:'Elixir Supremo', cat:'pocao', rarity:'epico', buy:400, sell:160, heal:200, mana:80, consumable:true },
  torta: { id:'torta', name:'Torta de Frutas', cat:'comida', rarity:'comum', buy:18, sell:7, heal:15, mana:5, consumable:true },
  ensopado: { id:'ensopado', name:'Ensopado Reforcado', cat:'comida', rarity:'incomum', buy:40, sell:16, heal:45, consumable:true },
  cha_calmante: { id:'cha_calmante', name:'Cha Calmante', cat:'comida', rarity:'incomum', buy:25, sell:10, mana:25, consumable:true },
  banquete: { id:'banquete', name:'Banquete Real', cat:'comida', rarity:'epico', buy:120, sell:48, heal:120, mana:40, consumable:true },
  prata: { id:'prata', name:'Minerio de Prata', cat:'material', rarity:'incomum', buy:35, sell:17 },
  essencia: { id:'essencia', name:'Essencia Arcana', cat:'material', rarity:'raro', buy:70, sell:35 },
  mithril: { id:'mithril', name:'Mithril', cat:'material', rarity:'epico', buy:160, sell:80 },
  coracao_dragao: { id:'coracao_dragao', name:'Coracao de Dragao', cat:'material', rarity:'lendario', sell:500 },
  lanca: { id:'lanca', name:'Lanca de Guerra', cat:'arma', rarity:'incomum', buy:150, sell:60, slot:'arma', atk:14, prec:3, dur:100 },
  espada_longa: { id:'espada_longa', name:'Espada Longa', cat:'arma', rarity:'incomum', buy:180, sell:72, slot:'arma', atk:16, dur:110 },
  machado_guerra: { id:'machado_guerra', name:'Machado de Guerra', cat:'arma', rarity:'raro', buy:260, sell:104, slot:'arma', atk:20, dur:120 },
  punhal_sombrio: { id:'punhal_sombrio', name:'Punhal Sombrio', cat:'arma', rarity:'epico', buy:800, sell:320, slot:'arma', atk:24, agi:8, dur:110 },
  cajado_chamas: { id:'cajado_chamas', name:'Cajado das Chamas', cat:'arma', rarity:'epico', sell:320, slot:'arma', atk:2, mag:26, dur:130 },
  cajado_gelo: { id:'cajado_gelo', name:'Cajado do Gelo', cat:'arma', rarity:'epico', sell:320, slot:'arma', mag:26, prec:3, dur:130 },
  cajado_trovao: { id:'cajado_trovao', name:'Cajado do Trovao', cat:'arma', rarity:'epico', sell:340, slot:'arma', mag:28, agi:2, dur:130 },
  tunica: { id:'tunica', name:'Tunica Simples', cat:'armadura', rarity:'comum', buy:45, sell:18, slot:'peito', def:3, dur:70 },
  cota_malha: { id:'cota_malha', name:'Cota de Malha', cat:'armadura', rarity:'incomum', buy:260, sell:104, slot:'peito', def:14, dur:150 },
  manto_mago: { id:'manto_mago', name:'Manto do Mago', cat:'armadura', rarity:'raro', buy:320, sell:128, slot:'peito', def:6, mag:10, dur:120 },
  capuz: { id:'capuz', name:'Capuz de Couro', cat:'armadura', rarity:'comum', buy:30, sell:12, slot:'cabeca', def:2, dur:60 },
  elmo_cavaleiro: { id:'elmo_cavaleiro', name:'Elmo de Cavaleiro', cat:'armadura', rarity:'raro', buy:300, sell:120, slot:'cabeca', def:12, dur:140 },
  luvas_couro: { id:'luvas_couro', name:'Luvas de Couro', cat:'armadura', rarity:'comum', buy:50, sell:20, slot:'maos', def:3, dur:70 },
  escudo_torre: { id:'escudo_torre', name:'Escudo Torre', cat:'armadura', rarity:'raro', buy:380, sell:152, slot:'escudo', def:18, dur:160 },
  anel_vigor: { id:'anel_vigor', name:'Anel do Vigor', cat:'acessorio', rarity:'incomum', buy:150, sell:60, slot:'anel', hp:30 },
  anel_escudo: { id:'anel_escudo', name:'Anel Protetor', cat:'acessorio', rarity:'incomum', buy:130, sell:52, slot:'anel', def:4 },
  colar_mago: { id:'colar_mago', name:'Colar do Mago', cat:'acessorio', rarity:'raro', buy:240, sell:96, slot:'colar', mag:8 },
  colar_guerreiro: { id:'colar_guerreiro', name:'Colar do Guerreiro', cat:'acessorio', rarity:'raro', buy:260, sell:104, slot:'colar', atk:5, hp:10 },
  amuleto_sorte: { id:'amuleto_sorte', name:'Amuleto da Sorte', cat:'acessorio', rarity:'incomum', buy:180, sell:72, slot:'amuleto', sorte:5 },
  pocao_mini: { id:'pocao_mini', name:'Pocao Pequena', cat:'pocao', rarity:'comum', buy:10, sell:4, heal:20, consumable:true },
  pocao_media: { id:'pocao_media', name:'Pocao Media', cat:'pocao', rarity:'incomum', buy:45, sell:18, heal:60, consumable:true },
  mana_grande: { id:'mana_grande', name:'Pocao de Mana Grande', cat:'pocao', rarity:'incomum', buy:60, sell:24, mana:80, consumable:true },
  tonico: { id:'tonico', name:'Tonico Revigorante', cat:'pocao', rarity:'incomum', buy:30, sell:12, heal:35, mana:15, consumable:true },
  pergaminho_cura: { id:'pergaminho_cura', name:'Pergaminho de Cura', cat:'magia', rarity:'incomum', buy:70, sell:28, heal:90, consumable:true },
  pergaminho_mana: { id:'pergaminho_mana', name:'Pergaminho de Mana', cat:'magia', rarity:'incomum', buy:55, sell:22, mana:60, consumable:true },
  pergaminho_vigor: { id:'pergaminho_vigor', name:'Pergaminho do Vigor', cat:'magia', rarity:'raro', buy:120, sell:48, heal:60, mana:40, consumable:true },
  runa_fogo: { id:'runa_fogo', name:'Runa de Fogo', cat:'magia', rarity:'raro', buy:90, sell:36 },
  runa_gelo: { id:'runa_gelo', name:'Runa de Gelo', cat:'magia', rarity:'raro', buy:90, sell:36 },
  runa_trovao: { id:'runa_trovao', name:'Runa do Trovao', cat:'magia', rarity:'raro', buy:110, sell:44 },
  maca: { id:'maca', name:'Maca', cat:'comida', rarity:'comum', buy:5, sell:2, heal:8, consumable:true },
  queijo: { id:'queijo', name:'Queijo', cat:'comida', rarity:'comum', buy:9, sell:3, heal:14, consumable:true },
  peixe_assado: { id:'peixe_assado', name:'Peixe Assado', cat:'comida', rarity:'comum', buy:20, sell:8, heal:28, consumable:true },
  bolo_mel: { id:'bolo_mel', name:'Bolo de Mel', cat:'comida', rarity:'incomum', buy:28, sell:11, heal:25, mana:15, consumable:true },
  ensopado_peixe: { id:'ensopado_peixe', name:'Ensopado de Peixe', cat:'comida', rarity:'incomum', buy:32, sell:13, heal:40, mana:10, consumable:true },
  prato_chef: { id:'prato_chef', name:'Prato do Chef', cat:'comida', rarity:'raro', buy:85, sell:34, heal:90, mana:30, consumable:true },
  seda: { id:'seda', name:'Seda Fina', cat:'material', rarity:'incomum', buy:25, sell:10 },
  madeira_nobre: { id:'madeira_nobre', name:'Madeira Nobre', cat:'material', rarity:'incomum', buy:30, sell:12 },
  gema_bruta: { id:'gema_bruta', name:'Gema Bruta', cat:'material', rarity:'raro', buy:60, sell:24 }
};

const SHOP_CATS = {
  armas: { title:'Armas', cats:['arma'] },
  armaduras: { title:'Armaduras', cats:['armadura'] },
  pocoes: { title:'Pocoes', cats:['pocao'] },
  acessorios: { title:'Acessorios', cats:['acessorio'] },
  materiais: { title:'Materiais', cats:['material'] },
  comida: { title:'Comida', cats:['comida'] },
  magia: { title:'Magia', cats:['magia'] },
  ferramentas: { title:'Ferramentas', cats:['ferramenta'] },
  util: { title:'Utilidades', cats:['util'] }
};

const RECIPES = {
  pocao: { id:'pocao', result:'pocao', qty:1, need:{ erva:2, agua_magica:1 }, level:1 },
  pocao_grande: { id:'pocao_grande', result:'pocao_grande', qty:1, need:{ erva:3, agua_magica:2, cristal:1 }, level:5 },
  espada_ferro: { id:'espada_ferro', result:'espada_ferro', qty:1, need:{ ferro:3, madeira:1 }, level:1 },
  peitoral_ferro: { id:'peitoral_ferro', result:'peitoral_ferro', qty:1, need:{ ferro:5, couro:2 }, level:3 },
  sopa: { id:'sopa', result:'sopa', qty:1, need:{ carne:1, erva:1 }, level:1 },
  espada_aco: { id:'espada_aco', result:'espada_aco', qty:1, need:{ferro:6,couro:1,madeira:1}, level:3 },
  ensopado: { id:'ensopado', result:'ensopado', qty:1, need:{carne:1,erva:2,pao:1}, level:1 },
  capacete_ferro: { id:'capacete_ferro', result:'capacete_ferro', qty:1, need:{ferro:3,couro:1}, level:2 },
  botas_ferro: { id:'botas_ferro', result:'botas_ferro', qty:1, need:{ferro:3,couro:2}, level:2 },
  peitoral_aco: { id:'peitoral_aco', result:'peitoral_aco', qty:1, need:{ferro:8,prata:3,couro:2}, level:6 },
  espada_prata: { id:'espada_prata', result:'espada_prata', qty:1, need:{prata:4,ferro:2,madeira:1}, level:4 },
  capacete_aco: { id:'capacete_aco', result:'capacete_aco', qty:1, need:{ferro:5,prata:2}, level:5 },
  escudo_aco: { id:'escudo_aco', result:'escudo_aco', qty:1, need:{ferro:6,prata:2}, level:6 },
  cajado_arcano: { id:'cajado_arcano', result:'cajado_arcano', qty:1, need:{madeira:3,cristal:2,essencia:2}, level:5 },
  elixir_mana: { id:'elixir_mana', result:'elixir_mana', qty:1, need:{mana_pocao:3,essencia:1,agua_magica:2}, level:5 },
  elixir_vida: { id:'elixir_vida', result:'elixir_vida', qty:1, need:{pocao_grande:2,erva:3,cristal:1}, level:6 },
  banquete: { id:'banquete', result:'banquete', qty:1, need:{carne:3,sopa:2,erva:2}, level:4 },
  cajado_cristal: { id:'cajado_cristal', result:'cajado_cristal', qty:1, need:{cristal:6,essencia:4,madeira:2}, level:9 },
  peitoral_mithril: { id:'peitoral_mithril', result:'peitoral_mithril', qty:1, need:{mithril:4,prata:3,couro:3}, level:10 },
  lamina_runica: { id:'lamina_runica', result:'lamina_runica', qty:1, need:{mithril:3,cristal:3,essencia:2}, level:10 },
  escudo_dragao: { id:'escudo_dragao', result:'escudo_dragao', qty:1, need:{escama:3,mithril:2,ferro:4}, level:12 },
  elmo_dragao: { id:'elmo_dragao', result:'elmo_dragao', qty:1, need:{escama:2,mithril:2,couro:2}, level:12 },
  espada_dragao: { id:'espada_dragao', result:'espada_dragao', qty:1, need:{escama:4,mithril:3,nucleo:2}, level:14 },
  armadura_dragao: { id:'armadura_dragao', result:'armadura_dragao', qty:1, need:{escama:6,mithril:4,couro:4}, level:14 },
  amuleto_dragao: { id:'amuleto_dragao', result:'amuleto_dragao', qty:1, need:{coracao_dragao:1,cristal:4,nucleo:2}, level:15 },
  tonico: { id:'tonico', result:'tonico', qty:1, need:{erva:2,agua_magica:1}, level:2 },
  cota_malha: { id:'cota_malha', result:'cota_malha', qty:1, need:{ferro:6,couro:4}, level:4 },
  prato_chef: { id:'prato_chef', result:'prato_chef', qty:1, need:{carne:2,sopa:1,erva:2}, level:5 },
  pergaminho_cura: { id:'pergaminho_cura', result:'pergaminho_cura', qty:1, need:{pergaminho:1,erva:2,cristal:1}, level:4 },
  pergaminho_mana: { id:'pergaminho_mana', result:'pergaminho_mana', qty:1, need:{pergaminho:1,agua_magica:2,cristal:1}, level:4 },
  elmo_cavaleiro: { id:'elmo_cavaleiro', result:'elmo_cavaleiro', qty:1, need:{ferro:6,prata:2}, level:6 },
  manto_mago: { id:'manto_mago', result:'manto_mago', qty:1, need:{seda:4,essencia:2,couro:1}, level:6 },
  pergaminho_vigor: { id:'pergaminho_vigor', result:'pergaminho_vigor', qty:1, need:{pergaminho:2,essencia:1,cristal:1}, level:6 },
  escudo_torre: { id:'escudo_torre', result:'escudo_torre', qty:1, need:{ferro:8,prata:2,couro:1}, level:8 },
  punhal_sombrio: { id:'punhal_sombrio', result:'punhal_sombrio', qty:1, need:{ferro:4,prata:4,essencia:2}, level:8 },
  cajado_chamas: { id:'cajado_chamas', result:'cajado_chamas', qty:1, need:{runa_fogo:3,cristal:2,madeira_nobre:2}, level:9 },
  cajado_gelo: { id:'cajado_gelo', result:'cajado_gelo', qty:1, need:{runa_gelo:3,cristal:2,madeira_nobre:2}, level:9 },
  cajado_trovao: { id:'cajado_trovao', result:'cajado_trovao', qty:1, need:{runa_trovao:3,cristal:2,madeira_nobre:2}, level:10 }
};

const LOOT_TABLE = {
  default: [
    { id:'couro', chance:40, min:1, max:2 },
    { id:'osso', chance:30, min:1, max:2 }
  ],
  lobo: [
    { id:'couro', chance:55, min:1, max:3 },
    { id:'presa', chance:25, min:1, max:1 },
    { id:'osso', chance:20, min:1, max:2 }
  ],
  slime: [
    { id:'agua_magica', chance:35, min:1, max:2 },
    { id:'erva', chance:25, min:1, max:1 }
  ],
  goblin: [
    { id:'ferro', chance:30, min:1, max:2 },
    { id:'osso', chance:40, min:1, max:2 },
    { id:'pocao', chance:10, min:1, max:1 }
  ],
  esqueleto: [
    { id:'osso', chance:60, min:1, max:3 },
    { id:'ferro', chance:20, min:1, max:2 },
    { id:'pocao', chance:8, min:1, max:1 }
  ],
  orc: [
    { id:'ferro', chance:40, min:1, max:3 },
    { id:'couro', chance:30, min:1, max:2 },
    { id:'presa', chance:20, min:1, max:1 },
    { id:'pocao_grande', chance:5, min:1, max:1 },
    { id:'prata', chance:20, min:1, max:2 }
  ],
  aranha: [
    { id:'seda', chance:40, min:1, max:2 },
    { id:'presa', chance:40, min:1, max:2 },
    { id:'agua_magica', chance:25, min:1, max:1 },
    { id:'erva', chance:20, min:1, max:2 }
  ],
  mago_sombrio: [
    { id:'runa_fogo', chance:10, min:1, max:1 },
    { id:'runa_gelo', chance:10, min:1, max:1 },
    { id:'cristal', chance:30, min:1, max:1 },
    { id:'pergaminho', chance:25, min:1, max:1 },
    { id:'mana_pocao', chance:20, min:1, max:1 },
    { id:'essencia', chance:30, min:1, max:1 }
  ],
  golem: [
    { id:'gema_bruta', chance:25, min:1, max:1 },
    { id:'ferro', chance:60, min:2, max:4 },
    { id:'cristal', chance:20, min:1, max:1 },
    { id:'nucleo', chance:6, min:1, max:1 },
    { id:'prata', chance:25, min:1, max:2 },
    { id:'mithril', chance:6, min:1, max:1 }
  ],
  wyvern: [
    { id:'couro', chance:40, min:2, max:4 },
    { id:'presa', chance:35, min:1, max:2 },
    { id:'cristal', chance:30, min:1, max:1 },
    { id:'escama', chance:12, min:1, max:1 },
    { id:'mithril', chance:10, min:1, max:1 }
  ],
  lich: [
    { id:'runa_trovao', chance:20, min:1, max:1 },
    { id:'runa_gelo', chance:15, min:1, max:1 },
    { id:'cristal', chance:40, min:1, max:2 },
    { id:'pergaminho', chance:30, min:1, max:2 },
    { id:'nucleo', chance:30, min:1, max:1 },
    { id:'escama', chance:5, min:1, max:1 },
    { id:'essencia', chance:30, min:1, max:1 },
    { id:'mithril', chance:15, min:1, max:1 }
  ],
  cavaleiro_negro: [
    { id:'ferro', chance:50, min:2, max:4 },
    { id:'prata', chance:25, min:1, max:2 },
    { id:'couro', chance:30, min:1, max:2 },
    { id:'pocao_grande', chance:10, min:1, max:1 }
  ],
  harpia: [
    { id:'pena', chance:70, min:2, max:4 },
    { id:'presa', chance:20, min:1, max:1 },
    { id:'erva', chance:20, min:1, max:2 }
  ],
  troll: [
    { id:'madeira_nobre', chance:15, min:1, max:1 },
    { id:'couro', chance:50, min:2, max:4 },
    { id:'osso', chance:50, min:2, max:3 },
    { id:'prata', chance:20, min:1, max:2 },
    { id:'pocao_grande', chance:10, min:1, max:1 }
  ],
  elemental_fogo: [
    { id:'runa_fogo', chance:30, min:1, max:1 },
    { id:'cristal', chance:35, min:1, max:1 },
    { id:'essencia', chance:30, min:1, max:1 },
    { id:'nucleo', chance:12, min:1, max:1 }
  ],
  quimera: [
    { id:'runa_trovao', chance:12, min:1, max:1 },
    { id:'couro', chance:45, min:2, max:4 },
    { id:'presa', chance:35, min:1, max:2 },
    { id:'essencia', chance:25, min:1, max:1 },
    { id:'mithril', chance:8, min:1, max:1 }
  ],
  demonio_menor: [
    { id:'essencia', chance:40, min:1, max:2 },
    { id:'nucleo', chance:25, min:1, max:1 },
    { id:'mithril', chance:15, min:1, max:1 },
    { id:'cristal', chance:35, min:1, max:2 }
  ],
  boss: [
    { id:'runa_fogo', chance:10, min:1, max:1 },
    { id:'runa_gelo', chance:10, min:1, max:1 },
    { id:'runa_trovao', chance:10, min:1, max:1 },
    { id:'gema_bruta', chance:20, min:1, max:1 },
    { id:'cristal', chance:50, min:1, max:2 },
    { id:'nucleo', chance:25, min:1, max:1 },
    { id:'escama', chance:8, min:1, max:1 },
    { id:'mithril', chance:20, min:1, max:2 },
    { id:'coracao_dragao', chance:6, min:1, max:1 },
    { id:'pergaminho', chance:30, min:1, max:2 }
  ]
};

function getItem(id) { return ITEMS[id] || null; }

function listShop(catKey) {
  const conf = SHOP_CATS[catKey];
  if (!conf) return Object.values(ITEMS).filter(function (i) { return i.buy != null; });
  return Object.values(ITEMS).filter(function (i) {
    return conf.cats.indexOf(i.cat) >= 0 && i.buy != null;
  });
}

function rollLoot(enemy, luck) {
  luck = luck || 10;
  const key = (enemy && (enemy.lootKey || enemy.id || enemy.name || '')).toString().toLowerCase();
  let table = LOOT_TABLE.default;
  if (enemy && enemy.boss) table = LOOT_TABLE.boss;
  else if (LOOT_TABLE[key]) table = LOOT_TABLE[key];
  else {
    Object.keys(LOOT_TABLE).forEach(function (k) {
      if (k !== 'default' && k !== 'boss' && key.indexOf(k) >= 0) table = LOOT_TABLE[k];
    });
  }
  const out = [];
  const luckBonus = Math.min(12, Math.floor(luck / 15));
  table.forEach(function (row) {
    if (Math.random() * 100 < Math.min(85, row.chance + luckBonus)) {
      const qty = row.min + Math.floor(Math.random() * (row.max - row.min + 1));
      out.push({ id: row.id, qty: qty });
    }
  });
  return out;
}

module.exports = { ITEMS, SHOP_CATS, RECIPES, LOOT_TABLE, getItem, listShop, rollLoot };
