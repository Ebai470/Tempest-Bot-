/**
 * Jogos e brincadeiras locais
 */

const { token, tag } = require('../../utils/mention');
const activeGames = new Map();
const playerGame = new Map();
const wordSearchGames = new Map();
const wordSearchRecent = [];

const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
const SYM = { X: '❌', O: '⭕' };
const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function emptyBoard() {
  return [null, null, null, null, null, null, null, null, null];
}

function renderBoard(board) {
  const cell = (i) => {
    if (board[i] === 'X') return SYM.X;
    if (board[i] === 'O') return SYM.O;
    return NUM[i];
  };
  return (
    '╔═══════════╗\n' +
    '║  ' + cell(0) + ' │ ' + cell(1) + ' │ ' + cell(2) + '  ║\n' +
    '║ ───┼───┼─── ║\n' +
    '║  ' + cell(3) + ' │ ' + cell(4) + ' │ ' + cell(5) + '  ║\n' +
    '║ ───┼───┼─── ║\n' +
    '║  ' + cell(6) + ' │ ' + cell(7) + ' │ ' + cell(8) + '  ║\n' +
    '╚═══════════╝'
  );
}

function checkWinner(board) {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
  }
  if (board.every((x) => x)) return 'draw';
  return null;
}

function freeCells(board) {
  const out = [];
  for (let i = 0; i < 9; i++) if (!board[i]) out.push(i);
  return out;
}

function minimax(board, isMax) {
  const res = checkWinner(board);
  if (res === 'O') return { score: 10 };
  if (res === 'X') return { score: -10 };
  if (res === 'draw') return { score: 0 };

  const free = freeCells(board);
  if (isMax) {
    let best = { score: -Infinity, move: free[0] };
    for (let i = 0; i < free.length; i++) {
      const idx = free[i];
      board[idx] = 'O';
      const r = minimax(board, false);
      board[idx] = null;
      if (r.score > best.score) best = { score: r.score, move: idx };
    }
    return best;
  } else {
    let best = { score: Infinity, move: free[0] };
    for (let i = 0; i < free.length; i++) {
      const idx = free[i];
      board[idx] = 'X';
      const r = minimax(board, true);
      board[idx] = null;
      if (r.score < best.score) best = { score: r.score, move: idx };
    }
    return best;
  }
}

function botMove(board) {
  const free = freeCells(board);
  if (!free.length) return null;

  // 1) ganhar ja
  for (let i = 0; i < free.length; i++) {
    const t = board.slice();
    t[free[i]] = 'O';
    if (checkWinner(t) === 'O') return free[i];
  }
  // 2) bloquear X
  for (let i = 0; i < free.length; i++) {
    const t = board.slice();
    t[free[i]] = 'X';
    if (checkWinner(t) === 'X') return free[i];
  }

  // 3) minimax (jogo perfeito)
  const b = board.slice();
  const best = minimax(b, true);
  if (best && best.move !== undefined && best.move !== null && !board[best.move]) {
    return best.move;
  }

  // fallback
  if (free.includes(4)) return 4;
  const corners = [0, 2, 6, 8].filter(function (i) { return free.includes(i); });
  if (corners.length) return corners[0];
  return free[0];
}

function endGame(gameKey, game) {
  activeGames.delete(gameKey);
  if (game && game.players) {
    Object.values(game.players).forEach((jid) => {
      if (jid && jid !== 'bot') playerGame.delete(jid);
    });
  }
}

function findGame(playerJid) {
  const key = playerGame.get(playerJid);
  if (!key) return null;
  const g = activeGames.get(key);
  if (!g) {
    playerGame.delete(playerJid);
    return null;
  }
  return { key, game: g };
}


async function doJogarVelha(ctx, posRaw) {
  const found = findGame(ctx.sender);
  if (!found || found.game.type !== 'ttt') {
    return false; // silencioso se nao ha jogo
  }
  const game = found.game;
  if (game.mode === 'pvp' && game.status === 'pending') {
    await ctx.reply('⏳ Aguarde o oponente aceitar (*aceitarvelha*).');
    return true;
  }
  const symbol = game.players.X === ctx.sender ? 'X' : (game.players.O === ctx.sender ? 'O' : null);
  if (!symbol) {
    await ctx.reply('❌ Você não é jogador desta partida.');
    return true;
  }
  if (game.turn !== symbol) {
    await ctx.reply('⏳ Não é a sua vez.');
    return true;
  }
  const pos = parseInt(posRaw, 10) - 1;
  if (isNaN(pos) || pos < 0 || pos > 8 || game.board[pos]) {
    await ctx.reply('❌ Casa inválida (1-9 livre).\n\n' + renderBoard(game.board));
    return true;
  }
  game.board[pos] = symbol;
  let result = checkWinner(game.board);
  if (!result && game.mode === 'bot' && symbol === 'X') {
    const botPos = botMove(game.board);
    if (botPos !== null) {
      game.board[botPos] = 'O';
      result = checkWinner(game.board);
    }
    game.turn = 'X';
  } else if (!result && game.mode === 'pvp') {
    game.turn = symbol === 'X' ? 'O' : 'X';
  }
  const view = renderBoard(game.board);
  if (result === 'X' || result === 'O') {
    const winnerJid = game.players[result];
    endGame(found.key, game);
    if (game.mode === 'bot') {
      await ctx.reply(view + '\n\n' + (result === 'X' ? '🏆 *Você venceu!*' : '🤖 *Bot venceu!*'));
    } else {
      const wtag = '@' + String(winnerJid).split('@')[0];
      await ctx.reply(view + '\n\n🏆 *' + SYM[result] + ' venceu!* ' + wtag, { mentions: [winnerJid] });
    }
    return true;
  }
  if (result === 'draw') {
    endGame(found.key, game);
    await ctx.reply(view + '\n\n🤝 *Empate!*');
    return true;
  }
  if (game.mode === 'bot') {
    await ctx.reply(view + '\n\nSua vez (❌). Digite *j1*-*j9*');
  } else {
    const next = game.players[game.turn];
    await ctx.reply(
      view + '\n\nVez de ' + SYM[game.turn] + ' @' + String(next).split('@')[0] + '\nDigite *j1*-*j9*',
      { mentions: [next] }
    );
  }
  return true;
}

