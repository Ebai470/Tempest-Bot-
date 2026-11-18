/**
 * Extras de IA e Pesquisa (módulo novo — não altera ia.js nem menuPesquisa.js)
 *
 * IA: gpt, chatgpt, gemini, geminipro, perplexity, qwen
 *     -> todos usam a mesma IA do bot (comando "bia" / Groq já configurado).
 * (todos exigem prefixo, para não disparar em conversa normal)
 * Pesquisa: pesquisar, google, chrome, significado, horoscopo, brasileirao, timefut,
 *           maps, playstore
 *     -> usam o motor de pesquisa que já existe ("pesquisa") ou geram links.
 */
const registry = require('../registry');

/** cria um ctx derivado com outros args/text (sem mexer no ctx original) */
function withArgs(ctx, argsArr) {
  const text = argsArr.join(' ');
  return Object.create(ctx, {
    args: { value: argsArr, writable: true, enumerable: true },
    text: { value: text, writable: true, enumerable: true }
  });
}

/* ---------------------------------------------------------------- IA */

function makeIa(name, desc) {
  return {
    name: name,
    aliases: [],
    category: 'utilidades',
    description: desc,
    usage: '!' + name + ' <pergunta>',
    handler: async function (ctx) {
      if (!ctx.hasPrefix) return; // palavra comum em conversa normal: só com prefixo
      const bia = registry.get('bia');
      if (!bia) return ctx.reply('❌ IA indisponível no momento.');
      return bia.handler(ctx);
    }
  };
}

const iaCmds = [
  makeIa('gpt', 'IA Tempest (atalho)'),
  makeIa('chatgpt', 'IA Tempest (atalho)'),
  makeIa('gemini', 'IA Tempest (atalho)'),
  makeIa('geminipro', 'IA Tempest (atalho)'),
  makeIa('perplexity', 'IA Tempest com pesquisa (atalho)'),
  makeIa('qwen', 'IA Tempest (atalho)')
];

/* ----------------------------------------------------------- PESQUISA */

/**
 * @param buildQuery (args:string[]) => string|null  (null = faltou argumento)
 */
function makeSearch(name, aliases, desc, usage, buildQuery) {
  return {
    name: name,
    aliases: aliases,
    category: 'utilidades',
    description: desc,
    usage: '!' + usage,
    handler: async function (ctx) {
      if (!ctx.hasPrefix) return; // palavra comum em conversa normal: só com prefixo
      const args = ctx.args || [];
      const q = buildQuery(args);
      if (!q) {
        return ctx.reply('Use: *' + usage + '*');
      }
      const base = registry.get('pesquisa');
      if (!base) return ctx.reply('❌ Pesquisa indisponível no momento.');
      return base.handler(withArgs(ctx, q.split(/\s+/)));
    }
  };
}

function makeLink(name, aliases, desc, usage, buildUrl, label) {
  return {
    name: name,
    aliases: aliases,
    category: 'utilidades',
    description: desc,
    usage: '!' + usage,
    handler: async function (ctx) {
      if (!ctx.hasPrefix) return; // palavra comum em conversa normal: só com prefixo
      const q = (ctx.args || []).join(' ').trim();
      if (!q) {
        return ctx.reply('Use: *' + usage + '*');
      }
      return ctx.reply('🔎 *' + label + '*: ' + q.slice(0, 80) + '\n🔗 ' + buildUrl(encodeURIComponent(q)));
    }
  };
}

const pesquisaCmds = [
  makeSearch('pesquisar', [], 'Pesquisa na web', 'pesquisar <assunto>',
    function (a) { return a.length ? a.join(' ') : null; }),
  makeSearch('google', [], 'Pesquisa na web', 'google <assunto>',
    function (a) { return a.length ? a.join(' ') : null; }),
  makeSearch('chrome', [], 'Pesquisa na web', 'chrome <assunto>',
    function (a) { return a.length ? a.join(' ') : null; }),
  makeSearch('significado', [], 'Significado de uma palavra', 'significado <palavra>',
    function (a) { return a.length ? 'significado de ' + a.join(' ') : null; }),
  makeSearch('horoscopo', ['horóscopo'], 'Horóscopo do dia', 'horoscopo <signo>',
    function (a) { return a.length ? 'horóscopo de hoje ' + a.join(' ') : null; }),
  makeSearch('brasileirao', ['brasileirão'], 'Tabela do Brasileirão', 'brasileirao',
    function () { return 'tabela classificação campeonato brasileiro série A hoje'; }),
  makeSearch('timefut', ['futebol'], 'Informações de um time de futebol', 'timefut <nome do time>',
    function (a) { return a.length ? a.join(' ') + ' próximo jogo último resultado' : null; }),
  makeLink('maps', [], 'Localização no Google Maps', 'maps <lugar>',
    function (q) { return 'https://www.google.com/maps/search/?api=1&query=' + q; }, 'Maps'),
  makeLink('playstore', [], 'Procura app na Play Store', 'playstore <app>',
    function (q) { return 'https://play.google.com/store/search?q=' + q + '&c=apps'; }, 'Play Store')
];

module.exports = [].concat(iaCmds).concat(pesquisaCmds);
