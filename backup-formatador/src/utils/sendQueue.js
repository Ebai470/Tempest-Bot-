const MAX_CONCURRENT = 16;
let active = 0;
const waiting = [];
let totalSent = 0;
let burstEvents = 0;
function pump() {
  while (active < MAX_CONCURRENT && waiting.length) {
    const job = waiting.shift();
    active += 1;
    job();
  }
}
function enqueue(sendFn, content) {
  return new Promise(function (resolve) {
    waiting.push(async function () {
      try {
        const res = await sendFn();
        totalSent += 1;
        resolve(res);
      } catch (e) {
        console.error('[SEC QUEUE] send error:', e && e.message);
        resolve(null);
      } finally {
        active -= 1;
        pump();
      }
    });
    if (waiting.length > 0 && active >= MAX_CONCURRENT) burstEvents += 1;
    pump();
  });
}
function stats() {
  return { chainLen: active + waiting.length, recent: active, totalSent: totalSent, burstEvents: burstEvents };
}
function wrapSocket(sock) {
  if (!sock || sock.__secQueueWrapped) return sock;
  const original = sock.sendMessage.bind(sock);
  sock.sendMessage = function (jid, content, options) {
    return enqueue(function () { return original(jid, content, options); }, content || {});
  };
  sock.__secQueueWrapped = true;
  sock.__secQueueStats = stats;
  console.log('[SEC QUEUE] sendMessage envolvido (concorrencia ' + MAX_CONCURRENT + ')');
  return sock;
}
module.exports = { enqueue: enqueue, wrapSocket: wrapSocket, stats: stats };
