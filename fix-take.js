const fs=require('fs');const f='src/utils/webpExif.js';let s=fs.readFileSync(f,'utf8');
const a="  const len = Buffer.alloc(4); len.writeUInt32LE(json.length, 0);\n  return Buffer.concat([head, len, json]);";
const b="  const out = Buffer.concat([head, json]); out.writeUInt32LE(json.length, 14); // tamanho do JSON vai no offset 14 (formato WhatsApp)\n  return out;";
if(s.includes(b)){console.log('ja aplicado');process.exit(0);}
if(s.split(a).length!==2){console.log('ERRO: ponto nao encontrado');process.exit(1);}
fs.writeFileSync(f,s.replace(a,()=>b));console.log('ok');
