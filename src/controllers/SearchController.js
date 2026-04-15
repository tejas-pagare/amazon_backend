'use strict';

const { validationResult } = require('express-validator');

/**
 * SearchController
 * Dedicated search endpoint: GET /api/v1/search
 * Supports keyword, category (slug), price range, sort, and pagination.
 */
class SearchController {
  /**
   * @param {import('pg').Pool} db - PostgreSQL connection pool
   */
  constructor(db) {
    this.db = db;
    this.search = this.search.bind(this);
  }

  /**
   * GET /search?q=&category=&min_price=&max_price=&sort=&page=&limit=
   *
   * Query Params:
   *  q          - keyword to search in name / description (optional)
   *  category   - category slug to filter (optional)
   *  min_price  - minimum effective price (optional)
   *  max_price  - maximum effective price (optional)
   *  sort       - one of: price_asc | price_desc | newest | rating (default: newest)
   *  page       - page number, default 1
   *  limit      - results per page, default 20, max 50
   */
  async search(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next({ isValidationError: true, errors: errors.array() });
    }

    try {
      const q         = (req.query.q         || '').trim();
      const category  = (req.query.category  || '').trim();
      const minPrice  = req.query.min_price !== undefined ? parseFloat(req.query.min_price) : null;
      const maxPrice  = req.query.max_price !== undefined ? parseFloat(req.query.max_price) : null;
      const sort      = req.query.sort || 'newest';
      const page      = Math.max(1, parseInt(req.query.page  || '1',  10));
      const limit     = Math.min(50, parseInt(req.query.limit || '20', 10));
      const offset    = (page - 1) * limit;

      // ── Build WHERE conditions ──────────────────────────────────────────────
      const conditions = ['p.is_active = true'];
      const params     = [];
      let   paramIdx   = 1;

      // Keyword search across name + description
      if (q) {
        conditions.push(
          `(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`
        );
        params.push(`%${q}%`);
        paramIdx++;
      }

      // Category filter via slug
      if (category) {
        conditions.push(`c.slug = $${paramIdx}`);
        params.push(category);
        paramIdx++;
      }

      // Price range filter on effective_price (price after discount)
      // We use a subquery alias approach via HAVING or inline expression
      if (minPrice !== null) {
        conditions.push(
          `ROUND(p.price * (1 - p.discount_pct / 100.0), 2) >= $${paramIdx}`
        );
        params.push(minPrice);
        paramIdx++;
      }

      if (maxPrice !== null) {
        conditions.push(
          `ROUND(p.price * (1 - p.discount_pct / 100.0), 2) <= $${paramIdx}`
        );
        params.push(maxPrice);
        paramIdx++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // ── Sort order ──────────────────────────────────────────────────────────
      const sortMap = {
        price_asc:  'effective_price ASC,  p.created_at DESC',
        price_desc: 'effective_price DESC, p.created_at DESC',
        newest:     'p.created_at DESC',
        rating:     'p.avg_rating DESC, p.review_count DESC',
      };
      const orderBy = sortMap[sort] || sortMap.newest;

      // ── Count query (for pagination meta) ───────────────────────────────────
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ${whereClause}
      `;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // ── Data query ──────────────────────────────────────────────────────────
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
          p.created_at,
          c.id   AS category_id,
          c.name AS category_name,
          c.slug AS category_slug
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `;
      params.push(limit, offset);

      const result = await this.db.query(dataQuery, params);

      return res.status(200).json({
        data: result.rows,
        meta: {
          query:     q      || null,
          category:  category || null,
          min_price: minPrice,
          max_price: maxPrice,
          sort,
        },
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
}

module.exports = SearchController;
