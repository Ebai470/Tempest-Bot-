'use strict';
const { btn, getEnv } = require('./nativeFlow');

const HEART = getEnv('MENU_HEART') || '💗';
const FRUIT = getEnv('MENU_FRUIT') || '🍓';
const WINGS = '𓆩' + HEART + '𓆪';

const SC = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
  n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};
const EMOJI_LEAD = /^((?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)+)\s*/u;

function strip(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function small(s) { return s.replace(/[a-z]/g, (c) => SC[c]); }
const LIGA = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'ao', 'em', 'no', 'na', 'para', 'por']);
function capFirst(w) {
  const i = w.search(/[A-Za-z]/);
  if (i < 0) return w;
  return w.slice(0, i) + w[i].toUpperCase() + small(w.slice(i + 1));
}

function sc(text, mode, on) {
  const raw = String(text || '');
  if (on === false) return raw;
  const t = strip(raw);
  const words = t.split(/(\s+)/);
  let first = true;
  return words.map((w) => {
    if (!w.trim()) return w;
    let out;
    if (mode === 'all') out = small(w);
    else if (mode === 'sentence') out = first ? capFirst(w) : small(w);
    else out = (!first && LIGA.has(w.toLowerCase())) ? small(w) : capFirst(w);
    first = false;
    return out;
  }).join('');
}

function noCount(s) { return String(s || '').replace(/\s*[•·|\-–—(]?\s*\d+\s*comandos?\)?/gi, '').trim(); }
function noEmoji(s) { return String(s || '').replace(EMOJI_LEAD, '').trim(); }
function emojiOf(r) {
  const m = EMOJI_LEAD.exec(String(r.header || '')) || EMOJI_LEAD.exec(String(r.title || ''));
  return m ? m[1] : '✨';
}

function styleRow(r, on) {
  if (!r || String(r.title || '').startsWith('·₊˚')) return r;
  const name = noEmoji(r.title || r.header);
  const out = Object.assign({}, r);
  out.header = 'ᯓ★ ' + sc(name, 'title', on);
  out.title = '·₊˚ ' + emojiOf(r) + ' ' + sc(name, 'title', on) + ' ₊˚⊹';
  if (r.description) out.description = WINGS + ' ' + sc(noCount(r.description), 'sentence', on) + ' ' + WINGS;
  return out;
}

function styleSections(sections, on) {
  return (sections || []).map((s) => {
    const t = noEmoji(s.title);
    return Object.assign({}, s, {
      title: String(s.title || '').startsWith('ᯓ★') ? s.title : 'ᯓ★ ' + sc(t, 'title', on),
      rows: (s.rows || []).map((r) => styleRow(r, on))
    });
  });
}

const B = {
  dono: (on) => 'ᯓ★ ' + sc('Dono', 'title', on),
  list: (on) => '-ˏˋ✳ ' + sc('Ver Menus', 'title', on) + ' ✳ˊˎ-',
  canal: (on) => '╳˚₊ ' + sc('Canal Oficial', 'title', on) + ' ₊˚╳',
  voltar: (on) => '-ˏˋ ' + sc('Voltar ao Menu', 'title', on) + ' ˊˎ-'
};

function nav(on) {
  return [btn.reply(B.voltar(on), 'mn:home'), btn.channel(B.canal(on))];
}

function langOn(jid) {
  try { return require('./idioma').getLang(jid) === 'pt'; } catch (_) { return true; }
}

module.exports = { sc, styleRow, styleSections, nav, B, langOn, WINGS, HEART, FRUIT };
