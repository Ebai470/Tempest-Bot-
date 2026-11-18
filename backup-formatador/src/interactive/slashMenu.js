/**
 * Menu interativo Tempest — tenta lista/botoes, fallback numerado
 */
const CATEGORIES = [
  { id: 'dono', title: 'Menu Dono', description: 'Area exclusiva do dono', emoji: '👑' },
  { id: 'adm', title: 'Menu ADM', description: 'Gerenciar o grupo', emoji: '🛡️' },
  { id: 'grupo', title: 'Menu Grupo', description: 'Utilitarios de grupo', emoji: '👥' },
  { id: 'downloads', title: 'Menu Download', description: 'Musicas, videos e arquivos', emoji: '📥' },
  { id: 'jogos', title: 'Menu Jogos', description: 'Mini-games e webgames', emoji: '🎮' },
  { id: 'diversao', title: 'Menu Diversao', description: 'Brincadeiras e BN', emoji: '🎭' },
  { id: 'stickers', title: 'Menu Stickers', description: 'Figurinhas e imagem', emoji: '🎨' },
  { id: 'util', title: 'Menu Utilidades', description: 'IA, ping, perfil', emoji: '🧰' },
  { id: 'rpg', title: 'Menu RPG/Familia', description: 'RPG e familia', emoji: '❤️' },
  { id: 'modos', title: 'Menu Modos', description: 'Modos do bot', emoji: '⚙️' },
  { id: 'aluguel', title: 'Menu Aluguel', description: 'Planos e assinatura', emoji: '🏠' },
  { id: 'musica', title: 'Menu Musica', description: 'Audio, play e TTS', emoji: '🎵' }
];

const CMD_MAP = {
  downloads: [
    { id: 'menudownload', title: 'menudownload', desc: 'Menu download' },
    { id: 'ytplay', title: 'ytplay', desc: 'Tocar YT' },
    { id: 'ytd', title: 'ytd', desc: 'Baixar video' },
    { id: 'play', title: 'play', desc: 'Pesquisar/tocar' },
    { id: 'tk', title: 'tk', desc: 'TikTok' },
    { id: 'ig', title: 'ig', desc: 'Instagram' }
  ],
  jogos: [
    { id: 'menuwebgames', title: 'menuwebgames', desc: 'Jogos web' },
    { id: 'connect4', title: 'connect4', desc: 'Ligue 4' }
  ],
  musica: [
    { id: 'ytplay', title: 'ytplay', desc: 'Tocar YT' },
    { id: 'tts', title: 'tts', desc: 'Texto em audio' }
  ],
  stickers: [
    { id: 's', title: 's', desc: 'Criar figurinha' },
    { id: 'toimg', title: 'toimg', desc: 'Sticker → imagem' },
    { id: 'gif', title: 'gif', desc: 'Sticker → GIF' }
  ],
  diversao: [
    { id: 'menudiversao', title: 'menudiversao', desc: 'Menu diversao' },
    { id: 'menubn', title: 'menubn', desc: 'Menu BN' }
  ],
  adm: [{ id: 'menuadm', title: 'menuadm', desc: 'Menu ADM' }],
  dono: [{ id: 'menudono', title: 'menudono', desc: 'Menu Dono' }],
  grupo: [{ id: 'menugrupo', title: 'menugrupo', desc: 'Menu Grupo' }],
  rpg: [{ id: 'menurpg', title: 'menurpg', desc: 'Menu RPG' }],
  util: [
    { id: 'bia', title: 'bia', desc: 'IA Tempest' },
    { id: 'ping', title: 'ping', desc: 'Latencia' },
    { id: 'perfil', title: 'perfil', desc: 'Perfil' }
  ],
  modos: [{ id: 'menumodos', title: 'menumodos', desc: 'Menu Modos' }],
  aluguel: [{ id: 'aluguel', title: 'aluguel', desc: 'Planos' }]
};

if (!global.__slashPending) global.__slashPending = {};

function getJid(ctx) {
  return ctx.jid || ctx.chatId || (ctx.msg && ctx.msg.key && ctx.msg.key.remoteJid);
}

