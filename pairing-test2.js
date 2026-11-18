const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
(async () => {
  const { state, saveCreds } = await useMultiFileAuthState('pairing-test-session2');
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch (e) { console.log('[T] sem fetch de versão:', e.message); }
  console.log('[T] versão WA:', version);
  const sock = makeWASocket({
    auth: state, version,
    logger: pino({ level: 'debug' }, pino.destination('pairing-test.log')),
    browser: Browsers.windows('Chrome'),
    printQRInTerminal: false
  });
  sock.ev.on('creds.update', saveCreds);
  let asked = false;
  sock.ev.on('connection.update', async (u) => {
    console.log('[T]', JSON.stringify({ c: u.connection, qr: !!u.qr, msg: u.lastDisconnect?.error?.message, status: u.lastDisconnect?.error?.output?.statusCode }));
    if (u.qr && !asked) {
      asked = true;
      try { console.log('\n[T] CÓDIGO:', await sock.requestPairingCode('258880465671'), '\n'); }
      catch (e) { console.log('[T] ERRO:', e.message, e.output?.statusCode); }
    }
  });
})();
