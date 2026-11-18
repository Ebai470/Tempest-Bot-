'use strict';
/**
 * albumIndex — guarda (em memória) as imagens/vídeos/GIFs recebidos recentemente
 * por chat, para o comando !stiks conseguir recuperar TODAS as mídias de um álbum,
 * mesmo quando o WhatsApp as entrega como mensagens separadas.
 *
 * Como agrupa:
 *  1) Álbum nativo: as mídias filhas trazem messageAssociation.parentMessageKey.
 *  2) Sem associação (ex.: envios rápidos em sequência): junta mídias do mesmo
 *     remetente, no mesmo chat, com intervalo curto entre elas.
 *
 * Só conhece mensagens recebidas depois que o bot ligou (não é persistente).
 */

const MAX_TOTAL = 600;          // limite global de entradas guardadas
const MAX_AGE_MS = 6 * 3600e3;  // descarta entradas com mais de 6h
const CLUSTER_GAP_S = 10;       // intervalo máx. (s) entre mídias do mesmo "lote"

let seq = 0;
const entries = [];             // todas as mídias, por ordem de chegada
const parents = new Map();      // jid|id do albumMessage -> { images, videos, ts }

function unwrap(message) {
  let m = message;
  for (let i = 0; i < 6 && m; i++) {
    const inner = m.ephemeralMessage || m.viewOnceMessage || m.viewOnceMessageV2 ||
      m.viewOnceMessageV2Extension || m.associatedChildMessage || m.documentWithCaptionMessage || null;
    if (!inner || !inner.message) break;
    m = inner.message;
  }
  return m;
}

function findAssociation(message) {
  // procura messageAssociation no invólucro e no conteúdo interno
  const seen = [];
  let m = message;
  for (let i = 0; i < 6 && m; i++) {
    seen.push(m);
    const inner = m.ephemeralMessage || m.viewOnceMessage || m.viewOnceMessageV2 ||
      m.viewOnceMessageV2Extension || m.associatedChildMessage || m.documentWithCaptionMessage || null;
    if (!inner || !inner.message) break;
    m = inner.message;
  }
  for (const x of seen) {
    const a = x && x.messageContextInfo && x.messageContextInfo.messageAssociation;
    if (a && a.parentMessageKey && a.parentMessageKey.id) return a.parentMessageKey.id;
  }
  return null;
}

function toSec(ts) {
  if (ts == null) return Math.floor(Date.now() / 1000);
  if (typeof ts === 'object' && typeof ts.toNumber === 'function') return ts.toNumber();
  const n = Number(ts);
  return Number.isFinite(n) && n > 0 ? n : Math.floor(Date.now() / 1000);
}

function prune() {
  const now = Date.now();
  while (entries.length && (entries.length > MAX_TOTAL || now - entries[0].at > MAX_AGE_MS)) entries.shift();
  for (const [k, v] of parents) if (now - v.at > MAX_AGE_MS) parents.delete(k);
}

/** Chamar para cada mensagem recebida. Nunca lança erro. */
function record(msg) {
  try {
    if (!msg || !msg.key || !msg.message) return;
    const jid = msg.key.remoteJid;
    const id = msg.key.id;
    if (!jid || !id) return;
    const inner = unwrap(msg.message);
    if (!inner) return;

    if (inner.albumMessage) {
      parents.set(jid + '|' + id, {
        images: Number(inner.albumMessage.expectedImageCount) || 0,
        videos: Number(inner.albumMessage.expectedVideoCount) || 0,
        sender: msg.key.participant || msg.key.participantPn || jid,
        ts: toSec(msg.messageTimestamp),
        at: Date.now()
      });
      return;
    }

    let type = null, node = null;
    if (inner.imageMessage) { type = 'image'; node = inner.imageMessage; }
    else if (inner.videoMessage) { type = 'video'; node = inner.videoMessage; }
    else return;

    if (entries.some((e) => e.jid === jid && e.id === id)) return; // já guardada

    entries.push({
      seq: ++seq,
      at: Date.now(),
      ts: toSec(msg.messageTimestamp),
      jid: jid,
      id: id,
      sender: msg.key.participant || msg.key.participantPn || jid,
      fromMe: !!msg.key.fromMe,
      type: type,
      node: node,
      key: msg.key,
      parentId: findAssociation(msg.message),
      seconds: Number(node.seconds) || 0,
      gif: !!node.gifPlayback
    });
    prune();
  } catch (_) { /* nunca quebrar o fluxo de mensagens */ }
}

function sortItems(list) {
  return list.slice().sort((a, b) => (a.ts - b.ts) || (a.seq - b.seq));
}

function expectedFor(jid, parentId) {
  const p = parents.get(jid + '|' + parentId);
  return p ? (p.images + p.videos) : 0;
}

/**
 * Devolve o lote de mídias a que pertence a mensagem `stanzaId` (a respondida).
 * @returns {null | {items:Array, source:'album'|'cluster'|'single', expected:number}}
 */
function findBatch(jid, stanzaId) {
  if (!jid || !stanzaId) return null;
  const inChat = entries.filter((e) => e.jid === jid);

  // stanzaId é o próprio albumMessage (pai)?
  const kids = inChat.filter((e) => e.parentId === stanzaId);
  if (kids.length) {
    return { items: sortItems(kids), source: 'album', expected: expectedFor(jid, stanzaId) };
  }

  const par = parents.get(jid + '|' + stanzaId);
  if (par) {
    const exp = par.images + par.videos;
    const cand = sortItems(inChat.filter((e) => e.sender === par.sender && !e.parentId && e.ts >= par.ts - 3));
    const out = [];
    for (const e of cand) {
      if (out.length && e.ts - out[out.length - 1].ts > CLUSTER_GAP_S) break;
      if (exp && out.length >= exp) break;
      out.push(e);
    }
    if (out.length) return { items: out, source: 'album', expected: exp };
  }
  const target = inChat.find((e) => e.id === stanzaId);
  if (!target) return null;

  // álbum nativo
  if (target.parentId) {
    const sib = inChat.filter((e) => e.parentId === target.parentId);
    return { items: sortItems(sib), source: 'album', expected: expectedFor(jid, target.parentId) };
  }

  // sem associação: junta por remetente + proximidade no tempo
  const mine = sortItems(inChat.filter((e) => e.sender === target.sender && !e.parentId));
  let i = mine.findIndex((e) => e.id === target.id);
  if (i < 0) return { items: [target], source: 'single', expected: 0 };
  let a = i, b = i;
  while (a > 0 && (mine[a].ts - mine[a - 1].ts) <= CLUSTER_GAP_S) a--;
  while (b < mine.length - 1 && (mine[b + 1].ts - mine[b].ts) <= CLUSTER_GAP_S) b++;
  const items = mine.slice(a, b + 1);
  return { items: items, source: items.length > 1 ? 'cluster' : 'single', expected: 0 };
}

module.exports = { record, findBatch, unwrap, _entries: entries, _parents: parents };
