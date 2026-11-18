/**
 * Tabela de efeitos de áudio (ffmpeg -af).
 * Só dados + funções puras — o comando que executa fica em commands/audio/audiofx.js
 *
 * Cada efeito: { name, aliases, group, desc, usage?, build(args) -> { af } | { error } | { cut:{ss,t} } }
 */

const SR = 44100;

/** muda tom mantendo duração (0.5 <= f <= 2) */
function pitch(f) {
  return 'aresample=' + SR + ',asetrate=' + Math.round(SR * f) + ',aresample=' + SR +
    ',atempo=' + (1 / f).toFixed(5);
}

/** atempo aceita 0.5..2 por filtro; encadeia para valores maiores */
function tempo(v) {
  if (v <= 2) return 'atempo=' + v.toFixed(4);
  return 'atempo=2,atempo=' + (v / 2).toFixed(4);
}

function num(s) {
  if (s == null) return NaN;
  return parseFloat(String(s).replace(',', '.'));
}

/** "90" | "1:30" | "00:01:30" -> segundos */
function parseTime(s) {
  if (s == null) return NaN;
  const t = String(s).trim().replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  const parts = t.split(':');
  if (parts.length < 2 || parts.length > 3) return NaN;
  let total = 0;
  for (let i = 0; i < parts.length; i++) {
    const n = parseFloat(parts[i]);
    if (isNaN(n) || n < 0) return NaN;
    total = total * 60 + n;
  }
  return total;
}

function fixed(af) {
  return function () { return { af: af }; };
}

const LIM = ',alimiter=limit=0.95';

