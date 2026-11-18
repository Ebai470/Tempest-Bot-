'use strict';
const MT = require('../interactive/menuTheme');

const EMOJI_LEAD = /^((?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)+)\s*/u;
const ALREADY = /^[ᯓ\-╳★·✿❀❁⚘⛧𖤐♱ꕤ୨𓆩⋆☾✰✦☆]|[ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡʏᴢ]/u;

const REPLY = [
  ['✿', '✿'], ['⛧', '⛧'], ['𖤐', '𖤐'], ['⚘', '⚘'], ['♱', '♱'], ['ꕤ', 'ꕤ'],
  ['୨୧', '୨୧'], ['❁', '❁'], ['𓆩♱𓆪', '𓆩♱𓆪'], ['⋆｡°✩', '✩°｡⋆'], ['☾⋆', '⋆☽'], ['𓆩✿𓆪', '𓆩✿𓆪']
];
const BY_KIND = {
  cta_url: ['❀˚₊', '₊˚❀'],
  cta_copy: ['✿⁺˚', '˚⁺✿'],
  cta_call: ['☾⋆', '⋆☽'],
  single_select: ['-ˏˋ✿', '✿ˊˎ-']
};

function pick(kind, text) {
  if (BY_KIND[kind]) return BY_KIND[kind];
  let h = 0;
  for (const ch of text) h = (h + ch.codePointAt(0)) % 9973;
  return REPLY[h % REPLY.length];
}

function styleLabel(kind, label, on) {
  const raw = String(label || '').trim();
  if (!raw || ALREADY.test(raw)) return label;
  const m = EMOJI_LEAD.exec(raw);
  const emoji = m ? m[1] : '';
  const text = (m ? raw.slice(m[0].length) : raw).trim();
  if (!text) return label;
  const d = pick(kind, text);
  return d[0] + ' ' + (emoji ? emoji + ' ' : '') + MT.sc(text, 'title', on) + ' ' + d[1];
}

function sectionTitle(t, on) {
  const raw = String(t || '').trim();
  if (!raw || /^(ᯓ|✿|❀)/u.test(raw)) return t;
  const m = EMOJI_LEAD.exec(raw);
  const text = (m ? raw.slice(m[0].length) : raw).trim();
  if (!text) return t;
  return '✿ ' + (m ? m[1] + ' ' : '') + MT.sc(text, 'title', on);
}

function styleRow(r, on) {
  if (!r || typeof r !== 'object') return r;
  const t = String(r.title || '');
  if (/^(·₊˚|⋆ )/u.test(t) || /^ᯓ/u.test(String(r.header || ''))) return r;
  const out = Object.assign({}, r);
  if (typeof r.header === 'string' && r.header.trim()) {
    const h = r.header.trim();
    const m = EMOJI_LEAD.exec(h);
    const name = (m ? h.slice(m[0].length) : h).trim();
    if (name) out.header = (m ? m[1] + ' ' : '') + MT.sc(name, 'title', on);
  }
  if (t.trim() && t.length <= 22) out.title = '⋆ ' + t.trim();
  if (typeof r.description === 'string' && r.description.trim() && !/^✧/u.test(r.description)) {
    out.description = '✧ ' + r.description.trim();
  }
  return out;
}

function lightSections(sections, on) {
  if (!Array.isArray(sections)) return sections;
  return sections.map((sec) => {
    if (!sec || typeof sec !== 'object') return sec;
    return Object.assign({}, sec, {
      title: sectionTitle(sec.title, on),
      rows: Array.isArray(sec.rows) ? sec.rows.map((r) => styleRow(r, on)) : sec.rows
    });
  });
}

function style(buttons, on, skip) {
  if (skip || !Array.isArray(buttons)) return buttons;
  return buttons.map((b) => {
    try {
      if (!b || typeof b.buttonParamsJson !== 'string') return b;
      const p = JSON.parse(b.buttonParamsJson);
      const key = typeof p.display_text === 'string' ? 'display_text' : (typeof p.title === 'string' ? 'title' : null);
      if (!key) return b;
      let changed = false;
      const nl = styleLabel(b.name, p[key], on);
      if (nl !== p[key]) { p[key] = nl; changed = true; }
      if (b.name === 'single_select' && Array.isArray(p.sections)) { p.sections = lightSections(p.sections, on); changed = true; }
      if (!changed) return b;
      return Object.assign({}, b, { buttonParamsJson: JSON.stringify(p) });
    } catch (_) {
      return b;
    }
  });
}

module.exports = { style, styleLabel, lightSections };
