'use strict';
/**
 * Comandos dos sistemas de boas-vindas 3 a 6.
 *   welcomemodo [3|4|5|6|off|status]  — escolhe/mostra o sistema do grupo (admin)
 *   welcome3..welcome6 [on|off|teste] — atalhos por sistema (admin)
 *   welcomemsg ...                    — mensagens e opções (admin)
 *   apresentar ...                    — apresentação do próprio membro (todos)
 *   setbannern1..10 / listbannern / delbannern1..10 — banners do sistema 6 (admin)
 */
const svc = require('../../services/welcomeSuite');
const render = require('../../services/welcomeRender');
let dlContent = null;
try { dlContent = require('@whiskeysockets/baileys').downloadContentFromMessage; } catch (_) {}

const MAX_BANNER_BYTES = 8 * 1024 * 1024;

const SYSTEM_NAMES = {
  '3': 'Bem-vindo 3 — apresentação do membro',
  '4': 'Bem-vindo 4 — foto do membro',
  '5': 'Bem-vindo 5 — banner automático',
  '6': 'Bem-vindo 6 — banners do administrador'
};

/* ------------------------------ utilitários ------------------------------ */
function unwrap(m) {
  let c = m;
  for (let i = 0; i < 5 && c; i++) {
    const inner = c.ephemeralMessage || c.viewOnceMessage || c.viewOnceMessageV2 || c.documentWithCaptionMessage || null;
    if (!inner || !inner.message) break;
    c = inner.message;
  }
  return c || {};
}

async function isAdmin(ctx) {
  try { if (ctx.isOwner && ctx.isOwner()) return true; } catch (_) {}
  try { if (ctx.isBotAdmin && ctx.isBotAdmin()) return true; } catch (_) {}
  try { return !!(await ctx.isGroupAdmin()); } catch (_) { return false; }
}

async function requireAdmin(ctx) {
  if (!ctx.isGroup) { await ctx.reply('❌ Use este comando dentro de um grupo.'); return false; }
  if (!(await isAdmin(ctx))) { await ctx.reply('🚫 Só administradores podem usar este comando.'); return false; }
  return true;
}

function senderIds(ctx) {
  const k = (ctx.msg && ctx.msg.key) || {};
  return [ctx.sender, ctx.senderPn, k.participantPn, k.participantAlt, k.remoteJidAlt].filter(Boolean);
}

