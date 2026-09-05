const pool = require('../db');

async function buildTemplateData(company_id, order_id) {
    const orderResult = await pool.query(
        `SELECT *
         FROM orders
         WHERE id = $1 AND company_id = $2`,
        [order_id, company_id]
    );

    const order = orderResult.rows[0];
    if (!order) {
        throw new Error('Заказ не найден');
    }

    const profileResult = await pool.query(
        `SELECT display_name, shop_name, city, address, phone
         FROM user_profiles
         WHERE company_id = $1
         ORDER BY id ASC
         LIMIT 1`,
        [company_id]
    );

    const profile = profileResult.rows[0] || {};

    const warrantyDays = 30;
    const warrantyEnd = order.acceptdate ? addDays(order.acceptdate, warrantyDays) : null;

    return {
        ШтрихкодДокумента: String(order.id),
        НазваниеКомпании: profile.display_name || '',
        ЮрНаименованиеКомпании: profile.shop_name || profile.display_name || '',
        ГородРасположенияКомпании: profile.city || '',
        АдресКомпании: profile.address || '',
        РежимРаботы: '',
        ТелефонКомпании: profile.phone || '',

        НомерДокумента: order.id,
        ДатаДокумента: formatDate(order.acceptdate || order.acceptDate),
        ДатаВыдачи: formatDate(order.acceptdate || order.acceptDate),

        ФиоЗаказчика: order.customer || '',
        КонтактыЗаказчика: order.phone || '',
        Устройство: order.device || '',
        МодельУстройства: order.model || '',
        СерийныйНомерУстройства: order.sn || order.SN || '',
        ОписаниеНеисправности: order.crush || '',
        ВыполненнаяРабота: order.note || '',
        ФиоИсполнителя: order.worker || '',

        ИтоговаяСтоимость: formatMoney(order.price),
        ПримернаяСтоимостьРемонта: formatMoney(order.price),
        Предоплата: formatMoney(order.pre),
        СрокРемонта: `${order.deadline || 0} дней`,
        ДатаОкончанияРемонта: formatDate(addDays(new Date(), Number(order.deadline) || 0)),
        ДатаОкончанияГарантии: formatDate(warrantyEnd),
        СрокГарантии: `${warrantyDays} дней`,
        ГарантийныеОбязательства: true,

        КомплектацияУстройства: '',
        Примечание: order.note || ''
    };
}

function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d)) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

function formatMoney(value) {
    const num = Number(value);
    if (!num) return '0';
    return String(num);
}

function addDays(dateValue, days) {
    const d = new Date(dateValue);
    if (isNaN(d)) return '';
    d.setDate(d.getDate() + days);
    return d;
}

module.exports = buildTemplateData;