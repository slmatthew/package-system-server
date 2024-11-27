const express = require('express');
const db = require('../helpers/databases');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Получение списка всех посылок (admin только)
router.get('/', authMiddleware, roleMiddleware('sorter'), async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM packages WHERE is_deleted = 0');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение посылок текущего пользователя (user)
router.get('/my', authMiddleware, async (req, res) => {
    const { status } = req.query;

    try {
        const [rows] = await db.execute('SELECT * FROM packages WHERE (sender_id = ? OR receiver_id = ?) AND is_deleted = 0', [req.user.id, req.user.id]);
        let filteredRows = rows;

        if(status) {
            filteredRows = rows.filter(row => row.status === status);
        }

        const result = { rows: filteredRows };
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создание новой посылки (user, sorter, admin)
router.post('/', authMiddleware, async (req, res) => {
    const {
        tracking_number, sender_id, receiver_id, type_id,
        size_width, size_length, size_weight, cost
    } = req.body;

    try {
        await db.execute(
            `INSERT INTO packages 
            (tracking_number, sender_id, receiver_id, type_id, created_at, updated_at, size_width, size_length, size_weight, cost) 
            VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?)`,
            [tracking_number, sender_id, receiver_id, type_id, size_width, size_length, size_weight, cost]
        );
        res.status(201).json({ message: 'Package created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновление информации о посылке (только admin, sorter)
router.put('/:tracking_number', authMiddleware, roleMiddleware('sorter'), async (req, res) => {
    const { tracking_number } = req.params;
    const updates = req.body;

    try {
        const updateKeys = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const updateValues = Object.values(updates);

        await db.execute(
            `UPDATE packages SET ${updateKeys}, updated_at = NOW() WHERE tracking_number = ?`,
            [...updateValues, tracking_number]
        );

        res.json({ message: 'Package updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удаление посылки (только admin)
router.delete('/:tracking_number', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { tracking_number } = req.params;
    try {
        await db.execute('UPDATE packages SET is_deleted = 1 WHERE tracking_number = ?', [tracking_number]);
        res.json({ message: 'Package deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
