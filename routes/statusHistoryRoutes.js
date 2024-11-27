const express = require('express');
const db = require('../helpers/databases');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Получение истории статусов посылок (user может видеть только свои посылки)
router.get('/', authMiddleware, async (req, res) => {
    try {
        let query = `
            SELECT sh.*, ps.value as status_value, f.name as facility_name 
            FROM status_history sh
            JOIN package_statuses ps ON sh.status_id = ps.id
            JOIN facilities f ON sh.facility_id = f.id
        `;
        let params = [];

        if (req.user.role === 'user') {
            query += ' WHERE sh.tracking_number IN (SELECT tracking_number FROM packages WHERE sender_id = ? OR receiver_id = ?)';
            params.push(req.user.id, req.user.id);
        }

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Добавление записи в историю статусов (sorter, admin)
router.post('/', authMiddleware, roleMiddleware('sorter'), async (req, res) => {
    const { tracking_number, status_id, facility_id } = req.body;

    try {
        const [result] = await db.execute(
            'INSERT INTO status_history (tracking_number, status_id, facility_id, recorded_at) VALUES (?, ?, ?, NOW())',
            [tracking_number, status_id, facility_id]
        );
        res.status(201).json({ message: 'Status history record added successfully', status_history_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновление записи в истории (только admin)
router.put('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { id } = req.params;
    const { tracking_number, status_id, facility_id } = req.body;

    try {
        await db.execute(
            `UPDATE status_history SET tracking_number = ?, status_id = ?, facility_id = ? WHERE id = ?`,
            [tracking_number, status_id, facility_id, id]
        );

        res.json({ message: 'Status history record updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удаление записи из истории (только admin)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        await db.execute('DELETE FROM status_history WHERE id = ?', [id]);
        res.json({ message: 'Status history record deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
