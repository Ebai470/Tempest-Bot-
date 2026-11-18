/**
 * Novo visual dos menus (╭┈❁ ... ❁┈ / ┊ •͙✧⃝•͙ ╰┈➤ !cmd).
 * Usado pelos menus por categoria, pelo menu principal e pelos menus estáticos
 * (download, modos, pesquisa, webgames).
 */

const ORNS = ['❁', '✿', '❂', '✵'];
const BULLET = '•͙✧⃝•͙ ╰┈➤';

/** letras ASCII/acentuadas -> matemático negrito (𝐀𝐁𝐂), números 𝟎..𝟗; resto igual */
function boldMath(str) {
  const s = String(str == null ? '' : str).normalize('NFD');
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) out += String.fromCodePoint(0x1D400 + (c - 65));
    else if (c >= 97 && c <= 122) out += String.fromCodePoint(0x1D41A + (c - 97));
    else if (c >= 48 && c <= 57) out += String.fromCodePoint(0x1D7CE + (c - 48));
    else out += ch;
  }
  return out;
}

/** letras -> fraktur negrito (𝕻𝖆𝖎𝖓𝖊𝖑) */
function fraktur(str) {
  const s = String(str == null ? '' : str).normalize('NFD');
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) out += String.fromCodePoint(0x1D56C + (c - 65));
    else if (c >= 97 && c <= 122) out += String.fromCodePoint(0x1D586 + (c - 97));
    else out += ch;
  }
  return out;
}

/** converte letras "estilizadas" (negrito matemático etc.) de volta para texto simples */
function plain(str) {
  return String(str == null ? '' : str).normalize('NFKD');
}

function titleCase(s) {
  return String(s).toLowerCase().replace(/(^|\s)(\S)/g, function (_, a, b) { return a + b.toUpperCase(); });
}

const PANEL = {
  dono: 'Painel do Dono',
  admin: 'Painel do ADM',
  grupo: 'Painel do Grupo',
  internet: 'Painel Internet',
  bn: 'Painel BN',
  diversao: 'Painel de Diversão',
  stickers: 'Painel de Figurinhas',
  imagem: 'Painel de Imagens',
  seguranca: 'Painel de Segurança',
  utilidades: 'Painel de Utilidades',
  rpg: 'Painel RPG',
  xp: 'Painel de XP',
  economia: 'Painel de Economia',
  audio: 'Painel de Áudio',
  download: 'Painel de Downloads',
  jogos: 'Painel de Jogos',
  aluguel: 'Painel de Aluguel'
};

function subtitleFor(title, key) {
  if (key && PANEL[key]) return PANEL[key];
  const t = plain(title).replace(/^\s*menu\s+/i, '').trim();
  return 'Painel de ' + titleCase(t || 'Comandos');
}

/**
 * @param opts { title, subtitle, sections:[{title, lines:[string]}], footer }
 *   lines já vêm prontas (sem o prefixo ┊ •͙✧⃝•͙ ╰┈➤ — ele é acrescentado aqui)
 */
function build(opts) {
  const L = [];
  const title = boldMath(plain(opts.title));
  L.push('╭┈❁ 𓆩♛𓆪 ' + title + ' 𓆩♛𓆪 ❁┈');
  L.push('┊');
  L.push('┊  ๋࣭ ⭑ ' + fraktur(opts.subtitle || 'Painel') + ' ⭑ ๋࣭');
  L.push('┊      𖤐 ⛧ ♛ ⛧ 𖤐');
  L.push('╰┈┈┈┈┈┈┈┈┈┈');
  L.push('');
  const secs = opts.sections || [];
  secs.forEach(function (sec, i) {
    const o = ORNS[i % ORNS.length];
    L.push('╭┈' + o + ' ' + boldMath(plain(sec.title)) + ' ' + o + '┈');
    L.push('┊');
    (sec.lines || []).forEach(function (t) { L.push('┊ ' + BULLET + ' ' + t); });
    L.push('┊');
  });
  L.push('╰┈┈┈┈┈┈┈┈┈┈');
  L.push('© ' + (opts.footer || 'TEMPEST BOT'));
  return L.join('\n');
}

/** menu de uma categoria (grupos vindos de groupCommandsBySubsections) */
function buildCategory(title, categoryKey, groups, prefix) {
  const p = prefix || '!';
  let footer = 'TEMPEST BOT';
  try { footer = String(require('../config').botName || footer).toUpperCase(); } catch (_) {}
  return build({
    title: title,
    subtitle: subtitleFor(title, categoryKey),
    footer: footer,
    sections: groups.map(function (g) {
      return { title: g.title, lines: g.items.map(function (c) { return p + c.name; }) };
    })
  });
}

/**
 * Converte um menu "luxo" antigo (*║*  *│  ...*) para o novo visual.
 * Seção = linha sem comando; item = linha com 🔮 ou começando por !.
 * @param prefix substitui o "!" inicial dos comandos
 */
