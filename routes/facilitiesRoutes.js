const express = require('express');
const db = require('../helpers/databases');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Получение всех складов (доступно для sorter и admin)
router.get('/', authMiddleware, roleMiddleware('sorter'), async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM facilities');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение данных о складе по ID
router.get('/:id', authMiddleware, async (req, res) => {
    const facilityId = req.params.id;

    try {
        const [facility] = await db.execute('SELECT * FROM facilities WHERE id = ?', [facilityId]);

        if (facility.length === 0) {
            return res.status(404).json({ error: 'Facility not found.' });
        }

        // Возвращаем информацию о складе
        res.json({
            id: facility[0].id,
            name: facility[0].name,
            address: facility[0].address
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создание нового склада (только admin)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { name, address } = req.body;

    try {
        const [result] = await db.execute('INSERT INTO facilities (name, address) VALUES (?, ?)', [name, address]);
        res.status(201).json({ message: 'Facility created successfully', facility_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновление данных склада (только admin)
router.put('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const allowedKeys = ['name', 'address'];
        const updateKeys = Object.keys(updates).filter(key => allowedKeys.includes(key));
        
        if (updateKeys.length === 0) {
            return res.status(400).json({ error: 'Invalid keys in the update request.' });
        }

        const updateValues = updateKeys.map(key => updates[key]);
        const setClause = updateKeys.map(key => `${key} = ?`).join(', ');

        await db.execute(`UPDATE facilities SET ${setClause} WHERE id = ?`, [...updateValues, id]);
        res.json({ message: 'Facility updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удаление склада (только admin)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        await db.execute('DELETE FROM facilities WHERE id = ?', [id]);
        res.json({ message: 'Facility deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
