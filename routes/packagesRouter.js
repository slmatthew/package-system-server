const express = require('express');
const db = require('../helpers/databases');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Получение списка всех посылок (admin только)
// router.get('/', authMiddleware, roleMiddleware('sorter'), async (req, res) => {
//     try {
//         const [rows] = await db.execute('SELECT * FROM packages WHERE is_deleted = 0');
//         res.json({ result: rows });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });

router.get('/', authMiddleware, roleMiddleware('sorter'), async (req, res) => {
    const { search, type } = req.query;

    try {
        const query = `
            SELECT 
                p.*,
                pt.value AS package_type,
                CONCAT(sender.first_name, ' ', sender.last_name) AS sender_name,
                CONCAT(receiver.first_name, ' ', receiver.last_name) AS receiver_name,
                (SELECT ps.value 
                FROM status_history sh
                LEFT JOIN package_statuses ps ON sh.status_id = ps.id
                WHERE sh.tracking_number = p.tracking_number
                ORDER BY sh.recorded_at DESC
                LIMIT 1) AS last_status,
                (SELECT sh.recorded_at 
                FROM status_history sh
                WHERE sh.tracking_number = p.tracking_number
                ORDER BY sh.recorded_at DESC
                LIMIT 1) AS last_status_date,
                (SELECT sh.status_id 
                FROM status_history sh
                WHERE sh.tracking_number = p.tracking_number
                ORDER BY sh.recorded_at DESC
                LIMIT 1) AS last_status_id
            FROM packages p
            LEFT JOIN users sender ON p.sender_id = sender.id
            LEFT JOIN users receiver ON p.receiver_id = receiver.id
            LEFT JOIN package_types pt ON p.type_id = pt.id
            ORDER BY created_at DESC
        `;

        const [rows] = await db.execute(query, []);

        // Фильтрация по статусу, если статус указан в запросе
        let filteredRows = rows;
        if (search) {
            filteredRows = filteredRows.filter(row => {
                return row.tracking_number === search ||
                       row.sender_name === search ||
                       row.receiver_name === search;
            });
        }

        if(type) {
            filteredRows = filteredRows.filter(row => row.type_id === type);
        }

        res.json({ result: filteredRows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение посылок текущего пользователя (user)
router.get('/my', authMiddleware, async (req, res) => {
    const { status } = req.query;

    try {
        const query = `
            SELECT 
                p.*,
                pt.value AS package_type,
                CONCAT(sender.first_name, ' ', sender.last_name) AS sender_name,
                CONCAT(receiver.first_name, ' ', receiver.last_name) AS receiver_name,
                (SELECT ps.value 
                FROM status_history sh
                LEFT JOIN package_statuses ps ON sh.status_id = ps.id
                WHERE sh.tracking_number = p.tracking_number
                ORDER BY sh.recorded_at DESC
                LIMIT 1) AS last_status,
                (SELECT sh.recorded_at 
                FROM status_history sh
                WHERE sh.tracking_number = p.tracking_number
                ORDER BY sh.recorded_at DESC
                LIMIT 1) AS last_status_date,
                (SELECT sh.status_id 
                FROM status_history sh
                WHERE sh.tracking_number = p.tracking_number
                ORDER BY sh.recorded_at DESC
                LIMIT 1) AS last_status_id
            FROM packages p
            LEFT JOIN users sender ON p.sender_id = sender.id
            LEFT JOIN users receiver ON p.receiver_id = receiver.id
            LEFT JOIN package_types pt ON p.type_id = pt.id
            WHERE (p.sender_id = ? OR p.receiver_id = ?) AND p.is_deleted = 0
            ORDER BY created_at DESC
        `;

        const [rows] = await db.execute(query, [req.user.id, req.user.id]);

        // Фильтрация по статусу, если статус указан в запросе
        let filteredRows = rows;
        if (status) {
            filteredRows = rows.filter(row => row.last_status === status);
        }

        res.json({ result: filteredRows });
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

    if(req.user.role === 'user' && sender_id !== req.user.id) return res.status(400).json({ error: 'Invalid sender_id' });

    try {
        await db.execute(
            `INSERT INTO packages 
            (tracking_number, sender_id, receiver_id, type_id, created_at, updated_at, size_width, size_length, size_weight, cost) 
            VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?)`,
            [tracking_number, sender_id, receiver_id, type_id, size_width, size_length, size_weight, cost]
        );
        res.status(201).json({ message: 'Package created successfully', tracking_number });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновление информации о посылке (только admin, sorter)
router.put('/:tracking_number', authMiddleware, roleMiddleware('sorter'), async (req, res) => {
    const allowedFields = [
        'sender_id', 'receiver_id', 'type_id', 
        'size_width', 'size_length', 'size_weight', 'cost'
    ];
    
    const updates = req.body;
    const updateKeys = Object.keys(updates);
    
    // Фильтруем только разрешенные поля
    const filteredUpdates = updateKeys.filter((key) => allowedFields.includes(key));
    if (filteredUpdates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    try {
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

// Удаление посылки (только admin)
router.delete('/:tracking_number/permanent', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { tracking_number } = req.params;
    try {
        await db.execute('DELETe FROM packages WHERE tracking_number = ?', [tracking_number]);
        res.json({ message: 'Package deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
