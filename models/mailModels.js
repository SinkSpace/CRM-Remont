const nodemailer = require('nodemailer');

const mailer = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true,
    family: 4,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    auth: {
        user: process.env.email,
        pass: process.env.passemail
    }
});

async function sendRegisterEmail(data) {
    const { email, displayName } = data;
    return await mailer.sendMail({
        from: `"CRM-Sink" <${process.env.email}>`,
        to: email,
        subject: 'Регистрация завершена',
        text: `Здравствуйте, ${displayName}! Ваш аккаунт успешно зарегистрирован в CRM-Sink.`
    });
}

module.exports = { sendRegisterEmail };