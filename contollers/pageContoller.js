const path = require('path');

/******** СТРАНИЦЫ *********/
const getIndex = (req, res) => { //Главная страница
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
};

const getRegister = (req, res) => { //Регистрация
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
};

const getJoin = (req, res) => { //Вход
    res.sendFile(path.join(__dirname, 'public', 'join.html'));
};

const getLogs = (req, res) => { //Логи
    res.sendFile(path.join(__dirname, 'public', 'logs.html'));
};

const getSettings = (req, res) => { //Настройки
    res.sendFile(path.join(__dirname, 'public', 'settings.html'))
};

const getAdmin = (req, res) => { //Админ-панель
    res.sendFile(path.join(__dirname, 'public', 'admin.html'))
};

const getArchive = (req, res) => { //Архив
    res.sendFile(path.join(__dirname, 'public', 'archive.html'))
};

const getStart = (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'start.html'))
};

const getStatistic = (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'statistic.html'))
};

module.exports = { getIndex, getRegister, getJoin, getLogs, getSettings, getAdmin, getArchive, getStart, getStatistic };