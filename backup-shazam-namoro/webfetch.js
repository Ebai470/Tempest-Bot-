'use strict';
// GET simples (https/http) com redirecionamentos, limite de tamanho e timeout.
const https = require('https');
const http = require('http');
const { URL } = require('url');

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

function get(url, headers, maxBytes, redirects) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (e) { return reject(new Error('url invalida')); }
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get({
      hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search,
      headers: Object.assign({ 'User-Agent': UA, 'Accept-Encoding': 'identity' }, headers || {}), timeout: 20000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (redirects || 0) < 4) {
        res.resume();
        return resolve(get(new URL(res.headers.location, url).toString(), headers, maxBytes, (redirects || 0) + 1));
      }
      const chunks = []; let n = 0; const cap = maxBytes || 25 * 1024 * 1024;
      res.on('data', (c) => { n += c.length; if (n > cap) { req.destroy(new Error('ficheiro demasiado grande')); return; } chunks.push(c); });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

module.exports = { get, UA };
