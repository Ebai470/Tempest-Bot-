/**
 * Menu interativo Tempest — nativeFlow / list / fallback numerado
 * Prefixo / → este menu | ! . # → menu texto (inalterado)
 */

const CATEGORIES = [
  { id: 'dono', title: 'Menu Dono', description: 'Area exclusiva do dono', emoji: '👑' },
  { id: 'adm', title: 'Menu ADM', description: 'Gerenciar o grupo', emoji: '🛡️' },
  { id: 'grupo', title: 'Menu Grupo', description: 'Utilitarios de grupo', emoji: '👥' },
  { id: 'internet', title: 'Menu Internet', description: 'Pesquisa e web', emoji: '🌐' },
  { id: 'downloads', title: 'Menu Download', description: 'Musicas, videos e arquivos', emoji: '📥' },
  { id: 'musica', title: 'Menu Musica', description: 'Play, audio e TTS', emoji: '🎵' },
  { id: 'jogos', title: 'Menu Jogos', description: 'Mini-games e webgames', emoji: '🎮' },
  { id: 'bn', title: 'Menu BN', description: 'Brincadeiras BN', emoji: '🎲' },
  { id: 'diversao', title: 'Menu Diversao', description: 'Brincadeiras gerais', emoji: '🎭' },
  { id: 'stickers', title: 'Menu Stickers', description: 'Figurinhas', emoji: '🎴' },
  { id: 'imagem', title: 'Menu Imagem', description: 'Edicao e filtros', emoji: '🖼️' },
  { id: 'seguranca', title: 'Menu Seguranca', description: 'Anti-spam e filtros', emoji: '🔐' },
  { id: 'util', title: 'Menu Utilidades', description: 'IA, ping, perfil', emoji: '🧰' },
  { id: 'rpg', title: 'Menu RPG/Familia', description: 'RPG e familia', emoji: '❤️' },
  { id: 'xp', title: 'Menu XP/Rank', description: 'Nivel e ranking', emoji: '⭐' },
  { id: 'economia', title: 'Menu Economia', description: 'Moedas e loja', emoji: '💰' },
  { id: 'aluguel', title: 'Menu Aluguel', description: 'Planos e assinatura', emoji: '🏠' },
  { id: 'modos', title: 'Menu Modos', description: 'Modos do bot', emoji: '⚙️' },
  { id: 'pesquisa', title: 'Menu Pesquisa', description: 'Buscas e fontes', emoji: '📚' }
];

