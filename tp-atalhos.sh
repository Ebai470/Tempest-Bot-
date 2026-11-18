set -e
cd "${1:-$HOME/tempest-bot}"
P=src/interactive/prefixSelect.js
[ -f "$P" ] || { echo "❌ Rode dentro da pasta do bot (não achei $P)"; exit 1; }
BK="backup-atalhos-$(date +%Y%m%d-%H%M%S)"; mkdir -p "$BK"; cp "$P" "$BK/"

# 1) comandos novos e simples: tutorial e totalcmds
cat > src/commands/utilidades/atalhos.js <<'TPEOF'
'use strict';
/** Atalhos da LISTA do "prefixo": tutorial e totalcmds. Comandos novos e isolados. */
module.exports = [
  {
    name: 'tutorial', aliases: ['comousar'], category: 'utilidades',
    description: 'Tutorial básico do bot', usage: '!tutorial',
    handler: async (ctx) => {
      const p = (ctx.prefix || '!');
      return ctx.reply('📖 *TUTORIAL BÁSICO*\n\n'
        + '1️⃣ Use o prefixo antes do comando. Ex.: *' + p + 'menu*\n'
        + '2️⃣ Mande *prefixo* (sem nada antes) para ver o prefixo do grupo e abrir a *LISTA* de atalhos.\n'
        + '3️⃣ *' + p + 'menu* abre o menu principal com todas as categorias.\n'
        + '4️⃣ *' + p + 'perfil* mostra o seu perfil e *' + p + 'ping* testa a velocidade do bot.\n'
        + '5️⃣ Para baixar vídeos, use *' + p + 'tk*, *' + p + 'ig*, *' + p + 'fb* com o link.\n\n'
        + 'Dúvidas? Fale com o dono: *' + p + 'dono*');
    }
  },
  {
    name: 'totalcmds', aliases: ['totalcomandos', 'totalcmd'], category: 'utilidades',
    description: 'Total de comandos do bot', usage: '!totalcmds',
    handler: async (ctx) => {
      let n = 0;
      try { const r = require('../registry'); n = (r.getMainCommands ? r.getMainCommands() : r.getAll()).length; } catch (_) {}
      return ctx.reply('📦 *TOTAL DE COMANDOS*\n\nO bot tem *' + n + '* comandos disponíveis.\nUse *' + (ctx.prefix || '!') + 'menu* para ver todos.');
    }
  }
];
TPEOF

# 2) seção de atalhos na LISTA do "prefixo"
node - <<'__TP_PATCH__'
const fs = require('fs');
const f = 'src/interactive/prefixSelect.js';
let s = fs.readFileSync(f, 'utf8');
if (s.includes('TP_ATALHOS')) { console.log('= já atualizado'); process.exit(0); }
const a1 = 'function sections() {';
const a2 = "  return [mk('text', 'MENU DE TEXTO'), mk('inter', 'MENU INTERATIVO')];";
if (!s.includes(a1) || !s.includes(a2)) { console.log('❌ trechos não encontrados'); process.exit(2); }
const quick = [
  "// TP_ATALHOS: lista de atalhos (como no vídeo) antes dos prefixos",
  "function quick() {",
  "  return { title: 'COMANDOS ' + botTag(), rows: [",
  "    { title: '『💮』 MENU', description: 'Abrir o menu principal', id: 'mn:home' },",
  "    { title: '『👤』 PERFIL', description: 'Ver seu perfil', id: 'mn:cmd:perfil' },",
  "    { title: '『📖』 TUTORIAL', description: 'Tutorial básico', id: 'mn:cmd:tutorial' },",
  "    { title: '『🏠』 ALUGAR', description: 'Ver opções de aluguel', id: 'mn:cat:aluguel' },",
  "    { title: '『🛍️』 LOJINHA', description: 'Abrir a lojinha', id: 'mn:cmd:loja' },",
  "    { title: '『👑』 DONO', description: 'Informações do proprietário', id: 'mn:owner' },",
  "    { title: '『📦』 TOTAL CMDS', description: 'Ver total de comandos', id: 'mn:cmd:totalcmds' },",
  "    { title: '『🏓』 PING', description: 'Ver velocidade do bot', id: 'mn:cmd:ping' }",
  "  ] };",
  "}",
  ""
].join('\n');
s = s.replace(a1, function () { return quick + a1; });
s = s.replace(a2, function () { return "  return [quick(), mk('text', 'MENU DE TEXTO'), mk('inter', 'MENU INTERATIVO')];"; });
fs.writeFileSync(f, s);
console.log('✔ prefixSelect atualizado');
__TP_PATCH__
node --check "$P" && node --check src/commands/utilidades/atalhos.js || { echo "❌ erro de sintaxe - restaurando"; cp "$BK/prefixSelect.js" "$P"; rm -f src/commands/utilidades/atalhos.js; exit 3; }
echo "✅ Pronto! Reinicie o bot. Backup em $BK"
