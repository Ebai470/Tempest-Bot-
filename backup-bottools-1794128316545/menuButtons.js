'use strict';
const { btn, getEnv } = require('./nativeFlow');
const MT = require('./menuTheme');

function build(on, rows, pref) {
  const S = (t) => MT.sc(t, 'title', on);
  const games = MT.styleSections([{
    title: 'Mini Games',
    rows: [
      { header: '🕹️ Arcade', title: 'Arcade Sega', description: '5 jogos clássicos 2D em tela 16:9', id: 'sgm:menu' },
      { header: '🎮 Nintendo 64', title: 'Nintendo 64', description: '10 jogos 3D em tela 16:9', id: 'n64:menu' },
      { header: '🕹️ Jogos', title: 'Jogos Interativos', description: 'Velha, Connect 4, PPT, forca e mais', id: 'rp:games' },
      { header: '🌌 Isekai', title: 'RPG Isekai', description: 'Aventura, personagem, guilda e mais', id: 'rp:isk:home' },
      { header: '🎮 Web', title: 'Jogos Web', description: 'Jogos web, velha, ligue 4', id: 'mn:cmd:menuwebgames' }
    ]
  }], on);
  const menus = MT.styleSections([
    { title: 'Menus de Comandos', rows: rows },
    { title: 'Atalhos', rows: [
      { header: '🏓 Ping', title: 'Ping', description: 'Ver se o bot está online', id: 'mn:cmd:ping' },
      { header: '📝 Texto', title: 'Texto', description: 'Menu em texto', id: 'mn:txt' },
      { header: '🌐 Idioma', title: 'Idioma', description: 'Mudar o idioma do bot', id: 'lg:menu' }
    ] }
  ], on);

  const buttons = [
    btn.channel(MT.B.canal(on)),
    btn.reply(MT.B.dono(on), 'mn:owner'), // TP_MENUV2
    btn.list('-ˏˋ ' + S('Menus de Comandos') + ' ˊˎ-', menus),
    btn.list('ᯓ★ ' + S('Mini Games'), games),
    btn.reply('★⁺˚· ' + S('Alugar Bot') + ' ·˚⁺★', 'mn:cat:aluguel')
  ];
  const painel = getEnv('PAINEL_URL');
  if (painel) buttons.push(btn.url('-ˏˋ✳ ' + S('Abrir Painel') + ' ✳ˊˎ-', painel));
  buttons.push(btn.copy('·⁺✧ ' + S('Copiar Prefixo') + ' [ ' + pref + ' ] ✧⁺·', pref));

  const dividers = [];
  for (let i = 0; i < Math.max(0, buttons.length - 2); i++) dividers.push(i);
  const params = {
    bottom_sheet: {
      in_thread_buttons_limit: 3,
      divider_indices: dividers,
      list_title: '✰ ' + S('Tempest Bot') + ' ✰',
      button_title: '-ˏˋ ' + S('Abrir Opcoes') + ' ˊˎ-'
    }
  };
  return { buttons: buttons, params: params };
}

module.exports = { build };
