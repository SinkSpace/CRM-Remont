const axios = require('axios');
const https = require('https');
const fs = require('fs');
const qs = require('qs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const select = require('../models/selectAIModels');

dotenv.config();

let httpsAgent;
try {
    const certPath = path.join(__dirname, '..', 'gigachat-cert.pem');
    if (fs.existsSync(certPath)) {
        httpsAgent = new https.Agent({
            ca: fs.readFileSync(certPath)
        });
        console.log('Сертификат загружен:', certPath);
    } else {
        console.warn('Сертификат не найден, используется rejectUnauthorized: false');
        httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });
    }
} catch (error) {
    console.warn('Ошибка загрузки сертификата:', error.message);
    httpsAgent = new https.Agent({
        rejectUnauthorized: false
    });
}

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const CHAT_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

async function getToken() {
    const data = qs.stringify({
        scope: "GIGACHAT_API_PERS",
    });

    const res = await axios({
        method: "post",
        url: OAUTH_URL,
        httpsAgent: httpsAgent,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            RqUID: uuidv4(),
            Authorization: `Basic ${process.env.GIGA_CHAT_CREDENTIALS}`,
        },
        data,
    });

    return res.data.access_token;
}

async function chat(token, message) {
    const settingsResult = await select();
    const settings = settingsResult.rows[0] || {};

    if (settings.ai_enabled === false) {
        throw new Error('ИИ отключён администратором');
    }

    const res = await axios({
        method: 'post',
        url: CHAT_URL,
        httpsAgent: httpsAgent,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        data: {
            model: settings.ai_model || 'GigaChat-2',
            messages: [
                {
                    role: 'user',
                    content: message,
                },
            ],
            profanity_check: true,
        },
    });

    return res.data;
}

const query = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message обязателен' });
        }

        const token = await getToken();
        const response = await chat(token, message);

        const text = response?.choices?.[0]?.message?.content || response;

        res.json({ text });
    } catch (err) {
        console.log("ERROR STATUS:", err.response?.status);
        console.log("ERROR DATA:", JSON.stringify(err.response?.data || {}, null, 2));
        console.log("ERROR MESSAGE:", err.message);

        res.status(500).json({
            error: err.response?.data?.error || err.message,
        });
    }
};

const settings = async (req, res) => {
    try {
        const result = await select();
        res.json(result.rows[0] || {});
    } catch (error) {
        console.error('Ошибка загрузки настроек ИИ:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { query, settings };