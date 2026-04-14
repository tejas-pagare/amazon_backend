'use strict';

const { Router }         = require('express');
const pool               = require('../config/db');
const CategoryController = require('../controllers/CategoryController');

const router     = Router();
const controller = new CategoryController(pool);

// GET /categories
router.get('/', controller.getAll);

module.exports = router;
