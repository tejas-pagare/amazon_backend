'use strict';

const { validationResult } = require('express-validator');
const { AppError } = require('../middlewares/errorHandler');

const TAX_RATE = parseFloat(process.env.TAX_RATE || '0.18');

/**
 * OrderController
 * Handles order creation (from cart and buy-now), listing, detail view,
 * and cancellation. All write operations use DB transactions.
 */
class OrderController {
  /**
   * @param {import('pg').Pool} db - PostgreSQL connection pool
   */
  constructor(db) {
    this.db = db;

    this.placeOrder  = this.placeOrder.bind(this);
    this.buyNow      = this.buyNow.bind(this);
    this.getOrders   = this.getOrders.bind(this);
    this.getOrder    = this.getOrder.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Validates that an address belongs to the given user.
   * @param {number} addressId
   * @param {number} userId
   * @param {import('pg').PoolClient} client
   * @returns {Promise<object>} address row
   * @throws {AppError} if not found
   */
  async _validateAddress(addressId, userId, client) {
    const result = await client.query(
      'SELECT id FROM addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );
    if (result.rows.length === 0) {
      throw new AppError('Address not found or does not belong to user', 404);
    }
    return result.rows[0];
  }

  /**
   * Validates stock for a list of items.
   * @param {Array<{product_id, quantity, price, name}>} items
   * @param {import('pg').PoolClient} client
   * @throws {AppError} if any item is out of stock
   */
  async _validateStock(items, client) {
    for (const item of items) {
      const result = await client.query(
        'SELECT stock FROM products WHERE id = $1 FOR UPDATE',
        [item.product_id]
      );
      if (result.rows.length === 0) {
        throw new AppError(`Product ${item.product_id} not found`, 404);
      }
      if (result.rows[0].stock < item.quantity) {
        throw new AppError(
          `Insufficient stock for "${item.name}". Available: ${result.rows[0].stock}`,
          400
        );
      }
    }
  }

  /**
   * Core order creation logic shared by placeOrder and buyNow.
   * Runs entirely inside a transaction.
   * @param {{ userId, addressId, items: Array<{product_id,name,quantity,unit_price}> }} orderData
   * @param {import('pg').PoolClient} client
   * @returns {Promise<number>} created orderId
   */
  async _createOrder({ userId, addressId, items }, client) {
    const subtotal = items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
    const tax   = parseFloat((subtotal * TAX_RATE).toFixed(2));
    const sub   = parseFloat(subtotal.toFixed(2));

    // Insert order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, address_id, subtotal, tax, status)
       VALUES ($1, $2, $3, $4, 'PLACED')
       RETURNING id`,
      [userId, addressId, sub, tax]
    );
    const orderId = orderResult.rows[0].id;

    // Insert order_items + decrement stock
    for (const item of items) {
      const lineTotal = parseFloat((item.unit_price * item.quantity).toFixed(2));

      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.quantity, item.unit_price, lineTotal]
      );

      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    return orderId;
  }

  // ─── Route Handlers ──────────────────────────────────────────────────────────

  /**
   * POST /orders
   * Places an order from the user's current cart.
   * Validates address, stock, then creates order atomically.
   * Clears cart on success.
   */
  async placeOrder(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ isValidationError: true, errors: errors.array() });
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const userId    = parseInt(req.body.user_id, 10);
      const { addressId } = req.body;

      await this._validateAddress(addressId, userId, client);

      // Fetch cart
      const cartResult = await client.query(
        `SELECT
           ci.product_id,
           p.name,
           ci.quantity,
           ROUND(p.price * (1 - p.discount_pct / 100.0), 2) AS unit_price
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         WHERE ci.user_id = $1`,
        [userId]
      );

      if (cartResult.rows.length === 0) {
        throw new AppError('Cart is empty', 400);
      }

      const items = cartResult.rows;

      await this._validateStock(items, client);

      const orderId = await this._createOrder({ userId, addressId, items }, client);

      // Clear cart
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      await client.query('COMMIT');
      return res.status(201).json({ orderId });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }

  /**
   * POST /orders/buy-now
   * Places an order for a single product directly, bypassing the cart.
   */
  async buyNow(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ isValidationError: true, errors: errors.array() });
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const userId                           = parseInt(req.body.user_id, 10);
      const { productId, quantity, addressId } = req.body;

      await this._validateAddress(addressId, userId, client);

      // Fetch product
      const productResult = await client.query(
        `SELECT id AS product_id, name,
           ROUND(price * (1 - discount_pct / 100.0), 2) AS unit_price
         FROM products WHERE id = $1 AND is_active = true`,
        [productId]
      );

      if (productResult.rows.length === 0) {
        throw new AppError('Product not found or inactive', 404);
      }

      const items = [{ ...productResult.rows[0], quantity }];

      await this._validateStock(items, client);

      const orderId = await this._createOrder({ userId, addressId, items }, client);

      await client.query('COMMIT');
      return res.status(201).json({ orderId });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }

  /**
   * GET /orders
   * Returns all orders for the authenticated user (newest first).
   */
  async getOrders(req, res, next) {
    try {
      const userId = parseInt(req.query.user_id, 10);

      const result = await this.db.query(
        `SELECT id, address_id, subtotal, tax, total, status, placed_at, updated_at
         FROM orders
         WHERE user_id = $1
         ORDER BY placed_at DESC`,
        [userId]
      );

      return res.status(200).json({ orders: result.rows });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /orders/:orderId
   * Returns a single order with its items. Ensures order belongs to user.
   */
  async getOrder(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ isValidationError: true, errors: errors.array() });
    }

    try {
      const userId  = parseInt(req.query.user_id, 10);
      const orderId = parseInt(req.params.orderId, 10);

      const orderResult = await this.db.query(
        `SELECT id, user_id, address_id, subtotal, tax, total, status, placed_at, updated_at
         FROM orders WHERE id = $1 AND user_id = $2`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        return next(new AppError('Order not found', 404));
      }

      const itemsResult = await this.db.query(
        `SELECT oi.id, oi.product_id, p.name, oi.quantity, oi.unit_price, oi.line_total
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1`,
        [orderId]
      );

      return res.status(200).json({
        order: orderResult.rows[0],
        items: itemsResult.rows,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /orders/:orderId/cancel
   * Cancels an order if it's in PLACED or CONFIRMED state.
   * Restores stock for all order items atomically.
   */
  async cancelOrder(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ isValidationError: true, errors: errors.array() });
    }

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const userId  = parseInt(req.body.user_id, 10);
      const orderId = parseInt(req.params.orderId, 10);

      // Fetch and lock order
      const orderResult = await client.query(
        `SELECT id, status FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        throw new AppError('Order not found', 404);
      }

      const { status } = orderResult.rows[0];

      if (!['PLACED', 'CONFIRMED'].includes(status)) {
        throw new AppError(`Cannot cancel an order with status "${status}"`, 400);
      }

      // Restore stock
      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          'UPDATE products SET stock = stock + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      // Update order status
      await client.query(
        `UPDATE orders SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId]
      );

      await client.query('COMMIT');
      return res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
}

module.exports = OrderController;
