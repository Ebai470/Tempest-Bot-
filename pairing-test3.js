const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
let asked = false;
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('pairing-test-session2');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    auth: state, version,
    logger: pino({ level: 'debug' }, pino.destination('pairing-test.log')),
    browser: Browsers.windows('Chrome'),
    printQRInTerminal: false
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    const status = u.lastDisconnect?.error?.output?.statusCode;
    console.log('[T]', JSON.stringify({ c: u.connection, qr: !!u.qr, status }));
    if (u.qr && !asked && !state.creds.registered) {
      asked = true;
      try { console.log('\n[T] CÓDIGO:', await sock.requestPairingCode('258880465671'), '\n'); }
      catch (e) { console.log('[T] ERRO:', e.message, e.output?.statusCode); }
    }
    if (u.connection === 'close') {
      if (status === DisconnectReason.restartRequired) { console.log('[T] reiniciando (515 normal)...'); start(); }
      else { console.log('[T] fechou, status', status); process.exit(1); }
    }
    if (u.connection === 'open') {
      console.log('\n[T] ✅ CONECTADO como', sock.user?.id, '\n');
      setTimeout(() => process.exit(0), 5000);
    }
  });
}
start();
