'use strict';

const { validationResult } = require('express-validator');
const { AppError } = require('../middlewares/errorHandler');

/**
 * CartController
 * Manages shopping cart operations (add, view, update, remove, clear).
 * All operations are scoped to req.userId set by auth middleware.
 */
class CartController {
  /**
   * @param {import('pg').Pool} db - PostgreSQL connection pool
   */
  constructor(db) {
    this.db = db;

    this.getCart    = this.getCart.bind(this);
    this.addItem    = this.addItem.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.removeItem = this.removeItem.bind(this);
    this.clearCart  = this.clearCart.bind(this);
  }

  /**
   * GET /cart
   * Returns all cart items joined with product details + subtotal.
   */
  async getCart(req, res, next) {
    try {
      const userId = parseInt(req.query.user_id, 10);

      const query = `
        SELECT
          ci.id,
          ci.product_id,
          p.name,
          p.images,
          p.price,
          p.discount_pct,
          ROUND(p.price * (1 - p.discount_pct / 100.0), 2)           AS effective_price,
          ci.quantity,
          ROUND(p.price * (1 - p.discount_pct / 100.0) * ci.quantity, 2) AS line_total
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.user_id = $1
        ORDER BY ci.added_at ASC
      `;

      const result = await this.db.query(query, [userId]);

      const subtotal = result.rows.reduce(
        (sum, item) => sum + parseFloat(item.line_total),
        0
      );

      return res.status(200).json({
        items: result.rows,
        subtotal: parseFloat(subtotal.toFixed(2)),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /cart
   * Adds a product to cart or updates quantity if already present (upsert).
   * Validates stock availability before inserting.
   */
  async addItem(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ isValidationError: true, errors: errors.array() });
    }

    try {
      const userId    = parseInt(req.body.user_id, 10);
      const { productId, quantity } = req.body;

      // Verify product exists and has enough stock
      const productResult = await this.db.query(
        'SELECT id, stock, is_active FROM products WHERE id = $1',
        [productId]
      );

      if (productResult.rows.length === 0) {
        return next(new AppError('Product not found', 404));
      }

      const product = productResult.rows[0];

      if (!product.is_active) {
        return next(new AppError('Product is not available', 400));
      }

      if (product.stock < quantity) {
        return next(new AppError(`Only ${product.stock} unit(s) available in stock`, 400));
      }

      // Check if already in cart — if so, update quantity (upsert)
      const existingResult = await this.db.query(
        'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [userId, productId]
      );

      if (existingResult.rows.length > 0) {
        const newQty = existingResult.rows[0].quantity + quantity;

        if (product.stock < newQty) {
          return next(new AppError(`Only ${product.stock} unit(s) available in stock`, 400));
        }

        await this.db.query(
          'UPDATE cart_items SET quantity = $1 WHERE id = $2',
          [newQty, existingResult.rows[0].id]
        );

        return res.status(200).json({ message: 'Cart item quantity updated' });
      }

      // Insert new item
      await this.db.query(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
        [userId, productId, quantity]
      );

      return res.status(200).json({ message: 'Item added to cart' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /cart/:itemId
   * Updates the quantity of a specific cart item.
   * Validates stock availability for the new quantity.
   */
  async updateItem(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ isValidationError: true, errors: errors.array() });
    }

    try {
      const userId   = parseInt(req.body.user_id, 10);
      const itemId   = parseInt(req.params.itemId, 10);
      const { quantity } = req.body;

      // Fetch cart item + product stock in one join
      const result = await this.db.query(
        `SELECT ci.id, p.stock
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         WHERE ci.id = $1 AND ci.user_id = $2`,
        [itemId, userId]
      );

      if (result.rows.length === 0) {
        return next(new AppError('Cart item not found', 404));
      }

      const { stock } = result.rows[0];

      if (stock < quantity) {
        return next(new AppError(`Only ${stock} unit(s) available in stock`, 400));
      }

      await this.db.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2',
        [quantity, itemId]
      );

      return res.status(200).json({ message: 'Cart item updated' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /cart/:itemId
   * Removes a single item from the user's cart.
   */
  async removeItem(req, res, next) {
    try {
      const userId = parseInt(req.query.user_id, 10);
      const itemId = parseInt(req.params.itemId, 10);

      const result = await this.db.query(
        'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
        [itemId, userId]
      );

      if (result.rows.length === 0) {
        return next(new AppError('Cart item not found', 404));
      }

      return res.status(200).json({ message: 'Item removed from cart' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /cart
   * Removes all items from the user's cart.
   */
  async clearCart(req, res, next) {
    try {
      const userId = parseInt(req.query.user_id, 10);

      await this.db.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

      return res.status(200).json({ message: 'Cart cleared' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CartController;