const EFFECTS = [
  // ===== EFEITOS DE VOZ =====
  { name: 'estourar', aliases: ['estourado'], group: 'voz', desc: 'Áudio estourado',
    build: fixed('volume=20dB,acrusher=bits=10:mode=log:aa=1,alimiter=limit=0.9') },
  { name: 'esquilo', aliases: ['chipmunk'], group: 'voz', desc: 'Voz de esquilo',
    build: fixed('aresample=' + SR + ',asetrate=70000,aresample=' + SR) },
  { name: 'vozrobo', aliases: ['robovoice', 'vozrobô'], group: 'voz', desc: 'Voz de robô',
    build: fixed("afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75") },
  { name: 'demonio', aliases: ['demônio', 'demon'], group: 'voz', desc: 'Voz de demônio',
    build: fixed(pitch(0.7) + ',aecho=0.8:0.88:60:0.4') },
  { name: 'gigante', aliases: ['giant'], group: 'voz', desc: 'Voz de gigante',
    build: fixed(pitch(0.6) + ',bass=g=6') },
  { name: 'vozalien', aliases: ['alienvoice'], group: 'voz', desc: 'Voz de alien',
    build: fixed(pitch(1.35) + ',vibrato=f=10:d=0.6,aecho=0.8:0.7:20:0.5') },
  { name: 'radio', aliases: ['rádio'], group: 'voz', desc: 'Som de rádio',
    build: fixed('highpass=f=400,lowpass=f=3200,acrusher=bits=12:mix=0.4,volume=1.8' + LIM) },
  { name: 'telefone', aliases: ['telephone'], group: 'voz', desc: 'Som de telefone',
    build: fixed('highpass=f=300,lowpass=f=3400,volume=2' + LIM) },
  { name: 'megafone', aliases: ['megaphone'], group: 'voz', desc: 'Som de megafone',
    build: fixed('highpass=f=500,lowpass=f=4000,acompressor=threshold=0.05:ratio=9:attack=5:release=50,volume=3' + LIM) },
  { name: 'vozfantasma', aliases: ['ghostvoice'], group: 'voz', desc: 'Voz de fantasma',
    build: fixed(pitch(0.85) + ',aecho=0.8:0.9:1000|1800:0.3|0.25,tremolo=f=5:d=0.4') },
  { name: 'metalico', aliases: ['metálico', 'metal'], group: 'voz', desc: 'Voz metálica',
    build: fixed('aecho=1:0.7:20:0.9') },
  { name: 'boyvoice', aliases: ['vozmenino'], group: 'voz', desc: 'Voz de menino',
    build: fixed(pitch(1.25)) },
  { name: 'womenvoice', aliases: ['vozmulher'], group: 'voz', desc: 'Voz de mulher',
    build: fixed(pitch(1.3)) },
  { name: 'manvoice', aliases: ['vozhomem'], group: 'voz', desc: 'Voz de homem',
    build: fixed(pitch(0.8)) },
  { name: 'childvoice', aliases: ['vozcriança', 'vozcrianca'], group: 'voz', desc: 'Voz de criança',
    build: fixed(pitch(1.5)) },
  { name: 'speedup', aliases: ['vozrapida', 'vozrápida', 'audiorapido', 'áudiorápido'], group: 'voz', desc: 'Áudio mais rápido',
    build: fixed('atempo=1.5') },
  { name: 'vozlenta', aliases: ['audiolento', 'áudiolento'], group: 'voz', desc: 'Áudio mais lento',
    build: fixed('atempo=0.7') },
  { name: 'eco', aliases: ['echo'], group: 'voz', desc: 'Eco curto',
    build: fixed('aecho=0.8:0.88:60:0.4') },
  { name: 'vozgrave', aliases: [], group: 'voz', desc: 'Voz grave',
    build: fixed(pitch(0.82) + ',bass=g=8') },
  { name: 'tremolo', aliases: ['trêmolo'], group: 'voz', desc: 'Efeito tremolo',
    build: fixed('tremolo=f=8:d=0.9') },
  { name: 'vibrato', aliases: [], group: 'voz', desc: 'Efeito vibrato',
    build: fixed('vibrato=f=6:d=0.7') },
  { name: 'pitch', aliases: ['tom'], group: 'voz', desc: 'Muda o tom', usage: 'pitch <0.5-2.0>',
    build: function (args) {
      const v = args.length ? num(args[0]) : 1.3;
      if (isNaN(v) || v < 0.5 || v > 2) return { error: 'Use um valor entre 0.5 e 2.0. Ex: pitch 1.3' };
      return { af: pitch(v) };
    } },
  { name: 'vozeco', aliases: [], group: 'voz', desc: 'Voz com eco longo',
    build: fixed('aecho=0.8:0.9:500|1000:0.35|0.2') },
  { name: 'vozcaverna', aliases: ['caverna'], group: 'voz', desc: 'Voz de caverna',
    build: fixed('aecho=0.8:0.88:40|80|120:0.5|0.4|0.3,lowpass=f=3000') },
  { name: 'reverb', aliases: [], group: 'voz', desc: 'Reverberação',
    build: fixed('aecho=0.8:0.7:20|40|70|110:0.4|0.3|0.25|0.2') },
  { name: 'reverse', aliases: ['reversobn', 'audioreverso'], group: 'voz', desc: 'Áudio ao contrário',
    build: fixed('areverse') },
  { name: 'chorus', aliases: [], group: 'voz', desc: 'Efeito chorus',
    build: fixed('chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3') },
  { name: 'phaser', aliases: [], group: 'voz', desc: 'Efeito phaser',
    build: fixed('aphaser=type=t:speed=2:decay=0.6') },
  { name: 'flanger', aliases: [], group: 'voz', desc: 'Efeito flanger',
    build: fixed('flanger=delay=10:depth=5:speed=0.5:regen=3') },

  // ===== EDIÇÃO =====
  { name: 'speed', aliases: ['velocidade'], group: 'edicao', desc: 'Velocidade do áudio', usage: 'speed <0.5-3.0>',
    build: function (args) {
      const v = args.length ? num(args[0]) : 1.5;
      if (isNaN(v) || v < 0.5 || v > 3) return { error: 'Use um valor entre 0.5 e 3.0. Ex: speed 1.5' };
      return { af: tempo(v) };
    } },
  { name: 'cortaraudio', aliases: ['cortar', 'cutaudio'], group: 'edicao', desc: 'Corta um trecho', usage: 'cortaraudio <inicio> <fim>',
    build: function (args) {
      if (args.length < 2) return { error: 'Use: cortaraudio <inicio> <fim>\nEx: cortaraudio 5 20  ou  cortaraudio 0:05 0:20' };
      const a = parseTime(args[0]);
      const b = parseTime(args[1]);
      if (isNaN(a) || isNaN(b)) return { error: 'Tempos inválidos. Ex: cortaraudio 5 20  ou  cortaraudio 0:05 0:20' };
      if (b <= a) return { error: 'O fim precisa ser maior que o início.' };
      return { cut: { ss: a, t: b - a }, af: null };
    } },
  { name: 'normalizar', aliases: ['normalize'], group: 'edicao', desc: 'Normaliza o volume',
    build: fixed('loudnorm=I=-16:TP=-1.5:LRA=11') },

  // ===== BASS & GRAVE =====
  { name: 'bass', aliases: [], group: 'bass', desc: 'Reforço de graves',
    build: fixed('bass=g=10' + LIM) },
  { name: 'bass2', aliases: [], group: 'bass', desc: 'Graves fortes',
    build: fixed('bass=g=15:f=80' + LIM) },
  { name: 'bass3', aliases: [], group: 'bass', desc: 'Graves extremos',
    build: fixed('bass=g=20:f=60,volume=0.8' + LIM) },
  { name: 'bassbn', aliases: [], group: 'bass', desc: 'Graves com nível', usage: 'bassbn <1-20>',
    build: function (args) {
      const v = args.length ? num(args[0]) : 10;
      if (isNaN(v) || v < 1 || v > 20) return { error: 'Use um valor entre 1 e 20. Ex: bassbn 12' };
      return { af: 'bass=g=' + v + LIM };
    } },
  { name: 'grave', aliases: [], group: 'bass', desc: 'Som grave',
    build: fixed('equalizer=f=70:t=h:w=120:g=10' + LIM) },

  // ===== VOLUME & EQUALIZAÇÃO =====
  { name: 'volumeboost', aliases: [], group: 'volume', desc: 'Volume forte',
    build: fixed('volume=4' + LIM) },
  { name: 'aumentarvolume', aliases: [], group: 'volume', desc: 'Aumenta o volume', usage: 'aumentarvolume <1-10>',
    build: function (args) {
      const v = args.length ? num(args[0]) : 3;
      if (isNaN(v) || v < 1 || v > 10) return { error: 'Use um valor entre 1 e 10. Ex: aumentarvolume 3' };
      return { af: 'volume=' + v + LIM };
    } },
  { name: 'equalizar', aliases: ['equalizer'], group: 'volume', desc: 'Equalizador', usage: 'equalizar [graves|medios|agudos|voz]',
    build: function (args) {
      const p = String(args[0] || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const presets = {
        '': 'equalizer=f=100:t=h:w=100:g=5,equalizer=f=1000:t=q:w=1:g=2,equalizer=f=8000:t=h:w=2000:g=4',
        graves: 'equalizer=f=100:t=h:w=100:g=9',
        medios: 'equalizer=f=1000:t=q:w=1:g=7',
        agudos: 'equalizer=f=8000:t=h:w=2000:g=9',
        voz: 'highpass=f=100,equalizer=f=2500:t=q:w=1:g=6,equalizer=f=200:t=q:w=1:g=-3'
      };
      if (!Object.prototype.hasOwnProperty.call(presets, p)) {
        return { error: 'Presets: graves, medios, agudos, voz. Ex: equalizar graves' };
      }
      return { af: presets[p] + LIM };
    } },
  { name: 'overdrive', aliases: ['distorcer', 'distorcao'], group: 'volume', desc: 'Distorção',
    build: fixed('volume=12dB,asoftclip=type=tanh') },
  { name: 'lowpass', aliases: [], group: 'volume', desc: 'Corta agudos', usage: 'lowpass [hz]',
    build: function (args) {
      const v = args.length ? num(args[0]) : 800;
      if (isNaN(v) || v < 100 || v > 10000) return { error: 'Use uma frequência entre 100 e 10000 Hz. Ex: lowpass 800' };
      return { af: 'lowpass=f=' + Math.round(v) };
    } }
];

const GROUPS = [
  { key: 'voz', title: 'EFEITOS DE VOZ', emoji: '🎤' },
  { key: 'edicao', title: 'EDIÇÃO DE ÁUDIO', emoji: '✂️' },
  { key: 'bass', title: 'BASS & GRAVE', emoji: '🔥' },
  { key: 'volume', title: 'VOLUME & EQUALIZAÇÃO', emoji: '🎚️' }
];

function namesOfGroup(key) {
  return EFFECTS.filter(function (e) { return e.group === key; }).map(function (e) { return e.name; });
}

module.exports = { EFFECTS, GROUPS, namesOfGroup, pitch, tempo, parseTime };
