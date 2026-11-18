const fs = require('fs');
const p = 'src/commands/imagem/image.js';
let s = fs.readFileSync(p, 'utf8');
if (s.indexOf("require('./efeitos').menuText") >= 0) { console.log('menu imagem: ja aplicado'); process.exit(0); }
const a = "await ctx.reply(\n        `🖼️ *MENU IMAGEM*";
const b = "_Responda a uma foto com o comando._`\n      );";
const i = s.indexOf(a), j = s.indexOf(b);
if (i < 0 || j < 0 || j < i) { console.log('ERRO: ancoras do imagemmenu nao encontradas'); process.exit(1); }
s = s.slice(0, i) + "await ctx.reply(require('./efeitos').menuText(ctx, media));" + s.slice(j + b.length);
fs.writeFileSync(p, s);
console.log('menu imagem: aplicado');
