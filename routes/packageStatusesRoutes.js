const express = require('express');
const db = require('../helpers/databases');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Получение всех статусов посылок (доступно всем пользователям)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM package_statuses ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создание нового статуса посылки (только admin)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { value } = req.body;

    try {
        await db.execute('INSERT INTO package_statuses (value) VALUES (?)', [value]);
        res.status(201).json({ message: 'Package status created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновление статуса посылки (только admin)
router.put('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { id } = req.params;
    const { value } = req.body;

    try {
        await db.execute('UPDATE package_statuses SET value = ? WHERE id = ?', [value, id]);
        res.json({ message: 'Package status updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удаление статуса посылки (только admin)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        await db.execute('DELETE FROM package_statuses WHERE id = ?', [id]);
        res.json({ message: 'Package status deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
