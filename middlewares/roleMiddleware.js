module.exports = function(requiredRole) {
    return (req, res, next) => {
        try {
            // Убедимся, что роль пользователя существует в req.user (добавлено в authMiddleware)
            if (!req.user || !req.user.role) {
                return res.status(403).json({ error: 'Access denied. Role not found.' });
            }

            // Если у пользователя нет нужной роли, отклоняем запрос
            const userRole = req.user.role;
            const rolesHierarchy = ['user', 'sorter', 'admin'];

            // Проверяем, находится ли текущая роль пользователя на уровне или выше требуемой роли
            if (rolesHierarchy.indexOf(userRole) < rolesHierarchy.indexOf(requiredRole)) {
                return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
            }

            next(); // Роль пользователя соответствует требуемой, передаем управление следующему middleware
        } catch (err) {
            res.status(500).json({ error: 'An error occurred while validating role.' });
        }
    };
};