const CMD_MAP = {
  dono: [
    { id: 'menudono', title: 'menudono', desc: 'Menu completo dono' },
    { id: 'bangp', title: 'bangp', desc: 'Banir grupo' },
    { id: 'unbangp', title: 'unbangp', desc: 'Desbanir grupo' },
    { id: 'bc', title: 'bc', desc: 'Broadcast' },
    { id: 'setprefix', title: 'setprefix', desc: 'Alterar prefixo' }
  ],
  adm: [
    { id: 'menuadm', title: 'menuadm', desc: 'Menu ADM completo' },
    { id: 'ban', title: 'ban', desc: 'Banir membro' },
    { id: 'kick', title: 'kick', desc: 'Remover membro' },
    { id: 'promote', title: 'promote', desc: 'Promover admin' },
    { id: 'demote', title: 'demote', desc: 'Rebaixar admin' },
    { id: 'tagall', title: 'tagall', desc: 'Marcar todos' },
    { id: 'hidetag', title: 'hidetag', desc: 'Hidetag' },
    { id: 'mute', title: 'mute', desc: 'Mutar membro' }
  ],
  grupo: [
    { id: 'menugrupo', title: 'menugrupo', desc: 'Menu grupo' },
    { id: 'linkgp', title: 'linkgp', desc: 'Link do grupo' },
    { id: 'revogar', title: 'revogar', desc: 'Revogar link' },
    { id: 'setname', title: 'setname', desc: 'Nome do grupo' },
    { id: 'setdesc', title: 'setdesc', desc: 'Descricao' },
    { id: 'grupo', title: 'grupo', desc: 'Abrir/fechar' }
  ],
  internet: [
    { id: 'menuinternet', title: 'menuinternet', desc: 'Menu internet' },
    { id: 'google', title: 'google', desc: 'Pesquisa Google' },
    { id: 'wiki', title: 'wiki', desc: 'Wikipedia' },
    { id: 'clima', title: 'clima', desc: 'Clima' },
    { id: 'noticias', title: 'noticias', desc: 'Noticias' }
  ],
  downloads: [
    { id: 'menudownload', title: 'menudownload', desc: 'Menu download' },
    { id: 'ytplay', title: 'ytplay', desc: 'Tocar musica YT' },
    { id: 'ytd', title: 'ytd', desc: 'Baixar video YT' },
    { id: 'yta', title: 'yta', desc: 'Baixar audio YT' },
    { id: 'play', title: 'play', desc: 'Pesquisar/tocar' },
    { id: 'tk', title: 'tk', desc: 'TikTok' },
    { id: 'ig', title: 'ig', desc: 'Instagram' },
    { id: 'spotify', title: 'spotify', desc: 'Spotify' },
    { id: 'mediafire', title: 'mediafire', desc: 'MediaFire' },
    { id: 'fb', title: 'fb', desc: 'Facebook' }
  ],
  musica: [
    { id: 'ytplay', title: 'ytplay', desc: 'Tocar YT' },
    { id: 'play', title: 'play', desc: 'Play' },
    { id: 'spotify', title: 'spotify', desc: 'Spotify' },
    { id: 'tts', title: 'tts', desc: 'Texto em voz' },
    { id: 'crad', title: 'crad', desc: 'Criar audio' }
  ],
  jogos: [
    { id: 'menuwebgames', title: 'menuwebgames', desc: 'Jogos web' },
    { id: 'jogodavelha', title: 'jogodavelha', desc: 'Jogo da velha' },
    { id: 'connect4', title: 'connect4', desc: 'Ligue 4' },
    { id: 'forca', title: 'forca', desc: 'Jogo da forca' },
    { id: 'quiz', title: 'quiz', desc: 'Quiz' }
  ],
  bn: [
    { id: 'menubn', title: 'menubn', desc: 'Menu BN' },
    { id: 'casal', title: 'casal', desc: 'Casal do grupo' },
    { id: 'ship', title: 'ship', desc: 'Shipar' },
    { id: 'gay', title: 'gay', desc: 'Porcentagem gay' },
    { id: 'pito', title: 'pito', desc: 'Tamanho' }
  ],
  diversao: [
    { id: 'menudiversao', title: 'menudiversao', desc: 'Menu diversao' },
    { id: 'dado', title: 'dado', desc: 'Rolar dado' },
    { id: 'cara', title: 'cara', desc: 'Cara ou coroa' },
    { id: 'piada', title: 'piada', desc: 'Piada' },
    { id: 'fato', title: 'fato', desc: 'Fato aleatorio' }
  ],
  stickers: [
    { id: 's', title: 's', desc: 'Criar figurinha' },
    { id: 'toimg', title: 'toimg', desc: 'Sticker → imagem' },
    { id: 'gif', title: 'gif', desc: 'Sticker → GIF' },
    { id: 'sticker', title: 'sticker', desc: 'Sticker' },
    { id: 'pack', title: 'pack', desc: 'Pack stickers' }
  ],
  imagem: [
    { id: 'menuimg', title: 'menuimg', desc: 'Menu imagem' },
    { id: 'toimg', title: 'toimg', desc: 'Para imagem' },
    { id: 'blur', title: 'blur', desc: 'Desfocar' },
    { id: 'invert', title: 'invert', desc: 'Inverter cores' }
  ],
  seguranca: [
    { id: 'menuseguranca', title: 'menuseguranca', desc: 'Menu seguranca' },
    { id: 'antilink', title: 'antilink', desc: 'Anti-link' },
    { id: 'antispam', title: 'antispam', desc: 'Anti-spam' },
    { id: 'onlyadmin', title: 'onlyadmin', desc: 'So admins' }
  ],
  util: [
    { id: 'menuutil', title: 'menuutil', desc: 'Menu utilidades' },
    { id: 'bia', title: 'bia', desc: 'IA Tempest' },
    { id: 'ping', title: 'ping', desc: 'Latencia' },
    { id: 'perfil', title: 'perfil', desc: 'Perfil' },
    { id: 'dono', title: 'dono', desc: 'Info dono' },
    { id: 'info', title: 'info', desc: 'Info bot' },
    { id: 'transcrever', title: 'transcrever', desc: 'Audio → texto' }
  ],
  rpg: [
    { id: 'menurpg', title: 'menurpg', desc: 'Menu RPG' },
    { id: 'perfil', title: 'perfil', desc: 'Perfil RPG' },
    { id: 'casar', title: 'casar', desc: 'Casar' },
    { id: 'divorciar', title: 'divorciar', desc: 'Divorciar' }
  ],
  xp: [
    { id: 'menuxp', title: 'menuxp', desc: 'Menu XP' },
    { id: 'rank', title: 'rank', desc: 'Ranking' },
    { id: 'level', title: 'level', desc: 'Nivel' },
    { id: 'xp', title: 'xp', desc: 'Ver XP' }
  ],
  economia: [
    { id: 'menueconomia', title: 'menueconomia', desc: 'Menu economia' },
    { id: 'saldo', title: 'saldo', desc: 'Saldo' },
    { id: 'daily', title: 'daily', desc: 'Diaria' },
    { id: 'loja', title: 'loja', desc: 'Loja' },
    { id: 'pagar', title: 'pagar', desc: 'Transferir' }
  ],
  aluguel: [
    { id: 'aluguel', title: 'aluguel', desc: 'Planos' },
    { id: 'planosaluguel', title: 'planosaluguel', desc: 'Lista planos' },
    { id: 'statusbot', title: 'statusbot', desc: 'Status bot' }
  ],
  modos: [
    { id: 'menumodos', title: 'menumodos', desc: 'Menu modos' }
  ],
  pesquisa: [
    { id: 'menupesquisa', title: 'menupesquisa', desc: 'Menu pesquisa' },
    { id: 'anime', title: 'anime', desc: 'Buscar anime' },
    { id: 'filme', title: 'filme', desc: 'Buscar filme' }
  ]
};

