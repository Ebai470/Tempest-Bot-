'use strict';
// Estilo visual (gotico, bordas finas) das mensagens de menu. Somente apresentacao.
function mapStr(s, up, lo, dg) {
  let o = '';
  for (const ch of String(s)) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) o += String.fromCodePoint(up + c - 65);
    else if (c >= 97 && c <= 122) o += String.fromCodePoint(lo + c - 97);
    else if (dg && c >= 48 && c <= 57) o += String.fromCodePoint(dg + c - 48);
    else o += ch;
  }
  return o;
}
const plain = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const bold = (s) => mapStr(plain(s), 0x1D400, 0x1D41A, 0x1D7CE);
const fraktur = (s) => mapStr(plain(s), 0x1D56C, 0x1D586, 0);
const MARK = '\u0E4B\u08ED';
const CLOSE = '╰┈┈┈┈┈┈┈┈┈┈';

function top(orn, title, ender) { return '╭┈' + (ender || '❁') + ' 𓆩' + orn + '𓆪 ' + bold(title) + ' 𓆩' + orn + '𓆪 ' + (ender || '❁') + '┈'; }
function sub(text, sym) { return '┊  ' + MARK + ' ⭑ ' + fraktur(text) + ' ⭑ ' + MARK + '\n┊      𖤐 ⛧ ' + sym + ' ⛧ 𖤐'; }
function head(title, subtitle, orn, sym) { return [top(orn, title), '┊', sub(subtitle, sym), CLOSE].join('\n'); }
function group(title, glyph) { return '╭┈' + glyph + ' ' + bold(title) + ' ' + glyph + '┈\n┊'; }

const CAT = {
  armas:       { noun: 'ARMAS',       g: 'f', pl: 1, orn: '⚔', sym: '⚔', pick: 'ESCOLHA SUA ARMA' },
  armaduras:   { noun: 'ARMADURAS',   g: 'f', pl: 1, orn: '✠', sym: '✠', pick: 'ESCOLHA SUA ARMADURA' },
  pocoes:      { noun: 'POCOES',      g: 'f', pl: 1, orn: '⚗', sym: '⚗', pick: 'ESCOLHA SUA POCAO' },
  acessorios:  { noun: 'ACESSORIOS',  g: 'm', pl: 1, orn: '✦', sym: '✦', pick: 'ESCOLHA SEU ACESSORIO' },
  materiais:   { noun: 'MATERIAIS',   g: 'm', pl: 1, orn: '❖', sym: '❖', pick: 'ESCOLHA SEU MATERIAL' },
  comida:      { noun: 'COMIDAS',     g: 'f', pl: 1, orn: '❦', sym: '❦', pick: 'ESCOLHA SUA COMIDA' },
  magia:       { noun: 'MAGIAS',      g: 'f', pl: 1, orn: '☾', sym: '☾', pick: 'ESCOLHA SUA MAGIA' },
  ferramentas: { noun: 'FERRAMENTAS', g: 'f', pl: 1, orn: '⚒', sym: '⚒', pick: 'ESCOLHA SUA FERRAMENTA' },
  util:        { noun: 'UTILIDADES',  g: 'f', pl: 1, orn: '⚙', sym: '⚙', pick: 'ESCOLHA SUA UTILIDADE' }
};
const RAR = [
  ['comum',    { m: 'COMUNS',    f: 'COMUNS' },    '❁'],
  ['incomum',  { m: 'INCOMUNS',  f: 'INCOMUNS' },  '✿'],
  ['raro',     { m: 'RAROS',     f: 'RARAS' },     '❂'],
  ['epico',    { m: 'EPICOS',    f: 'EPICAS' },    '✵'],
  ['lendario', { m: 'LENDARIOS', f: 'LENDARIAS' }, '✺']
];
function shopText(catKey, items, SHOP_CATS) {
  const c = CAT[catKey] || { noun: String((SHOP_CATS && SHOP_CATS[catKey] && SHOP_CATS[catKey].title) || 'ITENS').toUpperCase(), g: 'm', orn: '༒', sym: '⚔', pick: 'ESCOLHA SEU ITEM' };
  const out = [head('LOJA ISEKAI', 'Mercado Negro', c.orn, c.sym)];
  if (!items || !items.length) { out.push('┊\n┊  (vazia)\n' + CLOSE); return out.join('\n'); }
  const used = {};
  RAR.forEach(function (r) {
    const list = items.filter(function (it) { return String(it.rarity || '').toLowerCase() === r[0]; });
    if (!list.length) return;
    list.forEach(function (it) { used[it.id] = 1; });
    out.push(group(c.noun + ' ' + r[1][c.g], r[2]));
    list.forEach(function (it) { out.push('┊ 𖥔 ' + it.name + '\n┊   ╰┈➤ Y' + it.buy + ' ⌁ ' + it.id + '\n┊'); });
  });
  const rest = items.filter(function (it) { return !used[it.id]; });
  if (rest.length) {
    out.push(group(c.noun, '❁'));
    rest.forEach(function (it) { out.push('┊ 𖥔 ' + it.name + '\n┊   ╰┈➤ Y' + it.buy + ' ⌁ ' + it.id + (it.rarity ? ' ⌁ ' + it.rarity : '') + '\n┊'); });
  }
  out.push('┊  Comprar: iskcomprar <id> [qtd]\n┊\n┊  ' + MARK + ' ⭑ 𓆩༒𓆪 ' + bold(c.pick) + ' 𓆩༒𓆪 ⭑ ' + MARK + '\n┊      𖤐 ⛧ ' + c.sym + ' ⛧ 𖤐\n' + CLOSE);
  return out.join('\n');
}
function hubText(SHOP_CATS) {
  const out = [head('LOJAS ISEKAI', 'Mercado Negro', '༒', '⚔'), top('༒', 'CATEGORIAS', '❁').replace(/ 𓆩༒𓆪/g, '') + '\n┊'];
  Object.keys(SHOP_CATS).forEach(function (k) { out.push('┊ 𖥔 ' + SHOP_CATS[k].title + '\n┊   ╰┈➤ iskloja_' + k + '\n┊'); });
  out.push('┊  Comprar: iskcomprar <id> [qtd]\n┊  Saldo: isksaldo\n' + CLOSE);
  return out.join('\n');
}
module.exports = { shopText, hubText, bold, fraktur, head, top, sub, group, CLOSE, MARK };
