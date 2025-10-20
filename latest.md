Perfeito. Vou investigar na documentação e repositório do whatsapp-web.js (versão 1.21.0) se houve mudanças recentes que explicam o problema em que, mesmo após escanear o QR code e o WhatsApp indicar que está conectado, o evento ready não é disparado e mensagens não são enviadas. Também irei verificar possíveis problemas com autenticação, sessões ou dependências relacionadas. Já inicio a pesquisa e volto em breve com os achados.

Research completed in 7m· 45 fontes· 50 pesquisas

Falha no Evento 'ready' do whatsapp-web.js Após QR Code

Problema do evento ready no whatsapp-web.js v1.21.0

A biblioteca whatsapp-web.js sofreu várias atualizações desde a v1.21.0. Nos repositórios oficiais foram relatados bugs em que o evento ready ficava preso mesmo após escanear o QR code e autenticar com sucesso. Por exemplo, issue #2458 relata que o QR code funciona mas o evento ready nunca dispara
github.com
, e issue #3183 descreve erro no console (“Cannot read properties of undefined…”) que impede ready de ser chamado
github.com
. Esses sintomas são consistentes: após autenticar o aplicativo móvel, o Node.js não reconhece o cliente como “ready”, bloqueando envios de mensagem. Em muitos casos o erro vem acompanhado de mensagens no Puppeteer ou falha no contexto de execução
github.com
github.com
.

Mudanças recentes e correções conhecidas

Os desenvolvedores identificaram esse bug e lançaram correção em versões posteriores. Um pull request “Fix Event Ready” foi mesclado em v1.33.1 para resolver o ready travado
sourceforge.net
. Membros da comunidade confirmam que atualizar para a v1.33.2 eliminou o problema: por exemplo, um contribuinte comentou “Deu boa com a versão 1.33.2” após aplicar o patch
github.com
github.com
. Em resumo, usar uma versão mais nova do whatsapp-web.js corrige várias falhas conhecidas no disparo do evento ready. Se não for possível atualizar, recomenda-se aplicar o PR de correção (que faz o método interno chamar window.Store.User.getMaybeMeUser() para disparar o evento) ou usar a branch do autor que contém o fix.

Autenticação e sessões persistentes

Ao usar estratégias de sessão persistente (como RemoteAuth com wwebjs-mongo), há detalhes importantes. A documentação oficial alerta que, após linkar o dispositivo, leva cerca de 1 minuto para salvar a sessão remota; portanto o evento ready pode ocorrer antes do armazenamento completo, e deve-se escutar remote_session_saved
wwebjs.dev
. Porém, alguns bugs de wwebjs-mongo já foram reportados: na issue #2667, mesmo com sessão salva no MongoDB, o bot requeria novo QR code porque o método de compressão salvava a pasta “Default” vazia
github.com
. Isso causa exatamente o caso de “conectado no app mas não reconhecido pelo Node”. Recomendações da comunidade incluem atualizar wwebjs-mongo para a versão mais recente ou usar LocalAuth() em vez de RemoteAuth() para testar. Sempre aguarde eventos de sessão remota adequados (como remote_session_loaded) antes de assumir que o cliente está pronto.

Incompatibilidades com Puppeteer e ambiente

Outra fonte de problemas é a incompatibilidade de versões do Puppeteer. A v1.21.0 do whatsapp-web.js inclui o Puppeteer 13.x, que em Node.js modernos (v18+) gera avisos de deprecated. Usuários relataram erro “npm WARN deprecated puppeteer@13.7.0: < 18.1.0 is no longer supported”
github.com
 e falha na instalação. Isso pode impedir o funcionamento correto do navegador headless e do evento ready. A recomendação é garantir que o Puppeteer usado seja compatível: por exemplo, primeiro instalar puppeteer na versão suportada (>=18) e depois reinstalar o whatsapp-web.js, ou usar Node.js 16 LTS. Também vale checar se há erros no console do Chromium (ao usar headless: false) que indiquem falha na injeção de scripts do WhatsApp Web.

Recomendações e soluções

Atualize o whatsapp-web.js: as versões ≥1.33.1 contêm correções para o evento ready
sourceforge.net
. Em especial, a release 1.33.2 já resolve esse bug (cf. comentários de usuários)
github.com
github.com
.

Verifique a estratégia de autenticação: use LocalAuth() ou RemoteAuth() corretamente. Se usar RemoteAuth, escute eventos específicos (remote_session_saved etc) conforme a [documentação oficial]
wwebjs.dev
, garantindo que a sessão esteja carregada antes de enviar mensagens. Considere testar sem persitência (somente LocalAuth) para isolar o problema.

Confirme as versões de Puppeteer: assegure que o Puppeteer instalado é compatível com seu Node. Se aparecer aviso de depreciação (como em #1900
github.com
), instale uma versão atualizada de Puppeteer antes de instalar o whatsapp-web.js.

Revise o código de inicialização: garanta que todos os eventos (qr, authenticated, ready) estejam sendo tratados com client.on('ready', ...) depois de chamar client.initialize(). Erros silenciosos no navegador podem interromper o fluxo; rodar em modo não-headless pode ajudar a depurar.

Em síntese, os relatos do GitHub indicam que esse sintoma era um bug da biblioteca, corrigido em versões recentes
sourceforge.net
github.com
. Seguir as recomendações acima (especialmente atualizar a versão ou aplicar o patch) tem sido suficiente para resolver o caso, conforme a experiência da comunidade.

 

Fontes: Issues e PR do repositório oficial (v1.21.0/v1.33.1) e documentação de RemoteAuth
github.com
sourceforge.net
github.com
wwebjs.dev
github.com
github.com
github.com
.