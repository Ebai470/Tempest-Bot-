// !suicidio — a própria pessoa sai (é removida) do grupo, com uma mensagem de despedida aleatória
const num = (j) => String(j || '').split('@')[0].split(':')[0];

const FRASES = [
  '💀 {usuario} não aguentou a pressão e abandonou o grupo.',
  '🚪 {usuario} pediu demissão da própria participação.',
  '🏳️ {usuario} levantou a bandeira branca. A zoeira venceu.',
  '😂 {usuario} descobriu que este grupo não é para amadores.',
  '🥀 {usuario} saiu em busca de paz. Aqui não existe.',
  '🤡 {usuario} encerrou a carreira antes mesmo de começar.',
  '📉 A resistência de {usuario} chegou ao fim.',
  '🏃 {usuario} fugiu sem olhar para trás.',
  '💀 O departamento de zoeira venceu mais uma vez. Adeus, {usuario}.',
  '🚶 {usuario} decidiu que o silêncio era melhor companhia.',
  '⚰️ A participação de {usuario} chegou oficialmente ao fim.',
  '🧠 {usuario} percebeu que precisava preservar os neurónios.',
  '🔥 {usuario} não sobreviveu ao clima caótico deste grupo.',
  '📢 Comunicado: {usuario} já não faz parte desta bagunça.',
  '🫡 {usuario} abandonou o campo de batalha social.',
  '🎭 {usuario} encerrou o espetáculo e saiu de cena.',
  '🥶 {usuario} não estava preparado para este nível de loucura.',
  '🚨 Alerta: {usuario} acaba de fugir do manicómio digital.',
  '🗿 {usuario} escolheu a paz em vez de discutir com estas criaturas.',
  '💅 {usuario} saiu com dignidade. Pelo menos tentou.',
  '📦 {usuario} recolheu os pertences e desapareceu.',
  '🕊️ {usuario} foi procurar um ambiente menos problemático.',
  '👑 Nem a coroa de {usuario} resistiu ao caos deste grupo.',
  '🤝 A relação entre {usuario} e este grupo chegou ao divórcio.',
  '🔕 {usuario} desligou-se oficialmente desta novela.',
  '🎪 {usuario} percebeu que estava num circo e pediu a saída.',
  '🧊 A paciência de {usuario} congelou. Fim da participação.',
  '🏃‍♂️ {usuario} bateu o recorde mundial de saída deste grupo.',
  '🥲 {usuario} saiu à procura de pessoas com juízo.',
  '👋 Últimas palavras? Nenhuma. {usuario} simplesmente desapareceu.'
];

const last = new Map();
function pick(group) {
  let i = Math.floor(Math.random() * FRASES.length);
  if (FRASES.length > 1 && last.get(group) === i) i = (i + 1 + Math.floor(Math.random() * (FRASES.length - 1))) % FRASES.length;
  last.set(group, i);
  return FRASES[i];
}

async function groupInfo(ctx) {
  try {
    const md = await ctx.sock.groupMetadata(ctx.jid);
    const u = ctx.sock.user || {};
    const me = [num(u.id), num(u.lid)].filter(Boolean);
    const list = md.participants || [];
    const botP = list.find((p) => me.indexOf(num(p.id)) >= 0 || (p.lid && me.indexOf(num(p.lid)) >= 0));
    const usr = list.find((p) => num(p.id) === num(ctx.sender) || (p.lid && num(p.lid) === num(ctx.sender)));
    return { botAdmin: botP ? !!botP.admin : null, creator: !!(usr && usr.admin === 'superadmin'), userJid: (usr && usr.id) || ctx.sender };
  } catch (_) {
    return { botAdmin: null, creator: false, userJid: ctx.sender };
  }
}

module.exports = {
  name: 'suicidio',
  aliases: ['suicídio', 'autokick', 'autoremover', 'sairdogrupo'],
  category: 'grupo',
  description: 'Sai do grupo (remove-te a ti próprio)',
  groupOnly: true,
  usage: 'suicidio',
  FRASES: FRASES,
  handler: async function (ctx) {
    if (!ctx.isGroup) return ctx.reply('Este comando só funciona em grupos.');
    const info = await groupInfo(ctx);
    if (info.creator) return ctx.reply('🚪 `• NÃO FOI POSSÍVEL`\n\n> O criador do grupo não pode ser removido.');
    if (info.botAdmin === false) return ctx.reply('🚪 `• NÃO FOI POSSÍVEL`\n\n> Preciso de ser *admin* do grupo para te remover.');
    try {
      await ctx.sock.groupParticipantsUpdate(ctx.jid, [info.userJid], 'remove');
    } catch (e) {
      return ctx.reply('🚪 `• NÃO FOI POSSÍVEL`\n\n> Não consegui remover-te. Verifica se o bot é admin.');
    }
    try {
      const frase = pick(ctx.jid).split('{usuario}').join('@' + num(ctx.sender));
      await ctx.reply('🚪 `• SAIU DO GRUPO`\n\n> ' + frase, { mentions: [ctx.sender] });
    } catch (_) {}
  }
};
