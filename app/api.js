const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = 3000;

let conn;

(async () => {
    conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: 'povRate'
    });
    console.log('Database connected');
})();

app.use(express.static('public'));

app.get('/api/poverty', async (req, res) => {
    const year = req.query.year;

    const column = `YR${year}`;
    const validYears = ['2019', '2020', '2021', '2022', '2023'];

    if (!validYears.includes(year)) {
        return res.status(400).json({ error: 'Invalid year' });
    }

    const [rows] = await conn.query(`
        SELECT country_name, country_code, ${column}
        FROM pov_2`);

    res.json(rows.map(row => ({
        name: row.country_name,
        code: row.country_code,
        rate: row[column] !== null ? row[column] : null
    }
)));
});


app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
