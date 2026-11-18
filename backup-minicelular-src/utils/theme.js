/**
 * Temas visuais por prefixo
 * !  → tema "luxo" (novo)
 * resto / sem prefixo → visual original
 */

function useNewTheme(ctx) {
  return true;
}

function line(ch, n) {
  return String(ch).repeat(n);
}

/** Menu principal TEMPEST — sem internet/aluguel */
function mainMenuTheme(stats, botName, prefix, extra) {
  const p = prefix || '!';
  const orn = 'ঔৣֳ̤᷈͜͝͡';
  const extraInfo = extra || {};
  const mentionToken = extraInfo.mentionToken || 'user';
  const ownerName = extraInfo.ownerName || 'Ebai';
  const allPref = extraInfo.allPrefixes || '! . # /';
  let hora = extraInfo.hora;
  if (!hora) {
    const d = new Date();
    hora = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  let data = extraInfo.data;
  if (!data) {
    const d = new Date();
    data = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }
  const total = (stats && stats.totalMain) != null ? stats.totalMain : '?';
  const bot = botName || 'TEMPEST BOT';
  const L = [];
  function sec(title) {
    L.push('*║*');
    L.push('*║*  *╭━━✯ ❖ ' + title + ' ❖ ✯━━╮*');
    L.push('*║*  *│  ✦ ❖ ✧ ❖ ✦ ❖ ✧ ❖ ✦*');
    L.push('*║*  *│*');
  }
  function endSec() {
    L.push('*║*  *│*');
    L.push('*║*  *│  ✦ ❖ ✧ ❖ ✦ ❖ ✧ ❖ ✦*');
    L.push('*║*  *╰━━━ঔৣ͡➳ ✦ ❖ ✦ ➳ঔৣ͡━━━╯*');
  }
  function item(txt) {
    L.push('*║*  *│  ' + orn + '💠 ' + txt + '*');
  }
  function itemCmd(cmd) {
    L.push('*║*  *│  ' + orn + '💠 ' + p + cmd + '*');
  }
  L.push('*╔═══━─❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━═╗*');
  L.push('*║*  *╭━━✯ ❖ 𝐈𝐍𝐅𝐎𝐒 ❖ ✯━━╮*');
  L.push('*║*  *│*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗕𝗢𝗧: ' + bot + '*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗨𝗦𝗨𝗔́𝗥𝗜𝗢:* @' + mentionToken);
  L.push('*║*  *│  ' + orn + ' ✦ 𝗗𝗢𝗡𝗢: ' + ownerName + '*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗣𝗥𝗘𝗙𝗜𝗫𝗢: [ ' + p + ' ]*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗧𝗢𝗗𝗢𝗦: [ ' + allPref + ' ]*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗗𝗔𝗧𝗔: ' + data + '*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗛𝗢𝗥𝗔: ' + hora + '*');
  L.push('*║*  *│  ' + orn + ' ✦ 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦: ' + total + '*');
  L.push('*║*  *│*');
  L.push('*║*  *╰━━━ঔৣ͡➳ ✦ ❖ ✦ ➳ঔৣ͡━━━╯*');
  sec('𝐌𝐄𝐍𝐔𝐒');
  ['menudono','menuadm','menugrupo','menubn','menudiversao','menufig','menuimg','menuseguranca','menuutilidades','menurpg','menuxp','menueconomia','menudownload','menuwebgames','menupesquisa','menumodos','iskmenu','menulogo'].forEach(itemCmd);
  endSec();
  sec('𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐒');
  ['play','ytplay','ytd','yta','tk','ig','fb','spotify','mediafire','pint','twitter','kw','capcut','pinterest'].forEach(itemCmd);
  endSec();
  sec('𝐌𝐔𝐒𝐈𝐂𝐀');
  ['play','ytplay','yta','spotify','tts','crad','lyrics','letra','pausar','fila'].forEach(itemCmd);
  endSec();
  sec('𝐒𝐓𝐈𝐂𝐊𝐄𝐑𝐒');
  ['s','sticker','toimg','gif','pack','sta','stb','stl','stop','stv'].forEach(itemCmd);
  endSec();
  sec('𝐈𝐌𝐀𝐆𝐄𝐌');
  ['menuimg','blur','invert','removebg','espelhar','gray','pixel','contraste','rip','bolsonaro'].forEach(itemCmd);
  endSec();
  sec('𝐀𝐃𝐌');
  ['menuadm','ban','kick','promote','demote','tagall','hidetag','mute','unmute','warn','listwarn','add','del'].forEach(itemCmd);
  endSec();
  sec('𝐆𝐑𝐔𝐏𝐎');
  ['menugrupo','linkgp','grupo','welcome','setname','setdesc','revogar','infogp','hidetag','tagall','simular'].forEach(itemCmd);
  endSec();
  sec('𝐒𝐄𝐆𝐔𝐑𝐀𝐍𝐂𝐀');
  ['menuseguranca','antilink','antispam','onlyadmin','antifake','antibot','antiporn','antilinkhard','modobranco'].forEach(itemCmd);
  endSec();
  sec('𝐉𝐎𝐆𝐎𝐒');
  ['forca','jogodavelha','connect4','ppt','jogos','jogon','menuwebgames','dado','quiz','roleta','slot','aceitarvelha'].forEach(itemCmd);
  endSec();
  sec('𝐁𝐑𝐈𝐍𝐂𝐀𝐃𝐄𝐈𝐑𝐀𝐒');
  ['menubn','menudiversao','casal','ship','gay','cara','abracar','beijar','matar','socar','pito','lutar','dado'].forEach(itemCmd);
  endSec();
  sec('𝐈𝐒𝐄𝐊𝐀𝐈');
  ['iskmenu','iskiniciar','isklutar','iskboss','iskdungeon','iskduelo','iskperfil','iskinv','iskloja','iskatacar','iskdefender'].forEach(itemCmd);
  endSec();
  sec('𝐑𝐏𝐆');
  ['menurpg','casar','divorciar','perfil','familia','adotar','missao','inventario','status'].forEach(itemCmd);
  endSec();
  sec('𝐏𝐄𝐒𝐐𝐔𝐈𝐒𝐀');
  ['menupesquisa','anime','filme','serie','manga','google','wiki','noticias','clima'].forEach(itemCmd);
  endSec();
  sec('𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒');
  ['menuutilidades','bia','tts','transcrever','ping','info','dono','gerarlink','calcular','cep','traduzir','clima'].forEach(itemCmd);
  endSec();
  sec('𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀');
  ['menueconomia','daily','saldo','loja','pagar','rank','level','xp','perfil','work','slot','roubar','apostar'].forEach(itemCmd);
  endSec();
  sec('𝐀𝐁𝐑𝐄𝐕𝐈𝐀𝐃𝐎𝐒');
  item(p + 's | sticker');
  item(p + 'd | delete');
  item(p + 'p | play');
  item(p + 'menu | este menu');
  item(p + 'ping');
  item(p + 'perfil');
  item(p + 'tk | tiktok');
  item(p + 'ig | instagram');
  item(p + 'sta | sticker a');
  item(p + 'stv | sticker v');
  endSec();
  L.push('*╚══━━❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━══╝*');
  L.push('');
  L.push('*╔══━━❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━══╗*');
  L.push('*『 𝐓𝐄𝐌𝐏𝐄𝐒𝐓 𝐁𝐎𝐓 』*');
  L.push('*𝐃𝐨𝐧𝐨: Ebai · +258 874288439*');
  L.push('*Prefixos: ' + allPref + '*');
  L.push('*╚══━━❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━══╝*');
  const legacyText = L.join(String.fromCharCode(10));
  try {
    const gt = require('./themeGothic').mainMenu(legacyText, bot, p);
    if (gt) return gt;
  } catch (_) {}
  return legacyText;
}



/**
 * Agrupa comandos JA existentes da categoria em subseccoes (so visual).
 * Nao cria comandos nem puxa de outras categorias.
 */
function groupCommandsBySubsections(category, cmds) {
  const list = (cmds || []).filter(function (c) {
    if (!c || !c.name) return false;
    if (c.hideFromMenu) return false;
    const n = String(c.name || '').toLowerCase();
    if (/^[0-9]\( /.test(n) || /^[abc] \)/.test(n) || /^h[1-8]$/.test(n) || n === 'hep') return false;
    if (/^j[1-9]$/.test(n)) return false; // esconder j1-j9 do menu
    return true;
  });

  const cat = String(category || '').toLowerCase();
  const used = {};

  function matchGroup(patterns) {
    const items = [];
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      const key = String(c.name).toLowerCase();
      if (used[key]) continue;
      const blob = (key + ' ' + (c.aliases || []).join(' ')).toLowerCase();
      for (let j = 0; j < patterns.length; j++) {
        if (patterns[j].test(blob)) {
          items.push(c);
          used[key] = true;
          break;
        }
      }
    }
    return items;
  }

  const rules = {
    // MENU BN — subseccoes so com comandos desta categoria
    bn: [
      { title: 'JOGOS', emoji: '🎮', patterns: [/forca|hangman|jogodavelha|\bttt\b|connect|\bc4\b|ppt|jokenpo|dado|dice|moeda|coin|trivia|quiz|advinha|adivinhar|^jogar\( |letra|^quando \)|chance|probabilidade|rankingtrivia|ranktrivia|verdadeoudesafio|^vod$/] },
      { title: 'INTERACAO', emoji: '💥', patterns: [/abraco|abrac|beijo|kiss|bater|soco|punch|chute|matar|kill|morder|bite|tapa|slap/] },
      { title: 'CASAL', emoji: '💕', patterns: [/casal|ship|shippar/] },
      { title: 'MEDIDORES', emoji: '🎯', patterns: [/gay|lesb|burro|intelig|otaku|fiel|infiel|corno|gado|gostos|feio|rico|pobre|forte|fraco|pegador|nerd|trabalhador|brabo|lindo|malandro|simpatico|engracado|charmoso|misterioso|carinhoso|ciumento|corajoso|covarde|esperto|talarico|chorao|brincalhao|traidor|bandido|cachorro|vagabundo|pilantra|comedia|psicopata|macho|sigma|beta|louco|visionario|poderoso|vencedor|pito|antisocial|ateu|atleta|aventureiro|bagunceiro|bilionario|bombado|calmo|careta|caseiro|cetico|chefe|comilao|confiante|cosmopolita|criativo|dependente|digital|dorminhoco|economico|estudioso|extrovertido|fofoqueiro|fortao|gamer|gastador|independente|infantil|inseguro|introvertido|irresponsavel|liberal|lider|maduro|magrelo|moderno|nervoso|offline|online|organizado|otimista|patrao|patriotico|pessimista|playboy|popular|pratico|presidente|programador|quemsueu|whoami|rainha|realista|rei|religioso|responsavel|romantico|rural|saudavel|seguidor|senhor|serio|social|solitario|sonhador|supersticioso|tecnologico|tradicional|urbano|viajante|zueiro/] }
    ],
    // MENU DIVERSÃO / BRINCADEIRAS — so reacoes desta categoria (NAO misturar com bn)
    diversao: [
      { title: 'REACOES', emoji: '🎭', patterns: [/abrac|beij|matar|socar|lutar|tapa|chutar|empurr|cutucar|aplaudir|elogiar|criticar|chorar|dancar|cantar|cumpriment|desculpar|admirar|apoiar|desafiar|acenar|carregar|amor|amo|feliz|festa|alien|aluno|animal|aviao|bebida|cafe|carro|casa|chuva|comida|coracao|dinheiro|doce|escola|esporte|estrela|fantasma|flor/] }
    ],
    // MENU JOGOS — separado
    jogos: [
      { title: 'WEB GAMES', emoji: '🕹️', patterns: [/jogon|jogos|web/] },
      { title: 'CLASSICOS', emoji: '🎮', patterns: [/forca|velha|connect|ppt|dado|quiz|slot|roleta|cara/] }
    ],
    admin: [
      { title: 'MODERACAO', emoji: '🛡️', patterns: [/ban|kick|mute|desmute|warn|adv|promov|rebaix|promote|demote|add|remover|remove|mutelist/] },
      { title: 'GRUPO', emoji: '👥', patterns: [/link|nomegp|descgp|hidetag|marcar|tag|regras|bemvindo|welcome|saida|goodbye|abrir|fechar|modoadm|modoprefixo|setname|setdesc/] }
    ],
    grupo: [
      { title: 'GRUPO', emoji: '👥', patterns: [/link|grupo|welcome|saida|goodbye|setname|setdesc|regras|info|abrir|fechar|hidetag|tag|marcar/] },
      { title: 'MODERACAO', emoji: '🛡️', patterns: [/ban|kick|mute|warn|adv/] }
    ],
    dono: [
      { title: 'SISTEMA', emoji: '⚙️', patterns: [/backup|reiniciar|restart|desligar|shutdown|broadcast|bc|stats|logs|listagrupos|listausuarios|sairgrupo|modointernet/] },
      { title: 'COMANDOS', emoji: '📌', patterns: [/blockcmd|unblockcmd|listbcmd|addcmd|delcmd|listcmd|editcmd|blockuser|unblockuser|addadmin|deladmin/] },
      { title: 'MIDIA', emoji: '🎬', patterns: [/audio|crad|dwd|download|gerarcodigo|gencode|codigo|aluguel|assinatura/] }
    ],
    rpg: [
      { title: 'PETS', emoji: '🐾', patterns: [/pet|comida|alimentar|brincar|banhar|dormir|treinar|setfoto/] },
      { title: 'FAMILIA', emoji: '🎐', patterns: [/casar|divorciar|familia|adotar|filho|namor|dupla|relacion|terminar|flertar|amante|trair|transar|aniversario|historico|limparrel|pedido|aceitar|recusar|cancelarpedido/] },
      { title: 'AVENTURA', emoji: '🗡️', patterns: [/missao|batalha|inventario|status|classe|criar|xp|level/] }
    ],
    xp: [
      { title: 'PERFIL', emoji: '⭐', patterns: [/perfil|meuxp|^xp$|level/] },
      { title: 'RANKS', emoji: '🏆', patterns: [/rank/] }
    ],
    economia: [
      { title: 'CARTEIRA', emoji: '💰', patterns: [/saldo|daily|pagar|transfer|work|trabalh|roubar|apostar|slot|loja/] },
      { title: 'RANK', emoji: '🏆', patterns: [/rank|level|xp|perfil/] }
    ],
    stickers: [
      { title: 'BASICO', emoji: '🎴', patterns: [/^s$|sticker|toimg|gif|pack|qc|quote|stickermenu|menusticker/] },
      { title: 'CORES', emoji: '🎨', patterns: [/^st|stbranco|stpreto|stazul|stpink|stamarelo|stverde|stvermelho|stroxo|stlaranja|stciano|strosa|stcinza|stmarrom|stdourado|stprata|stvioleta|stturquesa|stcores|sta|stb|stl|stop|stv/] }
    ],
    seguranca: [
      { title: 'ANTI', emoji: '🔐', patterns: [/anti/] },
      { title: 'FILTROS', emoji: '🚫', patterns: [/palavra|figban|ddd|blockcmd|list/] }
    ],
    download: [
      { title: 'DOWNLOADS', emoji: '📥', patterns: [/yt|tk|ig|fb|twitter|pint|capcut|kw|mediafire|play|spotify/] }
    ],
    utilidades: [
      { title: 'BOT', emoji: '🧰', patterns: [/ping|info|runtime|owner|menu|hora|data|meuid/] },
      { title: 'FERRAMENTAS', emoji: '🔧', patterns: [/calcul|porcent|regra|cep|clima|traduz|gerarlink|transcrev|tts|bia/] }
    ]
  };


  const catRules = rules[cat] || [];
  const groups = [];
  for (let i = 0; i < catRules.length; i++) {
    const r = catRules[i];
    const items = matchGroup(r.patterns);
    if (items.length) {
      groups.push({
        title: r.title,
        emoji: r.emoji,
        items: items.sort(function (a, b) {
          return String(a.name).localeCompare(String(b.name));
        })
      });
    }
  }

  const rest = list.filter(function (c) {
    return !used[String(c.name).toLowerCase()];
  }).sort(function (a, b) {
    return String(a.name).localeCompare(String(b.name));
  });
  if (rest.length) {
    groups.push({ title: 'OUTROS', emoji: '📦', items: rest });
  }

  if (!groups.length && list.length) {
    groups.push({
      title: 'COMANDOS',
      emoji: '📌',
      items: list.slice().sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name));
      })
    });
  }
  return groups;
}

