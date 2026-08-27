const https = require('https');
const http = require('http');
const fs = require('fs');
const app = require('./app');

const domain = 'crmsink.ru';
const options = {
  key: fs.readFileSync(`/etc/letsencrypt/live/${domain}/privkey.pem`),
  cert: fs.readFileSync(`/etc/letsencrypt/live/${domain}/fullchain.pem`)
};

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS запущен на порту 443');
});

http.createServer((req, res) => {
  res.writeHead(301, { 
    Location: 'https://' + req.headers.host + req.url 
  });
  res.end();
}).listen(80, () => {
  console.log('HTTP перенаправляет на HTTPS');
});