function senderKey(ctx) {
  const s = String((ctx.sender || ctx.senderPn || '') + '|' + (getJid(ctx) || ''));
  return s.replace(/\D/g, '').slice(-20) || 'x';
}

function loadBaileys() {
  try { return require('@whiskeysockets/baileys'); } catch (_) {}
  return null;
}

async function sendInteractiveList(sock, jid, { bodyText, footerText, buttonTitle, sections }) {
  const baileys = loadBaileys();

  // 1) nativeFlow
  if (baileys && baileys.proto && baileys.generateWAMessageFromContent) {
    try {
      const { proto, generateWAMessageFromContent } = baileys;
      const rows = [];
      for (const sec of sections) {
        for (const r of sec.rows) {
          rows.push({
            header: '',
            title: String(r.title).slice(0, 24),
            description: String(r.description || '').slice(0, 72),
            id: r.rowId || r.id
          });
        }
      }
      const native = proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: [{
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: buttonTitle || 'Ver Menus',
            sections: [{ title: (sections[0] && sections[0].title) || 'Menus', rows }]
          })
        }]
      });
      const interactive = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: footerText || 'TEMPEST BOT' }),
        header: proto.Message.InteractiveMessage.Header.create({
          title: 'TEMPEST BOT',
          subtitle: 'Menu interativo',
          hasMediaAttachment: false
        }),
        nativeFlowMessage: native
      });
      const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
          message: {
            messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: interactive
          }
        }
      }, {});
      await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
      return 'nativeFlow';
    } catch (e) {
      console.log('[slash] nativeFlow fail:', e && e.message);
    }
  }

  // 2) listMessage classico
  try {
    await sock.sendMessage(jid, {
      text: bodyText,
      footer: footerText || 'TEMPEST BOT',
      title: 'TEMPEST BOT',
      buttonText: buttonTitle || 'Ver Menus',
      sections
    });
    return 'classic';
  } catch (e2) {
    console.log('[slash] classic fail:', e2 && e2.message);
  }

  return null;
}

async function sendNumbered(ctx, bodyText, items, kind) {
  const jid = getJid(ctx);
  let t = bodyText + '\n\n';
  const map = [];
  items.forEach((it, i) => {
    const n = i + 1;
    t += '*' + n + '.* ' + (it.emoji ? it.emoji + ' ' : '') + it.title + '\n';
    map.push(it);
  });
  t += '\n_Responda com o numero (1-' + items.length + ')_';
  global.__slashPending[senderKey(ctx)] = { kind, map, at: Date.now() };
  if (ctx.sock && jid) {
    await ctx.sock.sendMessage(jid, { text: t });
  } else if (ctx.reply) {
    await ctx.reply(t);
  }
  return 'numbered';
}

async function openMainMenu(ctx) {
  const jid = getJid(ctx);
  if (!ctx.sock || !jid) {
    console.log('[slash] sem sock/jid');
    return;
  }

  const sections = [{
    title: 'Categorias de Menus',
    rows: CATEGORIES.map((c) => ({
      title: (c.emoji ? c.emoji + ' ' : '') + c.title,
      description: c.description,
      rowId: 'slashcat:' + c.id
    }))
  }];

  const body = '⚡ *TEMPEST BOT*\n\n© Tempest • Escolha uma categoria:';
  const mode = await sendInteractiveList(ctx.sock, jid, {
    bodyText: body,
    footerText: '© Tempest Bot • Prefixo /',
    buttonTitle: 'Ver Menus',
    sections
  });
  console.log('[slash] main mode=', mode);

  if (true) {
    await sendNumbered(ctx, body, CATEGORIES.map((c) => ({
      title: c.title,
      emoji: c.emoji,
      action: 'cat',
      id: c.id
    })), 'main');
  }
}

