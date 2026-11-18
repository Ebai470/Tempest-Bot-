# Imagens (+40 efeitos), pint corrigido, tk/ig HD leve, tk2/ig2

Instalar (na pasta do bot):
  mkdir -p backup-pint-tk && cp src/commands/utilidades/pint.js src/commands/utilidades/tkig.js src/commands/imagem/image.js backup-pint-tk/
  unzip -o imagens-pint-tk.zip && cp -r imagens-pint-tk/src/* src/ && cp imagens-pint-tk/patch-imagem-menu.js .
  node patch-imagem-menu.js
Para o video HD leve: pkg install ffmpeg
