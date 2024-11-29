require('dotenv').config();

const express        = require('express');
const bodyParser     = require('body-parser');
const cors           = require('cors');
const db             = require('./helpers/databases');

// Импорт маршрутов
const userRoutes          = require('./routes/usersRouter');
const packageRoutes       = require('./routes/packagesRouter');
const packageTypeRoutes   = require('./routes/packageTypesRoutes');
const packageStatusRoutes = require('./routes/packageStatusesRoutes');
const facilityRoutes      = require('./routes/facilitiesRoutes');
const statusHistoryRoutes = require('./routes/statusHistoryRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

app.use(cors());
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
app.listen(PORT, HOSTNAME, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
