const express = require('express');
const exporter = require('../helpers/exporter');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/packages', authMiddleware, roleMiddleware('sorter'), exporter.packages);
router.get('/facilities', authMiddleware, roleMiddleware('sorter'), exporter.facilities);
router.get('/status_history', authMiddleware, roleMiddleware('sorter'), exporter.statusHistory);
router.get('/package_statuses', authMiddleware, exporter.packageStatuses);
router.get('/package_types', authMiddleware, exporter.packageTypes);
router.get('/users', authMiddleware, roleMiddleware('admin'), exporter.users);

module.exports = router;
