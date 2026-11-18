/**
 * Figurinhas extras (módulo novo — não altera sticker.js / textstickers.js)
 *   brat, brat0..brat30  -> figurinha de texto estilo "brat" em várias cores
 *   txt, ttp             -> atalhos para a figurinha de texto já existente (st)
 *   rgtake / take / vertake / deltake / limpartake / rename -> pack/autor personalizado
 */
const fs = require('fs');
const path = require('path');

const media = require('../../utils/media');
const qm = require('../../utils/quotedMedia');
const registry = require('../registry');

/* ---------------------------------------------------------------- BRAT */

// [nome exibido, cor de fundo hex]
const BRAT_COLORS = [
  ['branca', 'FFFFFF'], ['preta', '000000'], ['azul', '1E88E5'], ['vermelho', 'E53935'],
  ['roxa', '8E24AA'], ['rosa', 'F48FB1'], ['dourado', 'FFC107'], ['ciano', '00BCD4'],
  ['verde', '43A047'], ['amarelo', 'FFEB3B'], ['laranja', 'FB8C00'], ['prata', 'C0C0C0'],
  ['cinza', '9E9E9E'], ['marrom', '6D4C41'], ['verde-limão', 'C6FF00'], ['azul-marinho', '0D2B5E'],
  ['verde-azulado', '00897B'], ['aqua', '00FFFF'], ['magenta', 'FF00FF'], ['violeta', '7B1FA2'],
  ['crimson', 'DC143C'], ['índigo', '3F51B5'], ['coral', 'FF7F50'], ['turquesa', '26A69A'],
  ['vermelho escuro', '8B0000'], ['azul escuro', '0A1F44'], ['verde escuro', '1B5E20'],
  ['rosa choque', 'FF1493'], ['rosa intenso', 'E91E63'], ['azul céu', '87CEEB'], ['verde neon', '39FF14']
];
const BRAT_DEFAULT = '8ACE00'; // verde brat clássico

function isLightBg(hex) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 140;
}

