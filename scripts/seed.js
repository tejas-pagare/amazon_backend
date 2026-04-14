'use strict';

require('dotenv').config();
const pool          = require('../src/config/db');
const ImageUploader = require('./imageUploader');

// ─── Seed Data Definitions ────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Electronics',    slug: 'electronics',   description: 'Gadgets, devices and tech accessories', image_url: null },
  { name: 'Clothing',       slug: 'clothing',       description: 'Fashion for men, women and kids',       image_url: null },
  { name: 'Books',          slug: 'books',          description: 'Bestsellers, textbooks and more',       image_url: null },
  { name: 'Home & Kitchen', slug: 'home-kitchen',   description: 'Everything for your home',              image_url: null },
  { name: 'Sports',         slug: 'sports',         description: 'Gear and equipment for every sport',   image_url: null },
  { name: 'Beauty',         slug: 'beauty',         description: 'Skincare, haircare and cosmetics',      image_url: null },
];

/**
 * Products seed definitions.
 * `searchQuery` is sent to Unsplash. `slug` is used as the Cloudinary folder/id prefix.
 */
const PRODUCTS_SEED = [
  // ── Electronics ──────────────────────────────────────────────────────────
  {
    categorySlug:  'electronics',
    name:          'Wireless Noise-Cancelling Headphones',
    description:   'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and foldable design. Perfect for travel and work.',
    price:         12999,
    discount_pct:  15,
    stock:         80,
    avg_rating:    4.5,
    review_count:  320,
    searchQuery:   'noise cancelling headphones',
    slug:          'electronics/headphones',
  },
  {
    categorySlug:  'electronics',
    name:          'Mechanical Gaming Keyboard RGB',
    description:   'Tenkeyless mechanical keyboard with Cherry MX Red switches, per-key RGB lighting, and aluminium frame. Ideal for gamers and typists.',
    price:         6499,
    discount_pct:  10,
    stock:         120,
    avg_rating:    4.3,
    review_count:  215,
    searchQuery:   'mechanical gaming keyboard',
    slug:          'electronics/keyboard',
  },
  {
    categorySlug:  'electronics',
    name:          '15W Wireless Fast Charger Pad',
    description:   'Qi-certified fast wireless charging pad compatible with all Qi-enabled devices. Includes LED indicator and anti-slip base.',
    price:         1999,
    discount_pct:  20,
    stock:         200,
    avg_rating:    4.1,
    review_count:  180,
    searchQuery:   'wireless charger pad',
    slug:          'electronics/charger',
  },

  // ── Clothing ─────────────────────────────────────────────────────────────
  {
    categorySlug:  'clothing',
    name:          "Men's Slim Fit Oxford Shirt",
    description:   '100% cotton slim-fit Oxford shirt. Available in multiple colours. Perfect for casual and semi-formal occasions.',
    price:         1299,
    discount_pct:  25,
    stock:         300,
    avg_rating:    4.2,
    review_count:  410,
    searchQuery:   'men casual oxford shirt',
    slug:          'clothing/mens-shirt',
  },
  {
    categorySlug:  'clothing',
    name:          "Women's Windproof Running Jacket",
    description:   'Lightweight, breathable running jacket with reflective strips, zippered pockets and a slim athletic fit. Windproof and water-resistant.',
    price:         2499,
    discount_pct:  12,
    stock:         150,
    avg_rating:    4.4,
    review_count:  188,
    searchQuery:   'women running jacket athletic',
    slug:          'clothing/womens-jacket',
  },
  {
    categorySlug:  'clothing',
    name:          'Unisex Premium Fleece Hoodie',
    description:   'Ultra-soft 320gsm fleece hoodie with kangaroo pocket and adjustable drawstring. Oversized fit, great for lounging.',
    price:         1599,
    discount_pct:  8,
    stock:         250,
    avg_rating:    4.6,
    review_count:  540,
    searchQuery:   'premium fleece hoodie',
    slug:          'clothing/hoodie',
  },

  // ── Books ─────────────────────────────────────────────────────────────────
  {
    categorySlug:  'books',
    name:          'Atomic Habits — James Clear',
    description:   'An easy and proven way to build good habits and break bad ones. #1 New York Times bestseller. A must-read for personal development.',
    price:         499,
    discount_pct:  30,
    stock:         500,
    avg_rating:    4.8,
    review_count:  1200,
    searchQuery:   'atomic habits book',
    slug:          'books/atomic-habits',
  },
  {
    categorySlug:  'books',
    name:          'The Lean Startup — Eric Ries',
    description:   'How today\'s entrepreneurs use continuous innovation to create radically successful businesses. Essential reading for founders.',
    price:         449,
    discount_pct:  20,
    stock:         350,
    avg_rating:    4.5,
    review_count:  870,
    searchQuery:   'startup business book',
    slug:          'books/lean-startup',
  },
  {
    categorySlug:  'books',
    name:          'Deep Work — Cal Newport',
    description:   'Rules for focused success in a distracted world. Learn to produce at an elite level the ability to focus without distraction.',
    price:         399,
    discount_pct:  15,
    stock:         420,
    avg_rating:    4.7,
    review_count:  760,
    searchQuery:   'deep work focus reading',
    slug:          'books/deep-work',
  },

  // ── Home & Kitchen ────────────────────────────────────────────────────────
  {
    categorySlug:  'home-kitchen',
    name:          'Insulated Stainless Steel Water Bottle 1L',
    description:   'Double-wall vacuum insulated bottle keeps drinks cold 24h and hot 12h. BPA-free, leak-proof lid. Fits most car cup holders.',
    price:         899,
    discount_pct:  18,
    stock:         400,
    avg_rating:    4.4,
    review_count:  620,
    searchQuery:   'stainless steel water bottle',
    slug:          'home-kitchen/water-bottle',
  },
  {
    categorySlug:  'home-kitchen',
    name:          'Digital Air Fryer 5.5L',
    description:   '1700W air fryer with 8 presets, digital display and non-stick removable basket. Fry, bake, grill and roast with up to 80% less fat.',
    price:         5499,
    discount_pct:  22,
    stock:         90,
    avg_rating:    4.6,
    review_count:  390,
    searchQuery:   'air fryer kitchen appliance',
    slug:          'home-kitchen/air-fryer',
  },
  {
    categorySlug:  'home-kitchen',
    name:          'Luxury Scented Soy Candle Set (3-Pack)',
    description:   'Hand-poured soy wax candles in lavender, vanilla and sandalwood fragrance. 45-hour burn time each. Cotton wicks, eco-friendly.',
    price:         799,
    discount_pct:  10,
    stock:         220,
    avg_rating:    4.3,
    review_count:  290,
    searchQuery:   'scented soy candle luxury',
    slug:          'home-kitchen/candle-set',
  },

  // ── Sports ────────────────────────────────────────────────────────────────
  {
    categorySlug:  'sports',
    name:          'Non-Slip Premium Yoga Mat 6mm',
    description:   'Extra thick 6mm TPE yoga mat with alignment lines, carry strap, and non-slip texture. Suitable for yoga, pilates and floor exercises.',
    price:         1299,
    discount_pct:  15,
    stock:         180,
    avg_rating:    4.5,
    review_count:  445,
    searchQuery:   'yoga mat exercise',
    slug:          'sports/yoga-mat',
  },
  {
    categorySlug:  'sports',
    name:          'Resistance Bands Set (5 Bands)',
    description:   'Set of 5 latex resistance bands from 2kg to 45kg. Ideal for strength training, physiotherapy and home workouts. Includes carry bag.',
    price:         699,
    discount_pct:  20,
    stock:         300,
    avg_rating:    4.4,
    review_count:  380,
    searchQuery:   'resistance bands workout fitness',
    slug:          'sports/resistance-bands',
  },
  {
    categorySlug:  'sports',
    name:          'Lightweight Mesh Running Shoes',
    description:   'Breathable mesh upper with cushioned EVA midsole and anti-slip rubber outsole. Lightweight at just 280g. Available in sizes 6-12.',
    price:         2999,
    discount_pct:  10,
    stock:         160,
    avg_rating:    4.3,
    review_count:  510,
    searchQuery:   'running shoes lightweight',
    slug:          'sports/running-shoes',
  },

  // ── Beauty ────────────────────────────────────────────────────────────────
  {
    categorySlug:  'beauty',
    name:          'Vitamin C Brightening Face Serum 30ml',
    description:   '20% Vitamin C + Hyaluronic Acid + Vitamin E serum. Brightens skin tone, reduces dark spots and boosts collagen. Dermatologist tested.',
    price:         1199,
    discount_pct:  25,
    stock:         250,
    avg_rating:    4.6,
    review_count:  680,
    searchQuery:   'vitamin c serum skincare',
    slug:          'beauty/vitamin-c-serum',
  },
  {
    categorySlug:  'beauty',
    name:          'Deep Hydration Daily Moisturiser 50ml',
    description:   'Oil-free gel moisturiser with Hyaluronic Acid and Niacinamide. 72-hour hydration. Suitable for all skin types including oily and sensitive.',
    price:         899,
    discount_pct:  15,
    stock:         310,
    avg_rating:    4.4,
    review_count:  490,
    searchQuery:   'face moisturizer skincare cream',
    slug:          'beauty/moisturiser',
  },
  {
    categorySlug:  'beauty',
    name:          'Bamboo Charcoal Sheet Face Mask (10-Pack)',
    description:   'Detoxifying bamboo charcoal sheet masks infused with tea tree and green tea extract. Unclogs pores, controls oil, and soothes skin.',
    price:         599,
    discount_pct:  30,
    stock:         400,
    avg_rating:    4.2,
    review_count:  330,
    searchQuery:   'face mask sheet skincare',
    slug:          'beauty/face-mask',
  },
];

