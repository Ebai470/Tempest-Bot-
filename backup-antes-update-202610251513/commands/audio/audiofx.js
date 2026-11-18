/**
 * MENU ÁUDIO — efeitos de voz, edição, bass e equalização (ffmpeg)
 * Responda a um áudio / nota de voz / vídeo com o comando.
 * Módulo novo: não altera nenhum comando existente (tomp3 continua sendo do vta).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const qm = require('../../utils/quotedMedia');
const fx = require('../../utils/audioFilters');

const MAX_INPUT_SECONDS = 600;   // recusa mídia maior que 10 min
const MAX_OUTPUT_SECONDS = 300;  // saída limitada a 5 min
const FFMPEG_TIMEOUT_MS = 150000;
const COOLDOWN_MS = 6000;
const MAX_PARALLEL = 2;          // protege o Termux

let running = 0;
const waiting = [];
const lastUse = new Map();

function acquire() {
  return new Promise(function (resolve) {
    if (running < MAX_PARALLEL) { running++; return resolve(); }
    waiting.push(resolve);
  });
}
function release() {
  const next = waiting.shift();
  if (next) next(); else running = Math.max(0, running - 1);
}

function runFfmpeg(args) {
  return new Promise(function (resolve, reject) {
    execFile('ffmpeg', args, { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 }, function (err, _o, stderr) {
      if (err) {
        err.stderr = stderr;
        return reject(err);
      }
      resolve();
    });
  });
}

function usageText(spec) {
  const u = spec.usage ? '*' + spec.usage + '*' : '*' + spec.name + '*';
  return '🎧 Responda a um *áudio* (ou vídeo) com ' + u;
}

function senderKey(ctx) {
  return String(ctx.sender || ctx.senderPn || '');
}

async function runEffect(ctx, spec) {
  // Sem prefixo e sem áudio: é só conversa normal, não responde.
  const info = qm.resolve(ctx, ['audio', 'video']);
  if (!info) {
    if (!ctx.hasPrefix) return;
    return ctx.reply(usageText(spec));
  }

  const built = spec.build(ctx.args || []);
  if (built.error) return ctx.reply('❌ ' + built.error);

  const secs = Number(info.node && info.node.seconds) || 0;
  if (secs > MAX_INPUT_SECONDS) {
    return ctx.reply('❌ Áudio muito longo (' + secs + 's). Máximo: ' + MAX_INPUT_SECONDS + 's.');
  }

  // cooldown por usuário (dono livre)
  try {
    if (!(typeof ctx.isOwner === 'function' && ctx.isOwner())) {
      const k = senderKey(ctx);
      const now = Date.now();
      const prev = lastUse.get(k) || 0;
      if (now - prev < COOLDOWN_MS) {
        return ctx.reply('⏳ Aguarde alguns segundos antes de usar outro efeito.');
      }
      lastUse.set(k, now);
      if (lastUse.size > 500) lastUse.delete(lastUse.keys().next().value);
    }
  } catch (_) {}

  try { await ctx.react('⏳'); } catch (_) {}

  const buf = await qm.download(ctx, info);
  if (!buf) {
    return ctx.reply('❌ Não consegui baixar o áudio. Envie de novo e responda com *' + spec.name + '*.');
  }

  await acquire();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'afx-'));
  const inFile = path.join(dir, 'in.bin');
  const outFile = path.join(dir, 'out.mp3');
  try {
    fs.writeFileSync(inFile, buf);

    const args = ['-y', '-loglevel', 'error'];
    if (built.cut) args.push('-ss', String(built.cut.ss), '-t', String(built.cut.t));
    args.push('-i', inFile, '-vn');
    if (built.af) args.push('-af', built.af);
    args.push('-t', String(MAX_OUTPUT_SECONDS), '-acodec', 'libmp3lame', '-q:a', '4', outFile);

    await runFfmpeg(args);

    if (!fs.existsSync(outFile) || fs.statSync(outFile).size < 200) {
      return ctx.reply('❌ Não foi possível gerar o áudio' + (built.cut ? ' (confira os tempos do corte).' : '.'));
    }
    const audio = fs.readFileSync(outFile);
    await ctx.sock.sendMessage(
      ctx.jid,
      { audio: audio, mimetype: 'audio/mpeg', fileName: spec.name + '.mp3', ptt: false },
      { quoted: ctx.msg }
    );
  } catch (e) {
    console.error('[audiofx] ' + spec.name + ':', String((e && e.stderr) || (e && e.message) || e).slice(0, 300));
    if (e && e.code === 'ENOENT') {
      return ctx.reply('❌ ffmpeg não está instalado.\n`pkg install ffmpeg`');
    }
    return ctx.reply('❌ Erro ao aplicar o efeito *' + spec.name + '*.');
  } finally {
    release();
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
  }
}

module.exports = fx.EFFECTS.map(function (spec) {
  return {
    name: spec.name,
    aliases: spec.aliases || [],
    category: 'audio',
    description: spec.desc,
    usage: '!' + (spec.usage || spec.name),
    handler: function (ctx) { return runEffect(ctx, spec); }
  };
});