function categoryMenuTheme(meta, cmds, prefix, categoryKey) {
  const p = prefix || '!';
  const title = (meta && meta.title) || 'MENU';
  const orn = 'ঔৣֳ̤᷈͜͝͡';

  const emojiMap = {
    'MENU DONO': '💠',
    'MENU ADM': '🛡️',
    'MENU GRUPO': '👥',
    'MENU INTERNET': '🌐',
    'MENU BN': '🎯',
    'MENU DIVERSÃO': '🎭',
    'MENU STICKERS': '🎴',
    'MENU IMAGEM': '🎨',
    'MENU SEGURANÇA': '🔐',
    'MENU UTILIDADES': '🧰',
    'MENU RPG/FAMÍLIA': '🎐',
    'MENU XP/RANK': '⭐',
    'MENU ECONOMIA': '💰',
    'MENU ALUGUEL': '🏠',
    'MENU DOWNLOAD': '📥',
    'MENU WEB GAMES': '🕹️',
    'MENU MODOS': '⚙️'
  };

  let catEmoji = emojiMap[title] || (meta && meta.emoji) || '📌';
  const tl = String(title).toUpperCase();
  if (!emojiMap[title]) {
    if (tl.indexOf('DONO') >= 0) catEmoji = '💠';
    else if (tl.indexOf('ADM') >= 0) catEmoji = '🛡️';
    else if (tl.indexOf('GRUPO') >= 0) catEmoji = '👥';
    else if (tl.indexOf('INTERNET') >= 0) catEmoji = '🌐';
    else if (tl.indexOf('BN') >= 0) catEmoji = '🎯';
    else if (tl.indexOf('DIVERS') >= 0) catEmoji = '🎭';
    else if (tl.indexOf('STICK') >= 0 || tl.indexOf('FIG') >= 0) catEmoji = '🎴';
    else if (tl.indexOf('IMAG') >= 0) catEmoji = '🎨';
    else if (tl.indexOf('SEGUR') >= 0) catEmoji = '🔐';
    else if (tl.indexOf('UTIL') >= 0) catEmoji = '🧰';
    else if (tl.indexOf('RPG') >= 0 || tl.indexOf('FAM') >= 0) catEmoji = '🎐';
    else if (tl.indexOf('XP') >= 0 || tl.indexOf('RANK') >= 0) catEmoji = '⭐';
    else if (tl.indexOf('ECON') >= 0) catEmoji = '💰';
    else if (tl.indexOf('ALUG') >= 0) catEmoji = '🏠';
    else if (tl.indexOf('DOWN') >= 0) catEmoji = '📥';
    else if (tl.indexOf('GAME') >= 0 || tl.indexOf('JOGO') >= 0) catEmoji = '🕹️';
    else if (tl.indexOf('MODO') >= 0) catEmoji = '⚙️';
  }

  let catKey = categoryKey || '';
  if (!catKey && meta && meta.title) {
    const t = String(meta.title).toUpperCase();
    if (t.indexOf('DONO') >= 0) catKey = 'dono';
    else if (t.indexOf('ADM') >= 0) catKey = 'admin';
    else if (t.indexOf('GRUPO') >= 0) catKey = 'grupo';
    else if (t.indexOf('BN') >= 0) catKey = 'bn';
    else if (t.indexOf('DIVERS') >= 0) catKey = 'diversao';
    else if (t.indexOf('STICK') >= 0 || t.indexOf('FIG') >= 0) catKey = 'stickers';
    else if (t.indexOf('RPG') >= 0 || t.indexOf('FAM') >= 0) catKey = 'rpg';
    else if (t.indexOf('XP') >= 0 || t.indexOf('RANK') >= 0) catKey = 'xp';
    else if (t.indexOf('ECON') >= 0) catKey = 'economia';
    else if (t.indexOf('SEGUR') >= 0) catKey = 'seguranca';
    else if (t.indexOf('DOWN') >= 0) catKey = 'download';
    else if (t.indexOf('UTIL') >= 0) catKey = 'utilidades';
  }

  const groups = groupCommandsBySubsections(catKey, cmds);
  let total = 0;
  for (let g = 0; g < groups.length; g++) total += groups[g].items.length;

  try {
    const gt = require('./themeGothic').categoryMenu(title, catKey, groups, total, p);
    if (gt) return gt;
  } catch (_) {}

  const lines = [];
  lines.push('╔══━─❦ ✧ ❖ ✧ ─━━╗');
  lines.push('║  ╭━━✯ ❖ ' + catEmoji + ' ' + title + ' ❖ ✯━━╮');
  lines.push('║  │');

  for (let g = 0; g < groups.length; g++) {
    const grp = groups[g];
    lines.push('║  │  ' + grp.emoji + ' *' + grp.title + '*');
    lines.push('║  │  ─ ─ ─ ─ ─ ─ ─');
    for (let i = 0; i < grp.items.length; i++) {
      const c = grp.items[i];
      let al = '';
      if (c.aliases && c.aliases.length) {
        al = ' (' + String(c.aliases[0]) + ')';
      }
      lines.push('║  │  ' + orn + catEmoji + ' *' + p + c.name + '*' + al);
    }
    lines.push('║  │');
  }

  lines.push('║  │  Total: *' + total + '* comandos');
  lines.push('║  ╰━━━✦ ❖ ✦━━━╯');
  lines.push('╚══━─❦ ✧ ❖ ✧ ─━━╝');
  return lines.join(String.fromCharCode(10));
}


