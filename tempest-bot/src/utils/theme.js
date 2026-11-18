/**
 * Temas visuais por prefixo
 * !  → tema "luxo" (novo)
 * resto / sem prefixo → visual original
 */

function useNewTheme(ctx) {
  // TEMPEST: segundo menu (tema luxo) agora é o principal para todos os prefixos
  return true;
}

function line(ch, n) {
  return String(ch).repeat(n);
}

/** Menu principal — tema luxo (expandido, todos os prefixos) */
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
  [
    'menudono', 'menuadm', 'menugrupo', 'menuinternet',
    'menubn', 'menudiversao', 'menufig', 'menuimg',
    'menuseguranca', 'menuutilidades', 'menurpg', 'menuxp',
    'menueconomia', 'menualuguel', 'menudownload', 'menuwebgames',
    'menupesquisa', 'menumodos', 'iskmenu'
  ].forEach(itemCmd);
  endSec();

  sec('𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐒');
  ['play', 'ytplay', 'ytd', 'yta', 'tk', 'ig', 'fb', 'spotify', 'mediafire', 'pint', 'twitter', 'kw', 'capcut'].forEach(itemCmd);
  endSec();

  sec('𝐌𝐔𝐒𝐈𝐂𝐀');
  ['play', 'ytplay', 'yta', 'spotify', 'tts', 'crad', 'lyrics'].forEach(itemCmd);
  endSec();

  sec('𝐒𝐓𝐈𝐂𝐊𝐄𝐑𝐒');
  ['s', 'sticker', 'toimg', 'gif', 'pack', 'attp', 'ttp'].forEach(itemCmd);
  endSec();

  sec('𝐈𝐌𝐀𝐆𝐄𝐌');
  ['menuimg', 'blur', 'invert', 'removebg', 'espelhar', 'gray', 'pixel'].forEach(itemCmd);
  endSec();

  sec('𝐀𝐃𝐌');
  ['menuadm', 'ban', 'kick', 'promote', 'demote', 'tagall', 'hidetag', 'mute', 'unmute', 'warn', 'listwarn'].forEach(itemCmd);
  endSec();

  sec('𝐆𝐑𝐔𝐏𝐎');
  ['menugrupo', 'linkgp', 'grupo', 'welcome', 'setname', 'setdesc', 'revogar', 'infogp'].forEach(itemCmd);
  endSec();

  sec('𝐒𝐄𝐆𝐔𝐑𝐀𝐍𝐂𝐀');
  ['menuseguranca', 'antilink', 'antispam', 'onlyadmin', 'antifake', 'antibot'].forEach(itemCmd);
  endSec();

  sec('𝐉𝐎𝐆𝐎𝐒');
  ['forca', 'jogodavelha', 'connect4', 'ppt', 'jogos', 'jogon', 'menuwebgames', 'dado', 'quiz'].forEach(itemCmd);
  endSec();

  sec('𝐁𝐑𝐈𝐍𝐂𝐀𝐃𝐄𝐈𝐑𝐀𝐒');
  ['menubn', 'menudiversao', 'casal', 'ship', 'gay', 'cara', 'abracar', 'beijar', 'matar', 'socar', 'pito'].forEach(itemCmd);
  endSec();

  sec('𝐈𝐒𝐄𝐊𝐀𝐈');
  ['iskmenu', 'iskiniciar', 'isklutar', 'iskboss', 'iskdungeon', 'iskduelo', 'iskperfil', 'iskinv'].forEach(itemCmd);
  endSec();

  sec('𝐑𝐏𝐆');
  ['menurpg', 'casar', 'divorciar', 'perfil', 'familia', 'adotar'].forEach(itemCmd);
  endSec();

  sec('𝐈𝐍𝐓𝐄𝐑𝐍𝐄𝐓');
  ['menuinternet', 'google', 'wiki', 'clima', 'noticias', 'cep', 'traduzir'].forEach(itemCmd);
  endSec();

  sec('𝐏𝐄𝐒𝐐𝐔𝐈𝐒𝐀');
  ['menupesquisa', 'anime', 'filme', 'serie', 'manga'].forEach(itemCmd);
  endSec();

  sec('𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒');
  ['menuutilidades', 'bia', 'tts', 'transcrever', 'ping', 'info', 'dono', 'gerarlink', 'calcular'].forEach(itemCmd);
  endSec();

  sec('𝐄𝐂𝐎𝐍𝐎𝐌𝐈𝐀');
  ['menueconomia', 'daily', 'saldo', 'loja', 'pagar', 'rank', 'level', 'xp', 'perfil', 'work', 'slot'].forEach(itemCmd);
  endSec();

  sec('𝐀𝐋𝐔𝐆𝐔𝐄𝐋');
  ['menualuguel', 'aluguel', 'planosaluguel', 'statusbot'].forEach(itemCmd);
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
  endSec();

  L.push('*╚══━━❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━══╝*');
  L.push('');
  L.push('*╔══━━❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━══╗*');
  L.push('*『 𝐓𝐄𝐌𝐏𝐄𝐒𝐓 𝐁𝐎𝐓 』*');
  L.push('*𝐃𝐨𝐧𝐨: Ebai · +258 874288439*');
  L.push('*Prefixos: ' + allPref + '*');
  L.push('*╚══━━❦ۜ✯ۣۜৡ ✧ ❖ ✧ ৡۣۜ✯ۜ─━━══╝*');

  return L.join(String.fromCharCode(10));
}