/** Texto completo da mensagem (com quebras de linha), sem prefixo nem nome do comando */
function rawArgs(ctx) {
  const m = unwrap((ctx.msg && ctx.msg.message) || {});
  const t = m.conversation || (m.extendedTextMessage && m.extendedTextMessage.text) ||
    (m.imageMessage && m.imageMessage.caption) || (m.videoMessage && m.videoMessage.caption) || ctx.body || '';
  return String(t).replace(/^\s*[!./#?]?\s*\S+\s*/, '').trim();
}

function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }

async function streamToBuffer(stream) { const c = []; for await (const x of stream) c.push(x); return Buffer.concat(c); }

/** Imagem na própria mensagem ou na mensagem respondida (imagem ou documento de imagem) */
function findImageNode(ctx) {
  const m = unwrap((ctx.msg && ctx.msg.message) || {});
  const ci = (m.extendedTextMessage && m.extendedTextMessage.contextInfo) || (m.imageMessage && m.imageMessage.contextInfo) || null;
  const q = ci && ci.quotedMessage ? unwrap(ci.quotedMessage) : null;
  const pick = (c) => {
    if (!c) return null;
    if (c.imageMessage) return { node: c.imageMessage, type: 'image' };
    if (c.documentMessage && /^image\//i.test(c.documentMessage.mimetype || '')) return { node: c.documentMessage, type: 'document' };
    return null;
  };
  return pick(q) || pick(m);
}

/* ------------------------------ escolha do sistema ------------------------------ */
function statusText(groupJid, prefix) {
  const cfg = svc.getConfig(groupJid);
  const banners = svc.listBanners(groupJid).length;
  const lines = ['👋 *BOAS-VINDAS DO GRUPO*', ''];
  lines.push('Sistema ativo: ' + (cfg.active ? '*' + SYSTEM_NAMES[cfg.active] + '*' : '*nenhum dos novos* (continuam os antigos, se ativados)'));
  lines.push('Mostrar membro como: *' + (cfg.display === 'numero' ? 'número de telefone' : 'nome') + '*');
  lines.push('Banners do sistema 6: *' + banners + '/' + svc.MAX_SLOTS + '*');
  lines.push('');
  lines.push('*' + prefix + 'welcomemodo 3|4|5|6* — escolher sistema');
  lines.push('*' + prefix + 'welcomemodo off* — desligar os novos');
  lines.push('*' + prefix + 'welcome5 teste* — pré-visualizar em si');
  lines.push('*' + prefix + 'welcomemsg* — mensagens e opções');
  return lines.join('\n');
}

async function chooseMode(ctx, arg) {
  const g = ctx.jid, p = ctx.prefix || '!';
  const a = norm(arg);
  if (!a || a === 'status') return ctx.reply(statusText(g, p));
  if (a === 'off' || a === 'desligar' || a === 'nenhum') {
    const was = svc.getActive(g);
    svc.setActive(g, '');
    return ctx.reply(was ? '⛔ Boas-vindas novas *desativadas* neste grupo. Os sistemas antigos voltam a funcionar se estiverem ativos.' : 'ℹ️ Nenhum sistema novo estava ativo.');
  }
  if (!svc.MODES.includes(a)) return ctx.reply('❌ Opção inválida. Use *' + p + 'welcomemodo 3*, *4*, *5*, *6* ou *off*.');
  const warn = (a === '6' && !svc.listBanners(g).length)
    ? '\n⚠️ Ainda não há banners: até configurar com *' + p + 'setbannern1* (respondendo a uma imagem), será enviada a mensagem padrão.' : '';
  svc.setActive(g, a);
  return ctx.reply('✅ Ativado: *' + SYSTEM_NAMES[a] + '*.\nOs sistemas antigos (1 e 2) ficam em pausa neste grupo enquanto este estiver ativo.' + warn);
}

const modeCommands = [{
  name: 'welcomemodo',
  aliases: ['wmodo', 'bemvindomodo', 'boasvindasmodo'],
  category: 'admin',
  description: 'Escolhe o sistema de boas-vindas do grupo (3, 4, 5, 6 ou off)',
  usage: '!welcomemodo [3|4|5|6|off|status]',
  groupOnly: true,
  adminOnly: true,
  handler: async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    return chooseMode(ctx, (ctx.args && ctx.args[0]) || '');
  }
}];

for (const mode of svc.MODES) {
  modeCommands.push({
    name: 'welcome' + mode,
    aliases: ['bemvindo' + mode, 'boasvindas' + mode],
    category: 'admin',
    description: SYSTEM_NAMES[mode] + ' (on/off/teste)',
    usage: '!welcome' + mode + ' [on|off|status|teste]',
    groupOnly: true,
    adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireAdmin(ctx))) return;
      const a = norm(ctx.args && ctx.args[0]);
      if (a === 'on' || a === 'ativar') return chooseMode(ctx, mode);
      if (a === 'off' || a === 'desativar') {
        if (svc.getActive(ctx.jid) !== mode) return ctx.reply('ℹ️ O sistema ' + mode + ' não está ativo neste grupo.');
        return chooseMode(ctx, 'off');
      }
      if (a === 'teste' || a === 'test') {
        try { if (ctx.msg && ctx.msg.key) await ctx.sock.sendMessage(ctx.jid, { react: { text: '🎬', key: ctx.msg.key } }); } catch (_) {}
        try {
          const phone = (ctx.senderPn ? String(ctx.senderPn) : (String(ctx.sender).endsWith('@s.whatsapp.net') ? ctx.sender : ''));
          await svc.preview(ctx.sock, ctx.jid, ctx.sender, mode, phone);
        } catch (e) { await ctx.reply('❌ Não consegui gerar a pré-visualização: ' + String((e && e.message) || e).slice(0, 140)); }
        return;
      }
      const on = svc.getActive(ctx.jid) === mode;
      return ctx.reply('*' + SYSTEM_NAMES[mode] + '*\nEstado: ' + (on ? '✅ ativo' : '⛔ inativo') + '\n\n' +
        '• *' + (ctx.prefix || '!') + 'welcome' + mode + ' on* — ativar\n' +
        '• *' + (ctx.prefix || '!') + 'welcome' + mode + ' off* — desativar\n' +
        '• *' + (ctx.prefix || '!') + 'welcome' + mode + ' teste* — ver como fica consigo');
    }
  });
}

