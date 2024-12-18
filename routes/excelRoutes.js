const express = require('express');
const exporter = require('../helpers/exporter');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/packages', exporter.packages);
router.get('/facilities', exporter.facilities);
router.get('/status_history', exporter.statusHistory);
router.get('/package_statuses', exporter.packageStatuses);
router.get('/package_types', exporter.packageTypes);
router.get('/users', exporter.users);

module.exports = router;
