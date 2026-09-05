const pool = require('../db');

async function dayCoalesce(data) {
    const { company_id, date } = data;
    return await pool.query(
        `SELECT COALESCE(SUM(price), 0) AS income
            FROM orders
            WHERE company_id = $1 AND DATE(created_at) = $2`, 
        [company_id, date]);
}

async function monthCoalesce(data) {
    const { company_id, date } = data;
    return await pool.query(
        `SELECT COALESCE(SUM(price), 0) AS income
            FROM orders
            WHERE company_id = $1 
            AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $2::date)`, 
        [company_id, date]);
}

module.exports = { dayCoalesce, monthCoalesce, };