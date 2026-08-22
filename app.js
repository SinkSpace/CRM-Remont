require('greenlock-express').create({
  server: 'https://acme-v02.api.letsencrypt.org/directory',
  version: 'draft-11',

  email: 'stepnoywolk111@gmail.com',
  approveDomains: ['crmsink.ru', 'www.crmsink.ru'],
  agreeTos: true,

  configDir: './acme/',

  app: require('./app.js')
}).listen(80, 443);