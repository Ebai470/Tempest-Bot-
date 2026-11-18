const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.cwd(), 'data', 'modoverificado.json');
const RESERVED_NAME_RE = /whats\s*app|perplexity|meta\s*verified|\bmeta\b|oficial|official|verificad[oa]\s*por/i;

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) || {}; } catch (_) { return {}; }
}
function writeState(st) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(st, null, 2));
    return true;
  } catch (e) {
    console.error('[MODOVERIFICADO] erro ao gravar estado:', e && e.message);
    return false;
  }
}
function readEnvFile() {
  const env = {};
  try {
    const txt = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    txt.split('\n').forEach(function (line) {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      const i = t.indexOf('=');
      if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    });
  } catch (_) {}
  return env;
}
function getChannel() {
  const st = readState();
  if (st.channel && st.channel.jid) return { jid: String(st.channel.jid), name: String(st.channel.name || 'Tempest Bot') };
  const env = readEnvFile();
  const jid = String(process.env.TEMPEST_NEWSLETTER_JID || env.TEMPEST_NEWSLETTER_JID || '').trim();
  const name = String(process.env.TEMPEST_NEWSLETTER_NAME || env.TEMPEST_NEWSLETTER_NAME || 'Tempest Bot').trim();
  return { jid: jid, name: name };
}
function setChannel(jid, name) {
  const st = readState();
  st.channel = { jid: jid, name: name };
  return writeState(st);
}
function channelProblem(ch) {
  if (!ch.jid) return 'Canal nao configurado (falta TEMPEST_NEWSLETTER_JID no .env).';
  if (!/^\d+@newsletter$/.test(ch.jid)) return 'TEMPEST_NEWSLETTER_JID invalido (formato: 1203630...@newsletter).';
  if (RESERVED_NAME_RE.test(ch.name)) return 'Nome de canal reservado/enganoso nao permitido (WhatsApp, Meta, Perplexity, "oficial"...).';
  return null;
}
function isOn() { return readState().enabled === true; }
function setEnabled(v) {
  const st = readState();
  st.enabled = !!v;
  st.updatedAt = new Date().toISOString();
  return writeState(st);
}
function status() {
  const ch = getChannel();
  const problem = channelProblem(ch);
  return { enabled: isOn(), channel: ch, problem: problem, usable: !problem };
}
function channelContext() {
  if (!isOn()) return null;
  const ch = getChannel();
  if (channelProblem(ch)) return null;
  return {
    isForwarded: true,
    forwardingScore: 1,
    forwardedNewsletterMessageInfo: { newsletterJid: ch.jid, newsletterName: ch.name, serverMessageId: -1 }
  };
}

function decorate(jid, content, options) {
  if (!content || typeof content !== 'object') return content;
  if (!isOn()) return content;
  if (content.__noVerified || (options && options.noVerified)) return content;
  const skip = ['delete', 'react', 'edit', 'poll', 'sticker', 'forward', 'buttons', 'sections', 'templateButtons', 'interactiveMessage', 'interactiveButtons', 'audio', 'ptt'];
  if (Object.keys(content).some(function (k) { return skip.indexOf(k) !== -1; })) return content;
  if (typeof content.text !== 'string' && !content.image && !content.video && !content.document) return content;
  const ch = getChannel();
  if (channelProblem(ch)) return content;
  const ci = Object.assign({}, content.contextInfo || {}, {
    isForwarded: true,
    forwardingScore: 1,
    forwardedNewsletterMessageInfo: {
      newsletterJid: ch.jid,
      newsletterName: ch.name,
      serverMessageId: -1
    }
  });
  return Object.assign({}, content, { contextInfo: ci });
}

module.exports = { channelContext, setChannel, isOn, setEnabled, status, decorate, getChannel, channelProblem, STATE_FILE };