async function openCategory(ctx, catId) {
  if (catId === '__main__') return openMainMenu(ctx);
  const cat = CATEGORIES.find((c) => c.id === catId);
  const cmds = CMD_MAP[catId] || [];
  if (!cat) {
    if (ctx.reply) return ctx.reply('Categoria invalida. Use /menu');
    return;
  }

  const rows = [
    ...cmds.map((c) => ({
      title: c.title,
      description: c.desc,
      rowId: 'slashcmd:' + c.id
    })),
    { title: 'Voltar', description: 'Menu principal', rowId: 'slashcat:__main__' }
  ];

  const body = '📂 *' + cat.title + '*\nSelecione:';
  const mode = await sendInteractiveList(ctx.sock, getJid(ctx), {
    bodyText: body,
    footerText: '© Tempest • /menu',
    buttonTitle: 'Ver Comandos',
    sections: [{ title: cat.title, rows }]
  });

  if (!mode) {
    const items = cmds.map((c) => ({ title: c.title, action: 'cmd', id: c.id }));
    items.push({ title: 'Voltar ao menu', action: 'cat', id: '__main__' });
    await sendNumbered(ctx, body, items, 'cat');
  }
}

async function runExistingCommand(ctx, cmdName) {
  let entry = null;
  try {
    const reg = require('../commands/registry');
    if (reg && typeof reg.get === 'function') entry = reg.get(cmdName);
  } catch (_) {}
  if (!entry) {
    const maps = [global.commandRegistry, global.commands].filter(Boolean);
    for (const reg of maps) {
      try {
        if (typeof reg.get === 'function') entry = reg.get(cmdName);
        if (entry) break;
      } catch (_) {}
    }
  }
  if (entry && typeof (entry.handler || entry) === 'function') {
    const fn = entry.handler || entry;
    return await fn(Object.assign({}, ctx, { command: cmdName, args: [], prefix: '/', text: cmdName }));
  }
  if (ctx.reply) return ctx.reply('📌 *' + cmdName + '*\nUse: */' + cmdName + '* ou *!' + cmdName + '*');
}

async function handleNumberChoice(ctx, numStr) {
  const pending = global.__slashPending[senderKey(ctx)];
  if (!pending || !pending.map) return false;
  if (Date.now() - (pending.at || 0) > 120000) {
    delete global.__slashPending[senderKey(ctx)];
    return false;
  }
  const n = parseInt(String(numStr).trim(), 10);
  if (!n || n < 1 || n > pending.map.length) return false;
  const it = pending.map[n - 1];
  delete global.__slashPending[senderKey(ctx)];
  if (!it) return false;
  if (it.action === 'cat' || pending.kind === 'main') {
    await openCategory(ctx, it.id || it.action);
    return true;
  }
  if (it.action === 'cmd') {
    await runExistingCommand(ctx, it.id);
    return true;
  }
  return false;
}

async function handleSlashListSelection(ctx, rowId) {
  if (!rowId || typeof rowId !== 'string') return false;
  const id = String(rowId);
  if (!id.startsWith('slash')) return false;
  if (id === 'slashcat:__main__') {
    await openMainMenu(ctx);
    return true;
  }
  if (id.startsWith('slashcat:')) {
    await openCategory(ctx, id.slice(9));
    return true;
  }
  if (id.startsWith('slashcmd:')) {
    await runExistingCommand(ctx, id.slice(9));
    return true;
  }
  return false;
}

async function handleInteractiveResponse(ctx, msg) {
  try {
    const ir = msg && msg.message && msg.message.interactiveResponseMessage;
    if (!ir) return false;
    let rowId = '';
    if (ir.nativeFlowResponseMessage && ir.nativeFlowResponseMessage.paramsJson) {
      try {
        const p = JSON.parse(ir.nativeFlowResponseMessage.paramsJson);
        rowId = p.id || p.selectedId || p.rowId || '';
      } catch (_) {}
    }
    if (rowId) return handleSlashListSelection(ctx, rowId);
  } catch (e) {
    console.error('interactive resp', e);
  }
  return false;
}

module.exports = {
  openMainMenu,
  openCategory,
  handleSlashListSelection,
  handleInteractiveResponse,
  handleNumberChoice,
  CATEGORIES
};
