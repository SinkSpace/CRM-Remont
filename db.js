const { Pool } = require("pg");

const pool = new Pool({
    user: "server",
    host: "localhost",
    database: "crm",
    password: "1234",
    port: 5432
});

module.exports = pool;