function invalidCommandBox(userTag, typed, suggestion, accuracy, botName) {
  return (
`┏━━━━━━━━━━━━━━━━━┓
┃ ❌ *COMANDO INVÁLIDO*
┃
┃ ➥ *Usuário:* ${userTag}
┃ ➥ *Digitou:* ${typed}
┃ ➥ *Sugestão:* ${suggestion || '—'}
┃ ➥ *Precisão:* ${accuracy != null ? accuracy + '%' : '—'}
┗━━━━━━━━━━━━━━━━━┛
> ${botName || 'Tempest Bot'}`
  );
}

/** Similaridade simples (Levenshtein ratio) */
function similarity(a, b) {
  a = String(a || '').toLowerCase();
  b = String(b || '').toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 100;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, function () { return new Array(n + 1).fill(0); });
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const dist = dp[m][n];
  const maxLen = Math.max(m, n);
  return Math.round((1 - dist / maxLen) * 100);
}

function findSuggestion(typed, commandNames) {
  let best = null;
  let bestScore = 0;
  const t = String(typed || '').toLowerCase();
  for (let i = 0; i < commandNames.length; i++) {
    const name = commandNames[i];
    const sc = similarity(t, name);
    if (sc > bestScore) {
      bestScore = sc;
      best = name;
    }
  }
  if (bestScore < 40) return { suggestion: null, accuracy: bestScore };
  return { suggestion: best, accuracy: bestScore };
}

module.exports = {
  useNewTheme,
  mainMenuTheme,
  categoryMenuTheme,
  groupCommandsBySubsections,
  invalidCommandBox,
  similarity,
  findSuggestion
};
