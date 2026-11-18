# ⚡ TEMPEST BOT

Cópia independente da Beatriz Bot, configurada como **Tempest Bot**.

## O que foi alterado

- Nome do bot: **TEMPEST BOT**
- Número do bot: **852935085** (já estava no .env)
- Owner: **mesmo da Beatriz** (258849657128)
- Sessão própria: `./session-tempest` (NÃO usa a sessão da Beatriz)
- Banco de dados próprio: `./data/tempest.db`
- Menu principal: o **segundo menu** (tema luxo) agora é o menu padrão para todos os prefixos
- Strings visíveis (menus, status, IA, stickers, etc.) atualizadas para Tempest
- Estrutura, comandos, APIs e funções **preservadas**

## Instalação no Termux

### 1. Onde colocar os arquivos

Recomendado (pasta separada da Beatriz):

```bash
cd ~
mkdir -p tempest-bot
# copie TODO o conteúdo deste zip para ~/tempest-bot
cd ~/tempest-bot
```

**Importante:** Beatriz e Tempest devem ficar em pastas diferentes, cada um com a sua sessão.

### 2. Copiar mídias da Beatriz (obrigatório para menus com vídeo/imagem)

No Termux, a partir da pasta da Beatriz:

```bash
# Exemplo (ajuste o caminho da Beatriz)
cp -r ~/beatriz-bot/data/command-media ~/tempest-bot/data/
cp -r ~/beatriz-bot/data/command-audio ~/tempest-bot/data/ 2>/dev/null || true
```

Ou extraia a pasta `data/command-media` e `data/command-audio` do zip original da Beatriz para dentro de `~/tempest-bot/data/`.

**NÃO copie** a pasta `session` da Beatriz.  
**NÃO copie** o arquivo `data/beatriz.db` (o Tempest cria o próprio `tempest.db`).

### 3. Instalar dependências

```bash
cd ~/tempest-bot
pkg update -y
pkg install nodejs-lts git -y   # se ainda não tiver
npm install
```

Se der erro com `sharp`:

```bash
npm install --omit=optional
# ou
npm install sharp --ignore-scripts
```

### 4. Iniciar o Tempest Bot

```bash
cd ~/tempest-bot
npm start
# ou
node src/index.js
```

### 5. Login / conectar o número 852935085

1. Ao iniciar, aparece um **QR Code** no terminal.
2. No WhatsApp do número **852935085**:
   - Configurações → Aparelhos conectados → Conectar um aparelho
   - Escaneie o QR
3. A sessão é salva em `session-tempest/`.
4. Nas próximas vezes o bot conecta sozinho (sem QR), desde que a pasta `session-tempest` não seja apagada.

### 6. Manter Beatriz e Tempest juntos

| Item              | Beatriz              | Tempest                  |
|-------------------|----------------------|--------------------------|
| Pasta             | `~/beatriz-bot`      | `~/tempest-bot`          |
| Sessão            | `./session`          | `./session-tempest`      |
| Banco             | `data/beatriz.db`    | `data/tempest.db`        |
| Número WhatsApp   | (o da Beatriz)       | **852935085**            |
| Comando start     | `npm start`          | `npm start`              |

Rode cada um em um terminal/sessão diferente (ou use `tmux` / `screen`).

Exemplo com tmux:

```bash
# Terminal 1 - Beatriz
cd ~/beatriz-bot && npm start

# Terminal 2 - Tempest
cd ~/tempest-bot && npm start
```

### 7. Arquivos que você pode editar manualmente (se quiser)

| Arquivo     | O que mudar |
|-------------|-------------|
| `.env`      | `BOT_NAME`, `OWNER_NUMBER`, `PREFIXES`, API keys |
| `src/config/index.js` | Preços de aluguel (`rentalPlans`), defaults |
| `src/utils/theme.js` | Visual do menu principal |

Não é necessário editar nada para o bot funcionar — já está configurado.

## Verificação rápida

Ao iniciar deve aparecer algo como:

```
🤖 TEMPEST BOT
📦 Comandos principais: ...
👑 Dono: 258849657128
```

E o menu (`!menu` ou `menu`) deve mostrar o **tema luxo** (segundo menu) como principal.

## Notas

- Comandos internos (`bia`, `biaresponde`, aliases) foram mantidos para não quebrar uso.
- Funções internas com prefixo `beatriz*` no código foram preservadas (não afetam o nome exibido).
- Se o QR não aparecer ou der erro de autenticação, apague `session-tempest` e reinicie para gerar QR novo.
