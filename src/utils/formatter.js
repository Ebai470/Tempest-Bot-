const BRAND = 'Tempest Bot';
const HEADER = '⋆. 𐙚˚࿔ 𝔗𝔢𝔪𝔭𝔢𝔰𝔱 𝔟𝔬𝔱 𝜗𝜚˚⋆';
const DIVIDER = '⋆｡𖦹°⭒˚｡⋆⋆｡𖦹°⭒˚｡⋆';
const FOOTER = '_⚡ ' + BRAND + '_';
const MAX_TEXT = 3500;
const MAX_CAPTION = 1000;

const SPECIAL_KEYS = [
  'buttons', 'sections', 'listMessage', 'templateButtons', 'interactiveMessage',
  'interactiveButtons', 'poll', 'edit', 'delete', 'react', 'forward', 'viewOnce',
  'contacts', 'location', 'image', 'video', 'audio', 'sticker', 'document', 'ptt'
];
const TEXT_ALLOWED_KEYS = ['text', 'mentions', 'contextInfo', 'linkPreview', 'ephemeralExpiration', 'ai'];
const MEDIA_CAPTION_KEYS = ['image', 'video', 'document'];

const THEMED_RE = /[╔╗╚╝║╭╮╰╯┏┓┗┛┃│━═]|┈┈┈┈┈|⋆｡𖦹°⭒˚｡⋆|𝔗𝔢𝔪𝔭𝔢𝔰𝔱|_⚡ Tempest Bot_|\*🌪️ Tempest Bot\*|`•\s/i;
const CODE_RE = /```/;
const URL_ONLY_RE = /^\s*https?:\/\/\S+\s*$/i;

function enabled() {
  const v = String(process.env.TEMPEST_FORMAT || '').toLowerCase();
  if (v === 'off' || v === '0' || v === 'false') return false;
  if (global.__tempestFormatOff === true) return false;
  return true;
}

function normalizeBold(s) {
  return s.replace(/\*\*([^*\n]+)\*\*/g, '*$1*');
}

const EMOJI_LEAD = /^((?:\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)+)\s*/u;

