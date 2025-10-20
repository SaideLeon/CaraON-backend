Responses
Curl

curl -X 'POST' \
  'https://app.caraon.qzz.io/api/v1/knowledge/upload-pdf/687d6b9e14ab6c1c2623ae4a/688bd4b9516de24d08819190' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODdkNmI5ZTE0YWI2YzFjMjYyM2FlNGEiLCJpYXQiOjE3NjA5NzA2NTJ9._4lkMiL6eC7lJe8k0lNu35rIVhERLc5WQRTdgp4fnJc' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@Manual de Fiscalidade.pdf;type=application/pdf'
Request URL
https://app.caraon.qzz.io/api/v1/knowledge/upload-pdf/687d6b9e14ab6c1c2623ae4a/688bd4b9516de24d08819190
Server response
Code	Details
400	
Error: response status is 400

Response body
Download
{
  "error": "Falha ao enviar PDF para Ariac.",
  "details": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\">\n  <title>Page not found at /apiknowledge/upload-pdf/687d6b9e14ab6c1c2623ae4a/688bd562516de24d08819196</title>\n  <meta name=\"robots\" content=\"NONE,NOARCHIVE\">\n  <style>\n    html * { padding:0; margin:0; }\n    body * { padding:10px 20px; }\n    body * * { padding:0; }\n    body { font-family: sans-serif; background:#eee; color:#000; }\n    body > :where(header, main, footer) { border-bottom:1px solid #ddd; }\n    h1 { font-weight:normal; margin-bottom:.4em; }\n    h1 small { font-size:60%; color:#666; font-weight:normal; }\n    table { border:none; border-collapse: collapse; width:100%; }\n    td, th { vertical-align:top; padding:2px 3px; }\n    th { width:12em; text-align:right; color:#666; padding-right:.5em; }\n    #info { background:#f6f6f6; }\n    #info ol { margin: 0.5em 4em; }\n    #info ol li { font-family: monospace; }\n    #summary { background: #ffc; }\n    #explanation { background:#eee; border-bottom: 0px none; }\n    pre.exception_value { font-family: sans-serif; color: #575757; font-size: 1.5em; margin: 10px 0 10px 0; }\n  </style>\n</head>\n<body>\n  <header id=\"summary\">\n    <h1>Page not found <small>(404)</small></h1>\n    \n    <table class=\"meta\">\n      <tr>\n        <th scope=\"row\">Request Method:</th>\n        <td>POST</td>\n      </tr>\n      <tr>\n        <th scope=\"row\">Request URL:</th>\n        <td>http://agent.cognick.qzz.io/apiknowledge/upload-pdf/687d6b9e14ab6c1c2623ae4a/688bd562516de24d08819196</td>\n      </tr>\n      \n    </table>\n  </header>\n\n  <main id=\"info\">\n    \n      <p>\n      Using the URLconf defined in <code>django_agno_api.urls</code>,\n      Django tried these URL patterns, in this order:\n      </p>\n      <ol>\n        \n          <li>\n            \n              <code>\n                admin/\n                \n              </code>\n            \n          </li>\n        \n          <li>\n            \n              <code>\n                api/\n                \n              </code>\n            \n          </li>\n        \n          <li>\n            \n              <code>\n                \n                [name='landing-page']\n              </code>\n            \n          </li>\n        \n          <li>\n            \n              <code>\n                playground\n                [name='playground']\n              </code>\n            \n          </li>\n        \n          <li>\n            \n              <code>\n                health\n                [name='health-check']\n              </code>\n            \n          </li>\n        \n          <li>\n            \n              <code>\n                api/schema/\n                [name='schema']\n              </code>\n            \n          </li>\n        \n          <li>\n            \n              <code>\n                api/docs/\n                [name='swagger-ui']\n              </code>\n            \n          </li>\n        \n      </ol>\n      <p>\n        \n          The current path, <code>apiknowledge/upload-pdf/687d6b9e14ab6c1c2623ae4a/688bd562516de24d08819196</code>,\n        \n        didn’t match any of these.\n      </p>\n    \n  </main>\n\n  <footer id=\"explanation\">\n    <p>\n      You’re seeing this error because you have <code>DEBUG = True</code> in\n      your Django settings file. Change that to <code>False</code>, and Django\n      will display a standard 404 page.\n    </p>\n  </footer>\n</body>\n</html>\n"
}
Response headers
 access-control-allow-origin: * 
 alt-svc: h3=":443"; ma=86400 
 cf-cache-status: DYNAMIC 
 cf-ray: 99193c988e72a49d-LHR 
 content-length: 3613 
 content-type: application/json; charset=utf-8 
 date: Mon,20 Oct 2025 14:34:37 GMT 
 etag: W/"e1d-3KKvJ6fKlAvfFSN0E4B4A55PPRk" 
 nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800} 
 priority: u=1,i 
 report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=hVTJoBiPKfKUbIxu0B6VVaDlfiWGjfkBSMZGOCwH5ucd%2BSvc%2FJ8a83f5%2FWdXEZlrCS6v6uOSwQetwbMlyV8Kzc6a3%2FnD%2BvTITqsokJ%2Fv6lZj"}]} 
 server: cloudflare 
 server-timing: cfExtPri 
 x-powered-by: Express 
Responses
Code	Description	Links
200	
PDF enviado com sucesso.

No links
400	
Nenhum arquivo enviado.

No links
401	
Não autorizado.

No links
500	
Falha ao enviar o PDF.