const USERS = [
  { name: 'Arjun Mehta',  email: 'arjun.mehta@example.com',  phone: '9876543210' },
  { name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '9123456780' },
  { name: 'Rohan Gupta',  email: 'rohan.gupta@example.com',  phone: '9012345678' },
];

const ADDRESSES = [
  {
    userIndex: 0,
    full_name: 'Arjun Mehta',
    street:    '42, MG Road, Indiranagar',
    city:      'Bengaluru',
    state:     'Karnataka',
    pincode:   '560038',
    country:   'India',
    is_default: true,
  },
  {
    userIndex: 1,
    full_name: 'Priya Sharma',
    street:    '15, Linking Road, Bandra West',
    city:      'Mumbai',
    state:     'Maharashtra',
    pincode:   '400050',
    country:   'India',
    is_default: true,
  },
  {
    userIndex: 2,
    full_name: 'Rohan Gupta',
    street:    '88, Connaught Place, Block C',
    city:      'New Delhi',
    state:     'Delhi',
    pincode:   '110001',
    country:   'India',
    is_default: true,
  },
];

// ─── Seeder Class ─────────────────────────────────────────────────────────────

class Seeder {
  /**
   * @param {import('pg').Pool} db
   * @param {ImageUploader} uploader
   */
  constructor(db, uploader) {
    this.db       = db;
    this.uploader = uploader;
  }