if (!global.__slashPending) global.__slashPending = {};

function getJid(ctx) {
  return ctx.jid || ctx.chatId || (ctx.msg && ctx.msg.key && ctx.msg.key.remoteJid);
}

function senderKey(ctx) {
  const s = String((ctx.sender || ctx.senderPn || '') + '|' + (getJid(ctx) || ''));
  return s.replace(/\D/g, '').slice(-24) || 'x';
}

function loadBaileys() {
  try { return require('@whiskeysockets/baileys'); } catch (_) {}
  try { return require('@adiwajshing/baileys'); } catch (_) {}
  return null;
}

async function sendInteractiveList(sock, jid, { bodyText, footerText, buttonTitle, sections }) {
  const baileys = loadBaileys();
  const rows = [];
  for (const sec of sections) {
    for (const r of sec.rows) {
      rows.push({
        header: r.header || '',
        title: String(r.title).slice(0, 24),
        description: String(r.description || '').slice(0, 72),
        id: r.rowId || r.id
      });
    }
  }

  if (baileys && baileys.generateWAMessageFromContent && baileys.proto) {
    try {
      const { generateWAMessageFromContent, proto } = baileys;
      const native = proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: [{
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: buttonTitle || 'Ver Menus',
            sections: [{
              title: (sections[0] && sections[0].title) || 'Categorias',
              rows: rows
            }]
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
      console.log('[slash] nativeFlow ok');
      return 'nativeFlow';
    } catch (e) {
      console.log('[slash] nativeFlow fail:', e && e.message);
    }
  }

  try {
    await sock.sendMessage(jid, {
      text: bodyText,
      footer: footerText || 'TEMPEST BOT',
      title: 'TEMPEST BOT',
      buttonText: buttonTitle || 'Ver Menus',
      sections: sections
    });
    console.log('[slash] classic list ok');
    return 'classic';
  } catch (e2) {
    console.log('[slash] classic fail:', e2 && e2.message);
  }

  return null;
}

async function sendNumbered(ctx, bodyText, items) {
  let t = bodyText + '\n\n';
  items.forEach((it, i) => {
    t += '*' + (i + 1) + '.* ' + (it.emoji ? it.emoji + ' ' : '') + it.title + '\n';
  });
  t += '\n_Responda com o *numero* (1-' + items.length + ')_';
  global.__slashPending[senderKey(ctx)] = { map: items, at: Date.now() };
  const jid = getJid(ctx);
  if (ctx.sock && jid) {
    await ctx.sock.sendMessage(jid, { text: t });
  } else if (ctx.reply) {
    await ctx.reply(t);
  }
  console.log('[slash] numbered fallback, items=', items.length);
  return 'numbered';
}

async function openMainMenu(ctx) {
  const jid = getJid(ctx);
  if (!ctx.sock || !jid) {
    console.log('[slash] openMainMenu: sem sock/jid');
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

  const body = '⚡ *TEMPEST BOT*\n\nEscolha uma categoria:';
  const mode = await sendInteractiveList(ctx.sock, jid, {
    bodyText: body,
    footerText: '© Tempest Bot • Prefixo /',
    buttonTitle: 'Ver Menus',
    sections
  });
  console.log('[slash] main mode=', mode);

  if (!mode) {
    await sendNumbered(ctx, body, CATEGORIES.map((c) => ({
      title: c.title,
      emoji: c.emoji,
      action: 'cat',
      id: c.id
    })));
  }
}

async function openCategory(ctx, catId) {
  if (catId === '__main__') return openMainMenu(ctx);
  const cat = CATEGORIES.find((c) => c.id === catId);
  const cmds = CMD_MAP[catId] || [];
  if (!cat) {
    if (ctx.reply) return ctx.reply('Categoria invalida. Use */menu*');
    return;
  }

  const rows = [
    ...cmds.map((c) => ({
      title: c.title,
      description: c.desc,
      rowId: 'slashcmd:' + c.id
    })),
    { title: '« Voltar', description: 'Menu principal', rowId: 'slashcat:__main__' }
  ];

  const body = (cat.emoji || '📂') + ' *' + cat.title + '*\nSelecione um comando:';
  const mode = await sendInteractiveList(ctx.sock, getJid(ctx), {
    bodyText: body,
    footerText: '© Tempest • /menu',
    buttonTitle: 'Ver Comandos',
    sections: [{ title: cat.title, rows }]
  });

  if (!mode) {
    const items = cmds.map((c) => ({ title: c.title, action: 'cmd', id: c.id }));
    items.push({ title: 'Voltar ao menu', action: 'cat', id: '__main__' });
    await sendNumbered(ctx, body, items);
  }
}

async function runExistingCommand(ctx, cmdName) {
  let entry = null;
  try {
    const reg = require('../commands/registry');
    if (reg && typeof reg.get === 'function') entry = reg.get(cmdName);
  } catch (_) {}
  if (!entry) {
    for (const reg of [global.commandRegistry, global.commands].filter(Boolean)) {
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
  if (ctx.reply) {
    return ctx.reply('📌 *' + cmdName + '*\nUse: */' + cmdName + '* ou *!' + cmdName + '*');
  }
}

async function handleNumberChoice(ctx, numStr) {
  const key = senderKey(ctx);
  const pending = global.__slashPending[key];
  if (!pending || !pending.map) return false;
  if (Date.now() - (pending.at || 0) > 180000) {
    delete global.__slashPending[key];
    return false;
  }
  const n = parseInt(String(numStr).trim(), 10);
  if (!n || n < 1 || n > pending.map.length) return false;
  const it = pending.map[n - 1];
  delete global.__slashPending[key];
  if (!it) return false;
  if (it.action === 'cat') {
    await openCategory(ctx, it.id);
    return true;
  }
  if (it.action === 'cmd') {
    await runExistingCommand(ctx, it.id);
    return true;
  }
  if (it.id) {
    await openCategory(ctx, it.id);
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
    if (!rowId && ir.listResponseMessage) {
      rowId = (ir.listResponseMessage.singleSelectReply && ir.listResponseMessage.singleSelectReply.selectedRowId) || '';
    }
    if (rowId) return handleSlashListSelection(ctx, rowId);
  } catch (e) {
    console.error('[slash] interactive resp', e && e.message);
  }
  return false;
}

module.exports = {
  openMainMenu,
  openCategory,
  handleSlashListSelection,
  handleInteractiveResponse,
  handleNumberChoice,
  CATEGORIES,
  CMD_MAP
};