/** quebra em linhas respeitando a largura; palavras gigantes são cortadas por caractere */
function wrapText(Jimp, font, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  function pushWord(w) {
    if (Jimp.measureText(font, w) <= maxW) return [w];
    const parts = [];
    let piece = '';
    for (const ch of w) {
      if (Jimp.measureText(font, piece + ch) > maxW && piece) { parts.push(piece); piece = ch; }
      else piece += ch;
    }
    if (piece) parts.push(piece);
    return parts;
  }
  for (const w of words) {
    const chunks = pushWord(w);
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const test = cur ? cur + ' ' + c : c;
      if (cur && (i > 0 || Jimp.measureText(font, test) > maxW)) {
        lines.push(cur);
        cur = c;
      } else {
        cur = test;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function renderBrat(text, bgHex) {
  const Jimp = require('jimp');
  const SIZE = 512;
  const PAD = 34;
  const maxW = SIZE - PAD * 2;
  const maxH = SIZE - PAD * 2;
  const light = isLightBg(bgHex);
  const specs = light
    ? [[Jimp.FONT_SANS_128_BLACK, 128], [Jimp.FONT_SANS_64_BLACK, 64], [Jimp.FONT_SANS_32_BLACK, 32], [Jimp.FONT_SANS_16_BLACK, 16]]
    : [[Jimp.FONT_SANS_128_WHITE, 128], [Jimp.FONT_SANS_64_WHITE, 64], [Jimp.FONT_SANS_32_WHITE, 32], [Jimp.FONT_SANS_16_WHITE, 16]];

  const clean = String(text).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 220);
  let chosen = null;
  for (let i = 0; i < specs.length; i++) {
    const font = await Jimp.loadFont(specs[i][0]);
    const lines = wrapText(Jimp, font, clean, maxW);
    const lineH = Math.round(specs[i][1] * 1.1);
    const fits = lines.length * lineH <= maxH;
    chosen = { font: font, lines: lines, lineH: lineH };
    if (fits) break;
  }

  const img = new Jimp(SIZE, SIZE, parseInt(bgHex + 'ff', 16));
  let y = PAD;
  for (const line of chosen.lines) {
    if (y + chosen.lineH > SIZE) break;
    img.print(chosen.font, PAD, y, line);
    y += chosen.lineH;
  }
  img.blur(1); // leve desfoque típico do estilo brat
  return img.getBufferAsync(Jimp.MIME_PNG);
}

function makeBrat(name, bgHex, label) {
  return {
    name: name,
    aliases: [],
    category: 'stickers',
    description: 'Figurinha brat' + (label ? ' (' + label + ')' : ''),
    usage: '!' + name + ' <texto>',
    handler: async function (ctx) {
      if (!ctx.hasPrefix) return; // só com prefixo (evita disparar em conversa normal)
      const text = (ctx.text || '').trim();
      if (!text) {
        return ctx.reply('Escreva o texto. Ex: *' + name + ' oi gente*');
      }
      if (!media.available()) return ctx.reply('❌ Sem processador de imagem.\nnpm install jimp --legacy-peer-deps');
      try {
        const png = await renderBrat(text, bgHex);
        let webp = png;
        try { if (media.toStickerWebp) webp = await media.toStickerWebp(png); } catch (_) {}
        await ctx.sock.sendMessage(ctx.jid, { sticker: webp }, { quoted: ctx.msg });
      } catch (e) {
        console.error('[brat]', e && e.message);
        await ctx.reply('❌ Não consegui criar a figurinha.');
      }
    }
  };
}

const bratCmds = [makeBrat('brat', BRAT_DEFAULT, 'verde clássico')];
BRAT_COLORS.forEach(function (c, i) {
  bratCmds.push(makeBrat('brat' + i, c[1], c[0]));
});

// lista de cores (os brat0..brat30 ficam fora do menu; este comando mostra todos)
bratCmds.push({
  name: 'bratcores',
  aliases: ['bratcolors', 'menubrat'],
  category: 'stickers',
  description: 'Lista as cores do brat',
  usage: '!bratcores',
  handler: async function (ctx) {
    const lines = ['🖌️ *BRAT — CORES*', '', '• *brat* (verde clássico)'];
    BRAT_COLORS.forEach(function (c, i) { lines.push('• *brat' + i + '* ' + c[0]); });
    lines.push('', 'Ex: *brat3 seu texto aqui*');
    return ctx.reply(lines.join('\n'));
  }
});

/* ------------------------------------------------------ TXT / TTP (atalhos) */

function makeAlias(name, target, desc) {
  return {
    name: name,
    aliases: [],
    category: 'stickers',
    description: desc,
    usage: '!' + name + ' <texto>',
    handler: async function (ctx) {
      const t = registry.get(target);
      if (!t) return ctx.reply('❌ Comando indisponível.');
      if (!ctx.hasPrefix) return; // só com prefixo (evita disparar em conversa normal)
      return t.handler(ctx);
    }
  };
}

/* ------------------------------------------------------------------ TAKE */

const TAKES_FILE = path.join(__dirname, '../../../data/takes.json');

function loadTakes() {
  try { return JSON.parse(fs.readFileSync(TAKES_FILE, 'utf8')) || {}; } catch (_) { return {}; }
}
function saveTakes(obj) {
  try {
    fs.mkdirSync(path.dirname(TAKES_FILE), { recursive: true });
    const tmp = TAKES_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
    fs.renameSync(tmp, TAKES_FILE);
    return true;
  } catch (e) {
    console.error('[take] salvar:', e.message);
    return false;
  }
}
function userKey(ctx) {
  return String(ctx.sender || '').split('@')[0].split(':')[0];
}
function cleanNick(s) {
  return String(s || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30);
}

async function resendSticker(ctx, pack, author) {
  const info = qm.resolve(ctx, ['sticker']);
  if (!info) return { err: 'Responda a uma *figurinha* com o comando.' };
  const buf = await qm.download(ctx, info);
  if (!buf) return { err: 'Não consegui baixar a figurinha.' };
  const out = await media.writeStickerExif(buf, pack, author);
  await ctx.sock.sendMessage(ctx.jid, { sticker: out }, { quoted: ctx.msg });
  return { ok: true };
}

const takeCmds = [
  {
    name: 'rgtake', aliases: [], category: 'stickers',
    description: 'Registra seu nome para o take', usage: '!rgtake <seu nick>',
    handler: async function (ctx) {
      const nick = cleanNick(ctx.text);
      if (!nick) {
        if (!ctx.hasPrefix) return;
        return ctx.reply('Use: *rgtake seu nick*\nDepois responda uma figurinha com *take*.');
      }
      const all = loadTakes();
      all[userKey(ctx)] = { nick: nick, at: Date.now() };
      if (!saveTakes(all)) return ctx.reply('❌ Não consegui salvar. Tente novamente.');
      return ctx.reply('✅ Take registrado: *' + nick + '*\nAgora responda uma figurinha com *take*.');
    }
  },
  {
    name: 'take', aliases: [], category: 'stickers',
    description: 'Reenvia a figurinha com o seu nome', usage: '!take (respondendo figurinha)',
    handler: async function (ctx) {
      const mine = loadTakes()[userKey(ctx)];
      const hasSticker = !!qm.resolve(ctx, ['sticker']);
      if (!hasSticker && !ctx.hasPrefix) return;
      if (!mine || !mine.nick) return ctx.reply('Você ainda não registrou um take.\nUse: *rgtake seu nick*');
      try {
        const r = await resendSticker(ctx, mine.nick, mine.nick);
        if (r.err) return ctx.reply('❌ ' + r.err);
      } catch (e) {
        console.error('[take]', e && e.message);
        return ctx.reply('❌ Não consegui aplicar o take.');
      }
    }
  },
  {
    name: 'vertake', aliases: [], category: 'stickers',
    description: 'Mostra o seu take atual', usage: '!vertake',
    handler: async function (ctx) {
      const mine = loadTakes()[userKey(ctx)];
      if (!mine || !mine.nick) {
        if (!ctx.hasPrefix) return;
        return ctx.reply('Você ainda não registrou um take.\nUse: *rgtake seu nick*');
      }
      return ctx.reply('🏷️ Seu take: *' + mine.nick + '*');
    }
  },
  {
    name: 'deltake', aliases: [], category: 'stickers',
    description: 'Remove o seu take', usage: '!deltake',
    handler: async function (ctx) {
      const all = loadTakes();
      const k = userKey(ctx);
      if (!all[k]) {
        if (!ctx.hasPrefix) return;
        return ctx.reply('Você não tem take registrado.');
      }
      delete all[k];
      if (!saveTakes(all)) return ctx.reply('❌ Não consegui salvar. Tente novamente.');
      return ctx.reply('🗑️ Take removido.');
    }
  },
  {
    name: 'limpartake', aliases: [], category: 'stickers', ownerOnly: true,
    description: 'Apaga todos os takes (dono)', usage: '!limpartake',
    handler: async function (ctx) {
      const n = Object.keys(loadTakes()).length;
      if (!saveTakes({})) return ctx.reply('❌ Não consegui salvar. Tente novamente.');
      return ctx.reply('🧹 ' + n + ' take(s) apagado(s).');
    }
  },
  {
    name: 'rename', aliases: [], category: 'stickers',
    description: 'Renomeia o pack da figurinha', usage: '!rename <nome> (respondendo figurinha)',
    handler: async function (ctx) {
      const nome = cleanNick(ctx.text);
      const hasSticker = !!qm.resolve(ctx, ['sticker']);
      if (!hasSticker && !ctx.hasPrefix) return;
      if (!nome) return ctx.reply('Use: responda uma figurinha com *rename novo nome*');
      const mine = loadTakes()[userKey(ctx)];
      try {
        const r = await resendSticker(ctx, nome, (mine && mine.nick) || nome);
        if (r.err) return ctx.reply('❌ ' + r.err);
      } catch (e) {
        console.error('[rename]', e && e.message);
        return ctx.reply('❌ Não consegui renomear.');
      }
    }
  }
];

module.exports = []
  .concat(bratCmds)
  .concat([
    makeAlias('txt', 'st', 'Figurinha de texto (atalho de st)'),
    makeAlias('ttp', 'st', 'Figurinha de texto (atalho de st)')
  ])
  .concat(takeCmds);

// exposto só para testes
module.exports._test = { renderBrat, BRAT_COLORS };