/* ------------------------------ mensagens e opções ------------------------------ */
const msgCommand = {
  name: 'welcomemsg',
  aliases: ['wmsg', 'bemvindomsg'],
  category: 'admin',
  description: 'Configura mensagens/opções das boas-vindas 3-6 (por grupo)',
  usage: '!welcomemsg [set <texto>|banner <texto>|exibir nome|numero|reset]',
  groupOnly: true,
  adminOnly: true,
  handler: async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const g = ctx.jid, p = ctx.prefix || '!';
    const raw = rawArgs(ctx);
    const sub = norm(raw.split(/\s+/)[0]);
    const rest = raw.replace(/^\S+\s*/, '').trim();

    if (!sub) {
      const cfg = svc.getConfig(g);
      return ctx.reply('✏️ *MENSAGENS DAS BOAS-VINDAS*\n\n' +
        '*Mensagem:* ' + (cfg.msg || '_padrão do sistema_') + '\n' +
        '*Frase no banner:* ' + (cfg.bannerLine || '_padrão_') + '\n' +
        '*Exibir membro como:* ' + (cfg.display === 'numero' ? 'número' : 'nome') + '\n\n' +
        '• *' + p + 'welcomemsg set <texto>* — usa {user} {nome} {grupo} {n}\n' +
        '• *' + p + 'welcomemsg banner <frase curta>* — texto no topo do banner\n' +
        '• *' + p + 'welcomemsg exibir nome|numero* — nome ou telefone\n' +
        '• *' + p + 'welcomemsg reset* — volta ao padrão');
    }
    if (sub === 'set') {
      if (!rest) return ctx.reply('❌ Escreva a mensagem. Ex: *' + p + 'welcomemsg set Olá {user}, bem-vindo(a) ao {grupo}!*');
      svc.gset(g, 'msg', rest.slice(0, 400));
      return ctx.reply('✅ Mensagem de boas-vindas guardada para este grupo.');
    }
    if (sub === 'banner') {
      if (!rest) return ctx.reply('❌ Escreva a frase. Ex: *' + p + 'welcomemsg banner BEM-VINDO(A)*');
      const clean = render.safeText(rest).slice(0, 36);
      if (!clean) return ctx.reply('❌ Use apenas letras latinas, números e pontuação simples.');
      svc.gset(g, 'bannerline', clean);
      return ctx.reply('✅ Frase do banner: *' + clean + '*');
    }
    if (sub === 'exibir') {
      const v = norm(rest);
      if (v !== 'nome' && v !== 'numero') return ctx.reply('❌ Use *' + p + 'welcomemsg exibir nome* ou *numero*.');
      svc.gset(g, 'display', v);
      return ctx.reply('✅ O membro será mostrado pelo *' + (v === 'numero' ? 'número de telefone (quando disponível)' : 'nome') + '*.');
    }
    if (sub === 'reset') {
      for (const k of ['msg', 'bannerline', 'display']) svc.gdel(g, k);
      return ctx.reply('♻️ Mensagens e opções repostas ao padrão.');
    }
    return ctx.reply('❌ Opção desconhecida. Envie *' + p + 'welcomemsg* para ver as opções.');
  }
};

/* ------------------------------ apresentação do membro ------------------------------ */
const FIELD_ALIASES = {
  nome: 'nome', apelido: 'nome',
  idade: 'idade',
  genero: 'genero', sexo: 'genero',
  cidade: 'cidade',
  provincia: 'provincia',
  hobbies: 'hobbies', hobby: 'hobbies', gostos: 'hobbies', gosto: 'hobbies',
  curiosidade: 'curiosidade',
  espera: 'espera', expectativa: 'espera', 'espero encontrar': 'espera'
};
const FIELD_LABEL = { nome: 'Nome/apelido', idade: 'Idade', genero: 'Género', cidade: 'Cidade', provincia: 'Província', hobbies: 'Hobbies', curiosidade: 'Curiosidade', espera: 'Espera encontrar' };

function parseFields(raw) {
  const out = {}, bad = [];
  const lines = String(raw).split(/\r?\n/);
  const take = (key, val) => {
    const f = FIELD_ALIASES[norm(key)];
    if (!f) return false;
    if (f === 'idade') {
      const n = parseInt(String(val).replace(/\D/g, ''), 10);
      if (!(n >= 5 && n <= 120)) { bad.push('idade deve ser um número entre 5 e 120'); return true; }
      out.idade = String(n); return true;
    }
    out[f] = val; return true;
  };
  for (const line of lines) {
    const m = line.match(/^\s*([^:：\n]{2,20}?)\s*[:：]\s*(.+)$/);
    if (m) take(m[1], m[2].trim());
  }
  if (!Object.keys(out).length && !bad.length) {
    // forma curta: "apresentar cidade Maputo"
    const m = raw.match(/^(\S+(?:\s+encontrar)?)\s+([\s\S]+)$/);
    if (m && !take(m[1], m[2].trim())) return { out, bad, unknown: true };
  }
  return { out, bad, unknown: false };
}

