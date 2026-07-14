require('dotenv').config();

const app = require('./app');
const db = require('./config/db');

const PORT = Number(process.env.PORT || 5000);

async function start() {
    try {
        await db.testConnection();
        app.listen(PORT, () => {
            console.log(`MeetSpace API running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server due to database initialization error.');
        console.error(error.message);
        process.exit(1);
    }
}

start();