const express = require('express');
const db = require('../helpers/databases');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Получение всех типов посылок (доступно всем пользователям)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM package_types');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создание нового типа посылки (только admin)
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { value } = req.body;

    try {
        await db.execute('INSERT INTO package_types (value) VALUES (?)', [value]);
        res.status(201).json({ message: 'Package type created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновление типа посылки (только admin)
router.put('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { id } = req.params;
    const { value } = req.body;

    try {
        await db.execute('UPDATE package_types SET value = ? WHERE id = ?', [value, id]);
        res.json({ message: 'Package type updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удаление типа посылки (только admin)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        await db.execute('DELETE FROM package_types WHERE id = ?', [id]);
        res.json({ message: 'Package type deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
