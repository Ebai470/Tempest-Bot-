#!/data/data/com.termux/files/usr/bin/bash
# Apaga a sessao corrompida e prepara novo codigo de pareamento
cd "${1:-.}"
[ -f src/index.js ] || { echo "❌ Rode dentro da pasta do bot"; exit 1; }
pkill -f "node src/index.js" 2>/dev/null || true
SP=$(grep -E '^SESSION_PATH=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"\r ')
SP="${SP:-./session-tempest}"
echo "📁 Sessao atual: $SP"
if [ -d "$SP" ]; then
  mv "$SP" "${SP}-corrompida-$(date +%Y%m%d-%H%M%S)"
  echo "🗑️  Sessao antiga guardada (pode apagar depois)."
fi
mkdir -p "$SP"
echo ""
echo "📱 Digite o NUMERO DO BOT com DDI, so numeros (ex: 5585999999999):"
read -r NUM
NUM=$(echo "$NUM" | tr -dc '0-9')
[ ${#NUM} -ge 10 ] || { echo "❌ Numero invalido"; exit 1; }
touch .env
grep -v '^PAIR_NUMBER=' .env > .env.tmp || true
echo "PAIR_NUMBER=$NUM" >> .env.tmp
mv .env.tmp .env
echo "✅ Pronto. Iniciando o bot: aguarde o CODIGO DE PAREAMENTO aparecer."
echo "   WhatsApp > Dispositivos conectados > Conectar com numero de telefone"
echo ""
exec node src/index.js
