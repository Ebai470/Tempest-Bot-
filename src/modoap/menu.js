'use strict';
/** MODOAP — menus no estilo ╭┈❁ (menuap e menuap_<categoria>). */
const up = (s) => [...s].map(c => { const k = c.charCodeAt(0); return k >= 65 && k <= 90 ? String.fromCodePoint(0x1D400 + k - 65) : k >= 97 && k <= 122 ? String.fromCodePoint(0x1D41A + k - 97) : c; }).join('');
const fr = (s) => [...s].map(c => { const k = c.charCodeAt(0); return k >= 65 && k <= 90 ? String.fromCodePoint(0x1D56C + k - 65) : k >= 97 && k <= 122 ? String.fromCodePoint(0x1D586 + k - 97) : c; }).join('');
const LINE = '╰┈┈┈┈┈┈┈┈┈┈';
const CATS = {
  carteira: ['💰 Carteira', [['Saldo', 'apsaldo'], ['Banco', 'apbanco'], ['Cofre', 'apcofre'], ['Depositar', 'apdepositar valor'], ['Levantar', 'aplevantar valor'], ['Pagar', 'appagar @user valor'], ['Diário', 'apdiario'], ['Mensal', 'apmensal'], ['Perfil', 'apperfil'], ['Património', 'appatrimonio'], ['Ranking', 'apranking'], ['Histórico', 'aphistorico']]],
  dividas: ['🏦 Dívidas', [['Emprestar', 'apdivida @user valor'], ['Pagar dívida', 'appagardivida'], ['Minhas dívidas', 'apdividas'], ['Empréstimos dados', 'apemprestimo'], ['Crédito', 'apcredito']]],
  trabalhos: ['💼 Trabalhos', [['Trabalhar', 'aptrabalhar'], ['Hora extra', 'aphoraextra'], ['Bico', 'apbico'], ['Freela', 'apfreela'], ['Entrega', 'apentrega'], ['Mendigar', 'apmendigar'], ['Vadiar', 'apvadiar']]],
  jogos: ['🎲 Jogos', [['Apostar', 'apapostar valor'], ['Cara ou coroa', 'apcaraoucoroa valor cara'], ['Dados', 'apdados valor'], ['Roleta', 'aproleta valor cor'], ['Par ou ímpar', 'apparimpar valor par'], ['Corrida', 'apcorrida valor 1-4'], ['Duelo', 'apduelo @user valor'], ['Aviator', 'apaviator valor | auto'], ['Rocket', 'aprocket valor | auto'], ['Retirar (crash)', 'apcashout'], ['Dice', 'apdice valor 1-6'], ['Plinko', 'applinko valor'], ['Mines', 'apmines valor'], ['Tower', 'aptower valor']]],
  paineis: ['🖥️ Painéis HTML', [['Aviator 2', 'apaviator2 valor'], ['Mines 2', 'apmines2 valor'], ['Plinko 2', 'applinko2 valor'], ['Dice 2', 'apdice2 valor'], ['Moeda 2', 'apmoeda2 valor'], ['Slots 2', 'apslots2 valor'], ['Roleta 2', 'aproleta2 valor'], ['Tower 2', 'aptower2 valor'], ['Hi-Lo 2', 'aphilo2 valor'], ['Blackjack 2', 'apblackjack2 valor'], ['Cavalos', 'apcavalo valor'], ['Ativar conta', 'aplogin CÓDIGO'], ['Resgatar saque', 'resgatarap CÓDIGO'], ['Lista', 'appaineis']]],
  crimes: ['🚨 Crimes', [['Crime', 'apcrime'], ['Roubar', 'aproubar @user'], ['Assaltar', 'apassaltar'], ['Contrabando', 'apcontrabando'], ['Fugir', 'apfugir'], ['Prisão', 'apprisao'], ['Liberdade', 'apliberdade'], ['Procurados', 'approcurado']]],
  partidas: ['😈 Partidas', [['Troll', 'aptroll @user'], ['Multar', 'apmultar @user valor'], ['Golpe', 'apgolpe @user'], ['Tribunal', 'aptribunal @user'], ['Embargo', 'apembargo @user'], ['Desafio', 'apdesafio @user'], ['Mute (1-5 min)', 'apmute @user minutos'], ['Pagar desmute (2×)', 'apdesmute @user']]],
  comercio: ['🛒 Comércio', [['Loja', 'aploja'], ['Comprar', 'apcomprar nome'], ['Vender', 'apvender nome'], ['Inventário', 'apinventario'], ['Mercado', 'apmercado'], ['Presente', 'appresente @user item'], ['Investir', 'apinvestir valor'], ['Negócio', 'apnegocio'], ['Empresa', 'apempresa']]],
  dono: ['👑 Dono', [['Dar dinheiro', 'apaddmoney @user valor'], ['Tirar dinheiro', 'apremovemoney @user valor'], ['Definir saldo', 'apsetmoney @user valor'], ['Reiniciar jogador', 'apreset @user'], ['Economia on/off', 'apeconomia on'], ['Global/Grupo', 'apmodoeconomia global'], ['Diário', 'apsetdiario valor'], ['Trabalho', 'apsettrabalho valor'], ['Mute', 'apsetmute valor'], ['Probabilidade', 'apsetprobabilidade jogo %'], ['Multiplicador', 'apsetmultiplicador jogo x'], ['Cooldowns', 'apcooldowns'], ['Mudar cooldown', 'apsetcooldown cmd tempo'], ['Reset cooldown', 'apresetcooldown @user'], ['Ver cooldown', 'apcooldownstatus @user'], ['Modo seguro painéis', 'apaineltrava on'], ['Login dos painéis', 'appainelpin on'], ['Config', 'apconfig'], ['Estatísticas', 'apstats']]]
};
function main() {
  let t = '╭┈❁ 𓆩༒𓆪 ' + up('MODOAP') + ' · ' + up('TEMPEST BOT') + '\n┊\n┊  ๋࣭ ⭑ ' + fr('Economia Virtual') + ' ⭑ ๋࣭\n┊      𖤐 ⛧ ⚔ ⛧ 𖤐\n' + LINE + '\n╭┈❁ ' + up('CATEGORIAS') + ' ❁┈\n┊\n';
  for (const k of Object.keys(CATS)) t += '┊ *𖥔 ' + CATS[k][0].replace(/^\S+\s/, '') + '*\n┊   ╰┈➤ menuap_' + k + '\n┊\n';
  return t + '┊  Saldo: apsaldo\n┊  Ligar/Desligar: modoap on/off\n' + LINE + '\n© TEMPEST BOT';
}
function cat(k) {
  const c = CATS[k]; if (!c) return null;
  let t = '╭┈❁ 𓆩༒𓆪 ' + up(c[0].replace(/^\S+\s/, '')) + ' ❁┈\n┊\n';
  for (const e of c[1]) t += '┊ *𖥔 ' + e[0] + '*\n┊   ╰┈➤ ' + e[1] + '\n┊\n';
  return t + '┊  Voltar: menuap\n' + LINE + '\n© TEMPEST BOT';
}
module.exports = { main, cat, CATS };

// MODOAP_V4

// MODOAP_V5

// MODOAP_V6

// MODOAP_V7

// MODOAP_V9
