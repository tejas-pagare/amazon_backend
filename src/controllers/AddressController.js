'use strict';

const { validationResult } = require('express-validator');
const { AppError } = require('../middlewares/errorHandler');

/**
 * AddressController
 * Manages user delivery addresses — create, list, delete.
 * All operations are scoped to req.userId set by auth middleware.
 */
class AddressController {
  /**
   * @param {import('pg').Pool} db - PostgreSQL connection pool
   */
  constructor(db) {
    this.db = db;

    this.create = this.create.bind(this);
    this.getAll = this.getAll.bind(this);
    this.remove = this.remove.bind(this);
  }

  /**
   * POST /addresses
   * Creates a new address for the authenticated user.
   */
  async create(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ isValidationError: true, errors: errors.array() });
    }

    try {
      const userId = parseInt(req.body.user_id, 10);
      const { full_name, street, city, state, pincode, country, is_default } = req.body;

      // If this is being set as default, unset any existing default first
      if (is_default) {
        await this.db.query(
          'UPDATE addresses SET is_default = false WHERE user_id = $1',
          [userId]
        );
      }

      const result = await this.db.query(
        `INSERT INTO addresses (user_id, full_name, street, city, state, pincode, country, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [userId, full_name, street, city, state, pincode, country, is_default || false]
      );

      return res.status(201).json({ data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /addresses
   * Returns all saved addresses for the authenticated user.
   * Default address is listed first.
   */
  async getAll(req, res, next) {
    try {
      const userId = parseInt(req.query.user_id, 10);

      const result = await this.db.query(
        `SELECT id, full_name, street, city, state, pincode, country, is_default
         FROM addresses
         WHERE user_id = $1
         ORDER BY is_default DESC, id ASC`,
        [userId]
      );

      return res.status(200).json({ data: result.rows });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /addresses/:addressId
   * Removes an address belonging to the authenticated user.
   */
  async remove(req, res, next) {
    try {
      const userId    = parseInt(req.query.user_id, 10);
      const addressId = parseInt(req.params.addressId, 10);

      const result = await this.db.query(
        'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id',
        [addressId, userId]
      );

      if (result.rows.length === 0) {
        return next(new AppError('Address not found', 404));
      }

      return res.status(200).json({ message: 'Address deleted' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AddressController;
