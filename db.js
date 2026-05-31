const { Pool } = require("pg");

const pool = new Pool({
    user: "crmuser",
    host: "localhost",
    database: "postgres",
    password: "123456789",
    port: 5432
});

module.exports = pool;