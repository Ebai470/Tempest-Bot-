set -e
cd "${1:-$HOME/tempest-bot}"
F=src/commands/utilidades/ytplay3.js
[ -f "$F" ] || { echo "❌ não achei $F (rode no ~/tempest-bot)"; exit 1; }
cp "$F" "$F.bak-v1"
cat > .tp3a.tmp <<'TPA'
/* ---------- busca + download (v2: rápido, em paralelo) ---------- */
const secs = function (a) { return ((Date.now() - a) / 1000).toFixed(1) + 's'; };
function withTimeout(p, ms, fallback) {
  return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(fallback); }, ms); })]);
}
let _jsrt = true;
function cookieArgs() {
  const c = path.join(process.cwd(), 'cookies.txt');
  try { if (fs.existsSync(c)) return ['--cookies', c]; } catch (_) {}
  return [];
}
async function ytRun(args, timeoutMs) {
  const base = cookieArgs();
  try { return await run((_jsrt ? ['--js-runtimes', 'node'] : []).concat(base, args), timeoutMs); }
  catch (e) {
    if (_jsrt && /no such option|unrecognized arguments|js-runtimes/i.test(String(e.message))) { _jsrt = false; return run(base.concat(args), timeoutMs); }
    throw e;
  }
}
async function quickSearch(query) {
  const raw = await ytRun(['ytsearch1:' + query, '--flat-playlist', '--dump-json', '--no-warnings', '--no-check-certificates'], 45000);
  const line = raw.split('\n').find(function (l) { return l.trim().startsWith('{'); });
  let i = null; try { i = line ? JSON.parse(line) : null; } catch (_) {}
  if (!i || !i.id) throw new Error('Não encontrei essa música.');
  return { id: i.id, title: i.title || query, uploader: i.channel || i.uploader || '', duration: i.duration || 0 };
}
async function downloadAudio(id, dur, outDir, bag) {
  const kbps = Math.max(40, Math.min(96, Math.floor(BUDGET * 8 / Math.max(dur, 60) / 1000)));
  const url = 'https://www.youtube.com/watch?v=' + id;
  const stamp = Date.now();
  const tpl = path.join(outDir, 'y3_' + stamp + '.%(ext)s');
  const base = ['-f', 'bestaudio[ext=m4a]/bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', kbps + 'K',
    '--postprocessor-args', 'ffmpeg:-ac 1', '--no-playlist', '--no-warnings', '--no-check-certificates', '-N', '8', '--retries', '3', '-o', tpl, url];
  const tries = [[], ['--extractor-args', 'youtube:player_client=android_vr']];
  let lastErr = null;
  for (let i = 0; i < tries.length; i++) {
    try { await ytRun(tries[i].concat(base), 100000); lastErr = null; break; } catch (e) { lastErr = e; }
    console.log('[ytplay3] download tentativa ' + (i + 1) + ' falhou: ' + String(lastErr && lastErr.message).slice(0, 160));
  }
  const files = fs.readdirSync(outDir).filter(function (f) { return f.startsWith('y3_' + stamp); }).map(function (f) { return path.join(outDir, f); });
  files.forEach(function (f) { bag.push(f); });
  const audio = files.find(function (f) { return /\.mp3$/i.test(f); }) || files[0];
  if (!audio || fs.statSync(audio).size < 1000) throw new Error('Não consegui baixar o áudio.' + (lastErr ? ' ' + String(lastErr.message).slice(0, 120) : ''));
  return audio;
}
async function fetchThumb(id) {
  const urls = ['https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg', 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg'];
  for (let i = 0; i < urls.length; i++) { try { const b = await getBuf(urls[i]); if (b && b.length > 500) return b; } catch (_) {} }
  return null;
}
async function fetchTrack(query, outDir, onFound, bag) {
  fs.mkdirSync(outDir, { recursive: true });
  const T = Date.now();
  const s = await quickSearch(query);
  console.log('[ytplay3] busca ' + secs(T) + ' -> ' + s.title);
  if (s.duration > MAX_SEC) throw new Error('Essa música é longa demais para o painel (máx. ' + Math.round(MAX_SEC / 60) + ' min).');
  if (onFound) { try { await onFound(s); } catch (_) {} }
  const g = guessTrack({ title: s.title, uploader: s.uploader }, query);
  const r = await Promise.all([
    downloadAudio(s.id, s.duration, outDir, bag).then(function (a) { console.log('[ytplay3] áudio ok ' + secs(T)); return a; }),
    fetchThumb(s.id),
    withTimeout(findLyrics(g.title, g.artist, s.duration), 20000, null).then(function (l) { console.log('[ytplay3] letra ' + (l ? (l.synced ? 'sincronizada' : 'simples') : 'não achou') + ' ' + secs(T)); return l; })
  ]);
  return { audio: r[0], dur: s.duration, thumb: r[1], lyr: r[2], title: g.title, artist: g.artist, link: 'https://www.youtube.com/watch?v=' + s.id };
}
TPA
cat > .tp3b.tmp <<'TPB'
/* ---------- comando ---------- */
module.exports = {
  name: 'ytplay3',
  aliases: ['ytletra', 'musicaletra', 'playletra'],
  category: 'utilidades',
  description: 'Toca música do YouTube num player com letra sincronizada',
  usage: 'ytplay3 nome da música',
  handler: withDownloadLock('ytplay3', async function (ctx) {
    const query = (ctx.args || []).join(' ').trim();
    if (!query) return ctx.reply('🎵 *ytplay3*\n\nUso: *' + (ctx.prefix || '!') + 'ytplay3 nome da música*\nEx.: ' + (ctx.prefix || '!') + 'ytplay3 sad girl lana del rey');
    if (!ctx.sock || !ctx.jid) return ctx.reply('❌ Chat/socket inválido.');
    const outDir = path.join(process.cwd(), 'tmp', 'ytplay3');
    const bag = [];
    const T0 = Date.now();
    try {
      try { if (ctx.msg && ctx.msg.key) await ctx.sock.sendMessage(ctx.jid, { react: { text: '🎵', key: ctx.msg.key } }); } catch (_) {}
      const t = await fetchTrack(query, outDir, function (s) {
        return ctx.reply('🎶 Achei: *' + clip(s.title, 60) + '*\n⏳ Baixando o áudio e buscando a letra…');
      }, bag);
      const html = buildHtml(t, t.lyr);
      const titulo = '🎵 ' + clip(t.title + (t.artist ? ' — ' + t.artist : ''), 70);
      console.log('[ytplay3] ' + secs(T0) + ' painel de ' + Math.round(html.length / 1024) + ' KB, enviando…');
      try {
        const msg = montarMensagem(html, 'ytplay3-' + crypto.randomUUID(), titulo);
        await Promise.race([
          ctx.sock.relayMessage(ctx.jid, msg, {}),
          new Promise(function (_, rej) { setTimeout(function () { rej(new Error('o envio do painel demorou demais')); }, 90000); })
        ]);
        console.log('[ytplay3] ' + secs(T0) + ' painel enviado');
      } catch (e) {
        console.error('[ytplay3] painel falhou, enviando áudio normal:', e && e.message);
        await ctx.sock.sendMessage(ctx.jid, { audio: fs.readFileSync(t.audio), mimetype: 'audio/mpeg', fileName: clip(t.title, 60) + '.mp3', ptt: false }, { quoted: ctx.msg });
        if (t.lyr && t.lyr.lines.length) {
          const txt = t.lyr.lines.map(function (l) { return l.x; }).filter(function (x, i, a) { return x || (a[i - 1]); }).join('\n').slice(0, 3500);
          await ctx.sock.sendMessage(ctx.jid, { text: '🎤 *' + t.title + '*\n\n' + txt });
        }
      }
      try { if (ctx.msg && ctx.msg.key) await ctx.sock.sendMessage(ctx.jid, { react: { text: '✅', key: ctx.msg.key } }); } catch (_) {}
    } catch (e) {
      console.error('[ytplay3] erro:', e && e.message);
      try { await ctx.reply('❌ ' + String((e && e.message) || 'Erro ao processar.').slice(0, 300)); } catch (_) {}
    } finally {
      for (const f of bag) { try { fs.unlinkSync(f); } catch (_) {} }
    }
  }),
  _t: { parseLrc: parseLrc, cleanTitle: cleanTitle, guessTrack: guessTrack, buildHtml: buildHtml, montarMensagem: montarMensagem }
};
TPB
node - <<'__TP_PATCH__'
const fs = require('fs');
const f = 'src/commands/utilidades/ytplay3.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('quickSearch')) { console.log('= já está na v2'); process.exit(0); }
const m1 = '/* ---------- busca + download ---------- */', m2 = '/* ---------- painel (HTML) ---------- */', m3 = '/* ---------- comando ---------- */';
const i1 = s.indexOf(m1), i2 = s.indexOf(m2), i3 = s.indexOf(m3);
if (i1 < 0 || i2 < 0 || i3 < 0) { console.log('❌ marcadores não encontrados'); process.exit(2); }
const A = fs.readFileSync('.tp3a.tmp', 'utf8'), B = fs.readFileSync('.tp3b.tmp', 'utf8');
s = s.slice(0, i1) + A + s.slice(i2, i3) + B;
s = s.replace('const BUDGET = 3.2 * 1024 * 1024;', 'const BUDGET = 2.4 * 1024 * 1024;');
fs.writeFileSync(f, s);
console.log('✔ ytplay3 atualizado para v2');
__TP_PATCH__
node --check "$F" || { echo "❌ erro de sintaxe - restaurando"; cp "$F.bak-v1" "$F"; exit 3; }
rm -f .tp3a.tmp .tp3b.tmp
echo "✅ Pronto! Reinicie o bot."
