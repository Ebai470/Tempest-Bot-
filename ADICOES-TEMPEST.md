# Adições (menu Inuzinha → Tempest)

Tudo foi adicionado em arquivos NOVOS. Nenhum comando existente foi alterado
(nomes/apelidos antigos continuam apontando para o mesmo comando de antes).

## Arquivos novos
- src/commands/audio/audiofx.js        → MENU ÁUDIO (42 comandos, precisa de ffmpeg)
- src/utils/audioFilters.js            → tabela dos efeitos
- src/utils/quotedMedia.js             → helper para achar/baixar áudio e figurinha respondidos
- src/commands/stickers/figextras.js   → brat, brat0..30, bratcores, txt, ttp, rgtake, take, vertake, deltake, limpartake, rename
- src/commands/utilidades/extras_ia_pesquisa.js → gpt, chatgpt, gemini, geminipro, perplexity, qwen,
                                          pesquisar, google, chrome, significado, horoscopo, brasileirao, timefut, maps, playstore

## Arquivos editados (só linhas acrescentadas)
- src/commands/loader.js     → pasta 'audio' na lista de categorias
- src/utils/menu.js          → CATEGORY_META.audio (cria !menuaudio)
- src/utils/theme.js         → 1 item "menuaudio" no menu principal + subseções dos menus novos
- src/utils/cmdNormalize.js  → "menu audio" / "menu áudio" → menuaudio

## Observações
- Efeitos de áudio: responda a um áudio/nota de voz/vídeo com o comando (ex: `/bass`, `/speed 1.5`, `/cortaraudio 0:05 0:20`).
- alien, fantasma e robo já existiam como reações (Diversão) e foram mantidos; os efeitos de voz são
  `vozalien`, `vozfantasma` e `vozrobo`.
- `time` já era apelido de `hora`; o de futebol é `timefut` (apelido `futebol`).
- gpt/chatgpt/gemini/geminipro/perplexity/qwen usam a mesma IA do bot (comando `bia`).
- Comandos de texto com palavras comuns (google, maps, brat, gpt...) só respondem COM prefixo,
  para não disparar em conversa normal (o bot aceita comandos sem prefixo).
- Takes ficam salvos em data/takes.json (criado sozinho).

---
# Atualização 2 — novo visual dos menus + comando `prefixo`

## Visual
Todos os menus por categoria (!menudono, !menuadm, !menuaudio, ...), o menu principal (!menu) e os menus
download, modos, pesquisa e jogos web usam o novo estilo (╭┈❁ ... ❁┈ / ┊ •͙✧⃝•͙ ╰┈➤ !cmd).
Ficaram com o visual próprio: menu Isekai e menu Hentai.
Gerador: src/utils/menuStyle.js

## Comando prefixo
- Funciona SEM prefixo: basta alguém digitar `prefixo`.
- Responde qual é o prefixo do grupo e envia uma lista com botão "Alterar prefixo".
- Só admins do grupo / dono alteram (pelo botão ou por texto):
  `!prefixo $`   `!prefixo ! .` (até 4)   `!prefixo reset`
- Salvo no banco do bot (tabela group_settings, por grupo): continua igual depois de reiniciar.
- Com prefixo personalizado o grupo passa a usar SÓ ele (os menus também mostram o novo prefixo).
  "prefixo" sem símbolo continua funcionando para quem esquecer qual é.
- Funciona também em grupos com "modo só com prefixo" ligado.

## Arquivos novos
src/utils/menuStyle.js, src/utils/groupPrefix.js, src/interactive/prefixSelect.js, src/commands/utilidades/prefixo.js
## Arquivos editados
src/index.js (4 linhas: prefixo por grupo, clique da lista, exceção do modo só-prefixo),
src/utils/theme.js, src/utils/menu.js, utilidades/menudownload.js, menumodos.js, menuPesquisa.js, diversao/jogosWeb.js
