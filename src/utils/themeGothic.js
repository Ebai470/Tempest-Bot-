'use strict';
// Visual gotico (bordas finas) dos menus. Somente apresentacao; o conteudo vem do tema original.
function mapStr(s, up, lo) {
  let o = '';
  for (const ch of String(s)) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) o += String.fromCodePoint(up + c - 65);
    else if (c >= 97 && c <= 122) o += String.fromCodePoint(lo + c - 97);
    else o += ch;
  }
  return o;
}
const plain = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const bold = (s) => mapStr(plain(s), 0x1D400, 0x1D41A);
const fraktur = (s) => mapStr(plain(s), 0x1D56C, 0x1D586);
const MARK = '\u0E4B\u08ED';
const CLOSE = '╰┈┈┈┈┈┈┈┈┈┈';
const GL = ['❁', '✿', '❂', '✵', '✺'];

function head(titleRaw, orn, subtitle, sym, boldTitle) {
  const t = boldTitle ? titleRaw : bold(titleRaw);
  return ['╭┈❁ 𓆩' + orn + '𓆪 ' + t + ' 𓆩' + orn + '𓆪 ❁┈', '┊',
    '┊  ' + MARK + ' ⭑ ' + fraktur(subtitle) + ' ⭑ ' + MARK, '┊      𖤐 ⛧ ' + sym + ' ⛧ 𖤐', CLOSE].join('\n');
}
const META = {
  dono: ['♛', 'Painel do Dono'], admin: ['⛧', 'Administracao'], grupo: ['❖', 'Gestao de Grupo'],
  internet: ['✧', 'Internet'], bn: ['⚔', 'Brincadeiras'], diversao: ['✦', 'Diversao'],
  stickers: ['❁', 'Figurinhas'], imagem: ['✿', 'Imagens'], seguranca: ['✠', 'Seguranca'],
  utilidades: ['⚙', 'Utilidades'], rpg: ['❦', 'RPG e Familia'], xp: ['⭑', 'XP e Rank'],
  economia: ['❂', 'Economia'], aluguel: ['⌂', 'Aluguel'], download: ['✵', 'Downloads'],
  jogos: ['♜', 'Jogos'], modos: ['☯', 'Modos']
};
function titleCase(s) { return String(s).toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()); }

function categoryMenu(title, catKey, groups, total, p) {
  let key = catKey && META[catKey] ? catKey : '';
  if (!key) {
    const t = plain(title).toUpperCase();
    if (t.indexOf('MODO') >= 0) key = 'modos';
    else if (t.indexOf('GAME') >= 0 || t.indexOf('JOGO') >= 0) key = 'jogos';
    else if (t.indexOf('PESQUISA') >= 0) key = '';
  }
  const m = META[key] || ['༒', titleCase(plain(title).replace(/^MENU\s+/i, '')) || 'Comandos'];
  const out = [head(title, m[0], m[1], m[0], false)];
  (groups || []).forEach(function (grp, g) {
    out.push('╭┈' + GL[g % GL.length] + ' ' + bold(String(grp.title || 'COMANDOS').toUpperCase()) + ' ' + GL[g % GL.length] + '┈\n┊');
    (grp.items || []).forEach(function (c) {
      const al = c.aliases && c.aliases.length ? ' (' + String(c.aliases[0]) + ')' : '';
      out.push('┊ 𖥔 ' + p + c.name + al);
    });
    out.push('┊');
  });
  out.push('┊  Total: ' + total + ' comandos\n' + CLOSE);
  return out.join('\n');
}

function mainMenu(legacy, botName, p) {
  const secs = []; const foot = []; let cur = null;
  String(legacy).split('\n').forEach(function (raw) {
    const l = raw.replace(/\*/g, '');
    let m = l.match(/^║\s+╭━━✯ ❖ (.+?) ❖ ✯━━╮/);
    if (m) { cur = { title: m[1].trim(), rows: [] }; secs.push(cur); return; }
    m = l.match(/^║\s+│\s+(.*)$/);
    if (m && cur) {
      let t = m[1].trim();
      if (!t || /^[✦❖✧\s]+$/.test(t)) return;
      let k = t.indexOf('💠 ');
      if (k >= 0) t = t.slice(k + 3).trim();
      else { k = t.indexOf('✦ '); if (k >= 0) t = t.slice(k + 2).trim(); else return; }
      if (t) cur.rows.push(t);
      return;
    }
    if (!/^[╔╚║]/.test(l.trim()) && l.trim()) foot.push(l.trim());
  });
  if (secs.length < 3 || !secs.some(function (s) { return s.rows.length > 3; })) return null;
  const out = [head(botName || 'TEMPEST BOT', '༒', 'Menu Principal', '⚔', false)];
  secs.forEach(function (s, i) {
    out.push('╭┈' + GL[i % GL.length] + ' ' + s.title + ' ' + GL[i % GL.length] + '┈\n┊');
    s.rows.forEach(function (r) { out.push('┊ 𖥔 ' + r); });
    out.push('┊');
  });
  foot.forEach(function (f) { out.push('┊  ' + f); });
  out.push(CLOSE);
  return out.join('\n');
}
module.exports = { categoryMenu, mainMenu, bold, fraktur, head, META };