function fromLuxo(text, prefix) {
  const p = prefix || '!';
  const rows = String(text).split('\n');
  let title = 'MENU';
  const sections = [];
  let cur = null;
  const ORN_RE = /^[\u0590-\u05FF\u0900-\u0DFF\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\uFE20-\uFE2F\s]+/;

  for (const raw of rows) {
    let line = raw.replace(/\*/g, '').replace(/^\s*║\s*/, '').trim();
    if (!line) continue;
    const head = line.match(/╭━━✯\s*❖\s*(.+?)\s*❖\s*✯━━╮/);
    if (head) { title = head[1].trim(); continue; }
    if (/^[╔╚╰╭]/.test(line)) continue; // molduras
    line = line.replace(/^[│├]\s*─?\s*/, '').trim();
    line = line.replace(ORN_RE, '').trim();
    if (!line) continue;
    const isItem = /🔮/.test(line) || /^!/.test(line);
    if (isItem) {
      let t = line.replace(/🔮\s*/g, '').trim();
      if (t[0] === '!') t = p + t.slice(1);
      t = t.replace(/\s!/g, ' ' + p);
      if (!cur) { cur = { title: 'COMANDOS', lines: [] }; sections.push(cur); }
      cur.lines.push(t);
    } else {
      // título de seção: tira emoji inicial
      const t = line.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '').trim();
      if (!t) continue;
      cur = { title: t, lines: [] };
      sections.push(cur);
    }
  }
  const filled = sections.filter(function (s) { return s.lines.length; });
  let footer = 'TEMPEST BOT';
  try { footer = String(require('../config').botName || footer).toUpperCase(); } catch (_) {}
  return build({ title: title, subtitle: subtitleFor(title, null), footer: footer, sections: filled });
}

function botFooter() {
  try { return String(require('../config').botName || 'TEMPEST BOT').toUpperCase(); } catch (_) { return 'TEMPEST BOT'; }
}

