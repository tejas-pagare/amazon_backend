'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const pool           = require('../config/db');
const CartController = require('../controllers/CartController');

const router     = Router();
const controller = new CartController(pool);

// GET /cart?user_id=1
router.get(
  '/',
  [query('user_id').isInt({ min: 1 }).withMessage('user_id query param is required')],
  controller.getCart
);

// POST /cart
router.post(
  '/',
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
    body('productId').isInt({ min: 1 }).withMessage('productId must be a positive integer'),
    body('quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1'),
  ],
  controller.addItem
);

// PUT /cart/:itemId
router.put(
  '/:itemId',
  [
    param('itemId').isInt({ min: 1 }).withMessage('itemId must be a positive integer'),
    body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
    body('quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1'),
  ],
  controller.updateItem
);

// DELETE /cart/:itemId — must come before DELETE /cart
router.delete(
  '/:itemId',
  [
    param('itemId').isInt({ min: 1 }).withMessage('itemId must be a positive integer'),
    query('user_id').isInt({ min: 1 }).withMessage('user_id query param is required'),
  ],
  controller.removeItem
);

// DELETE /cart?user_id=1 (clear all)
router.delete(
  '/',
  [query('user_id').isInt({ min: 1 }).withMessage('user_id query param is required')],
  controller.clearCart
);

module.exports = router;
