process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const axios = require("axios");
const qs = require("qs");
const { v4: uuidv4 } = require("uuid");
const { env } = require('process');
const select = require('../models/selectAIModels');

dotenv.config();

app.use(express.static("public"));

const OAUTH_URL =
  "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";

const CHAT_URL =
  "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

async function getToken() {
  const data = qs.stringify({
    scope: "GIGACHAT_API_PERS",
  });

  const res = await axios({
    method: "post",
    url: OAUTH_URL,
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

    const finalPrompt = message;

    const res = await axios({
        method: 'post',
        url: CHAT_URL,
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
                    content: finalPrompt,
                },
            ],
            profanity_check: true,
        },
    });

    return res.data;
}

const chat = async (req, res) => {
  try {
    const { message } = req.body;

    const token = await getToken();
    const response = await chat(token, message);

    const text =
      response?.choices?.[0]?.message?.content || response;

    res.json({ text });
  } catch (err) {
    console.log("ERROR STATUS:", err.response?.status);
    console.log("ERROR DATA:", err.response?.data);

    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
};

const settings = async (req, res) => {
    try {
        const result = select();

        res.json(result.rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { chat, settings };