  log(msg) {
    console.log(`[seed] ${msg}`);
  }

  /**
   * Truncates all seeded tables in reverse FK dependency order.
   * Uses RESTART IDENTITY to reset serial sequences.
   */
  async truncateTables() {
    this.log('Truncating existing data...');
    await this.db.query(`
      TRUNCATE TABLE
        order_items,
        orders,
        cart_items,
        addresses,
        products,
        categories,
        users
      RESTART IDENTITY CASCADE
    `);
    this.log('Tables truncated.');
  }

  /**
   * Seeds categories and returns a slug → id map.
   * @returns {Promise<Map<string, number>>}
   */
  async seedCategories() {
    this.log(`Seeding ${CATEGORIES.length} categories...`);
    const slugToId = new Map();

    for (const cat of CATEGORIES) {
      const result = await this.db.query(
        `INSERT INTO categories (name, slug, description, image_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [cat.name, cat.slug, cat.description, cat.image_url]
      );
      slugToId.set(cat.slug, result.rows[0].id);
      this.log(`  ✅ Category: ${cat.name}`);
    }

    return slugToId;
  }

  /**
   * Seeds all products: fetches images from Unsplash, uploads to Cloudinary,
   * then inserts each product with the Cloudinary URLs as a JSON array.
   * @param {Map<string, number>} slugToId - category slug → id map
   */
  async seedProducts(slugToId) {
    this.log(`\nSeeding ${PRODUCTS_SEED.length} products (with Cloudinary images)...`);

    for (const product of PRODUCTS_SEED) {
      process.stdout.write(`  ⏳ ${product.name} — uploading images...`);

      let images;
      try {
        images = await this.uploader.getAndUploadProductImages(
          product.searchQuery,
          product.slug,
          3
        );
        process.stdout.write(` ✅\n`);
      } catch (err) {
        process.stdout.write(` ⚠️  image upload failed (${err.message}), using placeholder\n`);
        // Fallback to a picsum placeholder if Unsplash/Cloudinary fails for this product
        images = [
          `https://picsum.photos/seed/${product.slug}-1/800/600`,
          `https://picsum.photos/seed/${product.slug}-2/800/600`,
          `https://picsum.photos/seed/${product.slug}-3/800/600`,
        ];
      }

      const categoryId = slugToId.get(product.categorySlug);

      await this.db.query(
        `INSERT INTO products
           (category_id, name, description, price, discount_pct, stock,
            avg_rating, review_count, images, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
        [
          categoryId,
          product.name,
          product.description,
          product.price,
          product.discount_pct,
          product.stock,
          product.avg_rating,
          product.review_count,
          JSON.stringify(images),
        ]
      );
    }

    this.log(`\n  ${PRODUCTS_SEED.length} products seeded.`);
  }

  /**
   * Seeds users and returns an array of inserted user IDs (index-matched to USERS).
   * @returns {Promise<number[]>}
   */
  async seedUsers() {
    this.log(`\nSeeding ${USERS.length} users...`);
    const userIds = [];

    for (const user of USERS) {
      const result = await this.db.query(
        `INSERT INTO users (name, email, phone)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.name, user.email, user.phone]
      );
      userIds.push(result.rows[0].id);
      this.log(`  ✅ User: ${user.name} (id: ${result.rows[0].id})`);
    }

    return userIds;
  }

  /**
   * Seeds addresses linked to inserted users.
   * @param {number[]} userIds
   */
  async seedAddresses(userIds) {
    this.log(`\nSeeding ${ADDRESSES.length} addresses...`);

    for (const addr of ADDRESSES) {
      const userId = userIds[addr.userIndex];
      await this.db.query(
        `INSERT INTO addresses (user_id, full_name, street, city, state, pincode, country, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, addr.full_name, addr.street, addr.city, addr.state, addr.pincode, addr.country, addr.is_default]
      );
      this.log(`  ✅ Address for user_id: ${userId} → ${addr.city}`);
    }
  }

  /**
   * Runs the full seed pipeline.
   */
  async run() {
    console.log('\n🌱  Starting seed...\n');
    const start = Date.now();

    try {
      await this.db.query('SELECT 1'); // verify connection
      this.log('DB connected.\n');

      await this.truncateTables();

      const slugToId = await this.seedCategories();
      await this.seedProducts(slugToId);
      const userIds  = await this.seedUsers();
      await this.seedAddresses(userIds);

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`\n✅  Seed complete in ${elapsed}s`);
      console.log(`    ${CATEGORIES.length} categories`);
      console.log(`    ${PRODUCTS_SEED.length} products (each with 3 Cloudinary images)`);
      console.log(`    ${USERS.length} users`);
      console.log(`    ${ADDRESSES.length} addresses\n`);
    } catch (err) {
      console.error('\n❌  Seed failed:', err.message);
      if (process.env.NODE_ENV !== 'production') console.error(err);
      process.exit(1);
    } finally {
      await this.db.end();
    }
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

const uploader = new ImageUploader();
const seeder   = new Seeder(pool, uploader);

seeder.run();