function parseTitle(line, totalLines) {
  const t = line.trim();
  if (!t || t.length > 70) return null;
  if (t.startsWith('>') || /^[-•·▪▫◦]\s/.test(t) || /https?:\/\//i.test(t)) return null;
  const m = EMOJI_LEAD.exec(t);
  const emoji = m ? m[1] : '';
  const rest = m ? t.slice(m[0].length) : t;
  let text = null;
  if (/^\*[^*\n]+\*$/.test(rest)) {
    text = rest.replace(/^\*+|\*+$/g, '');
  } else if (totalLines >= 2) {
    if (/:\s*$/.test(rest) && !/:\s*\S/.test(rest.replace(/:\s*$/, ''))) {
      text = rest.replace(/:\s*$/, '');
    } else {
      const plain = rest.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
      if (plain.length >= 3 && plain === plain.toUpperCase() && /\p{L}/u.test(plain)) text = rest;
    }
  }
  if (text === null) return null;
  text = text.replace(/[`*_]/g, '').trim();
  if (!text || !/\p{L}/u.test(text) || text.length > 60) return null;
  return { emoji: emoji, text: text };
}

function titleEmoji(t) {
  if (t.emoji) return t.emoji;
  if (/erro|falh|inv[aá]lid|negad|bloquead|proibid/i.test(t.text)) return '❌';
  if (/aviso|aten[cç][aã]o|alerta|cuidado/i.test(t.text)) return '⚠️';
  return '✅';
}

function makeTitle(t) {
  return titleEmoji(t) + ' `• ' + t.text.toLocaleUpperCase('pt-PT') + '`';
}

function formatLine(line) {
  const raw = line.replace(/\s+$/, '');
  if (!raw.trim()) return '';
  if (raw.trim().startsWith('>')) return raw.trim();
  let t = raw.trim();
  t = t.replace(/^[-•·▪▫◦]\s+/, '• ').replace(/^\*\s+/, '• ');
  const kv = /^(•\s+)?([^:\n*_`>]{2,28}):\s+(\S.*)$/.exec(t);
  if (kv && !/^https?$/i.test(kv[2].trim())) {
    t = (kv[1] || '') + '*' + kv[2].trim() + ':* ' + kv[3];
  }
  return '> ' + t;
}

function formatText(input, opts) {
  const o = opts || {};
  if (typeof input !== 'string') return input;
  const text = input.replace(/\r\n/g, '\n').trim();
  if (!text) return input;
  if (THEMED_RE.test(text) || CODE_RE.test(text) || URL_ONLY_RE.test(text)) return input;
  const maxLen = o.maxLen || MAX_TEXT;
  if (text.length > maxLen) return input;

  const lines = normalizeBold(text).split('\n');
  const nonBlank = lines.filter(function (l) { return l.trim(); });

  if (nonBlank.length === 1 && text.length < 70) {
    return formatLine(nonBlank[0]);
  }

  let title = null;
  let bodyLines = lines;
  const pt = parseTitle(lines[0], nonBlank.length);
  if (pt) {
    title = makeTitle(pt);
    bodyLines = lines.slice(1);
  }

  const body = [];
  let prevBlank = true;
  bodyLines.forEach(function (l) {
    const f = formatLine(l);
    if (!f) {
      if (!prevBlank) body.push('');
      prevBlank = true;
    } else {
      body.push(f);
      prevBlank = false;
    }
  });
  while (body.length && body[body.length - 1] === '') body.pop();
  while (body.length && body[0] === '') body.shift();

  const out = [];
  const full = o.header !== false && (nonBlank.length >= 3 || text.length >= 140);
  if (full) { out.push(HEADER); out.push(DIVIDER); }
  if (title) { out.push(title); if (body.length) out.push(''); }
  out.push(body.join('\n'));
  if (full && o.footer !== false) { out.push(''); out.push(FOOTER); }
  const result = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return result.length > maxLen ? input : result;
}

function formatContent(content, options) {
  try {
    if (!enabled()) return content;
    if (!content || typeof content !== 'object') return content;
    if (content.__noFormat || (options && options.noFormat)) return content;
    const keys = Object.keys(content);
    if (typeof content.text === 'string') {
      const hasSpecial = keys.some(function (k) { return SPECIAL_KEYS.indexOf(k) !== -1; });
      const hasUnknown = keys.some(function (k) { return TEXT_ALLOWED_KEYS.indexOf(k) === -1; });
      if (hasSpecial || hasUnknown) return content;
      const nt = formatText(content.text);
      if (nt === content.text) return content;
      return Object.assign({}, content, { text: nt });
    }
    const isMedia = MEDIA_CAPTION_KEYS.some(function (k) { return content[k]; });
    if (isMedia && typeof content.caption === 'string' && content.caption.trim()) {
      if (keys.some(function (k) { return k === 'buttons' || k === 'sections' || k === 'templateButtons' || k === 'interactiveButtons'; })) return content;
      const nc = formatText(content.caption, { maxLen: MAX_CAPTION, header: false });
      if (nc === content.caption) return content;
      return Object.assign({}, content, { caption: nc });
    }
    return content;
  } catch (e) {
    return content;
  }
}

function wrapSocket(sock) {
  if (!sock || sock.__tempestFormatterWrapped || typeof sock.sendMessage !== 'function') return sock;
  const original = sock.sendMessage.bind(sock);
  let verified = null;
  try { verified = require('../services/verifiedMode'); } catch (_) {}
  sock.sendMessage = function (jid, content, options) {
    let c = formatContent(content, options);
    try {
      if (verified && typeof verified.decorate === 'function') c = verified.decorate(jid, c, options);
    } catch (_) {}
    return original(jid, c, options);
  };
  sock.__tempestFormatterWrapped = true;
  console.log('[FORMATTER] formatador global ativo');
  return sock;
}

module.exports = { formatText, formatContent, wrapSocket, enabled, BRAND, HEADER, FOOTER };
