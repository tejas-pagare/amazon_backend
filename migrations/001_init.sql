-- ============================================================
-- Migration: 001_init.sql
-- Amazon Clone — Full Schema
-- ============================================================

-- order_status ENUM (Checking existence to prevent errors on re-run)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
          'PLACED',
          'CONFIRMED',
          'SHIPPED',
          'DELIVERED',
          'CANCELLED'
        );
    END IF;
END $$;


-- users
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(100) UNIQUE NOT NULL,
  phone      VARCHAR(15),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- addresses
CREATE TABLE IF NOT EXISTS addresses (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name  VARCHAR(100) NOT NULL,
  street     TEXT NOT NULL,
  city       VARCHAR(50) NOT NULL,
  state      VARCHAR(50) NOT NULL,
  pincode    VARCHAR(10) NOT NULL,
  country    VARCHAR(50) NOT NULL,
  is_default BOOLEAN DEFAULT false
);

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT
);

-- products
CREATE TABLE IF NOT EXISTS products (
  id            SERIAL PRIMARY KEY,
  category_id   INT REFERENCES categories(id) ON DELETE SET NULL,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  discount_pct  NUMERIC(5,2) DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  stock         INT DEFAULT 0 CHECK (stock >= 0),
  avg_rating    FLOAT DEFAULT 0,
  review_count  INT DEFAULT 0,
  images        JSON,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- cart_items
CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INT NOT NULL CHECK (quantity > 0),
  added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_id INT NOT NULL REFERENCES addresses(id),
  subtotal   NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  tax        NUMERIC(10,2) DEFAULT 0 CHECK (tax >= 0),
  total      NUMERIC(10,2) GENERATED ALWAYS AS (subtotal + tax) STORED,
  status     order_status DEFAULT 'PLACED',
  placed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- order_items
CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity   INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(10,2) NOT NULL CHECK (line_total >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
