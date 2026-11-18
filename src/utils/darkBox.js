'use strict';
const HEAD_RE = /^╭[━]+〔\s*(.+?)\s*〕[━]+╮[ \t]*$/;
const EMOJI_LEAD = /^((?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)+)\s*/u;

function convert(body) {
  if (typeof body !== 'string') return null;
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const hi = lines.findIndex((l) => HEAD_RE.test(l.trim()));
  if (hi < 0) return null;
  let ci = -1;
  for (let i = hi + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^╰[━]+╯$/.test(t)) { ci = i; break; }
    if (!t.startsWith('┃')) return null;
  }
  if (ci < 0) return null;

  const m = HEAD_RE.exec(lines[hi].trim());
  const raw = m[1].trim();
  const em = EMOJI_LEAD.exec(raw);
  const emoji = em ? em[1] : '✅';
  const name = (em ? raw.slice(em[0].length) : raw).replace(/[`*_]/g, '').trim();
  if (!name) return null;
  const title = emoji + ' `• ' + name.toLocaleUpperCase('pt-PT') + '`';

  const out = [title, ''];
  for (let i = hi + 1; i < ci; i++) {
    const c = lines[i].trim().replace(/^┃\s?/, '').replace(/^👇\s*/, '');
    out.push(c ? '> ' + c : '');
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  const before = lines.slice(0, hi).join('\n');
  const after = lines.slice(ci + 1).join('\n');
  return (before ? before + '\n' : '') + out.join('\n') + (after ? '\n' + after : '');
}

module.exports = { convert };
