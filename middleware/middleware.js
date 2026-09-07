const path = require('path');
const cors = require('cors');
const express = require('express');

function configureMiddleware(app) {
    app.use(express.static(path.join(__dirname, '..', 'public')));
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use((req, res, next) => {
        res.status(404).send('Страница не найдена');
    });
}

module.exports = { configureMiddleware };