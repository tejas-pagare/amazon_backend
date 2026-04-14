'use strict';

/**
 * CategoryController
 * Handles fetching of product categories.
 */
class CategoryController {
  /**
   * @param {import('pg').Pool} db - PostgreSQL connection pool
   */
  constructor(db) {
    this.db = db;

    this.getAll = this.getAll.bind(this);
  }

  /**
   * GET /categories
   * Returns all categories ordered by name.
   */
  async getAll(req, res, next) {
    try {
      const result = await this.db.query(
        'SELECT id, name, slug, description, image_url FROM categories ORDER BY name ASC'
      );

      return res.status(200).json({ data: result.rows });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CategoryController;
