const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const NUMERO = '258880465671';

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('./session-tempest');
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); }
  catch (e) { console.log('Falha ao buscar versao:', e.message); }
  console.log('Versao WA:', version);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false
  });
  sock.ev.on('creds.update', saveCreds);

  let pedido = false;
  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr && !pedido && !state.creds.registered) {
      pedido = true;
      try {
        const code = await sock.requestPairingCode(NUMERO);
        console.log('\n=== CODIGO DE PAREAMENTO: ' + code + ' ===\n');
      } catch (e) { console.log('Erro ao pedir codigo:', e.message); }
    }
    if (connection === 'open') {
      console.log('CONECTADO COM SUCESSO!');
      setTimeout(() => process.exit(0), 3000);
    }
    if (connection === 'close') {
      const status = lastDisconnect?.error?.output?.statusCode;
      console.log('Conexao fechada. Status:', status);
      if (status !== 401 && status !== DisconnectReason.loggedOut) start();
      else process.exit(1);
    }
  });
}
start();
