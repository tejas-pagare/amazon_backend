'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const pool            = require('../config/db');
const OrderController = require('../controllers/OrderController');

const router     = Router();
const controller = new OrderController(pool);

// POST /orders/buy-now
router.post(
  '/buy-now',
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
    body('productId').isInt({ min: 1 }).withMessage('productId must be a positive integer'),
    body('quantity').isInt({ min: 1 }).withMessage('quantity must be at least 1'),
    body('addressId').isInt({ min: 1 }).withMessage('addressId must be a positive integer'),
  ],
  controller.buyNow
);

// POST /orders
router.post(
  '/',
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
    body('addressId').isInt({ min: 1 }).withMessage('addressId must be a positive integer'),
  ],
  controller.placeOrder
);

// GET /orders?user_id=1
router.get(
  '/',
  [query('user_id').isInt({ min: 1 }).withMessage('user_id query param is required')],
  controller.getOrders
);

// GET /orders/:orderId?user_id=1
router.get(
  '/:orderId',
  [
    param('orderId').isInt({ min: 1 }).withMessage('orderId must be a positive integer'),
    query('user_id').isInt({ min: 1 }).withMessage('user_id query param is required'),
  ],
  controller.getOrder
);

// PATCH /orders/:orderId/cancel
router.patch(
  '/:orderId/cancel',
  [
    param('orderId').isInt({ min: 1 }).withMessage('orderId must be a positive integer'),
    body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
  ],
  controller.cancelOrder
);

module.exports = router;
