const pool = require('../db');

async function registrationEnabled(data) {
    const client = await pool.connect(); 
    try {
        const result = await client.query(
            'SELECT registration_enabled FROM system_settings WHERE id = 1'
        );
        return result;
    } finally {
        client.release();
    }
}

module.exports = { registrationEnabled };