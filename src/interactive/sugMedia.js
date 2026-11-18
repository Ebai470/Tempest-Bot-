'use strict';
const fs = require('fs');

function info() {
  try { return require('../services/commandMedia').get('comandonaoencontrado'); } catch (_) { return null; }
}

function opts() {
  try {
    const i = info();
    if (!i) { console.log('[sugestao] sem midia definida (setmidia comando nao encontrado)'); return {}; }
    const buf = fs.readFileSync(i.file);
    if (i.type === 'video' || i.type === 'gif') return { video: buf, gifPlayback: i.type === 'gif' };
    return { image: buf };
  } catch (e) {
    console.log('[sugestao] erro ao ler a midia:', e && e.message);
    return {};
  }
}

function status() {
  const i = info();
  if (!i) return '⚪ não definida — responda uma mídia com *setmidia comando não encontrado*';
  return '✅ definida (' + (i.type === 'image' ? 'imagem' : 'vídeo/gif') + ')';
}

module.exports = { opts, status };