function categoryMenuTheme(meta, cmds, prefix) {
  const p = prefix || '!';
  const title = (meta && meta.title) || 'MENU';
  const orn = 'ঔৣֳ̤᷈͜͝͡';

  // emoji por tipo de menu
  const emojiMap = {
    'MENU DONO': '👑',
    'MENU ADM': '🛡️',
    'MENU GRUPO': '👥',
    'MENU INTERNET': '🌐',
    'MENU BN': '🎮',
    'MENU DIVERSÃO': '🎭',
    'MENU STICKERS': '🎴',
    'MENU IMAGEM': '🎨',
    'MENU SEGURANÇA': '🔐',
    'MENU UTILIDADES': '🧰',
    'MENU RPG/FAMÍLIA': '❤️',
    'MENU XP/RANK': '⭐',
    'MENU ECONOMIA': '💰',
    'MENU ALUGUEL': '🏠',
    'MENU DOWNLOAD': '📥',
    'MENU WEB GAMES': '🕹️',
    'MENU MODOS': '⚙️'
  };

  // tenta pelo title, senao pelo emoji do meta, senao generico
  let catEmoji = emojiMap[title] || (meta && meta.emoji) || '🔮';
  // se title tiver palavras-chave
  const tl = String(title).toUpperCase();
  if (!emojiMap[title]) {
    if (tl.indexOf('DONO') >= 0) catEmoji = '👑';
    else if (tl.indexOf('ADM') >= 0) catEmoji = '🛡️';
    else if (tl.indexOf('GRUPO') >= 0) catEmoji = '👥';
    else if (tl.indexOf('INTERNET') >= 0) catEmoji = '🌐';
    else if (tl.indexOf('BN') >= 0) catEmoji = '🎮';
    else if (tl.indexOf('DIVERS') >= 0) catEmoji = '🎭';
    else if (tl.indexOf('STICK') >= 0 || tl.indexOf('FIG') >= 0) catEmoji = '🎴';
    else if (tl.indexOf('IMAG') >= 0) catEmoji = '🎨';
    else if (tl.indexOf('SEGUR') >= 0) catEmoji = '🔐';
    else if (tl.indexOf('UTIL') >= 0) catEmoji = '🧰';
    else if (tl.indexOf('RPG') >= 0 || tl.indexOf('FAM') >= 0) catEmoji = '❤️';
    else if (tl.indexOf('XP') >= 0 || tl.indexOf('RANK') >= 0) catEmoji = '⭐';
    else if (tl.indexOf('ECON') >= 0) catEmoji = '💰';
    else if (tl.indexOf('ALUG') >= 0) catEmoji = '🏠';
    else if (tl.indexOf('DOWN') >= 0) catEmoji = '📥';
    else if (tl.indexOf('GAME') >= 0 || tl.indexOf('JOGO') >= 0) catEmoji = '🕹️';
    else if (tl.indexOf('MODO') >= 0) catEmoji = '⚙️';
  }

  const sorted = (cmds || []).slice().sort(function (a, b) {
    return String(a.name).localeCompare(String(b.name));
  });

  const lines = [];
  lines.push('╔══━─❦ ✧ ❖ ✧ ─━━╗');
  lines.push('║  ╭━━✯ ❖ ' + catEmoji + ' ' + title + ' ❖ ✯━━╮');
  lines.push('║  │');

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    let al = '';
    if (c.aliases && c.aliases.length) {
      al = ' (' + String(c.aliases[0]) + ')';
    }
    // ঔৣֳ̤᷈͜͝͡ + emoji do menu + *!comando*
    lines.push('║  │  ' + orn + catEmoji + ' *' + p + c.name + '*' + al);
  }

  lines.push('║  │');
  lines.push('║  │  Total: *' + sorted.length + '* comandos');
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
  invalidCommandBox,
  similarity,
  findSuggestion
};