module.exports = [
  {
    name: 'dado',
    aliases: ['dice', 'rolar'],
    category: 'bn',
    description: 'Rola um dado',
    handler: async (ctx) => {
      const sides = parseInt(ctx.args[0]) || 6;
      const result = Math.floor(Math.random() * Math.min(sides, 100)) + 1;
      await ctx.reply('🎲 Você tirou: *' + result + '* (d' + sides + ')');
    }
  },
  {
    name: 'moeda',
    aliases: ['coin', 'caraoucoroa'],
    category: 'bn',
    description: 'Cara ou coroa',
    handler: async (ctx) => {
      const r = Math.random() > 0.5 ? 'Cara' : 'Coroa';
      await ctx.reply('🪙 Resultado: *' + r + '*');
    }
  },
  {
    name: 'chance',
    aliases: ['probabilidade'],
    category: 'bn',
    description: 'Calcula chance de algo',
    handler: async (ctx) => {
      const pct = Math.floor(Math.random() * 101);
      await ctx.reply('🎯 A chance de *' + (ctx.text || 'isso') + '* é de *' + pct + '%*');
    }
  },
  {
    name: 'quando',
    category: 'bn',
    description: 'Quando vai acontecer',
    handler: async (ctx) => {
      const opts = ['hoje', 'amanhã', 'semana que vem', 'mês que vem', 'ano que vem', 'nunca', 'em breve', 'daqui a pouco'];
      const r = opts[Math.floor(Math.random() * opts.length)];
      await ctx.reply('📅 *' + (ctx.text || 'Isso') + '* vai acontecer: *' + r + '*');
    }
  },
  {
    name: 'ship',
    aliases: ['shippar'],
    category: 'bn',
    description: 'Shippa duas pessoas',
    groupOnly: true,
    handler: async (ctx) => {
      const { tag } = require('../../utils/mention');
      const NL = String.fromCharCode(10);
      let a = null;
      let b = null;
      try {
        if (ctx.mentioned && ctx.mentioned.length >= 2) {
          a = ctx.mentioned[0];
          b = ctx.mentioned[1];
        } else if (ctx.mentioned && ctx.mentioned.length === 1) {
          a = ctx.sender;
          b = ctx.mentioned[0];
        } else if (ctx.getMentionedOrQuoted) {
          const q = ctx.getMentionedOrQuoted();
          if (q && q !== ctx.sender) {
            a = ctx.sender;
            b = q;
          }
        }
      } catch (e) {}

      if (!a || !b || a === b) {
        try {
          const meta = await ctx.sock.groupMetadata(ctx.jid);
          let members = (meta.participants || []).map(function (p) { return p.id; }).filter(Boolean);
          try {
            const botId = ctx.sock.user && (ctx.sock.user.id || '');
            const botNum = String(botId).split(':')[0].split('@')[0];
            members = members.filter(function (id) {
              return String(id).split(':')[0].split('@')[0] !== botNum;
            });
          } catch (e2) {}
          for (let i = members.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = members[i];
            members[i] = members[j];
            members[j] = tmp;
          }
          if (!a) a = members[0] || ctx.sender;
          if (!b || b === a) {
            b = members.find(function (m) { return m !== a; }) || members[1] || ctx.sender;
          }
        } catch (e3) {
          return ctx.reply('Nao consegui pegar membros do grupo.');
        }
      }

      const pct = Math.floor(Math.random() * 101);
      let frase = 'Melhor so amigos';
      if (pct > 80) frase = 'Casal perfeito!';
      else if (pct > 60) frase = 'Tem quimica!';
      else if (pct > 40) frase = 'Tem chance...';

      const text = 'SHIP' + NL + NL + tag(a) + ' + ' + tag(b) + NL + NL +
        'Compatibilidade: *' + pct + '%*' + NL + frase;
      await ctx.reply(text, { mentions: [a, b] });
    }
  },
  {
    name: 'jogodavelha',
    aliases: ['ttt', 'tictactoe', 'velha'],
    category: 'bn',
    description: 'Jogo da Velha vs bot ou vs membro',
    usage: '!jogodavelha | !jogodavelha @user',
    handler: async (ctx) => {
      if (findGame(ctx.sender)) {
        return ctx.reply('⚠️ Você já está em um jogo.\nDigite *j1*-*j9* ou *cancelarvelha*');
      }

      let opponent = null;
      try {
        if (ctx.getMentionedOrQuoted) opponent = ctx.getMentionedOrQuoted();
      } catch (e) {}
      if (!opponent && ctx.mentioned && ctx.mentioned[0]) opponent = ctx.mentioned[0];

      const board = emptyBoard();

      // VS BOT
      if (!opponent || opponent === ctx.sender) {
        const key = 'bot:' + ctx.sender;
        const game = {
          type: 'ttt',
          mode: 'bot',
          board: board,
          turn: 'X',
          players: { X: ctx.sender, O: 'bot' }
        };
        activeGames.set(key, game);
        playerGame.set(ctx.sender, key);
        await ctx.reply(
          '⭕ *JOGO DA VELHA*\n' +
          'Modo: *você vs BOT*\n\n' +
          renderBoard(board) + '\n\n' +
          'Você: ❌    Bot: ⭕\n' +
          'Sua vez! Digite *j1* até *j9*\n' +
          '(ex: *j5*)'
        );
        return;
      }

      // VS MEMBRO
      if (!ctx.isGroup) {
        return ctx.reply('❌ Desafio entre pessoas só em *grupo*.\nNo privado use: *jogodavelha* (vs bot)');
      }
      if (findGame(opponent)) {
        return ctx.reply('⚠️ Essa pessoa já está em um jogo.');
      }

      const key = 'pvp:' + ctx.jid + ':' + Date.now();
      const game = {
        type: 'ttt',
        mode: 'pvp',
        status: 'pending',
        board: board,
        turn: 'X',
        players: { X: ctx.sender, O: opponent },
        group: ctx.jid
      };
      activeGames.set(key, game);
      playerGame.set(ctx.sender, key);
      playerGame.set(opponent, key);

      const a = token(ctx.sender);
      const b = token(opponent);
      await ctx.reply(
        '🎮 *DESAFIO — JOGO DA VELHA*\n\n' +
        tag(ctx.sender) + ' desafiou ' + tag(opponent) + '!\n\n' +
        renderBoard(board) + '\n\n' +
        tag(opponent) + ' digite *aceitarvelha* para começar\n' +
        'ou *recusarvelha* para cancelar.',
        { mentions: [ctx.sender, opponent] }
      );
    }
  },
  {
    name: 'aceitarvelha',
    aliases: ['aceitarttt'],
    category: 'bn',
    description: 'Aceita desafio de jogo da velha',
    groupOnly: true,
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.mode !== 'pvp' || found.game.status !== 'pending') {
        return ctx.reply('❌ Nenhum desafio pendente para você.');
      }
      if (found.game.players.O !== ctx.sender) {
        return ctx.reply('❌ Só o *desafiado* pode aceitar.');
      }
      found.game.status = 'active';
      const x = found.game.players.X;
      const o = found.game.players.O;
      await ctx.reply(
        '✅ *Jogo iniciado!*\n\n' +
        renderBoard(found.game.board) + '\n\n' +
        '❌ @' + String(x).split('@')[0] + '  vs  ⭕ @' + String(o).split('@')[0] + '\n' +
        'Vez de ❌ — digite *j1*-*j9*',
        { mentions: [x, o] }
      );
    }
  },
  {
    name: 'recusarvelha',
    aliases: ['recusarttt', 'cancelarvelha'],
    category: 'bn',
    description: 'Recusa ou cancela jogo da velha',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found) return ctx.reply('❌ Você não está em nenhum jogo.');
      endGame(found.key, found.game);
      await ctx.reply('🚫 Jogo da velha cancelado.');
    }
  },
  {
    name: 'jogar',
    category: 'bn',
    description: 'Faz jogada no jogo da velha',
    usage: '!jogar 5 ou só 5',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') {
        return ctx.reply('❌ Nenhum jogo ativo.\n*jogodavelha* (vs bot)\n*jogodavelha @user*');
      }
      const n = (ctx.args && ctx.args[0]) ? ctx.args[0] : '';
      if (!n) return ctx.reply('Digite a casa *1-9*\nEx: *jogar 5* ou só *5*');
      await doJogarVelha(ctx, n);
    }
  },

  {
    name: 'verdadeoudesafio',
    aliases: ['vod', 'verdade', 'desafio'],
    category: 'bn',
    description: 'Verdade ou desafio',
    handler: async (ctx) => {
      const tipo = Math.random() > 0.5 ? 'Verdade' : 'Desafio';
      const verdades = [
        'Qual foi a última mentira que você contou?',
        'Quem você daria um beijo no grupo?',
        'Qual seu maior medo?',
        'Já se arrependeu de algo que postou?',
        'Qual o crush secreto do grupo?'
      ];
      const desafios = [
        'Mande um áudio cantando',
        'Troque a foto de perfil por 10 minutos',
        'Fale o nome de 3 pessoas que você acha atraente no grupo',
        'Conte uma piada ruim',
        'Mande um sticker aleatório agora'
      ];
      const pergunta = tipo === 'Verdade'
        ? verdades[Math.floor(Math.random() * verdades.length)]
        : desafios[Math.floor(Math.random() * desafios.length)];
      await ctx.reply('🎯 *' + tipo + '*\n\n' + pergunta);
    }
  },
  {
    name: 'ppt',
    aliases: ['jokenpo', 'pedrapapeltesoura'],
    category: 'bn',
    description: 'Pedra, papel ou tesoura',
    usage: '!ppt pedra',
    handler: async (ctx) => {
      const opts = ['pedra', 'papel', 'tesoura'];
      const user = (ctx.args[0] || '').toLowerCase();
      if (!opts.includes(user)) return ctx.reply('Use: ppt pedra | ppt papel | ppt tesoura');
      const bot = opts[Math.floor(Math.random() * 3)];
      let res = 'Empate!';
      if (user === bot) res = 'Empate!';
      else if (
        (user === 'pedra' && bot === 'tesoura') ||
        (user === 'papel' && bot === 'pedra') ||
        (user === 'tesoura' && bot === 'papel')
      ) res = 'Você ganhou! 🏆';
      else res = 'Bot ganhou! 🤖';
      await ctx.reply('✊ *PPT*\nVocê: *' + user + '*\nBot: *' + bot + '*\n\n' + res);
    }
  },
  {
    name: 'advinha',
    aliases: ['adivinhar', 'numero'],
    category: 'bn',
    description: 'Adivinhe o número 1-10',
    usage: '!advinha 7',
    handler: async (ctx) => {
      const n = parseInt(ctx.args[0], 10);
      if (isNaN(n) || n < 1 || n > 10) return ctx.reply('Escolha um número de 1 a 10.\nEx: advinha 7');
      const secret = Math.floor(Math.random() * 10) + 1;
      if (n === secret) await ctx.reply('🎉 Acertou! Era *' + secret + '*');
      else await ctx.reply('❌ Errou. Era *' + secret + '*');
    }
  },
  {
    name: 'forca',
    aliases: ['hangman'],
    category: 'bn',
    description: 'Jogo da forca',
    handler: async (ctx) => {
      const words = ['javascript', 'whatsapp', 'beatriz', 'mozambique', 'termux', 'internet', 'figurinhas'];
      const word = words[Math.floor(Math.random() * words.length)];
      activeGames.set(ctx.sender, {
        type: 'forca',
        word: word,
        display: word.split('').map(() => '_'),
        tried: [],
        lives: 6
      });
      await ctx.reply('🪢 *Forca*\n\n' + activeGames.get(ctx.sender).display.join(' ') + '\nVidas: 6\nUse !letra a');
    }
  },
  {
    name: 'letra',
    category: 'bn',
    description: 'Tenta letra na forca',
    usage: '!letra a',
    handler: async (ctx) => {
      const game = activeGames.get(ctx.sender);
      if (!game || game.type !== 'forca') return ctx.reply('❌ Nenhum jogo de forca. Use !forca');
      const letter = (ctx.args[0] || '').toLowerCase().slice(0, 1);
      if (!letter || !/[a-z]/.test(letter)) return ctx.reply('❌ Informe uma letra.');
      if (game.tried.includes(letter)) return ctx.reply('Já tentou essa letra.');
      game.tried.push(letter);
      if (game.word.includes(letter)) {
        game.word.split('').forEach((ch, i) => {
          if (ch === letter) game.display[i] = letter;
        });
      } else {
        game.lives--;
      }
      if (!game.display.includes('_')) {
        activeGames.delete(ctx.sender);
        await ctx.reply('🎉 Você acertou! A palavra era *' + game.word + '*');
      } else if (game.lives <= 0) {
        activeGames.delete(ctx.sender);
        await ctx.reply('💀 Perdeu! A palavra era *' + game.word + '*');
      } else {
        await ctx.reply('🪢 ' + game.display.join(' ') + '\nVidas: ' + game.lives + '\nTentadas: ' + game.tried.join(', '));
      }
    }
  },
  {
    name: 'abraco',
    aliases: ['abraço', 'hug'],
    category: 'bn',
    description: 'Abraça alguém',
    handler: async (ctx) => {
      const t = (ctx.getMentionedOrQuoted && ctx.getMentionedOrQuoted()) || ctx.sender;
      await ctx.reply('🤗 ' + tag(ctx.sender) + ' abraçou ' + tag(t) + '!', { mentions: [ctx.sender, t] });
    }
  },
  {
    name: 'beijo',
    aliases: ['kiss', 'beijar'],
    category: 'bn',
    description: 'Beija alguém',
    handler: async (ctx) => {
      const t = (ctx.getMentionedOrQuoted && ctx.getMentionedOrQuoted()) || ctx.sender;
      await ctx.reply('😘 ' + tag(ctx.sender) + ' deu um beijo em ' + tag(t) + '!', { mentions: [ctx.sender, t] });
    }
  },
  {
    name: 'tapa',
    aliases: ['slap'],
    category: 'bn',
    description: 'Dá um tapa',
    handler: async (ctx) => {
      const t = ctx.getMentionedOrQuoted && ctx.getMentionedOrQuoted();
      if (!t) return ctx.reply('❌ Marque alguém.');
      await ctx.reply('👋 ' + tag(ctx.sender) + ' deu um tapa em ' + tag(t) + '!', { mentions: [ctx.sender, t] });
    }
  },
  {
    name: 'soco',
    aliases: ['punch'],
    category: 'bn',
    description: 'Dá um soco',
    handler: async (ctx) => {
      const t = ctx.getMentionedOrQuoted && ctx.getMentionedOrQuoted();
      if (!t) return ctx.reply('❌ Marque alguém.');
      await ctx.reply('👊 ' + tag(ctx.sender) + ' socou ' + tag(t) + '!', { mentions: [ctx.sender, t] });
    }
  }
