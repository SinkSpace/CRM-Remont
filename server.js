const Greenlock = require('greenlock');
const express = require('express');

const app = require('./app');

const greenlock = Greenlock.create({
  server: 'https://acme-v02.api.letsencrypt.org/directory',
  version: 'draft-11',
  
  email: 'stepnoywolk111@gmail.com',
  approveDomains: ['crmsink.ru', 'www.crmsink.ru'],
  agreeTos: true,
  
  configDir: './acme/',
  
  httpsOptions: {

  }
});

greenlock.listen(80, 443, function() {
  console.log('HTTPS сервер запущен на портах 80 и 443');
});

greenlock.serveApp(app);