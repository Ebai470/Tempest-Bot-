# Shazam + namoro com botoes

Instalar (na pasta do bot):
  mkdir -p backup-shazam-namoro && cp src/commands/rpg/family.js src/interactive/index.js src/utils/webfetch.js backup-shazam-namoro/
  unzip -o shazam-namoro.zip && cp -r shazam-namoro/src/* src/ && cp shazam-namoro/patch-shazam-namoro.js .
  node patch-shazam-namoro.js
Precisa de: pkg install ffmpeg  e  AUDD_TOKEN=... no .env (token em dashboard.audd.io)
