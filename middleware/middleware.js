const express = require('express');
const app = express();

function middle() {
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(cors());
    app.use(express.json());
}

module.exports = { middle };