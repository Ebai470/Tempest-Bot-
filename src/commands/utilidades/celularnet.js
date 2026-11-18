'use strict';
/**
 * TESTE DE REDE DO MINI CELULAR — mostra o que a mensagem interativa do WhatsApp permite
 * (internet, imagens externas, molduras, WebSocket, links, armazenamento, ponte e tamanho da tela).
 * Crédito da estrutura da mensagem: TIO INO. Comando novo e isolado: !celularnet [https://seu-servidor]
 */
const crypto = require('crypto');

function montarMensagem(html, responseId, titulo) {
  const payload = {
    response_id: responseId,
    sections: [{ view_model: { primitive: { text: '> ' + titulo, __typename: 'GenAIMarkdownTextUXPrimitive' }, __typename: 'GenAISingleLayoutViewModel' } }],
    embedded_screens: [{ title: titulo, content: [{ __typename: 'FOAIDNixelButtonSheets', tabs: [{ id: 'tab_0', tab_header: titulo, sections: [{ __typename: 'GenAIUnifiedResponseSection', view_model: { __typename: 'GenAISingleLayoutViewModel', primitive: { __typename: 'GenAIaeacdsnwHtmlPrimitive', payload: html } } }] }] }] }]
  };
  return {
    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
    botForwardedMessage: { message: { richResponseMessage: {
      messageType: 1,
      submessages: [{ messageType: 2, messageText: titulo }],
      unifiedResponse: { data: Buffer.from(JSON.stringify(payload)).toString('base64') },
      contextInfo: { forwardingScore: 1, isForwarded: true, forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' }, forwardOrigin: 4 }
    } } }
  };
}

const PAGE = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>'
  + '*{box-sizing:border-box}html,body{margin:0;background:#0b0b0f;color:#fff;font:13px/1.4 -apple-system,Roboto,Arial,sans-serif}'
  + '#w{height:400px;overflow:auto;padding:10px}h3{margin:0 0 6px;font-size:15px}'
  + '.r{display:flex;gap:8px;padding:6px 8px;margin:4px 0;background:#1c1c1e;border-radius:10px}.r b{min-width:22px}.r span{flex:1;word-break:break-word}.r small{opacity:.6;display:block}'
  + '.f{height:130px;border-radius:10px;overflow:hidden;background:#2a2a2e;margin:4px 0 8px}.f iframe{width:100%;height:100%;border:0}a{color:#0a84ff}'
  + '</style></head><body><div id="w"><h3>🔎 Teste de rede do mini celular</h3><div id="o"></div>'
  + '<div class="r"><b>▶️</b><span>Moldura do YouTube<small>Se aparecer o player do vídeo = ✅. Se ficar cinza ou vazio = ❌</small></span></div><div class="f"><iframe id="y" allow="autoplay; encrypted-media; fullscreen"></iframe></div>'
  + '<div class="r"><b>🌐</b><span>Moldura de um site<small>Se aparecer a página = ✅. Cinza, vazio ou erro = ❌</small></span></div><div class="f"><iframe id="s"></iframe></div>'
  + '<div class="r"><b>🔗</b><span>Link para abrir o WhatsApp com um comando pronto<small><a href="https://wa.me/?text=%21ping" target="_blank" rel="noopener">Toque aqui</a> — abriu o WhatsApp com “!ping” escrito? = ✅</small></span></div>'
  + '<div class="r"><b>📸</b><span>Mande uma captura desta tela para o desenvolvedor.</span></div></div>'
  + '<script>(function(){var o=document.getElementById("o");function row(k,t){var d=document.createElement("div");d.className="r";d.innerHTML="<b>⏳</b><span>"+t+"<small></small></span>";o.appendChild(d);return function(ok,m){d.firstChild.textContent=ok?"✅":"❌";d.querySelector("small").textContent=m||""}}'
  + 'function to(ms,fn){var done=0,t=setTimeout(function(){if(!done){done=1;fn(0,"sem resposta em "+ms/1000+"s")}},ms);return function(ok,m){if(done)return;done=1;clearTimeout(t);fn(ok,m)}}'
  + 'var a=row(0,"Tela");a(1,innerWidth+" x "+innerHeight+" px • escala "+(window.devicePixelRatio||1));'
  + 'var b=row(0,"Armazenamento (localStorage)");try{localStorage.setItem("t","1");b(localStorage.getItem("t")==="1","grava e lê")}catch(e){b(0,String(e).slice(0,60))}'
  + 'var c=row(0,"Internet (pedido simples)"),c2=to(9000,c);try{fetch("https://www.gstatic.com/generate_204",{mode:"no-cors"}).then(function(){c2(1,"o pedido saiu e voltou")}).catch(function(e){c2(0,String(e).slice(0,60))})}catch(e){c2(0,String(e).slice(0,60))}'
  + 'var d=row(0,"Internet com resposta legível"),d2=to(9000,d);try{fetch("https://api.github.com/zen").then(function(r){return r.text()}).then(function(t){d2(1,"recebeu: "+t.slice(0,40))}).catch(function(e){d2(0,String(e).slice(0,60))})}catch(e){d2(0,String(e).slice(0,60))}'
  + 'var e=row(0,"Imagem de site externo"),e2=to(9000,e),im=new Image();im.onload=function(){e2(1,"carregou")};im.onerror=function(){e2(0,"bloqueada ou sem rede")};im.src="https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg";'
  + 'var g=row(0,"WebSocket"),g2=to(9000,g);try{var ws=new WebSocket("wss://ws.postman-echo.com/raw");ws.onopen=function(){g2(1,"conectou");ws.close()};ws.onerror=function(){g2(0,"erro de conexão")}}catch(e){g2(0,String(e).slice(0,60))}'
  + 'if(window.TESTURL){var h=row(0,"Seu servidor: "+window.TESTURL.replace(/^https:\\/\\//,"")),h2=to(10000,h);try{fetch(window.TESTURL+"/ping").then(function(r){return r.text()}).then(function(t){h2(1,"respondeu: "+t.slice(0,40))}).catch(function(e){h2(0,String(e).slice(0,60))})}catch(e){h2(0,String(e).slice(0,60))}}'
  + 'var p1=row(0,"Moldura da página (parent)");p1(1,(window.parent!==window?"a página está dentro de uma moldura":"página principal")+(window.opener?" • tem opener":""));'
  + 'var br=row(0,"Funções extras da página (ponte com o WhatsApp)");try{var fr=document.createElement("iframe");fr.style.display="none";document.body.appendChild(fr);var base=Object.getOwnPropertyNames(fr.contentWindow),all=Object.getOwnPropertyNames(window);document.body.removeChild(fr);var skip=/^(\\d+|TESTURL|prompt|postMessage|onmessage|onmessageerror|MessageEvent|MessageChannel|MessagePort|webkit\\w*|WebKit\\w*|onwebkit\\w*)$/,pat=/(bridge|Bridge|^Android|^iOS|^IOS|^ReactNative|^Flutter|[Nn]ixel|[Ww]hatsApp|^WAInterface|^MetaAI|^sendPrompt|^postToChat)/;var found=all.filter(function(k){var v;if(skip.test(k))return false;try{v=window[k]}catch(e){return false}if(v instanceof Element)return false;return base.indexOf(k)<0||pat.test(k)});br(found.length>0,found.slice(0,12).join(", ")||"nenhuma")}catch(e){br(0,String(e).slice(0,60))}'
  + 'document.getElementById("y").src="https://www.youtube.com/embed/jNQXAC9IVRw?playsinline=1";document.getElementById("s").src="https://example.com/";'
  + '})();</script></body></html>';

module.exports = [{
  name: 'celularnet', aliases: ['testerede', 'celnet'], category: 'utilidades', hideFromMenu: true,
  description: 'Teste do que a mensagem interativa do WhatsApp permite (internet, molduras, links, ponte)', usage: '!celularnet [https://seu-servidor]',
  handler: async (ctx) => {
    try {
      let html = PAGE;
      const u = String((ctx.args && ctx.args[0]) || '').trim();
      if (/^https:\/\/[^\s"'<>\\]+$/.test(u)) html = html.replace('<script>(function(){', () => '<script>window.TESTURL=' + JSON.stringify(u.replace(/\/+$/, '')).replace(/</g, '\\u003c') + ';(function(){');
      await ctx.sock.relayMessage(ctx.jid, montarMensagem(html, 'teste-rede-' + crypto.randomUUID(), '🔎 TESTE DE REDE'), {});
    } catch (e) {
      console.error('[CELULARNET]', e && e.message);
      await ctx.reply('❌ Não consegui abrir o teste: ' + (e && e.message));
    }
  }
}];
