const MAX_JOB_MS = 3 * 60 * 1000;
let active = 0;
let current = null;
let cancelFlag = false;
function isBusy() { return active > 0; }
function statusText() {
  if (active <= 0) return null;
  return {
    who: current && current.sender ? current.sender : '?',
    label: current && current.label ? current.label : 'download',
    waiting: Math.max(0, active - 1),
    startedAt: current && current.at ? current.at : null
  };
}
function tryAcquire(ctx, label) {
  const sender = (ctx && (ctx.sender || ctx.senderPn)) || '?';
  if (active === 0) cancelFlag = false;
  active += 1;
  current = { sender: sender, jid: (ctx && ctx.jid) || '', label: label || 'download', at: Date.now() };
  return { ok: true, queued: false };
}
function release() {
  active = Math.max(0, active - 1);
  if (active === 0) { current = null; cancelFlag = false; }
}
function requestCancel() {
  if (active <= 0) return { ok: false, reason: 'Nao ha download em curso.' };
  cancelFlag = true;
  return { ok: true, reason: '🛑 *Cancelamento pedido*\n\nOs downloads em curso vao parar em breve.' };
}
function isCancelled() { return !!cancelFlag; }
function clearCancel() { cancelFlag = false; }
function withDownloadLock(label, handler) {
  return async function (ctx) {
    tryAcquire(ctx, label);
    try { return await handler(ctx); }
    finally { release(); }
  };
}
module.exports = { tryAcquire: tryAcquire, release: release, isBusy: isBusy, statusText: statusText, withDownloadLock: withDownloadLock, requestCancel: requestCancel, isCancelled: isCancelled, clearCancel: clearCancel, MAX_JOB_MS: MAX_JOB_MS };
