# Amazon Clone Backend 

A robust, production-ready Node.js & Express REST API for an Amazon Clone. Developed as part of the Scaler SDE Intern Fullstack Assignment, this backend utilizes a PostgreSQL database (Neon) and implements raw SQL querying via `pg`, Object-Oriented Controllers, and automated database seeding pulling actual product photography via Unsplash and Cloudinary.

---

## 🏗️ Architecture Flow

The application follows a standard modular monolithic architecture with clean Separation of Concerns (SoC).

```mermaid
flowchart TD
    Client[Frontend / Client] --> |HTTP Requests| Express[Express.js App]
    
    subgraph Express Application
    Express --> Router[Route Handlers]
    Router --> Middleware[Validation & Error Middlewares]
    Middleware --> Controllers[OOP Controllers]
    end
    
    Controllers --> |Raw SQL Queries| Pool[(Connection Pool)]
    Pool --> DB[(Neon PostgreSQL DB)]
    
    subgraph Seeding Tools
    SeedScript[Seed Script] --> Unsplash[Unsplash API fetch]
    Unsplash --> |Images| Cloudinary[Cloudinary Upload]
    Cloudinary --> |Secure URLs| SeedDB[(Neon DB Insertion)]
    SeedScript --> SeedDB
    end

    classDef aws fill:#FF9900,color:#fff,stroke:#232F3E;
    classDef pg fill:#336791,color:#fff;
    classDef node fill:#339933,color:#fff;
    
    Express:::node
    DB:::pg
    SeedScript:::node
```

---

## 🗄️ Database Schema

The core e-commerce engine employs a structured relational database with referential integrity (foreign keys) and transactional consistency to easily manage users, catalogs, and orders.

```mermaid
erDiagram
    USERS ||--o{ ADDRESSES : "has many"
    USERS ||--o{ CART_ITEMS : "has many"
    USERS ||--o{ ORDERS : "places"
    CATEGORIES ||--o{ PRODUCTS : "contains"
    PRODUCTS ||--o{ CART_ITEMS : "added as"
    PRODUCTS ||--o{ ORDER_ITEMS : "purchased as"
    ORDERS ||--o{ ORDER_ITEMS : "contains"
    ADDRESSES ||--o{ ORDERS : "shipped to"

    USERS {
        int id PK
        string name
        string email
        string phone
        timestamp created_at
    }

    ADDRESSES {
        int id PK
        int user_id FK
        string full_name
        string street
        string city
        string state
        string pincode
        boolean is_default
    }

    CATEGORIES {
        int id PK
        string name
        string slug
        string description
    }

    PRODUCTS {
        int id PK
        int category_id FK
        string name
        decimal price
        decimal discount_pct
        int stock
        json images "Cloudinary URLs"
        decimal avg_rating
    }

    CART_ITEMS {
        int id PK
        int user_id FK
        int product_id FK
        int quantity
    }

    ORDERS {
        int id PK
        int user_id FK
        int address_id FK
        decimal subtotal
        decimal tax_amount
        decimal total_amount
        enum order_status "PLACED, SHIPPED, DELIVERED, CANCELLED"
    }

    ORDER_ITEMS {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
    }
```

---

## 🛠️ Tech Stack 

- **Runtime Environment:** Node.js
- **Framework:** Express.js `^4.x`
- **Database:** PostgreSQL (Hosted on Neon)
- **Database Driver:** `pg` (Node-postgres)
- **Validation:** `express-validator`
- **Media Hosting:** Cloudinary
- **Image Sourcing (For seeds):** Unsplash API

---

## 🚀 Getting Started

### 1. Prerequisites 
Ensure you have Node.js and `npm` installed.

### 2. Clone the Repository
```bash
git clone https://github.com/tejas-pagare/amazon_backend.git
cd amazon-clone-backend-scalar
npm install
```

### 3. Environment Variables
Create a root `.env` file based on the provided `.env.example`:

```env
DATABASE_URL=postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require
PORT=3000
NODE_ENV=development
TAX_RATE=0.18

# Required for the database seeder to download and host real product images
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
UNSPLASH_ACCESS_KEY=your_access_key
```

### 4. Database Migration & Seeding
This project does not use an ORM. Therefore, schema creation and seeding is handled by custom automated utility scripts.

**First**, spin up the database schema and enums:
```bash
npm run migrate
```

**Second**, populate the mock platform (runs 6 categories, 18 high-quality products via Cloudinary proxy-upload, 3 users, and 3 address structures):
```bash
npm run seed
```

### 5. Running the Application
```bash
# Start development server with auto-refresh
npm run dev

# Start production server
npm start
```

---

## 📡 API Overview

> Note: All authenticated endpoints currently bypass bearer tokens for testing purposes. `user_id` should simply be sent in query parameters `?user_id=1` (for GET/DELETE) or JSON bodies (for POST/PUT).

| Route | Method | Description |
|---|---|---|
| `/api/v1/products` | `GET` | Get all products (Pagination, Query, Filters built-in) |
| `/api/v1/products/:id` | `GET` | Get specific product details by ID |
| `/api/v1/categories` | `GET` | Get all product categories |
| `/api/v1/cart` | `GET, POST, DELETE` | See items, UPSERT items alongside quantity, clear cart |
| `/api/v1/addresses` | `GET, POST, DELETE` | Fetch, create, or remove shipping coordinates |
| `/api/v1/orders` | `GET, POST` | Checkout current cart under transaction to create an order  |
| `/api/v1/orders/buy-now` | `POST` | Create order instantly bypassing cart |
| `/api/v1/orders/:orderId/cancel`| `PATCH` | Cancels actively `PLACED` orders & reinstates inventory |

*(Check `api_documentation.md` for exact JSON structure constraints).*

---


