'use strict';

const { Router } = require('express');
const { param, query } = require('express-validator');
const pool              = require('../config/db');
const ProductController = require('../controllers/ProductController');

const router     = Router();
const controller = new ProductController(pool);

// GET /products?search=&category=&page=&limit=
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50'),
  ],
  controller.getAll
);

// GET /products/:productId
router.get(
  '/:productId',
  [
    param('productId').isInt({ min: 1 }).withMessage('productId must be a positive integer'),
  ],
  controller.getOne
);

module.exports = router;
