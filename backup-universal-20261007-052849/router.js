'use strict';
const { parseReply } = require('./nativeFlow');
const handlers = new Map();

function register(prefix, fn) { handlers.set(prefix, fn); }

async function dispatch(sock, msg, deps) {
  const id = parseReply(msg);
  if (!id) return false;
  const i = String(id).indexOf(':');
  if (i < 1) return false;
  const prefix = id.slice(0, i);
  const fn = handlers.get(prefix);
  if (!fn) return false;
  try {
    const Context = require('../utils/context');
    const ctx = new Context(sock, msg, { command: '', args: [], text: '', prefix: '', hasPrefix: false, body: '' });
    if (deps && deps.isBlacklisted && deps.isBlacklisted(ctx.sender)) return true;
    await fn(ctx, id.slice(i + 1), msg);
  } catch (e) { console.error('[router]', id, e && e.message); }
  return true;
}

module.exports = { register, dispatch };