,

  /* VELHA_NUM_CMDS */,
  {
    name: '1',
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogada velha casa 1',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') return; // silencioso
      await doJogarVelha(ctx, '1');
    }
  },,
  {
    name: '2',
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogada velha casa 2',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') return; // silencioso
      await doJogarVelha(ctx, '2');
    }
  },,
  {
    name: '3',
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogada velha casa 3',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') return; // silencioso
      await doJogarVelha(ctx, '3');
    }
  },,
  {
    name: '4',
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogada velha casa 4',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') return; // silencioso
      await doJogarVelha(ctx, '4');
    }
  },,
  {
    name: '5',
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogada velha casa 5',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') return; // silencioso
      await doJogarVelha(ctx, '5');
    }
  },,
  {
    name: '6',
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogada velha casa 6',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') return; // silencioso
      await doJogarVelha(ctx, '6');
    }
  },,
  {
    name: '7',
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogada velha casa 7',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') return; // silencioso
      await doJogarVelha(ctx, '7');
    }
  },,
  {
    name: '8',
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogada velha casa 8',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') return; // silencioso
      await doJogarVelha(ctx, '8');
    }
  },,
  {
    name: '9',
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogada velha casa 9',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') return; // silencioso
      await doJogarVelha(ctx, '9');
    }
  },
