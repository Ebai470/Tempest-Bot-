'use strict';
// ARCADE 16:9 - jogos de arcade por turnos, com tela PNG 16:9 e botoes interativos
const router = require('./router');
const nf = require('./nativeFlow');
const { Gfx, rgb } = require('../games/sega/gfx');

const GAMES = ['superbros', 'bluedash', 'streetfury', 'sunsetdrive', 'gemstack', 'spacerider'].map((id) => require('../games/sega/' + id));
const byId = {};
GAMES.forEach((g) => { byId[g.id] = g; });

const sessions = new Map();
const TTL = 30 * 60 * 1000;
const locks = new Map();

const numOf = (j) => String(j || '').split('@')[0].split(':')[0];
const keyOf = (ctx) => ctx.jid + '|' + numOf(ctx.sender);

setInterval(() => {
  const now = Date.now();
  sessions.forEach((v, k) => { if (now - v.ts > TTL) sessions.delete(k); });
}, 5 * 60 * 1000).unref();

function withLock(key, fn) {
  const prev = locks.get(key) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  locks.set(key, next);
  next.catch(() => {}).then(() => { if (locks.get(key) === next) locks.delete(key); });
  return next;
}

function titlePng() {
  const g = new Gfx();
  g.gradient(0, 180, rgb('#1a0b3d'), rgb('#6b2f8a'));
  for (let i = 0; i < 70; i++) g.px((i * 61) % 320, (i * 43) % 180, i % 3 ? rgb('#8a7ab8') : rgb('#ffffff'));
  g.textC('ARCADE', 160, 12, rgb('#ffe066'), 6, rgb('#7c1d6f'));
  g.textC('TEMPEST BOT  16:9', 160, 50, rgb('#ffffff'), 2, rgb('#333333'));
  const cols = ['#ef4444', '#2563eb', '#dc2626', '#f59e0b', '#a855f7', '#0ea5e9'];
  const names = ['SUPER BROS', 'BLUE DASH', 'STREET FURY', 'SUNSET DRIVE', 'GEM STACK', 'SPACE RIDER'];
  names.forEach((n, i) => {
    const x = 14 + (i % 2) * 150, y = 74 + ((i / 2) | 0) * 34;
    g.rect(x, y, 142, 28, rgb('#000000')); g.rect(x + 1, y + 1, 140, 26, rgb(cols[i]));
    g.rect(x + 1, y + 1, 140, 3, rgb('#ffffff55'.slice(0, 7)));
    g.textC(n, x + 71, y + 9, rgb('#ffffff'), 2, rgb('#00000099'.slice(0, 7)));
  });
  return g.png();
}
let TITLE = null;

function quoteLines(lines) { return lines.filter(Boolean).map((l) => '> ' + l).join('\n'); }

async function openMenu(ctx) {
  if (!TITLE) TITLE = titlePng();
  const body = '🕹️ `• ARCADE 16:9`\n\n' + quoteLines(['6 jogos de arcade, tela em 16:9.', 'Cada toque num botão avança uma jogada.', 'Escolha um jogo na lista:']);
  const rows = GAMES.map((g) => ({ header: g.emoji + ' ' + g.tag, title: g.name, description: g.desc, id: 'sgm:play:' + g.id }));
  return nf.sendNative(ctx.sock, ctx.jid, {
    image: TITLE, imageMime: 'image/png', body: body, footer: '', noFormat: true,
    buttons: [nf.btn.list('🎮 Escolher jogo', [{ title: 'Jogos', rows: rows }])],
    fallback: body
  });
}

function framePayload(ctx, sess) {
  const game = sess.game, st = sess.state;
  const g = new Gfx();
  game.render(g, st);
  const png = g.png();
  const body = game.emoji + ' `• ' + game.name + '`\n\n' + quoteLines(['👤 @' + numOf(sess.owner)].concat(game.caption(st).split('\n'))) + (st.over ? '' : '\n\n_Para sair: !sairjogo_');
  let buttons;
  if (st.over) {
    buttons = [nf.btn.reply('🔁 Jogar de novo', 'sgm:play:' + game.id), nf.btn.reply('🕹️ Outros jogos', 'sgm:menu')];
  } else {
    const c = game.controls(st);
    buttons = c.main.map((m) => nf.btn.reply(m.label, 'sgm:do:' + game.id + ':' + m.id));
    if (c.more && c.more.length) buttons.push(nf.btn.list('🎮 Mais', [{ title: 'Mais ações', rows: c.more.map((m) => ({ title: m.label, description: m.desc || '', id: 'sgm:do:' + game.id + ':' + m.id })) }]));
  }
  return { image: png, imageMime: 'image/png', body: body, footer: '', noFormat: true, noButtonStyle: true, mentions: [sess.owner], buttons: buttons, fallback: body };
}

async function sendFrame(ctx, sess) {
  sess.ts = Date.now();
  return nf.sendNative(ctx.sock, ctx.jid, framePayload(ctx, sess));
}

async function start(ctx, id) {
  const game = byId[id];
  if (!game) return ctx.reply('Jogo não encontrado. Use *!sega* para ver a lista.');
  const key = keyOf(ctx);
  return withLock(key, async () => {
    const sess = { game: game, state: game.init((Date.now() ^ (Math.random() * 1e9)) >>> 0), owner: ctx.sender, ts: Date.now() };
    sessions.set(key, sess);
    return sendFrame(ctx, sess);
  });
}

async function stop(ctx) {
  const had = sessions.delete(keyOf(ctx));
  return ctx.reply(had ? '🕹️ Jogo terminado. Use *!sega* para jogar outro.' : 'Não tens nenhum jogo ativo. Use *!sega*.');
}

async function handle(ctx, rest) {
  const p = String(rest).split(':');
  if (p[0] === 'menu') return openMenu(ctx);
  if (p[0] === 'play') return start(ctx, p[1]);
  if (p[0] === 'do') {
    const id = p[1], action = p[2];
    const key = keyOf(ctx);
    return withLock(key, async () => {
      const sess = sessions.get(key);
      if (!sess || sess.game.id !== id) {
        // outro jogador a tocar nos botoes de um jogo alheio, ou sessao expirada
        const other = [...sessions.entries()].find((e) => e[0].indexOf(ctx.jid + '|') === 0 && e[1].game.id === id);
        if (other) return ctx.reply('Esse jogo é de @' + numOf(other[1].owner) + '. Toque em *Jogar* para começar o seu: !' + (id === 'superbros' ? 'superbros' : id), { mentions: [other[1].owner] });
        return nf.sendNative(ctx.sock, ctx.jid, { body: '🕹️ `• JOGO EXPIRADO`\n\n> A sessão terminou. Toque para jogar de novo.', footer: '', noFormat: true, noButtonStyle: true, buttons: [nf.btn.reply('🔁 Jogar de novo', 'sgm:play:' + id), nf.btn.reply('🕹️ Outros jogos', 'sgm:menu')] });
      }
      sess.game.act(sess.state, action);
      return sendFrame(ctx, sess);
    });
  }
}

router.register('sgm', handle);

module.exports = { openMenu: openMenu, start: start, stop: stop, GAMES: GAMES, sessions: sessions };
