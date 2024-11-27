require('dotenv').config();

const express        = require('express');
const bodyParser     = require('body-parser');
const db             = require('./db');

const authMiddleware = require('./middlewares/authMiddleware');
const roleMiddleware = require('./middlewares/roleMiddleware');

// Импорт маршрутов
const userRoutes          = require('./routes/userRoutes');
const packageRoutes       = require('./routes/packageRoutes');
const packageTypeRoutes   = require('./routes/packageTypeRoutes');
const packageStatusRoutes = require('./routes/packageStatusRoutes');
const facilityRoutes      = require('./routes/facilityRoutes');
const statusHistoryRoutes = require('./routes/statusHistoryRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(bodyParser.json());

// Тест соединения с базой данных
db.getConnection((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Connected to the database');
    }
});

// Маршруты
app.use('/api/users', userRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/package-types', packageTypeRoutes);
app.use('/api/package-statuses', packageStatusRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/status-history', statusHistoryRoutes);

// Обработка ошибок для несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});