,
  /* VELHA_J_CMDS */
  {
    name: 'j1',
    aliases: ['jogar1'],
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogo da velha casa 1',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') {
        return ctx.reply('❌ Nenhum jogo da velha ativo.\nUse *jogodavelha*');
      }
      const game = found.game;
      if (game.mode === 'pvp' && game.status === 'pending') {
        return ctx.reply('⏳ Aguarde *aceitarvelha*.');
      }
      const symbol = game.players.X === ctx.sender ? 'X' : (game.players.O === ctx.sender ? 'O' : null);
      if (!symbol) return ctx.reply('❌ Você não é jogador desta partida.');
      if (game.turn !== symbol) return ctx.reply('⏳ Não é a sua vez.');
      const pos = 1 - 1;
      if (game.board[pos]) {
        return ctx.reply('❌ Casa ocupada.\n\n' + renderBoard(game.board));
      }
      game.board[pos] = symbol;
      let result = checkWinner(game.board);
      if (!result && game.mode === 'bot' && symbol === 'X') {
        const botPos = botMove(game.board);
        if (botPos !== null) {
          game.board[botPos] = 'O';
          result = checkWinner(game.board);
        }
        game.turn = 'X';
      } else if (!result && game.mode === 'pvp') {
        game.turn = symbol === 'X' ? 'O' : 'X';
      }
      const view = renderBoard(game.board);
      if (result === 'X' || result === 'O') {
        const winnerJid = game.players[result];
        endGame(found.key, game);
        if (game.mode === 'bot') {
          return ctx.reply(view + '\n\n' + (result === 'X' ? '🏆 *Você venceu!*' : '🤖 *Bot venceu!*'));
        }
        return ctx.reply(view + '\n\n🏆 *' + SYM[result] + ' venceu!* @' + String(winnerJid).split('@')[0], { mentions: [winnerJid] });
      }
      if (result === 'draw') {
        endGame(found.key, game);
        return ctx.reply(view + '\n\n🤝 *Empate!*');
      }
      if (game.mode === 'bot') {
        return ctx.reply(view + '\n\nSua vez (❌). Digite *j1*-*j9*');
      }
      const next = game.players[game.turn];
      return ctx.reply(view + '\n\nVez de ' + SYM[game.turn] + ' @' + String(next).split('@')[0] + '\nDigite *j1*-*j9*', { mentions: [next] });
    }
  },
  {
    name: 'j2',
    aliases: ['jogar2'],
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogo da velha casa 2',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') {
        return ctx.reply('❌ Nenhum jogo da velha ativo.\nUse *jogodavelha*');
      }
      const game = found.game;
      if (game.mode === 'pvp' && game.status === 'pending') {
        return ctx.reply('⏳ Aguarde *aceitarvelha*.');
      }
      const symbol = game.players.X === ctx.sender ? 'X' : (game.players.O === ctx.sender ? 'O' : null);
      if (!symbol) return ctx.reply('❌ Você não é jogador desta partida.');
      if (game.turn !== symbol) return ctx.reply('⏳ Não é a sua vez.');
      const pos = 2 - 1;
      if (game.board[pos]) {
        return ctx.reply('❌ Casa ocupada.\n\n' + renderBoard(game.board));
      }
      game.board[pos] = symbol;
      let result = checkWinner(game.board);
      if (!result && game.mode === 'bot' && symbol === 'X') {
        const botPos = botMove(game.board);
        if (botPos !== null) {
          game.board[botPos] = 'O';
          result = checkWinner(game.board);
        }
        game.turn = 'X';
      } else if (!result && game.mode === 'pvp') {
        game.turn = symbol === 'X' ? 'O' : 'X';
      }
      const view = renderBoard(game.board);
      if (result === 'X' || result === 'O') {
        const winnerJid = game.players[result];
        endGame(found.key, game);
        if (game.mode === 'bot') {
          return ctx.reply(view + '\n\n' + (result === 'X' ? '🏆 *Você venceu!*' : '🤖 *Bot venceu!*'));
        }
        return ctx.reply(view + '\n\n🏆 *' + SYM[result] + ' venceu!* @' + String(winnerJid).split('@')[0], { mentions: [winnerJid] });
      }
      if (result === 'draw') {
        endGame(found.key, game);
        return ctx.reply(view + '\n\n🤝 *Empate!*');
      }
      if (game.mode === 'bot') {
        return ctx.reply(view + '\n\nSua vez (❌). Digite *j1*-*j9*');
      }
      const next = game.players[game.turn];
      return ctx.reply(view + '\n\nVez de ' + SYM[game.turn] + ' @' + String(next).split('@')[0] + '\nDigite *j1*-*j9*', { mentions: [next] });
    }
  },
  {
    name: 'j3',
    aliases: ['jogar3'],
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogo da velha casa 3',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') {
        return ctx.reply('❌ Nenhum jogo da velha ativo.\nUse *jogodavelha*');
      }
      const game = found.game;
      if (game.mode === 'pvp' && game.status === 'pending') {
        return ctx.reply('⏳ Aguarde *aceitarvelha*.');
      }
      const symbol = game.players.X === ctx.sender ? 'X' : (game.players.O === ctx.sender ? 'O' : null);
      if (!symbol) return ctx.reply('❌ Você não é jogador desta partida.');
      if (game.turn !== symbol) return ctx.reply('⏳ Não é a sua vez.');
      const pos = 3 - 1;
      if (game.board[pos]) {
        return ctx.reply('❌ Casa ocupada.\n\n' + renderBoard(game.board));
      }
      game.board[pos] = symbol;
      let result = checkWinner(game.board);
      if (!result && game.mode === 'bot' && symbol === 'X') {
        const botPos = botMove(game.board);
        if (botPos !== null) {
          game.board[botPos] = 'O';
          result = checkWinner(game.board);
        }
        game.turn = 'X';
      } else if (!result && game.mode === 'pvp') {
        game.turn = symbol === 'X' ? 'O' : 'X';
      }
      const view = renderBoard(game.board);
      if (result === 'X' || result === 'O') {
        const winnerJid = game.players[result];
        endGame(found.key, game);
        if (game.mode === 'bot') {
          return ctx.reply(view + '\n\n' + (result === 'X' ? '🏆 *Você venceu!*' : '🤖 *Bot venceu!*'));
        }
        return ctx.reply(view + '\n\n🏆 *' + SYM[result] + ' venceu!* @' + String(winnerJid).split('@')[0], { mentions: [winnerJid] });
      }
      if (result === 'draw') {
        endGame(found.key, game);
        return ctx.reply(view + '\n\n🤝 *Empate!*');
      }
      if (game.mode === 'bot') {
        return ctx.reply(view + '\n\nSua vez (❌). Digite *j1*-*j9*');
      }
      const next = game.players[game.turn];
      return ctx.reply(view + '\n\nVez de ' + SYM[game.turn] + ' @' + String(next).split('@')[0] + '\nDigite *j1*-*j9*', { mentions: [next] });
    }
  },
  {
    name: 'j4',
    aliases: ['jogar4'],
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogo da velha casa 4',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') {
        return ctx.reply('❌ Nenhum jogo da velha ativo.\nUse *jogodavelha*');
      }
      const game = found.game;
      if (game.mode === 'pvp' && game.status === 'pending') {
        return ctx.reply('⏳ Aguarde *aceitarvelha*.');
      }
      const symbol = game.players.X === ctx.sender ? 'X' : (game.players.O === ctx.sender ? 'O' : null);
      if (!symbol) return ctx.reply('❌ Você não é jogador desta partida.');
      if (game.turn !== symbol) return ctx.reply('⏳ Não é a sua vez.');
      const pos = 4 - 1;
      if (game.board[pos]) {
        return ctx.reply('❌ Casa ocupada.\n\n' + renderBoard(game.board));
      }
      game.board[pos] = symbol;
      let result = checkWinner(game.board);
      if (!result && game.mode === 'bot' && symbol === 'X') {
        const botPos = botMove(game.board);
        if (botPos !== null) {
          game.board[botPos] = 'O';
          result = checkWinner(game.board);
        }
        game.turn = 'X';
      } else if (!result && game.mode === 'pvp') {
        game.turn = symbol === 'X' ? 'O' : 'X';
      }
      const view = renderBoard(game.board);
      if (result === 'X' || result === 'O') {
        const winnerJid = game.players[result];
        endGame(found.key, game);
        if (game.mode === 'bot') {
          return ctx.reply(view + '\n\n' + (result === 'X' ? '🏆 *Você venceu!*' : '🤖 *Bot venceu!*'));
        }
        return ctx.reply(view + '\n\n🏆 *' + SYM[result] + ' venceu!* @' + String(winnerJid).split('@')[0], { mentions: [winnerJid] });
      }
      if (result === 'draw') {
        endGame(found.key, game);
        return ctx.reply(view + '\n\n🤝 *Empate!*');
      }
      if (game.mode === 'bot') {
        return ctx.reply(view + '\n\nSua vez (❌). Digite *j1*-*j9*');
      }
      const next = game.players[game.turn];
      return ctx.reply(view + '\n\nVez de ' + SYM[game.turn] + ' @' + String(next).split('@')[0] + '\nDigite *j1*-*j9*', { mentions: [next] });
    }
  },
  {
    name: 'j5',
    aliases: ['jogar5'],
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogo da velha casa 5',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') {
        return ctx.reply('❌ Nenhum jogo da velha ativo.\nUse *jogodavelha*');
      }
      const game = found.game;
      if (game.mode === 'pvp' && game.status === 'pending') {
        return ctx.reply('⏳ Aguarde *aceitarvelha*.');
      }
      const symbol = game.players.X === ctx.sender ? 'X' : (game.players.O === ctx.sender ? 'O' : null);
      if (!symbol) return ctx.reply('❌ Você não é jogador desta partida.');
      if (game.turn !== symbol) return ctx.reply('⏳ Não é a sua vez.');
      const pos = 5 - 1;
      if (game.board[pos]) {
        return ctx.reply('❌ Casa ocupada.\n\n' + renderBoard(game.board));
      }
      game.board[pos] = symbol;
      let result = checkWinner(game.board);
      if (!result && game.mode === 'bot' && symbol === 'X') {
        const botPos = botMove(game.board);
        if (botPos !== null) {
          game.board[botPos] = 'O';
          result = checkWinner(game.board);
        }
        game.turn = 'X';
      } else if (!result && game.mode === 'pvp') {
        game.turn = symbol === 'X' ? 'O' : 'X';
      }
      const view = renderBoard(game.board);
      if (result === 'X' || result === 'O') {
        const winnerJid = game.players[result];
        endGame(found.key, game);
        if (game.mode === 'bot') {
          return ctx.reply(view + '\n\n' + (result === 'X' ? '🏆 *Você venceu!*' : '🤖 *Bot venceu!*'));
        }
        return ctx.reply(view + '\n\n🏆 *' + SYM[result] + ' venceu!* @' + String(winnerJid).split('@')[0], { mentions: [winnerJid] });
      }
      if (result === 'draw') {
        endGame(found.key, game);
        return ctx.reply(view + '\n\n🤝 *Empate!*');
      }
      if (game.mode === 'bot') {
        return ctx.reply(view + '\n\nSua vez (❌). Digite *j1*-*j9*');
      }
      const next = game.players[game.turn];
      return ctx.reply(view + '\n\nVez de ' + SYM[game.turn] + ' @' + String(next).split('@')[0] + '\nDigite *j1*-*j9*', { mentions: [next] });
    }
  },
  {
    name: 'j6',
    aliases: ['jogar6'],
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogo da velha casa 6',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') {
        return ctx.reply('❌ Nenhum jogo da velha ativo.\nUse *jogodavelha*');
      }
      const game = found.game;
      if (game.mode === 'pvp' && game.status === 'pending') {
        return ctx.reply('⏳ Aguarde *aceitarvelha*.');
      }
      const symbol = game.players.X === ctx.sender ? 'X' : (game.players.O === ctx.sender ? 'O' : null);
      if (!symbol) return ctx.reply('❌ Você não é jogador desta partida.');
      if (game.turn !== symbol) return ctx.reply('⏳ Não é a sua vez.');
      const pos = 6 - 1;
      if (game.board[pos]) {
        return ctx.reply('❌ Casa ocupada.\n\n' + renderBoard(game.board));
      }
      game.board[pos] = symbol;
      let result = checkWinner(game.board);
      if (!result && game.mode === 'bot' && symbol === 'X') {
        const botPos = botMove(game.board);
        if (botPos !== null) {
          game.board[botPos] = 'O';
          result = checkWinner(game.board);
        }
        game.turn = 'X';
      } else if (!result && game.mode === 'pvp') {
        game.turn = symbol === 'X' ? 'O' : 'X';
      }
      const view = renderBoard(game.board);
      if (result === 'X' || result === 'O') {
        const winnerJid = game.players[result];
        endGame(found.key, game);
        if (game.mode === 'bot') {
          return ctx.reply(view + '\n\n' + (result === 'X' ? '🏆 *Você venceu!*' : '🤖 *Bot venceu!*'));
        }
        return ctx.reply(view + '\n\n🏆 *' + SYM[result] + ' venceu!* @' + String(winnerJid).split('@')[0], { mentions: [winnerJid] });
      }
      if (result === 'draw') {
        endGame(found.key, game);
        return ctx.reply(view + '\n\n🤝 *Empate!*');
      }
      if (game.mode === 'bot') {
        return ctx.reply(view + '\n\nSua vez (❌). Digite *j1*-*j9*');
      }
      const next = game.players[game.turn];
      return ctx.reply(view + '\n\nVez de ' + SYM[game.turn] + ' @' + String(next).split('@')[0] + '\nDigite *j1*-*j9*', { mentions: [next] });
    }
  },
  {
    name: 'j7',
    aliases: ['jogar7'],
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogo da velha casa 7',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') {
        return ctx.reply('❌ Nenhum jogo da velha ativo.\nUse *jogodavelha*');
      }
      const game = found.game;
      if (game.mode === 'pvp' && game.status === 'pending') {
        return ctx.reply('⏳ Aguarde *aceitarvelha*.');
      }
      const symbol = game.players.X === ctx.sender ? 'X' : (game.players.O === ctx.sender ? 'O' : null);
      if (!symbol) return ctx.reply('❌ Você não é jogador desta partida.');
      if (game.turn !== symbol) return ctx.reply('⏳ Não é a sua vez.');
      const pos = 7 - 1;
      if (game.board[pos]) {
        return ctx.reply('❌ Casa ocupada.\n\n' + renderBoard(game.board));
      }
      game.board[pos] = symbol;
      let result = checkWinner(game.board);
      if (!result && game.mode === 'bot' && symbol === 'X') {
        const botPos = botMove(game.board);
        if (botPos !== null) {
          game.board[botPos] = 'O';
          result = checkWinner(game.board);
        }
        game.turn = 'X';
      } else if (!result && game.mode === 'pvp') {
        game.turn = symbol === 'X' ? 'O' : 'X';
      }
      const view = renderBoard(game.board);
      if (result === 'X' || result === 'O') {
        const winnerJid = game.players[result];
        endGame(found.key, game);
        if (game.mode === 'bot') {
          return ctx.reply(view + '\n\n' + (result === 'X' ? '🏆 *Você venceu!*' : '🤖 *Bot venceu!*'));
        }
        return ctx.reply(view + '\n\n🏆 *' + SYM[result] + ' venceu!* @' + String(winnerJid).split('@')[0], { mentions: [winnerJid] });
      }
      if (result === 'draw') {
        endGame(found.key, game);
        return ctx.reply(view + '\n\n🤝 *Empate!*');
      }
      if (game.mode === 'bot') {
        return ctx.reply(view + '\n\nSua vez (❌). Digite *j1*-*j9*');
      }
      const next = game.players[game.turn];
      return ctx.reply(view + '\n\nVez de ' + SYM[game.turn] + ' @' + String(next).split('@')[0] + '\nDigite *j1*-*j9*', { mentions: [next] });
    }
  },
  {
    name: 'j8',
    aliases: ['jogar8'],
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogo da velha casa 8',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') {
        return ctx.reply('❌ Nenhum jogo da velha ativo.\nUse *jogodavelha*');
      }
      const game = found.game;
      if (game.mode === 'pvp' && game.status === 'pending') {
        return ctx.reply('⏳ Aguarde *aceitarvelha*.');
      }
      const symbol = game.players.X === ctx.sender ? 'X' : (game.players.O === ctx.sender ? 'O' : null);
      if (!symbol) return ctx.reply('❌ Você não é jogador desta partida.');
      if (game.turn !== symbol) return ctx.reply('⏳ Não é a sua vez.');
      const pos = 8 - 1;
      if (game.board[pos]) {
        return ctx.reply('❌ Casa ocupada.\n\n' + renderBoard(game.board));
      }
      game.board[pos] = symbol;
      let result = checkWinner(game.board);
      if (!result && game.mode === 'bot' && symbol === 'X') {
        const botPos = botMove(game.board);
        if (botPos !== null) {
          game.board[botPos] = 'O';
          result = checkWinner(game.board);
        }
        game.turn = 'X';
      } else if (!result && game.mode === 'pvp') {
        game.turn = symbol === 'X' ? 'O' : 'X';
      }
      const view = renderBoard(game.board);
      if (result === 'X' || result === 'O') {
        const winnerJid = game.players[result];
        endGame(found.key, game);
        if (game.mode === 'bot') {
          return ctx.reply(view + '\n\n' + (result === 'X' ? '🏆 *Você venceu!*' : '🤖 *Bot venceu!*'));
        }
        return ctx.reply(view + '\n\n🏆 *' + SYM[result] + ' venceu!* @' + String(winnerJid).split('@')[0], { mentions: [winnerJid] });
      }
      if (result === 'draw') {
        endGame(found.key, game);
        return ctx.reply(view + '\n\n🤝 *Empate!*');
      }
      if (game.mode === 'bot') {
        return ctx.reply(view + '\n\nSua vez (❌). Digite *j1*-*j9*');
      }
      const next = game.players[game.turn];
      return ctx.reply(view + '\n\nVez de ' + SYM[game.turn] + ' @' + String(next).split('@')[0] + '\nDigite *j1*-*j9*', { mentions: [next] });
    }
  },
  {
    name: 'j9',
    aliases: ['jogar9'],
    category: 'bn',
    hideFromMenu: true,
    description: 'Jogo da velha casa 9',
    handler: async (ctx) => {
      const found = findGame(ctx.sender);
      if (!found || found.game.type !== 'ttt') {
        return ctx.reply('❌ Nenhum jogo da velha ativo.\nUse *jogodavelha*');
      }
      const game = found.game;
      if (game.mode === 'pvp' && game.status === 'pending') {
        return ctx.reply('⏳ Aguarde *aceitarvelha*.');
      }
      const symbol = game.players.X === ctx.sender ? 'X' : (game.players.O === ctx.sender ? 'O' : null);
      if (!symbol) return ctx.reply('❌ Você não é jogador desta partida.');
      if (game.turn !== symbol) return ctx.reply('⏳ Não é a sua vez.');
      const pos = 9 - 1;
      if (game.board[pos]) {
        return ctx.reply('❌ Casa ocupada.\n\n' + renderBoard(game.board));
      }
      game.board[pos] = symbol;
      let result = checkWinner(game.board);
      if (!result && game.mode === 'bot' && symbol === 'X') {
        const botPos = botMove(game.board);
        if (botPos !== null) {
          game.board[botPos] = 'O';
          result = checkWinner(game.board);
        }
        game.turn = 'X';
      } else if (!result && game.mode === 'pvp') {
        game.turn = symbol === 'X' ? 'O' : 'X';
      }
      const view = renderBoard(game.board);
      if (result === 'X' || result === 'O') {
        const winnerJid = game.players[result];
        endGame(found.key, game);
        if (game.mode === 'bot') {
          return ctx.reply(view + '\n\n' + (result === 'X' ? '🏆 *Você venceu!*' : '🤖 *Bot venceu!*'));
        }
        return ctx.reply(view + '\n\n🏆 *' + SYM[result] + ' venceu!* @' + String(winnerJid).split('@')[0], { mentions: [winnerJid] });
      }
      if (result === 'draw') {
        endGame(found.key, game);
        return ctx.reply(view + '\n\n🤝 *Empate!*');
      }
      if (game.mode === 'bot') {
        return ctx.reply(view + '\n\nSua vez (❌). Digite *j1*-*j9*');
      }
      const next = game.players[game.turn];
      return ctx.reply(view + '\n\nVez de ' + SYM[game.turn] + ' @' + String(next).split('@')[0] + '\nDigite *j1*-*j9*', { mentions: [next] });
    }
  },


  {
    name: 'iniciarcacapalavra',
    aliases: ['iniciarcacapalavras'],
    category: 'bn',
    description: 'Inicia um caça-palavras misterioso',
    usage: 'iniciarcacapalavra 5-10',
    handler: async (ctx) => {
      if (!ctx.isGroup) {
        return ctx.reply('❌ O Caça-Palavras multiplayer só pode ser iniciado em grupos.');
      }

      const quantidade = parseInt((ctx.args || [])[0], 10);

      if (!Number.isInteger(quantidade) || quantidade < 5 || quantidade > 20) {
        return ctx.reply(
          '❌ Escolha a quantidade de palavras entre *5 e 20*.',

          'Exemplos:\n' +
          '• *iniciarcacapalavra 5*\n' +
          '• *iniciarcacapalavra 8*\n' +
          '• *iniciarcacapalavra 10*'
        );
      }

      if (wordSearchGames.has(ctx.jid)) {
        return ctx.reply(
          '⚠️ Já existe um caça-palavras ativo neste grupo.\n' +
          'Use *Cacapalavra <palavra>* para tentar encontrar as palavras.'
        );
      }

      const banco = [
        'ABACATE','ABACAXI','ABELHA','ABOBORA','ACAMPAMENTO','ACELERADOR',
        'ACORDEAO','ACROBATA','ADEGA','ADMIRACAO','AEROPORTO','AGUA',
        'AGUIA','ALEGRIA','ALGODAO','ALMOCO','AMIZADE','AMOR','ANIMAL',
        'ANEL','ANJO','ANTENA','APITO','APRENDIZADO','ARCO','AREIA',
        'ARMARIO','ARROZ','ARVORE','ASTRO','AVENTURA','AVIACAO','AVIAO',
        'AZUL','BACIA','BAILARINO','BALEIA','BANANA','BANDEIRA','BARCO',
        'BARRACA','BASQUETE','BATATA','BATERIA','BICICLETA','BISCOITO',
        'BOLA','BORBOLETA','BOTAO','BRINCADEIRA','BRINQUEDO','CABANA',
        'CABELO','CADERNO','CAFE','CAIXA','CALENDARIO','CAMINHO','CAMISA',
        'CAMPO','CANETA','CANGURU','CAPACETE','CAPIVARA','CARRO','CASTELO',
        'CATAVENTO','CAVALO','CEBOLA','CELULAR','CENOURA','CERCA','CEREJA',
        'CHAVE','CHOCOLATE','CHUVA','CIDADE','CINEMA','CIRCULO','CLUBE',
        'COELHO','COLEGIO','COLHER','COMETA','COMPUTADOR','CONCHA','CORACAO',
        'CORUJA','COSTA','COTOVELO','COZINHA','CRIANCA','CRISTAL','CUBO',
        'DADO','DANCA','DEDO','DESENHO','DESERTO','DINHEIRO','DINOSSAURO',
        'DIVERTIMENTO','DOCE','DRAGAO','ELEFANTE','ELEVADOR','ESCADA',
        'ESCOLA','ESCRITOR','ESMERALDA','ESPAÇO','ESPADA','ESPELHO','ESTACAO',
        'ESTRELA','ESTRADA','EVENTO','FAMILIA','FANTASMA','FARMACIA',
        'FAZENDA','FEIRA','FERIAS','FERRO','FESTA','FIGURA','FILME','FLOR',
        'FOGO','FOGUETE','FOLHA','FORMIGA','FOTOGRAFIA','FRUTA','FUTEBOL',
        'GALAXIA','GALINHA','GATO','GELO','GIRASSOL','GIRAFA','GLOBO',
        'GOIABA','GOLFINHO','GORILA','GRAMA','GUARDA','GUERRA','GUISADO',
        'HAMBURGUER','HARMONIA','HELICOPTERO','HEROI','HISTORIA','HOTEL',
        'IGREJA','ILHA','IMAGINACAO','IMPERIO','INSETO','INSTRUMENTO',
        'INTERNET','JANELA','JARDIM','JORNAL','JOVEM','JUBA','JOGADOR',
        'JOGO','JORNADA','LAGARTA','LAGO','LAMPADA','LARANJA','LEAO',
        'LEITURA','LIVRO','LOBO','LOJA','LUA','LUGAR','MACA','MACACO',
        'MAGIA','MALA','MAMUTE','MANGA','MAR','MARTE','MASCARA','MEDALHA',
        'MELANCIA','MEL','MESA','METEORO','MILHO','MINHOCA','MONTANHA',
        'MORANGO','MOSAICO','MUSICA','NAVIO','NEVE','NINHO','NINJA','NOITE',
        'NUVEM','OCEANO','OCULOS','ONDA','ORANGE','ORQUESTRA','OVELHA',
        'PALACIO','PANDEIRO','PAPAGAIO','PAPEL','PARQUE','PASSARO','PATO',
        'PEIXE','PENA','PENCIL','PERFUME','PESCADOR','PIANO','PIPOCA',
        'PIRATA','PISCINA','PLANETA','PLANTA','PONTE','PORCO','PRESENTE',
        'PRACA','PRAIA','PRINCESA','PROFESSOR','QUEIJO','RATO','RELOGIO',
        'RESTAURANTE','RIO','ROBÔ','ROBO','ROSA','SABAO','SAPATO','SAPO',
        'SATELITE','SEGREDO','SELO','SERPENTE','SORVETE','SORRISO','SOL',
        'TARTARUGA','TEATRO','TECLADO','TELEFONE','TEMPESTADE','TESOURO',
        'TIGRE','TOMATE','TORRE','TRATOR','TREM','TRIANGULO','TROVAO',
        'UNICORNIO','UNIVERSO','URSO','UVA','VACINA','VACA','VALSA',
        'VAMPIRO','VENTO','VERAO','VIAGEM','VIDEO','VILA','VIOLAO',
        'VULCAO','XADREZ','XICARA','ZEBRA','ZUMBI','ACAO','ALMOFADA',
        'AMPULHETA','ANIVERSARIO','APARTAMENTO','ARCOIRIS','ATLETA',
        'AVENTUREIRO','BATALHA','BIBLIOTECA','BLOCO','BOMBEIRO','BRASIL',
        'CAMPEAO','CARTAO','CASCATA','CAVERNA','CEREBRO','CHEFE','CIRCO',
        'CONSTRUTOR','CORRIDA','DESAFIO','DETETIVE','DIAMANTE','DINAMITE',
        'DOMINO','EMOCAO','ENIGMA','EXPLORADOR','FADA','FADA','FENIX',
        'FLAUTA','FORTALEZA','FOTOGRAFO','FRAGATA','FUTURO','GENIO',
        'GIGANTE','GUERREIRO','HEROICA','INVENCAO','LABIRINTO','LENDARIO',
        'MAQUINA','MISTERIO','MONSTRO','MOTOR','MUSICAL','PANDA','PANTERA',
        'PIRAMIDE','PORTAL','PRINCIPE','QUESTAO','RAINHA','REINO',
        'SAMURAI','SEREIA','SOLDADO','SUPERIOR','TELESCOPIO','TROFEU',
        'VIKING','VILAO','VITORIA','ZANGAO'
      ]

      const palavras = [...new Set(banco)].filter(
        w => /^[A-Z]+$/.test(w) && w.length >= 4 && w.length <= 15
      );

      const SIZE = 15;
      const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const direcoes = [
        [0, 1], [0, -1],
        [1, 0], [-1, 0],
        [1, 1], [-1, -1],
        [1, -1], [-1, 1]
      ];

      function podeColocar(grid, palavra, linha, coluna, dl, dc) {
        for (let i = 0; i < palavra.length; i++) {
          const r = linha + dl * i;
          const c = coluna + dc * i;

          if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
          if (grid[r][c] && grid[r][c] !== palavra[i]) return false;
        }
        return true;
      }

      function colocar(grid, palavra) {
        for (let tentativa = 0; tentativa < 1000; tentativa++) {
          const [dl, dc] =
            direcoes[Math.floor(Math.random() * direcoes.length)];

          const linha = Math.floor(Math.random() * SIZE);
          const coluna = Math.floor(Math.random() * SIZE);

          if (!podeColocar(grid, palavra, linha, coluna, dl, dc)) continue;

          for (let i = 0; i < palavra.length; i++) {
            grid[linha + dl * i][coluna + dc * i] = palavra[i];
          }

          return true;
        }

        return false;
      }

      // Evita repetir palavras usadas recentemente.
      const recentes = new Set(wordSearchRecent);
      const disponiveis = palavras.filter(w => !recentes.has(w));

      // Se o banco recente ficar muito grande, usa o banco completo.
      const fonte = disponiveis.length >= quantidade ? disponiveis : palavras;

      const embaralhadas = [...fonte].sort(() => Math.random() - 0.5);
      const escolhidas = embaralhadas.slice(0, quantidade);

      const grid = Array.from({ length: SIZE }, () =>
        Array(SIZE).fill('')
      );

      const colocadas = [];

      // Palavras maiores primeiro para aumentar a qualidade do puzzle.
      escolhidas.sort((a, b) => b.length - a.length);

      for (const palavra of escolhidas) {
        if (colocar(grid, palavra)) {
          colocadas.push(palavra);
        }
      }

      // Se alguma palavra não couber, tenta outras do banco.
      let tentativasExtras = 0;
      while (colocadas.length < quantidade && tentativasExtras < 100) {
        tentativasExtras++;

        const candidata =
          palavras[Math.floor(Math.random() * palavras.length)];

        if (colocadas.includes(candidata)) continue;
        if (colocar(grid, candidata)) colocadas.push(candidata);
      }

      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (!grid[r][c]) {
            grid[r][c] =
              ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
          }
        }
      }

      // Guarda somente uma quantidade limitada para evitar memória desnecessária.
      for (const palavra of colocadas) {
        wordSearchRecent.push(palavra);
      }
      while (wordSearchRecent.length > 100) {
        wordSearchRecent.shift();
      }

      const iniciadoEm = Date.now();
      const jogo = {
        chatId: ctx.jid,
        palavras: new Set(colocadas),
        encontradas: new Set(),
        quantidade: colocadas.length,
        grid,
        iniciadoEm,
        expiraEm: iniciadoEm + (20 * 60 * 1000)
      };

      jogo.timer = setTimeout(async () => {
        const atual = wordSearchGames.get(ctx.jid);
        if (!atual || atual !== jogo) return;

        wordSearchGames.delete(ctx.jid);

        try {
          await ctx.reply(
            '⏰ *TEMPO ESGOTADO!*\\n\\n' +
            '🔎 O Caça-Palavras terminou após *20 minutos*.\\n' +
            '🎯 Encontradas: *' + atual.encontradas.size + '/' + atual.quantidade + '*\\n\\n' +
            'Uma nova partida pode ser iniciada agora.'
          );
        } catch (_) {}
      }, 20 * 60 * 1000);

      wordSearchGames.set(ctx.jid, jogo);

      const quadro = grid
        .map(linha => linha.join(' '))
        .join('\n');

      return ctx.reply(
        '🔎 *CAÇA-PALAVRA MISTERIOSO*\n\n' +
        '👥 *Multiplayer:* todos do grupo podem participar.\n' +
        '🧩 Palavras escondidas: *' + colocadas.length + '*\n\n' +
        'As palavras estão escondidas na horizontal, vertical ou diagonal.' +
        ' Também podem estar ao contrário.\n\n' +
        '```' + quadro + '```\n\n' +
        '🤫 *As palavras não serão mostradas.*\n' +
        'Digite *Cacapalavra palavra* para tentar descobrir uma.\n\n' +
        '⏱️ *Tempo: 20 minutos — Encontrem todas para vencer!',
        '🏆 Encontrem todas para vencer!',
        { mentions: [ctx.sender] }
      );
    }
  },

  {
    name: 'Cacapalavra',
    aliases: ['cacapalavra', 'acharpalavra'],
    category: 'bn',
    description: 'Tenta encontrar uma palavra no caça-palavras',
    usage: 'Cacapalavra <palavra>',
    handler: async (ctx) => {
      if (!ctx.isGroup) {
        return ctx.reply('❌ O Caça-Palavras multiplayer só funciona em grupos.');
      }

      const jogo = wordSearchGames.get(ctx.jid);

      if (!jogo) {
        return ctx.reply(
          'Use *iniciarcacapalavra 5* até *iniciarcacapalavra 20*.'
        );
      }

      const tentativa = String((ctx.args || []).join(' '))
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z]/g, '')
        .toUpperCase();

      if (!tentativa) {
        return ctx.reply(
          '🔎 Digite uma palavra para tentar.\n' +
          'Exemplo: *Cacapalavra computador*'
        );
      }

      const palavraReal = [...jogo.palavras].find(
        p => p === tentativa
      );

      if (!palavraReal) {
        return ctx.reply('❌ *Não encontrou.* Tente outra palavra.');
      }

      if (jogo.encontradas.has(palavraReal)) {
        return ctx.reply('⚠️ Essa palavra já foi encontrada.');
      }

      jogo.encontradas.add(palavraReal);

      const faltam = jogo.quantidade - jogo.encontradas.size;

      if (faltam <= 0) {
        const segundos = Math.floor(
          (Date.now() - jogo.iniciadoEm) / 1000
        );

        if (jogo.timer) clearTimeout(jogo.timer);
        wordSearchGames.delete(ctx.jid);

        return ctx.reply(
            '🎉🏆 *O GRUPO VENCEU!* — Encontradas todas as *' + jogo.quantidade + '* palavras! Tempo: *' + segundos + ' segundos. Parabéns, @' + String(ctx.sender).split('@')[0] + '! 🥳',
          { mentions: [ctx.sender] }
        );
      }

      return ctx.reply(
        '✅ *Acertou!*\n\n' +
        '🔎 Palavra encontrada: *' + palavraReal + '*\n' +
        '🎯 Encontradas: *' + jogo.encontradas.size + '/' + jogo.quantidade + '*\n' +
        '❓ Faltam: *' + faltam + '*'
      );
    }
  },

];
