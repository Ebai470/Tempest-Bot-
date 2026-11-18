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

// POST multipart/form-data (campos de texto + um ficheiro)
function postMultipart(url, fields, file, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (e) { return reject(new Error('url invalida')); }
    const lib = u.protocol === 'http:' ? http : https;
    const boundary = '----tp' + Math.random().toString(16).slice(2) + Date.now().toString(16);
    const parts = [];
    Object.keys(fields || {}).forEach((k) => parts.push(Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="' + k + '"\r\n\r\n' + fields[k] + '\r\n')));
    if (file) {
      parts.push(Buffer.from('--' + boundary + '\r\nContent-Disposition: form-data; name="' + (file.field || 'file') + '"; filename="' + file.name + '"\r\nContent-Type: ' + (file.type || 'application/octet-stream') + '\r\n\r\n'));
      parts.push(file.buf);
      parts.push(Buffer.from('\r\n'));
    }
    parts.push(Buffer.from('--' + boundary + '--\r\n'));
    const body = Buffer.concat(parts);
    const req = lib.request({
      hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, method: 'POST',
      headers: Object.assign({ 'User-Agent': UA, 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': body.length }, headers || {}),
      timeout: timeoutMs || 45000
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { get, postMultipart, UA };
