const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // required for Neon's self‑signed certificate
    },
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
