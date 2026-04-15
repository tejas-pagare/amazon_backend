'use strict';

const { Router } = require('express');
const { query }  = require('express-validator');
const pool            = require('../config/db');
const SearchController = require('../controllers/SearchController');

const router     = Router();
const controller = new SearchController(pool);

/**
 * GET /api/v1/search
 *
 * Query Params:
 *  q          - search keyword (optional)
 *  category   - category slug (optional)
 *  min_price  - minimum effective price, must be >= 0 (optional)
 *  max_price  - maximum effective price, must be >= 0 (optional)
 *  sort       - price_asc | price_desc | newest | rating (optional, default: newest)
 *  page       - page number >= 1 (optional, default: 1)
 *  limit      - results per page 1–50 (optional, default: 20)
 */
router.get(
  '/',
  [
    query('q')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 200 })
      .withMessage('q must be a string with max 200 characters'),

    query('category')
      .optional()
      .isString()
      .trim()
      .withMessage('category must be a string'),

    query('min_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('min_price must be a non-negative number'),

    query('max_price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('max_price must be a non-negative number'),

    query('sort')
      .optional()
      .isIn(['price_asc', 'price_desc', 'newest', 'rating'])
      .withMessage('sort must be one of: price_asc, price_desc, newest, rating'),

    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be >= 1'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('limit must be between 1 and 50'),
  ],
  controller.search
);

module.exports = router;
