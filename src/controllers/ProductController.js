'use strict';

const { validationResult } = require('express-validator');
const { AppError } = require('../middlewares/errorHandler');

/**
 * ProductController
 * Handles all product-related HTTP operations.
 * Uses OOP with dependency injection for the database pool.
 */
class ProductController {
  /**
   * @param {import('pg').Pool} db - PostgreSQL connection pool
   */
  constructor(db) {
    this.db = db;

    // Bind methods so 'this' is preserved when passed to Express route handlers
    this.getAll = this.getAll.bind(this);
    this.getOne = this.getOne.bind(this);
  }

  /**
   * GET /products?search=&category=&page=&limit=
   * Returns paginated, filterable list of active products.
   */
  async getAll(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ isValidationError: true, errors: errors.array() });
    }

    try {
      const search   = req.query.search   || '';
      const category = req.query.category || '';
      const page     = Math.max(1, parseInt(req.query.page  || '1',  10));
      const limit    = Math.min(50, parseInt(req.query.limit || '10', 10));
      const offset   = (page - 1) * limit;

      const conditions = ['p.is_active = true'];
      const params     = [];
      let   paramIdx   = 1;

      if (search) {
        conditions.push(`(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`);
        params.push(`%${search}%`);
        paramIdx++;
      }

      if (category) {
        conditions.push(`c.slug = $${paramIdx}`);
        params.push(category);
        paramIdx++;
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `
        SELECT COUNT(*) AS total
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      const dataQuery = `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.discount_pct,
          ROUND(p.price * (1 - p.discount_pct / 100.0), 2) AS effective_price,
          p.stock,
          p.avg_rating,
          p.review_count,
          p.images,
          p.is_active,
          p.created_at,
          c.id   AS category_id,
          c.name AS category_name,
          c.slug AS category_slug
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `;
      params.push(limit, offset);

      const result = await this.db.query(dataQuery, params);

      return res.status(200).json({
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /products/:productId
   * Returns a single product by ID.
   */
  async getOne(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ isValidationError: true, errors: errors.array() });
    }

    try {
      const { productId } = req.params;

      const query = `
        SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.discount_pct,
          ROUND(p.price * (1 - p.discount_pct / 100.0), 2) AS effective_price,
          p.stock,
          p.avg_rating,
          p.review_count,
          p.images,
          p.is_active,
          p.created_at,
          c.id   AS category_id,
          c.name AS category_name,
          c.slug AS category_slug
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1
      `;

      const result = await this.db.query(query, [productId]);

      if (result.rows.length === 0) {
        return next(new AppError('Product not found', 404));
      }

      return res.status(200).json({ data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductController;
