'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const pool             = require('../config/db');
const AddressController = require('../controllers/AddressController');

const router     = Router();
const controller = new AddressController(pool);

// POST /addresses
router.post(
  '/',
  [
    body('user_id').isInt({ min: 1 }).withMessage('user_id is required'),
    body('full_name').trim().notEmpty().withMessage('full_name is required'),
    body('street').trim().notEmpty().withMessage('street is required'),
    body('city').trim().notEmpty().withMessage('city is required'),
    body('state').trim().notEmpty().withMessage('state is required'),
    body('pincode').trim().notEmpty().withMessage('pincode is required'),
    body('country').trim().notEmpty().withMessage('country is required'),
    body('is_default').optional().isBoolean(),
  ],
  controller.create
);

// GET /addresses?user_id=1
router.get(
  '/',
  [query('user_id').isInt({ min: 1 }).withMessage('user_id query param is required')],
  controller.getAll
);

// DELETE /addresses/:addressId?user_id=1
router.delete(
  '/:addressId',
  [
    param('addressId').isInt({ min: 1 }).withMessage('addressId must be a positive integer'),
    query('user_id').isInt({ min: 1 }).withMessage('user_id query param is required'),
  ],
  controller.remove
);

module.exports = router;
