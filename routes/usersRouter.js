const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../helpers/databases');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

// Регистрация нового пользователя
router.post('/register', async (req, res) => {
    const { username, password, first_name, last_name, address, role = 'user' } = req.body;
    if(!username || !password || !first_name || !last_name || !address) return res.status(400).json({ error: 'Bad request"' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (username, password, first_name, last_name, address, role) VALUES (?, ?, ?, ?, ?, ?)',
            [username, hashedPassword, first_name, last_name, address, role]
        );
        res.status(201).json({ message: 'User registered successfully', user_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Аутентификация пользователя
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновление токена
router.get('/refreshToken', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const user = rows[0];

        if(!user) return res.status(500).json({ error: 'User not exist' });

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение списка пользователей (только admin)
router.get('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, first_name, last_name, username, role FROM users WHERE is_deleted = 0');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение данных о пользователе по ID
router.get('/:id', authMiddleware, async (req, res) => {
    const userId = req.params.id;
    const currentUserId = req.user.id; // ID пользователя из токена
    const userRole = req.user.role; // Роль пользователя из токена

    try {
        // Проверяем, если пользователь не админ, он может получить данные только о себе
        if (userId != currentUserId && userRole !== 'admin') {
            return res.status(403).json({ error: 'Access denied. You can only view your own profile.' });
        }

        // Запрашиваем данные пользователя из базы
        const [user] = await db.execute('SELECT id, first_name, last_name, username, address, role FROM users WHERE id = ?', [userId]);

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Возвращаем информацию о пользователе
        res.json({
            id: user[0].id,
            first_name: user[0].first_name,
            last_name: user[0].last_name,
            username: user[0].username,
            address: user[0].address,
            role: user[0].role,
            is_current_user: user[0].id == req.user.id
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновление данных пользователя (только admin)
router.put('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { ...updates } = req.body;

    if(updates.hasOwnProperty('password')) return res.status(400).json({ error: 'Password cannot be updated through this endpoint. Use /password instead.' });

    try {
        const allowedKeys = ['first_name', 'last_name', 'username', 'address', 'role'];
        const updateKeys = Object.keys(updates).filter(key => allowedKeys.includes(key));
        
        if (updateKeys.length === 0) {
            return res.status(400).json({ error: 'Invalid keys in the update request.' });
        }
        
        if(req.user.role !== 'admin' && role && req.user.role !== updates.role) {
            return res.status(403).json({ error: 'You can not edit your role.' });
        }
        
        const updateValues = updateKeys.map(key => updates[key]);
        const setClause = updateKeys.map(key => `${key} = ?`).join(', ');
        
        await db.execute(`UPDATE users SET ${setClause} WHERE id = ?`, [...updateValues, id]);
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновление пароля
router.patch('/password/:id', authMiddleware, async (req, res) => {
    const userId = req.params.id;
    const { old_password, new_password } = req.body;

    // Пароль может изменить либо сам пользователь, либо админ
    if(userId != req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You are not allowed to perform this action' });
    }

    if(!new_password || !old_password) {
        return res.status(400).json({ error: 'Check fields' });
    }

    if(new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    try {
        // Проверим, существует ли пользователь с таким id
        const [user] = await db.execute('SELECT id FROM users WHERE id = ?', [userId]);

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if(userId === req.user.id) {
            const isMatch = await bcrypt.compare(old_password, user.password);
            if(!isMatch) {
                return res.status(401).json({ error: 'Old password is incorrect.' });
            }
        }

        // Хэшируем новый пароль
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Обновляем пароль в базе данных
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        res.json({ message: 'Password reset successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удаление пользователя (мягкое удаление, только admin)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('UPDATE users SET is_deleted = 1 WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
