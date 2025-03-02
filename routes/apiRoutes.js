const express = require('express');
const { handleApiRequest } = require('../controllers/apiController');

const router = express.Router();

// Định nghĩa route cho API
router.post('/', handleApiRequest);

module.exports = router; 