const introCommand = {
  name: 'apresentar',
  aliases: ['apresentacao', 'minhaapresentacao', 'meuperfilgrupo'],
  category: 'utilidades',
  description: 'Cria a sua apresentação curta (tudo opcional) usada nas boas-vindas',
  usage: '!apresentar | !apresentar cidade Maputo | !apresentar ver | !apresentar limpar',
  handler: async (ctx) => {
    const p = ctx.prefix || '!';
    const raw = rawArgs(ctx);
    const sub = norm(raw.split(/\s+/)[0]);
    const scope = ctx.isGroup ? ctx.jid : 'global';
    const ids = senderIds(ctx);

    if (sub === 'ver' || sub === 'mostrar') {
      let target = ids;
      let who = null;
      if (ctx.isGroup) { try { who = ctx.getMentionedOrQuoted(); } catch (_) {} }
      if (who) target = [who];
      const intro = svc.getIntro(ctx.jid, target);
      const card = svc.introCard(intro);
      if (!card) return ctx.reply(who ? 'ℹ️ Essa pessoa ainda não preencheu a apresentação.' : 'ℹ️ Ainda não preencheu a sua apresentação. Use *' + p + 'apresentar*.');
      const mention = who || ctx.sender;
      return ctx.reply('👋 @' + svc.numOf(mention) + '\n\n' + card, { mentions: [mention] });
    }

    if (sub === 'limpar' || sub === 'apagar') {
      const rest = norm(raw.replace(/^\S+\s*/, ''));
      if (!rest || rest === 'tudo') { svc.clearIntro(scope, ids); svc.clearIntro('global', ids); return ctx.reply('🗑️ A sua apresentação foi apagada.'); }
      const f = FIELD_ALIASES[rest];
      if (!f) return ctx.reply('❌ Campo inválido. Campos: ' + Object.values(FIELD_LABEL).join(', ') + '.');
      svc.clearIntro(scope, ids, f);
      return ctx.reply('🗑️ Campo *' + FIELD_LABEL[f] + '* removido.');
    }

    if (!raw) {
      const mine = svc.getIntro(ctx.jid, ids);
      const card = svc.introCard(mine, 'A sua apresentação');
      return ctx.reply('📝 *APRESENTAÇÃO DO MEMBRO*\nTudo é opcional — partilhe só o que quiser.\n\n' +
        '*Preencher de uma vez* (copie, edite e envie):\n' +
        p + 'apresentar\nNome: \nIdade: \nGénero: \nCidade: \nProvíncia: \nHobbies: \nCuriosidade: \nEspera: \n\n' +
        '*Ou campo a campo:* ' + p + 'apresentar cidade Maputo\n' +
        '*Ver:* ' + p + 'apresentar ver  •  *Apagar:* ' + p + 'apresentar limpar [campo]\n' +
        (ctx.isPrivate ? '\n💡 Preenchida no privado, vale para qualquer grupo com o sistema 3.' : '') +
        (card ? '\n\n' + card : ''));
    }

    const r = parseFields(raw);
    if (r.unknown) return ctx.reply('❌ Não percebi o campo. Campos: ' + Object.values(FIELD_LABEL).join(', ') + '.');
    if (r.bad.length) await ctx.reply('⚠️ ' + r.bad.join('; ') + '.');
    if (!Object.keys(r.out).length) return;
    try {
      const saved = svc.setIntroFields(scope, ids, r.out);
      const card = svc.introCard(saved, 'A sua apresentação');
      return ctx.reply('✅ Apresentação atualizada.\n\n' + card);
    } catch (e) {
      console.error('[apresentar]', e);
      return ctx.reply('❌ Não consegui guardar a apresentação.');
    }
  }
};