/** menu principal (texto) — mesmos blocos de antes, visual novo. theme = módulo theme (só para fallback) */
function main(theme, stats, botName, prefix, extra) {
  try {
    const p = prefix || '!';
    const ex = extra || {};
    const B = boldMath;
    const mentionToken = ex.mentionToken || 'user';
    const ownerName = ex.ownerName || 'Ebai';
    let allPref = ex.allPrefixes;
    let inter = '/';
    try {
      const gp = require('./groupPrefix');
      if (!allPref) allPref = gp.defaultText().join(' ');
      inter = gp.DEF_INTER || '/';
    } catch (_) { allPref = allPref || '! . #'; }
    const d = new Date();
    const hora = ex.hora || (String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
    const data = ex.data || (String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear());
    const total = (stats && stats.totalMain) != null ? stats.totalMain : '?';
    const bot = botName || 'TEMPEST BOT';
    const interP = ex.interPrefix || inter;
    const c = function (arr) { return arr.map(function (x) { return p + x; }); };
    const sections = [
      { title: 'INFOS', lines: [
        B('BOT') + ': ' + bot,
        B('USUÁRIO') + ': @' + mentionToken,
        B('DONO') + ': ' + ownerName,
        B('PREFIXO TEXTO') + ': [ ' + p + ' ]',
        B('PREFIXO INTERATIVO') + ': [ ' + interP + ' ]',
        B('DATA') + ': ' + data,
        B('HORA') + ': ' + hora,
        B('COMANDOS') + ': ' + total
      ] },
      { title: 'MENUS', lines: c(['menudono','menuadm','menugrupo','menubn','menudiversao','menufig','menuimg','menuaudio','menuseguranca','menuutilidades','menurpg','menuxp','menueconomia','menudownload','menuwebgames','menupesquisa','menumodos','iskmenu','prefixo']) },
      { title: 'DOWNLOADS', lines: c(['play','ytplay','ytd','yta','tk','ig','fb','spotify','mediafire','pint','twitter','kw','capcut','pinterest']) },
      { title: 'MUSICA', lines: c(['play','ytplay','yta','spotify','tts','crad','lyrics','letra','pausar','fila']) },
      { title: 'STICKERS', lines: c(['s','sticker','toimg','gif','pack','sta','stb','stl','stop','stv','brat','take']) },
      { title: 'IMAGEM', lines: c(['menuimg','blur','invert','removebg','espelhar','gray','pixel','contraste','rip','bolsonaro']) },
      { title: 'ADM', lines: c(['menuadm','ban','kick','promote','demote','tagall','hidetag','mute','unmute','warn','listwarn','add','del']) },
      { title: 'GRUPO', lines: c(['menugrupo','linkgp','grupo','welcome','setname','setdesc','revogar','infogp','hidetag','tagall','simular']) },
      { title: 'SEGURANCA', lines: c(['menuseguranca','antilink','antispam','onlyadmin','antifake','antibot','antiporn','antilinkhard','modobranco']) },
      { title: 'JOGOS', lines: c(['forca','jogodavelha','connect4','ppt','jogos','jogon','menuwebgames','dado','quiz','roleta','slot','aceitarvelha']) },
      { title: 'BRINCADEIRAS', lines: c(['menubn','menudiversao','casal','ship','gay','cara','abracar','beijar','matar','socar','pito','lutar','dado']) },
      { title: 'ISEKAI', lines: c(['iskmenu','iskiniciar','isklutar','iskboss','iskdungeon','iskduelo','iskperfil','iskinv','iskloja','iskatacar','iskdefender']) },
      { title: 'RPG', lines: c(['menurpg','casar','divorciar','perfil','familia','adotar','missao','inventario','status']) },
      { title: 'PESQUISA', lines: c(['menupesquisa','anime','filme','serie','manga','google','wiki','noticias','clima']) },
      { title: 'UTILIDADES', lines: c(['menuutilidades','bia','tts','transcrever','ping','info','dono','gerarlink','calcular','cep','traduzir','clima','prefixo','setprefix1','setprefix2']) },
      { title: 'ECONOMIA', lines: c(['menueconomia','daily','saldo','loja','pagar','rank','level','xp','perfil','work','slot','roubar','apostar']) },
      { title: 'ABREVIADOS', lines: [
        p + 's | sticker', p + 'd | delete', p + 'p | play', p + 'menu | este menu', p + 'ping', p + 'perfil',
        p + 'tk | tiktok', p + 'ig | instagram', p + 'sta | sticker a', p + 'stv | sticker v'
      ] },
      { title: 'TEMPEST BOT', lines: ['Dono: Ebai · +258 874288439', 'Prefixos: ' + allPref + ' | interativo ' + interP] }
    ];
    return build({ title: 'MENU PRINCIPAL', subtitle: 'Central de Comandos', sections: sections, footer: String(bot).toUpperCase() });
  } catch (e) {
    console.error('[menuStyle] main', e && e.message);
    return theme.mainMenuTheme(stats, botName, prefix, extra);
  }
}

const NEW_GROUPS = {
  stickers: [
    { title: 'BRAT & TEXTO', re: /^(brat\d*|bratcores|txt|ttp)$/ },
    { title: 'TAKE & RENAME', re: /^(take|rgtake|vertake|deltake|limpartake|rename)$/ }
  ],
  utilidades: [
    { title: 'IA', re: /^(gpt|chatgpt|gemini|geminipro|perplexity|qwen)$/ },
    { title: 'PESQUISA RÁPIDA', re: /^(pesquisar|google|chrome|significado|horoscopo|brasileirao|timefut|maps|playstore)$/ },
    { title: 'PREFIXO', re: /^(prefixo|setprefix1|setprefix2)$/ }
  ]
};

/** menu de categoria (texto). theme = módulo theme (agrupa subseções como antes) */
function category(theme, meta, cmds, prefix, key) {
  try {
    const p = prefix || '!';
    const title = (meta && meta.title) || 'MENU';
    let groups;
    if (key === 'audio') {
      const af = require('./audioFilters');
      const byName = {};
      cmds.forEach(function (c) { byName[c.name] = c; });
      groups = af.GROUPS.map(function (g) {
        return { title: g.title, items: af.namesOfGroup(g.key).map(function (n) { return byName[n]; }).filter(Boolean) };
      }).filter(function (g) { return g.items.length; });
    } else {
      groups = theme.groupCommandsBySubsections(key, cmds);
      groups = groups.map(function (g) {
        return { title: g.title, items: g.items.filter(function (c) { return !/^brat\d+$/.test(String(c.name)); }) };
      });
      const rules = NEW_GROUPS[key];
      if (rules) {
        const extra = [];
        rules.forEach(function (r) {
          const items = [];
          groups.forEach(function (g) {
            g.items = g.items.filter(function (c) {
              if (r.re.test(String(c.name))) { items.push(c); return false; }
              return true;
            });
          });
          if (items.length) extra.push({ title: r.title, items: items.sort(function (a, b) { return a.name.localeCompare(b.name); }) });
        });
        groups = groups.concat(extra);
      }
      groups = groups.filter(function (g) { return g.items.length; });
    }
    if (!groups.length) return '❌ Nenhum comando na categoria *' + title + '*';
    return buildCategory(title, key, groups, p);
  } catch (e) {
    console.error('[menuStyle] category', e && e.message);
    return theme.categoryMenuTheme(meta, cmds, prefix, key);
  }
}

/** lista do menu de jogos web */
function games(GAMES) {
  return build({
    title: 'MENU JOGOS',
    subtitle: 'Painel de Jogos Web',
    footer: botFooter(),
    sections: [
      { title: 'JOGOS WEB', lines: GAMES.map(function (g) { return g.n + '. ' + g.nome + ' — ' + g.short; }) },
      { title: 'COMO JOGAR', lines: ['Digite jogon1 para abrir o jogo nº1', 'Exemplo: jogon1'] }
    ]
  });
}

module.exports = { build, buildCategory, fromLuxo, main, category, games, boldMath, fraktur, plain, subtitleFor, BULLET };