/* ------------------------------ banners do administrador ------------------------------ */
function setBannerCommand(slot) {
  return {
    name: 'setbannern' + slot,
    aliases: [],
    category: 'admin',
    description: 'Define o banner ' + slot + ' (responda a uma imagem)',
    usage: '!setbannern' + slot + ' (respondendo a uma imagem)',
    groupOnly: true,
    adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireAdmin(ctx))) return;
      const found = findImageNode(ctx);
      if (!found) return ctx.reply('❌ *Responda a uma imagem* com *' + (ctx.prefix || '!') + 'setbannern' + slot + '* (ou envie a imagem com esta legenda).');
      if (!dlContent) return ctx.reply('❌ Download de mídia indisponível.');
      let buf;
      try { buf = await streamToBuffer(await dlContent(found.node, found.type)); }
      catch (e) { console.error('[setbanner] download', e && e.message); return ctx.reply('❌ Não consegui baixar a imagem. Reenvie-a e tente de novo.'); }
      if (!buf || !buf.length) return ctx.reply('❌ A imagem veio vazia. Reenvie-a e tente de novo.');
      if (buf.length > MAX_BANNER_BYTES) return ctx.reply('❌ Imagem demasiado grande (máx. 8 MB).');
      let dims = '';
      try {
        const Jimp = require('jimp');
        const img = await Jimp.read(buf);                 // valida que é imagem legível
        dims = img.bitmap.width + '×' + img.bitmap.height;
      } catch (_) { return ctx.reply('❌ Não consegui ler essa imagem. Use JPG ou PNG.'); }
      try {
        const r = svc.saveBanner(ctx.jid, slot, buf, { w: dims, by: svc.numOf(ctx.sender) });
        const total = svc.listBanners(ctx.jid).length;
        return ctx.reply((r.replaced ? '♻️ Banner ' + slot + ' substituído' : '✅ Banner ' + slot + ' definido') + ' (' + dims + ').\n' +
          'Banners configurados: *' + total + '/' + svc.MAX_SLOTS + '*.' +
          (svc.getActive(ctx.jid) === '6' ? '' : '\nPara usar: *' + (ctx.prefix || '!') + 'welcomemodo 6*'));
      } catch (e) {
        console.error('[setbanner]', e);
        return ctx.reply('❌ ' + String((e && e.message) || 'Erro ao guardar o banner').slice(0, 140));
      }
    }
  };
}

function delBannerCommand(slot) {
  return {
    name: 'delbannern' + slot,
    aliases: [],
    category: 'admin',
    description: 'Elimina o banner ' + slot,
    usage: '!delbannern' + slot,
    groupOnly: true,
    adminOnly: true,
    handler: async (ctx) => {
      if (!(await requireAdmin(ctx))) return;
      try {
        const removed = svc.deleteBanner(ctx.jid, slot);
        return ctx.reply(removed ? '🗑️ Banner ' + slot + ' eliminado.' : 'ℹ️ O banner ' + slot + ' não estava configurado.');
      } catch (e) {
        console.error('[delbanner]', e);
        return ctx.reply('❌ Não consegui eliminar o banner ' + slot + '.');
      }
    }
  };
}

const listBannerCommand = {
  name: 'listbannern',
  aliases: ['listbanners'],
  category: 'admin',
  description: 'Mostra os banners configurados neste grupo',
  usage: '!listbannern',
  groupOnly: true,
  adminOnly: true,
  handler: async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const list = svc.listBanners(ctx.jid);
    const p = ctx.prefix || '!';
    if (!list.length) return ctx.reply('🖼️ *BANNERS DO GRUPO*\n\nNenhum banner configurado.\nResponda a uma imagem com *' + p + 'setbannern1* (até *' + p + 'setbannern' + svc.MAX_SLOTS + '*).');
    const lines = ['🖼️ *BANNERS DO GRUPO* (' + list.length + '/' + svc.MAX_SLOTS + ')', ''];
    for (let s = 1; s <= svc.MAX_SLOTS; s++) {
      const b = list.find((x) => x.slot === s);
      lines.push((b ? '✅' : '▫️') + ' *' + s + '* — ' + (b ? (b.meta.w || 'configurado') : 'livre'));
    }
    lines.push('', 'Sistema 6: ' + (svc.getActive(ctx.jid) === '6' ? '✅ ativo' : '⛔ inativo (use ' + p + 'welcomemodo 6)'));
    lines.push('Eliminar: *' + p + 'delbannern<número>*');
    let sent = false;
    try {
      const fs = require('fs');
      const slots = list.map((b) => ({ slot: b.slot, buf: fs.readFileSync(b.file) }));
      const img = await render.renderCollage(slots);
      await ctx.sock.sendMessage(ctx.jid, { image: img, caption: lines.join('\n') }, { quoted: ctx.msg });
      sent = true;
    } catch (e) { console.error('[listbanner] colagem:', e && e.message); }
    if (!sent) await ctx.reply(lines.join('\n'));
  }
};

const bannerCommands = [];
for (let s = 1; s <= svc.MAX_SLOTS; s++) bannerCommands.push(setBannerCommand(s));
bannerCommands.push(listBannerCommand);
for (let s = 1; s <= svc.MAX_SLOTS; s++) bannerCommands.push(delBannerCommand(s));

module.exports = [].concat(modeCommands, [msgCommand, introCommand], bannerCommands);
